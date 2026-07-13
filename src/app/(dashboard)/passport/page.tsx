import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type PassportData, PassportView } from "@/components/passport/passport-view";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
	competencies,
	gaps,
	passports,
	projectSubmissions,
	students,
	submissionReviews,
} from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { computeDemandCoverage } from "@/lib/onboarding/market-catalog";
import { loadMarketCatalog } from "@/lib/onboarding/market-gaps";
import {
	buildHumanReviewMap,
	calculateCoverage,
	mapSubmissionsToReceipts,
} from "@/lib/passport-utils";
import {
	buildVerifiedPassportCompetencies,
	loadVerifiedCompetencyNames,
} from "@/lib/passport-verified";

export default async function PassportPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");

	const student = await db.query.students.findFirst({
		where: eq(students.userId, session.user.id),
	});
	if (!student) redirect("/onboarding");

	const [studentCompetencies, studentGaps] = await Promise.all([
		db.query.competencies.findMany({
			where: eq(competencies.studentId, student.id),
		}),
		db.query.gaps.findMany({
			where: eq(gaps.studentId, student.id),
		}),
	]);

	// Blok C (C3/C4, decyzje D1/D3): przy fladze ON dokument-kredencjał pochodzi
	// WYŁĄCZNIE ze zweryfikowanych projektów — lista = verified_competencies
	// (status zawsze 'acquired'), pokrycie = średnia ważona popytem @ waga 1.0.
	// Deklaracje/diagnoza zostają w aplikacji (Kanban, analiza luk) — D1.
	// OFF = zachowanie jak dotąd (deklaracje + calculateCoverage).
	const verifiedOnly = isFeatureEnabled("passportVerifiedOnly");
	let coverage: number;
	let passportCompetencies: PassportData["competencies"];
	if (verifiedOnly) {
		const [verifiedNames, catalog] = await Promise.all([
			loadVerifiedCompetencyNames(db, student.id),
			loadMarketCatalog(student.careerGoal),
		]);
		coverage = computeDemandCoverage(
			catalog,
			verifiedNames.map((name) => ({ name })),
		);
		passportCompetencies = buildVerifiedPassportCompetencies(verifiedNames, catalog);
	} else {
		coverage = calculateCoverage(studentCompetencies, studentGaps.length);
		passportCompetencies = studentCompetencies.map((c) => ({
			name: c.name,
			status: c.status,
			marketPercentage: c.marketPercentage,
		}));
	}

	// Create or update passport
	let passport = await db.query.passports.findFirst({
		where: eq(passports.studentId, student.id),
	});

	if (!passport) {
		const [created] = await db
			.insert(passports)
			.values({
				studentId: student.id,
				tenantId: student.tenantId,
				marketCoveragePercent: coverage,
			})
			.returning();
		passport = created;
	} else if (passport.marketCoveragePercent !== coverage) {
		const [updated] = await db
			.update(passports)
			.set({ marketCoveragePercent: coverage, updatedAt: new Date() })
			.where(eq(passports.id, passport.id))
			.returning();
		passport = updated;
	}

	const verifiedSubmissions = await db.query.projectSubmissions.findMany({
		where: and(
			eq(projectSubmissions.studentId, student.id),
			eq(projectSubmissions.status, "verified"),
		),
		with: { project: true },
	});

	// B8/1.6: decyzje człowieka dla plakietki „Oceniał człowiek" (ADR-011).
	const humanReviews = verifiedSubmissions.length
		? await db.query.submissionReviews.findMany({
				where: inArray(
					submissionReviews.submissionId,
					verifiedSubmissions.map((s) => s.id),
				),
				columns: { submissionId: true, decision: true, reviewerType: true },
			})
		: [];

	// 0.15/D5: mapowanie z jednego źródła (passport-utils) — identyczny blok żył
	// też w publicznym paszporcie.
	const projectReceipts = mapSubmissionsToReceipts(
		verifiedSubmissions,
		buildHumanReviewMap(humanReviews),
	);

	const passportData: PassportData = {
		id: passport.id,
		student: {
			name: session.user.name,
			university: student.university,
			fieldOfStudy: student.fieldOfStudy,
			semester: student.semester,
			careerGoal: student.careerGoal,
		},
		marketCoveragePercent: coverage,
		competencies: passportCompetencies,
		gapCount: studentGaps.length,
		generatedAt: passport.updatedAt.toISOString(),
		projectReceipts,
		shareToken: passport.shareToken,
		publicEnabled: passport.publicEnabled,
	};

	return <PassportView data={passportData} />;
}
