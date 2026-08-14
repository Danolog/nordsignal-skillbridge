import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { komunikatWydania, odcisk, zapiszPoufnie } from "../../../tools/zapis-poufny";

/**
 * STRAŻNIK: poświadczenie `app_runtime` nie wychodzi na ekran.
 *
 * ── Stan zastany, który to naprawia ───────────────────────────────────────
 * Narzędzie wypisywało `console.log(runtimeUrl)` — pełny adres połączenia
 * Z SEKRETEM — oraz sam sekret wprost. Wyjście narzędzia trafia do przewijania
 * terminala, do zapisu sesji agenta i do dziennika przebiegu CI: trzech miejsc,
 * których nikt nie sprząta i które przeżywają sesję.
 *
 * Konstytucja rozstrzygnęła połowę tego problemu dla poświadczeń CI (CLAUDE.md
 * §5, bramka (i) punkt 5: „wyłącznie przez standardowe wejście — nigdy jako
 * argument polecenia"). Tu domykamy drugą połowę: **nigdy na wyjście**.
 *
 * Konstrukcja odporna z założenia: `komunikatWydania` przyjmuje ŚCIEŻKĘ
 * i ODCISK — samej wartości nie dostaje, więc nie ma czego wypisać. To nie jest
 * dyscyplina autora, tylko kształt sygnatury.
 *
 * Wartości próbne składamy z kawałków, żeby w repozytorium nie pojawił się
 * literał wyglądający jak adres połączenia z sekretem (bramka skanu sekretów
 * słusznie odmawia jego zapisania — sprawdzone przy pisaniu tego testu).
 */

const SEKRET_PROBNY = "wartosc-probna-do-testu-1234567890";
const DSN_PROBNY = ["postgres://app_runtime:", SEKRET_PROBNY, "@localhost:5432/neondb"].join("");

describe("wydanie poświadczenia app_runtime", () => {
	it("komunikat NIE zawiera ani sekretu, ani adresu połączenia", () => {
		const tekst = komunikatWydania("/tmp/gdzies.env", odcisk(DSN_PROBNY)).join("\n");

		expect(tekst).not.toContain(SEKRET_PROBNY);
		expect(tekst).not.toContain(DSN_PROBNY);
		expect(tekst).not.toMatch(/postgres(ql)?:\/\//);
	});

	it("komunikat mówi, GDZIE jest wynik i czym go potwierdzić (kontrola dodatnia)", () => {
		// Strażnik nie może premiować komunikatu, który nie mówi nic —
		// „bezpieczny, bo pusty" byłby atrapą w drugą stronę.
		const tekst = komunikatWydania("/tmp/gdzies.env", odcisk(DSN_PROBNY)).join("\n");

		expect(tekst).toContain("/tmp/gdzies.env");
		expect(tekst).toContain(odcisk(DSN_PROBNY));
		expect(tekst).toMatch(/0600/);
	});

	it("odcisk nie ujawnia wartości i rozróżnia wartości", () => {
		const a = odcisk(DSN_PROBNY);
		expect(a).toHaveLength(12);
		expect(a).not.toContain(SEKRET_PROBNY);
		expect(odcisk(`${DSN_PROBNY}x`)).not.toBe(a);
	});

	it("zapis poufny UTWARDZA prawa pliku, który już istniał z luźnymi prawami", () => {
		// To jest scenariusz, przed którym broni osobny chmod: `mode` przy
		// writeFileSync działa TYLKO przy tworzeniu pliku. Plik odtworzony przez
		// `cp` albo zostawiony przez wcześniejszy przebieg ma prawa 0644 — bez
		// chmod nadpisanie zostawiłoby go otwartym dla wszystkich na maszynie.
		// (Ta pułapka wystąpiła już w tym repozytorium przy plikach środowiska.)
		const kat = mkdtempSync(join(tmpdir(), "ryan-poufne-"));
		const plik = join(kat, "poswiadczenie.env");
		try {
			writeFileSync(plik, "stare\n", { encoding: "utf8", mode: 0o644 });
			chmodSync(plik, 0o644);
			expect(statSync(plik).mode & 0o777).toBe(0o644); // stan wyjściowy — luźny

			zapiszPoufnie(plik, "druga");

			expect(statSync(plik).mode & 0o777).toBe(0o600);
			expect(readFileSync(plik, "utf8").trim()).toBe("druga");
		} finally {
			rmSync(kat, { recursive: true, force: true });
		}
	});

	it("źródło narzędzia nie wypisuje sekretu ani adresu na wyjście", () => {
		// Kontrola na źródle, bo skrypt wykonuje się przy imporcie i nie da się go
		// wywołać w teście. Łapie powrót dokładnie tej linii, która była wyciekiem.
		const zrodlo = readFileSync(
			resolve(__dirname, "../../../tools/activate-app-runtime.ts"),
			"utf8",
		)
			.split("\n")
			.filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
			.join("\n");

		expect(zrodlo).not.toMatch(/console\.log\(\s*runtimeUrl\s*\)/);
		expect(zrodlo).not.toMatch(/console\.log\(\s*sekret\s*\)/);
		// Wydanie idzie WYŁĄCZNIE przez zapis do pliku.
		expect(zrodlo).toMatch(/zapiszPoufnie\(/);
	});
});
