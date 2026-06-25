/**
 * etl-justjoinit — narzędzie ETL (ekstrakcja-transformacja-ładowanie) realnego
 * rynku pracy IT z dwóch plików CSV JustJoinIT (zrzut luty 2026, analiza Darka).
 *
 * Partia 3, zadanie #11 (Max, backend executor). Liczy, które kompetencje są
 * realnie wymagane na każdej ścieżce kariery i z jakim popytem. Produkuje
 * deterministyczny artefakt JSON, który seed (src/lib/db/seed.ts) ładuje do tabeli
 * `job_market_data` zamiast 9 wierszy demo.
 *
 * MODEL GRUPOWANIA — „przypisanie do najbliższego profilu kompetencji" (nearest
 * profile), decyzja #11 z analizy Darka. Zamiast mapować surową `Kategoria` →
 * ścieżka, grupujemy oferty wg profilu kompetencji:
 *   1. Normalizacja tytułu `Stanowisko` (usuń seniority/nawiasy, ujednolić).
 *   2. Kotwice = top-30 znormalizowanych tytułów wg liczby ofert (konfigurowalne
 *      w src/lib/db/data/anchor-config.ts — placeholder = surowe top-30).
 *   3. Profil kotwicy = jej top-12 kompetencji (wg częstości wśród ofert tytułu).
 *   4. Przypisanie: każda oczyszczona oferta → kotwica o największym pokryciu
 *      profilu (|kompetencje_oferty ∩ profil12|). Tie-break: większa kotwica
 *      wygrywa; dalej alfabetycznie. Pokrycie 0 → oferta NIEPRZYPISANA (pomijana).
 *   5. Agregacja per ścieżka z PRZYPISANYCH ofert (nie tylko z dokładnego tytułu!).
 *
 * CO ROBI (krok po kroku):
 *   1. Czyta JustJoinIT_Oferty.csv + JustJoinIT_Technologie.csv (separator ";",
 *      BOM utf-8-sig, CRLF). Złączenie po `Slug`.
 *   2. Czyści oferty wzorem notebooka Darka (175735_lab1.ipynb): Pełny etat;
 *      filtr geo PL/zdalne; umowa B2B/PERMANENT/ANY; dedup po Slug.
 *      (v5: widełki NIE są już czytane — decyzja Darka „salary precz".)
 *   3. Grupuje nearest-profile + hierarchia obszar→liść (v4) + warstwa produktu v5
 *      (rodziny e-CF, ramy SFIA/ESCO, warstwa juniora, bank projektów).
 *   4. Agreguje per ścieżka: demand% obszarów i liści (bez progu dla liści), BEZ widełek.
 *   5. Zapisuje DWA artefakty: job-market-justjoinit.json (płaski, do jobMarketData)
 *      + career-model.json (hierarchia + ramy + projekty, config dla aplikacji).
 *
 * DETERMINIZM: zero new Date() w danych (snapshot "2026-02"), sortowanie stabilne,
 * zero losowości → dwa przebiegi = bajt-w-bajt identyczny artefakt.
 *
 * BEZPIECZEŃSTWO: narzędzie NIE dotyka bazy — tylko czyta CSV i pisze JSON.
 * Surowe CSV NIE trafiają do repo (poza nim, na dysku Darka).
 *
 * UŻYCIE:
 *   pnpm exec tsx tools/etl-justjoinit.ts
 *   JJIT_CSV_DIR="/inna/sciezka" pnpm exec tsx tools/etl-justjoinit.ts
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	ANCHOR_COUNT,
	ANCHOR_DISPLAY_NAMES,
	ANCHOR_MERGES,
	ANCHOR_TITLES_PLACEHOLDER,
	MANUAL_ANCHORS,
	PROFILE_SIZE,
	TIE_BREAK_DEPRIORITIZED,
} from "../src/lib/db/data/anchor-config";
import { FAMILIES, PATH_META, PATHS, PROJECT_BANK } from "../src/lib/db/data/career-model";

// ── Stałe pipeline'u (wzorem notebooka Darka) ───────────────────────────────

const DEFAULT_CSV_DIR = "/mnt/c/Users/D/Documents/WSB MERITO/25_26/Semestr 4/AI/";
const SNAPSHOT = "2026-02"; // zrzut JustJoinIT — wpisane na stałe (determinizm)
const SOURCE = "JustJoinIT";

const WANTED_CONTRACTS = new Set(["B2B", "PERMANENT", "ANY"]);

// Normalizacja nazw miast (notebook, cell 26) — warianty pisowni → forma kanoniczna.
const MIASTO_MAPPING: Record<string, string> = {
	Warsaw: "Warszawa",
	"Warszawa (Mazowieckie)": "Warszawa",
	warsaw: "Warszawa",
	WARSAW: "Warszawa",
	"Warsaw Warsaw": "Warszawa",
	Cracow: "Kraków",
	Krakow: "Kraków",
	Kracow: "Kraków",
	"Kraków (Małopolskie)": "Kraków",
	Gdansk: "Gdańsk",
	"Gdańsk (Pomorskie)": "Gdańsk",
	Gydnia: "Gdynia",
	"Wroclaw (Dolnośląskie)": "Wrocław",
	Poznan: "Poznań",
};

// Lista polskich miast (notebook, cell 27). Oferta z miastem spoza listy ORAZ
// trybem innym niż "Zdalnie" jest odrzucana (filtr geo).
const POLSKIE_MIASTA = new Set<string>([
	"Warszawa",
	"Kraków",
	"Wrocław",
	"Gdańsk",
	"Katowice",
	"Poznań",
	"Łódź",
	"Białystok",
	"Gdynia",
	"Gliwice",
	"Szczecin",
	"Lublin",
	"Opole",
	"Rzeszów",
	"Bydgoszcz",
	"Toruń",
	"Olsztyn",
	"Kielce",
	"Zielona Góra",
	"Radom",
	"Częstochowa",
	"Sopot",
	"Legnica",
	"Poland (Remote)",
	"Balice",
	"Suwałki",
	"Jelenia Góra",
	"Polska (Zdalnie)",
	"Mikołów",
	"Bielsko-Biała",
	"Kozy",
	"Polkowice",
	"Głuchowo",
	"Kobielice",
	"Ostrołęka",
	"Nowy Tomyśl",
	"Piła",
	"Komorniki",
	"Niegardów",
	"Stare Miasto k/Konina (PL)",
	"Piaseczno",
	"Bolechowo-Osiedle",
	"Rybnik",
	"Macierzysz",
	"Pabianice",
	"Łazy",
	"Starogard Gdański",
	"Pieńków",
	"Płock",
	"Złotniki",
	"Zambrów",
	"Września",
	"Zabrze",
	"Koszalin",
	"Lesznowola",
	"Pruszcz Gdański",
	"Nowa Sól",
	"Kostrzyn",
	"Mielec",
	"Tarnowskie Góry",
	"Stęszew",
	"Nysa",
	"Zabierzów",
	"Świerklaniec",
	"Zielonka",
	"Jankowice",
	"Jawor",
	"Zduńska Wola",
	"Zawiercie",
	"Ryki",
	"Palmiry",
	"Brześć Kujawski",
	"Sieroniowice",
	"Ożarów Mazowiecki",
	"Mysłowice",
	"Tychy",
	"Konstancin-Jeziorna",
	"Topole",
	"Wieliczka",
	"Chorzów",
	"Ostaszew",
	"Cieplewo",
	"Wałbrzych",
	"Mszczonów",
	"Swadzim",
	"Bytom",
	"Janki",
	"Ostaszewo",
	"Prandocin-Iły",
]);

// ── Typy ─────────────────────────────────────────────────────────────────────

/** Oferta po czyszczeniu (jeden unikalny Slug). v5: bez widełek (decyzja Darka). */
export type CleanOffer = {
	slug: string;
	stanowisko: string;
	normTitle: string; // znormalizowany tytuł (do kotwic automatycznych)
	kategoria: string; // surowa Kategoria JustJoinIT (do kotwic ręcznych)
	techs: Set<string>; // technologie oferty (złączenie po Slug)
};

// ── Kontrakt PŁASKIEGO artefaktu jobMarketData (bez zmiany schemy) ──
// Zawiera liście-konkrety z REALNYM % (z hierarchii career-model). Liście nieobecne
// w zrzucie (% null) NIE trafiają tu (kolumna demand_percentage jest NOT NULL) —
// żyją tylko w career-model.json. v4: bez progu 5%/10. v5: BEZ salaryRange
// (kolumna salary_range zostaje NULL w bazie — decyzja Darka, bez migracji schemy).
export type CompetencyRow = {
	name: string;
	demandPercentage: number;
	category: string;
};
export type CareerGoalEntry = {
	careerGoal: string;
	category: string; // rodzina e-CF ścieżki (v5)
	studentSelectable: boolean; // v4: zawsze true (koniec ramki junior/senior)
	competencies: CompetencyRow[];
};
export type Artifact = {
	_meta: {
		source: string;
		snapshot: string;
		model: string;
		rawOffers: number;
		cleanedOffers: number;
		assignedOffers: number;
		coveragePercent: number;
		autoAnchors: number;
		manualAnchors: number;
		anchors: number;
		profileSize: number;
		paths: number;
		note: string;
	};
	data: CareerGoalEntry[];
};

// ── Kontrakt HIERARCHICZNEGO artefaktu career-model.json (v4.0) ──
// Hierarchia obszar→liść z % na każdym poziomie + bank projektów + typy węzłów.
// Konsumowany przez kod aplikacji; NIE wchodzi do tabeli jobMarketData (schema
// nietknięta — czerwona linia). Patrz docs/data/job-market-provenance.md.
export type ModelLeaf = {
	name: string;
	type: "leaf";
	demandPercentage: number | null; // null = brak w zrzucie 2026-02
	source: "dane" | "kuracja ekspercka";
	note?: string; // np. „brak w zrzucie 2026-02"
};
export type ModelArea = {
	name: string;
	type: "knowledge-area" | "presentation-group";
	// knowledge-area: % popytu ścieżki (z danych). presentation-group: null (etykieta).
	demandPercentage: number | null;
	leaves: ModelLeaf[];
};
export type ModelProject = {
	level: "latwy" | "sredni" | "zaawansowany"; // v5: drabina junior→senior
	title: string;
	anchorLeaves: string[];
	description: string;
	portfolioOutcome: string;
	marketRationale?: string; // v5: „dlaczego te liście" (popyt rynkowy)
	todo?: boolean;
};
// Ramy kompetencyjne ścieżki (v5, Sophia §3). Dziedziczone ze ścieżki dokumentu.
export type ModelFrameworks = {
	family: string; // 1 z 5 rodzin e-CF
	eCfArea: string; // procesy e-CF (PLAN/BUILD/RUN/ENABLE/MANAGE)
	sfiaCategory: string;
	iscoCode: string;
	iscoLabel: string;
	escoOccupation: string;
};
export type ModelPath = {
	careerGoal: string;
	category: string; // = family (rodzina e-CF) — spójne z flat artifact
	pathDemandOffers: number; // liczba ofert przypisanych do ścieżki (mianownik %)
	frameworks: ModelFrameworks; // v5: e-CF/SFIA/ESCO-ISCO
	juniorFriendliness: string; // v5: Wysoka/Średnia/Niska/rola docelowa
	targetRole: boolean; // v5: rola docelowa (widoczna, nie punkt startu)
	tShapePairs: string[]; // v5: ścieżki łączone T-shape
	note?: string;
	areas: ModelArea[];
	projects: ModelProject[];
};
export type CareerModel = {
	_meta: {
		source: string;
		snapshot: string;
		model: string;
		note: string;
		families: Array<{ id: string; name: string; eCfArea: string }>;
		paths: number;
		leafThreshold: string;
	};
	paths: ModelPath[];
};

// ── Parser CSV (czysty TS, bez zależności) ───────────────────────────────────

/**
 * Parsuje CSV odporny na cudzysłowy i separatory wewnątrz pól. Obsługuje:
 *   - separator dowolny (tu ";"),
 *   - pola w cudzysłowach z escapowaniem "" → ",
 *   - końce linii CRLF i LF,
 *   - BOM (utf-8-sig) zdejmowany przez wywołującego (readCsv).
 * Zwraca tablicę obiektów keyed po nagłówku (pierwszy wiersz).
 */
export function parseCsv(text: string, delimiter = ";"): Record<string, string>[] {
	const rows: string[][] = [];
	let field = "";
	let record: string[] = [];
	let inQuotes = false;
	let i = 0;
	const n = text.length;

	const pushField = () => {
		record.push(field);
		field = "";
	};
	const pushRecord = () => {
		pushField();
		rows.push(record);
		record = [];
	};

	while (i < n) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			field += ch;
			i++;
			continue;
		}
		if (ch === '"') {
			inQuotes = true;
			i++;
			continue;
		}
		if (ch === delimiter) {
			pushField();
			i++;
			continue;
		}
		if (ch === "\r") {
			// CRLF — pochłoń \r, \n obsłuży następna iteracja.
			i++;
			continue;
		}
		if (ch === "\n") {
			pushRecord();
			i++;
			continue;
		}
		field += ch;
		i++;
	}
	// Ostatnie pole/rekord, jeśli plik nie kończy się nową linią.
	if (field.length > 0 || record.length > 0) {
		pushRecord();
	}

	if (rows.length === 0) return [];
	const header = rows[0];
	const out: Record<string, string>[] = [];
	for (let r = 1; r < rows.length; r++) {
		const cells = rows[r];
		// Pomiń całkowicie puste linie (np. trailing newline).
		if (cells.length === 1 && cells[0] === "") continue;
		const obj: Record<string, string> = {};
		for (let c = 0; c < header.length; c++) {
			obj[header[c]] = cells[c] ?? "";
		}
		out.push(obj);
	}
	return out;
}

/** Czyta plik CSV, zdejmuje BOM (utf-8-sig), parsuje. */
function readCsv(path: string, delimiter = ";"): Record<string, string>[] {
	let text = readFileSync(path, "utf-8");
	if (text.charCodeAt(0) === 0xfeff) {
		text = text.slice(1); // zdejmij BOM
	}
	return parseCsv(text, delimiter);
}

// ── Normalizacja tytułu (model nearest-profile) ──────────────────────────────

// Tokeny seniority/poziomu usuwane z tytułu (spec #11).
const SENIORITY_RE =
	/\b(senior|sr|junior|jr|mid|middle|regular|principal|staff|chief|expert|intern|trainee|graduate|associate|lead|ii|iii|iv)\b/g;
// Nawiasy i ich zawartość: "(m/f/n)", "(AppSec)" itd.
const PAREN_RE = /\([^)]*\)/g;
// Zostaw litery PL, cyfry oraz + . - / i spację; resztę zamień na spację.
const KEEP_RE = /[^a-ząćęłńóśźż0-9+./\- ]/g;

/**
 * Normalizuje tytuł stanowiska do postaci porównywalnej (spec #11):
 * lowercase → usuń nawiasy → ujednolić fullstack → usuń tokeny seniority →
 * zostaw dozwolone znaki → collapse spacji.
 */
export function normalizeTitle(stanowisko: string): string {
	let s = stanowisko.toLowerCase();
	s = s.replace(PAREN_RE, " ");
	s = s.replace(/fullstack/g, "full-stack").replace(/full stack/g, "full-stack");
	s = s.replace(SENIORITY_RE, " ");
	s = s.replace(KEEP_RE, " ");
	s = s.replace(/\s+/g, " ").trim();
	return s;
}

/** Title Case ze znormalizowanego tytułu, z poprawką na łączniki ("full-stack" → "Full-Stack"). */
function titleCase(norm: string): string {
	return norm
		.split(" ")
		.map((word) =>
			word
				.split("-")
				.map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
				.join("-"),
		)
		.join(" ");
}

/** Ładna nazwa ścieżki: wpis z ANCHOR_DISPLAY_NAMES albo Title Case. */
export function displayName(norm: string): string {
	return ANCHOR_DISPLAY_NAMES[norm] ?? titleCase(norm);
}

/** Rozwiązuje scalenie kotwicy (ANCHOR_MERGES), domyślnie zwraca sam tytuł. */
function resolveMerge(norm: string): string {
	return ANCHOR_MERGES[norm] ?? norm;
}

// ── Czyszczenie ofert (wzorem notebooka) ─────────────────────────────────────

/** Normalizuje miasto wg słownika; nieznane zwraca bez zmian. */
export function normalizeCity(miasto: string): string {
	return MIASTO_MAPPING[miasto] ?? miasto;
}

/** Filtr geo: miasto PL (po normalizacji) LUB praca zdalna. */
export function passesGeoFilter(miasto: string, tryb: string): boolean {
	return POLSKIE_MIASTA.has(normalizeCity(miasto)) || tryb === "Zdalnie";
}

/**
 * Czyści surowe wiersze ofert + złącza technologie po Slug → unikalne oferty.
 * Czystość zgodna z notebookiem; dedup po Slug (pierwsze wystąpienie wygrywa).
 */
export function cleanOffers(
	rawRows: Record<string, string>[],
	techBySlug: Map<string, Set<string>>,
): { offers: Map<string, CleanOffer>; rawCount: number } {
	const offers = new Map<string, CleanOffer>();
	for (const row of rawRows) {
		if (row.Wymiar !== "Pełny etat") continue;
		if (!WANTED_CONTRACTS.has(row.Typ_umowy)) continue;
		if (!passesGeoFilter(row.Miasto ?? "", row.Tryb_pracy ?? "")) continue;
		// v5: widełki NIE są już czytane ani filtrowane (decyzja Darka — salary precz).
		// Filtr realności widełek 4000–100000 PLN był potrzebny tylko do liczenia
		// median; bez salary na wyjściu nie ma już znaczenia (nie wpływał na % popytu).

		const slug = row.Slug ?? "";
		if (slug === "") continue;
		if (offers.has(slug)) continue; // dedup po Slug (stabilne)
		const stanowisko = row.Stanowisko ?? "";
		offers.set(slug, {
			slug,
			stanowisko,
			normTitle: normalizeTitle(stanowisko),
			kategoria: row.Kategoria ?? "",
			techs: techBySlug.get(slug) ?? new Set<string>(),
		});
	}
	return { offers, rawCount: rawRows.length };
}

// ── Kotwice + profile + przypisanie (model nearest-profile) ──────────────────

/** Liczy częstość technologii wśród zadanego zbioru ofert (stabilny licznik). */
function techCounts(list: CleanOffer[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const offer of list) {
		for (const tech of offer.techs) {
			counts.set(tech, (counts.get(tech) ?? 0) + 1);
		}
	}
	return counts;
}

/** Top-K technologii z mapy liczników (malejąco po liczniku, dalej alfabetycznie). */
function topTechs(counts: Map<string, number>, k: number): string[] {
	return [...counts.entries()]
		.sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "en")))
		.slice(0, k)
		.map(([t]) => t);
}

export type Anchor = {
	norm: string; // znormalizowany identyfikator (po scaleniu — klucz ścieżki)
	display: string; // ładna nazwa wyświetlana
	size: number; // liczba ofert źródłowych kotwicy
	profile: Set<string>; // top-PROFILE_SIZE kompetencji
	// true = deprytetyzowana w tie-breaku (anty-magnes). To NIE jest ukrycie z wyboru
	// studenta — v4.0 (dyrektywa 3) wszystkie ścieżki są widoczne.
	deprioritized: boolean;
	manual: boolean; // true = kotwica ręczna spoza top-30 (źródłowana po Kategoria)
};

/** Czy kotwica jest deprytetyzowana w tie-breaku przypisania (anty-magnes). */
function isDeprioritized(norm: string): boolean {
	return TIE_BREAK_DEPRIORITIZED.has(norm);
}

/**
 * Wyznacza kotwice: automatyczne (top-30 znormalizowanych tytułów po scaleniach)
 * + ręczne (MANUAL_ANCHORS — źródłowane po `Kategoria` JustJoinIT, nie po tytule).
 * Profil = top-PROFILE_SIZE kompetencji ze zbioru ofert kotwicy.
 *
 * Kotwica ręczna o tym samym kluczu co automatyczna NIE jest dublowana — ręczna
 * (szerszy zbiór po kategorii) wygrywa. W praktyce ręczne klucze (ux/ui designer,
 * cybersecurity specialist) nie kolidują z top-30.
 */
export function buildAnchors(offers: Map<string, CleanOffer>): Anchor[] {
	// 1) Policz SUROWE znormalizowane tytuły (PRZED scaleniem) i wybierz top-30 —
	//    to definicja kotwic wg kuracji Sophii: „top-30 tytułów". Scalenia stosujemy
	//    DOPIERO do tej wybranej trzydziestki (kilka tytułów → jedna ścieżka), nie
	//    do całej długiej listy (inaczej top-30 sięgałoby głębiej w ogon i wpuszczało
	//    tytuły, których Sophia nie skuratorowała — np. React Native / iOS / Platform).
	const rawCounts = new Map<string, number>();
	for (const offer of offers.values()) {
		if (offer.normTitle === "") continue;
		rawCounts.set(offer.normTitle, (rawCounts.get(offer.normTitle) ?? 0) + 1);
	}

	let rawTop: string[];
	if (ANCHOR_TITLES_PLACEHOLDER.length > 0) {
		// Kuracja jawna: dokładnie te surowe tytuły, które istnieją w danych.
		rawTop = ANCHOR_TITLES_PLACEHOLDER.filter((t) => rawCounts.has(t));
	} else {
		rawTop = [...rawCounts.entries()]
			.sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0], "en")))
			.slice(0, ANCHOR_COUNT)
			.map(([t]) => t);
	}
	const rawTopSet = new Set(rawTop);

	// Pogrupuj oferty z top-30 tytułów po KLUCZU PO SCALENIU (ścieżka produktowa).
	const byKey = new Map<string, CleanOffer[]>();
	for (const offer of offers.values()) {
		if (!rawTopSet.has(offer.normTitle)) continue;
		const key = resolveMerge(offer.normTitle);
		const list = byKey.get(key);
		if (list) list.push(offer);
		else byKey.set(key, [offer]);
	}

	const manualKeys = new Set(MANUAL_ANCHORS.map((m) => m.key));
	const anchors: Anchor[] = [];

	// Automatyczne (pomijamy te, które są też ręczne — ręczna wersja je zastąpi).
	for (const [norm, list] of byKey) {
		if (manualKeys.has(norm)) continue;
		anchors.push({
			norm,
			display: displayName(norm),
			size: list.length,
			profile: new Set(topTechs(techCounts(list), PROFILE_SIZE)),
			deprioritized: isDeprioritized(norm),
			manual: false,
		});
	}

	// 2) Ręczne: oferty wybrane po `Kategoria` (nie po tytule).
	for (const { key, category } of MANUAL_ANCHORS) {
		const list = [...offers.values()].filter((o) => o.kategoria === category);
		if (list.length === 0) continue;
		anchors.push({
			norm: key,
			display: displayName(key),
			size: list.length,
			profile: new Set(topTechs(techCounts(list), PROFILE_SIZE)),
			deprioritized: isDeprioritized(key),
			manual: true,
		});
	}

	// Stała kolejność kotwic: malejąco po rozmiarze, dalej alfabetycznie po norm.
	// (Sama kolejność iteracji nie wpływa na wynik — tie-break w assignToAnchor jest
	// pełny — ale stabilna kolejność ułatwia czytanie i determinizm wyjścia.)
	anchors.sort((a, b) =>
		b.size !== a.size ? b.size - a.size : a.norm.localeCompare(b.norm, "en"),
	);
	return anchors;
}

/**
 * Przypisuje ofertę do kotwicy o największym pokryciu profilu. Tie-break v2
 * (kuracja Sophii — anty-„magnes"): przy RÓWNYM pokryciu wygrywa kotwica:
 *   1. WYBIERALNA przed zdegradowaną (ścieżka studencka bije generyczną
 *      Software Engineer / Solution Architect / Engineering Manager),
 *   2. MNIEJSZA przed większą (bardziej specyficzna — wprost zmniejsza magnes),
 *   3. norm alfabetycznie (pełen determinizm).
 *
 * Powód korekty (Sophia): samo „mniejsza wygrywa" (literalna instrukcja) robi
 * z małych-generycznych zdegradowanych kotwic NOWY magnes (Engineering Manager
 * łapał 816 ofert). Deprytetyzacja zdegradowanych w 1. kluczu to naprawia,
 * zachowując intencję „specyficzna/mniejsza wygrywa". (Szczegóły: prowenicja §5.)
 *
 * Pokrycie 0 (zero wspólnych kompetencji) → null (oferta nieprzypisana).
 */
export function assignToAnchor(offer: CleanOffer, anchors: Anchor[]): Anchor | null {
	let best: Anchor | null = null;
	let bestOverlap = 0;
	for (const anchor of anchors) {
		let overlap = 0;
		for (const tech of offer.techs) {
			if (anchor.profile.has(tech)) overlap++;
		}
		if (overlap === 0) continue;
		if (best === null || overlap > bestOverlap) {
			best = anchor;
			bestOverlap = overlap;
			continue;
		}
		if (overlap === bestOverlap && tieBreakPrefers(anchor, best)) {
			best = anchor;
		}
	}
	return best;
}

/** Czy `candidate` wygrywa remis z `current` (porządek: nie-deprytetyzowana → mniejsza → alfabet). */
function tieBreakPrefers(candidate: Anchor, current: Anchor): boolean {
	// 1) nie-deprytetyzowana (specyficzna) przed deprytetyzowaną (generyczną/szeroką)
	if (candidate.deprioritized !== current.deprioritized) return !candidate.deprioritized;
	// 2) mniejsza przed większą
	if (candidate.size !== current.size) return candidate.size < current.size;
	// 3) alfabetycznie po norm
	return candidate.norm < current.norm;
}

// ── Agregacja per ścieżka (z PRZYPISANYCH ofert) ─────────────────────────────

export type Assignment = {
	anchors: Anchor[];
	byAnchor: Map<string, CleanOffer[]>;
	assigned: number;
};

/** Przypisuje wszystkie oferty do kotwic (nearest-profile). */
export function assignAll(offers: Map<string, CleanOffer>, anchors: Anchor[]): Assignment {
	const byAnchor = new Map<string, CleanOffer[]>();
	for (const a of anchors) byAnchor.set(a.norm, []);
	let assigned = 0;
	for (const offer of offers.values()) {
		const anchor = assignToAnchor(offer, anchors);
		if (!anchor) continue; // pokrycie 0 → nieprzypisana, pomijana
		byAnchor.get(anchor.norm)?.push(offer);
		assigned++;
	}
	return { anchors, byAnchor, assigned };
}

// ── Statystyki per ścieżka (do liczenia % obszarów i liści) ──────────────────

export type PathStat = {
	display: string;
	offerCount: number; // mianownik % (oferty przypisane do ścieżki)
	techCount: Map<string, number>; // technologia → liczba ofert ścieżki z nią
};

/**
 * Liczy per ścieżkę: liczbę ofert + licznik ofert z każdą technologią.
 *
 * Dobór zbioru ofert (mianownik %):
 *  - kotwica AUTOMATYCZNA → oferty PRZYPISANE nearest-profile (assignment.byAnchor),
 *  - kotwica RĘCZNA (UX/Security) → oferty z jej KATEGORII JustJoinIT (definicja
 *    segmentu), nie podzbiór nearest-profile. Powód: ręczna kotwica reprezentuje
 *    cały segment (np. 329 ofert Security), a jej kompetencje powinny odzwierciedlać
 *    ten segment — inaczej rzadkie, ale charakterystyczne narzędzia (Splunk, Burp)
 *    znikają w podzbiorze profilowym.
 */
export function pathStats(
	assignment: Assignment,
	allOffers: Map<string, CleanOffer>,
): Map<string, PathStat> {
	const manualCategory = new Map(MANUAL_ANCHORS.map((m) => [m.key, m.category]));
	const offersByCategory = new Map<string, CleanOffer[]>();
	for (const offer of allOffers.values()) {
		const list = offersByCategory.get(offer.kategoria);
		if (list) list.push(offer);
		else offersByCategory.set(offer.kategoria, [offer]);
	}

	const stats = new Map<string, PathStat>();
	for (const anchor of assignment.anchors) {
		const category = manualCategory.get(anchor.norm);
		const list = category
			? (offersByCategory.get(category) ?? [])
			: (assignment.byAnchor.get(anchor.norm) ?? []);
		if (list.length === 0) continue;
		stats.set(anchor.display, {
			display: anchor.display,
			offerCount: list.length,
			techCount: techCounts(list),
		});
	}
	return stats;
}

/**
 * % popytu ścieżki na technologię(-e). Sumuje liczniki wariantów (np. Kafka +
 * Apache Kafka), dzieli przez liczbę ofert ścieżki. null gdy 0 ofert.
 * @param decimals 0 dla obszarów (duży %), 1 dla liści (rzadkie narzędzia jak
 *   Burp Suite 0,3% — zaokrąglenie do liczby całkowitej zżerałoby sygnał, a
 *   dyrektywa 1 chce % przy KAŻDYM narzędziu, więc liście dostają jedno miejsce po przecinku).
 */
function demandPct(stat: PathStat, names: string[], decimals = 0): number | null {
	if (stat.offerCount === 0) return null;
	let count = 0;
	for (const n of names) count += stat.techCount.get(n) ?? 0;
	const raw = (100 * count) / stat.offerCount;
	const factor = 10 ** decimals;
	return Math.round(raw * factor) / factor;
}

/**
 * Buduje hierarchiczny model kariery (v4.0) z deklaratywnej struktury PATHS +
 * statystyk z danych. Obszar wiedzy: % popytu ścieżki (z danych). Grupnik
 * prezentacyjny: % = null. Liść: % w obrębie ścieżki, BEZ progu (dyrektywa 1/2);
 * liść `absent` → % null + source „kuracja ekspercka". Projekt kotwiczy na liściu.
 */
export function buildCareerModel(stats: Map<string, PathStat>): CareerModel {
	const paths: ModelPath[] = [];
	for (const spec of PATHS) {
		const stat = stats.get(spec.label);
		if (!stat) continue; // ścieżka bez ofert (nie powinno się zdarzyć)
		const areas: ModelArea[] = spec.areas.map((area) => {
			const leaves: ModelLeaf[] = area.leaves.map((leaf) => {
				if (leaf.absent) {
					return {
						name: leaf.name,
						type: "leaf",
						demandPercentage: null,
						source: "kuracja ekspercka",
						note: "brak w zrzucie 2026-02",
					};
				}
				const names = leaf.countAs && leaf.countAs.length > 0 ? leaf.countAs : [leaf.name];
				return {
					name: leaf.name,
					type: "leaf",
					demandPercentage: demandPct(stat, names, 1), // 1 miejsce po przecinku dla liści
					source: "dane",
				};
			});
			const areaDemand =
				area.type === "knowledge-area"
					? demandPct(stat, area.demandAs && area.demandAs.length > 0 ? area.demandAs : [area.name])
					: null;
			return { name: area.name, type: area.type, demandPercentage: areaDemand, leaves };
		});
		const meta = PATH_META[spec.label];
		if (!meta) throw new Error(`career-model: brak PATH_META dla "${spec.label}"`);
		paths.push({
			careerGoal: spec.label,
			category: meta.frameworks.family, // v5: rodzina e-CF jako kategoria nadrzędna
			pathDemandOffers: stat.offerCount,
			frameworks: meta.frameworks,
			juniorFriendliness: meta.juniorFriendliness,
			targetRole: meta.targetRole,
			tShapePairs: meta.tShapePairs,
			note: meta.note ?? spec.note,
			areas,
			projects: PROJECT_BANK[spec.label] ?? [],
		});
	}
	return {
		_meta: {
			source: SOURCE,
			snapshot: SNAPSHOT,
			model: "nearest-profile + hierarchia v4 + warstwa produktu v5 (e-CF/SFIA/ESCO + junior)",
			note: "Hierarchia obszar→liść (% obszaru = popyt ścieżki z danych; % liścia = w obrębie ścieżki, bez progu, 1 miejsce po przecinku; liść null = brak w zrzucie). v5: rodziny e-CF, ramy, warstwa juniora, bank projektów zakotwiczony na liściach. BEZ widełek (decyzja Darka). Patrz docs/data/job-market-provenance.md.",
			families: FAMILIES,
			paths: paths.length,
			leafThreshold: "brak (dyrektywa 1: % przy kazdym liściu obecnym w zrzucie)",
		},
		paths,
	};
}

/**
 * Płaski artefakt jobMarketData = liście-konkrety modelu z REALNYM % (≠ null).
 * Jeden wiersz na (ścieżka, liść). category = nazwa obszaru-rodzica (kontekst).
 * Deduplikacja: ten sam liść w dwóch obszarach ścieżki → jeden wiersz (max %).
 * Sortowanie stabilne: ścieżka wg kolejności PATHS, w niej malejąco po %, alfabet.
 */
export function flattenLeaves(model: CareerModel): CareerGoalEntry[] {
	const entries: CareerGoalEntry[] = [];
	for (const path of model.paths) {
		// liść → {pct, areaName} (bierzemy max % po obszarach, stabilnie). Kolumna
		// demand_percentage w bazie jest integer, więc zaokrąglamy do liczby całkowitej.
		// Liście, które po zaokrągleniu dają 0% (np. Burp Suite 0,3%), pomijamy w
		// PŁASKIEJ tabeli — pełny, 1-dziesiętny % żyje w career-model.json (hierarchia).
		const byLeaf = new Map<string, { pct: number; category: string }>();
		for (const area of path.areas) {
			for (const leaf of area.leaves) {
				if (leaf.demandPercentage === null) continue; // absent — tylko w hierarchii
				const rounded = Math.round(leaf.demandPercentage);
				if (rounded < 1) continue; // 0% po zaokrągleniu — tylko w hierarchii
				const prev = byLeaf.get(leaf.name);
				if (!prev || rounded > prev.pct) {
					byLeaf.set(leaf.name, { pct: rounded, category: area.name });
				}
			}
		}
		const comps: CompetencyRow[] = [...byLeaf.entries()].map(([name, v]) => ({
			name,
			demandPercentage: v.pct,
			category: v.category,
		}));
		comps.sort((a, b) =>
			b.demandPercentage !== a.demandPercentage
				? b.demandPercentage - a.demandPercentage
				: a.name.localeCompare(b.name, "en"),
		);
		entries.push({
			careerGoal: path.careerGoal,
			category: path.category, // = rodzina e-CF (v5)
			studentSelectable: true, // v4: wszystkie widoczne
			competencies: comps,
		});
	}
	return entries;
}

// ── Pełny przebieg (pure — testowalny bez I/O) ───────────────────────────────

/** Buduje mapę Slug → zbiór technologii z wierszy Technologie.csv. */
export function buildTechIndex(techRows: Record<string, string>[]): Map<string, Set<string>> {
	const techBySlug = new Map<string, Set<string>>();
	for (const row of techRows) {
		const slug = row.Slug ?? "";
		const tech = (row.Technologia ?? "").trim();
		if (slug === "" || tech === "") continue;
		let set = techBySlug.get(slug);
		if (!set) {
			set = new Set<string>();
			techBySlug.set(slug, set);
		}
		set.add(tech);
	}
	return techBySlug;
}

/**
 * Składa cały pipeline z już-wczytanych wierszy CSV → płaski artefakt jobMarketData
 * (liście-konkrety z realnym %) + hierarchiczny career-model (obszary+liście+projekty).
 */
export function buildArtifact(
	offerRows: Record<string, string>[],
	techRows: Record<string, string>[],
): { artifact: Artifact; model: CareerModel } {
	const techBySlug = buildTechIndex(techRows);
	const { offers, rawCount } = cleanOffers(offerRows, techBySlug);

	const anchors = buildAnchors(offers);
	const assignment = assignAll(offers, anchors);
	const stats = pathStats(assignment, offers);
	const model = buildCareerModel(stats);
	const entries = flattenLeaves(model);

	const cleaned = offers.size;
	const coveragePercent =
		cleaned === 0 ? 0 : Math.round((1000 * assignment.assigned) / cleaned) / 10;
	const manualAnchors = anchors.filter((a) => a.manual).length;

	const artifact: Artifact = {
		_meta: {
			source: SOURCE,
			snapshot: SNAPSHOT,
			model:
				"nearest-profile (liście-konkrety, bez progu — v4) + v5 (rodziny e-CF, ramy, junior; bez widełek)",
			rawOffers: rawCount,
			cleanedOffers: cleaned,
			assignedOffers: assignment.assigned,
			coveragePercent,
			autoAnchors: anchors.length - manualAnchors,
			manualAnchors,
			anchors: anchors.length,
			profileSize: PROFILE_SIZE,
			paths: entries.length,
			note: "Płaskie liście-konkrety z realnym % (bez progu 5%/10). category = rodzina e-CF (v5). BEZ widełek (salary_range zostaje NULL w bazie — decyzja Darka). Hierarchia + ramy + projekty: career-model.json. Patrz docs/data/job-market-provenance.md.",
		},
		data: entries,
	};
	return { artifact, model };
}

// ── CLI ────────────────────────────────────────────────────────────────────

function main(): void {
	const csvDir = process.env.JJIT_CSV_DIR ?? DEFAULT_CSV_DIR;
	const offersPath = join(csvDir, "JustJoinIT_Oferty.csv");
	const techPath = join(csvDir, "JustJoinIT_Technologie.csv");
	const dataDir = join(process.cwd(), "src", "lib", "db", "data");
	const flatPath = join(dataDir, "job-market-justjoinit.json");
	const modelPath = join(dataDir, "career-model.json");

	console.log("ETL JustJoinIT (nearest-profile + hierarchia v4 + warstwa produktu v5) — start");
	console.log(`  oferty:      ${offersPath}`);
	console.log(`  technologie: ${techPath}`);

	const offerRows = readCsv(offersPath);
	const techRows = readCsv(techPath);
	console.log(`  wczytano: ${offerRows.length} ofert, ${techRows.length} wierszy technologii`);

	const { artifact, model } = buildArtifact(offerRows, techRows);

	// Zapis JSON, potem formatowanie przez biome — żeby artefakty były zgodne z
	// formatterem repo (biome zwija krótkie tablice typu `["Nmap"]` w jedną linię,
	// czego JSON.stringify nie robi). Biome jest deterministyczny, więc rerun daje
	// pliki bajt-w-bajt takie same i `pnpm lint` ich nie rusza. Idempotencja zachowana.
	writeFileSync(flatPath, `${JSON.stringify(artifact, null, "\t")}\n`, "utf-8");
	writeFileSync(modelPath, `${JSON.stringify(model, null, "\t")}\n`, "utf-8");
	try {
		execFileSync("pnpm", ["exec", "biome", "format", "--write", flatPath, modelPath], {
			stdio: "ignore",
		});
	} catch {
		// Biome niedostępny (np. środowisko bez pnpm) — artefakt zostaje w formacie
		// JSON.stringify (poprawny, tylko nie zwinięty). Nie przerywamy generowania.
		console.warn("  (uwaga: biome format pominięty — artefakt w surowym formacie JSON)");
	}

	const m = artifact._meta;
	console.log("\n--- PODSUMOWANIE ---");
	console.log(
		`  oferty surowe: ${m.rawOffers} → po czyszczeniu: ${m.cleanedOffers} → przypisane: ${m.assignedOffers}`,
	);
	console.log(
		`  POKRYCIE: ${m.coveragePercent}% | kotwic: ${m.anchors} (auto ${m.autoAnchors} + ręczne ${m.manualAnchors}) | ścieżek: ${m.paths} (wszystkie widoczne)`,
	);
	console.log(`\n  RODZINY e-CF: ${model._meta.families.map((f) => f.id).join(" · ")}`);
	console.log(
		"\n  STRUKTURA v5 (rodzina → ścieżka → ramy → obszary→liście % → projekty), 3 przykłady:",
	);
	for (const path of model.paths.filter((p) =>
		["AI Engineer", "Java Developer", "Business Analyst"].includes(p.careerGoal),
	)) {
		const fw = path.frameworks;
		console.log(`\n  ▸ [${fw.family}] ${path.careerGoal} (${path.pathDemandOffers} ofert):`);
		console.log(
			`      ramy: e-CF ${fw.eCfArea} | SFIA ${fw.sfiaCategory} | ${fw.iscoCode} ${fw.iscoLabel}`,
		);
		console.log(
			`      junior: ${path.juniorFriendliness}${path.targetRole ? " (ROLA DOCELOWA)" : ""} | T-shape: ${path.tShapePairs.join(", ") || "—"}`,
		);
		for (const area of path.areas) {
			const ap = area.demandPercentage === null ? "—" : `${area.demandPercentage}%`;
			const tag = area.type === "knowledge-area" ? "obszar" : "grupnik";
			console.log(`      ${area.name} (${tag} ${ap})`);
			for (const leaf of area.leaves) {
				const lp = leaf.demandPercentage === null ? "brak w zrzucie" : `${leaf.demandPercentage}%`;
				console.log(`        └ ${leaf.name}: ${lp}`);
			}
		}
		for (const p of path.projects) {
			console.log(`      [${p.level}] ${p.title} → ${p.anchorLeaves.join(", ")}`);
		}
	}
	console.log(`\nZapisano: ${flatPath}`);
	console.log(`Zapisano: ${modelPath}`);
}

// Uruchom tylko gdy plik jest wykonywany bezpośrednio (nie przy imporcie w teście).
if (process.argv[1]?.endsWith("etl-justjoinit.ts")) {
	main();
}
