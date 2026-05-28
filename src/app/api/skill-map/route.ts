import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { generateSkillMap } from "@/lib/ai/generate-skill-map";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { skillMaps, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * §8 #1 Phase 2 / issue #19c (refactor sub-issue): odczyt/zapis skill-map
 * przez withTenantContext({role: "student"}). generateSkillMap pozostaje
 * POZA tx (AI call + jego własne DB writes — własny refactor poza zakresem
 * tego PR; widzi commit nadrzędnej tx).
 *
 * Pre-fetch studenta (id + tenantId) wykonywany owner-side przez `db` —
 * mała query po user_id, analogicznie do faculty-auth lookup w
 * faculty/dashboard. Bez tego nie da się wejść w withTenantContext z
 * poprawnym kontekstem RLS (tenantId wymagany).
 */

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	const userId = session.user.id;

	const studentMeta = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
	if (!studentMeta) {
		return NextResponse.json({ error: "Student not found" }, { status: 404 });
	}

	const skillMap = await withTenantContext(
		{ userId, tenantId: studentMeta.tenantId, role: "student" },
		(tx) =>
			tx.query.skillMaps.findFirst({
				where: eq(skillMaps.studentId, studentMeta.id),
			}),
	);

	if (!skillMap) {
		return NextResponse.json({ generating: true }, { status: 202 });
	}
	return NextResponse.json({ nodes: skillMap.nodes, edges: skillMap.edges });
}

export async function POST() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const rl = await applyRateLimit(rateLimiters.aiLight, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const userId = session.user.id;

	const student = await db.query.students.findFirst({
		where: eq(students.userId, userId),
		with: { competencies: true },
	});
	if (!student) {
		return NextResponse.json({ error: "Student not found" }, { status: 404 });
	}

	const competencyNames = student.competencies.map((c) => c.name);

	// AI + persystencja skill-mapy w środku generateSkillMap — POZA
	// withTenantContext (DB calls w nim idą jeszcze przez owner; do refactor
	// w osobnym sub-issue dla warstwy lib/ai).
	try {
		await generateSkillMap(student.id, student.tenantId, competencyNames, student.careerGoal);
	} catch (err) {
		logError("skill-map.generate", err, { studentId: student.id });
		return NextResponse.json({ error: "Generation failed" }, { status: 500 });
	}

	// Po commit generateSkillMap czytamy świeżo zapisaną mapę przez RLS.
	const skillMap = await withTenantContext(
		{ userId, tenantId: student.tenantId, role: "student" },
		(tx) =>
			tx.query.skillMaps.findFirst({
				where: eq(skillMaps.studentId, student.id),
			}),
	);
	if (!skillMap) {
		return NextResponse.json({ error: "Skill map not persisted" }, { status: 500 });
	}

	return NextResponse.json({ nodes: skillMap.nodes, edges: skillMap.edges });
}
