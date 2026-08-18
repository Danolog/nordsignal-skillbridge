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
// Zmierzone mutacją, nie przeczytane: usunięcie warunku flagi z trasy logowania
// zostawiało 2768 testów zielonych przy fladze zapalonej i DOKŁADNIE ten sam
// wynik (4 czerwienie, wszystkie z członu ODCZYT) przy zgaszonej. Mutacja była
// niewidoczna pod obiema flagami.
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
// CO SPRAWDZAMY — SKUTEK, NIE ODPOWIEDŹ
// -------------------------------------
// Asercja stoi na LICZNOŚCI wierszy w `faculty_sessions`, nie na kodzie
// odpowiedzi. Sam kod 404 nie dowodzi niczego o zapisie: trasa mogłaby oddać
// 404 i mimo to utworzyć sesję (albo utworzyć ją wcześniej, a odmówić później).
// Mierzymy to, co zostaje w bazie.
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

	async function liczbaSesji(): Promise<number> {
		const r = await pool?.query("SELECT count(*)::int AS c FROM faculty_sessions");
		return r?.rows[0].c ?? -1;
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

	it("flaga ZGASZONA → 404 i w tabeli sesji NIE przybywa wiersz", async () => {
		process.env.FLAG_FACULTY_PANEL = "0";
		const przed = await liczbaSesji();

		const res = await loginRoute.POST(zadanie(HASLO));

		// Odmowa wygląda jak brak trasy — nie potwierdzamy, że panel istnieje
		// ani że hasło było poprawne.
		expect(res.status).toBe(404);

		// SEDNO: skutek, nie odpowiedź. Hasło było POPRAWNE, więc bez członu ZAPIS
		// sesja by tu powstała.
		expect(await liczbaSesji()).toBe(przed);
		expect(await liczbaSesji()).toBe(0);
	});

	it("KONTROLA DODATNIA: flaga ZAPALONA → 200 i przybywa DOKŁADNIE jeden wiersz", async () => {
		// Bez tego przypadku test wyżej byłby prawdziwy także wtedy, gdyby trasa
		// była po prostu zepsuta i nie tworzyła sesji NIGDY. To rozróżnienie
		// („wyłączone" kontra „zepsute") jest tu całą wartością.
		const przed = await liczbaSesji();

		const res = await loginRoute.POST(zadanie(HASLO));

		expect(res.status).toBe(200);
		expect(await liczbaSesji()).toBe(przed + 1);
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
