// @vitest-environment jsdom
/**
 * 1E.7 L6 · POWIERZCHNIA A — dziesięć wariantów renderu (§12.6) + reguły twarde §12.4.
 *
 * Testujemy CAŁĄ DROGĘ: kontrakt serwera → adapter → DOM. Osobne testowanie adaptera
 * i komponentu przepuściłoby najgroźniejszy błąd tej funkcji — poprawny werdykt
 * wyrenderowany jako niewłaściwe zdanie. Fixture jest więc w kształcie ODPOWIEDZI
 * SERWERA, nie modelu widoku.
 *
 * Zdanie, którego pilnuje mutacja: „wypadła słabo" wolno pokazać WYŁĄCZNIE przy
 * `below_threshold`. Najczęstszym powodem zatrzymania prefiksu jest dziś
 * `no_measurement` (§6a: dwie kompetencje DS są poza katalogiem rynku, więc nikt
 * ich nie zaznaczy) — pomyłka w tym miejscu nie jest przypadkiem brzegowym, jest
 * przypadkiem domyślnym.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlacementScreenContract } from "@/lib/curriculum/placement-screen";
import { PlacementSummary } from "../placement-summary";
import { toPlacementSummaryViewModel } from "../placement-summary-vm";

const KORZEN = { slug: "l0-start", title: "Start: środowisko pracy" };

function contract(over: Partial<PlacementScreenContract> = {}): PlacementScreenContract {
	const podstawa = {
		unlockedByDiagnosis: [],
		unlockedCount: 0,
		completedModules: [],
		hole: null,
		recommendation: KORZEN,
		noRecommendationReason: null,
		recommendationIsRoot: true,
		...over,
	};
	// `unlockedCount` to FAKT „ile otworzyła diagnoza" (naprawa K1) — domyślnie
	// SPÓJNY z podaną listą, bo w produkcji rozjeżdża się tylko wtedy, gdy moduł
	// nie ma tytułu do pokazania. Test, który chce ten rozjazd, ustawia pole jawnie.
	return { ...podstawa, unlockedCount: over.unlockedCount ?? podstawa.unlockedByDiagnosis.length };
}

/** Render przez adapter — dokładnie tak, jak robi to kreator. */
function renderSummary(c: PlacementScreenContract | null | undefined) {
	return render(<PlacementSummary summary={toPlacementSummaryViewModel(c)} />);
}

/** Cały widoczny tekst sekcji — do asercji o kolejności i o tym, czego NIE MA. */
function tekst(container: HTMLElement): string {
	return container.textContent ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// WARIANTY 1–4: SEKCJA NIE ISTNIEJE. Nie „sekcja pusta", nie tekst zastępczy.
// Wszystkie cztery przyczyny rozstrzyga serwer i wysyła jeden sygnał — brak
// klucza `placement` w odpowiedzi. Front ma jedną regułę zamiast czterech kopii.
// ─────────────────────────────────────────────────────────────────────────────
describe("§12.6 warianty 1–4 — sekcja NIE ISTNIEJE", () => {
	it("wariant 1 (flaga OFF / brak sesji diagnozy): brak klucza w odpowiedzi → zero DOM", () => {
		const { container } = renderSummary(undefined);
		expect(container.innerHTML).toBe("");
	});

	it("wariant 2 (cel spoza pilotażu DS, pathKey null): zero DOM", () => {
		const { container } = renderSummary(null);
		expect(container.innerHTML).toBe("");
	});

	it("wariant 3 (pusta drabina): zero DOM — nie ma drabiny, o której można mówić", () => {
		const { container } = renderSummary(null);
		expect(container.innerHTML).toBe("");
	});

	it("wariant 4 (awaria hooka best-effort): zero DOM, nigdy „nie udało się”", () => {
		const { container } = renderSummary(null);
		expect(container.innerHTML).toBe("");
		expect(tekst(container)).not.toMatch(/nie udało się|niestety|błąd/i);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// WARIANTY 5–10: SEKCJA ISTNIEJE.
// ─────────────────────────────────────────────────────────────────────────────
describe("§12.6 wariant 5 — zero odblokowań, zero zaliczeń, dziura JEST", () => {
	const c = contract({
		hole: { moduleTitle: "Python I", competencyName: "Python", reason: "no_measurement" },
	});

	it("renderuje wyłącznie wyjaśnienie dziury (wariant zerowy) i rekomendację korzenia", () => {
		const { container } = renderSummary(c);
		expect(screen.getByText(/Nie sprawdzaliśmy/)).toBeInTheDocument();
		expect(tekst(container)).toContain("To nie jest ocena — to brak pomiaru.");
		expect(screen.getByText(/Bez działającego notebooka/)).toBeInTheDocument();
		expect(screen.queryByText(/Masz już zaliczone/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Diagnoza otworzyła/)).not.toBeInTheDocument();
	});

	it("§12.5: zero odblokowań NIE jest komunikowane jako porażka ani licznikiem", () => {
		const { container } = renderSummary(c);
		const t = tekst(container);
		expect(t).not.toMatch(/nic nie otworzyła|nie odblokowaliśmy|nie udało się|niestety/i);
		expect(t).not.toMatch(/\b0 z \d/);
		expect(t).not.toMatch(/\d+%/);
	});
});

describe("§12.6 wariant 6 — zero odblokowań, zero zaliczeń, dziury BRAK", () => {
	it("renderuje WYŁĄCZNIE blok 3 — karta neutralna w ogóle nie powstaje", () => {
		renderSummary(contract());
		expect(screen.getByText(/Bez działającego notebooka/)).toBeInTheDocument();
		// Brak karty neutralnej = brak nagłówka i brak regionu „Po diagnozie".
		expect(screen.queryByRole("heading", { name: "Po diagnozie" })).not.toBeInTheDocument();
		expect(screen.queryByRole("region", { name: "Po diagnozie" })).not.toBeInTheDocument();
	});
});

describe("§12.6 wariant 7 — odblokowania > 0, zaliczenia = 0", () => {
	const c = contract({
		unlockedByDiagnosis: [
			{ slug: "f1", title: "Python I" },
			{ slug: "f2", title: "Python II" },
		],
		recommendation: { slug: "f2", title: "Python II" },
		recommendationIsRoot: false,
	});

	it("mówi „aż do modułu {najgłębszy}” i wprost rozdziela otwarcie od zaliczenia", () => {
		const { container } = renderSummary(c);
		expect(screen.getByText(/Diagnoza otworzyła Ci ścieżkę aż do modułu/)).toBeInTheDocument();
		const t = tekst(container);
		expect(t).toContain("Python II");
		expect(t).toContain("To skrót w nawigacji, nie zaliczenie");
		expect(t).toContain("Zacznij od Python II.");
	});

	it("§12.7 pkt 2: ani jedno słowo mieszające otwarcie z zaliczeniem", () => {
		const { container } = renderSummary(c);
		expect(tekst(container)).not.toMatch(/masz z głowy|możesz pominąć|przerobione|ukończone/i);
	});

	it("§12.7 pkt 4: żadnych slugów ani kodów powodów na ekranie", () => {
		const { container } = renderSummary(
			contract({
				unlockedByDiagnosis: [{ slug: "f1-python-1", title: "Python I" }],
				hole: { moduleTitle: "EDA", competencyName: "Analiza danych", reason: "no_measurement" },
				recommendation: { slug: "f1-python-1", title: "Python I" },
				recommendationIsRoot: false,
			}),
		);
		const t = tekst(container);
		expect(t).not.toContain("f1-python-1");
		expect(t).not.toContain("l0-start");
		expect(t).not.toContain("no_measurement");
	});
});

describe("§12.6 wariant 8 — odblokowania = 0, zaliczenia > 0", () => {
	const c = contract({
		completedModules: [
			{ slug: "sql", title: "SQL" },
			{ slug: "pandas", title: "Pandas" },
		],
		recommendation: { slug: "eda", title: "EDA" },
		recommendationIsRoot: false,
	});

	it("zdanie łączone: dorobek + „nic ponad to” + rekomendacja w JEDNYM miejscu", () => {
		const { container } = renderSummary(c);
		const t = tekst(container);
		expect(t).toContain("Masz już zaliczone: SQL, Pandas.");
		expect(t).toContain("Diagnoza nie otworzyła nic ponad to — zacznij od EDA.");
	});

	it("BEZ osobnego akcentu 3 — rekomendacja pada raz, nie dwa razy w dwóch stylach", () => {
		const { container } = renderSummary(c);
		expect(tekst(container).match(/zacznij od/gi) ?? []).toHaveLength(1);
		expect(container.querySelector(".border-ed-amber")).toBeNull();
	});
});

describe("§12.6 wariant 9 — odblokowania > 0, zaliczenia > 0", () => {
	const c = contract({
		completedModules: [{ slug: "sql", title: "SQL" }],
		unlockedByDiagnosis: [
			{ slug: "f1", title: "Python I" },
			{ slug: "f2", title: "Python II" },
		],
		hole: { moduleTitle: "EDA", competencyName: "Analiza danych", reason: "uncovered" },
		recommendation: { slug: "f2", title: "Python II" },
		recommendationIsRoot: false,
	});

	it("trzy bloki obecne", () => {
		const { container } = renderSummary(c);
		const t = tekst(container);
		expect(t).toContain("Masz już zaliczone: SQL.");
		expect(t).toContain("Diagnoza otworzyła dodatkowo: Python I, Python II.");
		expect(t).toContain("Nie badaliśmy Analiza danych w diagnozie");
		expect(t).toContain("Zacznij od Python II.");
	});

	it("KOLEJNOŚĆ WIĄŻĄCA (§12.3): najpierw JEGO praca, potem NASZA diagnoza", () => {
		const { container } = renderSummary(c);
		const t = tekst(container);
		// Kolejność w drzewie dokumentu = kolejność zdań, więc czytnik ekranu
		// dostaje dokładnie tę hierarchię, którą widzi wzrok.
		expect(t.indexOf("Masz już zaliczone")).toBeLessThan(t.indexOf("Diagnoza otworzyła dodatkowo"));
		expect(t.indexOf("Diagnoza otworzyła dodatkowo")).toBeLessThan(t.indexOf("Nie badaliśmy"));
		expect(t.indexOf("Nie badaliśmy")).toBeLessThan(t.indexOf("Zacznij od"));
	});
});

describe("§12.6 wariant 10 — brak kandydatów na rekomendację", () => {
	it("10a: wszystko dostępne zaliczone → „Masz zaliczone wszystko, co dziś jest w ścieżce.”", () => {
		const { container } = renderSummary(
			contract({
				completedModules: [{ slug: "sql", title: "SQL" }],
				recommendation: null,
				noRecommendationReason: "all_completed",
				recommendationIsRoot: false,
			}),
		);
		expect(tekst(container)).toContain("Masz zaliczone wszystko, co dziś jest w ścieżce.");
	});

	it("10b: kolejny moduł bez treści → „Kolejny moduł jest w przygotowaniu.”", () => {
		const { container } = renderSummary(
			contract({
				completedModules: [{ slug: "sql", title: "SQL" }],
				recommendation: null,
				noRecommendationReason: "only_coming_soon",
				recommendationIsRoot: false,
			}),
		);
		expect(tekst(container)).toContain("Kolejny moduł jest w przygotowaniu.");
		// Zdanie łączone wariantu 8 wymaga modułu do polecenia — bez niego nie pada.
		expect(tekst(container)).not.toContain("zacznij od");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// REGUŁY TWARDE §12.4 — tu przechodzi mutacja kontrolna.
// ─────────────────────────────────────────────────────────────────────────────
describe("§12.4 reguła 1 — „wypadła słabo” WYŁĄCZNIE przy below_threshold", () => {
	const SLABO = /wypadła (w teście )?słabo/;

	it("no_measurement (zero odblokowań) NIE mówi o słabym wyniku — pytania nie padły", () => {
		const { container } = renderSummary(
			contract({
				hole: { moduleTitle: "EDA", competencyName: "Analiza danych", reason: "no_measurement" },
			}),
		);
		const t = tekst(container);
		expect(t).not.toMatch(SLABO);
		expect(t).toContain(
			"Nie sprawdzaliśmy Analiza danych, więc zaczynamy od początku ścieżki. To nie jest ocena — to brak pomiaru.",
		);
	});

	it("no_measurement (z odblokowaniami) też nie mówi o słabym wyniku", () => {
		const { container } = renderSummary(
			contract({
				unlockedByDiagnosis: [{ slug: "f1", title: "Python I" }],
				hole: { moduleTitle: "EDA", competencyName: "Analiza danych", reason: "no_measurement" },
				recommendation: { slug: "f1", title: "Python I" },
				recommendationIsRoot: false,
			}),
		);
		const t = tekst(container);
		expect(t).not.toMatch(SLABO);
		expect(t).toContain("nie było jej wśród zaznaczonych przez Ciebie kompetencji");
		expect(t).toContain("Dlatego ścieżkę otwieramy do Python I");
	});

	it("uncovered NIE mówi o słabym wyniku — kompetencji nie ma w banku pytań", () => {
		const { container } = renderSummary(
			contract({
				hole: { moduleTitle: "EDA", competencyName: "Analiza danych", reason: "uncovered" },
			}),
		);
		const t = tekst(container);
		expect(t).not.toMatch(SLABO);
		expect(t).toContain("nie mamy do niej pytań w banku");
		expect(t).toContain("To nie jest ocena, tylko brak pomiaru.");
	});

	it("below_threshold MÓWI o słabym wyniku — i tylko on (pytania realnie padły)", () => {
		const { container } = renderSummary(
			contract({
				hole: { moduleTitle: "Python I", competencyName: "Python", reason: "below_threshold" },
			}),
		);
		const t = tekst(container);
		expect(t).toMatch(SLABO);
		expect(t).toContain("To wynik dwóch krótkich pytań, nie ocena Ciebie.");
	});
});

describe("§12.4 reguła 2 — fail-closed", () => {
	it("powód spoza trójki → blok 2b znika, reszta ekranu stoi", () => {
		const { container } = renderSummary(
			contract({
				// Powód poprawny w `PlacementReason`, ale niedopuszczony do bloku 2b.
				// Typ nie przeżywa HTTP, więc obrona musi działać w czasie wykonania.
				hole: {
					moduleTitle: "EDA",
					competencyName: "Analiza danych",
					reason: "beyond_prefix" as never,
				},
			}),
		);
		const t = tekst(container);
		expect(t).not.toContain("EDA");
		expect(t).not.toContain("Analiza danych");
		expect(t).not.toMatch(/nie badaliśmy|nie sprawdzaliśmy|wypadła/i);
		// Rekomendacja (jedyne zdanie z akcją) NIE znika razem z wyjaśnieniem.
		expect(t).toContain("Zacznij od");
	});

	it("dziura bez nazwy kompetencji → brak bloku 2b (komplet albo nic)", () => {
		const { container } = renderSummary(
			contract({
				hole: { moduleTitle: "EDA", competencyName: "", reason: "below_threshold" },
			}),
		);
		expect(tekst(container)).not.toMatch(/wypadła/);
	});

	it("dziura bez tytułu modułu → brak bloku 2b", () => {
		const { container } = renderSummary(
			contract({
				hole: { moduleTitle: "", competencyName: "Python", reason: "below_threshold" },
			}),
		);
		expect(tekst(container)).not.toMatch(/wypadła/);
	});

	it("below_threshold z odblokowaniami: TŁUMACZY (§8 v0.10) — i tylko z pól, które reguła gwarantuje", () => {
		// Do v0.9 to miejsce MILCZAŁO: tekst żądał „kompetencji głębszej", której
		// reguła placementu nie gwarantuje. Sophia przepisała zdanie (v0.10) tak,
		// by stało wyłącznie na dziurze i ostatnim odblokowanym — oba istnieją
		// z definicji. Cisza była poprawna wobec tamtego tekstu, nie wobec tego.
		const { container } = renderSummary(
			contract({
				unlockedByDiagnosis: [
					{ slug: "f1", title: "Python I" },
					{ slug: "f2", title: "Python II" },
				],
				hole: { moduleTitle: "EDA", competencyName: "Analiza danych", reason: "below_threshold" },
				recommendation: { slug: "f2", title: "Python II" },
				recommendationIsRoot: false,
			}),
		);
		const t = tekst(container);
		expect(t).toContain(
			"Analiza danych wypadła w teście słabo, a moduł EDA jest w tej ścieżce fundamentem pod to, co dalej — dlatego otwieramy do Python II.",
		);
		// Zdanie ratujące godność studenta zostaje — to jedyny powód dziury, przy
		// którym realnie odpowiadał na pytania i ma czym je sprawdzić.
		expect(t).toContain("To wynik dwóch krótkich pytań, nie ocena Ciebie.");
		expect(t).toContain("Zdaj jego egzamin (test out) i przeskocz go.");
		expect(t).not.toContain("****");
	});

	it("REGUŁA INTERPOLACJI §8 v0.10: zdanie nie wspomina ŻADNEGO trzeciego modułu", () => {
		// Ochrona przed nawrotem „kompetencji głębszej" pod inną nazwą: w drabinie
		// są moduły, o których to zdanie nie ma prawa mówić — ani zaliczone, ani
		// odblokowane inne niż ostatni.
		// Tytuły dobrane tak, by żaden nie był fragmentem drugiego — inaczej
		// asercja „nie zawiera" przechodziłaby przez przypadek („Python I" jest
		// fragmentem „Python II") i nie pilnowałaby niczego.
		const { container } = renderSummary(
			contract({
				completedModules: [{ slug: "sql", title: "SQL" }],
				unlockedByDiagnosis: [
					{ slug: "f1", title: "Wprowadzenie do Pythona" },
					{ slug: "f2", title: "Pandas" },
				],
				hole: { moduleTitle: "EDA", competencyName: "Analiza danych", reason: "below_threshold" },
				recommendation: { slug: "f2", title: "Pandas" },
				recommendationIsRoot: false,
			}),
		);
		const zdanie = screen.getByText(/wypadła w teście słabo/).textContent ?? "";
		expect(zdanie).toContain("Analiza danych"); // kompetencja z dziury
		expect(zdanie).toContain("EDA"); // tytuł modułu z dziurą
		expect(zdanie).toContain("Pandas"); // ostatni odblokowany
		expect(zdanie).not.toContain("SQL"); // zaliczony — nie jego sprawa
		expect(zdanie).not.toContain("Wprowadzenie do Pythona"); // odblokowany, ale nie ostatni
		expect(container.textContent).toContain("Masz już zaliczone: SQL.");
	});

	it("brak rekomendacji I brak powodu → CAŁA sekcja znika (całość albo nic)", () => {
		const { container } = renderSummary(
			contract({
				completedModules: [{ slug: "sql", title: "SQL" }],
				recommendation: null,
				noRecommendationReason: null,
			}),
		);
		expect(container.innerHTML).toBe("");
	});
});

describe("§12.6 wariant 8 + dziura — warianty zerowe nie kłamią o „początku ścieżki”", () => {
	it("student z zaliczeniami nie dostaje zdania „zaczynamy od początku ścieżki”", () => {
		const { container } = renderSummary(
			contract({
				completedModules: [{ slug: "sql", title: "SQL" }],
				hole: { moduleTitle: "EDA", competencyName: "Analiza danych", reason: "no_measurement" },
				recommendation: { slug: "eda2", title: "EDA II" },
				recommendationIsRoot: false,
			}),
		);
		expect(tekst(container)).not.toContain("od początku ścieżki");
	});
});

describe("Dostępność i etykiety strukturalne (§12.3 — nagłówki to też mikrocopy)", () => {
	it("nagłówek i nazwa regionu brzmią IDENTYCZNIE: „Po diagnozie”", () => {
		renderSummary(contract({ completedModules: [{ slug: "sql", title: "SQL" }] }));
		expect(screen.getByRole("heading", { name: "Po diagnozie" })).toBeInTheDocument();
		expect(screen.getByRole("region", { name: "Po diagnozie" })).toBeInTheDocument();
		// Odrzucone brzmienie „Twoja ścieżka" (§12.3) nie może wrócić bocznymi drzwiami.
		expect(screen.queryByText(/Twoja ścieżka/)).not.toBeInTheDocument();
	});

	it("§12.10: zero pasków postępu, procentów i elementów interaktywnych w sekcji", () => {
		const { container } = renderSummary(
			contract({
				completedModules: [{ slug: "sql", title: "SQL" }],
				unlockedByDiagnosis: [{ slug: "f1", title: "Python I" }],
				recommendation: { slug: "f1", title: "Python I" },
				recommendationIsRoot: false,
			}),
		);
		expect(container.querySelector("[role='progressbar']")).toBeNull();
		expect(container.querySelector("a")).toBeNull();
		expect(container.querySelector("button")).toBeNull();
		expect(tekst(container)).not.toMatch(/\d+%/);
	});

	it("§12.7 pkt 5: żadnej obietnicy powtórzenia testu", () => {
		const { container } = renderSummary(
			contract({
				hole: { moduleTitle: "Python I", competencyName: "Python", reason: "below_threshold" },
			}),
		);
		expect(tekst(container)).not.toMatch(/powtórz|spróbuj ponownie|jeszcze raz/i);
	});
});
