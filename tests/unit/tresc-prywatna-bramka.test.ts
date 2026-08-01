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

import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
	brakiTresci,
	MANIFEST_TRESCI,
	REPO_TRESCI,
	TRYB_OPCJONALNY,
} from "../../tools/tresc-prywatna";

const braki = brakiTresci();

/** Czy git IGNOROWAŁBY tę ścieżkę. `--no-index` = pytamy o samą regułę .gitignore. */
function ignorowanyPrzezGita(rel: string): boolean {
	try {
		execFileSync("git", ["check-ignore", "--no-index", "-q", "--", rel], { stdio: "pipe" });
		return true; // kod 0 = ścieżka pasuje do reguły ignorowania
	} catch {
		return false; // kod 1 = żadna reguła jej nie łapie
	}
}

/** Czy git ŚLEDZI tę ścieżkę (jest w indeksie). */
function sledzonyPrzezGita(rel: string): boolean {
	try {
		execFileSync("git", ["ls-files", "--error-unmatch", "--", rel], { stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}

describe("bramka treści prywatnej (klucze odpowiedzi)", () => {
	it("manifest niepusty — inaczej bramka pilnowałaby pustego zbioru", () => {
		expect(MANIFEST_TRESCI.length).toBeGreaterThanOrEqual(20);
	});

	// ── W2 (audyt Ryana) ────────────────────────────────────────────────────
	// `MANIFEST_TRESCI` i `.gitignore` to dwie ręcznie utrzymywane listy, a runbook
	// §2 każe dopisywać do OBU. Pierwsze przeoczenie kładzie klucz odpowiedzi
	// w publicznym repo — czyli dokładnie to, przed czym broni ten PR. Te dwa testy
	// zamieniają „pamiętaj, żeby" w bramkę maszynową.
	it("KAŻDA pozycja manifestu jest objęta regułą .gitignore", () => {
		const nieignorowane = MANIFEST_TRESCI.filter((rel) => !ignorowanyPrzezGita(rel));
		expect(
			nieignorowane,
			[
				"Te pliki treści NIE są ignorowane przez gita, więc `git add -A` wrzuci",
				"klucze odpowiedzi do PUBLICZNEGO repo:",
				...nieignorowane.map((p) => `  - ${p}`),
				"Dopisz regułę do .gitignore (patrz sekcja „TREŚĆ PRYWATNA”).",
			].join("\n"),
		).toEqual([]);
	});

	it("ŻADNA pozycja manifestu nie jest śledzona przez gita", () => {
		const sledzone = MANIFEST_TRESCI.filter((rel) => sledzonyPrzezGita(rel));
		expect(
			sledzone,
			[
				"Te pliki treści są w indeksie gita — .gitignore NIE działa na pliki już",
				"śledzone, więc klucze odpowiedzi są publiczne mimo reguły ignorowania:",
				...sledzone.map((p) => `  - ${p}`),
				"Usuń je ze stanu bieżącego: `git rm --cached <ścieżka>`.",
			].join("\n"),
		).toEqual([]);
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
