# P5 — spec projektowy: mastery gate 1E.3 (egzamin modułowy), UI/UX

**Autor:** Mila (Product Designer) · **Data:** 2026-07-24 · **Status:** hi-fi (opis) + spec, do implementacji Jackiem
**Zależności:** silnik P1–P4 GOTOWY za flagą `FLAG_MASTERY_GATE` OFF (`main=4632c3c`). To jest **P5** planu `docs/product/plan-1e3-mastery-gate-v0.1.md` — integracja z drabiną + UX egzaminu. Nie koduję — to brief dla Jacka.
**Design system źródłowe:** czytane z kodu — `src/app/(dashboard)/curriculum/**`, `src/components/curriculum/*` (ladder-view, module-items, item-detail, item-runner, labels). Zero nowych tokenów kolorystycznych/typograficznych — patrz rozdz. 8.

---

## 0. Cel w jednym zdaniu

Student ma zawsze wiedzieć: (a) że moduł czeka na egzamin, nie tylko na pozycje, (b) ile czasu i podejść to kosztuje, (c) że błąd nie jest końcem — a gdy jest (cap 2), że dostaje **konkretną**, nie ogólnikową, ścieżkę powrotu.

---

## 1. Ramy produktowe (framing wpleciony w architekturę, nie doklejony)

**CLAUDE.md §7 (v1.13):** mastery gate to progresja WEWNĘTRZNA (odblokowanie kolejnego modułu), nie kredencjał wychodzący do pracodawcy → **ocena formująca, maszyna samowystarczalna**. To ma konkretną konsekwencję projektową, różną od wzorca „samoocena" (golden example): **na tym ekranie NIE MA żadnego komunikatu typu „to twoja deklaracja, nie werdykt"** — bo to faktycznie jest werdykt, i to autonomiczny werdykt maszyny, świadomie (decyzja Darka 2026-06-29). Ekran musi to nazwać wprost, nie ukrywać za miękkim językiem: wynik egzaminu jest ostateczny i wydany przez system od razu, bez rundy „czeka na wykładowcę". Jedyne miejsce z „miękkim" tonem to R13 (błąd nie jest końcem) — to o **emocji porażki**, nie o **statusie werdyktu**. Obie prawdy współistnieją: werdykt jest twardy i natychmiastowy; ton komunikacji o porażce jest spokojny.

Drugie ramowanie wplecione w architekturę: **liniowość bez cofania** (kontrakt serwera — `expectedExamPosition` odrzuca niezgodną kolejność 409). UI nie może sugerować możliwości powrotu (żadnego „wstecz", żadnej listy pytań do kliknięcia) — inaczej obiecuje coś, czego serwer nie pozwoli zrobić.

---

## 2. Macierz stanów — wszystkie 5 ekranów, rozbite na przypadki

Łącznie **16 stanów**. Błąd rozbity na 4 osobne przypadki (nie jeden globalny) — uzasadnienie pod tabelą.

| # | Ekran | Stan | Kiedy |
|---|---|---|---|
| E1 | Drabina/moduł | Moduł z egzaminem, 0% pozycji (**test-out dostępny**) | `available`, `completedItems===0`, moduł ma `examConfigJson` |
| E2 | Drabina/moduł | Moduł z egzaminem, pozycje w trakcie | `in_progress`, `0<completedItems<itemCount` |
| E3 | Drabina/moduł | **Bramka**: wszystkie pozycje zrobione, egzamin nie zdany | `completedItems===itemCount`, `verifiedByMethod` puste |
| E4 | Drabina/moduł | Moduł zaliczony przez egzamin | `verifiedByMethod∈{exam,test_out}` |
| S1 | Przed startem | Domyślny (confirm) | Wejście na `/curriculum/[moduleId]/exam` |
| S2 | Przed startem | Błąd startu — moduł bez skonfigurowanego egzaminu | `POST /start` → 422 „Moduł nie ma skonfigurowanego egzaminu" |
| S3 | Przed startem | Błąd startu — sieć/500 | `POST /start` → 5xx/timeout |
| S4 | Przed startem | Konflikt — egzamin innego modułu już trwa | `POST /start` → 409 „Egzamin tego modułu już trwa" (w praktyce nie wystąpi dla TEGO modułu — patrz 9.1) |
| R1 | Runner | Pytanie bieżące (świeży start) | `resumed:false`, pytanie wyrenderowane |
| R2 | Runner | Pytanie bieżące (wznowienie) | `resumed:true` — baner „wracasz" nad pytaniem |
| R3 | Runner | Błąd zapisu odpowiedzi | `POST /answer` → sieć/5xx |
| R4 | Runner | Konflikt kolejności/sesji | `POST /answer` → 409 (kolejność/nieaktywna/wygasła) |
| R5 | Runner | Domykanie (po ostatnim pytaniu) | `done:true`, przed `POST /complete` |
| R6 | Runner | Błąd domknięcia | `POST /complete` → 5xx / 422 (niekompletny) |
| W1 | Wynik | Zdany | `result.passed===true` |
| W2 | Wynik | Oblany, jest retry | `passed:false`, `correctives:false` |
| W3 | Wynik | Oblany, cap wyczerpany (correctives) | `passed:false`, `correctives:true` — renderuje Ekran 5 |

**Dlaczego błąd rozbity na S2/S3/R3/R4/R6, nie jeden „ErrorState":** pięć różnych przyczyn = pięć różnych akcji naprawczych. S2 to **błąd treści/konfiguracji** (nic nie da się zrobić po stronie studenta — akcja: „wróć do modułu", nie „spróbuj ponownie", bo ponowienie da ten sam 422). S3 to **błąd sieci przed startem** — retry ma sens, nic nie jest jeszcze zapisane. R3 dotyczy **jednej odpowiedzi w trakcie 15** — reszta pytania stoi, wybór studenta zostaje widoczny (analogicznie do S6 wzorca samooceny), retry lokalny. R4 to **rozjazd stanu** (np. dwie karty przeglądarki) — jedyna bezpieczna naprawa to przeładowanie strony i ponowne wejście (serwer i tak wznowi na właściwej pozycji z zamrożonego planu). R6 dotyczy **operacji URUCHAMIANEJ w trakcie sesji** (domknięcie po 15. pytaniu) — analogicznie do lekcji z golden example: porażka tej operacji **nie kasuje** 15 udzielonych odpowiedzi (zapisane transakcyjnie per pytanie), więc retry jest bezpieczny i musi to explicite powiedzieć.

---

## 3. Ekran 1 — Drabina z bramką egzaminu

### 3.1. Lista modułów (`/curriculum`, `LadderView`/`ModuleRow`) — zmiana minimalna

**Decyzja: zero nowej wartości `ModuleStatus`.** Warunek „pozycje zrobione, egzamin nie zdany" (E3) wyliczam z danych już obecnych w `LadderModuleWithProgress` (`completedItems === itemCount && status === "in_progress"`) — bez dotykania enuma ani kontraktu `ladder.ts`. Koszt: żaden — to czysta prezentacja nad istniejącym kształtem danych. Alternatywa (nowy status np. `awaiting_exam`) odrzucona: rozszerzałaby typ w trzech miejscach (schema pochodna, `MODULE_STATUS_LABEL`, `statusBadgeClass`) dla czegoś, co da się wyprowadzić czytaniem dwóch pól, które już tam są.

Zmiana w `ModuleRow`: gdy warunek E3 prawdziwy, pod paskiem postępu (który i tak pokaże 100%) dokładam jedną linię:

```
[CheckCircle2? NIE — ikona: ClipboardCheck, sky-600]  Wszystkie pozycje zrobione — zdaj egzamin, by odblokować kolejny moduł  [Podejdź do egzaminu →]
```

- Ikona: `ClipboardCheck` (lucide) w kolorze `text-sky-600` — **nie** `emerald` (to nie jest jeszcze sukces — moduł nadal niezaliczony) i **nie** `Lock` (moduł nie jest zablokowany, treść jest dostępna). Sky jest już w systemie jako kolor „następny krok" (`StatusIcon` → `ChevronRight` sky-600 dla modułu klikalnego) — reużycie znaczenia, nie nowy kolor.
- Link prowadzi do `/curriculum/{moduleId}/exam` (Ekran 2), **omijając** stronę modułu — student już wie, co robić.
- Reszta wiersza (tytuł, opis, badge „W trakcie") bez zmian — to najmniejsza możliwa ingerencja w istniejący, przetestowany komponent (`ladder-view.test.tsx`).

### 3.2. Strona modułu (`/curriculum/[moduleId]`) — dwa nowe bloki, warunkowe

Dokładane **pod** `<header>`, **nad** `<ModuleItems>`, tym samym wzorcem karty co istniejące bloki blokady (`rounded-xl border ... p-5`) — spójność z `isModuleUnlocked` blokiem widocznym w tym samym pliku.

**Blok A — bramka (E3), moduł ma `examConfigJson` i wszystkie pozycje zrobione:**

```
┌───────────────────────────────────────────────────────┐
│ [ClipboardCheck, sky]  Gotowy(-a) do egzaminu           │
│ Zrobiłeś(-aś) wszystkie pozycje. Moduł odblokuje się   │
│ dopiero po zdanym egzaminie — 15 pytań, ~25 min.        │
│                                    [ Podejdź do egzaminu ]│  primary
└───────────────────────────────────────────────────────┘
```

**Blok B — test-out (E1), moduł `available`, 0 pozycji zrobionych, ma `examConfigJson`:**

```
┌───────────────────────────────────────────────────────┐
│ [FastForward, muted]  Znasz już ten temat?              │
│ Możesz pominąć moduł, jeśli zdasz jego egzamin bez      │
│ przechodzenia pozycji. Nie zdasz — wracasz tu i uczysz  │
│ się normalnie (to się nie liczy jako oblany raz na 2).  │
│                                    [ Test out ]           │  secondary/outline, MNIEJSZY nacisk
└───────────────────────────────────────────────────────┘
```

**Decyzja z kosztem — Blok B jest `outline`, nie `primary`.** Domyślna ścieżka produktu to nauka przez pozycje (drabina istnieje po coś); test-out to wyjście awaryjne dla studenta, który faktycznie już umie. Primary na obu blokach rozmyłoby, która ścieżka jest zalecana. Koszt: student śpieszący się może przeoczyć test-out (mniejszy kontrast) — akceptowalne, bo to opcja dla mniejszości.

**Otwarte pytanie do Sophii (nie rozstrzygam sama — dotyka zakresu):** zdanie „nie zdasz — nie liczy się jako oblany raz na 2" zakłada, że **test-out attempt nie konsumuje cap 2** retry zwykłej ścieżki. Czytając `exam/start/route.ts`, `attempt` liczy się z `priorFailed` (sesje `completed`+`passed:false`) **niezależnie od tego, czy student przeszedł pozycje czy nie** — nie widzę w kodzie rozróżnienia „to była próba test-out". Jeśli backend **nie** rozróżnia tych dwóch ścieżek, powyższe zdanie w Bloku B jest **fałszywe obietnicą** i muszę je zdjąć przed implementacją. **Blokuje Jacka do potwierdzenia przez Ethana/Sophię** — do tego czasu Blok B ma copy bez tego zdania (wersja bezpieczna): „Możesz spróbować zdać egzamin bez przechodzenia pozycji. Masz maksymalnie 2 podejścia do zdania tego egzaminu w ogóle."

### 3.3. A11y (Ekran 1)

- Blok A/B to `<section>` z `aria-labelledby` na własny nagłówek (h2), tak jak istniejący blok blokady w tym pliku — spójny wzorzec nagłówków sekcji.
- Link „Podejdź do egzaminu →" w wierszu ladder ma pełny tekst dostępny (nie goły `→`): `aria-label="Podejdź do egzaminu modułu {tytuł}"`.

---

## 4. Ekran 2 — Przed startem (`/curriculum/[moduleId]/exam`, nowa trasa)

Nowy plik `src/app/(dashboard)/curriculum/[moduleId]/exam/page.tsx` (server component — guard flagi/sesji/studenta identyczny do istniejących stron curriculum) + `ExamRunner` (client component, **jeden** komponent obsługujący S1→R*→W* jako maszynę stanów — wzorzec 1:1 z `ItemRunner`, który już robi dokładnie to dla pętli pytań: stan lokalny, brak zmiany URL między pytaniami). Uzasadnienie „jeden komponent, nie routing per pytanie": serwer i tak nie pozwala się cofnąć, więc osobne URL-e per pytanie tylko kusiłyby do przycisku „wstecz" przeglądarki, którego serwer i tak odrzuci 409 (R4) — mniej powierzchni na mylący stan.

**Decyzja o momencie wywołania `POST /start`:** dopiero po kliknięciu „Rozpocznij egzamin", NIE przy wejściu na stronę. Uzasadnienie: `/start` tworzy nową sesję (zamraża plan wariantów) jeśli żadna aktywna nie istnieje — samo *obejrzenie* ekranu z ostrzeżeniem nie powinno mieć efektu ubocznego. Ta sama funkcja obsługuje transparentnie i „nowy start", i „wznowienie" (patrz odpowiedź API: `resumed: true|false`) — więc ekran S1 ma **jedną** treść niezależnie od tego, czy pod spodem czeka wznowienie; różnicę pokazuje dopiero Runner (R2).

### 4.1. S1 — domyślny (confirm)

```
┌───────────────────────────────────────────────────────┐
│  ← Wróć do modułu                                       │
│                                                          │
│  Egzamin: {tytuł modułu}                                 │
│                                                          │
│  [!] Zarezerwuj ~25 minut                                │
│  • 15 pytań, jedno po drugim — bez cofania się do        │
│    poprzednich.                                          │
│  • Możesz wyjść w trakcie — wracasz dokładnie tam,       │
│    gdzie skończyłeś(-aś), z tymi samymi pytaniami.       │
│  • Masz maksymalnie 2 podejścia. Po 2. nieudanym         │
│    dostaniesz konkretną listę tematów do powtórki.       │
│                                                          │
│              [ Rozpocznij egzamin ]     (primary, lg)    │
└───────────────────────────────────────────────────────┘
```

- Karta ostrzeżenia: `rounded-xl border border-border bg-muted p-5` (wzorzec bloku blokady) — **nie** `amber`/warning-kolor, bo to nie jest ostrzeżenie o błędzie, to informacja neutralna. Amber w tym systemie jest już zarezerwowany dla `in_progress`/lab-niezaliczalny (semantyka: „coś niedokończone/problematyczne") — użycie go tu myliłoby znaczenie.
- Przycisk `size="lg"` — jedyna akcja na ekranie, celowo duży (brak konkurencji wizualnej, brand voice: prowadzi do jednego działania).

### 4.2. S2 — błąd startu, moduł bez skonfigurowanego egzaminu (422)

```
Ten moduł nie ma jeszcze gotowego egzaminu.
Wróć do modułu — dogonimy Cię, gdy będzie gotowy.
[ Wróć do modułu ]
```
Brak przycisku „spróbuj ponownie" — ponowienie da identyczny 422 (treść nie istnieje, to nie awaria przejściowa). To rozróżnienie jest świadome: przycisk retry na błędzie, który nigdy się nie naprawi samym kliknięciem, jest okłamywaniem studenta.

### 4.3. S3 — błąd sieci/500 przy starcie

```
Nie udało się rozpocząć egzaminu. Spróbuj ponownie.
[ Spróbuj ponownie ]   [ Wróć do modułu ]
```
Nic nie jest jeszcze zapisane (sesja nie istnieje) — retry jest bezpieczny i tani.

### 4.4. S4 — 409 „Egzamin tego modułu już trwa"

W praktyce insert chroniony partial unique per (student, `module_exam`, moduleId) — dla TEGO modułu ten kod oznacza wyścig dwóch kart tej samej przeglądarki, nie realny konflikt biznesowy. Copy: „Ten egzamin już trwa w innej karcie — dokończ go tam albo odśwież tę stronę." + `[Odśwież]`.

---

## 5. Ekran 3 — Runner egzaminu

### 5.1. R1/R2 — pytanie bieżące

```
┌───────────────────────────────────────────────────────┐
│  [tylko gdy resumed] Wracasz do egzaminu — kontynuujesz  │
│  od pytania, na którym skończyłeś(-aś).                  │  ← baner sky-50, jednorazowy
│                                                          │
│  Pytanie 3 z 15                    ▓▓▓░░░░░░░░░░░░░    │  ← progress bar, nie tekst-only
│                                                          │
│  {stem}                                                 │
│                                                          │
│  ( ) Opcja A                                             │
│  ( ) Opcja B                                             │
│  ( ) Opcja C                                             │
│  ( ) Opcja D                                             │
│                                                          │
│  Odpowiedzi nie oceniamy pytanie po pytaniu —            │
│  wynik zobaczysz na końcu.                               │
│                                                          │
│                                    [ Dalej ]  (disabled  │
│                                     do wyboru opcji)     │
└───────────────────────────────────────────────────────┘
```

**Reużycie:** struktura opcji 1:1 z `ItemRunner` (`single_choice` blok, l. 262–284) — `<label>` + `<input type="radio">`, ten sam wzorzec fokusu/klawiatury. **Jedna świadoma różnica kolorystyczna:** zaznaczona opcja tu ma `border-sky-400 bg-sky-50`, **nie** `border-emerald-400 bg-emerald-50` jak w `ItemRunner`. Uzasadnienie: w `ItemRunner` emerald na zaznaczeniu koegzystuje z późniejszym feedbackiem poprawności (`feedback.correct` też emerald) — tam nie ma ryzyka pomyłki, bo emerald i tak oznacza „poprawne" tylko PO sprawdzeniu. Tu feedbacku per pytanie **nie ma w ogóle** — gdyby zaznaczenie było emerald, student nauczony wzorca `ItemRunner` mógłby czytać kolor jako „to jest dobra odpowiedź", co jest fałszywym sygnałem (serwer nic nie oceniał). Sky jest neutralny — oznacza wyłącznie „wybrane", nigdzie indziej w systemie nie niesie znaczenia poprawności.

- Progress: pasek + tekst, wzorzec identyczny do `role="progressbar"` z `ModuleRow` (`aria-valuenow/min/max`, `aria-label="Pytanie X z Y"`).
- Przycisk „Dalej" (nazwa celowo inna niż „Sprawdź" z `ItemRunner` — tu nic się nie sprawdza natychmiast, `Dalej` nie sugeruje oceny) — `disabled` dopóki `draft.selected === undefined`, identyczna reguła `isAnswerReady` co w `ItemRunner`.
- Na **ostatnim** pytaniu (`position === total - 1`) etykieta zmienia się na „Zakończ egzamin" — sygnalizuje nieodwracalność momentu, zanim student kliknie.
- **A11y fokus:** po kliknięciu „Dalej" fokus przenosi się na `<h2>` nowego pytania (`ref` + `tabIndex={-1}`, dokładnie wzorzec D-a11y-1 z `ItemRunner` — ten sam problem (nowa treść wchodzi bez przeniesienia fokusu), to samo rozwiązanie, reużyte).
- Baner „wracasz do egzaminu" (R2): `role="status"`, znika po pierwszej interakcji (nie zostaje na każdym kolejnym pytaniu — to jednorazowa informacja o wejściu, nie stały nagłówek).

### 5.2. R3 — błąd zapisu odpowiedzi

```
Nie udało się zapisać odpowiedzi. Twój wybór został — spróbuj ponownie.
[ Spróbuj ponownie ]
```
`role="alert"`. Wybrana opcja **zostaje zaznaczona** (stan lokalny `draft` nie czyści się przy błędzie sieci) — dokładnie zasada z golden example: porażka operacji w trakcie sesji nie kasuje pracy studenta.

### 5.3. R4 — konflikt kolejności/sesji (409)

```
Coś się rozjechało z kolejnością pytań (np. otwarta druga karta).
Odśwież stronę — wrócisz dokładnie tam, gdzie byłeś(-aś).
[ Odśwież ]
```
Jedyna bezpieczna naprawa to `router.refresh()` / pełny reload — plan jest zamrożony po stronie serwera, więc odświeżenie i ponowne wejście na `/exam` odtworzy właściwe pytanie przez `resumed:true`.

### 5.4. R5 — domykanie

Po odpowiedzi na 15. pytanie (`done:true`, `question:null`) ekran **nie** wywołuje `complete` automatycznie w tle bez wiedzy studenta — pokazuje krótki, jawny commit:

```
To były wszystkie pytania. Nie ma powrotu do poprzednich.
[ Zakończ egzamin i zobacz wynik ]   (primary)
```

**Decyzja z kosztem:** wymaga jednego dodatkowego kliknięcia zamiast auto-fire. Koszt: mikro-tarcie (+1 klik). Zysk: moment „to już koniec, klikasz świadomie" pasuje do ramy „liniowo, bez cofania" (rozdz. 1) — auto-fire ukrywałby ten fakt za automatyzmem.

### 5.5. R6 — błąd domknięcia

```
Nie udało się zapisać wyniku. Twoje odpowiedzi są bezpieczne —
zapisywały się na bieżąco. Spróbuj ponownie.
[ Spróbuj ponownie ]
```
Prawdziwe (patrz rozdz. 2, uzasadnienie R6) — `assessment_answers` zapisuje się per pytanie w `POST /answer`, `complete` tylko liczy werdykt transakcyjnie. Retry bezpieczny.

---

## 6. Ekran 4 — Wynik (3 warianty)

Wspólny szkielet: pełnoekranowa karta zastępująca Runner (analogicznie do S8 z golden example) — **nie modal**, żeby wynik nie dało się przypadkiem zamknąć bez przeczytania.

### 6.1. W1 — Zdany

```
[CheckCircle2, emerald]  Zdałeś(-aś) egzamin modułu „{tytuł}"
Błędy: {errorCount} z {total} (próg: {maxErrors}).
Kolejny moduł jest już otwarty.
[ Wróć do ścieżki nauki ]  (primary)
```

Zero przechwałki (brand voice) — jedno zdanie faktu + liczby, bez „Świetna robota!"/superlatywów. Emerald tu jest uzasadniony (to JEST sukces, ostateczny). Link wraca do `/curriculum` (drabina), nie do samego modułu — naturalny następny krok to kolejny moduł, nie oglądanie tego, co już zaliczone.

### 6.2. W2 — Oblany, jest jeszcze podejście

```
[XCircle, muted — NIE rose/czerwony]  Nie tym razem
Zabrakło Ci {errorCount} {"pytania"/"pytań"} do progu.
Masz jeszcze jedno podejście — z innym zestawem pytań na ten sam temat.
[ Spróbuj ponownie ]  (primary)   [ Wróć do modułu ]  (ghost)
```

**Decyzja z kosztem — ikona `XCircle` w `text-muted-foreground`, nie `text-rose-600`.** `ItemRunner` używa rose dla feedbacku pojedynczego pytania (`XCircle` czerwony, l. 436) — tam błąd jest bez konsekwencji (nielimitowane próby, R13 dosłownie). Tu błąd MA konsekwencję (zużywa 1 z 2 podejść) — ale R13 („błąd nie jest końcem") ma obowiązywać właśnie tam, gdzie konsekwencja jest, nie tam, gdzie jej nie ma. Czerwień na całym ekranie wyniku sygnalizowałaby porażkę krytyczną/alarmową; tu to wciąż normalny, przewidziany krok procesu (1 z 2 podejść to nie ostatnia szansa). Rose rezerwuję wyłącznie dla W3 (patrz niżej) i dla realnych błędów technicznych (R3/R4/R6/S2/S3) — kolor niesie **wagę zdarzenia**, nie tylko jego znak.

**Otwarte pytanie do Sophii (nota Leo (c), nie rozstrzygam):** komunikat pokazuje `errorCount` („zabrakło Ci N pytań"). Leo zwrócił uwagę, że to jest „ile błędów popełniono", nie „ile brakowało do progu" — przy `maxErrors=1` i `errorCount=3` zdanie „zabrakło Ci 3 pytań" brzmi, jakby próg wymagał 0 błędów. Ta sama funkcja (`buildCorrectivesMessage`) jest już użyta w W3 (correctives) z tą samą semantyką — **spójność między W2 i W3 wymaga jednej decyzji Sophii**, nie osobnej redakcji na tym ekranie. Do czasu decyzji: W2 używa dosłownie `errorCount` bez interpretacji („błędnych odpowiedzi: {errorCount} z {total}, próg: {maxErrors}") — bezpieczniejsza, bo faktograficzna, nie next-step wobec progu.

### 6.3. W3 — Oblany, cap wyczerpany (correctives obowiązkowe)

```
[ClipboardList, sky — NIE rose]  Czas na uzupełnienie materiału
{correctivesPackage.message}
                                                    ↓ patrz Ekran 5
```

Ikona sky (nie rose) — to nie jest „porażka finalna", to przekierowanie na kolejny, jasno zdefiniowany krok (correctives). Rose byłby tonem karzącym, sprzecznym z R13 „błąd nie jest końcem" — a to dosłownie ten moment, w którym trzeba to pokazać najmocniej: student zderzył się z twardym ograniczeniem (cap 2), więc ton musi być NAJSPOKOJNIEJSZY z całego ekranu wyniku, nie odwrotnie.

**Brak przycisku „Spróbuj ponownie" na W3 — świadomie, z otwartym ryzykiem do Sophii/Ethana.** Czytając `exam/start/route.ts`: `attempt = clampAttempt(priorFailed.length + 1)`, a `clampAttempt` **ogranicza numer wariantu do [1,2], nie blokuje samego wywołania `/start`**. Nie znalazłam w P1–P4 twardej blokady „3. próba niedozwolona" — kod pozwoli otworzyć kolejną sesję z wariantem 2 (powtórzonym) w nieskończoność. **To jest luka między specem a kodem, nie mój wybór projektowy do naprawienia w UI.** Decyzja projektowa, którą podejmuję świadomie do czasu wyjaśnienia: **front nie pokazuje żadnej akcji re-startu na W3** (miękka blokada — przycisk po prostu nie istnieje), dopóki Sophia/Ethan nie potwierdzą zamierzonego zachowania po correctives (czy jest 3. podejście, czy cap 2 jest twardy na zawsze, czy odblokowuje się po ukończeniu atomów). **Blokuje merge P5 do czasu odpowiedzi** — zaznaczam to jako pytanie otwarte w rozdz. 9, nie milczę i nie zgaduję zakresu.

---

## 7. Ekran 5 — Render paczki correctives (część W3)

### 7.1. Layout

```
{message}                                                    ← z API, gotowe zdanie

── Koncepty do odświeżenia ──────────────────────────────────
┌──────────────────────────────────────────────────────────┐
│ f-string i formatowanie                                    │  conceptName (lub fallback, 7.3)
│  • Teoria — f-string i interpolacja        [Otwórz →]      │  atom, kind="theory"
│  • Ćwiczenie — formatowanie liczb          [Otwórz →]      │  atom, kind="exercise"
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ Instrukcja warunkowa if/else                                │
│  Materiału powtórkowego dla tego tematu jeszcze nie mamy    │  ⚠ KRYTYCZNE — degradacja
│  w drabinie — omów go z wykładowcą albo na konsultacjach.   │
└──────────────────────────────────────────────────────────┘

[ Wróć do modułu ]  (ghost — jedyna akcja na tym ekranie)
```

### 7.2. Rozwiązanie „koncept BEZ atomów" (nota krytyczna Leo/plan R2)

Karta konceptu z pustą `atoms: []` renderuje **wyłącznie tekst** — analogicznie do istniejącego wzorca „pozycja zablokowana"/„moduł zablokowany" w `curriculum/[moduleId]/page.tsx` i `[itemId]/page.tsx`, gdzie blokada też nie pokazuje fałszywego przycisku, tylko uczciwe zdanie. **Świadomie zero przycisku/linku w tym miejscu** — disabled button albo martwy link byłyby gorsze niż brak elementu interaktywnego: sugerowałyby akcję, która nic nie zrobi. To jest dokładnie przypadek, przed którym ostrzega brief (⚠ krytyczne) i dokładnie ten sam wzorzec „pusty stan = uczciwe zdanie, nie pusty ekran ani martwy link" już istnieje gdzie indziej w tym repo — reużywam go, nie wymyślam nowego.

**Drugi przypadek degradacji, którego brief nie nazwał, a kod ujawnia:** `CorrectivesAtom.moduleSlug` jest `string | null` — komentarz w `correctives.ts` mówi wprost „null = osierocony" (atom istnieje, ale bez modułu-rodzica). Link do atomu wymaga adresu modułu (rozdz. 7.4) — atom z `moduleSlug: null` **nie da się** zalinkować, nawet mając `slug`. Traktuję to jak trzeci stan wiersza atomu:

| Stan atomu | Render |
|---|---|
| `atoms.length === 0` (koncept bez atomu) | sam tekst degradacji (wyżej) |
| atom z `moduleSlug` obecnym | link klikalny (7.4) |
| atom z `moduleSlug === null` (osierocony) | tekst: „{title} — materiał w przygotowaniu, wróć tu za jakiś czas" (bez linku, ten sam wzorzec co koncept bez atomu) |

Bez tego rozróżnienia front próbowałby zbudować `href` z `null` i albo rzucił runtime error, albo wyprodukował martwy link `/curriculum/null/slug` — dokładnie ryzyko, przed którym ostrzega nota Leo, tylko o jeden poziom głębiej niż sam brief.

### 7.3. Fallback nazwy konceptu

`conceptName: string | null` — gdy `null` (koncept bez wpisu w `question_concepts.name` albo LEFT JOIN nic nie zwrócił nazwy), render nagłówka karty spada na humanizowany `concept` (slug): zamień `-`/`_` na spacje, wielka litera na początku. Nigdy nie renderuj gołego slug-a typu `fstring-formatting` wprost do studenta — to żargon wewnętrzny (CLAUDE.md §3, reguła „żargon zawsze tłumaczony" — dotyczy też stringów w UI, nie tylko czatu z Darkiem).

### 7.4. ⚠ BLOKER dla Jacka — niezgodność routingu slug vs UUID

Atomy correctives przychodzą jako `{slug, title, kind, moduleSlug}` — **wyłącznie slugi**. Istniejące trasy modułu/pozycji (`/curriculum/[moduleId]/[itemId]`) wymagają **UUID** — strona odrzuca nie-UUID przez `isUuid()` guard (`notFound()`). **Link zbudowany naiwnie z tych danych (`/curriculum/${atom.moduleSlug}/${atom.slug}`) zawsze wyląduje na 404.** To nie jest projektowy wybór do rozstrzygnięcia przeze mnie — to niezgodność kontraktu, którą Jack musi rozwiązać przed podpięciem linków. Rekomendacja (do potwierdzenia z Ethanem, nie decyduję sama — czerwona linia „nowa trasa" to zwykła, odwracalna zmiana kodu, mieści się w mandacie Ethana P2, ale zgłaszam jawnie, bo dotyka kontraktu P3/P4 zamrożonego wcześniej):

- **Rekomendowane:** nowa, cienka trasa resolver `/curriculum/atom/[moduleSlug]/[itemSlug]` — server component, jeden `SELECT` po slugach → `redirect()` na istniejący `/curriculum/{moduleId}/{itemId}`. Koszt: jeden nowy plik trasy + jeden odczyt DB. Zysk: **zero zmian** w już przetestowanym kontrakcie UUID-owym P1–P4 i w `isUuid` guardach.
- **Odrzucone:** zmiana odpowiedzi API correctives tak, by zwracała UUID zamiast slugów — dotyka zamrożonego kontraktu P4 (`CorrectivesAtom` interfejs, testy `correctives.test.ts`/`correctives-builder.integration.test.ts`), większy promień zmiany dla tego samego efektu.

Do czasu decyzji Jack/Ethan: front renderuje atomy z `moduleSlug` obecnym jako link do trasy resolver (wyżej), **nie** do trasy UUID bezpośrednio.

### 7.5. A11y (Ekran 5)

- Lista konceptów: `<ol>` (kolejność ma znaczenie — `failedConcepts` w kolejności wejścia, stabilna), nie `<ul>`.
- Karta bez atomów/osieroconym atomem: brak elementu `role="link"`/`<a>` — czytnik ekranu nie zapowiada fałszywej interaktywności.
- Nagłówek sekcji „Koncepty do odświeżenia" to `<h2>`, każdy koncept `<h3>` — hierarchia nagłówków pozwala nawigować czytnikiem po liście bez czytania wszystkiego liniowo.

---

## 8. Design system — bez nowych tokenów

Wszystko poniżej **już istnieje** w kodzie czytanym na starcie (`ladder-view.tsx`, `module-items.tsx`, `item-runner.tsx`, `labels.ts`). Zero nowych kolorów/rozmiarów.

| Zastosowanie | Token/klasa | Gdzie już użyte w repo |
|---|---|---|
| Karta informacyjna neutralna | `rounded-xl border border-border bg-muted p-5` | blok blokady modułu/pozycji |
| Karta akcji/CTA | `rounded-xl border border-border bg-card p-5` | `ItemRunner` sekcja pytania |
| Sukces ostateczny | `text-emerald-600/700/900`, `bg-emerald-50` | `StatusIcon`, feedback poprawny `ItemRunner` |
| Neutralny/informacyjny „następny krok" | `text-sky-600`, `bg-sky-50`, `border-sky-400` | `StatusIcon` (moduł klikalny) |
| Błąd techniczny | `text-rose-700/900`, `bg-rose-50`, `border-rose-200` | feedback błędny `ItemRunner`, `hintError` |
| W trakcie/uwaga miękka | `text-amber-800/900`, `bg-amber-50` | lab-niezaliczalny, badge `in_progress` |
| Pasek postępu | `role="progressbar"` + `aria-valuenow/min/max` + `h-1.5 rounded-full bg-muted` / wypełnienie | `ModuleRow` |
| Przycisk primary/ghost/outline | `Button` (`variant="default"/"ghost"/"outline"`, `size="default"/"lg"`) | wszędzie |
| Status żywy nieinwazyjny | `<output>` / `role="status"` | feedback `ItemRunner` |
| Alert przerywający | `role="alert"` | `hintError` `ItemRunner` |

---

## 9. Inwentarz komponentów — reużyte vs nowe

| Komponent | Status | Uzasadnienie |
|---|---|---|
| `ModuleRow` (rozszerzony) | **istniejący, zmodyfikowany** | dodana 1 warunkowa linia (rozdz. 3.1) |
| Karta blokady/CTA na stronie modułu | **istniejący wzorzec, powielony** | ten sam markup co blok `unlocked`/`locked` w `[moduleId]/page.tsx` |
| `Button` | istniejący | bez zmian |
| Radio-opcja pytania | **istniejący wzorzec, powielony z inną barwą zaznaczenia** | z `ItemRunner`, patrz 5.1 uzasadnienie koloru |
| `role="progressbar"` postęp egzaminu | **istniejący wzorzec, powielony** | z `ModuleRow` |
| **`ExamRunner`** | **NOWY (client component)** | maszyna stanów S1→R1–R6→W1–W3; kontrakt propsów niżej |
| **`CorrectivesPanel`** | **NOWY** | render `CorrectivesPackage`; kontrakt propsów niżej |
| Trasa resolver `/curriculum/atom/[moduleSlug]/[itemSlug]` | **NOWA (bloker, rozdz. 7.4)** | wymagana, żeby linki correctives w ogóle działały |

### 9.1. `ExamRunner` — kontrakt

Props (server → client, z `page.tsx`):

| Prop | Typ | Opis |
|---|---|---|
| `moduleId` | `string` (uuid) | do wywołań `/api/exam/start` |
| `moduleTitle` | `string` | nagłówek S1/W1 |
| `moduleSlugForBack` | `string` | link „Wróć do modułu" |

Stan wewnętrzny (jak `ItemRunner`): `phase: "confirm" | "running" | "closing" | "result"`, `session: {sessionId, total, question} | null`, `result: ExamResultJson | null`, `submitting/error` per operację (osobne flagi dla start/answer/complete — **nie jedna wspólna** `error`, żeby R3 nie nadpisywał S3 itp.).

### 9.2. `CorrectivesPanel` — kontrakt

| Prop | Typ | Opis |
|---|---|---|
| `pkg` | `CorrectivesPackage` (`{message, concepts}`) | z `result.correctivesPackage` |
| `resolveAtomHref` | `(atom: CorrectivesAtom) => string \| null` | zwraca `null` gdy `moduleSlug===null` (osierocony) → render bez linku |

Czysta funkcja `resolveAtomHref` wydzielona świadomie — testowalna osobno bez renderowania (jeden przypadek: `moduleSlug` obecny → `/curriculum/atom/{moduleSlug}/{slug}`; `null` → `null`).

---

## 10. Otwarte pytania do Sophii (nie rozstrzygam sama — eskalacja per rola)

> **ROZSTRZYGNIĘTE 2026-07-24 przez Sophię** — wszystkie 5 pytań (10.1–10.5) + luka „brak twardej blokady 3. próby" (rozdz. 6.3) w `docs/product/decyzje-1e3-p5-egzamin-v0.1.md`. Ten dokument (spec Mili) traktuj razem z tamtym; przy konflikcie wygrywa dokument decyzji. Skrót: test-out = wspólna pula cap-2 (Blok B copy bezpieczna, zdjąć „nie liczy się"); N = `errorCount − maxErrors` + „do zaliczenia"; M = wszystkie różne oblane koncepty; po correctives → świeży cykl (nowe 2 podejścia), `/start` twardo odrzuca 3. próbę w stanie „correctives niewykonane"; nowy 4. pod-stan Bloku A „correctives w toku". P5 ODBLOKOWANY (nie wymaga P6).

1. **Test-out i cap 2 (rozdz. 3.2).** Czy nieudany test-out (0 pozycji zrobionych) konsumuje ten sam licznik `priorFailed` co zwykły retry? Kod dziś nie rozróżnia. Wpływa na copy Bloku B.
2. **Nota Leo (c) — semantyka „N" w mikrocopy.** `errorCount` to liczba błędów, nie „ile brakowało do progu" — do potwierdzenia, czy komunikat W2/W3 ma to rozróżniać jawnie (dziś: nie rozróżnia, bezpieczna wersja faktograficzna, rozdz. 6.2).
3. **Nota Leo (b) — „M konceptów" liczy też atom-less.** Mikrocopy „M konceptów do odświeżenia" wlicza koncepty bez żadnego atomu (7.2) — student przeczyta „3 koncepty", z czego jeden bez treści do kliknięcia. Czy to zamierzone, czy licznik powinien pokazywać tylko koncepty Z materiałem?
4. **Co po correctives (rozdz. 6.3).** Brak w P1–P5 jawnej ścieżki „3. podejście po ukończeniu correctives" — **blokuje**, czy W3 może zostać bez żadnej akcji retry, czy to przeoczenie planu wymagające P6.
5. **Nota Leo (d).** Czy curriculum ma gwarantować ≥1 atom (theory/exercise) per koncept egzaminowany — jeśli tak, przypadek 7.2 (koncept bez atomu) staje się teoretyczny, ale front i tak musi go obsłużyć defensywnie (nie ufam treści bez kontrakt-testu wymuszającego to na 100%).

---

## 11. Podsumowanie decyzji z kosztem

| Decyzja | Koszt / co odrzucone |
|---|---|
| E3 bez nowego `ModuleStatus` | Zero — wyliczone z istniejących pól. Odrzucone: nowy enum `awaiting_exam` (3 miejsca do zmiany za nic). |
| `/start` wywoływany dopiero po kliknięciu, nie na wejściu | Ekran S1 nie wie z góry, czy będzie `resumed` — akceptowalne, bo treść S1 identyczna w obu przypadkach. |
| Zaznaczona opcja w Runnerze = sky, nie emerald | Runner wygląda nieco inaczej niż `ItemRunner` (rozjazd wizualny) — świadomie, żeby nie kłamać sygnałem poprawności. |
| Jawny klik „Zakończ egzamin" zamiast auto-complete | +1 klik na końcu 15 pytań — kupuje jednoznaczny moment nieodwracalności. |
| W2/W3 ikona rose zarezerwowana tylko dla W3/błędów technicznych | W2 (zwykły fail z retry) wygląda „łagodniej" niż mogłoby — celowe, bo to nie ostatnia szansa. |
| Correctives bez linku dla atomu bez modułu/konceptu bez atomu | Student dostaje tekst zamiast klikalnego materiału w ≥1 przypadku — koszt akceptowalny wobec alternatywy (martwy link/crash). |
| Brak przycisku retry na W3 do czasu wyjaśnienia cap 2 | Ślepy zaułek dla studenta po 2. oblaniu, dopóki Sophia/Ethan nie potwierdzą ścieżki dalej — świadomie bezpieczniejsze niż zgadywanie zakresu. |
| Link atomu przez trasę-resolver, nie bezpośrednio | +1 nowy plik trasy — kupuje zero zmian w zamrożonym kontrakcie P1–P4. |

---

## Self-critique (principal designer z firmy dyscypliny produktowej — Linear/Stripe)

1. **Czy ekran prowadzi do działania?** Tak na S1/R1-R2/W1 — jedna dominująca akcja per ekran. Słabiej na W3: świadomie zostawiam ekran BEZ akcji retry (rozdz. 6.3/10) — to poprawne wobec niepewności backendu, ale zostawia studenta bez jasnego „co dalej" poza linkami atomów. **Poprawka:** dodałam explicit „Wróć do modułu" jako jedyną akcję W3/Ekranu 5 (rozdz. 7.1), żeby ekran nie kończył się bez żadnego przycisku — ale to nadal słabszy„CTA" niż reszta specu i zależy od odpowiedzi Sophii z rozdz. 10.4.
2. **Czy komponenty spójne z design systemem?** Tak — cały rozdz. 8/9 to reużycie, jedna świadoma zmiana koloru (sky zamiast emerald na zaznaczeniu) z pełnym uzasadnieniem, nie przypadkowa niespójność.
3. **Czy spec da się zaimplementować bez zgadywania?** Prawie — rozdz. 7.4 (routing slug↔UUID) jest **realną luką kontraktu**, którą nazywam wprost zamiast cichego założenia „jakoś zadziała". To dokładnie różnica, o którą chodzi w self-critique: znalazłam to czytaniem kodu (`isUuid` guard + kształt `CorrectivesAtom`), nie zgadywaniem.
4. **Czy stany błędu/ładowania/pustki zaprojektowane?** 16 stanów, każdy z osobną sekcją i uzasadnieniem podziału (rozdz. 2) — żaden nie jest „ErrorState ogólny". Placeholder ładowania między `/answer` a kolejnym pytaniem (klik „Dalej" → oczekiwanie) nie ma osobnej sekcji — **poprawka:** przycisk „Dalej"/„Zakończ egzamin" w trakcie żądania pokazuje `disabled` + tekst „Zapisuję…" / „Kończę…" (wzorzec `submitting` z `ItemRunner`, l. 453-455) — dopisuję to jawnie tutaj, bo w pierwszej wersji było tylko dorozumiane przez analogię do reużytego komponentu.
5. **Czy zero ozdobnika bez funkcji?** Tak — jedyne nowe ikony (`ClipboardCheck`, `FastForward`, `ClipboardList`) niosą stan, nie dekorację, i są dobrane kolorem świadomie (rozdz. 3, 6). Brak animacji, brak ilustracji.

**Wobec golden example:** rozumowanie trzyma tę samą dyscyplinę — błąd rozbity z uzasadnieniem różnicy konsekwencji (rozdz. 2), framing wpleciony w architekturę kolorów i momentu wywołania API (rozdz. 1, 4, 5.1), każda decyzja z kosztem (rozdz. 11), kontrakty komponentów uzasadnione (rozdz. 9). Różnica od wzorca: ten dokument znajduje i nazywa **dwie realne luki backendu** (routing slug/UUID rozdz. 7.4, brak twardej blokady 3. próby rozdz. 6.3) zamiast projektować tak, jakby kontrakt był kompletny — to bezpośrednia konsekwencja czytania rzeczywistego kodu P1–P4, nie tylko brief-u.
