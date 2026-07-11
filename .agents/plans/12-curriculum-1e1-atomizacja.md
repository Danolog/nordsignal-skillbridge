# Atomizacja 1E.1 — model danych curriculum + migracje + egzekwowanie prereq

**Źródło:** ADR-014 (ZAAKCEPTOWANY, sign-off Darek+Sophia 2026-07-11), sekcje
D2/D3/D9; roadmapa §1E.1. **Data atomizacji:** 2026-07-11.
**Zasada:** całość za flagą `FLAG_CURRICULUM_PATH`; flaga OFF = zero zmian
zachowania (marketplace nietknięty). Migracje addytywne, RLS wg DoD (wzorzec 0030).
**Poza zakresem 1E.1:** treść atomów (1E.2/Sophia), egzaminy + `module_exam`
+ `assessment_sessions.module_id` (1E.3), FSRS i tabela stanu powtórek (1E.4),
mostki i kuracja (1E.5), UI drabiny (1E.6 — 1E.1 wystawia tylko API), placement
(1E.7), automatyczne checki labów/kamieni (definicje per treść — haki w configJson
teraz, implementacja checków przy 1E.6, reuse sandboxa 1.9).

## ⚠ Kolejność wdrożenia (lekcja „migracja przed deploy")

Integracja streaka (1E.1f) dotyka `activity.ts` — UNION z nowej tabeli MUSI być
**za flagą** (flag OFF → zapytanie bez nowej tabeli), inaczej deploy na prod przed
migracją wywala rytm. Niezależnie od tego: **migracja prod (Darek) przed zapaleniem
flagi**; sam merge bezpieczny przy OFF.

---

## 1E.1a · Schemat + migracja: encje curriculum (fundament)

Tabele wg D2 (wszystkie addytywne, `snake_case` w SQL):
1. `curriculum_modules` (id, slug UNIQUE, title, description, exam_config_json,
   timestamps),
2. `curriculum_path_modules` (path_key, module_id FK, `order`; UNIQUE(path_key,
   module_id), UNIQUE(path_key, order)) — **M:N od dnia 1** (decyzja: fundamenty
   współdzielone między ścieżkami),
3. `curriculum_module_prereqs` (module_id, requires_module_id; model dopuszcza DAG,
   pilot = łańcuch),
4. `curriculum_module_items` (id, module_id FK, `order`, kind ENUM
   `theory|exercise|lab|project|exam|review`, title, content_md, project_id
   nullable FK → projects, config_json; UNIQUE(module_id, order)),
5. `curriculum_item_concepts` (item_id, concept_id FK → question_concepts;
   PK złożony) — jeden kręgosłup konceptów,
6. `curriculum_item_resources` (id, item_id FK, url, label, function, **license,
   language, registration_required, verified_at**),
7. `curriculum_item_progress` (student_id, **tenant_id NOT NULL**, item_id, status
   ENUM `locked|available|in_progress|completed|skipped_by_placement`, attempts,
   last_answer_at, completed_at; PK(student_id, item_id) + indeksy),
8. `curriculum_item_answers` — **append-only** (id, student_id, **tenant_id**,
   item_id, question_item_id FK, is_correct, answered_at, hint_depth; indeks
   (student_id, answered_at)) — nośnik instrumentacji D11, cech FSRS i streaka,
9. `curriculum_module_progress` (student_id, **tenant_id**, module_id, status,
   verified_by_method ENUM `exam|diagnostic|test_out` NULL, completed_at;
   PK(student_id, module_id)).

RLS w tej samej migracji: tabele 7–9 wzorcem 0030 (ENABLE+FORCE, student_sees_own,
owner_passthrough); tabele 1–6 = definicje treści, GRANT SELECT dla zalogowanych
(bez PII). Wpisy do `docs/security/rls-matrix.md` (nowa wersja, sign-off Ryana).

**Dowód:** `pnpm db:generate` + `db:migrate` czyste na lokalnej/test; testy RLS
(student A nie czyta progress/answers studenta B; anon nie czyta nic); `tsc` 0.

## 1E.1b · Flaga `FLAG_CURRICULUM_PATH` + rejestr

Wpis do rejestru flag (wzorzec istniejących); helper w konfiguracji flag; wszystkie
trasy 1E.1d/e zwracają 404 przy OFF.

**Dowód:** test — przy OFF trasy curriculum 404; snapshot zachowania istniejących
tras bez zmian.

## 1E.1c · Ingest struktury drabiny DS (JSON → DB)

- `tools/content/curriculum-ds-drabina.json` (wersjonowany): 8 modułów (L0, F1, F2,
  F3, M-EDA, M-SQL, M-ML, M-LLM), kolejność w ścieżce 'data-science', łańcuch
  prereq, pozycje-szkielety `project` z referencją slug capstone'a (ds-eda…,
  ds-sql…, ds-pierwszy-model…, ds-llm…; mini-projekt po F3 jako pozycja `project`
  w F3). Pozycje `theory`/`exercise`/`lab` wchodzą w 1E.2 — tu tylko struktura.
- Skrypt `pnpm db:ingest-curriculum` wg ADR-010 (idempotentny, checksum, guard;
  na prod wykonuje Darek — CZERWONA LINIA).
- Kontrakt-test treści (wzorzec content-ds-projects.contract): slugi capstone'ów
  istnieją w `projects`, porządek bez dziur, łańcuch prereq liniowy i acykliczny,
  brak konceptów `retired`.

**Dowód:** ingest 2× = identyczny stan (idempotencja); kontrakt zielony.

## 1E.1d · API odczytu drabiny + egzekwowanie prereq (rdzeń zadania)

- `GET /api/curriculum` — drabina ścieżki studenta: moduły + statusy
  (locked/available/in_progress/completed + verified_by_method) z
  `curriculum_module_progress`; moduł 1 available z automatu.
- `GET /api/curriculum/modules/[id]` — pozycje modułu; **moduł locked → 403**
  (egzekwowanie w API, nie tylko UI); pozycje sekwencyjne (k+1 available po
  ukończeniu k).
- Reguła zaliczenia modułu w 1E.1 (hak pod 1E.3): wszystkie pozycje completed →
  moduł completed (verified_by_method NULL); po 1E.3 warunkiem stanie się egzamin —
  jawny komentarz + parametr w exam_config_json.

**Dowód (kluczowy z roadmapy):** test integracyjny — student bez zaliczonego
modułu N dostaje 403 na moduł N+1 (odczyt i zapis); po ukończeniu N moduł N+1
się otwiera; flaga OFF → 404, zachowanie jak dziś.

## 1E.1e · Zapis postępu: odpowiedzi + kompletowanie pozycji

- `POST /api/curriculum/items/[id]/answer` — ocena DETERMINISTYCZNA z
  `question_items` (0 LLM, wzorzec autogradera A5): wpis do
  `curriculum_item_answers` (append-only, z hint_depth) + aktualizacja
  `curriculum_item_progress`; licznik „wszystkie pytania pozycji poprawnie" →
  completed (M10 — bez progu %); błędna odpowiedź NIGDY nie jest stanem końcowym
  (R13).
- Blokada zapisu do pozycji zablokowanego modułu / nieodblokowanej pozycji (403).
- Pozycje `lab`/`project`: w 1E.1 endpoint kompletowania kamienia przyjmuje
  wynik checku (interfejs); implementacja checków automatycznych = 1E.6
  (hak: config_json.checks per kamień).

**Dowód:** testy — zapis do zablokowanej pozycji 403; odpowiedzi lądują
w answers (2 błędne + 1 poprawna = 3 wiersze, pozycja completed); attempts
i first-try-correct policzalne z answers (fundament D11).

## 1E.1f · Integracja streaka (rytm 1.18)

`src/lib/rhythm/activity.ts`: gałąź UNION z `curriculum_item_answers`
(kolumna answered_at) **wyłącznie przy zapalonej fladze** (OFF = zapytanie
bez nowej tabeli — bezpieczny deploy przed migracją prod); indeks
(student_id, answered_at) z 1E.1a.

**Dowód:** test — odpowiedź w curriculum liczy się do streaka przy ON;
przy OFF wynik identyczny z dzisiejszym (snapshot); build na czystej bazie
bez tabel curriculum nie wywala rytmu przy OFF.

## 1E.1g · Dług QG-5 partii 1: kolumny `project_learning_resources`

Addytywne, nullable: `license`, `language`, `registration_required`,
`verified_at`. Bez konsumentów w 1E.1 (wypełnia 1E.R/1E.5).

**Dowód:** migracja czysta; istniejące testy B3/marketplace zielone bez zmian.

---

## Sekwencja i PR-y

- **PR-1:** 1E.1a + 1E.1b + 1E.1g (schemat, flaga, RLS, dług QG-5) + wpis
  rls-matrix do sign-offu Ryana.
- **PR-2:** 1E.1c + 1E.1d + 1E.1e + 1E.1f (ingest, API, postęp, streak).
- Aktywacja (po obu PR): migracja prod (Darek) → ingest struktury (Darek) →
  flaga ON. Do tego czasu prod bez zmian zachowania.
- Równolegle od zaraz: Sophia może zaczynać treść L0/F1 wg parametrów D1
  (spec formatu JSON atomów = pierwszy krok 1E.2, wydam przy PR-2).

## Bramki (każdy PR)

`tsc` 0 · Biome 0 · unit + integration zielone · build OK · kontrakt-testy
zielone · rls-matrix zaktualizowana (PR-1) · dowody per atom jak wyżej.

---

## Post-merge: przegląd techniczny Ethana (2026-07-11) — ustalenia wiążące

Przegląd obu PR-ów (#161/#162): 1 KRYTYCZNE + 5 WAŻNYCH + 4 DROBNE.
Naprawione follow-upem PR-3 (`fix/1e1-path-key-tx`): mapowanie
careerGoal→path_key (KRYT — drabina była pusta dla realnych studentów; test
maskował rozjazd syntetyczną wartością), transakcja wokół answer-flow,
status `coming_soon` dla odblokowanych modułów bez pozycji, testy na
realnej wartości „Data Scientist" + strażnik mapy przeciw modelowi kariery.

**WIĄŻĄCE dla 1E.2 (nie zostawiać przypadkowi):**
1. **Tożsamość pozycji = stabilny slug, nie (module_id, position):** ingest
   treści 1E.2 wprowadza `slug` pozycji w JSON + UNIQUE(module_id, slug) jako
   klucz upsertu (position = tylko sortowanie); guard w ingeście: zmiana
   kind/config_json.questionItemIds pozycji z istniejącym postępem wymaga
   CONFIRM_CONTENT_MIGRATION=1. Inaczej wstawienie atomu w środek modułu
   podmienia treść pod postępem studentów.
2. **Recompute module_progress przy dogrywaniu pozycji:** ingest 1E.2 musi
   świadomie rozstrzygać moduły ze statusem completed, które dostają nowe
   pozycje (downgrade completed→in_progress z komunikatem ALBO jawny content
   freeze) — decyzja przy planie 1E.2.
3. **Walidacja treści w ingeście 1E.2:** questionItemIds istnieją w banku
   i status='active' (koncepty retired = strażnik); dowód idempotencji
   ingestu na :5433.
4. **Testy complete-route** (wariant C: 409/sukces/lab 501/OFF 404) —
   razem z 1E.2.
5. **hintDepth jest dziś deklaratywny od klienta** — analityka D11 nie
   traktuje go jako twardego sygnału do czasu serwerowej drabinki hintów.
6. **Checklist aktywacyjny flagi dla realnych studentów:** flaga może być ON
   (jest — trasy bezpieczne), ale ONBOARDING studentów na ścieżkę wymaga
   zaingestowanej treści 1E.2 (do tego czasu drabina = L0 `coming_soon`).

## Realizacja 1E.2 (2026-07-11) — treść fundamentów + mechanika slug/guard

Decyzje przy planie 1E.2 (Darek): **recompute = downgrade completed→in_progress**
(tylko `verified_by_method IS NULL`); **mini-projekt F3.7 = kind lab + checks**
(bez pipeline'u marketplace). Wykonanie: PR-1 (#164 — migracja 0036: slug
pozycji + option_feedback_json; ingest slug-upsert + guard
CONFIRM_CONTENT_MIGRATION + recompute + walidacje; answer dla lab; testy
complete-route z ustalenia #4; rls-matrix v0.27) i PR-2 (packer
`pnpm content:pack-curriculum` + 4 JSON-y treści L0/F1/F2/F3: 28 pozycji,
57 pytań, 19 konceptów foundations; kontrakt-test z testem determinizmu;
weryfikacja wierności 4 agentami — 57/57 kluczy odpowiedzi, 171/171 diagnoz,
contentMd verbatim; E2E zaktualizowane o 9 modułów i F1 available).
Odchylenia formatu → spec v0.2 (`docs/design/curriculum-atomy-format-spec-v0.1.md`).
Wszystkie ustalenia wiążące 1–4 z sekcji wyżej: WYKONANE (5–6 pozostają notami).
