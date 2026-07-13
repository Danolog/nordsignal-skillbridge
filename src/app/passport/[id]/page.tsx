import { and, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PassportPublic } from "@/components/passport/passport-public";
import type { PassportData } from "@/components/passport/passport-view";
import { db } from "@/lib/db";
import {
	competencies,
	gaps,
	passports,
	projectSubmissions,
	students,
	submissionReviews,
	user,
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

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await params;
	const passport = await db.query.passports.findFirst({
		where: and(eq(passports.shareToken, id), eq(passports.publicEnabled, true)),
	});

	// A2: link udostępnialny pracodawcy, ale niewykrywalny w wyszukiwarkach.
	// noindex/nofollow zapobiega indeksowaniu; metadane nie ujawniają PII (imienia studenta).
	const robots = { index: false, follow: false } as const;

	if (!passport) {
		return { title: "Paszport nie znaleziony", robots };
	}

	const student = await db.query.students.findFirst({
		where: eq(students.id, passport.studentId),
	});

	return {
		title: "Paszport Kompetencji | SkillBridge",
		description: `Paszport kompetencji: ${student?.careerGoal ?? ""}. Pokrycie rynkowe: ${passport.marketCoveragePercent}%`,
		robots,
	};
}

export default async function PublicPassportPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	// B1: dostęp tylko po share_token + public_enabled (zgoda studenta).
	const passport = await db.query.passports.findFirst({
		where: and(eq(passports.shareToken, id), eq(passports.publicEnabled, true)),
	});
	if (!passport) notFound();

	const student = await db.query.students.findFirst({
		where: eq(students.id, passport.studentId),
	});
	if (!student) notFound();

	const studentUser = await db.query.user.findFirst({
		where: eq(user.id, student.userId),
	});

	const [studentCompetencies, studentGaps, verifiedSubmissions] = await Promise.all([
		db.query.competencies.findMany({
			where: eq(competencies.studentId, student.id),
		}),
		db.query.gaps.findMany({
			where: eq(gaps.studentId, student.id),
		}),
		db.query.projectSubmissions.findMany({
			where: and(
				eq(projectSubmissions.studentId, student.id),
				eq(projectSubmissions.status, "verified"),
			),
			with: { project: true },
		}),
	]);

	// B8/1.6: decyzje człowieka dla plakietki „Oceniał człowiek" (ADR-011) —
	// widoczne też publicznie (to sedno wiarygodności receiptu dla rekrutera).
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
	// też w paszporcie zalogowanego (dashboard).
	const projectReceipts = mapSubmissionsToReceipts(
		verifiedSubmissions,
		buildHumanReviewMap(humanReviews),
	);

	// Blok C (C3/C4, decyzje D1/D3): przy fladze ON publiczny dokument pokazuje
	// WYŁĄCZNIE kompetencje zweryfikowane projektami + pokrycie ważone popytem
	// (@ waga 1.0). To dokument-kredencjał czytany przez rekrutera — deklaracje
	// z samooceny do niego nie wchodzą. OFF = zachowanie jak dotąd.
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

	const data: PassportData = {
		id: passport.id,
		student: {
			name: studentUser?.name ?? "Student",
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
	};

	return <PassportPublic data={data} />;
}
