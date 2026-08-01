# Taksonomia zdarzeń `audit_log` — reguła dopuszczania i rozstrzygnięcia

**Wersja:** v0.1 · 2026-08-01 · **Owner:** Ryan (CRCO nordsignal) → Wendy (Legal) od Fazy 3
**Po co ten dokument:** `audit_log` jest **append-only z wyzwalacza** — wiersza nie usunie nawet właściciel bazy. Każde nowe zdarzenie to więc decyzja **nieodwracalna co do kształtu danych**, a nie detal implementacyjny. Dotąd taksonomia `action` żyła wyłącznie w kodzie i w mojej głowie; ten plik ją wyjmuje na zewnątrz, żeby kolejne pytanie „czy mogę dołożyć zdarzenie X" miało odpowiedź w regule, a nie w mojej dostępności.
**Powiązania:** `docs/data/ropa.md` wpis #6 (rejestr czynności dla `audit_log`) · `../../../docs/audyty/2026-07-26-rls-bypassrls-prod.md` v0.3 (środki bezpieczeństwa) · ADR-002/004 (granty), migracje `0003`, `0008`, `0010`.

---

## Żargon (tłumaczenie)

- **`audit_log`** — tabela w bazie produktu, w której zapisujemy zdarzenia istotne dla bezpieczeństwa i rozliczalności (kto, co, na czym, kiedy). **Nie mylić** z audit logiem firmy nordsignal (`logs/audit/` w repo operating system) — to dwie różne rzeczy o podobnej nazwie.
- **append-only** (tylko dopisywanie) — do tabeli wolno wyłącznie dodawać. Wyzwalacz z migracji `0008` blokuje zmianę i usunięcie wiersza **nawet właścicielowi bazy**; migracja `0010` domyka to samo dla `TRUNCATE` (opróżnienia tabeli).
- **wyzwalacz** (ang. *trigger*) — reguła bazy uruchamiana automatycznie przed operacją; tu: przerywa ją błędem.
- **kaskada** (ang. *cascade*) — reguła „skasowanie rekordu-rodzica kasuje dzieci". Tu: skasowanie konta studenta kasuje jego sesje diagnozy.
- **sierota** — wiersz, którego wskazanie na inny rekord przestało się rozwiązywać, bo tamten zniknął. Wiersz zostaje, ale nie prowadzi już do nikogo.
- **dziennik aplikacji** — strumień tekstu wypisywany przez działającą aplikację (u nas: logi uruchomieniowe Vercela). Ma własną retencję i **nie jest** bazą danych.
- **klucz obcy** (ang. *foreign key*) — więź między tabelami, którą baza egzekwuje; bez niej kolumna z identyfikatorem to zwykły napis.
- **motyw 26 RODO** — preambuła rozporządzenia: dane, których nie da się już przypisać do osoby, **przestają być danymi osobowymi**.
- **pseudonimizacja** — zastąpienie danych identyfikujących odnośnikiem, po którym da się wrócić do osoby tylko przy pomocy dodatkowej informacji.

---

## 1. Rozstrzygnięcie — `curriculum.placement.skipped`: **DOPUSZCZAM**, warunkowo

**Zgoda dotyczy dokładnie tego kształtu:**

| Pole | Wartość | Dlaczego tak |
|---|---|---|
| `actorType` | `"student"` | niesie **klasę** podmiotu, nie tożsamość |
| `actorId` | **NIEPODANY** | wzorzec A7 — jedyne wiązanie z osobą idzie przez `targetId` |
| `action` | `curriculum.placement.skipped` | prefiks `curriculum.` trzyma to osobno od `placement.consent.*` (placement **zawodowy**, inna klasa danych i inna podstawa prawna) |
| `targetType` | `"assessment_session"` | |
| `targetId` | identyfikator sesji diagnozy | kaskaduje przy usunięciu konta |
| `metadata` | **wyłącznie** `{ reason, goalSource }` | dwa kody rozłączne, zero treści |

**To nie jest preferencja — to trzy przesłanki, z których każda daje się sprawdzić na kodzie.**

### 1.1 Art. 17 (prawo do usunięcia) — nowe zobowiązanie **nie powstaje**

Proponowany wiersz nie zawiera identyfikatora osoby. Jedynym wiązaniem jest `targetId` → `assessment_sessions.id`, a ta tabela ma `student_id … ON DELETE CASCADE` (zweryfikowane: `drizzle/0030_bizarre_black_widow.sql:66` oraz `src/lib/db/schema.ts:1297-1299`). Po skasowaniu konta sesja znika, a zdarzenie zostaje **sierotą** — nierozwiązywalnym do człowieka żadną informacją pozostającą w systemie.

To znaczy, że po usunięciu konta **nie ma czego usuwać**: wiersz przestaje być danymi osobowymi w rozumieniu motywu 26. Append-only nie wchodzi w konflikt z art. 17, bo art. 17 przestaje mieć przedmiot. Dokładnie ta sama konstrukcja, którą zaprojektowałem dla A7 — i to jest argument **za** spójnością, nie przeciw.

### 1.2 Art. 5 ust. 1 lit. c (minimalizacja) — spełniona, i to **z zapasem wobec dzisiejszego stanu**

`reason` (`missing_career_goal` / `unmapped_career_goal`) i `goalSource` to kody rozłączne. Żadnej treści wolnej, żadnego napisu celu kariery, żadnej informacji o wyniku studenta. W odróżnieniu od `curriculum.placement.computed`, który niesie liczby o wyniku, ten wiersz mówi wyłącznie: **„nie policzyliśmy, bo nie znaliśmy celu"**. To ślad **defektu systemu**, nie ślad zachowania osoby.

### 1.3 Art. 5 ust. 2 i art. 32 ust. 1 lit. d — **to jest właściwa podstawa dopuszczenia**

Rozliczalność to zdolność **wykazania** zgodności, a lit. d wymaga regularnego testowania skuteczności środków. Ślad defektu, który znika wraz z retencją dziennika aplikacji, tej zdolności nie daje: po jej upływie „nie znamy celu" (defekt) i „student ma cel spoza pilotażu" (zachowanie poprawne) **znów zlewają się w ciszę**. Dziennik aplikacji nie usuwa tego problemu — przesuwa go w czasie i czyni cichszym.

Rozpoznaję tu wzorzec, który tydzień temu sam napiętnowałem w audycie RLS: **kontrola dająca ten sam odczyt w dwóch różnych światach nie niesie o nich informacji.** Cisza po stronie miernika oznacza dziś jednocześnie defekt i poprawne działanie. Zdarzenie z kodem powodu jest najtańszym sposobem, żeby przestała.

### 1.4 Zarzut „kierunki przeciwne" — **obalam, bo mierzy niewłaściwą wielkość**

Argument brzmi: A7 wyjmuje dane z `audit_log`, więc dokładanie tam wierszy idzie pod prąd. **A7 nie zmniejsza liczby wierszy — usuwa identyfikator osoby.** Kierunek tej decyzji mierzy się **identyfikowalnością**, nie objętością. Wiersz bez identyfikatora, bez celu i bez wyniku jest z A7 **zgodny**, a nie wbrew niemu: stosuje dokładnie ten wzorzec, który A7 ustanowiło.

Uzasadnienie Maxa było ostrożne we właściwą stronę i **słusznie nie przesądziło taksonomii samo** — to była poprawna eskalacja. Pomyłka jest w mierze, nie w postawie.

### 1.5 Zarzut „nieograniczony wzrost w gałęzi błędu" — **ograniczony, i policzalny**

Zdarzenie powstaje co najwyżej raz na wywołanie trasy domknięcia diagnozy, więc `computed` + `skipped` ≤ liczba tych wywołań. To **ten sam rząd wielkości**, który już zaakceptowaliśmy dla `computed` — nie nowa klasa wzrostu. Zdarzenia inicjuje człowiek kończący diagnozę, nie pętla.

A przy masowym powrocie defektu chcemy dokładnie tego, co brzmi jak zarzut: **masowy defekt ma zostawić masowy ślad.** Ślad, który cichnie proporcjonalnie do skali awarii, jest wadą, nie zaletą.

---

## 2. Rozstrzygnięcie odwrotne od oczekiwanego: **dzisiejszy nośnik jest gorszy, nie lepszy**

To znalazłem sprawdzając kod i uważam za ważniejsze niż samo pytanie.

`src/lib/curriculum/placement-service.ts:535–540` wypisuje do dziennika aplikacji **surowy `studentId`**:

```
console.warn("[curriculum.placement.skipped]", { reason, goalSource, studentId, sessionId })
```

Czyli **w tej samej zmianie, w której A7 wyjmuje identyfikator studenta z `audit_log`** — magazynu chronionego izolacją wierszy, z ograniczonymi grantami dla ról aplikacyjnych i pod trwałym śladem — **wpisujemy ten sam identyfikator do strumienia logów uruchomieniowych.** Nagłówek `src/lib/log.ts` opisuje ten strumień własnymi słowami: *„Trafiają na Vercel runtime logs, dostępne dla każdego z project tokenem. Surowy log = wyciek PII / GDPR issue."*

**Ocena nośników wypada więc odwrotnie, niż zakładało uzasadnienie A1:** proponowane zdarzenie audytowe niesie **mniej** danych o osobie niż linia dziennika, która ma je zastąpić. Zdarzenie nie niesie żadnego identyfikatora; linia dziennika niesie identyfikator wprost. To jest przesłanka rozstrzygająca, niezależna od wszystkich pozostałych.

**Warunek W1 poniżej obowiązuje niezależnie od tego, czy zdarzenie audytowe powstanie.**

---

## 3. Warunki zgody

| # | Warunek | Status |
|---|---|---|
| **W1** | **`studentId` wypada z `console.warn`.** Zostaje `sessionId` — i tak jest kluczem wiązania, a przez kaskadę zrywa się przy usunięciu konta. **Obowiązuje niezależnie od W2–W4.** | do wykonania |
| **W2** | **Bez `actorId`**, wzorem A7. `studentId` **nie może być parametrem** funkcji piszącej zdarzenie — ta sama obrona konstrukcyjna, którą Max zastosował w `recordPlacementMetricEvent` (ponowne wpisanie wymaga zmiany sygnatury, nie jednej linijki do przeoczenia w przeglądzie) | do wykonania |
| **W3** | **`metadata` wyłącznie `{ reason, goalSource }`.** Zero napisu celu kariery, zero `unlockedCount`, zero czegokolwiek o wyniku. **Test pilnujący**, że napis celu nie trafia do metadanych — analogicznie do istniejącego testu dziennika | do wykonania |
| **W4** | **RoPA obejmuje `audit_log`** — nowa kategoria wierszy nie wchodzi do magazynu nieopisanego w rejestrze czynności (art. 30 ust. 1) | ✅ **wykonane** — `docs/data/ropa.md` v0.4, wpis #6 |

**Granica zgody.** Jeżeli do `metadata` zdarzenia `skipped` miałby kiedykolwiek trafić napis celu kariery, `actorId`, albo cokolwiek niosącego wynik studenta — **zgoda wygasa i sprawa wraca do mnie**. Zgoda dotyczy kształtu z sekcji 1, nie nazwy zdarzenia.

**Czyje wywołanie.** Odwracalne co do kodu, wewnętrzne, bez wydatku, poza plikami rządzenia → CLAUDE.md §5, domena Ethana, bramka Leo. **Nie czerwona linia, sign-off Darka niepotrzebny.** Migracji nie wymaga: kolumna `action` to `text` bez ograniczenia wartości, a `actor_type` ma enum wyłącznie po stronie TypeScriptu — rozszerzenie taksonomii jest zmianą kodu, nie schemy.

---

## 4. Reguła dopuszczania nowych zdarzeń — test czterech pytań

Żeby następne pytanie tej klasy nie wymagało mojej dostępności. Zdarzenie wchodzi do `audit_log` tylko wtedy, gdy odpowiedź brzmi **tak** na wszystkie cztery:

1. **Czy wiersz jest wolny od identyfikatora osoby?** Jeśli niesie `actorId` albo identyfikator w `metadata` — **stop, pytaj CRCO**. Append-only znaczy, że tego już nie cofniesz.
2. **Czy wiązanie z osobą zrywa się kaskadą przy usunięciu konta?** Musi istnieć konkretna więź z `ON DELETE CASCADE` — nie „to tylko identyfikator techniczny".
3. **Czy `metadata` niesie wyłącznie kody i liczby?** Treść wolna (napisy pochodzące od studenta albo od modelu) — **nigdy**.
4. **Czy liczba wierszy jest ograniczona zdarzeniem inicjowanym przez człowieka?** Zdarzenie w pętli, w zadaniu cyklicznym albo per żądanie HTTP — **stop**.

**Piąte pytanie, rozstrzygające o nośniku:** czy to **ślad bezpieczeństwa/rozliczalności** (→ `audit_log`), czy **telemetria operacyjna** (→ dziennik aplikacji albo `ai_usage_ledger`)? Kryterium: czy za rok, w due diligence albo przy pytaniu organu, będzie trzeba **wykazać**, że to zdarzenie zaszło lub nie zaszło. Jeśli tak — trwałość jest cechą pożądaną, a dziennik aplikacji jest nośnikiem złym.

---

## 5. Taksonomia — stan na 2026-08-01

Konwencja: `<domena>.<obiekt>.<czasownik>`, małe litery, kropka jako separator. Prefiks domeny jest **jedyną rzeczą trzymającą osobno światy o tej samej nazwie potocznej** (`curriculum.placement.*` = drabina nauki; `placement.consent.*` = staż/praca, dane zawodowe, zgoda).

| `action` | `actorType` | `actorId` | Klasa |
|---|---|---|---|
| `curriculum.placement.computed` | student | **brak** (A7) | ślad decyzji, bez tożsamości |
| `curriculum.placement.skipped` | student | **brak** | ślad defektu, bez tożsamości — **niniejsze rozstrzygnięcie, jeszcze niewdrożone** |
| `passport.share.enable` / `.disable` | student | **jest** (`userId`) | dług A-1 ↓ |
| `submission.verified`, `submission.viva.*`, `submission.review.*` | system | **jest** (`studentMeta.id`) | dług A-1 ↓ |
| `faculty.login.success` / `.fail`, `faculty.dashboard.read` | faculty | jest | poza zakresem — nie dane studenta |
| `operator.login.success` / `.fail` | operator | jest | jw. |
| `placement.consent.*` | student | jest | wpis RoPA #4 (zgoda, delete-on-revoke) — **osobna czynność, nie mylić** |

---

## 6. Dług A-1 — zdarzenia z `actorId` są strukturalnie nieusuwalne (**nowe, zarejestrowane**)

Znalezione przy tym rozstrzygnięciu, szersze niż zadane pytanie. **Nie blokuje tej decyzji — wzmacnia ją.**

**Fakt, zweryfikowany na kodzie:** `actor_id` w `audit_log` to zwykły `text` **bez klucza obcego i bez kaskady** (`drizzle/0003_bumpy_microbe.sql:4` — `"actor_id" text,`; brak `REFERENCES` w jakiejkolwiek migracji). Jednocześnie wyzwalacz `audit_log_no_update_delete` (migracja `0008`) blokuje `DELETE` **nawet właścicielowi**, a `0010` domyka `TRUNCATE`.

**Skutek:** dla zdarzeń, które zapisują `actorId` studenta — `passport.share.enable`/`.disable` (`src/app/api/passport/share/route.ts:83, 129`), `submission.verified`, `submission.viva.inconclusive` (`src/app/api/projects/[id]/submit/route.ts:249, 298`) — **usunięcie danych na żądanie z art. 17 jest dziś strukturalnie niewykonalne**. Skasowanie konta nie usuwa tych wierszy i nie zrywa wiązania: identyfikator zostaje w kolumnie jako napis, wskazując na osobę, której konta już nie ma.

**A7 naprawiło to dla jednego zdarzenia.** Wzorzec „bez `actorId`, wiązanie przez kaskadujący `targetId`" ma być **regułą dla nowych zdarzeń** (test z sekcji 4, pytania 1–2), a dla istniejących — osobnym zadaniem.

**Klasa: WAŻNE dla kontroli, INFO dla danych** (zero prawdziwych studentów; podmiot danych i administrator to dziś ta sama osoba). **Próg: przed pierwszą prawdziwą rejestracją**, razem z klauzulą informacyjną art. 13 — po tej dacie żądanie usunięcia stanie się wykonalne prawnie i niewykonalne technicznie jednocześnie, a to jest najgorszy możliwy układ.

**Świadomie NIE rekomenduję zdjęcia wyzwalacza append-only.** Nieusuwalność audytu jest środkiem bezpieczeństwa, o który sam wnosiłem. Właściwe kierunki, do rozstrzygnięcia osobno: (a) przejście istniejących zdarzeń na wzorzec bez `actorId`, wzorem A7; (b) jeśli któreś naprawdę potrzebuje tożsamości — wąska, jawna ścieżka anonimizacji `UPDATE actor_id = NULL` przy usunięciu konta, jako **jedyny** wyjątek od wyzwalacza, z własnym śladem. Wariant (a) jest tańszy i preferowany. **To nie jest przedmiot dzisiejszego rozstrzygnięcia** — rejestruję, nie rozstrzygam.

---

## 7. Self-critique

Rola: head of GRC firmy SaaS świeżo po audycie SOC 2 Type II. Pięć słabości i co poprawiłem:

1. **Odruch CRCO brzmi „nie" — mniej danych zawsze wygląda bezpieczniej, a odmowa nigdy nie jest zarzucana audytorowi.** Odmówiłbym „z ostrożności", a koszt poniósłby ktoś inny: miernik Sophii nie odróżniałby defektu od poprawnego zachowania, i to cicho. → Rozstrzygnąłem **na przesłankach sprawdzonych na kodzie** (kaskada w `0030`, brak klucza obcego w `0003`, wyzwalacz w `0008`), nie na odczuciu ryzyka. Ostrożność, która przerzuca koszt na cudzą domenę i nie nazywa go, nie jest ostrożnością.
2. **Zgoda mogła zostać wydana na nazwę zdarzenia zamiast na jego kształt** — a wtedy za trzy miesiące ktoś dołożyłby do `metadata` napis celu kariery „bo Ryan zatwierdził `skipped`". → Sekcja 1 wylicza kształt **pole po polu**, a sekcja 3 ma jawną **granicę wygaśnięcia zgody**. Zgoda dotyczy kształtu, nie nazwy.
3. **Mogłem odpowiedzieć na zadane pytanie i przeoczyć, że dzisiejszy nośnik loguje `studentId`.** To najgorszy możliwy wynik: zatwierdziłbym wariant lepszy, zostawiając w kodzie wariant gorszy, i obie wersje działałyby obok siebie. → Sekcja 2 — sprawdziłem realny kod nośnika, nie jego opis w uzasadnieniu, i wyszło, że **ocena nośników jest odwrotna niż zakładano**. Stąd W1 jako warunek **niezależny** od reszty rozstrzygnięcia.
4. **Rozstrzygnięcie jednorazowe nie skaluje się — za miesiąc przyjdzie kolejne zdarzenie i znów będę wąskim gardłem.** Pierwszy szkic był wyłącznie o `skipped`. → Sekcja 4: **test czterech pytań plus pytanie o nośnik**, wyprowadzony z tego samego rozumowania. Inżynier odpowiada sobie sam; do mnie trafia tylko to, co ten test odrzuca. Wąskie gardło zamienione w regułę.
5. **Dług A-1 mógł utonąć jako dygresja.** Wyszedł ubocznie, przy sprawdzaniu kaskady — a jest cięższy niż zadane pytanie: dla części zdarzeń art. 17 jest dziś strukturalnie niewykonalny. → Osobna sekcja 6 z klasą ryzyka, progiem czasowym (przed pierwszą rejestracją), dwoma wariantami naprawy i **jawnym „nie rozstrzygam tego dziś"**, plus wiersz w RoPA #6. Znalezisko bez własnego miejsca i progu nie istnieje operacyjnie.

**Szósta, poza limitem.** Podniosłem argument z art. 32 ust. 1 lit. d w sprawie, w której akurat wypada on **za** wnioskiem, o który proszono — a tydzień temu podniosłem go w sprawie, w której wypadał **przeciw** wygodzie. Sprawdzam więc, czy nie dopasowuję przepisu do wyniku. **Test: czy ten sam argument obaliłby propozycję, gdyby kształt był inny?** Tak — gdyby zdarzenie niosło `actorId` albo napis celu, lit. d nadal przemawiałaby za śladem, ale art. 17 i minimalizacja przeważyłyby i odmówiłbym. Argument nie jest więc dobrany pod wynik; przesądza kształt danych, nie potrzeba pomiaru.
