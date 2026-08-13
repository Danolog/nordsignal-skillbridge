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

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "../onboarding-wizard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({
	toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/components/career-helper/career-helper-flow", () => ({
	CareerHelperFlow: ({ onCareerGoalChosen }: { onCareerGoalChosen?: (l: string) => void }) => (
		<button type="button" onClick={() => onCareerGoalChosen?.("Data Analyst")}>
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

/** Mock sieci: PATCH /progress, GET katalogu, POST /assessment/start, POST /onboarding. */
function mockFetch() {
	const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
		if (url === "/api/onboarding/progress" && init?.method === "PATCH") {
			return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
		}
		if (url.startsWith("/api/onboarding/market-catalog")) {
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ isRealCareerGoal: true, items: CATALOG_ITEMS }),
			});
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

/** Picker celu (stub) → profil → pominięcie sylabusa → krok 3 (Kompetencje). */
async function goToStep3(user: ReturnType<typeof userEvent.setup>) {
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
	await screen.findByText(/Zaznaczono \d+ z \d+ kompetencji rynku/i);
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
		const fork = screen.getByRole("region", { name: /Nie zaznaczono żadnej kompetencji/i });
		expect(within(fork).getByRole("button", { name: /Przejdź dalej bez testu/i })).toBeEnabled();
		expect(within(fork).getByRole("button", { name: /Wróć i zaznacz/i })).toBeEnabled();
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
			screen.queryByRole("region", { name: /Nie zaznaczono żadnej kompetencji/i }),
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
			screen.queryByRole("region", { name: /Nie zaznaczono żadnej kompetencji/i }),
		).not.toBeInTheDocument();
		expect(onboardingPosts(fetchMock)).toBe(0);
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
			screen.queryByRole("region", { name: /Nie zaznaczono żadnej kompetencji/i }),
		).not.toBeInTheDocument();
	});
});
