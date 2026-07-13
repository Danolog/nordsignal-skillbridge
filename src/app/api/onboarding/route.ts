import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSkillMap } from "@/lib/ai/generate-skill-map";
import type { AssessmentResult } from "@/lib/assessment/types";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
	assessmentSessions,
	competencies,
	passports,
	projectSubmissions,
	students,
	verifiedCompetencies,
} from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { resolveTenantId } from "@/lib/db/tenant-mapping";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { persistMarketGaps } from "@/lib/onboarding/market-gaps";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";
import { levelToStatus } from "@/lib/self-assessment";

export const maxDuration = 60;

// Partia 4: NOWY kontrakt kompetencji = wybór z katalogu rynku z POZIOMEM posiadania.
// Poziom 2/3/4 = samoocena (Brak nie jest wysyłane — niezaznaczone = luka). Próg
// „min 5" ZNIESIONY (0 dozwolone — D5); pusta tablica = student startuje z 0% pokrycia.
//
// A5/1.12: `level` OPCJONALNY, gdy przyszło `diagnosticSessionId` — wpis bez poziomu
// = „zmierzone testem": serwer bierze poziom (1–4, w tym 1!) z result_json UKOŃCZONEJ
// sesji diagnozy, klientowi nie ufa. Bez sesji brak poziomu = 400 (walidacja niżej).
// Poziom 1 nigdy nie przychodzi od klienta — wchodzi wyłącznie ścieżką pomiaru.
const SelectedCompetencySchema = z.object({
	name: z.string().min(1).max(200),
	level: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
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
	// JEDEN kontrakt (AG.2, decyzja Darka 2026-07-07): obiekty z poziomem —
	// ścieżka DETERMINISTYCZNA (status z samooceny levelToStatus, luki z katalogu
	// rynku). Gałąź LEGACY (tablica nazw → model generateGaps) USUNIĘTA razem
	// z generate-gaps.ts: nie miała żywego wołacza w UI, a LLM potrafił
	// halucynować luki (stąd weryfikator AG.1 — moduł verify-gaps zostaje jako
	// klocek dla AG.5+). Stary kontrakt string[] pada teraz na walidacji → 400.
	// Pusta tablica [] = 0 zaznaczeń (D5) — student startuje z 0% pokrycia.
	competencies: z.array(SelectedCompetencySchema).max(100),
	// A5/1.12: id UKOŃCZONEJ sesji diagnozy (za flagą diagnosticAssessment).
	// Obecne → wpisy bez `level` dostają poziom zmierzony (result_json sesji).
	diagnosticSessionId: z.string().uuid().optional(),
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
	const selected: SelectedComp[] = parsed.data.competencies;

	const userId = session.user.id;

	// ── A5/1.12: poziomy zmierzone diagnozą (za flagą; klientowi nie ufamy) ──
	// measuredByName: nazwa → poziom 1–4 z result_json UKOŃCZONEJ sesji studenta.
	// Wpis payloadu bez `level` MUSI być zmierzony (inaczej 400 niżej).
	const diagnosticEnabled = isFeatureEnabled("diagnosticAssessment");
	let measuredByName = new Map<string, number>();
	if (diagnosticEnabled && parsed.data.diagnosticSessionId) {
		const [assessment] = await db
			.select({
				studentUserId: students.userId,
				kind: assessmentSessions.kind,
				status: assessmentSessions.status,
				careerGoal: assessmentSessions.careerGoal,
				resultJson: assessmentSessions.resultJson,
			})
			.from(assessmentSessions)
			.innerJoin(students, eq(assessmentSessions.studentId, students.id))
			.where(eq(assessmentSessions.id, parsed.data.diagnosticSessionId));
		// Cudza/nieukończona/z innego celu → 409 (nie 404 — sesja może istnieć,
		// ale nie nadaje się jako źródło poziomów dla TEGO zapisu).
		const result = assessment?.resultJson as AssessmentResult | null | undefined;
		if (
			!assessment ||
			assessment.studentUserId !== userId ||
			assessment.kind !== "diagnostic" ||
			assessment.status !== "completed" ||
			assessment.careerGoal !== careerGoal ||
			!result
		) {
			// Obserwowalność (lekcja smoke 1.12: 409 bez logu = ślepe debugowanie).
			// PII-safe: sam powód odrzucenia, bez treści sesji i nazw kompetencji.
			logError("onboarding", new Error("diagnostic session rejected"), {
				phase: "diagnosticSession",
				reason: !assessment
					? "not_found"
					: assessment.studentUserId !== userId
						? "wrong_owner"
						: assessment.status !== "completed"
							? `status_${assessment.status}`
							: assessment.careerGoal !== careerGoal
								? "career_goal_mismatch"
								: "no_result",
				userId,
			});
			return NextResponse.json(
				{ error: "Sesja diagnozy nie pasuje do tego zapisu — przejdź test ponownie." },
				{ status: 409 },
			);
		}
		measuredByName = new Map(
			Object.entries(result.competencies).map(([name, level]) => [name, level]),
		);
	}

	// Walidacja spójności wpisów: bez poziomu wolno przyjść TYLKO wpisowi
	// zmierzonemu w podanej sesji. (Bez sesji/flagi → każdy wpis wymaga poziomu —
	// dokładnie stary kontrakt.)
	const unmeasuredWithoutLevel = selected.filter(
		(c) => c.level === undefined && !measuredByName.has(c.name),
	);
	if (unmeasuredWithoutLevel.length > 0) {
		return NextResponse.json(
			{
				error: "Kompetencje bez poziomu muszą pochodzić z ukończonej diagnozy.",
				names: unmeasuredWithoutLevel.map((c) => c.name),
			},
			{ status: 400 },
		);
	}

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
	// persistMarketGaps + generateSkillMap POZA tx — nie trzymamy połączenia
	// przez dłuższą pracę, plus ich własne DB calls idą jeszcze przez owner
	// (sub-issues #19c..#19f domkną je per trasa). Studentid + competency-rows
	// committed po commit transakcji ⇒ dalsze kroki widzą je w swoim połączeniu.
	// Transakcja zwraca id studenta + nazwy kompetencji POSIADANYCH (status ≠
	// missing) — wejście liczenia luk. [1.12/§4a] Niezmiennik ratyfikowany:
	// luka ≡ „wymagana przez rynek ∧ missing". Dotąd „posiadane" = „zaznaczone"
	// (poziom 1 nie istniał w kontrakcie); diagnoza wprowadza zmierzony poziom 1
	// (status missing) — taka kompetencja MUSI zostać luką, więc luki liczymy ze
	// STATUSÓW zapisanych wierszy, nie z listy zaznaczeń.
	let studentId: string;
	let possessedNames: string[];
	try {
		const persisted = await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			// Carry-over pomiaru przy re-onboardingu (wypełniany niżej, w tej tx).
			const carryoverByName = new Map<string, number>();
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

				// [1.12/§4a — polityka re-onboardingu] Carry-over POMIARU: zanim
				// skasujemy stare wiersze, zapamiętujemy te zmierzone diagnozą.
				// POST bez nowej sesji (edytor profilu, ponowny przebieg kreatora
				// bez testu) NIE degraduje pomiaru do deklaracji — poziom zmierzony
				// wygrywa z samooceną; nadpisze go dopiero NOWA sesja diagnozy
				// (measuredByName ma pierwszeństwo przy budowie wierszy niżej).
				// Odznaczenie kompetencji = świadome usunięcie (wpis znika → luka).
				if (diagnosticEnabled) {
					const previousDiagnostic = await tx.query.competencies.findMany({
						where: eq(competencies.studentId, sid),
						columns: { name: true, selfAssessment: true, verifiedByMethod: true },
					});
					for (const row of previousDiagnostic) {
						if (row.verifiedByMethod === "diagnostic" && row.selfAssessment !== null) {
							carryoverByName.set(row.name, row.selfAssessment);
						}
					}
				}

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
			// Poziom per wiersz wg PRECEDENCJI (1.12): zmierzony w podanej sesji
			// (1–4, method='diagnostic') > carry-over poprzedniego pomiaru
			// (method='diagnostic') > samoocena klienta (2/3/4, method='self').
			// Status z ratyfikowanej mapy levelToStatus; poziom 1 (tylko pomiar)
			// → status 'missing' — wiersz zostaje (prowieniencja: „zmierzono: brak"),
			// a luka powstaje z niezmiennika statusowego (possessedNames niżej).
			// Pusta tablica (0 zaznaczeń, D5) → brak insertu.
			const rows = selected.map((c) => {
				const measured = measuredByName.get(c.name);
				const carryover = carryoverByName.get(c.name);
				const level = measured ?? carryover ?? c.level;
				if (level === undefined) {
					// Nieosiągalne po walidacji wyżej — twarda asercja zamiast cichego NULL.
					throw new Error(`Kompetencja "${c.name}" bez poziomu po walidacji`);
				}
				return {
					studentId: sid,
					tenantId,
					name: c.name,
					status: levelToStatus(level),
					selfAssessment: level,
					verifiedByMethod:
						measured !== undefined || carryover !== undefined
							? ("diagnostic" as const)
							: ("self" as const),
					marketPercentage: c.marketPercentage,
				};
			});
			if (rows.length > 0) {
				await tx.insert(competencies).values(rows);
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

			return {
				studentId: sid,
				possessedNames: rows.filter((r) => r.status !== "missing").map((r) => r.name),
			};
		});
		studentId = persisted.studentId;
		possessedNames = persisted.possessedNames;
	} catch (err) {
		logError("onboarding", err, { phase: "persist", userId });
		return NextResponse.json({ error: "Persistence failed" }, { status: 500 });
	}

	// Blok C (C2): kredencjały verified_competencies dziedziczą tenant_id jak
	// submisje wyżej — bez tego re-onboarding ze zmienioną uczelnią zostawiłby
	// je ze starym tenantem. OWNER-SIDE (app_student ma na tej tabeli tylko
	// SELECT — RLS 0037), dlatego poza withTenantContext. Wierszy NIE kasujemy:
	// kredencjał przeżywa re-onboarding (wipe+insert dotyczy competencies,
	// czyli deklaracji — to dokładnie powód, dla którego istnieje osobna tabela).
	// Best-effort: dla nowych studentów 0 wierszy; awaria nie blokuje
	// onboardingu (log + ponowny onboarding domknie synchronizację).
	try {
		await db
			.update(verifiedCompetencies)
			.set({ tenantId })
			.where(eq(verifiedCompetencies.studentId, studentId));
	} catch (err) {
		logError("onboarding", err, { phase: "verifiedCompetenciesTenantSync", studentId });
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
		// Luki DETERMINISTYCZNE: katalog rynku \ POSIADANE (status ≠ missing —
		// zmierzony poziom 1 zostaje luką mimo zaznaczenia; §4a/1.12).
		await persistMarketGaps(studentId, tenantId, careerGoal, possessedNames);
		await generateSkillMap(studentId, tenantId);
	} catch (err) {
		logError("onboarding", err, { studentId });
		return NextResponse.json({ success: true, studentId, aiGenerationFailed: true });
	}

	return NextResponse.json({ success: true, studentId });
}
