"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/career-helper/copy";
import {
	EMPTY_SURVEY_ANSWERS,
	SURVEY_QUESTIONS,
	type SurveyAnswers,
	type SurveyAnswerValue,
	type SurveyResponse,
} from "@/lib/career-helper/types";
import { SurveyQuestion } from "./survey-question";

type SurveyState = "empty" | "partial" | "ready" | "submitting" | "save_error";

/**
 * Ekran 1 — ankieta wstępna (spec §3, 5 stanów: empty/partial/ready/
 * submitting/save_error). Walidacja per pytanie (spec §3.3). Po sukcesie
 * woła onStarted(sessionId) — rodzic przełącza na ekran rozmowy.
 *
 * Walidacja LAZY (spec §6.1) — błędy pól pokazujemy dopiero po próbie wysyłki.
 */
export function SurveyScreen({
	initialAnswers,
	onStarted,
}: {
	initialAnswers?: SurveyAnswers;
	onStarted: (sessionId: string) => void;
}) {
	const [answers, setAnswers] = useState<SurveyAnswers>(initialAnswers ?? EMPTY_SURVEY_ANSWERS);
	const [submitting, setSubmitting] = useState(false);
	const [saveError, setSaveError] = useState(false);
	const [showErrors, setShowErrors] = useState(false);

	const filledCount = SURVEY_QUESTIONS.filter((q) => isFilled(q.id, answers)).length;
	const allValid = SURVEY_QUESTIONS.every((q) => isValid(q.id, answers));

	const state: SurveyState = submitting
		? "submitting"
		: saveError
			? "save_error"
			: allValid
				? "ready"
				: filledCount > 0
					? "partial"
					: "empty";

	function setAnswer(id: keyof SurveyAnswers, value: SurveyAnswerValue) {
		setAnswers((prev) => ({ ...prev, [id]: value }));
	}

	async function handleSubmit() {
		if (!allValid) {
			setShowErrors(true);
			return;
		}
		setSubmitting(true);
		setSaveError(false);
		try {
			const res = await fetch("/api/career-helper/survey", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ answers }),
			});
			if (!res.ok) throw new Error("save_failed");
			const data = (await res.json()) as SurveyResponse;
			onStarted(data.sessionId);
		} catch {
			setSaveError(true);
			setSubmitting(false);
		}
	}

	return (
		<div className="mx-auto w-full max-w-[720px] px-8 py-12">
			<header className="mb-8 flex flex-col gap-2">
				<h1 className="text-2xl font-semibold text-foreground">{COPY.survey.title}</h1>
				<p className="text-base text-muted-foreground">{COPY.survey.lead}</p>
			</header>

			{state === "save_error" && (
				<div
					role="alert"
					className="mb-6 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
				>
					{COPY.survey.saveError}
				</div>
			)}

			<div className="flex flex-col gap-8" aria-busy={state === "submitting"}>
				{SURVEY_QUESTIONS.map((q) => (
					<SurveyQuestion
						key={q.id}
						def={q}
						value={answers[q.id]}
						onChange={(v) => setAnswer(q.id, v)}
						disabled={state === "submitting"}
						showError={showErrors && !isValid(q.id, answers)}
					/>
				))}
			</div>

			<div className="sticky bottom-0 mt-10 flex items-center justify-between border-t bg-background py-4">
				<p className="text-sm text-muted-foreground" aria-live="polite">
					{COPY.survey.counter(filledCount)}
				</p>
				<Button
					type="button"
					onClick={handleSubmit}
					disabled={state === "submitting" || !allValid}
					aria-busy={state === "submitting"}
				>
					{state === "submitting" ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							{COPY.survey.ctaLoading}
						</>
					) : (
						COPY.survey.ctaDefault
					)}
				</Button>
			</div>
		</div>
	);
}

function isFilled(id: keyof SurveyAnswers, answers: SurveyAnswers): boolean {
	const v = answers[id];
	if (Array.isArray(v)) return v.length > 0;
	return v.trim().length > 0;
}

function isValid(id: keyof SurveyAnswers, answers: SurveyAnswers): boolean {
	const def = SURVEY_QUESTIONS.find((q) => q.id === id);
	if (!def) return false;
	const v = answers[id];
	if (def.type === "textarea" && typeof v === "string") {
		return v.trim().length >= (def.minLength ?? 1) && v.length <= (def.maxLength ?? Infinity);
	}
	if (def.type === "multi-choice" && Array.isArray(v)) {
		return v.length >= 1 && v.length <= (def.maxSelections ?? Infinity);
	}
	if (def.type === "single-choice" && typeof v === "string") {
		return v.length > 0;
	}
	return false;
}
