// @vitest-environment jsdom
/**
 * STRAŻNIK — jedna informacja zwrotna, wypisana raz (CLAUDE.md v1.17).
 *
 * CZEGO PILNUJE (reguła o konsekwencji zewnętrznej — to widzi student):
 * żaden akapit REGIONU INFORMACJI ZWROTNEJ (`role="status"`, element `<output>`)
 * nie powtarza się. Zakres jest celowo węższy niż całe okno pytania: powtórzenie
 * fragmentu treści pytania wewnątrz informacji zwrotnej strażnik PRZEPUSZCZA —
 * to osobne pytanie (czy takie powtórzenie jest wadą, czy zamierzone), którego
 * to zgłoszenie nie rozstrzyga. Zawężenie z przeglądu Leo (W1, #292).
 *
 * DLACZEGO ISTNIEJE (zgłoszenie 8 z przejazdu Darka, 2026-08-10):
 * kontrakt treści mówi wprost „`explanationMd` pytania = feedback opcji poprawnej"
 * (docs/design/curriculum-atomy-format-spec-v0.1.md §4), a packer wyprowadza jedno
 * pole z drugiego (tools/pack-curriculum-atoms.ts:1338) — oba pola niosą więc TEN SAM
 * tekst Z ZAŁOŻENIA, w 129 ze 129 pytań drabinki. Widok renderował oba i wypisywał
 * zdanie dwa razy przy każdej poprawnej odpowiedzi w całym produkcie.
 *
 * DWUSTRONNOŚĆ (v1.17): strażnik czerwieni się na dublowaniu ORAZ pilnuje, że naprawa
 * nie połknęła wyjaśnienia tam, gdzie jest ono jedyną informacją zwrotną — żadne
 * ze 144 pytań banku egzaminacyjnego nie ma feedbacku opcji, a wszystkie 144 mają
 * `explanationMd` (zmierzone na `question-bank-ds-partia-1.json`, 2026-08-12).
 *
 * ZNANA GRANICA — dług D-292.1 (przegląd Leo, #292): porównanie idzie po tekście
 * ŹRÓDŁOWYM, a dublowanie jest zjawiskiem tekstu WYRENDEROWANEGO. Dwa zapisy różne
 * w źródle, a identyczne na ekranie (`*napis*` kontra `_napis_`, podwójna spacja
 * w środku zdania) przejdą przez warunek i strażnik ich nie złapie. Dziś nieosiągalne,
 * bo pakowarka kopiuje bajt w bajt — ale specyfikacja (pkt 4) jawnie dopuszcza edycję
 * obu pól w miejscu, w bazie. PRÓG: przy pierwszej ręcznej edycji `explanationMd`
 * albo `option_feedback_json` w bazie przenieść porównanie na tekst wyrenderowany.
 *
 * MUTACJA DOWODOWA — patrz nagłówek zgłoszenia; przywrócenie bezwarunkowego
 * renderu `explanationMd` w item-runner.tsx czerwieni przypadki 1–3.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurriculumQuestion } from "@/lib/curriculum/item-view";
import { ItemRunner } from "../item-runner";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const questions: CurriculumQuestion[] = [
	{
		id: "q-1",
		type: "single_choice",
		stem: 'Jakiego typu jest wartość `"3.14"` (dokładnie tak zapisana)?',
		options: ["Napis (str)", "Liczba (float)"],
	},
];

function mockAnswer(body: Record<string, unknown>) {
	return vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: async () => ({
			explanationMd: null,
			optionFeedbackMd: null,
			itemCompleted: false,
			moduleCompleted: false,
			...body,
		}),
	});
}

async function answerAndGetFeedback(body: Record<string, unknown>) {
	const user = userEvent.setup();
	vi.stubGlobal("fetch", mockAnswer(body));
	render(
		<ItemRunner
			itemId="i-1"
			moduleId="m-1"
			questions={questions}
			answeredCorrectQuestionIds={[]}
			hintsByQuestion={{}}
			hintsTotal={0}
			initialStatus="available"
			confidenceProbeEnabled={false}
		/>,
	);
	await user.click(screen.getByLabelText("Napis (str)"));
	await user.click(screen.getByRole("button", { name: "Sprawdź" }));
	await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
	return screen.getByRole("status");
}

/** Akapity informacji zwrotnej, bez wiersza werdyktu („Dobrze" / „Jeszcze nie"). */
function feedbackParagraphs(region: HTMLElement): string[] {
	return Array.from(region.querySelectorAll("p"))
		.map((p) => (p.textContent ?? "").replace(/\s+/g, " ").trim())
		.filter((t) => t.length > 0 && t !== "Dobrze" && t !== "Jeszcze nie — spróbuj ponownie");
}

/**
 * Sedno strażnika. Zdanie wypisane dwa razy = ten sam akapit dwa razy w regionie
 * informacji zwrotnej. Asercja jest OGÓLNA w obrębie tego regionu (dowolny duplikat),
 * nie przywiązana do dwóch konkretnych pól — przeżyje refaktor, który przeniesie
 * dublowanie w inne miejsce TEGO REGIONU. Poza region nie sięga (W1).
 */
function expectNoDuplicateParagraph(region: HTMLElement) {
	const paragraphs = feedbackParagraphs(region);
	const seen = new Map<string, number>();
	for (const p of paragraphs) seen.set(p, (seen.get(p) ?? 0) + 1);
	const duplicates = [...seen.entries()].filter(([, n]) => n > 1);
	expect(
		duplicates.map(([text, n]) => `${n}× „${text}"`),
		"ta sama treść wypisana więcej niż raz w oknie pytania",
	).toEqual([]);
}

// Treść dosłownie ze zrzutów Darka i co do znaku z tools/content/curriculum-atoms/f1-python-1.json.
const REALNE_ZDANIE = 'Tak. `"3.14"` tylko WYGLĄDA jak liczba; dla Pythona to napis, jak `"Ala"`.';
const REALNE_ZDANIE_2 =
	"Tak — kropka dziesiętna, bez cudzysłowu: liczba typu `float`, gotowa do obliczeń.";

describe("ItemRunner — informacja zwrotna nie dubluje się", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("1. pola identyczne (129/129 pytań drabinki) → zdanie widoczne DOKŁADNIE raz", async () => {
		const region = await answerAndGetFeedback({
			correct: true,
			explanationMd: REALNE_ZDANIE,
			optionFeedbackMd: REALNE_ZDANIE,
		});

		expectNoDuplicateParagraph(region);
		// Kontrola pozytywna: zdanie nie zniknęło, tylko przestało się powtarzać.
		expect(within(region).getAllByText(/tylko WYGLĄDA jak liczba/)).toHaveLength(1);
	});

	it("2. drugie pytanie ze zrzutu Darka — ten sam kształt, ta sama reguła", async () => {
		const region = await answerAndGetFeedback({
			correct: true,
			explanationMd: REALNE_ZDANIE_2,
			optionFeedbackMd: REALNE_ZDANIE_2,
		});

		expectNoDuplicateParagraph(region);
		expect(within(region).getAllByText(/kropka dziesiętna/)).toHaveLength(1);
	});

	it("3. różnica wyłącznie w białych znakach też jest dublowaniem", async () => {
		const region = await answerAndGetFeedback({
			correct: true,
			explanationMd: `  ${REALNE_ZDANIE}\n`,
			optionFeedbackMd: REALNE_ZDANIE,
		});

		expectNoDuplicateParagraph(region);
	});

	// --- Kontrola dwustronna: naprawa nie może połknąć treści, która coś wnosi ---

	it("4. pola RÓŻNE → widoczne oba (wyjaśnienie nie jest połykane)", async () => {
		const region = await answerAndGetFeedback({
			correct: true,
			optionFeedbackMd: "Tak — to napis.",
			explanationMd: "Cudzysłów przesądza o typie, nie wygląd zawartości.",
		});

		expectNoDuplicateParagraph(region);
		expect(within(region).getByText(/to napis/)).toBeInTheDocument();
		expect(within(region).getByText(/Cudzysłów przesądza/)).toBeInTheDocument();
	});

	it("5. brak feedbacku opcji (bank egzaminacyjny, 144/144) → wyjaśnienie MUSI się pokazać", async () => {
		const region = await answerAndGetFeedback({
			correct: true,
			optionFeedbackMd: null,
			explanationMd: "Wyjaśnienie jest tu jedyną informacją zwrotną.",
		});

		expect(within(region).getByText(/jedyną informacją zwrotną/)).toBeInTheDocument();
	});

	it("6. błędna odpowiedź: feedback opcji zostaje, klucz nie wycieka", async () => {
		const region = await answerAndGetFeedback({
			correct: false,
			optionFeedbackMd: "Nie — cudzysłów robi z tego napis.",
			explanationMd: REALNE_ZDANIE,
		});

		expectNoDuplicateParagraph(region);
		expect(within(region).getByText(/cudzysłów robi z tego napis/)).toBeInTheDocument();
		// Wyjaśnienie poprawnej opcji nie ma prawa pokazać się przy błędzie (R13/klucz).
		expect(within(region).queryByText(/tylko WYGLĄDA jak liczba/)).not.toBeInTheDocument();
	});
});
