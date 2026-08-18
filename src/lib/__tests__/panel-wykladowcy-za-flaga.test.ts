// @vitest-environment node
//
// PANEL WYKŁADOWCY ZA FLAGĄ — strażnik.
//
// PO CO
// -----
// Panel (`/faculty`, `/api/faculty/*`) to **osobny mechanizm uwierzytelniania**:
// własne ciasteczko, hasło WSPÓŁDZIELONE per kampus, własna tabela sesji. Nie
// przechodzi przez bibliotekę uwierzytelniającą, więc lista zaproszonych go nie
// widzi — ani przy tworzeniu konta, ani przy logowaniu.
//
// Powód wyłączenia NIE jest techniczny: hasło współdzielone znaczy, że **nie
// wiadomo, kto się zalogował**, a panel pokazuje dane uczestników. Próg trzech
// osób chroni przed liczebnością zbioru, nie przed nierozpoznanym odbiorcą.
//
// DWA WYWOŁANIA JEDNEJ REGUŁY — i dlaczego oba są konieczne:
//   `checkFacultyAuth`  zamyka ODCZYT  (dostęp do panelu i tras)
//   trasa logowania     zamyka ZAPIS   (tworzenie sesji)
// Bez drugiego członu zgaszona flaga nie przeszkadzałaby w logowaniu — sesja by
// powstawała, tylko nic by nie dawała. Bez pierwszego — sesje już wydane żyłyby
// dalej. „Usunięte ≠ unieważnione".
//
// GDZIE PILNOWANY JEST DRUGI CZŁON — ten plik pilnuje WYŁĄCZNIE członu ODCZYT.
// Człon ZAPIS wymaga realnej bazy (asercja na liczności wierszy w tabeli sesji,
// nie na kodzie odpowiedzi), więc mieszka osobno:
//   `src/app/api/faculty/login/__tests__/faculty-login-flaga.integration.test.ts`
//
// MUTACJE CZERWIENIĄCE — wynik w opisie zgłoszenia.
//
// ⚠ CZŁON ZAPISU MA STRAŻNIKA OD 2026-08-18 — ten plik nadal pilnuje WYŁĄCZNIE
// członu ODCZYTU (`checkFacultyAuth`). Człon ZAPIS wymaga realnej bazy (asercja
// na LICZNOŚCI wierszy w tabeli sesji, nie na kodzie odpowiedzi), więc mieszka
// osobno:
//   `src/app/api/faculty/login/__tests__/faculty-login-flaga.integration.test.ts`
//
// PRZEWIDYWANIE ZAMIENIONE NA POMIAR. Do 2026-08-18 stało tu zdanie: „Mutacja
// zdejmująca bramkę z TRASY LOGOWANIA przeżyłaby wszystkie testy niżej". Było
// trafne, ale było TWIERDZENIEM. Pomiar na `bca0fc7` (Quinn, 2026-08-18):
//
//   flaga ZAPALONA + mutacja → 2778 zielonych (448 integracyjnych + 2330
//                              jednostkowych), ani jednej czerwieni
//   flaga ZGASZONA + mutacja → 4 czerwienie / 439 / 5 pominiętych
//   flaga ZGASZONA BEZ mutacji → IDENTYCZNIE 4 / 439 / 5
//
// Ostatnie dwa wiersze są sednem: mutacja nie zmieniała NICZEGO również tam,
// gdzie człon miał działać. Była niewidoczna pod obiema flagami.
//
// DLACZEGO BYŁA NIEWIDOCZNA — dopełnienie Leo, ważniejsze niż sama liczba:
// człon ZAPIS działa wyłącznie przy ZGASZONEJ fladze, a CI trzyma panel
// ZAPALONY. Środowisko pomiarowe nigdy nie wchodziło w stan, którego ten człon
// dotyczy, więc żadna liczba testów w CI nie mogła go złapać. Stąd pytanie do
// zadawania przy każdym strażniku: CZY CI W OGÓLE BYWA W STANIE, KTÓREGO PILNUJĘ.
// Nowy strażnik członu ZAPIS omija tę pułapkę, bo stanu nie dziedziczy po
// środowisku, tylko go wytwarza — i czerwieni się przy `FLAG_FACULTY_PANEL=1`,
// czyli pod środowiskiem CI takim, jakie jest (zmierzone, cytaty w zgłoszeniu).
//
// Zieleń TEGO pliku nadal dowodzi tylko tego, że zamknięty jest DOSTĘP.
// Dowód, że zamknięte jest LOGOWANIE, stoi w pliku wskazanym wyżej.
//
// DLACZEGO TO PRZEOCZYLIŚMY OBAJ — reguła szersza niż ta sprawa (Leo, 2026-08-18):
// KONIUNKCJA ROZŁOŻONA NA DWA PLIKI NIE WYGLĄDA JAK KONIUNKCJA. Gdy oba człony
// stoją w jednej funkcji, brak mutacji na jednym widać gołym okiem. Gdy jeden
// siedzi w `faculty-auth.ts`, a drugi w `api/faculty/login/route.ts`, oko widzi
// „dwa wywołania tej samej flagi" i domyka temat na pytaniu o NOŚNIK — a pytanie
// o LICZBĘ MUTACJI nigdy nie pada.
//
// Kryterium ma być odruchowe: ILE CZŁONÓW MA REGUŁA, TYLE MUTACJI — niezależnie
// od tego, w ilu plikach mieszkają. Rozdzielenie na dwa punkty egzekucji było
// POPRAWNE (to jedyne dwa miejsca, w których różnica odczyt/zapis istnieje);
// brakowało wyłącznie drugiej mutacji. Kto doda tu trzeci punkt egzekucji, jest
// winien trzecią mutację.
//
// Strażnik członu zapisu: zgłoszenie Quinna (osobne). Jego mutacja jest dziś
// niewidoczna także dlatego, że w CI panel jest ZAWSZE otwarty
// (`FLAG_FACULTY_PANEL: "1"` w konfiguracji przepływu).
//
// ⚠ WARUNEK UTRZYMANIA (Leo): ten plik jest JEDYNYM świadkiem stanu
// PRODUKCYJNEGO — w CI flaga jest zapalona, więc nigdzie indziej nie sprawdzamy
// zachowania przy zgaszonej. NIE USUWAĆ przy sprzątaniu testów.
//
// ROLA POMIARU SESJI — potwierdzenie, nie przesłanka. Odczyt z produkcji
// (5 wierszy, 0 żywych, 2026-08-18) mówi, że nie ma czego unieważniać W TYM DNIU.
// Konstrukcja na tym NIE STOI: nawet żywa sesja nie przeszłaby, bo bramka kończy
// pracę PRZED dotknięciem ciasteczka (asercja „nie dotyka ciasteczka ani bazy").
// Kto za miesiąc zobaczy żywe sesje, nie ma powodu sądzić, że wyłączenie panelu
// przestało działać.

import { beforeEach, describe, expect, it, vi } from "vitest";

const POPRZEDNIA = process.env.FLAG_FACULTY_PANEL;

function ustawFlage(v: string | undefined): void {
	if (v === undefined) delete process.env.FLAG_FACULTY_PANEL;
	else process.env.FLAG_FACULTY_PANEL = v;
}

beforeEach(() => {
	vi.resetModules();
	ustawFlage(POPRZEDNIA);
});

describe("panel wykładowcy — flaga jest nośnikiem decyzji", () => {
	it("domyślnie ZGASZONA — wyłączenie ma być stanem domyślnym, nie przypadkiem", async () => {
		const { FLAGS } = await import("@/lib/flags");
		expect(FLAGS.facultyPanel.defaultValue).toBe(false);
		expect(FLAGS.facultyPanel.envVar).toBe("FLAG_FACULTY_PANEL");
	});

	it("opis flagi mówi DLACZEGO, nie tylko CO", async () => {
		// Pusta zmienna nie odróżnia decyzji od pomyłki. Za dwa miesiące ktoś
		// zobaczy wyłączony panel i musi zobaczyć powód, nie zgadywać.
		const { FLAGS } = await import("@/lib/flags");
		const opis = FLAGS.facultyPanel.description;
		expect(opis).toMatch(/wspoldzielon|współdzielon/i);
		expect(opis.length).toBeGreaterThan(200);
	});
});

describe("panel wykładowcy — ODCZYT zamknięty przy zgaszonej fladze", () => {
	it("checkFacultyAuth zwraca null i NIE dotyka ciasteczka ani bazy", async () => {
		ustawFlage("0");
		const ciasteczka = vi.fn();
		vi.doMock("next/headers", () => ({ cookies: ciasteczka }));

		const { checkFacultyAuth } = await import("@/lib/faculty-auth");
		await expect(checkFacultyAuth()).resolves.toBeNull();

		// Kluczowe: odmowa zapada PRZED odczytem ciasteczka. Gdyby zapadała po,
		// sesja już wydana mogłaby jeszcze przejść w wyścigu z gaszeniem flagi.
		expect(ciasteczka).not.toHaveBeenCalled();
	});

	it("przy ZAPALONEJ fladze funkcja idzie dalej — inaczej test wyżej niczego nie dowodzi", async () => {
		// Kontrola dodatnia: bez niej „zwraca null" byłoby prawdą także wtedy,
		// gdyby funkcja zwracała null ZAWSZE, czyli gdyby panel był zepsuty,
		// a nie wyłączony. To rozróżnienie jest tu całą wartością.
		ustawFlage("1");
		const ciasteczka = vi.fn(async () => ({ get: () => undefined }));
		vi.doMock("next/headers", () => ({ cookies: ciasteczka }));

		const { checkFacultyAuth } = await import("@/lib/faculty-auth");
		await expect(checkFacultyAuth()).resolves.toBeNull(); // brak ciasteczka
		expect(ciasteczka).toHaveBeenCalled(); // ale DOSZŁO do jego odczytu
	});
});

describe("panel wykładowcy — reszta aplikacji bez zmian", () => {
	it("zgaszenie panelu nie rusza żadnej innej flagi", async () => {
		// Druga połowa kontroli dwustronnej wymaganej przy tej zmianie:
		// „logowanie wykładowcy odrzucone I reszta aplikacji działa bez zmian".
		ustawFlage("0");
		const { FLAGS, isFeatureEnabled } = await import("@/lib/flags");
		const inne = Object.keys(FLAGS).filter((k) => k !== "facultyPanel");
		expect(inne.length).toBeGreaterThan(5);

		for (const klucz of inne) {
			const wpis = FLAGS[klucz as keyof typeof FLAGS];
			const zEnv = process.env[wpis.envVar];
			const oczekiwane = zEnv === undefined ? wpis.defaultValue : zEnv === "1";
			expect(
				isFeatureEnabled(klucz as Parameters<typeof isFeatureEnabled>[0]),
				`flaga ${klucz} zmieniła stan przy gaszeniu panelu wykładowcy`,
			).toBe(oczekiwane);
		}
	});
});
