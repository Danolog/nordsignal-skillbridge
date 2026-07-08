ALTER TABLE "competencies" DROP CONSTRAINT "competencies_verified_by_method_values";--> statement-breakpoint
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_verified_by_method_values" CHECK ("competencies"."verified_by_method" IN ('self','diagnostic'));
-- A5/1.10: CHECK verified_by_method otwarty na 'diagnostic' (test adaptacyjny;
-- silnik 1.11, wpięcie w onboarding 1.12). DROP+ADD constraintu jest bezpieczne:
-- istniejące wiersze mają wyłącznie 'self' (Beta była zamknięta CHECK-iem 0014).
-- ROLLBACK (tylko dopóki zero wierszy 'diagnostic'):
-- ALTER TABLE competencies DROP CONSTRAINT competencies_verified_by_method_values;
-- ALTER TABLE competencies ADD CONSTRAINT competencies_verified_by_method_values
--   CHECK (verified_by_method IN ('self'));
