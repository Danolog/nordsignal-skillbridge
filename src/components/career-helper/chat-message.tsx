"use client";

import { COPY } from "@/lib/career-helper/copy";
import { cn } from "@/lib/utils";

/**
 * ChatMessage (kompozyt B0.2, spec §6.2) — wiadomość AI/User w wątku.
 * AI: lewo, avatar „P”, label „Pomocnik”. User: prawo, bez avatara.
 * typing → kropki; streaming → migający kursor na końcu; errored → ramka błędu.
 */
export function ChatMessage({
	author,
	content,
	typing = false,
	streaming = false,
	errored = false,
}: {
	author: "ai" | "user";
	content: string;
	typing?: boolean;
	streaming?: boolean;
	errored?: boolean;
}) {
	if (author === "user") {
		return (
			<div className="flex justify-end">
				<div className="max-w-[520px] whitespace-pre-wrap rounded-xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-primary-foreground">
					{content}
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-start gap-3">
			<div
				aria-hidden="true"
				className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
			>
				P
			</div>
			<div className="flex max-w-[600px] flex-col gap-1">
				<span className="text-xs font-semibold text-muted-foreground">{COPY.chat.aiLabel}</span>
				<div
					className={cn(
						"whitespace-pre-wrap rounded-xl rounded-tl-sm border bg-card px-4 py-3 text-sm text-card-foreground",
						errored && "border-destructive",
					)}
				>
					{typing ? (
						<TypingDots />
					) : (
						<>
							{content}
							{streaming && (
								<span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-foreground align-middle" />
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

/** Typing dots (animacja ad hoc — token transition brak w fundamencie v0.1.1, spec §0). */
function TypingDots() {
	return (
		<span className="inline-flex items-center gap-1.5 py-1">
			<span className="sr-only">Pomocnik pisze</span>
			<span
				aria-hidden="true"
				className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]"
			/>
			<span
				aria-hidden="true"
				className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:200ms]"
			/>
			<span
				aria-hidden="true"
				className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:400ms]"
			/>
		</span>
	);
}
