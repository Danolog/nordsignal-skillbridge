/**
 * STRAŻNIK JĘZYKA PRODUKTU — kod wewnętrzny nie wychodzi do studenta.
 *
 * Geneza: przejazd Darka 2026-08-10. Na produkcji, w opisie modułu czytanym przez
 * studenta, stało „pierwsza uruchomiona komórka w ≤15 min od wejścia (ADR-014 D10).
 * Wariant LEAN: 4 atomy-checklisty, zaliczenie przez wykonanie (pkt 10)". Reguła
 * CLAUDE.md sekcja 3 („żargon techniczny zawsze tłumaczony") obowiązuje od v1.2
 * (2026-05-24) i jest pozycją obowiązkową w self-critique (sekcja 8) — a przez trzy
 * miesiące NIE zatrzymała tego ani razu, bo nie miała strażnika. Ten plik nim jest.
 *
 * Dlaczego test, a nie kolejne zdanie w procedurze: reguła bez strażnika jest
 * postulatem (CLAUDE.md v1.17 — „strażnik bez mutacji nie liczy się jako strażnik";
 * tutaj wcześniejszy problem był jeszcze prostszy — strażnika nie było wcale).
 *
 * ── CO TEN STRAŻNIK WIDZI ─────────────────────────────────────────────────────
 *   A1. Pola drabiny czytane przez studenta: tytuł i opis modułu, tytuły pozycji.
 *   A2. Eksportowane stałe etykiet interfejsu (`labels.ts`) — jedyny nośnik nazw
 *       rodzajów lekcji i statusów.
 *   A3. DRUGI NOŚNIK nazwy: czy któraś z nazw z `labels.ts` jest przepisana
 *       literałem w widokach `src/components/curriculum/**` (warunek 1 Leo, #291).
 *   B.  Treść atomów (tytuł, teoria, podpowiedzi, pytania, opcje, informacja
 *       zwrotna, tytuły zasobów) — jako ZAPADKA, patrz niżej.
 *
 * ── CZEGO NIE WIDZI (jawne granice, nie przeoczenie) ──────────────────────────
 *   • ŻARGONU wpisanego wprost w JSX komponentów — odróżnienie tekstu na ekranie
 *     od komentarza wymaga parsera, nie regexpa. Luka znana, NIE zamknięta.
 *     A3 nie jest jej zamknięciem: A3 szuka skończonej listy ZNANYCH wartości
 *     etykiet, a nie dowolnego żargonu, więc parser nie jest mu potrzebny —
 *     zakazuje literału i w JSX, i w komentarzu, bez rozróżniania ich.
 *   • Literału wpisanego w samym `labels.ts` zamiast interpolacji z nośnika,
 *     jeśli autor wpisze tekst IDENTYCZNY z dzisiejszym. A3c łapie dopiero
 *     rozjazd — czyli ten stan, który szkodzi studentowi.
 *   • Notatników (`tools/content/notebooks/**`) — student czyta je w Colab.
 *   • Treści, która leży WYŁĄCZNIE w bazie produkcyjnej i nie ma źródła w repo.
 *     Repo jest źródłem dla drabiny i atomów, ale zgodność bazy z repo gwarantuje
 *     dopiero ingest — ten test mierzy REPO, nie produkcję.
 *
 * ── ZAPADKA (ratchet) DLA ATOMÓW ──────────────────────────────────────────────
 * Treść 9 modułów niesie dług językowy sprzed tej decyzji (57 trafień twardych,
 * 151 miękkich — pomiar 2026-08-10). Sprzątanie to osobna partia kuracji, nie ten
 * PR. Żeby dług nie rósł w międzyczasie, pinujemy go SUFITEM: liczba trafień może
 * tylko MALEĆ. Każde sprzątnięcie modułu = obniżenie stałej niżej.
 * Próg konsolidacji (CLAUDE.md v1.17): przy pierwszej partii kuracji porządkującej
 * słownictwo atomów sufity schodzą do zera i zapadka znika na rzecz zera twardego.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
	CURRICULUM_INTRO,
	CURRICULUM_INTRO_WITH_PLACEMENT,
	ITEM_LOCKED_HINT,
	ITEM_STATUS_LABEL,
	itemKindLabel,
	LAB_ITEM_HINT,
	MODULE_LOCKED_HINT,
	MODULE_STATUS_LABEL,
	PLACEMENT_BADGE_LABEL,
} from "@/components/curriculum/labels";

/** Kod wewnętrzny — nie ma prawa pojawić się w tekście dla studenta NIGDY. */
const TWARDE: { nazwa: string; wzorzec: RegExp }[] = [
	{ nazwa: "numer decyzji architektonicznej (ADR-…)", wzorzec: /ADR[-\s]?\d+/g },
	{ nazwa: "kod zadania planu (np. 1E.6b)", wzorzec: /\b\d+E\.\d+[a-z]?\b/g },
	{ nazwa: "odsyłacz do punktu dokumentu (pkt N)", wzorzec: /\bpkt\.?\s*\d+/g },
	{ nazwa: "kod decyzji (np. D10)", wzorzec: /(?<![\w])D\d{1,2}(?![\w])/g },
	{ nazwa: "nazwa wariantu wewnętrznego (LEAN)", wzorzec: /\bLEAN\b/g },
	{ nazwa: "kalka „just-in-time”", wzorzec: /just-in-time/g },
	{ nazwa: "„capstone”", wzorzec: /\bcapstone\w*/gi },
	{
		nazwa: "ścieżka pliku w repozytorium",
		wzorzec: /(?:docs|tools|src)\/[\w/\-.]+\.(?:md|ts|tsx|json)/g,
	},
	{ nazwa: "„mastery gate”", wzorzec: /mastery/gi },
	{ nazwa: "„slug”", wzorzec: /\bslug\w*/gi },
	{ nazwa: "„trunk”", wzorzec: /\btrunk\b/gi },
];

/** Słownictwo wewnętrzne — do wyplenienia z treści, liczone zapadką. */
const MIEKKIE: RegExp[] = [
	/\batom\w*/gi,
	/pieczątk\w*/gi,
	/\bchecklist\w*/gi,
	/\bcheck\w*/gi,
	/worked example/gi,
	/\bfading\b/gi,
	/\bdrabink\w*/gi,
];

const SUFIT_TWARDE_ATOMY = 57;
const SUFIT_MIEKKIE_ATOMY = 151;

const KATALOG_ATOMOW = join(process.cwd(), "tools", "content", "curriculum-atoms");
const PLIK_DRABINY = join(process.cwd(), "tools", "content", "curriculum-ds-drabina.json");

function trafienia(tekst: string, wzorce: RegExp[]): string[] {
	const out: string[] = [];
	for (const w of wzorce) out.push(...(tekst.match(new RegExp(w.source, w.flags)) ?? []));
	return out;
}

/** Pola drabiny, które student widzi. `_meta`, `slug`, `diagnosticConcept` — nie. */
function tekstyDrabiny(): { gdzie: string; tekst: string }[] {
	const d = JSON.parse(readFileSync(PLIK_DRABINY, "utf8"));
	const out: { gdzie: string; tekst: string }[] = [];
	for (const m of d.modules) {
		out.push({ gdzie: `moduł ${m.slug}.title`, tekst: m.title });
		if (m.description) out.push({ gdzie: `moduł ${m.slug}.description`, tekst: m.description });
		for (const i of m.items ?? []) {
			out.push({ gdzie: `moduł ${m.slug} → pozycja ${i.slug}.title`, tekst: i.title });
		}
	}
	return out;
}

/** Treść atomów w kształcie, w jakim trafia na ekran studenta. */
function tekstyAtomow(): string[] {
	const out: string[] = [];
	for (const plik of readdirSync(KATALOG_ATOMOW).filter((f) => f.endsWith(".json"))) {
		const d = JSON.parse(readFileSync(join(KATALOG_ATOMOW, plik), "utf8"));
		for (const it of d.items) {
			out.push(it.title, it.contentMd ?? "", ...(it.hints ?? []));
			for (const q of it.questions ?? []) {
				out.push(q.stem, ...(q.options ?? []), q.explanationMd ?? "");
				for (const o of q.optionFeedback ?? []) out.push(o.feedbackMd ?? "");
			}
			for (const r of it.resources ?? []) out.push(r.title);
		}
	}
	return out.filter(Boolean);
}

describe("A1 — drabina modułów: zero kodu wewnętrznego w tekście dla studenta", () => {
	for (const { nazwa, wzorzec } of TWARDE) {
		it(`nie zawiera: ${nazwa}`, () => {
			const złe = tekstyDrabiny()
				.map(({ gdzie, tekst }) => ({ gdzie, hits: trafienia(tekst, [wzorzec]) }))
				.filter((x) => x.hits.length > 0);
			expect(
				złe,
				`Kod wewnętrzny w tekście czytanym przez studenta:\n${złe
					.map((x) => `  • ${x.gdzie}: ${x.hits.join(", ")}`)
					.join("\n")}\nPrzepisz po polsku (CLAUDE.md sekcja 3).`,
			).toEqual([]);
		});
	}
});

describe("A2 — etykiety interfejsu: zero kodu wewnętrznego", () => {
	it("stałe i etykiety rodzajów lekcji są wolne od żargonu", () => {
		const etykiety = [
			...Object.values(MODULE_STATUS_LABEL),
			...Object.values(ITEM_STATUS_LABEL),
			PLACEMENT_BADGE_LABEL,
			CURRICULUM_INTRO,
			CURRICULUM_INTRO_WITH_PLACEMENT,
			LAB_ITEM_HINT,
			ITEM_LOCKED_HINT,
			MODULE_LOCKED_HINT,
			...["theory", "exercise", "lab", "project", "review"].map(itemKindLabel),
		];
		const hits = etykiety.flatMap((e) =>
			trafienia(
				e,
				TWARDE.map((t) => t.wzorzec),
			),
		);
		expect(hits, `Żargon w etykietach interfejsu: ${hits.join(", ")}`).toEqual([]);
	});

	it("„lab” nie jest etykietą pokazywaną studentowi", () => {
		expect(itemKindLabel("lab")).toBe("Zadanie praktyczne");
	});
});

/**
 * A3 — nazwa ma DOKŁADNIE JEDEN nośnik (CLAUDE.md v1.17).
 *
 * Geneza: przegląd #291, warunek 1 Leo. Nazwy rodzajów pozycji żyły w TRZECH
 * miejscach naraz i jedno już się rozjechało (`atomKindLabel` zwracała „Lab").
 * Widok wolno WOŁAĆ nazwę, nie wolno jej PRZEPISAĆ — inaczej przemianowanie
 * naprawia nośnik i test, a akapit obok zostaje stary i produkt pokazuje
 * studentowi dwie nazwy tej samej rzeczy.
 *
 * Zakaz obejmuje też KOMENTARZ, i to celowo — komentarz z wpisaną nazwą
 * dezaktualizuje się tak samo, tylko ciszej (dwa takie były: `module-items.tsx`
 * i `placement-badge.ts`). Dzięki temu strażnik nie musi odróżniać komentarza
 * od JSX, czyli nie potrzebuje parsera.
 */
const KATALOG_WIDOKU = join(process.cwd(), "src", "components", "curriculum");

/** Wszystkie wartości nazw, których widok nie ma prawa przepisać literałem. */
function nazwyZNosnika(): { nazwa: string; wartosc: string }[] {
	const out: { nazwa: string; wartosc: string }[] = [];
	for (const [k, v] of Object.entries(MODULE_STATUS_LABEL))
		out.push({ nazwa: `MODULE_STATUS_LABEL.${k}`, wartosc: v });
	for (const [k, v] of Object.entries(ITEM_STATUS_LABEL))
		out.push({ nazwa: `ITEM_STATUS_LABEL.${k}`, wartosc: v });
	for (const k of ["theory", "exercise", "lab", "project", "review"])
		out.push({ nazwa: `itemKindLabel("${k}")`, wartosc: itemKindLabel(k) });
	return out;
}

/** Pliki widoku curriculum poza `labels.ts` (nośnik) i testami. */
function plikiWidoku(katalog = KATALOG_WIDOKU): string[] {
	const out: string[] = [];
	for (const wpis of readdirSync(katalog)) {
		const pelna = join(katalog, wpis);
		if (statSync(pelna).isDirectory()) {
			if (wpis === "__tests__") continue;
			out.push(...plikiWidoku(pelna));
			continue;
		}
		if (!/\.tsx?$/.test(wpis)) continue;
		if (pelna === join(KATALOG_WIDOKU, "labels.ts")) continue;
		out.push(pelna);
	}
	return out;
}

/**
 * Czy `wartosc` stoi w `tekst` jako OSOBNE słowo, a nie w środku identyfikatora.
 *
 * Bez tego warunku strażnik czerwieni się na własnych nazwach zmiennych: przy
 * mutacji M3 (nazwa „lab" → „Lab") wartość „Lab" trafiała w „itemKindLabel"
 * i dawała cztery fałszywe trafienia. Fałszywe trafienie jest tu kosztowne —
 * uczy wyłączania strażnika zamiast poprawiania kodu.
 *
 * Sąsiedztwo sprawdzamy znakami, nie `\b`: wartości są polskie („Ćwiczenie"),
 * a `\b` w JS opiera się o `\w`, czyli ASCII — „Ćwiczenie" zaczyna się znakiem,
 * którego `\w` nie obejmuje, więc granica wypadałaby w złym miejscu.
 */
function stoiJakoOsobneSlowo(tekst: string, wartosc: string): boolean {
	const identyfikator = /[A-Za-z0-9_]/;
	let od = tekst.indexOf(wartosc);
	while (od !== -1) {
		const przed = od > 0 ? tekst[od - 1] : "";
		const po = tekst[od + wartosc.length] ?? "";
		const wSrodkuNazwy =
			(przed !== "" && identyfikator.test(przed)) || (po !== "" && identyfikator.test(po));
		if (!wSrodkuNazwy) return true;
		od = tekst.indexOf(wartosc, od + 1);
	}
	return false;
}

describe("A3 — nazwa ma jeden nośnik: widok WOŁA etykietę, nie PRZEPISUJE jej", () => {
	it("żaden plik `src/components/curriculum/**` nie powtarza wartości etykiety literałem", () => {
		const nazwy = nazwyZNosnika();
		const złe: string[] = [];
		for (const plik of plikiWidoku()) {
			const tekst = readFileSync(plik, "utf8");
			for (const { nazwa, wartosc } of nazwy) {
				if (stoiJakoOsobneSlowo(tekst, wartosc)) {
					złe.push(
						`  • ${relative(process.cwd(), plik)} — literał „${wartosc}" (nośnik: ${nazwa})`,
					);
				}
			}
		}
		expect(
			złe,
			`Drugi nośnik nazwy — widok przepisuje etykietę zamiast ją wołać:\n${złe.join("\n")}\n` +
				"Wstaw wartość z `labels.ts` (interpolacja), a w komentarzu napisz o nośniku, nie o nazwie.",
		).toEqual([]);
	});

	it("zdania widoku są ZBUDOWANE z nośnika, nie wpisane obok niego", () => {
		// Łapie rozjazd: gdy ktoś zamieni interpolację na literał i zmieni nazwę
		// w jednym miejscu. Nie łapie literału identycznego z dzisiejszym tekstem —
		// granica zapisana w nagłówku pliku.
		expect(LAB_ITEM_HINT.startsWith(`${itemKindLabel("lab")} — `)).toBe(true);
		expect(ITEM_LOCKED_HINT.startsWith(`${ITEM_STATUS_LABEL.locked} — `)).toBe(true);
		expect(MODULE_LOCKED_HINT.startsWith(`${MODULE_STATUS_LABEL.locked} — `)).toBe(true);
	});
});

describe("B — treść atomów: dług językowy może tylko maleć (zapadka)", () => {
	it(`kod wewnętrzny w treści atomów ≤ ${SUFIT_TWARDE_ATOMY}`, () => {
		const n = tekstyAtomow().flatMap((t) =>
			trafienia(
				t,
				TWARDE.map((x) => x.wzorzec),
			),
		).length;
		expect(
			n,
			`Trafień: ${n}, sufit: ${SUFIT_TWARDE_ATOMY}. Wzrost = regresja. Spadek = obniż sufit w tym pliku.`,
		).toBeLessThanOrEqual(SUFIT_TWARDE_ATOMY);
	});

	it(`słownictwo wewnętrzne w treści atomów ≤ ${SUFIT_MIEKKIE_ATOMY}`, () => {
		const n = tekstyAtomow().flatMap((t) => trafienia(t, MIEKKIE)).length;
		expect(
			n,
			`Trafień: ${n}, sufit: ${SUFIT_MIEKKIE_ATOMY}. Wzrost = regresja. Spadek = obniż sufit w tym pliku.`,
		).toBeLessThanOrEqual(SUFIT_MIEKKIE_ATOMY);
	});
});
