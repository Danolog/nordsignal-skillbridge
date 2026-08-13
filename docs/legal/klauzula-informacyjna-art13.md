# Klauzula informacyjna (art. 13 RODO) — SkillBridge · DRAFT v0.2

**Wersja:** v0.2 · 2026-08-12 · **Autor:** Ryan (CRCO nordsignal) · **Zadanie:** E2c pakietu RODO
(artefakt **E-1**) · **Zleceniodawca:** Oliver (COO) · **Sign-off:** Darek (CEO) — wymagany, akt
wychodzący na zewnątrz (CLAUDE.md §4).

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
> słowo w słowo. **CZĘŚĆ II** (sekcje Z-1…Z-6) to **aparat wewnętrzny**: skąd wzięło się każde
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
| **W-4** | **Odpowiedzi na pytania P-1…P-3** (umowa powierzenia z dostawcą modelu, podstawa transferu, trenowanie modeli) — albo uzyskane, albo sekcja 11 zostaje w brzmieniu „ustalamy to" i Darek to **świadomie akceptuje** | Darek (posiadacz konta u dostawcy) | Art. 13 ust. 1 lit. f wymaga podania podstawy przekazania danych poza EOG. **Nie wolno jej zmyślić** |
| **W-5** | **Zasada odpowiedzi dla pracodawcy podpisana i wdrożona** — nośnik: `docs/product/zasada-odpowiedzi-dla-pracodawcy.md` (Sophia), przegląd RODO wykonany (`scratchpad/przeglad-zasada-pracodawcy-ryan.md`), z **poprawką R-2** w treści strony martwego odnośnika | Sophia (treść), Ryan (przegląd — wykonany), Darek (sign-off) | Sekcja 9 klauzuli **obiecuje studentowi konkretne zachowanie wobec pracodawcy** („nie potwierdzimy ani nie zaprzeczymy"). Obietnica bez wdrożonej zasady i bez strony pod martwym odnośnikiem jest obietnicą bez pokrycia — tą samą klasą wady, którą naprawia W-1 |

**Nośnikiem tej listy jest ta tabela.** Rejestr czynności (`ropa.md`) i rejestr kompletności art. 17
**wołają ją**, nie powtarzają.

### Z-3. Jeden nośnik — jak to jest rozwiązane i gdzie zostaje dług

Klauzula **wywodzi** treść z trzech rejestrów i **nie jest** dla nich źródłem prawdy:

| Co | Jedyny nośnik | Jak klauzula go używa |
|---|---|---|
| Cele, podstawy prawne, odbiorcy | `docs/data/ropa.md` (wpisy #1–#8) | sekcja 4 **renderuje** wpisy; nowa czynność w rejestrze = nowy wiersz tutaj |
| Okresy przechowywania | `docs/data/retention.md` | sekcja 7 **renderuje** tabelę; **żadnego okresu nie wymyślam** |
| Co przeżywa usunięcie konta | `docs/data/art17-kompletnosc-usuniecia.md` | sekcja 9 renderuje rozstrzygnięcia pozycji L-1…L-7 |
| Trwałość podpisu człowieka pod kredencjałem | **ADR-008** (`docs/decisions/008-hitl-rozdzial-wagi-oceny.md`) | sekcja 10 **cytuje regułę Sophii, nie formułuje własnej** |
| Co odpowiadamy pracodawcy po usunięciu konta | `docs/product/zasada-odpowiedzi-dla-pracodawcy.md` (Sophia) | sekcja 9 **renderuje zasadę dla studenta**; nie ustanawia jej i nie rozstrzyga jej brzmienia zewnętrznego |

**Świadomy drugi nośnik — nazwany, nie ukryty.** Okresy przechowywania **muszą** paść wobec
studenta (art. 13 ust. 2 lit. a nie pozwala odesłać go do rejestru wewnętrznego), więc liczby
z `retention.md` są tu fizycznie powtórzone. Zgodnie z CLAUDE.md v1.17 wymaga to progu i strażnika:
- **próg** zapisany w `docs/data/retention.md` (nagłówek): zmiana okresu tam jest niedomknięta,
  dopóki nie trafi do **wszystkich** nośników;
- **strażnik maszynowy: `tests/unit/rodo/okresy-retencji.contract.test.ts`** — porównuje okresy
  w trzech nośnikach naraz i pada, gdy się rozjadą. Mutacje czerwieniące go — w tym po jednej
  na tej klauzuli i na źródle — są zacytowane w nagłówku tego testu, i to on jest ich nośnikiem.

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
| **Lista uczestników pilotażu** — kto liczy się w ocenie, czy nasze reguły działają | nasz uzasadniony interes (art. 6 ust. 1 lit. f) | sprawdzamy, czy platforma uczy skutecznie. **Możesz się temu sprzeciwić** (sekcja 8) |

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
| **Sprzeciw** (art. 21) | sprzeciwić się przetwarzaniu opartemu na naszym uzasadnionym interesie — w praktyce: **udziałowi w pilotażu**. Wtedy przestajemy Cię w nim liczyć |
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

**A jeśli ktoś zapyta nas o Ciebie po usunięciu konta:** **nikomu — także pracodawcy, który ma
Twój plik PDF — nie potwierdzimy ani nie zaprzeczymy, że miałeś u nas konto.** Odpowiadamy tak samo
w każdej sytuacji: gdy ktoś sam wyłączył udostępnianie, gdy odnośnik jest nieaktualny, gdy konto
zostało usunięte i gdy dokument nigdy u nas nie powstał. **Nie sprawdzamy, o który przypadek
chodzi** — bo samo różnicowanie odpowiedzi mówiłoby o Tobie dokładnie to, co miało zostać usunięte.
Jedynym potwierdzeniem, jakie wystawiamy, jest **działający odnośnik, który udostępnia właściciel
dokumentu**; sam plik PDF jest wydrukiem, nie dowodem.

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

**Do czasu ustalenia i opisania tego w tym dokumencie nie rejestrujemy osób spoza zespołu
twórców.** Gdy tylko to domkniemy, ta sekcja zostanie zastąpiona konkretną odpowiedzią, a Ty
dostaniesz informację o zmianie.

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
| **L-a** | **Tożsamość administratora.** Piszę „nordsignal — firma prowadzona przez Dariusza Grądzika", bo **spółka nie jest zarejestrowana** (CLAUDE.md §9, NIP TBD). Administratorem jest więc dziś **osoba fizyczna prowadząca działalność**, nie spółka. Klauzula musi wskazywać administratora **jednoznacznie i prawdziwie** | Wskazanie nieistniejącego podmiotu jako administratora to wada, która podważa cały dokument. Wymaga też rozstrzygnięcia, co się dzieje z danymi **przy rejestracji spółki** (przejście administratora) |
| **L-b** | **Podstawa transferu poza EOG** (P-1, P-2) i **status trenowania modeli** (P-3) | To lektura warunków dostawcy i ocena prawna, nie pomiar. Sekcja 11 jest dziś **przyznaniem się do luki** — świadomie, ale nie może nim zostać |
| **L-c** | **Umowy powierzenia (art. 28 ust. 3)** z Neon, Vercel i Anthropic — czy są zawarte i czy pokrywają nasz przypadek | Rejestr sub-procesorów **nie istnieje** (sprostowanie w `ropa.md` v0.6, wpis #3) |
| **L-d** | **Podstawa z lit. f dla pilotażu** — czy test równowagi (nasz interes kontra prawa studenta) wypada tak, jak zakładam, i czy prawo sprzeciwu jest opisane wystarczająco | Ocena, nie fakt. Ja ją postawiłem; prawnik ma ją potwierdzić lub obalić |
| **L-e** | **Moja ocena art. 22** dla automatycznego otwierania modułów (`ropa.md` wpis #5) | Stoi na trzech przesłankach i **każda jest obalalna zmianą produktu**. Prawnik powinien ją przeczytać razem z warunkami A22-1…A22-3 |
| **L-f** | **Relacja z uczelnią** — kto jest administratorem, gdy uczelnia zacznie być stroną (próg T-P1 Sophii) | Dziś nieaktualne (zero umów), ale zmienia całą konstrukcję dokumentu, gdy zadziała |
| **L-g** | **Wiek użytkowników.** Nie sprawdzamy, czy student jest pełnoletni. Przy osobie poniżej 16 lat podstawa „zgoda" (dane o stażu) wymaga zgody opiekuna (art. 8) | Nie badałem tego wątku w ogóle — **nazywam lukę, nie zamykam jej** |
| **L-h** | **Regulamin.** Klauzula informacyjna **nie jest** umową. Powołuję się na „wykonanie umowy" jako podstawę, a **regulaminu nie ma** — zmierzone: `git ls-tree -r --name-only origin/main \| grep -iE "regulamin\|terms"` → zero trafień, kod wyjścia 1 | Podstawa z lit. b wymaga umowy, która istnieje. To jest **luka konstrukcyjna całego pakietu**, wykryta przy pisaniu tej klauzuli, i nie jest moja do zamknięcia |

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
   zamiast udawać, że go nie ma, zapisałem go jawnie w obu plikach, dołożyłem próg i **jawnie
   oznaczyłem strażnika jako nieistniejącego**. To jest dokładnie postępowanie przewidziane
   CLAUDE.md v1.17 dla świadomego drugiego nośnika. Czego nie zrobiłem: strażnika. Nie udaję,
   że zrobiłem.
4. **„Sekcja 11 to przyznanie się, że nie wiesz, dokąd wysyłasz dane studenta."** — Tak jest
   i uważam to za mniejsze zło niż zmyślona podstawa transferu. Ale nie zostawiam tego jako
   „luki nazwanej i żyjącej dalej": brzmienie sekcji 11 zawiera **zdanie blokujące** („do czasu
   ustalenia nie rejestrujemy osób spoza zespołu"), które czyni tę lukę **bramką**, nie przypisem.
   Gdyby nie ono, sekcja 11 byłaby wygodnym sposobem na wysłanie klauzuli bez odrobienia pracy.
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
