import { count, desc, eq, sql } from "drizzle-orm";
import { headers as nextHeaders } from "next/headers";
import { NextResponse } from "next/server";
import { generateFacultySuggestions } from "@/lib/ai/generate-faculty-suggestions";
import { recordAudit } from "@/lib/audit";
import { gaps, jobMarketData, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { checkFacultyAuth } from "@/lib/faculty-auth";

export const maxDuration = 30;

export async function GET() {
	const facultyAuth = await checkFacultyAuth();
	if (!facultyAuth) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const h = await nextHeaders();
	await recordAudit({
		actorType: "faculty",
		action: "faculty.dashboard.read",
		ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
		userAgent: h.get("user-agent"),
	});

	// K3: cała agregacja w withTenantContext(faculty) — polityki RLS faculty_sees_tenant
	// zawężają students/gaps do KAMPUSU wykładowcy automatycznie (bez ręcznego WHERE).
	// jobMarketData = katalog (grant SELECT dla app_faculty, bez RLS). AI poza transakcją.
	const data = await withTenantContext(
		{ userId: "", tenantId: facultyAuth.tenantId, role: "faculty" },
		async (tx) => {
			// Warstwa 1 (WHERE) jawnie obok RLS (warstwa 2) — ADR-003: WHERE główne,
			// RLS defense-in-depth. tid powtórzony w każdym zapytaniu na danych studenta.
			const tid = facultyAuth.tenantId;
			const [studentCountResult] = await tx
				.select({ count: count() })
				.from(students)
				.where(eq(students.tenantId, tid));
			const studentCount = studentCountResult?.count ?? 0;
			if (studentCount < 3) {
				return { tooFewStudents: true as const, studentCount };
			}

			// 1. Count students per career goal
			const allStudents = await tx
				.select({ id: students.id, careerGoal: students.careerGoal })
				.from(students)
				.where(eq(students.tenantId, tid));
			const studentsPerGoal = new Map<string, number>();
			for (const s of allStudents) {
				studentsPerGoal.set(s.careerGoal, (studentsPerGoal.get(s.careerGoal) || 0) + 1);
			}

			// 2. Count how many students are MISSING each competency per career goal
			const gapData = await tx
				.select({
					competencyName: gaps.competencyName,
					careerGoal: students.careerGoal,
					missingCount: count(),
				})
				.from(gaps)
				.innerJoin(students, eq(gaps.studentId, students.id))
				.where(eq(gaps.tenantId, tid))
				.groupBy(gaps.competencyName, students.careerGoal);

			const gapMap = new Map<string, number>();
			for (const row of gapData) {
				gapMap.set(`${row.careerGoal}|||${row.competencyName}`, row.missingCount);
			}

			// 3. Build heatmap from jobMarketData — only for career goals that have students
			const allMarketData = await tx.select().from(jobMarketData);
			const heatmapData = allMarketData
				.filter((m) => studentsPerGoal.has(m.careerGoal))
				.map((m) => {
					const totalInGoal = studentsPerGoal.get(m.careerGoal) || 1;
					const key = `${m.careerGoal}|||${m.competencyName}`;
					const missing = gapMap.get(key) ?? 0;
					return {
						competencyName: m.competencyName,
						careerGoal: m.careerGoal,
						coveragePercent: Math.round(((totalInGoal - missing) / totalInGoal) * 100),
						requiredByPercent: m.demandPercentage,
					};
				});

			// Top missing competencies from gaps table
			const topMissingRaw = await tx
				.select({
					name: gaps.competencyName,
					missingCount: count(),
					avgMarketPct: sql<number>`ROUND(AVG(${gaps.marketPercentage}))`.as("avg_market_pct"),
				})
				.from(gaps)
				.where(eq(gaps.tenantId, tid))
				.groupBy(gaps.competencyName)
				.orderBy(desc(count()))
				.limit(5);

			// Career goals per competency — z już pobranego gapData (grupuje gaps po
			// competency+careerGoal w tym samym tenancie), zamiast N+1 zapytań per top-competency.
			const goalsByComp = new Map<string, Set<string>>();
			for (const row of gapData) {
				const set = goalsByComp.get(row.competencyName) ?? new Set<string>();
				set.add(row.careerGoal);
				goalsByComp.set(row.competencyName, set);
			}
			const topMissingWithGoals = topMissingRaw.map((missing) => ({
				name: missing.name,
				missingCount: missing.missingCount,
				requiredByPercent: missing.avgMarketPct,
				careerGoals: [...(goalsByComp.get(missing.name) ?? [])],
			}));

			return { tooFewStudents: false as const, studentCount, heatmapData, topMissingWithGoals };
		},
	);

	if (data.tooFewStudents) {
		return NextResponse.json({ tooFewStudents: true, studentCount: data.studentCount });
	}
	const { studentCount, heatmapData, topMissingWithGoals } = data;

	// AI suggestions (poza transakcją — nie trzymamy połączenia na czas wywołania modelu)
	let aiSuggestions: string[] = [];
	try {
		aiSuggestions = await generateFacultySuggestions(
			topMissingWithGoals.map((m) => ({
				name: m.name,
				requiredByPercent: m.requiredByPercent,
			})),
			studentCount,
		);
	} catch {
		aiSuggestions = ["Nie udało się wygenerować sugestii AI. Spróbuj odświeżyć stronę."];
	}

	return NextResponse.json({
		studentCount,
		heatmapData,
		topMissingCompetencies: topMissingWithGoals,
		aiSuggestions,
		generatedAt: new Date().toISOString(),
	});
}
