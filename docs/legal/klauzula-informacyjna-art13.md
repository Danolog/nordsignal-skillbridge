# Klauzula informacyjna (art. 13 RODO) — SkillBridge · DRAFT v0.3

**Wersja:** v0.3 · 2026-08-14 · **Autor:** Ryan (CRCO nordsignal) · **Zadanie:** E2c pakietu RODO
(artefakt **E-1**) · **Zleceniodawca:** Oliver (COO) · **Sign-off:** Darek (CEO) — wymagany, akt
wychodzący na zewnątrz (CLAUDE.md §4).

**Changelog v0.2 → v0.3 (2026-08-14) — dwie zmiany, obie w trybie sprostowania jawnego.**
**(1) Sprostowanie tabeli Z-2, wiersz W-5** (sekcja **Z-2a**): dwa miejsca deklarowały przegląd
RODO jako **wykonany** i powoływały się na artefakt, którego **nigdy nie było w kontroli wersji**.
Stare brzmienie zacytowane dosłownie, przesłanka zmierzona, wniosek metodyczny zapisany.
**(2) Usunięcie z CZĘŚCI I zdania blokującego** z sekcji 11 („do czasu ustalenia nie rejestrujemy
osób spoza zespołu") — decyzją Darka z 2026-08-14, wariant (b) pozycji W-4: ryzyko przyjęte
świadomie, sekcja 11 **zostaje** w brzmieniu „ustalamy to". Zapis przyjęcia ryzyka: sekcja **Z-2b**.
Powód usunięcia: zdanie było prawdziwe wyłącznie dopóki nikogo nie rejestrujemy — w chwili
rejestracji uczestnika klauzula **obalałaby samą siebie** w tekście pokazywanym temu uczestnikowi.
Równoległy tor (a) — pytania do dostawcy modelu — ma własny nośnik:
`docs/legal/pytania-do-dostawcy-modelu-p1-p3.md`. **Nie blokuje** wpuszczenia grupy.
**(3) Nowa sekcja Z-7** — co zmienia nabór 3–5 osób wobec akceptacji ryzyka, które wyceniałem
na **jednego** uczestnika. Dwie z nich przestają działać przy naborze; nazywam je przed podpisem,
nie po.
**(4) Nowa sekcja Z-8 i zmiana w CZĘŚCI I — kolizja podstaw (R-3), zgłoszona przez Sophię.**
Regulamin czyni udział w pilotażu treścią umowy, a wtedy podstawa czytana jako wykonanie umowy
**odbiera obiecane prawo sprzeciwu**. Sekcja 4 dostała **dwa osobne wiersze** (przyjęcie do grupy =
umowa; analiza skuteczności = uzasadniony interes), a sekcja 4 i 8 mówią teraz **wprost**, że
sprzeciw **nie odbiera dostępu do platformy**. To jedyna zmiana **merytoryczna** w treści dla
studenta w tej wersji poza usunięciem zdania blokującego — i czyni obietnicę mocniejszą, nie słabszą.
Nowe pozycje dla prawnika: **L-k** (czy rozdział wytrzyma), **L-l** (odstąpienie przy usłudze
nieodpłatnej); waga **L-a** podniesiona — administrator jest teraz także **stroną umowy**.

**Changelog v0.1 → v0.2 (2026-08-12) — domknięcie warunku W-B Leo przy zgłoszeniu #290.**
**Ani jedno zdanie CZĘŚCI I (treści dla studenta) nie zostało zmienione co do sensu** — sekcja 7
dostała wyłącznie niewidoczne klucze maszynowe w komentarzach HTML, po których strażnik rozpoznaje
wiersze. Zmiany merytoryczne są w CZĘŚCI II: powstał **strażnik maszynowy zgodności okresów**
(`tests/unit/rodo/okresy-retencji.contract.test.ts`, z udokumentowanymi w nim mutacjami
czerwieniącymi go), a moje
zdanie „strażnik nie istnieje, oznaczam go jako niepotwierdzony" zostało **sprostowane jawnie**
w sekcji Z-3 — etykieta była uczciwa, ale użyta szerzej, niż CLAUDE.md v1.17 pozwala.

> **STATUS: PROJEKT. NIE OBOWIĄZUJE. NIE POKAZUJEMY GO NIKOMU.**
> Dokument nie wchodzi w życie z chwilą scalenia. Warunki wejścia w życie — sekcja Z-2.

> **Ten dokument ma dwie części i to rozróżnienie jest wiążące.**
> **CZĘŚĆ I** (sekcje 1–12) to **treść pokazywana studentowi** — po sign-offie idzie do produktu
> słowo w słowo. **CZĘŚĆ II** (sekcje oznaczone `Z-`) to **aparat wewnętrzny**: skąd wzięło się każde
> zdanie, czego nie wiemy, co wymaga prawnika. Część II **nigdy** nie jest publikowana.

---

## CZĘŚĆ II-A — co trzeba wiedzieć, zanim się to przeczyta (dla Darka i recenzentów)

### Z-1. Nie jestem prawnikiem i tak to zapisuję

**Jestem Chief Risk & Compliance Officer, nie radcą prawnym.** Wendy (Legal) i Carl (Security
Engineer) **nie są zatrudnieni** — zmierzone (odczyt 2026-08-10 15:54 UTC, repozytorium systemu
operacyjnego):

```
$ ls agents/ | grep -iE "wendy|carl"
(brak wyjścia)   kod wyjścia: 1
```

Ten draft jest **przygotowaniem materiału dla prawnika**, nie zastąpieniem go. Wyprowadziłem go
z rejestru czynności przetwarzania i z kodu, a nie z szablonu z internetu — co czyni go rzetelnym
**faktograficznie**, ale nie czyni go zweryfikowanym **prawnie**. Lista rzeczy, które musi
sprawdzić prawnik **przed pierwszą osobą spoza zespołu**: sekcja Z-5.

### Z-2. Warunki wejścia w życie — wszystkie twarde

Klauzula obiecuje prawa. **Obietnica prawa, którego nie umiemy wykonać, jest gorsza niż brak
klauzuli** — to zasada, która ustawiła kolejność całego pakietu RODO i ona się nie zmieniła.
Dlatego klauzula zapala się **razem z** poniższymi, nigdy przed nimi:

| # | Warunek | Właściciel | Dlaczego twardy |
|---|---|---|---|
| **W-1** | **Ścieżka usunięcia konta działa w produkcie** (pozycja E1b; flaga `FLAG_ACCOUNT_DELETION` zapalona po zielonych strażnikach) | Ethan (CTO) | Sekcja 8 mówi „możesz usunąć konto samodzielnie". Dziś ścieżka **istnieje i jest zamknięta przełącznikiem** — trasa biblioteki uwierzytelniającej odpowiada „nie znaleziono" (pomiar Ethana, E1b §1.1). Bez W-1 zdanie w sekcji 8 jest nieprawdziwe w chwili wypowiadania |
| **W-2** | **Pozycje rejestru kompletności art. 17 rozstrzygnięte** — każda albo naprawiona, albo świadomie przyjęta i **opisana w sekcji 9 tej klauzuli** | Ryan (odbiór), Ethan (wykonanie) | Nośnik listy: `docs/data/art17-kompletnosc-usuniecia.md`. Sekcja 9 mówi studentowi, co zostaje po usunięciu konta — jeśli rejestr nie jest rozstrzygnięty, **nie wiemy, co tam napisać** |
| **W-3** | **Dług A-1 zamknięty dla nowych wierszy śladu rozliczalności** (kierunek (a+): nowe zdarzenia bez identyfikatora osoby, bez adresu IP) | Ryan (kierunek), Ethan (kod) | Bez tego zdanie z sekcji 9 („zostaje zapis, że coś się wydarzyło, bez danych wskazujących na Ciebie") jest **nieprawdziwe dla osoby rejestrującej się po zapłonie klauzuli** |
| **W-4** | **Odpowiedzi na pytania P-1…P-3** (umowa powierzenia z dostawcą modelu, podstawa transferu, trenowanie modeli) — albo uzyskane, albo sekcja 11 zostaje w brzmieniu „ustalamy to" i Darek to **świadomie akceptuje**. **Domknięty drugą drogą 2026-08-14** — Darek wybrał wariant (b) i przyjął ryzyko; zapis decyzji: **Z-2b**. Tor uzyskiwania odpowiedzi idzie dalej, **równolegle i bez blokowania**: `docs/legal/pytania-do-dostawcy-modelu-p1-p3.md` | Darek (posiadacz konta u dostawcy) | Art. 13 ust. 1 lit. f wymaga podania podstawy przekazania danych poza EOG. **Nie wolno jej zmyślić.** Przyznanie się do luki jest dopuszczalne; zmyślona podstawa nie jest |
| **W-5** | **Zasada odpowiedzi dla pracodawcy podpisana i wdrożona** — nośnik: `docs/product/zasada-odpowiedzi-dla-pracodawcy.md` (Sophia), **na 2026-08-14 draft poza kontrolą wersji** (pozycja na liście `SCIEZKI_JESZCZE_NIEISTNIEJACE` strażnika ścieżek). Mój przegląd RODO **odbył się merytorycznie i pozostawił ślad w rejestrze** (pozycja L-8 / dług A-3, commit `e66312d`), ale **artefaktu przeglądu nie ma**, a wraz z nim przepadła treść „poprawki R-2" — **nie odtwarzam jej z pamięci**; obowiązuje wymóg **R-2′** postawiony na nowo w **Z-2a** | Sophia (treść), Ryan (przegląd — **ślad w rejestrze, artefakt utracony**), Darek (sign-off) | Sekcja 9 klauzuli **obiecuje studentowi konkretne zachowanie wobec pracodawcy** („nie potwierdzimy ani nie zaprzeczymy"). Obietnica bez wdrożonej zasady i bez strony pod martwym odnośnikiem jest obietnicą bez pokrycia — tą samą klasą wady, którą naprawia W-1 |

**Nośnikiem tej listy jest ta tabela.** Rejestr czynności (`ropa.md`) i rejestr kompletności art. 17
**wołają ją**, nie powtarzają.

### Z-2a. SPROSTOWANIE JAWNE 2026-08-14 — „przegląd wykonany" bez odtwarzalnego artefaktu

**Stare brzmienie, cytowane dosłownie** (v0.2, tabela Z-2, wiersz **W-5**, dwa miejsca w jednym
wierszu):

> „…nośnik: `docs/product/zasada-odpowiedzi-dla-pracodawcy.md` (Sophia), **przegląd RODO wykonany**
> (`scratchpad/przeglad-zasada-pracodawcy-ryan.md`), z **poprawką R-2** w treści strony martwego
> odnośnika"
>
> „Sophia (treść), **Ryan (przegląd — wykonany)**, Darek (sign-off)"

**Co było faktem.** Przegląd odbył się **merytorycznie** — i to jest sprawdzalne. Jego wynikiem
jest pozycja **L-8** w rejestrze kompletności art. 17 (dług **A-3**: prefiks identyfikatora
paszportu widnieje jako numer dokumentu na wydruku PDF krążącym poza platformą), wprowadzona
commitem `e66312d`. Wpis mówi wprost, że znalezisko powstało „przy przeglądzie zasady odpowiedzi
dla pracodawcy". Przegląd **nie jest** więc fikcją.

**Czego faktem nie było.** Obu cytowanych artefaktów **nie ma i nigdy nie było w kontroli wersji**.
Odczyty z 2026-08-14, repozytorium produktu:

```
$ git log --all --oneline -- 'scratchpad/przeglad-zasada-pracodawcy-ryan.md' '**/przeglad-zasada-pracodawcy*'
(brak wyjścia)   kod wyjścia: 0

$ find <oba repozytoria> -name "przeglad-zasada-pracodawcy*" -not -path "*/node_modules/*"
(brak wyjścia)

$ git ls-tree -r --name-only origin/main | grep -i "zasada-odpowiedzi"
(brak wyjścia)   kod wyjścia: 1
```

Kontrola dwustronna do powyższego — to samo narzędzie **widzi** artefakt, o którym wiadomo, że
istnieje:

```
$ git show --stat --oneline e66312d
e66312d docs(rodo): E2c — klauzula art. 13 + RoPA #8 (dostawca modelu) + przeliczenie klasy A-1 (#304)
 docs/data/art17-kompletnosc-usuniecia.md           |  33 +-
 …
 7 files changed, 1284 insertions(+), 104 deletions(-)
```

Zero trafień nie jest więc dowodem na to, że zapytanie nic nie widzi — jest dowodem na to, że
tych plików nie ma.

**Co dokładnie dołożono.** (1) Wiersz W-5 nie mówi już „wykonany" — mówi, gdzie leży **realny
ślad** przeglądu (pozycja L-8, commit `e66312d`) i że **artefaktu przeglądu nie ma**. (2) Nośnik
zasady jest oznaczony jako **nieistniejący na dzień 2026-08-14** — bo taki jest stan, a wiersz
W-5 pozostaje warunkiem niespełnionym. (3) Powstał strażnik maszynowy
`tests/unit/rodo/klauzula-sciezki-istnieja.contract.test.ts`, który pada, gdy ta klauzula powołuje
się na ścieżkę **nieobecną w kontroli wersji** i nieumieszczoną na jawnej liście pozycji jeszcze
niepowstałych. Mutacja czerwieniąca go jest zacytowana w nagłówku tego testu.

**Wniosek metodyczny — błąd metody, nie pech.** Powołanie się w dokumencie prawnym na ścieżkę
w katalogu **ignorowanym przez kontrolę wersji** (`scratchpad/`) jest wadą konstrukcyjną, a nie
niefortunnym zbiegiem okoliczności. Taki dowód jest z definicji nieodtwarzalny: żyje na jednym
dysku, znika bez śladu w historii i **nie da się go pokazać ani recenzentowi, ani kupującemu firmę,
ani organowi nadzorczemu**. Dokument, który idzie na zewnątrz, wolno opierać wyłącznie na
artefaktach, które **przetrwają autora i jego laptop**. Reguła na przyszłość: cytat ścieżki
w CZĘŚCI II jest dowodem tylko wtedy, gdy ścieżka jest w kontroli wersji; ścieżkę spoza niej wolno
przywołać jedynie jako **notatkę roboczą, jawnie oznaczoną**, i nigdy jako podstawę słowa
„wykonany". Od teraz pilnuje tego strażnik, nie moja pamięć.

**Klasa wady jest ta sama, którą sam opisałem w Z-3**: mechanizm zameldował „w porządku", nie
sprawdzając tego, co miał sprawdzać. Tam była etykieta użyta szerzej, niż wolno; tu jest słowo
„wykonany" bez dowodu. **To trzecie z rzędu sprostowanie tego samego wzorca w tym dokumencie** —
i to jest sygnał o mnie, nie o dokumencie: piszę „zrobione" szybciej, niż zostawiam po tym ślad.

**To samo wystąpiło DRUGI raz, w drugim dokumencie — i nie znalazłem tego sam.** Ta sama
nieistniejąca ścieżka była cytowana również w rejestrze kompletności art. 17
(`docs/data/art17-kompletnosc-usuniecia.md`, akapit pod pozycją L-8, jako adres „pełnej oceny
prawnej"). Oba wpisy są moje i oba powstały tego samego dnia. Wystąpienie w rejestrze znalazła
**Sophia**, pisząc nośnik W-5 — nie ja, mimo że pisałem to sprostowanie i szukałem właśnie tego.
Sprostowałem je osobno, w tamtym dokumencie, z cytatem starego brzmienia. **Wniosek: szukałem
wystąpień tam, gdzie spodziewałem się je znaleźć, zamiast przeszukać oba repozytoria pod kątem
wzorca.** Naprawa jednego wystąpienia przy żywym drugim byłaby sprostowaniem pozornym — to ono
trafiłoby do kolejnego cytowania.

**Poprawka „R-2" — przepadła i nie odtwarzam jej z pamięci.** Wiersz W-5 wymagał w v0.2, żeby
strona pod martwym odnośnikiem uwzględniała „poprawkę R-2" z mojego przeglądu. **Nie mam do niej
żadnego zapisu.** Sprawa jest gorsza niż zwykłe zapomnienie, bo etykieta jest **niejednoznaczna
z zasady**: numeruję znaleziska lokalnie, per dokument, bez wspólnej przestrzeni nazw — a „R-2"
oznacza w kontroli wersji **co najmniej dwie inne rzeczy**, obie niezwiązane ze stroną paszportu
(zmierzone `git grep -n "\bR-2\b" origin/main -- docs/`, odczyt 2026-08-14):
`docs/security/hint-reveals-retencja-signoff.md:452` → „R-2 (WAŻNE) — okres dla kont
nieaktywnych"; `docs/security/rate-limit-ailight-signoff.md:118` → „R-2 (INFORMACYJNE) — klient
nie sygnalizuje 429 tury czatu". Cytat „poprawka R-2" bez artefaktu jest więc
**nierozstrzygalny nawet w zasadzie**, a nie tylko trudny do odtworzenia.

**Co robię zamiast zgadywania.** Zgadnięcie własnego werdyktu i podanie go Sophii jako
„odtworzonego" byłoby gorsze niż jego brak — dostałaby wymóg o nieznanym pochodzeniu, wyglądający
na ustalenie. Zamiast tego **wycofuję etykietę R-2 z wiersza W-5** i stawiam wymóg **na nowo,
z dzisiejszą datą i jako nowy**, w zakresie, który wynika z pozycji L-8 i jest sprawdzalny bez
tamtego artefaktu:

> **R-2′ (nowy wymóg, 2026-08-14, NIE jest odtworzeniem R-2).** Strona pod nieaktualnym
> odnośnikiem do paszportu **nie może różnicować odpowiedzi** w zależności od tego, dlaczego
> odnośnik nie działa — musi odpowiadać identycznie, gdy właściciel wyłączył udostępnianie, gdy
> odnośnik wygasł, gdy konto zostało usunięte i gdy dokument nigdy nie powstał. **W szczególności
> nie wolno jej ujawnić, że identyfikator w odnośniku był kiedykolwiek znany systemowi** — bo
> prefiks tego identyfikatora widnieje jako numer dokumentu na wydruku PDF krążącym poza
> platformą (pozycja L-8, dług A-3), a odpowiedź różnicowana zamienia ten wydruk w narzędzie
> potwierdzania, że dana osoba miała u nas konto. Kod odpowiedzi, czas odpowiedzi i treść:
> jednakowe we wszystkich czterech przypadkach.

Czy R-2′ pokrywa się z utraconym R-2 — **nie wiem i tak to zapisuję**. Jeśli pierwotna poprawka
niosła coś ponadto, ta wiedza przepadła razem z plikiem i **jest to realna strata**, nie formalność.

### Z-2b. ZAPIS PRZYJĘCIA RYZYKA — W-4, decyzja Darka 2026-08-14

Ślad audytowy, nie przypis. Zapisuję go tutaj, bo za pięć lat pytanie „kto i kiedy zgodził się
wysyłać treść studenta poza EOG bez ustalonej podstawy" musi mieć odpowiedź w dokumencie, a nie
w czyjejś pamięci.

| Pozycja | Treść |
|---|---|
| **Data decyzji** | 2026-08-14 |
| **Kto zdecydował** | Darek (CEO), administrator danych — jedyna osoba uprawniona (CLAUDE.md §4) |
| **Co dokładnie** | Wariant **(b)** pozycji W-4: **nie czekamy** na odpowiedzi dostawcy modelu; sekcja 11 **zostaje** w brzmieniu „ustalamy to"; **zdanie blokujące zostaje usunięte** z CZĘŚCI I; równolegle idzie tor (a) — uzyskiwanie odpowiedzi P-1…P-3 |
| **Co jest przyjmowanym ryzykiem** | Treść pisana przez uczestnika do Pomocnika kariery i w obronie ustnej trafia do dostawcy przetwarzającego dane **poza EOG**, a my **nie potrafimy dziś wskazać podstawy prawnej tego przekazania** (art. 13 ust. 1 lit. f), ani rozstrzygnąć, czy dostawca używa tej treści do trenowania modeli |
| **Czego decyzja NIE obejmuje** | Nie jest zgodą na **zmyślenie** podstawy. Nie jest stwierdzeniem, że podstawa istnieje. Nie zwalnia z toru (a). Nie rozciąga się na inne warunki z Z-2 — każdy z nich obowiązuje osobno |
| **Dlaczego zdanie blokujące musiało zniknąć** | Zmierzone: znajdowało się w **treści pokazywanej uczestnikowi**. Zostawienie go przy jednoczesnej rejestracji ludzi znaczy, że pierwszy dokument prawny, jaki uczestnik u nas czyta, **kłamie w chwili czytania**. To gorsze niż nazwana luka — podważa wiarygodność całej klauzuli, w tym zdań, które są prawdziwe |
| **Warunek odwrócenia** | Odpowiedzi na P-1…P-3 (albo choćby na P-3 — trenowanie modeli) zastępują sekcję 11 konkretem; uczestnicy dostają informację o zmianie (sekcja 13 zobowiązuje nas do tego wprost) |
| **Kto ma to na biurku** | Tor (a): Darek (posiadacz konta u dostawcy). Nośnik pytań: `docs/legal/pytania-do-dostawcy-modelu-p1-p3.md` |

**Moje zdanie jako CRCO, zapisane obok decyzji, bo do tego jestem.** Uważam wariant (b) za
obronialny **przy tej skali i przy tej jawności** — przyznanie się do luki wprost jest uczciwsze
niż wpisanie standardowej klauzuli o „standardowych klauzulach umownych", której nikt u nas nie
czytał. Uważam natomiast, że luka ma **twardy termin**, a nie „kiedyś": tor (a) zamknięty **przed
drugą grupą uczestników**. Luka nazwana i żyjąca dalej bez terminu przestaje być decyzją i staje
się nawykiem — pisałem to o cudzych etykietach 2026-08-10 i wtedy również dotyczyło mnie.

### Z-3. Jeden nośnik — jak to jest rozwiązane i gdzie zostaje dług

Klauzula **wywodzi** treść z trzech rejestrów i **nie jest** dla nich źródłem prawdy:

| Co | Jedyny nośnik | Jak klauzula go używa |
|---|---|---|
| Cele, podstawy prawne, odbiorcy | `docs/data/ropa.md` (wpisy #1–#8) | sekcja 4 **renderuje** wpisy; nowa czynność w rejestrze = nowy wiersz tutaj |
| Okresy przechowywania | `docs/data/retention.md` | sekcja 7 **renderuje** tabelę; **żadnego okresu nie wymyślam** |
| Co przeżywa usunięcie konta | `docs/data/art17-kompletnosc-usuniecia.md` | sekcja 9 renderuje rozstrzygnięcia pozycji L-1…L-7 |
| Trwałość podpisu człowieka pod kredencjałem | **ADR-008** (`docs/decisions/008-hitl-rozdzial-wagi-oceny.md`) | sekcja 10 **cytuje regułę Sophii, nie formułuje własnej** |
| Co odpowiadamy pracodawcy po usunięciu konta | `docs/product/zasada-odpowiedzi-dla-pracodawcy.md` (Sophia) | sekcja 9 **powtarza zasadę własnymi słowami** — **świadomy drugi nośnik**, patrz akapit niżej; nie ustanawia jej i nie rozstrzyga jej brzmienia zewnętrznego |

**Świadomy drugi nośnik — nazwany, nie ukryty.** Okresy przechowywania **muszą** paść wobec
studenta (art. 13 ust. 2 lit. a nie pozwala odesłać go do rejestru wewnętrznego), więc liczby
z `retention.md` są tu fizycznie powtórzone. Zgodnie z CLAUDE.md v1.17 wymaga to progu i strażnika:
- **próg** zapisany w `docs/data/retention.md` (nagłówek): zmiana okresu tam jest niedomknięta,
  dopóki nie trafi do **wszystkich** nośników;
- **strażnik maszynowy: `tests/unit/rodo/okresy-retencji.contract.test.ts`** — porównuje okresy
  w trzech nośnikach naraz i pada, gdy się rozjadą. Mutacje czerwieniące go — w tym po jednej
  na tej klauzuli i na źródle — są zacytowane w nagłówku tego testu, i to on jest ich nośnikiem.

**Drugi świadomy drugi nośnik — zasada odpowiedzi dla pracodawcy (sprostowanie 2026-08-14).**
Wiersz tabeli wyżej mówił do v0.2, że sekcja 9 **„renderuje"** zasadę. **To było nieprawdziwe
twierdzenie o mechanizmie**, a nie nieporęczne słowo: po zgłoszeniu #310 „renderuje" znaczy w tym
repozytorium rzecz konkretną i sprawdzalną — treść jest **wczytywana z nośnika w chwili
wyświetlenia** (tak działa ta klauzula: `src/lib/legal/klauzula-art13.ts` czyta plik markdown).
Sekcja 9 **nic nie wczytuje** — niesie własne sformułowanie tej samej zasady, napisane pod
studenta. To **drugi nośnik**, i to konieczny: art. 13 wymaga, żeby student przeczytał obietnicę
w klauzuli, a nie został odesłany do dokumentu produktowego. Zgłosiła to Sophia przy pisaniu
nośnika W-5 i ma rację — przy audycie „renderuje" jest twierdzeniem o mechanizmie, sprawdzalnym
w pięć minut i obalalnym w te same pięć minut.

Skoro nośnik jest świadomie drugi, CLAUDE.md v1.17 wymaga progu i strażnika:
- **próg konsolidacji:** pierwsza zmiana brzmienia zasady w nośniku Sophii **albo** pierwsze realne
  zapytanie pracodawcy — co przyjdzie pierwsze;
- **strażnik:** cztery zdania obietnicy w sekcji 9 dostały **niewidoczne klucze maszynowe**
  (`<!-- pracodawca:* -->`), tym samym wzorem co klucze okresów przechowywania, żeby porównywarka
  obu nośników miała po czym rozpoznać wiersze. **Sama porównywarka jeszcze nie istnieje** — nie
  da się jej napisać przed wejściem nośnika Sophii do kontroli wersji, bo nie ma czego porównywać
  z czym. **Etykieta: niepotwierdzony, z wykonawcą i terminem** — Ryan, w tym samym zgłoszeniu,
  w którym nośnik `docs/product/zasada-odpowiedzi-dla-pracodawcy.md` trafi na `main`. Zapisuję to
  z wykonawcą i progiem właśnie dlatego, że etykieta bez nich działa jak zwolnienie z obowiązku —
  napisałem to o sobie w sprostowaniu wyżej i nie zamierzam powtórzyć tego dwa akapity dalej.

> **SPROSTOWANIE 2026-08-12 — moje własne zdanie o strażniku.** Stało tu, cytowane dosłownie:
>
> > „**strażnik maszynowy: NIE ISTNIEJE. Oznaczam go jako niepotwierdzony**, dokładnie jak etykietą
> > „niezweryfikowane" z v1.16. Zbudowanie porównywarki obu tabel to zadanie działu Engineering,
> > próg: przed pierwszą osobą spoza zespołu. **Nie udaję, że reguły ktoś pilnuje.**"
>
> Etykieta była **uczciwa co do faktu** (strażnika rzeczywiście nie było), ale **użyta szerzej,
> niż reguła pozwala**. CLAUDE.md v1.17 rezerwuje ścieżkę „niepotwierdzony" dla przypadków,
> w których dowód jest **fizycznie niewykonalny** — typ albo kompilator zamiast testu. Tutaj
> dowód był jednym testem bez bazy, tej samej klasy co strażnik języka produktu postawiony
> w jednym zgłoszeniu przez Sophię. Zakwestionował to Leo (Tech Lead), warunek W-B przy #290,
> i miał rację.
>
> **Wniosek szerszy niż ta jedna pozycja — zgłaszam go do warstwy QA, nie chowam w dokumencie:**
> etykieta „niepotwierdzone" / „niezweryfikowane" **bez przypisanego wykonawcy i terminu działa
> jak zwolnienie z obowiązku, a nie jak dług**. Napisałem to o cudzych etykietach 2026-08-10;
> pierwsze zastosowanie tej uwagi do samego siebie wyszło mi dopiero z cudzego przeglądu.
> To dokładnie ta klasa wady, o którą rozszerzono minimum jakości: mechanizm zameldował
> „w porządku", nie sprawdzając tego, co miał sprawdzać.

### Z-4. Trzy rzeczy, których w tej klauzuli świadomie NIE MA (i dlaczego)

1. **Nie ma zdania „nie podejmujemy decyzji w sposób zautomatyzowany, w tym profilowania".**
   To najczęstsze zdanie klauzul kopiowanych z sieci i **u nas byłoby fałszywym oświadczeniem** —
   profilujemy w dwóch czynnościach (`ropa.md` wpisy #3 i #5). Zakaz zapisany wprost we wpisie #5.
2. **Nie ma zdania „Twoje dane nie opuszczają platformy".** Dla funkcji opartych na modelu
   językowym jest **nieprawdziwe** (wpis #8).
3. **Nie ma obietnicy „usuniemy wszystko wszędzie".** Nieprawdziwa w chwili wypowiadania — kopie
   zapasowe wygasają w oknie, a plik PDF u pracodawcy nie wraca.

---

# CZĘŚĆ I — treść dla studenta

> *Poniższy tekst jest tym, co zobaczy człowiek. Napisany po polsku, bez żargonu; każde pojęcie
> techniczne rozwinięte przy pierwszym użyciu (CLAUDE.md §3).*

---

## Informacja o tym, co robimy z Twoimi danymi

Ten dokument mówi, jakie dane o Tobie zbieramy w SkillBridge, po co, jak długo je trzymamy, komu je
przekazujemy i co możesz z tym zrobić. Piszemy go, bo wymaga tego **art. 13 RODO** — europejskiego
rozporządzenia o ochronie danych osobowych. Staraliśmy się napisać go tak, żeby dało się go
przeczytać raz i zrozumieć.

**Jeśli masz przeczytać tylko jeden akapit, niech to będzie ten:** zbieramy to, czego platforma
potrzebuje, żeby działać — Twój adres e-mail, Twoje odpowiedzi, Twoje postępy w nauce. Nie
sprzedajemy tych danych i nie wyświetlamy Ci reklam. Treść, którą piszesz do Pomocnika kariery
i w obronie ustnej, wysyłamy do zewnętrznego dostawcy modelu językowego (sekcja 5) — bez tego te
funkcje nie działają. Konto możesz usunąć samodzielnie w każdej chwili, a wtedy Twoje dane znikają
z naszego systemu; sekcja 9 mówi uczciwie, co mimo to zostaje.

### 1. Kto odpowiada za Twoje dane

**Administratorem danych** (podmiotem, który decyduje, po co i jak są przetwarzane) jest
**nordsignal** — firma prowadzona przez Dariusza Grądzika, twórcę platformy SkillBridge.

**Kontakt w sprawach danych osobowych:** `kontakt@nordsignal.cc`

Możesz napisać w każdej sprawie z tego dokumentu — pytania, żądania, skargi. Odpowiadamy najpóźniej
w ciągu miesiąca (tyle daje RODO); zwykle szybciej.

**Nie wyznaczyliśmy inspektora ochrony danych** — nie mamy takiego obowiązku przy naszej skali.
Sprawami danych zajmuje się administrator osobiście.

### 2. Skąd mamy Twoje dane

**Od Ciebie.** Wszystko, co o Tobie wiemy, albo podałeś nam sam (zakładając konto, rozmawiając
z Pomocnikiem kariery, rozwiązując zadania), albo powstało z Twojej pracy na platformie (postępy,
wyniki, odpowiedzi). **Nie kupujemy danych i nie zbieramy ich o Tobie z innych źródeł.**

Jeśli logujesz się przez Google, dostajemy od Google Twój adres e-mail i potwierdzenie, że to
naprawdę Ty — nic więcej.

### 3. Jakie dane zbieramy

| Rodzaj | Co konkretnie |
|---|---|
| **Dane konta** | adres e-mail, hasło (przechowywane w postaci nieodwracalnego skrótu — nie znamy Twojego hasła i nie umiemy go odczytać) albo informacja, że logujesz się przez Google |
| **Twoja praca na platformie** | odpowiedzi na zadania i pytania diagnozy, zgłoszenia projektów, wypowiedzi w obronie ustnej, rozmowy z Pomocnikiem kariery, sylabus, który wgrasz |
| **Postępy w nauce** | które moduły masz otwarte, co i kiedy powtarzasz, jak Ci poszło, mapa Twoich umiejętności i luk |
| **Dane o stażu i pracy** | **tylko jeśli sam je zgłosisz** — to jedyna rzecz, którą zbieramy na podstawie Twojej zgody i którą możesz wycofać (sekcja 6) |
| **Ślad bezpieczeństwa** | zapis zdarzeń ważnych dla bezpieczeństwa konta (np. logowanie, udzielenie i cofnięcie zgody) wraz z czasem |

**Nie zbieramy** danych o zdrowiu, poglądach, pochodzeniu, wyznaniu ani orientacji — czyli żadnej
z kategorii, które RODO traktuje szczególnie (art. 9). Nie prosimy o numer PESEL ani o dane
z dowodu.

### 4. Po co i na jakiej podstawie

RODO wymaga, żebyśmy przy każdym celu podali **podstawę prawną** — powód, dla którego wolno nam to
robić. Mamy trzy: *wykonanie umowy* (bez tego platforma nie działa), *Twoja zgoda* (dobrowolna,
odwoływalna) i *nasz uzasadniony interes* (gdy potrzebujemy czegoś do prowadzenia platformy, a Twoje
prawa nie przeważają).

| Po co przetwarzamy | Podstawa prawna | Co to znaczy po ludzku |
|---|---|---|
| **Konto i logowanie** | wykonanie umowy (art. 6 ust. 1 lit. b) | bez adresu e-mail nie ma konta |
| **Mapowanie Twoich kompetencji i luk** — z sylabusa i Twojej pracy | wykonanie umowy | to jest rdzeń tego, po co przyszedłeś |
| **Dobór i harmonogram powtórek** — system sam ustala, co i kiedy do Ciebie wróci | wykonanie umowy | to jest **profilowanie** (sekcja 10) |
| **Automatyczne otwieranie modułów** po diagnozie | wykonanie umowy | to jest **decyzja podejmowana automatycznie** (sekcja 10) |
| **Prowadzenie funkcji opartych na modelu językowym** — Pomocnik kariery, tutor projektu, obrona ustna | wykonanie umowy | bez tego te funkcje nie istnieją (sekcja 5) |
| **Dane o Twoim stażu i pracy** | **Twoja zgoda** (art. 6 ust. 1 lit. a) | jedyna rzecz, której możesz odmówić i dalej normalnie korzystać z platformy |
| **Ślad zdarzeń bezpieczeństwa** | nasz uzasadniony interes (art. 6 ust. 1 lit. f) | musimy umieć wykazać, kto co zrobił — w tym my sami wobec Ciebie |
| **Przyjęcie Cię do grupy pilotażowej** — sam fakt, że jesteś jednym z uczestników | wykonanie umowy | grupa jest ograniczona; musimy wiedzieć, kogo do niej przyjęliśmy, żeby dać Ci dostęp |
| **Sprawdzanie, czy platforma uczy skutecznie** — analiza Twoich postępów razem z postępami innych uczestników | nasz uzasadniony interes (art. 6 ust. 1 lit. f) | to jest **osobna sprawa** od samego udziału. **Możesz się temu sprzeciwić i nadal normalnie korzystać z platformy** — sprzeciw **nie odbiera Ci dostępu** (sekcja 8) |

### 5. Komu przekazujemy Twoje dane

**Nie sprzedajemy Twoich danych nikomu i nie przekazujemy ich reklamodawcom.** Korzystamy natomiast
z firm, które dostarczają nam infrastrukturę i technologię. Działają **na nasze polecenie** i nie
wolno im używać Twoich danych do własnych celów — RODO nazywa je *podmiotami przetwarzającymi*.

| Kto | Co dostaje | Po co |
|---|---|---|
| **Neon** — dostawca bazy danych | wszystko, co zapisujemy | to jest miejsce, w którym fizycznie leżą Twoje dane |
| **Vercel** — dostawca hostingu | ruch aplikacji, dane techniczne połączenia | to jest serwer, na którym działa platforma |
| **Anthropic** — dostawca modelu językowego | **treść, którą piszesz**: wiadomości do Pomocnika kariery, odpowiedzi w obronie ustnej, opisy projektów, sylabus | bez tego Pomocnik, tutor i obrona ustna nie działają |

**Czego Anthropic NIE dostaje:** Twojego adresu e-mail, Twojego hasła, Twojego harmonogramu
powtórek ani informacji o tym, które moduły masz otwarte. Do modelu idzie treść, którą napisałeś —
nie Twoja tożsamość.

**Twoje dane wychodzą poza Europejski Obszar Gospodarczy.** Dostawca modelu językowego przetwarza
je poza Europą. Co to dla Ciebie znaczy i czego jeszcze nie potrafimy potwierdzić — **sekcja 11**.
Piszemy o tym osobno i wprost, zamiast chować to w przypisie.

Poza tym możemy przekazać dane, jeśli **wymaga tego prawo** (np. żądanie sądu). Jeśli to się
zdarzy i wolno nam Cię o tym poinformować — poinformujemy.

### 6. Dane o stażu i pracy — jedyna rzecz na zgodę

Jeśli zgłosisz nam, że zacząłeś staż albo pracę, zapisujemy to. **To jest dobrowolne.** Nie musisz,
a odmowa nic Ci nie odbiera — platforma działa tak samo.

**Zgodę możesz wycofać w każdej chwili.** Mówimy dokładnie, co się wtedy dzieje, bo połowiczna
odpowiedź byłaby tu obietnicą bez pokrycia:

- **Znikają** zgłoszone przez Ciebie dane o stażu i pracy — od razu, przy cofnięciu zgody.
- **Zostaje** sam zapis, że zgoda była udzielona i została cofnięta, wraz z datami. Bez tego nie
  umielibyśmy wykazać, że uszanowaliśmy Twoją decyzję — a to jest wymóg RODO, nie nasza wygoda.

Wycofanie zgody nie unieważnia tego, co robiliśmy zgodnie z prawem, zanim ją wycofałeś.

### 7. Jak długo trzymamy Twoje dane

| Co | Jak długo | Liczone od |
|---|---|---|
| <!-- retencja:curriculum_progress --> Dane konta, mapa umiejętności, postępy i odpowiedzi | **do czasu usunięcia konta** | — |
| <!-- retencja:review_states --> Twój harmonogram powtórek (stan bieżący) | **do czasu usunięcia konta** | — |
| <!-- retencja:review_logs --> Ślad ocen powtórek (historia, jak Ci szło) | **12 miesięcy** | data każdej oceny osobno |
| <!-- retencja:viva_answers --> Surowe odpowiedzi z obrony ustnej | **12 miesięcy** | prawomocne rozstrzygnięcie sesji |
| <!-- retencja:hints_at --> Znaczniki czasu odsłonięcia podpowiedzi | **12 miesięcy** | data każdego znacznika osobno |
| <!-- retencja:curriculum_placements --> Otwarcia modułów przyznane po diagnozie | **do czasu usunięcia konta** | — |
| <!-- retencja:pilot_participants --> Udział w pilotażu | **do czasu usunięcia konta**, z przeglądem przy zamknięciu grupy | — |
| <!-- retencja:placement_events --> Dane o stażu i pracy | **do cofnięcia zgody** | — |
| <!-- retencja:audit_log --> Ślad zdarzeń bezpieczeństwa | **bezterminowo** — patrz sekcja 9 | — |

Po upływie okresu dane usuwamy albo pozbawiamy powiązania z Tobą.

### 8. Twoje prawa

Masz wobec nas następujące prawa. Żeby z któregokolwiek skorzystać, wystarczy napisać na
`kontakt@nordsignal.cc` — **nie musisz uzasadniać** i nie pobieramy za to opłat.

| Prawo | Co możesz zrobić |
|---|---|
| **Dostęp** (art. 15) | zapytać, jakie dane o Tobie mamy, i dostać ich kopię |
| **Sprostowanie** (art. 16) | poprawić dane, które są błędne lub nieaktualne |
| **Usunięcie** (art. 17) | **usunąć konto razem z danymi** — samodzielnie w ustawieniach profilu albo pisząc do nas. Co dokładnie znika, a co zostaje: sekcja 9 |
| **Ograniczenie** (art. 18) | zażądać, żebyśmy chwilowo przestali używać Twoich danych — np. gdy kwestionujesz ich poprawność |
| **Przenoszenie** (art. 20) | dostać swoje dane w formacie, który da się wczytać gdzie indziej |
| **Sprzeciw** (art. 21) | sprzeciwić się przetwarzaniu opartemu na naszym uzasadnionym interesie — w praktyce: **analizie, czy platforma uczy skutecznie**. Wtedy przestajemy liczyć Twoje wyniki w tej ocenie. **Nie tracisz przez to dostępu do platformy ani niczego, co już zdobyłeś** — sprzeciw jest darmowy i nie musisz go uzasadniać |
| **Cofnięcie zgody** (art. 7) | wycofać zgodę na dane o stażu i pracy — sekcja 6 |

**Skarga do organu nadzorczego.** Jeśli uważasz, że przetwarzamy Twoje dane niezgodnie z prawem,
możesz złożyć skargę do **Prezesa Urzędu Ochrony Danych Osobowych** (ul. Stawki 2, 00-193 Warszawa,
`uodo.gov.pl`). Możesz to zrobić niezależnie od tego, czy wcześniej pisałeś do nas — ale będziemy
wdzięczni, jeśli dasz nam szansę najpierw.

### 9. Co się dzieje, gdy usuniesz konto — uczciwie

Usunięcie konta jest **natychmiastowe i nieodwracalne**. Nie ma okresu, w którym dałoby się je
cofnąć — dlatego przed usunięciem pokażemy Ci dokładnie, co znika, i poprosimy o potwierdzenie.

**Znika z naszego systemu:** Twoje konto i adres e-mail, paszport kompetencji, wszystkie zgłoszenia
projektów, historia rozmów z Pomocnikiem kariery, mapa umiejętności, postępy, odpowiedzi,
harmonogram powtórek, dane o stażu i pracy, udział w pilotażu.

**Zostaje — i mówimy to wprost, zamiast obiecywać, że „usuwamy wszystko":**

1. **Beznamiętny zapis, że pewne zdarzenia miały miejsce.** Prowadzimy ślad zdarzeń ważnych dla
   bezpieczeństwa, którego z założenia nie da się zmienić ani skasować — także nam. Po usunięciu
   konta zostaje w nim informacja, że o danej godzinie zaszło zdarzenie danego typu, **bez danych
   wskazujących na Ciebie**. Trzymamy go bezterminowo, bo to jedyny sposób, żeby wykazać, że system
   działał tak, jak twierdzimy — również wtedy, gdy ktoś zarzuci nam coś przeciwnego.
2. **Kopie zapasowe — do 30 dni.** Robimy kopie bazy na wypadek awarii. Twoje dane mogą jeszcze
   przez pewien czas istnieć w takiej kopii; <!-- kopie:okno_dni --> **najpóźniej po 30 dniach kopie z Twoimi danymi
   wygasają**. Kopii nie używamy do niczego poza odtworzeniem systemu po awarii, a jeśli musimy
   go odtworzyć — **ponawiamy na nim Twoje usunięcie**.
3. **Pliki, które sam pobrałeś i wysłałeś.** Pliki, które pobierzesz ze SkillBridge (na przykład
   Paszport Kompetencji jako PDF), powstają na Twoim urządzeniu i po wysłaniu komuś **przestają
   być w naszym zasięgu** — usunięcie konta ich nie wycofa. Nie mamy do takiego pliku dostępu
   i nie możemy go skasować; dotyczy to także zrzutów ekranu. Przestanie natomiast działać
   odnośnik do Twojego paszportu na platformie.

**A jeśli ktoś zapyta nas o Ciebie po usunięciu konta:** <!-- pracodawca:odmowa_uniformna --> **nikomu — także pracodawcy, który ma
Twój plik PDF — nie potwierdzimy ani nie zaprzeczymy, że miałeś u nas konto.** Odpowiadamy tak samo
w każdej sytuacji: gdy ktoś sam wyłączył udostępnianie, gdy odnośnik jest nieaktualny, gdy konto
zostało usunięte i gdy dokument nigdy u nas nie powstał. <!-- pracodawca:brak_rozroznienia_przypadku --> **Nie sprawdzamy, o który przypadek
chodzi** — bo samo różnicowanie odpowiedzi mówiłoby o Tobie dokładnie to, co miało zostać usunięte.
<!-- pracodawca:jedyne_potwierdzenie_to_odnosnik --> Jedynym potwierdzeniem, jakie wystawiamy, jest **działający odnośnik, który udostępnia właściciel
dokumentu**; <!-- pracodawca:pdf_to_wydruk_nie_dowod --> sam plik PDF jest wydrukiem, nie dowodem.

### 10. Automatyczne decyzje i profilowanie

**Tak, profilujemy — i mówimy, gdzie.** Dwie rzeczy dzieją się u nas automatycznie:

**(a) Dobór powtórek.** System sam ustala, który materiał i kiedy do Ciebie wróci, na podstawie
tego, jak Ci wcześniej szło. Celem jest przypomnieć Ci rzecz w momencie, w którym miałbyś ją zaraz
zapomnieć. Ta ocena **nie wychodzi poza Twoją naukę** — nie widzi jej wykładowca, nie trafia do
paszportu, nie idzie do pracodawcy.

**(b) Otwieranie modułów po diagnozie.** Gdy skończysz diagnozę, system automatycznie otwiera Ci te
moduły, których materiał już znasz. Trzy rzeczy, które warto wiedzieć:
- decyzja **tylko otwiera** materiał — **nigdy niczego nie zamyka** i nie odbiera Ci dostępu, który
  już masz;
- **każdy moduł możesz otworzyć także sam** — przechodząc go normalnie albo zdając jego egzamin;
- jeśli uważasz, że system zdecydował źle — **napisz do nas**. Wyjaśnimy, na jakiej podstawie
  zapadła decyzja, i sprawdzi ją człowiek.

Ostatni punkt oferujemy, **bo uważamy go za uczciwy, a nie dlatego, że musimy** — decyzja o otwarciu
modułu nie wywołuje wobec Ciebie skutków prawnych ani podobnie istotnych, więc nie jest decyzją
z art. 22 RODO. Zapisujemy to wprost, żeby nie było wątpliwości: zaoferowanie kontaktu z człowiekiem
nie zmienia charakteru tej decyzji.

**Gdzie człowiek zawsze ma ostatnie słowo.** Wszystko, co pokazujesz na zewnątrz jako dowód swoich
kompetencji — paszport, potwierdzone kompetencje — **przechodzi przez człowieka**, zanim stanie się
takim dowodem. Model może przygotować ocenę i uzasadnienie; zatwierdza, zmienia albo odrzuca
**człowiek**. Podpis człowieka żyje przy Twoim kredencjale dokładnie tak długo jak sam kredencjał —
nie dłużej i nie krócej.

### 11. Czego jeszcze nie możemy potwierdzić

Wolimy powiedzieć to wprost, niż napisać zdanie, które ładnie wygląda i nie ma pokrycia.

Treść, którą piszesz do Pomocnika kariery i w obronie ustnej, trafia do **dostawcy modelu
językowego przetwarzającego dane poza Europejskim Obszarem Gospodarczym**. Na dzień wydania tej
wersji **kończymy ustalanie trzech rzeczy**: na jakiej dokładnie podstawie prawnej odbywa się to
przekazanie, jakie zobowiązania umowne wiążą dostawcę wobec nas oraz przez jaki czas i w jakim celu
przechowuje on przekazaną treść — **w szczególności, czy używa jej do trenowania swoich modeli**.

**Piszemy Ci o tym, zanim założysz konto, a nie po fakcie.** Nie potrafimy dziś podać podstawy
prawnej tego przekazania i nie zamierzamy w to miejsce wpisać zdania, które ładnie wygląda —
wolimy, żebyś wiedział, czego nie wiemy, i mógł na tej podstawie zdecydować. Gdy tylko to
domkniemy, ta sekcja zostanie zastąpiona konkretną odpowiedzią, a Ty dostaniesz informację
o zmianie.

**Co możesz z tym zrobić już teraz:** napisz do nas — adres podaliśmy w sekcji 1 — a odpowiemy, co
udało nam się ustalić na dany dzień. Masz też prawo złożyć skargę do organu nadzorczego
(sekcja 8) i możesz w każdej chwili usunąć konto (sekcja 9).

### 12. Czy musisz podawać dane

**Adres e-mail i hasło** (albo logowanie przez Google) są **niezbędne, żeby założyć konto** — bez
nich nie ma jak Cię rozpoznać ani zabezpieczyć Twojej pracy. To wymóg umowny: nie podasz — nie
założysz konta.

**Wszystko inne jest dobrowolne**, ale część rzeczy wpływa na to, co platforma potrafi dla Ciebie
zrobić: bez rozwiązanej diagnozy nie dopasujemy ścieżki, bez zgłoszonych projektów nie powstanie
paszport. **Dane o stażu i pracy są w pełni opcjonalne** i ich brak nie zmienia niczego.

### 13. Zmiany tej informacji

Jeśli zmienimy sposób przetwarzania danych, zaktualizujemy ten dokument i **poinformujemy Cię
o zmianie, zanim zacznie obowiązywać** — nie licząc na to, że sam zajrzysz. Historia zmian jest
u nas jawna.

**Wersja:** v0.1 · **data wydania:** *(uzupełniana przy zapłonie)*

---

# CZĘŚĆ II-B — aparat wewnętrzny (nie publikujemy)

### Z-5. Co musi sprawdzić prawnik przed pierwszą osobą spoza zespołu

Kolejność od najcięższego. **Żadna z tych pozycji nie jest kosmetyczna.**

| # | Rzecz | Dlaczego to pytanie do prawnika, nie do mnie |
|---|---|---|
| **L-a** | **Tożsamość administratora.** Piszę „nordsignal — firma prowadzona przez Dariusza Grądzika", bo **spółka nie jest zarejestrowana** (CLAUDE.md §9, NIP TBD). Administratorem jest więc dziś **osoba fizyczna prowadząca działalność**, nie spółka. Klauzula musi wskazywać administratora **jednoznacznie i prawdziwie** | Wskazanie nieistniejącego podmiotu jako administratora to wada, która podważa cały dokument. Wymaga też rozstrzygnięcia, co się dzieje z danymi **przy rejestracji spółki** (przejście administratora). **Waga podniesiona 2026-08-14:** dochodzi **regulamin**, czyli dokument o charakterze **umowy** — a umowa potrzebuje strony, którą da się **jednoznacznie wskazać, pozwać i doręczyć jej pismo**. Przy jednym uczestniku znanym administratorowi dało się to przyjąć; przy **naborze i dokumencie umownym** trzeba rozstrzygnąć, kto dokładnie jest stroną i jaki adres podajemy do doręczeń. **Ta sama pozycja obciąża teraz dwa dokumenty naraz**, nie jeden |
| **L-b** | **Podstawa transferu poza EOG** (P-1, P-2) i **status trenowania modeli** (P-3) | To lektura warunków dostawcy i ocena prawna, nie pomiar. Sekcja 11 jest dziś **przyznaniem się do luki** — świadomie, ale nie może nim zostać |
| **L-c** | **Umowy powierzenia (art. 28 ust. 3)** z Neon, Vercel i Anthropic — czy są zawarte i czy pokrywają nasz przypadek | Rejestr sub-procesorów **nie istnieje** (sprostowanie w `ropa.md` v0.6, wpis #3) |
| **L-d** | **Podstawa z lit. f dla pilotażu** — czy test równowagi (nasz interes kontra prawa studenta) wypada tak, jak zakładam, i czy prawo sprzeciwu jest opisane wystarczająco | Ocena, nie fakt. Ja ją postawiłem; prawnik ma ją potwierdzić lub obalić |
| **L-e** | **Moja ocena art. 22** dla automatycznego otwierania modułów (`ropa.md` wpis #5) | Stoi na trzech przesłankach i **każda jest obalalna zmianą produktu**. Prawnik powinien ją przeczytać razem z warunkami A22-1…A22-3 |
| **L-f** | **Relacja z uczelnią** — kto jest administratorem, gdy uczelnia zacznie być stroną (próg T-P1 Sophii) | Dziś nieaktualne (zero umów), ale zmienia całą konstrukcję dokumentu, gdy zadziała |
| **L-g** | **Wiek użytkowników.** Nie sprawdzamy, czy student jest pełnoletni. Przy osobie poniżej 16 lat podstawa „zgoda" (dane o stażu) wymaga zgody opiekuna (art. 8) | Nie badałem tego wątku w ogóle — **nazywam lukę, nie zamykam jej** |
| **L-h** | **Regulamin.** Klauzula informacyjna **nie jest** umową. Powołuję się na „wykonanie umowy" jako podstawę, a **regulaminu nie ma** — zmierzone: `git ls-tree -r --name-only origin/main \| grep -iE "regulamin\|terms"` → zero trafień, kod wyjścia 1 | Podstawa z lit. b wymaga umowy, która istnieje. To jest **luka konstrukcyjna całego pakietu**, wykryta przy pisaniu tej klauzuli, i nie jest moja do zamknięcia |
| **L-i** | **Czy „odmowa uniformna" jest właściwą konstrukcją wobec organu.** Sekcja 9 obiecuje, że nikomu — w tym pracodawcy — nie potwierdzimy ani nie zaprzeczymy istnienia konta, i że **nie sprawdzamy**, o który przypadek chodzi. Pytanie: czy ta konstrukcja obroni się wobec żądania organu nadzorczego lub sądu, i **jak ją pogodzić** ze zdaniem z sekcji 5 („możemy przekazać dane, jeśli wymaga tego prawo") | Zgłoszone przez Sophię przy nośniku W-5. To ocena prawna, nie produktowa: obietnica „nie sprawdzamy" jest wobec pracodawcy ochroną, a wobec organu może być czym innym. **Nie rozstrzygam tego sam** — mogę najwyżej powiedzieć, że dziś oba zdania stoją w jednym dokumencie bez wskazania, które ustępuje |
| **L-j** | **Czy zakaz zestawiania numeru dokumentu z wydruku PDF ze śladem zdarzeń przekwalifikować z decyzji produktowej na wymóg zgodności** (pozycja **L-8** rejestru art. 17, dług **A-3**) | Dziś ochroną jest **zakaz organizacyjny** — czyli obietnica firmy, że czegoś nie zrobi. Jeśli identyfikator jest „ponownie przypisywalny środkami, którymi rozsądnie może dysponować osoba trzecia" (motyw 26), to wiersze śladu **pozostają danymi osobowymi po usunięciu konta**, a wtedy zakaz musi być wymogiem, nie preferencją. **Przesłanka zmierzona przez Sophię 2026-08-14:** numer na wydruku (`SB-2026-XXXXXXXX`, `src/components/passport/passport-document.tsx:170`) jest **prefiksem identyfikatora obecnego w śladzie zdarzeń**. Przy jednym uczestniku to była hipoteza; przy naborze krąży **tyle wydruków, ilu uczestników** |
| **L-k** | **Czy rozdział „umowa / uzasadniony interes" w pilotażu wytrzyma ocenę prawną** (pełny wywód: sekcja Z-8). Przyjęcie do grupy = wykonanie umowy; analiza skuteczności nauczania = uzasadniony interes ze sprzeciwem **bez utraty dostępu** | Regulamin czyni udział treścią umowy, a wobec lit. b **art. 21 nie przysługuje** — więc dokument domykający jedną lukę potrafi unieważnić obietnicę z innego. Rozdział uważam za właściwy, ale jest pozorny, jeśli regulamin uczyni udział w badaniu **warunkiem przyjęcia**. To lektura dwóch dokumentów naraz i ocena, czy sprzeciw jest realny — nie mój wniosek do postawienia samodzielnie |
| **L-l** | **Czy przy usłudze nieodpłatnej powstaje obowiązek pouczenia o odstąpieniu od umowy** (i szerzej: czy pilotaż jest umową z konsumentem zawieraną na odległość) | Zgłoszone przez Sophię przy regulaminie. **Nie jest oczywiste w żadną stronę**: klasycznie prawo konsumenckie wiąże się z ceną, ale przepisy objęły też usługi cyfrowe świadczone w zamian za **dane osobowe**, a uczestnik płaci nam właśnie danymi i pracą. Jeśli obowiązek istnieje, brak pouczenia jest wadą **regulaminu**, nie klauzuli — ale wyjdzie na tym samym dokumencie |

### Z-6. Self-critique — head of GRC po audycie SOC 2 Type II

Pięć słabości, które sam bym sobie wytknął, i co z każdą zrobiłem.

1. **„Twoja klauzula obiecuje usunięcie konta, którego nie ma."** — Słuszne wobec draftu bez
   bramki. Dlatego sekcja Z-2 wiąże zapłon klauzuli z **całą tabelą** warunków, a nie z jednym, i wiąże
   zapłon klauzuli z zapłonem flagi `FLAG_ACCOUNT_DELETION`. Bez W-1 sekcja 8 jest nieprawdziwa
   w chwili wypowiadania — i tak to nazywam.
2. **„Piszesz, że po usunięciu konta ślad nie wskazuje na osobę — a dziś wskazuje."** — Prawda,
   i to jest najcięższy zarzut. Wiersze sprzed naprawy A-1 zachowują identyfikator, adres IP
   i sygnaturę przeglądarki **na zawsze** (`retention.md`, wiersz `audit_log`). Dlatego **W-3**
   jest warunkiem twardym, a nie życzeniem: zdanie z sekcji 9 jest prawdziwe **wyłącznie** dla
   osoby rejestrującej się po naprawie. Dla dziewięciu istniejących kont nie jest — i nie musi
   być, bo należą do administratora (`ropa.md`, oświadczenie).
3. **„Zbudowałeś drugi nośnik okresów przechowywania i nazwałeś to renderowaniem."** — Częściowo
   słuszne. Odpowiedź: drugiego nośnika **nie da się uniknąć** (art. 13 ust. 2 lit. a), więc
   zamiast udawać, że go nie ma, zapisałem go jawnie w obu plikach i dołożyłem próg. To jest
   dokładnie postępowanie przewidziane CLAUDE.md v1.17 dla świadomego drugiego nośnika.
   **Sprostowanie 2026-08-14 do brzmienia z v0.2** — stało tu: *„…i **jawnie oznaczyłem strażnika
   jako nieistniejącego**. […] Czego nie zrobiłem: strażnika. Nie udaję, że zrobiłem."* To
   przestało być prawdą **w tej samej wersji, w której zostało napisane**: v0.2 zbudowała
   strażnika `tests/unit/rodo/okresy-retencji.contract.test.ts` i opisała to w Z-3, a ten akapit
   został nietknięty. **Stan strażnika miał dwa nośniki i jeden z nich się nie dowiedział** —
   dosłownie wada, przed którą broni cała sekcja Z-3. Jedynym nośnikiem stanu strażnika jest
   **Z-3**; ten punkt go teraz **woła**, zamiast powtarzać.
4. **„Sekcja 11 to przyznanie się, że nie wiesz, dokąd wysyłasz dane studenta."** — Tak jest
   i uważam to za mniejsze zło niż zmyślona podstawa transferu. **Sprostowanie 2026-08-14 do
   brzmienia z v0.2** — stało tu: *„Ale nie zostawiam tego jako »luki nazwanej i żyjącej dalej«:
   brzmienie sekcji 11 zawiera **zdanie blokujące** („do czasu ustalenia nie rejestrujemy osób
   spoza zespołu"), które czyni tę lukę **bramką**, nie przypisem. Gdyby nie ono, sekcja 11 byłaby
   wygodnym sposobem na wysłanie klauzuli bez odrobienia pracy."* Zdanie blokujące **zostało
   usunięte** decyzją Darka z 2026-08-14 (zapis: **Z-2b**), więc powyższa obrona przestała
   obowiązywać i nie wolno jej zostawić jako opisu stanu.
   **Zarzut wraca w mocy i tak go zapisuję:** od dziś sekcja 11 **jest** luką nazwaną i żyjącą
   dalej. Jedyne, co ją odróżnia od wygodnej wymówki, to **termin** i **nośnik** — tor (a)
   domknięty przed drugą grupą uczestników, pytania w
   `docs/legal/pytania-do-dostawcy-modelu-p1-p3.md`, przyjęcie ryzyka podpisane imiennie i z datą.
   Jeśli ten termin minie bez odpowiedzi, zarzut z tego punktu jest **trafiony bez obrony** i mam
   obowiązek zgłosić to sam, zanim zrobi to ktoś z zewnątrz.
5. **„Nie jesteś prawnikiem, a napisałeś dokument prawny."** — Słuszne i dlatego sekcja Z-1 jest
   pierwszą rzeczą w dokumencie, a Z-5 wymienia osiem pozycji do weryfikacji, z których **dwie
   (L-a, L-h) podważają konstrukcję, a nie szczegół**. Znalazłem je, pisząc: nie mamy regulaminu,
   a powołuję się na wykonanie umowy; i nie mamy podmiotu, a wskazuję administratora. **Lepiej,
   żeby wyszło to teraz ode mnie niż za rok od kupującego.**

**Szóste, którego nikt by mi nie wytknął, więc wytykam sam.** Przeliczając w tej sesji klasę długu
A-1 **w dół** (`ropa.md` v0.6), zmieniłem ocenę **na własną korzyść** — lżejszy dług, zdjęty termin.
Zrobiłem to na podstawie zdania, którego **nie da się zweryfikować żadnym pomiarem**. Dlatego
obniżenie jest **warunkowe wobec podpisu**, a nie wobec rozmowy, i dlatego zostawiłem w mocy próg
mówiący, co się dzieje, **gdybym się mylił**. Gdyby oświadczenie nie zostało podpisane, obowiązuje
klasa surowsza.

### Z-8. R-3 — kolizja podstaw, którą tworzy regulamin. Ocena i co z niej wynika

Zgłoszone przez Sophię 2026-08-14 przy regulaminie pilotażu (`docs/product/regulamin-pilotazu.md`
v0.1, draft). **Zgłoszenie jest trafne i jest to najpoważniejsza rzecz, jaka wyszła w tej turze** —
poważniejsza niż oba sprostowania z Z-2a, bo tamte dotyczyły adresu dowodu, a to dotyczy obietnicy
złożonej studentowi.

**Na czym polega kolizja.** Klauzula opierała udział w pilotażu na **uzasadnionym interesie**
(art. 6 ust. 1 lit. f) i obiecywała z tego tytułu **prawo sprzeciwu** (art. 21). Regulamin z natury
czyni udział w pilotażu **treścią umowy**. Gdy udział jest treścią umowy, ktoś odczyta podstawę
jako **wykonanie umowy** (lit. b) — a wobec lit. b **art. 21 w ogóle nie przysługuje**. Dokument,
który dokładamy, żeby domknąć brakującą podstawę (pozycja L-h), po drodze **unieważniałby obietnicę
złożoną w innym dokumencie**. To jest wada tej samej klasy co zdanie blokujące z W-4: dokument
obalałby sam siebie, tylko przez pośrednika.

**Moja ocena rozdziału zaproponowanego przez Sophię — trzyma się, i to jest właściwa konstrukcja.**
Rozdzielenie *korzystania z platformy* (umowa) od *analizy skuteczności nauczania* (nasz interes,
sprzeciw bez utraty dostępu) jest standardowym i uczciwym rozwiązaniem, bo odzwierciedla rzecz
prawdziwą: **grupa pilotażowa i badanie skuteczności to naprawdę dwie różne czynności**, a nie
jedna nazwana dwa razy. Przyjęcie kogoś do ograniczonej grupy jest wykonaniem umowy — musimy
wiedzieć, komu daliśmy dostęp. Zestawianie jego wyników z wynikami innych po to, żeby ocenić
**nasz** produkt, jest naszą korzyścią, nie jego.

**Warunek, bez którego cała konstrukcja się wywraca — i to on jest tu istotą, nie nazewnictwo.**
Sprzeciw musi być **realny**, czyli **nie może kosztować dostępu**. Jeśli odmowa udziału w analizie
oznaczałaby wypadnięcie z pilotażu, to sprzeciw jest pozorny, a wtedy całość i tak jest lit. b —
i obietnica z sekcji 8 staje się nieprawdziwa, tyle że mniej widocznie. **Dlatego zmieniłem CZĘŚĆ I,
a nie tylko aparat:**
- sekcja 4 ma teraz **dwa osobne wiersze** zamiast jednego: „przyjęcie do grupy" (umowa)
  i „sprawdzanie, czy platforma uczy skutecznie" (uzasadniony interes);
- oba wiersze i wiersz sprzeciwu w sekcji 8 mówią **wprost**, że sprzeciw **nie odbiera dostępu**.

**Czego NIE rozstrzygam i co idzie do prawnika.** Czy rozdział wytrzyma ocenę prawną, zależy od
brzmienia regulaminu, którego **nie jestem autorem i którego nie edytuję**. W szczególności:
jeśli regulamin uczyni udział w badaniu **warunkiem przyjęcia do grupy**, rozdział jest pozorny
i wracamy do punktu wyjścia. Zapisane jako pozycja **L-k**.

**Do Sophii, do jej dokumentu — czego w nim potrzebuję** (nie edytuję go, więc piszę, czego brakuje):
paragraf o analizie skuteczności musi zawierać zdanie, że **odmowa udziału w analizie nie wpływa
na dostęp do platformy ani na zdobyte kredencjały**, oraz nie może wiązać przyjęcia do grupy ze
zgodą na badanie. Bez tego zdania rozdział istnieje w klauzuli i nie istnieje w umowie — a przy
sporze wygrywa umowa.

**§12 regulaminu — usunięcie kont w 30 dni ścieżką, która jest za zgaszonym przełącznikiem.**
Sophia obietnicy nie wykreśliła, tylko związała zapłon regulaminu z warunkiem **W-1**. Kierunek
dobry, **brzmienie samo w sobie nie wystarcza** — i wiem to z własnego podwórka. Przełącznik nie
jest drzwiami jednokierunkowymi: można go zapalić, wypuścić regulamin, a potem zgasić przełącznik
zmienną środowiskową **bez żadnego wdrożenia**, i obietnica z §12 stanie się nieprawdziwa
**w milczeniu**. Klauzula rozwiązała dokładnie ten problem **mechanizmem, nie zdaniem**:
sprzężeniem flag (`requires` w `src/lib/flags.ts`), pilnowanym przez strażnika
`tests/unit/rodo/klauzula-zaplon-flaga.contract.test.ts` z udokumentowaną mutacją M4 i jawnym
progiem. **Rekomendacja: regulamin dostaje własną flagę zapłonu, sprzężoną z tą samą flagą
usunięcia konta** — wtedy „związany z W-1" jest stanem systemu, a nie zdaniem w dokumencie.
Właściciel mechanizmu: Ethan. Bez tego pozycja zostaje długiem z progiem, nie warunkiem spełnionym.

**Przesłanka, którą Sophia mi obaliła — odnotowuję, bo działa na moją niekorzyść.** Podałem jej,
że ludzka warstwa kredencjału nie jest zaimplementowana. **To nieprawda** i sprawdziłem to sam
(odczyty 2026-08-14, `git ls-files` i `git grep` na `origin/main`): istnieją trasy przeglądu
(`src/app/api/review-queue/route.ts`, `…/[id]/decision/route.ts`, `…/[id]/viva/route.ts`), logowanie
operatora jakości (`src/app/api/operator/login/route.ts`), plakietka „Oceniał człowiek" w **czterech**
plikach produkcyjnych — w tym na **publicznym** paszporcie (`src/app/passport/[id]/page.tsx`) —
oraz `docs/decisions/011-kto-ocenia-w-becie.md`. Kontrola dwustronna: `git grep` na frazie
nieistniejącej kończy się kodem 1, na frazie istniejącej kodem 0. **Sprawdzam, czy zbudowałem coś
na tej fałszywej przesłance: nie.** Zdanie z sekcji 10 („zatwierdza, zmienia albo odrzuca człowiek")
było napisane wcześniej i jest **prawdziwe** — gdybym oparł się na tym, co jej powiedziałem,
musiałbym je dziś wykreślać jako obietnicę bez pokrycia.

### Z-7. Nabór 3–5 osób — akceptacje ryzyka, które wyceniałem na JEDNEGO uczestnika

Darek zdecydował 2026-08-14 o wpuszczeniu **3–5 osób**, nie jednej. To nie jest ta sama decyzja
w większej liczbie egzemplarzy. Kilka moich wcześniejszych akceptacji ryzyka było **jawnie
wycenionych na jednego uczestnika znanego administratorowi osobiście** — i przy naborze przestają
działać. Wypisuję je **przed podpisem**, bo po podpisie byłoby to tłumaczenie się, a nie ostrzeżenie.

**Wspólny mechanizm awarii wszystkich trzech pozycji poniżej:** milcząco zakładały, że administrator
**zna osobiście każdego posiadacza konta**. Przy jednym uczestniku z imiennej listy to była prawda
i dawało się na niej oprzeć proces prowadzony w głowie. Nabór tę przesłankę kasuje — i kasuje ją
**od pierwszej osoby**, nie od piątej.

| # | Akceptacja i jej pierwotna wycena | Co się psuje przy naborze | Co proponuję |
|---|---|---|---|
| **S-1** | **Pakiet B — rejestr żądań usunięcia poza bazą.** Moja rekomendacja brzmiała dosłownie: *„(3) przyjąć ryzyko na jednego uczestnika, (1) osobny projekt bazy **przed naborem**"*. Przesłanka zmierzona i nadal aktualna: produkt na hostingu **nie ma ani jednego odwołania** do dziennika firmy, więc rejestr żądań usunięcia jest pusty z konstrukcji | **Wariant (3) wygasa z definicji** — nabór to jest właśnie ten próg, który sam postawiłem. Przy jednej osobie żądanie usunięcia pamięta administrator; przy pięciu, rozłożonych w czasie, „pamięta" przestaje być procesem. Dowód wykonania art. 17 wobec organu **nie może być zeznaniem administratora** | **Rejestr żądań usunięcia poza gałęzią produkcyjną — przed wpuszczeniem grupy.** Wariant (2) z pakietu (rejestr ręczny prowadzony przez operatora) jest **wystarczający i tani**: data żądania, identyfikator skrótem, data wykonania, potwierdzenie ponowienia po odtworzeniu kopii. Wariant (1) — osobny projekt bazy — to czerwona linia (nowe źródło danych) i **decyzja Darka**; nie jest konieczny przy pięciu osobach, jeśli powstanie wariant (2) |
| **S-2** | **Brak regulaminu (pozycja L-h).** Zapisałem: *„Przy jednym uczestniku znanym administratorowi do przyjęcia; **przy naborze nie**"*. Klauzula powołuje się na **wykonanie umowy** (art. 6 ust. 1 lit. b) jako podstawę dla konta, mapowania kompetencji i funkcji modelu — a umowy nie ma | Podstawa z lit. b wymaga umowy, która **istnieje**. Przy osobie znanej administratorowi da się bronić tezy o umowie zawartej ustnie; **przy naborze z listy — nie**, bo nie ma czego okazać. To nie jest wada klauzuli, to wada pakietu, którego klauzula jest częścią | **Regulamin przed pierwszą rejestracją** — plan już to przewiduje i to jest właściwa kolejność. Zaznaczam tylko, że to **warunek działania klauzuli**, a nie równoległy drobiazg: bez regulaminu połowa wierszy tabeli z sekcji 4 wskazuje podstawę, której nie ma |
| **S-3** | **Dług A-3 / pozycja L-8 — prefiks identyfikatora paszportu jako numer na wydruku PDF.** Klasyfikowałem go jako ryzyko **teoretyczne**, z progiem „pierwsze zapytanie pracodawcy" | Przy jednym uczestniku istniał **najwyżej jeden** wydruk i to zwykle wydruk testowy. Przy naborze krąży **tyle wydruków, ilu uczestników**, i trafiają do prawdziwych pracodawców. Ryzyko przestaje być teoretyczne **z chwilą wpuszczenia grupy**, a nie z chwilą pierwszego zapytania — próg, który postawiłem, jest o krok za późny | **Zakaz zestawiania numeru dokumentu ze śladem zdarzeń trafia do pytań dla prawnika jako pozycja L-j**, z wnioskiem o przekwalifikowanie z decyzji produktowej na wymóg zgodności. Do czasu odpowiedzi zakaz obowiązuje jako **środek organizacyjny z nazwanym właścicielem** (Ryan), nie jako preferencja |

**Czego ta sekcja NIE mówi.** Nie mówi, że nabór jest zły — decyzja o skali należy do Darka i ma
dobre uzasadnienie produktowe (jeden uczestnik nie daje sygnału o niczym). Mówi, że **trzy z moich
akceptacji były wycenione na inną skalę** i przeniesienie ich bez przeliczenia byłoby cichym
rozszerzeniem zgody, której nikt nie udzielił. **S-1 i S-2 uważam za bramki przed pierwszą
rejestracją**; S-3 za dług z właścicielem i terminem, nie za bramkę.

**Osobno, i to nie jest część W-4 ani żadnego warunku z Z-2 — oświadczenie administratora o kontach.**
Oświadczenie „wszystkie konta zarejestrowane obecnie na platformie są kontami testowymi" jest
**twierdzeniem o stanie na dany dzień** i tak musi być zapisane: z datą i z liczbą. Bez daty stanie
się nieprawdziwe automatycznie w dniu, w którym wpuścimy pierwszego uczestnika — a wtedy dokument,
na którym opiera się klasyfikacja długu A-1, zacznie kłamać, **nie zmieniając ani jednego słowa**.
Pomiar stanu na 2026-08-14 i jego wynik: `docs/audyty/2026-08-14-konta-produkcyjne-pomiar-ryan.md`.
