"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { COPY } from "@/lib/career-helper/copy";
import {
	MAX_TURNS,
	type RestartResponse,
	type SessionStateResponse,
	type SummaryResponse,
} from "@/lib/career-helper/types";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";

/**
 * Ekran 2 — rozmowa (spec §4, 8 stanów). Maszyna stanów chatu z §4.5.
 * Strumień przez useChat (@ai-sdk/react v6) — konsumuje natywny
 * toUIMessageStreamResponse z /turn. Numer tury czyta z nagłówka
 * x-career-helper-turn (kontrakt Ethana §4.2 — front nie liczy tur sam).
 *
 * Filtr kryzysowy: backend zwraca {crisis:true} JSON (200) zamiast strumienia,
 * gdy /turn wykryje kryzys PRZED modelem → S5 paused_crisis (statyczny modal).
 */
export function ChatScreen({
	sessionId,
	crisisSupportMessage = COPY.chat.defaultCrisisSupportMessage,
	onShowSummary,
	onRestart,
}: {
	sessionId: string;
	crisisSupportMessage?: string;
	/** Wywoływane gdy /summary się powiedzie — rodzic przełącza na ekran 3. */
	onShowSummary: (summary: SummaryResponse) => void;
	/** Wywoływane gdy restart utworzy nową sesję. */
	onRestart: (newSessionId: string) => void;
}) {
	const [turn, setTurn] = useState(0);
	const [input, setInput] = useState("");
	const [crisis, setCrisis] = useState(false);
	const [interrupted, setInterrupted] = useState(false);
	const [retried, setRetried] = useState(false);
	const [summaryPending, setSummaryPending] = useState(false);
	const [restarting, setRestarting] = useState(false);
	const [restartError, setRestartError] = useState(false);
	const [rehydrated, setRehydrated] = useState(false);

	// Transport: wstrzykujemy fetch czytający nagłówek tury z odpowiedzi /turn.
	const transport = useRef(
		new DefaultChatTransport({
			api: `/api/career-helper/session/${sessionId}/turn`,
			// useChat wysyła { messages, ... }; backend oczekuje { userMessage }.
			prepareSendMessagesRequest: ({ messages }) => {
				const last = messages[messages.length - 1];
				const text =
					last?.parts
						?.filter((p) => p.type === "text")
						.map((p) => ("text" in p ? p.text : ""))
						.join("") ?? "";
				return { body: { userMessage: text } };
			},
			fetch: async (input, init) => {
				const res = await fetch(input, init);
				const hdr = res.headers.get("x-career-helper-turn");
				if (hdr) {
					const n = Number(hdr);
					if (Number.isFinite(n)) setTurn(n);
				}
				// Kryzys: backend zwraca JSON {crisis:true} z content-type application/json.
				const ct = res.headers.get("content-type") ?? "";
				if (ct.includes("application/json")) {
					const clone = res.clone();
					try {
						const data = (await clone.json()) as { crisis?: boolean };
						if (data.crisis) setCrisis(true);
					} catch {
						/* nie-JSON albo strumień — ignorujemy */
					}
				}
				return res;
			},
		}),
	).current;

	const { messages, sendMessage, status, regenerate } = useChat({
		transport,
	});

	// Rehydracja: GET /session — odtwórz historię i stan (spec §4.5 montaż chatu).
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(`/api/career-helper/session/${sessionId}`);
				if (!res.ok) {
					setRehydrated(true);
					return;
				}
				const data = (await res.json()) as SessionStateResponse;
				if (cancelled) return;
				setTurn(data.turn);
				if (data.status === "interrupted") setInterrupted(true);
				// Pierwsza tura (brak historii) — Pomocnik pisze otwierającą wiadomość.
				if (data.status === "in_progress" && data.messages.length === 0) {
					sendMessage({ text: "" });
				}
			} catch {
				/* offline / błąd — pokażemy stan jak start */
			} finally {
				if (!cancelled) setRehydrated(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [sessionId, sendMessage]);

	// Błąd strumienia (§4.5): wykrywamy ZBOCZE wejścia w błąd (prev≠error → error),
	// żeby ten sam błąd nie liczył się podwójnie. Pierwsze zbocze → retry 1× po 2s;
	// drugie zbocze (błąd po retry) → interrupted. retried trzymamy w ref (zmiana
	// nie re-triggeruje efektu, inaczej eskalowalibyśmy natychmiast).
	const prevStatus = useRef<typeof status>("ready");
	const retriedRef = useRef(false);
	retriedRef.current = retried;
	useEffect(() => {
		const enteredError = status === "error" && prevStatus.current !== "error";
		prevStatus.current = status;
		if (!enteredError) return;
		// Kryzys: /turn zwraca JSON {crisis:true} (nie strumień) → useChat zgłasza
		// "error". To NIE jest błąd techniczny — modal S5 ma priorytet, nie retry.
		if (crisis) return;
		if (!retriedRef.current) {
			setRetried(true);
			const t = setTimeout(() => regenerate(), 2000);
			return () => clearTimeout(t);
		}
		setInterrupted(true);
	}, [status, regenerate, crisis]);

	const turnLimitReached = turn >= MAX_TURNS && status === "ready";
	const isStreaming = status === "streaming" || status === "submitted";

	const handleSend = useCallback(() => {
		if (input.trim().length === 0) return;
		setRetried(false);
		sendMessage({ text: input });
		setInput("");
	}, [input, sendMessage]);

	async function handleShowSummary() {
		setSummaryPending(true);
		try {
			const res = await fetch(`/api/career-helper/session/${sessionId}/summary`, {
				method: "POST",
			});
			if (!res.ok) throw new Error("summary_failed");
			const data = (await res.json()) as SummaryResponse;
			onShowSummary(data);
		} catch {
			// Błąd /summary → ekran 3 stan summary_error (rodzic obsłuży przez onShowSummary
			// null-marker; tu pokazujemy ponowną próbę przez przywrócenie CTA).
			setSummaryPending(false);
			onShowSummary({
				judged: false,
				judgedFor: "warstwa4_failed",
				summaryText: null,
				careerPaths: [],
			});
		}
	}

	async function handleRestart() {
		setRestartError(false);
		try {
			const res = await fetch(`/api/career-helper/session/${sessionId}/restart`, {
				method: "POST",
			});
			if (!res.ok) throw new Error("restart_failed");
			const data = (await res.json()) as RestartResponse;
			onRestart(data.sessionId);
		} catch {
			setRestartError(true);
		}
	}

	// Render wiadomości z UIMessage.parts (v6).
	// B0 — tura otwierająca: front wysyła sendMessage({ text: "" }) jako wyzwalacz,
	// więc w `messages` pojawia się PUSTA wiadomość usera. NIE wolno renderować jej
	// jako pustego dymka — filtrujemy puste tury usera (AI zostaje zawsze: typing/stream).
	const rendered = messages
		.map((m) => ({
			role: m.role === "assistant" ? ("ai" as const) : ("user" as const),
			content: m.parts
				.filter((p) => p.type === "text")
				.map((p) => ("text" in p ? p.text : ""))
				.join(""),
		}))
		.filter((m) => m.role === "ai" || m.content.trim().length > 0);

	if (summaryPending) {
		return (
			<output
				className="mx-auto flex min-h-[60vh] w-full max-w-[700px] flex-col items-center justify-center gap-4 px-8 text-center"
				aria-live="polite"
			>
				<Loader2 className="size-12 animate-spin text-primary" />
				<h2 className="text-2xl font-bold text-foreground">{COPY.chat.summaryPending.title}</h2>
				<p className="whitespace-pre-line text-sm text-muted-foreground">
					{COPY.chat.summaryPending.desc}
				</p>
			</output>
		);
	}

	return (
		<div className="flex min-h-[calc(100vh-72px)] flex-col">
			<header className="border-b px-8 py-4">
				<div className="mx-auto flex max-w-[720px] items-start justify-between gap-4">
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl font-semibold text-foreground">{COPY.chat.title}</h1>
						<p className="text-sm text-muted-foreground">{COPY.chat.subtitle}</p>
					</div>
					<span className="shrink-0 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
						{COPY.chat.turnCounter(turn, MAX_TURNS)}
					</span>
				</div>
			</header>

			<div
				role="log"
				aria-live="polite"
				aria-relevant="additions"
				aria-busy={isStreaming}
				className="flex-1 overflow-y-auto px-8 py-6"
			>
				<div className="mx-auto flex max-w-[720px] flex-col gap-5">
					{!rehydrated && rendered.length === 0 && <ChatMessage author="ai" content="" typing />}
					{rendered.map((m, i) => {
						const isLast = i === rendered.length - 1;
						return (
							<ChatMessage
								key={`${m.role}-${i}`}
								author={m.role}
								content={m.content}
								streaming={isLast && m.role === "ai" && status === "streaming"}
								errored={isLast && m.role === "ai" && status === "error" && retried}
							/>
						);
					})}
					{isStreaming && rendered[rendered.length - 1]?.role !== "ai" && (
						<ChatMessage author="ai" content="" typing />
					)}
				</div>
			</div>

			{/* Stan błędu strumienia (S4) — toast inline z akcją Ponów (przed interrupted). */}
			{status === "error" && !interrupted && (
				<div role="alert" className="mx-auto mb-2 w-full max-w-[720px] px-8">
					<div className="flex items-center justify-between gap-3 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
						<span>
							{COPY.chat.streamError.title} — {COPY.chat.streamError.desc}
						</span>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								setRetried(false);
								regenerate();
							}}
							aria-label="Ponów wiadomość AI"
						>
							{COPY.chat.streamError.action}
						</Button>
					</div>
				</div>
			)}

			{turnLimitReached ? (
				<div className="sticky bottom-0 flex flex-col items-center gap-3 border-t bg-background px-8 py-6">
					<Button type="button" onClick={handleShowSummary} aria-label="Pokaż podsumowanie rozmowy">
						{COPY.chat.turnLimit.cta}
					</Button>
				</div>
			) : (
				<ChatInput
					value={input}
					onChange={setInput}
					onSend={handleSend}
					disabled={isStreaming || turnLimitReached}
					placeholder={
						isStreaming ? COPY.chat.inputPlaceholderDisabled : COPY.chat.inputPlaceholderDefault
					}
				/>
			)}

			{/* S5 — paused_crisis (statyczny, NIE z LLM). Escape NIE zamyka. */}
			<Dialog open={crisis}>
				<DialogContent
					showCloseButton={false}
					onEscapeKeyDown={(e) => e.preventDefault()}
					onInteractOutside={(e) => e.preventDefault()}
				>
					<DialogHeader>
						<DialogTitle>{COPY.chat.crisis.title}</DialogTitle>
						<DialogDescription className="whitespace-pre-line">
							{COPY.chat.crisis.desc(crisisSupportMessage)}
						</DialogDescription>
					</DialogHeader>
					<p className="text-xs text-muted-foreground">{COPY.chat.crisis.footnote}</p>
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={() => setCrisis(false)}>
							{COPY.chat.crisis.buttonGhost}
						</Button>
						<Button type="button" asChild>
							<a href="tel:116123">{COPY.chat.crisis.buttonPrimary}</a>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* S8 — interrupted (modal). Escape = kontynuuj (zamyka modal). */}
			<Dialog open={interrupted} onOpenChange={(open) => !open && setInterrupted(false)}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>{COPY.chat.interrupted.title}</DialogTitle>
						<DialogDescription>{COPY.chat.interrupted.desc}</DialogDescription>
					</DialogHeader>
					{restartError && (
						<p role="alert" className="text-sm text-destructive">
							{COPY.chat.interrupted.restartError}
						</p>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								setRestarting(true);
								handleRestart().finally(() => setRestarting(false));
							}}
							disabled={restarting}
						>
							{COPY.chat.interrupted.buttonGhost}
						</Button>
						<Button
							type="button"
							onClick={() => {
								setInterrupted(false);
								setRetried(false);
							}}
						>
							{COPY.chat.interrupted.buttonPrimary}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
