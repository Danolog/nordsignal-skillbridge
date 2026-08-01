// 1E.7 L6 — algorytm rekomendacji (§12.2) i precedencja ścieżki (D0), bez bazy.
//
// Rekomendacja jest JEDYNYM zdaniem tego ekranu, po którym student ma coś zrobić
// (§12.10), więc jej warianty pinujemy jednostkowo — dziesięć wariantów renderu
// z §12.6 nie może zależeć od tego, czy ktoś odpalił bazę.

import { describe, expect, it } from "vitest";
import type { LadderModule, ModuleStatus } from "../ladder";
import { resolveDiagnosisPathKey } from "../path-key";
import { pickRecommendation } from "../placement-screen";

function m(position: number, slug: string, status: ModuleStatus): LadderModule {
	return {
		id: `id-${slug}`,
		slug,
		title: `Tytuł ${slug}`,
		description: null,
		position,
		status,
		verifiedByMethod: null,
		itemCount: status === "coming_soon" ? 0 : 3,
		openedByPlacementEver: false,
	};
}

describe("pickRecommendation — §12.2, kolejność wiążąca", () => {
	it("bierze NAJGŁĘBSZY dostępny moduł, gdy korzeń jest zaliczony", () => {
		const ladder = [
			m(1, "l0-start", "completed"),
			m(2, "f1", "available"),
			m(3, "f2", "available"),
			m(4, "pandas", "available"),
			m(5, "eda", "locked"),
		];
		expect(pickRecommendation(ladder).module?.slug).toBe("pandas");
	});

	it("liczy 'in_progress' jako kandydata (moduł zaczęty to moduł, w którym da się coś zrobić)", () => {
		const ladder = [m(1, "l0-start", "completed"), m(2, "f1", "in_progress")];
		expect(pickRecommendation(ladder).module?.slug).toBe("f1");
	});

	it("NADPISANIE (DECYZJA 3): niezaliczony korzeń wygrywa z głębszym modułem", () => {
		const ladder = [
			m(1, "l0-start", "available"),
			m(2, "f1", "available"),
			m(3, "pandas", "available"),
		];
		expect(pickRecommendation(ladder).module?.slug).toBe("l0-start");
	});

	it("NIE rekomenduje 'coming_soon' — moduł otwarty, ale niezaliczalny (§12.2 v0.8)", () => {
		const ladder = [
			m(1, "l0-start", "completed"),
			m(2, "f1", "available"),
			m(3, "przyszly", "coming_soon"),
		];
		// Najgłębszy jest 'przyszly', ale wysłanie tam studenta to wysłanie w pustkę.
		expect(pickRecommendation(ladder).module?.slug).toBe("f1");
	});

	it("korzeń 'coming_soon' NIE przejmuje nadpisania (interpretacja zgłoszona Sophii)", () => {
		const ladder = [m(1, "l0-start", "coming_soon"), m(2, "f1", "available")];
		expect(pickRecommendation(ladder).module?.slug).toBe("f1");
	});

	it("wariant 10a: wszystko dostępne zaliczone → brak rekomendacji, powód 'all_completed'", () => {
		const ladder = [m(1, "l0-start", "completed"), m(2, "f1", "completed")];
		const wynik = pickRecommendation(ladder);
		expect(wynik.module).toBeNull();
		expect(wynik.noRecommendationReason).toBe("all_completed");
	});

	it("wariant 10b: jedyni kandydaci to 'coming_soon' → powód 'only_coming_soon'", () => {
		const ladder = [m(1, "l0-start", "completed"), m(2, "przyszly", "coming_soon")];
		const wynik = pickRecommendation(ladder);
		expect(wynik.module).toBeNull();
		expect(wynik.noRecommendationReason).toBe("only_coming_soon");
	});

	it("pusta drabina → brak rekomendacji, bez wybuchu", () => {
		expect(pickRecommendation([]).module).toBeNull();
	});

	it("moduł ZABLOKOWANY nigdy nie jest rekomendowany, choćby był najgłębszy", () => {
		const ladder = [m(1, "l0-start", "completed"), m(2, "f1", "available"), m(3, "eda", "locked")];
		expect(pickRecommendation(ladder).module?.slug).toBe("f1");
	});
});

// Helper zwraca PARĘ `{ pathKey, goalSource }` — `goalSource` jest nierozerwalną
// częścią tej samej decyzji (bez niego ślad pominięcia nie odróżni defektu „nie
// znamy celu" od poprawnego „cel spoza pilotażu"). Dlatego każdy przypadek pina
// OBA pola: sam klucz ścieżki przepuściłby pomyłkę w źródle bezobjawowo.
describe("resolveDiagnosisPathKey — precedencja źródeł celu (D0)", () => {
	it("cel SESJI wygrywa z celem z wiersza studenta", () => {
		expect(
			resolveDiagnosisPathKey({
				sessionCareerGoal: "Data Scientist",
				studentCareerGoal: "Frontend Developer",
			}),
		).toEqual({ pathKey: "data-science", goalSource: "session" });
	});

	it("placeholder kroku 0 (pusty łańcuch) NIE jest celem — schodzimy na wiersz studenta", () => {
		expect(
			resolveDiagnosisPathKey({ sessionCareerGoal: "", studentCareerGoal: "Data Scientist" }),
		).toEqual({ pathKey: "data-science", goalSource: "student_row" });
	});

	it("sam biały znak też nie jest celem (spacja z pola tekstowego)", () => {
		expect(
			resolveDiagnosisPathKey({ sessionCareerGoal: "   ", studentCareerGoal: "Data Scientist" }),
		).toEqual({ pathKey: "data-science", goalSource: "student_row" });
	});

	it("brak obu źródeł → brak ścieżki I źródło 'none' (defekt kolejności zapisu)", () => {
		expect(resolveDiagnosisPathKey({ sessionCareerGoal: null, studentCareerGoal: "" })).toEqual({
			pathKey: null,
			goalSource: "none",
		});
	});

	it("cel spoza pilotażu DS → brak ścieżki, ale źródło ZNANE (poprawne zachowanie)", () => {
		// Ta para odróżnia „nie znamy celu" od „znamy, ale curriculum go nie obejmuje" —
		// dwa przypadki, które przed D0 były w danych tą samą ciszą.
		expect(
			resolveDiagnosisPathKey({ sessionCareerGoal: "Kowal artystyczny", studentCareerGoal: null }),
		).toEqual({ pathKey: null, goalSource: "session" });
	});
});
