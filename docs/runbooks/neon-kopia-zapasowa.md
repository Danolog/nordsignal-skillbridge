# Runbook: kopia zapasowa Neona przed zmianą danych produkcyjnych

**Wersja:** v0.4 · 2026-09-02 · właściciel: Ethan (CTO) · redakcja v0.4: Eva (Platform/DevOps)

> **Zmiana v0.3 → v0.4 (redakcja kształtu wartości + skąd wziąć klucz).** Trzy rzeczy,
> wszystkie z pozycji B8 planu z 2026-08-14: *„Sześć wystąpień w tym runbooku nadal
> nieredagowanych"*.
> **(1) Sprostowanie liczby, nie jej przepisanie.** Pomiar z 2026-09-02: nieredagowanych
> **wartości poświadczeń w tym pliku nie ma ani jednej** — zero adresów połączenia
> z hasłem, zero kluczy o kształcie Neona, także po sklejeniu ośmiu linii łamanych
> odwrotnym ukośnikiem. „Sześć" opisuje sześć wystąpień **jawnej atrapy pomiarowej**
> w §3c. Pełny pomiar i jego granica: **§3d**.
> **(2) Redakcja kształtu, nie wartości.** Atrapa miała kształt żywego żetonu dostępu
> (*token* — ciąg, którym program się uwierzytelnia), więc i człowiek, i skan sekretów
> musieli zgadywać, czy patrzą na sekret. Zastąpiona nieomylnym znacznikiem; odcisk
> poprzedniego brzmienia w §3d, wartość — w historii repozytorium.
> **(3) Wykonalność.** §3 kazał wziąć klucz z `.env.prod`, nie mówiąc, że **tego pliku
> nie ma w repozytorium** i nie będzie go w świeżym klonie. Nowe **§3.0** mówi, skąd
> wartość pochodzi, i każe zatrzymać się na pustej zmiennej — zamiast dostać odpowiedź
> `401` i wziąć ją za awarię Neona.

> **Zmiana v0.2 → v0.3 (pakiet kopii zapasowych, bramka 3 runbooka zapłonu flagi).**
> Runbook opisywał **tworzenie** i **kasowanie** kopii, a milczał o dwóch rzeczach, które
> klauzula informacyjna **obiecuje studentowi**: że kopie z jego danymi wygasają w oknie
> i że po odtworzeniu systemu ponawiamy na nim jego usunięcie. Nowe **§8** (okno życia
> kopii, reguła odświeżania, kod wyjścia zamiast wrażenia) i **§9** (odtworzenie + krok
> „ponów usunięcia"). Liczby dni **tu nie ma** — ma jeden nośnik w sekcji 9 klauzuli
> i pilnuje tego `tests/unit/rodo/kopie-zapasowe-okno.contract.test.ts`.
> Etykieta „niezweryfikowane" **zdjęta z odczytu 3a** (dwa realne wywołania w postaci
> `-K -`, 2026-08-13) i **zostawiona na zapisie 3b**, bo tego nadal nikt nie wykonał.
> Powód powstania: pomiar 2026-08-13 pokazał, że automatyczna historia Neona to **6 godzin**,
> ale nasze gałęzie `prod-backup-*` **nie wygasają w ogóle** — zdanie z klauzuli było
> prawdziwe przypadkiem, nie z mechanizmu.

> **Zmiana v0.1 → v0.2 (blok Leo w PR #265).** v0.1 obiecywała w §3, że klucz nie trafia
> do treści polecenia, i **łamała tę obietnicę w trzech własnych blokach kodu** (`-H
> "Authorization: Bearer $NEON_API_KEY"` w 3a, 3b i sekcji 4) — powłoka rozwija zmienną
> przed uruchomieniem procesu, więc wartość lądowała w tablicy procesów. Wszystkie trzy
> wywołania przeniesione na `curl -K -` (konfiguracja z wejścia standardowego). Obietnica
> z §3 przestaje być deklaracją: **nowa sekcja 3c niesie pomiar** wycieku przed poprawką,
> jego braku po poprawce i kontrolę, że nagłówek dociera identyczny. Doprecyzowany też
> zakres tego, co zweryfikowano (odczyt 3a sprawdzono w starej postaci — patrz nota pod
> 3c). Reszta dokumentu bez zmian.
**Po co:** bramka (b) delegacji (`CLAUDE.md` §5) — *„kopia zapasowa Neon przed każdą
zmianą danych"* — jest warunkiem, pod którym Ethan wykonuje zmiany na produkcji bez
sign-offu Darka per akcja. Bramka bez sprawdzonej procedury jest deklaracją, nie bramką.

Ten dokument zastępuje rozproszone kroki „backup gałęzią Neona" z ADR-009/010 i
`aktywacja-1e*-neon-console.md` jako **kanoniczne** miejsce procedury. Tamte zostają
jako zapis konkretnych, datowanych wykonań.

---

## 1. Stan zweryfikowany 2026-08-01 (odczytem, nie z pamięci)

| Fakt | Wartość | Jak sprawdzone |
|---|---|---|
| Projekt produkcyjny | `long-pond-11214233` („SkillBridge") | `GET /api/v2/projects/long-pond-11214233` |
| Organizacja | `org-snowy-credit-81923605` | pole `org_id` tego samego odczytu |
| Plan | `free_v3` | pole `owner.subscription_type` |
| **Limit gałęzi** | **10** | pole `owner.branches_limit` |
| Gałęzi w użyciu | **7** (zapas: 3) | `GET …/branches` |
| Gałąź produkcyjna | `main` = `br-proud-sun-al3aezrj`, `default=true` | jw. |

Identyfikatory cytowane w ADR-009/010 i `k3-prod-migration.md` **zgadzają się ze stanem
faktycznym** — to była jedyna część tamtych runbooków, którą dało się zweryfikować bez
przeglądarki.

### Zasięg klucza `NEON_API_KEY` — szerszy, niż zakładaliśmy

Klucz widzi **pięć projektów całej organizacji**, nie tylko produkcyjny SkillBridge:

```
icy-cherry-47017841   | nordsignal-kb
little-pond-07787183  | asystent-ai
long-pond-11214233    | SkillBridge      <- produkcja
calm-morning-30416716 | nela
square-wind-21272109  | MyHelper
```

To nie jest „władza nad projektem produkcyjnej bazy" — to władza nad **całą organizacją
Neona**. Wejście do rozmowy o rotacji (sekcja 5).

---

## 2. ⚠ `neonctl` NIE jest zainstalowany

```
$ which neonctl        -> neonctl not found
$ npx --no-install neonctl --version -> niezainstalowany lokalnie
$ ls -A ~/.config/neonctl/           -> 0 plików (brak logowania OAuth)
```

ADR-009 §53 i ADR-010 §57 mają pozycję *„`neonctl` zainstalowany i zalogowany do org
(`neonctl auth`)"* jako **checkbox pre-condition** — czyli stan do zapewnienia przy każdej
ceremonii, nie stan trwały. Dziś nie jest zapewniony.

Praktyczny wniosek: polecenia `neonctl …` rozsiane po ADR-ach **nie zadziałają
z pudełka**. Sekcja 3 podaje ścieżkę, która działa bez instalowania czegokolwiek.

---

## 3. Ścieżka A — REST API (działa dziś, bez instalacji)

Uwierzytelnienie: `NEON_API_KEY` — **skąd wziąć wartość, mówi §3.0**. **Klucz podajemy wyłącznie przez plik
konfiguracyjny `curl` czytany z wejścia standardowego (`curl -K -`) — nigdy w argumentach
polecenia, nigdy do logu.** Uzasadnienie pomiarem: sekcja 3c.

### 3.0. Skąd wziąć wartość klucza — i jak sprawdzić, że ją masz

Trzy różne pytania, trzy różne źródła. Mylenie ich kosztowało nas już jedno sprostowanie
audytu, więc rozdzielamy je tutaj, zanim ktokolwiek zacznie wpisywać polecenia:

| Pytanie | Gdzie jest odpowiedź | Czego się spodziewać |
|---|---|---|
| **Skąd wziąć wartość, żeby wykonać procedurę** | plik `.env.prod` **na maszynie operatora** | **Nie ma go w repozytorium.** Jest wyłączony z wersjonowania (`.gitignore`), `git ls-files` nie zna ani jednego takiego pliku, a świeży klon go nie zawiera (odczyt 2026-09-02) |
| **Czy klucz nadal żyje** | interfejs programowy Neona: `GET /api/v2/api_keys` | Źródło autorytatywne. Zrzut konfiguracji odpowiada na to pytanie tylko pozornie — `docs/policies/konfiguracja-produkcji-zrodlo-autorytatywne.md` (repozytorium firmy) |
| **Skąd wziąć NOWĄ wartość** | konsola Neona, **po sign-offie Darka** | Wystawienie zastępnika to czerwona linia, nie czynność operacyjna — §7. Nigdy w trakcie ceremonii |

**Wartości klucza w tym dokumencie nie ma i nie ma jej mieć.** Runbook niesie procedurę
i **miejsce**, z którego wartość pochodzi — nigdy samą wartość (`CLAUDE.md` §8).

Po wykonaniu podstawienia z bloku poniżej (`NEON_API_KEY=$(grep …)`) sprawdź, że **coś**
w zmiennej jest — nie wypisując, co:

```bash
if [ -z "$NEON_API_KEY" ]; then
  echo "STOP: klucz pusty — nie ma czym sie uwierzytelnic, nie strzelaj do API"
else
  echo "klucz niepusty, dlugosc: ${#NEON_API_KEY} znakow"
fi
```

Dlaczego to nie jest ceremonia: **pusta zmienna nie zatrzymuje `curl`.** Żądanie idzie,
wraca odpowiedź `401`, a ta wygląda jak awaria Neona albo unieważniony klucz — czyli
prowadzi śledztwo w złą stronę. To ten sam mechanizm awarii co „osiem pominiętych testów
wygląda jak sukces": **brak wejścia melduje się jak wynik.**

```bash
cd <repo>
NEON_API_KEY=$(grep '^NEON_API_KEY=' .env.prod | cut -d= -f2- | tr -d '"'"'"'')
PROJ=long-pond-11214233
```

Zmiennej **nie eksportujemy** (`export`) — zostaje zmienną powłoki, więc nie trafia do
środowiska procesu potomnego ani do jego podglądu przez `ps eww`.

**Uwaga o API:** `GET /api/v2/projects` **bez** `org_id` zwraca `400`
(`"org_id is required"`). Zawsze podawaj `?org_id=org-snowy-credit-81923605`.

### 3a. Przegląd stanu przed zmianą (zawsze najpierw)

```bash
printf 'header = "Authorization: Bearer %s"\n' "$NEON_API_KEY" | curl -s -K - \
  "https://console.neon.tech/api/v2/projects/$PROJ/branches" \
| python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['branches']),'galezi');[print(' ',b['created_at'][:10],b['id'],b['name']) for b in d['branches']]"
```

Jeśli gałęzi jest **10** — nie ma miejsca na kopię. Zwolnij slot wg sekcji 4 **przed**
ceremonią (nigdy w jej trakcie).

### 3b. Utworzenie kopii zapasowej

```bash
printf 'header = "Authorization: Bearer %s"\n' "$NEON_API_KEY" | curl -s -K - \
  -X POST -H "Content-Type: application/json" \
  "https://console.neon.tech/api/v2/projects/$PROJ/branches" \
  -d '{"branch":{"name":"prod-backup-pre-<CO>-<RRRRMMDD>","parent_id":"br-proud-sun-al3aezrj"}}'
```

Nazewnictwo trzymamy dotychczasowe — `prod-backup-pre-<zakres>-<data>`; przykłady
z realnego stanu w sekcji 1.

### 3c. Dlaczego `-K -`, a nie `-H` — pomiar, nie zapewnienie

Wersja v0.1 tego runbooka obiecywała w §3 *„klucz podajemy wyłącznie przez nagłówek
z podstawionej zmiennej"* i **łamała tę obietnicę w tych samych blokach kodu** (linie
80/91/116). Powód: powłoka rozwija `$NEON_API_KEY` **przed** uruchomieniem procesu, więc
gotowa wartość ląduje w argumentach (`argv`) — a `argv` każdego procesu widzi **dowolny
użytkownik maszyny** przez `ps`. Znalazł to Leo w przeglądzie PR #265.

To jest dokładnie przypadek nazwany w `CLAUDE.md` v1.16, bramka (i) warunek 5: *„klucz
prywatny podawany wyłącznie przez standardowe wejście — nigdy jako argument polecenia, bo
wtedy trafia do audytu i tablicy procesów"*. Stawka nie jest teoretyczna: ten klucz ma
zasięg **całej organizacji Neona** (sekcja 1), nie jednego projektu.

Pomiar wykonany na **wartości udawanej** (nigdy na prawdziwym kluczu), odczyt 2026-08-06.
Oba warianty strzelały do lokalnego nasłuchu zapisującego odebrany nagłówek:

**Wariant 1 — wzorzec z v0.1 (`-H` z podstawioną zmienną):**

```
$ ps aux | grep <znacznik> | grep -v grep
dariuszgradzik 28697 ... curl -s -H Authorization: Bearer <ATRAPA-ZREDAGOWANA> http://127.0.0.1:8973/api/v2/projects/projekt-pomiarowy/branches
--- liczba trafien w tablicy procesow: 1
```

Wartość stoi otwartym tekstem w tablicy procesów.

**Wariant 2 — wzorzec obowiązujący (`curl -K -`):**

```
$ ps aux | grep <znacznik> | grep -v grep
--- liczba trafien w tablicy procesow: 0

$ ps -eo args= | grep '^curl'
curl -s -K - http://127.0.0.1:8973/api/v2/projects/projekt-pomiarowy/branches
```

Zero trafień; w `argv` zostaje samo `-K -` i adres.

**Kontrola równoważności** — że poprawka nie psuje uwierzytelnienia. Nasłuch zapisał to,
co faktycznie odebrał w obu przebiegach:

```
  ODEBRANY Authorization: Bearer <ATRAPA-ZREDAGOWANA>
  ODEBRANY Authorization: Bearer <ATRAPA-ZREDAGOWANA>
```

Nagłówek dociera identyczny. Zmienia się wyłącznie droga: wejście standardowe zamiast
`argv`. Wniosek: różnica jest w widoczności, nie w działaniu — nie ma powodu, żeby
gdziekolwiek wracać do `-H` z podstawionym kluczem.

**Kontrola trzech kształtów wywołania.** `-K -` zajmuje wejście standardowe, więc osobno
sprawdzono, czy nie zjada ciała żądania w `POST` (3b) i czy działa z `-X DELETE` (sekcja 4):

```
GET    | Authorization=Bearer <ATRAPA-ZREDAGOWANA> | cialo=(brak ciala)
POST   | Authorization=Bearer <ATRAPA-ZREDAGOWANA> | cialo={"branch":{"name":"prod-backup-pre-TEST-20260806","parent_id":"br-proud-sun-al3aezrj"}}
DELETE | Authorization=Bearer <ATRAPA-ZREDAGOWANA> | cialo=(brak ciala)
```

Wszystkie trzy niosą nagłówek, a ciało `POST` dociera nienaruszone — `-d` i `-K -` nie
kolidują. To zamyka obawę, że poprawka działa tylko dla odczytu.

> **ODCZYT (3a) — ETYKIETA ZDJĘTA 2026-08-13.** v0.2 oznaczała 3a jako niezweryfikowane
> w postaci `-K -`: realne wywołanie z 2026-08-01 poszło jeszcze starym `-H`, a nową postać
> sprawdzono wyłącznie przeciw nasłuchowi lokalnemu (3c). **Domknięte wykonaniem** — dwa
> wywołania przeciw realnemu Neonowi w postaci `-K -`, oba zwróciły dane (Ethan, odczyt
> 2026-08-13 18:50 CEST): `GET /projects/$PROJ` (stąd `history_retention_seconds` = 21600)
> oraz `GET /projects/$PROJ/branches` (7 gałęzi, limit 10). Oczekiwanie z 3c potwierdzone
> odczytem: różnica wynosi zero.
>
> **ZAPIS (3b) NADAL NIEZWERYFIKOWANY** — i etykieta zostaje, bo tego nie wykonałem.
> Do sprawdzenia przejściem tam-i-z-powrotem (utwórz → potwierdź → skasuj) **przy
> najbliższym oknie poza ceremonią**; do tego czasu 3b jest procedurą opisaną, nie
> sprawdzoną. Naturalnym momentem jest pierwsze odświeżenie kopii z §8.

### 3d. Co zostało zredagowane — i co pomiar naprawdę pokazał

**Najpierw nośnik, potem pomiar.** Pozycja B8 planu z 2026-08-14
(`docs/operations/2026-08-14-oliver-plan-wpuszczenia-pierwszego-uczestnika-v0.1.md`,
repozytorium firmy) twierdzi: *„Sześć wystąpień w `docs/runbooks/neon-kopia-zapasowa.md`
nadal nieredagowanych"*. Pomiar całego pliku, 2026-09-02:

| Czego szukano | Trafień | Uwaga |
|---|---|---|
| adres połączenia z hasłem (`postgres://użytkownik:hasło@…`) | **0** | sprawdzone dwiema drogami — wyszukiwanie liniowe **i** po sklejeniu ośmiu linii łamanych odwrotnym ukośnikiem, bo zapis wielolinijkowy umyka temu pierwszemu |
| klucz o kształcie Neona (przedrostek `napi_`) | **0** | |
| przypisanie hasła (`PGPASSWORD`, `password=`) | **0** | |
| identyfikator klucza u dostawcy | **0** | |
| **atrapa pomiarowa z §3c** | **6** | w tekście opisana jako wartość udawana — ale kształtem nie do odróżnienia od żywego żetonu |
| wiersze poleceń podstawiające `$NEON_API_KEY` | **6** | procedura, nie wartość |

**Sześć wypada dwa razy, z dwóch różnych rzeczy** — dlatego sama liczba nie rozstrzyga,
o czym B8 mówi. Wniosek, który rozstrzyga: **nieredagowanej wartości poświadczenia nie
było w tym pliku ani jednej.** Zredagowana została pozycja piąta.

**Co zrobiono z atrapą.** Sześć jej wystąpień w §3c zastąpiono znacznikiem
`<ATRAPA-ZREDAGOWANA>`. Powód nie jest taki, że to był sekret — nie był. Powód jest taki,
że **miała kształt sekretu**: 34 znaki z liter, cyfr i myślników, tuż po słowie `Bearer`.
Człowiek musiał uwierzyć prozie obok, a skan sekretów — zgadnąć. Poprzednie brzmienie stoi
w historii repozytorium (commit `1ea2b06`); tutaj, zgodnie z `CLAUDE.md` §8, podajemy
**odcisk zamiast wartości: 34 znaki, `sha256` zaczyna się od `80e579b2`**. Kto chce
sprawdzić, że nie ruszono niczego poza tym, porównuje skrót — wartość nie jest mu do tego
potrzebna.

**Podmiana dotyczy cytatu z wyjścia polecenia, więc mówimy o niej wprost.** Wiersze §3c to
zapis realnego przebiegu, a cicha podmiana w cytacie byłaby przeredagowaniem dowodu. Sam
dowód zostaje nietknięty: w wariancie 1 wartość **jest** widoczna w tablicy procesów
(1 trafienie), w wariancie 2 **nie ma jej** (0 trafień). Zredagowano znak, nie wynik.

**Nic nie pilnuje tego maszynowo.** Gdyby ktoś jutro wkleił tu z powrotem literał
o kształcie żetonu, żaden test tego nie zatrzyma — ten dokument nie ma i nie ma mieć
własnej reguły skanu. Nośnikiem takiej reguły jest `.gitleaks.toml` (pozycja B8,
właściciel: Ethan); runbook ją **woła**, nie powtarza. Zapisane jako luka, nie jako
domknięcie.

**Ta redakcja nie zmienia werdyktu skanu — i nigdy nie miała.** Pomiar 2026-09-02,
`gitleaks detect --no-git` na samym tym pliku: **przed redakcją „no leaks found", po
redakcji „no leaks found"**. Reguły domyślne nie widziały tu niczego, więc sześć atrap
**nigdy nie było przyczyną czerwonej bramki** — czerwień nocnego przebiegu bierze się
z trzech literałów w pliku testowym, nie stąd. Wartość tej zmiany jest po stronie
czytelnika i przyszłych reguł: znika ciąg, który człowiek musiał rozstrzygać prozą,
a nowa, ostrzejsza reguła musiałaby rozstrzygać wyjątkiem.

**Czego ta redakcja NIE naprawia — i to jest pozycja, nie przeoczenie.** Skan sekretów
w ciągłej integracji (*CI* — serwer odpalający sprawdzenia po każdej zmianie) czyta
**commity, nie dysk**. Plik `.env.prod`, w którym wartość faktycznie leży, jest wyłączony
z wersjonowania — więc **żadna reguła skanu nigdy go nie ogląda**, niezależnie od tego, jak
dobrze ją napiszemy. Redakcja tego dokumentu nie zmienia tamtego stanu ani o jotę. Pozycją,
która go zmienia, jest rotacja z §7 — i ona czeka na sign-off Darka.

---

## 4. Zwalnianie slotu (bramka (g), delegacja v1.15)

Wolno kasować **wyłącznie** gałęzie `prod-backup-*` i robocze — **nigdy `main`, nigdy
projekt**. Zawsze zostają **dwie najnowsze** kopie stanu prod. Kopię młodszą niż 7 dni
tylko wtedy, gdy jest nadpisana nowszą kopią tego samego lub późniejszego stanu.
**Kasowanie przed ceremonią, nigdy w jej trakcie.**

```bash
printf 'header = "Authorization: Bearer %s"\n' "$NEON_API_KEY" | curl -s -K - \
  -X DELETE "https://console.neon.tech/api/v2/projects/$PROJ/branches/<BRANCH_ID>"
```

Po skasowaniu **zweryfikuj** przeglądem 3a — brak weryfikacji to założenie, że się udało.

---

## 5. Ścieżka B — konsola Neona (droga awaryjna) — ⚠ NIEZWERYFIKOWANA

`aktywacja-1e2-neon-console.md:13` opisuje ją jako *„Konsola Neon → Branches → New branch
z production"*. To jest **cytat z dokumentu, nie z realnego przejścia** — i tak ma być
oznaczone, dopóki ktoś jej nie przejdzie.

**Czego brakuje, a jest potrzebne, żeby ta droga była realną drogą awaryjną:** dokładne
nazwy przycisków w obecnym interfejsie, miejsce wyboru gałęzi nadrzędnej, czas trwania,
zachowanie przy limicie 10 gałęzi.

**Kto to zrobi:** wymaga przeglądarki i ludzkiego przejścia — **agent tego nie wykona**.
Prośba do Darka: jedno przejście, zrzut kroków, wpis tutaj.

**Dlaczego to nie jest dziś pilne** (a wcześniej wyglądało na pilne): kopie dla trwającej
ceremonii **już istnieją** (sekcja 6), więc bramka (b) jest dla niej spełniona niezależnie
od tego, czy ścieżka B działa. Pilne staje się przy **następnej** zmianie danych.

---

## 6. Kopie ceremonii 1E.7 — istnieją (stan 2026-08-01)

```
2026-08-01  br-raspy-feather-al6nn1fe  prod-backup-pre-0044-0045-l6-20260801
2026-08-01  br-green-river-algm6epa    prod-backup-pre-ingest-curriculum-l6-20260801
2026-08-01  br-bold-smoke-aligu9kf     prod-backup-pre-0046-pathkey-b1-20260801
```

Bramka (b) dla migracji `0044`/`0045`, zaciągu treści L6 i migracji `0046` (#264) jest
**spełniona i udokumentowana**. To odczyt ze stanu Neona, nie zapewnienie z czatu.

---

## 7. Rotacja klucza — otwarte, wymaga sign-offu Darka

Klucz ma zasięg całej organizacji (sekcja 1) i jest jedynym uwierzytelnieniem ścieżki A.

- Wystawienie zastępnika **nie mieści się** w delegacji tworzenia poświadczeń (v1.16,
  bramka (i)): klucz zdolny tworzyć gałęzie **nie jest tylko-do-odczytu** (warunek 1) i
  **daje władzę nad produkcją** (warunek zawsze-sign-off). To sign-off Darka.
- Kolejność bez skrótów: nowy klucz → podmiana w `.env.prod` → **dowód działania**
  (przejście tam-i-z-powrotem z sekcji 3b/4) → dopiero unieważnienie starego.
  Nigdy odwrotnie (ta sama zasada co przy rotacji `CONTENT_REPO_KEY`).
- **Proporcja (Ryan, 2026-08-01):** zawężanie tego jednego klucza przy komplecie
  poświadczeń produkcyjnych leżącym jawnym tekstem w dziesięciu kopiach `.env.prod` to
  przestawianie mebli. Prawdziwą pozycją jest całość — propozycja Ryana do 2026-08-15.
  Rotacja Neona ma sens, ale nie jest najwyżej punktowaną pozycją.

---

## 8. Okno życia kopii — reguła odświeżania (obietnica z klauzuli, nie porządki)

**Skąd to się bierze.** Sekcja 9 klauzuli informacyjnej (`docs/legal/klauzula-informacyjna-art13.md`)
obiecuje studentowi, że kopie z jego danymi wygasają najpóźniej w zadeklarowanym oknie.
**Liczba dni ma jeden nośnik i jest nim tamto zdanie** — tutaj jej nie przepisujemy
(CLAUDE.md v1.17). Kto potrzebuje wartości, czyta ją stamtąd maszynowo.

**Dlaczego to nie jest sprzątanie, tylko bramka.** Automatyczna historia Neona wynosi
**6 godzin** (`history_retention_seconds` = 21600, odczyt 2026-08-13) — mieści się w oknie
z ogromnym zapasem. Ale gałęzie `prod-backup-*` to **pełne kopie bazy i nie wygasają
w ogóle**; żyją do ręcznego skasowania. Do 2026-08-13 zdanie z klauzuli było prawdziwe
**przypadkiem** — bo akurat niedawno były ceremonie — a nie dlatego, że ktokolwiek
odliczał dni.

### Przegląd (kod wyjścia, nie wrażenie)

```bash
NEON_API_KEY=$(grep '^NEON_API_KEY=' .env.prod | cut -d= -f2- | tr -d '"')
printf 'header = "Authorization: Bearer %s"\n' "$NEON_API_KEY" | curl -s -K - \
  "https://console.neon.tech/api/v2/projects/$PROJ/branches" \
| pnpm exec tsx tools/kopie-zapasowe-przeglad.ts
```

| Kod | Werdykt | Co robisz |
|---|---|---|
| **0** | `W OKNIE` | nic — obietnica z sekcji 9 jest prawdziwa |
| **1** | `NARUSZENIE` | istnieje kopia starsza niż okno → **reguła odświeżania** niżej |
| **2** | `NIEROZSTRZYGNIĘTY` | nie odczytano wejścia albo okna z klauzuli. **To nie jest „prawie zielone"** — traktuj jak `1` |

### Reguła odświeżania — i dlaczego nie kłóci się z bramką (g)

Bramka (g) (`CLAUDE.md` v1.15) każe **zawsze zostawić dwie najnowsze** kopie stanu produkcji.
Przy dłuższej przerwie między ceremoniami obie przekroczą okno — i wtedy bramka (g) zabrania
skasować to, czego klauzula każe się pozbyć. **Rozwiązaniem jest odświeżenie, nie wyjątek
od bramki:**

> **Reguła.** Gdy przegląd zwróci `1`, a skasowanie przeterminowanych zeszłoby poniżej dwóch
> kopii — **najpierw zrób świeżą kopię** (§3b), **dopiero potem kasuj** przeterminowane (§4).
> Narzędzie mówi to wprost w werdykcie (`wymagaSwiezejKopiiPrzedKasowaniem`).
>
> **Uzasadnienie, nie zaklęcie:** świeża kopia jest zdjęciem stanu **po** usunięciach, więc
> **nie zawiera danych osoby, która konto usunęła**. Utrzymujemy dwie kopie, obietnica zostaje
> prawdziwa, żadna reguła nie ustępuje drugiej.

### Cena tej reguły — obie strony, bo czytać ją będzie ktoś pod presją

Przy **6-godzinnej** historii automatycznej te ręczne gałęzie **są** naszą zdolnością
odtworzeniową: poza sześciogodzinnym oknem nie ma z czego odtwarzać niczego innego.
Skracanie życia kopii to więc **wymiana ryzyka RODO na ryzyko odtworzeniowe**, nie darmowe
sprzątanie. Dlatego reguła brzmi „odśwież, potem skasuj", a nigdy „skasuj, bo termin" —
kolejność odwrotna zostawia okno, w którym nie mamy ani kopii w oknie, ani kopii w ogóle.

---

## 9. Odtworzenie z kopii — i krok „ponów usunięcia"

**Trzecia obietnica z sekcji 9 klauzuli** brzmi: *„jeśli musimy [system] odtworzyć —
ponawiamy na nim Twoje usunięcie"*. Do 2026-08-13 ten krok **nie istniał w żadnym runbooku**
— jedynym miejscem, w którym żył, było zdanie w klauzuli, którego nikt nie wykonuje.

**Dlaczego to konieczne.** Odtworzenie cofa bazę do stanu sprzed usunięcia konta, więc
**wskrzesza wiersze osoby, która skorzystała z art. 17**. Cofa przy tym także `audit_log`,
czyli ślad samego żądania — dlatego tabela produktu **nie może być jedynym rejestrem żądań**.

### Procedura (wykonuje Ethan)

1. **Nie promuj kopii od razu.** Odtwarzaj do **nowej gałęzi**, nie na `main`.
2. **Zbierz listę usunięć z gałęzi SPRZED odtworzenia** — dopóki istnieje, niesie zdarzenia
   `account.deletion.completed` (`src/lib/auth/account-deletion.ts`), których w kopii nie ma:

   ```sql
   SELECT target_id, created_at FROM audit_log
    WHERE action = 'account.deletion.completed' AND created_at > '<data utworzenia kopii>'
    ORDER BY created_at;
   ```
3. **Ponów usunięcia na odtworzonej gałęzi** — tą samą ścieżką co zwykłe usunięcie konta,
   nigdy ręcznym `DELETE` (kaskada i ślad muszą zachować się identycznie).
4. **Dopiero teraz promuj** odtworzoną gałąź.
5. **Zapisz w audit logu firmy**: co odtworzono, ile usunięć ponowiono, z jakiego odczytu.

### ⚠ Czego ta procedura NIE zamyka — i to jest pozycja, nie przeoczenie

Krok 2 działa, **dopóki gałąź sprzed odtworzenia istnieje** (awaria danych, zła migracja,
pomyłka operatora — czyli większość realnych przypadków). **Nie działa przy utracie całej
gałęzi produkcyjnej**: wtedy jedynym źródłem listy żądań byłby rejestr **poza bazą produktu**,
a takiego dziś **nie mamy** — wskazany w kodzie „audit log firmy" jest zapisywany hookiem na
maszynie operatora, więc dla usunięć samoobsługowych (student klika „usuń konto" na Vercelu)
jest **pusty z konstrukcji**, a nie „jeszcze niewypełniony".

Każdy trwały magazyn poza bazą, do którego umie pisać produkt, to **nowe źródło danych =
czerwona linia** (`CLAUDE.md` §4, sign-off Darka). **Właściciel decyzji: Darek**, przygotowanie:
Ryan (RoPA) + Ethan (wykonanie). **Próg: przed zapłonem `FLAG_ACCOUNT_DELETION`** — bramka 3
runbooka zapłonu (`docs/runbooks/zaplon-flagi-usuwania-konta.md`) jest domknięta w częściach
„okno" i „ponów usunięcia", a **otwarta** w części „rejestr poza bazą".

---
