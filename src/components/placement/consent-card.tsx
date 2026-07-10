"use client";

import { BriefcaseBusiness, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { EMPLOYMENT_STATUS_LABEL, PLACEMENT_CONSENT_COPY } from "./placement-labels";

/**
 * 1.17 — karta zgody na śledzenie placement w kroku Wnioski (decyzja Darka:
 * zgoda zbierana w onboardingu → pełny baseline 1. kohorty; dane
 * nieodtwarzalne wstecz).
 *
 * Czysty opt-in: zaznaczenie zgody odsłania wybór statusu na start; „Zapisz"
 * robi POST consent + POST baseline. Pominięcie karty = decyzja NIEpodjęta
 * (decidedAt zostaje NULL — profil dalej pokazuje sekcję zgody). Nie ma tu
 * przycisku odmowy — Wnioski to finał kreatora, nie miejsce na formalną
 * odmowę RODO (ta jest w profilu, gdzie widać też skutki wycofania).
 */
export function PlacementConsentCard() {
	const [checked, setChecked] = useState(false);
	const [status, setStatus] = useState<string>("");
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	async function handleSave() {
		if (!checked || !status || saving) return;
		setSaving(true);
		try {
			const consentRes = await fetch("/api/placement/consent", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ consent: true }),
			});
			if (!consentRes.ok) throw new Error("consent_failed");
			const eventRes = await fetch("/api/placement/events", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					kind: "baseline",
					employmentStatus: status,
					occurredAt: new Date().toISOString(),
				}),
			});
			// 409 = baseline już istnieje (np. drugi zapis po odświeżeniu) — zgoda
			// i tak zapisana, traktujemy jak sukces.
			if (!eventRes.ok && eventRes.status !== 409) throw new Error("baseline_failed");
			setSaved(true);
		} catch {
			toast.error("Nie udało się zapisać zgody. Możesz to zrobić później w profilu.");
		} finally {
			setSaving(false);
		}
	}

	if (saved) {
		return (
			<output className="block rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
				Dziękujemy! Status zawodowy zapisany — zmiany (staż, praca) zgłosisz w profilu.
			</output>
		);
	}

	return (
		<section
			aria-label="Zgoda na śledzenie skuteczności platformy"
			className="rounded-lg border border-border bg-card p-4 space-y-3"
		>
			<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
				<BriefcaseBusiness className="h-4 w-4" />
				Pomóż nam mierzyć, czy SkillBridge działa
			</h3>
			<label className="flex items-start gap-2 text-sm text-muted-foreground">
				<input
					type="checkbox"
					checked={checked}
					onChange={(e) => setChecked(e.target.checked)}
					className="mt-0.5"
				/>
				<span>{PLACEMENT_CONSENT_COPY}</span>
			</label>
			{checked && (
				<div className="flex flex-wrap items-center gap-2">
					<Select value={status} onValueChange={setStatus}>
						<SelectTrigger className="w-72" aria-label="Twój status zawodowy na start">
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
					<Button onClick={handleSave} disabled={!status || saving} size="sm">
						{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
						Zapisz
					</Button>
				</div>
			)}
		</section>
	);
}
