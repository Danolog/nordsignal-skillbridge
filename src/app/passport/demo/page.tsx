import type { Metadata } from "next";
import { PassportPublic } from "@/components/passport/passport-public";
import type { PassportData } from "@/components/passport/passport-view";

// Przykładowy paszport kompetencji — trasa demonstracyjna dla landingu #6 (CTA pracodawcy).
// Dane są W KODZIE, fikcyjne (RODO: nie dotyczą prawdziwej osoby) — ZERO zapytań i zapisu do bazy.
// Renderuje TEN SAM komponent co realny paszport publiczny (PassportPublic), żeby pokazać
// pracodawcy faktyczny wygląd profilu kandydata bez ujawniania danych prawdziwego studenta.
// noindex/nofollow — jak realny paszport publiczny.

export const metadata: Metadata = {
	title: "Przykładowy paszport kompetencji | SkillBridge",
	description:
		"Przykładowy paszport kompetencji — pokazujemy na nim, jak wygląda profil kandydata. Dane fikcyjne, nie dotyczą prawdziwej osoby.",
	robots: { index: false, follow: false },
};

// Fikcyjna persona — Anna Kowalska, Informatyka, semestr 4, cel: Analityk danych.
// Kilka kompetencji opanowanych, kilka w trakcie, kilka luk (gapCount). Pokrycie ~60%.
const DEMO_DATA: PassportData = {
	id: "demo",
	student: {
		name: "Anna Kowalska",
		university: "Przykładowa Uczelnia",
		fieldOfStudy: "Informatyka",
		semester: 4,
		careerGoal: "Analityk danych (Data Analyst)",
	},
	marketCoveragePercent: 60,
	competencies: [
		{ name: "Analiza danych", status: "acquired", marketPercentage: 88 },
		{ name: "SQL i bazy danych", status: "acquired", marketPercentage: 82 },
		{ name: "Python", status: "acquired", marketPercentage: 79 },
		{ name: "Statystyka opisowa", status: "acquired", marketPercentage: 71 },
		{ name: "Wizualizacja danych", status: "in_progress", marketPercentage: 64 },
		{ name: "Uczenie maszynowe", status: "in_progress", marketPercentage: 58 },
	],
	// Luki — kompetencje rynkowe, których jeszcze nie pokryto (kilka braków).
	gapCount: 4,
	generatedAt: "2026-06-01T10:00:00.000Z",
	projectReceipts: [
		{
			projectTitle: "Analiza wynagrodzeń w Polsce na podstawie danych GUS",
			projectLevel: "L1",
			score: 88,
			verifiedAt: "2026-05-12T10:00:00.000Z",
			repoUrl: "https://github.com/demo-anna/analiza-wynagrodzen-gus",
			notebookUrl: null,
			// Opinia sprawdzającego — dane przykładowe.
			feedback:
				"Czysty pipeline pobrania z BDL GUS, trafna analiza trendów płac wg branż. Brakuje testu odporności na braki w danych — drobiazg. Solidny start.",
		},
		{
			projectTitle: "Dashboard edukacyjny z danych GUS",
			projectLevel: "L2",
			score: 81,
			verifiedAt: "2026-05-20T10:00:00.000Z",
			repoUrl: "https://github.com/demo-anna/dashboard-edukacyjny-gus",
			notebookUrl: null,
			feedback:
				"Cztery interaktywne widgety, dobra narracja danych o szkolnictwie wyższym. Filtr po województwie działa. Storytelling do dociągnięcia, ale wynik czytelny dla odbiorcy nietechnicznego.",
		},
		{
			projectTitle: "Model predykcji cen mieszkań",
			projectLevel: "L2",
			score: 76,
			verifiedAt: "2026-05-28T10:00:00.000Z",
			repoUrl: "https://github.com/demo-anna/predykcja-cen-mieszkan",
			notebookUrl: null,
			feedback:
				"Regresja z walidacją krzyżową, poprawne metryki RMSE/R². Feature engineering podstawowy — przy większym zbiorze warto rozbudować. Wnioski sformułowane jasno.",
		},
	],
};

export default function DemoPassportPage() {
	return (
		<>
			{/* Adnotacja: to paszport przykładowy, nie dane prawdziwej osoby. */}
			<p
				role="note"
				className="bg-ed-ink px-6 py-3 text-center text-[13px] leading-[1.6] text-ed-cream"
			>
				To paszport przykładowy — pokazujemy na nim, jak wygląda profil kandydata, nie dane
				prawdziwej osoby.
			</p>
			<PassportPublic data={DEMO_DATA} />
		</>
	);
}
