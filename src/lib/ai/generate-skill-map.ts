import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { skillMaps } from "@/lib/db/schema";
import { logError } from "@/lib/log";

const SkillMapSchema = z.object({
	nodes: z.array(
		z.object({
			id: z.string(),
			data: z.object({
				label: z.string(),
				status: z.enum(["acquired", "in_progress", "missing"]),
				category: z.string(),
				marketPercentage: z.number().optional(),
			}),
			position: z.object({ x: z.number(), y: z.number() }),
			type: z.string(),
		}),
	),
	edges: z.array(
		z.object({
			id: z.string(),
			source: z.string(),
			target: z.string(),
		}),
	),
});

export async function generateSkillMap(
	studentId: string,
	tenantId: string,
	studentCompetencies: string[],
	careerGoal: string,
): Promise<void> {
	try {
		const { object } = await generateObject({
			model: anthropic("claude-sonnet-4-6"),
			schema: SkillMapSchema,
			maxOutputTokens: 8000,
			prompt: `Wygeneruj mapę umiejętności (skill map) jako graf React Flow dla studenta.

Kompetencje studenta: ${JSON.stringify(studentCompetencies)}
Cel kariery: ${careerGoal}

Zasady:
- Każda kompetencja studenta = 1 node ze status "acquired"
- Dodaj 5-10 brakujących kompetencji ze status "missing" (na podstawie wymagań rynku dla ${careerGoal})
- Możesz też oznaczyć kompetencje "in_progress" (student ma podstawy, ale wymaga rozwoju)
- marketPercentage: procent ofert pracy wymagających tej kompetencji (0-100)
- Kategorie: "programming", "data", "tools", "soft_skills", "frameworks", "devops"
- Pozycje: grupuj po kategoriach, rozstaw x co 220px, y co 100px
- Krawędzie: łącz powiązane kompetencje (np. Python→Pandas, SQL→Bazy danych)
- Węzły root (kategoria) na górze, liście na dole
- type każdego node: "skillNode"`,
		});

		const existing = await db.query.skillMaps.findFirst({
			where: eq(skillMaps.studentId, studentId),
		});

		if (existing) {
			await db
				.update(skillMaps)
				.set({
					tenantId,
					nodes: object.nodes,
					edges: object.edges,
					updatedAt: new Date(),
				})
				.where(eq(skillMaps.studentId, studentId));
		} else {
			await db.insert(skillMaps).values({
				studentId,
				tenantId,
				nodes: object.nodes,
				edges: object.edges,
			});
		}
	} catch (err) {
		logError("generate-skill-map", err, { studentId });
		throw err;
	}
}
