/**
 * sprawdz-licznosc-e2e — bramka LICZNOŚCI dla pakietów Playwright w CI.
 *
 * MECHANIZM AWARII, KTÓRY TU ZAMYKAMY (i tylko ten): **pusty zbiór przechodzi
 * każdy test**. Playwright kończy się kodem 0, gdy wszystkie przypadki zostały
 * POMINIĘTE (`test.skip`) albo gdy filtr nie dopasował żadnego — a zadanie w CI
 * świeci wtedy na zielono dokładnie tak samo, jak przy realnie wykonanym pakiecie.
 * Zielone zadanie przestaje więc znaczyć „ścieżka działa", a zaczyna znaczyć
 * „nic nie sprawdziliśmy". To ta sama klasa błędu co strażnik-atrapa
 * (CLAUDE.md v1.17): mechanizm daje sygnał, nie sprawdzając tego, co miał sprawdzić.
 *
 * DLACZEGO OSOBNA WARSTWA, A NIE ASERCJA W SPECU: `test.skip(...)` wykonuje się
 * ZANIM ciało testu dojdzie do głosu, więc żadna asercja wewnątrz pliku nie ma jak
 * o tym pominięciu orzec. Liczność da się zmierzyć wyłącznie POZA pakietem — z
 * raportu przebiegu.
 *
 * Użycie:
 *   node tools/sprawdz-licznosc-e2e.mjs <sciezka-raportu-json> <oczekiwana-liczba>
 *
 * Zwraca 0 tylko wtedy, gdy JEDNOCZEŚNIE:
 *   - raport istnieje i da się go sparsować (brak raportu = przebieg nie wystartował),
 *   - liczba POMINIĘTYCH przypadków wynosi 0,
 *   - liczba WYKONANYCH przypadków równa się dokładnie oczekiwanej.
 *
 * Świadomie sprawdzamy RÓWNOŚĆ, nie „co najmniej": pakiet, który urósł o nowe
 * przypadki, ma zmusić autora do świadomej aktualizacji liczby tutaj. Inaczej
 * bramka po cichu degraduje się do „cokolwiek > 0".
 */

import { readFileSync } from "node:fs";

const [, , sciezkaRaportu, oczekiwaneRaw] = process.argv;

if (!sciezkaRaportu || !oczekiwaneRaw) {
	console.error(
		"[licznosc] Użycie: node tools/sprawdz-licznosc-e2e.mjs <raport.json> <oczekiwana-liczba>",
	);
	process.exit(2);
}

const oczekiwane = Number(oczekiwaneRaw);
if (!Number.isInteger(oczekiwane) || oczekiwane < 1) {
	console.error(
		`[licznosc] Oczekiwana liczba musi być dodatnią liczbą całkowitą, jest: ${oczekiwaneRaw}`,
	);
	process.exit(2);
}

let raport;
try {
	raport = JSON.parse(readFileSync(sciezkaRaportu, "utf8"));
} catch (err) {
	// Brak raportu to NIE jest drobiazg: znaczy, że przebieg nie doszedł do etapu
	// zapisu wyniku. Bez tej gałęzi bramka dałaby się ominąć samym nieodpaleniem testów.
	console.error(`[licznosc] BRAK CZYTELNEGO RAPORTU (${sciezkaRaportu}): ${err.message}`);
	console.error("[licznosc] Traktuję to jako 0 wykonanych przypadków — wynik CZERWONY.");
	process.exit(1);
}

const stat = raport.stats ?? {};
const oczekiwaneOk = stat.expected ?? 0; // przeszły zgodnie z oczekiwaniem
const nieoczekiwane = stat.unexpected ?? 0; // padły
const migotliwe = stat.flaky ?? 0; // przeszły dopiero po ponowieniu
const pominiete = stat.skipped ?? 0;

// „Wykonane" = przypadki, które REALNIE poszły przez ciało testu (w tym te, które
// padły — pad jest dowodem wykonania, pominięcie nie jest).
const wykonane = oczekiwaneOk + nieoczekiwane + migotliwe;

console.log(
	`[licznosc] wykonane=${wykonane} (przeszły=${oczekiwaneOk}, padły=${nieoczekiwane}, ` +
		`migotliwe=${migotliwe}), pominięte=${pominiete}, oczekiwano=${oczekiwane}`,
);

let bledy = 0;

if (pominiete > 0) {
	console.error(
		`[licznosc] CZERWONE: ${pominiete} przypadk(ów) POMINIĘTYCH. W torze nocnym pominięcie ` +
			"znaczy brak flagi/zmiennej środowiska — czyli bramka nie sprawdziła tego, co miała.",
	);
	bledy++;
}

if (wykonane !== oczekiwane) {
	console.error(
		`[licznosc] CZERWONE: wykonano ${wykonane} przypadków, oczekiwano dokładnie ${oczekiwane}.`,
	);
	if (wykonane === 0) {
		console.error("[licznosc] ZERO wykonanych przypadków — pusty zbiór przechodzi każdy test.");
	}
	bledy++;
}

if (bledy > 0) process.exit(1);

console.log("[licznosc] OK — pakiet realnie się wykonał w oczekiwanej liczbie przypadków.");
