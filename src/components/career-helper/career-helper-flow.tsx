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
 *   - standalone (trasa /pomocnik-kariery, student już-onboardowany): po wyborze
 *     ścieżki SummaryScreen woła `select-path` (NADPISUJE students.career_goal w bazie),
 *     następnie router.push("/onboarding"). Dzisiejsze zachowanie — niezmienione.
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
}: {
	initialSessionId?: string;
	crisisSupportMessage?: string;
	/**
	 * Tryb embedded (Krok 0 onboardingu): wołany z wybraną etykietą ścieżki ZAMIAST
	 * router.push. Gdy niezdefiniowany → tryb standalone (router.push + select-path).
	 */
	onCareerGoalChosen?: (careerLabel: string) => void;
}) {
	const router = useRouter();
	const embedded = typeof onCareerGoalChosen === "function";
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
				// Tryb persystencji: standalone woła select-path (nadpis w bazie);
				// embedded NIE woła (brak rekordu studenta — spec §1.3/§3.1).
				persistOnSelect={!embedded}
				onSelectPathDone={(careerLabel) => {
					if (embedded) {
						// Krok 0 wizarda: cel płynie w pamięci do POST /api/onboarding.
						onCareerGoalChosen?.(careerLabel);
						return;
					}
					// Standalone: B0 jako wyspa — po zapisie select-path wracamy do onboardingu.
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
