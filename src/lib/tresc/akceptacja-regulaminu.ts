/**
 * AKCEPTACJA REGULAMINU PILOTAŻU — bramka serwerowa (fala 2, zamówienie R-6 pkt 1).
 *
 * ── CO TA WARSTWA ROBI, A CZEGO NIE ──────────────────────────────────────────
 * ROBI: nie wpuszcza rejestracji bez świadomego zaznaczenia pola wyboru —
 * sprawdzane PO STRONIE SERWERA, w zaczepie `before` biblioteki uwierzytelniającej,
 * a nie tylko atrybutem `required` w przeglądarce (ten zdejmuje się narzędziami
 * przeglądarki w dwie sekundy i nie jest dowodem niczego).
 *
 * NIE ROBI: nie ZAPISUJE faktu akceptacji. Zapis (znacznik czasu + wersja
 * dokumentu przy koncie) to zmiana schematu bazy, czyli migracja na produkcji —
 * domena Ethana (CTO), nie warstwy interfejsu. Zamówienie Sophii rozdziela te
 * dwa punkty wprost (R-6: punkt 1 „walidacja", punkt 2 „zapis").
 *
 * ⚠ LUKA DOWODOWA, KTÓREJ TA WARSTWA NIE ZAMYKA — nazwana, nie przemilczana:
 * do czasu migracji potrafimy NIE WPUŚCIĆ osoby, która nie zaznaczyła, ale NIE
 * POTRAFIMY UDOWODNIĆ po fakcie, że ktoś zaznaczył ani na którą wersję się
 * zgodził. Sam dokument nazywa to warunkiem („czynność świadoma i MOŻLIWA DO
 * WYKAZANIA"), a §14 opiera na wersji cały mechanizm ponownej akceptacji.
 * Kontrakt, którego potrzebuje warstwa zapisu, jest opisany niżej przy
 * `AkceptacjaRegulaminu` — jest gotowy do podpięcia bez zmian po stronie klienta.
 *
 * ── JEDEN NOŚNIK WERSJI ──────────────────────────────────────────────────────
 * Numer wersji NIE jest tu wpisany. Czytamy go z CZĘŚCI I dokumentu — z tej samej
 * treści, którą widzi uczestnik. Wpisanie „v0.1" do kodu dałoby drugi nośnik tej
 * samej reguły: Sophia podbija wersję w dokumencie, kod dalej twierdzi swoje,
 * a rozjazd jest cichy dokładnie tam, gdzie chodzi o dowód „na co ta osoba się
 * zgodziła" (CLAUDE.md v1.17, reguła (1)).
 */

import { wczytajRegulaminPilotazu } from "@/lib/tresc/dokumenty-pilotazu";

/**
 * Kontrakt pola akceptacji przesyłanego przy rejestracji.
 *
 * DLA WARSTWY ZAPISU (Ethan): to jest komplet danych, których potrzebuje migracja
 * z R-6 punkt 2 — `wersjaRegulaminu` jest tu PO TO, żeby zapis miał co utrwalić.
 * Klient już ją wysyła, serwer już ją sprawdza; brakuje wyłącznie dwóch kolumn
 * przy koncie (znacznik czasu + wersja) i jednej linii zapisu w zaczepie `after`.
 * Kształt żądania nie musi się przy tym zmienić.
 */
export interface AkceptacjaRegulaminu {
	/** Czy pole wyboru zostało zaznaczone. Domyślnie puste — nigdy zaznaczone z góry. */
	akceptacjaRegulaminu?: unknown;
	/** Wersja dokumentu POKAZANA uczestnikowi w chwili rejestracji (np. „v0.1"). */
	wersjaRegulaminu?: unknown;
}

/** Wynik sprawdzenia — powód odmowy jest komunikatem dla człowieka, nie kodem. */
export type WynikAkceptacji = { ok: true } | { ok: false; powod: string };

/**
 * Wersja z nagłówka metryki CZĘŚCI I. Wzorzec celowo wąski: `**Wersja:** v0.1`.
 * Brak dopasowania albo więcej niż jedno = wyjątek, nie zgadywanie — nie chcemy
 * wypuścić rejestracji z wersją „nie wiem".
 */
const WZORZEC_WERSJI = /\*\*Wersja:\*\*\s*(v\d+\.\d+)/g;

/**
 * Wyciąga oznaczenie wersji z treści. Rozdzielone od odczytu pliku CELOWO: czysta
 * funkcja daje się wykonać strażnikowi na treści spreparowanej (brak wersji, dwie
 * wersje), a przez to daje się MUTOWAĆ. Wersja sklejona z odczytem byłaby
 * testowalna tylko na dzisiejszym dokumencie, czyli tylko w jednym przypadku.
 */
export function wyciagnijWersjeRegulaminu(tresc: string): string {
	const trafienia = [...tresc.matchAll(WZORZEC_WERSJI)].map((m) => m[1]);
	if (trafienia.length !== 1) {
		throw new Error(
			`[regulamin pilotażu] W CZĘŚCI I znalazłem ${trafienia.length} oznaczeń wersji ` +
				`(oczekuję dokładnie jednego, w formacie \`**Wersja:** v0.1\`). ` +
				`Wersja jest dowodem „na co ta osoba się zgodziła" (§14) — nie zgaduję jej.`,
		);
	}
	return trafienia[0];
}

/** Wersja aktualnego regulaminu, prosto z nośnika treści. Wołane po stronie serwera. */
export function wersjaRegulaminuPilotazu(): string {
	return wyciagnijWersjeRegulaminu(wczytajRegulaminPilotazu());
}

/**
 * Bramka: czy to żądanie rejestracji wolno przepuścić.
 *
 * FAIL-CLOSED w każdą stronę: brak pola, pole inne niż dokładnie `true`, brak
 * wersji albo wersja inna niż aktualna → odmowa. „Prawdziwe" wartości w rodzaju
 * `"on"`, `1` czy `"true"` są ŚWIADOMIE odrzucane: pole wyboru wysyła wartość
 * logiczną, a wszystko inne oznacza, że ktoś składa żądanie ręcznie — czyli
 * dokładnie ten przypadek, dla którego istnieje walidacja po stronie serwera.
 */
export function sprawdzAkceptacjeRegulaminu(
	cialo: AkceptacjaRegulaminu | null | undefined,
	wersjaAktualna: string,
): WynikAkceptacji {
	if (cialo?.akceptacjaRegulaminu !== true) {
		return {
			ok: false,
			powod: "Aby założyć konto, zaakceptuj regulamin pilotażu.",
		};
	}
	if (typeof cialo.wersjaRegulaminu !== "string" || cialo.wersjaRegulaminu !== wersjaAktualna) {
		// Realny przypadek, nie teoria: karta otwarta przed podbiciem wersji. Odmowa
		// jest tu łagodniejsza niż przyjęcie zgody na tekst, którego ta osoba nie widziała.
		return {
			ok: false,
			powod:
				"Regulamin zmienił się, odkąd otworzyłeś tę stronę. Odśwież ją i przeczytaj " +
				"aktualną wersję przed założeniem konta.",
		};
	}
	return { ok: true };
}
