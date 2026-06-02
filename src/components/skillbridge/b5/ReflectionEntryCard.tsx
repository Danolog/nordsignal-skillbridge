"use client";

/**
 * ReflectionEntryCard — karta jednej refleksji w widoku „Moja droga" (B5 powierzchnia B).
 *
 * Read-only. Pola pominięte (null/pusty string) nie renderują się.
 * Etykiety pytań (R2) pobierane z QUESTION_LABELS — jedno źródło brzmienia.
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §5.4
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUESTION_LABELS = {
	surprised: "Co cię w tym projekcie zaskoczyło?",
	frustrated: "Co cię w nim wkurzyło albo zniechęciło?",
	learned: "Czego dowiedziałeś się o sobie?",
} as const;

export interface ReflectionEntry {
	id: string;
	projectTitle: string;
	createdAt: string;
	answerSurprised: string | null;
	answerFrustrated: string | null;
	answerLearned: string | null;
}

interface ReflectionEntryCardProps {
	entry: ReflectionEntry;
}

export function ReflectionEntryCard({ entry }: ReflectionEntryCardProps) {
	const answers = [
		{ key: "surprised" as const, text: entry.answerSurprised },
		{ key: "frustrated" as const, text: entry.answerFrustrated },
		{ key: "learned" as const, text: entry.answerLearned },
	].filter((a) => a.text && a.text.trim().length > 0);

	const date = new Date(entry.createdAt).toLocaleDateString("pl-PL", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	// Semantyczny <li> opakowuje Card (Card renderuje div — nie li).
	// Biome a11y: role="listitem" na div jest zbędne gdy jest semantyczny <li>.
	return (
		<li className="list-none">
			<Card className="gap-4 py-4">
				<CardHeader className="pb-0">
					<CardTitle className="text-base font-semibold leading-snug">
						{entry.projectTitle}
					</CardTitle>
					<p className="text-xs text-muted-foreground">{date}</p>
				</CardHeader>

				{answers.length > 0 && (
					<CardContent className="flex flex-col gap-3">
						{answers.map(({ key, text }) => (
							<div key={key}>
								<p className="text-xs font-medium text-muted-foreground mb-0.5">
									{QUESTION_LABELS[key]}
								</p>
								<p className="text-sm text-foreground leading-relaxed">{text}</p>
							</div>
						))}
					</CardContent>
				)}

				{answers.length === 0 && (
					<CardContent>
						<p className="text-sm text-muted-foreground italic">
							Żadna odpowiedź nie została zapisana.
						</p>
					</CardContent>
				)}
			</Card>
		</li>
	);
}
