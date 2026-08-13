/**
 * KlauzulaMarkdown — renderer CZĘŚCI I klauzuli art. 13 (E4).
 *
 * Czysto prezentacyjny. Treść przychodzi propsem z `wczytajKlauzuleDlaStudenta()`
 * — komponent NIE zna ścieżki do nośnika i nie ma jak pokazać nic spoza tego, co
 * dostał. Cięcie CZĘŚCI I i bramka aparatu wewnętrznego żyją w
 * `src/lib/legal/klauzula-art13.ts` (jedno miejsce, jeden strażnik).
 *
 * Bezpieczeństwo (wzorzec z ADR-006 / TheoryMarkdown):
 *   - BEZ rehype-raw → surowy HTML nie wchodzi do drzewa jako elementy;
 *   - rehype-sanitize na domyślnym schemacie (treść pochodzi z repozytorium,
 *     nie od użytkownika — sanityzacja jest tu drugą warstwą, nie jedyną);
 *   - linki: rel=noopener noreferrer wymuszane TU, nie z treści.
 *
 * TABELE: `react-markdown` bez wtyczki GFM ich nie zna, a wtyczki w zależnościach
 * NIE MA (dołożenie biblioteki = decyzja stacku, poza moim mandatem). Tabele
 * rozpoznaje więc `podzielNaBloki()` i renderuje je tutaj jako prawdziwy
 * `<table>` z `<th scope="col">` — czyli lepiej dla czytnika ekranu niż domyślne
 * wyjście GFM bez nagłówków wierszy. Trzy z pięciu tabel CZĘŚCI I niosą treść,
 * której art. 13 wymaga wprost (podstawy prawne, odbiorcy, okresy przechowywania)
 * — nie wolno ich zamienić na akapit z kreskami.
 *
 * Hierarchia nagłówków: `##` z dokumentu → `<h1>` strony, `###` → `<h2>`.
 * Dokument ma dokładnie jeden nagłówek `##` (tytuł klauzuli), więc strona ma
 * dokładnie jeden `<h1>` i nieprzerwaną hierarchię — warunek axe `heading-order`.
 */

import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import type { BlokTresci } from "@/lib/legal/klauzula-art13";

const KOMPONENTY = {
	h2: ({ children }: { children?: React.ReactNode }) => (
		<h1 className="mb-6 font-serif text-3xl leading-tight font-bold text-slate-900 md:text-4xl">
			{children}
		</h1>
	),
	h3: ({ children }: { children?: React.ReactNode }) => (
		<h2 className="mt-10 mb-3 text-xl font-semibold text-slate-900">{children}</h2>
	),
	p: ({ children }: { children?: React.ReactNode }) => (
		<p className="my-4 leading-relaxed text-slate-700">{children}</p>
	),
	ul: ({ children }: { children?: React.ReactNode }) => (
		<ul className="my-4 list-disc space-y-2 pl-6 text-slate-700 marker:text-slate-400">
			{children}
		</ul>
	),
	ol: ({ children }: { children?: React.ReactNode }) => (
		<ol className="my-4 list-decimal space-y-2 pl-6 text-slate-700 marker:text-slate-400">
			{children}
		</ol>
	),
	li: ({ children }: { children?: React.ReactNode }) => (
		<li className="pl-1 leading-relaxed">{children}</li>
	),
	strong: ({ children }: { children?: React.ReactNode }) => (
		<strong className="font-semibold text-slate-900">{children}</strong>
	),
	em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
	code: ({ children }: { children?: React.ReactNode }) => (
		<code className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-900">
			{children}
		</code>
	),
	a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
		<a
			href={href}
			rel="noopener noreferrer"
			className="font-medium text-emerald-800 underline underline-offset-2 hover:no-underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
		>
			{children}
		</a>
	),
	hr: () => <hr className="my-8 border-slate-200" />,
};

/** Zawartość komórki: markdown w linii, bez opakowania w akapit. */
function Komorka({ tekst }: { tekst: string }) {
	return (
		<ReactMarkdown
			rehypePlugins={[rehypeSanitize]}
			components={{
				p: ({ children }) => <>{children}</>,
				strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
				code: ({ children }) => (
					<code className="rounded-sm bg-slate-100 px-1 text-[0.9em]">{children}</code>
				),
			}}
		>
			{tekst}
		</ReactMarkdown>
	);
}

export function KlauzulaMarkdown({ bloki }: { bloki: BlokTresci[] }) {
	return (
		<div className="text-[15px]">
			{bloki.map((blok, i) =>
				blok.rodzaj === "markdown" ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: bloki powstają z jednego, niezmiennego dokumentu — kolejność JEST tożsamością
					<ReactMarkdown key={i} rehypePlugins={[rehypeSanitize]} components={KOMPONENTY}>
						{blok.tekst}
					</ReactMarkdown>
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: jw.
					<div key={i} className="my-6 overflow-x-auto">
						<table className="w-full border-collapse text-left text-sm">
							<thead>
								<tr className="border-b-2 border-slate-300">
									{blok.naglowek.map((kolumna) => (
										<th
											key={kolumna}
											scope="col"
											className="px-3 py-2 align-top font-semibold text-slate-900"
										>
											<Komorka tekst={kolumna} />
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{blok.wiersze.map((wiersz) => (
									<tr key={wiersz.join("|")} className="border-b border-slate-200">
										{wiersz.map((komorka, k) => (
											<td
												// biome-ignore lint/suspicious/noArrayIndexKey: pozycja kolumny JEST jej tożsamością
												key={k}
												className="px-3 py-2 align-top leading-relaxed text-slate-700"
											>
												<Komorka tekst={komorka} />
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				),
			)}
		</div>
	);
}
