/**
 * Follow-up przeglądu Ethana (1E.1, KRYTYCZNE): jawne mapowanie
 * `students.career_goal` (display-string z modelu kariery, np. "Data Scientist")
 * → `curriculum_path_modules.path_key` (slug ścieżki curriculum).
 *
 * Bez tego mapowania drabina była pusta dla KAŻDEGO realnego studenta
 * (lookup po "Data Scientist" vs ingest pod 'data-science').
 *
 * Pilot ADR-014 D10: wyłącznie ścieżka DS. Cel kariery bez wpisu = curriculum
 * jeszcze nie obejmuje tej ścieżki (drabina pusta zgodnie z prawdą, nie bugiem).
 * Rollout kolejnych ścieżek = nowy wpis tutaj + ingest ich drabin (E2.C).
 */

export const CAREER_GOAL_TO_PATH_KEY: Readonly<Record<string, string>> = {
	"Data Scientist": "data-science",
};

export function pathKeyForCareerGoal(careerGoal: string): string | null {
	return CAREER_GOAL_TO_PATH_KEY[careerGoal] ?? null;
}

/**
 * Cel kariery znormalizowany: łańcuch pusty i sam biały znak to NIE cel.
 *
 * Krok 0 kreatora zakłada wiersz studenta z `career_goal: ""` jako placeholder
 * `NOT NULL` (`career-helper/session.ts`), więc „pusty" jest stanem PRZEJŚCIOWYM,
 * nie wyborem studenta.
 */
export function normalizeCareerGoal(value: string | null | undefined): string | null {
	const trimmed = value?.trim() ?? "";
	return trimmed === "" ? null : trimmed;
}

/**
 * Skąd wzięliśmy cel kariery tej diagnozy. Kod rozłączny, bez treści — trafia
 * do śladu pominięcia (`curriculum.placement.skipped`), więc nie wolno mu nigdy
 * nieść napisu celu ani niczego o wyniku studenta (granica zgody Ryana,
 * `docs/data/audit-log-taksonomia.md` v0.1).
 */
export type CareerGoalSource = "session" | "student_row" | "none";

/** Ścieżka tej diagnozy RAZEM ze źródłem, z którego wziął się cel. */
export interface DiagnosisPathResolution {
	/** `null` = nie ma dla czego liczyć: albo nie znamy celu, albo cel spoza pilotażu. */
	pathKey: string | null;
	goalSource: CareerGoalSource;
}

/**
 * ŚCIEŻKA CURRICULUM DLA TEJ DIAGNOZY — JEDYNE miejsce, w którym żyje precedencja
 * źródeł celu kariery (rozstrzygnięcie D0 Sophii: „placement liczy się dla celu,
 * DLA KTÓREGO STUDENT ODBYŁ DIAGNOZĘ").
 *
 * Kolejność wiążąca: cel sesji diagnozy → cel z wiersza studenta (zgodność wstecz,
 * `assessment_sessions.career_goal` jest NULL-owalne) → brak.
 *
 * ⚠ JEDEN NOŚNIK, NIE DWA. Wcześniej ta sama precedencja żyła równolegle tutaj
 * i prywatnie w `placement-service.ts`. Dwie kopie reguły to DOKŁADNIE mechanizm,
 * który wyprodukował D0: dwie strony założyły, że wiedzą, co robi druga. Zachowanie
 * obu kopii było wtedy identyczne — i właśnie dlatego rozjazd byłby bezobjawowy
 * (ekran L6 renderujący drabinę INNEJ ścieżki niż ta, do której placement zapisał
 * wiersze, wygląda sensownie). Hook placementu przejął tę funkcję; własnej
 * precedencji już NIE MA i nie wolno jej odtwarzać.
 *
 * ⚠ ZWRACA PARĘ, NIE SAM KLUCZ. `goalSource` jest nierozerwalną częścią TEJ SAMEJ
 * decyzji — mówi, SKĄD wziął się cel, a bez tego ślad pominięcia nie odróżni
 * defektu („nie znamy celu") od zachowania poprawnego („cel spoza pilotażu DS").
 * Rozbicie tego na dwie funkcje odtworzyłoby ten sam problem w mniejszej skali:
 * dwa wywołania, które muszą się ze sobą zgadzać. (Rozstrzygnięcie Olivera.)
 *
 * Bramka parytetu warstwy ekranu (korzeń wczytanej drabiny vs `outcome.rootSlug`)
 * ZOSTAJE — ale jej powód jest dziś WĘŻSZY niż w chwili powstania i to jedno zdanie
 * ma być zgodne z `placement-screen.ts` (dwa pliki podawały dwa różne uzasadnienia,
 * warunek W3 Leo). Po scaleniu nie pilnuje duplikatu tej reguły, a po naprawie W2/W3
 * nie pilnuje też pomyłki wołającego (`pathKey` i `outcome` jadą w jednym obiekcie).
 * Chroni WYŁĄCZNIE przed rozjazdem, którego typ nie widzi: KORZENIEM drabiny
 * zmienionym w bazie między zapisem a odczytem (porównuje pozycję 1, nie całą
 * drabinę — pełny zakres i skutek opisane przy samej bramce).
 */
export function resolveDiagnosisPathKey(params: {
	sessionCareerGoal: string | null | undefined;
	studentCareerGoal: string | null | undefined;
}): DiagnosisPathResolution {
	const sessionGoal = normalizeCareerGoal(params.sessionCareerGoal);
	const studentRowGoal = normalizeCareerGoal(params.studentCareerGoal);
	const goal = sessionGoal ?? studentRowGoal;
	const goalSource: CareerGoalSource = sessionGoal
		? "session"
		: studentRowGoal
			? "student_row"
			: "none";
	return { pathKey: goal === null ? null : pathKeyForCareerGoal(goal), goalSource };
}
