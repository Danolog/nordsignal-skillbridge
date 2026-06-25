import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { competencies, gaps, skillMaps } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { buildGraph } from "@/lib/skill-map/build-graph";

/**
 * Generuje mapę kompetencji (skill map) studenta — DETERMINISTYCZNIE, bez LLM.
 *
 * Wcześniej tę mapę tworzył osobny model (`generateObject`), który sam wymyślał
 * „brakujące" kompetencje i krawędzie — niezależnie od tabeli `gaps`. Skutkowało
 * to rozjeżdżającymi się liczbami między dashboardem, mapą i analizą luk.
 *
 * Teraz graf jest WYPROWADZANY z jedynego źródła prawdy: bieżących kompetencji
 * studenta (`competencies`, ze statusem) + luk (`gaps`). Dzięki temu liczba
 * węzłów "missing" na mapie == liczba luk wszędzie indziej. Logika grafu w
 * `src/lib/skill-map/build-graph.ts` (czysta funkcja, testowalna jednostkowo).
 *
 * WAŻNE: wołać PO `generateGaps` — graf czyta świeże luki i statusy, które
 * `generateGaps` właśnie zapisał. Kolejność egzekwuje POST /api/onboarding
 * (sekwencja zamiast Promise.all).
 *
 * Sygnatura uproszczona do (studentId, tenantId) — funkcja czyta kompetencje
 * i luki z bazy sama; nie potrzebuje już listy nazw ani celu kariery (graf nie
 * jest już budowany z promptu).
 */
export async function generateSkillMap(studentId: string, tenantId: string): Promise<void> {
	try {
		const [studentCompetencies, studentGaps] = await Promise.all([
			db.query.competencies.findMany({
				where: eq(competencies.studentId, studentId),
			}),
			db.query.gaps.findMany({
				where: eq(gaps.studentId, studentId),
			}),
		]);

		const { nodes, edges } = buildGraph(
			studentCompetencies.map((c) => ({
				name: c.name,
				status: c.status,
				marketPercentage: c.marketPercentage,
			})),
			studentGaps.map((g) => ({
				competencyName: g.competencyName,
				marketPercentage: g.marketPercentage,
			})),
		);

		const existing = await db.query.skillMaps.findFirst({
			where: eq(skillMaps.studentId, studentId),
		});

		if (existing) {
			await db
				.update(skillMaps)
				.set({
					tenantId,
					nodes,
					edges,
					updatedAt: new Date(),
				})
				.where(eq(skillMaps.studentId, studentId));
		} else {
			await db.insert(skillMaps).values({
				studentId,
				tenantId,
				nodes,
				edges,
			});
		}
	} catch (err) {
		logError("generate-skill-map", err, { studentId });
		throw err;
	}
}
