# Taksonomia zdarzeń `audit_log` — reguła dopuszczania i rozstrzygnięcia

**Wersja:** v0.2 · 2026-08-10 · **Owner:** Ryan (CRCO nordsignal) → Wendy (Legal) od Fazy 3
**Po co ten dokument:** wiersza `audit_log` **nie da się zmienić ani usunąć zwykłą operacją na wierszu** (zasięg tej gwarancji — dokładny, z jej znanym ograniczeniem — opisuje `docs/data/ropa.md` wpis #6, sekcja „SPROSTOWANIE (v0.5) — zasięg obietnicy append-only"; **tutaj go nie powtarzam**). Każde nowe zdarzenie jest więc decyzją **nieodwracalną co do kształtu danych**, a nie detalem implementacyjnym. Dotąd taksonomia `action` żyła wyłącznie w kodzie i w mojej głowie; ten plik ją wyjmuje na zewnątrz, żeby kolejne pytanie „czy mogę dołożyć zdarzenie X" miało odpowiedź w regule, a nie w mojej dostępności.
**Powiązania:** `docs/data/ropa.md` wpis #6 (rejestr czynności dla `audit_log`) i wpis #7 (rejestr uczestników pilotażu) · `docs/data/retention.md` (okresy) · `docs/data/art17-kompletnosc-usuniecia.md` (miejsca, których kaskada nie czyści) · `../../../docs/audyty/2026-07-26-rls-bypassrls-prod.md` v0.3 (środki bezpieczeństwa) · ADR-002/004 (granty), migracje `0003`, `0008`, `0010`, `0047`.

**Changelog v0.1 → v0.2 (2026-08-10) — Ryan (CRCO), zadanie E2b pakietu RODO.** Cztery zmiany:
**(1)** §6 przepisana — dług A-1 ma **rozstrzygnięty kierunek (a+)** z zakresem, decyzjami
szczegółowymi i **zmierzonym stanem wykonania** (dziś: zero, kierunek na gałęzi, nie na `main`);
**(2)** §5 uzupełniona o dwa brakujące zdarzenia i **sprostowana** co do `submission.review.*`;
**(3)** klasa ryzyka i przesłanka o populacji kont **usunięte stąd i zastąpione odesłaniem** do
jedynego nośnika (`ropa.md`, „Oświadczenie administratora") — bo dokładnie ta przesłanka żyła
w dwóch kopiach, obie były nieprawdziwe i obie trzeba było prostować osobno;
**(4)** §4 zyskuje **warunkową zgodę z góry** na kształt zdarzenia `pilot.participant.withdrawn`.

---

## Żargon (tłumaczenie)

- **`audit_log`** — tabela w bazie produktu, w której zapisujemy zdarzenia istotne dla bezpieczeństwa i rozliczalności (kto, co, na czym, kiedy). **Nie mylić** z audit logiem firmy nordsignal (`logs/audit/` w repo operating system) — to dwie różne rzeczy o podobnej nazwie.
- **append-only** (tylko dopisywanie) — do tabeli wolno wyłącznie dodawać. Wyzwalacz z migracji `0008` blokuje zmianę i usunięcie **wiersza**, także właścicielowi bazy; migracja `0010` domyka to samo dla `TRUNCATE` (opróżnienia tabeli). **Zasięg tej gwarancji i jej znane ograniczenie (przebudowa tabeli) opisuje `docs/data/ropa.md` wpis #6 — jedyny nośnik tego zdania w repozytorium.**
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

### 4a. Zgoda z góry na kształt: `pilot.participant.withdrawn` (v0.2, Ryan)

**Luka, którą zamykam zawczasu.** Rejestr `pilot_participants` ma zdarzenie **wpisu**
(`pilot.participant.enrolled`) i **nie ma zdarzenia wypisu**. Wiersz rejestru wolno usunąć —
kasuje go kaskada przy usunięciu konta, skasuje go też sprzeciw z art. 21 albo przegląd retencji.
**Rejestr jest włączający, więc usunięcie wiersza po cichu zmienia wynik miernika i nie zostawia
żadnego śladu, że coś się zmieniło.** To ta sama rodzina awarii, dla której dopuściłem
`curriculum.placement.skipped`: cisza znaczy dwie różne rzeczy naraz.

**Dopuszczam z góry, w dokładnie tym kształcie** (zgoda dotyczy kształtu, nie nazwy):

| Pole | Wartość |
|---|---|
| `actorType` | `"operator"` (usuwa człowiek narzędziem) |
| `actorId` | **NIEPODANY** — wzorzec A7 |
| `action` | `pilot.participant.withdrawn` |
| `targetType` / `targetId` | `"student"` / `students.id` — kaskaduje |
| `metadata` | **wyłącznie** `{ cohort, reason }`, gdzie `reason` to kod rozłączny: `objection_art21` / `retention_review` / `enrolled_by_mistake`. **Zero treści wolnej** |
| `ipAddress` / `userAgent` | **NIEPODANE** |

**Granica zgody:** zdarzenie zapisuje się **tylko przy usunięciu wykonanym świadomie narzędziem**.
Przy usunięciu **kaskadowym** (skasowanie konta) **nie zapisujemy nic** — wpisywanie śladu w chwili,
gdy wykonujemy czyjeś żądanie z art. 17, byłoby dopisaniem wiersza o osobie, która właśnie prosiła
o zniknięcie. Jeśli ktoś zaproponuje inaczej, **zgoda wygasa i sprawa wraca do mnie**.

---

## 5. Taksonomia — stan na 2026-08-10 (v0.2)

Konwencja: `<domena>.<obiekt>.<czasownik>`, małe litery, kropka jako separator. Prefiks domeny jest **jedyną rzeczą trzymającą osobno światy o tej samej nazwie potocznej** (`curriculum.placement.*` = drabina nauki; `placement.consent.*` = staż/praca, dane zawodowe, zgoda).

**Skąd ta tabela pochodzi w v0.2:** nie z pamięci i nie z v0.1 — z **inwentaryzacji wykonanej na kodzie** `origin/main` (ADR E1 §3: wyodrębnione każde wywołanie zapisu do `audit_log`, 20 wywołań, z odczytanym `action`, `actorId` i obecnością kontekstu żądania) oraz z **pomiaru produkcji** (E0, rozbicie `audit_log` po `action`, 2026-08-10). Trzy pozycje v0.1 były błędne i są niżej **sprostowane**.

Kolumna „`actorId` dziś" opisuje **stan na `origin/main` w chwili wydania v0.2** (commit `06d0040`); kolumna „po A-1 (a+)" opisuje **stan docelowy**, jeszcze **niewdrożony** — patrz §6, gdzie stan wykonania jest zmierzony, a nie zadeklarowany.

| `action` | `actorType` | `actorId` dziś | po A-1 (a+) | Klasa |
|---|---|---|---|---|
| `curriculum.placement.computed` | student | **brak** (A7) | bez zmian | ślad decyzji, bez tożsamości |
| `curriculum.placement.skipped` | student | **brak** | bez zmian | ślad defektu — rozstrzygnięcie §1, **wciąż niewdrożone** |
| `pilot.participant.enrolled` | operator | **brak** | bez zmian | **DOPISANE w v0.2** — istnieje w kodzie (`tools/pilot-enroll.ts`), a w v0.1 tej tabeli nie było. Zgodne ze wzorcem A7 **już dziś**; test czterech pytań (§4) przechodzi wstecznie: bez identyfikatora osoby, `target_id` kaskaduje, `metadata` = `{ cohort }`, zdarzenie inicjuje człowiek. RoPA wpis #7 |
| `pilot.participant.withdrawn` | operator | **brak** | — | **zgoda z góry na kształt, jeszcze nie istnieje** — §4a |
| `passport.share.enable` / `.disable` | student | **jest** (`user.id`) | **usunięty** + bez adresu IP | dług A-1, w zakresie |
| `submission.verified` | **system** (deklaruje) | **jest** (`students.id`) | **usunięty** + bez adresu IP | dług A-1, w zakresie. ⚠ **Anomalia:** wiersz mówi „zrobił to system", a niesie tożsamość człowieka — potwierdzone na produkcji (E0, F1). Po A-1 sprzeczność znika sama |
| `submission.viva.started` / `.restarted` / `.passed` / `.failed` / `.expired` / `.inconclusive` | student albo system | **jest** (`students.id`) | **usunięty** + bez adresu IP | dług A-1, w zakresie |
| `submission.viva.answers_read` | faculty/operator | jest (identyfikator **sesji recenzenta**) | **bez zmian** | **DOPISANE w v0.2** — w v0.1 tego zdarzenia w tabeli nie było. Klasa 2, poza zakresem A-1 (decyzja D-2) |
| `submission.review.<decyzja>` | faculty/operator | jest (identyfikator **sesji recenzenta**) | **bez zmian** | **SPROSTOWANE w v0.2.** v0.1 zaliczała to zdarzenie do długu A-1 („jest `studentMeta.id`") — **nieprawda**: zapisuje `reviewer.sessionId` (`src/app/api/review-queue/[id]/decision/route.ts:167`), a na produkcji ma **zero wierszy** |
| `placement.consent.granted` / `.revoked` | student | **jest** (`students.id` — **ta sama wartość co `target_id`**) | **usunięty** + bez adresu IP | **W ZAKRESIE A-1 od v0.2 (decyzja D-1).** W v0.1 opisane jako „wpis RoPA #4" bez związku z długiem — to było przeoczenie. Ślad zgody: `docs/data/ropa.md`, „Wpis #4 — sprostowanie" |
| `faculty.login.success` / `.fail`, `faculty.dashboard.read` | faculty | `.success`: jest (identyfikator sesji); `.fail`, `.dashboard.read`: **brak** | **bez zmian** | poza zakresem A-1 — decyzja D-2 (§6), trzy progi powrotu |
| `operator.login.success` / `.fail` | operator | `.success`: jest (identyfikator sesji); `.fail`: **brak** | **bez zmian** | jw. |
| `tenant.backfill.unmapped` | system | **brak** | bez zmian | zdarzenie migracyjne (`drizzle/0006_far_shaman.sql:47`), zapis surowym SQL-em — patrz §6, drugi nośnik zapisu |

---

## 6. Dług A-1 — kierunek ROZSTRZYGNIĘTY: (a+). Wykonanie: w toku (v0.2)

**Fakt, zweryfikowany na kodzie:** `actor_id` w `audit_log` to zwykły `text` **bez klucza obcego i bez kaskady** (`drizzle/0003_bumpy_microbe.sql` — `"actor_id" text,`; brak `REFERENCES` w jakiejkolwiek migracji). Jednocześnie wyzwalacz `audit_log_no_update_delete` (`0008`) blokuje `UPDATE` i `DELETE` na wierszu, a `0010` domyka `TRUNCATE`. **Skutek:** dla zdarzeń zapisujących `actorId` studenta usunięcie z art. 17 jest **strukturalnie niewykonalne** — skasowanie konta nie usuwa wiersza i nie zrywa wiązania.

### 6.1 Decyzja: kierunek (a+), trzy elementy

Rozstrzygnięte w ADR E1 (Ryan, 2026-08-10, wsparcie: wycena Maxa i pomiar produkcji Ethana). **„(a) albo (b)" było błędem kategorii** — to nie dwie drogi do tego samego celu: **(a) naprawia przyszłe wiersze i nie umie naprawić przeszłych; (b) naprawia przeszłe i nie zapobiega przyszłym.**

| # | Element | Czego dotyczy |
|---|---|---|
| **A1** | Zdarzenia, w których działającym jest **student**, **nie zapisują `actor_id`** | 11 miejsc wywołania |
| **A2** | Te same zdarzenia **nie zapisują `ip_address` ani `user_agent`** | element **nośny**, nie ozdobny — patrz niżej |
| **A3** | Reguła A1+A2 ma **jeden nośnik**: typ `AuditEntry` (`src/lib/audit.ts`) przestaje na to pozwalać; miejsca wywołania reguły **nie powtarzają** — są przez nią przymuszone | CLAUDE.md v1.17 (1) |

**Dlaczego A2 jest nośny, a nie dodatkowy.** Argument z motywu 26 („po kaskadzie wiersz staje się sierotą") weryfikowałem 2026-08-01 na zdarzeniach `curriculum.placement.*`, które **kontekstu żądania nie zapisują**, i przeniosłem wniosek na zdarzenia, które zapisują go **wszystkie**. Adres IP jest daną osobową (motyw 30; TSUE *Breyer*, C-582/14). **Pakiet bez A2 zostawiałby adres IP wnioskodawcy w tabeli bez terminu i nie wolno go raportować jako domknięcia art. 17.**

**Migracji schemy nie wymaga** — `actor_id` jest już kolumną dopuszczającą brak wartości. Zmiana jest **wyłącznie w kodzie**: domena Ethana (CLAUDE.md §5, v1.11), bramka Leo. **Zgoda na obniżenie pokrycia sygnału bezpieczeństwa (A2) jest moja** — domena ryzyka.

### 6.2 Stan wykonania — zmierzony, nie zadeklarowany

**Na dzień wydania v0.2 kierunek (a+) NIE jest wdrożony.** Mój odczyt, **2026-08-10 15:27 UTC**, dwie komendy i ich dosłowne wyjście:

```
$ git show origin/main:src/lib/audit.ts | sed -n '7,16p'
export interface AuditEntry {
	actorType: AuditActorType;
	actorId?: string | null;
	action: string;
	targetType?: string | null;
	targetId?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	metadata?: Record<string, unknown> | null;
}

$ git log --oneline origin/main..feat/rodo-a1-audit-bez-aktora | wc -l
       0
```

Odczyt pierwszy: `actorId`, `ipAddress` i `userAgent` są **nadal dozwolone dla każdego `actorType`** — nośnika reguły z A3 nie ma. Odczyt drugi: gałąź wykonawcza istnieje, ale **zero commitów ponad `main`**. **Ta liczba starzeje się z godziny na godzinę** (wykonanie idzie równolegle) — kto ją cytuje później, powtarza pomiar, nie ten akapit.

**Dopóki to się nie zmieni, każde zdanie „A-1 naprawione" jest nieprawdziwe** — i dotyczy to także kolumny „po A-1 (a+)" w §5, która opisuje **cel**, nie stan. Warunek zamknięcia: cztery strażniki, **każdy z udokumentowaną mutacją, która go czerwieni** (co zmieniono → który test padł → data odczytu; CLAUDE.md v1.17). Zielona suita nie jest dowodem. Bramka scalenia: Quinn.

### 6.3 Trzy decyzje szczegółowe — podjęte i zapisane

**D-1 · `placement.consent.granted` / `.revoked`: W ZAKRESIE.** To ślad **zgody** — pierwsza rzecz, o którą pyta się przy żądaniu z art. 17 (art. 7 ust. 3 w związku z art. 17 ust. 1 lit. b). `actor_id` i `target_id` trzymają tam **identycznie tę samą wartość** (`students.id`), więc usunięcie `actor_id` nie kosztuje ani grama rozliczalności — najczystszy przypadek redundancji w całym zbiorze (art. 5 ust. 1 lit. c). `target_id` **zostaje**: to jedyny nośnik „czyja zgoda", potrzebny dopóki konto żyje, i ginie z kontem.

**D-2 · klasa 2 (`faculty.login.success`, `operator.login.success`, `submission.review.*`, `submission.viva.answers_read`): POZA ZAKRESEM.** Przesłanka rozstrzygająca: **nie ma tu zidentyfikowanej osoby fizycznej** — uwierzytelnienie wykładowcy to **hasło współdzielone per kampus**, a `faculty_sessions` nie ma ani jednej kolumny wskazującej osobę. Wiersz mówi „ktoś, kto zna hasło kampusu X", nie „Jan Kowalski". Przeciwwaga (art. 6 ust. 1 lit. f + art. 32 ust. 1 lit. b i d): to ślad dostępu do panelu z danymi studentów całego kampusu.
**Trzy przesłanki przeciwko tej decyzji — zapisuję je, żeby nie była jednostronna:** (1) te wiersze **nigdy nie staną się sierotami samoistnie**, bo `faculty_sessions` nie ma żadnej reguły retencji; (2) adres IP w wierszu sesji może w praktyce wskazywać konkretną osobę; (3) wyłączenie jest wygodne, a wygoda nie jest przesłanką.
**Trzy progi powrotu — wraca do mnie przy pierwszym z nich:** (i) pierwsze **indywidualne** konto wykładowcy/recenzenta/operatora; (ii) pierwsza reguła retencji dla `faculty_sessions`; (iii) pierwsze żądanie z art. 15 lub 17 od wykładowcy, choćby nieskuteczne. **Właściciel progu: Ryan.**

**D-3 · adres IP: NIE ZAPISYWAĆ** dla `actorType` `"student"` i `"system"`. Odrzucone: skrót z solą (zachowana sól = pseudonimizacja na zawsze w tabeli bez `UPDATE`; porzucona sól = koszt bez korzyści) oraz „zapisywać i przyznać, że art. 17 zostaje niewykonalny". **Zostaje świadomie:** adres IP dla nieudanych logowań (`anonymous`) — jedyny sygnał wykrywania ataku siłowego, brak konta do skasowania — oraz dla logowań wykładowcy i operatora. **Granica biegnie po tym, czy zdarzenie dotyczy zidentyfikowanej osoby, nie po tym, czy adres IP jest wygodny.**

### 6.4 Drugi nośnik zapisu — obejście typu z A3

Typ `AuditEntry` **nie jest jedynym wejściem do tabeli**. Dwa miejsca piszą surowym SQL-em: `tools/pilot-enroll.ts` (bez `actor_id` → zgodne z (a+) już dziś) i `drizzle/0006_far_shaman.sql:47` (zdarzenie migracyjne, bez `actor_id` → zgodne). **Reguła ma więc jeden zamierzony nośnik i jedno obejście** — zgodnie z CLAUDE.md v1.17 nie wolno tego przemilczeć: obejście dostaje własnego strażnika (każde `INSERT INTO "audit_log"` poza listą zatwierdzonych miejsc **albo** zawierające kolumnę `actor_id` → czerwone).

### 6.5 Klasa ryzyka — NIE JEST TU ZAPISANA, i to jest zmiana świadoma

**Stare brzmienie, cytowane dosłownie (v0.1):**

> „**Klasa: WAŻNE dla kontroli, INFO dla danych** (zero prawdziwych studentów; podmiot danych i administrator to dziś ta sama osoba). **Próg: przed pierwszą prawdziwą rejestracją**…"

To zdanie było **nieprawdziwe** i żyło **w dwóch kopiach** — tu i w `ropa.md` wpis #6. Obie kopie trzeba było prostować osobno, a niesprawdzona przesłanka o populacji kont zdążyła przez dziewięć dni pełnić rolę faktu w trzech różnych dokumentach. **Klasa ryzyka, populacja kont i próg naprawy mają od v0.2 dokładnie jeden nośnik:** `docs/data/ropa.md`, sekcja **„Oświadczenie administratora — populacja kont na produkcji"**. Tutaj tylko odesłanie — celowo, żeby nie dało się ich znowu rozjechać.

### 6.6 Czego (a+) nie naprawia

1. **Wiersze już zapisane** zostają z `actor_id`, adresem IP i sygnaturą przeglądarki **na zawsze** (14 wierszy z `actor_id` na produkcji, pomiar E0 2026-08-10).
2. **Nie ma ścieżki usunięcia konta** — (a+) usuwa przeszkodę, nie dostarcza prawa (pozycja E1b pakietu RODO).
3. **`audit_log` nie jest jedynym miejscem długu**, a kopie zapasowe i dzienniki poza bazą mają własne cykle życia — pełny rejestr pozycji, z klasą i właścicielem: `docs/data/art17-kompletnosc-usuniecia.md` (pozycje L-2, L-5, L-6). **Nie wyliczam ich tutaj drugi raz.**

**Świadomie NIE rekomenduję zdjęcia ani nadwątlenia wyzwalacza append-only** — stanowisko bez zmian od 2026-08-01, wzmocnione pomiarem: **oba wyzwalacze wskazują na tę samą jedną funkcję**, więc jedna linia wyjątku rozbroiłaby ochronę przed `UPDATE`, `DELETE` i `TRUNCATE` naraz.

---

## 7. Self-critique

Rola: head of GRC firmy SaaS świeżo po audycie SOC 2 Type II. Pięć słabości i co poprawiłem:

1. **Odruch CRCO brzmi „nie" — mniej danych zawsze wygląda bezpieczniej, a odmowa nigdy nie jest zarzucana audytorowi.** Odmówiłbym „z ostrożności", a koszt poniósłby ktoś inny: miernik Sophii nie odróżniałby defektu od poprawnego zachowania, i to cicho. → Rozstrzygnąłem **na przesłankach sprawdzonych na kodzie** (kaskada w `0030`, brak klucza obcego w `0003`, wyzwalacz w `0008`), nie na odczuciu ryzyka. Ostrożność, która przerzuca koszt na cudzą domenę i nie nazywa go, nie jest ostrożnością.
2. **Zgoda mogła zostać wydana na nazwę zdarzenia zamiast na jego kształt** — a wtedy za trzy miesiące ktoś dołożyłby do `metadata` napis celu kariery „bo Ryan zatwierdził `skipped`". → Sekcja 1 wylicza kształt **pole po polu**, a sekcja 3 ma jawną **granicę wygaśnięcia zgody**. Zgoda dotyczy kształtu, nie nazwy.
3. **Mogłem odpowiedzieć na zadane pytanie i przeoczyć, że dzisiejszy nośnik loguje `studentId`.** To najgorszy możliwy wynik: zatwierdziłbym wariant lepszy, zostawiając w kodzie wariant gorszy, i obie wersje działałyby obok siebie. → Sekcja 2 — sprawdziłem realny kod nośnika, nie jego opis w uzasadnieniu, i wyszło, że **ocena nośników jest odwrotna niż zakładano**. Stąd W1 jako warunek **niezależny** od reszty rozstrzygnięcia.
4. **Rozstrzygnięcie jednorazowe nie skaluje się — za miesiąc przyjdzie kolejne zdarzenie i znów będę wąskim gardłem.** Pierwszy szkic był wyłącznie o `skipped`. → Sekcja 4: **test czterech pytań plus pytanie o nośnik**, wyprowadzony z tego samego rozumowania. Inżynier odpowiada sobie sam; do mnie trafia tylko to, co ten test odrzuca. Wąskie gardło zamienione w regułę.
5. **Dług A-1 mógł utonąć jako dygresja.** Wyszedł ubocznie, przy sprawdzaniu kaskady — a jest cięższy niż zadane pytanie: dla części zdarzeń art. 17 jest dziś strukturalnie niewykonalny. → Osobna sekcja 6 z klasą ryzyka, progiem czasowym (przed pierwszą rejestracją), dwoma wariantami naprawy i **jawnym „nie rozstrzygam tego dziś"**, plus wiersz w RoPA #6. Znalezisko bez własnego miejsca i progu nie istnieje operacyjnie.

**Szósta, poza limitem.** Podniosłem argument z art. 32 ust. 1 lit. d w sprawie, w której akurat wypada on **za** wnioskiem, o który proszono — a tydzień temu podniosłem go w sprawie, w której wypadał **przeciw** wygodzie. Sprawdzam więc, czy nie dopasowuję przepisu do wyniku. **Test: czy ten sam argument obaliłby propozycję, gdyby kształt był inny?** Tak — gdyby zdarzenie niosło `actorId` albo napis celu, lit. d nadal przemawiałaby za śladem, ale art. 17 i minimalizacja przeważyłyby i odmówiłbym. Argument nie jest więc dobrany pod wynik; przesądza kształt danych, nie potrzeba pomiaru.
