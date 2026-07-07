"use client";

// ============================================================================
// AG.4 — WIDOK DECYZJI: diff ostatniego przebiegu + akceptacja jednym
// tapnięciem (mobile-friendly) albo odrzucenie.
//
// Strona jest publicznym SZKIELETEM bez danych: każda treść przychodzi dopiero
// po podaniu sekretu MARKET_REFRESH_TOKEN (nagłówek do tras /api/market-refresh,
// które i tak są za flagą proactiveMarketRefresh — bez niej 404). Token żyje
// w sessionStorage (wygoda na telefonie), nie w localStorage (krótsze okno).
// Better Auth celowo pominięte — to panel operacyjny Darka, nie feature studenta.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface DiffCompetencyChanged {
	competencyName: string;
	from: number;
	to: number;
	delta: number;
}

interface DiffPath {
	careerGoal: string;
	added: { competencyName: string; demandPercentage: number }[];
	removed: { competencyName: string; demandPercentage: number }[];
	changed: DiffCompetencyChanged[];
}

interface RunView {
	id: string;
	status: "staged" | "accepted" | "rejected";
	createdAt: string;
	acceptedAt: string | null;
	rawOffers: number;
	uniqueOffers: number;
	assignedOffers: number;
	stagedRows: number;
	ofertyMd5: string;
	technologieMd5: string;
	diff: {
		newPaths: { careerGoal: string; competencies: number }[];
		removedPaths: { careerGoal: string; competencies: number }[];
		changedPaths: DiffPath[];
		summary: Record<string, number>;
	};
}

const STATUS_LABEL: Record<RunView["status"], string> = {
	staged: "CZEKA NA DECYZJĘ",
	accepted: "ZAAKCEPTOWANY (na prodzie)",
	rejected: "ODRZUCONY",
};

export default function MarketRefreshPage() {
	const [token, setToken] = useState("");
	const [run, setRun] = useState<RunView | null>(null);
	const [loaded, setLoaded] = useState(false);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		setToken(sessionStorage.getItem("market-refresh-token") ?? "");
	}, []);

	const authHeaders = useCallback(
		(): Record<string, string> => ({ "x-market-refresh-token": token.trim() }),
		[token],
	);

	const loadLatest = useCallback(async () => {
		setBusy(true);
		try {
			sessionStorage.setItem("market-refresh-token", token.trim());
			const res = await fetch("/api/market-refresh/runs/latest", { headers: authHeaders() });
			if (res.status === 401) {
				toast.error("Zły token.");
				return;
			}
			if (res.status === 404) {
				toast.error("Funkcja wyłączona na tym środowisku (flaga).");
				return;
			}
			if (!res.ok) {
				toast.error("Odczyt nie powiódł się.");
				return;
			}
			const body = (await res.json()) as { run: RunView | null };
			setRun(body.run);
			setLoaded(true);
			if (!body.run) toast.info("Brak przebiegów — najpierw wgraj CSV (runbook).");
		} finally {
			setBusy(false);
		}
	}, [token, authHeaders]);

	const decide = useCallback(
		async (decision: "accept" | "reject") => {
			if (!run) return;
			const question =
				decision === "accept"
					? `AKCEPTUJESZ swap na PROD?\n\n${run.stagedRows} wierszy zastąpi job_market_data.\nBackup: job_market_data_bak (w tej samej transakcji).`
					: "Odrzucić ten przebieg? Prod zostaje bez zmian.";
			if (!window.confirm(question)) return;

			setBusy(true);
			try {
				const res = await fetch(`/api/market-refresh/runs/${run.id}/decision`, {
					method: "POST",
					headers: { ...authHeaders(), "Content-Type": "application/json" },
					body: JSON.stringify({ decision }),
				});
				const body = (await res.json()) as { error?: string; prodRows?: number };
				if (!res.ok) {
					toast.error(body.error ?? "Operacja nie powiodła się.");
					return;
				}
				toast.success(
					decision === "accept"
						? `Swap wykonany: ${body.prodRows} wierszy na prodzie (backup: job_market_data_bak).`
						: "Przebieg odrzucony — prod bez zmian.",
				);
				await loadLatest();
			} finally {
				setBusy(false);
			}
		},
		[run, authHeaders, loadLatest],
	);

	return (
		<main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
			<h1 className="font-bold text-xl">Odświeżenie rynku — decyzja (AG.4)</h1>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Dostęp</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<Input
						type="password"
						placeholder="MARKET_REFRESH_TOKEN"
						value={token}
						onChange={(e) => setToken(e.target.value)}
					/>
					<Button onClick={loadLatest} disabled={busy || token.trim() === ""}>
						Pobierz ostatni przebieg
					</Button>
				</CardContent>
			</Card>

			{loaded && !run && (
				<p className="text-muted-foreground text-sm">
					Brak przebiegów. Wgraj CSV zgodnie z runbookiem market-refresh.
				</p>
			)}

			{run && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Przebieg z {new Date(run.createdAt).toLocaleString("pl-PL")} —{" "}
							{STATUS_LABEL[run.status]}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4 text-sm">
						<div className="grid grid-cols-2 gap-x-4 gap-y-1">
							<span>Oferty (surowe / przypisane)</span>
							<span className="text-right font-mono">
								{run.rawOffers} / {run.assignedOffers}
							</span>
							<span>Wierszy do wgrania</span>
							<span className="text-right font-mono">{run.stagedRows}</span>
							<span>Nowe / zniknięte ścieżki</span>
							<span className="text-right font-mono">
								{run.diff.summary.newPaths} / {run.diff.summary.removedPaths}
							</span>
							<span>Kompetencje +/−/Δ</span>
							<span className="text-right font-mono">
								{run.diff.summary.addedCompetencies} / {run.diff.summary.removedCompetencies} /{" "}
								{run.diff.summary.changedCompetencies}
							</span>
							<span>md5 ofert</span>
							<span className="truncate text-right font-mono text-xs">{run.ofertyMd5}</span>
						</div>

						{run.diff.newPaths.length > 0 && (
							<div>
								<h3 className="font-semibold">Nowe ścieżki</h3>
								<ul className="list-inside list-disc">
									{run.diff.newPaths.map((p) => (
										<li key={p.careerGoal}>
											{p.careerGoal} ({p.competencies} kompetencji)
										</li>
									))}
								</ul>
							</div>
						)}
						{run.diff.removedPaths.length > 0 && (
							<div>
								<h3 className="font-semibold text-destructive">Znikające ścieżki</h3>
								<ul className="list-inside list-disc">
									{run.diff.removedPaths.map((p) => (
										<li key={p.careerGoal}>
											{p.careerGoal} ({p.competencies} kompetencji)
										</li>
									))}
								</ul>
							</div>
						)}

						{run.diff.changedPaths.map((p) => (
							<details key={p.careerGoal} className="rounded border p-2">
								<summary className="cursor-pointer font-semibold">
									{p.careerGoal} (+{p.added.length} / −{p.removed.length} / Δ{p.changed.length})
								</summary>
								<div className="mt-2 flex flex-col gap-1">
									{p.added.map((c) => (
										<div key={`a-${c.competencyName}`}>
											＋ {c.competencyName} ({c.demandPercentage}%)
										</div>
									))}
									{p.removed.map((c) => (
										<div key={`r-${c.competencyName}`} className="text-destructive">
											－ {c.competencyName} (było {c.demandPercentage}%)
										</div>
									))}
									{p.changed.map((c) => (
										<div key={`c-${c.competencyName}`}>
											Δ {c.competencyName}: {c.from}% → {c.to}% ({c.delta > 0 ? "+" : ""}
											{c.delta} p.p.)
										</div>
									))}
								</div>
							</details>
						))}

						{run.status === "staged" && (
							<div className="flex flex-col gap-2 pt-2">
								<Button onClick={() => decide("accept")} disabled={busy}>
									Akceptuję — swap na prod (z backupem)
								</Button>
								<Button variant="outline" onClick={() => decide("reject")} disabled={busy}>
									Odrzuć — prod bez zmian
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</main>
	);
}
