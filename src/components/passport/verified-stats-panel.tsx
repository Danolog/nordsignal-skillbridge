/**
 * MIS.3 (plan 13) — prywatny panel „Świeżość i konteksty" kredencjałów.
 *
 * Renderowany WYŁĄCZNIE w widoku właściciela (dashboard/passport) za flagą
 * `passportFreshness` — świadomie POZA `PassportDocument`, bo dokument jest
 * współdzielony z paszportem publicznym, a decyzja Darka (2026-07-21) mówi:
 * publiczny bez zmian do osobnej decyzji po pilotażu.
 *
 * Server component — czysta prezentacja, zero interakcji.
 */

import { CalendarClock, Layers } from "lucide-react";
import {
	type FreshnessBucket,
	freshnessBucket,
	type VerifiedCompetencyStat,
} from "@/lib/passport-verified";

const BUCKET_UI: Record<FreshnessBucket, { label: string; className: string }> = {
	fresh: { label: "świeża", className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
	aging: { label: "starzejąca się", className: "border-amber-200 bg-amber-50 text-amber-900" },
	stale: { label: "do odświeżenia", className: "border-rose-200 bg-rose-50 text-rose-900" },
};

/** „1 kontekst" / „2 konteksty" / „5 kontekstów" — polska liczba mnoga. */
export function contextCountLabel(n: number): string {
	if (n === 1) return "1 kontekst";
	const lastDigit = n % 10;
	const lastTwo = n % 100;
	if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) {
		return `${n} konteksty`;
	}
	return `${n} kontekstów`;
}

export function VerifiedStatsPanel({
	stats,
	now = new Date(),
}: {
	stats: VerifiedCompetencyStat[];
	/** Wstrzykiwalne w testach; domyślnie bieżący czas renderu (server). */
	now?: Date;
}) {
	if (stats.length === 0) return null;

	const sorted = [...stats].sort((a, b) => a.name.localeCompare(b.name, "pl"));

	return (
		<section className="rounded-xl border border-border bg-card p-5">
			<h2 className="text-base font-semibold text-foreground">Świeżość i konteksty</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				Widok prywatny — te wskaźniki nie pojawiają się w publicznym paszporcie. Kompetencja
				potwierdzona w co najmniej dwóch projektach jest „ugruntowana”; dawno niepotwierdzona —
				warta odświeżenia kolejnym projektem.
			</p>
			<ul className="mt-4 flex flex-col gap-2">
				{sorted.map((stat) => {
					const bucket = BUCKET_UI[freshnessBucket(stat.lastVerifiedAt, now)];
					return (
						<li
							key={stat.name}
							className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm"
						>
							<span className="font-medium text-foreground">{stat.name}</span>
							{stat.contextCount >= 2 && (
								<span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900">
									ugruntowana
								</span>
							)}
							<span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
								<Layers aria-hidden className="size-3.5" />
								{contextCountLabel(stat.contextCount)}
							</span>
							<span
								className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${bucket.className}`}
							>
								<CalendarClock aria-hidden className="size-3.5" />
								{bucket.label} · {stat.lastVerifiedAt.toLocaleDateString("pl-PL")}
							</span>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
