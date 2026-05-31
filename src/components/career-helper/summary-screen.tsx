"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
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
import type { SummaryResponse } from "@/lib/career-helper/types";
import { CareerPathCard } from "./career-path-card";
import { DisclaimerBanner } from "./disclaimer-banner";

/**
 * Ekran 3 — podsumowanie + wybór ścieżki (spec §5, 5 stanów: ready/selected/
 * restarting/judge_failed/summary_error).
 *
 * Disclaimer HITL (DisclaimerBanner) stały, w kodzie. Karty CareerPathCard BEZ
 * procentu/rankingu. judged=false → judge_failed (fallback do wykładowcy).
 * Pusta lista ścieżek = summary_error (np. /summary padł — kontrakt frontu).
 */
export function SummaryScreen({
	sessionId,
	summary,
	onSelectPathDone,
	onBackToChat,
	onRetrySummary,
}: {
	sessionId: string;
	summary: SummaryResponse;
	/** Po „Idź dalej do samooceny” — przejście do kroku 4 onboardingu. */
	onSelectPathDone: () => void;
	/** „Nic z tego — wracam do rozmowy” → restart przez modal. */
	onBackToChat: () => void;
	/** Ponów /summary (stan summary_error). */
	onRetrySummary: () => void;
}) {
	const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
	const [restartingOpen, setRestartingOpen] = useState(false);
	const [advancing, setAdvancing] = useState(false);
	const [selectError, setSelectError] = useState(false);

	// summary_error: brak ścieżek i brak streszczenia → /summary się nie powiódł.
	const isError = summary.careerPaths.length === 0;
	// judge_failed: sędzia odmówił 2× — same obszary, bez streszczenia.
	const isJudgeFailed = !summary.judged && summary.careerPaths.length > 0;

	async function handleSelectAndAdvance() {
		if (!selectedLabel) return;
		setAdvancing(true);
		setSelectError(false);
		try {
			const res = await fetch(`/api/career-helper/session/${sessionId}/select-path`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ careerLabel: selectedLabel, source: "helper" }),
			});
			if (!res.ok) throw new Error("select_failed");
			onSelectPathDone();
		} catch {
			setSelectError(true);
			setAdvancing(false);
		}
	}

	if (isError) {
		return (
			<div className="mx-auto w-full max-w-[720px] px-8 py-12">
				<div
					role="alert"
					className="flex flex-col items-center gap-4 rounded-xl border border-destructive bg-destructive/10 p-8 text-center"
				>
					<TriangleAlert className="size-10 text-destructive" />
					<h2 className="text-xl font-semibold text-foreground">{COPY.summary.error.title}</h2>
					<p className="text-sm text-muted-foreground">{COPY.summary.error.desc}</p>
					<Button
						type="button"
						onClick={onRetrySummary}
						aria-label="Spróbuj ponownie wygenerować podsumowanie"
					>
						{COPY.summary.error.button}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-[720px] px-8 py-12">
			<p className="mb-4 text-sm font-medium text-muted-foreground">{COPY.summary.pageLabel}</p>

			<DisclaimerBanner />

			{isJudgeFailed && (
				<output
					aria-live="polite"
					className="mt-6 block rounded-md border-l-4 border-l-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950/30"
				>
					<p className="font-semibold text-foreground">{COPY.summary.judgeFailed.title}</p>
					<p className="text-sm text-muted-foreground">{COPY.summary.judgeFailed.desc}</p>
				</output>
			)}

			{summary.judged && summary.summaryText && (
				<section className="mt-8">
					<h2 className="text-2xl font-bold text-foreground">{COPY.summary.summaryHeading}</h2>
					<p className="mt-3 text-base leading-relaxed text-foreground">{summary.summaryText}</p>
				</section>
			)}

			<p className="mt-8 text-base font-semibold text-foreground">{COPY.summary.pathsLabel}</p>
			<div className="mt-4 flex flex-col gap-4">
				{summary.careerPaths.map((path) => (
					<CareerPathCard
						key={path.label}
						pathLabel={path.label}
						why={path.why}
						state={
							selectedLabel === null
								? "default"
								: selectedLabel === path.label
									? "selected"
									: "dimmed"
						}
						onSelect={() => setSelectedLabel(path.label)}
					/>
				))}
			</div>
			{selectedLabel && (
				<p className="mt-3 text-xs text-muted-foreground">{COPY.summary.changeHint}</p>
			)}

			{selectError && (
				<p role="alert" className="mt-4 text-sm text-destructive">
					Nie udało się zapisać wybranej ścieżki. Spróbuj ponownie.
				</p>
			)}

			<div className="sticky bottom-0 mt-10 flex items-center justify-between border-t bg-background py-4">
				<Button type="button" variant="ghost" onClick={() => setRestartingOpen(true)}>
					{COPY.summary.footerGhost}
				</Button>
				<Button
					type="button"
					onClick={handleSelectAndAdvance}
					disabled={!selectedLabel || advancing}
					aria-busy={advancing}
				>
					{COPY.summary.footerPrimary}
				</Button>
			</div>

			{/* S3 — restarting (modal). */}
			<Dialog open={restartingOpen} onOpenChange={setRestartingOpen}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>{COPY.summary.restarting.title}</DialogTitle>
						<DialogDescription>{COPY.summary.restarting.desc}</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={() => setRestartingOpen(false)}>
							{COPY.summary.restarting.buttonGhost}
						</Button>
						<Button
							type="button"
							onClick={() => {
								setRestartingOpen(false);
								onBackToChat();
							}}
						>
							{COPY.summary.restarting.buttonPrimary}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
