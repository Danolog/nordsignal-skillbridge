"use client";

/**
 * ReflectionCallout — wyzwalacz + formularz refleksji osadzony inline w widoku projektu.
 *
 * Warunek statusu (spec §4.2 + instrukacja Olivera):
 *   WYDZIELONY w stałej REFLECTION_TRIGGER_STATUSES — Sophia/Leo dołożą 'submitted'
 *   jednym miejscem (zmiana w tej stałej, nie w logice warunkowej).
 *
 * Stany wg spec §4.2:
 *   null/ukryty   — submission brak lub status nie spełnia warunku lub refleksja już zapisana
 *   A1 prompt     — Callout z CTA „Dodaj refleksję" / „Nie teraz"
 *   A2/A3 form    — ReflectionForm rozwinięty inline (nie Modal — spec §4.2 uzasadnienie)
 *   A5 saved      — Toast + zwinięcie formularza + callout znika
 *   A6 skipped    — callout znika (powraca przy następnej wizycie, jeśli refleksja nadal null)
 *
 * Prywatność (spec §4.6): żadnej afordancji „pokaż wykładowcy" — w tym komponencie
 *   i nigdzie indziej w B5.
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §4.2
 */

import { CheckCircle, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReflectionForm } from "./ReflectionForm";

/**
 * WYDZIELONY WARUNEK STATUSU (spec §4.2, instrukcja Olivera).
 * Sophia/Leo dołożą 'submitted' tutaj — jedna zmiana, jedno miejsce.
 *
 * Obecny zakres: 'verified' (po zaakceptowaniu zgłoszenia przez wykładowcę).
 * Oczekiwana decyzja Sophii: czy 'submitted' też wyzwala callout.
 */
export const REFLECTION_TRIGGER_STATUSES: ReadonlySet<string> = new Set(["verified"]);

interface ReflectionCalloutProps {
	submissionId: string;
	projectId: string;
	submissionStatus: string;
	/** null = refleksja nieistniejąca; obiekt = refleksja już zapisana (upsert pokazuje formularz) */
	existingReflection: {
		answerSurprised: string | null;
		answerFrustrated: string | null;
		answerLearned: string | null;
	} | null;
}

type ViewState = "prompt" | "form" | "hidden";

export function ReflectionCallout({
	submissionId,
	projectId,
	submissionStatus,
	existingReflection,
}: ReflectionCalloutProps) {
	// Przy istniejącej refleksji: pokaż formularz z wypełnionymi polami (upsert — edycja)
	const hasExisting = existingReflection !== null;
	const [view, setView] = useState<ViewState>(hasExisting ? "form" : "prompt");

	// Warunek wyzwalacza — patrz REFLECTION_TRIGGER_STATUSES powyżej
	if (!REFLECTION_TRIGGER_STATUSES.has(submissionStatus)) return null;
	if (view === "hidden") return null;

	function handleSaved() {
		setView("hidden");
		toast.success("Refleksja zapisana — widoczna tylko dla Ciebie.", {
			action: {
				label: "Moja droga",
				onClick: () => {
					window.location.href = "/moja-droga";
				},
			},
		});
	}

	function handleSkip() {
		setView("hidden");
	}

	return (
		<section
			aria-label="Refleksja po projekcie"
			className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-5 py-4 mt-6"
		>
			{view === "prompt" && (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
					<CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
					<div className="flex-1">
						<p className="text-sm font-medium text-emerald-900">
							Wykładowca zaakceptował Twoje zgłoszenie. Chcesz chwilę nad nim pomyśleć?
						</p>
						<div className="flex gap-3 mt-3 flex-wrap">
							<Button
								type="button"
								size="sm"
								onClick={() => setView("form")}
								className="bg-emerald-600 hover:bg-emerald-700 text-white"
							>
								<MessageSquarePlus className="h-4 w-4 mr-1.5" aria-hidden="true" />
								Dodaj refleksję
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleSkip}
								className="text-emerald-800 hover:bg-emerald-100"
							>
								Nie teraz
							</Button>
						</div>
					</div>
				</div>
			)}

			{view === "form" && (
				<div>
					<div className="flex items-center gap-2 mb-1">
						<MessageSquarePlus className="h-4 w-4 text-emerald-600" aria-hidden="true" />
						<h2 className="text-sm font-semibold text-emerald-900">
							{hasExisting ? "Edytuj refleksję" : "Dodaj refleksję"}
						</h2>
					</div>
					<p className="text-xs text-emerald-700 mb-2">
						Widoczna tylko dla Ciebie.{" "}
						<Link
							href="/moja-droga"
							className="underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 rounded"
						>
							Moja droga
						</Link>
					</p>
					<ReflectionForm
						submissionId={submissionId}
						projectId={projectId}
						initialValues={existingReflection ?? undefined}
						onSaved={handleSaved}
						onSkip={handleSkip}
					/>
				</div>
			)}
		</section>
	);
}
