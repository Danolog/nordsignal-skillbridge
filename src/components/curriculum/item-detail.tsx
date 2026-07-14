/**
 * 1E.6a — widok pojedynczej pozycji curriculum: teoria (markdown) + zasoby +
 * pętla pytań (theory/exercise) albo uczciwy komunikat blokady (lab).
 *
 * Markdown teorii idzie przez `TheoryMarkdown` (ADR-006: react-markdown +
 * rehype-sanitize, pozytywna allowlista, bez rehype-raw) — treść atomów jest
 * częściowo generowana LLM, więc render jest granicą XSS.
 *
 * Lab: `/complete` zwraca dziś 501 (automatyczne checki wchodzą w 1E.6b), więc
 * pozycja jest NIEZALICZALNA i mówimy to wprost. Nie pokazujemy przycisku
 * „zalicz" ani pętli pytań, która sugerowałaby postęp.
 *
 * Server component (interakcję ma tylko `ItemRunner`).
 */

import { ArrowLeft, ExternalLink, FlaskConical } from "lucide-react";
import Link from "next/link";
import { ItemRunner } from "@/components/curriculum/item-runner";
import { LabStamp } from "@/components/curriculum/lab-stamp";
import { ITEM_STATUS_LABEL, itemKindLabel, statusBadgeClass } from "@/components/curriculum/labels";
import { TheoryMarkdown } from "@/components/skillbridge/b3/TheoryMarkdown";
import type { CurriculumItemView } from "@/lib/curriculum/item-view";

export function ItemDetail({ view }: { view: CurriculumItemView }) {
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
					<p className="mt-1 text-sm text-amber-900">
						Lab zalicza się automatycznym sprawdzeniem wykonanej pracy (bez samodeklaracji). Dla tej
						pozycji sprawdzenie nie jest jeszcze skonfigurowane — możesz przeczytać instrukcję i
						wykonać ją u siebie, ale drabina nie zapisze zaliczenia.
					</p>
				</div>
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

			{isLab && item.hints.length > 0 && (
				<details className="rounded-xl border border-border bg-card p-5">
					<summary className="cursor-pointer text-sm font-semibold text-foreground">
						Podpowiedzi ({item.hints.length})
					</summary>
					<div className="mt-3 flex flex-col gap-2">
						{item.hints.map((hint) => (
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
					hints={item.hints}
					initialStatus={item.status}
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
