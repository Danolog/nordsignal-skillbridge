/**
 * wymagaj-flagi — warunek wstępny dla testów, które mierzą funkcję ZA FLAGĄ.
 *
 * PROBLEM, KTÓRY TO ZAMYKA
 * ------------------------
 * Panel wykładowcy jest zgaszony na produkcji, ale CI zapala go zmienną
 * `FLAG_FACULTY_PANEL` (`.github/workflows/pr.yml`), żeby bramka mierzyła
 * PRODUKT, a nie zgaszoną flagę. Rozdział „co wyłączone" od „co niesprawdzone".
 *
 * Gdy ktoś usunie tę zmienną z konfiguracji CI, cztery przypadki integracyjne
 * padają komunikatem:
 *
 *     AssertionError: expected 401 to be 200
 *
 * Ten komunikat mówi CO, nie mówi DLACZEGO. Nie pada w nim ani nazwa flagi, ani
 * słowo „panel" — a przyczyna leży w pliku, którego autor poprawki nawet nie
 * otwierał. To ta sama klasa awarii co „Test timed out in 5000ms": pad alarmuje,
 * ale nie kieruje. Godzina szukania po nic.
 *
 * Warunek wstępny zamienia to w jedno zdanie, które nazywa zmienną, plik i powód.
 *
 * DLACZEGO WARUNEK, A NIE POMINIĘCIE
 * ----------------------------------
 * Kusi, żeby przy zgaszonej fladze test się POMINĄŁ („przecież funkcja
 * wyłączona"). Nie robimy tego świadomie: pominięty test i wyłączona funkcja
 * wyglądają w dzienniku identycznie jak sukces, a wtedy za dwa miesiące nikt nie
 * wie, czy panel działa, czy tylko nikt go nie mierzy. Brak flagi w CI jest
 * BŁĘDEM KONFIGURACJI bramki, nie sygnałem, że mamy przestać sprawdzać.
 *
 * Właściciel: Quinn (QA).
 */

import { FLAGS, isFeatureEnabled } from "@/lib/flags";

type KluczFlagi = keyof typeof FLAGS;

const RAMKA = "═".repeat(74);

/**
 * Przerywa przebieg, gdy flaga wymagana przez ten zestaw jest zgaszona.
 *
 * Wołać w `beforeAll` pliku, który mierzy funkcję za flagą. Funkcja czyta stan
 * flagi PER WYWOŁANIE (nie przy imporcie), więc działa też tam, gdzie test
 * przestawia zmienne środowiskowe w trakcie.
 */
export function wymagajFlagi(klucz: KluczFlagi): void {
	if (isFeatureEnabled(klucz)) return;

	const wpis = FLAGS[klucz];
	const komunikat = [
		"",
		RAMKA,
		` FLAGA WYMAGANA PRZEZ TEN ZESTAW JEST ZGASZONA: ${klucz}`,
		RAMKA,
		`Zmienna środowiskowa: ${wpis.envVar}`,
		"",
		"To NIE jest błąd w kodzie produktu — to brak konfiguracji bramki.",
		"",
		`CI ustawia tę zmienną w \`.github/workflows/pr.yml\` (blok \`env:\` na poziomie`,
		"przepływu). Jeśli ten test pada u Ciebie lokalnie, ustaw ją w powłoce:",
		"",
		`    export ${wpis.envVar}=1`,
		"",
		"Jeśli pada w CI — ktoś usunął ją z konfiguracji. Przywróć ją, zamiast",
		"osłabiać test: funkcja bywa ZGASZONA NA PRODUKCJI, a mimo to ma być",
		"MIERZONA, bo wracając do niej za dwa miesiące musimy wiedzieć, czy działa.",
		"Pominięty test i wyłączona funkcja wyglądają w dzienniku identycznie",
		"jak sukces — dlatego to porażka, a nie pominięcie.",
		"",
		"Opis flagi (dlaczego jest wyłączona):",
		wpis.description,
		RAMKA,
		"",
	].join("\n");

	// Pełny opis na stderr — nie ginie w stosie wywołań doklejanym do wyjątku.
	console.error(komunikat);
	throw new Error(
		`Zestaw wymaga zapalonej flagi \`${klucz}\` (${wpis.envVar}). ` +
			"Brak zmiennej w konfiguracji CI — instrukcja wypisana powyżej.",
	);
}
