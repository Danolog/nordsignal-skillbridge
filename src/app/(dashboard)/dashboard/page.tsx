import { and, count, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardHub } from "@/components/dashboard/dashboard-hub";
import type { RhythmCardState } from "@/components/rhythm/rhythm-card";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { competencies, gaps, projectSubmissions, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { getMarketNotificationsState } from "@/lib/market-notifications";
import { computeDemandCoverage } from "@/lib/onboarding/market-catalog";
import { loadMarketCatalog } from "@/lib/onboarding/market-gaps";
import { calculateCoverage } from "@/lib/passport-utils";
import { getRhythmState } from "@/lib/rhythm/state";

export default async function DashboardPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) redirect("/onboarding");

	// Pokrycie liczone ŚWIEŻO (ten sam wzór co /passport). Kompetencje pobieramy z
	// polami potrzebnymi na kanban (nazwa, status, popyt, samoocena) — nie sam count.
	const [
		studentCompetencies,
		gapRows,
		criticalGapCount,
		inProgressCount,
		topGaps,
		marketNotifications,
	] = await Promise.all([
		db.query.competencies.findMany({
			where: eq(competencies.studentId, student.id),
			columns: {
				id: true,
				name: true,
				status: true,
				marketPercentage: true,
				selfAssessment: true,
			},
		}),
		db.select({ count: count() }).from(gaps).where(eq(gaps.studentId, student.id)),
		db
			.select({ count: count() })
			.from(gaps)
			.where(and(eq(gaps.studentId, student.id), eq(gaps.priority, "critical"))),
		db
			.select({ count: count() })
			.from(projectSubmissions)
			.where(
				and(
					eq(projectSubmissions.studentId, student.id),
					eq(projectSubmissions.status, "in_progress"),
				),
			),
		db.query.gaps.findMany({
			where: eq(gaps.studentId, student.id),
			orderBy: [desc(gaps.marketPercentage)],
			columns: {
				id: true,
				competencyName: true,
				priority: true,
				marketPercentage: true,
				whyImportant: true,
			},
		}),
		// AG.6: stan powiadomień „nowa luka" (flaga + zgoda RODO + nieprzeczytane).
		getMarketNotificationsState(student, session.user.id),
	]);

	// 1.18: karta rytmu (flaga off → null; zapytania za bramką).
	let rhythmCard: RhythmCardState | null = null;
	if (isFeatureEnabled("studyRhythm")) {
		const r = await getRhythmState(student.id);
		rhythmCard = {
			declared: r.declaration !== null,
			hoursPerWeek: r.declaration?.hoursPerWeek ?? null,
			streakWeeks: r.streakWeeks,
			lastActivityAt: r.lastActivityAt,
			showStagnationAlert: r.showStagnationAlert,
		};
	}

	const gapTotal = gapRows[0]?.count ?? 0;
	// Blok C (C3, decyzja D3): przy fladze ON zbiorcze pokrycie na pulpicie to
	// „pokrycie deklarowane" WAŻONE POPYTEM — ten sam wzór co paszport
	// (computeDemandCoverage), inne wejście: deklaracje z wagą statusu
	// (acquired=1.0, in_progress=0.5 — jak calculateCoverage). Pulpit pozostaje
	// narzędziem nauki (D1): Kanban niżej dalej czyta deklaracje.
	// OFF = licznik sztukowy jak dotąd.
	let marketCoverage: number;
	if (isFeatureEnabled("passportVerifiedOnly")) {
		const catalog = await loadMarketCatalog(student.careerGoal);
		marketCoverage = computeDemandCoverage(
			catalog,
			studentCompetencies
				.filter((c) => c.status !== "missing")
				.map((c) => ({ name: c.name, weight: c.status === "acquired" ? 1 : 0.5 })),
		);
	} else {
		marketCoverage = calculateCoverage(
			studentCompetencies.map((c) => ({ status: c.status })),
			gapTotal,
		);
	}
	// „Następny krok" = najważniejsza luka: krytyczne najpierw, w obrębie priorytetu
	// najwyższy popyt rynku (topGaps już posortowane po popycie).
	const topGap = topGaps.find((g) => g.priority === "critical") ?? topGaps[0] ?? null;

	return (
		<DashboardHub
			user={session.user}
			student={student}
			competencies={studentCompetencies}
			gaps={topGaps.map((g) => ({
				competencyName: g.competencyName,
				priority: g.priority,
				marketPercentage: g.marketPercentage,
			}))}
			gapCount={gapTotal}
			criticalGapCount={criticalGapCount[0]?.count ?? 0}
			inProgressCount={inProgressCount[0]?.count ?? 0}
			marketCoverage={marketCoverage}
			topGap={topGap}
			marketNotifications={marketNotifications}
			rhythmCard={rhythmCard}
			// 1E.6a: kafelek ścieżki nauki tylko przy włączonej fladze (deploy ≠ release).
			curriculumEnabled={isFeatureEnabled("curriculumPath")}
		/>
	);
}
