// ============================================================================
// 1E.1d — GET /api/curriculum: drabina modułów ścieżki studenta ze statusami
// (widoczna-ale-zablokowana — ADR-014 D3). Ścieżka = students.career_goal.
// Flaga off → 404 (feature nie istnieje).
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getLadder } from "@/lib/curriculum/ladder";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

export async function GET() {
	if (!isFeatureEnabled("curriculumPath")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true, careerGoal: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		const modules = await getLadder(student.id, student.careerGoal);
		return NextResponse.json({ pathKey: student.careerGoal, modules });
	} catch (error) {
		logError("curriculum.ladder.failed", error);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
