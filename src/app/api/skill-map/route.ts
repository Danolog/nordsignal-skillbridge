import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { generateSkillMap } from "@/lib/ai/generate-skill-map";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { skillMaps, students } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) {
		return NextResponse.json({ error: "Student not found" }, { status: 404 });
	}

	const skillMap = await db.query.skillMaps.findFirst({
		where: eq(skillMaps.studentId, student.id),
	});

	if (!skillMap) {
		return NextResponse.json({ generating: true }, { status: 202 });
	}

	return NextResponse.json({
		nodes: skillMap.nodes,
		edges: skillMap.edges,
	});
}

export async function POST() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const rl = await applyRateLimit(rateLimiters.aiLight, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
		with: { competencies: true },
	});
	if (!student) {
		return NextResponse.json({ error: "Student not found" }, { status: 404 });
	}

	const competencyNames = student.competencies.map((c) => c.name);

	try {
		await generateSkillMap(student.id, student.tenantId, competencyNames, student.careerGoal);
	} catch (err) {
		logError("skill-map.generate", err, { studentId: student.id });
		return NextResponse.json({ error: "Generation failed" }, { status: 500 });
	}

	const skillMap = await db.query.skillMaps.findFirst({
		where: eq(skillMaps.studentId, student.id),
	});
	if (!skillMap) {
		return NextResponse.json({ error: "Skill map not persisted" }, { status: 500 });
	}

	return NextResponse.json({
		nodes: skillMap.nodes,
		edges: skillMap.edges,
	});
}
