"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SummaryResponse } from "@/lib/career-helper/types";
import { ChatScreen } from "./chat-screen";
import { SummaryScreen } from "./summary-screen";
import { SurveyScreen } from "./survey-screen";

type Phase = "survey" | "chat" | "summary";

/**
 * Orkiestrator B0 (Pomocnik Wyboru Kariery) — przełącza 3 ekrany na kliencie.
 *
 * survey → chat → summary. Powrót do rozmowy (restart) wraca do survey
 * (zachowane answers po stronie backendu — nowa sesja z answers).
 *
 * DWA TRYBY (strumień E / #5 — wpięcie jako Krok 0 onboardingu):
 *   - standalone (trasa /pomocnik-kariery, student w trakcie onboardingu): po wyborze
 *     ścieżki SummaryScreen woła `select-path` (NADPISUJE students.career_goal w bazie),
 *     następnie router.push("/onboarding"). Dzisiejsze zachowanie — niezmienione.
 *   - standalone PO ukończeniu onboardingu (G „zmień kierunek"): NIE woła select-path
 *     (nadpis bez przeliczenia = niespójny pulpit — luka domknięta w G). Cel płynie
 *     przez URL do wizarda w trybie ?mode=change&goal=…, gdzie POST /api/onboarding
 *     przelicza wszystko spójnie. Tryb wybiera `onboardingCompleted`.
 *   - embedded (Krok 0 wizarda, nowy student bez rekordu): NIE woła select-path
 *     (brak rekordu studenta — nie ma czego nadpisać; spec §1.3/§3.1). SummaryScreen
 *     dostaje `careerLabel` przez `onSelectPath` i zwraca go callbackiem
 *     `onCareerGoalChosen` do wizarda; cel płynie w pamięci, persystencję robi
 *     finalny POST /api/onboarding (już przyjmuje careerGoal — kontrakt bez zmian).
 *
 * Tryb wybiera obecność `onCareerGoalChosen` (embedded ⇔ callback przekazany).
 * Jedna ścieżka renderu, jeden komponent — różnica tylko w obsłudze „wybrano ścieżkę"
 * (SummaryScreen dostaje tryb przez `persistOnSelect`), bez duplikatu logiki.
 *
 * crisisSupportMessage przekazany z server-component (per tenant, Beta:
 * neutralny default). Disclaimer i komunikat kryzysowy żyją w kodzie, nie z API.
 */
export function CareerHelperFlow({
	initialSessionId,
	crisisSupportMessage,
	onCareerGoalChosen,
	onboardingCompleted = false,
}: {
	initialSessionId?: string;
	crisisSupportMessage?: string;
	/**
	 * Tryb embedded (Krok 0 onboardingu): wołany z wybraną etykietą ścieżki ZAMIAST
	 * router.push. Gdy niezdefiniowany → tryb standalone (router.push + select-path).
	 */
	onCareerGoalChosen?: (careerLabel: string) => void;
	/**
	 * G — czy student ukończył już onboarding. Standalone + ukończony = „zmień kierunek":
	 * cel idzie do wizarda przez URL (bez select-path), żeby pulpit przeliczył się spójnie.
	 */
	onboardingCompleted?: boolean;
}) {
	const router = useRouter();
	const embedded = typeof onCareerGoalChosen === "function";
	// Standalone po ukończeniu = ścieżka zmiany kierunku: nie zapisujemy celu wcześnie.
	const changeDirection = !embedded && onboardingCompleted;
	const [phase, setPhase] = useState<Phase>(initialSessionId ? "chat" : "survey");
	const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
	const [summary, setSummary] = useState<SummaryResponse | null>(null);

	if (phase === "survey" || !sessionId) {
		return (
			<SurveyScreen
				onStarted={(id) => {
					setSessionId(id);
					setPhase("chat");
				}}
			/>
		);
	}

	if (phase === "summary" && summary) {
		return (
			<SummaryScreen
				sessionId={sessionId}
				summary={summary}
				// Tryb persystencji: standalone-w-trakcie woła select-path (nadpis w bazie);
				// embedded ORAZ standalone-zmiana-kierunku NIE wołają (brak rekordu / nadpis
				// bez przeliczenia = niespójny pulpit — G przepuszcza zmianę przez wizard).
				persistOnSelect={!embedded && !changeDirection}
				onSelectPathDone={(careerLabel) => {
					if (embedded) {
						// Krok 0 wizarda: cel płynie w pamięci do POST /api/onboarding.
						onCareerGoalChosen?.(careerLabel);
						return;
					}
					if (changeDirection) {
						// G: cel idzie do wizarda (tryb zmiany), który przeliczy pulpit spójnie.
						router.push(`/onboarding?mode=change&goal=${encodeURIComponent(careerLabel)}`);
						return;
					}
					// Standalone w trakcie onboardingu: po zapisie select-path wracamy do kreatora.
					router.push("/onboarding");
				}}
				onBackToChat={async () => {
					// „Nic z tego — wracam do rozmowy” → restart sesji (zachowane answers).
					try {
						const res = await fetch(`/api/career-helper/session/${sessionId}/restart`, {
							method: "POST",
						});
						if (res.ok) {
							const data = (await res.json()) as { sessionId: string };
							setSessionId(data.sessionId);
						}
					} catch {
						/* przy błędzie zostajemy na ekranie 3 */
						return;
					}
					setSummary(null);
					setPhase("chat");
				}}
				onRetrySummary={() => {
					setSummary(null);
					setPhase("chat");
				}}
			/>
		);
	}

	return (
		<ChatScreen
			sessionId={sessionId}
			crisisSupportMessage={crisisSupportMessage}
			onShowSummary={(s) => {
				setSummary(s);
				setPhase("summary");
			}}
			onRestart={(newId) => {
				setSessionId(newId);
				setSummary(null);
				setPhase("chat");
			}}
		/>
	);
}
