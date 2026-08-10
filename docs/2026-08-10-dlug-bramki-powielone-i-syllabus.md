# Dług: powielone bramki bazy testowej + `syllabus-pdf-upload` jako test jednostkowy w przebraniu

**Założony:** 2026-08-10 (review Leo do PR #268) · **Owner:** Quinn (QA) · **Decyzje zastrzeżone:** Leo (Tech Lead) / Ethan (CTO)
**Status:** OTWARTY — progi konsolidacji wykonywane maszynowo, sama konsolidacja nie ruszyła
**Powiązane:** PR #268 (twardy warunek wstępny zestawu integracyjnego), `CLAUDE.md` §8 v1.17,
`src/test/__tests__/bramki-powielone-spis.test.ts` (strażnik + progi), `skills/qa/SKILL.md` §8

> **Słowniczek** (żargon rozwinięty przy pierwszym użyciu):
> **bramka pomijania** = warunek na początku pliku testowego, który każe pominąć testy, gdy brakuje
> bazy; **nośnik** = pojedyncza kopia tej samej reguły w kodzie; **atrapa (mock)** = podstawiona,
> fikcyjna wersja bazy albo modelu AI; **projekt vitest** = nazwany zestaw testów z własną
> konfiguracją (`unit`, `integration`, `evals`); **warunek wstępny (globalSetup)** = kod
> uruchamiany raz przed zebraniem plików testowych; **mutacja** = celowe zepsucie kodu, żeby
> sprawdzić, czy test to wykryje; **kontrola dodatnia** = dowód, że pomiar w ogóle potrafi dać
> sygnał.

---

## D1 — powielona bramka rozpoznawania bazy testowej

### Stan zmierzony (2026-08-10, gałąź `fix/testy-twardy-blad-bez-database-url` na `1da1f93`)

```
$ grep -rl 'const isLocalTestDb' --include='*.ts' --include='*.tsx' src tests tools | wc -l
60
$ grep -rl 'isLocalTestDb ? describe' --include='*.ts' --include='*.tsx' src tests tools | wc -l
58
$ find src tests tools -name '*.integration.test.*' | wc -l
58
```

Rozkład po odsianiu cytatów w komentarzach (żywych linii kodu, nie wystąpień napisu):

| co | ile | uwaga |
|---|---|---|
| żywe nośniki razem | **59** | liczba mierzona przez spis w przebiegu, nie wpisana ręcznie |
| w plikach `*.integration.test.*` | 57 | objęte warunkiem wstępnym z PR #268 |
| poza projektem `integration` | 2 | `tests/e2e-pw/60-c11-tutor.spec.ts:22`, `tests/e2e-pw/70-b7-viva.spec.ts:30` |
| pliki `*.integration.test.*` bez bramki | 1 | `syllabus-pdf-upload` — patrz D2 |
| fałszywe trafienia `grep` | 1 | `src/test/integration-db-guard.ts` cytuje wzorzec w nagłówku |

**Liczba „53" z opisu PR #268 była prawdziwa 2026-07-30 i zgniła w dziewięć dni.** Przebieg przez
historię: 36 (2026-07-23) → 53 (2026-07-30) → 58 (2026-08-06) → 59 (2026-08-10). Liczby „57/59"
z review Leo są zgodne z `grep`, ale liczą też cytat w komentarzu i pochodzą sprzed scalenia #270.
Dlatego w kodzie nie ma już żadnej liczby wpisanej ręcznie — liczy ją spis w trakcie przebiegu.

### Rozjazd kopii, który już nastąpił

`tools/__tests__/ingest-curriculum.integration.test.ts:34` **nie używa** wzorca kanonicznego:

```ts
const isLocalTestDb = isDedicatedTestDbUrl(DATABASE_URL);
```

Zaostrzenie z 2026-07-26 (commit `d33ba28`, dług C1 z przeglądu Leo 1E.7 L2): ten plik ładuje przy
imporcie `.env.local`, więc przy gołym `pnpm test:integration` pisał do bazy **deweloperskiej**,
wyglądając przy tym na pominięty. Rozjazd jest tu **poprawą**, nie zaniedbaniem — to prototyp
semantyki, którą PR #268 uogólnia na cały zestaw.

Dwa wnioski, oba wiążące dla konsolidacji:

1. Twierdzenie „kopie są dosłownie identyczne" (opis PR #268 i review Leo) **jest nieprawdziwe** —
   sprostowane w nagłówku `src/test/integration-db-guard.ts`.
2. Jedno źródło po konsolidacji ma nieść semantykę **`isDedicatedTestDbUrl`** (host lokalny ORAZ
   nazwa bazy `test`/`_test`), nie sam regexp na host.

### Progi konsolidacji (wymóg `CLAUDE.md` §8 v1.17 pkt 2)

Wykonywane maszynowo przez `src/test/__tests__/bramki-powielone-spis.test.ts` — nie zadeklarowane
w komentarzu, bo próg, którego nikt nie czyta, nie jest progiem.

| próg | wyzwalacz | co się dzieje |
|---|---|---|
| **A** | pierwsza zmiana wzorca bramki | kopia rozjeżdża się z kanonem → spis czerwieni się i podaje plik oraz linię |
| **B** | pojawienie się **trzeciego** nośnika poza projektem `integration` | lista jest zamknięta; nowy nośnik → czerwone |

**Czego świadomie NIE ma: progu na samą liczbę kopii.** Wewnątrz projektu `integration` ciche
pominięcie jest już odcięte warunkiem wstępnym, więc kolejna kopia podnosi koszt przyszłej
konsolidacji, ale nie podnosi ryzyka. Bramka na liczbę czerwieniłaby się przy co drugim nowym
teście integracyjnym i uczyłaby podbijać liczbę bez myślenia.

### Czy dwa nośniki e2e wchodzą w ten sam próg — odpowiedź: NIE, mają własny (próg B)

Powód jest merytoryczny, nie porządkowy:

- **Inne źródło adresu.** Oba czytają `E2E_DATABASE_URL ?? DATABASE_URL`, a nie samo
  `DATABASE_URL`. Konsolidacja musi więc wystawić pomocnika przyjmującego adres **argumentem**;
  pomocnik czytający środowisko sam z siebie nie obsłuży obu miejsc.
- **Inny mechanizm pomijania.** `test.skip(!isLocalTestDb, …)` Playwrighta, nie
  `describe.skip` vitesta.
- **Inne ryzyko resztkowe.** Warunek wstępny z PR #268 należy do projektu `integration` i tam nie
  sięga. Te dwa pliki **nadal mogą pominąć się po cichu** — i to jest dokładnie ta klasa błędu,
  którą PR #268 zamyka gdzie indziej. Dlatego trzeci taki nośnik ma zatrzymywać przegląd
  natychmiast, a nie czekać na konsolidację.

Ryzyko resztkowe jest dziś ograniczone: oba pliki są oznaczone `@llm` i stoją dodatkowo za
`ANTHROPIC_API_KEY`, więc biegną w przebiegu nocnym, a nie w bramce blokującej przy zgłoszeniu
(`skills/qa/SKILL.md` §5). To zmniejsza szkodę, nie usuwa jej: nocny przebieg też pokazuje zieleń.

### Plan konsolidacji (do wykonania osobnym, wąskim zgłoszeniem)

1. Wystawić `src/test/db-gate.ts` z jedną funkcją przyjmującą adres argumentem i niosącą semantykę
   `isDedicatedTestDbUrl`.
2. Zamienić kopie w plikach `*.integration.test.*` — **wyłącznie przenosiny, zero zmian
   merytorycznych**, żeby przegląd był czytelny.
3. Przestawić dwa nośniki e2e na tego samego pomocnika, z jawnym przekazaniem
   `E2E_DATABASE_URL ?? DATABASE_URL`.
4. Usunąć `BRAMKA_W_PLIKACH` i powód `niewidoczny-dla-bramek` ze strażnika — po konsolidacji
   przestają mieć sens (nagłówek `integration-db-guard.ts` już to zapowiada).
5. Zredukować spis do sprawdzania, że powielenie nie wróciło.

---

## D2 — `syllabus-pdf-upload.integration.test.ts`: test jednostkowy w przebraniu integracyjnego

**Owner:** Quinn (QA) — plik jest mój (zadanie Z2, 2026-06-03).

### Stan zmierzony

```
$ grep -c 'isLocalTestDb\|describe.skip\|dBack' src/app/api/syllabus/parse/__tests__/syllabus-pdf-upload.integration.test.ts
0
$ grep -c 'vi\.mock\|vi\.fn' src/app/api/syllabus/parse/__tests__/syllabus-pdf-upload.integration.test.ts
5
```

Jedyny plik `*.integration.test.*` bez bramki bazy (pomiar w D1). Nazwa obiecuje kontrakt na
realnej bazie; treść stoi na atrapach uwierzytelnienia i modelu AI, a bazy nie dotyka wcale.

### Waga: wada nazewnicza, nie dziura w pokryciu

Zgadzam się z oceną Leo. Po PR #268 przebieg bez bazy **pada**, więc ten plik nie może już
samodzielnie wyprodukować fałszywej zieleni — mechanizm szkodliwości jest odcięty. Zostaje
wprowadzanie w błąd: plik obiecuje pokrycie, którego nie ma, i zawyża w oczach czytelnika liczbę
testów kontraktowych.

**Sprostowanie do własnej pracy:** ten plik testuje realny handler trasy z realnym żądaniem
`multipart/form-data` — to nie jest test bezwartościowy i nie jest „atrapa zamiast testu".
Jest tylko zaklasyfikowany do złego projektu. Uzasadnienie doboru atrap w jego nagłówku
(atrapujemy kontrakt tego, co poza naszą kontrolą) zostaje w mocy.

### Naprawa (osobne zgłoszenie)

Przenieść do projektu `unit`: zmiana nazwy na `syllabus-pdf-upload.test.ts` + przeniesienie wpisu
z listy `INTEGRACYJNE_BEZ_BRAMKI` w spisie. Bez zmian w treści testu.

**Do rozstrzygnięcia przy okazji (Sophia/Leo, nie ja):** czy warstwa serwera uploadu sylabusa
zasługuje na prawdziwy test integracyjny z bazą — dziś nie ma żadnego, a błąd #2 z listy sześciu
wpadek dotyczył właśnie tej ścieżki.
