/**
 * PATCH /api/onboarding/progress — autosave kroków 1–2 + bump high-water-mark.
 *
 * Domyka lukę trwałości kroków 1 (Profil) i 2 (Sylabus), które dotąd żyły tylko
 * w pamięci frontu do finalnego POST /api/onboarding. Po tym endpointcie kreator
 * jest wznawialny od właściwego kroku z zapisanymi danymi.
 *
 * Union po `step` (discriminated):
 *   {step:1, university, fieldOfStudy, semester} — re-resolve tenant z uczelni
 *      (prowizoryczny __unmapped → realny). PRZY ZMIANIE TENANTA: re-tenant
 *      KASKADOWY wszystkich wierszy potomnych w JEDNEJ tx (pominięcie tabeli =
 *      sierota cross-tenant = dziura bezpieczeństwa). UPDATE profilu + step=max(.,1).
 *   {step:2, syllabusText} — UPDATE sylabusa + step=max(.,2).
 *   {step:n} — czysty bump max(., n) (np. wejście na krok bez danych do zapisu).
 *
 * Brak rekordu studenta → resolveOrProvisionStudent() (prowizoryczny wiersz, jak
 * Krok 0 Pomocnika). withTenantContext({role:"student"}). Lekki rate-limit (bez LLM).
 * NIE rusza onboardingCompleted (domyka go tylko POST /api/onboarding/complete).
 *
 * Plan: fala A krok 5.
 */
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveOrProvisionStudent } from "@/lib/career-helper/session";
import {
	careerHelperSessions,
	careerHelperTurns,
	competencies,
	gaps,
	passports,
	projectReflections,
	projectSubmissions,
	skillMaps,
	studentCareerPaths,
	students,
} from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { resolveTenantId } from "@/lib/db/tenant-mapping";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

// Discriminated union po `step` — kontrakt autosave per krok.
const Step1Schema = z.object({
	step: z.literal(1),
	university: z.string().min(1).max(200),
	fieldOfStudy: z.string().min(1).max(200),
	semester: z.number().int().min(1).max(15),
});
const Step2Schema = z.object({
	step: z.literal(2),
	syllabusText: z.string().max(50_000),
});
// Czysty bump kroku (bez danych) — wejście na krok 0/3/4/5 bez payloadu.
// Kroki 1 i 2 CELOWO wykluczone: mają dane do zapisania (profil / sylabus),
// więc wymagają Step1Schema / Step2Schema. Bare {step:1} bez pól = 400 (nie 500),
// bo klient musi przysłać payload — inaczej autosave nic nie zapisuje.
const StepBumpSchema = z.object({
	step: z
		.number()
		.int()
		.min(0)
		.max(5)
		.refine((s) => s !== 1 && s !== 2, {
			message: "Kroki 1 i 2 wymagają payloadu (university/syllabusText)",
		}),
});
const ProgressSchema = z.union([Step1Schema, Step2Schema, StepBumpSchema]);

/**
 * Re-tenant kaskadowy: gdy zmienia się tenant studenta, WSZYSTKIE wiersze potomne
 * muszą dostać nowy tenant_id w tej samej tx. Pominięcie tabeli = sierota
 * cross-tenant (wiersz studenta w tenancie B, jego dane w tenancie A). Lista
 * domknięta wg planu §"Mapa zależności" / czerwone linie.
 *
 * Filtrujemy po studentId — app_student RLS (student_sees_own) przepuszcza UPDATE
 * własnych wierszy niezależnie od tenant_id (polityki potomne filtrują po student_id,
 * nie tenant_id — patrz 0008/0013/0015), więc kaskada działa pod rolą student.
 */
// biome-ignore lint/suspicious/noExplicitAny: Tx z withTenantContext (typ wewnętrzny drizzle).
async function retenantCascade(tx: any, studentId: string, newTenantId: string) {
	const childTables = [
		competencies,
		gaps,
		skillMaps,
		passports,
		projectSubmissions,
		projectReflections,
		careerHelperSessions,
		careerHelperTurns,
		studentCareerPaths,
	];
	for (const table of childTables) {
		await tx.update(table).set({ tenantId: newTenantId }).where(eq(table.studentId, studentId));
	}
}

export async function PATCH(req: Request) {
	const auth = await resolveOrProvisionStudent();
	if (!auth.ok) {
		return NextResponse.json(
			{ error: auth.status === 401 ? "Unauthorized" : "Student not found" },
			{ status: auth.status },
		);
	}
	const { userId, studentId, tenantId } = auth;

	// Lekki rate-limit (autosave bywa częsty; bez LLM → limiter aiLight, nie aiHeavy).
	const rl = await applyRateLimit(rateLimiters.aiLight, `user:${userId}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = ProgressSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}
	const data = parsed.data;

	try {
		// Step 1 wymaga re-resolve tenanta PRZED tx (resolveTenantId czyta tenants
		// przez owner db — poza kontekstem RLS, jak w POST /api/onboarding).
		// Dyskryminacja przez obecność pól (`in`) — TS zawęża wariant unii precyzyjnie
		// (sam `step === 1` nie wystarcza, bo StepBump też dopuszcza liczbę).
		const isStep1 = "university" in data;
		const isStep2 = "syllabusText" in data;
		let nextTenantId = tenantId;
		if (isStep1) {
			nextTenantId = await resolveTenantId(data.university);
		}

		await withTenantContext({ userId, tenantId, role: "student" }, async (tx) => {
			if (isStep1) {
				// Re-tenant kaskadowy gdy uczelnia mapuje na inny tenant niż obecny.
				if (nextTenantId !== tenantId) {
					await retenantCascade(tx, studentId, nextTenantId);
				}
				await tx
					.update(students)
					.set({
						tenantId: nextTenantId,
						university: data.university,
						fieldOfStudy: data.fieldOfStudy,
						semester: data.semester,
						onboardingStep: sql`GREATEST(${students.onboardingStep}, 1)`,
						updatedAt: new Date(),
					})
					.where(eq(students.userId, userId));
			} else if (isStep2) {
				await tx
					.update(students)
					.set({
						syllabusText: data.syllabusText,
						onboardingStep: sql`GREATEST(${students.onboardingStep}, 2)`,
						updatedAt: new Date(),
					})
					.where(eq(students.userId, userId));
			} else {
				// Czysty bump (StepBumpSchema) — podnieś high-water-mark do `step`.
				await tx
					.update(students)
					.set({
						onboardingStep: sql`GREATEST(${students.onboardingStep}, ${data.step})`,
						updatedAt: new Date(),
					})
					.where(eq(students.userId, userId));
			}
		});
	} catch (err) {
		logError("onboarding.progress", err, { userId, step: data.step });
		return NextResponse.json({ error: "Autosave failed" }, { status: 500 });
	}

	return NextResponse.json({ success: true, step: data.step });
}
