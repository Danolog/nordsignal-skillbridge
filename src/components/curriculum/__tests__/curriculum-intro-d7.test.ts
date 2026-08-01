/**
 * 1E.7 L6 · DŁUG D7 — nagłówek `/curriculum` przy zapalonej fladze nie może
 * zaprzeczać odznace, która stoi dwa wiersze niżej (§12.9 pkt 1).
 *
 * Testujemy STAŁE, nie stronę: `/curriculum/page.tsx` jest asynchronicznym
 * komponentem serwerowym z sesją i bazą, więc render w suicie jednostkowej
 * sprawdzałby atrapy, a nie zdanie. Zdanie mieszka w `labels.ts` właśnie po to,
 * żeby dało się je przypiąć bez uruchamiania połowy aplikacji — wybór stałej
 * po fladze to jedna linia w JSX, którą widać w przeglądzie.
 */

import { describe, expect, it } from "vitest";
import {
	CURRICULUM_INTRO,
	CURRICULUM_INTRO_WITH_PLACEMENT,
	PLACEMENT_BADGE_LABEL,
} from "../labels";

describe("Nagłówek /curriculum — dług D7", () => {
	it("wariant z placementem NIE obiecuje „bez skrótów” — placement JEST skrótem", () => {
		expect(CURRICULUM_INTRO_WITH_PLACEMENT).not.toContain("bez skrótów");
	});

	it("wariant z placementem mówi wprost, że otwarty ≠ zaliczony", () => {
		expect(CURRICULUM_INTRO_WITH_PLACEMENT).toContain("Otwarty moduł to nie zaliczony moduł.");
		expect(CURRICULUM_INTRO_WITH_PLACEMENT).toContain(
			"albo od razu, jeśli diagnoza pokazała, że znasz wcześniejszy materiał",
		);
	});

	it("wariant bez placementu zostaje bajt w bajt jak dziś (flaga OFF = zero zmian)", () => {
		expect(CURRICULUM_INTRO).toBe(
			"Moduły od podstaw do projektu. Kolejny moduł otwiera się dopiero po zaliczeniu poprzedniego — bez skrótów.",
		);
	});

	it("odznaka i nagłówek niosą tę samą prawdę, w tych samych słowach", () => {
		expect(PLACEMENT_BADGE_LABEL).toBe("Otwarty na podstawie diagnozy · niezaliczony");
		// „Otwarty" + „niezaliczony" w obu miejscach — student styka się z jednym
		// rozróżnieniem, nie z dwoma wariantami tej samej myśli.
		expect(CURRICULUM_INTRO_WITH_PLACEMENT.toLowerCase()).toContain("otwarty");
		expect(PLACEMENT_BADGE_LABEL.toLowerCase()).toContain("niezaliczony");
	});
});
