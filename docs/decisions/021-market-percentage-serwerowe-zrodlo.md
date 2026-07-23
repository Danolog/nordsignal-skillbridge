# ADR-021 — `marketPercentage` z serwerowego katalogu, nie z ciała żądania

- **Status:** ZAAKCEPTOWANY — decyzja Ethana (CTO). Podstawa mandatu: `CLAUDE.md` v1.11 §5
  (decyzja techniczna w domenie Engineering); wykonanie scalenia i wdrożenia objęte
  delegacją `CLAUDE.md` v1.12 (Ethan decyduje i wykonuje: scalenie, wdrożenie).
  **Nie wymaga sign-offu Darka.**
- **Data:** 2026-07-23 · **Autor:** Ethan (CTO)
- **Rozstrzyga:** dług §8(c) zgłoszony przez Leo i zapisany w ADR-018 §4 („czego ten ADR
  nie domyka") — `marketPercentage` przyjmowany z przeglądarki. Ten ADR ustala kształt
  naprawy **przed** kodowaniem Maxa: skąd realnie płynie liczba, którą powierzchnię naprawiamy,
  wspólny helper vs powielenie, `null` vs `0`, kontrakt klienta, brak migracji.
- **Powiązania:** ADR-018 §4/§8(c) (zgłoszenie), wzorzec serwerowy `passport-verified.ts:112-124`
  (`demandByName` — istnieje w repo), `market-catalog.ts` (czysty moduł katalogu, `normCompetencyName`,
  `computeDemandCoverage`), `CLAUDE.md` §7 (HITL — dowód kompetencji nie jest deklaracją).
- **Wykonanie:** Max (PR end-to-end), Quinn (kontrakt-test mutacyjny), Leo (review wg 14 domen),
  Ethan (scalenie, wdrożenie). **Zero migracji, zero zmian bazy produkcyjnej NEON** (D6).

> **Słowniczek** (żargon rozwinięty przy pierwszym użyciu): **popyt / `demandPercentage`** — %
> ofert pracy danej ścieżki, w których kompetencja wystąpiła (mierzone z danych rynku,
> `job_market_data`); **`marketPercentage`** — ta sama liczba zapisana przy wierszu studenta;
> **katalog rynku** — zbiór kompetencji ścieżki z popytem, ładowany serwerowo z `job_market_data`
> (`loadMarketCatalog`); **ciało żądania / request body** — dane, które przeglądarka wysyła w POST;
> **schemat Zod** — walidator kształtu danych wejściowych; **`demandByName`** — mapa
> „znormalizowana nazwa kompetencji → popyt", zbudowana z katalogu; **agregat** — liczba zbiorcza
> (tu: `AVG` = średnia); **paszport publiczny** — strona kompetencji studenta pod tokenem/linkiem,
> którą student pokazuje pracodawcy (kredencjał, `CLAUDE.md` §7); **migracja** — ponumerowana
> zmiana struktury bazy; **flaga / feature flag** — przełącznik włączający kod bez wdrożenia od nowa.

---

## 1. Kontekst i problem

`marketPercentage` w wierszu `competencies` jest dziś liczbą, którą **klient sam o sobie deklaruje**.
Schemat Zod przyjmuje ją z ciała żądania (`onboarding/route.ts:38` — `z.number().int().min(0).max(100)`)
i zapis wkłada ją do bazy 1:1 (`onboarding/route.ts:289` — `marketPercentage: c.marketPercentage`).
To dokładnie klasa długu, którą zamknęliśmy dla `hint_depth` (ADR-018): **liczba-dowód pochodzi
z przeglądarki, nie z pomiaru u źródła.** Właściwy wzorzec serwerowy już w repo jest —
`passport-verified.ts:112-124` buduje `demandByName` z katalogu i stempluje popyt z POCHODZENIA,
ignorując klienta.

### 1.1. Realny graf skażenia — sprostowanie założenia zadania (finding #1)

Zadanie zakładało, że skażona jest liczba **faculty-facing** (panel uczelni). **Prześledziłem graf
kodem — to założenie jest błędne, i to ma znaczenie dla priorytetu.**

**Panel uczelni pije z SERWERA, nie z klienta — jest już czysty:**
- `faculty/dashboard/route.ts:106` liczy `avgMarketPct = ROUND(AVG(gaps.marketPercentage))`.
- `gaps.marketPercentage` zapisuje `persistMarketGaps` → `deriveGaps(catalog, …)`
  (`market-catalog.ts:349-364`), a tam `marketPercentage: item.demandPercentage` pochodzi z
  `loadMarketCatalog(careerGoal)` = `job_market_data`. **Serwer. Klient nie ma tu wejścia.**
- Heatmapa uczelni (`dashboard/route.ts:84-97`) czyta `requiredByPercent = m.demandPercentage`
  z `jobMarketData` wprost. Też serwer.
- `competencies` nie jest w ogóle odpytywana przez trasę panelu uczelni.

**Skażona jest wyłącznie kolumna `competencies.marketPercentage`** (klient → zapis 1:1). Ona NIE
zasila żadnego agregatu uczelni. Zasila natomiast:
- **paszport publiczny** `api/passport/[id]/route.ts:70` → `passport/[id]/page.tsx:133` — powierzchnia
  **employer-facing** (pracodawca widzi liczbę pochodzącą z przeglądarki studenta). Wg `CLAUDE.md` §7
  to jest **kredencjał wysokiej stawki** — czyli stawka **wyższa** niż liczba dla uczelni, nie niższa;
- paszport własny studenta `api/passport/route.ts:111` → `(dashboard)/passport/page.tsx:79`;
- skill-mapę (węzły kompetencji POSIADANYCH) `generate-skill-map.ts:47` → `build-graph.ts:153` →
  komponenty `skill-map/*`.

Obie trasy paszportu mają flagę `passportVerifiedOnly`: gdy **ON**, liczą z katalogu
(`buildVerifiedPassportCompetencies`) — czysto. Wyciek jest **na ścieżce flagi OFF** (domyślnej,
deploy ≠ release). Naprawa u źródła zamyka go niezależnie od flagi.

**Wniosek dla priorytetu:** nie naprawiamy panelu uczelni (jest czysty). Naprawiamy `competencies`
→ paszport (w tym publiczny/employer-facing) → skill-mapa. Stawka jest wyższa, niż zakładało
zgłoszenie, bo dotyka kredencjału pokazywanego pracodawcy.

### 1.2. Pełna lista powierzchni `competencies.marketPercentage` (finding #2)

**Pisarz (jedyny) — źródło wycieku:**
- `onboarding/route.ts:289` — `marketPercentage: c.marketPercentage` (wartość z ciała żądania).

**Czytelnicy kolumny (wszyscy pokazują dziś liczbę kliencką przy fladze OFF):**
- `api/passport/route.ts:111` — paszport własny.
- `api/passport/[id]/route.ts:70` — **paszport publiczny (employer-facing).**
- `(dashboard)/passport/page.tsx:79`, `passport/[id]/page.tsx:133` — strony paszportu.
- `lib/ai/generate-skill-map.ts:47` → `lib/skill-map/build-graph.ts:153` → `skill-map/{skill-node,
  node-detail-panel,skill-map-list}.tsx` — węzły kompetencji posiadanych.

**Poza zakresem (już serwerowe — NIE ruszamy):** wszyscy czytelnicy `gaps.marketPercentage` —
`faculty/dashboard:106`, `gaps/route.ts`, `gaps/[id]/why`, `dashboard/page.tsx`, skill-mapa (węzły
luk `generate-skill-map:51`), `market-notifications`, `advisor-memory`. Te liczby pochodzą z
`deriveGaps` → katalog. Zmiana ich nie dotyka.

---

## 2. Decyzja

### D1 · Źródłem `competencies.marketPercentage` jest katalog serwerowy, nie ciało żądania

Onboarding przestaje czytać `marketPercentage` z ciała. Serwer wyprowadza popyt z
`loadMarketCatalog(careerGoal)` po **znormalizowanej nazwie** (`normCompetencyName` = trim + lower),
dokładnie tym samym wzorcem `demandByName`, co `passport-verified.ts:116-118`. Przy budowie wierszy
kompetencji (`onboarding/route.ts:271-291`) `marketPercentage` bierze się z mapy popytu, a nie z `c`.

Katalog ładujemy **raz** w trasie (jednym zapytaniem `loadMarketCatalog(careerGoal)`) przed budową
wierszy — `job_market_data` ma grant SELECT poza kontekstem RLS studenta, więc wolno to zrobić przed
`withTenantContext`. `persistMarketGaps` ładuje katalog ponownie później (linia 360, po commicie) —
zostawiamy to bez zmian (jedno dodatkowe tanie, indeksowane zapytanie per onboarding; ujednolicenie
ładowania to opcjonalny follow-up, nie warunek tej naprawy — nie rozdmuchuję sygnatury).

### D2 · Wspólny helper `demandByName`, nie powielenie (rekomendacja przyjęta)

W repo są DZIŚ trzy miejsca budujące de facto tę samą mapę „nazwa → popyt":
`passport-verified.ts:116-118`, `computeDemandCoverage` (`market-catalog.ts:266-272`, z dedup przez
`Math.max`) i — po tej naprawie — onboarding. Powielenie po raz trzeci byłoby długiem.

Wyodrębniam **czystą funkcję do `market-catalog.ts`** (kanoniczny dom logiki katalogu, bez importu
`db`):

```ts
/** Mapa: znormalizowana nazwa kompetencji → popyt (%). Duplikat nazwy → wygrywa wyższy popyt. */
export function buildDemandByName(
  catalog: Pick<MarketCatalogItem, "competencyName" | "demandPercentage">[],
): Map<string, number> { … }
```

Reużywają ją: `computeDemandCoverage` (refaktor na wspólny helper — semantyka dedup `max` zachowana),
`buildVerifiedPassportCompetencies` (zamiast inline mapy) i onboarding (nowa derywacja). **Jedno
źródło prawdy dla wyszukania popytu po nazwie.** Zakres: ~5 linii nowego kodu + dwa call-site'y na
istniejący wzorzec — nie rozdmuchuje PR-a, redukuje powierzchnię rozjazdu (Built-to-Sell).

### D3 · Nazwa spoza katalogu → `null`, nie `0`

Gdy nazwa kompetencji studenta nie występuje w katalogu ścieżki (własny, wpisywany `careerGoal`
z edytora profilu; drobny rozjazd nazwy), `demandByName.get(norm) === undefined`. Zapisujemy
wtedy **`null`** (`demandByName.get(normCompetencyName(c.name)) ?? null`).

- Kolumna `competencies.market_percentage` jest **nullowalna** (`schema.ts:183`, `integer` bez
  `notNull`) — `null` jest legalny bez migracji.
- `null` = „brak tej kompetencji w katalogu rynku ścieżki" = uczciwa niewiadoma. `0` = „rynek
  wymaga jej w 0% ofert" = zmierzone twierdzenie, które byłoby **fałszywe**. Nie mianujemy
  niewiadomej pomiarem (ta sama zasada co ADR-018 D3 dla `hint_depth_source`).
- Spójność: `passport-verified.ts:122` już wybrał `?? null` dla tego samego przypadku. Trzymamy
  jeden wybór w obu ścieżkach.
- UI jest na `null` odporne — komponenty guardują `marketPercentage != null`
  (`passport-document.tsx:123`, `skill-node.tsx:62`, `node-detail-panel.tsx:113`,
  `skill-map-list.tsx:101`): `null` renderuje się jako „ukryte", nie jako „0%".

**Wpływ na `AVG` — żaden, i to jest ważne rozstrzygnięcie, nie przeoczenie.** `competencies.marketPercentage`
**nie jest uśredniana nigdzie** (jedyny `AVG` to `faculty/dashboard:106` na `gaps`, patrz §1.1).
Kolumna, którą się uśrednia (`gaps.marketPercentage`), jest `NOT NULL DEFAULT 0` (`schema.ts:226`)
i **strukturalnie zawsze w katalogu** — `deriveGaps` produkuje luki wyłącznie z pozycji katalogu,
więc „spoza katalogu" dla luki nie istnieje. Zatem: `null` po stronie `competencies` nie dotyka
żadnej średniej; problem „`AVG` ignoruje `NULL` i zmienia liczbę uczelni" tu **nie występuje**.

### D4 · Usuwamy `marketPercentage` z kontraktu żądania; brak twardego 400

Wyjmuję `marketPercentage` z `SelectedCompetencySchema` (`onboarding/route.ts:35-40`). Kontrakt
przestaje wymieniać pole, którego serwer nie czyta — to uczciwy sygnał dla przyszłego czytelnika
(inaczej pole w schemacie sugeruje, że jest używane).

**Bez `.strict()` / bez twardego 400 na starym kliencie.** Domyślny obiekt Zod **odrzuca (strip)
nieznane klucze**, więc stary klient, który wciąż wyśle `marketPercentage`, przejdzie walidację, a
pole zostanie po cichu odcięte — serwer i tak wyprowadza własną liczbę. Uzasadnienie zgodności z
F2 („nie ufaj przeglądarce"): własność bezpieczeństwa („klient nie ustawia tej liczby") osiągamy
przez **nieczytanie** wartości, nie przez odrzucanie żądania. Twarde 400 wywróciłoby sesje studentów
w trakcie kreatora podczas wdrożenia — za zero zysku bezpieczeństwa, skoro wartość jest ignorowana.
To różnica względem realnego wektora wstrzyknięcia: tu wartość po prostu przestaje być źródłem.

W tym samym PR klient przestaje wysyłać pole (`onboarding-wizard.tsx:454,468,482`,
`profil-editor.tsx:210` — dziś ustawiają `marketPercentage: item.demandPercentage`, czyli odbijają
katalog z powrotem). To porządek kontraktu, nie warunek poprawności — serwer jest odporny
niezależnie.

### D5 · Zero migracji, zero zmian bazy produkcyjnej

Kolumna `competencies.market_percentage` **już istnieje i jest nullowalna** (`schema.ts:183`).
Naprawa jest **czysto aplikacyjna** — logika ścieżki zapisu + porządek kontraktu klienta. **Brak
`pnpm db:generate`, brak nowej migracji, brak dotknięcia schemy NEON.** Katalog `job_market_data`
jest już na produkcji (zasila luki i heatmapę uczelni) — **żadnego re-ingestu treści.**

**Dane historyczne.** Produkcja ma dziś ~0 studentów (projekt czeka na pierwszą rejestrację),
więc **backfill niepotrzebny**. Gdyby wiersze `competencies` istniały ze starą (kliencką) liczbą,
re-onboarding sam je odświeża (zapis kasuje i wstawia kompetencje od nowa — `onboarding/route.ts:241,271`),
a wartość i tak pochodzi już z serwera. Jednorazowy `UPDATE` z katalogu (transakcyjny, `WHERE`,
wzorzec v1.12) jest **opcją, nie wymogiem** i dziś nie ma po co go uruchamiać.

---

## 3. Alternatywy rozważone i odrzucone

| Wariant | Dlaczego odrzucony |
|---|---|
| **Naprawiać agregat uczelni** (założenie zadania) | Agregat uczelni jest już serwerowy (`gaps` → `deriveGaps` → katalog). Naprawa tam byłaby pracą nad czystą powierzchnią; wyciek jest w `competencies` → paszport (§1.1). |
| **Powielić wzorzec `demandByName` w onboardingu** | Trzecia kopia tej samej mapy (po `passport-verified` i `computeDemandCoverage`). Helper kosztuje ~5 linii, a usuwa rozjazd (D2). |
| **Off-catalog → `0`** | `0` = zmierzone „0% ofert", fałsz. `null` = uczciwa niewiadoma, kolumna nullowalna, UI guarduje, `passport-verified` już tak wybrał (D3). |
| **Twarde 400 na starym kliencie (`.strict()`)** | Wywraca sesje w trakcie kreatora podczas deployu za zero zysku — wartość jest ignorowana, nie wstrzykiwana (D4). |
| **Zostawić kliencki `marketPercentage` w schemacie „na wszelki wypadek"** | Pole w kontrakcie sugeruje, że jest używane. Usunięcie to honest signal; strip Zod chroni back-compat (D4). |

---

## 4. Konsekwencje

- **Paszport publiczny (employer-facing) przestaje pokazywać liczbę z przeglądarki** — kredencjał
  niesie popyt z pochodzenia (katalog), niezależnie od flagi `passportVerifiedOnly`. To jest właściwy
  zysk: `CLAUDE.md` §7 (dowód kompetencji nie jest deklaracją) dotrzymany na powierzchni wychodzącej
  na zewnątrz.
- **Skill-mapa i paszport własny** — te same liczby co dotąd dla nazw w katalogu; dla nazw spoza
  katalogu liczba znika (`null` → ukryta) zamiast pokazywać wartość zmyśloną przez klienta.
- **Panel uczelni — bez zmian** (był czysty).
- **Rollback:** rewert PR-a. Zero migracji do cofania, kolumna i schema nietknięte.
- **Czego ten ADR nie domyka:** ujednolicenie podwójnego ładowania katalogu (trasa + `persistMarketGaps`)
  jako opcjonalny follow-up (D1); jednorazowy backfill istniejących wierszy — niepotrzebny przy
  pustej produkcji, nazwany na wypadek niezerowej bazy (D5).

---

## 5. Plan implementacji (dla Maxa)

Kolejność:

1. **`src/lib/onboarding/market-catalog.ts`** — dodaj czystą funkcję `buildDemandByName(catalog)`
   (mapa znorm. nazwa → popyt, dedup `max`). Zrefaktoruj `computeDemandCoverage`, żeby jej używała
   (zachowaj obecną semantykę i testy).
2. **`src/lib/passport-verified.ts`** — `buildVerifiedPassportCompetencies` używa `buildDemandByName`
   zamiast inline mapy (`:116-118`). Zachowanie bez zmian (`?? null`).
3. **`src/app/api/onboarding/route.ts`**:
   - usuń `marketPercentage` z `SelectedCompetencySchema` (`:38`);
   - załaduj `loadMarketCatalog(careerGoal)` raz przed budową wierszy, zbuduj `demandByName`;
   - w budowie wierszy (`:271-291`) zamień `marketPercentage: c.marketPercentage` na
     `marketPercentage: demandByName.get(normCompetencyName(c.name)) ?? null`.
4. **Klient** — `onboarding-wizard.tsx` (`:454,468,482`), `profil-editor.tsx` (`:210`): przestań
   wysyłać `marketPercentage` w ładunku POST (porządek kontraktu; serwer jest odporny bez tego).

Zero plików migracji. `pnpm db:generate` **nie jest uruchamiany** (brak zmian schematu — D5).

---

## 6. Test / mutacja (dla Quinna)

Test-mutacyjny, który zamyka dług (wzorzec ADR-018 §5 pkt 5 — sfałszowana wartość klienta
nadpisana przez serwer):

1. **Mutacja główna.** POST `/api/onboarding` z kompetencją, której `marketPercentage` w ciele jest
   **celowo błędny** (np. body: `Python` z `marketPercentage: 99`, a katalog ścieżki ma `Python = 55`).
   Po zapisie odczyt `competencies.market_percentage` dla tego wiersza **MUSI == 55** (katalog),
   **nie 99** (klient). Gdy pole usunięte z klienta — wynik ten sam (serwer wyprowadza).
2. **Off-catalog → `null`.** Onboarding z nazwą spoza katalogu (`careerGoal` własny / nazwa nieznana)
   → `competencies.market_percentage IS NULL` (nie `0`).
3. **End-to-end na powierzchni wychodzącej.** Onboard z zafałszowaną liczbą → GET `/api/passport/[id]`
   (publiczny) → `marketPercentage` == wartość katalogowa albo nieobecna, **nigdy** liczba z ciała.
4. **Jednostkowy helper.** `buildDemandByName`: dopasowanie po znorm. nazwie (różna wielkość liter,
   spacje), duplikat nazwy → wygrywa wyższy popyt.

**Prod?** Nie dotyka. Brak re-ingestu, brak migracji — to logika ścieżki zapisu, nie treść katalogu.

---

## 7. Bramki (Leo → scalenie → wdrożenie)

- **Leo** — review wg 14 domen standardu production-readiness. Szczególnie: domena „nie ufaj
  wejściu klienta" (F2) i brak nowej powierzchni RLS (zmiana czysto w logice zapisu, `competencies`
  już objęte RLS).
- **Quinn** — kontrakt-test mutacyjny (§6) zielony; w szczególności pkt 1 (kliencka liczba nadpisana)
  i pkt 3 (paszport publiczny czysty).
- **Ethan** — scalenie do `main` po review Leo + wdrożenie na produkcję (delegacja `CLAUDE.md` v1.12).
  **Bez zmian bazy NEON** (brak migracji, brak zaciągu) — więc bez kopii zapasowej Neon i bez
  transakcyjnego SQL na danych; deploy jest czysto kodowy. Autor commita = Darek (`mubueu@gmail.com`),
  jeden pisarz gita per gałąź, akcja w audit logu.

**Stan startowy dla Maxa:** wszystkie decyzje przed kodowaniem rozstrzygnięte tym dokumentem
(źródło liczby, helper, `null`, kontrakt, brak migracji). Max może zaczynać na tej samej gałęzi
`fix/market-percentage-serwerowe-zrodlo`.
