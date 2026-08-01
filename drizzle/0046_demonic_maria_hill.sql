-- ============================================================================
-- 1E.7 / DŁUG B1 — KLUCZ ŚCIEŻKI W NOŚNIKU ODBLOKOWANIA.
--
-- WADA, KTÓRĄ TO ZAMYKA: wiersz `curriculum_placements` nie niósł ścieżki, na
-- której policzono odblokowanie, a klucz jednoznaczności brzmiał (student, moduł).
-- Student zmieniający kierunek zostawał z odblokowaniami PORZUCONEJ drabiny,
-- NIEODRÓŻNIALNYMI od bieżących. Naprawa wstecz jest TECHNICZNIE NIEWYKONALNA:
-- wiersze są niezmienne z mocy wyzwalacza `curriculum_placements_no_update`.
--
-- DLACZEGO TERAZ: tabela jest PUSTA (zero wierszy, zweryfikowane bezpośrednio
-- przed migracją), więc dołożenie kolumny NOT NULL i poszerzenie klucza nie
-- wymaga ani jednego uzupełnienia wstecz. Okno zamyka PIERWSZY WIERSZ, nie data —
-- a flaga `FLAG_PLACEMENT_DIAGNOSTIC` jest od 2026-08-01 ZAPALONA na produkcji.
--
-- KLUCZ (student, moduł, ścieżka): dwa odblokowania tego samego modułu na dwóch
-- RÓŻNYCH ścieżkach to dwa różne fakty (inny pomiar, inna drabina, inny próg),
-- nie konflikt do połknięcia. Wąski klucz kasował drugi fakt po cichu, bo
-- `ON CONFLICT DO NOTHING` zamieniał utratę danych w brak błędu. Idempotencja
-- powtórnej diagnozy NA TEJ SAMEJ ŚCIEŻCE zostaje bez zmian.
--
-- ZAKRES ŚWIADOMIE WĄSKI: to jest zmiana ZDOLNOŚCI WYRAŻENIA, nie zachowania
-- produktu. Czy odblokowania z porzuconej ścieżki mają dalej obowiązywać, czy
-- zostać wyłącznie historią — rozstrzyga Sophia (PO). Po tej migracji schemat
-- umie zapisać OBA warianty; przed nią nie umiał żadnego.
--
-- Migracja CZYSTO ADDYTYWNA dla danych (ADD COLUMN + ADD CONSTRAINT + INDEX).
-- Jedyny DROP dotyczy INDEKSU jednoznaczności, który jest natychmiast zastąpiony
-- szerszym — żadne dane nie są kasowane ani modyfikowane.
--
-- ROLLBACK (ręcznie, gdyby był potrzebny):
--   DROP INDEX "uq_curriculum_placements_student_module_path";
--   ALTER TABLE "curriculum_placements" DROP CONSTRAINT "curriculum_placements_path_key_not_blank";
--   ALTER TABLE "curriculum_placements" DROP COLUMN "path_key";
--   CREATE UNIQUE INDEX "uq_curriculum_placements_student_module"
--     ON "curriculum_placements" USING btree ("student_id","module_id");
-- ============================================================================

-- STRAŻNIK OKNA: `ADD COLUMN ... NOT NULL` na niepustej tabeli i tak by padł,
-- ale komunikatem o „kolumnie zawierającej NULL-e" — czyli zagadką w środku
-- ceremonii produkcyjnej. Tu operator dostaje instrukcję zamiast zagadki.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM curriculum_placements) THEN
		RAISE EXCEPTION 'DLUG B1: curriculum_placements NIE jest pusta (% wierszy) w bazie "%". Kolumna path_key jest NOT NULL bez wartosci domyslnej, wiec migracja nie ma czym wypelnic istniejacych wierszy — i NIE WOLNO ich wypelniac domyslem: sciezki nie da sie odtworzyc z danych, a wiersze sa niezmienne (wyzwalacz curriculum_placements_no_update). CO ZROBIC: (a) baza LOKALNA/TESTOWA — skasuj wiersze (DELETE FROM curriculum_placements) i powtorz migracje, to sa dane testowe; (b) baza PRODUKCYJNA — ZATRZYMAJ ceremonie i eskaluj do Olivera: okno darmowej migracji zamknal pierwszy prawdziwy wiersz i decyzja o dalszym postepowaniu nie nalezy do wykonawcy.', (SELECT count(*) FROM curriculum_placements), current_database();
	END IF;
END $$;--> statement-breakpoint
DROP INDEX "uq_curriculum_placements_student_module";--> statement-breakpoint
ALTER TABLE "curriculum_placements" ADD COLUMN "path_key" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_curriculum_placements_student_module_path" ON "curriculum_placements" USING btree ("student_id","module_id","path_key");--> statement-breakpoint
ALTER TABLE "curriculum_placements" ADD CONSTRAINT "curriculum_placements_path_key_not_blank" CHECK (length(trim("curriculum_placements"."path_key")) > 0);