/**
 * 1E.2 — packer treści atomów: markdown Sophii (docs/curation/sophia-1e2-*.md)
 * → JSON pod ingest (tools/content/curriculum-atoms/*.json).
 *
 * DETERMINISTYCZNY i POWTARZALNY: Sophia edytuje markdown (jej format
 * autorski), packer przepakowuje — mechanika, nie autoring (podział ról
 * zadeklarowany w nagłówkach dokumentów treści). Po każdej edycji treści:
 *   pnpm content:pack-curriculum && pnpm db:ingest-curriculum
 *
 * Co parsuje z dokumentu (struktura jednolita — QG):
 *  - atomy:      ## Atom <KOD> — <TYTUŁ>
 *  - meta-linia: **Typ:** `kind` · **Czas studenta:** … · **Koncept(y):**
 *                `slug` (KLUCZOWY) … · [**UI zweryfikowano:** data]
 *  - sekcje:     ### Cel / Teoria / Zadanie / Specyfikacja / Checklist …
 *                (→ contentMd VERBATIM), ### Pytania (→ bank), ### Drabinka
 *                hintów (→ configJson.hints, 3 stopnie)
 *  - pytania:    **Pn. stem** + opcje "- A. …"; poprawna = **tekst** ✓;
 *                feedback per opcja w *kursywie*, diagnoza w "(diagnoza: …)";
 *                explanationMd pytania = feedback opcji poprawnej
 *  - zasoby:     tabela "## Zasoby opcjonalne modułu" → resources pierwszego
 *                atomu modułu (zasoby są modułowe; poziom pozycji = decyzja
 *                kuracji przy 1E.5)
 *
 * Manifest per moduł (poniżej) trzyma to, czego w markdownie nie ma wprost:
 * nazwy konceptów (bank potrzebuje name), pozycję przeglądu przed egzaminem
 * (reuse refów z zasad modułu), nadpisania kind (mini-projekt F3.7 → lab,
 * decyzja Darka 2026-07-11: pkt 12b bez pipeline'u marketplace) i opisowe
 * haki checks (definicje automatów = 1E.6).
 *
 * Stemy/opcje/feedback: zawijanie 80 kolumn zwijane do spacji (markdown i tak
 * renderuje pojedynczy newline jako spację); teoria (contentMd) VERBATIM.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
	AtomItemInput,
	AtomModuleContent,
	AtomQuestionInput,
	AtomResourceInput,
} from "./content-curriculum-atoms";

const CURATION_DIR = join(process.cwd(), "docs", "curation");
const OUT_DIR = join(process.cwd(), "tools", "content", "curriculum-atoms");

type AtomOverride = {
	kind?: string;
	/** Tytuł studencki (gdy nagłówek dokumentu niesie wewnętrzne odnośniki). */
	title?: string;
	concepts?: { slug: string; key?: boolean }[];
	checks?: unknown[];
};

type ModuleManifest = {
	moduleSlug: string;
	sourceFile: string;
	/** slug konceptu → nazwa do banku (question_concepts.name). */
	conceptNames: Record<string, string>;
	/** Nadpisania per KOD atomu (np. "F3.7"). */
	overrides?: Record<string, AtomOverride>;
	/** Pozycja przeglądu przed egzaminem (reuse refów z zasad modułu). */
	przeglad?: { refs: string[] };
};

/** Opisowy hak checku „komórka-pieczątka + token" (implementacja 1E.6). */
const TOKEN_CHECK = [
	{ type: "token", note: "komórka-pieczątka + token (mechanizm w zasadach L0; definicja 1E.6)" },
];

const MANIFESTS: ModuleManifest[] = [
	{
		moduleSlug: "l0-start",
		sourceFile: "sophia-1e2-l0-atomy.md",
		conceptNames: {
			"colab-uruchomienie-komorki": "Colab: uruchamiam kod w przeglądarce",
			"notebook-komorki-kod-tekst": "Notebook: komórki kodu i tekstu, własna kopia",
			"sesja-stan-zmiennych": "Sesja: pamięć zmiennych, kolejność, restart",
			"skrypt-sekwencja-instrukcji": "Skrypt: sekwencja instrukcji od zera",
		},
		// Meta-linie L0 mają koncept OPISOWO (bez sluga) — slugi z zasad modułu.
		overrides: {
			"L0.1": {
				concepts: [{ slug: "colab-uruchomienie-komorki", key: true }],
				checks: TOKEN_CHECK,
			},
			"L0.2": { concepts: [{ slug: "notebook-komorki-kod-tekst" }], checks: TOKEN_CHECK },
			"L0.3": { concepts: [{ slug: "sesja-stan-zmiennych", key: true }], checks: TOKEN_CHECK },
			"L0.4": {
				concepts: [{ slug: "skrypt-sekwencja-instrukcji", key: true }],
				checks: TOKEN_CHECK,
			},
		},
	},
	{
		moduleSlug: "f1-python-1",
		sourceFile: "sophia-1e2-f1-atomy.md",
		conceptNames: {
			"typ-wartosci": "Typ wartości: int, float, str",
			"wyrazenie-obliczenie": "Wyrażenie: Python liczy, zanim wypisze",
			"f-string-budowanie-tekstu": "f-string: budowanie tekstu z wartości",
			"porownanie-bool": "Porównanie i wartości logiczne (bool)",
			"decyzja-if-else": "Decyzja: if / else",
		},
		overrides: {
			"F1.4": { checks: TOKEN_CHECK },
			// Lab samodzielny — meta bez slugów; koncepty domykane treścią zadania.
			"F1.7": {
				concepts: [{ slug: "porownanie-bool" }, { slug: "decyzja-if-else" }],
				checks: TOKEN_CHECK,
			},
		},
		// Zasady modułu F1: „Przegląd przed egzaminem (D6.3, czysty reuse)" — 11 pytań.
		przeglad: {
			refs: [
				"L0.3-P2",
				"L0.4-P1",
				"L0.4-P2",
				"L0.4-P3",
				"F1.1-P3",
				"F1.2-P2",
				"F1.3-P2",
				"F1.5-P1",
				"F1.5-P3",
				"F1.6-P1",
				"F1.6-P2",
			],
		},
	},
	{
		moduleSlug: "f2-python-2",
		sourceFile: "sophia-1e2-f2-atomy.md",
		conceptNames: {
			"input-konwersja-typow": "input() i konwersja typów",
			"lista-kolekcja": "Lista: kolekcja wartości",
			"petla-for": "Pętla for: dla każdego elementu",
			"wzorzec-akumulatora": "Wzorzec akumulatora",
			"funkcja-def-return": "Funkcja: def i return",
		},
		overrides: {
			"F2.4": { checks: TOKEN_CHECK },
			"F2.7": {
				concepts: [{ slug: "wzorzec-akumulatora" }, { slug: "funkcja-def-return" }],
				checks: [
					{
						type: "token",
						note:
							"pieczątka WYWOŁUJE funkcję studenta na próbnej liście i porównuje wynik " +
							"(rozszerzenie mechanizmu — notatki F2; definicja 1E.6)",
					},
				],
			},
		},
		// Zasady modułu F2: 10 pytań reuse.
		przeglad: {
			refs: [
				"F1.5-P2",
				"F1.6-P1",
				"F1.6-P3",
				"F2.1-P2",
				"F2.2-P1",
				"F2.3-P1",
				"F2.3-P3",
				"F2.5-P2",
				"F2.6-P1",
				"F2.6-P3",
			],
		},
	},
	{
		moduleSlug: "f3-dane-python",
		sourceFile: "sophia-1e2-f3-atomy.md",
		conceptNames: {
			"append-budowanie-listy": "Budowanie listy: .append()",
			"if-w-petli-filtrowanie": "if w pętli: filtrowanie i zliczanie",
			"slownik-klucz-wartosc": "Słownik: wartość pod kluczem",
			"lista-slownikow-rekordy": "Lista słowników: tabela rekordów",
			"agregaty-sum-min-max": "Gotowe agregaty: sum, min, max",
		},
		overrides: {
			"F3.4": { checks: TOKEN_CHECK },
			// MINI-PROJEKT (pkt 12b): kind lab + 3 kamienie automatyczne — decyzja
			// Darka 2026-07-11 (bez wiersza w projects/pipeline'u marketplace).
			"F3.7": {
				kind: "lab",
				title: "MINI-PROJEKT: Tygodniowy raport wydatków",
				concepts: [
					{ slug: "lista-slownikow-rekordy" },
					{ slug: "if-w-petli-filtrowanie" },
					{ slug: "slownik-klucz-wartosc" },
					{ slug: "agregaty-sum-min-max" },
				],
				checks: [
					{ type: "milestone", id: "K1", note: "walidacja struktury danych (lista słowników)" },
					{
						type: "milestone",
						id: "K2",
						note: "pieczątka wywołuje trzy funkcje studenta na próbnej tabeli (tolerancja abs(x-y)<0.01)",
					},
					{
						type: "milestone",
						id: "K3",
						note: "spójność sum: całość = suma po kategoriach wyprowadzonych z danych studenta",
					},
				],
			},
		},
		// Zasady modułu F3: 10 pytań reuse.
		przeglad: {
			refs: [
				"F2.3-P1",
				"F2.5-P1",
				"F2.5-P2",
				"F2.6-P2",
				"F3.1-P3",
				"F3.2-P1",
				"F3.3-P2",
				"F3.5-P1",
				"F3.5-P3",
				"F3.6-P2",
			],
		},
	},
	{
		moduleSlug: "m-pandas",
		sourceFile: "sophia-1e2-mpd-atomy.md",
		conceptNames: {
			"import-pakiety-terminal": "Import pakietów i terminal w komórce",
			"dataframe-tabela": "DataFrame: tabela w opakowaniu narzędzia",
			"maska-filtrowanie": "Maska: warunek na całej kolumnie naraz",
			"braki-danych-decyzje": "Braki danych: policz, zrozum, zdecyduj",
			"grupowanie-agregacja": "Grupowanie: podziel, policz, sklej",
			"wykresy-opisane": "Wykres, który wspiera wniosek",
		},
		overrides: {
			"PD.4": { checks: TOKEN_CHECK },
			// Lab samodzielny — meta mówi „wszystkie z M-PD" (bez slugów).
			"PD.8": {
				concepts: [
					{ slug: "dataframe-tabela" },
					{ slug: "maska-filtrowanie" },
					{ slug: "braki-danych-decyzje" },
					{ slug: "grupowanie-agregacja" },
					{ slug: "wykresy-opisane" },
				],
				checks: TOKEN_CHECK,
			},
		},
		przeglad: {
			refs: [
				"F3.5-P1",
				"F3.5-P2",
				"F3.2-P2",
				"F3.6-P2",
				"PD.1-P2",
				"PD.2-P2",
				"PD.3-P1",
				"PD.5-P3",
				"PD.6-P2",
				"PD.7-P3",
			],
		},
	},
	{
		moduleSlug: "m-eda",
		sourceFile: "sophia-1e2-meda-atomy.md",
		conceptNames: {
			"api-json-pobieranie": "API i JSON: program pyta inny komputer o dane",
			"git-repo-commit": "Git i GitHub: repozytorium, commit, historia",
			"eda-metoda-hipotezy": "EDA jako metoda: pytania, eksploracja, hipotezy",
		},
		// Moduł 4-atomowy (podział M-EDA wg audytu pojemności D10). BEZ egzaminu MC —
		// bramką jest capstone, więc zasady modułu definiują „przegląd przed capstone'em"
		// (nie „przed egzaminem" jak M-PD/M-SQL/M-ML/M-LLM); pozycja przeglądu ta sama.
		overrides: {
			"EDA.4": { checks: TOKEN_CHECK },
		},
		przeglad: {
			refs: [
				"PD.2-P1",
				"PD.3-P2",
				"PD.5-P1",
				"PD.5-P3",
				"PD.6-P2",
				"PD.6-P3",
				"PD.7-P2",
				"PD.7-P3",
				"EDA.1-P2",
				"EDA.3-P1",
			],
		},
	},
	{
		moduleSlug: "m-sql",
		sourceFile: "sophia-1e2-msql-atomy.md",
		conceptNames: {
			"sql-select-zapytanie": "SELECT: zapytanie do tabeli",
			"sql-where-order": "WHERE i ORDER BY: przesiej i uporządkuj",
			"sql-group-by-agregacja": "GROUP BY: agregaty per grupa",
			"sql-join-ziarno": "JOIN i ziarno wiersza",
			"sql-funkcje-okna": "Funkcje okna: agregat, który nie zjada wierszy",
		},
		overrides: {
			"SQL.4": { checks: TOKEN_CHECK },
			// Lab samodzielny — meta mówi „wszystkie z M-SQL" (bez slugów).
			"SQL.7": {
				concepts: [
					{ slug: "sql-group-by-agregacja" },
					{ slug: "sql-join-ziarno" },
					{ slug: "sql-funkcje-okna" },
				],
				checks: TOKEN_CHECK,
			},
		},
		przeglad: {
			refs: [
				"PD.3-P1",
				"PD.6-P2",
				"EDA.3-P3",
				"SQL.1-P2",
				"SQL.2-P1",
				"SQL.2-P3",
				"SQL.3-P2",
				"SQL.5-P1",
				"SQL.5-P3",
				"SQL.6-P2",
			],
		},
	},
	{
		moduleSlug: "m-ml",
		sourceFile: "sophia-1e2-mml-atomy.md",
		conceptNames: {
			"model-fit-predict": "Model: dopasuj (fit) i przewiduj (predict)",
			"train-test-podzial": "Podział train/test: uczciwy sprawdzian",
			"baseline-punkt-odniesienia": "Baseline: punkt odniesienia przed modelem",
			"metryki-macierz-pomylek": "Metryki i macierz pomyłek",
			"leakage-uczciwosc-ewaluacji": "Leakage: uczciwość ewaluacji",
		},
		overrides: {
			// Meta: „Koncepty ćwiczone: ML.1–ML.3" (bez slugów).
			"ML.4": {
				concepts: [
					{ slug: "model-fit-predict" },
					{ slug: "train-test-podzial" },
					{ slug: "baseline-punkt-odniesienia" },
				],
				checks: TOKEN_CHECK,
			},
			// Lab samodzielny — meta mówi „wszystkie z M-ML".
			"ML.7": {
				concepts: [
					{ slug: "train-test-podzial" },
					{ slug: "baseline-punkt-odniesienia" },
					{ slug: "metryki-macierz-pomylek" },
					{ slug: "leakage-uczciwosc-ewaluacji" },
				],
				checks: TOKEN_CHECK,
			},
		},
		przeglad: {
			refs: [
				"PD.5-P3",
				"PD.6-P3",
				"EDA.3-P1",
				"SQL.5-P3",
				"ML.1-P2",
				"ML.2-P1",
				"ML.2-P3",
				"ML.3-P2",
				"ML.5-P1",
				"ML.6-P2",
			],
		},
	},
	{
		moduleSlug: "m-llm",
		sourceFile: "sophia-1e2-mllm-atomy.md",
		conceptNames: {
			"llm-niedeterminizm-temperatura": "LLM: niedeterminizm i temperatura",
			"prompt-specyfikacja": "Prompt jako specyfikacja",
			"json-parsowanie-walidacja": "JSON: parsowanie i walidacja odpowiedzi",
			"ewaluacja-halucynacje": "Ewaluacja: trafność pól i wskaźnik halucynacji",
			"klucz-sekrety-rodo": "Klucz API, limity, dane osobowe",
		},
		overrides: {
			"LLM.4": { checks: TOKEN_CHECK },
			// Lab samodzielny (finał drabiny) — meta mówi „wszystkie z M-LLM".
			"LLM.7": {
				concepts: [
					{ slug: "prompt-specyfikacja" },
					{ slug: "json-parsowanie-walidacja" },
					{ slug: "ewaluacja-halucynacje" },
				],
				checks: TOKEN_CHECK,
			},
		},
		przeglad: {
			refs: [
				"EDA.1-P1",
				"EDA.3-P3",
				"ML.3-P2",
				"ML.5-P3",
				"LLM.1-P2",
				"LLM.2-P1",
				"LLM.2-P3",
				"LLM.3-P2",
				"LLM.5-P1",
				"LLM.6-P2",
			],
		},
	},
];

/** "F1.5-P2" → "f1-5-p2" (globalny ref pytania w zestawie treści). */
function refFromCode(code: string): string {
	return code.toLowerCase().replace(/\./g, "-");
}

/** Zwija zawijanie 80 kolumn do spacji (markdown renderuje tak samo). */
function unwrap(text: string): string {
	return text.replace(/\s*\n\s*/g, " ").trim();
}

/**
 * Zdejmuje WSPÓLNE wcięcie kontynuacji listy z wnętrza płotka (linia
 * otwierająca ``` przychodzi bez wcięcia — split łapie od backticków),
 * ZACHOWUJĄC względne wcięcia kodu (F1.6 uczy wcięć — nie wolno ich zdzierać).
 */
function dedentFence(block: string): string {
	const lines = block.split("\n");
	const inner = lines.slice(1);
	const indents = inner
		.filter((l) => l.trim().length > 0)
		.map((l) => (l.match(/^[ \t]*/)?.[0] ?? "").length);
	const common = indents.length > 0 ? Math.min(...indents) : 0;
	return [lines[0], ...inner.map((l) => l.slice(common))].join("\n");
}

/**
 * Zwijanie zawijania Z ZACHOWANIEM bloków kodu (hinty L0.4/F1.6/F1.7/F2.6/
 * F2.7 mają płotki ```python — spłaszczone do jednej linii przestałyby się
 * renderować). Proza między płotkami zwijana; wnętrze płotków po dedencie
 * wspólnego wcięcia listy — względne wcięcia kodu nietknięte.
 */
function unwrapPreservingCode(text: string): string {
	const parts = text.split(/(```[\s\S]*?```)/);
	return parts
		.map((part, i) => (i % 2 === 1 ? dedentFence(part) : unwrap(part)))
		.filter((part) => part.length > 0)
		.join("\n")
		.trim();
}

type ParsedAtom = {
	code: string;
	title: string;
	kind: string;
	estimated: string | null;
	uiVerifiedAt: string | null;
	conceptSlugs: { slug: string; key: boolean }[];
	contentMd: string;
	questions: {
		stem: string;
		options: { text: string; feedbackMd: string; diagnosis?: string; correct: boolean }[];
	}[];
	hints: string[];
};

function parseOption(raw: string, where: string) {
	const line = unwrap(raw);
	const m = line.match(/^([A-D])\.\s+(.*)$/);
	if (!m) throw new Error(`${where}: opcja bez litery: "${line.slice(0, 60)}"`);
	const body = m[2];
	const correctMatch = body.match(/^\*\*(.+?)\*\*\s*✓\s*—\s*\*(.+?)\*\s*$/);
	if (correctMatch) {
		return { text: correctMatch[1].trim(), feedbackMd: correctMatch[2].trim(), correct: true };
	}
	const sep = body.indexOf(" — *");
	if (sep < 0) throw new Error(`${where}: opcja bez feedbacku w kursywie: "${body.slice(0, 60)}"`);
	const text = body.slice(0, sep).trim();
	let rest = body.slice(sep + 4).trim();
	let diagnosis: string | undefined;
	const diag = rest.match(/\(diagnoza:\s*(.+)\)\s*$/);
	if (diag) {
		diagnosis = diag[1].trim();
		rest = rest.slice(0, diag.index).trim();
	}
	if (!rest.endsWith("*"))
		throw new Error(`${where}: feedback bez domknięcia kursywy: "${rest.slice(-40)}"`);
	const feedbackMd = rest.slice(0, -1).trim();
	if (text.includes("✓") || text.startsWith("**")) {
		throw new Error(`${where}: nierozpoznany wariant opcji poprawnej: "${body.slice(0, 60)}"`);
	}
	return { text, feedbackMd, diagnosis, correct: false };
}

function parseQuestions(section: string, where: string): ParsedAtom["questions"] {
	const blocks = section.split(/^\*\*P(?=\d\.)/m).slice(1);
	return blocks.map((block, qi) => {
		const stemMatch = block.match(/^(\d)\.\s*([\s\S]*?)\*\*/);
		if (!stemMatch) throw new Error(`${where} P${qi + 1}: nie znalazłem stemu`);
		if (Number(stemMatch[1]) !== qi + 1) {
			throw new Error(`${where}: numeracja pytań nieciągła przy P${stemMatch[1]}`);
		}
		const stem = unwrap(stemMatch[2]);
		const optionsPart = block.slice((stemMatch.index ?? 0) + stemMatch[0].length);
		const optionChunks = optionsPart.split(/^- (?=[A-D]\.)/m).slice(1);
		if (optionChunks.length !== 4) {
			throw new Error(`${where} P${qi + 1}: ${optionChunks.length} opcji (oczekiwane 4)`);
		}
		const options = optionChunks.map((chunk) => parseOption(chunk, `${where} P${qi + 1}`));
		if (options.filter((o) => o.correct).length !== 1) {
			throw new Error(`${where} P${qi + 1}: liczba poprawnych ≠ 1`);
		}
		return { stem, options };
	});
}

function parseHints(section: string, where: string): string[] {
	const items = section.split(/^\d\.\s+/m).slice(1);
	if (items.length !== 3)
		throw new Error(`${where}: drabinka ma ${items.length} stopni (oczekiwane 3)`);
	return items.map((i) => unwrapPreservingCode(i));
}

function parseAtoms(markdown: string, where: string): ParsedAtom[] {
	const chunks = markdown.split(/^## /m).filter((c) => c.startsWith("Atom "));
	return chunks.map((chunk) => {
		const headerMatch = chunk.match(/^Atom ([A-Z0-9.]+) — (.+)$/m);
		if (!headerMatch)
			throw new Error(`${where}: nagłówek atomu nieparsowalny: "${chunk.slice(0, 60)}"`);
		const code = headerMatch[1];
		// Cudzysłowy dekoracyjne tytułu: „…" (otwierający U+201E, zamykający bywa
		// ASCII) — zdejmowane w całości; cudzysłowy wewnątrz treści nietknięte.
		const title = headerMatch[2].replace(/[„"”]/g, "").trim();
		const atomWhere = `${where} ${code}`;

		const metaMatch = chunk.match(/^\*\*Typ:\*\*[\s\S]*?(?=\n\n)/m);
		if (!metaMatch) throw new Error(`${atomWhere}: brak meta-linii **Typ:**`);
		const meta = metaMatch[0];
		const kind = meta.match(/\*\*Typ:\*\*\s+`(\w+)`/)?.[1];
		if (!kind) throw new Error(`${atomWhere}: meta bez kind`);
		const estimated = meta.match(/\*\*Czas studenta:\*\*\s+~?([^·\n]+)/)?.[1].trim() ?? null;
		const uiVerifiedAt = meta.match(/\*\*UI zweryfikowano:\*\*\s+(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
		const conceptSlugs = [...meta.matchAll(/`([a-z][a-z0-9-]*-[a-z0-9-]+)`(\s*\(KLUCZOWY\))?/g)]
			.filter((m) => !["single_choice", "multi_choice"].includes(m[1]))
			.map((m) => ({ slug: m[1], key: Boolean(m[2]) }));

		const sections = chunk.split(/^### /m).slice(1);
		const contentParts: string[] = [];
		let questions: ParsedAtom["questions"] = [];
		let hints: string[] = [];
		for (const section of sections) {
			const nl = section.indexOf("\n");
			const heading = section.slice(0, nl).trim();
			const body = section
				.slice(nl + 1)
				.replace(/\n---\s*$/, "")
				.trimEnd();
			if (heading.startsWith("Pytania")) {
				questions = parseQuestions(body, atomWhere);
			} else if (heading.startsWith("Drabinka hintów")) {
				hints = parseHints(body, atomWhere);
			} else {
				contentParts.push(`### ${heading}\n${body}`);
			}
		}
		if (contentParts.length === 0) throw new Error(`${atomWhere}: pusta treść`);
		return {
			code,
			title,
			kind,
			estimated,
			uiVerifiedAt,
			conceptSlugs,
			contentMd: contentParts.join("\n\n").trim(),
			questions,
			hints,
		};
	});
}

function parseResources(markdown: string, where: string): AtomResourceInput[] {
	const section = markdown.match(/^## Zasoby opcjonalne modułu[\s\S]*?(?=\n## |\n---)/m);
	if (!section) return [];
	const rows = section[0].split("\n").filter((l) => l.startsWith("| http"));
	return rows.map((row) => {
		const cells = row
			.split("|")
			.map((c) => c.trim())
			.filter(Boolean);
		if (cells.length !== 7)
			throw new Error(`${where}: wiersz zasobu ma ${cells.length} kolumn (oczekiwane 7)`);
		const [url, label, functionCell, license, languageRaw, registration, verifiedRaw] = cells;
		const fn = functionCell.toLowerCase();
		const type = fn.includes("wideo") ? "video" : fn.includes("kurs") ? "course" : "docs";
		const language = languageRaw.replace(/\*/g, "").split(" ")[0];
		const verifiedAt = verifiedRaw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
		return {
			title: label.replace(/[„"”]/g, ""),
			url,
			type,
			license,
			language,
			registrationRequired: registration.toLowerCase().startsWith("tak"),
			verifiedAt,
			notes: `${functionCell}${verifiedRaw.includes("(") ? ` · ${verifiedRaw}` : ""}`,
		};
	});
}

function packModule(manifest: ModuleManifest): AtomModuleContent {
	const markdown = readFileSync(join(CURATION_DIR, manifest.sourceFile), "utf8");
	const where = manifest.sourceFile;
	const atoms = parseAtoms(markdown, where);
	const resources = parseResources(markdown, where);

	const items: AtomItemInput[] = atoms.map((atom, index) => {
		const override = manifest.overrides?.[atom.code] ?? {};
		const kind = override.kind ?? atom.kind;
		const title = override.title ?? atom.title;
		const conceptDefs = override.concepts ?? atom.conceptSlugs;
		const concepts = conceptDefs.map((c) => {
			const name = manifest.conceptNames[c.slug];
			if (!name)
				throw new Error(`${where} ${atom.code}: koncept "${c.slug}" bez nazwy w manifeście`);
			return { slug: c.slug, name, ...(c.key ? { key: true } : {}) };
		});
		if (concepts.length === 0) throw new Error(`${where} ${atom.code}: atom bez konceptów`);
		const primaryConcept = concepts[0].slug;

		const ref = refFromCode(atom.code);
		const questions: AtomQuestionInput[] = atom.questions.map((q, qi) => ({
			ref: `${ref}-p${qi + 1}`,
			conceptSlug: primaryConcept,
			difficulty: 1,
			type: "single_choice",
			stem: q.stem,
			options: q.options.map((o) => o.text),
			answer: { correct: q.options.findIndex((o) => o.correct) },
			explanationMd: q.options.find((o) => o.correct)?.feedbackMd ?? "",
			optionFeedback: q.options.map((o) => ({
				feedbackMd: o.feedbackMd,
				...(o.diagnosis ? { diagnosis: o.diagnosis } : {}),
			})),
		}));

		const config: Record<string, unknown> = {};
		if (atom.estimated) config.estimated = atom.estimated;
		if (atom.uiVerifiedAt) config.uiVerifiedAt = atom.uiVerifiedAt;
		if (override.checks) config.checks = override.checks;

		return {
			slug: ref,
			position: (index + 1) * 10,
			kind,
			title,
			contentMd: atom.contentMd,
			concepts,
			...(questions.length > 0 ? { questions } : {}),
			...(atom.hints.length > 0 ? { hints: atom.hints } : {}),
			...(Object.keys(config).length > 0 ? { config } : {}),
			// Zasoby modułowe przy pierwszym atomie (poziom pozycji = kuracja 1E.5).
			...(index === 0 && resources.length > 0 ? { resources } : {}),
		};
	});

	if (manifest.przeglad) {
		items.push({
			slug: `${refFromCode(atoms[0].code).split("-")[0]}-przeglad`,
			position: (atoms.length + 1) * 10 + 10,
			kind: "exercise",
			title: "Przegląd przed egzaminem",
			contentMd:
				"Zestaw powtórkowy przed egzaminem modułu (D6.3 — spacing): pytania z wcześniejszych " +
				"atomów, także z poprzednich modułów. Zaliczenie pozycji: wszystkie odpowiedzi poprawne " +
				"(nielimitowane próby, feedback natychmiast).",
			questionRefs: manifest.przeglad.refs.map(refFromCode),
		});
	}

	return { moduleSlug: manifest.moduleSlug, items };
}

function main(): void {
	mkdirSync(OUT_DIR, { recursive: true });
	for (const manifest of MANIFESTS) {
		const content = packModule(manifest);
		const outPath = join(OUT_DIR, `${manifest.moduleSlug}.json`);
		writeFileSync(outPath, `${JSON.stringify(content, null, "\t")}\n`);
		const questions = content.items.reduce((n, i) => n + (i.questions?.length ?? 0), 0);
		console.log(
			`✅ ${manifest.moduleSlug}: pozycje=${content.items.length}, pytania=${questions} → ${outPath}`,
		);
	}
	// Format kanoniczny = Biome (lint bramkuje te pliki; determinizm testu
	// kontraktowego porównuje wynik packera z commitowanym stanem).
	execFileSync("pnpm", ["exec", "biome", "format", "--write", OUT_DIR], { stdio: "pipe" });
}

const isDirectRun =
	typeof process.argv[1] === "string" && process.argv[1].includes("pack-curriculum-atoms");
if (isDirectRun) {
	main();
}
