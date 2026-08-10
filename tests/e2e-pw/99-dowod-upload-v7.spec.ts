import { expect, test } from "@playwright/test";

/**
 * PLIK JEDNORAZOWY — DOWÓD, NIE TEST PRODUKTU. Kasowany razem z gałęzią
 * `dowod/upload-artifact-v7`. NIE scalać do `main`.
 *
 * PO CO TO ISTNIEJE (warunek Leo do PR #83, review 2026-08-10):
 * kroki wgrywające raport Playwrighta biegną w `.github/workflows/pr.yml` pod
 * `if: failure()`. Zielony przebieg ich NIE wykonuje, więc zielony komplet nie
 * mówi nic o tym, czy `actions/upload-artifact@v7` faktycznie wgrywa artefakt.
 * Zmiana z #83 (skok v4 -> v7 w pięciu miejscach) jest więc zmianą, której żadna
 * zielona bramka nie dotyka. Żeby ją sprawdzić, trzeba bramkę zaczerwienić celowo.
 *
 * DLACZEGO REALNY PAD, A NIE `exit 1` PO ZIELONYM PRZEBIEGU:
 * `exit 1` też uruchomiłby krok wgrywający, ale wgrałby raport SAMYCH ZIELONYCH
 * testów — bez śladu (`trace: retain-on-failure`) i bez zrzutu ekranu
 * (`screenshot: only-on-failure`), czyli bez tych elementów, dla których ten
 * artefakt w ogóle istnieje. Dowód ma przejść tę samą ścieżkę co realna awaria,
 * nie ścieżkę do niej podobną.
 */
test("DOWÓD #83: celowy pad generuje raport, ślad i zrzut ekranu do wgrania", async ({
	page,
}) => {
	await page.goto("/");

	// Celowo fałszywa asercja. Tytuł strony nie jest tym łańcuchem i nigdy nie będzie.
	await expect(page).toHaveTitle(
		"CELOWY-PAD-DOWODU-UPLOAD-ARTIFACT-V7-NIE-SCALAC",
		{ timeout: 5_000 },
	);
});
