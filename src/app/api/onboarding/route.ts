import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateGaps } from "@/lib/ai/generate-gaps";
import { generateSkillMap } from "@/lib/ai/generate-skill-map";
import { auth } from "@/lib/auth/server";
import { competencies, passports, projectSubmissions, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { resolveTenantId } from "@/lib/db/tenant-mapping";
import { logError } from "@/lib/log";
import { persistMarketGaps } from "@/lib/onboarding/market-gaps";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";
import { levelToStatus } from "@/lib/self-assessment";

export const maxDuration = 60;

// Partia 4: NOWY kontrakt kompetencji = wybór z katalogu rynku z POZIOMEM posiadania.
// Poziom 2/3/4 = samoocena (Brak nie jest wysyłane — niezaznaczone = luka). Próg
// „min 5" ZNIESIONY (0 dozwolone — D5); pusta tablica = student startuje z 0% pokrycia.
const SelectedCompetencySchema = z.object({
	name: z.string().min(1).max(200),
	level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
	marketPercentage: z.number().int().min(0).max(100),
	inSyllabus: z.boolean().optional().default(false),
});

type SelectedComp = z.infer<typeof SelectedCompetencySchema>;

const OnboardingSchema = z.object({
	university: z.string().min(1).max(200),
	fieldOfStudy: z.string().min(1).max(200),
	semester: z.number().int().min(1).max(15),
	// Higiena (F2): trim. BEZ bramki katalogowej — endpoint współdzielony z
	// edytorem profilu, który celowo dopuszcza własny, wpisywany cel. Wyciek z
	// Pomocnika zamknięty u źródła (/summary grounding + select-path 400).
	careerGoal: z.string().trim().min(1).max(200),
	syllabusText: z.string().max(50_000).optional().default(""),
	// UNIA dwóch kontraktów (kompatybilność wsteczna):
	//  • NOWY (onboarding Partii 4 ORAZ profil-editor — oba żywe fronty wysyłają obiekty):
	//    ścieżka DETERMINISTYCZNA (status z samooceny levelToStatus, luki z katalogu rynku).
	//  • LEGACY (tablica nazw): dziś BEZ żywego wołacza w UI — zostaje wyłącznie dla
	//    kompatybilności wstecznej (stary cached JS klienta); status 'acquired', luki
	//    przez model generateGaps. Kandydat do usunięcia w osobnym kroku (razem z
	//    generate-gaps.ts, którego jedynym konsumentem jest ta gałąź).
	// Pusta tablica [] dopasowuje się do pierwszego wariantu → ścieżka nowa, 0 zaznaczeń (D5).
	competencies: z.union([
		z.array(SelectedCompetencySchema).max(100),
		z.array(z.string().min(1).max(200)).max(100),
	]),
});

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const rl = await applyRateLimit(rateLimiters.aiHeavy, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = OnboardingSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}
	const { university, fieldOfStudy, semester, careerGoal, syllabusText } = parsed.data;
	const rawComps = parsed.data.competencies;
	// Detekcja kontraktu: pusta tablica lub obiekty → NOWY (Partia 4); stringi → LEGACY.
	const isNewContract = rawComps.length === 0 || typeof rawComps[0] === "object";
	const selected: SelectedComp[] = isNewContract ? (rawComps as SelectedComp[]) : [];
	const legacyNames: string[] = isNewContract ? [] : (rawComps as string[]);
	// Nazwy zaznaczonych — wejście liczenia luk (katalog rynku \ wybór / model legacy).
	const competencyNames = isNewContract ? selected.map((c) => c.name) : legacyNames;

	const userId = session.user.id;

	// K3: resolve tenant from (free-form) university — mirror of 0006 backfill.
	// resolveTenantId rzuca, gdy brak tenanta __unmapped (seed 0005) — łapiemy,
	// żeby nie wyciekł goły 500 bez kontekstu. tenantId potrzebne PRZED
	// withTenantContext (kontekst RLS wymaga obu: userId + tenantId).
	let tenantId: string;
	try {
		tenantId = await resolveTenantId(university);
	} catch (err) {
		logError("onboarding", err, { phase: "resolveTenant" });
		return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
	}

	// §8 #1 Phase 2 (issue #19b): cała persystencja onboarding przez
	// withTenantContext({role: "student"}). Po ops-step (#25) runtime łączy się
	// jako app_runtime (NOBYPASSRLS) — student-policies RLS egzekwują się
	// niezależnie od ścieżki kodu (zapomniany WHERE = 0 wierszy). Dziś fallback
	// na owner+SET LOCAL ROLE — semantyka identyczna.
	//
	// AI calls (generateGaps + generateSkillMap) POZA tx — nie trzymamy
	// połączenia przez LLM, plus ich własne DB calls idą jeszcze przez owner
	// (sub-issues #19c..#19f domkną je per trasa). Studentid + competency-rows
	// committed po commit transakcji ⇒ AI widzi je w swoim własnym połączeniu.
	let studentId: string;
	try {
		studentId = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			// Upsert student record
			const existing = await tx.query.students.findFirst({
				where: eq(students.userId, userId),
			});

			let sid: string;
			if (existing) {
				await tx
					.update(students)
					.set({
						tenantId,
						university,
						fieldOfStudy,
						semester,
						careerGoal,
						syllabusText,
						// NIE zapalamy onboardingCompleted tu (krok 3) — zapala je dopiero
						// POST /api/onboarding/complete na końcu kreatora. Tu tylko podnosimy
						// high-water-mark do 3 (GREATEST = nie cofamy, gdy user był już dalej).
						onboardingStep: sql`GREATEST(${students.onboardingStep}, 3)`,
						updatedAt: new Date(),
					})
					.where(eq(students.userId, userId));
				sid = existing.id;

				// Delete old competencies for idempotency
				await tx.delete(competencies).where(eq(competencies.studentId, sid));
			} else {
				const [newStudent] = await tx
					.insert(students)
					.values({
						userId,
						tenantId,
						university,
						fieldOfStudy,
						semester,
						careerGoal,
						syllabusText,
						// Nowy student dochodzący tu (bez prowizorycznego rekordu z Kroku 0)
						// jest na kroku 3. onboardingCompleted ZOSTAJE false (default) —
						// kreator domyka go dopiero przez POST /api/onboarding/complete.
						onboardingStep: 3,
					})
					.returning({ id: students.id });
				sid = newStudent.id;
			}

			// Insert competencies (po INSERT studentu w tej samej tx — RLS
			// student_sees_own widzi własny wiersz w ramach tx read-committed).
			if (isNewContract) {
				// NOWY (Partia 4): każda niesie POZIOM samooceny (2/3/4) ze scalonego kroku —
				// status z ratyfikowanej mapy levelToStatus, verifiedByMethod='self' (Beta),
				// realny % popytu z katalogu. Pusta tablica (0 zaznaczeń, D5) → brak insertu.
				if (selected.length > 0) {
					await tx.insert(competencies).values(
						selected.map((c) => ({
							studentId: sid,
							tenantId,
							name: c.name,
							status: levelToStatus(c.level),
							selfAssessment: c.level,
							verifiedByMethod: "self" as const,
							marketPercentage: c.marketPercentage,
						})),
					);
				}
			} else {
				// LEGACY (profil-editor): nazwy bez poziomu, status 'acquired' (jak przed Partią 4).
				await tx.insert(competencies).values(
					legacyNames.map((name) => ({
						studentId: sid,
						tenantId,
						name,
						status: "acquired" as const,
					})),
				);
			}

			// Create passport if not exists; jeśli istnieje — odśwież tenantId
			// (re-onboarding ze zmienioną uczelnią mógł zmienić tenant — bez tego
			// wiersz potomny zostaje ze starym tenant_id = niespójność z students).
			const existingPassport = await tx.query.passports.findFirst({
				where: eq(passports.studentId, sid),
			});
			if (!existingPassport) {
				await tx.insert(passports).values({ studentId: sid, tenantId });
			} else if (existingPassport.tenantId !== tenantId) {
				await tx.update(passports).set({ tenantId }).where(eq(passports.studentId, sid));
			}

			// projectSubmissions też dziedziczą tenant_id — przy re-onboardingu ze zmienioną
			// uczelnią trzeba je odświeżyć, inaczej zweryfikowane zgłoszenia zostają ze starym
			// tenantem i wyciekają do dashboardu faculty starego kampusu. (W2 pominął tę tabelę;
			// idempotentne dla nowych studentów — 0 wierszy.)
			await tx
				.update(projectSubmissions)
				.set({ tenantId })
				.where(eq(projectSubmissions.studentId, sid));

			return sid;
		});
	} catch (err) {
		logError("onboarding", err, { phase: "persist", userId });
		return NextResponse.json({ error: "Persistence failed" }, { status: 500 });
	}

	// Synchronous generation — Vercel serverless terminates the function after the response,
	// so fire-and-forget would lose the work. Awaiting also lets us tell the client whether the
	// skill map is ready or whether they need to retry from /skill-map.
	// POZA withTenantContext: te calls + ich własne DB writes idą przez owner db
	// (do czasu osobnych refactorów w #19c..#19f).
	//
	// KOLEJNOŚĆ, nie Promise.all (poprawka #1): persistMarketGaps najpierw zapisuje
	// luki + pokrycie, a generateSkillMap dopiero z nich WYPROWADZA graf deterministycznie.
	// Partia 4: luki liczone DETERMINISTYCZNIE (katalog rynku \ wybór studenta) — bez
	// modelu, bez nadpisywania statusu samooceny (HITL). Status kompetencji pochodzi
	// wyłącznie od studenta (levelToStatus przy insercie wyżej).
	try {
		if (isNewContract) {
			// Luki DETERMINISTYCZNE: katalog rynku \ wybór (popyt z danych, bez modelu).
			await persistMarketGaps(studentId, tenantId, careerGoal, competencyNames);
		} else {
			// LEGACY (profil-editor): luki przez model (zachowanie sprzed Partii 4).
			await generateGaps(studentId, tenantId, competencyNames, careerGoal);
		}
		await generateSkillMap(studentId, tenantId);
	} catch (err) {
		logError("onboarding", err, { studentId });
		return NextResponse.json({ success: true, studentId, aiGenerationFailed: true });
	}

	return NextResponse.json({ success: true, studentId });
}
