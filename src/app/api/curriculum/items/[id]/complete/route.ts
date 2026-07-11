// ============================================================================
// 1E.1e — POST /api/curriculum/items/[id]/complete: kompletowanie pozycji
// lab/project — INTERFEJS wyniku checku (ADR-014 pkt 11: weryfikacja
// AUTOMATYCZNA; implementacja automatów per lab/kamień = 1E.6, hak:
// config_json.checks).
//
// Reguła w 1E.1 (deterministyczna, bez samodeklaracji):
//  - kind='project': zaliczenie wywodzi się z ISTNIEJĄCEGO pipeline'u ocen —
//    wymagane zgłoszenie studenta do projektu pozycji ze statusem
//    submitted/verified (wariant C, decyzja Darka pkt 2: submitted odblokowuje
//    drabinę; verified pozostaje warunkiem receiptu w Passporcie).
//  - kind='lab': w 1E.1 endpoint odrzuca (501) — check automatyczny wchodzi
//    w 1E.6; pilotowe pozycje lab pojawią się w treści dopiero z 1E.2.
// Flaga off → 404; zablokowany moduł/pozycja → 403.
// ============================================================================

import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { completeItem } from "@/lib/curriculum/completion";
import { getModuleItems, isModuleUnlocked } from "@/lib/curriculum/ladder";
import { db } from "@/lib/db";
import { curriculumModuleItems, projectSubmissions, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("curriculumPath")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = await ctx.params;
	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true, tenantId: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		const item = await db.query.curriculumModuleItems.findFirst({
			where: eq(curriculumModuleItems.id, id),
			columns: { id: true, moduleId: true, kind: true, projectId: true },
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
			// Automatyczne checki labów wchodzą w 1E.6 (decyzja Darka pkt 11 —
			// bez samodeklaracji); do tego czasu pozycja niekompletowalna.
			return NextResponse.json({ error: "Lab checks not implemented yet" }, { status: 501 });
		}

		return NextResponse.json({ error: "Item kind not completable here" }, { status: 400 });
	} catch (error) {
		logError("curriculum.complete.failed", error);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
