# Plan 1E.4 — powtórki rozłożone w czasie (FSRS)

**Wersja:** v0.4 · 2026-07-25 · Status: **DRAFT do sign-offu Darka** (Plan Mode)
**Changelog v0.3 → v0.4:** R4 (trasy API `/api/review/{queue,answer}`) scalona na `main` (PR #242, merge squash `f0227d5`, flaga OFF, brak migracji). Bramka W1 (pułapka R3 — test zacommitowany razem z trasami) zamknięta: `review-routes.integration.test.ts` (15 przypadków, mutation-proven) **realnie wykonany** w jobie `integration` CI (`✓ 15 tests`, nie skip). Kontrakty K1–K4 z sekcji 4b zamknięte w R4. Prod NEON nietknięty, deploy prod = trasy 404 za flagą OFF (smoke: `{"error":"Not found"}`). Dodano sekcję 4c — carry-forward R4 → R5/R6 (flip-gate 429 + rotacja pytań) i rozszerzono listę bramek zapłonu o realny test 429.
**Changelog v0.2 → v0.3:** R3 (warstwa serwisowa) scalona na `main` (PR #240, merge `60aa2a6`, flaga OFF, brak migracji). Bramka W1 Leo zamknięta — test integracyjny `review-service.integration.test.ts` (10 przypadków) zielony w jobie `integration` CI. Dodano sekcję 4b — carry-forward z Leo review R3 do R4/R5 (5 kontraktów) + follow-up `ts-fsrs` (exact-pin przy major 6.0).

**Changelog v0.1 → v0.2:** R1 i R2 scalone na `main` (R2 = PR #239, `297865f`, flaga OFF, brak migracji). Dodano sekcję 4a — carry-forward z Leo review R2 do R3 (noty 3/4, do rozwiązania w R3, NIE w R2).
**Synteza:** Oliver (COO) z warstwy produktowej Sophii (PO) + architektury Ethana (CTO)
**Flaga:** `FLAG_SPACED_REPETITION` — domyślnie **OFF** (deploy ≠ release, jak 1E.3)
**Poprzednik w kręgosłupie:** 1E.3 (mastery gate, na prodzie za flagą OFF) — 1E.4 twardo siedzi za nim.

---

## Słownik (żargon rozwijany raz)

- **Powtórki rozłożone w czasie** (ang. *spaced repetition*) — materiał wraca w rosnących odstępach (za dzień, za trzy dni, za tydzień…), tuż zanim pamięć zaczyna słabnąć. Dowiedziony sposób na trwałe zapamiętanie.
- **FSRS** (*Free Spaced Repetition Scheduler*) — współczesny, otwarty algorytm liczący te odstępy. Następca starego SM-2 z Anki.
- **Koncept** — jednostka wiedzy (nie lekcja). „Atom" to lekcja; koncept to rzecz, którą chcemy utrzymać żywą w pamięci przez miesiące.
- **Stabilność** (*stability*, S) — jak długo pamięć konceptu „trzyma", zanim wymaga odświeżenia.
- **Potknięcie / wpadka** (*lapse*) — błąd w powtórce; sygnał, że koncept osłabł.
- **Głębokość podpowiedzi** (`hint_depth`) — ile podpowiedzi student odsłonił, zanim odpowiedział. Od #217 liczona **serwerowo** — klient nie może już zadeklarować „umiałem z pamięci", gdy odsłonił pełne rozwiązanie.
- **Flaga** — przełącznik funkcji. OFF = kod jest na produkcji, ale student nic nie widzi.

---

## 1. Po co to — jednym akapitem

Powtórki zamieniają „zdał raz" w „nadal umie za pół roku". Bez nich Paszport Kompetencji jest zdjęciem z jednego dnia; z nimi staje się uczciwą deklaracją w czasie. To „compounding > heroics" zaimplementowane dosłownie: nudny rytm 5 minut dziennie buduje kompetencję, której nie zbuduje żaden zryw przed egzaminem. Utrzymuje bazową warstwę modelu CareerEDGE (wiedza + umiejętności) żywą — a na niej stoją wyższe warstwy (samoskuteczność, pewność siebie).

**Dlaczego odblokowane dopiero teraz.** FSRS potrzebuje uczciwego sygnału „ile student naprawdę umiał, gdy odpowiadał". Dają go dwie rzeczy z tej sesji: **#217 hintDepth** (głębokość podpowiedzi liczona serwerowo) i **MIS.1** (dyscyplina „nie zgadujemy wstecz"). Bez nich scheduler planowałby powtórki na kłamstwie studenta o sobie samym.

---

## 2. Jak to działa dla studenta (warstwa produktowa — Sophia)

- **Jednostka kolejki = koncept, nie atom.** Stan FSRS (stabilność / trudność / termin / potknięcia) trzymany per **student × koncept**.
- **Wejście do harmonogramu:** koncept **kluczowy** modułu (≤4/moduł, tagowany przy autoringu) wchodzi, gdy student **zda mastery gate** tego modułu. Nie po zaliczeniu atomu (*zaliczony ≠ opanowany*, ADR-014 D3). → **decyzja otwarta D1, patrz §5**.
- **Pętla dnia:** kafelek na dashboardzie „Powtórki na dziś: N" (N=0 → „Nic do powtórzenia. Wróć jutro."). Wejście → liniowa sesja jak egzamin 1E.3, ale bez ciśnienia: nagłówek jawnie „To ćwiczenie utrwalające — nie egzamin. Nie wpływa na dyplom ani Paszport."
- **Format powtórki:** jedno pytanie na koncept wymagalny, **ciągnięte z istniejącego banku pytań** (zero nowej treści w v0.1). Akt wydobycia z pamięci (*retrieval*), nie bierne czytanie.
- **Zero samooceny studenta.** Nie pytamy „było łatwo czy trudno?" (honor-system zawodzi). Sygnał dla schedulera wyprowadzamy z twardych danych: poprawność + serwerowy `hint_depth` + pewność (`confidence` z MIS.1). To sedno, dlaczego #217 odblokował 1E.4.
- **Granica §7 potwierdzona:** ocena **formująca**, maszyna samowystarczalna od dnia 1, werdykt jawnie „ocena automatyczna", **nic nie wychodzi jako kredencjał** (nie dotyka Paszportu). Błąd neutralny, nie karzący: „Ten koncept wrócił za wcześnie — pokażemy go znów niedługo."
- **Sprzężenie z 1E.3:** koncepty, które potykały się na egzaminie (`failedConcepts`, już zapisywane w 1E.3), wchodzą z **niższą stabilnością** → wracają częściej. Potknięcie w powtórce → koncept wraca do krótkich odstępów (relearning), nigdy „oblany na stałe".

---

## 3. Jak to zbudujemy (warstwa techniczna — Ethan)

- **Algorytm:** biblioteka **`ts-fsrs`** (npm, TypeScript, wariant FSRS-6), **nie** własna implementacja. Powód: 17–21 „magicznych" stałych we wzorach S/D = 21 miejsc na cichy błąd, którego test nie złapie. Biblioteka to referencyjna implementacja autorów algorytmu, z własnym pakietem testów. **To zwykła zależność licząca lokalnie — NIE serwer MCP, NIE zewnętrzne źródło danych** (nie dotyka czerwonej linii „nowy MCP"), zero kosztu tokenowego. **Twarda bramka R1:** weryfikacja licencji (ma być MIT) + audyt grafu zależności; jeśli nie MIT/zero-deps → plan B: własny minimalny rdzeń (same wzory + wektor wag).
- **Dwie nowe tabele:**
  - `review_states` — bieżący stan per student × koncept (S, D, termin, faza, liczniki). Dostęp jak `assessment_sessions`: student **czyta** tylko swoje (żeby zobaczyć licznik „N na dziś"), **nie zapisuje**. Kluczowy indeks `(student_id, due)` — zapytanie „co na dziś" jednym przejściem, bez skanu.
  - `review_logs` — dziennik dopisywalny (append-only), każda ocena. Wariant **DENY** (student nie czyta) — ślad audytowy Built-to-Sell, odtwarzalny 5 lat później, plus materiał do przyszłego trenowania wag.
- **Serwis** `src/lib/review/*` — czyste funkcje (opakowanie `ts-fsrs`) + warstwa serwisowa (kolejka, zapis oceny→stan→log w transakcji). Reużywa wzorców silnika egzaminu 1E.3.
- **API** `/api/review/{queue,answer}` — 404 przy fladze OFF (jak exam), ocena deterministyczna (`grade.ts`, 0 LLM), klucz odpowiedzi nigdy nie opuszcza serwera, obsługa błędów przez `pg-error.ts` (walker łańcucha `cause` — ta sama poprawka, którą W2 złapał w 1E.3).
- **Bez crona.** Kolejkę liczymy on-demand przy wejściu studenta (termin jest zmaterializowany i zaindeksowany) — spójne z filozofią repo „leniwie, bez cronów".
- **Bez backfillu wstecznego.** Enrollment działa od włączenia flagi w przód — dla starych zaliczeń nie mamy wiarygodnej historii retencji, backfill dałby fałszywą stabilność.

---

## 4. Slice'y wdrożeniowe (jak P1–P5 w 1E.3)

| Slice | Zakres | Zależność |
|---|---|---|
| **R1 — Fundament** | Migracja `0042` (2 tabele + granty/RLS, numer rezerwowany commitem tuż przed generacją), wpis flagi, zależność `ts-fsrs` + **bramka licencji MIT**. | — |
| **R2 — Scheduler (czysty)** | Opakowanie `ts-fsrs`, mapowanie (poprawność + hint + pewność) → ocena FSRS. Testy jednostkowe. | R1 |
| **R3 — Warstwa serwisowa** | Kolejka „na dziś", zapis oceny (transakcja stan+log), enrollment. | R2 |
| **R4 — API** | `/api/review/{queue,answer}` (404 przy OFF, auth, strip klucza). Testy integracyjne Quinn. | R3 |
| **R5 — Hook enrollment** | Wpięcie w zdarzenie 1E.3 (**owner-side, po zatwierdzeniu transakcji** — korekta RLS z self-critique Ethana). Testy sprzężenia. | R3, R4 |
| **R6 — Release** | UI kolejki (Jack wg spec Sophii) → Leo review 14 domen → scalenie `main` → backup Neon → migracja → flaga na staging → obserwacja. | R1–R5 |

Rdzeń R1–R5 jest samodzielny i testowalny bez UI. Każdy slice pod te same bramki co 1E.3: Quinn (test integracyjny), Leo (14 domen), SQL transakcyjny addytywny, backup Neon, `retired=0`.

### 4a. Carry-forward z Leo review R2 → do rozwiązania w R3

Dwie noty z code review R2 (Leo GO z notami). **Świadomie NIE rozwiązane w R2** (R2 = czysta logika schedulera); przenoszone do R3 (warstwa serwisowa — pierwszy slice, który zapisuje stan i chodzi ścieżką spadkową):

- **Nota 3 (test kontraktu CHECK na ścieżce spadkowej).** Dodać test asertujący ograniczenia bazy (`stability > 0`, `difficulty ∈ [1,10]`) na ścieżce SPADKOWEJ — powtarzane „Again" na ustalonej już karcie zbiega stabilność do `S_MIN` i trudność do `10`. Dziś testowany jest wyłącznie `initCard` (stan początkowy), nie zachowanie po wielokrotnym pogorszeniu. R3 zapisuje stan, więc to naturalne miejsce na kontrakt-test wobec realnego CHECK-a.
- **Nota 4 (jedno źródło prawdy dla `elapsedDays`).** Rozważyć czytanie `elapsedDays` z `log.elapsed_days` zwracanego przez `scheduler.next` zamiast własnego przeliczania różnicy dat — parytet z biblioteką i jedno źródło prawdy (eliminuje ryzyko dryfu między naszym liczeniem a `ts-fsrs`). Decyzja projektowa R3 przy warstwie zapisu oceny. **Rozwiązane w R3** (`applyRating` czyta `elapsed_days` z logu schedulera).

---

### 4b. Carry-forward z Leo review R3 → do rozwiązania w R4/R5

R3 (warstwa serwisowa, owner-side, flaga OFF) scalona z Leo GO warunkowym (W1 = test integracyjny, zamknięty). Pięć kontraktów przeniesionych do warstwy API (R4) i sprzężenia enrollment (R5) — **świadomie NIE rozwiązane w R3** (R3 nie ma tras ani wpięcia w zdarzenia). Do rozwiązania:

- **K1 (R4) — `studentId` z sesji, NIGDY z payloadu.** `studentId` bierzemy wyłącznie z `getStudentByUserId` (sesja), nie z ciała żądania. Serwis jest owner-side (omija RLS `app_student`), więc jawny filtr `student_id` jest JEDYNĄ granicą najemcy — payload sterujący nią = cross-tenant. Twardy warunek R4.
- **K2 (R4) — twardy cap na `getDueQueue.limit`.** Górny limit rozmiaru kolejki po stronie serwera (klient nie ustala nieograniczonego `limit` → DoS/wyczerpanie pamięci).
- **K3 (R4) — walidacja server-side `questionItemId`/`conceptId` + mapowanie `23503`→404/409.** Naruszenie klucza obcego (Postgres `23503`) mapujemy na 404/409, nie surowe 500 (nie wyciekamy szczegółu bazy, czytelny błąd klienta).
- **K4 (R4) — ścieżka ODCZYTU przez `app_student`/`withTenantContext`.** SELECT-y kolejki na trasie odczytu idą pod rolą `app_student` (kontekst najemcy), żeby RLS z migracji 0042 realnie strzegła runtime SELECT — nie tylko zapis owner-side.
- **K5 (R5) — `priorFailed` coupling = decyzja Ethana.** Sprzężenie zasiewu z sygnałem „już oblany" (hook `priorFailed`, dziś no-op) rozstrzyga Ethan w R5 przy wpięciu w zdarzenie 1E.3.

**Follow-up (dług zależności, nie R4/R5):** exact-pin `ts-fsrs` (dziś `^5.4.1`) przy bumpie do major **6.0** — usuwają `log.elapsed_days`, przez co `Math.max(0, undefined) = NaN` złamałby CHECK `elapsed_days >= 0` (po nocie 4 czytamy to pole z logu). **Próg spłaty: bump major** (5.x bezpieczne; 6.0 = przypiąć dokładną wersję i zweryfikować kontrakt pola przed podniesieniem).

---

### 4c. Carry-forward z R4 → do rozwiązania w R5/R6

R4 (trasy API, flaga OFF) scalona. Dwie pozycje przeniesione dalej — **świadomie NIE rozwiązane w R4**:

- **FLIP-GATE 429 — warunek zapłonu flagi (owner: Quinn).** Przed ustawieniem `FLAG_SPACED_REPETITION=1` na prodzie: **realny test 429** na `/api/review/{queue,answer}` w środowisku z Upstash (job `integration` z kredencjałami albo smoke na preview), potwierdzający że limiter przy **skonfigurowanym** Upstash zwraca `429`, a nie milcząco no-op (bez kredencjałów Upstash limiter może fail-open). Testy integracyjne R4 dowodzą kontraktu tras (izolacja, cap, strip klucza), **nie** dowodzą zapłonu limitera — limitery `reviewQueue`/`reviewAnswer`/`reviewDaily` są okablowane, ale ścieżka „przekroczenie → 429" nie jest przetestowana na żywym Upstash. **Bez tego testu flaga zostaje OFF.** Pozycja wpisana do listy bramek zapłonu (niżej), obok warunków RODO Ryana.
- **Nota rotacji pytań (carry R4 → R6, owner: Sophia).** Rotacja wariantów / dobór pytania per powtórka konceptu, żeby student uczył się **treści**, nie pozycji odpowiedzi (to samo pytanie w tej samej kolejności przy każdej powtórce = uczenie się „C jest poprawne", nie zrozumienie). Decyzja produktowa przy warstwie doboru pytania R6 (wpięcie w kolejkę „na dziś"). Nie blokuje R5 (enrollment), blokuje sensowność powtórki przy zapłonie.

---

## 5. Decyzje otwarte dla Ciebie (Darek)

1. **D1 — kiedy koncept wchodzi do powtórek.** Rekomendacja: **przy zdanym mastery gate, koncepty kluczowe** (Sophia). Alternatywa Ethana (też po zaliczeniu atomu) daje więcej danych, ale ryzykuje zalew kolejki (200 kart naraz = porzucenie). Dla v0.1 idę wąsko. **Zgoda?**
2. **D2 — docelowa retencja** — jedno pokrętło biznesowe: 85% (rzadsze powtórki, mniej pracy) / 90% (domyślne) / 95% (częstsze, pewniejsze). Rekomendacja: **90%** na start.
3. **D3 — dzienny limit nowych kart** — twardy limit, żeby mastery gate nie wrzucił całego modułu naraz. Do ustalenia z Sophią w R6; rekomendacja: zacząć od ~10–20/dzień.
4. **Zależność `ts-fsrs`** — dodanie biblioteki npm. Nie jest to nowy MCP ani źródło danych (liczy lokalnie), więc **nie czerwona linia** — ale odnotowuję, że dokładamy zewnętrzną zależność (supply-chain). Bramka licencji w R1.

---

## 6. Ryzyka (skrót)

- **Strefy czasowe** „co na dziś" — filtr w UTC, granica dnia w strefie studenta tylko do prezentacji licznika. Dryf < 24h kosmetyczny.
- **N+1 przy kolejce** — jedno zapytanie + `inArray` na pytania hurtem (wzorzec `loadExamBank`).
- **RLS przy enrollment** — zapisy **owner-side**, nie pod rolą `app_student` (self-critique Ethana #4 — złapane przed kodem, byłby błąd na prodzie).
- **Pusta powtórka** — koncept kluczowy musi mieć ≥1 pytanie w banku; koncept bez pytania nie wchodzi do kolejki (kontrakt-test pojemności, jak w 1E.3).
- **Domyślne wagi FSRS** — start na wagach Anki; `review_logs` zbiera materiał do przetrenowania na naszej populacji później (bez zmiany schematu).

---

## 7. Czego v0.1 NIE robi (jawnie)

Samoocena studenta (Again/Hard/Good/Easy) · nowa treść pytań powtórkowych · powiadomienia mail/push · trenowanie własnych wag · grywalizacja/streak · multi-tenant skala. Wszystko za wzorcem 1E.3 — wąsko, flaga OFF, iterujemy na danych pilotażu.

---

**Bramka zapłonu (jak 1E.3):** flaga zapala się dopiero, gdy (a) jest realny ruch dostarczający pierwszych sygnałów (nie na pustym harmonogramie), (b) axe a11y zielony na ekranie sesji, (c) **realny test 429 na `/api/review/{queue,answer}` z żywym Upstash zielony** (FLIP-GATE 429, owner Quinn — sekcja 4c; limiter musi realnie odrzucać, nie fail-open), (d) **warunki RODO Ryana spełnione** — `retention.md` (polityka retencji `review_states`/`review_logs`) + RoPA (rejestr czynności przetwarzania) zaktualizowane, (e) świadoma decyzja Darka.

**Następny krok po sign-offie:** rezerwacja numeru migracji `0042` commitem → R1.
