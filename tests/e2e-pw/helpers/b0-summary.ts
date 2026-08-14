import { expect, type Page, test } from "@playwright/test";

/**
 * Ekran 3 Pomocnika (podsumowanie) — słownik stanów końcowych + domknięcie ścieżki.
 *
 * PO CO (defekt nocnego toru, przebieg CI 30579719642, job 90996657369):
 * test czekał 150 s na JEDEN z DWÓCH ekranów sukcesu. Model w CI (Haiku) dwa razy
 * zwrócił obiekt niezgodny ze schematem → produkt zrobił dokładnie to, co ma robić:
 * pokazał UCZCIWY degrade („Coś poszło nie tak z podsumowaniem / Spróbuję jeszcze
 * raz — Twoja rozmowa jest zapisana"). Test tego ekranu nie znał, więc czekał do
 * końca budżetu i padł jako „timeout" — czyli mierzył szczęście w losowaniu modelu
 * i w dodatku KŁAMAŁ o przyczynie (raportował zawieszenie tam, gdzie produkt
 * odpowiedział w 2 sekundy).
 *
 * TRZY stany końcowe ekranu 3 (kontrakt SummaryResponse + summary-screen.tsx):
 *  1. `podsumowanie`       — judged=true: streszczenie „Co rozumiem z naszej rozmowy" + karty.
 *  2. `przeglad_opiekuna`  — judged=false + ≥1 ścieżka: sędzia HITL odmówił 2×,
 *                            pokazujemy same obszary + zapowiedź przeglądu opiekuna. KARTY SĄ.
 *  3. `blad_generacji`     — judged=false + 0 ścieżek: generator wyczerpał próby albo
 *                            budżet czasu (A4). KART NIE MA, jest przycisk „Spróbuj ponownie".
 *
 * Stany 1 i 2 dowodzą, że podsumowanie SIĘ WYGENEROWAŁO (obiekt przeszedł schemat
 * i ugruntowanie w katalogu). Stan 3 dowodzi wyłącznie, że produkt uczciwie się poddał.
 * Dlatego stan 3 NIE jest tu wynikiem akceptowanym — jest sygnałem do skorzystania
 * z afordancji, którą produkt daje studentowi (przycisk ponowienia), i dopiero
 * wyczerpanie prób jest padem.
 */

/** Trzy stany końcowe ekranu 3 — nazwy używane w komunikatach padu i w adnotacji raportu. */
export type StanEkranu3 = "podsumowanie" | "przeglad_opiekuna" | "blad_generacji";

/**
 * Teksty ekranów wprost z `src/lib/career-helper/copy.ts` — świadomie skopiowane,
 * NIE zaimportowane. Import COPY sprawiłby, że zmiana mikrokopii automatycznie
 * przestawia asercję (test przestaje pilnować tego, co widzi student).
 */
const EKRAN: Record<StanEkranu3, RegExp> = {
	podsumowanie: /Co rozumiem z naszej rozmowy/i,
	przeglad_opiekuna: /Przygotuję to za chwilę/i,
	blad_generacji: /Coś poszło nie tak z podsumowaniem/i,
};

/**
 * Ile czekamy na JAKIKOLWIEK stan końcowy jednej próby.
 *
 * To nie jest „ile trwa model" — to kontrakt A4 produktu: klient ma własny łączny
 * budżet `SUMMARY_CLIENT_BUDGET_MS` = 90 s (src/lib/career-helper/types.ts) na
 * WSZYSTKIE swoje próby razem i po nim MUSI pokazać jeden z trzech ekranów.
 * 100 s = 90 s budżetu + zapas na render. Przekroczenie tego progu to NIE degrade,
 * tylko złamanie obietnicy „student dostaje odpowiedź w skończonym, znanym czasie" —
 * i taki pad ma własny komunikat (dawny timeout 150 s mieszał te dwie rzeczy).
 */
export const EKRAN3_BUDZET_MS = 100_000;

/** Ile razy łącznie wolno podejść do /summary przez afordancję produktu (1 + ponowienia). */
const DOMYSLNE_PROBY = 3;

/**
 * Czeka na dowolny stan końcowy ekranu 3 i mówi, KTÓRY to jest.
 * Pad tutaj = produkt nie odpowiedział w budżecie A4 (zawieszenie), nie degrade.
 */
export async function poczekajNaEkran3(
	page: Page,
	budzetMs: number = EKRAN3_BUDZET_MS,
): Promise<StanEkranu3> {
	const podsumowanie = page.getByText(EKRAN.podsumowanie);
	const przeglad = page.getByText(EKRAN.przeglad_opiekuna);
	const blad = page.getByText(EKRAN.blad_generacji);

	await expect(
		podsumowanie.or(przeglad).or(blad),
		`Ekran 3 Pomocnika: w ${budzetMs} ms nie pojawił się ŻADEN ze stanów końcowych ` +
			`(„Co rozumiem z naszej rozmowy" / „Przygotuję to za chwilę" / „Coś poszło nie tak ` +
			`z podsumowaniem"). To NIE jest uczciwy degrade — to zawieszenie: klient obiecuje ` +
			`odpowiedź w SUMMARY_CLIENT_BUDGET_MS (90 s, A4), serwer ma własny budżet 50 s ` +
			`(SUMMARY_TOTAL_BUDGET_MS) i maxDuration=60. Szukaj w logach serwera: ` +
			`career-helper.summary.* — jeśli tam cisza, wisi klient, nie model.`,
	).toBeVisible({ timeout: budzetMs });

	if (await podsumowanie.first().isVisible()) return "podsumowanie";
	if (await przeglad.first().isVisible()) return "przeglad_opiekuna";
	return "blad_generacji";
}

/**
 * Domyka ekran 3 do stanu, w którym podsumowanie REALNIE powstało (są karty ścieżek).
 *
 * Uczciwy degrade (`blad_generacji`) nie jest tu wynikiem akceptowanym, ale nie jest
 * też natychmiastowym padem: robimy dokładnie to, co zrobi student — klikamy
 * „Spróbuj ponownie" (wraca na ekran czatu z CTA), potem „Pokaż podsumowanie"
 * (nowe POST /summary). Bez nowego kosztu rozmowy: sesja i tury są już w bazie,
 * ponawiamy WYŁĄCZNIE podsumowanie.
 *
 * CZEGO TA FUNKCJA NIE PILNUJE (świadoma strata, nie przeoczenie):
 *  - nie wymaga, żeby PIERWSZA próba się udała — produkt, który generuje poprawny
 *    obiekt np. w połowie prób, przechodzi. Liczbę zużytych prób zapisujemy w
 *    adnotacji `b0-summary` i na stdout, żeby degradacja modelu była WIDOCZNA
 *    w raporcie nocnym, a nie niema;
 *  - nie odróżnia `podsumowanie` od `przeglad_opiekuna` — jeśli sędzia HITL zacznie
 *    odmawiać wszystkiego, test zostanie zielony (obiekt powstał, karty są). Stan
 *    ląduje w tej samej adnotacji; rozróżnienie werdyktu sędziego pilnują testy
 *    jednostkowe generateSummary (src/lib/ai/__tests__/career-helper.test.ts).
 */
export async function domknijPodsumowanieZeSciezkami(
	page: Page,
	opts: { maxProby?: number; budzetMs?: number } = {},
): Promise<{ stan: StanEkranu3; proby: number }> {
	const maxProby = opts.maxProby ?? DOMYSLNE_PROBY;
	const budzetMs = opts.budzetMs ?? EKRAN3_BUDZET_MS;

	let stan: StanEkranu3 = "blad_generacji";
	let proby = 0;

	for (proby = 1; proby <= maxProby; proby++) {
		stan = await poczekajNaEkran3(page, budzetMs);
		if (stan !== "blad_generacji") break;
		if (proby === maxProby) break;

		// Afordancja produktu, nie obejście testowe: „Spróbuj ponownie" wraca na ekran
		// czatu (career-helper-flow.tsx onRetrySummary), gdzie rehydracja z GET /session
		// odtwarza stan „rozmowa domknięta" i pokazuje CTA. Jeśli ten powrót nie działa,
		// uczciwy degrade jest ślepą uliczką — i test ma to powiedzieć wprost.
		await page.getByRole("button", { name: /Spróbuj ponownie/i }).click();
		const cta = page.getByRole("button", { name: /Pokaż podsumowanie rozmowy/i });
		await expect(
			cta,
			`Ekran błędu podsumowania: po kliknięciu „Spróbuj ponownie" nie wróciło CTA ` +
				`„Pokaż podsumowanie rozmowy". Uczciwy degrade BEZ wyjścia = ślepa uliczka ` +
				`(rehydracja GET /session nie ustawiła stanu „rozmowa domknięta").`,
		).toBeVisible({ timeout: 30_000 });
		await cta.click();
	}

	const opis = `stan=${stan} proby=${proby}/${maxProby}`;
	test.info().annotations.push({ type: "b0-summary", description: opis });
	// Linia grepowalna w logu nocnego toru — pozwala policzyć, jak często model
	// degraduje, bez czytania trace'ów.
	console.log(`[b0-summary] ${opis}`);

	expect(
		stan,
		`/summary: po ${maxProby} realnych próbach (każda = nowe POST /summary z tej samej ` +
			`sesji) ekran 3 wciąż pokazuje „Coś poszło nie tak z podsumowaniem". Produkt zachował ` +
			`się poprawnie — uczciwie zdegradował — ale podsumowanie NIE powstało ani razu. ` +
			`Diagnoza: log serwera career-helper.summary.generate.no-object-retry (które pole ` +
			`schematu padło) oraz .exhausted. UWAGA — historyczna przyczyna ZNIKNĘŁA ` +
			`2026-08-14: do tej daty warstwa „premium" jechała w CI na Haiku, bo job ` +
			`ustawiał globalny SKILLBRIDGE_AI_MODEL nadpisujący wszystkie warstwy naraz, ` +
			`a Haiku nie trafiał w schemat wymagający etykiet z katalogu 23 ścieżek. ` +
			`Teraz „premium" jedzie na modelu produkcyjnym (nadpisywane są tylko ` +
			`SKILLBRIDGE_AI_MODEL_STANDARD i _FAST), więc pad na tej asercji znaczy ` +
			`realny problem produktu, nie podmianę modelu w CI.`,
	).not.toBe("blad_generacji");

	await expect(
		page.getByText(/Wybieram tę ścieżkę/i).first(),
		`Ekran 3 w stanie „${stan}" powinien pokazać karty wyboru ścieżki („Wybieram tę ` +
			`ścieżkę") — oba stany z ≥1 ścieżką je renderują. Brak kart = kontrakt ekranu 3 ` +
			`złamany (nagłówek bez treści).`,
	).toBeVisible({ timeout: 30_000 });

	return { stan, proby };
}
