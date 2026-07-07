import { eq } from "drizzle-orm";
import { ensureCareerModelLoaded } from "@/lib/career-model/loader";
import { db } from "@/lib/db";
import { competencies, gaps, skillMaps, students } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { getCompetencyContext } from "@/lib/onboarding/competency-groups";
import { buildGraph, enrichNodesWithGroupContext } from "@/lib/skill-map/build-graph";

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
		const [studentCompetencies, studentGaps, student] = await Promise.all([
			db.query.competencies.findMany({
				where: eq(competencies.studentId, studentId),
			}),
			db.query.gaps.findMany({
				where: eq(gaps.studentId, studentId),
			}),
			db.query.students.findFirst({
				where: eq(students.id, studentId),
			}),
		]);

		const { nodes: rawNodes, edges } = buildGraph(
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

		// C4: dokładamy kontekst grupy (nazwa, opis „po co", unionShare, kind) do węzłów
		// PO zbudowaniu czystego grafu — złączenie przy renderze z modelem kariery po
		// careerGoal + nazwie. buildGraph zostaje czysty.
		// 1.0: preload modelu (flaga off = no-op) — getCompetencyContext niżej czyta sync.
		await ensureCareerModelLoaded();
		const careerGoal = student?.careerGoal;
		const nodes = careerGoal
			? enrichNodesWithGroupContext(rawNodes, (name) => getCompetencyContext(careerGoal, name))
			: rawNodes;

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
