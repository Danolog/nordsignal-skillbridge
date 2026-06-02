"use client";

/**
 * ReflectionForm — formularz 3 pytań refleksji B5 (powierzchnia A).
 *
 * Stany wg spec §4.2:
 *   A2 form_empty  — puste pola, primary aktywny (opcjonalność: można wysłać częściowo)
 *   A3 writing     — licznik zdań per pole (w ReflectionQuestion)
 *   A4 saving      — primary loading, pola disabled
 *   A5 saved       — obsługa przez onSaved callback (rodzic zwija formularz, toast)
 *   A6 skipped     — onSkip callback
 *   A7 error_save  — InlineAlert nad przyciskami; wpisany tekst zostaje w polach
 *
 * POST /api/reflections — kontrakt zamknięty przez Ethana:
 *   { submissionId, projectId, answerSurprised?, answerFrustrated?, answerLearned? }
 *   Puste string → backend normalizuje do null (""→null w normalizeAnswer).
 *   Odpowiedź 200/201: { reflection: {...} }
 *   Błędy: 400/401/404/409/500
 *
 * A11y:
 *   - każde pole ma label+htmlFor + aria-describedby (licznik) w ReflectionQuestion
 *   - InlineAlert error: aria-live="assertive" + rola alert
 *   - przyciski: focus management po błędzie (focus na primary po A7)
 *   - pola aria-invalid gdy A7 (błąd generalny, nie per-pole)
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §4.2
 */

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReflectionQuestion } from "./ReflectionQuestion";

interface ReflectionFormProps {
	submissionId: string;
	projectId: string;
	/** Wartości wstępne — przy edycji istniejącej refleksji (upsert) */
	initialValues?: {
		answerSurprised?: string | null;
		answerFrustrated?: string | null;
		answerLearned?: string | null;
	};
	onSaved: () => void;
	onSkip: () => void;
}

type SaveState = "idle" | "saving" | "error";

function errorMessage(status: number): string {
	switch (status) {
		case 401:
			return "Sesja wygasła — odśwież stronę i zaloguj się ponownie.";
		case 404:
			return "Nie znaleziono zgłoszenia. Odśwież stronę i spróbuj ponownie.";
		case 409:
			return "Refleksja jest dostępna tylko po zaakceptowaniu zgłoszenia przez wykładowcę.";
		case 400:
			return "Dane są nieprawidłowe. Sprawdź pola i spróbuj ponownie.";
		default:
			return "Nie udało się zapisać. Twój tekst jest w polu — spróbuj ponownie.";
	}
}

export function ReflectionForm({
	submissionId,
	projectId,
	initialValues,
	onSaved,
	onSkip,
}: ReflectionFormProps) {
	const [surprised, setSurprised] = useState(initialValues?.answerSurprised ?? "");
	const [frustrated, setFrustrated] = useState(initialValues?.answerFrustrated ?? "");
	const [learned, setLearned] = useState(initialValues?.answerLearned ?? "");
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const retryBtnRef = useRef<HTMLButtonElement>(null);

	const isSaving = saveState === "saving";
	const isError = saveState === "error";

	async function handleSave() {
		setSaveState("saving");
		setErrorMsg(null);

		try {
			const res = await fetch("/api/reflections", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					submissionId,
					projectId,
					// Puste string wysyłamy — backend normalizuje "" → null (spec kontrakt)
					answerSurprised: surprised || null,
					answerFrustrated: frustrated || null,
					answerLearned: learned || null,
				}),
			});

			if (!res.ok) {
				const msg = errorMessage(res.status);
				setSaveState("error");
				setErrorMsg(msg);
				// focus na przycisku ponowienia (a11y — spec §4.2 A7)
				setTimeout(() => retryBtnRef.current?.focus(), 50);
				return;
			}

			setSaveState("idle");
			onSaved();
		} catch {
			setSaveState("error");
			setErrorMsg("Nie udało się połączyć z serwerem. Twój tekst jest w polu — spróbuj ponownie.");
			setTimeout(() => retryBtnRef.current?.focus(), 50);
		}
	}

	return (
		<div className="flex flex-col gap-5 mt-3">
			{/* 3 pytania refleksji — R2 brzmienie z ReflectionQuestion */}
			<ReflectionQuestion
				questionKey="surprised"
				value={surprised}
				onChange={setSurprised}
				disabled={isSaving}
				invalid={isError}
			/>
			<ReflectionQuestion
				questionKey="frustrated"
				value={frustrated}
				onChange={setFrustrated}
				disabled={isSaving}
				invalid={isError}
			/>
			<ReflectionQuestion
				questionKey="learned"
				value={learned}
				onChange={setLearned}
				disabled={isSaving}
				invalid={isError}
			/>

			{/* Stan A7 — InlineAlert błędu (spec §4.2, golden: tekst zostaje w polach) */}
			{isError && errorMsg && (
				<div
					role="alert"
					aria-live="assertive"
					className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
				>
					{errorMsg}
				</div>
			)}

			{/* Przyciski akcji */}
			<div className="flex gap-3 flex-wrap">
				<Button
					ref={retryBtnRef}
					type="button"
					disabled={isSaving}
					onClick={handleSave}
					className="min-w-[10rem]"
				>
					{isSaving ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
							<span aria-live="polite">Zapisywanie…</span>
						</>
					) : isError ? (
						"Spróbuj ponownie"
					) : (
						"Zapisz refleksję"
					)}
				</Button>

				<Button type="button" variant="ghost" disabled={isSaving} onClick={onSkip}>
					Pomiń
				</Button>
			</div>
		</div>
	);
}
