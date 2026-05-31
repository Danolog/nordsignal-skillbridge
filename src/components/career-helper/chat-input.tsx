"use client";

import { ArrowRight } from "lucide-react";
import { COPY } from "@/lib/career-helper/copy";
import { cn } from "@/lib/utils";

/**
 * ChatInput (kompozyt B0.3, spec §6.3) — textarea + Send sticky na dole.
 * Enter = onSend (gdy value niepuste); Shift+Enter = nowy wiersz; Escape = brak.
 * a11y: aria-multiline, aria-label, Send disabled gdy puste lub disabled.
 */
export function ChatInput({
	value,
	onChange,
	onSend,
	disabled = false,
	placeholder,
}: {
	value: string;
	onChange: (v: string) => void;
	onSend: () => void;
	disabled?: boolean;
	placeholder?: string;
}) {
	const canSend = !disabled && value.trim().length > 0;

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (canSend) onSend();
		}
		// Escape celowo nie zamyka czatu (spec §6.3).
	}

	return (
		<div className="sticky bottom-0 border-t bg-background px-4 py-4 sm:px-8">
			<div className="mx-auto flex max-w-[720px] items-end gap-3">
				<textarea
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					rows={3}
					aria-multiline="true"
					aria-label="Napisz wiadomość do Pomocnika"
					placeholder={placeholder ?? COPY.chat.inputPlaceholderDefault}
					className={cn(
						"min-h-[88px] flex-1 resize-none rounded-xl border bg-card px-4 py-3 text-sm shadow-xs outline-none transition-[color,box-shadow]",
						"placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"disabled:cursor-not-allowed disabled:opacity-50",
					)}
				/>
				<button
					type="button"
					onClick={onSend}
					disabled={!canSend}
					aria-label={COPY.chat.sendLabel}
					className={cn(
						"flex size-[88px] shrink-0 items-center justify-center rounded-xl transition-colors",
						"focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
						canSend
							? "bg-primary text-primary-foreground hover:bg-primary/90"
							: "cursor-not-allowed bg-muted text-muted-foreground",
					)}
				>
					<ArrowRight className="size-7" strokeWidth={2.5} />
				</button>
			</div>
			<p className="mx-auto mt-2 max-w-[720px] text-xs text-muted-foreground">
				{COPY.chat.inputHint}
			</p>
		</div>
	);
}
