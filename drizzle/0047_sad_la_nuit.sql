-- ============================================================================
-- 1E.7 / DŁUG D11 — REJESTR UCZESTNIKÓW PILOTAŻU (`pilot_participants`).
--
-- CO TO ZAMYKA: miernik placementu (`curriculum.placement.computed`) nie miał
-- ani jednego czytelnika, a pierwsze zdarzenie na produkcji pochodzi z weryfikacji
-- zapłonu kontem QA (2026-08-01, Ethan) i WYGLĄDA JAK UDANY placement (qualified,
-- poziom 4, jedno odblokowanie). Pierwszy odczyt bez wyłączenia pokazałby
-- stuprocentową skuteczność zbudowaną w całości na sesji odegranej przez nas.
-- Od 2026-08-06 dochodzi drugie źródło tego samego zanieczyszczenia: Darek
-- przechodzi całą ścieżkę jako pierwszy — jego wiersz wygląda jak wiersz
-- uczestnika, a nim nie jest (zna system od środka).
--
-- REGUŁA, KTÓREJ TA TABELA JEST NOŚNIKIEM (Sophia, §6a):
--   Miernik czyta się wobec IMIENNEJ LISTY uczestników pilotażu. Zdarzenie,
--   którego nie da się przypisać do sesji diagnozy NAZWANEGO uczestnika, NIE
--   JEST OBSERWACJĄ — niezależnie od tego, jak sensownie wygląda.
--
-- DLACZEGO REJESTR WŁĄCZAJĄCY, A NIE ZNACZNIK WYKLUCZAJĄCY NA KONCIE. Sophia
-- odrzuciła rozróżniki wykluczające (domena `.invalid`, oznaczenie uczelni), bo
-- zdarzenie nie niesie `actor_id` (art. 17 RODO) i do konta dociera się wyłącznie
-- złączeniem przez `assessment_sessions`, które ZNIKA KASKADĄ przy skasowaniu
-- konta: filtr wykluczający przestaje działać dokładnie wtedy, gdy jest potrzebny.
-- Rejestr włączający używa tego samego kruchego złączenia, ale pęka w PRZECIWNĄ
-- stronę — gdy złączenie znika, zdarzenie przestaje być obserwacją. Wyłączenie
-- opiera się więc na PRZYNALEŻNOŚCI DO REJESTRU, nigdy na adresie ani na domenie;
-- w kodzie odczytu nie ma i nie może być ani jednego adresu e-mail.
--
-- ZERO NOWYCH DANYCH OSOBOWYCH: wiersz to (kto już jest w bazie) + (kohorta) +
-- (kiedy wpisany). Imienia ani adresu tu nie ma — „imienność" listy niesie konto,
-- które i tak istnieje. Powód wpisu idzie do `audit_log` (`pilot.participant.enrolled`),
-- czyli tam, gdzie rozliczalność już mieszka.
--
-- KASKADA JEST NOŚNA: `student_id ON DELETE CASCADE` — usunięcie konta (art. 17)
-- kasuje wiersz rejestru, więc zdarzenia tej osoby przestają być obserwacjami.
-- To zgodne z projektem Ryana, w którym po usunięciu konta zdarzenie miernika
-- zostaje sierotą. `tenant_id` bez kaskady (wzorzec tabel tenant-owych): skasowanie
-- tenanta z wpisanymi uczestnikami ma się wywalić, a nie osierocić rejestr.
--
-- KLUCZ (student, kohorta), nie sam student: ta sama osoba może wejść do drugiego
-- pilotażu bez kasowania śladu udziału w pierwszym.
--
-- MIGRACJA CZYSTO ADDYTYWNA — CREATE TABLE + FK + INDEX + RLS. Zero DROP, zero
-- DELETE, zero zmiany istniejących danych, zero wpływu na zachowanie produktu
-- przed pierwszym wpisem (pusty rejestr = zero obserwacji, stan poprawny i jawnie
-- zaraportowany). Tabela jest pusta po migracji — wpis wykonuje się osobno
-- (`pnpm tsx tools/pilot-enroll.ts`), świadomie i imiennie.
-- ============================================================================
CREATE TABLE "pilot_participants" (
	"student_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cohort" text NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pilot_participants_pkey" PRIMARY KEY("student_id","cohort"),
	CONSTRAINT "pilot_participants_cohort_not_blank" CHECK (length(trim("pilot_participants"."cohort")) > 0)
);
--> statement-breakpoint
ALTER TABLE "pilot_participants" ADD CONSTRAINT "pilot_participants_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_participants" ADD CONSTRAINT "pilot_participants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pilot_participants_cohort" ON "pilot_participants" USING btree ("cohort");--> statement-breakpoint
CREATE INDEX "idx_pilot_participants_tenant_id" ON "pilot_participants" USING btree ("tenant_id");--> statement-breakpoint

-- ============================================================================
-- RLS dla pilot_participants. Sekcja DOPISANA RĘCZNIE (drizzle-kit nie generuje
-- RLS/GRANT). Wzorzec: 0020 (ai_usage_ledger) — klasa „metadana operacyjna,
-- zero grantów aplikacyjnych".
--
-- Decyzja dostępowa (rls-matrix wiersz #29):
--  - app_student: ZERO grantów. Przynależność do pilotażu jest metadaną BADAWCZĄ
--    o studencie, nie treścią produktu — student nie ma się z bazy dowiadywać
--    o swoim statusie w pomiarze. O udziale informuje go człowiek przy zapisie;
--    ta tabela nie jest kanałem komunikacji z uczestnikiem.
--  - app_faculty: ZERO grantów. Ta sama granica co przy curriculum_placements
--    (warunek nośny A22-3: wykładowca nie widzi placementu nikogo, także zbiorczo).
--    Wiedza „kto jest w pilotażu" otwierałaby tę samą furtkę bokiem.
--  - zapis i odczyt: wyłącznie owner (`tools/pilot-enroll.ts`,
--    `tools/report-placement-metric.ts`) — jak raport kosztu AI z 0020.
-- ENABLE + FORCE RLS mimo braku grantów = obrona w głąb: przyszły omyłkowy GRANT
-- bez polityki nadal zwróci 0 wierszy (deny-default).
--
-- ⚠ SKUTEK DLA MIERNIKA, gdyby ktoś kiedyś nadał grant i politykę tenant-ową:
-- odczyt rolą aplikacyjną zobaczyłby PODZBIÓR rejestru, czyli po cichu MNIEJ
-- obserwacji — bo rejestr jest tu regułą włączającą. Dlatego raport wypisuje
-- liczebność rejestru OBOK liczby obserwacji: rozjazd staje się widoczny,
-- zamiast wyglądać na „pilotaż słabo idzie". Miernik czyta owner.
-- ============================================================================

ALTER TABLE pilot_participants ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE pilot_participants FORCE  ROW LEVEL SECURITY;--> statement-breakpoint

-- owner_passthrough (jak 0012/0015/0020, ADR-005) — wpis i odczyt ops.
DO $$
DECLARE
	owner_name text := current_user;
BEGIN
	EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON pilot_participants');
	EXECUTE format(
		'CREATE POLICY owner_passthrough ON pilot_participants FOR ALL TO %I USING (true) WITH CHECK (true)',
		owner_name
	);
END $$;

-- ROLLBACK (migracja w pełni addytywna — bez enumów, bez zmiany danych):
-- DO $$ BEGIN EXECUTE format('DROP POLICY IF EXISTS owner_passthrough ON pilot_participants'); END $$;
-- DROP TABLE pilot_participants;
-- Wycofanie jest BEZPIECZNE dla produktu (żadna trasa ani ekran tej tabeli nie
-- dotyka), ale KASUJE listę uczestników pilotażu, a razem z nią jedyną podstawę
-- odróżnienia obserwacji od przebiegu weryfikacyjnego — miernik zacząłby wtedy
-- pokazywać zero obserwacji, nie „wszystko". Po pierwszym wpisie wycofanie wymaga
-- decyzji Sophii (właścicielka reguły §6a), nie samego wykonawcy.