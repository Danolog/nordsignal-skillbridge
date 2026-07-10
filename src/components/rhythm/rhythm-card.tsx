"use client";

import { CalendarClock, Flame } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * 1.18 — karta rytmu na dashboardzie: streak + alert zastoju („X dni bez
 * aktywności przy zadeklarowanym rytmie"). Alert znika przyciskiem „Wracam"
 * (POST dismiss — zamyka epizod) albo realną aktywnością. Bez deklaracji:
 * delikatna zachęta z linkiem do „Mojej drogi".
 */

export interface RhythmCardState {
	declared: boolean;
	hoursPerWeek: number | null;
	streakWeeks: number;
	lastActivityAt: string | null;
	showStagnationAlert: boolean;
}

export function RhythmCard({ state }: { state: RhythmCardState }) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);

	async function dismiss() {
		setBusy(true);
		try {
			const res = await fetch("/api/rhythm/stagnation-dismiss", { method: "POST" });
			if (!res.ok) throw new Error("dismiss_failed");
			router.refresh();
		} catch {
			toast.error("Nie udało się zapisać.");
		} finally {
			setBusy(false);
		}
	}

	const daysSince = state.lastActivityAt
		? Math.floor((Date.now() - new Date(state.lastActivityAt).getTime()) / 86_400_000)
		: null;

	if (!state.declared) {
		return (
			<div className="db-card rhythm-card">
				<p className="rhythm-card-title">
					<CalendarClock size={16} /> Rytm nauki
				</p>
				<p className="rhythm-card-muted">
					Zadeklaruj swój tygodniowy rytm — pomożemy Ci go utrzymać.{" "}
					<Link href="/moja-droga" className="rhythm-card-link">
						Ustaw w Mojej drodze
					</Link>
				</p>
			</div>
		);
	}

	return (
		<div className="db-card rhythm-card">
			<p className="rhythm-card-title">
				<CalendarClock size={16} /> Rytm nauki
				{state.streakWeeks > 0 && (
					<span
						role="img"
						className="rhythm-card-streak"
						aria-label={`Seria ${state.streakWeeks} tygodni`}
					>
						<Flame size={14} /> {state.streakWeeks} tyg.
					</span>
				)}
			</p>
			{state.showStagnationAlert ? (
				<output className="rhythm-card-alert">
					<p>
						{daysSince !== null ? `${daysSince} dni bez aktywności` : "Brak aktywności"} przy
						zadeklarowanych {state.hoursPerWeek} h/tydz. Mały krok dziś podtrzyma serię.
					</p>
					<div className="rhythm-card-actions">
						<Link href="/projects" className="rhythm-card-link">
							Wróć do projektu
						</Link>
						<button
							type="button"
							disabled={busy}
							onClick={() => void dismiss()}
							className="rhythm-card-dismiss"
						>
							Wiem, wracam
						</button>
					</div>
				</output>
			) : (
				<p className="rhythm-card-muted">
					Plan: {state.hoursPerWeek} h/tydz.
					{daysSince !== null && daysSince <= 1 ? " Dziś już coś zrobiłeś — tak trzymaj." : ""}
				</p>
			)}
		</div>
	);
}
