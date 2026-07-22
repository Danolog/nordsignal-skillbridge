# Rekalibracja limitu tury czatu B0 — `aiHeavy` → `aiLight` (#190)

**Wystawił:** Ryan (CRCO nordsignal) · **Data:** 2026-07-22 · **Wersja:** v1.0
**Przedmiot:** commit `0c750e6` — `src/app/api/career-helper/session/[id]/turn/route.ts`, zmiana limitera z `rateLimiters.aiHeavy` (5 żądań/min) na `rateLimiters.aiLight` (30 żądań/min).
**Werdykt: AKCEPTUJ** (bez zmian w diffie #190), z **dwoma warunkami towarzyszącymi** poza zakresem tego PR-a (R-1, R-2) i **jedną eskalacją do Darka** (E-1, informacyjna, nie blokuje).

**Charakter dokumentu — jawnie:** zmiana jest **już na `main` i na produkcji** (weryfikacja: `git branch --contains 0c750e6` → `main`). To sign-off **retrospektywny** (ratyfikacja), nie bramka przed wdrożeniem. Gdyby werdykt brzmiał ODRZUĆ, ścieżką wykonawczą byłby revert commita `0c750e6` przez Ethana, nie wstrzymanie wdrożenia.

---

## 1. Co faktycznie zmieniono

| | przed | po |
|---|---|---|
| limiter `POST /api/career-helper/session/[id]/turn` | `aiHeavy` = 5/min, okno kroczące, klucz `user:<userId>` | `aiLight` = 30/min, okno kroczące, klucz `user:<userId>` |
| limiter `POST /…/summary` | `aiHeavy` = 5/min | **bez zmian** — `aiHeavy` = 5/min |

Model wołany przez turę: warstwa `standard` (na produkcji Sonnet 4.6, streaming), **jedno** wywołanie na turę. Model wołany przez `/summary`: warstwa `premium` (Opus 4.8), **dwa** wywołania (generator + sędzia agent-as-judge).

Powód zmiany z commita: przy 5/min jedno żądanie na 12 sekund. Student odpowiadający krótko („tak", „wolę dane") przekracza to tempo — tura 6 w tej samej minucie dostawała 429 i rozmowa zawieszała się na „Tura 5 z 9". Potwierdzone pierwszym zielonym przebiegiem nocnego toru e2e-llm (run `29819366531`).

---

## 2. Ocena ryzyka

### 2.1 Koszt modelu — czy limiter w ogóle był tu ścianą kosztową? Nie był.

Sufit dobowy zużycia modelu na jedno konto studenta **nie wynika z limitera minutowego**, tylko z dwóch niezależnych capów aplikacyjnych:

- `MAX_TURNS = 9` — twardy limit tur na sesję, egzekwowany w kodzie **i** checkiem kolumny `turn` (0..9) w bazie, plus gałąź `alreadyFinalized` → 409;
- `MAX_SESSIONS_PER_DAY = 10` — cap sesji na 24 h w oknie kroczącym, egzekwowany w `POST /survey` **i** w `POST /restart` (restarty liczą się do tego samego okna).

Sufit: **10 × 9 = 90 wywołań warstwy `standard` na konto na dobę** — identyczny przed zmianą i po zmianie.

Zmiana `5/min` → `30/min` przesuwa wyłącznie **czas potrzebny na wyczerpanie tego samego sufitu**: z minimum ~18 minut do minimum ~3 minut. Nie podnosi maksymalnego dobowego kosztu ani o jeden token. To jest sedno oceny: limiter minutowy na `/turn` chronił tempo, nie budżet, a budżet i tak stoi na dwóch innych, twardszych bramkach.

**Dodatkowo — zmiana usuwa niespójność, nie tworzy jej.** Komentarz przy `MAX_SESSIONS_PER_DAY` (wprowadzony w 0.11, zadanie „abuse") opisuje projekt jako: *„Rate-limit (30/min) tnie burst; ten cap tnie wolumen dzienny"*. Projekt zakładał więc 30/min na turze. `aiHeavy` na `/turn` był dryfem względem własnej dokumentacji projektowej, którego nikt nie wychwycił, bo tor e2e-llm nigdy wcześniej nie wstał (serwer padał na boot-guardzie Upstash — 0 zielonych przebiegów w historii toru). To nie jest rozluźnienie guardraila; to powrót do zaprojektowanej wartości.

**Spójność z resztą kodu.** `aiLight` jest w bazie kodu ustaloną klasą dla interakcji konwersacyjnych i lekkich: odpowiedź w obronie ustnej (`viva/[sessionId]/answer` — `aiLight` burst + `vivaDaily` wolumen), start vivy, ankieta B0, wybór ścieżki, restart, `gaps/why`, `skill-map`, `projects/recommend`, dashboard wykładowcy. `aiHeavy` trzyma miejsca genuinnie drogie: `/summary` (2× Opus), brief projektu, review zgłoszenia, parser sylabusa, onboarding, tutor (dodatkowo `tutorDaily`). Po zmianie tura czatu siedzi tam, gdzie jej klasa kosztowa — nie tam, gdzie trafiła przypadkiem.

**Werdykt cząstkowy: koszt modelu — bez wzrostu ekspozycji. OK.**

### 2.2 Nadużycie (abuse) przez zalogowanego studenta

Klucz limitera to `user:<userId>` — wymaga uwierzytelnienia, więc wektor „anonimowy ruch drenuje model" nie istnieje na tej trasie. Zdeterminowany student z jednym kontem zatrzymuje się na 90 turach/dobę niezależnie od limitera minutowego (2.1). Zmiana **nie poszerza** tego pola.

Pozostaje wektor **farmy kont** (opis w 2.4) — istniejący przed zmianą, przez nią nietknięty co do sufitu, ale przyspieszony 6× co do tempa.

**Werdykt cząstkowy: nadużycie per konto — bez zmiany. OK.**

### 2.3 Wektor DoS na własne konto API (Anthropic)

Realna zmiana ryzyka jest tutaj i jest ona **niezerowa, ale mała**:

- 30/min przy `maxDuration = 60` oznacza, że jedno konto może utrzymywać do ~30 równoległych strumieni w minucie zamiast 5. Przy odpowiednio wielu kontach wysyca się limit współbieżności / tokenów na minutę (TPM) organizacji, a Anthropic zwraca 429 — degradacja dotyka **wszystkich** użytkowników, nie tylko sprawcy.
- Nie ma limitera globalnego (per organizacja / per tenant) na żadnej trasie AI. Nie ma progu ani alertu na dobowy koszt — `ai_usage_ledger` **rejestruje** `cost_usd`, `input_tokens`, `output_tokens` i `modelId`, ale nic tego nie egzekwuje ani nie alarmuje.

To jest jednak ryzyko **systemowe i zastane**, nie wprowadzone przez #190: identyczna ekspozycja istnieje na `/summary` (5/min bez capu dobowego, patrz R-1), a brak limitera globalnego jest niezależny od wartości limitera per użytkownik. #190 skraca czas dojścia do wysycenia, nie zmienia tego, że wysycenie jest osiągalne.

Kontrola, która **działa** i nie została naruszona: `assertRateLimitConfigured()` w `instrumentation.ts` zatrzymuje **start procesu** na produkcji bez konfiguracji Upstash, a `applyRateLimit()` ma fail-closed jako druga warstwa (brak limitera na produkcji → `success: false`, nie cichy `true`). To jest guardrail, który realnie blokuje, nie loguje — i on jest istotą ochrony, nie wybór 5 vs 30.

**Werdykt cząstkowy: DoS na własne konto API — wzrost tempa, brak wzrostu sufitu; ryzyko materialne pozostaje na `/summary` i na braku limitu globalnego, nie na `/turn`. Akceptowalne, z warunkiem R-1.**

### 2.4 Czy limit nadal chroni to, co miał chronić?

Miał chronić trzy rzeczy. Po zmianie:

| co chronione | czym, po zmianie | stan |
|---|---|---|
| budżet modelu na konto | `MAX_TURNS` (9) × `MAX_SESSIONS_PER_DAY` (10) = 90/dobę, egzekwowane w kodzie i w bazie | chronione, bez zmian |
| burst / tempo pojedynczego konta | `aiLight` 30/min, okno kroczące | chronione, próg realistyczny dla żywej rozmowy |
| dostępność wspólnego konta API | **nic per organizacja** — brak limitera globalnego, brak progu kosztowego, brak alertu | **luka, zastana** (E-1) |

Guardrail przestaje chronić dopiero tam, gdzie i przed zmianą nie chronił.

**Kontr-dowód, którego szukałem i nie znalazłem:** żadnego capu dobowego typu `tutorDaily` / `vivaDaily` dla Pomocnika B0 nie ma — jego rolę pełni `MAX_SESSIONS_PER_DAY`, egzekwowany zapisem w bazie (liczenie sesji w oknie 24 h), nie Redisem. To jest **mocniejsza** bramka niż limiter Upstash: przeżywa restart Redisa i nie da się jej ominąć zmianą klucza limitera. Uznaję ją za wystarczającą.

---

## 3. Werdykt

**AKCEPTUJ** — commit `0c750e6` zostaje, bez zmian w diffie.

Uzasadnienie w jednym zdaniu: zmiana przywraca zaprojektowaną wartość limitera (30/min, zapisaną w komentarzu `MAX_SESSIONS_PER_DAY` od zadania 0.11), nie podnosi maksymalnego dobowego kosztu ani o token, bo sufit trzymają twarde capy aplikacyjne 9 tur × 10 sesji, a jednocześnie usuwa bramkę, która ścinała **legalnego** użytkownika — to znaczy fałszywy pozytyw guardraila, a fałszywy pozytyw uczy zespół obchodzić bramki.

**Dlaczego nie AKCEPTUJ-ZE-ZMIANAMI:** żadna poprawka w tym pliku nie jest potrzebna. Braki, które znalazłem (R-1, R-2, E-1), dotyczą innych tras i innej warstwy — wiązanie ich z tym PR-em zaciemniłoby, co dokładnie zostało zaakceptowane.

**Dlaczego nie ODRZUĆ:** odrzucenie przywróciłoby stan, w którym guardrail blokuje żywego studenta w połowie 9-turowej rozmowy, nie oszczędzając przy tym ani jednego wywołania modelu w skali doby.

### Czy to wymaga decyzji Darka? Nie.

Werdykt należy do mnie i wystawiam go sam, bez eskalacji:

- decyzja jest **odwracalna** (revert jednej linii), **wewnętrzna**, **bez wydatku**, **nie wychodzi na zewnątrz**, **nie dotyka plików rządzenia** (`CLAUDE.md` / `agents/*.md` / `hooks/`) — komplet warunków stałej władzy Poziomu 2 szefa działu w jego domenie (CLAUDE.md v1.11, sekcja 5), a ryzyko/bezpieczeństwo jest moją domeną;
- nie narusza żadnej z 9 czerwonych linii (sekcja 4): brak nowego MCP, brak transferu, brak publikacji, brak DROP/DELETE/migracji;
- scalenie i wdrożenie tej zmiany mieściły się w delegacji Ethana (v1.12).

**Korekta zastanego zapisu:** `docs/SESSION_HANDOFF.md` (wiersz 401) notuje „Sign-off Ryana dla rekalibracji `aiLight` — **decyzja Darka**". To zapis nieaktualny wobec konstytucji po v1.11 z 2026-06-23. Do poprawienia przy najbliższym bumpie handoffu (właściciel: Ethan) na: „sign-off Ryana — decyzja w domenie ryzyka, okno weta 24 h".

Powiadomienie Darka: **okno weta 24 h** (CLAUDE.md sekcja 5). Cisza = zgoda; zmiana i tak jest już na produkcji, więc weto oznaczałoby revert, nie wstrzymanie.

---

## 4. Warunki towarzyszące — poza zakresem #190

### R-1 (WAŻNE) — `/summary` nie ma capu dobowego. To jest realna dziura kosztowa, nie `/turn`.

`POST /api/career-helper/session/[id]/summary` ma **wyłącznie** limiter minutowy `aiHeavy` (5/min). Nie ma capu dobowego, nie ma idempotencji, nie ma bramki „podsumowanie już wygenerowane". Każde wywołanie to **2× model premium (Opus 4.8)** na pełnym transkrypcie rozmowy. Sufit teoretyczny: 5 × 60 × 24 = 7 200 wywołań trasy na konto na dobę = **14 400 wywołań Opusa**. Dla porównania: cała reszta Pomocnika na tym samym koncie to 90 wywołań Sonneta.

Skutek uboczny poza kosztem — powtarzane wywołanie:
- wstawia nowy komplet wierszy do `student_career_paths` (zdejmując `is_primary` z poprzednich),
- przy fladze `advisorMemory` wstawia nowy wiersz do `advisor_memory` przy każdym podsumowaniu, które przeszło sędziego — czyli zaśmieca pamięć doradcy, która potem wchodzi do promptu kolejnych sesji.

**Wymagane:** cap dobowy per student wzorem istniejących `tutorDaily` / `vivaDaily` (proponuję `summaryDaily`, wartość rzędu 10–15/dobę — powyżej `MAX_SESSIONS_PER_DAY`, więc nie tnie legalnego użycia) **albo** bramka idempotencji (podsumowanie danej sesji generowane raz, kolejne wywołania czytają zapisane).
**Właściciel:** Ethan (CTO) — decyzja i wykonanie w jego domenie, zmiana odwracalna, nie wymaga Darka.
**Termin:** przed pierwszym otwarciem Pomocnika B0 dla ruchu spoza pilotażu.

### R-2 (INFORMACYJNE) — klient nie sygnalizuje 429 tury czatu

Znane z #190 i z handoffu: przy 429 wiadomości studenta puchną bez odpowiedzi i **bez komunikatu błędu**. Trasa poprawnie zwraca 429 z nagłówkiem `retry-after` (`rateLimitResponse`), ale front tego nie pokazuje. Po #190 zdarzenie jest rzadsze, więc **trudniejsze do zdiagnozowania**, gdy wystąpi. Z perspektywy ryzyka to nie jest wyłącznie dług UX: cicha awaria guardraila znaczy, że w incydencie nie odróżnimy limitera od awarii modelu bez czytania logów.
**Właściciel:** Ethan (CTO). **Termin:** razem z najbliższą pracą na froncie B0.

### E-1 (ESKALACJA INFORMACYJNA DO DARKA) — brak limitu i alertu kosztowego na poziomie organizacji

Rejestracja konta jest otwarta (`emailAndPassword.enabled = true`, bez bramki zaproszeń, bez konfiguracji `rateLimit` Better Auth w `src/lib/auth/server.ts`). Wszystkie limity AI są **per konto**. Iloczyn „liczba kont × 90 tur" nie ma sufitu, a `ai_usage_ledger` koszt **rejestruje, ale nie egzekwuje** — nie ma progu, nie ma alertu, nie ma wyłącznika.

To nie jest konsekwencja #190 i nie blokuje tego werdyktu. Jest to jednak decyzja z pieniędzmi na rachunku firmowego klucza API, więc należy do Darka (docelowo do Felixa, gdy dział finansów ruszy): **jaki miesięczny sufit wydatku na model akceptujemy i co ma się stać po jego przekroczeniu** (twarde odcięcie vs alert). Bez tej decyzji nie ma czego egzekwować w kodzie.
**Właściciel decyzji:** Darek. **Właściciel wykonania po decyzji:** Ethan.

---

## 5. Ścieżka wycofania (runbook, nie opis)

Jeśli po otwarciu ruchu poza pilotaż dobowy koszt warstwy `standard` przekroczy założenia:

1. `SELECT model_id, count(*), sum(cost_usd) FROM ai_usage_ledger WHERE created_at > now() - interval '24 hours' GROUP BY 1;` — ustal, czy drenaż idzie z warstwy `standard` (tura) czy `premium` (podsumowanie). W dotychczasowych danych spodziewany winowajca to `premium`.
2. Jeśli `standard`: **nie** wracaj do `aiHeavy` na `/turn` (odtworzy to fałszywy pozytyw z #190) — obniż `MAX_SESSIONS_PER_DAY` z 10, bo to jest realna ściana wolumenu.
3. Jeśli `premium`: wdroż R-1 (`summaryDaily` albo idempotencja) — to jest właściwa dźwignia.
4. Revert awaryjny samego #190: `git revert 0c750e6` (jedna linia, bez migracji, bez zależności). Wykonuje Ethan w ramach delegacji v1.12.

---

## 6. Właściciel i przegląd

**Właściciel dokumentu:** Ryan (CRCO). **Przegląd:** przy otwarciu Pomocnika B0 na ruch spoza pilotażu, najpóźniej **2026-10-22** (kwartał). Przegląd obejmuje: czy R-1 domknięte, czy E-1 rozstrzygnięte, czy wartości `MAX_TURNS` / `MAX_SESSIONS_PER_DAY` mają pokrycie w realnych danych `ai_usage_ledger`.
