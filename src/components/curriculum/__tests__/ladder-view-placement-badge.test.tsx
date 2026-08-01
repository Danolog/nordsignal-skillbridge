// @vitest-environment jsdom
/**
 * 1E.7 L6 · POWIERZCHNIA B — odznaka „Otwarty na podstawie diagnozy · niezaliczony"
 * (§12.9 pkt 2, projekt Mili §4.1–§4.3).
 *
 * Pierwszy test tego pliku (migawka) powstał PRZED dołożeniem odznaki do
 * `ladder-view.tsx` i utrwala HTML drabiny sprzed L6. Przy `openedByPlacementEver:false`
 * — czyli m.in. zawsze przy zgaszonej fladze `placementDiagnostic`, bo wtedy
 * `getLadder` nie wczytuje zbioru placementu — wiersz musi zostać bajt w bajt.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PLACEMENT_BADGE_LABEL } from "../labels";
import { type LadderModuleWithProgress, LadderView } from "../ladder-view";
import { shouldShowPlacementBadge } from "../placement-badge";

function m(over: Partial<LadderModuleWithProgress> = {}): LadderModuleWithProgress {
	return {
		id: "m-1",
		slug: "f1-python-1",
		title: "Python I",
		description: "Podstawy języka",
		position: 2,
		status: "available",
		verifiedByMethod: null,
		itemCount: 8,
		openedByPlacementEver: false,
		completedItems: 0,
		...over,
	};
}

describe("LadderView — inwariant „brak placementu = drabina jak dziś”", () => {
	// ⚠ NAZWA TEGO TESTU JEST CZĘŚCIĄ KLUCZA MIGAWKI i dlatego świadomie niesie
	// STARĄ nazwę pola (`openedByPlacement`, przed W6). Zmiana tytułu utworzyłaby
	// NOWĄ migawkę, wygenerowaną PO zmianie — a wartością tej migawki jest wyłącznie
	// to, że powstała PRZED nią (14:49, przed pierwszą edycją kodu). Przepisanie
	// tytułu skasowałoby dowód „bajt w bajt jak dziś", zostawiając zieloną kropkę
	// bez treści. Tytuł zostaje do czasu, aż migawka przestanie być dowodem.
	it("openedByPlacement:false → HTML wiersza identyczny jak przed L6 (migawka sprzed zmiany)", () => {
		const { container } = render(
			<LadderView
				modules={[
					m({ id: "m-0", slug: "l0-start", title: "Start: środowisko pracy", position: 1 }),
					m(),
					m({ id: "m-2", slug: "m-eda", title: "EDA", position: 3, status: "locked" }),
				]}
			/>,
		);
		expect(container.innerHTML).toMatchSnapshot();
	});

	it("bez odznaki placementu nie ma jej tekstu na ekranie", () => {
		render(<LadderView modules={[m()]} />);
		expect(screen.queryByText(/Otwarty na podstawie diagnozy/)).not.toBeInTheDocument();
	});
});

describe("shouldShowPlacementBadge — warunek prezentacji w JEDNYM miejscu", () => {
	// Pole niesie HISTORIĘ („czy kiedykolwiek"), odznaka mówi o TERAZ. Rozjazd
	// tych dwóch pytań jest jedyną drogą, którą student zobaczy „niezaliczony"
	// na module, który właśnie zdał — dlatego warunek ma własną nazwę i własny test,
	// niezależny od tego, czy ktoś akurat renderuje drabinę.
	it("historia bez stanu nie wystarcza: zaliczony moduł NIE dostaje odznaki", () => {
		expect(shouldShowPlacementBadge({ openedByPlacementEver: true, status: "completed" })).toBe(
			false,
		);
	});

	it("moduł otwarty diagnozą i niezaliczony: odznaka TAK (dostępny i w trakcie)", () => {
		expect(shouldShowPlacementBadge({ openedByPlacementEver: true, status: "available" })).toBe(
			true,
		);
		expect(shouldShowPlacementBadge({ openedByPlacementEver: true, status: "in_progress" })).toBe(
			true,
		);
	});

	it("brak prowenicji: żaden status nie wywoła odznaki (m.in. cała drabina przy fladze OFF)", () => {
		for (const status of [
			"locked",
			"available",
			"in_progress",
			"completed",
			"coming_soon",
		] as const) {
			expect(shouldShowPlacementBadge({ openedByPlacementEver: false, status })).toBe(false);
		}
	});
});

describe("LadderView — odznaka „Otwarty na podstawie diagnozy · niezaliczony”", () => {
	it("moduł otwarty diagnozą dostaje odznakę OBOK statusu, nie zamiast niego", () => {
		render(<LadderView modules={[m({ openedByPlacementEver: true, status: "available" })]} />);
		expect(screen.getByText(PLACEMENT_BADGE_LABEL)).toBeInTheDocument();
		// Status mówi „dostępny", odznaka mówi SKĄD ta dostępność (§12.9 pkt 2).
		expect(screen.getByText("Dostępny")).toBeInTheDocument();
	});

	it("moduł zaczęty (in_progress) też ją pokazuje — otwarcie ≠ zaliczenie", () => {
		render(<LadderView modules={[m({ openedByPlacementEver: true, status: "in_progress" })]} />);
		expect(screen.getByText(PLACEMENT_BADGE_LABEL)).toBeInTheDocument();
	});

	it("PODWÓJNY GUARD: po zaliczeniu odznaka znika, choć wiersz placementu ZOSTAJE", () => {
		// Wiersz w `curriculum_placements` jest niezmienny i nigdy nie znika, więc
		// `openedByPlacementEver` pozostaje `true` na zawsze. Gdyby front ufał wyłącznie
		// jemu, student z zaliczonym modułem czytałby „niezaliczony" o module,
		// który właśnie zdał egzaminem — czyli produkt zaprzeczający własnym danym.
		render(<LadderView modules={[m({ openedByPlacementEver: true, status: "completed" })]} />);
		expect(screen.queryByText(PLACEMENT_BADGE_LABEL)).not.toBeInTheDocument();
		expect(screen.getByText("Zaliczony")).toBeInTheDocument();
	});

	it("odznaka jest CZYTELNA TEKSTEM (nie kolorem) i nie jest elementem interaktywnym", () => {
		render(<LadderView modules={[m({ openedByPlacementEver: true })]} />);
		const odznaka = screen.getByText(PLACEMENT_BADGE_LABEL);
		// Pełne zdanie w treści = informacja niezależna od percepcji koloru (WCAG 1.4.1).
		expect(odznaka.textContent).toBe("Otwarty na podstawie diagnozy · niezaliczony");
		expect(odznaka.tagName).toBe("SPAN");
		expect(odznaka.closest("a")).not.toBeNull(); // leży wewnątrz wiersza-linku…
		expect(odznaka.closest("button")).toBeNull(); // …ale sama nie jest kontrolką
	});

	it("nazwa dostępna wiersza-linku nadal zawiera TYTUŁ modułu, nie samą odznakę", () => {
		// Dlaczego to jest test, a nie oczywistość: projekt Mili (§6) proponował
		// `aria-label` na kontenerze odznak. Kontener obejmuje też `<h2>` z tytułem,
		// a `aria-label` na potomku linku PODMIENIA jego nazwę wyliczaną z treści —
		// link straciłby tytuł modułu i wszystkie wiersze brzmiałyby tak samo.
		// Odznaka jest pełnym zdaniem, więc czytnik i tak ją przeczyta bez etykiety.
		render(<LadderView modules={[m({ openedByPlacementEver: true })]} />);
		const link = screen.getByRole("link");
		expect(link).toHaveAccessibleName(expect.stringContaining("Python I"));
		expect(link).toHaveAccessibleName(expect.stringContaining(PLACEMENT_BADGE_LABEL));
	});
});
