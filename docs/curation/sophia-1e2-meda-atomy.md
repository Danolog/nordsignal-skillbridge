# 1E.2 · Moduł M-EDA „EDA: od API do repozytorium" — treść atomów + rampa capstone'u

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-11 ·
**Status:** **ZATWIERDZONY (Darek, 2026-07-11)** — po przeglądzie QG
(2 agentów Fable 5: zgodność z ADR-014 z checkami na ŻYWYM API BDL +
research UI Colab/GitHub i zasobów; przebieg na końcu dokumentu);
przed ingest 1E.2: TODO z notatek (screenshoty UI, notebooki, test
autoryzacji od zera).
**Podstawa:** ADR-014 D1/D3/D5/D6.5 + **audyt pojemności D10**
(`sophia-1e2-audyt-pojemnosci-m-eda.md`): moduł odchudzony po wydzieleniu
M-PD; pokrywa R7 (API/JSON), R14 (Git/GitHub — decyzja Darka pkt 9
just-in-time), R15 (przebieg EDA). Prerekwizyt: **M-PD zaliczony**.
**Moduł BEZ egzaminu MC** — bramką jest capstone
`ds-eda-polska-w-liczbach-bdl` (`submitted` odblokowuje M-SQL — wariant C,
pkt 2); uzasadnienie w audycie (egzamin z Gita = teatr pomiaru, precedens
L0/pkt 10).
**Weryfikacja na żywo przy autoringu (2026-07-11):** endpoint BDL
`data/by-variable/60270` (stopa bezrobocia rejestrowanego, %, unit-level=2)
zwraca HTTP 200 i 16 województw — wszystkie snippety EDA.1/labu wykonane
na prawdziwym API. Atom EDA.2 jest OPERACYJNY (walkthrough UI
Colab/GitHub) — konwencja świeżości `verifiedAt` z D4 obowiązuje
podwójnie; etykiety UI zweryfikowane researchem 2026-07-11 (szczegóły
w notatkach), screenshot kontrolny przy budowie notebooków.

---

## Zasady modułu M-EDA

- **Struktura:** 3 atomy `exercise` + 1 lab + **capstone** (pozycja
  `project` — istniejący `ds-eda-polska-w-liczbach-bdl`, rubryka
  NIETKNIĘTA) + przegląd przed capstone'em (reuse pytań M-PD — spacing
  D6.3 bez egzaminu). Zaliczenia: atomy — licznik M10; lab —
  pieczątka+token; capstone — kamienie milowe + submit (wariant C).
- **Prerekwizyt kont:** konto GitHub — jawnie w onboardingu ścieżki
  (analogia do konta Google w L0/D10); EDA.2 tylko sprawdza zalogowanie.
- **Fading (D5a):** EDA.1 pełne WE → EDA.4 lab-szkielet (gotowe zapytanie,
  student uruchamia i spłaszcza z lukami) → capstone w pełni samodzielny
  z rubryką. EDA.2–EDA.3 to atomy wiedzy operacyjnej/metodycznej —
  fading nie dotyczy (brak zadań kodowych).
- **Koncepty kluczowe (≤4 — D6.3):** `api-json-pobieranie` (EDA.1),
  `git-repo-commit` (EDA.2), `eda-metoda-hipotezy` (EDA.3).
- **Przegląd przed capstone'em (reuse, 0 nowego autoringu):** PD.2-P1,
  PD.3-P2, PD.5-P1, PD.5-P3, PD.6-P2, PD.6-P3, PD.7-P2, PD.7-P3, EDA.1-P2,
  EDA.3-P1 (10 pytań; konfiguracja pozycji).
- **Sesja i czas:** atomy+lab ≈ 2–3 sesje; capstone ~5 h estymaty
  projektu (pierwsza praca z rubryką i vivą — SLA vivy jawne, streak
  chroniony na czas oczekiwania: D9).

---

## Atom EDA.1 — API: program pyta inny komputer o dane

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`api-json-pobieranie` (KLUCZOWY) · **Krok fadingu:** pełne WE

### Cel

Pobierzesz dane z prawdziwego API (GUS BDL) — zapytanie z parametrami,
kontrola statusu, odpowiedź JSON — i rozpoznasz w odpowiedzi starą
znajomą: listę słowników.

### Teoria

Dotąd dane wpisywałeś(-aś) w kod. Prawdziwe dane mieszkają na cudzych
komputerach — a **API** (ang. *Application Programming Interface*) to ich
okienko podawcze: umówiony adres, pod którym PROGRAM może poprosić o dane
i dostać je w formacie dla programów. GUS wystawia tak Bank Danych
Lokalnych (BDL): statystyki Polski na licencji CC BY 4.0.

Rozmowę z API prowadzi pakiet **`requests`** (w Colab preinstalowany —
PD.1 w akcji):

```python
import requests

url = "https://bdl.stat.gov.pl/api/v1/data/by-variable/60270"
parametry = {"unit-level": 2, "year": 2023, "format": "json", "page-size": 20}
odpowiedz = requests.get(url, params=parametry)   # zapytanie GET: "poproszę dane"
print(odpowiedz.status_code)                      # jak poszło?
```

**Przewidź:** co wypisze ostatnia linia, jeśli wszystko poszło dobrze?

`200` — kod „OK" umowy, którą zna cały internet: **status** to pierwsza
rzecz, którą sprawdzasz po KAŻDYM zapytaniu. `200` = dostałeś dane;
`404` = zły adres; `429` = za dużo zapytań, zwolnij; `5xx` = serwer ma
problem (nie Ty). Rozbiór zapytania:

- `url` — adres okienka (znajdziesz go w dokumentacji API; tu: dane
  zmiennej 60270 — stopy bezrobocia);
- `params` — słownik (F3.3!) parametrów: czego dokładnie chcesz
  (`unit-level: 2` = poziom województw, `year` = rok). Requests sam
  dokleja parametry do adresu — czytelniej niż ręczne sklejanie tekstu.
- `page-size` zasługuje na osobne zdanie: **API stronicują odpowiedzi**.
  Bez tego parametru BDL odda pierwszą stronę (10 rekordów), choć
  województw jest 16 — w odpowiedzi `totalRecords` mówi, ile danych
  JEST, a `len(dane["results"])` — ile dostałeś(-aś) NA TEJ stronie.
  Gdy te liczby się różnią, podnieś `page-size` (albo pobierz kolejne
  strony). Rozjazd „mam mniej wierszy, niż powinno być" to klasyk
  pierwszej pracy z API — teraz już wiesz, gdzie patrzeć.

Dane wyjmujesz metodą **`.json()`** — i tu niespodzianka, która nie jest
niespodzianką: dostajesz **słowniki i listy**. Dokładnie te struktury,
które ćwiczysz od F3 — **JSON to zapis danych, który Python czyta wprost
jako słowniki/listy**. Odpowiedź BDL to słownik, w którym pod kluczem
`"results"` siedzi lista słowników-województw:

```python
dane = odpowiedz.json()
print(dane["results"][0]["name"])   # łańcuszek z F3.5: rekord 0, pole name
```

Dla zmiennej 60270 wypisze `MAŁOPOLSKIE`. Od tego miejsca API przestaje
być magią: odpowiedź to tabela rekordów jak z F3.5, czasem zagnieżdżona —
rekord-województwo ma w środku LISTĘ pomiarów (po jednym na rok).
Spłaszcza się ją **pętlą w pętli**: zewnętrzna idzie po województwach,
wewnętrzna — po pomiarach BIEŻĄCEGO województwa. Mechanika jest znajoma:
każdy obrót pętli zewnętrznej uruchamia CAŁĄ pętlę wewnętrzną od nowa,
a wcięcia piętrują się dokładnie jak przy `if` w `for` (F3.2) — ciało
wewnętrznej pętli jest wcięte podwójnie. 16 województw × 2 pomiary =
32 obroty wewnętrzne = 32 płaskie rekordy do `pd.DataFrame` (PD.2).
Przećwiczysz to ze szkieletem w labie EDA.4 — a w capstonie napiszesz
już sam(a). Cała nowość tego atomu to okienko, status i strony; reszta
to Twoje stare klocki.

Na koniec dwa nawyki dobrego obywatela API: po pierwsze, nie strzelaj
zapytaniami w pętli — serwery limitują ruch (status `429` = „zwolnij"),
a Tobie i tak wystarczy jedno zapytanie zapisane do zmiennej. Po drugie,
dane mają licencję: BDL to CC BY 4.0, czyli wolno wszystko POZA
pominięciem autora — uznanie autorstwa GUS wpiszesz do README
w następnym atomie.

### Pytania (retrieval)

**P1. Po `odpowiedz = requests.get(url, params=parametry)` pierwszą
rzeczą sprawdzasz…**

- A. `odpowiedz.json()` — od razu dane — *Nie — gdy status jest zły,
  `.json()` może rzucić błędem albo oddać komunikat zamiast danych;
  najpierw upewnij się, że w ogóle DOSTAŁEŚ dane.* (diagnoza: pomija
  kontrolę statusu — nawyk nr 1 pracy z API)
- B. **`odpowiedz.status_code` — czy jest 200** ✓ — *Tak — status to
  odpowiedź serwera „jak poszło"; 200 = OK, dopiero potem `.json()`.*
- C. Czy internet działa — *Nie — brak internetu objawi się błędem już
  przy `get` (zapytanie w ogóle nie wyjdzie); status ocenia rozmowę,
  która SIĘ ODBYŁA.* (diagnoza: myli warstwę połączenia z warstwą
  odpowiedzi)
- D. Długość adresu url — *Nie — adres oceni serwer; jego werdykt
  przeczytasz właśnie w statusie (404 = zły adres).* (diagnoza: szuka
  walidacji po swojej stronie zamiast odpowiedzi serwera)

**P2. Co zwraca `odpowiedz.json()` dla API takiego jak BDL?**

- A. Tekst do samodzielnego pocięcia — *Nie — od cięcia tekstu jest
  właśnie `.json()`: oddaje GOTOWE struktury Pythona.* (diagnoza: nie
  wie, że parsowanie już zrobione)
- B. **Słowniki i listy — te same struktury, co w F3 (u BDL: słownik
  z listą rekordów pod `"results"`)** ✓ — *Tak — JSON czyta się wprost
  jako Twoje struktury; dalej pracujesz jak z tabelą rekordów z F3.5.*
- C. Gotowy DataFrame — *Nie — DataFrame budujesz SAM(A) z tych struktur
  (`pd.DataFrame(...)` — PD.2); API oddaje surowiec.* (diagnoza:
  oczekuje, że API zna pandas)
- D. Plik zapisany na Dysku — *Nie — odpowiedź ląduje w pamięci sesji,
  w zmiennej; nic samo się nie zapisuje.* (diagnoza: model „pobieranie =
  plik")

**P3. Zapytanie wraca ze statusem `404`. Gdzie szukasz problemu?**

- A. W swoim kodzie pandas — *Nie — do pandas jeszcze nie doszło:
  rozmowa z serwerem zakończyła się „nie znam takiego adresu".*
  (diagnoza: szuka błędu w złej warstwie)
- B. **W adresie/parametrach zapytania — serwer mówi „nie ma takiego
  zasobu"** ✓ — *Tak — literówka w url albo złym identyfikatorze;
  porównaj adres z dokumentacją API.*
- C. W swojej sieci — internet padł — *Nie — 404 to ODPOWIEDŹ serwera:
  połączenie działa, serwer po prostu nie zna adresu.* (diagnoza: jak
  P1/C, odwrotny kierunek)
- D. U siebie na Dysku Google — *Nie — Dysk nie bierze udziału
  w zapytaniu do API.* (diagnoza: miesza przestrzenie z L0)

### Drabinka hintów

1. **Koncepcyjny:** Rytm pracy z API jest zawsze ten sam: adres +
   parametry → `get` → sprawdź status → `.json()` → obejrzyj klucze
   (`dane.keys()` albo po prostu print) → znajdź listę rekordów →
   dalej to F3.5/PD.2.
2. **Szkielet:** W notebooku EDA.1: uruchom gotowe zapytanie z WE;
   potem wypisz `list(dane.keys())` i `len(dane["results"])` — ile
   województw wróciło? Na koniec łańcuszkiem wyciągnij nazwę trzeciego
   rekordu.
3. **Pełne rozwiązanie z objaśnieniem:** `len(dane["results"])` → `16`
   (wszystkie województwa — dzięki `page-size: 20`; bez niego dostałbyś
   pierwszą stronę: 10, przy `totalRecords` wciąż 16 — paginacja
   z teorii); `dane["results"][2]["name"]` → trzecia
   nazwa z odpowiedzi. Jeśli status ≠ 200: `404` — porównaj url z WE
   znak po znaku; `429` — odczekaj chwilę (BDL limituje anonimowe
   zapytania) i uruchom ponownie; błąd już przy `get` (np.
   `ConnectionError`) — najpewniej chwilowy brak sieci sesji Colab,
   uruchom komórkę jeszcze raz. Pełna pierwsza pomoc — na stronie
   modułu.

---

## Atom EDA.2 — Git i GitHub: historia Twojej pracy (bez terminala)

**Typ:** `exercise` + kroki wykonawcze · **Czas studenta:** ~20 min ·
**Koncept:** `git-repo-commit` (KLUCZOWY) · **Atom OPERACYJNY** (UI
zweryfikowano researchem: 2026-07-11; screenshot przy budowie) ·
**Krok fadingu:** nie dotyczy (wiedza operacyjna)

### Cel

Założysz repozytorium na GitHubie, wyślesz do niego notebook prosto
z Colab i dodasz README — rozumiejąc, czym jest commit i dlaczego rubryka
capstone'u żąda „sensownej historii commitów".

### Teoria

Rubryka Twojego capstone'u wymaga „reprodukowalnego repozytorium
z sensowną historią commitów". Rozszyfrujmy — bez terminala, którego na
tej ścieżce (na razie) nie potrzebujesz.

**Git** to system wersji: pamięta każdą zapisaną migawkę Twojej pracy.
**GitHub** to serwis, który trzyma te migawki w chmurze i pokazuje je
światu — to tam rekruterzy i prowadzący obejrzą Twój projekt.
**Repozytorium** (repo) = teczka projektu na GitHubie: notebook, README,
requirements. **Commit** = jedna migawka z OPISEM — „pobranie danych
z BDL", „czyszczenie braków z uzasadnieniem". Historia commitów czyta
się jak dziennik pracy: widać, że projekt powstawał etapami, a nie
wylądował jednym wrzutem w ostatnią noc — i dokładnie to sprawdza
rubryka.

Twój obieg pracy — trzy ruchy, wszystkie klikane:

1. **Repo zakładasz na GitHubie** (zielony przycisk „New" → formularz
   „Create a new repository"): „Repository name" — nazwa projektu,
   „Description" — opis jednym zdaniem, „Choose visibility" — „Public"
   (Passport linkuje do publicznych prac); zatwierdza przycisk
   „Create repository" na dole. GitHub mówi wyłącznie po angielsku —
   etykiety podajemy dosłownie, z polskim opisem, co robią.
2. **Notebook wysyłasz z Colab**: menu **Plik → Zapisz kopię w usłudze GitHub**
   — Colab poprosi (raz) o połączenie kont, a potem otworzy okno
   **„Kopiuj do GitHuba"**: wybierasz repo („Repozytorium") i gałąź
   („Gałąź": `main`), a opis commita wpisujesz w polu
   **„Komunikat zatwierdzenia"**. ⚠ Colab wstawia tam z góry
   „Utworzono za pomocą Colab" — **nadpisz to**, inaczej cała Twoja
   historia będzie ciągiem identycznych zdań, które nie mówią nic
   (a rubryka żąda sensownej historii). Każde takie zapisanie = nowy commit;
   pracujesz etapami, więc zapisujesz PO KAŻDYM domkniętym etapie,
   z opisem mówiącym CO się zmieniło.
3. **Pliki tekstowe dodajesz w GitHubie** (przycisk „Add file" →
   „Create new file"): `README.md` — co to za projekt, skąd dane
   (uznanie autorstwa GUS — licencja CC BY 4.0!), jak uruchomić;
   `requirements.txt` — po jednej nazwie pakietu na linię (`pandas`,
   `requests`, `matplotlib`) — lista z PD.1, dzięki której ktoś inny
   odtworzy Twoje środowisko.

**Przewidź:** zapisujesz kopię z Colab dwa razy — po etapie pobierania
danych i po etapie wykresów. Co pokaże zakładka historii repo?

Dwie migawki z Twoimi opisami, najnowsza u góry — i dokładnie tak,
etap po etapie, powstaje „sensowna historia commitów" z rubryki.

Opis commita to nie formalność: „update", „final", „final2" mówią NIC;
„wykres trendu bezrobocia + opis osi" mówi wszystko. Reguła: opis
odpowiada na pytanie „co dokłada ta migawka?".

Atom zalicza quiz (M10) — ale wykonanie ruchów 1–3 zweryfikuje dopiero
kamień K3 capstone'u: zrób je TERAZ, żeby przy capstonie repo już czekało.

### Pytania (retrieval)

**P1. Po co rubryka żąda historii commitów, skoro liczy się końcowy
notebook?**

- A. Żeby sprawdzić, ile godzin pracowałeś — *Nie — commity nie mierzą
  czasu; pokazują ETAPY i decyzje.* (diagnoza: commit jako stoper)
- B. **Bo historia etapów pokazuje warsztat: jak praca powstawała, jakie
  decyzje zapadały po kolei — i uwiarygadnia, że jest Twoja** ✓ —
  *Tak — dziennik pracy to część dowodu kompetencji, który trafia do
  Passportu.*
- C. To wymóg techniczny GitHuba — *Nie — GitHub przyjmie i jeden
  commit; to RUBRYKA chce zobaczyć proces.* (diagnoza: wymóg oceny
  mylony z wymogiem narzędzia)
- D. Żeby dało się cofnąć zmiany — *To PRAWDZIWA zaleta Gita, ale nie
  powód rubryki: rubryka ocenia dowód procesu pracy.* (diagnoza: zna
  zaletę wersjonowania, nie kontekst oceny)

**P2. Czym jest commit?**

- A. Kopią całego GitHuba na Dysk — *Nie — commit idzie w drugą stronę:
  z Twojej pracy DO repozytorium.* (diagnoza: kierunek odwrócony)
- B. **Migawką pracy z opisem, dopisaną do historii repozytorium** ✓ —
  *Tak — każdy „Zapisz kopię w usłudze GitHub" z opisem to jedna migawka;
  historia = lista migawek.*
- C. Usunięciem starej wersji pliku — *Nie — commit DOKŁADA nową
  migawkę; stare zostają w historii (po to jest system wersji).*
  (diagnoza: model „nadpisz plik")
- D. Wiadomością do prowadzącego — *Nie — opis commita czytają ludzie,
  ale adresatem jest HISTORIA projektu, nie skrzynka odbiorcza.*
  (diagnoza: opis commita jako komunikator)

**P3. Co MUSI znaleźć się w README Twojego capstone'u?**

- A. Cały kod analizy — *Nie — kod mieszka w notebooku; README to
  przewodnik PO projekcie.* (diagnoza: README jako zrzut kodu)
- B. **Opis projektu, źródło danych z uznaniem autorstwa GUS (CC BY 4.0)
  i instrukcja uruchomienia** ✓ — *Tak — rubryka: „README z opisem
  uruchomienia"; licencja danych WYMAGA uznania autorstwa.*
- C. Wyłącznie link do Colab — *Nie — link bywa częścią instrukcji, ale
  README bez opisu i atrybucji nie spełnia ani rubryki, ani licencji.*
  (diagnoza: minimalizm poniżej wymogu)
- D. Historia commitów przepisana ręcznie — *Nie — historię GitHub
  pokazuje sam; README jej nie duplikuje (anty-redundancja obowiązuje
  i w repo).* (diagnoza: dubluje to, co narzędzie daje za darmo)

### Drabinka hintów (kroki wykonawcze 1–3 z teorii)

1. **Koncepcyjny:** Ruch 0: sprawdź, że jesteś zalogowany(-a) na GitHubie
   (awatar w prawym górnym rogu github.com). Potem kolejność: repo (raz)
   → commit z Colab (wielokrotnie, po każdym etapie) → README/requirements
   (raz, w GitHubie). Zgubisz się w klikaniu — wróć do pytania „który
   z trzech ruchów robię?".
2. **Szkielet:** Ruch 1: github.com → przycisk „New" → w formularzu
   „Create a new repository": „Repository name" np. `eda-bdl-bezrobocie`
   → „Choose visibility" na „Public" → „Create repository". Ruch 2:
   w Colab **Plik → Zapisz kopię w usłudze GitHub** → przy pierwszym
   razie okno autoryzacji GitHuba (zatwierdź) → w oknie „Kopiuj do
   GitHuba" wybierz repo, a w polu „Komunikat zatwierdzenia" ZAMIEŃ
   domyślne „Utworzono za pomocą Colab" na swój opis → OK; wejdź na
   GitHub i ZOBACZ swój commit na liście. Ruch 3:
   w repo „Add file" → „Create new file" → nazwa `README.md` → treść →
   „Commit changes" (to też commit!).
3. **Pełne rozwiązanie z objaśnieniem:** Po trzech ruchach Twoje repo ma:
   notebook (z co najmniej jednym commitem z Colab), `README.md`
   i `requirements.txt`, a zakładka historii pokazuje listę migawek
   z opisami. Typowe blokady: Colab nie widzi repo → autoryzacja
   nie objęła repozytoriów (powtórz „Zapisz kopię w usłudze GitHub" i zaznacz
   zgodę) albo repo założone na innym koncie; „Zapisz kopię w usłudze GitHub"
   nie widać w menu → jesteś w podglądzie cudzego notebooka, nie we
   własnej kopii (L0.2). Pełna lista — pierwsza pomoc modułu.

---

## Atom EDA.3 — EDA to metoda: pytania, eksploracja, hipotezy

**Typ:** `exercise` · **Czas studenta:** ~10–15 min · **Koncept:**
`eda-metoda-hipotezy` (KLUCZOWY) · **Krok fadingu:** nie dotyczy
(wiedza metodyczna)

### Cel

Ustawisz sobie w głowie PRZEBIEG eksploracyjnej analizy danych — od
pytania badawczego do hipotez „wprost z danych" — i granicę, której EDA
nie przekracza: eksploracja to nie dowodzenie.

### Teoria

Masz wszystkie narzędzia: pobieranie (EDA.1), tabele, braki, grupy,
wykresy (M-PD). EDA to sposób ich UŻYCIA — briefing Twojego capstone'u
nazywa to „ustrukturyzowanym dialogiem z danymi". Przebieg, który
przećwiczyłeś(-aś) w miniaturze w PD.8, w pełnej wersji wygląda tak:

1. **Pytania badawcze PRZED kodem.** Nie „co tam jest w danych?", tylko
   konkret: „czy bezrobocie spada we wszystkich województwach, czy
   tylko w bogatych?". Pytanie wyznacza, co pobierasz i co rysujesz.
2. **Obejrzenie i czyszczenie** (rytuał PD.2, decyzje PD.5) — z
   uzasadnieniem każdej decyzji. To fundament: wnioski z brudnych danych
   to brudne wnioski.
3. **Eksploracja:** rozkłady, grupy, trendy (PD.6–PD.7). Każdy wykres
   traktuj jak PYTANIE, nie odpowiedź — briefing podaje przykład: skok
   wartości w jednym roku to pytanie „zmiana realna czy zmiana metody
   pomiaru?".
4. **Hipotezy „wprost z danych"** — 2–3 zdania w formie: „dane sugerują
   X; żeby to potwierdzić, trzeba by Y". To jest wymagany finał rubryki.

**Przewidź**, które zdanie jest hipotezą EDA: (a) „bezrobocie na pewno
spadło dzięki inwestycjom", (b) „dane sugerują szybszy spadek bezrobocia
na zachodzie kraju — wymaga weryfikacji na kolejnych latach"?

Zdanie (b): obserwacja z danych + zastrzeżenie weryfikacji. Zdanie (a)
grzeszy podwójnie — „na pewno" i przyczyną, której w danych nie było.

I granica, od której zależy Twoja wiarygodność: **EDA generuje hipotezy,
ale ich NIE dowodzi**. Zobaczyłeś(-aś) w danych wzór i sformułowałeś(-aś)
hipotezę — nie wolno „potwierdzić" jej na TYCH SAMYCH danych, z których
wyrosła: to rozumowanie w kółko (briefing: „prawie zawsze oszukasz samego
siebie"). Potwierdzenie wymaga nowych danych albo formalnego testu —
i to już nie jest zadanie EDA. Dlatego rubryka każe pisać hipotezy
„z zaznaczeniem, że wymagają dalszej weryfikacji" — takie zastrzeżenie
to nie asekuracja, to znak, że wiesz, co robisz.

W praktyce EDA jest iteracyjna: wykres rodzi nowe pytanie, wracasz do
kroku 3 (czasem do 2 — nowy problem w danych), aż pytania badawcze mają
uczciwe odpowiedzi „co widać" + hipotezy „co z tego może wynikać".
Notebook z takiej pracy czyta się jak raport (PD.7) — i dokładnie tak
oceni go rubryka.

### Pytania (retrieval)

**P1. Czym różni się eksploracja od konfirmacji (potwierdzania)?**

- A. Niczym — to synonimy — *Nie — to dwie różne fazy: eksploracja
  SZUKA hipotez, konfirmacja je SPRAWDZA — i nie wolno robić obu na
  tych samych danych.* (diagnoza: brak kluczowego rozróżnienia Tukeya)
- B. **Eksploracja generuje hipotezy z danych; konfirmacja sprawdza je
  na NOWYCH danych lub testem — nigdy na tych samych** ✓ — *Tak —
  hipoteza potwierdzona na danych, z których wyrosła, to rozumowanie
  w kółko.*
- C. Eksploracja jest dla początkujących, konfirmacja dla zaawansowanych
  — *Nie — to fazy procesu, nie poziomy trudności; zawodowcy robią
  obie, w tej kolejności.* (diagnoza: hierarchia zamiast sekwencji)
- D. Eksploracja używa wykresów, konfirmacja tabel — *Nie — narzędzia
  bywają te same; różni je CEL i dane, na których wolno działać.*
  (diagnoza: rozróżnienie po narzędziu zamiast po celu)

**P2. Kiedy formułujesz pytania badawcze?**

- A. Po zobaczeniu wszystkich wykresów — *Nie — bez pytań nie wiesz,
  KTÓRE wykresy rysować; pytania sterują eksploracją (co nie znaczy,
  że nie wolno ich potem doprecyzować).* (diagnoza: eksploracja jako
  bezcelowe oglądanie)
- B. **Przed kodem — pytanie wyznacza, co pobierasz, czyścisz
  i rysujesz** ✓ — *Tak — krok 1 przebiegu; iteracja może pytania
  zawęzić, ale start jest od pytania.*
- C. Nigdy — EDA jest od odpowiedzi, nie pytań — *Nie — EDA bez pytań
  to przewijanie tabel; pytanie jest jednostką pracy.* (diagnoza: EDA
  jako rytuał describe+wykres)
- D. Dopiero w README — *Nie — README RELACJONUJE pytania i odpowiedzi;
  zadaje się je na początku.* (diagnoza: dokumentacja mylona z metodą)

**P3. Twoja hipoteza wyrosła z wykresu trendu. Jak brzmi jej POPRAWNY
zapis w raporcie EDA?**

- A. „Wykres dowodzi, że bezrobocie spada dzięki inwestycjom" — *Nie —
  podwójny grzech: „dowodzi" (EDA nie dowodzi) i przyczyna spoza danych
  (inwestycji w ogóle nie badałeś).* (diagnoza: nadinterpretacja +
  przyczynowość z powietrza)
- B. „Dane są zbyt niepewne, żeby cokolwiek stwierdzić" — *Nie — to
  ucieczka: EDA MA sformułować hipotezy; uczciwość ≠ brak wniosków.*
  (diagnoza: myli ostrożność z odmową pracy)
- C. **„Dane sugerują szybszy spadek bezrobocia w województwach
  zachodnich; weryfikacja wymaga danych o [czynniku] / kolejnych lat"**
  ✓ — *Tak — co widać + czego trzeba do potwierdzenia; dokładnie forma
  z rubryki.*
- D. „Hipoteza potwierdzona, bo na wykresie wyraźnie widać" — *Nie —
  wykres to źródło hipotezy; „potwierdzenie" na tych samych danych to
  rozumowanie w kółko (P1).* (diagnoza: konfirmacja na danych źródłowych)

### Drabinka hintów

1. **Koncepcyjny:** Zapamiętaj przebieg jako 4 kroki: PYTANIE →
   PORZĄDEK (obejrzyj+wyczyść z uzasadnieniem) → EKSPLORACJA (wykres =
   pytanie) → HIPOTEZY („sugerują…, wymaga weryfikacji przez…").
   Granica: nic nie „dowodzisz".
2. **Szkielet:** W notebooku EDA.3 dostajesz trzy zdania z raportów —
   oceń każde: [uczciwa hipoteza / nadinterpretacja / ucieczka]
   i popraw nadinterpretację do formy z kroku 4.
3. **Pełne rozwiązanie z objaśnieniem:** wzorzec poprawy: usuń „dowodzi/
   na pewno/dzięki X (nieobecnemu w danych)", zostaw obserwację
   („w latach A–B wartość rośnie o…"), dodaj warunek weryfikacji.
   Autotest przed capstone'em: czy każda Twoja hipoteza ma (a) obserwację
   z konkretnej komórki notebooka, (b) zastrzeżenie weryfikacji? Jeśli
   (a) brakuje — to nie hipoteza z danych, tylko przekonanie.

---

## Atom EDA.4 — LAB „Pierwsze pobranie z BDL" (obowiązkowy przed capstone'em — D1)

**Typ:** `lab` · **Czas studenta:** ~20–25 min · **Koncepty ćwiczone:**
`api-json-pobieranie` + spłaszczanie (F3) + DataFrame (M-PD) · **Krok
fadingu:** szkielet — gotowe zapytanie, luki w spłaszczeniu

### Cel

Przejdziesz pełną ścieżkę capstone'u w miniaturze: prawdziwe zapytanie
do BDL → zagnieżdżony JSON → spłaszczenie pętlą → DataFrame → jeden
wykres. Po tym labie API nie będzie w capstonie żadną niewiadomą.

### Zadanie (notebook EDA.4 — kopia na Dysk, uruchom i uzupełnij luki)

```python
import requests
import pandas as pd

# --- zapytanie (gotowe — zweryfikowane, działa) ---
url = "https://bdl.stat.gov.pl/api/v1/data/by-variable/60270"   # stopa bezrobocia rej.
parametry = {"unit-level": 2, "year": [2022, 2023], "format": "json", "page-size": 20}
odpowiedz = requests.get(url, params=parametry)
print(odpowiedz.status_code)              # ma być 200 — EDA.1!

dane = odpowiedz.json()

# --- spłaszczenie: zagnieżdżony JSON → lista rekordów (czysty F3) ---
rekordy = []
for wojewodztwo in dane["results"]:       # rekord-województwo ma w środku LISTĘ pomiarów
    for pomiar in wojewodztwo["values"]:  # pętla w pętli: dla każdego pomiaru…
        rekordy.append({
            "wojewodztwo": wojewodztwo[______],   # luka 1: pole z nazwą (podejrzyj JSON!)
            "rok": int(pomiar["year"]),           # rok wraca jako TEKST → konwersja (F2.1)
            "stopa": pomiar[______],              # luka 2: pole z wartością
        })

df = pd.DataFrame(rekordy)
print(len(df))                            # luka 3 (w głowie): ile rekordów oczekujesz?

# --- rytuał i pierwszy obraz (M-PD) ---
df.head()
srednie_rok = df.groupby(______)[______].mean()   # luki 4–5: średnia stopa per rok
srednie_rok                               # nazwa w ostatniej linii = pokaż wynik
```

Na koniec dorysuj wykres: stopa w czasie dla JEDNEGO województwa
(sito + linia — PD.3/PD.7; przy dwóch latach będzie skromny — w capstonie
pobierzesz więcej lat).

**Zaliczenie:** komórka-pieczątka: sprawdza, że `df` istnieje, ma
3 kolumny i 32 wiersze (16 województw × 2 lata), `rok` jest liczbą
(konwersja wykonana!), status udanego pobrania w sesji to 200,
a `srednie_rok` zgadza się z niezależnym przeliczeniem grupowania na
`df` (nazwa `srednie_rok` jest częścią specyfikacji — pieczątka musi
wiedzieć, gdzie patrzeć) — i liczy token. Jawny limit: pieczątka NIE
odpytuje API ponownie (tokenu nie blokuje chwilowa niedostępność BDL —
liczy się stan sesji po Twoim udanym pobraniu).

### Drabinka hintów

1. **Koncepcyjny:** Nie zgaduj pól JSON-a — OBEJRZYJ je: wypisz
   `dane["results"][0]` i zobacz klucze rekordu (tak się pracuje
   z każdym nowym API). Pętla w pętli czyta się jak zdanie: „dla
   każdego województwa, dla każdego jego pomiaru — dołóż płaski rekord".
2. **Szkielet:** luka 1: klucz z NAZWĄ województwa w wypisanym rekordzie;
   luka 2: klucz z wartością pomiaru (nie rokiem); luka 3: 16 × 2 = ?;
   luki 4–5: `groupby("rok")["stopa"]`.
3. **Pełne rozwiązanie z objaśnieniem:** luka 1: `"name"`; luka 2:
   `"val"`; len → `32`; `srednie_rok = df.groupby("rok")["stopa"].mean()`
   → dwie linie (2022 i 2023), wartości ~5–6% (sprawdź rząd wielkości: to
   stopy procentowe). Zwróć uwagę na `int(pomiar["year"])` — API oddało
   rok jako tekst `"2022"` (cudzysłów w podejrzanym JSON-ie!), a bez
   konwersji oś czasu na wykresie zachowa się dziwnie — to konwersja
   z F2.1 w bojowym użyciu. Status ≠ 200 → drabinka EDA.1. Pieczątka
   czerwona przy zielonym oku → policz kolumny (dokładnie 3?) i sprawdź
   typ roku (`df.dtypes` — ma być liczba, nie object/str).

---

## Pozycja CAPSTONE — `ds-eda-polska-w-liczbach-bdl` (rampa i kamienie)

**Typ:** `project` (istniejący projekt marketplace — REUSE-as-capstone,
D4; rubryka NIETKNIĘTA) · **Czas studenta:** ~5 h (estymata projektu).

**Rampa (co student ma za sobą, wchodząc):** pełny przebieg EDA.4 na tym
samym API; wszystkie kryteria rubryki mają swoje atomy — czyszczenie
(PD.5), EDA z wnioskami (PD.6/EDA.3), wykres (PD.7), reprodukowalność
(EDA.2 + L0.3 „Uruchom wszystkie" = test „od góry do dołu"). Briefing =
istniejący `theory_md` projektu (esej „czym jest EDA" — EDA.3 celowo go
NIE dubluje, tylko operacjonalizuje). Wymóg rubryki o SEEDZIE: w EDA
zwykle losowości nie ma — jeśli jej nie używasz, zaznacz to w README
jednym zdaniem („analiza bez elementów losowych — seed nie dotyczy");
jeśli używasz (np. próbkowanie wierszy), ustaw ziarno i napisz gdzie.

**Kamienie milowe (propozycja do `configJson.checks`, 4 szt. — widełki
D3 3–5; definicja finalna przy 1E.6):**

- **K1 „Dane pobrane":** w sesji istnieje DataFrame zbudowany
  z odpowiedzi BDL (≥3 różne lata, jednostki poziomu województw) —
  check GENERYCZNY (student wybiera własną zmienną BDL, więc bez
  przywiązania do 60270 czy liczby wierszy z EDA.4).
- **K2 „Wykonanie dotarło do końca":** pieczątka na końcu notebooka
  liczy token, gdy wykonanie w bieżącej sesji doszło do niej bez
  zatrzymania. Jawny limit: TRYBU uruchomienia (czy było to „Uruchom
  wszystkie") pieczątka nie widzi — pełny test od góry do dołu wykonuje
  student (L0.3), a wymóg rubryki „notebook uruchamia się od góry do
  dołu bez błędów" rozstrzyga recenzent.
- **K3 „Repo wypchnięte":** student podaje link do publicznego repo;
  check pobiera je i weryfikuje obecność notebooka, `README.md`
  i `requirements.txt` (HTTP — deterministyczne).
- **K4 „Submit":** zgłoszenie do istniejącego pipeline'u recenzji
  (rubryka + viva — ADR-013). `submitted` odblokowuje M-SQL (wariant C);
  `verified` = warunek receiptu w Passporcie. Na czas oczekiwania na
  vivę: alert zastoju wyłączony + dzień łaski streaka (D9).

Każdy kamień = zdarzenie postępu (ślad aktywności — D3/D9).

---

## Strona „Pierwsza pomoc — M-EDA" (D5a, statyczna, per moduł)

Strony L0–M-PD obowiązują. Przyrost M-EDA (z polem „wklej komunikat
błędu" w eskalacji — D5c):

1. **Status `429` z BDL** → limit anonimowych zapytań (100 na 15 minut
   — dokumentacja BDL): odczekaj i ponów; nie strzelaj zapytaniami
   w pętli. (Rejestracja w BDL podnosi limity — opcjonalna, poza
   ścieżką krytyczną.)
2. **Status `404`** → literówka w adresie/identyfikatorze zmiennej —
   porównaj z dokumentacją BDL znak po znaku (EDA.1-P3).
3. **`ConnectionError` / timeout przy `get`** → chwilowy brak sieci
   sesji albo serwer nie odpowiada: ponów komórkę; jeśli trwa — sprawdź
   `https://bdl.stat.gov.pl` w przeglądarce (żyje?).
4. **`KeyError` przy czytaniu JSON-a** → zgadujesz pola zamiast je
   obejrzeć: wypisz `dane.keys()` i `dane["results"][0]`, dopiero potem
   sięgaj (EDA.4, hint 1).
5. **`JSONDecodeError` przy `.json()`** → odpowiedź nie jest JSON-em.
   Uwaga: BDL nawet błędy zwraca jako JSON (po polsku!), więc u niego
   ten wyjątek znaczy zwykle, że adres wskazuje stronę WWW zamiast API
   (np. `bdl.stat.gov.pl` bez `/api/v1/…`). Tak czy inaczej: NAJPIERW
   status, potem json (EDA.1-P1).
6. **Oś lat na wykresie „dziwna" (np. 2022.5)** albo lata jako tekst →
   brak konwersji `int(...)` przy spłaszczaniu (EDA.4) — rok ma być
   liczbą.
7. **Colab nie widzi mojego repo przy „Zapisz kopię w usłudze GitHub"**
   → okno autoryzacji „Authorize" nie zostało zatwierdzone (powtórz
   zapis), repo jest na INNYM koncie (sprawdź awatar na github.com)
   albo repo jest prywatne — checkbox „Include private repos" dotyczy
   OTWIERANIA notatników; dla capstone'u repo i tak ma być publiczne.
8. **„Zapisz kopię w usłudze GitHub" nie ma w menu Plik** → oglądasz cudzy
   notebook w podglądzie — najpierw własna kopia (L0.2).
9. **Commit „poszedł", ale na GitHubie go nie widać** → zapisałeś(-aś)
   do INNEGO repo albo innej gałęzi — otwórz repo w przeglądarce
   i sprawdź listę plików + historię; w razie czego powtórz zapis,
   uważnie czytając okno wyboru.

---

## Zasoby opcjonalne modułu (pod `curriculum_item_resources`; do weryfikacji QG)

| url | label | function | license | language | registrationRequired | verifiedAt |
|---|---|---|---|---|---|---|
| https://api.stat.gov.pl/Home/BdlApi | Dokumentacja API GUS BDL (PL; limity, endpointy, rejestracja opcjonalna) | praktyka-docs (ścieżka główna capstone'u — PL!) | CC BY 4.0 (dane GUS) | PL | nie (opcjonalna podnosi limity) | 2026-07-11 (żywe — zweryfikowane przy audycie partii 1 i ponownie przy autoringu: API odpowiada) |
| https://www.youtube.com/watch?v=Ebe9D5zRkvM | „Git i GitHub w 60 minut" (Jak nauczyć się programowania, ~80 min, 2021) — kontekst „czym jest Git"; UWAGA: terminal-first (nasza ścieżka celowo go omija) + UI GitHuba z 2021 | wideo/kurs (trzecia funkcja QG-5; pogłębienie) | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane; research: brak aktualnego wideo PL „bez terminala" — adnotacje obowiązkowe przy prezentacji) |
| https://www.youtube.com/watch?v=-lrxvGP-Zd0 | „Git i GitHub — pełny kurs dla początkujących" (CodeBucket, ~43 min, 2023) — świeższe UI GitHuba; też terminal-first | wideo pomocnicze | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane; seans kontrolny przed ingest) |

---

## Słowniczek terminów EN (M11) — przyrost względem L0–M-PD

| Termin | Po polsku |
|---|---|
| API | okienko podawcze danych: adres, pod którym program prosi o dane |
| `requests.get(url, params=…)` | zapytanie „poproszę dane" z parametrami |
| status (`status_code`) | odpowiedź serwera „jak poszło": 200 OK, 404 zły adres, 429 zwolnij, 5xx problem serwera |
| JSON | zapis danych czytany przez Pythona wprost jako słowniki/listy |
| `.json()` | wyjmij dane z odpowiedzi jako struktury Pythona |
| Git / GitHub | system wersji / serwis trzymający repozytoria w chmurze |
| repozytorium (repo) | teczka projektu: notebook, README, requirements |
| commit | migawka pracy z opisem, dopisana do historii repo |
| README.md | przewodnik po projekcie: opis, źródło danych z atrybucją, uruchomienie |
| requirements.txt | lista pakietów projektu (po jednym na linię) |
| EDA / eksploracja vs konfirmacja | generowanie hipotez z danych vs ich sprawdzanie — nigdy na tych samych danych |

---

## Notatki dla Olivera (ingest/1E.6) — haki i jawne decyzje

- **Struktura pozycji (`order`):** EDA.1 → EDA.2 → EDA.3 → EDA.4 (lab —
  obowiązkowy między ostatnim atomem a capstone'em, D1) → przegląd przed
  capstone'em (reuse — lista w zasadach) → CAPSTONE (position 100
  w drabinie już jest). **Bez pozycji `exam`** — decyzja z audytu
  pojemności; bramka modułu = wszystkie pozycje completed, capstone
  `submitted` (wariant C).
- **EDA.2 = atom operacyjny — etykiety UI ZWERYFIKOWANE researchem
  2026-07-11:** „Plik → Zapisz kopię w usłudze GitHub" (polska etykieta
  potwierdzona źródłem PL; EN „Save a copy in GitHub"), „New repository"
  i „Add file → Create new file" aktualne wg docs.github.com; GitHub
  EN-only (wielojęzyczność wycofana — podejście „etykieta EN + opis PL"
  poprawne); okno zapisu Colab ma wybór repo/gałęzi + opis commita;
  checkbox „Include private repos" dotyczy OTWIERANIA, nie zapisu.
  Screenshot kontrolny przy budowie notebooków (konwencja L0);
  reweryfikacja kwartalna verifiedAt (D4) obejmuje ten atom w pierwszej
  kolejności.
- **⚠ KOREKTA PO SCREENSHOTACH KONTROLNYCH (Darek, 2026-07-22)** —
  zrzuty w `docs/curation/screenshots/meda-1..4-*-20260722.png`. Research
  z 2026-07-11 zgadzał się co do MECHANIZMÓW, ale trzy etykiety nie
  istnieją dosłownie w dzisiejszym UI — treść poprawiona:
  1. **GitHub nie ma przycisku „New repository"** — jest przycisk „New",
     który otwiera formularz **„Create a new repository"** (sekcje
     „1 General" / „2 Configuration": „Repository name", „Description",
     „Choose visibility" → „Public", toggle „Add README") zatwierdzany
     przyciskiem **„Create repository"**. Formularz przeprojektowany
     względem opisu w docs.github.com.
  2. **Okno zapisu z Colab nazywa się „Kopiuj do GitHuba"**, a pole opisu
     commita ma etykietę **„Komunikat zatwierdzenia"** (nie „opis
     commita" — to był termin funkcjonalny, nie etykieta). Pola: repo,
     „Gałąź", „Ścieżka pliku", checkbox „Podaj link do Colab" (checkbox
     „Include private repos" faktycznie NIE występuje przy zapisie —
     research trafny).
  3. **ZNALEZISKO DYDAKTYCZNE (nie kosmetyka):** Colab wstawia do pola
     „Komunikat zatwierdzenia" domyślne **„Utworzono za pomocą Colab"**.
     Student, który go nie nadpisze, zbuduje historię identycznych,
     pustych znaczeniowo commitów — czyli dokładnie to, co atom piętnuje
     („update", „final") i co oblewa kryterium rubryki „sensowna historia
     commitów". Treść ruchu 2 i hint 2 dostały jawny nakaz nadpisania.
  Potwierdzone bez zmian: „Add file" → „Create new file" (dosłownie);
  brak pozycji „Zapisz kopię w usłudze GitHub" w menu **podglądu cudzego
  notebooka** — dokładnie jak przewiduje hint 3 („jesteś w podglądzie,
  nie we własnej kopii"), zrzut meda-1 to potwierdza realnym UI.
- **Kamienie capstone'u:** propozycja K1–K4 wyżej (4 szt., widełki D3);
  K3 wymaga checku HTTP po linku repo (deterministyczny, bez sandboxa);
  definicja finalna + implementacja przy 1E.6. SLA vivy + ochrona
  streaka na czas oczekiwania (D9) — do konfiguracji przy 1E.6.
- **Zmienna BDL w labie/capstonie:** 60270 (stopa bezrobocia
  rejestrowanego, %, unit-level=2) — zweryfikowana na żywo 2026-07-11
  (200, 16 województw, wartości 2022–2023). Notebook labu trzyma
  zapytanie GOTOWE (fading); gdyby BDL zmienił schemat — konwencja
  verifiedAt łapie to przy reweryfikacji.
- **Pieczątka EDA.4 świadomie NIE odpytuje API** (token niezależny od
  chwilowej dostępności BDL — uczciwość checku przy zewnętrznej
  zależności); kamień K1 capstone'u analogicznie (stan sesji, nie
  ponowny fetch).
- **Budżety słów (D1, zmierzone po poprawkach QG):** EDA.1 = 500/456
  (z kodem/bez), EDA.2 = 316/316, EDA.3 = 326/326 — w widełkach przy obu
  metodach. EDA.2/EDA.3 nie mają kroków fadingu (wiedza operacyjna/
  metodyczna) — jawne odstępstwo do oceny w standardzie QG-5; retrieval,
  „przewidź" i drabinki są.
- **Limity BDL (research 2026-07-11, dokumentacja api.stat.gov.pl):**
  anonimowo 5/s, 100/15 min, 1000/12 h; klucz (rejestracja, nagłówek
  X-ClientId) podwaja i więcej — pierwsza pomoc poz. 1 cytuje 100/15 min.
- **TODO przed ingest 1E.2:**
  1. ✅ **WYKONANE (2026-07-22)** — screenshoty kontrolne UI Colab↔GitHub
     dostarczone przez Darka (4 zrzuty w `docs/curation/screenshots/`);
     trzy rozjazdy etykiet wcielone do treści, patrz „KOREKTA PO
     SCREENSHOTACH" wyżej. Wideo PL: brak materiału „bez terminala"
     na rynku — dwa kandydaty z obowiązkową adnotacją (tabela zasobów);
     seans kontrolny przed ingest.
  2. Budowa 4 notebooków + strona pierwszej pomocy; test labu EDA.4 na
     świeżym koncie (autoryzacja Colab↔GitHub od zera).
  3. Rampy briefingu capstone'u wg mapy luk audytu partii 1 (pozycja
     `ds-eda` ~10 h — zadanie 1E.R, wycena tam; ten moduł zdejmuje
     większość luk „BLOKUJE-POCZĄTKUJĄCEGO" przez atomy, briefing
     wymaga głównie odsyłaczy do drabiny zamiast rampy w theory_md).

## Przebieg QG tego dokumentu (2026-07-11)

Draft → EDA.1/EDA.4 wykonane przez autora na ŻYWYM API BDL (status 200,
16 województw, spłaszczenie zweryfikowane) → **2 agentów weryfikacyjnych
(Fable 5)**: (1) przegląd zgodności z ADR-014, także na żywym API —
**1 znalezisko KRYTYCZNE** (WE EDA.1 bez `page-size` zwracał na żywo
10 rekordów przy deklarowanych w drabince 16 — domyślna strona BDL;
naprawione parametrem + akapitem o PAGINACJI, rozjazd obrócony
w materiał), 4 WAŻNE (pętla w pętli nieuczona w drabinie — mechanika
dopisana do teorii EDA.1; wymóg SEED z rubryki bez pokrycia — zdanie
w rampie capstone'u; deklaracja kamienia K2 silniejsza niż mechanizm —
przepisana uczciwie; pomiary budżetów), 4 drobne — wcielone (m.in. BDL
zwraca błędy jako JSON — precyzja pierwszej pomocy; check K1 jawnie
generyczny); mapowanie rubryki 4/4 kryteriów na rampę potwierdzone;
werdykt „gotowe po poprawkach"; (2) research UI/zasobów — polska
etykieta „Zapisz kopię w USŁUDZE GitHub" (poprawiona w 8 miejscach),
checkbox private repos przy otwieraniu (nie zapisie), GitHub EN-only,
**docs.github.com/pl nie istnieje (404) — usunięte z zasobów**, limity
BDL 100/15 min anonimowo (dokumentacja), dwa wideo PL z obowiązkową
adnotacją „terminal-first".

## Przebieg QG spłaty długu labu EDA.4 (2026-07-21)

Kotwica `srednie_rok` dopisana do zadania (bez niej „porównanie średnich"
nie miało czego porównywać); Zaliczenie rozszerzone o status 200 i nazwę
w specyfikacji. Kontrakt CHECKS_EDA_4 zweryfikowany przez agenta QG na
ŻYWYM API BDL (2026-07-21): HTTP 200, 16 jednostek × 2 lata = 32 rekordy
płaskie, klucze `name`/`val`, `year` wraca jako string (konwersja int
potrzebna — dokładnie jak uczy treść), średnie ~5–6%. **GO Z NOTAMI.**
