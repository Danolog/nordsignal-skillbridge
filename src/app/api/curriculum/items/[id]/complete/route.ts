// ============================================================================
// POST /api/curriculum/items/[id]/complete — kompletowanie pozycji lab/project.
// Weryfikacja AUTOMATYCZNA, zero samodeklaracji (ADR-014 pkt 11).
//
//  - kind='project': zaliczenie wywodzi się z ISTNIEJĄCEGO pipeline'u ocen —
//    wymagane zgłoszenie ze statusem submitted/verified (wariant C, ADR-014 pkt 2:
//    submitted odblokowuje drabinę; verified pozostaje warunkiem receiptu).
//
//  - kind='lab' (1E.6b, ADR-015): zaliczenie = TOKEN PIECZĄTKI. Student wkleja
//    token wypisany przez komórkę-pieczątkę w notebooku Colab. Token niesie
//    ŁADUNEK — wartości wyliczone w sesji studenta. **Serwer NIE UFA fladze
//    „zaliczone"**: bierze ładunek i SAM weryfikuje każdy check (`lab-checks.ts`).
//
//    Kody odpowiedzi rozróżniają trzy RÓŻNE porażki, bo znaczą co innego:
//      400 „Invalid token"  — literówka / token z innej pozycji lub konta
//      409 „Checks failed"  — token POPRAWNY, ale praca nie spełnia warunków
//                             (zwracamy KTÓRY check padł, NIGDY wartości oczekiwanej)
//      501                  — brak LAB_TOKEN_SECRET albo brak kontraktu checków
//                             (fail-closed: uczciwe „nie umiemy sprawdzić" zamiast
//                              zaliczania na pusto)
//
// Flaga off → 404; brak sesji → 401; zablokowany moduł/pozycja → 403.
// ============================================================================

import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { completeItem } from "@/lib/curriculum/completion";
import { evaluateChecks, parseChecks } from "@/lib/curriculum/lab-checks";
import { isLabTokenConfigured, parseToken } from "@/lib/curriculum/lab-token";
import { getModuleItems, isModuleUnlocked } from "@/lib/curriculum/ladder";
import { isUuid } from "@/lib/curriculum/params";
import { db } from "@/lib/db";
import { curriculumModuleItems, projectSubmissions, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

const LabBodySchema = z.object({ token: z.string().min(1).max(4096) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("curriculumPath")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = await ctx.params;
	// 0.15/B3: zły format uuid dawał 22P02 z Postgresa → 500 zamiast 400.
	if (!isUuid(id)) return NextResponse.json({ error: "Invalid item id" }, { status: 400 });

	// Ciało jest OPCJONALNE: kind='project' zalicza się bez niego (ze zgłoszenia),
	// kind='lab' wymaga tokenu. Puste/niepoprawne ciało nie może wywalić trasy.
	let body: unknown = {};
	try {
		body = await req.json();
	} catch {
		body = {};
	}

	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true, tenantId: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		const item = await db.query.curriculumModuleItems.findFirst({
			where: eq(curriculumModuleItems.id, id),
			columns: { id: true, moduleId: true, kind: true, projectId: true, configJson: true },
		});
		if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

		if (!(await isModuleUnlocked(student.id, item.moduleId))) {
			return NextResponse.json({ error: "Module locked" }, { status: 403 });
		}
		const items = await getModuleItems(student.id, item.moduleId);
		const itemState = items.find((i) => i.id === item.id);
		if (!itemState || itemState.status === "locked") {
			return NextResponse.json({ error: "Item locked" }, { status: 403 });
		}

		if (item.kind === "project") {
			if (!item.projectId) {
				return NextResponse.json({ error: "Item has no project" }, { status: 500 });
			}
			// Wariant C (ADR-014 pkt 2): submitted ODBLOKOWUJE następny moduł;
			// verified = warunek receiptu (Passport) — niezależna waluta (G9).
			const submission = await db.query.projectSubmissions.findFirst({
				where: and(
					eq(projectSubmissions.studentId, student.id),
					eq(projectSubmissions.projectId, item.projectId),
					inArray(projectSubmissions.status, ["submitted", "verified"]),
				),
				columns: { id: true, status: true },
			});
			if (!submission) {
				return NextResponse.json({ error: "No submitted work for this project" }, { status: 409 });
			}
			const { moduleCompleted } = await completeItem(
				student.id,
				student.tenantId,
				item.id,
				item.moduleId,
			);
			return NextResponse.json({
				itemCompleted: true,
				moduleCompleted,
				submissionStatus: submission.status,
			});
		}

		if (item.kind === "lab") {
			// 1E.6b (ADR-015): zaliczenie = TOKEN PIECZĄTKI, weryfikowany serwerowo.
			// Serwer NIE ufa fladze „zaliczone" z notebooka — bierze ładunek tokenu
			// (wartości wyliczone w sesji Colab) i SAM sprawdza każdy check.
			// FAIL-CLOSED: bez sekretu nie da się zweryfikować ŻADNEGO tokenu —
			// lepiej uczciwe 501 niż zaliczanie labów bez weryfikacji.
			if (!isLabTokenConfigured()) {
				logError("curriculum.lab.secret_missing", new Error("LAB_TOKEN_SECRET nieustawiony"));
				return NextResponse.json({ error: "Lab checks unavailable" }, { status: 501 });
			}
			const checks = parseChecks(item.configJson);
			if (checks.length === 0) {
				// Treść bez realnego kontraktu checków (atrapa z 1E.2) — pozycja
				// pozostaje niekompletowalna. Lepiej uczciwe 501 niż zaliczenie
				// czegokolwiek na pusto.
				return NextResponse.json({ error: "Lab has no checks defined" }, { status: 501 });
			}

			const parsedBody = LabBodySchema.safeParse(body);
			if (!parsedBody.success) {
				return NextResponse.json({ error: "Token required" }, { status: 400 });
			}

			const parsed = parseToken(student.id, item.id, parsedBody.data.token);
			if (!parsed.ok) {
				// Komunikat rozróżnia „przepisałeś z błędem" od „to nie Twój token" —
				// bez zdradzania oczekiwanych wartości.
				return NextResponse.json(
					{ error: "Invalid token", reason: parsed.reason },
					{ status: 400 },
				);
			}

			const { passed, results } = evaluateChecks(checks, parsed.payload);
			if (!passed) {
				// 409, nie 400: token jest POPRAWNY, ale praca nie spełnia checków.
				// Zwracamy, KTÓRY check nie przeszedł (bez wartości oczekiwanej).
				return NextResponse.json(
					{ error: "Checks failed", results, itemCompleted: false },
					{ status: 409 },
				);
			}

			const { moduleCompleted } = await completeItem(
				student.id,
				student.tenantId,
				item.id,
				item.moduleId,
			);
			return NextResponse.json({ itemCompleted: true, moduleCompleted, results });
		}

		return NextResponse.json({ error: "Item kind not completable here" }, { status: 400 });
	} catch (error) {
		logError("curriculum.complete.failed", error);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
