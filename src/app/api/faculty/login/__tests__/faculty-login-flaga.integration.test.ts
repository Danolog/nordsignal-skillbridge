// @vitest-environment node
//
// PANEL WYKŁADOWCY ZA FLAGĄ — CZŁON ZAPIS (tworzenie sesji), realna baza.
//
// PO CO TEN PLIK ISTNIEJE
// -----------------------
// Reguła „panel za flagą" jest KONIUNKCJĄ dwóch członów w dwóch plikach:
//
//   `checkFacultyAuth`  zamyka ODCZYT  (dostęp do panelu i tras)
//   trasa logowania     zamyka ZAPIS   (tworzenie sesji)
//
// Do 2026-08-18 pilnowany był WYŁĄCZNIE człon ODCZYT
// (`src/lib/__tests__/panel-wykladowcy-za-flaga.test.ts`). Człon ZAPIS był
// zadeklarowany w nagłówku tamtego pliku jako konieczny — i niestrzeżony.
//
// ILE DOKŁADNIE JEST WART TEN PLIK — pomiar odtworzony na `0319a2b`
// (Quinn, 2026-08-24, godz. 11:39–11:41 CEST). Mutacja M1 zdejmuje warunek
// flagi z tej trasy; przebieg pod środowiskiem CI (`FLAG_FACULTY_PANEL=1`):
//
//   jednostkowe  → 2348 / 2348 ZIELONYCH, ani jednej czerwieni
//   integracyjne → 449 zielonych, 1 todo, 3 CZERWIENIE
//   wszystkie 3 czerwienie pochodzą Z TEGO PLIKU
//
// Czyli: 2797 testów przepuszcza tę mutację, a łapie ją wyłącznie ten plik.
// To jest liczbowa odpowiedź na pytanie „po co jeszcze jeden test".
//
// (Pomiar z 2026-08-18 na `bca0fc7` mówił „2778 zielonych", a streszczenie
// zlecenia mówiło „2768". Rozbieżności nie rozstrzygam — tamta podstawa jest
// nieaktualna, a liczby wyżej są odtwarzalne na dzisiejszej. Cytując tę
// sprawę, cytuj pomiar z 2026-08-24, nie tamten.)
//
// To wzorzec „strażnik-atrapa" z 1E.7 w czystej postaci: nagłówek deklarował
// gwarancję, której nikt nie sprawdzał. Wniosek ogólniejszy, wart zapamiętania:
// KONIUNKCJA WYMAGA TYLU MUTACJI, ILE MA CZŁONÓW. Reguła rozłożona na dwa pliki
// łatwo liczy się jako jedna i dostaje jedną mutację.
//
// CZY CI W OGÓLE BYWA W STANIE, KTÓREGO TEN PLIK PILNUJE
// ------------------------------------------------------
// Pytanie postawione przez Leo przy przeglądzie i to ono tłumaczy, dlaczego
// tamta mutacja była niewidoczna: człon ZAPIS działa WYŁĄCZNIE przy zgaszonej
// fladze, a CI trzyma panel ZAPALONY (`FLAG_FACULTY_PANEL: "1"` w
// `.github/workflows/pr.yml`). Środowisko pomiarowe nigdy nie wchodziło w stan,
// którego ten człon dotyczy — więc żadna liczba testów w CI nie mogła go złapać.
//
// Ten plik omija tę pułapkę, bo stanu NIE DZIEDZICZY ze środowiska, tylko go
// WYTWARZA: gasi flagę wewnątrz przypadku i zapala z powrotem. Dlatego czerwieni
// się pod środowiskiem CI takim, jakie jest — co jest zmierzone, nie założone:
// mutacja zdejmująca człon ZAPIS czerwieni ten plik przy `FLAG_FACULTY_PANEL=1`
// (cytaty w opisie zgłoszenia, oba stany flagi).
//
// Reguła do zapamiętania: strażnik, który wymaga stanu, w jaki CI nie wchodzi,
// nie jest strażnikiem — jest deklaracją. Sprawdzenie polega na tym, czy
// mutacja czerwieni się pod ŚRODOWISKIEM CI, a nie pod środowiskiem dobranym
// do testu.
//
// CO SPRAWDZAMY — SKUTEK ORAZ ODPOWIEDŹ, ROZDZIELONE
// --------------------------------------------------
// Własnością nośną jest LICZNOŚĆ wierszy w `faculty_sessions`, nie kod
// odpowiedzi. Sam kod 404 nie dowodzi niczego o zapisie: trasa mogłaby oddać
// 404 i mimo to utworzyć sesję (albo utworzyć ją wcześniej, a odmówić później).
// Mierzymy to, co zostaje w bazie.
//
// ⚠ SPROSTOWANIE (Quinn, 2026-08-24) — ta sekcja była DEKLARACJĄ, nie pomiarem.
// Do 2026-08-24 obie własności stały w jednym przypadku, w kolejności „najpierw
// kod odpowiedzi, potem liczność". Pomiar mutacyjny pokazał, że asercja
// liczności była wtedy MARTWA: mutacja czerwieniła plik wyłącznie na kodzie
// odpowiedzi (`expected 200 to be 404`, linia 136 ówczesnego pliku), a do
// liczności wykonanie nie docierało — wcześniejsza asercja rzucała pierwsza.
// Nagłówek deklarował „skutek, nie odpowiedź", a czerwień pochodziła
// z ODPOWIEDZI. Ta sama klasa wady, którą ten plik miał zamykać, o piętro niżej.
// Naprawa: dwie własności, dwa przypadki, każdy pada osobno — plus trzecia
// mutacja (M3) dowodząca, że asercja liczności łapie to, czego kod odpowiedzi
// nie łapie. Wyniki w opisie zgłoszenia.
//
// CZEGO TEN PLIK NIE DOWODZI — zawężenie zasięgu stoi TUTAJ, bo tutaj ktoś
// sięgnie po dowód. Zieleń tego pliku wolno cytować WYŁĄCZNIE jako dowód, że
// uchwyt trasy `POST /api/faculty/login` odmawia zapisu sesji przy zgaszonej
// fladze. NIE jest dowodem, że:
//
//   (a) panel jest zamknięty NA PRODUKCJI — to wynika z domyślnej wartości
//       flagi (`defaultValue: false`), a pilnuje jej osobny przypadek
//       w `src/lib/__tests__/panel-wykladowcy-za-flaga.test.ts`;
//   (b) trasa jest nieosiągalna przez przeglądarkę — wołamy uchwyt WPROST,
//       z pominięciem warstwy pośredniej (middleware) i serwera. Regresja
//       w kierowaniu ruchem jest poza zasięgiem tego pliku;
//   (c) ograniczanie liczby prób działa — `@/lib/rate-limit` jest tu ATRAPĄ
//       (przepuszcza zawsze), żeby mierzyć bramkę flagi, a nie licznik prób;
//   (d) sesje JUŻ WYDANE przestają działać — to człon ODCZYT, plik obok.
//
// Wymaga DATABASE_URL na bazie testowej + `FLAG_FACULTY_PANEL` (patrz
// `src/test/wymagaj-flagi.ts` — pad nazywa zmienną i plik konfiguracji CI).

import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { facultyPasswordEnvVar } from "@/lib/faculty-auth";
import { wymagajFlagi } from "@/test/wymagaj-flagi";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

/** Kampus z zaczątku danych (migracja 0005). */
const SLUG = "wsb-merito-szczecin";
/** Nazwę zmiennej składa NOŚNIK konwencji, nie ten plik — inaczej zmiana
 *  nazewnictwa rozjechałaby się z testem po cichu. */
const ZMIENNA_HASLA = facultyPasswordEnvVar(SLUG);
/** ≥16 znaków — spełnia próg siły także wtedy, gdyby ktoś odpalił z NODE_ENV=production. */
const HASLO = "haslo-testowe-kampusu-2026";

vi.mock("@/lib/rate-limit", () => ({
	rateLimiters: { facultyLogin: null },
	applyRateLimit: vi.fn(async () => ({ success: true, reset: 0, remaining: 99 })),
	rateLimitResponse: () => new Response("rate", { status: 429 }),
	getClientIp: () => "127.0.0.1",
}));

const dBack = isLocalTestDb ? describe : describe.skip;

dBack("panel wykładowcy · człon ZAPIS (trasa logowania, realna baza)", () => {
	let pool: Pool | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: handler ładowany dynamicznie po mockach.
	let loginRoute: any;

	const zadanie = (haslo: string) =>
		new Request("http://test.local/api/faculty/login", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ password: haslo }),
		});

	/**
	 * Liczba wierszy w tabeli sesji.
	 *
	 * RZUCA zamiast zwracać wartość zastępczą. Wcześniej zwracała `-1`, gdy pula
	 * połączeń była nieustawiona — a wtedy porównanie „przed" z „po" wychodziło
	 * `-1 === -1` i MELDOWAŁO SUKCES pomiaru, który nie dotknął bazy. To wzorzec
	 * „sprawdzenie, do którego nic nie dociera": brak połączenia ma przewracać
	 * test i nazywać przyczynę, nie udawać zera zmian.
	 */
	async function liczbaSesji(): Promise<number> {
		if (!pool) throw new Error("Brak puli połączeń — pomiar liczności nie dotknął bazy.");
		const r = await pool.query("SELECT count(*)::int AS c FROM faculty_sessions");
		return r.rows[0].c;
	}

	/** Stan flagi sprzed pliku — przywracany w `afterAll` (patrz niżej). */
	let flagaPrzed: string | undefined;

	beforeAll(async () => {
		if (!isLocalTestDb) return;
		// Warunek wstępny: brak flagi w CI ma dać komunikat, który NAZYWA przyczynę,
		// zamiast „expected 401 to be 200".
		wymagajFlagi("facultyPanel");
		flagaPrzed = process.env.FLAG_FACULTY_PANEL;
		process.env[ZMIENNA_HASLA] = HASLO;
		pool = new Pool({ connectionString: DATABASE_URL });
		loginRoute = await import("../route");
	});

	afterAll(async () => {
		// Przywrócenie flagi NIE jest kosmetyką. Ten plik GASI flagę w trakcie
		// (na tym polega jego wartość), a projekt `integration` biegnie
		// sekwencyjnie — zostawiona „0" mogłaby wywrócić plik, który akurat
		// pobiegnie po tym. Byłby to flak zależny od kolejności: czerwień
		// w cudzym pliku, przyczyna w tym.
		if (flagaPrzed === undefined) delete process.env.FLAG_FACULTY_PANEL;
		else process.env.FLAG_FACULTY_PANEL = flagaPrzed;
		delete process.env[ZMIENNA_HASLA];
		await pool?.query("DELETE FROM faculty_sessions");
		await pool?.end();
	});

	beforeEach(async () => {
		process.env.FLAG_FACULTY_PANEL = "1";
		await pool?.query("DELETE FROM faculty_sessions");
	});

	// DWIE WŁASNOŚCI, DWA PRZYPADKI — rozdzielone świadomie (Quinn, 2026-08-24).
	//
	// Do 2026-08-24 obie stały w jednym przypadku, w kolejności „najpierw kod
	// odpowiedzi, potem liczność". Pomiar pokazał, że to czyniło asercję
	// liczności MARTWĄ: pod mutacją zdejmującą człon ZAPIS pierwsza linia
	// rzucała wyjątek („expected 200 to be 404"), a do liczności wykonanie już
	// nie docierało. Nagłówek pliku deklarował „skutek, nie odpowiedź" —
	// a czerwień pochodziła wyłącznie z ODPOWIEDZI. Deklaracja bez pokrycia
	// w pomiarze, czyli dokładnie ta wada, którą ten plik miał zamykać.
	//
	// Rozdzielone, każda własność pada osobno i widać KTÓRA.

	it("SKUTEK: flaga ZGASZONA → w tabeli sesji NIE przybywa wiersz", async () => {
		process.env.FLAG_FACULTY_PANEL = "0";
		const przed = await liczbaSesji();

		// Hasło POPRAWNE — bez członu ZAPIS sesja by tu powstała.
		await loginRoute.POST(zadanie(HASLO));

		// Żadnej asercji na kodzie odpowiedzi PRZED tą linią: to ona jest
		// własnością nośną i musi mieć szansę się odezwać.
		expect(await liczbaSesji()).toBe(przed);
		expect(await liczbaSesji()).toBe(0);
	});

	it("ODPOWIEDŹ: flaga ZGASZONA → 404, odmowa wygląda jak brak trasy", async () => {
		// Osobno od skutku: nie potwierdzamy, że panel istnieje ani że hasło
		// było poprawne. 404, nie 401 i nie 403.
		process.env.FLAG_FACULTY_PANEL = "0";

		const res = await loginRoute.POST(zadanie(HASLO));

		expect(res.status).toBe(404);
	});

	it("KONTROLA DODATNIA: flaga ZAPALONA → 200 i przybywa DOKŁADNIE jeden wiersz", async () => {
		// Bez tego przypadku test wyżej byłby prawdziwy także wtedy, gdyby trasa
		// była po prostu zepsuta i nie tworzyła sesji NIGDY. To rozróżnienie
		// („wyłączone" kontra „zepsute") jest tu całą wartością.
		const przed = await liczbaSesji();

		const res = await loginRoute.POST(zadanie(HASLO));

		// KONTROLA LICZNOŚCI POMIARU — najpierw, nie po kodzie odpowiedzi.
		// Ta linia odpowiada na pytanie „ile rzeczy ten pomiar w ogóle widział":
		// dowodzi, że licznik POTRAFI się ruszyć (0 → 1). Bez niej przypadek
		// „nie przybywa wiersz" byłby prawdziwy także wtedy, gdyby trasa nie
		// tworzyła sesji NIGDY — i strażnik meldowałby sukces, nie mierząc nic.
		expect(await liczbaSesji()).toBe(przed + 1);
		expect(res.status).toBe(200);
	});

	it("flaga ZGASZONA → odmowa zapada PRZED sprawdzeniem hasła (złe hasło też 404)", async () => {
		// Gdyby odmowa zapadała po weryfikacji hasła, kod odpowiedzi zdradzałby,
		// czy hasło było poprawne — przy zgaszonym panelu ma nie zdradzać niczego.
		process.env.FLAG_FACULTY_PANEL = "0";

		const zle = await loginRoute.POST(zadanie("zupelnie-inne-haslo"));
		const dobre = await loginRoute.POST(zadanie(HASLO));

		expect(zle.status).toBe(404);
		expect(dobre.status).toBe(404);
		expect(await liczbaSesji()).toBe(0);
	});
});
