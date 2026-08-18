/**
 * Uzbrojenie strażnika żywej sieci — plik startowy projektu `integration`.
 *
 * Podpięty WYŁĄCZNIE pod projekt `integration` (`vitest.config.mts`), nie pod
 * wspólny `setup.ts`. Powód jest konkretny: projekt `evals` woła prawdziwy model
 * przez sieć z założenia (tam żywe wyjście jest przedmiotem testu, nie awarią),
 * a wspólny plik startowy uzbroiłby strażnika także jemu i wywrócił cały
 * harness ewaluacyjny. Wzorzec doklejania własnego pliku startowego do jednego
 * projektu jest już w tym repo (`tests/evals/setup.ts`).
 *
 * Reguła i jej uzasadnienie mają JEDEN nośnik: `src/test/network-guard.ts`.
 * Ten plik tylko ją woła — nie powtarza (CLAUDE.md §8, v1.17).
 */

import { afterEach } from "vitest";
import {
	pobierzNaruszenia,
	wyczyscNaruszenia,
	zainstalujStraznikaSieci,
	zbudujKomunikat,
} from "./network-guard";

zainstalujStraznikaSieci();

/**
 * Sprawdzenie PO teście — to ono czyni strażnika odpornym na produkcyjne
 * `catch`. Sam rzut z podmienionego `fetch` bywa łykany przez kod produkcyjny
 * (`githubGet` zwraca `null` przy dowolnym wyjątku), więc bez tego haka test
 * byłby zielony mimo naruszenia. Pełne wyjaśnienie: `network-guard.ts`.
 */
afterEach(() => {
	const naruszenia = pobierzNaruszenia();
	if (naruszenia.length === 0) return;
	// Czyścimy PRZED rzutem, żeby jedno naruszenie nie czerwieniło kolejnych testów.
	wyczyscNaruszenia();
	throw new Error(zbudujKomunikat(naruszenia));
});
