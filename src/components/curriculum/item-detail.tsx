/**
 * 1E.6a — widok pojedynczej pozycji curriculum: teoria (markdown) + zasoby +
 * pętla pytań (theory/exercise) albo uczciwy komunikat blokady (lab).
 *
 * Markdown teorii idzie przez `TheoryMarkdown` (ADR-006: react-markdown +
 * rehype-sanitize, pozytywna allowlista, bez rehype-raw) — treść atomów jest
 * częściowo generowana LLM, więc render jest granicą XSS.
 *
 * Pozycja `kind === "lab"` (nazwa dla studenta: `itemKindLabel`) — stan aktualny:
 * zalicza się kodem z notatnika, weryfikowanym serwerowo (ADR-015, PR #181).
 * Widżet zaliczenia (`LabStamp`) renderuje się, gdy pozycja MA kontrakt sprawdzeń
 * i kod; przy jego braku pokazujemy `LAB_AUTOCHECK_NOTICE` — blokada dotyczy
 * WTEDY tej jednej pozycji, nie mechanizmu.
 *
 * SPROSTOWANIE (#291): do 2026-08-12 stało tu „`/complete` zwraca dziś 501
 * (automatyczne checki wchodzą w 1E.6b), więc pozycja jest NIEZALICZALNA".
 * Było prawdą do PR #180 i przestało nim być w PR #181 — ten sam nieusunięty
 * opis nieistniejącego już stanu, co w mikrocopy naprawionym w tym zgłoszeniu,
 * tylko w komentarzu, więc nikt go nie zobaczył. Plik od dawna renderuje
 * `LabStamp` niżej, czyli nagłówek przeczył własnemu kodowi.
 *
 * Server component (interakcję ma tylko `ItemRunner`).
 */

import { ArrowLeft, ExternalLink, FlaskConical } from "lucide-react";
import Link from "next/link";
import { ItemRunner } from "@/components/curriculum/item-runner";
import { LabStamp } from "@/components/curriculum/lab-stamp";
import {
	ITEM_STATUS_LABEL,
	itemKindLabel,
	LAB_AUTOCHECK_NOTICE,
	statusBadgeClass,
} from "@/components/curriculum/labels";
import { TheoryMarkdown } from "@/components/skillbridge/b3/TheoryMarkdown";
import type { CurriculumItemView } from "@/lib/curriculum/item-view";

export function ItemDetail({
	view,
	confidenceProbeEnabled,
}: {
	view: CurriculumItemView;
	/** MIS.1 — flaga confidenceProbe czytana w server component (page.tsx). */
	confidenceProbeEnabled: boolean;
}) {
	const { item, module: module_, questions, answeredCorrectQuestionIds, resources } = view;
	const isLab = item.kind === "lab";

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
			<Link
				href={`/curriculum/${module_.id}`}
				className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft aria-hidden className="size-4" />
				{module_.title}
			</Link>

			<header>
				<div className="flex flex-wrap items-center gap-2">
					<span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
						{itemKindLabel(item.kind)}
					</span>
					<span
						className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(item.status)}`}
					>
						{ITEM_STATUS_LABEL[item.status]}
					</span>
					{item.estimatedTime && (
						<span className="text-xs text-muted-foreground">≈ {item.estimatedTime}</span>
					)}
				</div>
				<h1 className="mt-2 text-2xl font-semibold text-foreground">{item.title}</h1>
			</header>

			{/*
			 * 1E.6b: lab z realnym kontraktem checków dostaje pieczątkę (kod atomu
			 * + pole tokenu). Lab BEZ checków — albo przy braku LAB_TOKEN_SECRET —
			 * nadal jest niezaliczalny i mówimy to WPROST, zamiast pokazywać pole,
			 * które i tak nic nie zapisze.
			 */}
			{isLab && !item.hasChecks && (
				<div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
					<h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
						<FlaskConical aria-hidden className="size-4" />
						Ta pozycja jest zablokowana — jeszcze nie da się jej zaliczyć
					</h2>
					<p className="mt-1 text-sm text-amber-900">{LAB_AUTOCHECK_NOTICE}</p>
				</div>
			)}

			{/*
			 * Krok 4: checklist laba zaczyna się od „Otwórz notebook … linkiem z tej
			 * pozycji" — przycisk stoi więc PRZED teorią, żeby obietnica z treści
			 * miała pokrycie na pierwszym ekranie. Od partii F1 przycisk mają też
			 * ćwiczenia z notebookiem towarzyszącym (hinty odsyłają do brudnopisów).
			 */}
			{item.notebookUrl && (
				<a
					href={item.notebookUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
				>
					<span className="flex items-center gap-2 text-sm font-semibold text-foreground">
						<FlaskConical aria-hidden className="size-4" />
						Otwórz notebook w Google Colab
					</span>
					<span className="flex items-center gap-1 text-xs text-muted-foreground">
						nowa karta
						<ExternalLink aria-hidden className="size-3.5" />
					</span>
				</a>
			)}

			{item.contentMd && (
				<article className="rounded-xl border border-border bg-card p-5">
					<TheoryMarkdown source={item.contentMd} />
				</article>
			)}

			{isLab && item.hasChecks && item.atomCode && (
				<LabStamp
					itemId={item.id}
					atomCode={item.atomCode}
					completed={item.status === "completed" || item.status === "skipped_by_placement"}
				/>
			)}

			{isLab && item.labHints.length > 0 && (
				<details className="rounded-xl border border-border bg-card p-5">
					<summary className="cursor-pointer text-sm font-semibold text-foreground">
						Podpowiedzi ({item.labHints.length})
					</summary>
					<div className="mt-3 flex flex-col gap-2">
						{item.labHints.map((hint) => (
							<div
								key={hint}
								className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
							>
								<TheoryMarkdown source={hint} />
							</div>
						))}
					</div>
				</details>
			)}

			{!isLab && questions.length > 0 && (
				<ItemRunner
					itemId={item.id}
					moduleId={module_.id}
					questions={questions}
					answeredCorrectQuestionIds={answeredCorrectQuestionIds}
					hintsByQuestion={item.hintsByQuestion}
					hintsTotal={item.hintsTotal}
					initialStatus={item.status}
					confidenceProbeEnabled={confidenceProbeEnabled}
				/>
			)}

			{resources.length > 0 && (
				<section className="rounded-xl border border-border bg-card p-5">
					<h2 className="text-sm font-semibold text-foreground">Materiały</h2>
					<ul className="mt-3 flex flex-col gap-2">
						{resources.map((r) => (
							<li key={r.id}>
								<a
									href={r.url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 text-sm text-emerald-700 underline underline-offset-2 hover:no-underline"
								>
									{r.title}
									<ExternalLink aria-hidden className="size-3.5" />
								</a>
								<span className="ml-2 text-xs text-muted-foreground">
									{r.language ? `${r.language} · ` : ""}
									{r.registrationRequired ? "wymaga rejestracji" : "bez rejestracji"}
								</span>
							</li>
						))}
					</ul>
				</section>
			)}
		</div>
	);
}
