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
 * KONTROLA DWUSTRONNA (obowiązkowa — strażnik krzyczący na poprawny kod zostaje
 * wyciszony i przestaje bronić czegokolwiek):
 *   - czerwony przy zerze zaznaczeń bez wyboru (test 1);
 *   - ZIELONY, gdy zaznaczono ≥1 → ścieżka do diagnozy działa bez zmian (test 2);
 *   - ZIELONY, gdy student wybierze „dalej bez testu" → zapis idzie (test 3);
 *   - ZIELONY dla trybu bez diagnozy (flaga off) → zachowanie D5 nietknięte (test 5).
 * Bez tych czterech test 1 przechodziłby także dla naprawy, która po prostu blokuje krok.
 *
 * MUTACJA, KTÓRA GO CZERWIENI — patrz nagłówek zgłoszenia i `startDiagnosis`
 * (onboarding-wizard.tsx): przywrócenie `await runSubmit()` w gałęzi `names.length === 0`.
 *
 * KOSZT CZASU: `userEvent.setup({ delay: null })` zdejmuje sztuczną zwłokę między
 * zdarzeniami. Limit czasu został przy domyślnym 5 s ŚWIADOMIE — podnoszenie limitu
 * zamieniłoby wadę w dług o tym samym objawie. Jeśli ten plik zacznie się ocierać
 * o limit, przyczyną jest liczba interakcji w `goToStep3`, nie limit.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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
	await user.type(screen.getByPlaceholderText(/np\. Informatyka/), "Informatyka");
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

beforeEach(() => {
	vi.clearAllMocks();
	stub.careerGoal = "Data Analyst";
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
