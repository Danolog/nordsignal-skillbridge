# Retencja danych — SkillBridge

> Centralny rejestr okresów przechowywania danych osobowych. Nowa klasa danych
> z określoną retencją = nowy wiersz tutaj (ADR, który ją wprowadza, linkuje
> ten plik). Egzekwowanie: skrypty operacyjne w `tools/` (uruchamiane ręcznie
> do czasu warstwy zadań cyklicznych) — każdy z guardem `assertTestDb`
> i trybem dry-run.
>
> **⚠ SPROSTOWANIE v0.3 — poprzednie brzmienie tego akapitu było nieprawdziwe w chwili
> zapisania.** Stare brzmienie (v0.2), cytowane dosłownie:
>
> > „**Ten plik jest jedynym nośnikiem okresów przechowywania.** `ropa.md` przy każdej
> > czynności **odsyła tutaj**, zamiast powtarzać okres i uzasadnienie (CLAUDE.md v1.17)."
>
> Obala je jedna komenda — `ropa.md` **powtarza okres**, a odsyła tutaj wyłącznie po
> *uzasadnienie*:
>
> ```
> $ git show origin/main:docs/data/ropa.md | grep -n '^\*\*Retencja'
> 110:**Retencja.** `review_logs` — 12 miesięcy (ślad behawioralny, art. 5 ust. 1 lit. e); `review_states`
> 263:**Retencja.** Czas trwania konta — uzasadnienie i zastrzeżenie co do `blocking_hole_slug`:
> 340:**Retencja: BEZTERMINOWA, i to jest świadomy kompromis, nie przeoczenie.** Tabela jest
> ```
> Na tej gałęzi to samo, w czterech miejscach — wpisy #3, #5, #6, #7:
>
> ```
> $ grep -n '^\*\*Retencja' docs/data/ropa.md
> 362:**Retencja.** `review_logs` — 12 miesięcy (ślad behawioralny, art. 5 ust. 1 lit. e); `review_states`
> 515:**Retencja.** Czas trwania konta — uzasadnienie i zastrzeżenie co do `blocking_hole_slug`:
> 592:**Retencja: BEZTERMINOWA — okres nazwany, nie domyślny.** Uzasadnienie, konstrukcja zgodności
> 801:**Retencja.** Czas trwania konta studenta, z **przeglądem celowanym przy zamknięciu kohorty** —
> ```
> (oba odczyty 2026-08-12.)
>
> **Brzmienie obowiązujące:** ten plik jest **źródłem** okresów przechowywania —
> **jedynym miejscem, w którym okres się USTALA**. Nie jest jedynym miejscem, w którym
> okres jest **zapisany**, i nie może nim być: dwa przepisy RODO wymagają powtórzenia liczby
> gdzie indziej.
>
> **Trzy nośniki, wszystkie nazwane (CLAUDE.md v1.17 — „świadomy drugi nośnik jest
> dopuszczalny, ale nie po cichu"):**
>
> | Nośnik | Rola | Dlaczego nie da się go zwinąć |
> |---|---|---|
> | `docs/data/retention.md` (ten plik) | **źródło** — tu okres się ustala | — |
> | `docs/data/ropa.md` (rejestr czynności) | **kopia wymuszona przepisem** | art. 30 ust. 1 lit. f RODO — rejestr czynności zawiera *planowane terminy usunięcia*. Odesłanie zamiast liczby jest oceną prawną, której **nie podejmuję sam** (nie jestem prawnikiem — patrz `docs/legal/klauzula-informacyjna-art13.md`, Z-1); do rozstrzygnięcia przez Wendy w Fazie 3 |
> | `docs/legal/klauzula-informacyjna-art13.md`, sekcja 7 | **kopia wymuszona przepisem** | art. 13 ust. 2 lit. a — okres podaje się **osobie**, nie wolno odesłać jej do rejestru wewnętrznego. Skrócenie okresu już zakomunikowanego studentom wymaga dodatkowo poinformowania ich (art. 13 ust. 3) |
>
> **Próg (obowiązuje od v0.3):** zmiana któregokolwiek okresu w tabeli niżej jest
> **niedomknięta**, dopóki nie zostanie przeniesiona do **wszystkich** pozostałych nośników
> z tabeli wyżej.
>
> **Strażnik maszynowy (od v0.4): `tests/unit/rodo/okresy-retencji.contract.test.ts`.** Porównuje
> okresy w **trzech** nośnikach naraz i **pada**, gdy się rozjadą. Do v0.3 strażnika nie było
> i nazwałem to „niepotwierdzonym" — **niesłusznie**: CLAUDE.md v1.17 rezerwuje tę etykietę dla
> dowodu **fizycznie niewykonalnego**, a tutaj był to jeden test bez bazy. Poprawione po warunku
> W-B Leo (zgłoszenie #290). **Nowy wiersz w tabeli niżej bez klucza `<!-- retencja:… -->`
> w każdym nośniku = czerwony test**, nie cicha luka.
>
> **Dlaczego to sprostowanie stoi tak wysoko, a nie w changelogu:** zdanie „jedyny nośnik"
> było **przesłanką nośną** całego argumentu o zgodności z v1.17 w tym pakiecie i działało
> na moją korzyść — czyniło problem mniejszym, niż jest. Dokładnie ta klasa przesłanki,
> którą CLAUDE.md sekcja 8 (v1.16) każe sprawdzić **przed** publikacją, nie po.

**Wersja:** v0.4 · 2026-08-12 · **Owner:** Ryan (CRCO nordsignal) → Wendy (Legal) od Fazy 3.

**Changelog v0.3 → v0.4 (2026-08-12) — Ryan (CRCO), zadanie E2c pakietu RODO + domknięcie warunku
W-B Leo przy zgłoszeniu #290.** Dwie zmiany, **bez ruszania choćby jednego okresu**:
**(1)** trzecim nośnikiem staje się **klauzula informacyjna z art. 13**
(`docs/legal/klauzula-informacyjna-art13.md`, sekcja 7) — art. 13 ust. 2 lit. a nie pozwala odesłać
studenta do rejestru wewnętrznego, więc liczby muszą paść wobec niego wprost; przy okresach już
zakomunikowanych studentom skrócenie wymaga dodatkowo poinformowania ich (art. 13 ust. 3);
**(2)** **strażnik maszynowy POWSTAŁ** — `tests/unit/rodo/okresy-retencji.contract.test.ts`.
Zastępuje etykietę „niepotwierdzony", którą w v0.3 nałożyłem na siebie **szerzej, niż CLAUDE.md
v1.17 pozwala**: ścieżka „niepotwierdzony" jest zarezerwowana dla dowodu **fizycznie
niewykonalnego**, a tu dowód był tani. Znalezisko: Leo (Tech Lead), warunek W-B przy #290.

**Changelog v0.2 → v0.3 (2026-08-12) — Ryan (CRCO), domknięcie warunku Leo przy zgłoszeniu #288.**
Dwa sprostowania jawne, **bez ruszania choćby jednego okresu**:
**(1)** wiersz „Znaczniki czasu odsłonięcia podpowiedzi" twierdził „Egzekwowanie: BRAK SKRYPTU" —
**skrypt istnieje i egzekwuje dokładnie ten wiersz** (znalezisko Leo, `tools/enforce-retention.ts`,
reguła `hints-at`); dług przesunięty na to, czego naprawdę brakuje — wyzwalacza cyklicznego.
Doprecyzowane przy okazji dwa sąsiednie wiersze (`review_logs`, viva) i stopka, żeby ta sama
pomyłka nie dała się odczytać po raz trzeci;
**(2)** akapit nagłówka „ten plik jest jedynym nośnikiem okresów" — **nieprawda wprowadzona
w tym samym pakiecie** (znalezisko własne przy weryfikacji punktu 1), sprostowana wyżej.

**Changelog v0.1 → v0.2 (2026-08-10) — Ryan (CRCO), zadanie E2b pakietu RODO:**
**(1)** nowy wiersz **`pilot_participants`** (rejestr uczestników pilotażu, RoPA wpis #7) —
analiza wykonana od zera, **nie kopia** reguły z sąsiedniego wiersza `curriculum_placements`;
różnica nazwana w kolumnie „Podstawa";
**(2)** nowy wiersz **`audit_log`** — domknięcie rozjazdu: RoPA wpis #6 od 2026-08-01 mówił
„retencja bezterminowa", a ten rejestr nie miał o tej tabeli **ani jednego zdania** (zmierzone:
`git show origin/main:docs/data/retention.md | grep -ci "audit_log"` → **0**, odczyt 2026-08-10);
**(3)** **sprostowanie** kolumny „Co zostaje" w wierszu `placement_events` — brzmiało „nic",
a zostają trzy rzeczy (szczegóły: `ropa.md`, sekcja „Wpis #4 — sprostowanie").

| Dane | Tabela / kolumna | Okres | Od kiedy liczony | Co zostaje | Podstawa |
|---|---|---|---|---|---|
| <!-- retencja:placement_events --> Zdarzenia placement (deklarowane, za zgodą) | `placement_events` (całe wiersze) | **do odwołania zgody** (delete-on-revoke w tx zgody) | udzielenie zgody (`students.placement_decided_at`) | **SPROSTOWANE v0.2 — było „nic".** Same zdarzenia znikają; zostają: (a) `students.placement_consent` + `placement_decided_at` (dowód, że zgoda była i została cofnięta — art. 7 ust. 1), (b) wiersze `audit_log` `placement.consent.granted`/`.revoked`, chronione append-only. Agregaty E2.H liczone na żywo — student znika z metryki | 1.17, decyzje Darka 2026-07-10; **zasięg obietnicy „delete-on-revoke" sprostowany: `docs/data/ropa.md`, sekcja „Wpis #4 — sprostowanie" (Ryan, 2026-08-10, znalezisko Maxa)** |
| <!-- retencja:viva_answers --> Surowe odpowiedzi obrony ustnej (viva) | `viva_answers.content` | **12 miesięcy** | prawomocne rozstrzygnięcie sesji (`viva_sessions.completedAt`; przy eskalacji do człowieka — decyzja z `submission_reviews`) | `viva_sessions.resultJson` (punkty + uzasadnienia sędziego, bez surowego tekstu studenta) | ADR-013 D3 (sign-off Darka 2026-07-09). **Egzekwowanie (dopisane v0.3 — wiersz milczał o tym): reguła `viva-content` w `tools/enforce-retention.ts`** — druga z dwóch w `RULES`; uruchamianie jak wyżej (ręczne, bez wyzwalacza cyklicznego) |
| <!-- retencja:hints_at --> Znaczniki czasu odsłonięcia podpowiedzi | `curriculum_item_progress.hints_revealed_json` → `at[]` | **12 miesięcy** | każdy znacznik osobno (data jego zapisu) | `d` — maksymalna głębokość (stan nauki, bez ograniczenia czasowego) | `docs/security/hint-reveals-retencja-signoff.md` (Ryan, 2026-07-22); ADR-018 D1. **SPROSTOWANE v0.3 — brzmiało: „Egzekwowanie: BRAK SKRYPTU — dług, termin: pierwsza realna rejestracja studenta". To była nieprawda.** Skrypt istnieje i egzekwuje **dokładnie ten wiersz**: `tools/enforce-retention.ts`, reguła `hints-at` — pierwsza z dwóch w tablicy `RULES` (`git show origin/main:tools/enforce-retention.ts \| grep -nE '^\s*id: '` → `128: id: "hints-at"`, `185: id: "viva-content"`, odczyt 2026-08-12); przycina znaczniki `at` starsze niż 12 miesięcy i **zostawia `d`**. **Czego naprawdę brakuje — i to jest dług: uruchamiania.** Skrypt nie ma wyzwalacza cyklicznego ani wpisu w `package.json` (`git grep -n 'enforce-retention' origin/main` → wyłącznie sam plik i jego test integracyjny, odczyt 2026-08-12); wywołanie jest ręczne (`pnpm exec tsx tools/enforce-retention.ts --execute`), a dla bazy zdalnej wymaga jawnej flagi operatora `CONFIRM_PROD_DB=1` (guard `tools/assert-test-db.ts`). **Dług przesunięty, nie zamknięty; termin bez zmian — pierwsza realna rejestracja studenta.** Znalezisko: Leo (Tech Lead), bramka przy zgłoszeniu #288, 2026-08-12 |
| <!-- retencja:curriculum_progress --> Stan ścieżki nauki (postęp i odpowiedzi) | `curriculum_item_progress`, `curriculum_item_answers` (całe wiersze, w tym `answered_at`) | **czas trwania konta studenta** | utworzenie wiersza | nic (kaskada `student_id ON DELETE CASCADE`) | `docs/security/hint-reveals-retencja-signoff.md` (Ryan, 2026-07-22) — okres podyktowany celem FSRS (model zapominania w skali miesięcy); przegląd przed pierwszą realną rejestracją |
| <!-- retencja:review_logs --> Ślad ocen powtórek (FSRS) | `review_logs` (całe wiersze — `rating`, `stability_before/after`, `elapsed/scheduled_days`, `reviewed_at`) | **12 miesięcy** | `reviewed_at` (każdy wiersz osobno) | nic (kaskada `student_id ON DELETE CASCADE`) | `docs/data/ropa.md` (czynność „Profilowanie uczenia się"); rls-matrix v0.30 warunek RODO (a), Ryan 2026-07-25. Append-only ślad behawioralny → **art. 5 ust. 1 lit. e** (ograniczenie przechowywania); materiał kalibracji silnika FSRS + audyt. Analog `viva_answers.content`/hint_reveals `at[]` (12 m-cy). **DOPRECYZOWANE v0.3 — brzmiało: „Egzekwowanie: BRAK SKRYPTU — dług, wspólny skrypt R-1 rejestru, termin: pierwsza realna rejestracja studenta". Zdanie było prawdziwe co do rzeczy, nieprecyzyjne co do słowa** (skrypt R-1 **istnieje**; brakuje w nim reguły dla tego wiersza). Brzmienie obowiązujące: **Egzekwowanie: BRAK REGUŁY w skrypcie R-1** — `tools/enforce-retention.ts` ma dziś dwie reguły (`hints-at`, `viva-content`) i ten wiersz **nie jest żadną z nich**. Dług = dopisanie trzeciego obiektu do tablicy `RULES` (nowy skrypt niepotrzebny — tak ten skrypt został zaprojektowany). Termin bez zmian: pierwsza realna rejestracja studenta |
| <!-- retencja:review_states --> Żywy stan FSRS (co na dziś) | `review_states` (całe wiersze — `stability`/`difficulty`/`due`/`reps`/`lapses` per student × koncept) | **czas trwania konta studenta** | utworzenie/aktualizacja wiersza | nic (kaskada `student_id ON DELETE CASCADE`) | `docs/data/ropa.md`; rls-matrix v0.30 warunek RODO (a), Ryan 2026-07-25 — **stan roboczy**, nie ślad: bez osobnego okresu póki konto aktywne (skrócenie zepsułoby funkcję produktu — model zapominania FSRS liczy się w miesiącach/latach, nie chroniłoby studenta). Okres **nazwany**, nie domyślny. Art. 17 (kasowanie na żądanie) realizowany automatycznie kaskadą |
| <!-- retencja:curriculum_placements --> Odblokowania modułów z diagnozy (placement curriculum) | `curriculum_placements` (całe wiersze — `level`, `threshold`, `reason`, `support_mode`, `blocking_hole_slug`, odniesienie do sesji diagnozy) | **czas trwania konta studenta** | utworzenie wiersza (`unlocked_at`; wiersz nigdy nie jest aktualizowany) | nic (kaskada `student_id ON DELETE CASCADE`) | `docs/data/ropa.md` wpis #5 („Automatyczne dopasowanie ścieżki nauki"); rls-matrix v0.32; Ryan (CRCO) 2026-07-26, bramka projektowa 1E.7 L3. **To NIE jest ślad behawioralny — wiersz jest NOŚNIKIEM UPRAWNIENIA** (moduł otwarty ⟺ istnieje wiersz). Skrócenie okresu nie chroni studenta, tylko **odbiera mu dostęp**, który dostał — dlatego okres liczy się funkcją, nie art. 5 ust. 1 lit. e. Analog `review_states` (żywy stan), nie `review_logs` (ślad 12 m-cy). Art. 17 kaskadą. **Przegląd celowany:** `blocking_hole_slug` to jedyne pole bez funkcji operacyjnej (służy wyłącznie miernikowi progu, DECYZJA 2 Sophii) — po rozstrzygnięciu progu ≥3 na pilotażu sprawdzić, czy zostaje |
| <!-- retencja:pilot_participants --> Przynależność do kohorty pilotażu | `pilot_participants` (całe wiersze — `student_id`, `tenant_id`, `cohort`, `enrolled_at`) | **czas trwania konta studenta**, z **przeglądem celowanym przy zamknięciu kohorty** | wpis do rejestru (`enrolled_at`) | nic w rejestrze (kaskada `student_id ON DELETE CASCADE`, `drizzle/0047_sad_la_nuit.sql`). Zostaje zdarzenie `pilot.participant.enrolled` w `audit_log` — **bez `actor_id`**, `target_id` osierocony po kaskadzie (wzorzec A7) | `docs/data/ropa.md` wpis #7; Ryan (CRCO) 2026-08-10, bramka projektowa migracji `0047` (na produkcji **niezastosowanej** — pomiar E0). **SPRAWDZONE, NIE SKOPIOWANE — to NIE jest ten sam przypadek co `curriculum_placements` obok.** Tam wiersz jest **nośnikiem uprawnienia**: skrócenie okresu **odbiera studentowi dostęp**, więc art. 5 ust. 1 lit. e w ogóle nie jest właściwą miarą. Tutaj wiersz **nie daje studentowi niczego** i jego usunięcie **nie odbiera mu nic** — jest **nośnikiem reguły włączającej dla pomiaru**. Koszt skrócenia ponosi więc **rzetelność naszego miernika i rozliczalność decyzji o progu**, nie osoba, a art. 5 ust. 1 lit. e **ma tu zastosowanie** i domaga się przeglądu — ale nie krótkiego terminu: cel trwa dopóki miernik daje się odczytać, a osoba jest w bazie. **Kierunek awarii jest bezpieczny dla osoby i zdradliwy dla nas:** rejestr jest włączający, więc utrata wiersza **nigdy nie dodaje fałszywej obserwacji** — zaniża liczbę i wygląda jak „pilotaż słabo idzie", nie jak incydent. **Przegląd celowany:** przy zamknięciu kohorty i rozstrzygnięciu progu (DECYZJA 2 Sophii) rozstrzygnąć, czy kohorta zostaje (rozliczalność decyzji produktowej) czy pada — właściciele: Sophia (reguła §6a) + Ryan (RODO). **Zakaz nazwany:** nigdy `TRUNCATE` jako „sprzątanie" — nie podlega RLS i kasuje wszystkie kohorty naraz; usuwanie wyłącznie `DELETE` per kohorta albo per osoba (art. 21), a każde usunięcie wykonane narzędziem zostawia ślad `pilot.participant.withdrawn` (kształt dopuszczony z góry: `docs/data/audit-log-taksonomia.md` §4a). **Egzekwowanie: nie dotyczy — nie ma okresu do odliczania; obowiązuje przegląd ręczny przy zamknięciu kohorty.** Ten wiersz nie czeka na skrypt R-1 i nie należy go do niego dopisywać |
| <!-- retencja:audit_log --> Ślad rozliczalności i bezpieczeństwa | `audit_log` (całe wiersze) | **BEZTERMINOWO — okres nazwany, nie domyślny** | n/d | wszystko: tabela jest **append-only z wyzwalacza** (`0008`, `0010`), więc **egzekucja retencji przez usuwanie jest niedostępna żadną zwykłą operacją**. ⚠ Znane obejście (przebudowa tabeli — pozycja L-4 rejestru `art17-kompletnosc-usuniecia.md`) **nie jest środkiem retencji**: kasuje po drodze samą ochronę, więc użycie go w tym celu byłoby incydentem, nie egzekucją okresu | `docs/data/ropa.md` wpis #6; Ryan (CRCO), wiersz dodany 2026-08-10 (do 2026-08-10 tabela nie miała tu żadnego wiersza — rejestr czynności mówił „bezterminowa", rejestr retencji milczał). **Konstrukcja zgodności jest tu odwrotna niż w pozostałych wierszach:** skoro czasu nie da się ograniczyć, ograniczenie przechowywania (art. 5 ust. 1 lit. e) realizuje się **przez zawartość** — wiersz ma nie nieść identyfikatora osoby ani kontekstu żądania (kierunek A-1 (a+), `docs/data/audit-log-taksonomia.md` §6). **Ograniczenia nazwane wprost:** (1) wiersze zapisane przed A-1 zachowują `actor_id`, adres IP i sygnaturę przeglądarki **na zawsze** (14 wierszy z `actor_id`, pomiar E0 2026-08-10); (2) nieudane logowania (`actor_type = anonymous`) zapisują adres IP bez terminu **także po A-1** — świadomy kompromis, bo to jedyny sygnał wykrywania ataku siłowego i nie ma konta do skasowania; przegląd przy pierwszym mechanizmie retencji dla tej tabeli. **Firmowa reguła „audit log 12 miesięcy" (`agents/ryan.md`) dotyczy audit logu nordsignal (`logs/audit/`), NIE tej tabeli** |

Uwagi:
- Kasowanie na żądanie (art. 17 RODO) działa NIEZALEŻNIE od okresów wyżej —
  `student_id ON DELETE CASCADE` na tabelach klasy K-PII.
- **Zastrzeżenie do zdania wyżej (dodane v0.2, bo bez niego brzmi ono jak gwarancja
  całościowa):** kaskada czyści tylko te tabele, które mają więź z kaskadą.
  **`audit_log` jej nie ma** (`actor_id` to zwykły `text`), a `ai_usage_ledger.user_id`
  również nie. Pełna lista miejsc, których kaskada nie czyści, wraz z klasą i właścicielem:
  `docs/data/art17-kompletnosc-usuniecia.md`. **Osobno:** w produkcie **nie istnieje dziś
  żadna ścieżka usunięcia konta** (pozycja E1b pakietu RODO) — kaskada jest gotowa, ale nikt
  jej nie odpala.
- **Skrypt egzekucji retencji — jeden dla całego rejestru (poprawione v0.3; stopka opisywała
  go jako przyszły zakres prac, a on jest dostarczony):** `tools/enforce-retention.ts` (R-1).
  Model: rejestr = tablica reguł `RULES`; **dopisanie wiersza z okresem do tabeli wyżej = dopisanie
  obiektu do `RULES`**, nie nowy skrypt. Dziś dwie reguły: `hints-at`, `viva-content`.
  Tryb domyślny to dry-run (przebieg próbny — liczy, nic nie zmienia); wykonanie flagą `--execute`.
- **Czego skrypt nie ma i co jest właściwym długiem:** wyzwalacza cyklicznego. Zero odwołań poza
  własnym testem integracyjnym, zero wpisów w `package.json`, zero harmonogramu w przepływach CI
  (`git grep -n 'enforce-retention' origin/main`, odczyt 2026-08-12). Każdy wiersz tej tabeli
  z okresem liczonym w miesiącach jest więc **zadeklarowany i egzekwowalny, ale nie egzekwowany
  automatycznie**. Właściciel: Ethan (CTO). Termin: pierwsza realna rejestracja studenta.
