// @vitest-environment jsdom
/**
 * STRAŻNIK N2′ — „przy zerze zaznaczeń krok 3 nie przechodzi dalej sam".
 *
 * PO CO ISTNIEJE (wada z przejazdu człowieka, 2026-08-10). Darek zarejestrował się,
 * przeszedł kreator do końca i zapytał: „gdzie miałem zobaczyć ekran diagnozy". Ekran
 * diagnozy nie ma własnego kroku ani adresu — jest pod-widokiem kroku 3 i otwiera się
 * WYŁĄCZNIE, gdy zaznaczono ≥1 kompetencję. Przy zerze zaznaczeń ten sam przycisk, w tym
 * samym miejscu, wołał `runSubmit()` i przenosił do Wniosków bez słowa. Produkt
 * przeprowadzał człowieka obok jedynego pomiaru, jaki ma.
 *
 * CZEGO PILNUJE (reguła, nie implementacja): w trybie diagnozy zero zaznaczeń NIE MOŻE
 * skutkować zapisem onboardingu bez jawnego wyboru studenta. Miarą „cichego przejścia"
 * jest POST /api/onboarding — bo to on kończy krok 3 i wypycha do Wniosków.
 *
 * DRUGA WADA, ZMIERZONA PRZEZ LEO 2026-08-14 12:56 CEST (naprawa w tym samym pliku).
 * Naprawa N2′ postawiła drugie wyjście z kroku — „Przejdź dalej bez testu" — i dała mu
 * WŁASNĄ, uboższą bramkę (`disabled={submitting}`) obok pełnego predykatu przycisku
 * wiersza akcji. Realną ścieżką (krok 3 → 0 zaznaczeń → rozwidlenie → krok „Cel kariery" →
 * cel spoza 23 ścieżek → powrót → klik) szło:
 *     POST BODY: {"careerGoal":"Zaklinacz deszczu", …, "competencies":[]}
 * czyli onboarding domknięty pustym paszportem na celu, którego katalog nie zna. Dlatego
 * bramka ma teraz JEDEN nośnik (`canCloseStep3`), a panel nie przeżywa zmiany kontekstu.
 *
 * KONTROLA DWUSTRONNA (obowiązkowa — strażnik krzyczący na poprawny kod zostaje
 * wyciszony i przestaje bronić czegokolwiek):
 *   - czerwony przy zerze zaznaczeń bez wyboru (test 1);
 *   - ZIELONY, gdy zaznaczono ≥1 → ścieżka do diagnozy działa bez zmian (test 2);
 *   - ZIELONY, gdy student wybierze „dalej bez testu" → zapis idzie (test 3);
 *   - ZIELONY dla trybu bez diagnozy (flaga off) → zachowanie D5 nietknięte.
 * Bez tych czterech test 1 przechodziłby także dla naprawy, która po prostu blokuje krok.
 *
 * MUTACJE — pomiar 2026-08-14, komplet w opisie PR #309. Każdy człon koniunkcji osobno,
 * bo jeden pomiar nie dowodzi dwóch (CLAUDE.md §8 v1.17):
 *   m1  `setNoSelectionFork(true)` → `await runSubmit()` .............. 7 czerwonych
 *   m2a zdjęty człon `isRealGoal` z `canCloseStep3` .................. 1 (CZŁON 1/2)
 *   m2b zdjęty człon `catalog.length > 0` z `canCloseStep3` .......... 1 (CZŁON 2/2)
 *   m3  zdjęte gaszenie panelu w `advanceTo` ......................... 1 (zmiana kroku)
 *   m4  bramka przycisku rozwidlenia z powrotem na `submitting` ...... 1 (JEDEN NOŚNIK)
 *   m5  zdjęte gaszenie flagi w `handleSelectionChange` .............. 1 (panel wraca)
 * PRZEŻYŁY MUTACJĘ (mówimy to wprost, zamiast liczyć jako pilnowane): gaszenie panelu
 * w `loadCatalog` i drugi człon warunku renderowania — obie warstwy są dziś nieosiągalne
 * przy otwartym rozwidleniu. Powody i progi spłaty: komentarze w tych dwóch miejscach.
 *
 * KOSZT CZASU: `userEvent.setup({ delay: null })` zdejmuje sztuczną zwłokę między
 * zdarzeniami. Limit czasu został przy domyślnym 5 s ŚWIADOMIE — podnoszenie limitu
 * zamieniłoby wadę w dług o tym samym objawie. Jeśli ten plik zacznie się ocierać
 * o limit, przyczyną jest liczba interakcji w `goToStep3`, nie limit.
 *
 * ⚠ SPROSTOWANIE AKAPITU WYŻEJ — POMIAR, 2026-08-24 (Quinn, śledztwo po drugiej
 * czerwieni: Ethan ~11:36, Leo po południu; oba „Test timed out in 5000ms", oba
 * 12/12 zielone w izolacji).
 *
 * Zdanie „przyczyną jest liczba interakcji w `goToStep3`, nie limit" jest
 * NIEPRAWDZIWE. Zmierzone na tej samej maszynie, tym samym kodem:
 *
 *   izolacja, maszyna spokojna ....... najdłuższy przypadek  847 ms  (12/12 ✓)
 *   pełna suita, jedna sesja ......... najdłuższy przypadek 2509 ms  (12/12 ✓)
 *   pełna suita, druga sesja obok .... CAŁY PLIK 28,23 s zamiast 6,95 s
 *
 * Ostatni wiersz jest sednem: BEZ ŻADNEJ ZMIANY KODU ten sam plik zmienia czas
 * czterokrotnie. Zmienną nośną jest OBCIĄŻENIE MASZYNY, nie liczba interakcji.
 * Odczyt w chwili pomiaru: `load averages: 127.52` przy 8 rdzeniach, czyli
 * szesnastokrotne przeciążenie — inna sesja agenta liczyła równolegle własną suitę.
 *
 * Sprawdziłem też lever wskazany w akapicie wyżej. Zamiana `user.type`
 * (11 zdarzeń klawiatury) na wklejenie (1 zdarzenie) daje, mierzona NA PRZEMIAN
 * żeby obciążenie działało na oba warianty tak samo: 6,95 / 7,61 s (pisanie)
 * kontra 6,71 / 6,79 s (wklejenie) — czyli 3–11%, nie rząd wielkości. Zmianę
 * zostawiam, bo jest darmowa i wierna zachowaniu człowieka, ale ONA NIE ZAMYKA
 * TEGO FLAKA i nie wolno jej tak zaksięgować. Żadne przyspieszenie tego pliku
 * nie przetrwa skoku obciążenia o rząd wielkości.
 *
 * WNIOSEK, KTÓRY WCHODZI DO KODU NIŻEJ: skoro pad „Test timed out" nie odróżnia
 * zatłoczonej maszyny od realnego wyścigu, niech odróżnia SAM. Hak
 * `onTestFailed` dokłada do padu odczyt obciążenia i werdykt. To jest poprawka
 * na „pad alarmuje, ale nie kieruje" — ta sama, którą tego dnia zrobiłem
 * w strażniku członu ODCZYT i w specyfikacji `01-public-auth`.
 *
 * CZEGO NIE ZROBIŁEM I DLACZEGO: nie podniosłem limitu. Akapit wyżej ma rację
 * co do kierunku, nawet jeśli myli się co do przyczyny — limit 5 s jest
 * uczciwym progiem dla pliku, który na spokojnej maszynie potrzebuje 0,85 s.
 * Podniesienie go uciszyłoby sygnał, zamiast go wytłumaczyć.
 */

import { readFileSync } from "node:fs";
import { cpus, loadavg } from "node:os";
import { resolve } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, onTestFailed, vi } from "vitest";
import { OnboardingWizard } from "../onboarding-wizard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

/**
 * Cel oddawany przez Pomocnika (stub) jest ZMIENNY — testy zmiany kontekstu wracają na
 * krok „Cel kariery" i wybierają cel spoza 23 realnych ścieżek. `vi.hoisted`, bo fabryka
 * `vi.mock` jest wynoszona ponad deklaracje modułu.
 */
const stub = vi.hoisted(() => ({ careerGoal: "Data Analyst" }));

vi.mock("@/components/career-helper/career-helper-flow", () => ({
	CareerHelperFlow: ({ onCareerGoalChosen }: { onCareerGoalChosen?: (l: string) => void }) => (
		<button type="button" onClick={() => onCareerGoalChosen?.(stub.careerGoal)}>
			Wybierz cel (stub)
		</button>
	),
}));

beforeAll(() => {
	if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
	Element.prototype.scrollIntoView = vi.fn();
	if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = vi.fn();
	if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = vi.fn();
});

const CATALOG_ITEMS = [
	{ competencyName: "SQL", demandPercentage: 90, category: "Dane" },
	{ competencyName: "Python", demandPercentage: 70, category: "Język" },
];

type CatalogResponse = { isRealCareerGoal: boolean; items: typeof CATALOG_ITEMS };

/**
 * Katalog per cel. Domyślnie: „Data Analyst" realny z 2 pozycjami, każdy inny cel spoza
 * 23 ścieżek (pusto) — dokładnie jak `market-catalog/route.ts:41`. `catalogFor` pozwala
 * testom rozdzielić OBA człony bramki osobno (cel nierealny ≠ katalog pusty).
 */
function defaultCatalogFor(goal: string): CatalogResponse {
	return goal === "Data Analyst"
		? { isRealCareerGoal: true, items: CATALOG_ITEMS }
		: { isRealCareerGoal: false, items: [] };
}

/** Mock sieci: PATCH /progress, GET katalogu, POST /assessment/start, POST /onboarding. */
function mockFetch(catalogFor: (goal: string) => CatalogResponse = defaultCatalogFor) {
	const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
		if (url === "/api/onboarding/progress" && init?.method === "PATCH") {
			return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
		}
		if (url.startsWith("/api/onboarding/market-catalog")) {
			const goal = new URL(url, "http://t").searchParams.get("careerGoal") ?? "";
			return Promise.resolve({ ok: true, json: () => Promise.resolve(catalogFor(goal)) });
		}
		if (url === "/api/assessment/start" && init?.method === "POST") {
			return Promise.resolve({
				ok: true,
				status: 201,
				json: () =>
					Promise.resolve({
						sessionId: "sess-1",
						total: 2,
						uncovered: [],
						question: {
							itemId: "i1",
							competencyName: "SQL",
							type: "single_choice",
							stem: "Co robi SELECT?",
							options: ["Czyta dane", "Kasuje bazę"],
							position: 1,
							total: 2,
						},
					}),
			});
		}
		if (url === "/api/onboarding" && init?.method === "POST") {
			return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
		}
		return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

/** Ile razy poszedł POST /api/onboarding — miara „krok 3 domknięty i wypchnął do Wniosków". */
function onboardingPosts(fetchMock: ReturnType<typeof mockFetch>) {
	return fetchMock.mock.calls.filter(
		([url, init]) =>
			url === "/api/onboarding" && (init as RequestInit | undefined)?.method === "POST",
	).length;
}

function assessmentStarts(fetchMock: ReturnType<typeof mockFetch>) {
	return fetchMock.mock.calls.filter(([url]) => url === "/api/assessment/start").length;
}

/** Ciała POST /api/onboarding — do sprawdzenia, CO dokładnie poszłoby na serwer. */
function onboardingBodies(fetchMock: ReturnType<typeof mockFetch>) {
	return fetchMock.mock.calls
		.filter(
			([url, init]) =>
				url === "/api/onboarding" && (init as RequestInit | undefined)?.method === "POST",
		)
		.map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

/** Rozwidlenie N2′ — sekcja jako całość (kotwica dla fokusu i dla obecności w drzewie). */
function forkSection() {
	return screen.queryByRole("region", { name: /Nie zaznaczono żadnej kompetencji/i });
}

function forkSubmitButton() {
	return screen.queryByRole("button", { name: /Przejdź dalej bez testu/i });
}

function rowSubmitButton() {
	return screen.getByRole("button", { name: /Zatwierdź i przejdź dalej/i });
}

/**
 * Picker celu (stub) → profil → pominięcie sylabusa → krok 3 (Kompetencje).
 * `expect: "lista"` czeka na licznik zaznaczeń, `"bramka"` na bursztynowy komunikat
 * kroku 3 (cel nierealny ALBO katalog pusty — dziecko scala oba w jedną gałąź).
 */
async function goToStep3(
	user: ReturnType<typeof userEvent.setup>,
	expectView: "lista" | "bramka" = "lista",
) {
	await user.click(screen.getByRole("button", { name: /Wybierz cel \(stub\)/i }));
	await user.click(screen.getAllByRole("combobox")[0]);
	await user.click(await screen.findByRole("option", { name: "WSB Merito Gdańsk" }));
	// WKLEJENIE, NIE PISANIE: `user.type` wysyła 11 osobnych zdarzeń klawiatury,
	// każde z przerysowaniem Reacta. Zysk zmierzony na przemian: 3–11% (patrz nagłówek) —
	// realny, ale NIE zamykający flaka. Pole przyjmuje wartość końcową, nie reaguje
	// na poszczególne znaki, więc wklejenie jest wierne temu, co robi człowiek.
	await user.click(screen.getByPlaceholderText(/np\. Informatyka/));
	await user.paste("Informatyka");
	await user.click(screen.getAllByRole("combobox")[1]);
	await user.click(await screen.findByRole("option", { name: "4" }));
	await user.click(screen.getByRole("button", { name: /Dalej/i }));
	await user.click(await screen.findByRole("button", { name: /Pomiń sylabus/i }));
	// Kotwica obecna w OBU trybach kroku 3 (nagłówek pokrycia istnieje tylko poza
	// trybem binarnym — czekanie na niego uśpiłoby test właśnie w trybie diagnozy).
	if (expectView === "lista") {
		await screen.findByText(/Zaznaczono \d+ z \d+ kompetencji rynku/i);
	} else {
		await screen.findByText(/nie mamy jeszcze katalogu kompetencji z rynku/i);
	}
}

function renderWizard(diagnosticEnabled: boolean) {
	render(
		<OnboardingWizard
			user={{ id: "u1", name: "T", email: "t@t.pl" }}
			diagnosticEnabled={diagnosticEnabled}
		/>,
	);
}

/**
 * Próg, powyżej którego werdykt brzmi „zatłoczona maszyna". 4 zadania na rdzeń:
 * przy 8 rdzeniach to 32 — daleko od normalnej pracy (1–8), a incydent z 2026-08-24
 * pokazał 127,52. Próg ma odróżniać awarię środowiska od wyścigu, nie mierzyć
 * subtelności, więc jest celowo wysoki: fałszywe „to obciążenie" byłoby gorsze
 * niż brak podpowiedzi.
 */
const ZADAN_NA_RDZEN_PROG = 4;

beforeEach(() => {
	vi.clearAllMocks();
	stub.careerGoal = "Data Analyst";

	// PAD MA KIEROWAĆ, NIE TYLKO ALARMOWAĆ. „Test timed out in 5000ms" nie odróżnia
	// zatłoczonej maszyny od realnego wyścigu w kreatorze — a to jedyne rozróżnienie,
	// które przy tym padzie ma znaczenie. Odczyt obciążenia kosztuje mikrosekundy
	// i jest robiony WYŁĄCZNIE przy czerwieni, więc nie płaci za niego zielony przebieg.
	onTestFailed(() => {
		const rdzenie = cpus().length;
		const obciazenie = loadavg()[0];
		const naRdzen = obciazenie / rdzenie;
		const zatloczona = naRdzen > ZADAN_NA_RDZEN_PROG;
		console.error(
			[
				"",
				"─".repeat(74),
				` DIAGNOSTYKA PADU — obciążenie maszyny w chwili czerwieni`,
				"─".repeat(74),
				`Średnie obciążenie (1 min): ${obciazenie.toFixed(2)} przy ${rdzenie} rdzeniach ` +
					`= ${naRdzen.toFixed(1)} zadania na rdzeń.`,
				"",
				zatloczona
					? "WERDYKT: MASZYNA BYŁA ZATŁOCZONA. Jeśli pad brzmi „Test timed out”, to\n" +
						"najprawdopodobniej NIE jest wyścig w kreatorze, tylko rywalizacja o procesor\n" +
						"z inną sesją. Zmierzone 2026-08-24: ten sam plik, ten sam kod, 6,95 s przy\n" +
						"spokojnej maszynie i 28,23 s przy obciążeniu 127. NIE ponawiaj w kółko i NIE\n" +
						"podnoś limitu — powtórz na spokojnej maszynie albo zaufaj CI."
					: "WERDYKT: MASZYNA BYŁA SPOKOJNA. Ten pad NIE tłumaczy się obciążeniem —\n" +
						"potraktuj go jako realną wadę i szukaj przyczyny w kreatorze, nie w limicie.",
				"",
				"Autorytatywny jest przebieg CI na czystym kontenerze, nie ten lokalny.",
				"─".repeat(74),
				"",
			].join("\n"),
		);
	});
});

describe("N2′ — zero zaznaczeń w trybie diagnozy nie przechodzi dalej samo", () => {
	it("STRAŻNIK: 0 zaznaczeń + klik „Zatwierdź” → BRAK zapisu onboardingu, jawne rozwidlenie", async () => {
		const fetchMock = mockFetch();
		const user = userEvent.setup({ delay: null });
		renderWizard(true);
		await goToStep3(user);

		// Zero zaznaczeń — przycisk nie zapowiada testu, bo nie ma czego mierzyć.
		expect(screen.getByText(/Zaznaczono 0 z 2 kompetencji rynku/i)).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /Zatwierdź i przejdź dalej/i }));

		// SEDNO: krok NIE domknął się sam. To jest miara cichego przejścia obok pomiaru.
		expect(onboardingPosts(fetchMock)).toBe(0);
		expect(assessmentStarts(fetchMock)).toBe(0);

		// I nie stoi w miejscu bez wyjścia: są DWA jawne wyjścia, oba do kliknięcia.
		// Kotwicą są ETYKIETY SOPHII (§3 N2′, wiążące), nie nagłówek sekcji — nagłówek
		// jest mój i może zniknąć po jej przeglądzie, a strażnik ma przeżyć redakcję copy.
		expect(screen.getByRole("button", { name: /Przejdź dalej bez testu/i })).toBeEnabled();
		expect(screen.getByRole("button", { name: /Wróć i zaznacz/i })).toBeEnabled();
	});

	it("KONTROLA DWUSTRONNA: ≥1 zaznaczenie → test rusza, rozwidlenie się NIE pokazuje", async () => {
		const fetchMock = mockFetch();
		const user = userEvent.setup({ delay: null });
		renderWizard(true);
		await goToStep3(user);

		const sqlGroup = screen.getByRole("group", { name: "Poziom: SQL" });
		await user.click(within(sqlGroup).getByRole("button", { name: /Mam styczność/i }));
		await user.click(screen.getByRole("button", { name: /Zatwierdź i sprawdź się testem/i }));

		// Ścieżka do diagnozy działa bez zmian — pod-widok testu z pierwszym pytaniem.
		expect(await screen.findByText(/Co robi SELECT\?/i)).toBeInTheDocument();
		expect(assessmentStarts(fetchMock)).toBe(1);
		// Strażnik nie może czerwienić się na poprawnym kodzie: rozwidlenia tu nie ma.
		expect(
			screen.queryByRole("button", { name: /Przejdź dalej bez testu/i }),
		).not.toBeInTheDocument();
	});

	it("wybór „dalej bez testu” domyka krok — rozwidlenie to wybór, nie ślepy zaułek", async () => {
		const fetchMock = mockFetch();
		const user = userEvent.setup({ delay: null });
		renderWizard(true);
		await goToStep3(user);

		await user.click(screen.getByRole("button", { name: /Zatwierdź i przejdź dalej/i }));
		await user.click(screen.getByRole("button", { name: /Przejdź dalej bez testu/i }));

		await waitFor(() => expect(onboardingPosts(fetchMock)).toBe(1));
	});

	it("wybór „wróć i zaznacz” wraca do listy i nadal nie zapisuje", async () => {
		const fetchMock = mockFetch();
		const user = userEvent.setup({ delay: null });
		renderWizard(true);
		await goToStep3(user);

		await user.click(screen.getByRole("button", { name: /Zatwierdź i przejdź dalej/i }));
		await user.click(screen.getByRole("button", { name: /Wróć i zaznacz/i }));

		// Wiersz akcji wrócił, rozwidlenie zniknęło, zapisu nie było.
		expect(screen.getByRole("button", { name: /Zatwierdź i przejdź dalej/i })).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Przejdź dalej bez testu/i }),
		).not.toBeInTheDocument();
		expect(onboardingPosts(fetchMock)).toBe(0);
	});

	it("rozwidlenie NIE przeżywa zmiany kroku: krok 3 → krok 2 (Profil) → krok 3 = panelu nie ma", async () => {
		const fetchMock = mockFetch();
		const user = userEvent.setup({ delay: null });
		renderWizard(true);
		await goToStep3(user);

		await user.click(rowSubmitButton());
		expect(forkSection()).toBeInTheDocument();

		// Skok wstecz i z powrotem po kropkach drabinki (cel bez zmian → katalog się NIE
		// przeładowuje, więc mierzymy sam efekt zmiany kroku, nie efekt uboczny fetcha).
		await user.click(screen.getByRole("button", { name: /Krok 2: Profil/i }));
		await user.click(await screen.findByRole("button", { name: /Krok 4: Kompetencje/i }));
		await screen.findByText(/Zaznaczono 0 z 2 kompetencji rynku/i);

		// Panel orzekał o stanie sprzed skoku — po powrocie nie ma prawa wisieć w drzewie.
		expect(forkSection()).not.toBeInTheDocument();
		expect(forkSubmitButton()).not.toBeInTheDocument();
		// Krok wrócił do wiersza akcji i nadal nic nie zapisał.
		expect(rowSubmitButton()).toBeEnabled();
		expect(onboardingPosts(fetchMock)).toBe(0);
	});

	it("rozwidlenie nie WRACA samo: zaznacz → panel znika → odznacz → panel nadal go nie ma", async () => {
		const fetchMock = mockFetch();
		const user = userEvent.setup({ delay: null });
		renderWizard(true);
		await goToStep3(user);

		await user.click(rowSubmitButton());
		expect(forkSection()).toBeInTheDocument();

		// Zaznaczenie unieważnia zdanie panelu („nic nie zaznaczyłeś") → panel gaśnie.
		const sqlGroup = screen.getByRole("group", { name: "Poziom: SQL" });
		await user.click(within(sqlGroup).getByRole("button", { name: /Mam styczność/i }));
		expect(forkSection()).not.toBeInTheDocument();

		// A teraz sedno: powrót do zera zaznaczeń NIE jest kliknięciem „Zatwierdź". Panel
		// wisiałby na starej fladze i pytał o coś, o co student nie pytał. Rozdziela to dwa
		// mechanizmy, które łatwo pomylić: flaga gaśnie u pisarza zaznaczeń (żeby nie
		// zmartwychwstała), a warunek renderowania pilnuje zgodności ze stanem listy.
		await user.click(within(sqlGroup).getByRole("button", { name: /^Brak$/i }));
		expect(screen.getByText(/Zaznaczono 0 z 2 kompetencji rynku/i)).toBeInTheDocument();
		expect(forkSection()).not.toBeInTheDocument();
		expect(rowSubmitButton()).toBeEnabled();
		expect(onboardingPosts(fetchMock)).toBe(0);
	});

	it("ŚCIEŻKA ZMIERZONA PRZEZ LEO: rozwidlenie → zmiana celu na spoza 23 ścieżek → powrót = brak zapisu", async () => {
		const fetchMock = mockFetch();
		const user = userEvent.setup({ delay: null });
		renderWizard(true);
		await goToStep3(user);

		await user.click(rowSubmitButton());
		expect(forkSection()).toBeInTheDocument();

		// Krok „Cel kariery" → Pomocnik oddaje cel spoza katalogu (wolny tekst).
		stub.careerGoal = "Zaklinacz deszczu";
		await user.click(screen.getByRole("button", { name: /Krok 1: Cel kariery/i }));
		await user.click(await screen.findByRole("button", { name: /Wybierz cel \(stub\)/i }));
		await user.click(await screen.findByRole("button", { name: /Krok 4: Kompetencje/i }));
		await screen.findByText(/nie mamy jeszcze katalogu kompetencji z rynku/i);

		// SEDNO (pomiar Leo 2026-08-14 12:56 CEST): tutaj stał przycisk „Przejdź dalej bez
		// testu" z bramką `disabled={submitting}` i wypychał POST /api/onboarding z
		// careerGoal „Zaklinacz deszczu" i `competencies: []`.
		expect(forkSubmitButton()).not.toBeInTheDocument();
		expect(rowSubmitButton()).toBeDisabled();
		expect(onboardingPosts(fetchMock)).toBe(0);
		expect(onboardingBodies(fetchMock)).toEqual([]);
	});

	it("CZŁON BRAMKI 1/2 — cel spoza 23 ścieżek przy NIEPUSTYM katalogu: krok się nie domyka", async () => {
		// Rozdzielenie koniunkcji: `isRealGoal=false`, ale `catalog.length > 0`. Jedyne, co
		// blokuje, to realność celu — mutacja tego członu czerwieni WYŁĄCZNIE ten przypadek.
		const fetchMock = mockFetch(() => ({ isRealCareerGoal: false, items: CATALOG_ITEMS }));
		const user = userEvent.setup({ delay: null });
		renderWizard(true);
		await goToStep3(user, "bramka");

		await user.click(rowSubmitButton());

		expect(rowSubmitButton()).toBeDisabled();
		expect(forkSubmitButton()).not.toBeInTheDocument();
		expect(onboardingPosts(fetchMock)).toBe(0);
		expect(assessmentStarts(fetchMock)).toBe(0);
	});

	it("CZŁON BRAMKI 2/2 — katalog pusty przy REALNYM celu: krok się nie domyka", async () => {
		// Druga połowa koniunkcji: `isRealGoal=true`, `catalog.length === 0`. Blokuje wyłącznie
		// pustka katalogu — mutacja tego członu czerwieni WYŁĄCZNIE ten przypadek. Dwa osobne
		// pomiary, bo jeden nie dowodzi dwóch (CLAUDE.md §8 v1.17).
		const fetchMock = mockFetch(() => ({ isRealCareerGoal: true, items: [] }));
		const user = userEvent.setup({ delay: null });
		renderWizard(true);
		await goToStep3(user, "bramka");

		await user.click(rowSubmitButton());

		expect(rowSubmitButton()).toBeDisabled();
		expect(forkSubmitButton()).not.toBeInTheDocument();
		expect(onboardingPosts(fetchMock)).toBe(0);
		expect(assessmentStarts(fetchMock)).toBe(0);
	});

	it("A11Y (poprawka 5): fokus po otwarciu idzie na SEKCJĘ z powodem, nie na przycisk", async () => {
		mockFetch();
		const user = userEvent.setup({ delay: null });
		renderWizard(true);
		await goToStep3(user);

		await user.click(rowSubmitButton());

		// Czytnik ekranu ma przeczytać POWÓD zatrzymania kroku (nazwa sekcji + opis), zanim
		// student usłyszy nazwy dwóch wyjść. Fokus na przycisku czytał samą nazwę przycisku.
		const fork = forkSection();
		expect(fork).toHaveFocus();
		expect(fork).toHaveAttribute("aria-describedby", "ob-brak-zaznaczen-powod");
		expect(screen.getByRole("button", { name: /Wróć i zaznacz/i })).not.toHaveFocus();
	});

	/**
	 * KONTROLA STRUKTURALNA — po co czyta źródło zamiast klikać.
	 *
	 * Po naprawie stan „rozwidlenie otwarte ∧ (cel nierealny ∨ katalog pusty)" jest
	 * NIEOSIĄGALNY z interfejsu: rozwidlenie otwiera się tylko przy zdrowym katalogu, a
	 * każde zdarzenie, które katalog psuje, przechodzi przez `advanceTo` albo `loadCatalog`
	 * i gasi panel. Skutek: mutacja SAMEJ bramki przycisku rozwidlenia (powrót do
	 * `disabled={submitting}`) nie czerwieni żadnego testu behawioralnego — nie dlatego, że
	 * jest niegroźna, tylko dlatego, że drugi zamek trzyma drzwi zamknięte. Dokładnie tak
	 * wyglądał ten kod przed naprawą: jeden zamek pękł i całość puściła.
	 *
	 * CLAUDE.md §8 v1.17 przewiduje ten przypadek („gdy mutacja jest fizycznie
	 * niewykonalna — kontrola równoważna"). Kontrolą jest tu tekst źródła: reguła ma mieć
	 * JEDEN nośnik, a oba wyjścia mają go WOŁAĆ. Test pada w chwili, w której ktokolwiek
	 * wpisze predykat z powrotem do `disabled` — nie czekając, aż zmiana gdzie indziej
	 * przywróci osiągalność stanu.
	 *
	 * KOSZT: wrażliwość na formatowanie (Biome). Świadomy — alternatywą jest brak
	 * jakiegokolwiek dowodu na tę bramkę.
	 */
	it("JEDEN NOŚNIK: oba wyjścia kroku 3 wołają `canCloseStep3`, żadne nie ma własnej kopii", () => {
		// Ścieżka od korzenia projektu (vitest root), nie od `import.meta.url` — pod jsdom
		// `import.meta.url` jest adresem http i `readFileSync` go nie przyjmuje.
		const src = readFileSync(
			resolve(process.cwd(), "src/components/onboarding/onboarding-wizard.tsx"),
			"utf8",
		);
		// Bezpiecznik: pusty/nieznaleziony plik dałby test, który przechodzi zawsze.
		expect(src).toContain("export function OnboardingWizard");

		// Liczymy KOD, nie komentarze — nagłówki w tym pliku cytują starą, wadliwą bramkę
		// dosłownie („dawniej `disabled={submitting}`") i to jest wartościowy ślad, a nie
		// naruszenie. Bez tego kroku strażnik zmuszałby do wycierania historii z komentarzy.
		const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

		// Definicja dokładnie raz.
		expect(code.match(/const canCloseStep3\s*=/g) ?? []).toHaveLength(1);
		// Wołana dokładnie dwa razy — wiersz akcji i „Przejdź dalej bez testu".
		expect(code.match(/disabled=\{!canCloseStep3\}/g) ?? []).toHaveLength(2);
		// I żadne wyjście kroku 3 nie trzyma własnego predykatu obok wspólnego.
		expect(code).not.toMatch(/disabled=\{submitting\}/);
		expect(code).not.toMatch(/disabled=\{\s*submitting\s*\|\|/);
	});

	it("KONTROLA DWUSTRONNA: flaga diagnozy OFF → 0 zaznaczeń zapisuje jak dotąd (D5 nietknięte)", async () => {
		const fetchMock = mockFetch();
		const user = userEvent.setup({ delay: null });
		renderWizard(false);
		await goToStep3(user);

		await user.click(screen.getByRole("button", { name: /Zatwierdź i przejdź dalej/i }));

		// Bez diagnozy „0 zaznaczeń" jest świadomą decyzją produktu (próg min-5 zniesiony),
		// a nie mijaniem pomiaru — naprawa N2′ NIE MOŻE tego zablokować.
		await waitFor(() => expect(onboardingPosts(fetchMock)).toBe(1));
		expect(
			screen.queryByRole("button", { name: /Przejdź dalej bez testu/i }),
		).not.toBeInTheDocument();
	});
});
