import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

// Kroki nauki — używane w briefach projektów (Project Marketplace).
// Wydzielone z usuniętego modułu micro-courses (ADR-008, Z3) — generate-brief
// konsumuje generateLearningSteps niezależnie od micro-courses.

export type LearningStep = {
	title: string;
	content: string;
	exercise?: string;
};

export async function generateLearningSteps(
	competencyName: string,
	careerGoal: string,
	semester: number,
	relatedCompetencies: string[],
	maxSteps = 3,
): Promise<LearningStep[]> {
	const { text } = await generateText({
		model: anthropic("claude-sonnet-4-6"),
		maxOutputTokens: 2000,
		prompt: `Jesteś ekspertem edukacji technicznej. Stwórz ${maxSteps} krótkich kroków nauki dla studenta ${semester}. semestru, który chce zostać ${careerGoal}.

Temat: ${competencyName}
Student już zna: ${relatedCompetencies.slice(0, 5).join(", ") || "brak danych"}

Każdy krok: tytuł + treść (max 150 słów, markdown). Opcjonalnie ćwiczenie.
Język: POLSKI

Zwróć TYLKO JSON (bez markdown code block):
[{"title": "...", "content": "...", "exercise": "..."}]`,
	});

	const cleaned = text
		.trim()
		.replace(/^```(?:json)?\n?/, "")
		.replace(/\n?```$/, "");
	try {
		return JSON.parse(cleaned) as LearningStep[];
	} catch {
		const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
		if (jsonMatch) return JSON.parse(jsonMatch[0]) as LearningStep[];
		throw new Error("AI zwróciło nieprawidłowy JSON");
	}
}
