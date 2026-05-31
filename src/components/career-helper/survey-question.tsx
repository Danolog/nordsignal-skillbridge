"use client";

import { useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import { COPY } from "@/lib/career-helper/copy";
import type { SurveyAnswerValue, SurveyQuestionDef } from "@/lib/career-helper/types";
import { cn } from "@/lib/utils";

/**
 * SurveyQuestion (kompozyt B0.1, spec §6.1) — jedno pytanie ankiety.
 *
 * Walidacja LAZY (spec §6.1, słabość #4 Mili): błąd textarea pokazujemy
 * dopiero gdy showError=true (po kliknięciu CTA), nie eagerly na blur.
 * a11y: radiogroup/group role + aria-labelledby, aria-invalid/aria-required,
 * aria-describedby na liczniku/błędzie (coaching point Jacka — głębokie a11y).
 */
export function SurveyQuestion({
	def,
	value,
	onChange,
	disabled = false,
	showError = false,
}: {
	def: SurveyQuestionDef;
	value: SurveyAnswerValue;
	onChange: (value: SurveyAnswerValue) => void;
	disabled?: boolean;
	showError?: boolean;
}) {
	const questionId = useId();
	const helperId = useId();

	const selected = Array.isArray(value) ? value : [];
	const textValue = typeof value === "string" ? value : "";

	const isAnswered =
		def.type === "textarea"
			? textValue.length >= (def.minLength ?? 1)
			: Array.isArray(value)
				? value.length > 0
				: typeof value === "string" && value.length > 0;

	const textTooShort =
		def.type === "textarea" && textValue.length > 0 && textValue.length < (def.minLength ?? 0);
	const showTextError = showError && def.type === "textarea" && !isAnswered;

	function toggleMulti(option: string) {
		if (selected.includes(option)) {
			onChange(selected.filter((o) => o !== option));
			return;
		}
		if (def.maxSelections && selected.length >= def.maxSelections) return;
		onChange([...selected, option]);
	}

	return (
		<fieldset className="flex flex-col gap-3 border-0 p-0 m-0" disabled={disabled}>
			<p className="text-xs text-muted-foreground">{COPY.survey.questionLabel(def.number, 4)}</p>
			<legend
				id={questionId}
				className="text-lg font-semibold text-foreground"
				// legend musi być pierwszym dzieckiem fieldset semantycznie; renderujemy
				// jako blok nad kontrolkami przez kolejność DOM.
			>
				{def.question}
			</legend>

			{def.type === "single-choice" && def.options && (
				<div role="radiogroup" aria-labelledby={questionId} className="flex flex-col gap-2">
					{def.options.map((option) => {
						const checked = textValue === option;
						return (
							<label
								key={option}
								className={cn(
									"flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
									"hover:bg-accent focus-within:ring-ring/50 focus-within:ring-[3px]",
									checked ? "border-primary bg-accent" : "border-input",
									disabled && "cursor-not-allowed opacity-50",
								)}
							>
								<input
									type="radio"
									name={questionId}
									value={option}
									checked={checked}
									onChange={() => onChange(option)}
									disabled={disabled}
									className="size-4 accent-primary"
								/>
								<span>{option}</span>
							</label>
						);
					})}
				</div>
			)}

			{def.type === "multi-choice" && def.options && (
				<>
					<p id={helperId} className="text-sm text-muted-foreground" aria-live="polite">
						{COPY.survey.multiHint(selected.length, def.maxSelections ?? 3)}
					</p>
					<div className="flex flex-col gap-2">
						{def.options.map((option) => {
							const checked = selected.includes(option);
							const capReached =
								!checked && !!def.maxSelections && selected.length >= def.maxSelections;
							return (
								<label
									key={option}
									className={cn(
										"flex items-center gap-3 rounded-md border p-3 text-sm transition-colors",
										"focus-within:ring-ring/50 focus-within:ring-[3px]",
										checked ? "border-primary bg-accent" : "border-input",
										capReached || disabled
											? "cursor-not-allowed opacity-50"
											: "cursor-pointer hover:bg-accent",
									)}
								>
									<input
										type="checkbox"
										value={option}
										checked={checked}
										onChange={() => toggleMulti(option)}
										disabled={disabled || capReached}
										className="size-4 accent-primary"
									/>
									<span>{option}</span>
								</label>
							);
						})}
					</div>
				</>
			)}

			{def.type === "textarea" && (
				<>
					<Textarea
						aria-labelledby={questionId}
						aria-describedby={helperId}
						aria-required="true"
						aria-invalid={showTextError}
						value={textValue}
						onChange={(e) => onChange(e.target.value)}
						placeholder={def.placeholder}
						maxLength={def.maxLength}
						rows={4}
						disabled={disabled}
						className="resize-none"
					/>
					<p
						id={helperId}
						className={cn(
							"text-xs",
							showTextError || textTooShort ? "text-destructive" : "text-muted-foreground",
						)}
						aria-live="polite"
					>
						{showTextError
							? COPY.survey.textareaError(def.minLength ?? 10)
							: COPY.survey.textareaCounter(
									(def.maxLength ?? 280) - textValue.length,
									def.minLength ?? 10,
								)}
					</p>
				</>
			)}
		</fieldset>
	);
}
