# Decision Document: Syllabus PDF Upload — Contract for `/api/syllabus/parse`

**Status:** Accepted
**Date:** 2026-06-05
**Author:** Ethan (CTO nordsignal) — eskalacja N3 od Leo (nazwa pola multipart + tryb endpointu)
**Powiązania:** błąd #2 strumień C (`docs/product/plan-naprawy-6-bledow.md`); bramy Z2 (`test/z2-syllabus-pdf-upload`); rozjazd §4 z Z5 (`tests/e2e-pw/50-rejestracja-onboarding.spec.ts`, komentarz §4 vs „z PDF").

---

## Kontekst (Context)

Onboarding krok 2 („Wgraj swój sylabus") obiecuje studentowi: „wklej treść LUB prześlij plik PDF". To „LUB" jest dziś **pozorne** (atrapa) na trzech warstwach jednocześnie — potwierdzone inspekcją realnego kodu 2026-06-05:

1. **Warstwa interfejsu** (`src/components/onboarding/step-syllabus.tsx`): wybrany plik PDF trafia wyłącznie do lokalnego stanu komponentu (`useState<File>`, linia 23). `canAnalyze` aktywuje przycisk od samego pliku (`text>=100 || file !== null`, linia 41), ale plik nigdy nie opuszcza komponentu — `StepSyllabusProps` nie ma callbacku przekazującego plik w górę.
2. **Warstwa orkiestracji** (`src/components/onboarding/onboarding-wizard.tsx`, `handleAnalyze`, linie 79–103): early-return przy `syllabusText.trim().length < 100` (toast + return), a następnie `fetch` wysyła **tylko JSON** `{ syllabusText, careerGoal }`. Ścieżka „sam PDF, puste pole tekstowe" nie woła nawet serwera.
3. **Warstwa serwera** (`src/app/api/syllabus/parse/route.ts`): handler czyta wyłącznie `req.json()` (linia 26), schema Zod wymaga `syllabusText` min. 100 znaków. Multipart → `req.json()` rzuca → `400 "Invalid JSON"`. Zero czytnika PDF, plik nigdy nie dociera do `parseSyllabus`.

Bramy QA Quinna (`test/z2-syllabus-pdf-upload`) dowodzą obu warstw (serwer i klient) i **proponują** kontrakt: pole multipart `file` (typ `application/pdf`) + pole `careerGoal`, odpowiedź docelowa `200 { competencies: string[] }`. Ten ADR jest bramą decyzyjną przed implementacją — Leo eskalował N3 (nazwa pola + tryb endpointu) jako wymagające decyzji CTO.

**Stan zależności:** brak biblioteki parsującej PDF w `package.json` (jest tylko `jspdf` — do generowania, nie czytania). Brak parsera multipart — niepotrzebny, App Router Next.js ma natywne `Request.formData()`.

---

## Decyzja (Decision)

Endpoint `/api/syllabus/parse` obsługuje **dwa tryby wejścia** rozróżniane po `Content-Type` żądania: multipart dla PDF, JSON dla tekstu wklejonego ręcznie. Oba zbiegają się do tej samej, niezmienionej funkcji `parseSyllabus(text, careerGoal)`. Nazwa pola pliku w multipart: **`file`** (zgodnie z propozycją Z2). Czytnik PDF: **`pdf-parse`** (nowa zależność produkcyjna), z izolacją błędu i twardą walidacją wejścia.

---

## Decyzje kontraktu (Key Decisions)

| # | Decyzja | Wybór | Uzasadnienie |
|---|---------|-------|--------------|
| 1 | **Nazwa pola multipart (pliku)** | `file` | Potwierdzam propozycję Z2. Neutralna, zgodna z konwencją HTML `<input type="file">`, brama integracyjna i e2e już jej używają (`fd.append("file", ...)`, `input[type="file"]`). Zmiana nazwy = bezcelowy koszt przepisania obu bram. |
| 2 | **Nazwa pola celu kariery w multipart** | `careerGoal` (string field obok pliku) | Ten sam klucz co w trybie JSON — jeden model danych po stronie `parseSyllabus`. Brama Z2 już dokłada `fd.append("careerGoal", ...)`. |
| 3 | **Tryb endpointu** | **OBA** (multipart PDF + JSON tekst), routing po `Content-Type` | PDF → multipart; ręczny tekst → JSON. NIE zastępujemy JSON — ścieżka tekstowa jest produkcyjnie używana (kontrola pozytywna Z2, ścieżka krytyczna Z5). Uspójnia rozjazd §4 (Z5): plan §4 mówi „sylabus z PDF", Z5 testuje tekst — po tej decyzji oba warianty są pełnoprawne i niezależnie pokryte. |
| 4 | **Biblioteka PDF** | `pdf-parse` (NOWA zależność produkcyjna) | Czysto Node (bez bindingów natywnych, bez headless przeglądarki), tekstowa ekstrakcja przez `pdfjs`, działa w Node runtime Vercela. Lekka, sprawdzona w produkcji ekosystemu Next. Alternatywy odrzucone niżej. **Wymaga: `pnpm add pdf-parse` + `@types/pdf-parse` jako devDependency.** |
| 5 | **Runtime endpointu** | Node.js runtime (nie Edge) | `pdf-parse` wymaga Node (Buffer, fs-like). Endpoint ma już `maxDuration = 60` (wywołanie LLM) — i tak jest Functions Node, więc bez zmiany kosztu/architektury. |
| 6 | **Wspólny rdzeń** | Po ekstrakcji tekstu z PDF wchodzimy w **tę samą** ścieżkę walidacji długości i `parseSyllabus(text, careerGoal)` co JSON | Jeden punkt prawdy dla analizy. Tekst z PDF traktowany identycznie jak wklejony — min. 100 znaków po ekstrakcji (patrz walidacja). |

---

## Walidacja (twarde wymagania implementacji)

Dotyczy gałęzi multipart; ścieżka JSON zachowuje obecną walidację Zod bez zmian.

1. **MIME / typ pliku:** akceptuj wyłącznie `application/pdf`. Sprawdź `file.type` ORAZ (defensywnie) nagłówek pliku — pierwsze bajty `%PDF` (magic number), bo `file.type` z multipart jest deklarowany przez klienta. Inny typ → `415 Unsupported Media Type`.
2. **Limit rozmiaru:** **10 MB** (spójnie z limitem już egzekwowanym w interfejsie, `step-syllabus.tsx` linia 30: `10 * 1024 * 1024`). Sprawdzaj `file.size` PRZED odczytem do Buffera. Przekroczenie → `413 Payload Too Large`. Limit egzekwowany serwerowo — interfejs nie jest granicą bezpieczeństwa.
3. **Obecność pola:** brak pola `file` w multipart albo nie-plikowa wartość → `400` z opisowym `error`.
4. **PDF bez wyciągalnego tekstu** (zaszyfrowany, skan-obraz, pusty): ekstrakcja zwraca tekst krótszy niż próg → `422 Unprocessable Entity` z komunikatem po polsku: „Nie udało się odczytać tekstu z pliku PDF — może być skanem obrazu lub być zabezpieczony. Wklej treść sylabusa ręcznie." Próg = ten sam **min. 100 znaków** co dla wejścia tekstowego (po `trim`), żeby zachować spójność z analizą.
5. **Górny limit tekstu po ekstrakcji:** przytnij/odrzuć powyżej 50 000 znaków (jak Zod dla JSON), żeby nie wysłać monstrualnego promptu do modelu. `parseSyllabus` i tak sanityzuje do 8000 znaków (`sanitize.ts`), ale walidacja wejścia chroni przed kosztem i nadużyciem przed sanityzacją.

---

## Kontrakt błędu (kody i kształt)

Kształt odpowiedzi błędu **niezmieniony** względem obecnego endpointu: `NextResponse.json({ error: string, ...szczegóły? }, { status })`. Klient (`handleAnalyze`) już czyta `data.error` — zachowujemy zgodność.

| Sytuacja | Kod | `error` (kształt) |
|----------|-----|-------------------|
| Brak sesji | `401` | `"Unauthorized"` (bez zmian) |
| Rate limit | `429` | `rateLimitResponse` (bez zmian) |
| Multipart bez pola `file` / złe pole | `400` | opisowy `"Brak pliku PDF w żądaniu."` |
| Niepoprawny JSON (ścieżka tekstowa) | `400` | `"Invalid JSON"` (bez zmian) |
| Walidacja Zod (tekst) | `400` | `"Invalid input"` + `issues` (bez zmian) |
| Zły MIME / nie-PDF | `415` | `"Dozwolony jest wyłącznie plik PDF."` |
| Plik > 10 MB | `413` | `"Plik jest za duży (limit 10 MB)."` |
| PDF bez wyciągalnego tekstu | `422` | komunikat z pkt. 4 walidacji |
| Błąd ekstrakcji PDF (rzut `pdf-parse`) | `422` | jw. + **log** `logError("syllabus-pdf", err, { userId })` |
| Błąd modelu (`parseSyllabus` rzuca) | `500` | `"Nie udało się przeanalizować sylabusa. Spróbuj ponownie."` (bez zmian) |

**Obserwowalność (spójnie z #4 / strumień B):** każda gałąź `catch` (ekstrakcja PDF i analiza) **łapie + loguje** przez istniejące `logError(scope, err, ctx)` (`src/lib/log.ts`) z kontekstem `{ userId, mode: "pdf" | "json" }`, zwraca **opisowy** status — nigdy puste 500 bez logu (ta sama lekcja co błąd #4: błąd modelu połknięty bez śladu). Surowego błędu/stack trace NIE zwracamy klientowi.

---

## Alternatywy rozważone (i odrzucone)

| Wariant | Odrzucony, bo |
|---------|---------------|
| **Tryb: multipart ZAMIAST JSON** (jeden tryb) | Łamie produkcyjną ścieżkę tekstową (kontrola pozytywna Z2, ścieżka krytyczna Z5) i wymusza klienta budującego PDF z wklejonego tekstu — absurd. Odrzucone. |
| **Biblioteka: `pdfjs-dist` bezpośrednio** | Cięższe API (worker, canvas dla renderu), nadmiarowe dla samej ekstrakcji tekstu. `pdf-parse` jest cienką, wygodną nakładką na `pdfjs`. |
| **Biblioteka: `unpdf`** | Nowsza, mniej przebiegu produkcyjnego; rozważyć przy migracji, jeśli `pdf-parse` okaże się nieutrzymywany. Na teraz dojrzałość > nowość. |
| **Parsowanie PDF po stronie klienta** (przeglądarka) | Większy bundle, niespójna ekstrakcja między przeglądarkami, brak serwerowej granicy walidacji — bezpieczeństwo i spójność przegrywają. Serwer = jedno źródło prawdy. |
| **Pole multipart `pdf` / `syllabusFile`** | `file` już zakontraktowane w obu bramach Z2; zmiana = koszt bez wartości. |

---

## Ryzyka i mitygacje

| Ryzyko | Wpływ | Mitygacja |
|--------|-------|-----------|
| `pdf-parse` zawiera CVE / słabo utrzymywany | Dług bezpieczeństwa | Audyt `pnpm audit` przy dodaniu; przypięta wersja; ścieżka migracji do `unpdf` udokumentowana wyżej. Wejście ograniczone (10 MB, tylko PDF, tylko zalogowany user za rate-limitem). |
| Złośliwy / zniekształcony PDF wywraca parser | DoS / 500 | Ekstrakcja w `try/catch` → `422` + log; limit rozmiaru przed odczytem; rate-limit `aiHeavy` już chroni. |
| PDF-bomba (mały plik, ogromny tekst) | Koszt modelu | Limit 50 000 znaków po ekstrakcji przed `parseSyllabus`; sanityzacja do 8000 w warstwie modelu. |
| Rozjazd front↔back (kontrakt na mocku) | Upload znów atrapą na prod | **JEDNA gałąź** front+back + **test integracyjny realnego kontraktu** (Z2 integration) przed merge — lekcja split-frontend-backend. |
| Skan/obraz PDF cicho daje pustą analizę | Zły UX, „magia bez efektu" | Próg 100 znaków → `422` z jasnym komunikatem „wklej ręcznie", nie ciche 200 z 0 kompetencji. |

---

## Wpływ na bramy Z2 (i Z5)

- **Brama integracyjna** `src/app/api/syllabus/parse/__tests__/syllabus-pdf-upload.integration.test.ts`: kontrakt `it.fails` (multipart `file` + `careerGoal` → `200 { competencies }`, `parseSyllabus` wołane z niepustym tekstem) jest **zgodny z tym ADR bez zmian**. Po implementacji strumienia C: `it.fails` bloku B flipuje na czerwono → zdjąć `it.fails`; asercje charakteryzacji bloku A (dziś „multipart → 400") trzeba **zaktualizować na zachowanie docelowe** (multipart → 200) w tym samym PR.
- **Brama e2e** `tests/e2e-pw/40-onboarding-sylabus-pdf.spec.ts`: `test.fail()` (upload PDF → krok „Twoje kompetencje") flipuje → zdjąć `test.fail`; dodać `@llm` (po naprawie upload realnie woła model). Tag `@dbwrite` zostaje.
- **Rozjazd §4 (Z5)** `tests/e2e-pw/50-rejestracja-onboarding.spec.ts`: po wdrożeniu obu trybów uspójnić komentarz §4 — plan §4 „sylabus z PDF" i wariant tekstowy są teraz oba pełnoprawne; Z5 (ścieżka tekstowa) zostaje, brama PDF pokryta przez Z2.
- **UWAGA sekwencji:** plan flaguje, że po strumieniu E (Pomocnik kariery jako Krok 0) Quinn przepisuje Z5/Z2/Z4 (zmiana kolejności onboardingu). Ten ADR dotyczy kontraktu serwera/uploadu — niezależny od numeracji kroków; przepisanie sekwencji nie zmienia decyzji kontraktowych tu zapisanych.

---

## Nota implementacyjna dla Leo / Jacka (kolejność warstw — JEDNA gałąź)

Zmiana kontraktu front+back → **jedna gałąź feature** + **test integracyjny realnego kontraktu** w tym samym PR (lekcja split-frontend-backend; 2 osobne PR-y na mocku = rozjazd na prod). Brama Z2 integration jest tym testem.

Kolejność warstw:

1. **(a) Lift stanu pliku do wizarda.** `StepSyllabusProps` dostaje `onFileChange: (f: File | null) => void` (i opcjonalnie `file` dla kontrolowanego renderu chipa). `onboarding-wizard.tsx` trzyma `const [syllabusFile, setSyllabusFile] = useState<File | null>(null)`. Plik przestaje być uwięziony w komponencie kroku.
2. **(b) Multipart send w `handleAnalyze`.** Rozgałęzienie: jeśli jest `syllabusFile` → zbuduj `FormData` (`fd.append("file", syllabusFile)`, `fd.append("careerGoal", resolvedCareerGoal)`), `fetch` BEZ ręcznego `Content-Type` (przeglądarka ustawi `multipart/form-data` z boundary). Jeśli pliku brak, a tekst ≥ 100 → obecna ścieżka JSON. **Usuń** twardy early-return blokujący ścieżkę plikową (dziś `if (syllabusText.trim().length < 100) return` ubija upload). Walidacja klienta: „albo plik, albo tekst ≥ 100".
3. **(c) Endpoint multipart + czytnik PDF.** `route.ts`: rozróżnij po `req.headers.get("content-type")`. Multipart → `req.formData()` → pobierz `file` (instancja `File`/`Blob`), waliduj MIME+magic+rozmiar → `Buffer.from(await file.arrayBuffer())` → `pdf-parse` → tekst → walidacja długości (≥100, ≤50000) → `parseSyllabus(text, careerGoal)`. JSON → ścieżka bez zmian. Wspólny `try/catch` z `logError` wokół ekstrakcji i analizy.

Zależność: `pnpm add pdf-parse` + `pnpm add -D @types/pdf-parse` na tej samej gałęzi (commit razem z `pnpm-lock.yaml`). Runtime Node (już jest — `maxDuration = 60`).

Kolejność testów: integracyjny (Z2) zielony lokalnie PRZED merge; e2e `@llm` w nocnym/przed-Beta jobie (klucz API w CI = osobny sign-off Darka). Quinn weryfikuje flip obu bram realnym testem przed „go".

---

## Poza zakresem (Out of Scope)

- OCR dla skanowanych PDF (obrazów) — na teraz `422` „wklej ręcznie"; OCR to osobna inicjatywa, jeśli dane pokażą realny popyt.
- DOCX / inne formaty — tylko PDF i tekst.
- Wieloplikowy upload — jeden plik na analizę.
- Pełna przebudowa onboardingu (kompetencje ze źródła = analiza rynku, sylabus → adnotacja) — strumienie F/G, osobna inicjatywa; #2 zamyka się działającym uploadem PDF.
