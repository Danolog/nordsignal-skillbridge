"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/career-helper/copy";
import { cn } from "@/lib/utils";

/**
 * CareerPathCard (kompozyt B0.4, spec §6.4) — jeden obszar zawodowy.
 *
 * ŚWIADOMIE BEZ paska prawdopodobieństwa, BEZ liczby procentowej, BEZ rankingu
 * (ADR-004 §4.3 warunek a/c, egzekucja HITL). Karta ma TYLKO label + why (opis
 * powiązania) + CTA. Backend nie serializuje probability — UI nie ma czego
 * wyrenderować, i celowo nie dodaje takiego elementu.
 *
 * Stany: default / selected / dimmed. Klik innej karty resetuje (maszyna stanów
 * w ekranie 3 — max 1 selected). aria-pressed na CTA (spec §10 ekran 3).
 */
export function CareerPathCard({
	pathLabel,
	why,
	state,
	onSelect,
}: {
	pathLabel: string;
	why: string;
	state: "default" | "selected" | "dimmed";
	onSelect: () => void;
}) {
	const isSelected = state === "selected";
	const isDimmed = state === "dimmed";

	return (
		<section
			aria-label={pathLabel}
			className={cn(
				"flex flex-col gap-4 rounded-xl border p-6 transition-colors",
				isSelected ? "border-primary border-2 bg-accent" : "border bg-card shadow-sm",
				isDimmed && "opacity-50",
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<h3
					className={cn(
						"text-xl font-bold",
						isDimmed ? "text-muted-foreground" : "text-foreground",
					)}
				>
					{pathLabel}
				</h3>
				{isSelected && (
					<span
						aria-hidden="true"
						className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
					>
						<Check className="size-4" strokeWidth={3} />
					</span>
				)}
			</div>

			<div className="flex flex-col gap-1.5">
				<p
					className={cn(
						"text-xs font-semibold",
						isDimmed ? "text-muted-foreground" : "text-muted-foreground",
					)}
				>
					{COPY.summary.whyLabel}
				</p>
				<p
					className={cn(
						"text-sm leading-relaxed",
						isDimmed ? "text-muted-foreground" : "text-foreground",
					)}
				>
					{why}
				</p>
			</div>

			<Button
				type="button"
				variant={isSelected ? "secondary" : "default"}
				size="sm"
				onClick={onSelect}
				disabled={isDimmed}
				aria-pressed={isSelected}
				aria-label={`Wybieram ścieżkę ${pathLabel}`}
				className="self-start"
			>
				{isSelected && <Check className="size-4" />}
				{isSelected ? COPY.summary.cardCtaSelected : COPY.summary.cardCtaDefault}
			</Button>
		</section>
	);
}
