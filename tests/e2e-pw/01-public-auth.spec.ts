import { expect, test } from "@playwright/test";
import { KOMUNIKAT_ODMOWY } from "@/lib/auth/lista-dostepu";

/**
 * @safe — publiczne, read-only. ZERO zapisu do bazy, ZERO kosztu LLM.
 *
 * Pokrywa: landing, logowanie (Google + e-mail/hasło), rejestracja, panel
 * wykładowcy oraz BRAMKĘ auth (niezalogowany na trasie Bety → redirect /login).
 * Te testy wolno odpalać nawet przy .env.local celującym w prod — nie tworzą
 * sesji ani wierszy studenta (renderują tylko publiczne strony i sprawdzają
 * przekierowanie middleware ZANIM jakiekolwiek zapytanie do danych studenta).
 *
 * ⚠ TEN PLIK NIE BIEGAŁ NIGDZIE DO 2026-08-24 (W6, Quinn)
 * -------------------------------------------------------
 * Był jednym z siedmiu zestawów spoza toru CI (16 specyfikacji ogółem, 9
 * wołanych w `.github/workflows/pr.yml`). Skutek zmierzony, nie przypuszczony:
 *
 *  (1) Po scaleniu `#342` przypadek panelu wykładowcy padał od 16:02 — strona
 *      `/faculty/login` oddaje teraz 404 przy zgaszonej fladze, a przypadek
 *      żądał formularza bezwarunkowo. Nikt tego nie zobaczył, bo nikt tego nie
 *      uruchamiał. Cicha zgnilizna, nie czerwień.
 *
 *  (2) Przypadek logowania POŁYKAŁ awarię, o której złapanie prosił. Stało tu
 *      dopasowanie `getByText(/Nieprawidłowy email lub hasło/i)
 *      .or(getByText(/Coś poszło nie tak/i))` — akceptujące OBA napisy, jakie
 *      formularz potrafił wyprodukować. Przez sześć dni (2026-08-18…24)
 *      logowanie mailem było na produkcji martwe, a ten przypadek świeciłby
 *      na zielono przez cały ten czas, gdyby ktoś go uruchamiał.
 *
 * Stąd trzy zmiany naraz — pojedynczo żadna nie ma sensu: naprawa asercji,
 * zaostrzenie dopasowania i WPIĘCIE PLIKU DO CI. Naprawa pliku, którego nikt
 * nie uruchamia, jest naprawą wyłącznie na papierze.
 *
 * DLACZEGO IMPORT Z `@/lib/auth` W SPECYFIKACJI PLAYWRIGHTA — pierwszy taki
 * w tym katalogu. Komunikat odmowy ma JEDEN nośnik (`lista-dostepu.ts`);
 * przepisanie go tutaj literałem dałoby drugą kopię, która po cichu rozjedzie
 * się przy pierwszej zmianie treści przez Ryana — a rozjazd objawiłby się jako
 * ZIELONY test, bo szukałby napisu, którego nikt już nie wysyła.
 */

test.describe("@safe Strona publiczna i bramka auth", () => {
	test("Landing /: hero + CTA rejestracji, link logowania i panel uczelni", async ({ page }) => {
		await page.goto("/");
		// Copy z redesignu landingu (#6, commit 58261bf) — poprzednie asercje
		// („rynkiem pracy", „Stwórz swój Paszport", „Panel wykładowcy") były
		// dryfem speca vs strona; spec nie był odpalany od redesignu.
		await expect(page.getByRole("heading", { level: 1 })).toContainText("których szuka rynek");
		await expect(
			page.getByRole("link", { name: /Sprawdź, czego Ci brakuje/i }).first(),
		).toBeVisible();
		await expect(page.getByRole("link", { name: /Zaloguj się/i }).first()).toBeVisible();
		await expect(page.getByRole("link", { name: /Panel uczelni/i }).first()).toBeVisible();
	});

	test("Logowanie /login: Google + formularz e-mail/hasło obecne", async ({ page }) => {
		await page.goto("/login");
		await expect(page.getByRole("heading", { name: /Witaj ponownie/i })).toBeVisible();
		// Google OAuth (świeży wymóg „Google działa").
		await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
		// E-mail/hasło — pola i przycisk.
		await expect(page.getByLabel("Email")).toBeVisible();
		await expect(page.getByLabel("Hasło", { exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: /Zaloguj się/i })).toBeVisible();
	});

	test("Logowanie: złe hasło → komunikat o haśle, a NIE odmowa dostępu", async ({ page }) => {
		// Czyste read-only: sesja nie powstaje, nic nie zapisujemy.
		//
		// PO CO TEN PRZYPADEK ISTNIEJE W TEJ POSTACI — rozróżnia DWIE odmowy,
		// które dla użytkownika wyglądają podobnie, a znaczą coś zupełnie innego:
		//
		//   „Nieprawidłowy email lub hasło"  → brama OTWARTA, poświadczenia złe.
		//                                      To jest stan zdrowy.
		//   komunikat odmowy dostępu         → brama ZAMKNIĘTA: lista dozwolonych
		//                                      adresów jest pusta albo nie obejmuje
		//                                      tego adresu. Nikt się nie zaloguje.
		//
		// Poprzednia wersja przyjmowała OBA napisy naraz (`.or`), więc nie umiała
		// ich rozróżnić — a to jest jedyne rozróżnienie, po które się tu przyszło.
		//
		// KOLEJNOŚĆ ASERCJI JEST CELOWA. Gdyby najpierw stało „widoczny komunikat
		// o haśle", to przy zamkniętej bramie padłoby przeterminowanie oczekiwania
		// na tekst — komunikat mówiący „czegoś nie ma", bez słowa o liście
		// dostępu. Pad alarmowałby, nie kierował. Dlatego najpierw czytamy
		// TREŚĆ, a potem orzekamy o niej — z komunikatem, który nazywa przyczynę.
		await page.goto("/login");
		await page.getByLabel("Email").fill("nie-istnieje@example.com");
		await page.getByLabel("Hasło", { exact: true }).fill("zle-haslo-123");
		await page.getByRole("button", { name: /Zaloguj się/i }).click();

		// `p.auth-error` — jedyny nośnik błędu w obu formularzach uwierzytelniania
		// (`login-form.tsx`, `signup-form.tsx`).
		const komunikat = page.locator("p.auth-error");
		await expect(
			komunikat,
			"Formularz logowania nie pokazał ŻADNEGO komunikatu po odmowie. " +
				"Albo żądanie nie doszło do serwera, albo odpowiedź nie dotarła do widoku.",
		).toBeVisible({ timeout: 15_000 });
		const tresc = (await komunikat.textContent()) ?? "";

		// ASERCJA NOŚNA — pierwsza, żeby to ona się odezwała.
		expect(
			tresc,
			"LOGOWANIE JEST ZAMKNIĘTE DLA WSZYSTKICH: serwer odpowiedział odmową " +
				"z listy dozwolonych adresów, a nie komunikatem o haśle. Przyczyna leży " +
				"w zmiennej PILOT_ALLOWLIST (nośnik reguły: src/lib/auth/lista-dostepu.ts) — " +
				"pusta lista albo lista bez tego adresu znaczy ODMOWA WSZYSTKIM, świadomie. " +
				"Dokładnie tak wyglądała awaria produkcji 2026-08-18…24, sześć dni, 33 konta.",
		).not.toContain(KOMUNIKAT_ODMOWY);

		// Dopiero teraz stan zdrowy: brama otwarta, poświadczenia odrzucone.
		expect(
			tresc,
			"Brama jest otwarta (dobrze), ale komunikat o złych poświadczeniach ma " +
				"inną treść niż oczekiwana. Sprawdź nośnik dostarczania odmowy: " +
				"src/components/auth/login-form.tsx.",
		).toMatch(/Nieprawidłowy email lub hasło/i);
	});

	test("Rejestracja /signup: formularz dostępny", async ({ page }) => {
		await page.goto("/signup");
		await expect(page.getByLabel("Email")).toBeVisible();
		await expect(page.getByLabel("Hasło", { exact: true })).toBeVisible();
	});

	test("Panel wykładowcy /faculty/login: strona zgadza się ze stanem flagi", async ({ page }) => {
		// DO 2026-08-24 STAŁO TU: „pole hasła musi istnieć" — bezwarunkowo.
		// Po scaleniu `#342` (`src/app/faculty/layout.tsx`) zgaszona flaga zamyka
		// także POWIERZCHNIĘ HTML: `/faculty/*` oddaje 404. Bezwarunkowe żądanie
		// formularza padało więc od 16:02 tego dnia — i padało komunikatem
		// „locator nie stał się widoczny", w którym nie ma słowa „flaga".
		// To ta sama wada, którą naprawiłem rano w strażniku członu ODCZYT:
		// pad alarmował, nie kierował.
		//
		// Teraz przypadek pyta o ZGODNOŚĆ strony ze stanem flagi, a nie o jeden
		// z dwóch dopuszczalnych stanów. Dzięki temu jest prawdziwy w OBU
		// środowiskach: w CI (flaga zapalona — mierzymy produkt, nie flagę)
		// i wobec produkcji (flaga zgaszona na czas pilotażu), gdzie ten plik
		// wolno odpalać z założenia.
		const flagaZapalona = process.env.FLAG_FACULTY_PANEL === "1";
		const odpowiedz = await page.goto("/faculty/login");
		const status = odpowiedz?.status();

		const skad =
			"Stan flagi czytany ze zmiennej FLAG_FACULTY_PANEL procesu testu. " +
			"Uruchamiając ten plik przeciw ZDALNEMU wdrożeniu upewnij się, że " +
			"zgadza się ona z flagą po stronie serwera — inaczej niezgodność " +
			"znaczy tylko tyle, że oba środowiska mówią co innego. " +
			"Nośnik reguły: src/app/faculty/layout.tsx (woła FLAGS.facultyPanel).";

		if (flagaZapalona) {
			expect(
				status,
				`Flaga FLAG_FACULTY_PANEL jest ZAPALONA, więc /faculty/login ma się renderować. ${skad}`,
			).toBe(200);
			await expect(page.locator('input[type="password"]')).toBeVisible();
		} else {
			expect(
				status,
				`Flaga FLAG_FACULTY_PANEL jest ZGASZONA, więc /faculty/login ma oddać 404 — ` +
					`„off = funkcja nie istnieje", nie pusta strona. Status inny niż 404 znaczy, ` +
					`że powierzchnia HTML panelu jest otwarta mimo zgaszonego panelu. ${skad}`,
			).toBe(404);
			// Kontrola dwustronna: nie sam kod odpowiedzi, ale i brak formularza.
			// Sam 404 nie dowodzi, że formularza nie ma — strona błędu mogłaby go nieść.
			await expect(page.locator('input[type="password"]')).toHaveCount(0);
		}
	});
});

test.describe("@safe Bramka auth na trasach CareerEDGE Bety", () => {
	// Każda z tych tras jest za loginem. Niezalogowany → middleware/layout
	// przekierowuje na /login ZANIM doleci do zapytania o studenta. To potwierdza,
	// że dane Bety są chronione i że nieautoryzowany ruch nie dotyka bazy student.
	const protectedRoutes = [
		{ name: "B0 Pomocnik kariery", path: "/pomocnik-kariery" },
		{ name: "B1 Paszport", path: "/passport" },
		{ name: "B4 Samoocena (onboarding)", path: "/onboarding" },
		{ name: "Dashboard", path: "/dashboard" },
		{ name: "Projekty (marketplace)", path: "/projects" },
		{ name: "Skill-map", path: "/skill-map" },
		{ name: "Gap-analysis", path: "/gap-analysis" },
		{ name: "Profil", path: "/profil" },
	];

	for (const route of protectedRoutes) {
		test(`${route.name} (${route.path}) → przekierowanie na /login`, async ({ page }) => {
			await page.goto(route.path);
			await expect(page).toHaveURL(/\/login/);
		});
	}
});
