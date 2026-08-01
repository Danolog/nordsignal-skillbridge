/**
 * BRAMKA TREŚCI PRYWATNEJ — jeden test, który zawsze biegnie, w każdym trybie.
 *
 * Odpowiada na pytanie, na które licznik „X passed" nie odpowiada: czy suita
 * kontraktowa treści FAKTYCZNIE się wykonała, czy tylko nic nie pobiegło.
 *
 * Precedens, którego nie powtarzamy: `pnpm test:integration` bez DATABASE_URL
 * pomijał 46 z 51 plików, kończył się kodem 0 i wypisywał te same totale w
 * nawiasach co pełny przebieg. „Zielone" znaczyło wtedy dokładnie nic. Tu
 * pominięcie musi być JAWNIE zadeklarowane w środowisku i zostawia ślad
 * (`::warning::`) w logu GitHuba.
 *
 * Ten plik NIE czyta żadnego pliku treści — sprawdza wyłącznie stan świata,
 * więc nigdy nie pada z powodu braku treści „przypadkiem".
 */

import { describe, expect, it } from "vitest";
import {
	brakiTresci,
	MANIFEST_TRESCI,
	REPO_TRESCI,
	TRYB_OPCJONALNY,
} from "../../tools/tresc-prywatna";

const braki = brakiTresci();

describe("bramka treści prywatnej (klucze odpowiedzi)", () => {
	it("manifest niepusty — inaczej bramka pilnowałaby pustego zbioru", () => {
		expect(MANIFEST_TRESCI.length).toBeGreaterThanOrEqual(20);
	});

	it("treść jest obecna ALBO jej brak jest jawnie zadeklarowany (nigdy po cichu)", () => {
		if (braki.length === 0) return; // stan normalny — treść zaciągnięta

		if (TRYB_OPCJONALNY) {
			// Fork bez sekretu (albo świadomy przebieg lokalny). Zostaw ślad w logu
			// runnera — pominięcie ma być WIDOCZNE, nie domyślne.
			const ost =
				`Treść prywatna (${REPO_TRESCI}) nieobecna — ${braki.length}/${MANIFEST_TRESCI.length} ` +
				"plików brak. Kontrakty treści POMINIĘTE (SKILLBRIDGE_TRESC_OPCJONALNA=1). " +
				"Ten przebieg NIE dowodzi poprawności banku pytań ani atomów.";
			console.warn(`::warning title=Treść prywatna pominięta::${ost}`);
			expect(TRYB_OPCJONALNY).toBe(true);
			return;
		}

		// Nasz CI / lokalny przebieg bez deklaracji — twardy błąd z listą braków.
		throw new Error(
			[
				`Brak ${braki.length}/${MANIFEST_TRESCI.length} plików treści prywatnej, a tryb`,
				"opcjonalny NIE jest zadeklarowany. To NIE jest powód do zielonego przebiegu.",
				"",
				"Brakuje:",
				...braki.map((p) => `  - ${p}`),
				"",
				`Źródło: ${REPO_TRESCI} (prywatne).`,
				"CI: sprawdź konkluzję kroku „Zaciąg treści prywatnej” i sekret CONTENT_REPO_KEY.",
				"Lokalnie: `pnpm tresc:sync`.",
				"Świadome pominięcie (fork): SKILLBRIDGE_TRESC_OPCJONALNA=1.",
			].join("\n"),
		);
	});
});
