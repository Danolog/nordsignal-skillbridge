# Plan techniczny 1E.3 — mastery gate (egzamin modułowy)

**Wersja:** v0.1 · 2026-07-24 · Autor: Ethan (CTO) · Status: PLAN (do egzekucji per plasterek decyzją Olivera)
**Źródło prawdy:** ADR-014 `docs/decisions/014-curriculum-sciezka-edukacyjna.md`, D3 (wiersz `exam` tabeli „Definicja zaliczenia per typ", l.~175) + decyzja Darka pkt 1 (l.~480).
**Rama produktowa:** CLAUDE.md §7 (v1.13). Mastery gate = progresja WEWNĘTRZNA (odblokowanie następnego modułu), **nie** kredencjał wychodzący do pracodawcy → **ocena formująca, maszyna samowystarczalna** — bez human-in-the-loop dla samej bramki. Potwierdzi Sophia (PO).

> To jest plan WYKONANIA istniejącej specyfikacji ADR-014 D3, nie nowa decyzja produktowa. Wszystkie parametry (15–20 pytań, próg jako licznik błędów ≤1/15 lub ≤2/20 ≈ 90%, kalibracja osobna, cap 2 wariantów retry, correctives ≤3 atomy) pochodzą z zatwierdzonego ADR-a. Plan dzieli je na najmniejsze bezpieczne kroki i nazywa jawnie, który krok jest czerwoną linią, a który blokerem treści.

---

## 1. Audyt stanu — co JUŻ jest vs do zbudowania

Zweryfikowane czytaniem `src/lib/db/schema.ts`, `tools/content-curriculum-atoms.ts`, `src/lib/flags.ts`, `src/lib/curriculum/ladder.ts`, `src/lib/assessment/*`, `drizzle/0030`.

| Komponent | Jest / brak | Plik (kotwica) | Nota |
|---|---|---|---|
| `examConfigJson` na module | **JEST** (NULL) | `schema.ts` l.~1644 `curriculumModules` | Kolumna gotowa, brak typu/walidatora/konsumenta. Parametry egzaminu per moduł. |
| CHECK na `kind` pozycji curriculum | **JEST — z `'exam'`** | `schema.ts` l.~1717–1720 `curriculum_module_items_kind_values` | Lista już zawiera `theory/exercise/lab/project/exam/review`. **ALTER CHECK na pozycji NIE jest potrzebny** — komentarz ADR „module_exam = ALTER CHECK" dotyczy `assessment_sessions.kind`, nie pozycji (patrz niżej). |
| `assessment_sessions.kind` | **JEST — bez `'module_exam'`** | `schema.ts` l.~1307 `IN ('diagnostic')` | **TO jest czerwona linia:** żeby sesja egzaminu miała gdzie zamieszkać, trzeba ALTER CHECK + `'module_exam'`. |
| `assessment_sessions.module_id` | **BRAK** | `schema.ts` l.~1283 | ADR D9 wymaga addytywnej kolumny nullable FK → `curriculum_modules` (sesja egzaminu musi mieć adres modułu). |
| Partial unique „jedna aktywna sesja" | **JEST — bez module_id** | `drizzle/0030` l.~132 `uq_assessment_sessions_active (student_id, kind) WHERE status='in_progress'` | Dla `module_exam` musi obejmować `module_id`, inaczej test-out jednego modułu koliduje z otwartym egzaminem innego (ADR D9). Przebudowa indeksu. |
| Wzorzec pauzy/wznowienia sesji | **JEST (reuse)** | `src/lib/assessment/service.ts` (`SESSION_TTL_MS`, `isSessionExpired`), `assessmentSessions` (`status in_progress`, `planJson` zamrożony) | Egzamin dziedziczy dokładnie ten wzorzec: sesja `in_progress`, plan zamrożony przed 1. pokazaniem, TTL leniwie sprawdzany przy wznowieniu. |
| `curriculum_item_concepts` (correctives) | **JEST** | `schema.ts` l.~1728 | Kręgosłup konceptów gotowy — correctives mapują błędne pytanie → koncepty → ≤3 atomy przez tę tabelę. |
| `curriculum_module_progress.verifiedByMethod` | **JEST — `IN ('exam','diagnostic','test_out')`** | `schema.ts` l.~1889, l.~1903 | Nośnik blokady gotowy: `'exam'` (zdany egzamin) i `'test_out'` już dozwolone. Zero migracji tu. |
| Silnik oceny / wyboru wariantów | **JEST (reuse)** | `src/lib/assessment/{grade,plan,service,staircase}.ts` | `grade.ts` = deterministyczna ocena 0 LLM; `plan.ts` = wybór wariantu (FNV-1a, sól = seed sesji, reset wykluczeń) — bezpośrednio pod cap 2 wariantów retry egzaminu. |
| Drabina / warunek zaliczenia modułu | **JEST — hak pod 1E.3** | `src/lib/curriculum/ladder.ts` (nagłówek: „Po 1E.3 warunkiem stanie się egzamin") | Dziś: wszystkie pozycje `completed` → moduł `completed`, `verifiedByMethod` NULL. 1E.3 podmienia warunek na zdany egzamin. |
| `ITEM_KINDS` walidatora/packera treści | **BRAK `exam`** | `tools/content-curriculum-atoms.ts:35` = `["theory","exercise","lab"]` | Za ADR-em. Trzeba dołożyć `"exam"` + osobną gałąź walidacji (pozycja egzaminu to wskaźnik konceptów + parametry, NIE atom z 3 pytaniami MC). |
| Flaga 1E.3 | **BRAK** | `src/lib/flags.ts` (jest tylko `curriculumPath` l.~105) | Potrzebna WŁASNA flaga OFF — proponowana nazwa **`FLAG_MASTERY_GATE`** (env `FLAG_MASTERY_GATE`), „nie włączać przed tutorem 1.13". Wzorzec rejestru gotowy (`FLAGS`, `defaultValue: false`). |
| **Bank pytań egzaminacyjnych (kalibrowany OSOBNO)** | **BRAK** | `schema.ts` `questionItems` l.~1222 (pola: difficulty 1–3, status active/retired) | **Blocker treści (Sophia).** Bank ma 129 pytań ATOMOWYCH; brak pojęcia „pytanie egzaminacyjne" — `questionItems` nie ma pola odróżniającego pytanie egzaminacyjne od atomowego ani śladu kalibracji. Bez osobno kalibrowanych pytań próg 90% jest matematycznie sprzeczny z kalibracją atomów 80–90% (ADR: przy p=0,85 ~56% oblewa 1. podejście). |

**Wniosek audytu (5 zdań):** schemat jest w ~90% gotowy — `examConfigJson`, kręgosłup konceptów, `verifiedByMethod='exam'/'test_out'` i CHECK pozycji z `'exam'` już istnieją. Jedyna zmiana schemy produkcyjnej to `assessment_sessions` (ALTER CHECK + kolumna `module_id` + przebudowa partial unique) — jedna migracja, czerwona linia. Silnik oceny i wzorzec pauzy sesji są w pełni reużywalne (zero od zera). Warstwa walidatora/packera treści i flaga to czysty kod za flagą OFF. Największa nieznana to nie kod, lecz **treść: osobno kalibrowany bank pytań egzaminacyjnych, którego dziś nie ma i bez którego egzamin nie może realnie działać.**

---

## 2. Dekompozycja na plasterki

Legenda kategorii:
- **(a)** czysty kod odwracalny za flagą `FLAG_MASTERY_GATE` OFF — bezpieczny, autonomiczny (mandat Ethana Poziom 2, decyzje odwracalne).
- **(b)** migracja schemy produkcyjnej — czerwona linia ADR-010 / sekcja 4 CLAUDE.md, od v1.12 delegowana Ethanowi **pod bramkami jakości** (Leo review, backup Neon, transakcyjny SQL, autor commita = Darek, audit log).
- **(c)** zależność treściowa — Sophia (PO); kalibracja osobna, dane z pilotażu.

| # | Plasterek | Kat. | Zależy od | Zawartość |
|---|---|---|---|---|
| **P1** | Fundament typów + flaga | **(a)** | — | `FLAG_MASTERY_GATE` OFF w `flags.ts`; typ + schemat Zod `examConfigJson` (`questionCount ∈ [15,20]`, `maxErrors` jako LICZNIK, per moduł); rozszerzenie `ITEM_KINDS` o `"exam"` + gałąź walidacji pozycji egzaminu (wskaźnik konceptów + parametry, bez reguły „3 pytania MC"); testy jednostkowe walidatora. **Zero DB, zero treści, zero prod.** |
| **P2** | Migracja `assessment_sessions` | **(b)** | P1 (logicznie) | ALTER CHECK `assessment_sessions_kind_values` → dodać `'module_exam'`; ADD COLUMN `module_id` uuid nullable FK → `curriculum_modules`; przebudowa `uq_assessment_sessions_active` tak, by dla `module_exam` klucz obejmował `module_id` (dwa partial unique albo warunek złożony); wpis do rls-matrix (nowa kolumna nie zmienia polityk — `student_sees_own` po `student_id`, ale wymaga odnotowania). **Addytywna, ale ALTER CHECK na tabeli prod = migracja schemy prod.** |
| **P3** | Silnik egzaminu (plan/serwowanie/ocena/sesja) | **(a)** | P2 | Budowa planu egzaminu z banku po konceptach modułu (reuse `plan.ts`, cap 2 wariantów); serwowanie pytań bez `answer_json` (reuse `service.ts`); ocena deterministyczna (reuse `grade.ts`); logika progu = licznik błędów z `examConfigJson`; zapis sesji `module_exam` z pauzą/wznowieniem (wzorzec `assessment_sessions`: `in_progress`, plan zamrożony, TTL). Trasy istnieją tylko przy fladze ON — OFF = 404. |
| **P4** | Retry + correctives | **(a)** | P3 | Retry z INNYM wariantem (cap 2); po 2. oblaniu correctives — paczka ≤3 atomów per błędne pytanie przez `curriculum_item_concepts`; mikrocopy „zabrakło Ci 1 pytania — 2 koncepty do odświeżenia, ~15 min"; podejście (zdane czy nie) = ślad aktywności dla streaka. |
| **P5** | Integracja z drabiną + UX egzaminu | **(a)** | P3, P4 | `ladder.ts`: warunek zaliczenia modułu = zdany egzamin (`verifiedByMethod='exam'`) zamiast „wszystkie pozycje completed"; „test out" (`verifiedByMethod='test_out'`); UI: ostrzeżenie „zarezerwuj ~25 min", pauza/wznowienie, widok egzaminu; podpięcie śladu aktywności do rytmu 1.18. |
| **C1** | Bank pytań egzaminacyjnych | **(c)** | równolegle; blokuje WŁĄCZENIE flagi | Osobno kalibrowane pytania egzaminacyjne per moduł (wyższy docelowy success rate niż atomowe); wypełnienie `examConfigJson` per moduł (liczba pytań, licznik błędów); konwencja/oznaczenie „pytanie egzaminacyjne" w banku (patrz Ryzyko R4). Kalibracja domykana danymi pilotażu (metryka D11 „% zdanych za 1. podejściem"). **Autor: Sophia.** |

**Podsumowanie:** **6 plasterków** — **4 × (a)** czysty kod za flagą OFF (P1, P3, P4, P5), **1 × (b)** migracja schemy prod (P2), **1 × (c)** zależność treściowa / blocker (C1).

**Kolejność budowy:** P1 → P2 → P3 → P4 → P5. C1 biegnie równolegle po stronie Sophii; kod P3–P5 testujemy na banku syntetycznym, więc C1 nie blokuje BUDOWY, ale blokuje WŁĄCZENIE flagi na realnym egzaminie.

**Uwaga o zakresie:** `project` i `review` w `ITEM_KINDS` NIE wchodzą do 1E.3 (to 1E.6 / 1E.4). P1 dokłada wyłącznie `exam`, żeby nie rozlewać zakresu.

---

## 3. Rekomendowany PIERWSZY plasterek — P1

**Najmniejszy bezpieczny krok, zero ryzyka produkcyjnego:**

1. `FLAG_MASTERY_GATE` (OFF) w `src/lib/flags.ts` — nowy wpis w `FLAGS`, `defaultValue: false`, opis „1E.3 (ADR-014 D3): egzamin modułowy jako bramka mastery. Off = trasy 404, drabina zalicza moduł po pozycjach jak w 1E.1. Nie włączać przed tutorem 1.13."; wpis do `.env.example`.
2. Typ + schemat Zod `examConfigJson` — nowy plik `src/lib/curriculum/exam-config.ts`: `questionCount ∈ [15,20]`, `maxErrors` jako licznik dopuszczalnych błędów (walidacja spójności: `maxErrors/questionCount ≤ ~10%`), parametry per moduł. Jedno źródło prawdy parsowania kolumny `examConfigJson`.
3. Rozszerzenie walidatora treści — `ITEM_KINDS` += `"exam"` w `tools/content-curriculum-atoms.ts:35` + osobna gałąź: pozycja `exam` NIE ma reguły „dokładnie 3 pytania MC" (to wskaźnik konceptów + `examConfigJson`), musi mieć zadeklarowane koncepty (kręgosłup `curriculum_item_concepts`).
4. Testy jednostkowe walidatora egzaminu.

**Dlaczego P1 pierwszy:** dotyka wyłącznie kodu za flagą OFF i narzędzi walidacji — **zero migracji prod, zero treści, zero deploya z efektem**. Ustawia kontrakt typów, na którym wiszą wszystkie kolejne plasterki. W pełni w mandacie Ethana Poziom 2 (odwracalne, wewnętrzne). Można zbudować i scalić bez dotykania czerwonej linii P2.

---

## 4. Ryzyka

**R1 — Matematyczna spójność progu 90% vs kalibracja pytań (NAJWIĘKSZE, sprzężone z C1).**
Próg mastery to ≤1 błąd / 15 lub ≤2 / 20 (≈90%). Jeśli pytania egzaminacyjne mają ten sam docelowy success rate co atomowe (80–90%, ADR D6 pkt 6), to przy p=0,85 pojedynczego pytania ~56% studentów oblewa 1. podejście (ADR l.~484). Próg 90% i kalibracja atomów 80–90% są matematycznie sprzeczne, dopóki pytania egzaminacyjne nie są kalibrowane OSOBNO na wyższy docelowy success rate. **To nie jest problem kodu — to wymóg treściowy (C1).** Kod P3 musi być odporny na złą kalibrację (mierzyć „% zdanych za 1. podejściem" — metryka D11 — i nie zakładać, że próg jest osiągalny), ale realnej spójności nie da żaden kod bez osobnego banku. Bez C1 włączenie flagi = masowe oblewanie 1. podejścia i wheel-spinning.

**R2 — Gotowość correctives → `curriculum_item_concepts`.**
Correctives (P4) mapują błędne pytanie → koncepty → ≤3 atomy przez `curriculum_item_concepts`. To działa tylko, jeśli: (a) każde pytanie egzaminacyjne ma zadeklarowany koncept (egzekwuje walidator P1), (b) każdy koncept ma co najmniej 1 atom powtórkowy do wskazania. Jeśli koncept egzaminowany nie ma atomu-źródła, correctives zwrócą pustą paczkę — degradacja do samego mikrocopy. Wymóg kontrakt-testu treści (audyt pojemności, ADR D10): koncepty egzaminu ⊆ koncepty pokryte atomami drabiny. Bloker treści po stronie Sophii, ale kod P4 musi obsłużyć przypadek pustej paczki bez wywrotki.

**R3 — UX pauzy/wznowienia.**
Wzorzec `assessment_sessions` (`in_progress` + `planJson` zamrożony + TTL 7 dni) jest reużywalny, ale egzamin dokłada dwa styki: (a) partial unique musi obejmować `module_id` (P2), inaczej równoległy test-out innego modułu wywala insert; (b) ostrzeżenie „~25 min" i wznowienie w połowie egzaminu wymagają zapisu pozycji odpowiedzi (reuse `uq_assessment_answers_session_position`). Ryzyko średnie — wzorzec sprawdzony w diagnozie 1.11, ale przeniesienie na wielomodułowy egzamin trzeba pokryć testem integracyjnym (dwie równoległe sesje `module_exam` różnych modułów).

**R4 — Oznaczenie „pytania egzaminacyjnego" w banku (styk schema/treść, otwarte).**
`questionItems` nie ma pola odróżniającego pytanie egzaminacyjne od atomowego (tylko `difficulty 1–3`, `status`). „Kalibrowane osobno" wymaga albo (a) konwencji (np. egzamin ciągnie tylko `difficulty=3` z konceptów modułu), albo (b) nowego znacznika/kolumny — co dołożyłoby drugą mikro-migrację. ADR tego nie rozstrzyga jednoznacznie. **Do rozstrzygnięcia z Sophią przed C1**; jeśli wyjdzie na kolumnę, dopina się do P2 (jedna migracja zamiast dwóch). Rekomendacja wstępna: zacząć od konwencji (bez migracji), znacznik dodać tylko jeśli dane pilotażu pokażą, że difficulty nie wystarcza.

**R5 — Podmiana warunku zaliczenia modułu w `ladder.ts` (regresja przy fladze OFF).**
P5 zmienia „wszystkie pozycje completed → moduł completed" na „zdany egzamin". Musi być twardo za `FLAG_MASTERY_GATE`: OFF = zachowanie 1E.1 bez zmian (moduł zalicza się po pozycjach), ON = bramka egzaminu. Ryzyko: nieszczelne rozgałęzienie flagi złamie już wdrożoną drabinę 1E.1 na prodzie. Wymóg: test flagi OFF potwierdzający identyczne zachowanie drabiny + Leo review na tej ścieżce.

---

## Self-critique (principal engineer po incydencie z tech debtem)

1. **Czy każdy plasterek jest weryfikowalny, nie ogólnikiem?** P1–P5 mają konkretne pliki i kontrakty; P2 nazywa dokładny ALTER i indeks. C1 celowo miękki — to treść, nie kod. OK, ale dopisałem, że kod P3 testuje się na banku syntetycznym (weryfikowalny bez C1).
2. **Czy DoD jest maszynowo sprawdzalny?** P1 = testy walidatora + `pnpm build`; P5 = test flagi OFF (regresja drabiny). P2 = migracja + kontrakt-test rls-matrix. Domknięte na poziomie planu; twarde DoD per plasterek doprecyzuje wykonawca przy egzekucji.
3. **Czy bezpieczeństwo/RLS sprawdzone?** P2 dokłada `module_id` — odnotowałem, że polityka `student_sees_own` działa po `student_id` (kolumna nie zmienia RLS), z wpisem do rls-matrix. Bank pytań pozostaje DENY (0 grantów app_*), payload bez `answer_json` — reuse gwarancji diagnozy.
4. **Czy alternatywy/koszt udokumentowane?** R4 pokazuje dwa warianty oznaczenia pytań egzaminacyjnych z rekomendacją (konwencja przed kolumną). ALTER CHECK vs pozycja — zweryfikowałem czytaniem, że pozycja `curriculum_module_items.kind` już ma `'exam'`, więc jedyny ALTER to `assessment_sessions`; to oszczędza jedną migrację prod względem naiwnego czytania ADR-a.
5. **Czy plan prowadzi do działania?** Tak — jest jednoznaczny pierwszy plasterek (P1) w pełni w mandacie odwracalnym, jedna jawnie oznaczona czerwona linia (P2 pod bramkami v1.12) i jeden blocker treści (C1) z metryką domknięcia. Oliver ma na czym oprzeć decyzję o egzekucji.
