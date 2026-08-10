# Runbook — czujnik nocnego przebiegu CI

**Wersja:** v1.0 · 2026-08-10 · właściciel: Eva (Platform/DevOps) · domena 13 (Availability & Recovery)

**Geneza:** dwie luki nazwane jawnie przy wdrożeniu zadania `nocny-alarm` (PR #274) i świadomie tam
zostawione otwarte: (1) przebieg, który w ogóle nie wystartuje, (2) pad samego alarmu. Autoryzacja
budowy wraz ze stałym kosztem: Darek, 2026-08-10.

---

## 1. Co ten czujnik pilnuje — i czego NIE pilnuje

Pilnuje **istnienia** nocnego przebiegu, nie jego koloru.

| Mechanizm | Pytanie, na które odpowiada | Gdzie mieszka |
|---|---|---|
| 12 bramek w `pr.yml` | czy kod jest poprawny | GitHub Actions |
| zadanie `nocny-alarm` | czy nocny przebieg był **zielony** | GitHub Actions |
| **ten czujnik** | czy nocny przebieg **w ogóle się odbył** | **poza** GitHub Actions |

### Mechanizm awarii, który to zamyka

**Brak sygnału wygląda dokładnie jak sygnał pomyślny.** Gdy cron GitHuba nie odpali — awaria
platformy (zdarzyła się 2026-08-06) albo wygaszenie crona w repozytorium bez aktywności przez 60 dni
— nie ma przebiegu. Nie ma przebiegu, nie ma czego zaczerwienić, więc `nocny-alarm` milczy. Ale
milczy też wtedy, gdy wszystko jest w porządku. Te dwa stany są z zewnątrz nieodróżnialne, a różnią
się tym, że w jednym z nich nie mamy żadnych bramek i o tym nie wiemy.

### Dlaczego harmonogram stoi poza Actions

Czujnik wiszący w tym samym mechanizmie, który ma pilnować, dziedziczy jego awarie — w jedynym
momencie, w którym jest potrzebny, byłby wyłączony razem z obserwowanym systemem. Dlatego wyzwalacz
to `launchd` na maszynie operatora (`ops/launchd/cc.nordsignal.czujnik-nocny.plist`).

**Uczciwe zastrzeżenie:** czujnik *czyta* odpowiedź przez API GitHuba, więc od GitHuba jest zależny.
Różnica jest istotna: nie zależy od **harmonogramu** GitHuba, tylko od odczytu — a gdy odczyt się nie
uda, to też jest alarm (reguła niżej).

### Reguła naczelna: niepewność to alarm

Każdy stan, w którym czujnik **nie jest w stanie stwierdzić**, że przebieg był, kończy się alarmem:
brak sieci, błąd API, brak `gh`, wygasłe uwierzytelnienie, zero przebiegów w historii. Zachowanie
odwrotne („nie wiem, więc milczę") odtworzyłoby dokładnie tę awarię, którą czujnik ma zamykać.

## 2. Kanały alarmu

Alarm idzie **kilkoma kanałami naraz**, bo najgroźniejszy przypadek to ten, w którym GitHub jest
niedostępny — wtedy kanał „zgłoszenie na GitHubie" nie zadziała i musi zostać coś widocznego lokalnie.

1. **Powiadomienie systemowe** (`osascript`) — natychmiastowe, lokalne, niezależne od GitHuba.
2. **Plik stanu** `~/.nordsignal/czujnik-nocnego-przebiegu/` — `ostatni-odczyt.txt` (tętno) i
   `historia.log`. Zapisywany przy **każdym** przebiegu, także pomyślnym.
3. **Zgłoszenie na GitHubie** (etykieta `czujnik-nocny`) — najlepszy wysiłek. Jedno zgłoszenie
   odświeżane komentarzem, nie jedno na dobę. Porażka tego kanału **nie wycisza** alarmu.

Zamknięcie zgłoszenia jest **ręczne** — to potwierdzenie, że ktoś sygnał widział.

## 3. Instalacja

```bash
# 1. Kopia OPERACYJNA poza drzewem roboczym (uzasadnienie niżej):
mkdir -p ~/.nordsignal/bin
cp tools/czujnik-nocnego-przebiegu.sh ~/.nordsignal/bin/
chmod +x ~/.nordsignal/bin/czujnik-nocnego-przebiegu.sh

# 2. Kontrola zgodności kopii z repo — po KAŻDEJ aktualizacji skryptu:
shasum -a 256 ~/.nordsignal/bin/czujnik-nocnego-przebiegu.sh
shasum -a 256 tools/czujnik-nocnego-przebiegu.sh      # skróty muszą się zgadzać

# 3. Harmonogram (launchd nie rozwija `~` — ścieżka w plist jest bezwzględna):
cp ops/launchd/cc.nordsignal.czujnik-nocny.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/cc.nordsignal.czujnik-nocny.plist 2>/dev/null
launchctl load  ~/Library/LaunchAgents/cc.nordsignal.czujnik-nocny.plist
launchctl list | grep czujnik-nocny        # weryfikacja: ma być na liście

# 4. Sprawdzenie ręczne w dowolnej chwili:
bash ~/.nordsignal/bin/czujnik-nocnego-przebiegu.sh; echo "kod=$?"
```

**Dlaczego kopia operacyjna leży POZA drzewem roboczym.** Pierwsza wersja wskazywała plik w
kanonicznym checkoucie i była błędna z dwóch powodów, oba wyszły dopiero przy realnej instalacji:
checkout stoi na `main`, gdzie tego pliku **nie ma**; a nawet po scaleniu drzewo robocze zmienia
gałęzie, a repozytorium ma **21 drzew** — harmonogram wskazujący w drzewo robocze przestawałby
działać przy każdym przełączeniu gałęzi, **w ciszy**. Cena tego rozwiązania: kopia może rozjechać
się z repo, stąd obowiązkowy krok 2.

**Weryfikacja, że czujnik naprawdę żyje** (nie: że polecenie zwróciło zero):

```bash
launchctl list | grep czujnik-nocny         # wpis + kod wyjścia ostatniego przebiegu
cat ~/.nordsignal/czujnik-nocnego-przebiegu/ostatni-odczyt.txt   # tętno: data + werdykt
cat ~/.nordsignal/czujnik-nocnego-przebiegu/historia.log         # ślad kolejnych przebiegów
cat /tmp/nordsignal-czujnik-nocny.out.log                        # dziennik launchd
```

Data w tętnie starsza niż doba = czujnik nie żyje (patrz sekcja 6, luka 2).

Parametry przez zmienne środowiskowe: `CZUJNIK_OKNO_H` (domyślnie 26), `CZUJNIK_REPO`,
`CZUJNIK_WORKFLOW`, `CZUJNIK_STAN`, `CZUJNIK_ETYKIETA`.

**Dlaczego okno to 26 h, a nie 24 h:** cron GitHuba bywa opóźniony o kilkadziesiąt minut przy dużym
obciążeniu kolejki. Czujnik ma łapać **brak** przebiegu, nie jego spóźnienie — okno 24 h dawałoby
fałszywe alarmy, a fałszywy alarm zabija czujnik równie skutecznie jak milczenie, tylko przez
przyzwyczajenie operatora do ignorowania.

## 4. Koszt — liczby, nie ogólnik

| Pozycja | Wartość | Uwaga |
|---|---|---|
| Koszt pieniężny | **0 PLN/mc** | istniejący sprzęt, istniejące uwierzytelnienie `gh`, zero nowych usług |
| Czas przebiegu | **1216 / 1283 / 1161 ms** | zmierzone 2026-08-10, trzy przebiegi, ścieżka „cisza" |
| Zapytania do API | **~2 dziennie** | limit 5000/h; odczyt `rate_limit` 2026-08-10: `pozostalo=4889` |
| Nowe zależności | **żadne** | `gh`, `bash`, `launchd` — wszystko już zainstalowane |

To był warunek autoryzacji: koszt stały jest **zerowy**, bo czujnik nie kupuje żadnej usługi.
Cena tego wyboru jest inna niż pieniężna — patrz luka 1 w sekcji 6.

## 5. Dowód, że czujnik nie jest atrapą

Sonda, której wynik negatywny jest tym uspokajającym, **wymaga kontroli dodatniej** — inaczej nie
jest sondą. Tu cały czujnik jest taką sondą: jego normalny stan to cisza.

Zmierzone 2026-08-10:

| # | Stan | Oczekiwane | Wynik |
|---|---|---|---|
| K1 | okno 26 h, nocny przebieg **był** (6 h temu) | cisza, kod 0 | **kod 0** |
| K2 | **kontrola dodatnia** — okno 2 h, czyli w oknie **nic nie ma** | ALARM, kod 1 | **kod 1** |
| K3 | API nieosiągalne (nieistniejące repozytorium) | ALARM, kod 1 | **kod 1** |
| K4 | workflow bez **żadnego** przebiegu `schedule` | ALARM, kod 1 | **kod 1** |
| K5 | **pierwszy odczyt nieaktualny** (124 h), drugi poprawny | cisza, kod 0 | **kod 0** |
| K6 | **oba** odczyty pokazują brak świeżego przebiegu | ALARM, kod 1 | **kod 1** |

K5 i K6 są parą: pierwsza dowodzi, że potwierdzenie **odsiewa chwilową nieaktualność API**, druga —
że **nie chowa prawdziwej ciszy**. Sam K5 byłby dowodem, że nauczyłam czujnik milczeć.

Deduplikacja sprawdzona przy okazji: cztery alarmy dały **jedno** zgłoszenie (#277) z komentarzami
odświeżającymi, zero duplikatów.

### 5.2. Uruchomienie na żywej maszynie — 2026-08-10

Harmonogram wgrany i **wyzwolony przez `launchd`, nie ręcznie**:

```
$ launchctl list | grep czujnik-nocny
-	0	cc.nordsignal.czujnik-nocny
zaladowany 12:20:34, wyzwolenie zaplanowane na 12:25 -> WYZWOLILO SIE o 12:25:04
```

**Pierwszy przebieg na żywej maszynie dał FAŁSZYWY ALARM** — i to jest najważniejszy wynik tej
instalacji, patrz sekcja 5.3.

### 5.1. Fałszywy alarm w pierwszej wersji — nie usuwać

Pierwsza wersja czytała JSON wyrażeniem regularnym z zachłannym `.*`, przez co brała **ostatni**
`createdAt` w odpowiedzi, czyli przebieg **najstarszy** z dziesięciu. Czujnik krzyczał „219 h" przy
przebiegu sprzed pięciu godzin — i otworzył zgłoszenie #277, które jest artefaktem tej pomyłki.

Zapis zostaje, bo niesie regułę: **fałszywy alarm zabija czujnik równie skutecznie jak milczenie**,
tylko wolniej i przez przyzwyczajenie. Wybór najnowszego znacznika robi teraz `jq` (`max`), nie
kolejność zwracana przez API ani parsowanie tekstu.

### 5.3. Luka „API odpowiada nieprawdę" zmaterializowała się przy pierwszym uruchomieniu

W wersji v1.0 wypisałam wśród luk: *„API GitHuba odpowiada, ale nieprawdę. Czujnik ufa odpowiedzi."*
Napisałam to jako możliwość teoretyczną. **Zdarzyło się w pierwszym przebiegu na żywej maszynie**,
około 40 minut później.

Pomiar, dwa przebiegi tego samego czujnika, ta sama maszyna, to samo środowisko:

```
2026-08-10T10:25:04Z  ALARM  ostatni nocny przebieg ma 124 h (limit 26 h)
2026-08-10T10:27:42Z  OK     ostatni przebieg sprzed 6 h (2026-08-10T04:24:49Z)
```

Odpowiedź z 10:25:04Z **pominęła pięć najnowszych przebiegów nocnych** i jako najnowszy podała
`2026-08-05T05:40:53Z`. To nie był śmieć ani błąd arytmetyki — **to jest realny przebieg**, tylko
sprzed pięciu dni (5 d 4 h 44 min = 124,7 h, zgadza się co do godziny z komunikatem). Zapytanie
powtórzone z tego samego środowiska, z katalogu `/`, przy minimalnym zestawie zmiennych — zwracało
poprawny stan. Przyczyny po stronie GitHuba **nie ustaliłam i jej nie zmyślam**; obserwacja jest
taka, że odpowiedź bywa nieaktualna.

Skutek: fałszywy alarm i zgłoszenie #286.

**Naprawa — potwierdzenie przed alarmem.** Zanim czujnik krzyknie, pyta drugi raz i alarmuje dopiero,
gdy oba odczyty się zgadzają. Oba odczyty trafiają do dziennika (`diagnostyka=…`), więc powtórka
będzie diagnozowalna zamiast zagadkowa. Dowód, że naprawa działa w obie strony: K5 i K6 wyżej.

**Czego naprawa NIE robi:** nie chroni przed nieaktualnością **trwałą**. Gdyby API konsekwentnie
podawało stary stan, oba odczyty zgodzą się co do nieprawdy i alarm będzie fałszywy. Wykrycie
wymagałoby drugiego, niezależnego źródła prawdy — czyli usługi zewnętrznej (sekcja 7). Luka zostaje
**zawężona, nie zamknięta**.

**Wniosek ogólniejszy, wart zapisania:** to jest drugi fałszywy alarm tego czujnika w ciągu godziny
(pierwszy — zachłanne wyrażenie regularne, sekcja 5.1; drugi — zaufanie odpowiedzi API). Oba
mówią to samo: **czujnik alarmujący bez pokrycia zużywa zaufanie szybciej, niż buduje je czujnik
milczący**. Dlatego każda kolejna zmiana w tym skrypcie przechodzi całą tabelę K1–K6, a nie tylko
tę kontrolę, której akurat dotyczy.

## 6. Czego czujnik NIE złapie — i gdzie stawiam dno rekurencji

Czujnik pilnujący czujnika ma dno rekurencyjne. Nazywam, gdzie je stawiam i dlaczego tam.

1. **Maszyna wyłączona.** Harmonogram stoi na laptopie operatora. `launchd` uruchamia zadanie
   pominięte podczas snu (po wybudzeniu), więc sen jest łagodzony — ale maszyna wyłączona przez dobę
   oznacza **brak odczytu przez dobę**. To jest cena wyboru „koszt zerowy": kupiliśmy brak rachunku
   za cenę dostępności.
2. **Śmierć samego czujnika — TO JEST DNO.** Gdy czujnik zostanie odinstalowany, zepsuty albo
   przestanie się uruchamiać, plik tętna (`ostatni-odczyt.txt`) przestaje się odświeżać. Staleness
   jest **wykrywalna** (data w pliku i w treści zgłoszenia), ale **nic jej automatycznie nie
   eskaluje**.
   **Dlaczego dno jest właśnie tutaj:** każda kolejna warstwa ma sens tylko wtedy, gdy mieszka
   w **innej domenie awarii** niż warstwa, którą pilnuje. Warstwa 3 (ten czujnik) wyszła już poza
   Actions. Warstwa 4 musiałaby wyjść poza laptop — czyli oprzeć się na **usłudze zewnętrznej**
   (klasyczny *dead-man's switch*: usługa, która krzyczy, gdy przestaje dostawać sygnał życia).
   Podpięcie takiej usługi to **nowe zewnętrzne źródło danych, czyli czerwona linia** (CLAUDE.md
   sekcja 4) i wymaga sign-offu Darka. Dno stoi więc dokładnie na granicy tego, co jest autoryzowane
   — nie tam, gdzie było wygodnie przestać.
3. **Szew między czujnikiem a alarmem: przebieg ANULOWANY.** Czujnik pyta o istnienie, więc przebieg
   anulowany liczy mu się jako „był". `nocny-alarm` używa `failure()`, które przy anulowaniu jest
   fałszywe — więc też milczy. **Oba mechanizmy milczą, a bramki nie zostały zweryfikowane.**
   Świadomie nie domykam tego tutaj: nie umiem tego udowodnić kontrolą dodatnią bez anulowania
   prawdziwego przebiegu, a nieudowodniona gałąź strażnika to atrapa dająca fałszywy spokój.
   Ryzyko szczątkowe jest mniejsze, niż wynika z samej nazwy: blok `concurrency` w `pr.yml` ma
   `cancel-in-progress` prawdziwe wyłącznie dla `pull_request`, a poza PR-ami klucz grupy zawiera
   `github.sha` — tor nocny **nie może** zostać anulowany tym mechanizmem. Zostaje anulowanie ręczne
   i awaria po stronie GitHuba.
4. **API GitHuba odpowiada, ale nieprawdę.** Czujnik ufa odpowiedzi. Wykrycie wymagałoby drugiego,
   niezależnego źródła prawdy o tym, czy przebieg był — czyli znowu usługi zewnętrznej.
5. **Przebieg był, ale nie wykonał bramek** (np. wystartował i padł w konfiguracji). Czujnik liczy
   istnienie, kolor pilnuje `nocny-alarm`. Ta para pokrywa oba pytania tylko wtedy, gdy oba
   mechanizmy żyją.

## 7. Rekomendacja do decyzji Darka — prawdziwy *dead-man's switch*

Luki 2 i 4 domknęłaby usługa zewnętrzna typu *dead-man's switch*: czujnik przy każdym pomyślnym
odczycie wysyła sygnał życia, a usługa krzyczy, **gdy sygnał przestaje przychodzić**. To odwraca
kierunek dowodu — alarmuje cisza, a nie zdarzenie — i dlatego przeżywa śmierć czujnika i wyłączenie
laptopa.

**Nie buduję tego i nie podpinam**: to nowe zewnętrzne źródło danych, czyli **czerwona linia**
(CLAUDE.md sekcja 4, sign-off Darka). Rekomendację pakuje Oliver.

- Koszt: darmowe plany takich usług zwykle wystarczają przy jednym sygnale dziennie; płatne progi
  zaczynają się w okolicach kilku EUR miesięcznie. **Liczby wymagają sprawdzenia przed decyzją —
  nie podaję ich jako ustalonych.**
- Ryzyko do rozważenia przez Ryana: sygnał życia wychodzi na zewnątrz i zdradza, że coś biegnie
  o danej porze; nie powinien nieść żadnej treści poza samym faktem.
