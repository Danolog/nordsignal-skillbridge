/**
 * 1E.3 · P5 — Ekran 1, strona modułu: karta bramki egzaminu (Mila 3.2 + Sophia
 * D6.1). Cztery pod-stany z `deriveExamGate` (server component przekazuje widok):
 *  - gate (E3): wszystkie pozycje zrobione → „Podejdź do egzaminu" (primary),
 *  - test_out (E1): available, 0 pozycji → „Test out" (outline, MNIEJSZY nacisk),
 *  - correctives_in_progress (S-C): 2 oblania, correctives NIE odbyte →
 *    „Dokończ powtórkę" + link do paczki (Ekran 5 z ostatniego wyniku),
 *  - verified/none: brak karty.
 *
 * Komponent prezentacyjny (server-friendly — zero „use client"), wzorzec karty
 * jak blok blokady modułu (rounded-xl border p-5). Zero nowych tokenów.
 */

import { ClipboardCheck, FastForward, RotateCcw } from "lucide-react";
import Link from "next/link";
import { CorrectivesPanel } from "@/components/curriculum/exam/correctives-panel";
import { Button } from "@/components/ui/button";
import type { ExamGateView } from "@/lib/curriculum/exam-gate";

interface ModuleExamGateProps {
	view: ExamGateView;
	moduleId: string;
}

export function ModuleExamGate({ view, moduleId }: ModuleExamGateProps) {
	const examHref = `/curriculum/${moduleId}/exam`;
	const backHref = `/curriculum/${moduleId}`;

	if (view.kind === "gate") {
		// Blok A (E3) — primary, główna ścieżka.
		return (
			<section
				aria-labelledby="exam-gate-heading"
				className="rounded-xl border border-sky-200 bg-sky-50 p-5"
			>
				<h2
					id="exam-gate-heading"
					className="flex items-center gap-2 text-sm font-semibold text-sky-900"
				>
					<ClipboardCheck aria-hidden className="size-4 text-sky-600" />
					Gotowy(-a) do egzaminu
				</h2>
				<p className="mt-1 text-sm text-sky-900">
					Zrobiłeś(-aś) wszystkie pozycje. Moduł odblokuje się dopiero po zdanym egzaminie — 15
					pytań, ~25 min.
				</p>
				<Button asChild className="mt-3">
					<Link href={examHref}>Podejdź do egzaminu</Link>
				</Button>
			</section>
		);
	}

	if (view.kind === "test_out") {
		// Blok B (E1) — outline, mniej eksponowany; copy BEZPIECZNA (Sophia D3 —
		// zdanie „nie liczy się jako oblany" ZDJĘTE, wspólna pula cap-2).
		return (
			<section
				aria-labelledby="exam-testout-heading"
				className="rounded-xl border border-border bg-muted p-5"
			>
				<h2
					id="exam-testout-heading"
					className="flex items-center gap-2 text-sm font-semibold text-foreground"
				>
					<FastForward aria-hidden className="size-4 text-muted-foreground" />
					Znasz już ten temat?
				</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Możesz spróbować zdać egzamin bez przechodzenia pozycji. Uwaga: to jest ten sam egzamin —
					masz 2 podejścia w tym module łącznie (test out liczy się jako podejście). Nie zdasz —
					wracasz i uczysz się normalnie.
				</p>
				<Button asChild variant="outline" className="mt-3">
					<Link href={examHref}>Test out</Link>
				</Button>
			</section>
		);
	}

	if (view.kind === "correctives_in_progress") {
		// 4. pod-stan (Sophia D6.1) — S-C: correctives obowiązkowe, egzamin
		// zablokowany serwerowo (423). Blok „dokończ powtórkę" + pełna paczka.
		return (
			<div className="flex flex-col gap-4">
				{/* Neutralny ton (nie rose): Mila 6.3 rezerwuje rose dla błędów technicznych/
				    finalności; correctives to spokojny „następny krok" (R13 — błąd nie jest końcem). */}
				<section className="rounded-xl border border-border bg-muted p-5">
					<h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
						<RotateCcw aria-hidden className="size-4 text-sky-600" />
						Dokończ powtórkę, żeby podejść ponownie
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Po 2. nieudanym podejściu odśwież poniższe tematy — wtedy otworzymy nowe podejście.
					</p>
				</section>
				<CorrectivesPanel pkg={view.pkg} backHref={backHref} />
			</div>
		);
	}

	// verified / none — brak karty bramki.
	return null;
}
