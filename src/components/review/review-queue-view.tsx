"use client";

// ============================================================================
// B8/1.5 (ADR-011) — WIDOK KOLEJKI RECENZJI + akcje Zatwierdź/Odrzuć.
//
// Mobile-friendly (wzorzec /market-refresh): karty zamiast tabeli, duże
// przyciski. Dane z GET /api/review-queue (cookie sesji recenzenta);
// decyzja = POST /api/review-queue/[id]/decision → wpis znika z listy.
// 409 (druga decyzja, wyścig dwóch recenzentów) → toast + odświeżenie.
//
// machineStatus = rekomendacja maszyny dla recenzenta-nie-eksperta (ADR-008):
// verified → „proponuje: ZATWIERDŹ", rejected → „proponuje: ODRZUĆ",
// submitted → „pogranicze — decyzja człowieka".
// ============================================================================

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/** B7/1.16a: projekcja aiReviewJson.viva (jedno źródło = viva_sessions.status). */
interface VivaProjection {
	state: string;
	score?: number;
	questionCount: number;
	completedAt?: string;
}

interface QueueItem {
	submissionId: string;
	projectId: string;
	projectTitle: string | null;
	projectLevel: string | null;
	tenantSlug: string | null;
	score: number | null;
	machineStatus: string;
	submittedAt: string | null;
	viva: VivaProjection | null;
}

/** Wymiana Q/A obrony z GET /api/review-queue/[id]/viva (odczyt audytowany). */
interface VivaExchangeRow {
	position: number;
	question: string;
	filePath: string | null;
	excerpt: string | null;
	answer: string | null;
	verdict: { points: number; justification: string } | null;
}

const MACHINE_HINT: Record<string, { label: string; tone: "ok" | "bad" | "mid" }> = {
	verified: { label: "Maszyna proponuje: ZATWIERDŹ", tone: "ok" },
	rejected: { label: "Maszyna proponuje: ODRZUĆ", tone: "bad" },
	submitted: { label: "Pogranicze — decyzja człowieka", tone: "mid" },
};

/** Etykieta stanu obrony dla recenzenta (score/max przy rozstrzygniętych). */
function vivaLabel(v: VivaProjection): { label: string; tone: "ok" | "bad" | "mid" } {
	const max = v.questionCount * 2;
	const score = typeof v.score === "number" ? ` (${v.score}/${max} pkt)` : "";
	switch (v.state) {
		case "passed":
			return { label: `Obrona: zdana${score}`, tone: "ok" };
		case "failed":
			return { label: `Obrona: niezaliczona${score}`, tone: "bad" };
		case "inconclusive":
			return { label: "Obrona: nierozstrzygnięta (fail-closed)", tone: "mid" };
		case "pending":
			return { label: "Obrona: czeka na studenta", tone: "mid" };
		case "in_progress":
			return { label: "Obrona: w toku", tone: "mid" };
		case "expired":
			return { label: "Obrona: wygasła bez odpowiedzi", tone: "mid" };
		case "superseded":
			return { label: "Obrona: nieaktualna", tone: "mid" };
		default:
			return { label: `Obrona: ${v.state}`, tone: "mid" };
	}
}

export function ReviewQueueView({ reviewerKind }: { reviewerKind: string }) {
	const [queue, setQueue] = useState<QueueItem[] | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [notes, setNotes] = useState<Record<string, string>>({});
	// B7/1.16b: rozwinięte obrony (odczyt audytowany — pobieramy dopiero po
	// kliknięciu i cache'ujemy, żeby nie mnożyć wpisów audytu przy re-renderach).
	const [vivaOpen, setVivaOpen] = useState<Record<string, boolean>>({});
	const [vivaExchange, setVivaExchange] = useState<Record<string, VivaExchangeRow[]>>({});
	const [vivaLoadingId, setVivaLoadingId] = useState<string | null>(null);

	const load = useCallback(async () => {
		try {
			const res = await fetch("/api/review-queue");
			if (!res.ok) {
				toast.error("Nie udało się pobrać kolejki.");
				setQueue([]);
				return;
			}
			const body = (await res.json()) as { queue: QueueItem[] };
			setQueue(body.queue);
		} catch {
			toast.error("Błąd połączenia.");
			setQueue([]);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	async function toggleViva(submissionId: string) {
		if (vivaOpen[submissionId]) {
			setVivaOpen((o) => ({ ...o, [submissionId]: false }));
			return;
		}
		if (vivaExchange[submissionId]) {
			setVivaOpen((o) => ({ ...o, [submissionId]: true }));
			return;
		}
		setVivaLoadingId(submissionId);
		try {
			const res = await fetch(`/api/review-queue/${submissionId}/viva`);
			if (!res.ok) {
				toast.error(
					res.status === 404 ? "Brak sesji obrony dla zgłoszenia." : "Nie udało się pobrać obrony.",
				);
				return;
			}
			const body = (await res.json()) as { exchange: VivaExchangeRow[] };
			setVivaExchange((e) => ({ ...e, [submissionId]: body.exchange }));
			setVivaOpen((o) => ({ ...o, [submissionId]: true }));
		} catch {
			toast.error("Błąd połączenia.");
		} finally {
			setVivaLoadingId(null);
		}
	}

	async function decide(submissionId: string, decision: "approved" | "rejected") {
		setBusyId(submissionId);
		try {
			const note = notes[submissionId]?.trim();
			const res = await fetch(`/api/review-queue/${submissionId}/decision`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ decision, ...(note ? { note } : {}) }),
			});
			if (res.status === 409) {
				toast.error("Decyzja o tym zgłoszeniu już zapadła — odświeżam kolejkę.");
				await load();
				return;
			}
			if (!res.ok) {
				toast.error("Nie udało się zapisać decyzji.");
				return;
			}
			toast.success(
				decision === "approved" ? "Zatwierdzono — receipt zweryfikowany." : "Odrzucono.",
			);
			setQueue((q) => (q ?? []).filter((item) => item.submissionId !== submissionId));
		} catch {
			toast.error("Błąd połączenia.");
		} finally {
			setBusyId(null);
		}
	}

	if (queue === null) {
		return (
			<div className="rq-loading">
				<Loader2 className="animate-spin" size={20} />
				<span>Ładowanie kolejki…</span>
			</div>
		);
	}

	return (
		<div className="rq-wrap">
			<div className="rq-head">
				<div>
					<h1 className="rq-h1">Kolejka recenzji</h1>
					<p className="rq-sub">
						{reviewerKind === "quality_operator"
							? "Operator jakości — widzisz zgłoszenia wszystkich kampusów."
							: "Wykładowca — widzisz zgłoszenia swojego kampusu."}{" "}
						Twoja decyzja jest ostateczna (ADR-008: człowiek ma ostatnie słowo).
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={() => void load()}>
					<RefreshCw size={14} /> Odśwież
				</Button>
			</div>

			{queue.length === 0 ? (
				<Card>
					<CardContent className="rq-empty">
						Kolejka pusta — żadne zgłoszenie nie czeka na człowieka. ✔
					</CardContent>
				</Card>
			) : (
				queue.map((item) => {
					const hint = MACHINE_HINT[item.machineStatus] ?? MACHINE_HINT.submitted;
					const busy = busyId === item.submissionId;
					return (
						<Card key={item.submissionId} className="rq-card">
							<CardHeader>
								<CardTitle className="rq-title">
									{item.projectTitle ?? "(projekt usunięty)"}
									{item.projectLevel && <span className="rq-level">{item.projectLevel}</span>}
								</CardTitle>
								<div className="rq-meta">
									{item.tenantSlug && <span>{item.tenantSlug}</span>}
									{item.score !== null && <span>wynik maszyny: {item.score}/100</span>}
									{item.submittedAt && (
										<span>złożone {new Date(item.submittedAt).toLocaleDateString("pl-PL")}</span>
									)}
								</div>
							</CardHeader>
							<CardContent className="rq-body">
								<div className={`rq-hint rq-hint-${hint.tone}`}>{hint.label}</div>
								{/* B7/1.16b — stan obrony z projekcji + audytowany podgląd
								    surowych odpowiedzi (viva_answers to klasa DENY; jedyna
								    droga = GET /api/review-queue/[id]/viva, wpis audytu per
								    odczyt — dlatego pobieranie dopiero na klik). */}
								{item.viva && (
									<div className="rq-viva">
										{(() => {
											const vl = vivaLabel(item.viva);
											return <div className={`rq-hint rq-hint-${vl.tone}`}>{vl.label}</div>;
										})()}
										<Button
											variant="outline"
											size="sm"
											disabled={vivaLoadingId === item.submissionId}
											onClick={() => void toggleViva(item.submissionId)}
										>
											{vivaLoadingId === item.submissionId ? (
												<Loader2 size={14} className="animate-spin" />
											) : null}
											{vivaOpen[item.submissionId]
												? "Ukryj obronę"
												: "Pokaż odpowiedzi obrony (odczyt audytowany)"}
										</Button>
										{vivaOpen[item.submissionId] &&
											(vivaExchange[item.submissionId] ?? []).map((row) => (
												<div key={row.position} className="rq-viva-row">
													<p className="rq-viva-q">
														<strong>P{row.position + 1}:</strong> {row.question}
														{row.filePath && (
															<span className="rq-viva-file"> ({row.filePath})</span>
														)}
													</p>
													<p className="rq-viva-a">{row.answer ?? <em>— brak odpowiedzi —</em>}</p>
													{row.verdict && (
														<p className="rq-viva-verdict">
															Sędzia: {row.verdict.points}/2 pkt — {row.verdict.justification}
														</p>
													)}
												</div>
											))}
									</div>
								)}
								<Textarea
									placeholder="Notatka do decyzji (opcjonalna, trafia do śladu recenzji)"
									value={notes[item.submissionId] ?? ""}
									onChange={(e) => setNotes((n) => ({ ...n, [item.submissionId]: e.target.value }))}
									maxLength={2000}
									rows={2}
								/>
								<div className="rq-actions">
									<Button
										disabled={busy}
										onClick={() => void decide(item.submissionId, "approved")}
									>
										{busy ? <Loader2 size={14} className="animate-spin" /> : null} Zatwierdź
									</Button>
									<Button
										variant="destructive"
										disabled={busy}
										onClick={() => void decide(item.submissionId, "rejected")}
									>
										Odrzuć
									</Button>
								</div>
							</CardContent>
						</Card>
					);
				})
			)}
		</div>
	);
}
