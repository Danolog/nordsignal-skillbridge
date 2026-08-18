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
// MUTACJE CZERWIENIĄCE — wynik w opisie zgłoszenia.

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
