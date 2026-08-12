// JEDEN NOŚNIK: łańcuch kaskady, na którym stoi kierunek (a+) długu A-1.
//
// Po A1+A2 wiersz `audit_log` nie niesie już identyfikatora osoby — jedynym
// wiązaniem jest `target_id` czytany w parze z `target_type`. Argument z motywu
// 26 RODO („po usunięciu konta wiersz przestaje być daną osobową") stoi więc
// w całości na tym, że KAŻDY z tych celów kasuje się kaskadą razem z kontem.
//
// Ten plik jest jedynym miejscem, w którym ta lista jest zapisana. Czytają
// z niego DWA strażniki, patrzące na dwie różne osie:
//   • S-A1-3 (`audit-kaskada-nosna.integration.test.ts`) — czy więzi w katalogu
//     bazy faktycznie mają `ON DELETE CASCADE`,
//   • S-A1-2 (`audit-rodo-a1-usuniecie-konta.integration.test.ts`) — czy trasy
//     emitują WYŁĄCZNIE cele z tej listy.
// Rozjazd między nimi byłby bezgłośny, dlatego lista nie jest przepisana dwa razy.
//
// NIE jest to plik testowy (brak `.test.`) — vitest go nie zbiera, tylko importuje.

/**
 * Łańcuch, na którym stoi (a+): korzeniem jest `user`, `students` jest pierwszym
 * ogniwem, reszta wisi na `students`. `assessment_sessions` i `viva_sessions`
 * są tu, bo niosą wzorzec A7 i wskaźnik sesji w `metadata`.
 */
export const WIEZI_KASKADY = [
	{ tabela: "students", kolumna: "user_id", rodzic: "user" },
	{ tabela: "passports", kolumna: "student_id", rodzic: "students" },
	{ tabela: "project_submissions", kolumna: "student_id", rodzic: "students" },
	{ tabela: "assessment_sessions", kolumna: "student_id", rodzic: "students" },
	{ tabela: "viva_sessions", kolumna: "student_id", rodzic: "students" },
] as const;

/**
 * `target_type` zapisywany w `audit_log` → tabela, na którą wskazuje `target_id`.
 *
 * Nazwy po lewej są ustalane w miejscach wywołania i NIE pokrywają się z nazwami
 * tabel (`"student"` → `students`, `"submission"` → `project_submissions`) —
 * dlatego mapowanie musi istnieć jawnie, a nie „domyślać się" przez podobieństwo.
 */
export const CELE_KASKADY: Record<string, string> = {
	passports: "passports",
	student: "students",
	submission: "project_submissions",
	assessment_session: "assessment_sessions",
};
