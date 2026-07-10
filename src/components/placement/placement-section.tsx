"use client";

import { BriefcaseBusiness, Loader2, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	EMPLOYMENT_STATUS_LABEL,
	EVENT_KIND_LABEL,
	PLACEMENT_CONSENT_COPY,
} from "./placement-labels";

/**
 * 1.17 — sekcja „Śledzenie zatrudnienia" w profilu: stan zgody (nadanie /
 * wycofanie z jawnym ostrzeżeniem o kasacji), baseline (gdy brak), zgłaszanie
 * zdarzeń (staż/praca/zmiana/koniec) i historia własnych deklaracji.
 *
 * Dane przychodzą z server component (profil/page.tsx) — po każdej mutacji
 * router.refresh() odświeża props (bez lustrzanego stanu, wzorzec AG.6).
 */

export interface PlacementEventView {
	id: string;
	kind: string;
	employmentStatus: string | null;
	careerAligned: boolean | null;
	occurredAt: string;
	note: string | null;
}

interface PlacementSectionProps {
	consent: boolean;
	/** false = student nigdy nie podjął decyzji (pokazujemy pełną kartę opt-in). */
	decided: boolean;
	hasBaseline: boolean;
	events: PlacementEventView[];
}

export function PlacementSection({ consent, decided, hasBaseline, events }: PlacementSectionProps) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [baselineStatus, setBaselineStatus] = useState("");
	const [eventKind, setEventKind] = useState("");
	const [eventAligned, setEventAligned] = useState(true);
	const [eventDate, setEventDate] = useState("");
	const [eventNote, setEventNote] = useState("");

	async function post(url: string, body: unknown): Promise<Response | null> {
		setBusy(true);
		try {
			return await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
		} catch {
			toast.error("Błąd połączenia.");
			return null;
		} finally {
			setBusy(false);
		}
	}

	async function setConsent(value: boolean) {
		// Wycofanie kasuje dane — wymagamy świadomego potwierdzenia.
		if (
			!value &&
			!window.confirm("Wycofanie zgody usunie zapisaną historię statusu zawodowego. Kontynuować?")
		) {
			return;
		}
		const res = await post("/api/placement/consent", { consent: value });
		if (res?.ok) {
			toast.success(value ? "Zgoda zapisana." : "Zgoda wycofana, dane usunięte.");
			router.refresh();
		} else if (res) {
			toast.error("Nie udało się zapisać zgody.");
		}
	}

	async function saveBaseline() {
		if (!baselineStatus) return;
		const res = await post("/api/placement/events", {
			kind: "baseline",
			employmentStatus: baselineStatus,
			occurredAt: new Date().toISOString(),
		});
		if (res?.ok || res?.status === 409) {
			toast.success("Status na start zapisany.");
			router.refresh();
		} else if (res) {
			toast.error("Nie udało się zapisać statusu.");
		}
	}

	async function saveEvent() {
		if (!eventKind || !eventDate) return;
		const body: Record<string, unknown> = {
			kind: eventKind,
			occurredAt: eventDate,
			...(eventNote.trim() ? { note: eventNote.trim() } : {}),
		};
		if (eventKind !== "job_lost") body.careerAligned = eventAligned;
		const res = await post("/api/placement/events", body);
		if (res?.ok) {
			toast.success("Zdarzenie zapisane.");
			setEventKind("");
			setEventDate("");
			setEventNote("");
			router.refresh();
		} else if (res) {
			const data = (await res.json().catch(() => null)) as { error?: string } | null;
			toast.error(data?.error ?? "Nie udało się zapisać zdarzenia.");
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<BriefcaseBusiness className="h-4 w-4" />
					Śledzenie zatrudnienia
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				{!consent ? (
					<div className="space-y-3">
						<p className="text-muted-foreground">{PLACEMENT_CONSENT_COPY}</p>
						{decided && (
							<p className="text-xs text-muted-foreground">
								Zgoda jest obecnie wycofana — możesz ją włączyć ponownie w każdej chwili.
							</p>
						)}
						<Button size="sm" disabled={busy} onClick={() => void setConsent(true)}>
							{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							Wyrażam zgodę
						</Button>
					</div>
				) : (
					<>
						{!hasBaseline && (
							<div className="flex flex-wrap items-center gap-2">
								<Select value={baselineStatus} onValueChange={setBaselineStatus}>
									<SelectTrigger className="w-72" aria-label="Status zawodowy na start">
										<SelectValue placeholder="Twój status zawodowy dziś..." />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(EMPLOYMENT_STATUS_LABEL).map(([value, label]) => (
											<SelectItem key={value} value={value}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									size="sm"
									disabled={!baselineStatus || busy}
									onClick={() => void saveBaseline()}
								>
									Zapisz status na start
								</Button>
							</div>
						)}

						<div className="space-y-2 rounded-lg border border-border p-3">
							<p className="font-medium text-foreground">Zgłoś zmianę</p>
							<div className="flex flex-wrap items-center gap-2">
								<Select value={eventKind} onValueChange={setEventKind}>
									<SelectTrigger className="w-48" aria-label="Rodzaj zdarzenia">
										<SelectValue placeholder="Rodzaj..." />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(EVENT_KIND_LABEL)
											.filter(([k]) => k !== "baseline")
											.map(([value, label]) => (
												<SelectItem key={value} value={value}>
													{label}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								<input
									type="date"
									value={eventDate}
									max={new Date().toISOString().slice(0, 10)}
									onChange={(e) => setEventDate(e.target.value)}
									aria-label="Data zdarzenia"
									className="h-9 rounded-md border border-input bg-background px-3 text-sm"
								/>
								{eventKind && eventKind !== "job_lost" && (
									<label className="flex items-center gap-1.5 text-muted-foreground">
										<input
											type="checkbox"
											checked={eventAligned}
											onChange={(e) => setEventAligned(e.target.checked)}
										/>
										rola zgodna ze ścieżką
									</label>
								)}
							</div>
							<input
								type="text"
								value={eventNote}
								onChange={(e) => setEventNote(e.target.value)}
								maxLength={500}
								placeholder="Notatka (opcjonalna)"
								aria-label="Notatka do zdarzenia"
								className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
							/>
							<Button
								size="sm"
								disabled={!eventKind || !eventDate || busy}
								onClick={() => void saveEvent()}
							>
								{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
								Zapisz zdarzenie
							</Button>
						</div>

						{events.length > 0 && (
							<ul className="space-y-1.5">
								{events.map((e) => (
									<li
										key={e.id}
										className="flex flex-wrap items-baseline gap-x-2 text-muted-foreground"
									>
										<span className="font-medium text-foreground">
											{EVENT_KIND_LABEL[e.kind] ?? e.kind}
										</span>
										<span>{new Date(e.occurredAt).toLocaleDateString("pl-PL")}</span>
										{e.employmentStatus && (
											<span>
												— {EMPLOYMENT_STATUS_LABEL[e.employmentStatus] ?? e.employmentStatus}
											</span>
										)}
										{e.careerAligned !== null && (
											<span>({e.careerAligned ? "zgodna ze ścieżką" : "poza ścieżką"})</span>
										)}
										{e.note && <span className="italic">„{e.note}"</span>}
									</li>
								))}
							</ul>
						)}

						<Button
							variant="ghost"
							size="sm"
							disabled={busy}
							onClick={() => void setConsent(false)}
							className="text-muted-foreground"
						>
							<ShieldOff className="h-4 w-4" />
							Wycofaj zgodę (usuwa historię)
						</Button>
					</>
				)}
			</CardContent>
		</Card>
	);
}
