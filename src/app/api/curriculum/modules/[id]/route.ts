// ============================================================================
// 1E.1d — GET /api/curriculum/modules/[id]: pozycje modułu z sekwencją
// odblokowań. TWARDE egzekwowanie prereq w API (ADR-014 D3): moduł
// zablokowany → 403 — dowód roadmapy „student bez zaliczonego modułu N
// nie otworzy N+1". Flaga off → 404.
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getModuleItems, isModuleUnlocked } from "@/lib/curriculum/ladder";
import { db } from "@/lib/db";
import { curriculumModules, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("curriculumPath")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = await ctx.params;
	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		const module_ = await db.query.curriculumModules.findFirst({
			where: eq(curriculumModules.id, id),
			columns: { id: true, slug: true, title: true, description: true },
		});
		if (!module_) return NextResponse.json({ error: "Module not found" }, { status: 404 });

		if (!(await isModuleUnlocked(student.id, module_.id))) {
			return NextResponse.json({ error: "Module locked" }, { status: 403 });
		}

		const items = await getModuleItems(student.id, module_.id);
		return NextResponse.json({ module: module_, items });
	} catch (error) {
		logError("curriculum.module.failed", error);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
