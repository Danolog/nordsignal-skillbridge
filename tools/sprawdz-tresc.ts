/**
 * Preflight treści prywatnej — `pnpm tresc:sprawdz`.
 *
 * Odpalany w CI ZARAZ PO kroku zaciągu, ZANIM ruszą testy. Sens: gdy zaciąg z
 * prywatnego repo padnie po cichu (zły sekret, zmieniona ścieżka, pusty
 * checkout), chcemy komunikatu „brakuje pliku X", a nie sterty ENOENT-ów w
 * połowie suity albo — gorzej — pominiętych kontraktów.
 *
 * Kod wyjścia 1 przy jakimkolwiek braku. Nie ma trybu pobłażliwego: krok w
 * workflow jest po prostu POMIJANY dla PR-ów z forka (jawnie, z `::warning::`),
 * a nie „miękko przepuszczany".
 */

import { brakiTresci, MANIFEST_TRESCI, REPO_TRESCI } from "./tresc-prywatna";

const braki = brakiTresci();

if (braki.length === 0) {
	console.log(
		`Treść prywatna kompletna: ${MANIFEST_TRESCI.length}/${MANIFEST_TRESCI.length} plików z ${REPO_TRESCI}.`,
	);
	process.exit(0);
}

console.error(
	`::error title=Brak treści prywatnej::Brakuje ${braki.length} z ${MANIFEST_TRESCI.length} plików treści (${REPO_TRESCI}).`,
);
for (const p of braki) console.error(`  - ${p}`);
console.error("");
console.error("Zaciąg nie dowiózł plików. Sprawdź sekret CONTENT_REPO_KEY (deploy key");
console.error("read-only repo treści) oraz konkluzję kroku „Zaciąg treści prywatnej”.");
console.error("Lokalnie: `pnpm tresc:sync`.");
process.exit(1);
