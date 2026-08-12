// JEDEN NOŚNIK: co wolno ZOSTAWIĆ po usunięciu konta (E1b, RODO art. 17).
//
// Strażnik S-U-1 (`rodo-e1b-kompletnosc-kaskady.integration.test.ts`) buduje
// graf kasowania z KATALOGU BAZY i orzeka, że każda tabela jest albo czyszczona
// kaskadą, albo stoi TUTAJ z podanym powodem. Trzeciej możliwości nie ma.
//
// Dlaczego lista jest w kodzie, a nie w dokumencie: nowa tabela z kolumną
// `student_id` bez klucza obcego NIE PSUJE NICZEGO WIDOCZNEGO — psuje wyłącznie
// prawo, którego nikt nie testuje. Lista w dokumencie nie zapala się na czerwono
// w dniu dodania takiej tabeli. Ta zapala.
//
// ZASADA, Z KTÓREJ WYPROWADZONE SĄ WSZYSTKIE POWODY PONIŻEJ (E1b §3.1):
// usuwamy wszystko, co pozwala WYODRĘBNIĆ OSOBĘ; zostawiamy to, co pozwala
// wykazać, że działaliśmy zgodnie z regułami — pod warunkiem, że po usunięciu
// konta nie wskazuje już na człowieka. Granica nie biegnie po tabelach ani po
// wrażliwości danych, tylko po pytaniu: czy ten wiersz nadal odpowiada na
// pytanie „co robił TEN KONKRETNY człowiek”.
//
// NIE jest to plik testowy (brak `.test.`) — vitest go nie zbiera, importuje.

/** Korzeń kasowania: wiersz konta. Wszystko inne wisi na nim albo nie wisi. */
export const KORZEN_KASKADY = "user";

/**
 * Tabele, które ŚWIADOMIE zostają po usunięciu konta — każda z powodem.
 *
 * Powód jest wymagany przez strażnika, nie przez uprzejmość: pozycja bez
 * powodu to dług ukryty, a lista wyjątków, której nikt nie czyta, jest atrapą
 * w drugą stronę — przepuszcza wszystko, bo dopisanie kolejnej pozycji nie
 * budzi nikogo. Dopisując tu tabelę, odpowiadasz na jedno pytanie: „czy po
 * usunięciu konta ten wiersz nadal mówi, co robił ten konkretny człowiek”.
 */
export const TABELE_BEZ_DANYCH_OSOBY: Record<string, string> = {
	// ── Ślad rozliczalności: zostaje ZAMIERZENIE ─────────────────────────────
	audit_log:
		"Ślad rozliczalności, append-only z konstrukcji (wyzwalacz blokuje UPDATE i DELETE). " +
		"Po naprawie A-1 wiersz zdarzenia studenta mówi wyłącznie „o godzinie T zaszło zdarzenie Z " +
		"dotyczące obiektu X”, gdzie X już nie istnieje — bez tożsamości i bez kontekstu żądania. " +
		"Klucz obcy na tej tabeli byłby aktywnie szkodliwy: kaskada wykonałaby DELETE, obudziła " +
		"wyzwalacz i PRZERWAŁA usuwanie konta (art. 17 niewykonalny). Pilnuje tego S-A1-3.",

	// ── Rozliczenie kosztu modeli: zostaje bez wskaźnika na osobę ────────────
	ai_usage_ledger:
		"Rozliczenie finansowe zużycia modeli językowych (art. 6 ust. 1 lit. f). Wskaźnik " +
		"`student_id` czyści się sam przy usunięciu konta (ON DELETE SET NULL) — zostaje wiersz " +
		"kosztowy bez identyfikatora osoby. Kolumna `user_id` jest strukturalnie obecna, ale nie " +
		"ma ani jednego producenta w kodzie produkcyjnym ani jednej wartości na produkcji; " +
		"zamknięcie tej drogi to osobna pozycja (E1b §3.6), patrz WYJATKI_KOLUMN_BEZ_FK.",

	// ── Uwierzytelnienie wykładowców: inna klasa, poza zakresem ──────────────
	faculty_sessions:
		"Sesje wykładowców i operatorów, nie studentów. Hasło jest współdzielone per kampus, więc " +
		"wiersz nie wskazuje na osobę fizyczną — a art. 17 dla tych kont jest dziś niewykonalny " +
		"z tego samego powodu (decyzja D-2 Ryana, trzy progi powrotu). Zakresu tego zadania " +
		"świadomie nie poszerzamy: to wada modelu uwierzytelnienia, nie ścieżki usuwania konta.",

	verification:
		"Tabela biblioteki uwierzytelniającej na żetony jednorazowe. Dziś nie zawiera ani adresu " +
		"pocztowego, ani identyfikatora konta i NIE kaskaduje. ⚠ PUŁAPKA NA PRZYSZŁOŚĆ: tryb " +
		"usuwania konta z potwierdzeniem pocztowym zapisuje tu wiersz o wartości równej " +
		"identyfikatorowi WŁAŚNIE USUWANEGO konta — czyli naprawa zostawiałaby po sobie dokładnie " +
		"to, co miała usunąć. Dlatego D-U2 wyklucza tryb pocztowy, a strażnik konfiguracji tego " +
		"pilnuje (`account-deletion-konfiguracja.test.ts`).",

	// ── Dane najemcy (uczelni), nie osoby ────────────────────────────────────
	tenants: "Dane uczelni jako najemcy, nie osoby fizycznej.",

	// ── Dane rynku i modelu kariery ──────────────────────────────────────────
	job_market_data: "Zagregowane dane rynku pracy z zaciągu — zero powiązania z osobą.",
	job_market_data_staging: "Poczekalnia zaciągu rynku — jw., zero powiązania z osobą.",
	market_refresh_runs: "Dziennik przebiegów zaciągu rynku — metryki procesu, nie osoby.",
	career_model_versions: "Wersje modelu kariery — treść katalogowa, nie dane osoby.",

	// ── Treść katalogowa: projekty ───────────────────────────────────────────
	projects:
		"Katalog projektów — treść wspólna dla wszystkich studentów. ⚠ `partner_id` identyfikuje " +
		"FIRMĘ partnerską, nie osobę fizyczną; przy pierwszym partnerze będącym osobą fizyczną " +
		"ta pozycja wraca do rozpatrzenia.",
	project_competencies: "Mapowanie projekt → kompetencja, treść katalogowa.",
	project_learning_resources: "Materiały do projektu, treść katalogowa.",
	project_source_links: "Odnośniki źródłowe projektu, treść katalogowa.",
	project_sources: "Źródła danych projektu, treść katalogowa.",
	project_hidden_tests: "Ukryte zestawy testów projektu, treść katalogowa.",

	// ── Treść katalogowa: program nauczania ──────────────────────────────────
	curriculum_modules: "Moduły programu — treść katalogowa.",
	curriculum_module_items: "Zadania w module — treść katalogowa.",
	curriculum_item_concepts: "Mapowanie zadanie → koncept — treść katalogowa.",
	curriculum_item_resources: "Materiały do zadania — treść katalogowa.",
	curriculum_module_prereqs: "Prerekwizyty między modułami — treść katalogowa.",
	curriculum_path_modules: "Kolejność modułów w ścieżce — treść katalogowa.",

	// ── Treść katalogowa: bank pytań ─────────────────────────────────────────
	question_concepts: "Mapowanie pytanie → koncept — treść katalogowa.",
	question_items: "Bank pytań — treść katalogowa.",
};

/**
 * Nazwy kolumn, które ZWYKLE wskazują na osobę. Kolumna o takiej nazwie
 * w tabeli spoza zbioru kasowanego musi mieć klucz obcy (żeby baza w ogóle
 * wiedziała, że to wskaźnik) — albo stać na liście wyjątków niżej.
 *
 * Lista jest celowo szersza niż to, co dziś istnieje: ma łapać kolumnę, której
 * jeszcze nikt nie dodał. Strażnik, który zna wyłącznie dzisiejsze nazwy,
 * pilnuje przeszłości.
 */
export const KOLUMNY_WSKAZUJACE_OSOBE = [
	"user_id",
	"student_id",
	"actor_id",
	"owner_id",
	"author_id",
	"reviewer_id",
	"target_id",
	"account_id",
	"person_id",
] as const;

/**
 * Kolumny wskazujące osobę, którym ŚWIADOMIE brak klucza obcego — z powodem.
 *
 * Klucz: `tabela.kolumna`. Trzy pozycje i ani jednej więcej; każda dopisana
 * tutaj jest decyzją, nie porządkowaniem.
 */
export const WYJATKI_KOLUMN_BEZ_FK: Record<string, string> = {
	"audit_log.actor_id":
		"Append-only, wzorzec A7. Klucz obcy oznaczałby kaskadę, kaskada oznacza DELETE, DELETE " +
		"budzi wyzwalacz append-only i PRZERYWA usuwanie konta. Po naprawie A-1 kolumna jest pusta " +
		"dla zdarzeń studenta i systemu — pilnuje tego S-A1-2, a od migracji 0048 także " +
		"ograniczenie w bazie.",
	"audit_log.target_id":
		"Append-only, wzorzec A7. Wskaźnik jest WIELOPOSTACIOWY (cztery różne tabele docelowe), " +
		"a jedna kolumna nie może mieć klucza obcego do czterech naraz. Osierocenie po usunięciu " +
		"konta zapewnia kaskada tabel docelowych — pilnuje tego S-A1-3 (struktura) i S-U-2 " +
		"(zachowanie).",
	"ai_usage_ledger.user_id":
		"DŁUG UŚPIONY, nie czynny: zero producentów w kodzie produkcyjnym i zero niepustych " +
		"wierszy na produkcji (pomiar 2026-08-10). Atrybucja kosztu idzie wyłącznie przez " +
		"`student_id`, który MA klucz obcy z ON DELETE SET NULL. Zamknięcie drogi (zdjęcie pola " +
		"z typu `AiUsageEntry` + ograniczenie CHECK w bazie) to osobna pozycja E1b §3.6, " +
		"NIEWYKONANA w tym zadaniu — patrz raport wykonawczy. PRÓG: pierwsze wywołanie podające " +
		"`userId` zamienia tę pozycję z ćwierci dnia w czyszczenie danych na produkcji.",
};

/**
 * Tabele, których strażnik NIE ZOBACZY, bo nie powstają z migracji.
 *
 * ⚠ TO JEST NAZWANA GRANICA S-U-1, nie lista do uzupełniania. Strażnik czyta
 * katalog BAZY TESTOWEJ, a ta powstaje z `drizzle/`. Tabela utworzona ręcznie
 * na produkcji (np. kopia robocza zrobiona podczas naprawy) jest dla niego
 * NIEWIDZIALNA — i to jest realny wektor: `job_market_data_bak` istnieje dziś
 * na produkcji (240 wierszy, pomiar Ethana 2026-08-10) i NIE MA jej w żadnej
 * migracji, więc nie ma jej w bazie testowej.
 *
 * Domknięcie tej luki NIE JEST testem: jest nim porównanie katalogu produkcji
 * z katalogiem migracji przy ceremonii wdrożeniowej. Właściciel: Ethan.
 * Zapisuję to tutaj, bo etykieta „niepotwierdzone” jest dopuszczalna,
 * a udawanie pokrycia nie jest (CLAUDE.md v1.17).
 */
export const GRANICA_STRAZNIKA_TABELE_SPOZA_MIGRACJI = [
	"job_market_data_bak — kopia robocza utworzona ręcznie na produkcji, poza migracjami",
] as const;
