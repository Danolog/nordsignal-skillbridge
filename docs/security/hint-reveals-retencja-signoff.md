# Znaczniki czasu odsłonięcia podpowiedzi — retencja i minimalizacja (ADR-018 D1)

**Wystawił:** Ryan (CRCO nordsignal) · **Data:** 2026-07-22 · **Wersja:** v1.0
**Przedmiot:** kolumna `curriculum_item_progress.hints_revealed_json` w kształcie z ADR-018 D1 —
`{ "<question_item_id>": { "d": 0..3, "at": ["<iso8601>", …] } }`, wprowadzana migracją `0039`
w ramach planu naprawy `docs/2026-07-22-dlug-hintdepth-plan-naprawy.md`.
**Zgłaszający:** Leo (Tech Lead) — teza: „powierzchnia kontroli dostępu a minimalizacja i retencja
to dwa różne pytania". **Teza przyjęta w całości.**

**WERDYKT: SIGN-OFF DOMENY Z WARUNKAMI (GO warunkowe).** Kształt zapisu **zostaje bez zmian** —
`{d, at[]}` przechodzi test minimalizacji. Nota do macierzy RLS **nie wystarczy**, bo dwa pytania,
które ADR-018 pominął, mają dziś odpowiedź „nic takiego nie istnieje", a nie „istnieje i obejmuje".
Osiem warunków wiążących dla Maxa (§6), dwa warunki poza tym PR-em (§7), jedna eskalacja
informacyjna do Darka (§7, E-1, nie blokuje), jedno sprostowanie do ADR-018 D1 (§8).

> **Słowniczek** (żargon rozwinięty przy pierwszym użyciu): **podpowiedź / hint** — kolejny poziom
> pomocy przy pytaniu (0 = żadnej, 3 = pełne rozwiązanie); **głębokość / `d`** — ile podpowiedzi
> student odsłonił; **`at`** — lista znaczników czasu przyznania podpowiedzi; **JSONB** — typ kolumny
> w PostgreSQL trzymający strukturę danych zamiast pojedynczej wartości; **minimalizacja** — zasada
> RODO art. 5 ust. 1 lit. c: zbieramy tylko dane niezbędne do celu; **ograniczenie przechowywania /
> retencja** — art. 5 ust. 1 lit. e: nie trzymamy dłużej, niż to konieczne; **rozliczalność** —
> art. 5 ust. 2: musimy *udowodnić* zgodność, nie tylko ją twierdzić; **klauzula informacyjna** —
> art. 13: co, po co, jak długo i na jakiej podstawie przetwarzamy, podane osobie przy zbieraniu
> danych; **RLS** — reguły bazy pilnujące, że student widzi wyłącznie własne wiersze;
> **K-INT** — klasa tabel z danymi studenta; **kaskada / `ON DELETE CASCADE`** — usunięcie wiersza
> nadrzędnego (student) kasuje wiersze zależne; **FSRS** — algorytm planujący powtórki (etap 1E.4).

---

## 1. Ustalenia faktyczne — co sprawdziłem i co realnie jest w repo

Nie zakładałem, że reguła retencji istnieje. Sprawdziłem.

| Co sprawdzałem | Wynik | Dowód |
|---|---|---|
| Czy istnieje rejestr retencji | **TAK**, 18 linii, **dwa wiersze** | `docs/data/retention.md` |
| Czy `curriculum_item_progress` jest w rejestrze | **NIE** | j.w. — wiersze to wyłącznie `placement_events` i `viva_answers.content` |
| Czy `curriculum_item_answers` jest w rejestrze | **NIE** | j.w. |
| Czy istnieje jakikolwiek okres dla klasy „ścieżka nauki" | **NIE — zero reguł dla całej klasy** | j.w. |
| Czy istnieje skrypt egzekucji retencji (dowolnej) | **NIE — ani jednego** | `ls tools/` → jest `remediate-duplicate-submissions.ts`, `viva-flag-off-recompute.ts`; skryptu retencji nie ma. Rejestr sam zapowiada go dla vivy jako „zakres 1.16a/1.16b" |
| Czy istnieje klauzula informacyjna (art. 13) | **NIE — żadnego pliku, żadnej trasy** | `find` po `*privacy*` / `*prywatn*` / `*regulamin*` → pusto; `src/app` nie ma takiej ścieżki |
| Czy istnieją zgody w produkcie | **TAK, trzy** — udostępnienie paszportu (A1, wersjonowana), powiadomienia o lukach (AG.6), placement (delete-on-revoke) | `passport-view.tsx:55,117`, `market-gap-notifications.tsx:8`, `placement/consent/route.ts:7`, `schema.ts:156` |
| Czy `hint_depth` ma dziś czytelnika w kodzie produkcyjnym | **NIE** | ustalenie Leo §1.2, potwierdzone |
| Czy premisa ADR-018 „zero nowej powierzchni RLS" jest prawdziwa | **TAK, potwierdzona** | `drizzle/0035_*.sql:162–163` (`GRANT SELECT` `app_student`, `REVOKE ALL` `app_faculty`), `:168–186` (pętla `ENABLE`+`FORCE`+`student_sees_own`+`owner_passthrough` dla 3 tabel), `tools/k3-validate.ts:97` (`TENANT_TABLES`) |
| Czy panel wykładowcy dotyka tabel curriculum | **NIE** | `grep curriculum src/app/api/faculty/dashboard/route.ts` → pusto |
| Czy paszport (publiczny/tokenowy) dotyka tabel curriculum | **NIE** | `src/app/api/passport/[id]/route.ts` czyta `passports`, `students`, `user`, `competencies`, `gaps`, `verified_competencies`; odpowiedź składana polem po polu, nie `select *` |
| Czy trasy curriculum piszą do `audit_log` | **NIE** | `grep` po `auditLog|writeAudit` w `src/app/api/curriculum/` i `src/lib/curriculum/` → pusto |
| Czy `audit_log` da się skasować przy żądaniu usunięcia danych | **NIE — architektonicznie niemożliwe** | `actorId` to zwykły `text` bez klucza obcego i bez kaskady (`schema.ts:1114`); triggery `audit_log_no_update_delete` (`0008`) i `audit_log_no_truncate` (`0010`) rzucają wyjątek na UPDATE/DELETE/TRUNCATE (`rls-matrix.md:185`). Wiersz obok `ip_address` i `user_agent` (`schema.ts:1118–1119`) |
| Czy tabela postępu ma kaskadę na studencie | **TAK** | `schema.ts:1779–1781` — `student_id … onDelete: "cascade"` |
| Czy platforma trzyma już ślad behawioralny tej samej klasy | **TAK** | `curriculum_item_answers.answered_at` (`schema.ts:1832`), tabela APPEND-ONLY, indeks `(student_id, answered_at)` (`:1835`), czytany przez rytm nauki 1.18 (`src/lib/rhythm/activity.ts:42`) |
| Ilu realnych studentów jest na produkcji | **ZERO** — wszystkie konta testowe/Darka; założenie wygasa z pierwszą realną rejestracją | `docs/SESSION_HANDOFF.md:66–71` (decyzja Darka z 2026-07-22) |
| Ile wierszy ma `curriculum_item_answers` na produkcji | **0** (pomiar 2026-07-22) | plan Leo §2.1 |
| Czy repo ma wzorzec walidacji kształtu JSONB przy odczycie | **NIE — dominuje rzutowanie bez sprawdzenia** | `src/lib/viva/http.ts:62`: `session.questionsJson as VivaQuestion[]`. Wzorzec ograniczonego kształtu istnieje po stronie zapisu: `VivaPlanSchema` (`src/lib/viva/types.ts:47`) |

**Wniosek z tabeli, w jednym zdaniu:** ADR-018 poprawnie ustalił, że nic nie przybywa po stronie
kontroli dostępu, i pominął to, że po stronie retencji **nie ma czego rozszerzać, bo nie ma nic**.

---

## 2. Pytanie 1 — czy istniejąca reguła retencji obejmuje znaczniki czasu

**Nie obejmuje, bo nie istnieje.** Nie chodzi o to, że reguła dla tabeli postępu jest zbyt wąska
i nie sięga nowej kolumny. Chodzi o to, że `curriculum_item_progress` **nie ma żadnego
zdefiniowanego okresu przechowywania** — tak samo jak `curriculum_item_answers` i
`curriculum_module_progress`. Rejestr `docs/data/retention.md` ma dwa wiersze i żaden ich nie dotyczy.

Dwie rzeczy, które łatwo tu pomylić, a które są odrębnymi obowiązkami:

- **Kasowanie na żądanie (art. 17 RODO)** — działa: `student_id ON DELETE CASCADE` (`schema.ts:1781`).
  To jest reakcja na żądanie osoby.
- **Ograniczenie przechowywania (art. 5 ust. 1 lit. e)** — **nie działa, bo nie jest zdefiniowane.**
  To jest nasz własny, samoczynny termin, niezależny od tego, czy ktokolwiek o cokolwiek poprosi.

Rejestr sam stawia regułę: *„Nowa klasa danych z określoną retencją = nowy wiersz tutaj"*. Reguła
jest spełniona **pusto** — nie było okresu, więc nie było wiersza. To jest dziura w mojej własnej
domenie i powstała nie w tym PR-ze, tylko **przy moim sign-offie z 2026-07-11** (macierz RLS v0.26):
przepuściłem trzy tabele K-INT, sprawdziłem izolację i kaskady, i nie ustaliłem dla nich okresu.
Zapisuję to wprost, bo rozliczalność (art. 5 ust. 2) polega na pokazywaniu takich rzeczy, a nie na
ich wygładzaniu w changelogu.

### Werdykt 1 — czy `at[]` potrzebuje własnego okresu

**Tak, i jest to jedyny fragment tej klasy, który dostaje okres krótszy niż życie konta.** Ustalam
dwie reguły — pierwsza dotyczy śladu, druga stanu:

| | Dane | Okres | Uzasadnienie |
|---|---|---|---|
| **a** | `hints_revealed_json → at[]` (znaczniki czasu) | **12 miesięcy** od samego znacznika, potem wpis znika; `d` zostaje | To **ślad zachowania**, nie stan nauki. Cel, który go uzasadnia (odtworzenie „czy w oknie tego podejścia padło odsłonięcie" — ADR-018 D2 pkt 2), **wygasa z czasem**: rekonstrukcja podejścia sprzed roku nie jest wsadem do żywego FSRS. Wsadem jest `d`. |
| **b** | `curriculum_item_progress` i `curriculum_item_answers` (całe wiersze, w tym `answered_at`) | **czas trwania konta studenta** (kasowane kaskadą) | To **stan nauki**. Algorytm powtórek modeluje zapominanie w skali miesięcy i lat — skrócenie tego okresu zepsułoby funkcję produktu, a nie ochroniło studenta. Okres musi być jednak **nazwany**, nie domyślny. |

**Dlaczego akurat 12 miesięcy dla (a):** nie wymyślam nowej liczby. W firmie funkcjonują dokładnie
dwa okresy 12-miesięczne — retencja audit logu (CLAUDE.md sekcja 10) i surowe odpowiedzi obrony
ustnej (ADR-013 D3, wiersz w rejestrze). Trzecia, inna liczba to trzecia rzecz do zapamiętania i
pierwsza do pomylenia przy audycie. Jeśli kiedyś 1E.4 wykaże, że okno rekonstrukcji musi być
dłuższe — zmiana okresu jest tania (wiersz w rejestrze + parametr skryptu), pod warunkiem że okres
w ogóle istnieje.

**Konsekwencja techniczna, którą trzeba nazwać teraz, żeby nie płacić drugą migracją:** przycięcie
starych znaczników **łamie niezmiennik z ADR-018 D1** („dokładnie `d` wpisów"). Po przycięciu wiersz
ma `d = 3` i np. 1 wpis `at`. Niezmiennik wiążący to **`at.length ≤ d`**, nie `=`. Sprostowanie
w §8, warunek w §6 (W-3).

**Czego NIE wymagam:** skryptu egzekucji w tym PR-ze. Produkcja ma zero wierszy i zero realnych
studentów (`SESSION_HANDOFF.md:66–71`), więc skrypt nie miałby dziś czego przyciąć, a jego żądanie
zatrzymałoby ścieżkę krytyczną 1E.4 za zadanie bez treści. Bramka jest zdarzeniowa, nie kalendarzowa
— **pierwsza realna rejestracja studenta** (R-1, §7). To ta sama granica, którą Darek sam postawił
przy zapalaniu flag 2026-07-22, więc nie dokładam nowego pojęcia do systemu.

**Uczciwie o słabości tego werdyktu:** deklaruję okres, którego dziś nic nie egzekwuje — a rejestr
ma już jeden taki (12 miesięcy dla vivy, skryptu brak). Dwa niewyegzekwowane okresy to zapowiedź
trzeciego. Dlatego R-1 jest sformułowany jako **jeden** skrypt obsługujący cały rejestr, nie skrypt
per wiersz, i dlatego dług wchodzi do samego rejestru (kolumna „egzekwowanie"), gdzie widać go przy
każdym kolejnym wpisie, a nie tylko w tym dokumencie.

---

## 3. Pytanie 2 — minimalizacja (art. 5 ust. 1 lit. c)

Cel deklarowany: cecha wejściowa algorytmu powtórek + analityka uczenia się. Oceniam zapis wobec
tego celu, nie wobec wyobrażonego.

### 3.1 Odpowiedź na uwagę Leo — niepełna historia, pełna kategoria

Leo zauważa napięcie: przy regule „dopisuj tylko przy wzroście głębokości" lista nie jest pełną
historią kliknięć, a mimo to jest zapisem behawioralnym. **Obie te rzeczy są prawdziwe naraz i nie
znoszą się.**

- **Dla kategorii** niepełność nie ma znaczenia. RODO klasyfikuje dane po tym, **co ujawniają
  o osobie**, nie po tym, czy zapis jest kompletny. „Ta osoba poprosiła o pomoc przy tym pytaniu
  o 02:14" jest śladem zachowania niezależnie od tego, czy odnotowaliśmy też kliknięcia, które nic
  nie przyznały. Kategoria: **ślad behawioralny, dane osobowe, klasa K-INT** — traktujemy tak samo
  jak resztę tej klasy.
- **Dla minimalizacji** niepełność działa **na naszą korzyść i jest właśnie dowodem zgodności**.
  Zapisujemy wyłącznie zdarzenia, które zmieniły stan istotny dla celu (przyznanie nowego poziomu
  pomocy), a nie każde kliknięcie. To jest dosłownie minimalizacja wykonana przez konstrukcję,
  a nie deklarowana w komentarzu. Sufit: **najwyżej 3 wpisy na pytanie**, domknięty treścią,
  nie zachowaniem studenta.

Dlatego werdykt brzmi „warunki", a nie „zmiana kształtu": kategoria wymaga dyscypliny (retencja,
zamknięty kształt, brak wtórnych kopii), a wolumen jest już minimalny wobec celu.

### 3.2 Czy węższy zapis realizuje cel

Rozważyłem trzy węższe warianty i **odrzucam wszystkie trzy**:

| Wariant węższy | Dlaczego odrzucony |
|---|---|
| Tylko `d`, bez znaczników | Odbiera dokładnie ten sygnał czasowy, dla którego ADR-018 D1 odrzucił kosztowniejszy wariant B (osobna tabela). Skutek: albo tracimy cel, albo wracamy do B — czyli więcej danych i więcej powierzchni, nie mniej. Minimalizacja nie polega na zabraniu pola i dopłaceniu tabelą. |
| Tylko `first_at` (czas pierwszego odsłonięcia) | Wystarcza dla sygnału „ile trwało do pierwszej pomocy", ale **nie** dla drugiego uzasadnienia z ADR-018 D2 pkt 2 — odtworzenia, ile odsłonięć padło w oknie danego podejścia. Oszczędza najwyżej 2 znaczniki na pytanie. Nieproporcjonalnie mała korzyść wobec utraty nazwanego celu. |
| Sama data bez godziny | Zabija oba cele czasowe naraz (odstęp „myślenie → prośba o pomoc" liczy się w sekundach), a zostawia dokładnie tę informację, która ma najdłuższy okres przydatności do profilowania („w które dni się uczył"). Najgorszy stosunek utraty celu do zysku prywatności. |

**Werdykt 2: kształt `{d, at[]}` przechodzi test minimalizacji — bez zmian.** Warunkiem jest
jednak **precyzja** i **domknięcie kształtu**, bo minimalizacja dotyczy nie tylko tego, ile pól
zapisujemy, ale też jak dokładne są i czy zbiór pól da się po cichu poszerzyć.

### 3.3 Dwa realne ryzyka, które ADR-018 pomija

**(a) Precyzja jest częścią zakresu danych.** ISO 8601 z milisekundami i lokalnym przesunięciem
strefy niesie dwie rzeczy ponad cel: rozdzielczość podsekundową (bezużyteczną dla FSRS, użyteczną
do odcisku behawioralnego) i strefę czasową użytkownika (przesłanka miejsca pobytu), jeśli znacznik
powstałby po stronie klienta. Cel realizuje **UTC z dokładnością do pełnej sekundy**. Warunki W-1, W-2.

**(b) Kolumna JSONB jest trwałym, nieaudytowanym punktem rozszerzeń — i to jest sedno tej sprawy.**
Dodanie klucza do JSONB **nie wymaga migracji**. Nie wymaga migracji, więc nie dotyka macierzy RLS,
nie uruchamia rejestru tabel wielonajemcowych i **nie generuje żadnego zdarzenia, przy którym
domena ryzyka w ogóle by się dowiedziała**. Dziś w mapie są dwa pola; za pół roku ktoś w dobrej
wierze dopisze `ua`, `sessionId`, `durationMs` albo `ip` „do diagnostyki" — jednym `jsonb_set`,
w PR-ze o czymś innym, bez pliku migracji w diffie.

To jest właściwa odpowiedź na argument „zero nowej powierzchni RLS": **zgoda co do dostępu, ale ADR
tworzy nowy kanał przyrostu danych, który omija wszystkie istniejące bramki przeglądu.** Nie blokuję
z tego powodu kolumny — blokuję możliwość cichego jej poszerzenia. Zamknięty schemat sprawdzany
przy zapisie i przy odczycie zamienia „nie dopiszemy nic więcej" z intencji w test, który pęka.
Warunek W-3.

---

## 4. Pytanie 3 — informowanie studenta i Paszport Kompetencji

### 4.1 Gdzie to należy do klauzuli informacyjnej

Właściwym miejscem jest **klauzula informacyjna (art. 13 RODO)**, nie etykieta przy przycisku.
Problem w tym, że **klauzuli nie ma w ogóle** — sprawdzone, zero plików i zero tras (§1). Uczciwa
odpowiedź na pytanie „czy student ma być o tym informowany i gdzie" brzmi więc:

- **Ten zapis nie tworzy nowego obowiązku informacyjnego** — dołącza do zbioru, którego i tak nikt
  jeszcze studentowi nie przedstawił. Blokowanie tego PR-a do czasu powstania klauzuli byłoby
  wybraniem najmniejszej pozycji z listy jako zakładnika.
- **Obowiązek jest realny i ma bramkę:** klauzula musi istnieć **przed pierwszą realną rejestracją**
  — ta sama granica, co retencja (R-2, §7).

### 4.2 Informacja w interfejsie — wymagam, ale wąsko i nie z powodu prawnego

Niezależnie od klauzuli wymagam **jednego zdania przy drabince podpowiedzi**. Powód jest mocniejszy
niż formalny:

Produkt mówi studentowi — projektem, nie napisem — że podpowiedzi są **darmowe i bez kary**
(ryzyko R13, „błąd nie jest stanem końcowym"; przegląd 1E.6a uznał wyciek za nieszkodliwy właśnie
dlatego). Jednocześnie od tego PR-a **mierzymy dokładnie to, kiedy i ile razy student poprosił
o pomoc**, i karmimy tym algorytm, który decyduje, jak często wróci do niego materiał. Jeśli student
dowie się o tym później i nie od nas, usłyszy „liczyli mi zaglądanie do rozwiązań i nie powiedzieli".
To jest ryzyko zaufania (CLAUDE.md wartość 2 i 4), a wtórnie ryzyko **jakości pomiaru**: student,
który podejrzewa, że pomoc jest liczona na jego niekorzyść, przestaje z niej korzystać — i wtedy
sygnał, dla którego robimy ten PR, przestaje opisywać rzeczywistość.

Wymagam więc, żeby przy odsłanianiu podpowiedzi stało zdanie mówiące trzy rzeczy: **zapisujemy**,
**po co** (dobór powtórek, nie ocena), **kto tego nie widzi** (wykładowca — co jest dziś prawdą
techniczną, `REVOKE ALL` w `0035_*.sql:163`). Propozycja treści, do przejęcia albo przepisania:

> „Odsłonięcie podpowiedzi zapisujemy — służy do doboru powtórek, nie do oceny. Wykładowca tego nie widzi."

**Właściciel treści: Sophia (PO)** — to komunikat produktowy w interfejsie, jej domena, nie moja.
Ja stawiam wymóg i granicę prawdziwości (zdanie nie może twierdzić więcej, niż egzekwuje kod).
Warunek W-8 opisuje formę techniczną; ostateczne słowa ustala Sophia.

### 4.3 Czy to zmienia cokolwiek w Paszporcie Kompetencji

**Dziś: nie, i sprawdziłem to, zamiast założyć.** Trasa tokenowa paszportu nie dotyka tabel
curriculum, panel wykładowcy też nie, a `app_faculty` ma `REVOKE ALL` na tabeli postępu (§1).

**Jutro: to jest najpoważniejsze ryzyko produktowe tego zapisu i wymaga twardej reguły.** Naturalnym
krokiem po 1E.4 jest pokazanie „świeżości" i „pewności" kompetencji — prywatny panel tej klasy już
istnieje (`verified-stats-panel.tsx`, MIS.3). Głębokość podpowiedzi jest kuszącym wsadem do takiego
wskaźnika, a to byłaby zmiana **wagi** zapisu, nie jego miejsca:

- „ile pomocy potrzebowałeś" to sygnał **formujący** — powstaje po to, żeby uczyć lepiej
  (CLAUDE.md sekcja 7: „do nauki" — maszyna samowystarczalna, nic nie wychodzi na zewnątrz);
- Paszport to **kredencjał wysokiej stawki** — dokładnie to, co student pokazuje pracodawcy
  („na zewnątrz jako dowód"). Przeniesienie tam sygnału o szukaniu pomocy zamienia narzędzie nauki
  w dowód obciążający, i to bez człowieka, który ma tam ostatnie słowo.

Reguła wiążąca (W-7): **`d` ani `at` nie trafiają do Paszportu — prywatnego ani publicznego — ani
do żadnego agregatu widocznego dla wykładowcy, bez odrębnego przeglądu domeny ryzyka.** Nie zakazuję
tego na zawsze; zakazuję zrobienia tego mimochodem.

---

## 5. Werdykt zbiorczy i czy to wymaga decyzji Darka

**SIGN-OFF DOMENY Z WARUNKAMI.** Zapis wchodzi w kształcie z ADR-018 D1. Nota do macierzy RLS
zostaje wystawiona **dodatkowo**, nie zamiast (treść w W-6).

**Dlaczego nie „nota wystarczy":** nota do macierzy odpowiada na pytanie o dostęp. Retencji dla tej
klasy nie ma wcale, kanał przyrostu danych w JSONB omija wszystkie bramki przeglądu, a student nie
jest informowany o niczym. Trzy braki, z których żaden nie mieści się w zdaniu „tabela już ma RLS".

**Dlaczego nie „zapis wymaga zmiany kształtu":** kształt jest proporcjonalny do nazwanego celu,
domknięty od góry (≤ 3 wpisy na pytanie), a każdy węższy wariant albo traci cel, albo wypycha nas
w kosztowniejszy wariant B (§3.2). Zmiana kształtu byłaby tu rytuałem, nie ochroną.

### Czy to decyzja Darka? Nie. Wystawiam ją sam.

- Komplet warunków stałej władzy Poziomu 2 szefa działu w jego domenie (CLAUDE.md v1.11, sekcja 5):
  decyzja **odwracalna** (warunki to kod i wiersz w rejestrze, nie zmiana nieodwracalna),
  **wewnętrzna**, **bez wydatku**, **nie wychodzi na zewnątrz**, **nie dotyka plików rządzenia**
  (`CLAUDE.md` / `agents/*.md` / `hooks/`). Ryzyko, bezpieczeństwo i RODO to moja domena.
- Nie narusza żadnej z 9 czerwonych linii (sekcja 4): brak nowego MCP, brak transferu, brak
  publikacji, brak `DROP`/`DELETE` bez `WHERE`. Migracja `0039` jest addytywna i wykonuje ją Ethan
  w ramach delegacji v1.12 — mój sign-off jej nie zastępuje ani nie warunkuje poza warunkami §6.
- Ustalenie okresów retencji w **wewnętrznym** rejestrze mieści się w tym samym mandacie.
  **Opublikowanie klauzuli informacyjnej studentom to akt wychodzący na zewnątrz** — to już nie
  moja decyzja i dlatego idzie do Darka jako E-1, a nie jako mój warunek.

**Powiadomienie Darka: okno weta 24 h** (CLAUDE.md sekcja 5). Cisza = zgoda. E-1 jest informacyjne
i nie blokuje ani tego werdyktu, ani PR-a.

---

## 6. Warunki wiążące dla Maxa — do implementacji bez dopytywania

Każdy warunek ma dowód. Tam, gdzie dowodem nie może być test, mówię to wprost.

### W-1 · Znacznik czasu wyłącznie z zegara serwera; ciało żądania bez pól czasowych

Wartość `at` powstaje **wyłącznie** po stronie serwera (`now()` w SQL albo `new Date()` w trasie).
Schemat Zod ciała `POST /api/curriculum/items/[id]/hint` przyjmuje **dokładnie jedno** pole
(`questionItemId: uuid`) i jest **`.strict()`** — nieznane pole kończy się `400`, nie cichym
odcięciem. Uzasadnienie: cały ten PR polega na tym, że nie wierzymy liczbie od klienta; przyjęcie
od klienta *znacznika czasu* odtworzyłoby dokładnie ten dług w polu obok. `.strict()` jest tu
bezpieczne, bo trasa jest nowa i nie ma klienta zgodnościowego (inaczej niż `answer`, gdzie plan
Leo świadomie zostawia odcinanie nieznanych pól ze względu na starą kartę przeglądarki).

*Dowód:* test integracyjny — `POST /hint` z ciałem `{ questionItemId, at: "1999-01-01T00:00:00Z" }`
→ **400**, w bazie zero zmian.

### W-2 · UTC, pełne sekundy, bez milisekund i bez lokalnego przesunięcia

Format zapisu: `YYYY-MM-DDTHH:MM:SSZ` (np. `2026-07-22T14:03:07Z`). Implementacja po stronie
serwera: `new Date().toISOString().replace(/\.\d{3}Z$/, "Z")` albo
`to_char(date_trunc('second', now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`.
Uzasadnienie w §3.3(a).

*Dowód:* test jednostkowy — zapisany znacznik pasuje do `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/`
(asercja na wzorcu, nie na długości łańcucha).

### W-3 · Zamknięty kształt, sprawdzany przy zapisie **i** przy odczycie

Jeden schemat Zod w `src/lib/curriculum/hints.ts`, używany w obie strony:

- klucz mapy: `uuid`;
- wartość: obiekt **`.strict()`** z **dokładnie dwoma** polami — `d` (`z.number().int().min(0).max(3)`)
  i `at` (`z.array(<wzorzec z W-2>).max(3)`);
- niezmiennik **`at.length ≤ d`** (**mniejsze-równe**, nie równe — patrz §8) — sprawdzany w `refine`;
- odczyt **parsuje**, nie rzutuje. Wzorca `session.questionsJson as VivaQuestion[]`
  (`src/lib/viva/http.ts:62`) tu **nie kopiujemy**; wzorcem ograniczonego kształtu jest
  `VivaPlanSchema` (`src/lib/viva/types.ts:47`);
- błąd kształtu = wyjątek i `logError`, nigdy ciche `?? 0` (spójne z ADR-018 D5).

*Dowód:* trzy testy jednostkowe — (1) obiekt z dodatkowym kluczem (`ua`, `ip`, `sessionId`) →
parsowanie rzuca, zapis nie dochodzi do skutku; (2) `at` z 4 wpisami → rzuca; (3) `d = 3`,
`at` z 1 wpisem (stan po przycięciu retencyjnym) → **przechodzi**.

### W-4 · Komentarz-wyzwalacz przy kolumnie: zmiana semantyki „sticky" wraca do przeglądu ryzyka

W `src/lib/db/schema.ts`, przy `hints_revealed_json`, komentarz w tej treści:

> Ograniczenie rozmiaru (≤ 3 wpisy `at` na pytanie) wynika z semantyki niemalejącej głębokości
> (ADR-018 D2), a nie z samego typu kolumny. Porzucenie „sticky" na rzecz resetu per podejście
> zamienia to pole w nieograniczony dziennik zachowania — zmiana klasy danych, nie optymalizacja.
> Wymaga ponownego przeglądu domeny ryzyka (Ryan) **przed** zmianą. Retencja `at[]`: 12 miesięcy,
> `docs/data/retention.md` + `docs/security/hint-reveals-retencja-signoff.md`.

Uzasadnienie: ograniczoność tej struktury jest **skutkiem ubocznym decyzji, która jest jawnie
otwarta** — ADR-018 zostawia definicję cechy FSRS do 1E.4, a plan Leo §8(b) zapowiada możliwą
zmianę modelu treści. Zmiana semantyki nie tworzy pliku migracji, więc bez tego komentarza nie
istnieje moment, w którym ktokolwiek wróci do tej oceny.

*Dowód:* komentarz w diffie. **Jawnie: to nie jest bramka, tylko przypomnienie w miejscu, gdzie
zmiana fizycznie się odbędzie.** Bramką maszynową jest `.max(3)` z W-3 — po zmianie semantyki
zaczyna pękać test, co jest zamierzone.

### W-5 · Odsłonięcia **nie** trafiają do `audit_log`

Zakaz twardy: żadnego `logAudit("curriculum.hint.granted", …)` ani równoważnego wpisu. Trasy
curriculum dziś do audit logu nie piszą (§1) i tak zostaje.

Uzasadnienie — mocniejsze, niż wygląda: wiersz `audit_log` jest **nieusuwalny z założenia**
(triggery `audit_log_no_update_delete` i `audit_log_no_truncate` rzucają wyjątek), a `actor_id` nie
ma klucza obcego do studenta, więc **kaskada z art. 17 tam nie sięga**. Dopisanie tam śladu
zachowania oznaczałoby dane osobowe, których nie da się skasować na żądanie, leżące w tym samym
wierszu co `ip_address` i `user_agent` — z 12-miesięczną retencją niezależną od naszej.
Audit log jest dziennikiem *decyzji i dostępów*, nie telemetrią nauki.

*Dowód:* `grep -rn "logAudit\|auditLog" src/app/api/curriculum/ src/lib/curriculum/` → pusto
(sprawdza review Leo, domena 8).

### W-6 · Znaczniki nie opuszczają serwera; nota do macierzy RLS

- `POST /hint` zwraca `{ depth, hints, hasMore }` (kontrakt Leo §4). `GET /api/curriculum/items/[id]`
  zwraca `hintsByQuestion` / `hintsTotal` / `labHints` (kontrakt Leo §5). **Surowa mapa
  `hints_revealed_json` ani lista `at` nie pojawiają się w żadnej odpowiedzi API ani w propsach
  komponentu klienckiego.** Klient potrzebuje głębokości i treści, nigdy czasu — a payload strony
  to dokładnie to miejsce, które ten PR sprząta.
- Do `docs/security/rls-matrix.md` (wiersz `curriculum_item_progress`) dopisać:

  > `hints_revealed_json` (migracja `0039`, ADR-018 D1) — ślad behawioralny w istniejącej tabeli
  > K-INT, bez nowych grantów i bez zmiany polityk. Retencja `at[]`: 12 m-cy
  > (`docs/data/retention.md`). Warunki: `docs/security/hint-reveals-retencja-signoff.md`.

*Dowód:* w teście integracyjnym trasy — `expect(JSON.stringify(body)).not.toContain(<znacznik
zapisany w bazie>)`. Asercja na treści, nie na nazwie pola (wzorzec dowodu Leo z kroku 4).

### W-7 · Zakaz wyjścia poza widok nauki studenta

`d` i `at` nie trafiają do Paszportu (prywatnego ani publicznego), do panelu wykładowcy ani do
żadnego agregatu widocznego komukolwiek poza samym studentem — bez odrębnego przeglądu domeny
ryzyka. Forma techniczna: **jedyny czytelnik to helper w `src/lib/curriculum/hints.ts`** (ADR-018 D3
już centralizuje odczyt filtrem `'server'` — rozszerzam go na całość dostępu do tej kolumny). Żaden
moduł spoza `src/lib/curriculum/` nie sięga do `hints_revealed_json` bezpośrednio.

Uzasadnienie: CLAUDE.md sekcja 7 — Paszport jest kredencjałem wysokiej stawki, a to jest sygnał
formujący. Szczegóły w §4.3.

*Dowód:* `grep -rn "hints_revealed_json\|hintsRevealedJson" src/ | grep -v "src/lib/curriculum/"`
→ pusto (poza `schema.ts`). **Jawnie: to jest dowód na dziś, nie bramka na przyszłość** —
pilnuje go review, nie test.

### W-8 · Wiersz w rejestrze retencji + zdanie dla studenta

**(a)** Do `docs/data/retention.md` dopisać **dwa** wiersze, dosłownie:

> **⚠ ADNOTACJA 2026-08-12 (Ryan) — TRZECIE WYSTĄPIENIE FRAZY „BRAK SKRYPTU". Blok niżej jest
> wiernym cytatem tego, co zamówiłem 2026-07-22, i dlatego go NIE przepisuję** — to zapis
> historyczny pod sign-offem, a przepisanie go zatarłoby, co faktycznie było zamówione.
> **Ale jego treść nie jest już prawdziwa i nie wolno jej stąd kopiować:** fraza
> „Egzekwowanie: BRAK SKRYPTU" jest **nieprawdą** — skrypt istnieje (`tools/enforce-retention.ts`,
> reguła `hints-at`) i egzekwuje dokładnie ten wiersz. Brzmienie obowiązujące i sprostowanie:
> `docs/data/retention.md` v0.3.
>
> **Nośnikiem okresów przechowywania jest `docs/data/retention.md`, nie ten plik.** Wiersze niżej
> są cytatem zamówienia, nie źródłem prawdy — jeśli szukasz aktualnego okresu, idź tam.
> Znalezisko frazy w dwóch pierwszych miejscach: Leo (Tech Lead), bramka przy #288; to trzecie
> znalazłem, sprawdzając na jego polecenie, czy fraza nie żyje gdzieś jeszcze
> (`git grep -n -i 'BRAK SKRYPTU'`, odczyt 2026-08-12).

```
| Znaczniki czasu odsłonięcia podpowiedzi | `curriculum_item_progress.hints_revealed_json` → `at[]` | **12 miesięcy** | każdy znacznik osobno (data jego zapisu) | `d` — maksymalna głębokość (stan nauki, bez ograniczenia czasowego) | `docs/security/hint-reveals-retencja-signoff.md` (Ryan, 2026-07-22); ADR-018 D1. **Egzekwowanie: BRAK SKRYPTU — dług, termin: pierwsza realna rejestracja studenta** |
| Stan ścieżki nauki (postęp i odpowiedzi) | `curriculum_item_progress`, `curriculum_item_answers` (całe wiersze, w tym `answered_at`) | **czas trwania konta studenta** | utworzenie wiersza | nic (kaskada `student_id ON DELETE CASCADE`) | `docs/security/hint-reveals-retencja-signoff.md` (Ryan, 2026-07-22) — okres podyktowany celem FSRS (model zapominania w skali miesięcy); przegląd przed pierwszą realną rejestracją |
```

**(b)** Przy drabince podpowiedzi w `item-runner.tsx` — jedno zdanie informujące o zapisie, jego
celu i o tym, że wykładowca tego nie widzi (§4.2). Propozycja treści w §4.2; **ostateczne słowa
ustala Sophia (PO)** — jeśli nie zdąży przed scaleniem, wchodzi wersja z §4.2 i Sophia ją potem
przepisuje. Zdanie ma być objęte `aria-live` razem z kontenerem podpowiedzi (domena 14, krok 6
planu Leo).

*Dowód:* (a) wiersze w diffie; (b) asercja w `item-runner.test.tsx` — komunikat obecny w drzewie
dostępności przy pierwszym renderze przycisku podpowiedzi.

---

## 7. Poza tym PR-em — warunki towarzyszące i eskalacja

### R-1 (WAŻNE) — skrypt egzekucji retencji, jeden dla całego rejestru

> **⚠ STATUS 2026-08-12 (Ryan): R-1 JEST DOSTARCZONY. Poniższy tekst to zamówienie z 2026-07-22
> i zostaje w brzmieniu z tamtego dnia** — słowa „dziś", „wymagane" i „skryptu brak" opisują stan
> sprzed dostawy, nie stan bieżący. Dostarczono: `tools/enforce-retention.ts` (tablica reguł
> `RULES`, dziś dwie: `hints-at`, `viva-content`) + test integracyjny
> `tools/__tests__/enforce-retention.integration.test.ts`.
> **Co z zamówienia zostało otwarte:** uruchamianie cykliczne — skrypt nie ma wyzwalacza ani wpisu
> w `package.json`, więc okresy są **egzekwowalne, ale nie egzekwowane automatycznie**. Ta jedna
> pozycja jest długiem; reszta R-1 nie.
> Aktualny status egzekucji per wiersz trzyma **`docs/data/retention.md`** (v0.3), nie ten plik.

Rejestr deklaruje dziś okresy, których nic nie wykonuje: 12 miesięcy dla `viva_answers.content`
(ADR-013 D3, od 2026-07-09) i od tego PR-a 12 miesięcy dla `at[]`. Deklarowana i niewyegzekwowana
retencja jest gorsza niż jej brak — twierdzimy zgodność, której nie da się udowodnić (art. 5 ust. 2).

**Wymagane:** jeden skrypt `tools/` obsługujący **wszystkie** wiersze rejestru, z guardem
`assertTestDb`, trybem `--dry-run` domyślnym i `--execute` jawnym (wzorzec
`remediate-duplicate-submissions.ts`), raportujący liczbę wierszy do przycięcia per reguła.

Szkic operacji dla `at[]` (do dopracowania przez autora skryptu, **nie** gotowa komenda): przepisanie
mapy z odfiltrowaniem wpisów starszych niż 12 miesięcy, z klauzulą `WHERE` zawężającą do wierszy,
które faktycznie mają co przyciąć — żeby przebieg nie dotykał całej tabeli:

```sql
-- DRY-RUN: ile wierszy ma cokolwiek do przycięcia
SELECT count(*) FROM curriculum_item_progress p
WHERE EXISTS (
  SELECT 1 FROM jsonb_each(p.hints_revealed_json) e,
                jsonb_array_elements_text(e.value->'at') t
  WHERE t::timestamptz < now() - interval '12 months'
);
```

Przycięcie zostawia `d` nietknięte — po nim `at.length < d` i to jest stan poprawny (W-3, §8).
**Właściciel:** Ryan (reguła i odbiór) + Ethan (wykonanie, jego domena, delegacja v1.12).
**Termin:** przed pierwszą realną rejestracją studenta (`SESSION_HANDOFF.md:66–71`).

### R-2 (WAŻNE) — okres dla kont nieaktywnych

Reguła „czas trwania konta" jest uczciwa dopiero wtedy, gdy konto ma zdefiniowany koniec. Dziś nie
ma: konto porzucone po jednym logowaniu trzyma dane bezterminowo. To pytanie o cykl życia konta,
nie o ten zapis, więc **nie rozstrzygam go tutaj** — nazywam, żeby nie wyglądało na przemilczane
przy okazji ustalania reguły (b) z §2.
**Właściciel:** Ryan (propozycja) → Sophia (skutek produktowy) → Darek (jeśli dotknie komunikacji
do studenta/uczelni). **Termin:** przed pierwszą realną rejestracją.

### E-1 (ESKALACJA INFORMACYJNA DO DARKA) — brak klauzuli informacyjnej wobec obietnicy złożonej uczelniom

Platforma nie ma klauzuli informacyjnej (art. 13 RODO) — ani pliku, ani trasy, ani tekstu
w regulaminie, bo regulaminu też nie ma. Jednocześnie materiał sprzedażowy dla uczelni
(`docs/pitch/blok-ag-opis-funkcji-dla-uczelni.md:116`) nosi nagłówek **„Prywatność zgodna z RODO —
wbudowana, nie dolepiona"**, a tabela porównawcza (`:150`) przeciwstawia nas konkurencji wierszem
**„Zgody RODO w regulaminie → Wyraźna zgoda w produkcie, wycofywalna jednym kliknięciem"**.

Ocena uczciwa w obie strony: **część twierdzeń jest prawdziwa i sprawdziłem to** — zgody w produkcie
istnieją (paszport A1 z wersjonowaniem, powiadomienia AG.6, placement z delete-on-revoke),
izolacja na poziomie bazy działa (RLS ENABLE+FORCE), panel wykładowcy jest anonimowy. **Część
wyprzedza artefakt:** rejestr retencji ma dwa wiersze i zero egzekucji, klauzuli informacyjnej nie
ma wcale. Dopóki rozmawiamy z uczelniami, a nie ze studentami, nikt tego nie sprawdzi. Pierwsza
rozmowa o umowie powierzenia z działem prawnym uczelni sprawdzi.

To nie jest konsekwencja tego PR-a i go nie blokuje. Jest to decyzja o tym, **co mówimy na zewnątrz
i kiedy to domykamy** — czyli materiał wychodzący, poza moim mandatem Poziomu 2 (CLAUDE.md wartość 2:
„wolimy stracić deal niż obiecać niemożliwe").
**Do decyzji Darka:** czy klauzula informacyjna + regulamin powstają **przed** kolejnym materiałem
dla uczelni, czy przed pierwszą realną rejestracją (kolejność ma znaczenie, bo pierwsza uczelnia
może poprosić o nie wcześniej niż pierwszy student).
**Właściciel wykonania po decyzji:** Ryan (do czasu zatrudnienia Wendy — Legal, Faza 3), treść
produktowa z Sophią.

---

## 8. Sprostowanie do ADR-018 D1 — niezmiennik `at.length ≤ d`

ADR-018 D1 zapisuje: *„dokładnie `d` wpisów"*. Po wprowadzeniu retencji 12-miesięcznej dla `at[]`
(§2) ten niezmiennik przestaje być prawdziwy dla wierszy starszych niż rok: przycięcie usuwa
znaczniki i zostawia `d`. Niezmiennik wiążący to **`at.length ≤ d`**.

- Test z ADR-018 §5 pkt 6 („dwa równoległe `POST /hint` → `d = 2` i **dokładnie 2** wpisy `at`")
  **zostaje bez zmian** — dotyczy świeżego zapisu, gdzie równość obowiązuje.
- Zmiana jest podyktowana wymogiem mojej domeny (retencja), ale ADR należy do Ethana — **odnotowanie
  poprawki w ADR-018 jest jego**, nie moje. Nie edytuję cudzego ADR-a.
- Gdyby Ethan uznał inaczej (np. że przycinamy całe pary `d`+`at`, tracąc stan nauki) — to jest
  decyzja o funkcji produktu, nie o zgodności, i wtedy jego wersja wygrywa, pod warunkiem że okres
  przechowywania w ogóle zostaje. Moim wymogiem jest **istnienie okresu**, nie konkretny sposób
  jego wykonania na strukturze.

---

## 9. Ścieżka wykrycia i wycofania (runbook, nie opis)

**Wykrycie rozjazdu kształtu** — czy ktoś dopisał do mapy pole spoza `{d, at}`:

```sql
SELECT p.id, e.key AS question_item_id, k AS nieznany_klucz
FROM curriculum_item_progress p,
     LATERAL jsonb_each(p.hints_revealed_json) AS e,
     LATERAL jsonb_object_keys(e.value) AS k
WHERE k NOT IN ('d','at');
```

Wynik niepusty = kolumna niesie dane, których ten dokument nie ocenił. Reakcja: zatrzymać pisarza,
ustalić, od kiedy pisze (git blame na `hints.ts`), ocenić kategorię, dopiero potem czyścić.

**Wykrycie rozjazdu precyzji** — czy zapisujemy więcej niż pełne sekundy UTC:

```sql
SELECT count(*) FROM curriculum_item_progress p,
     LATERAL jsonb_each(p.hints_revealed_json) AS e,
     LATERAL jsonb_array_elements_text(e.value->'at') AS t
WHERE t !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$';
```

**Wycofanie samego zapisu znaczników** (gdyby okazał się niepotrzebny po 1E.4): wyzerowanie list
`at` przy zachowaniu `d` — operacja transakcyjna `UPDATE … WHERE`, bez `DROP` kolumny (migracje są
tylko-do-dopisywania). Kolumna zostaje pusta i nieczytana, jak w rollbacku z ADR-018 §4.

**Wycofanie całej migracji `0039`:** revert PR-a, ścieżka Ethana (delegacja v1.12) — bez zmian
wobec ADR-018.

---

## 10. Self-critique — pięć słabości tego werdyktu, nazwanych zamiast wygładzonych

Rola przyjęta: head of GRC firmy SaaS świeżo po audycie SOC 2 Type II.

1. **Deklaruję okres, którego nic nie egzekwuje.** To jest ten sam błąd, który już raz popełniono
   w tym rejestrze (viva, 12 miesięcy, skryptu brak od 2026-07-09). Złagodzenie: dług wchodzi do
   **treści wiersza rejestru** (W-8a), więc widać go przy każdym kolejnym wpisie, a R-1 żąda jednego
   skryptu dla całego rejestru zamiast trzeciego skryptu per reguła. Nie usuwa to problemu — przesuwa
   go w miejsce, gdzie nie da się go przeoczyć.
2. **W-4 i W-7 to komentarz i konwencja, nie bramka.** Realnie blokuje tylko `.max(3)` z W-3 (pęknie
   test po zmianie semantyki) i `grep` w review. Kandydat na prawdziwą bramkę: rozszerzenie
   `tools/k3-validate.ts` o test „kolumny JSONB klasy K-INT mają zadeklarowany schemat parsujący
   i jedynego czytelnika" — poza zakresem tego PR-a, zgłaszam jako kandydata przy najbliższej
   iteracji strażnika.
3. **Nie ustaliłem okresu dla kont nieaktywnych**, przez co reguła „czas trwania konta" jest przy
   koncie porzuconym równoważna „bezterminowo". Uczciwie wydzielone jako R-2 z właścicielem
   i terminem, a nie schowane w słowie „konto".
4. **Przegapiłem tę klasę przy własnym sign-offie 2026-07-11** — trzy tabele K-INT przeszły bez
   ustalenia okresu przechowywania. Zapisane w §2 wprost. Wniosek procesowy na przyszłość: pytanie
   „jaki jest okres przechowywania" wchodzi do stałej listy kontrolnej mojego sign-offu tabel K-INT,
   obok izolacji, grantów i kaskady. Dziś tej pozycji na liście nie było — dlatego jej brak
   przeszedł.
5. **Zdanie dla studenta (W-8b) nie jest klauzulą informacyjną** i nie udaje, że nią jest —
   art. 13 wymaga podstawy prawnej, okresu i praw, czego jedno zdanie przy przycisku nie udźwignie.
   Ryzyko: zespół uzna temat za zamknięty, bo „przecież informujemy". Dlatego E-1 jest osobną
   eskalacją z własnym terminem, a nie przypisem do W-8.

---

## 11. Właściciel i przegląd

**Właściciel dokumentu:** Ryan (CRCO). **Data przeglądu:** przy pierwszej realnej rejestracji
studenta (bramka zdarzeniowa), najpóźniej **2026-10-22** (kwartał). Przegląd obejmuje: czy R-1
(skrypt egzekucji) domknięte, czy R-2 (konta nieaktywne) rozstrzygnięte, czy E-1 rozstrzygnięte
przez Darka, czy okres 12 miesięcy dla `at[]` ma pokrycie w realnym użyciu cechy przez 1E.4,
czy zapytania wykrywające z §9 zwracają pusto.
