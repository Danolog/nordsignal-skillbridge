import { createHash } from "node:crypto";
import { chmodSync, writeFileSync } from "node:fs";

/**
 * Zapis artefaktu POUFNEGO do pliku — jeden nośnik reguły „prawa 0600".
 *
 * Reguła: wartość, której nie wolno pokazać na ekranie (poświadczenie, odczyt
 * będący daną osobową), wychodzi z narzędzia WYŁĄCZNIE do pliku o prawach
 * `0600` — właściciel czyta i pisze, nikt inny nic. Na wyjście standardowe idzie
 * co najwyżej ŚCIEŻKA i ODCISK, nigdy sama wartość.
 *
 * Dlaczego nie na ekran: wyjście narzędzia trafia do przewijania terminala,
 * do zapisu sesji agenta i do dziennika przebiegu CI — trzech miejsc, których
 * nikt nie sprząta i które przeżywają sesję. Konstytucja rozstrzygnęła to dla
 * poświadczeń CI (CLAUDE.md §5, bramka (i) punkt 5: „wyłącznie przez standardowe
 * wejście — nigdy jako argument polecenia"); tu domykamy drugą stronę: nigdy
 * na wyjście.
 */
export function zapiszPoufnie(sciezka: string, tresc: string): void {
	// `mode` przy writeFileSync działa TYLKO przy tworzeniu pliku — przy nadpisaniu
	// istniejącego prawa zostają stare. Dlatego chmod ZAWSZE, nie tylko przy tworzeniu.
	writeFileSync(sciezka, `${tresc}\n`, { encoding: "utf8", mode: 0o600 });
	chmodSync(sciezka, 0o600);
}

/**
 * Krótki odcisk kryptograficzny wartości — do potwierdzenia „mam tę samą
 * wartość, co ty" BEZ pokazywania jej. Nie pozwala odtworzyć wartości.
 */
export function odcisk(wartosc: string): string {
	return createHash("sha256").update(wartosc).digest("hex").slice(0, 12);
}

/**
 * Komunikat o wydaniu poświadczenia — mówi, GDZIE leży wynik i czym go
 * potwierdzić, nigdy CO nim jest.
 *
 * Sygnatura jest tu zabezpieczeniem: funkcja dostaje ścieżkę i odcisk, a samej
 * wartości NIE WIDZI — więc nie ma czego wypisać nawet przez pomyłkę. To
 * własność konstrukcji, nie dyscyplina autora.
 */
export function komunikatWydania(sciezka: string, odciskWartosci: string): string[] {
	return [
		"",
		"=== POŚWIADCZENIE ZAPISANE DO PLIKU, NIE WYPISANE NA EKRAN ===",
		`plik:   ${sciezka}   (prawa 0600)`,
		`odcisk: sha256[0..12] = ${odciskWartosci}`,
		"Odcisk potwierdza 'mam tę samą wartość' bez jej pokazywania.",
		"Wartości nie wypisujemy: wyjście trafia do przewijania terminala, zapisu",
		"sesji agenta i dziennika CI — trzech miejsc, których nikt nie sprząta.",
	];
}
