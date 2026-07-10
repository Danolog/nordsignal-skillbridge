"use client";

import { CalendarClock, Flame, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RhythmState } from "@/lib/rhythm/state";

/**
 * 1.18 — sekcja rytmu w „Mojej drodze": deklaracja (godziny/tydzień + dni),
 * streak z realnych śladów, check-in bieżącego tygodnia (opcjonalny),
 * historia check-inów. Dane z server component; po mutacji router.refresh()
 * (bez lustrzanego stanu — wzorzec AG.6/1.17).
 */

const DAY_LABEL: Array<{ key: string; label: string }> = [
	{ key: "mon", label: "pn" },
	{ key: "tue", label: "wt" },
	{ key: "wed", label: "śr" },
	{ key: "thu", label: "cz" },
	{ key: "fri", label: "pt" },
	{ key: "sat", label: "sb" },
	{ key: "sun", label: "nd" },
];

/** Projekty studenta do powiązania rytmu (tytuły dociąga server component). */
export interface RhythmProjectOption {
	id: string;
	title: string;
}

export function RhythmSection({
	state,
	projects,
}: {
	state: RhythmState;
	projects: RhythmProjectOption[];
}) {
	const router = useRouter();
	const d = state.declaration;
	const [editing, setEditing] = useState(d === null);
	const [hours, setHours] = useState(d?.hoursPerWeek ?? 6);
	const [days, setDays] = useState<string[]>(d?.days ?? []);
	const [projectId, setProjectId] = useState<string>(d?.activeProjectId ?? "");
	const [optOut, setOptOut] = useState(d?.stagnationOptOut ?? false);
	const [checkinHours, setCheckinHours] = useState<string>(
		state.currentWeekCheckin?.hoursActual?.toString() ?? "",
	);
	const [checkinNote, setCheckinNote] = useState(state.currentWeekCheckin?.note ?? "");
	const [busy, setBusy] = useState(false);

	async function post(url: string, body?: unknown): Promise<boolean> {
		setBusy(true);
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				...(body !== undefined ? { body: JSON.stringify(body) } : {}),
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => null)) as { error?: string } | null;
				toast.error(data?.error ?? "Nie udało się zapisać.");
				return false;
			}
			return true;
		} catch {
			toast.error("Błąd połączenia.");
			return false;
		} finally {
			setBusy(false);
		}
	}

	async function saveDeclaration() {
		const ok = await post("/api/rhythm", {
			hoursPerWeek: hours,
			days,
			activeProjectId: projectId || null,
			stagnationOptOut: optOut,
		});
		if (ok) {
			toast.success("Rytm zapisany.");
			setEditing(false);
			router.refresh();
		}
	}

	async function saveCheckin() {
		const hoursNum = checkinHours.trim() === "" ? undefined : Number(checkinHours);
		const ok = await post("/api/rhythm/checkin", {
			...(hoursNum !== undefined && Number.isFinite(hoursNum) ? { hoursActual: hoursNum } : {}),
			...(checkinNote.trim() ? { note: checkinNote.trim() } : {}),
		});
		if (ok) {
			toast.success("Check-in zapisany.");
			router.refresh();
		}
	}

	return (
		<Card className="mb-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<CalendarClock className="h-4 w-4" />
					Rytm nauki
					{state.streakWeeks > 0 && (
						<span
							role="img"
							className="ml-auto inline-flex items-center gap-1 rounded-full border border-ed-amber bg-ed-badge-bg px-2.5 py-0.5 text-sm font-semibold text-ed-amber-text"
							aria-label={`Seria: ${state.streakWeeks} tygodni z rzędu z aktywnością`}
						>
							<Flame className="h-4 w-4" />
							{state.streakWeeks} tyg.
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				{!editing && d ? (
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
						<span>
							Plan: <strong className="text-foreground">{d.hoursPerWeek} h/tydz.</strong>
						</span>
						{d.days.length > 0 && (
							<span>
								(
								{DAY_LABEL.filter(({ key }) => d.days.includes(key))
									.map(({ label }) => label)
									.join(", ")}
								)
							</span>
						)}
						{d.activeProjectId && (
							<span>
								· projekt:{" "}
								{projects.find((p) => p.id === d.activeProjectId)?.title ?? "(niedostępny)"}
							</span>
						)}
						<Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
							Zmień
						</Button>
					</div>
				) : (
					<div className="space-y-3">
						<p className="text-muted-foreground">
							Zadeklaruj, ile czasu tygodniowo dajesz nauce — streak i przypomnienia o zastoju liczą
							się z Twojej realnej aktywności (projekty, tutor, testy), nie z formularzy.
						</p>
						<div className="flex flex-wrap items-center gap-3">
							<label className="flex items-center gap-2">
								<span>Godzin / tydzień:</span>
								<input
									type="number"
									min={1}
									max={80}
									value={hours}
									onChange={(e) => setHours(Number(e.target.value))}
									aria-label="Godziny nauki tygodniowo"
									className="h-9 w-20 rounded-md border border-input bg-background px-3 text-sm"
								/>
							</label>
							<fieldset className="m-0 flex gap-1 border-0 p-0">
								<legend className="sr-only">Dni nauki</legend>
								{DAY_LABEL.map(({ key, label }) => (
									<button
										key={key}
										type="button"
										aria-pressed={days.includes(key)}
										onClick={() =>
											setDays((prev) =>
												prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
											)
										}
										className={`rounded-md border px-2 py-1 text-xs font-medium ${
											days.includes(key)
												? "border-ed-amber bg-ed-badge-bg text-foreground"
												: "border-border bg-background text-muted-foreground"
										}`}
									>
										{label}
									</button>
								))}
							</fieldset>
						</div>
						{projects.length > 0 && (
							<label className="flex flex-wrap items-center gap-2">
								<span>Projekt w toku:</span>
								<select
									value={projectId}
									onChange={(e) => setProjectId(e.target.value)}
									aria-label="Projekt powiązany z rytmem"
									className="h-9 rounded-md border border-input bg-background px-3 text-sm"
								>
									<option value="">— bez powiązania —</option>
									{projects.map((p) => (
										<option key={p.id} value={p.id}>
											{p.title}
										</option>
									))}
								</select>
							</label>
						)}
						<label className="flex items-center gap-2 text-muted-foreground">
							<input
								type="checkbox"
								checked={optOut}
								onChange={(e) => setOptOut(e.target.checked)}
							/>
							nie przypominaj mi o zastoju
						</label>
						<Button size="sm" disabled={busy || hours < 1} onClick={() => void saveDeclaration()}>
							{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							Zapisz rytm
						</Button>
					</div>
				)}

				{d && (
					<div className="space-y-2 rounded-lg border border-border p-3">
						<p className="font-medium text-foreground">
							Check-in tygodnia{" "}
							{state.currentWeekCheckin ? "(zapisany — możesz poprawić)" : "(opcjonalny)"}
						</p>
						<div className="flex flex-wrap items-center gap-2">
							<input
								type="number"
								min={0}
								max={120}
								value={checkinHours}
								onChange={(e) => setCheckinHours(e.target.value)}
								placeholder="ile h realnie?"
								aria-label="Realne godziny w tym tygodniu"
								className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm"
							/>
							<input
								type="text"
								value={checkinNote}
								onChange={(e) => setCheckinNote(e.target.value)}
								maxLength={500}
								placeholder="Jak idzie? (opcjonalnie)"
								aria-label="Notatka check-inu"
								className="h-9 min-w-56 flex-1 rounded-md border border-input bg-background px-3 text-sm"
							/>
							<Button
								size="sm"
								disabled={busy || (checkinHours.trim() === "" && checkinNote.trim() === "")}
								onClick={() => void saveCheckin()}
							>
								Zapisz check-in
							</Button>
						</div>
					</div>
				)}

				{state.recentCheckins.length > 0 && (
					<ul className="space-y-1 text-muted-foreground">
						{state.recentCheckins.map((c) => (
							<li key={c.weekStart} className="flex flex-wrap gap-x-2">
								<span>tydz. od {new Date(c.weekStart).toLocaleDateString("pl-PL")}:</span>
								{c.hoursActual !== null && (
									<span className="font-medium text-foreground">{c.hoursActual} h</span>
								)}
								{c.note && <span className="italic">„{c.note}"</span>}
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
