"use client";

/**
 * MyRoadView — prywatna lista refleksji „Moja droga" (B5 powierzchnia B).
 *
 * Pobiera GET /api/reflections (kontrakt zamknięty — Ethan/Leo):
 *   Response 200: { reflections: [{ id, submissionId, projectId, projectTitle,
 *     projectSlug, answerSurprised, answerFrustrated, answerLearned,
 *     createdAt, updatedAt }] }
 *   Sortowanie: createdAt DESC (backend gwarantuje)
 *
 * Stany wg spec §4.3:
 *   B1 loading  — skeleton 3 kart
 *   B2 list     — lista ReflectionEntryCard
 *   B3 empty    — EmptyState z copy spec §6.3 (bez CTA tworzącego)
 *   B4 error    — ErrorState z „Spróbuj ponownie"
 *
 * Prywatność (spec §4.6): żadnej afordancji „pokaż wykładowcy", brak share.
 *
 * A11y:
 *   - lista: role="list" na ul (aria-label), role="listitem" na kartach
 *   - stany loading/error: aria-live="polite" w kontenerze głównym
 *   - przycisk retry: focus po błędzie
 *
 * Spec: docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §4.3
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { type ReflectionEntry, ReflectionEntryCard } from "./ReflectionEntryCard";

type LoadState = "loading" | "loaded" | "error";

export function MyRoadView() {
	const [loadState, setLoadState] = useState<LoadState>("loading");
	const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
	const retryRef = useRef<HTMLButtonElement>(null);

	const fetchReflections = useCallback(async () => {
		setLoadState("loading");
		try {
			const res = await fetch("/api/reflections");
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as { reflections: ReflectionEntry[] };
			setReflections(data.reflections);
			setLoadState("loaded");
		} catch {
			setLoadState("error");
			setTimeout(() => retryRef.current?.focus(), 50);
		}
	}, []);

	useEffect(() => {
		void fetchReflections();
	}, [fetchReflections]);

	return (
		<div
			className="max-w-[720px] mx-auto px-4 py-8"
			aria-live="polite"
			aria-busy={loadState === "loading"}
		>
			<h1 className="text-2xl font-semibold text-foreground mb-1">Moja droga</h1>
			<p className="text-sm text-muted-foreground mb-6">
				Prywatne refleksje po projektach — widoczne tylko dla Ciebie.
			</p>

			{/* B1 — Loading: skeleton 3 kart */}
			{loadState === "loading" && (
				<ul aria-label="Ładowanie refleksji" className="flex flex-col gap-4 list-none p-0">
					{[0, 1, 2].map((i) => (
						<li key={i} aria-hidden="true">
							<div className="rounded-xl border bg-card py-6 px-6 animate-pulse flex flex-col gap-3">
								<div className="h-4 w-1/2 rounded bg-muted" />
								<div className="h-3 w-1/4 rounded bg-muted" />
								<div className="h-10 rounded bg-muted mt-2" />
							</div>
						</li>
					))}
				</ul>
			)}

			{/* B2 — Lista */}
			{loadState === "loaded" && reflections.length > 0 && (
				<ul aria-label="Twoje refleksje" className="flex flex-col gap-4 list-none p-0 m-0">
					{reflections.map((r) => (
						<ReflectionEntryCard key={r.id} entry={r} />
					))}
				</ul>
			)}

			{/* B3 — Empty: copy spec §6.3, bez CTA tworzącego (punkt tworzenia = widok projektu) */}
			{loadState === "loaded" && reflections.length === 0 && (
				<div className="rounded-xl border bg-card py-12 px-6 text-center">
					<p className="text-base font-medium text-foreground mb-2">
						Tu pojawią się Twoje refleksje.
					</p>
					<p className="text-sm text-muted-foreground">
						Pierwsza odblokuje się, gdy wykładowca zaakceptuje Twoje zgłoszenie.
					</p>
				</div>
			)}

			{/* B4 — Error */}
			{loadState === "error" && (
				<div
					role="alert"
					className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center flex flex-col items-center gap-3"
				>
					<p className="text-sm text-destructive font-medium">Nie udało się wczytać Mojej drogi.</p>
					<button
						ref={retryRef}
						type="button"
						onClick={() => void fetchReflections()}
						className="text-sm font-medium text-destructive underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 rounded"
					>
						Spróbuj ponownie
					</button>
				</div>
			)}
		</div>
	);
}
