# Rejestr czynności przetwarzania (RoPA) — SkillBridge

> **RoPA** (Records of Processing Activities) = rejestr czynności przetwarzania z **art. 30 RODO**:
> wewnętrzny wykaz „co, po co, na jakiej podstawie, jak długo i jak chronimy" — dokument
> **rozliczalności** (art. 5 ust. 2), nie tekst pokazywany osobie (tym jest klauzula informacyjna
> z art. 13 — osobny artefakt, którego jeszcze nie ma; patrz E-1 w
> `docs/security/hint-reveals-retencja-signoff.md` §7).

**Wersja:** v0.5 · 2026-08-10 · **Owner:** Ryan (CRCO nordsignal) → Wendy (Legal) od Fazy 3.
**Administrator danych:** nordsignal (podmiot w rejestracji — NIP TBD, trigger A/B/C, CLAUDE.md §9).
**Status:** **rejestr minimalny, zasiany** — założony przy sign-offie FSRS (1E.4, rls-matrix v0.30).
Kompletny przegląd wszystkich czynności przetwarzania w produkcie = **Wendy, Faza 3**, przed pierwszą
realną rejestracją studenta. Poniższe wpisy to stan wiedzy zweryfikowany na kodzie na dziś.

**Changelog v0.4 → v0.5 (2026-08-10) — Ryan (CRCO), zadanie E2b pakietu RODO. Pięć zmian, z czego
trzy to sprostowania moich własnych zdań.**

1. **Nowa sekcja „Oświadczenie administratora — populacja kont na produkcji"** (przed wykazem
   czynności). To **jedyny nośnik** ustalenia, kim są konta na produkcji; wpisy #6 i #7 tę sekcję
   **wołają, nie powtarzają** (CLAUDE.md v1.17: jedna reguła — jedno miejsce). Powodem powstania jest
   sprostowanie 0.5 mojego ADR (`E1`): przesłanka „28 kont testowych Darka" **nie miała pokrycia
   w pomiarze**.
2. **Sprostowanie klasy ryzyka długu A-1 we wpisie #6** — stare brzmienie zacytowane dosłownie,
   klasa **podniesiona z INFO na WAŻNE dla danych**, mimo że odpowiedź administratora wypadła
   korzystnie. Uzasadnienie w sekcji oświadczenia i we wpisie #6.
3. **Sprostowanie zasięgu obietnicy append-only we wpisie #6** — zdanie „wiersza nie usunie ani nie
   zmieni nawet właściciel bazy" jest **ścisłe dla `UPDATE`/`DELETE`/`TRUNCATE`** i **nieścisłe jako
   zdanie ogólne** (przebudowa tabeli; brak wyzwalacza zdarzeń języka definicji danych). Zmierzone
   wykonaniem przez Maxa, potwierdzone odczytem produkcji przez Ethana.
4. **Sprostowanie wpisu #4** — obietnica „delete-on-revoke" opisuje `placement_events` i **nie
   obejmuje śladu decyzji o zgodzie**, którego broni wyzwalacz append-only. Nowa sekcja „Wpis #4 —
   sprostowanie zakresu «delete-on-revoke»".
5. **Nowy wpis #7 — rejestr uczestników pilotażu (`pilot_participants`).** Wpis **wyprzedza
   wdrożenie**: migracja `0047` nie jest zastosowana na produkcji (pomiar E0, cytat we wpisie).

Zmiana **policy-only** — żaden kod, hook ani migracja nie ruszone. Wpisy #1, #2, #3 i #5 bez zmian
co do zakresu danych, podstawy prawnej i retencji.

**Changelog v0.3 → v0.4 (2026-08-01) — nowy wpis #6 „Ślad rozliczalności i bezpieczeństwa (`audit_log`)"; Ryan (CRCO).** Powód: rozstrzygając dopuszczenie zdarzenia `curriculum.placement.skipped` (`docs/data/audit-log-taksonomia.md` v0.1) ustaliłem, że **`audit_log` w ogóle nie występuje w tym rejestrze** — a przechowuje `actor_id` (identyfikator studenta dla części zdarzeń), adres IP i podpis przeglądarki, czyli dane osobowe. Nie mogłem dopuścić nowej kategorii wierszy do magazynu nieopisanego w rejestrze (art. 30 ust. 1), więc wpis #6 jest **warunkiem tamtego rozstrzygnięcia**, nie osobną inicjatywą. Wpis nazywa też **dług A-1**: `actor_id` jest zwykłym `text` bez klucza obcego i bez kaskady, a wyzwalacz append-only z migracji `0008` blokuje `DELETE` nawet właścicielowi — dla zdarzeń zapisujących `actor_id` studenta **usunięcie z art. 17 jest dziś strukturalnie niewykonalne**. Klasa: WAŻNE dla kontroli, INFO dla danych (zero prawdziwych studentów); próg naprawy — **przed pierwszą prawdziwą rejestracją**. Zmiana **policy-only** — żaden kod, hook ani migracja nie ruszone; wpisy #1–#5 bez zmian.

**Changelog v0.2 → v0.3 (2026-07-26) — nowy wpis #5 „Automatyczne dopasowanie ścieżki nauki
(placement curriculum)"; Ryan (CRCO), bramka projektowa PRZED implementacją 1E.7 L3.** Powód
osobnego wpisu, a nie dopisania do #3 (profilowanie FSRS): **inny cel przetwarzania** (otwarcie
nawigacji po drabinie kontra harmonogram powtórek — art. 30 ust. 1 lit. b wymaga celów, a zlanie
dwóch celów w jeden wpis kasuje sens rejestru), **inna retencja** (nośnik uprawnienia kontra ślad)
i — rozstrzygające — **pierwsza w produkcie zautomatyzowana decyzja zmieniająca dostęp człowieka do
materiału**, więc ocena art. 22 musi mieć własne miejsce, a nie pożyczać uzasadnienia napisanego dla
FSRS. ⚠ **Nie mylić z wpisem #4** („Zdarzenia zawodowe / placement", `placement_events`, podstawa
= zgoda): słowo „placement" oznacza w tych dwóch wpisach **dwie zupełnie różne rzeczy** — #4 to
staż/praca (dane zawodowe, zgoda odwoływalna, delete-on-revoke), #5 to otwarcie modułu w drabinie
nauki (wykonanie umowy, bez zgody). Kolizja nazewnicza jest znana i celowo nazwana tutaj, żeby
Wendy nie scaliła obu wpisów w Fazie 3. Zmiana **policy-only, przed kodem** — migracja `0045` nie
istnieje jeszcze w chwili tego wpisu; wpis jest bramką jej projektu, nie opisem stanu wdrożonego
(status jawnie oznaczony w treści wpisu).

**Changelog v0.1 → v0.2 (2026-07-26) — sprostowanie opisu środków bezpieczeństwa we wpisie #3
(art. 30 ust. 1 lit. g); Ryan (CRCO), samodoniesienie.** W v0.1 napisałem „RLS ENABLE+FORCE na obu
tabelach" jako opis środka. Zdanie jest formalnie prawdziwe (FORCE jest ustawione), ale **sugeruje
egzekucję na poziomie bazy szerszą niż faktyczna** — polityka `owner_passthrough` z migracji `0012`
przepuszcza właściciela bezwarunkowo, więc FORCE wiąże rolę wykonawczą (`app_runtime`), a nie
ścieżki idące połączeniem właściciela. Podpisałem tamten opis, opierając się na macierzy RLS zamiast
na własności sprawdzonej na produkcji. Weryfikacja produkcji 2026-07-26 wypadła **korzystnie**
(aplikacja faktycznie łączy się rolą `app_runtime`, `NOBYPASSRLS`), ale prostuję mimo korzystnego
wyniku: rejestr ma opisywać środki takimi, jakie są, również wtedy, gdy prawda jest po naszej
stronie. Pełny ślad ustalenia faktu i klasyfikacja:
`../../../docs/audyty/2026-07-26-rls-bypassrls-prod.md` (v0.2). Zmiana **policy-only** — żaden kod,
hook ani migracja nie ruszone; wpis #3 co do zakresu danych, podstawy prawnej, retencji i
minimalizacji **bez zmian**.

**Podstawa istnienia tego pliku:** decyzja Ryana (CRCO) w domenie ryzyka/RODO — akt **wewnętrzny,
odwracalny, bez wydatku, niewychodzący na zewnątrz, spoza plików rządzenia** (CLAUDE.md §5, stała
władza Poziomu 2). Opublikowanie klauzuli informacyjnej studentom to akt **wychodzący** — poza tym
mandatem, idzie do Darka (E-1).

---

## Oświadczenie administratora — populacja kont na produkcji (2026-08-10)

> **JEDYNY NOŚNIK tego ustalenia w repozytorium.** Wpisy #6 i #7, taksonomia zdarzeń
> (`docs/data/audit-log-taksonomia.md` §6) i każdy przyszły dokument, który potrzebuje odpowiedzi
> na pytanie „czy na produkcji są dane osób trzecich", **odsyłają tutaj i nie powtarzają treści**.
> Powód jest zmierzony, nie teoretyczny: poprzednia wersja tego ustalenia żyła w **dwóch** kopiach
> (tu i w taksonomii §6), obie były nieprawdziwe i obie trzeba było prostować osobno.

**Status: BRZMIENIE DO PODPISU — jeszcze niepodpisane.** Do chwili podpisu nikt nie cytuje treści
poniżej jako oświadczenia administratora; wolno cytować wyłącznie pomiar (sekcja „Co zmierzono")
i moją klasyfikację ryzyka, która jest **moja**, nie jego.

### Dlaczego to w ogóle powstaje — sprostowanie mojej własnej przesłanki

W `ropa.md` v0.4 (wpis #6) i w taksonomii §6 napisałem zdanie, które przez dziewięć dni pełniło rolę
ustalonego faktu. **Stare brzmienie, cytowane dosłownie:**

> „**Klasa: WAŻNE dla kontroli, INFO dla danych.** Zero prawdziwych studentów; 28 kont testowych
> Darka (administrator i podmiot danych to ta sama osoba). **Nie ma dziś zagrożonego podmiotu
> danych.**"

Nie sprawdziłem go ani wtedy, ani przy trzech kolejnych wersjach ADR. Sprawdził je pomiar zlecony
z zewnątrz (E0, Ethan). Ta przesłanka działała **na moją korzyść w dwie strony naraz**: czyniła mój
własny dług lżejszym („INFO dla danych") i zwalniała mnie z pilności („próg: przed pierwszą
prawdziwą rejestracją"). To jest dokładnie klasa przesłanki, o której mówi CLAUDE.md §8 v1.16 —
reguła, której jestem autorem.

### Co zmierzono (pomiar E0, wykonawca Ethan, projekt Neona `long-pond-11214233`, gałąź domyślna `br-proud-sun-al3aezrj`, odczyt 2026-08-10 14:36–14:52 UTC, transakcja tylko do odczytu)

```
-- E3. konta i sesje — punkt odniesienia
[{ "students": "30", "users": "33", "tenants": "3",
   "assessment_sessions": "5", "project_submissions": "5" }]

-- J2. podsumowanie populacji 33 kont wg klasy domeny
A. demo (seed, w kodzie)                          15
B. domena firmowa (nordsignal.cc)                  3
C. TLD zarezerwowany .invalid                      1
D. domena zarezerwowana RFC 2606                   2
E. domena weryfikacyjna (commit 9a0c97f)           2
F. domena konsumencka — WYMAGA KLASYFIKACJI       10

-- J1 (wyciąg): z 10 kont klasy F dokładnie JEDNO ma adres Darka.
-- J3. kont klasy F: 10 · ma_students: 10 · ma_sesje: 1 · ma_zgloszenia: 4
-- K1. sposob logowania klasy F: credential 8 kont · google 2 konta
```

Czyli: **9 kont na prawdziwych domenach pocztowych, których pomiar nie potrafi przypisać do
zespołu.** Wszystkie mają wiersz `students`, **4 mają zgłoszenia projektów**, jedno logowało się
przez Google adresem zweryfikowanym, niebędącym adresem Darka. Pomiar **nie rozstrzyga**, czyje to
konta — w bazie nie ma pola, które to rozstrzyga.

### Odpowiedź administratora i co dokładnie domyka

Darek odpowiedział 2026-08-10, godz. 17:06 (czas lokalny), wyborem z przedstawionych wariantów:
**„Znam je — to moje albo proszeni znajomi."** Źródło tej wiedzy: przekaz w zleceniu Olivera (COO);
**to jest powód, dla którego wymagam podpisu — moja parafraza cudzej wypowiedzi nie jest
oświadczeniem administratora i nie może nim zostać przez samo zapisanie jej w pliku.**

Odpowiedź domyka trzy człony mojego starego zdania **różnie** i to jest sedno:

| Człon starego zdania | Stan po odpowiedzi |
|---|---|
| „28 kont testowych" | **NIEPRAWDA** i odpowiedź tego nie zmienia — kont jest **33**, wierszy `students` **30**. Liczba była zmyślona niezależnie od tego, czyje są konta |
| „zero prawdziwych studentów" | **potwierdzone w wąskim znaczeniu**: nie ma podmiotu danych **nieznanego administratorowi**. Zwrot „prawdziwy student" wycofuję jako mylący — znajomy, który przeszedł ścieżkę, jest **prawdziwym podmiotem danych**, choć nie jest studentem uczelni-partnera |
| „administrator i podmiot danych to ta sama osoba" | **NADAL NIEPRAWDA dla części zbioru.** „Proszeni znajomi" to **osoby trzecie** — osoby fizyczne, którym przysługują prawa z rozdziału III RODO i którym należała się informacja z art. 13 **w chwili zbierania danych** |

**Ekspozycja spadła o rząd wielkości — nie do zera.** Znani, osiągalni, dający się poinformować,
zbiór domknięty i policzalny; ale istnieją i mają prawa. Zdanie „nie ma dziś zagrożonego podmiotu
danych" **nie wraca do obiegu w żadnym brzmieniu.**

### Klasyfikacja ryzyka — moja, nie administratora

**Klasa długu A-1: WAŻNE dla kontroli · WAŻNE dla danych** (podniesione z „INFO dla danych").
Podnoszę klasę **mimo korzystnej odpowiedzi**, i to jest świadome:

1. **Obowiązek z art. 13 już powstał i nie został wykonany.** Powstaje w chwili zbierania danych od
   osoby, nie przy „oficjalnym" starcie. Klauzula informacyjna nie istnieje w żadnym pliku —
   zweryfikowane przeze mnie (odczyt 2026-08-10 15:17 UTC):
   `git ls-tree -r --name-only origin/main | grep -i "klauzul\|art-13\|informacyjn"`
   → **zero trafień, kod wyjścia 1**. Wyjątek z art. 13 ust. 4 (osoba już dysponuje
   informacjami) trzeba by **wykazać per osoba**; rozmowa przy proszeniu o test tego nie wykazuje.
2. **Art. 17 jest dla tych osób dziś niewykonalny z dwóch niezależnych powodów** — nie ma ścieżki
   usunięcia konta w produkcie **oraz** wiersze `audit_log` z ich identyfikatorem, adresem IP
   i sygnaturą przeglądarki są chronione wyzwalaczem append-only. Pierwszy człon zmierzony przeze
   mnie (odczyt 2026-08-10 15:17 UTC): `git grep -c "deleteUser" origin/main -- .` → **zero
   trafień, kod wyjścia 1**; `git grep -n "delete(user)" origin/main -- src/ tools/` → **trzy
   trafienia, wszystkie poza produktem**: `src/lib/db/seed.ts:92` (zasiew) oraz
   `tools/b5-contract-test.ts:392,393` (sprzątanie po teście kontraktowym).
3. **Cztery z tych kont mają zgłoszenia projektów**, czyli przeszły ścieżkę produktu, a nie samo
   założenie konta.

**Dlaczego mimo to nie KRYTYCZNE:** zbiór jest domknięty i imiennie znany administratorowi, osoby są
osiągalne, dane nie opuszczają platformy (brak odbiorców zewnętrznych), nie ma wśród nich kategorii
z art. 9, a naprawa jest w toku i ma nazwanego wykonawcę. Ryzyko jest realne i ograniczone —
i tak je nazywam.

**Co podnosi klasę do KRYTYCZNEJ — cztery progi, żeby „WAŻNE" nie było przymiotnikiem bez warunku.
Wystarczy pierwszy z brzegu:**

1. **Którakolwiek z tych osób zgłasza żądanie z rozdziału III** (dostęp, usunięcie, sprzeciw) —
   od tej chwili niewykonalność art. 17 przestaje być ryzykiem, a staje się **naruszeniem
   w toku**.
2. **Okazuje się, że któregoś konta administrator jednak nie zna** — wtedy upada cała podstawa
   tej klasyfikacji, bo znikają „znani i osiągalni".
3. **Termin 2026-08-24 mija bez przekazania informacji z art. 13** — zwłoka przestaje być
   nazwana i policzalna, a staje się zaniechaniem.
4. **Rejestruje się pierwsza osoba pozyskana kanałem publicznym** przed domknięciem pakietu —
   niezależnie od stanu tych 9 kont.

**Kto pilnuje progów:** Ryan (CRCO). Próg 1 i 2 są zdarzeniowe i eskalują natychmiast do Darka;
próg 3 sprawdza się z kalendarza; próg 4 jest wprost warunkiem ukończenia pakietu RODO.

### Próg naprawy — rozdzielony na przeszłość i przyszłość

| Kierunek | Próg | Właściciel |
|---|---|---|
| **Przyszłość** — pierwsza osoba **nieznana administratorowi** | pakiet RODO domknięty (klauzula art. 13 widoczna w rejestracji + wykonalne art. 17) **przed** jej rejestracją | Oliver (pakiet), Darek (sign-off klauzuli) |
| **Przeszłość** — osoby trzecie już w bazie | informacja z art. 13 **post factum**, rekomendacja niżej | **Darek** — akt wychodzący na zewnątrz, poza moim mandatem Poziomu 2 |

### Rekomendacja: informacja post factum dla znajomych — TAK, ale po domknięciu pakietu

To jest moja ocena, nie decyzja: **poinformować, jednorazowo i imiennie, po domknięciu pakietu RODO,
najpóźniej 2026-08-24.** Trzy powody i jeden warunek zrywający:

1. **Informacja wysłana dziś musiałaby zawierać zdanie nieprawdziwe albo wstydliwe.** Klauzula mówi
   m.in. „możesz żądać usunięcia danych". Dziś nie umiemy tego wykonać. Obietnica bez pokrycia jest
   gorsza niż tydzień zwłoki — to ta sama zasada, dla której cały pakiet ma taką, a nie inną
   kolejność.
2. **Jeden nośnik.** Treść, którą wyślemy znajomym, to **ta sama** klauzula z art. 13, którą E2c
   pisze dla rejestracji. Napisanie osobnego listu teraz i klauzuli za tydzień daje dwie wersje tej
   samej informacji, które natychmiast się rozjadą.
3. **Zwłoka jest krótka, nazwana i ma termin.** Zwłoka bez terminu byłaby ukryciem sprawy.

**Warunek zrywający (unieważnia punkty 1–3):** jeżeli którakolwiek z tych osób **zapyta wcześniej**
o swoje dane, o ich usunięcie albo o cokolwiek z rozdziału III — odpowiadamy **natychmiast**
i uczciwie, w tym o tym, czego dziś nie umiemy zrobić. Czekanie na pakiet dotyczy naszej inicjatywy,
nigdy cudzego pytania.

**Czego do informacji post factum brakuje i kto to daje:** rozdziału 9 kont na „moje własne adresy"
i „osoby trzecie". Bez tego lista adresatów nie istnieje. **Domyślnie zamknięte:** dopóki podziału
nie ma, wszystkie 9 traktujemy jako osoby trzecie — pomyłka w tę stronę kosztuje jeden zbędny list,
pomyłka w drugą stronę kosztuje pominiętą osobę.

### BRZMIENIE DO PODPISU

> **Oświadczenie administratora danych — populacja kont na produkcji SkillBridge**
>
> Ja, Dariusz Grądzik, działając jako administrator danych (nordsignal, podmiot w rejestracji),
> oświadczam co następuje wobec stanu bazy produkcyjnej zmierzonego 2026-08-10 (33 konta `user`,
> 30 wierszy `students`, projekt Neona `long-pond-11214233`, gałąź `br-proud-sun-al3aezrj`):
>
> 1. **Znam pochodzenie wszystkich kont na produkcji.** Żadne z nich nie należy do osoby nieznanej
>    mi osobiście. Nie zarejestrował się dotąd żaden student uczelni-partnera ani żadna osoba
>    pozyskana kanałem publicznym.
> 2. **Konta dzielą się na dwie grupy:** (a) konta założone przeze mnie lub przez zespół
>    (w tym techniczne, weryfikacyjne i demonstracyjne); (b) konta osób, które **osobiście
>    poprosiłem o przejście ścieżki produktu**.
> 3. **Przyjmuję do wiadomości, że osoby z grupy (b) są osobami trzecimi i podmiotami danych**
>    w rozumieniu RODO — przysługują im prawa z rozdziału III, a informacja z art. 13 była im
>    należna w chwili zakładania konta i **nie została im przekazana**.
> 4. Liczba kont z grupy (b): ______ (do uzupełnienia; brak uzupełnienia = wszystkie 9 kont
>    z pomiaru J1/J3 traktujemy jako grupę (b)).
> 5. **Zobowiązuję się przekazać tym osobom informację z art. 13** po domknięciu pakietu RODO,
>    najpóźniej do **2026-08-24**, a na wcześniejsze pytanie którejkolwiek z nich — odpowiedzieć
>    niezwłocznie.
> 6. **Zakres tego oświadczenia.** Dotyczy wyłącznie stanu na 2026-08-10 i wyłącznie bazy
>    produkcyjnej. Nie obejmuje rejestracji późniejszych, kopii zapasowych ani środowisk innych
>    niż produkcyjne. Nie jest zgodą na rejestrację kogokolwiek spoza zespołu przed domknięciem
>    pakietu RODO.
>
> Data: __________  ·  Podpis: __________

**Po podpisaniu** wpisz tutaj datę podpisu i usuń nagłówek „BRZMIENIE DO PODPISU"; wersja tego pliku
idzie wtedy na v0.5.1, a sam podpis **nie zmienia** klasyfikacji ryzyka wyżej — ona jest moja
i zmienia ją wyłącznie nowy pomiar albo nowa okoliczność.

---

## Czynności przetwarzania

| # | Czynność | Podstawa prawna | Zgoda? | Retencja | Odbiorcy zewn. |
|---|---|---|---|---|---|
| 1 | Konto i uwierzytelnianie (Better Auth: e-mail, hasło/OAuth Google) | art. 6 ust. 1 lit. b (umowa) | nie | czas trwania konta (kaskada) | brak *(wpis skrócony — do uzupełnienia, Wendy Faza 3)* |
| 2 | Mapowanie kompetencji i analiza luk (sylabus → kompetencje → rynek) | art. 6 ust. 1 lit. b (umowa) | nie | czas trwania konta | brak *(wpis skrócony)* |
| **3** | **Profilowanie uczenia się — dobór i harmonogram powtórek (FSRS)** | **art. 6 ust. 1 lit. b (umowa)** | **nie** | `review_logs` 12 m-cy; `review_states` czas trwania konta | **brak** |
| 4 | Zdarzenia **zawodowe** / placement zawodowy (staż, praca — deklarowane) | art. 6 ust. 1 lit. a (zgoda) | **tak** — odwoływalna, delete-on-revoke **co do `placement_events`** (zasięg sprostowany w v0.5 — patrz sekcja „Wpis #4 — sprostowanie") | do odwołania zgody; ślad decyzji o zgodzie wg wpisu #6 | brak *(wpis skrócony)* |
| **5** | **Automatyczne dopasowanie ścieżki nauki (placement curriculum — odblokowanie modułów wynikiem diagnozy)** | **art. 6 ust. 1 lit. b (umowa)** | **nie** | `curriculum_placements` — czas trwania konta | **brak** |
| **6** | **Ślad rozliczalności i bezpieczeństwa (`audit_log`)** | **art. 6 ust. 1 lit. f (prawnie uzasadniony interes) + art. 5 ust. 2 / art. 32** | **nie** | **bezterminowa — tabela append-only; patrz dług A-1** | **brak** |
| **7** | **Rejestr uczestników pilotażu (`pilot_participants`) — kto liczy się jako obserwacja w mierniku** | **art. 6 ust. 1 lit. f (prawnie uzasadniony interes: ewaluacja własnej reguły produktowej)** | **nie** — ale **przysługuje sprzeciw z art. 21** | czas trwania konta studenta; przegląd przy zamknięciu kohorty (`docs/data/retention.md`) | **brak** |

Pełny opis niżej mają **wpis #3** (przedmiot sign-offu 1E.4), **wpis #5** (bramka projektowa
1E.7 L3), **wpis #6** (warunek rozstrzygnięcia taksonomii `audit_log`) i **wpis #7** (bramka
projektowa migracji `0047`). Wpisy 1/2/4 są zasiane skrótowo — Wendy uzupełnia je w Fazie 3 do
pełnego formatu art. 30; wpis #4 ma od v0.5 **sprostowanie zasięgu**, niżej.

> ⚠ **Wpis #4 i wpis #5 to dwie różne czynności mimo wspólnego słowa „placement".** #4 =
> **placement zawodowy** (student deklaruje staż/pracę; dane zawodowe, zgoda, tabela
> `placement_events`). #5 = **placement curriculum** (system otwiera moduł drabiny na podstawie
> wyniku diagnozy; brak danych zawodowych, podstawa umowna, tabela `curriculum_placements`).
> Różne cele, różne podstawy prawne, różne retencje, różne tabele. **Nie scalać.**

---

## Wpis #4 — sprostowanie zakresu „delete-on-revoke" (v0.5, Ryan)

**Znalazł to Max przy wycenie A-1 (E1, v1.1 §1c); przyjmuję bez oporu, bo dotyczy mojego zdania.**

**Stare brzmienie, cytowane dosłownie** (v0.4, wiersz #4 wykazu oraz changelog v0.2 → v0.3):

> „zgoda odwoływalna, **delete-on-revoke**" · „#4 to staż/praca (dane zawodowe, zgoda odwoływalna,
> **delete-on-revoke**)"

**Stan faktyczny — zweryfikowany na kodzie, nie na opisie** (`git show
origin/main:src/app/api/placement/consent/route.ts`, odczyt 2026-08-10). Cofnięcie zgody wykonuje
w **jednej transakcji** dwie rzeczy, a trzecią **dopisuje po niej**:

```
.update(students).set({ placementConsent: consent, placementDecidedAt: new Date(), … })
if (!consent) { await tx.delete(placementEvents).where(eq(placementEvents.studentId, updated[0].id)); }
…
await recordAudit({ actorType: "student", actorId: result,
                    action: consent ? "placement.consent.granted" : "placement.consent.revoked",
                    targetType: "student", targetId: result, ...auditContextFromRequest(req) });
```

| Co dzieje się przy cofnięciu zgody | Stan |
|---|---|
| Wiersze `placement_events` (deklarowane dane zawodowe) | **znikają** — `DELETE` w tej samej transakcji. Obietnica dotyczyła tego i **tu jest prawdziwa** |
| `students.placement_consent = false`, `students.placement_decided_at` | **zostają** — i tak ma być: to jedyny nośnik dowodu, że zgoda została wycofana (art. 7 ust. 1, art. 5 ust. 2). Znikają dopiero z kontem (kaskada) |
| Wiersze `audit_log`: `placement.consent.granted` i `.revoked` | **zostają na zawsze** — broni ich wyzwalacz append-only. Niosą dziś `actor_id`, adres IP i sygnaturę przeglądarki |

**Wniosek:** „delete-on-revoke" opisuje **jedną z trzech** rzeczy i jako opis czynności #4 mówi
więcej, niż daje. Prostuję zasięg, **nie mechanizm** — kasowanie `placement_events` działa i jest
poprawne.

**Co z tego wynika, konkretnie:**

1. **Dla klauzuli art. 13 (E2c) — wiążące.** Nie wolno napisać „po cofnięciu zgody usuwamy wszystkie
   związane z nią dane". Właściwe zdanie rozdziela: *znikają zgłoszone dane o stażu i pracy; zostaje
   sam zapis, że zgoda była udzielona i została cofnięta — bez tego nie umielibyśmy wykazać, że
   uszanowaliśmy Twoją decyzję.*
2. **Dług A-1 dotyczy także tej czynności.** Ślad zgody niesie dziś identyfikator studenta w **dwóch**
   kolumnach naraz (`actor_id` i `target_id`, ta sama wartość) plus kontekst żądania. Po wykonaniu
   kierunku (a+) nowe wiersze nie będą niosły ani `actor_id`, ani adresu IP — **istniejące zostaną
   z nimi na zawsze** (2 wiersze `placement.consent.granted` na produkcji, pomiar E0).
3. **Rozstrzygnięcie zakresu:** `placement.consent.*` **wchodzi** do naprawy A-1 (decyzja D-1 ADR
   E1) — wbrew mojemu werdyktowi z 2026-08-01, w którym tego zdarzenia w ogóle nie wymieniłem.

---

## Wpis #3 — Profilowanie uczenia się (FSRS)

**Czynność.** Automatyczny dobór, jakie koncepty i kiedy wrócą do studenta jako powtórka, na
podstawie historii jego ocen (algorytm FSRS — rozłożone w czasie powtórki). To **profilowanie
w rozumieniu art. 4 pkt 4 RODO** (zautomatyzowana ocena aspektu osoby — tu: postęp i trwałość
wiedzy), realizowane od zapłonu flagi `FLAG_SPACED_REPETITION` (dziś OFF, 0 wierszy).

**Kategorie osób.** Studenci uczelni-partnerów korzystający z platformy.

**Kategorie danych.** Klasa **K-INT** (wewnętrzne nie-PII), tabele `review_states` + `review_logs`
(migracja `0042`):
- parametry pamięci per koncept: `stability`, `difficulty`, `due`, `reps`, `lapses`;
- oceny powtórek: `rating` (1–4) i pochodne silnika (`stability_before/after`, `elapsed/scheduled_days`, `reviewed_at`).
- **Zero treści wolnej, zero PII bezpośredniego.** Powiązanie ze studentem wyłącznie przez `student_id`
  (identyfikacja dopiero po join do `students` — pseudonimizacja na poziomie tabeli).

**Cel.** Funkcja **rdzeniowa** produktu edukacyjnego: rozłożyć powtórki tak, by materiał wracał
w momencie bliskim zapomnienia (istota metody). Wtórnie: kalibracja parametrów silnika FSRS.

**Podstawa prawna: art. 6 ust. 1 lit. b RODO — wykonanie umowy.** Bez profilu powtórek produkt nie
realizuje swojej podstawowej usługi — to nie jest funkcja opcjonalna. Dlatego **bez osobnej zgody**,
w świadomym odróżnieniu od `placement_events` (wpis #4), gdzie dane zawodowe są opcjonalne i oparte
na **zgodzie** (art. 6 ust. 1 lit. a, odwoływalnej, delete-on-revoke). Granica: dane niezbędne do
działania rdzenia usługi = umowa; dane opcjonalne ponad rdzeń = zgoda.

**Art. 22 (zautomatyzowane decyzje) — nie dotyczy.** Werdykt FSRS jest **formujący** („do nauki",
CLAUDE.md §7) — nie wywołuje skutków prawnych ani podobnie istotnych i **nie wychodzi na zewnątrz**
jako dowód kompetencji. Nie trafia do Paszportu (kredencjał wysokiej stawki) ani do panelu
wykładowcy: `review_states` — `app_faculty` bez grantu; `review_logs` — DENY-both (`REVOKE ALL`
app_student+app_faculty). Nikt poza samym studentem (i silnikiem owner-side) nie widzi profilu.

**Odbiorcy zewnętrzni.** Brak. Dane nie opuszczają platformy. Podprocesorzy infrastruktury (Neon,
Vercel) — rejestr sub-procesorów prowadzony osobno, poza zakresem tego wpisu.

**Retencja.** `review_logs` — 12 miesięcy (ślad behawioralny, art. 5 ust. 1 lit. e); `review_states`
— czas trwania konta (stan roboczy). Szczegóły i uzasadnienie: `docs/data/retention.md`.
Art. 17 (usunięcie): `student_id ON DELETE CASCADE` na obu tabelach — kasowanie konta czyści profil
automatycznie.

**Środki bezpieczeństwa** *(sprostowane w v0.2 — patrz changelog; poprzednie brzmienie sugerowało
egzekucję szerszą niż faktyczna)*. Kontrola dostępu do obu tabel opiera się na trzech środkach,
wymienionych w kolejności, w jakiej działają:

1. **Uprawnienia roli (deny-by-default).** `review_states` — `GRANT` wyłącznie na `SELECT` dla
   `app_student`, zapisy po stronie serwera; `review_logs` — **zero grantów** dla ról aplikacyjnych
   (`REVOKE ALL` dla `app_student` i `app_faculty`). `app_faculty` nie ma dostępu do żadnej z tabel.
   To środek najmocniejszy, bo działa niezależnie od poprawności zapytań.
2. **Filtr w zapytaniu (warstwa aplikacji).** Każde zapytanie na danych studenta wyprowadza
   tożsamość z sesji i filtruje jawnym warunkiem `WHERE`. **Na ścieżkach idących połączeniem
   właściciela bazy jest to środek jedyny** — patrz zastrzeżenie niżej.
3. **RLS ENABLE+FORCE + polityka `student_sees_own`** (przez `app.current_user_id`). Egzekwowane
   **dla połączeń rolą wykonawczą `app_runtime`** (`NOBYPASSRLS`), którą aplikacja nawiązuje
   połączenie z bazą — zweryfikowane na produkcji 2026-07-26.

> **Zastrzeżenie co do zasięgu środka 3 (jawnie, bo rejestr nie ma obiecywać więcej, niż daje).**
> `FORCE ROW LEVEL SECURITY` **nie** wiąże połączeń nawiązanych rolą właściciela bazy
> (`neondb_owner`): migracja `0012` zakłada politykę `owner_passthrough … USING (true)`, która
> przepuszcza właściciela bezwarunkowo (decyzja świadoma — ADR-005). Część tras serwerowych łączy
> się właśnie tak (wzorzec „zapis owner-side"). Dla tych ścieżek obowiązują środki 1 i 2, a RLS
> **nie** stanowi dodatkowej siatki. Środek 3 jest realną drugą warstwą tam, gdzie kod przechodzi
> przez `withTenantContext`.

Dodatkowo: ograniczenia `CHECK` na zakresach (rating/difficulty/stability/liczniki) jako kontrola
poprawności danych; flaga funkcji domyślnie wyłączona do świadomego zapłonu.

**Weryfikacja i jej ograniczenie (art. 32 ust. 1 lit. d).** Audyt na kodzie: rls-matrix v0.30
(sign-off Ryana 2026-07-25, 0 KRYTYCZNYCH / 0 WAŻNYCH). Tożsamość roli, którą aplikacja łączy się
z bazą, potwierdzona **jednorazowo** 2026-07-26 (`docs/audyty/2026-07-26-rls-bypassrls-prod.md`).
**Nie mamy dziś kontroli ciągłej tej własności** — strażnik `k3-validate` sprawdza atrybuty roli w
izolacji, nie tożsamość połączenia w czasie żądania. Uzupełnienie (krok D2 wskazanego audytu) jest
**warunkiem przed pierwszą realną rejestracją studenta**, obok klauzuli informacyjnej z art. 13
(E-1).

**Minimalizacja (art. 5 ust. 1 lit. c) — POTWIERDZONA.** Kolumny ograniczone do parametrów silnika
i ocen; **zero treści wolnej**, **zero PII bezpośredniego**, brak wtórnej telemetrii (nie ma `ip`,
`user_agent`, `session_id`, rozdzielczości podsekundowej — ryzyko odcisku behawioralnego, którego
pilnowałem przy hint-reveals, tu nie występuje, bo tabele nie mają takich kolumn). Zbiór pól jest
domknięty schematem tabeli (nie JSONB), więc — inaczej niż `hints_revealed_json` — nie da się go
po cichu poszerzyć bez migracji, która wraca do przeglądu ryzyka.

---

## Wpis #5 — Automatyczne dopasowanie ścieżki nauki (placement curriculum)

**Status:** wpis **wyprzedza wdrożenie** — powstał jako bramka projektowa przed implementacją
plasterka L3 funkcji 1E.7 (migracja `0045`, tabela `curriculum_placements`, flaga
`FLAG_PLACEMENT_DIAGNOSTIC` domyślnie WYŁĄCZONA). W chwili wpisu: zero wierszy, zero ścieżek
zapisu. Wpis podlega weryfikacji na kodzie po landzie L3 — dopiero wtedy opisuje stan, a nie projekt.

**Czynność.** Po domknięciu diagnozy system **automatycznie ustala, które moduły ścieżki nauki
zostają studentowi otwarte** (zdjęty prerekwizyt), na podstawie poziomów zmierzonych diagnozą
i progu konfiguracyjnego. To **profilowanie w rozumieniu art. 4 pkt 4 RODO** (zautomatyzowana ocena
aspektu osoby — tu: stanu wiedzy) połączone z **decyzją o dostępie do materiału**. Reguła jest
deterministyczna i bez udziału modelu językowego (`src/lib/curriculum/placement.ts` — funkcja
czysta, zero LLM, zero losowości).

**Kategorie osób.** Studenci uczelni-partnerów korzystający z platformy.

**Kategorie danych.** Klasa **K-INT** (wewnętrzne nie-PII), tabela `curriculum_placements`
(migracja `0045`), wiersz per student × moduł, **wyłącznie dla modułów faktycznie otwartych**:
- `level` — poziom z diagnozy (1–4) dla konceptu tagującego moduł; `NULL` przy module wciągniętym
  prefiksem (brak własnego pomiaru);
- `threshold` — próg obowiązujący **w chwili zapisu** (nie bieżący);
- `reason` — kod rozłączny: `qualified` (własny pomiar) / `carried_untagged` (wciągnięty prefiksem);
- `support_mode` — `full` / `fading` / `NULL`;
- `concept_slug`, `blocking_hole_slug` — migawki identyfikatorów konceptu i modułu ucinającego prefiks;
- `assessment_session_id`, `unlocked_at` — powiązanie z pomiarem i moment nadania.

**Zero treści wolnej, zero PII bezpośredniego, zero odpowiedzi studenta.** Powiązanie z osobą
wyłącznie przez `student_id` (pseudonimizacja na poziomie tabeli).

**Cel.** Funkcja produktowa: student z częściową wiedzą nie przechodzi materiału, który już zna.
Wtórnie — i to jest cel **jawnie nazwany, nie uboczny** — pomiar trafności progu odblokowania
(DECYZJA 2 w `docs/product/decyzje-1e7-placement-v0.1.md`): bez `level`/`threshold`/`reason`
zapisanych w chwili decyzji nie da się później sprawdzić, czy próg był ustawiony dobrze, bo
interpretacja tego samego `result_json` zmienia się wraz z mapą tagów i progiem.

**Podstawa prawna: art. 6 ust. 1 lit. b RODO — wykonanie umowy.** Dopasowanie ścieżki jest
elementem świadczonej usługi edukacyjnej, nie funkcją opcjonalną ponad rdzeń — jak wpis #3, a
w odróżnieniu od wpisu #4 (dane zawodowe = zgoda).

### Art. 22 RODO (zautomatyzowane decyzje) — ocena wprost: **NIE MA ZASTOSOWANIA**, warunkowo

Element (a) *decyzja* — **zachodzi**: „moduł X zostaje otwarty". Element (b) *wyłącznie
zautomatyzowane przetwarzanie* — **zachodzi**: reguła wykonuje się przy domknięciu diagnozy, żaden
człowiek nie zatwierdza wyniku. Rozstrzyga element (c) — czy decyzja *wywołuje skutki prawne albo
w podobny sposób istotnie wpływa* na osobę. **Oceniam, że nie — z trzech niezależnych powodów,
z których każdy sam wystarcza:**

1. **Decyzja wyłącznie ROZSZERZA dostęp, nigdy go nie odbiera.** Stanem odniesienia jest student
   bez diagnozy: drabina zamknięta poza modułem startowym, otwierana przechodzeniem kolejnych
   modułów. Placement może ten stan wyłącznie **poprawić**. Nie istnieje wynik diagnozy, po którym
   student ma mniej niż bez niej. Odblokowania są dodatkowo **monotoniczne** — druga diagnoza
   dokłada, nigdy nie odbiera (§6b dokumentu produktowego), a tabela jest append-only (bez ścieżki
   UPDATE). Decyzja, która w najgorszym razie nie daje nic, nie może „istotnie wpłynąć" niekorzystnie.
2. **Istnieje pełna, równorzędna i zawsze dostępna droga alternatywna.** Każdy moduł można otworzyć
   przechodząc go normalnie albo zdając jego egzamin („test out", próg ≈90%, na produkcji od
   2026-07-25). Automat jest **skrótem**, nie bramą: niczego nie zamyka i nie jest jedyną drogą do
   żadnego skutku.
3. **Skutek nie opuszcza platformy i nie tworzy kredencjału.** Placement nie zalicza modułu, nie
   trafia do Paszportu, nie widzi go panel wykładowcy (`app_faculty` bez grantu), nie idzie do
   pracodawcy, nie wpływa na ocenę, zaliczenie przedmiotu ani rekrutację. To wyłącznie kolejność
   pracy wewnątrz aplikacji.

**Czego ta ocena NIE mówi.** Nie twierdzę, że „to tylko nauka, więc art. 22 nie dotyczy" — decyzje
o dostępie do kształcenia potrafią przekroczyć próg istotności (wytyczne WP251rev.01 wymieniają
dostęp do usług edukacyjnych wśród przykładów). Ocena stoi na tym, że **ta konkretna decyzja jest
jednostronnie korzystna i obchodzalna**, a nie na tym, że dotyczy nauki. Zdejmij którąkolwiek z
trzech przesłanek i wynik się zmienia.

**Konstytucja §7 nie zastępuje tej oceny.** §7 (ocena formująca kontra kredencjał) to nasza
doktryna produktowa i odpowiada na pytanie „czy maszyna może orzec sama". Art. 22 odpowiada na inne
pytanie — „czy osoba ma prawo nie podlegać tej decyzji". Zgodność z §7 jest tu spełniona
(placement jest formujący, nic nie wychodzi na zewnątrz), ale **została sprawdzona osobno**, a nie
przyjęta jako dowód dla art. 22.

**Trzy warunki nośne — zdjęcie któregokolwiek unieważnia tę ocenę i wymaga ponownej analizy
przed wdrożeniem zmiany:**

| # | Warunek | Co go łamie |
|---|---|---|
| A22-1 | Placement wyłącznie otwiera; nigdy nie zamyka, nie pomija ani nie zalicza materiału | Powrót do wariantu „diagnoza zalicza" (pierwotne ADR-014 D8); ożywienie statusu `skipped_by_placement` jako realnego pominięcia pozycji; jakakolwiek ścieżka UPDATE/DELETE odbierająca odblokowanie |
| A22-2 | Droga alternatywna („test out") realnie dostępna | Wyłączenie `FLAG_MASTERY_GATE`, usunięcie egzaminu modułowego, podniesienie progu egzaminu do poziomu nieosiągalnego. **Uwaga: ocena prawna zależy tu od flagi funkcji** — wyłączenie `FLAG_MASTERY_GATE` przy włączonym `FLAG_PLACEMENT_DIAGNOSTIC` to nie tylko zmiana produktu, ale zmiana przesłanki tej oceny |
| A22-3 | Wynik nie opuszcza ścieżki nauki | Pokazanie placementu wykładowcy (grant dla `app_faculty`, agregat per student), wejście do Paszportu, do rekrutacji, do stypendiów, do rankingu studentów |

**Skutek dla klauzuli informacyjnej (art. 13, artefakt E-1 — zaległy, bramka przed 1. rejestracją).**
Brak zastosowania art. 22 **zdejmuje obowiązek z art. 13 ust. 2 lit. f** (informacja o logice
decyzji), ale **nie zdejmuje art. 5 ust. 1 lit. a** (rzetelność i przejrzystość). Wiążące dla
autora klauzuli:
1. **Nie wolno użyć klauzuli-wzorca ze zdaniem „nie podejmujemy decyzji w sposób zautomatyzowany,
   w tym profilowania".** Byłoby to **nieprawdą** — profilujemy w dwóch czynnościach (#3 FSRS
   i #5 placement). To najczęstszy błąd kopiowanych klauzul i u nas byłby fałszywym oświadczeniem
   wobec podmiotu danych.
2. Do celów przetwarzania dopisać **osobny cel**: „automatyczne dopasowanie ścieżki nauki do wyniku
   diagnozy (otwieranie modułów)".
3. Dodać jeden akapit **dobrowolnie, nie z obowiązku** (i tak to zapisać w uzasadnieniu klauzuli):
   o tym, które moduły się otwierają, decyduje system automatycznie na podstawie wyniku diagnozy
   i progu; decyzja **tylko otwiera materiał, nigdy go nie zamyka**; każdy moduł pozostaje dostępny
   przez przejście albo egzamin; student może poprosić o wyjaśnienie i o sprawdzenie decyzji przez
   człowieka.
4. **Zapisać wprost, że punkt 3 jest zabezpieczeniem dobrowolnym.** Zaoferowanie kontaktu z
   człowiekiem **nie jest** przyznaniem, że art. 22 ust. 1 ma zastosowanie, i nie tworzy takiego
   domniemania na przyszłość. Bez tego zdania sami zbudujemy sobie dowód przeciwko własnej ocenie.
5. Retencja w klauzuli: czas trwania konta, usunięcie kaskadą przy skasowaniu konta.

**Odbiorcy zewnętrzni.** Brak. Dane nie opuszczają platformy.

**Retencja.** Czas trwania konta — uzasadnienie i zastrzeżenie co do `blocking_hole_slug`:
`docs/data/retention.md`. Art. 17 realizowany kaskadą `student_id ON DELETE CASCADE`.
**Uwaga konstrukcyjna:** wiersz jest nośnikiem uprawnienia, więc mechanizm append-only **nie może
blokować DELETE** — inaczej kaskada art. 17 przestaje działać. Zakaz zapisu obejmuje wyłącznie
UPDATE (patrz warunek W-1 w macierzy RLS v0.32).

**Środki bezpieczeństwa** *(opisane tak, jak działają — nie mocniej; wzorem sprostowania z v0.2)*:

1. **Uprawnienia roli (deny-by-default).** `GRANT` wyłącznie na `SELECT` dla `app_student`;
   `REVOKE ALL` dla `app_faculty` (wykładowca nie widzi placementu żadnego studenta, także
   zbiorczo); zapisy wyłącznie po stronie serwera. Środek najmocniejszy — działa niezależnie od
   poprawności zapytań. **Jawnie:** grant dla `app_student` nie ma dziś konsumenta (wszystkie
   odczyty idą połączeniem właściciela) — jest spójnością klasy i rezerwą na trasy przez
   `withTenantContext`, nie działającą kontrolą. Zapisuję to od razu, żeby nie stał się
   uprawnieniem, które trwa, bo nikt nie pamięta, po co powstało.
2. **Filtr w zapytaniu (warstwa aplikacji).** Tożsamość z sesji + jawny `WHERE`. **Na ścieżkach
   idących połączeniem właściciela bazy jest to środek jedyny** — a wszystkie dzisiejsze odczyty
   ekranów drabiny idą właśnie tak (17 z 17 stron renderowanych serwerowo,
   `../../../docs/audyty/2026-07-26-rls-bypassrls-prod.md` §8.2).
3. **RLS ENABLE+FORCE + polityka `student_sees_own`.** Egzekwowane dla połączeń rolą wykonawczą
   `app_runtime`. **Dla ścieżek owner-side nie stanowi dodatkowej siatki** — `owner_passthrough
   … USING (true)` z migracji `0012` przepuszcza właściciela bezwarunkowo (ADR-005). Zapisuję to
   przy zakładaniu tabeli, a nie po fakcie: dla `curriculum_placements` środek 3 jest dziś
   **rezerwą na przyszłe trasy przez `withTenantContext`**, nie działającą kontrolą odczytu.
4. **Niezmienność zapisu.** Wiersz powstaje raz i nie jest przepisywany: `UNIQUE(student_id,
   module_id)` + zapis `ON CONFLICT DO NOTHING` + wyzwalacz odrzucający `UPDATE`. To **maszynowa**
   gwarancja wymogu produktowego „nienadpisywany przy ponownej diagnozie", nie obietnica kodu.
5. Ograniczenia `CHECK` na zakresach i **na kształcie werdyktu** (gałąź `qualified` wymaga
   kompletu `concept_slug`+`level`+`support_mode` i `level >= threshold`; gałąź `carried_untagged`
   wymaga ich braku) — uniemożliwiają ciche zlanie dwóch powodów odblokowania, które miernik ma
   rozróżniać.
6. Flaga `FLAG_PLACEMENT_DIAGNOSTIC` domyślnie wyłączona — zero wierszy do świadomego zapłonu.

**Minimalizacja (art. 5 ust. 1 lit. c).** Zapisujemy wyłącznie moduły **otwarte** — nie zapisujemy
trwale, na czym student wypadł słabo (to zostaje w `assessment_sessions.result_json`, czynność
diagnozy, i nie jest dublowane). Zbiór pól domknięty schematem tabeli (nie JSONB), więc nie da się
go poszerzyć bez migracji wracającej do przeglądu ryzyka. **Jedno pole ponad funkcję:**
`blocking_hole_slug` służy wyłącznie miernikowi progu — nazwane jawnie, z przeglądem po pilotażu
(`docs/data/retention.md`).

---

## Wpis #6 — Ślad rozliczalności i bezpieczeństwa (`audit_log`)

**Status:** wpis **opisuje stan wdrożony** (tabela istnieje od migracji `0003`, wyzwalacze `0008`
i `0010`). Powstał z opóźnieniem — `audit_log` działał od miesięcy bez wpisu w rejestrze i to samo
w sobie było brakiem z art. 30 ust. 1. Odkryte przy rozstrzyganiu taksonomii zdarzeń
(`docs/data/audit-log-taksonomia.md` v0.1), które ten wpis warunkuje.

**Czynność.** Zapis zdarzeń istotnych dla **bezpieczeństwa i rozliczalności**: logowania panelu
wykładowcy i operatora jakości (w tym nieudane), udostępnienie i cofnięcie publicznego Paszportu,
weryfikacja zgłoszenia projektowego i przebieg obrony ustnej, decyzje kolejki recenzenckiej oraz
ślad automatycznego dopasowania ścieżki nauki. **Nie jest to dziennik aplikacji** (logi
uruchomieniowe Vercela) ani telemetria kosztowa (`ai_usage_ledger`, wpis odrębny do zasiania).

**Kategorie osób.** Studenci; wykładowcy kampusów-partnerów; operatorzy jakości.

**Kategorie danych.** `actor_type` (klasa podmiotu), `actor_id` (**identyfikator osoby — dla części
zdarzeń**, patrz dług A-1), `action` (kod zdarzenia z domkniętej taksonomii), `target_type` /
`target_id` (czego dotyczyło), `ip_address`, `user_agent`, `metadata` (JSONB — **wyłącznie kody
i liczby**, zero treści wolnej), `created_at`.

**Zero treści studenta, zero odpowiedzi z diagnozy, zero wyników nauki poza kodami.** Adres IP
i podpis przeglądarki są zapisywane tylko przy zdarzeniach uwierzytelniania i udostępniania — to
najbardziej wrażliwy element tego wpisu i jest świadomy: bez nich ślad logowania nie spełnia swojej
funkcji.

**Cel.** Wykazanie zgodności (art. 5 ust. 2), wykrywanie nadużyć i dochodzenie incydentów
(art. 32 ust. 1 lit. b i d), oraz — dla zdarzeń `curriculum.placement.*` — pomiar trafności
automatycznej reguły odblokowania.

**Podstawa prawna: art. 6 ust. 1 lit. f — prawnie uzasadniony interes administratora**
(bezpieczeństwo systemu i rozliczalność), wsparty obowiązkiem z art. 32. **Nie** lit. b: ślad
audytowy nie jest elementem usługi świadczonej studentowi. Test równowagi: dane ograniczone do
kodów i identyfikatorów technicznych, brak treści, brak odbiorców zewnętrznych, brak profilowania
na tej podstawie — interes osoby nie przeważa.

**Retencja: BEZTERMINOWA — okres nazwany, nie domyślny.** Uzasadnienie, konstrukcja zgodności
(ograniczenie przechowywania realizowane **przez zawartość wiersza**, skoro czasu ograniczyć się nie
da) i dwa nazwane ograniczenia mają **jeden nośnik: `docs/data/retention.md`, wiersz `audit_log`**.
Tutaj ich nie powtarzam. Od v0.5 taki wiersz w ogóle istnieje — wcześniej był rozjazd: rejestr
czynności mówił „bezterminowa", a rejestr retencji milczał (zmierzone: `git show
origin/main:docs/data/retention.md | grep -ci "audit_log"` → **0**, odczyt 2026-08-10).
Jedno rozróżnienie zostaje tutaj, bo dotyczy tego wpisu, nie okresu: firmowa reguła „audit log
12 miesięcy" (`agents/ryan.md`) dotyczy audit logu **nordsignal** (`logs/audit/`), **nie tej
tabeli**.

### SPROSTOWANIE (v0.5) — zasięg obietnicy append-only

**Stare brzmienie, cytowane dosłownie** (v0.4, akapit wyżej): *„wiersza nie usunie ani nie zmieni
**nawet właściciel bazy**"*.

**To zdanie jest ścisłe dla trzech operacji i nieścisłe jako zdanie ogólne.** Wyzwalacze obejmują
`UPDATE`, `DELETE` i `TRUNCATE` na **wierszach**. **Nie obejmują przebudowy tabeli** — właściciel
bazy może utworzyć kopię, przepisać do niej treść w dowolnym kształcie i podmienić nazwy;
`CREATE TABLE (LIKE … INCLUDING ALL)` **nie przenosi wyzwalaczy**, więc ochrona znika po cichu.

**Dowód wykonaniem** (Max, jednorazowa baza PostgreSQL 16.14, odczyt 2026-08-10):

```
===== B: czy append-only chroni przed PRZEBUDOWA tabeli? =====
CREATE TABLE / INSERT 0 3 / DROP TABLE / ALTER TABLE
--- czy stare actor_id zniknely mimo wyzwalacza? ---
 submission.verified        |          | t1     ← actor_id wyczyszczone we WSZYSTKICH wierszach
--- czy wyzwalacz przetrwal przebudowe? ---
 tgname
--------
(0 rows)                                        ← wyzwalacza NIE MA
```

**Dowód, że luki nie zamyka nic innego** (mój odczyt, 2026-08-10 15:17 UTC):
`git grep -in "EVENT TRIGGER\|ddl_command\|sql_drop" origin/main -- drizzle/` → **pusto, kod
wyjścia 1**. Wyzwalacza zdarzeń języka definicji danych (jedynego mechanizmu, który mógłby
przechwycić `DROP`/`ALTER` na tabeli) w schemacie **nie ma**.

**Co pozostaje prawdziwe, a co upada:**

| Twierdzenie | Status |
|---|---|
| „`UPDATE` wiersza jest niemożliwy nawet dla właściciela" | **stoi** — ciało wyzwalacza odczytane z produkcji, tożsame co do skrótu `sha256` z migracją `0008` (pomiar E0/U1, Ethan, 2026-08-10 14:52 UTC), bez gałęzi warunkowej |
| „`DELETE` wiersza jest niemożliwy" | **stoi** — ten sam wyzwalacz |
| „`TRUNCATE` jest niemożliwy" | **stoi** — drugi wyzwalacz, ta sama funkcja |
| „wiersza nie usunie **nikt**" / „ślad jest nieusuwalny" jako zdanie ogólne | **UPADA** — przebudowa tabeli obchodzi ochronę i **kasuje ją po drodze** |

**Dlaczego prostuję to jawnie, choć działa przeciwko mnie.** Zdanie „nie usunie nawet właściciel
bazy" jest jednym z twierdzeń Built-to-Sell — kupujący w badaniu due diligence sprawdzi je w pół
godziny. Lepiej, żeby znalazł przy nim ten akapit niż własne odkrycie. Sprostowanie **nie osłabia
decyzji o kierunku (a+)**: istniejąca szczelina wymaga uprawnień właściciela i zostawia po sobie
brak wyzwalacza (widoczny gołym odczytem katalogu), a to nie jest argument za dorobieniem drugiej,
celowej i cichej.

**Zamknięcie szczeliny — nie robię tego dziś i mówię dlaczego.** Domknięcie wymagałoby wyzwalacza
zdarzeń języka definicji danych, czyli **migracji na produkcji** — to domena Ethana (CLAUDE.md §5,
v1.12), nie moja, i nie mieści się w E2b (dokumenty). **Zgłaszam jako osobne zadanie**, wpisane do
`docs/data/art17-kompletnosc-usuniecia.md` (pozycja L-4), z progiem: przy pierwszym audycie
zewnętrznym albo przy pierwszym pytaniu kupującego o nienaruszalność audytu.

Dla wierszy **bez `actor_id`** (wzorzec A7: `curriculum.placement.computed`, docelowo `.skipped`)
bezterminowość jest nieszkodliwa: jedyne wiązanie idzie przez `target_id` → `assessment_sessions`,
a ta tabela kaskaduje przy usunięciu konta. Po skasowaniu konta wiersz staje się **sierotą** i
przestaje być danymi osobowymi (motyw 26 RODO).

### Dług A-1 — art. 17 strukturalnie niewykonalny dla zdarzeń z `actor_id`

**Fakt (zweryfikowany na kodzie 2026-08-01):** `actor_id` to zwykły `text` **bez klucza obcego
i bez kaskady** (`drizzle/0003_bumpy_microbe.sql:4`). Skasowanie konta studenta **nie usuwa** jego
wierszy w `audit_log` i **nie zrywa** wiązania — identyfikator zostaje w kolumnie jako napis. Wraz
z wyzwalaczem blokującym `DELETE` znaczy to, że **żądania usunięcia z art. 17 nie da się dziś
spełnić** dla zdarzeń: `passport.share.enable` / `.disable`, `submission.verified`,
`submission.viva.*`, `submission.review.*`.

**Klasa ryzyka i próg naprawy — patrz sekcja „Oświadczenie administratora" na górze tego pliku.**
Zdanie o klasie **nie jest tu powtórzone celowo**: w v0.4 żyło w dwóch kopiach (tu i w taksonomii
§6), obie były nieprawdziwe i obie wymagały osobnego sprostowania. Klasa obowiązująca od v0.5:
**WAŻNE dla kontroli · WAŻNE dla danych**, próg rozdzielony na przeszłość i przyszłość.

**Stare brzmienie tego akapitu, cytowane dosłownie** (v0.4 — nie usuwam, prostuję):

> „**Klasa: WAŻNE dla kontroli, INFO dla danych.** Zero prawdziwych studentów; 28 kont testowych
> Darka (administrator i podmiot danych to ta sama osoba). Nie ma dziś zagrożonego podmiotu danych."

**Zakres długu — sprostowany co do listy zdarzeń.** Werdykt z 2026-08-01 wymieniał
`passport.share.*`, `submission.verified`, `submission.viva.*`, `submission.review.*`.
Inwentaryzacja wykonana na kodzie (ADR E1 §3) pokazała trzy odchylenia: **brakowało
`placement.consent.granted`/`.revoked`** (identyfikator w dwóch kolumnach naraz, ślad zgody)
oraz `submission.viva.answers_read`, a `submission.review.*` **było zaliczone błędnie** (niesie
identyfikator sesji recenzenta, nie studenta — i ma zero wierszy na produkcji). Obowiązująca lista:
`docs/data/audit-log-taksonomia.md` §5 (tabela) i §6 (rozstrzygnięcie).

**Kierunek naprawy: rozstrzygnięty — (a+).** Postawienie „(a) albo (b)" w v0.4 było **błędem
kategorii**: to nie dwie drogi do tego samego celu, tylko dwa rozłączne zbiory wierszy — **(a)
naprawia przyszłe wiersze i nie umie naprawić przeszłych; (b) naprawia przeszłe i nie zapobiega
przyszłym.** Przyjęty kierunek **(a+)** = brak `actor_id` **oraz** brak adresu IP i sygnatury
przeglądarki dla zdarzeń studenta, z jednym nośnikiem reguły w typie `AuditEntry`. Uzasadnienie
i decyzje szczegółowe (zakres, adres IP, klasa 2): ADR E1 → `docs/data/audit-log-taksonomia.md` §6.
**Świadomie NIE rekomenduję zdjęcia ani nadwątlenia wyzwalacza append-only** — to stanowisko bez
zmian od 2026-08-01, wzmocnione pomiarem: oba wyzwalacze wskazują na **tę samą jedną funkcję**, więc
jedna linia wyjątku rozbroiłaby ochronę przed `UPDATE`, `DELETE` i `TRUNCATE` naraz (E0/U1).

**Czego kierunek (a+) NIE naprawia:** lista ma jeden nośnik — `docs/data/audit-log-taksonomia.md`
§6.6. **Jedno zdanie, które musi paść tutaj, bo dotyczy rozliczalności tego wpisu:** (a+) usuwa
**przeszkodę** w wykonaniu art. 17 i **nie dostarcza samego prawa** — ścieżki usunięcia konta
w produkcie dziś nie ma (pozycja E1b pakietu RODO, rejestr:
`docs/data/art17-kompletnosc-usuniecia.md`). Nikomu nie wolno zaraportować A-1 jako „art. 17
załatwiony".

**Środki bezpieczeństwa (art. 30 ust. 1 lit. g).** Zapis wyłącznie połączeniem właściciela
(`recordAudit`, best-effort — awaria zapisu nie blokuje akcji użytkownika); `REVOKE TRUNCATE` dla
ról `app_student` i `app_faculty` (`0010`); wyzwalacze append-only (`0008`, `0010`); `metadata`
ograniczona konwencją do kodów i liczb, z testami pilnującymi, że treść studenta tam nie trafia.
**Ograniczenie nazwane wprost:** ochrona przed odczytem opiera się na grantach ról, nie na izolacji
wierszy — tabela nie ma polityk RLS per podmiot danych (stan zgodny z opisem w
`../../../docs/audyty/2026-07-26-rls-bypassrls-prod.md` v0.3 dla ścieżek owner-side).

---

## Wpis #7 — Rejestr uczestników pilotażu (`pilot_participants`)

**Status: wpis WYPRZEDZA WDROŻENIE** — jak wpis #5 w chwili powstania. Tabeli **nie ma na
produkcji**: migracja `0047_sad_la_nuit` jest w `origin/main` (`git show
origin/main:drizzle/meta/_journal.json | grep -n 0047` → `"tag": "0047_sad_la_nuit"`, mój odczyt
2026-08-10 15:13 UTC), ale **nie jest zastosowana**. Pomiar E0 (Ethan, 2026-08-10 14:36 UTC,
transakcja tylko do odczytu), cytat wyjścia:

```
-- B3. istnienie tabel
[{ "pilot_participants": null, "curriculum_placements": "curriculum_placements",
   "audit_log": "audit_log" }]
-- ostatnia zastosowana migracja: { "id": 47, "created_at": "1785600531926" }  → 0046_demonic_maria_hill
```

Wpis opisuje więc **czynność, która ruszy po zastosowaniu `0047`** (etap E3 pakietu RODO), i podlega
weryfikacji na wdrożonym stanie — dopiero wtedy opisuje rzeczywistość, a nie projekt. **Do tego
czasu wierszy jest zero, bo tabeli nie ma.**

**Czynność.** Prowadzenie **imiennej listy osób, których zdarzenia diagnozy liczą się jako
obserwacje** w mierniku trafności progu odblokowania modułów. Reguła, której rejestr jest nośnikiem
(Sophia, `docs/product/decyzje-1e7-placement-v0.1.md` §6a): *zdarzenie, którego nie da się przypisać
do sesji diagnozy nazwanego uczestnika, nie jest obserwacją — niezależnie od tego, jak sensownie
wygląda.* Wpis do rejestru wykonuje **człowiek, świadomie**, narzędziem `tools/pilot-enroll.ts`;
**produkt nie zapisuje tu nic sam.** Zmierzone (mój odczyt 2026-08-10 15:21 UTC): `git grep -n
"pilot_participants\|pilotParticipants" origin/main -- src/` → poza definicją schematu jedynym
wystąpieniem w kodzie produkcyjnym jest **odczyt** miernika (`src/lib/curriculum/placement-metric.ts:133`
`LEFT JOIN pilot_participants pp`, `:155` `FROM pilot_participants pp`); pozostałe trafienia to testy
(`__tests__/`), które wstawiają i kasują wiersze **we własnej bazie testowej**. Cały zapis
produkcyjny idzie przez `tools/` (`git grep -ln … -- tools/` → `k3-validate.ts`, `pilot-enroll.ts`,
`report-placement-metric.ts`).

**Kategorie osób.** Studenci uczelni-partnerów wpisani do kohorty pilotażu. **Nie obejmuje** kont
technicznych, weryfikacyjnych, demonstracyjnych ani przejazdów zespołu — to jest cały powód
istnienia rejestru.

**Kategorie danych — cztery pola, zero nowych danych osobowych:**

| Kolumna | Co trzyma | Uwaga |
|---|---|---|
| `student_id` | wskaźnik na istniejący wiersz `students` | klucz obcy **z kaskadą** |
| `tenant_id` | kampus | klucz obcy **bez kaskady** (celowo: skasowanie kampusu z wpisanymi uczestnikami ma się wywalić, a nie osierocić rejestr) |
| `cohort` | nazwa kohorty | `CHECK` na niepustość |
| `enrolled_at` | znacznik czasu wpisu | |

**Zero imienia, zero adresu, zero treści.** Adres e-mail służy wyłącznie do **odnalezienia konta**
w narzędziu wpisu i do rejestru nie trafia — potwierdzone w kodzie: `INSERT INTO pilot_participants
(student_id, tenant_id, cohort)` (`tools/pilot-enroll.ts`, odczyt 2026-08-10). Samą informacją
osobową jest tu **fakt przynależności** konkretnej osoby do kohorty badawczej — i to wystarczy, żeby
czynność wymagała wpisu w tym rejestrze.

**Cel.** Rzetelność pomiaru własnej reguły produktowej (art. 5 ust. 2 — zdolność wykazania, na czym
oparliśmy decyzję o progu) oraz ochrona miernika przed zanieczyszczeniem przebiegami zespołu.
**Rejestr nie zmienia niczego w ścieżce studenta** — nie otwiera modułów, nie wpływa na ocenę, nie
jest widoczny w produkcie.

**Podstawa prawna: art. 6 ust. 1 lit. f — prawnie uzasadniony interes administratora** (ewaluacja
i rozwój własnej usługi). **Nie lit. b:** przynależność do pomiaru nie jest elementem usługi
świadczonej studentowi — bez niej dostaje dokładnie to samo. **Nie lit. a (zgoda):** zgoda byłaby
**pozorna**, gdyby jej odmowa nie zmieniała nic w produkcie, a rejestr i tak nie może zależeć od
zgody, bo wtedy miernik mierzyłby chętnych, a nie uczestników.

**Test równowagi (wymóg lit. f), wprost:** interes administratora — realny (bez rejestru miernik
liczy przebiegi zespołu jako sukcesy uczestników, co jest wprost fałszywym odczytem). Wkroczenie
w prywatność — minimalne: cztery pola, brak treści, brak odbiorców zewnętrznych, brak decyzji wobec
osoby, brak widoczności dla wykładowcy i dla samego studenta. Rozsądne oczekiwania osoby —
zachowane, bo **o udziale w pilotażu informuje ją człowiek przy zapisie** (komentarz projektowy
migracji `0047`); rejestr nie jest kanałem komunikacji z uczestnikiem i nie zastępuje tej rozmowy.

**Trzy warunki nośne tej podstawy — zdjęcie któregokolwiek unieważnia ocenę:**

| # | Warunek | Co go łamie |
|---|---|---|
| F7-1 | Rejestr **nie wpływa** na to, co osoba dostaje w produkcie | pokazanie statusu uczestnika w interfejsie; uzależnienie od niego jakiejkolwiek funkcji, treści albo kolejności |
| F7-2 | Rejestr **nie opuszcza** platformy i nie widzi go wykładowca ani student | grant dla `app_faculty`/`app_student`; eksport do uczelni; użycie listy do kontaktu marketingowego |
| F7-3 | Udział jest **zakomunikowany człowiekowi przez człowieka** przed wpisem | wpis „po cichu", na podstawie samego faktu rejestracji albo domeny adresu |

**Art. 22 — nie ma zastosowania.** Rejestr nie jest decyzją wobec osoby: nie wywołuje wobec niej
żadnego skutku, ani prawnego, ani faktycznego. Rozstrzyga wyłącznie o tym, czy **my** policzymy jej
zdarzenia we własnym mierniku.

**Prawo sprzeciwu (art. 21 ust. 1) — przysługuje i JEST WYKONALNE, w odróżnieniu od `audit_log`.**
Przy podstawie z lit. f osoba może wnieść sprzeciw. Wykonanie to zwykłe `DELETE` z rejestru —
tabela **świadomie nie ma wyzwalacza append-only** (uzasadnienie w `0047`: to odtwarzalna lista
robocza, nie ślad rozliczalności). Skutek sprzeciwu: jej zdarzenia przestają być obserwacjami,
a **dane nie giną** — leżą tam, gdzie leżały. To jest różnica klasy wobec długu A-1 i warto ją
widzieć: rejestr zaprojektowano tak, że prawo osoby daje się wykonać jednym poleceniem.

**Odbiorcy zewnętrzni.** Brak.

**Retencja.** Czas trwania konta studenta, z **przeglądem celowanym przy zamknięciu kohorty** —
pełne uzasadnienie i analiza (dlaczego to **nie** jest ten sam przypadek co `curriculum_placements`)
w `docs/data/retention.md`, wiersz `pilot_participants`. **Tu tego nie powtarzam** — rejestr retencji
jest jedynym nośnikiem okresów.

**Art. 17.** `student_id … ON DELETE CASCADE` (`drizzle/0047_sad_la_nuit.sql`, `schema.ts:2398-2400`,
odczyt 2026-08-10) — usunięcie konta kasuje wiersz rejestru, a zdarzenia tej osoby automatycznie
przestają być obserwacjami. **Rejestr jest po stronie rozwiązania długu A-1, nie po stronie
problemu.**

**Środki bezpieczeństwa (art. 30 ust. 1 lit. g)** — opisane tak, jak działają:

1. **Zero grantów dla ról aplikacyjnych.** Ani `app_student`, ani `app_faculty` nie mają żadnego
   prawa do tej tabeli. Odczyt i zapis wyłącznie połączeniem właściciela (narzędzia `tools/`).
   Środek najmocniejszy.
2. **RLS `ENABLE` + `FORCE` mimo braku grantów** — obrona w głąb: przyszły omyłkowy `GRANT` bez
   polityki nadal zwróci zero wierszy (zweryfikowane wykonaniem, Ryan 2026-08-07; komentarz `0047`).
3. **Bramka wpisu w narzędziu:** odmowa wpisania konta z domeny `.invalid` (konwencja kont
   technicznych) — łapie błąd odwrotny niż miernik, czyli wpisanie **naszego** konta jako uczestnika.
4. **Adres podawany na wejściu standardowym, nigdy jako argument polecenia** — argument zostaje
   w historii powłoki i w tablicy procesów. Ta sama reguła co dla poświadczeń CI (CLAUDE.md §5,
   bramka (i) pkt 5); tu chodzi o dane osobowe, mechanizm wycieku jest identyczny.
5. **Ślad wpisu w `audit_log`:** `pilot.participant.enrolled`, `actor_type = operator`, **bez
   `actor_id`**, `target_id` = `students.id` (kaskaduje), `metadata` = `{ cohort }`. Zgodne ze
   wzorcem A7 **już dziś** — patrz `docs/data/audit-log-taksonomia.md` §5.

**Ograniczenie nazwane wprost (art. 30 ust. 1 lit. g nie jest miejscem na optymizm):** `TRUNCATE`
**nie podlega RLS**. Omyłkowy `GRANT ALL` pozwoliłby opróżnić rejestr mimo nienaruszonych polityk.
Skutkiem byłby **brak obserwacji, nie wyciek** — ale kierunek awarii jest zdradliwy: pusty rejestr
wygląda jak „pilotaż słabo idzie", a nie jak incydent uprawnień. Pokrycie: strażnik `k3-validate`
#13a (lista praw tabelowych zawiera `TRUNCATE`, więc grant zapala się **przed** użyciem) + baner
pustego rejestru w raporcie miernika.

**Minimalizacja (art. 5 ust. 1 lit. c) — POTWIERDZONA.** Cztery kolumny, wszystkie niezbędne dla
celu; zbiór domknięty schematem (nie JSONB); powód wpisu i autor mieszkają w `audit_log`, nie tutaj,
więc rejestr nie rozrasta się o pola opisowe. Klucz złożony `(student_id, cohort)` zamiast samego
studenta — żeby druga kohorta nie wymagała kasowania śladu udziału w pierwszej.

**Wymóg dla klauzuli art. 13 (E2c) — dwie rzeczy, obie wiążące:**
1. Osobny cel przetwarzania: „prowadzenie listy uczestników pilotażu na potrzeby oceny trafności
   automatycznego dopasowania ścieżki nauki".
2. **Informacja o prawie sprzeciwu z art. 21** — obowiązkowa przy podstawie z lit. f i najczęściej
   pomijana w klauzulach kopiowanych z sieci. Razem ze wskazaniem, jak sprzeciw wykonać.

---

## Przegląd

**Data przeglądu:** przy pierwszej realnej rejestracji studenta (bramka zdarzeniowa), najpóźniej
**2026-10-25** (kwartał). Przegląd: czy Wendy uzupełniła wpisy 1/2/4 do pełnego art. 30, czy
klauzula informacyjna art. 13 powstała (E-1), czy retencja `review_logs` ma egzekucję (wspólny
skrypt R-1 rejestru retencji), czy wpis #5 został **zweryfikowany na wdrożonym kodzie** (dziś
opisuje projekt, nie stan), czy trzy warunki nośne oceny art. 22 (A22-1…A22-3) nadal zachodzą
oraz — od v0.4 — **czy dług A-1 z wpisu #6 został zamknięty** (art. 17 wykonalny dla zdarzeń
`audit_log` z `actor_id`) i czy taksonomia zdarzeń nie rozjechała się z kodem
(`docs/data/audit-log-taksonomia.md` §5).

**Dodane w v0.5 do listy przeglądu — sześć pozycji z datą, bo pozycja bez terminu i właściciela nie
jest długiem, tylko notatką:**

| # | Co sprawdzić | Termin | Właściciel |
|---|---|---|---|
| P-1 | Czy **oświadczenie administratora** zostało podpisane i uzupełnione o podział 9 kont (własne / osoby trzecie) | przy pierwszym przeglądzie, nie później niż 2026-08-24 | Darek |
| P-2 | Czy osoby z grupy (b) **dostały informację z art. 13** — data i sposób przekazania | 2026-08-24 | Darek |
| P-3 | Czy wpis **#7 został zweryfikowany na wdrożonym stanie** (dziś opisuje projekt: `0047` niezastosowana) | po etapie E3 pakietu RODO | Ryan |
| P-4 | Czy trzy warunki nośne podstawy z lit. f dla wpisu #7 (F7-1…F7-3) nadal zachodzą | kwartalnie | Ryan |
| P-5 | Czy **istnieje ścieżka usunięcia konta** (E1b) i czy przeszła weryfikację kompletności kaskady | przed pierwszą rejestracją osoby nieznanej administratorowi | Ethan (wykonanie), Ryan (odbiór) |
| P-6 | Czy szczelina „przebudowa tabeli" w gwarancji append-only została zamknięta albo świadomie przyjęta na piśmie | przy pierwszym audycie zewnętrznym | Ryan → Darek |
