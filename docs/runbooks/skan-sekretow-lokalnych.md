# Runbook — skan sekretów w lokalnych plikach środowiskowych

**Wersja:** v1.2 · 2026-08-10 · właściciel: Eva (Platform/DevOps) · sign-off bezpieczeństwa: Ryan (CRCO)
— **sign-off wycofany 2026-08-03, nieprzywrócony; ta wersja odpowiada na oba warunki i wraca do oceny.**

**Changelog v1.1 → v1.2** (dwa warunki Ryana z wycofanego sign-offu, blok Leo z 2026-08-06):
- **Warstwa 0 — kontrola uzbrojenia** w `tools/scan-local-secrets.sh`: skan sprawdza sam, czy
  `core.hooksPath` wskazuje `.githooks`, czy katalog istnieje i czy `pre-commit` jest wykonywalny.
  Rozbieżność = **kod 2**, nigdy ciche przepuszczenie. Sekcje 2 i 3; mutacje U1–U4 + kontrola
  odwrotna U0 w sekcji 6.
- **Sekcja 3.1 (nowa)** — `pnpm install` zapisuje `core.hooksPath` do konfiguracji **wspólnej**:
  jeden plik dla wszystkich drzew roboczych i gałęzi naraz (zmierzone: 21 drzew, brak
  `extensions.worktreeConfig`). Z klasą ostrzejszą Ryana: kto kontroluje `package.json`, kontroluje,
  skąd git bierze haki, bez commita w `.githooks/`.
- **Sekcja 6.3 (nowa)** — trzecia atrapa: bramka uzbrojona tylko z nazwy. Stan odtworzony
  niezależnie w izolowanym repozytorium; pomiar „git milczy i przepuszcza commit". Z nazwaną
  granicą: warstwa 0 ratuje tego, kto pyta, nie tego, kto nie pyta.
- `prepare` w `package.json` **nie połyka już błędu** (`|| true` → głośne ostrzeżenie na stderr).
- **Niezamknięte i tak oznaczone:** warunek prefiksów `GOCSPX-` / token Upstash (mutacje `M4`/`M5`)
  — numeracja U1–U4 celowo ich nie zajmuje. Decyzja o zakresie należy do Ryana.

**Changelog v1.0 → v1.1** (blokujące review Leo przy PR #266):
- **Sprostowanie jawne** przypisania warstw w tabeli mutacji — sekcja 6.1. Stare brzmienie zacytowane.
- Warstwa 3 przepisana: host **wyodrębniany** z adresu i porównywany na równość zamiast szukania
  podciągu w linii. Zamyka fałszywe alarmy na poprawnej konfiguracji lokalnej (B1) i trzy obejścia
  (N1 zdalna nazwa zaczynająca się od `localhost.`, N2 dowolna nazwa zmiennej, N3 przedrostek `export`).
- Sekcja 3: „koszt rzędu kilku milisekund" zastąpione zmierzonym czasem (sprostowanie, sekcja 6.1).
- Sekcja 5: dwie nowe nazwane luki (sekret w komentarzu, para zmiennych `PGHOST`/`PGPASSWORD`).

**Geneza:** follow-up po zapłonie 1E.4 (2026-07-26) — realny produkcyjny klucz Anthropic leżał
jawnym tekstem w `.env.test`. Do gita nigdy nie wszedł (zero aktywnego wycieku), ale naruszał
CLAUDE.md §10 (sekrety do magazynu sekretów, nigdy jawnym tekstem w środowisku).

## 1. Problem, który ta bramka rozwiązuje

Job `secret-scan (gitleaks)` w `.github/workflows/pr.yml` skanuje **commity** pull requesta.
`.env.test` jest w `.gitignore` (`.gitignore:80`) i nigdy nie był w historii repozytorium — dla CI
jest więc **strukturalnie niewidoczny**. Żadna bramka po stronie serwera nie mogła i nie może złapać
sekretu, który leży wyłącznie na dysku dewelopera. Bramka musi stać lokalnie, przed commitem.

Podział pracy między bramki:

| Gdzie leży sekret | Kto go łapie |
|---|---|
| w commicie / w historii gita | `secret-scan (gitleaks)` w CI (istnieje, bez zmian) |
| w lokalnym `.env.test` lub w szablonie `*.example` | **ten runbook** — hook `pre-commit` |
| w `.env.local` / `.env.prod` | nikt automatycznie — patrz sekcja 5 (znana, nazwana luka) |

## 2. Co jest skanowane

Pliki, które **z kontraktu** mają być wolne od realnych poświadczeń:

- `.env.test` — konfiguracja lokalnej bazy testowej (Docker, port 5433)
- `.env.example` — szablon śledzony przez gita
- `.env.test.example` — szablon śledzony przez gita (wzorzec ustalony w commicie `01f9f22`, PR #253)

Zanim skan cokolwiek przeczyta, sprawdza **sam siebie**:

0. **Kontrola uzbrojenia** — czy `core.hooksPath` wskazuje `.githooks`, czy ten katalog istnieje i czy
   `pre-commit` jest wykonywalny. Rozbieżność = **kod 2**, nigdy ciche przepuszczenie. Bramka, która
   nie wie, czy jest uzbrojona, jest atrapą (sekcja 6.3).

Trzy warstwy detekcji, wszystkie w `tools/scan-local-secrets.sh`:

1. **gitleaks** (`gitleaks dir <plik> --redact`) — reguły + entropia. **Węższa, niż się wydaje.**
   Zmierzone 2026-08-03: reguła `anthropic-api-key` zapala się na kształcie kanonicznym (człon
   `api03` + 93 znaki + końcówka `AA`) w **10/10** losowań, ale **milczy** na czterech wariantach:
   bez końcówki, krótszym, ze starszym członem `api02`, bez członu `api03` (patrz sekcja 6.1).
2. **lista zakazanych prefiksów** — deterministyczna siatka na kształty poświadczeń, które reguła
   entropijna przepuszcza: prefiksy kluczy Anthropic, OpenAI, hasła roli Neona, tokenów GitHuba
   i kluczy Stripe'a (pełna lista w nagłówku skryptu). Prefiks wyszukiwany jest **w dowolnym miejscu
   linii**, nie tylko zaraz po znaku równości — hasło roli bazy siedzi w środku adresu połączenia.
   Dla klasy incydentu 1E.4 **to jest warstwa jedyna deterministyczna** — utrzymywana ręcznie lista.
3. **host w `.env.test` musi być lokalny** — dotyczy **każdej** zmiennej z adresem, nie tylko o nazwie
   kończącej się na `_URL`, i obejmuje linie z przedrostkiem `export`. Host jest **wyodrębniany**
   z adresu (poświadczenia odcinane po ostatniej małpie, port i nawiasy IPv6 zdejmowane) i porównywany
   **na równość** z listą: `localhost`, `127.0.0.0/8`, `::1`, `0.0.0.0`, `host.docker.internal`.
   Adres bez poświadczeń — a więc bez znaku małpy — jest poprawną konfiguracją lokalną i przechodzi.
   Poświadczenie produkcyjne wklejone tu w całości nie musi mieć rozpoznawalnego prefiksu ani wysokiej
   entropii, ale **zawsze** ma zdalny host. Warstwa dotyczy wyłącznie `.env.test` (szablony `*.example`
   wolno mają hosty przykładowe).

Skan biegnie z `--redact`; **wartość sekretu nigdy nie trafia na wyjście** — ani do terminala,
ani do logu CI (CLAUDE.md §8).

## 3. Uruchomienie i aktywacja

```bash
pnpm secrets:scan-local               # ręcznie, w dowolnej chwili
git config core.hooksPath .githooks   # aktywacja hooka (robi to `pnpm install` przez skrypt `prepare`)
git config --get core.hooksPath       # weryfikacja: ma zwrócić `.githooks`
```

Hook `pre-commit` odpala ten sam skrypt przed każdym commitem. Zmierzony koszt: **174 / 176 / 180 ms**
(trzy przebiegi na realnych plikach, 2026-08-03; niezależny pomiar Leo: 181 / 182 / 250 ms). Dominuje
start binarki gitleaks, po jednym uruchomieniu na plik. To około jedna piąta sekundy — na tyle mało,
że nie ma pokusy omijać hooka, i na tyle dużo, że nie wolno o tym pisać „kilka milisekund"
(sprostowanie w sekcji 6.1).

**Kiedy bramka jest uzbrojona:** hook działa tam, gdzie jednocześnie (a) `core.hooksPath` wskazuje
`.githooks`, (b) katalog `.githooks/` istnieje w drzewie roboczym i (c) `pre-commit` ma bit
wykonywalności. Do czasu scalenia tej gałęzi do `main` warunek (b) spełniają tylko checkouty z tą
gałęzią. Po scaleniu — wszystkie.

**Skan sprawdza te trzy warunki sam (warstwa 0) i przy rozbieżności kończy kodem 2**, nigdy nie
przepuszcza w ciszy. Powód jest zmierzony, nie teoretyczny — patrz sekcja 6.3.

### 3.1. `pnpm install` zmienia konfigurację WSPÓLNĄ, nie „ten checkout"

To jest ostrzeżenie, nie ciekawostka. Skrypt `prepare` wykonuje `git config core.hooksPath .githooks`,
czyli zapis do `.git/config` w **katalogu wspólnym repozytorium** — jednego pliku dla **wszystkich
drzew roboczych (worktree) i wszystkich gałęzi naraz**. Nie jest to ustawienie „tego checkoutu".

Zmierzone 2026-08-10 na kanonicznym repozytorium:

```
$ git -C <katalog główny>   config --show-origin --get core.hooksPath
file:.git/config        .githooks
$ git -C <inne drzewo robocze> config --show-origin --get core.hooksPath
file:/…/SkillBridge/.git/config    .githooks      ← TEN SAM plik
$ git worktree list | wc -l
21                                                ← tyle drzew dzieli ten plik
$ git config --get extensions.worktreeConfig
(brak)                                            ← rozdzielenia konfiguracji NIE MA
```

Praktyczne skutki, oba realne:

1. **Jeden `pnpm install` na jednej gałęzi uzbraja — albo rozbraja — wszystkie pozostałe drzewa
   robocze.** Stąd bierze się stan opisany w sekcji 6.3: ustawienie wskazuje `.githooks`, a w drzewie
   stojącym na gałęzi bez tego katalogu haka po prostu nie ma. Git w takim stanie milczy.
2. **Klasa ostrzejsza (znalezisko Ryana/CRCO, 2026-08-03):** kto kontroluje `package.json`, ten
   kontroluje, **skąd git bierze haki** — jednym `pnpm install`, bez żadnego commita w `.githooks/`.
   Dziś jest to nasz własny, poprawny skrypt. Jako wzorzec jest to **przekierowanie strażnika
   ustawieniem spoza jego katalogu**: przegląd zmian w `.githooks/` nie wystarcza, bo miejsce, z
   którego git czyta haki, ustala plik leżący gdzie indziej. Przy przeglądzie `package.json` skrypt
   `prepare` czyta się więc jak zmianę w konfiguracji bezpieczeństwa, a nie jak drobiazg build'owy.

Skrypt `prepare` **nie połyka już błędu w ciszy**: przy niepowodzeniu wypisuje głośne ostrzeżenie na
wyjście błędów. Świadomie nie kończy instalacji błędem — `pnpm install` bywa uruchamiany tam, gdzie
katalogu `.git` nie ma (obraz kontenera budowany z samego `package.json`), a wysadzanie instalacji
w takim miejscu zamieniłoby jedną cichą awarię na inną, głośniejszą i niezwiązaną. Egzekucję niesie
warstwa 0 skanu, nie `prepare`.

**Brak binarki `gitleaks` = błąd twardy (kod 2), nie ciche przepuszczenie.** Bramka bez skanera jest
atrapą; instalacja: `brew install gitleaks`.

## 4. Co zrobić, gdy bramka jest czerwona

Nie wpisuj poświadczenia do pliku. Wzorzec jest udokumentowany w `.env.test.example`: klucz podaje
się **eksportem zmiennej w powłoce**, z wartością wziętą z magazynu sekretów. `dotenv` nie nadpisuje
zmiennej ustawionej w powłoce — eksport wygrywa nad plikiem. W CI klucz wstrzykuje osobny sekret
`ANTHROPIC_API_KEY_CI` (GitHub Secrets), niezależny od tego pliku. Bez klucza suity oznaczone
`@llm` jawnie się pomijają (skip).

Jeśli sekret już trafił do commita — bramka lokalna jest za późno; ścieżka to unieważnienie
(rotacja) poświadczenia u dostawcy, nie przepisywanie historii.

## 5. Znana luka — `.env.local` i `.env.prod`

Te dwa pliki **z definicji** trzymają realne poświadczenia, więc skan zawsze byłby czerwony,
a bramka czerwona-zawsze to bramka wyłączona. Świadomie ich nie skanujemy. Ich obrona to dziś:
prawa dostępu `0600`, `.gitignore` oraz gitleaks w CI (gdyby ktoś je jednak zacommitował).

Otwarte zadanie (właściciel: Ethan/CTO, poza zakresem tego runbooka): migracja obu do magazynu
sekretów zgodnie z CLAUDE.md §10. Do tego czasu luka jest **nazwana, nie zamknięta** — nikt nie ma
prawa cytować tej bramki jako dowodu, że „sekretów w plikach środowiskowych już nie ma".

### 5.1. Dziury świadomie zostawione otwarte (znalezione w review Leo, PR #266)

Nazwane, nie naprawione — żeby nikt nie policzył ich jako pokrytych:

- **Sekret w komentarzu przechodzi wszystkie trzy warstwy.** Warstwy 2 i 3 pomijają linie zaczynające
  się od `#`. To pominięcie jest **nośne**: `.env.test.example:28` cytuje w prozie sam prefiks klucza
  Anthropic, żeby wytłumaczyć, czego nie wpisywać — bez pomijania komentarzy szablon czerwieniłby
  bramkę na własnej dokumentacji. Kierunek naprawy (sugestia Leo, osobny PR): pomijać komentarze
  **tylko** w plikach `*.example`, a w `.env.test` skanować także komentarze.
- **Rozbite poświadczenie omija warstwę 3.** Biblioteki Postgresa honorują zmienne `PGHOST`,
  `PGUSER`, `PGPASSWORD` podane osobno — wtedy nie ma żadnego adresu, więc nie ma czego wyodrębnić.
  Warstwa 2 złapie hasło tylko wtedy, gdy ma rozpoznawalny prefiks.
- **Warstwa 2 jest dobrowolna** — działa wyłącznie lokalnie. Szablony `.env.example`
  i `.env.test.example` **są śledzone przez gita**, więc dla nich da się to egzekwować serwerowo,
  w CI. Domena Leo, osobny PR. Do listy prefiksów dochodzą wtedy sekret klienta Google (`GOCSPX-`)
  i token Upstash (znalezisko z sign-offu Ryana), z mutacjami M4/M5, które to udowodnią.

## 6. Dowód, że bramka nie jest atrapą

Bramka bez mutacji, która ją czerwieni, jest atrapą. Procedura — do powtórzenia przy **każdej**
zmianie skryptu. Wszystkie ładunki są syntetyczne (losowane na miejscu z `/dev/urandom`); w repo
nigdy nie zapisujemy prawdziwej wartości.

**Bramka musi mieć obie strony:** mutację, która ją czerwieni, **i kontrolę odwrotną** — poprawną
konfigurację, która ma zostać zielona. Bramka czerwona zawsze umiera szybciej niż bramka za wąska:
pierwszy człowiek, któremu zablokuje niepowiązaną pracę, dopisuje `--no-verify` do nawyku.

Kontrole odwrotne — **mają przechodzić** (kod `0`):

| # | Poprawna konfiguracja lokalna w `.env.test` | 2026-08-03 |
|---|---|---|
| B1a | adres bazy **bez poświadczeń** (uwierzytelnianie zaufaniem — standard w kontenerze) | kod 0 |
| B1b | host `host.docker.internal` | kod 0 |
| B1c | adres IPv6 w nawiasach `[::1]` | kod 0 |
| B1d | `127.0.0.1` bez poświadczeń | kod 0 |
| B1e | adres w cudzysłowie | kod 0 |
| B1f | linia z przedrostkiem `export`, host lokalny | kod 0 |

Mutacje — **mają czerwienić** (kod `1`). Ładunki syntetyczne, losowane z `/dev/urandom`:

| # | Mutacja dopisana do `.env.test` | Która warstwa łapie | 2026-08-03 |
|---|---|---|---|
| M1 | zmienna o **kanonicznym** kształcie klucza Anthropic (`api03` + 93 znaki + `AA`) | 1 **i** 2 | kod 1 |
| M1′ | ten sam klucz w kształcie odbiegającym (bez `AA` / krótszy / `api02` / bez `api03`) | **tylko 2** | patrz 6.1 |
| M2 | adres bazy z hasłem roli Neona (prefiks `npg_`), zdalny host | 2 **i** 3 | kod 1 |
| M3 | zdalny adres bazy, hasło **bez** rozpoznawalnego prefiksu | tylko 3 | kod 1 |
| N1 | zdalna nazwa hosta **zaczynająca się** od `localhost.` | tylko 3 | kod 1 |
| N2 | ładunek pod zmienną o nazwie spoza wzorca `*_URL` | tylko 3 | kod 1 |
| N3 | ten sam ładunek w linii z przedrostkiem `export` | tylko 3 | kod 1 |

Po każdej mutacji: `pnpm secrets:scan-local` ma zwrócić kod `1`, a `git commit` ma zostać
**zablokowany** przez hook (zmierzone: kod 1, HEAD bez zmian). Po przywróceniu pliku — kod `0`,
zero fałszywych alarmów na realnych plikach kanonicznego checkoutu.

Mutacje **uzbrojenia** (warstwa 0) — mają dawać **kod 2**, czyli błąd konfiguracji, a nie „czysto":

| # | Stan uzbrojenia | Oczekiwane | 2026-08-10 |
|---|---|---|---|
| U0 | poprawnie uzbrojona (kontrola odwrotna) | kod 0 | kod 0 |
| U1 | `core.hooksPath` **odpięty** | kod 2 | kod 2 |
| U2 | `core.hooksPath` = `.githooks`, **katalogu brak** — stan `main` | kod 2 | kod 2 |
| U3 | `core.hooksPath` wskazuje **inny istniejący** katalog haków | kod 2 | kod 2 |
| U4 | katalog jest, `pre-commit` **bez bitu wykonywalności** | kod 2 | kod 2 |

U1–U4 numerujemy osobno od `M4`/`M5`, które są **zarezerwowane** dla mutacji prefiksów `GOCSPX-`
i tokenu Upstash z warunku Ryana — żeby numeracja nie sugerowała, że ten warunek został zamknięty.

### 6.1. Sprostowanie jawne (v1.0 → v1.1)

CLAUDE.md §8 wymaga sprostowania jawnego, nie cichego przeredagowania — tym bardziej że Ryan czytał
tabelę z v1.0 jako ustalenie faktu przy sign-offie bezpieczeństwa.

**Sprostowanie 1 — przypisanie warstw przy M1.** Brzmienie v1.0:

> | M1 | zmienna o kształcie klucza Anthropic (prefiks `sk-ant-api03-` + 95 znaków) | czerwona (warstwy 1+2) |

Zapis sugerował **redundancję**: dwa niezależne mechanizmy na klasę incydentu, dla której ten runbook
powstał. Redundancja jest **warunkowa i wąska**. Pomiar 2026-08-03 (`gitleaks dir <plik>`, kod wyjścia
odczytany bez potoku):

| Kształt ładunku | gitleaks (warstwa 1) |
|---|---|
| kanoniczny: człon `api03` + 93 znaki + `AA`, 10 losowań | kod 1 w **10/10** |
| kanoniczny, ale same małe litery (niska entropia) | kod 1 |
| bez końcówki `AA` | **kod 0** |
| krótszy (40 znaków) | **kod 0** |
| starszy człon `api02` | **kod 0** |
| prefiks bez członu `api03` | **kod 0** |

Wniosek, który ma stać w tabeli zamiast poprzedniego: dla kształtu kanonicznego warstwy 1 i 2 działają
obie; **dla każdego odstępstwa od kształtu jedyną siatką jest ręcznie utrzymywana lista prefiksów
(warstwa 2)**. Nikt nie ma prawa czytać tej bramki jako „dwóch niezależnych zabezpieczeń na klucz API".

*Rozbieżność pomiarowa, jawnie niedomknięta:* Leo zmierzył przy M1 `gitleaks kod=0` w 3/3 przebiegach.
U mnie ładunek kanoniczny daje kod 1 w 10/10. Dwie hipotezy sprawdzone: (a) `gitleaks dir` **nie**
pomija plików z `.gitignore` — ani wskazany na plik, ani na katalog (kod 1 w obu wariantach), więc
to nie to; (b) ładunek odbiegający od kształtu kanonicznego daje kod 0 **deterministycznie** — to
tłumaczy 3/3 i jest hipotezą wiodącą. Domknięcie wymaga dokładnej komendy i ładunku Leo. Do tego czasu
liczba „10/10" dotyczy **wyłącznie** kształtu kanonicznego i tak ma być cytowana.

**Sprostowanie 2 — koszt bramki.** Brzmienie v1.0:

> Skaner biegnie na trzech małych plikach — koszt rzędu kilku milisekund, więc nie ma pokusy go omijać.

Zmierzone: **174 / 176 / 180 ms** (Eva), **181 / 182 / 250 ms** (Leo) — czyli rząd wielkości wyżej,
jedna piąta sekundy. Wniosek („nie ma pokusy omijać") się broni, przesłanka liczbowa nie. Poprawione
brzmienie w sekcji 3.

### 6.2. Historia dwóch atrap — nie usuwać

1. Pierwsza wersja **warstwy 2** dopasowywała `ZMIENNA=<prefiks>` i przepuściła M2: hasło roli bazy
   nie stoi po znaku równości, tylko w środku adresu połączenia. Wykryła to mutacja, nie przegląd kodu.
2. Pierwsza wersja **warstwy 3** szukała w linii podciągu „małpa + `localhost`". Robiła dwie szkody
   naraz: czerwieniła poprawny adres bez poświadczeń (który nie ma małpy — B1a) i przepuszczała zdalną
   nazwę zaczynającą się od `localhost.` (N1). Do tego patrzyła tylko na zmienne pasujące do wzorca
   `*_URL` (N2) i nie widziała linii z `export` (N3) — czyli zapisu, który **ten sam runbook zaleca**
   w sekcji 4. Wykrył to przegląd Leo, nie moje mutacje: moja tabela testowała wyłącznie kształty,
   które sama uznałam za groźne.

Stąd twarda reguła: **każda zmiana skryptu przechodzi całą tabelę z sekcji 6 — mutacje i kontrole
odwrotne** — a nowa warstwa wchodzi razem z mutacją, która ją czerwieni, i konfiguracją, która ma
przez nią przejść.

### 6.3. Trzecia atrapa — bramka uzbrojona tylko z nazwy

Najgroźniejsza z trzech, bo nie zostawia żadnego objawu. Znalazł ją Leo (2026-08-06), a stan
**odtworzyłam niezależnie** w izolowanym repozytorium 2026-08-10 — nie w kanonicznym, bo mutowanie
`core.hooksPath` zmienia konfigurację wspólną dla 21 drzew roboczych i zepsułoby pracę innych sesji.

Stan wyjściowy: `core.hooksPath` = `.githooks` (ustawione), katalogu `.githooks/` **nie ma** — czyli
dokładnie to, co było na `main` (sprawdzone 2026-08-10 na `1da1f93`: `git ls-tree origin/main .githooks`
zwraca pusto).

Pomiar, ten sam ładunek w obu przebiegach:

| Stan | `git commit` | HEAD | Co powiedział git |
|---|---|---|---|
| bramka **uzbrojona** | kod 1 | **bez zmian** | zablokował, wskazał znalezisko |
| `hooksPath` ustawiony, **katalogu brak** | **kod 0** | **przesunięty** | **nic — ani słowa** |

Trzy ciche „w porządku" składały się na bramkę, której nie było: git nie protestuje na wskazanie
nieistniejącego katalogu haków, `prepare` miał doklejone `|| true`, więc `pnpm install` kończył się
zielono także przy nieudanym uzbrojeniu, a sam skan uruchamiany ręcznie mówił „zielona", bo pliki
faktycznie były czyste. Żaden z trzech sygnałów nie kłamał z osobna; razem dawały fałsz.

**Czego warstwa 0 nie umie — granica nazwana wprost.** Gdy `core.hooksPath` jest zepsuty, hak
`pre-commit` **nie uruchamia się w ogóle**, więc kontrola uzbrojenia nie ma jak wykonać się w ścieżce
commita. Zamienia cichy brak bramki w **głośny błąd przy uruchomieniu skanu** — ratuje więc tego, kto
pyta (`pnpm secrets:scan-local`), a nie tego, kto nie pyta. Domknięcie od strony serwera (egzekucja
warstwy 2 na śledzonych szablonach w CI) to domena Leo i osobny PR. Do tego czasu: **nazwane, nie
zamknięte**.
