import { generateText } from "ai";
import { getModel } from "@/lib/ai/model";

export async function generateFacultySuggestions(
	topMissingCompetencies: Array<{ name: string; requiredByPercent: number }>,
	studentCount: number,
): Promise<string[]> {
	const { text } = await generateText({
		model: getModel("standard"),
		maxOutputTokens: 600,
		prompt: `Jesteś ekspertem ds. programów nauczania. Masz dane z ${studentCount} studentów uczelni.

Top brakujące kompetencje (których najbardziej brakuje studentom):
${topMissingCompetencies
	.slice(0, 5)
	.map((c) => `- ${c.name}: wymagana przez ${c.requiredByPercent}% ofert pracy`)
	.join("\n")}

Wygeneruj 3-5 konkretnych sugestii dla rady programowej uczelni.
Format każdej sugestii: "Rozważ dodanie modułu o [temat] — X% ofert na stanowisko [Y] tego wymaga."
Pisz po polsku, konkretnie i zwięźle.
Zwróć TYLKO tablicę JSON z ciągami znaków (bez markdown):
["Sugestia 1", "Sugestia 2", "Sugestia 3"]`,
	});
	const cleaned = text
		.trim()
		.replace(/^```(?:json)?\n?/, "")
		.replace(/\n?```$/, "");
	return JSON.parse(cleaned) as string[];
}
