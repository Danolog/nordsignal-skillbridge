// ============================================================================
// AG.7 — PAMIĘĆ DORADCY MIĘDZY SESJAMI (za flagą `advisorMemory`).
//
// Doradca (Pomocnik Wyboru Kariery) dostaje do promptu ZWIĘZŁY kontekst
// studenta zbudowany Z BAZY (źródło prawdy — decyzja: NIE Managed Agents
// memory store), zamiast zaczynać każdą sesję od zera:
//  • profil (cel, kierunek, semestr)            → students
//  • wskazane wcześniej obszary                  → student_career_paths
//  • największe luki                             → gaps
//  • zweryfikowane projekty                      → project_submissions+projects
//  • fakty z poprzednich rozmów (podsumowania)   → advisor_memory (0024)
//
// Podział na dwie warstwy (testowalność):
//  • composeAdvisorContext — CZYSTA funkcja dane→tekst (limity, sanitize),
//  • loadAdvisorContext    — cienkie zapytania przez tx z withTenantContext
//    (RLS ogranicza odczyt do własnych wierszy studenta — defense-in-depth).
//
// Koszt: zero nowych wywołań LLM — kontekst to dodatkowe tokeny wejścia
// (cap ADVISOR_CONTEXT_MAX_LEN chroni budżet i okno).
// ============================================================================

import { and, desc, eq } from "drizzle-orm";
import { sanitizeForPrompt } from "@/lib/ai/sanitize";
import {
	advisorMemory,
	gaps,
	projectSubmissions,
	projects,
	studentCareerPaths,
	students,
} from "@/lib/db/schema";
import type { withTenantContext } from "@/lib/db/tenant-context";

/** Tx z withTenantContext (typ nie jest eksportowany wprost — wyprowadzony). */
type TenantTx = Parameters<Parameters<typeof withTenantContext>[1]>[0];

/** Twardy cap całego bloku kontekstu (znaki) — chroni okno i budżet tokenów. */
export const ADVISOR_CONTEXT_MAX_LEN = 1500;

/** Ile ostatnich podsumowań rozmów wchodzi do kontekstu. */
const MAX_PAST_SUMMARIES = 2;
/** Cap pojedynczego podsumowania w kontekście. */
const PAST_SUMMARY_MAX_LEN = 300;
/** Ile luk / projektów / obszarów najwyżej wymieniamy. */
const MAX_GAPS = 5;
const MAX_PROJECTS = 3;
const MAX_PATHS = 3;

export interface AdvisorMemoryData {
	profile: {
		careerGoal: string | null;
		fieldOfStudy: string | null;
		semester: number | null;
	} | null;
	/** Obszary wskazane w poprzednich sesjach (primary pierwszy). */
	careerPaths: { label: string; isPrimary: boolean }[];
	/** Luki studenta (dowolna kolejność — compose sortuje po priorytecie). */
	gaps: { competencyName: string; priority: string; marketPercentage: number }[];
	/** Tytuły zweryfikowanych projektów (najnowsze pierwsze). */
	verifiedProjects: string[];
	/** Treści faktów z advisor_memory (najnowsze pierwsze). */
	pastSummaries: string[];
}

const PRIORITY_LABEL: Record<string, string> = {
	critical: "krytyczna",
	important: "ważna",
	nice_to_have: "miło-mieć",
};
const PRIORITY_RANK: Record<string, number> = { critical: 3, important: 2, nice_to_have: 1 };

/** Pojedynczy fragment do promptu — sanitize + twardy cap (dane szły przez LLM/studenta). */
function piece(raw: string, max = 200): string {
	// sanitizeForPrompt rozbraja tylko delimiter `user_input` (choke-point repo).
	// Blok pamięci ma WŁASNY delimiter <student_context> — rozspajamy jego token
	// tą samą techniką, żeby treść z bazy nie mogła zamknąć bloku od środka.
	return sanitizeForPrompt(raw.trim(), max).replace(/student_context/gi, "student context");
}

/**
 * CZYSTA kompozycja kontekstu. Puste dane → null (nie wstrzykujemy pustych
 * nagłówków). Wynik deterministyczny; każda linia to jedna sekcja.
 */
export function composeAdvisorContext(data: AdvisorMemoryData): string | null {
	const lines: string[] = [];

	if (data.profile) {
		const parts: string[] = [];
		if (data.profile.careerGoal) parts.push(`cel kariery „${piece(data.profile.careerGoal)}"`);
		if (data.profile.fieldOfStudy) parts.push(`kierunek ${piece(data.profile.fieldOfStudy)}`);
		if (data.profile.semester != null) parts.push(`semestr ${data.profile.semester}`);
		if (parts.length > 0) lines.push(`Profil: ${parts.join(", ")}.`);
	}

	if (data.careerPaths.length > 0) {
		const labels = data.careerPaths
			.slice(0, MAX_PATHS)
			.map((p) => (p.isPrimary ? `${piece(p.label, 120)} (główny)` : piece(p.label, 120)));
		lines.push(`Obszary wskazane w poprzednich sesjach: ${labels.join(", ")}.`);
	}

	if (data.gaps.length > 0) {
		const top = [...data.gaps]
			.sort(
				(a, b) =>
					(PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0) ||
					b.marketPercentage - a.marketPercentage,
			)
			.slice(0, MAX_GAPS)
			.map((g) => `${piece(g.competencyName, 120)} (${PRIORITY_LABEL[g.priority] ?? g.priority})`);
		lines.push(`Największe luki kompetencyjne: ${top.join(", ")}.`);
	}

	if (data.verifiedProjects.length > 0) {
		const titles = data.verifiedProjects.slice(0, MAX_PROJECTS).map((t) => piece(t, 150));
		const extra = data.verifiedProjects.length - titles.length;
		lines.push(
			`Zweryfikowane projekty: ${titles.join("; ")}${extra > 0 ? ` (i ${extra} więcej)` : ""}.`,
		);
	}

	if (data.pastSummaries.length > 0) {
		const quotes = data.pastSummaries
			.slice(0, MAX_PAST_SUMMARIES)
			.map((s) => `„${piece(s, PAST_SUMMARY_MAX_LEN)}"`);
		lines.push(`Z poprzednich rozmów: ${quotes.join(" · ")}`);
	}

	if (lines.length === 0) return null;
	// Cap całości — ostatnia linia może zostać ucięta; to świadomy kompromis
	// (kontekst jest pomocniczy, nie load-bearing).
	return lines.join("\n").slice(0, ADVISOR_CONTEXT_MAX_LEN);
}

/**
 * Czyta dane kontekstu przez tx z withTenantContext (role: student) — RLS
 * przycina odczyt do własnych wierszy. Zwraca gotowy blok tekstu albo null.
 * Best-effort NIE jest robione tutaj — o degradacji przy błędzie decyduje
 * wołający (trasa turn/summary łapie i leci dalej bez kontekstu).
 */
export async function loadAdvisorContext(tx: TenantTx, studentId: string): Promise<string | null> {
	const [profileRow] = await tx
		.select({
			careerGoal: students.careerGoal,
			fieldOfStudy: students.fieldOfStudy,
			semester: students.semester,
		})
		.from(students)
		.where(eq(students.id, studentId));

	const pathRows = await tx
		.select({ label: studentCareerPaths.label, isPrimary: studentCareerPaths.isPrimary })
		.from(studentCareerPaths)
		.where(eq(studentCareerPaths.studentId, studentId))
		.orderBy(desc(studentCareerPaths.isPrimary), desc(studentCareerPaths.createdAt))
		.limit(MAX_PATHS);

	const gapRows = await tx
		.select({
			competencyName: gaps.competencyName,
			priority: gaps.priority,
			marketPercentage: gaps.marketPercentage,
		})
		.from(gaps)
		.where(eq(gaps.studentId, studentId))
		.limit(40);

	const projectRows = await tx
		.select({ title: projects.title })
		.from(projectSubmissions)
		.innerJoin(projects, eq(projects.id, projectSubmissions.projectId))
		.where(
			and(eq(projectSubmissions.studentId, studentId), eq(projectSubmissions.status, "verified")),
		)
		.orderBy(desc(projectSubmissions.updatedAt))
		.limit(MAX_PROJECTS + 1);

	const memoryRows = await tx
		.select({ content: advisorMemory.content })
		.from(advisorMemory)
		.where(and(eq(advisorMemory.studentId, studentId), eq(advisorMemory.kind, "summary")))
		.orderBy(desc(advisorMemory.createdAt))
		.limit(MAX_PAST_SUMMARIES);

	return composeAdvisorContext({
		profile: profileRow ?? null,
		careerPaths: pathRows,
		gaps: gapRows,
		verifiedProjects: projectRows.map((r) => r.title),
		pastSummaries: memoryRows.map((r) => r.content),
	});
}
