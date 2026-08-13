/**
 * E4 — KLAUZULA INFORMACYJNA (art. 13 RODO) W INTERFEJSIE.
 *
 * ── JEDEN NOŚNIK TREŚCI ──────────────────────────────────────────────────────
 * Nośnikiem klauzuli jest `docs/legal/klauzula-informacyjna-art13.md`. Interfejs
 * go RENDERUJE — nie niesie przepisanej kopii w komponencie. Uzasadnienie jest
 * w samym dokumencie (sekcja Z-3 „Jeden nośnik"): klauzula wywodzi treść z trzech
 * rejestrów (`ropa.md`, `retention.md`, `art17-kompletnosc-usuniecia.md`) i NIE
 * jest dla nich źródłem prawdy. Kopia w komponencie znaczyłaby, że zmiana okresu
 * przechowywania rozjeżdża się po cichu z tym, co widzi student — a strażnik
 * okresów (`tests/unit/rodo/okresy-retencji.contract.test.ts`) pilnuje trzech
 * nośników w repozytorium i o czwartym, przepisanym do JSX, nie wiedziałby nic.
 * CLAUDE.md v1.17, reguła (1).
 *
 * ── DLACZEGO TO NIE JEST ZWYKŁE `readFileSync` + `<ReactMarkdown>` ───────────
 * Dokument ma TRZY części i tylko jedna z nich wolno pokazać człowiekowi:
 *   • CZĘŚĆ II-A (przed CZĘŚCIĄ I) — aparat wewnętrzny: „Nie jestem prawnikiem",
 *     warunki zapłonu W-1…W-5, sprostowanie autora o własnym strażniku;
 *   • CZĘŚĆ I                       — treść dla studenta (jedyne, co publikujemy);
 *   • CZĘŚĆ II-B (po CZĘŚCI I)      — aparat wewnętrzny, nagłówek mówi wprost
 *     „nie publikujemy" (m.in. Z-5: osiem rzeczy do sprawdzenia przez prawnika).
 * Student, który zobaczy zdanie „Nie jestem prawnikiem" albo tabelę warunków
 * zapłonu, dostaje dowód, że klauzuli nie napisał prawnik. To jest bramka przed
 * pierwszym uczestnikiem spoza zespołu, nie ozdoba — dlatego wycinanie CZĘŚCI I
 * jest FAIL-CLOSED w obie strony: każda niespodzianka w kształcie dokumentu
 * (brak znacznika, znacznik podwojony, nierozpoznana treść przed pierwszym
 * nagłówkiem) RZUCA WYJĄTKIEM. Strona się wtedy nie renderuje. Cicha degradacja
 * „pokaż, co się da" byłaby dokładnie tą rodziną awarii, o którą rozszerzono
 * minimum jakości: mechanizm melduje „w porządku", nie sprawdzając tego, co miał
 * sprawdzać.
 *
 * Druga warstwa — `assertBezAparatuWewnetrznego` — sprawdza WYNIK, nie procedurę.
 * Gdyby ktoś przeniósł zdanie z CZĘŚCI II do CZĘŚCI I (najbardziej realna wpadka:
 * autor dopisuje notkę dla recenzenta w środku tekstu dla studenta), cięcie po
 * znacznikach by tego nie złapało — odciski palców łapią.
 *
 * Strażnik z dowodem mutacji: `tests/unit/rodo/klauzula-czesc-ii-nie-wycieka.contract.test.ts`.
 *
 * ── ZAPŁON ───────────────────────────────────────────────────────────────────
 * Ten moduł NIE decyduje, czy klauzula obowiązuje. Dokument ma pięć twardych
 * warunków wejścia w życie (sekcja Z-2), z których część leży poza kodem. Strona
 * `/prywatnosc` jest za flagą `privacyNoticeArt13` (domyślnie zgaszona) —
 * gotowa i WYŁĄCZONA, nie „prawie zapalona".
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Nośnik treści. Jedyne miejsce, w którym ta ścieżka pada w kodzie produkcyjnym. */
export const SCIEZKA_KLAUZULI = join(
	process.cwd(),
	"docs",
	"legal",
	"klauzula-informacyjna-art13.md",
);

/** Początek treści dla studenta. Dokładnie jedno wystąpienie — inaczej wyjątek. */
const ZNACZNIK_POCZATKU = /^#\s+CZĘŚĆ I\b/;
/** Dowolny nagłówek CZĘŚCI II (II-A stoi przed, II-B po CZĘŚCI I). */
const ZNACZNIK_CZESCI_II = /^#{1,6}\s+CZĘŚĆ II\b/;
/** Pierwszy nagłówek treści właściwej — od niego zaczyna się to, co widzi człowiek. */
const NAGLOWEK_TRESCI = /^##\s+\S/;

/**
 * ODCISKI PALCÓW APARATU WEWNĘTRZNEGO — kontrola wyniku, nie procedury.
 *
 * Każdy wzorzec dobrany tak, żeby NIE trafiał w nic z dzisiejszej CZĘŚCI I
 * (kontrola dodatnia w strażniku pilnuje, żeby tak zostało). Świadomie NIE ma
 * tu słowa „sprostowanie": CZĘŚĆ I używa go w prawidłowym, legalnym znaczeniu
 * („**Sprostowanie** (art. 16)"), a strażnik krzyczący na poprawny tekst zostaje
 * wyciszony i przestaje bronić czegokolwiek.
 */
const ODCISKI_APARATU: readonly { wzorzec: RegExp; co: string }[] = [
	{ wzorzec: /CZĘŚĆ II/, co: "nagłówek CZĘŚCI II (aparat wewnętrzny)" },
	{ wzorzec: /\bZ-[1-9]\b/, co: "oznaczenie sekcji aparatu (Z-1…Z-6)" },
	{ wzorzec: /\bW-[1-9]\b/, co: "warunek wejścia w życie z tabeli Z-2" },
	{ wzorzec: /\bL-[a-h]\b/, co: "pozycja listy dla prawnika (Z-5)" },
	{ wzorzec: /nie jestem prawnikiem/i, co: "zastrzeżenie autora, że nie jest prawnikiem" },
	{ wzorzec: /NIE POKAZUJEMY|nie publikujemy|STATUS: PROJEKT/i, co: "banner statusu draftu" },
	{ wzorzec: /aparat wewnętrzn/i, co: "nazwa własna CZĘŚCI II" },
	{ wzorzec: /self-critique/i, co: "sekcja samokrytyki (Z-6)" },
	{ wzorzec: /Zleceniodawca|Sign-off|Changelog/i, co: "metryka dokumentu roboczego" },
	{ wzorzec: /\b(Ryan|Ethan|Sophia|Leo|Darek|Wendy|Carl|Mila|Oliver)\b/, co: "imię roli w firmie" },
	{ wzorzec: /\bCRCO\b|\bCTO\b|\bCEO\b/, co: "skrót funkcji w firmie" },
	{ wzorzec: /CLAUDE\.md|\.md\b|docs\//, co: "ścieżka do pliku wewnętrznego" },
];

/** Komentarze HTML — klucze maszynowe strażnika okresów. Niewidoczne, ale wycinamy. */
const KOMENTARZ_HTML = /<!--[\s\S]*?-->/g;

class KlauzulaError extends Error {
	constructor(powod: string) {
		super(
			`[klauzula art. 13] ${powod}\n` +
				`Nośnikiem treści jest ${SCIEZKA_KLAUZULI}. Strona /prywatnosc renderuje ` +
				`WYŁĄCZNIE CZĘŚĆ I. Wyjątek jest celowy — brak pewności, gdzie kończy się ` +
				`treść dla studenta, oznacza brak strony, nigdy „pokaż, co się da".`,
		);
		this.name = "KlauzulaError";
	}
}

/**
 * Sprawdza WYNIK cięcia. Rzuca, gdy w tekście dla studenta siedzi cokolwiek
 * z aparatu wewnętrznego. Wywoływana z `wytnijCzescI` — nie da się jej ominąć,
 * wołając samo cięcie.
 */
export function assertBezAparatuWewnetrznego(tekst: string): void {
	const trafienia = ODCISKI_APARATU.filter(({ wzorzec }) => wzorzec.test(tekst)).map(
		({ wzorzec, co }) => `${co} (${wzorzec.source}) → „${tekst.match(wzorzec)?.[0]}"`,
	);
	if (trafienia.length > 0) {
		throw new KlauzulaError(
			`W treści dla studenta znalazłem aparat wewnętrzny:\n  - ${trafienia.join("\n  - ")}\n` +
				`CZĘŚĆ II nigdy nie jest publikowana (nagłówek dokumentu, zdanie wiążące).`,
		);
	}
}

/**
 * Wycina CZĘŚĆ I (treść dla studenta) z pełnego dokumentu.
 *
 * Granice:
 *   • start — pierwszy nagłówek `## …` PO znaczniku `# CZĘŚĆ I`. Między
 *     znacznikiem a tym nagłówkiem wolno stać wyłącznie pustym liniom, poziomej
 *     kresce i cytatowi blokowemu (`>`), bo tam mieszka nota dla recenzenta
 *     („poniższy tekst jest tym, co zobaczy człowiek") — to komentarz o treści,
 *     nie treść. Cokolwiek innego = wyjątek: nie zgaduję, czy to już klauzula.
 *   • koniec — pierwszy nagłówek `CZĘŚĆ II` po starcie. Jego BRAK jest wyjątkiem,
 *     nie „weź do końca pliku": gdyby ktoś przemianował nagłówek CZĘŚCI II-B,
 *     wariant „do końca pliku" opublikowałby listę rzeczy do sprawdzenia przez
 *     prawnika.
 */
export function wytnijCzescI(markdown: string): string {
	const linie = markdown.split("\n");

	const poczatki = linie.flatMap((l, i) => (ZNACZNIK_POCZATKU.test(l) ? [i] : []));
	if (poczatki.length === 0) {
		throw new KlauzulaError(
			"Nie znalazłem znacznika `# CZĘŚĆ I` — nie wiem, co jest dla studenta.",
		);
	}
	if (poczatki.length > 1) {
		throw new KlauzulaError(
			`Znacznik \`# CZĘŚĆ I\` występuje ${poczatki.length} razy (linie: ` +
				`${poczatki.map((i) => i + 1).join(", ")}). Nie zgaduję, który otwiera treść.`,
		);
	}
	const start = poczatki[0];

	const koniec = linie.findIndex((l, i) => i > start && ZNACZNIK_CZESCI_II.test(l));
	if (koniec === -1) {
		throw new KlauzulaError(
			"Po CZĘŚCI I nie ma nagłówka CZĘŚCI II. Bez znacznika końca nie umiem odciąć " +
				"aparatu wewnętrznego, a „do końca pliku” opublikowałoby go w całości.",
		);
	}

	const naglowek = linie.findIndex((l, i) => i > start && i < koniec && NAGLOWEK_TRESCI.test(l));
	if (naglowek === -1) {
		throw new KlauzulaError(
			"CZĘŚĆ I nie ma ani jednego nagłówka `## …` — dokument zmienił kształt.",
		);
	}

	const przedNaglowkiem = linie.slice(start + 1, naglowek);
	const nierozpoznane = przedNaglowkiem
		.map((l, i) => ({ nr: start + 2 + i, l }))
		.filter(({ l }) => l.trim() !== "" && !l.startsWith(">") && l.trim() !== "---");
	if (nierozpoznane.length > 0) {
		throw new KlauzulaError(
			`Między znacznikiem CZĘŚCI I a pierwszym nagłówkiem stoi treść, której nie umiem ` +
				`zakwalifikować:\n  ${nierozpoznane.map(({ nr, l }) => `${nr}: ${l.trim().slice(0, 90)}`).join("\n  ")}\n` +
				`Albo to treść dla studenta (przenieś pod nagłówek), albo nota dla recenzenta ` +
				`(zapisz ją cytatem blokowym).`,
		);
	}

	const tresc = linie
		.slice(naglowek, koniec)
		.join("\n")
		.replace(KOMENTARZ_HTML, "")
		.replace(/\n\s*---\s*$/, "")
		.trimEnd();

	assertBezAparatuWewnetrznego(tresc);
	return tresc;
}

/** Treść dla studenta, prosto z nośnika. Wołane po stronie serwera. */
export function wczytajKlauzuleDlaStudenta(): string {
	return wytnijCzescI(readFileSync(SCIEZKA_KLAUZULI, "utf8"));
}

// ────────────────────────────────────────────────────────────────────────────
// Podział na bloki — tabele osobno od reszty.
//
// DLACZEGO WŁASNY PODZIAŁ, A NIE `remark-gfm`: tabel w markdownie nie renderuje
// `react-markdown` bez wtyczki GFM, a tej w zależnościach NIE MA. Dołożenie
// biblioteki to decyzja stacku (nie moja — proponuję przez zgłoszenie, nie
// commitem). Podział jest liniowy i celowo głupi: ciąg linii zaczynających się
// od „|" z wierszem oddzielającym na drugiej pozycji = tabela; wszystko inne
// idzie do `react-markdown` bez zmian. Zawartość komórek nadal renderuje
// markdown (pogrubienia), więc nie powstaje druga składnia.
//
// Niezgodna liczba kolumn = wyjątek, nie ciche dopełnienie: w sekcji 7 kolumna
// to okres przechowywania, a przesunięcie o jedną pozycję zmienia obietnicę
// wobec studenta.
// ────────────────────────────────────────────────────────────────────────────

export type BlokTresci =
	| { rodzaj: "markdown"; tekst: string }
	| { rodzaj: "tabela"; naglowek: string[]; wiersze: string[][] };

const WIERSZ_TABELI = /^\s*\|/;
const ODDZIELACZ_TABELI = /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/;

function komorki(linia: string): string[] {
	const surowe = linia.trim();
	const bezKrawedzi = surowe.replace(/^\|/, "").replace(/\|$/, "");
	return bezKrawedzi.split("|").map((c) => c.trim());
}

export function podzielNaBloki(markdown: string): BlokTresci[] {
	const linie = markdown.split("\n");
	const bloki: BlokTresci[] = [];
	let bufor: string[] = [];

	const domknijMarkdown = () => {
		const tekst = bufor.join("\n").trim();
		if (tekst !== "") bloki.push({ rodzaj: "markdown", tekst });
		bufor = [];
	};

	for (let i = 0; i < linie.length; i++) {
		const czyTabela =
			WIERSZ_TABELI.test(linie[i]) && i + 1 < linie.length && ODDZIELACZ_TABELI.test(linie[i + 1]);
		if (!czyTabela) {
			bufor.push(linie[i]);
			continue;
		}

		domknijMarkdown();
		const naglowek = komorki(linie[i]);
		const wiersze: string[][] = [];
		let j = i + 2;
		for (; j < linie.length && WIERSZ_TABELI.test(linie[j]); j++) {
			const w = komorki(linie[j]);
			if (w.length !== naglowek.length) {
				throw new KlauzulaError(
					`Wiersz tabeli ma ${w.length} kolumn, nagłówek ${naglowek.length} (linia ${j + 1}). ` +
						`Nie dopełniam po cichu — w sekcji 7 przesunięcie o kolumnę zmienia okres ` +
						`przechowywania obiecany studentowi.`,
				);
			}
			wiersze.push(w);
		}
		bloki.push({ rodzaj: "tabela", naglowek, wiersze });
		i = j - 1;
	}

	domknijMarkdown();
	return bloki;
}
