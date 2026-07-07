"use client";

// ============================================================================
// AG.6 — powiadomienia „nowa luka" na dashboardzie (kanał in-app).
//
// Trzy stany (props z server component — flaga NIE trafia do bundla klienta,
// przy fladze off komponent w ogóle nie jest renderowany):
//   1. brak decyzji o zgodzie → karta opt-in RODO (włącz / nie chcę),
//   2. zgoda + nieprzeczytane zdarzenia → lista „rynek zaczął wymagać X",
//   3. zgoda bez zdarzeń albo odmowa → nic (zero nagabywania; ponowne
//      włączenie po odmowie przyjdzie ze wspólnym modułem zgód 1.17).
//
// Komponent CELOWO bez lustrzanego stanu lokalnego (props→useState gubi
// aktualizacje po router.refresh()): każda akcja robi POST i refresh() —
// server component przelicza stan (np. świeża zgoda → od razu widać
// zaległe nieprzeczytane zdarzenia) i zsyła nowe props.
// ============================================================================

import { BellRing } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { MarketNotificationsState } from "@/lib/market-notifications";

async function post(path: string, body?: unknown): Promise<boolean> {
	try {
		const res = await fetch(path, {
			method: "POST",
			...(body !== undefined
				? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
				: {}),
		});
		return res.ok;
	} catch {
		return false;
	}
}

export function MarketGapNotifications({ state }: { state: MarketNotificationsState }) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);

	if (!state.enabled) return null;

	async function decide(value: boolean) {
		setBusy(true);
		const ok = await post("/api/market-notifications/consent", { consent: value });
		if (!ok) {
			setBusy(false);
			toast.error("Nie udało się zapisać decyzji. Spróbuj ponownie.");
			return;
		}
		toast.success(value ? "Powiadomienia o rynku włączone." : "Powiadomienia wyłączone.");
		router.refresh();
	}

	async function markRead() {
		setBusy(true);
		const ok = await post("/api/market-notifications/read");
		if (!ok) {
			setBusy(false);
			toast.error("Nie udało się oznaczyć powiadomień. Spróbuj ponownie.");
			return;
		}
		router.refresh();
	}

	if (!state.decided) {
		return (
			<div className="db-card db-notif">
				<div className="db-notif-head">
					<BellRing size={18} aria-hidden />
					<h3 className="db-notif-h3">Powiadomienia o zmianach na rynku pracy</h3>
				</div>
				<p className="db-notif-text">
					Rynek się zmienia — gdy w Twoim celu kariery pojawi się nowa wymagana kompetencja (nowa
					luka), możemy Cię o tym powiadomić tutaj, na pulpicie. Wymaga to Twojej zgody na
					monitorowanie zmian rynku względem Twojego profilu. Zgodę możesz wycofać w każdej chwili.
				</p>
				<div className="db-notif-actions">
					<button
						type="button"
						className="db-anchor-dark"
						disabled={busy}
						onClick={() => decide(true)}
					>
						Włącz powiadomienia
					</button>
					<button
						type="button"
						className="db-notif-decline"
						disabled={busy}
						onClick={() => decide(false)}
					>
						Nie chcę powiadomień
					</button>
				</div>
			</div>
		);
	}

	if (!state.consent || state.notifications.length === 0) return null;

	return (
		<div className="db-card db-notif" aria-live="polite">
			<div className="db-notif-head">
				<BellRing size={18} aria-hidden />
				<h3 className="db-notif-h3">
					{state.notifications.length === 1
						? "Nowa luka z rynku"
						: `Nowe luki z rynku (${state.notifications.length})`}
				</h3>
			</div>
			<ul className="db-notif-list">
				{state.notifications.map((n) => (
					<li key={n.id} className="db-notif-item">
						<span>
							Rynek zaczął wymagać: <b>{n.competencyName}</b>
						</span>
						<span className="db-badge-soft">
							{n.priority === "critical" ? "Luka krytyczna" : "Luka ważna"} · {n.marketPercentage}%
							ofert
						</span>
					</li>
				))}
			</ul>
			<div className="db-notif-actions">
				<Link href="/gap-analysis" className="db-anchor-dark">
					Zobacz w analizie luk →
				</Link>
				<button type="button" className="db-notif-decline" disabled={busy} onClick={markRead}>
					Oznacz jako przeczytane
				</button>
				<button
					type="button"
					className="db-notif-optout"
					disabled={busy}
					onClick={() => decide(false)}
				>
					Wyłącz powiadomienia
				</button>
			</div>
		</div>
	);
}
