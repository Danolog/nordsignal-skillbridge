"use client";

/**
 * 1E.3 · P5 — Ekran 5: render paczki correctives (część W3 / stan S-C z /start).
 *
 * Reguły (Mila 7.1–7.5 + Sophia D5):
 *  - `message` z API renderowane wprost (gotowe zdanie mikrocopy N/M),
 *  - koncepty jako `<ol>` (kolejność ma znaczenie — stabilna), każdy `<h3>`,
 *  - TRZY stany wiersza (Mila 7.2):
 *      1. koncept bez atomów  → sam tekst „materiału nie mamy…" (zero linku),
 *      2. atom z moduleSlug   → link klikalny do trasy-resolvera,
 *      3. atom osierocony (moduleSlug=null) → tekst „w przygotowaniu" (zero linku),
 *  - fallback nazwy konceptu przez humanizeConceptSlug (7.3 — nigdy goły slug),
 *  - jedyna akcja ekranu: „Wróć do modułu" (ghost).
 *
 * Komponent CZYSTO prezentacyjny (bez fetchy) — `resolveAtomHref` wstrzyknięty
 * jako czysta funkcja (kontrakt Mila 9.2), testowalny osobno.
 */

import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CorrectivesAtom, CorrectivesPackage } from "@/lib/assessment/correctives";
import { atomKindLabel, humanizeConceptSlug, resolveAtomHref } from "@/lib/curriculum/atom-href";

interface CorrectivesPanelProps {
	pkg: CorrectivesPackage;
	/** Link „Wróć do modułu" — slug modułu egzaminowanego (jedyna akcja ekranu). */
	backHref: string;
	/**
	 * Rozwiązanie adresu atomu (Mila 9.2): `null` = osierocony → render bez linku.
	 * Domyślnie `resolveAtomHref` (trasa-resolver); wstrzykiwalny dla testów.
	 */
	resolveHref?: (atom: CorrectivesAtom) => string | null;
}

/** Wiersz atomu — link (moduleSlug obecny) albo uczciwy tekst (osierocony). */
function AtomRow({
	atom,
	resolveHref,
}: {
	atom: CorrectivesAtom;
	resolveHref: (atom: CorrectivesAtom) => string | null;
}) {
	const href = resolveHref(atom);
	const label = `${atomKindLabel(atom.kind)} — ${atom.title}`;
	if (href === null) {
		// Stan 3: atom osierocony (moduleSlug=null) — zero martwego linku (Mila 7.2).
		return (
			<li className="text-sm text-muted-foreground">
				{label} — materiał w przygotowaniu, wróć tu za jakiś czas.
			</li>
		);
	}
	return (
		<li className="text-sm">
			<Link
				href={href}
				className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
			>
				{label}
			</Link>
		</li>
	);
}

/** Karta jednego konceptu do odświeżenia — atomy albo uczciwy tekst degradacji. */
function ConceptCard({
	concept,
	name,
	atoms,
	resolveHref,
}: {
	concept: string;
	name: string | null;
	atoms: CorrectivesAtom[];
	resolveHref: (atom: CorrectivesAtom) => string | null;
}) {
	const title = name ?? humanizeConceptSlug(concept);
	return (
		<li className="rounded-xl border border-border bg-card p-4">
			<h3 className="text-sm font-semibold text-foreground">{title}</h3>
			{atoms.length === 0 ? (
				// Stan 1: koncept bez atomów — sam tekst (Mila 7.2, wzorzec „pusty stan
				// = uczciwe zdanie, nie martwy link").
				<p className="mt-1 text-sm text-muted-foreground">
					Materiału powtórkowego dla tego tematu jeszcze nie mamy w drabinie — omów go z wykładowcą
					albo na konsultacjach.
				</p>
			) : (
				<ul className="mt-2 flex flex-col gap-1.5">
					{atoms.map((atom) => (
						<AtomRow key={atom.slug} atom={atom} resolveHref={resolveHref} />
					))}
				</ul>
			)}
		</li>
	);
}

export function CorrectivesPanel({
	pkg,
	backHref,
	resolveHref = resolveAtomHref,
}: CorrectivesPanelProps) {
	return (
		<section aria-labelledby="correctives-heading" className="flex flex-col gap-4">
			<div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-5">
				<ClipboardList aria-hidden className="mt-0.5 size-5 shrink-0 text-sky-600" />
				<div>
					<h2 id="correctives-heading" className="text-base font-semibold text-sky-900">
						Czas na uzupełnienie materiału
					</h2>
					<p className="mt-1 text-sm text-sky-900">{pkg.message}</p>
				</div>
			</div>

			<div>
				<h2 className="text-sm font-semibold text-foreground">Koncepty do odświeżenia</h2>
				<ol className="mt-2 flex flex-col gap-3">
					{pkg.concepts.map((concept) => (
						<ConceptCard
							key={concept.concept}
							concept={concept.concept}
							name={concept.conceptName}
							atoms={concept.atoms}
							resolveHref={resolveHref}
						/>
					))}
				</ol>
			</div>

			<div>
				<Button asChild variant="ghost">
					<Link href={backHref}>Wróć do modułu</Link>
				</Button>
			</div>
		</section>
	);
}
