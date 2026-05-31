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
 * (zachowane answers po stronie backendu — nowa sesja z answers). Po wyborze
 * ścieżki → przejście do kroku 4 onboardingu (decyzja IA Sophii: B0 to wyspa,
 * powrót przez router; redirectTo z API jest ilustracją, nie wiążący).
 *
 * crisisSupportMessage przekazany z server-component (per tenant, Beta:
 * neutralny default). Disclaimer i komunikat kryzysowy żyją w kodzie, nie z API.
 */
export function CareerHelperFlow({
	initialSessionId,
	crisisSupportMessage,
}: {
	initialSessionId?: string;
	crisisSupportMessage?: string;
}) {
	const router = useRouter();
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
				onSelectPathDone={() => {
					// IA Sophii: B0 to krok onboardingu; po wyborze → krok 4 (samoocena).
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
