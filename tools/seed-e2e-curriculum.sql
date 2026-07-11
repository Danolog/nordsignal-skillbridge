-- Dosiew E2E Quinna dla 1E.1 (WYŁĄCZNIE baza testowa :5433 — odpalany przez
-- setup e2e po db:migrate:test + seed:e2e + db:ingest-curriculum).
-- Ustawia konto main na realny careerGoal pilotażu, dosiewa do L0 testową
-- pozycję exercise z pytaniem banku (koncept e2e, foundations) i czyści
-- wcześniejszy postęp konta. Idempotentny. Wypisuje question_item_id
-- (przekazywany testom przez E2E_CURRICULUM_QUESTION_ID).

BEGIN;

UPDATE students SET career_goal = 'Data Scientist'
WHERE user_id IN (SELECT id FROM "user" WHERE email = 'e2e-main@example.com');

INSERT INTO question_concepts (slug, name, trunk)
VALUES ('e2e-1e1-koncept', 'Koncept E2E 1E.1', 'foundations')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO question_items (concept_id, type, difficulty, stem, options_json, answer_json, explanation_md)
SELECT c.id, 'single_choice', 1, 'E2E: co wypisze print(2+2)?',
       '[{"text":"4"},{"text":"22"},{"text":"błąd"}]'::jsonb,
       '{"correct":0}'::jsonb, 'Dodawanie liczb całkowitych: 2+2=4.'
FROM question_concepts c
WHERE c.slug = 'e2e-1e1-koncept'
  AND NOT EXISTS (
    SELECT 1 FROM question_items qi
    WHERE qi.concept_id = c.id AND qi.stem = 'E2E: co wypisze print(2+2)?'
  );

INSERT INTO curriculum_module_items (module_id, position, kind, title, config_json)
SELECT m.id, 1, 'exercise', 'E2E: ćwiczenie testowe L0',
       jsonb_build_object('questionItemIds', jsonb_build_array(qi.id::text))
FROM curriculum_modules m
JOIN question_concepts c ON c.slug = 'e2e-1e1-koncept'
JOIN question_items qi ON qi.concept_id = c.id AND qi.stem = 'E2E: co wypisze print(2+2)?'
WHERE m.slug = 'l0-start'
ON CONFLICT (module_id, position) DO UPDATE
  SET kind = EXCLUDED.kind, title = EXCLUDED.title,
      config_json = EXCLUDED.config_json, updated_at = now();

-- Czysty postęp konta main (powtarzalność przebiegu).
DELETE FROM curriculum_item_answers WHERE student_id IN
  (SELECT s.id FROM students s JOIN "user" u ON u.id = s.user_id WHERE u.email = 'e2e-main@example.com');
DELETE FROM curriculum_item_progress WHERE student_id IN
  (SELECT s.id FROM students s JOIN "user" u ON u.id = s.user_id WHERE u.email = 'e2e-main@example.com');
DELETE FROM curriculum_module_progress WHERE student_id IN
  (SELECT s.id FROM students s JOIN "user" u ON u.id = s.user_id WHERE u.email = 'e2e-main@example.com');

COMMIT;

-- Wyjście dla setupu (question_item_id):
SELECT qi.id AS e2e_question_item_id
FROM question_items qi JOIN question_concepts c ON c.id = qi.concept_id
WHERE c.slug = 'e2e-1e1-koncept' AND qi.stem = 'E2E: co wypisze print(2+2)?';
