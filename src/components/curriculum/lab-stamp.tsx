"use client";

/**
 * 1E.6b (ADR-015) — pieczątka labu: kod atomu + wklejenie tokenu.
 *
 * Przepływ: student przepisuje KOD ATOMU do komórki-pieczątki w notebooku Colab
 * → pieczątka liczy wartości w sesji i wypisuje TOKEN → student wkleja token tutaj
 * → SERWER weryfikuje podpis i SAM sprawdza każdy check (nie ufa notebookowi).
 *
 * Komunikaty rozróżniają trzy różne porażki, bo znaczą co innego dla studenta:
 *  - zły podpis / literówka   → „przepisz token jeszcze raz"
 *  - checki nie przeszły      → „praca nie spełnia warunków" + KTÓRY check padł
 *  - brak konfiguracji        → uczciwie: to nasza wina, nie Twoja
 *
 * NIGDY nie pokazujemy wartości oczekiwanej — to byłaby podpowiedź rozwiązania.
 */

import { CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CheckResult = { id: string; passed: boolean; reason?: string };

export function LabStamp({
	itemId,
	atomCode,
	completed,
}: {
	itemId: string;
	atomCode: string;
	completed: boolean;
}) {
	const router = useRouter();
	const [token, setToken] = useState("");
	const [sending, setSending] = useState(false);
	const [failed, setFailed] = useState<CheckResult[] | null>(null);

	if (completed) {
		return (
			<div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
				<CheckCircle2 aria-hidden className="size-4" />
				Sprawdzenie przeszło — zaliczenie zapisane.
			</div>
		);
	}

	async function submit() {
		if (!token.trim() || sending) return;
		setSending(true);
		setFailed(null);
		try {
			const res = await fetch(`/api/curriculum/items/${itemId}/complete`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token: token.trim() }),
			});
			const data = await res.json().catch(() => ({}));

			if (res.ok) {
				toast.success(
					data.moduleCompleted ? "Zadanie zaliczone — moduł ukończony!" : "Zadanie zaliczone.",
				);
				setToken("");
				router.refresh();
				return;
			}
			if (res.status === 409) {
				// Token poprawny, ale praca nie spełnia checków.
				setFailed((data.results as CheckResult[])?.filter((r) => !r.passed) ?? []);
				toast.error(
					"Jeszcze nie — popraw pracę w notatniku i uruchom komórkę zaliczenia ponownie.",
				);
				return;
			}
			if (res.status === 400) {
				toast.error(
					data.reason === "bad_signature"
						? "Ten kod nie pasuje do tej lekcji — najczęściej to literówka w kodzie lekcji przepisanym do notatnika (sprawdź punkt 1) albo kod z innego konta."
						: "Kod wygląda na uszkodzony — skopiuj go jeszcze raz w całości.",
				);
				return;
			}
			if (res.status === 501) {
				toast.error("Sprawdzanie zadań jest chwilowo niedostępne — to po naszej stronie.");
				return;
			}
			toast.error("Nie udało się zapisać zaliczenia.");
		} catch {
			toast.error("Błąd sieci — spróbuj ponownie.");
		} finally {
			setSending(false);
		}
	}

	return (
		<section className="rounded-xl border border-border bg-card p-5">
			<h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
				<ClipboardCheck aria-hidden className="size-4" />
				Zalicz zadanie praktyczne
			</h2>

			<ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
				<li>
					Wpisz w komórce zaliczenia w notatniku ten kod lekcji:{" "}
					<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
						{atomCode}
					</code>
				</li>
				<li>Uruchom komórkę zaliczenia — wypisze kod potwierdzający.</li>
				<li>Wklej ten kod poniżej.</li>
			</ol>

			<div className="mt-4 flex flex-col gap-2 sm:flex-row">
				<Input
					value={token}
					onChange={(e) => setToken(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					placeholder="Wklej kod z komórki zaliczenia"
					aria-label="Kod potwierdzający z notatnika"
					disabled={sending}
					className="font-mono"
				/>
				<Button onClick={submit} disabled={!token.trim() || sending}>
					{sending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
					Zalicz zadanie
				</Button>
			</div>

			{failed && failed.length > 0 && (
				<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
					<p className="text-sm font-medium text-amber-900">
						Kod jest poprawny, ale praca nie spełnia warunków:
					</p>
					<ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-900">
						{failed.map((r) => (
							<li key={r.id}>
								<span className="font-mono">{r.id}</span>
								{r.reason ? ` — ${r.reason}` : " — wynik nie zgadza się z oczekiwanym"}
							</li>
						))}
					</ul>
					<p className="mt-2 text-xs text-amber-800">
						Popraw notatnik i uruchom komórkę zaliczenia jeszcze raz. Liczba prób jest
						nieograniczona.
					</p>
				</div>
			)}
		</section>
	);
}
