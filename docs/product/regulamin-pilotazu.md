# Regulamin pilotażu SkillBridge — DRAFT v0.1

**Wersja:** v0.1 · 2026-08-14 · **Autor:** Sophia (PO nordsignal) · **Zadanie:** 2.10 (luka L-h
klauzuli art. 13 — „powołuję się na wykonanie umowy, a regulaminu nie ma") · **Zleceniodawca:**
Oliver (COO) · **Sign-off:** Darek (CEO) — wymagany, akt wychodzący na zewnątrz (CLAUDE.md §4).

> **STATUS: PROJEKT. NIE OBOWIĄZUJE. NIE POKAZUJEMY GO NIKOMU.**
> Wchodzi w życie z podpisem Darka i z wdrożeniem akceptacji przy rejestracji (sekcja R-5).

> **Ten dokument ma dwie części i to rozróżnienie jest wiążące.**
> **CZĘŚĆ I** to **treść, którą akceptuje uczestnik** — po sign-offie idzie do produktu słowo
> w słowo. **CZĘŚĆ II** (sekcje R-1…R-7) to **aparat wewnętrzny**: analiza podstaw przetwarzania,
> kolizje do rozstrzygnięcia i zamówienie dla działu Engineering. Część II **nigdy** nie jest
> publikowana.

---

## CZĘŚĆ II-A — co trzeba wiedzieć, zanim się to przeczyta

### R-1. Po co ten dokument istnieje

Klauzula informacyjna art. 13 wskazuje **wykonanie umowy** (art. 6 ust. 1 lit. b) jako podstawę
pięciu z ośmiu czynności przetwarzania — a umowy nie ma. Wykrył to autor klauzuli przy jej pisaniu
i nazwał **luką konstrukcyjną całego pakietu** (pozycja L-h rejestru dla prawnika), zmierzoną
komendą: `git ls-tree -r --name-only origin/main | grep -iE "regulamin|terms"` → zero trafień.

Sprawdziłam to sama, bo na tej przesłance stoi cały ten dokument (odczyt 2026-08-14 17:31 CEST,
repozytorium produktu, `main`):

```
$ git ls-tree -r --name-only origin/main | grep -icE "regulamin|terms"
0
```

**Podstawa „wykonanie umowy" bez umowy jest podstawą pozorną.** Przy jednym uczestniku znanym
administratorowi dawało się to przyjąć świadomie; przy naborze 3–5 osób nie — bo nabór oznacza
osoby, z którymi nie łączy nas nic poza tym dokumentem.

**Ten dokument jest tą umową.** Nie zastępuje klauzuli informacyjnej (nośnik informacji
o przetwarzaniu) ani zasady odpowiedzi dla pracodawcy (nośnik: `zasada-odpowiedzi-dla-pracodawcy.md`
w tym samym katalogu). Woła je — nie powtarza.

### R-2. Pokrycie podstaw z klauzuli — analiza pozycja po pozycji

Zadanie brzmiało: sprawdzić, czy po napisaniu regulaminu każda czynność opisana w klauzuli jako
„wykonanie umowy" faktycznie się w nim mieści, i **powiedzieć, jeśli nie**. Wynik:

| Czynność z klauzuli | Podstawa w klauzuli | Czy regulamin ją pokrywa |
|---|---|---|
| Konto i logowanie | wykonanie umowy | **tak** — §1, §3, §4 |
| Mapowanie kompetencji i luk | wykonanie umowy | **tak** — §4 opisuje to jako rdzeń usługi |
| Dobór i harmonogram powtórek (profilowanie) | wykonanie umowy | **tak** — §4 i §6 nazywają automatyzm wprost |
| Automatyczne otwieranie modułów po diagnozie | wykonanie umowy | **tak** — §6 |
| Funkcje oparte na modelu językowym | wykonanie umowy | **tak** — §7, z jawnym powiedzeniem, że treść wychodzi do dostawcy |
| Dane o stażu i pracy | zgoda | **nie dotyczy** — regulamin wprost mówi, że to dobrowolne i poza umową (§4) |
| Ślad zdarzeń bezpieczeństwa | uzasadniony interes | **nie dotyczy** — nie czynię z tego zobowiązania umownego |
| **Lista uczestników pilotażu** | **uzasadniony interes + prawo sprzeciwu** | **UWAGA — patrz R-3** |

### R-3. Jedna kolizja, której nie rozstrzygam sama — do Ryana

**Problem.** Klauzula opiera „listę uczestników pilotażu" na **uzasadnionym interesie**
(art. 6 ust. 1 lit. f) i daje **prawo sprzeciwu**: *„Wtedy przestajemy Cię w nim liczyć"*. Tymczasem
regulamin z natury czyni **udział w pilotażu treścią umowy** — bo usługa jest pilotażem i niczym
innym: nie ma wersji „zwykłej", do której można by się przenieść.

**Ryzyko, które z tego wynika:** jeśli udział w pilotażu jest świadczeniem umownym, ktoś może
odczytać podstawę dla listy uczestników jako **wykonanie umowy**, a nie uzasadniony interes —
a wtedy obiecane prawo sprzeciwu staje się obietnicą bez pokrycia (sprzeciw z art. 21 nie
przysługuje wobec lit. b). To dokładnie ta klasa wady, którą zamykaliśmy przy sekcji 9 klauzuli:
dokument obiecuje zachowanie, którego konstrukcja nie utrzyma.

**Jak to napisałam, żeby kolizji nie pogłębić** — i to jest świadomy wybór, nie przypadek:
CZĘŚĆ I **rozdziela dwie rzeczy**, które łatwo zlepić w jedną:
- **korzystanie z platformy** — to jest umowa (§4). Bez tego nie ma usługi;
- **analiza skuteczności nauczania** — to jest **nasza korzyść**, opisana w §5 jako coś, czemu
  uczestnik **może się sprzeciwić bez utraty dostępu**. Regulamin nie czyni z niej warunku
  świadczenia usługi.

Dzięki temu konstrukcja z klauzuli (lit. f + sprzeciw) zostaje utrzymana. **Ale to jest wybór
produktowy podparty rozumowaniem, nie ocena prawna** — i nie ja jestem od jej potwierdzenia.
**Do Ryana:** czy ten rozdział wystarczy, żeby lit. f obroniła się przy usłudze, która nazywa się
pilotażem? Jeśli nie — trzeba zmienić klauzulę, nie naginać regulaminu. **Nie naginałam.**

**Druga pozycja dla Ryana, mniejsza:** §11 daje uczestnikowi prawo rezygnacji w każdej chwili, co
jest korzystniejsze niż ustawowe odstąpienie od umowy zawartej na odległość. Nie sprawdzałam, czy
przy usłudze **nieodpłatnej** obowiązek pouczenia o odstąpieniu i tak nie powstaje — to pytanie
konsumenckie, nie produktowe.

### R-4. Trzy rzeczy, które regulamin mówi wprost, choć wygodniej byłoby przemilczeć

1. **Człowiekiem stojącym za potwierdzeniem kompetencji jest twórca platformy** — nie niezależny
   ekspert i nie uczelnia (ADR-011: recenzuje operator jakości, w Becie jedna osoba). Nasze USP
   brzmi „człowiek ma ostatnie słowo"; uczciwość wymaga powiedzenia, **który** człowiek. Bez tego
   uczestnik mógłby sądzić, że kupuje niezależną walidację.
2. **Treść istnieje dziś wyłącznie dla jednej ścieżki** (Data Science). Zmierzone — pozostałe
   ścieżki mają moduły w stanie „treść w drodze".
3. **Potwierdzenie od nas nie jest dyplomem ani certyfikatem uznawanym przez kogokolwiek.**
   To zdanie kosztuje nas atrakcyjność i zostaje.

### R-5. Jeden nośnik — i świadoma odmowa zbudowania trzeciego

Zasada odpowiedzi dla pracodawcy ma dziś **dwa** nośniki: dokument zasady (nośnik właściwy)
i sekcja 9 klauzuli (świadomy drugi nośnik, wymuszony przez art. 13, z progiem i strażnikiem).

**Regulamin mógłby ją powtórzyć po raz trzeci** — kusi, bo to zobowiązanie wobec uczestnika
i naturalnie prosi się o miejsce w umowie. **Nie zrobiłam tego.** §9 regulaminu **wskazuje**
informację o przetwarzaniu jako miejsce, w którym ta zasada żyje, i nie przytacza jej brzmienia.
Trzeci nośnik oznaczałby trzeci tekst do utrzymania w zgodzie przy każdej zmianie — a strażnika
dla dwóch pierwszych **wciąż nie ma** (warunek S-W4 dokumentu zasady). Dokładanie kopii do
niepilnowanej pary jest mnożeniem długu, nie kompletnością.

Prawo nie wymaga tu powtórzenia: regulamin nie musi zawierać informacji z art. 13 — ma do niej
odesłać, co jest normą.

---

# CZĘŚĆ I — Regulamin pilotażu SkillBridge

> *Poniższy tekst jest tym, co akceptuje uczestnik. Po polsku, bez żargonu; pojęcia techniczne
> rozwinięte przy pierwszym użyciu.*

---

## §1. Kto świadczy usługę

Usługę świadczy **nordsignal — działalność prowadzona przez Dariusza Grądzika**, twórcę platformy
SkillBridge. Kontakt we wszystkich sprawach: `kontakt@nordsignal.cc`.

Ten regulamin jest umową między Tobą a nami. Określa, co dostajesz, czego nie obiecujemy i na
jakich zasadach korzystasz z platformy. Akceptujesz go, zakładając konto — bez tego nie możemy
udostępnić Ci platformy.

## §2. Czym jest pilotaż

SkillBridge jest **na etapie pilotażu**: udostępniamy działającą, ale wczesną wersję platformy
wąskiej, imiennie zaproszonej grupie osób. To nie jest wersja próbna dojrzałego produktu — to
pierwsze uruchomienie z realnymi uczestnikami.

**Co z tego wynika dla Ciebie, konkretnie:**

- części funkcji jeszcze nie ma, a niektóre włączamy stopniowo, także w trakcie Twojego udziału;
- możesz natrafić na błędy, przerwy w działaniu i treści, które poprawiamy po drodze;
- pilotaż ma **początek i koniec** — co się dzieje na końcu, mówi §12;
- Twoje uwagi realnie zmieniają produkt. Po to jest pilotaż.

**Nie ma wersji „zwykłej", do której można się przenieść.** Korzystanie z platformy dziś oznacza
udział w pilotażu.

## §3. Kto może wziąć udział

- osoby, które **ukończyły 18 lat** — platforma nie jest przeznaczona dla osób młodszych i nie
  zakładamy im kont;
- osoby, które dostały od nas **imienne zaproszenie**. Nie prowadzimy otwartej rejestracji;
- w tej turze pilotażu — osoby, których cel zawodowy mieści się w obszarze **danych (Data
  Science)**. Powód jest praktyczny i mówimy go wprost: tylko dla tej ścieżki mamy dziś gotowy
  materiał do nauki (§5).

Konto jest osobiste. Nie udostępniaj go innym i nie zakładaj konta za kogoś.

## §4. Co dostajesz

W ramach pilotażu udostępniamy Ci:

| Co | Na czym polega |
|---|---|
| **Mapa Twoich kompetencji i luk** | zestawienie tego, co już umiesz, z tym, czego oczekuje rynek dla Twojego celu zawodowego |
| **Diagnoza na wejściu** | zadania sprawdzające, od którego miejsca zaczynasz — na jej podstawie platforma otwiera Ci materiał |
| **Ścieżka nauki** | moduły z teorią, ćwiczeniami i zadaniami praktycznymi, w kolejności dobranej do Twoich luk |
| **Powtórki** | system sam przypomina Ci materiał w momencie, w którym zaczynasz go zapominać |
| **Pomocnik kariery i tutor** | funkcje rozmowy oparte na modelu językowym — pomagają wybrać kierunek i przejść przez zadanie |
| **Paszport kompetencji** | dokument podsumowujący, co potwierdziłeś pracą; możesz udostępnić go odnośnikiem albo pobrać |

**Dobrowolnie i poza umową:** możesz nam zgłosić, że zacząłeś staż albo pracę. To nie jest warunek
korzystania z platformy, opiera się na Twojej zgodzie i możesz ją wycofać w każdej chwili. Odmowa
nie zmienia niczego w tym, co dostajesz.

**Udział jest bezpłatny.** Nie pobieramy opłat, nie prosimy o dane karty i nie przekształcimy tego
w płatną subskrypcję bez Twojej wyraźnej zgody.

## §5. Czego nie obiecujemy

Piszemy to wprost, żeby nie było nieporozumienia:

- **Nie obiecujemy pracy, stażu ani rozmowy kwalifikacyjnej.** Platforma pokazuje, czego oczekuje
  rynek, i pomaga to nadrobić. Zatrudnia pracodawca, nie my.
- **To, co od nas dostajesz, nie jest dyplomem ani certyfikatem uznawanym przez uczelnię, urząd
  czy branżę.** Nie jesteśmy instytucją certyfikującą i nie przyznajemy punktów ECTS.
- **Materiał do nauki istnieje dziś w komplecie wyłącznie dla ścieżki danych.** Dla pozostałych
  kierunków zobaczysz mapę rynku i diagnozę, ale moduły będą oznaczone jako „treść w drodze" —
  i to nie jest usterka, tylko stan faktyczny.
- **Nie gwarantujemy ciągłości działania.** Może się zdarzyć przerwa, także dłuższa.
- **Nie gwarantujemy, że dane rynkowe są kompletne.** Pochodzą z ogłoszeń o pracę zbieranych
  okresowo; pokazują tendencję, nie pełny obraz rynku.

**Analiza skuteczności nauczania.** Sprawdzamy, czy platforma naprawdę uczy — patrzymy na to, jak
uczestnikom idzie, w skali całej grupy. **Możesz się temu sprzeciwić**, pisząc do nas; przestaniemy
uwzględniać Cię w tej analizie i **nie stracisz przez to dostępu do platformy ani żadnej funkcji**.

## §6. Jak oceniamy Twoją pracę — dwa poziomy i różnica między nimi

To jest najważniejsza sekcja tego regulaminu. Ocena na platformie ma **dwa poziomy o różnej wadze**
i dotyczą ich różne zasady.

**Poziom pierwszy — ocena do nauki. Decyduje maszyna i to wystarcza.**

Sprawdzanie ćwiczeń, informacja zwrotna, dobór powtórek, otwieranie modułów po diagnozie — robi to
automat i jego werdykt jest ostateczny na tym poziomie. Oznaczamy go jako **ocenę automatyczną**.
Traktuj go jak korepetytora dostępnego natychmiast: pomaga się uczyć, bywa omylny i **nic z tego
nie wychodzi na zewnątrz**. Nie widzi tego pracodawca, nie widzi uczelnia, nie trafia to do
paszportu jako dowód.

Decyzja o otwarciu modułu **tylko otwiera** materiał — nigdy niczego nie zamyka i nie odbiera Ci
dostępu, który już masz. Każdy moduł możesz otworzyć też sam. Jeśli uważasz, że system pomylił się
na Twoją niekorzyść — napisz; wyjaśnimy podstawę decyzji i sprawdzi ją człowiek.

**Poziom drugi — potwierdzenie kompetencji. Ostatnie słowo ma człowiek.**

Wszystko, co ma stać się **dowodem Twoich kompetencji wobec kogoś na zewnątrz** — potwierdzona
kompetencja, wpis w paszporcie — przechodzi przez człowieka, zanim tym dowodem się stanie. Automat
przygotowuje ocenę i uzasadnienie; **człowiek zatwierdza ją, zmienia albo odrzuca.** Praca, której
człowiek nie zatwierdził, nie dostaje oznaczenia „oceniał człowiek" — i nigdy nie udajemy, że
dostała.

**Kto jest tym człowiekiem — mówimy wprost.** W pilotażu potwierdzenia wykonuje **operator jakości,
czyli twórca platformy**. Nie jest to niezależny ekspert zewnętrzny ani wykładowca uczelni;
wykładowcy mają dołączyć na późniejszym etapie. Wiedz o tym, oceniając, ile takie potwierdzenie
dla Ciebie waży — i mów to samo osobom, którym je pokazujesz.

## §7. Twoje treści i funkcje oparte na modelu językowym

Wszystko, co tworzysz na platformie — rozwiązania zadań, zgłoszenia projektów, wypowiedzi, wgrany
program studiów — **pozostaje Twoje**. Nie rościmy sobie do tego praw i nie sprzedajemy tego.

Używamy tych treści po to, żeby świadczyć Ci usługę: sprawdzić zadanie, przygotować informację
zwrotną, zbudować Twoją mapę kompetencji i paszport.

**Treść, którą piszesz do Pomocnika kariery, do tutora i w obronie ustnej, wysyłamy do zewnętrznego
dostawcy modelu językowego** — bez tego te funkcje nie działają. Dostawca przetwarza dane poza
Europejskim Obszarem Gospodarczym. Co dokładnie mu przekazujemy, czego nie przekazujemy i czego
w tej sprawie jeszcze **nie potrafimy potwierdzić**, opisuje informacja o przetwarzaniu danych —
przeczytaj ją, zanim wpiszesz tam coś wrażliwego.

**Nie wpisuj w rozmowach z platformą** danych, których nie chcesz nam powierzać: cudzych danych
osobowych, informacji objętych tajemnicą Twojego pracodawcy, dokumentów poufnych.

## §8. Zasady korzystania

Korzystając z platformy, **nie**:

- udostępniaj konta innym osobom ani nie zakładaj kont na cudze dane;
- nie próbuj obchodzić zabezpieczeń, wydobywać cudzych danych ani zaglądać do cudzych paszportów;
- nie wykorzystuj platformy do treści bezprawnych, obraźliwych lub naruszających cudze prawa;
- nie publikuj materiałów z platformy jako własnych ani nie udostępniaj ich dalej w całości —
  materiały edukacyjne są nasze i udostępniamy je Tobie do nauki własnej;
- nie podszywaj się pod potwierdzenie, którego nie otrzymałeś — w szczególności nie zmieniaj
  treści paszportu przed pokazaniem go komuś.

Przy poważnym lub uporczywym naruszeniu możemy zawiesić albo zamknąć konto. Zanim to zrobimy,
napiszemy do Ciebie i wyjaśnimy powód — chyba że naruszenie zagraża danym innych osób i musimy
zadziałać od razu. Zawsze możesz się odwołać, pisząc do nas.

## §9. Twoje dane osobowe

Co zbieramy, po co, jak długo i jakie masz prawa — opisuje **informacja o przetwarzaniu danych**.
Jest osobnym dokumentem i to ona jest tu źródłem; nie powtarzamy jej treści w regulaminie, żeby nie
powstały dwie wersje, które z czasem zaczną się różnić.

**Tam też znajdziesz jedno zobowiązanie, które warto znać zawczasu:** jak odpowiadamy, gdy ktoś —
na przykład pracodawca trzymający Twój paszport w pliku — zapyta nas o Ciebie. Krótko: **nie
potwierdzamy i nie zaprzeczamy niczemu na temat konkretnej osoby.** Szczegóły i powód są w tamtym
dokumencie.

## §10. Konto nieaktywne

Jeśli przestaniesz korzystać z platformy, Twoje konto i dane zostają — nie kasujemy ich po cichu
za Ciebie. Usunąć konto możesz sam w każdej chwili, a co się wtedy dzieje (i co mimo to zostaje),
mówi informacja o przetwarzaniu danych.

## §11. Rezygnacja

**Możesz zrezygnować w dowolnym momencie, bez podawania powodu i bez żadnych konsekwencji** —
usuwając konto albo pisząc do nas. Nie ma okresu wypowiedzenia, nie ma opłat, nie ma zobowiązania
do „dokończenia" czegokolwiek. Zanim usuniesz konto, pobierz paszport, jeśli chcesz go zachować —
usunięcie jest nieodwracalne.

## §12. Zakończenie pilotażu — co się stanie z Twoim kontem

Pilotaż kiedyś się skończy. Zobowiązujemy się do tego:

1. **Uprzedzimy Cię z co najmniej 30-dniowym wyprzedzeniem** — mailem, nie licząc na to, że sam
   zajrzysz.
2. **Damy Ci czas na pobranie paszportu** i tego, co chcesz zachować, zanim cokolwiek zniknie.
3. **Powiemy wprost, który wariant ma miejsce:** czy platforma działa dalej i Twoje konto po prostu
   przechodzi do kolejnej wersji, czy zamykamy usługę.
4. **Jeśli zamykamy usługę** — usuwamy konta i dane uczestników **najpóźniej w ciągu 30 dni** od
   zakończenia, tak samo jak przy usunięciu konta przez Ciebie. To, co zostaje mimo usunięcia
   (zapis zdarzeń, kopie zapasowe), opisuje informacja o przetwarzaniu danych.
5. **Jeśli platforma działa dalej** — nie przenosimy Cię automatycznie na warunki płatne. Jeśli
   kolejna wersja będzie odpłatna, poprosimy o wyraźną zgodę; brak zgody oznacza usunięcie konta
   na zasadach z punktu 4, a nie milczące obciążenie.

## §13. Reklamacje

Jeśli coś nie działa albo uważasz, że postąpiliśmy niewłaściwie — napisz na `kontakt@nordsignal.cc`.
Odpowiadamy najpóźniej w ciągu **14 dni**. Jeśli sprawa wymaga więcej czasu, powiemy Ci o tym przed
upływem tego terminu i podamy nowy termin.

## §14. Zmiany regulaminu

Możemy zmienić ten regulamin — platforma jest w budowie i część zasad doprecyzuje się w praktyce.
**O każdej zmianie poinformujemy Cię zanim zacznie obowiązywać**, a jeśli zmiana jest istotna,
poprosimy o ponowną akceptację. Jeśli nie zaakceptujesz — możesz zrezygnować na zasadach z §11,
bez żadnych konsekwencji.

## §15. Prawo właściwe

Do tej umowy stosuje się **prawo polskie**. Nie ogranicza to praw, które przysługują Ci jako
konsumentowi na mocy bezwzględnie obowiązujących przepisów.

**Wersja:** v0.1 · **data wejścia w życie:** *(uzupełniana przy zapłonie)*

---

# CZĘŚĆ II-B — aparat wewnętrzny (nie publikujemy)

### R-6. Co to znaczy po stronie interfejsu — zamówienie dla działu Engineering

**Wymóg:** akceptacja przy rejestracji musi być **czynnością świadomą i możliwą do wykazania**.
Sama obecność dokumentu pod odnośnikiem nie tworzy umowy — a to na umowie stoi podstawa
przetwarzania z klauzuli.

Zamówienie, w kolejności ważności:

1. **Pole wyboru przy rejestracji, domyślnie puste, wymagane** — z odnośnikami do regulaminu
   **i** do informacji o przetwarzaniu. Nigdy zaznaczone z góry (zgoda domyślna nie jest zgodą,
   a akceptacja domyślna jest słabym dowodem umowy). Bez zaznaczenia rejestracja się nie kończy —
   walidacja **po stronie serwera**, nie tylko w przeglądarce.
2. **Zapis faktu akceptacji przy koncie:** znacznik czasu **i wersja dokumentu**. Bez wersji nie
   umiemy odpowiedzieć na pytanie „na co ta osoba się zgodziła", gdy regulamin się zmieni (§14).
   To jest ta sama klasa wymogu co ślad udzielenia i cofnięcia zgody.
3. **Strona z treścią regulaminu** — mechanizm **już istnieje i jest ten sam** co dla klauzuli:
   dokument w repozytorium jest nośnikiem, strona go **renderuje**. Ten plik ma celowo ten sam
   kształt (CZĘŚĆ I / CZĘŚĆ II), więc `wytnijCzescI` i `podzielNaBloki` biorą go bez zmian —
   sprawdziłam uruchomieniem, nie założeniem (R-7 punkt 1).
4. **Ponowna akceptacja przy istotnej zmianie** (§14) — potrzebna dopiero przy pierwszej takiej
   zmianie. **Próg, nie zadanie na teraz**; zapisuję, żeby nie wypadło.

**Rozmiar.** Punkty 1–3 to jedna zmiana w formularzu rejestracji, jedna kolumna (albo dwie:
znacznik czasu + wersja) w schemacie oraz strona bliźniacza do `/prywatnosc` — z tego **punkt 3
jest niemal darmowy**, bo cały mechanizm renderowania i cięcia jest napisany. Realny koszt siedzi
w punkcie 2: to **zmiana schematu bazy**, czyli migracja na produkcji — domena Ethana, nie Jacka.
**Nie wyceniam tego w dniach** i nie udaję, że wiem, ile zajmie migracja przy ich kolejce.

**Czego NIE zamawiam:** osobnego ekranu „zaakceptuj zanim wejdziesz" dla kont już istniejących.
Dziś kont uczestników jest zero (wszystkie należą do zespołu), więc problem migracji zgód nie
istnieje — ale **powstanie w chwili pierwszej rejestracji**, więc akceptacja musi być gotowa
**przed** nią, nie po. To jest kolejność, nie preferencja.

### R-7. Czego nie zweryfikowałam

1. **Że ten dokument przechodzi cięcie — to akurat zweryfikowałam.** Uruchomiłam prawdziwe
   `wytnijCzescI` i `podzielNaBloki` na tym pliku (odczyt 2026-08-14): cięcie przechodzi, CZĘŚĆ I
   wychodzi bez ani jednego zakazanego wzorca (imiona ról, ścieżki plików, oznaczenia sekcji
   wewnętrznych). Kontrola dodatnia zielona.
2. **Oceny prawnej całości.** Nie jestem prawnikiem i to nie jest dokument zweryfikowany prawnie.
   Napisałam go z pokrycia faktycznego: co produkt robi, co obiecuje klauzula, co mówi decyzja
   o rozdziale wagi oceny. Pozycje wymagające prawnika: kolizja podstaw (R-3), pouczenie
   o odstąpieniu przy usłudze nieodpłatnej (R-3), tożsamość administratora przy braku spółki
   (pozycja L-a rejestru dla prawnika — dotyczy tego dokumentu tak samo jak klauzuli).
3. **Stanu przełączników na produkcji.** W kodzie **wszystkie** flagi mają wartość domyślną
   `false` (zmierzone, 2026-08-14), ale stan rzeczywisty ustawiają zmienne środowiskowe u dostawcy
   hostingu, których **nie odczytywałam**. Dlatego §2 i §5 mówią „część funkcji włączamy
   stopniowo" zamiast wyliczać, co działa — **wyliczenie byłoby twierdzeniem o stanie produkcji
   bez dowodu ze źródła autorytatywnego**. Kto będzie zapalał regulamin, musi zestawić §4 z realnym
   stanem przełączników w tamtej chwili.
4. **Czy warstwa ludzka kredencjału jest włączona.** Zmierzyłam, że **istnieje w kodzie** (trasy
   kolejki recenzji, interfejs decyzji, plakietka „Oceniał człowiek", ADR-011) — to obala
   przesłankę ze zlecenia, że „nie jest zaimplementowana". Czy jest **włączona na produkcji**,
   nie wiem (punkt 3). §6 jest napisany tak, że pozostaje prawdziwy w obu przypadkach: opisuje
   regułę i mówi, że bez zatwierdzenia człowieka praca **nie dostaje** oznaczenia.
5. **Retencji po zakończeniu pilotażu.** §12 obiecuje usunięcie w 30 dni. To zobowiązanie
   **produktowe, nie zmierzone** — nie sprawdzałam, czy istnieje procedura masowego usunięcia
   kont. Przy pięciu kontach wystarczy pięć razy ta sama ścieżka co przy usunięciu własnego konta,
   **ale ta ścieżka jest dziś za zgaszonym przełącznikiem** (warunek W-1 klauzuli). §12 jest więc
   obietnicą, która wymaga tego samego warunku co klauzula — dopisuję to do warunków zapłonu.

### R-8. Self-critique — senior product lead po nieudanym launchu

1. **„Napisałaś regulamin pod klauzulę, a miałaś napisać go pod produkt."** — Zarzut celny wobec
   pierwszego szkicu, w którym szłam pozycja po pozycji za tabelą podstaw. Przeorganizowałam
   CZĘŚĆ I wokół tego, co uczestnik chce wiedzieć (co dostaję, czego nie, jak mnie oceniacie, jak
   wyjść), a zgodność z klauzulą sprawdziłam **po fakcie**, tabelą w R-2. Gdyby wyszła
   niezgodność, miała trafić do R-3 — i jedna trafiła.
2. **„§6 to marketing USP przebrany za umowę."** — Częściowo słuszne i najgroźniejsze miejsce
   dokumentu. Dlatego §6 kończy się zdaniem, którego marketing by nie napisał: człowiekiem
   potwierdzającym jest twórca platformy, nie niezależny ekspert, i uczestnik ma to mówić dalej.
   Reguła bez tego zdania byłaby obietnicą niezależności, której nie mamy.
3. **„Obiecujesz w §12 usunięcie w 30 dni ścieżką, która jest wyłączona."** — Słuszne w całości.
   Nie usunęłam obietnicy, bo bez niej §12 nie odpowiada na pytanie, które przy pięciu osobach
   padnie na pewno. Zamiast tego **nazwałam zależność** (R-7 punkt 5) i związałam zapłon regulaminu
   z tym samym warunkiem co zapłon klauzuli. Obietnica z jawnym warunkiem to dług; obietnica bez
   niego to wada.
4. **„Trzy dokumenty i żadnego strażnika między nimi."** — Słuszne. Regulamin **nie** dokłada
   trzeciej kopii zasady dla pracodawcy (R-5) i to jest jedyna rzecz, którą tu naprawdę zrobiłam
   dla spójności. Strażnika dla istniejącej pary nadal nie ma i nie udaję, że powstał.
5. **„Piszesz umowę dla konsumenta, nie będąc prawnikiem — dokładnie ten zarzut postawiono
   autorowi klauzuli."** — Prawda i nie mam na to odpowiedzi lepszej niż jego: to jest
   **przygotowanie materiału dla prawnika**, wyprowadzone z produktu i z rejestrów, a nie szablon
   z sieci. Lista rzeczy do sprawdzenia jest w R-7 i jest krótka, bo dokument jest krótki.

**Szóste, którego nikt by mi nie wytknął.** Zlecenie podało mi trzy fakty o stanie produktu
(„drabina tylko dla Data Science", „warstwa ludzka niezaimplementowana", „pilotaż jest pilotażem")
i kusiło, żeby przepisać je do §5 jako gotowe zdania. Sprawdziłam wszystkie trzy. **Drugi okazał
się nieprawdziwy** — warstwa ludzka istnieje w kodzie razem z własnym ADR. Gdybym go przepisała,
regulamin **umniejszałby** to, co mamy, w dokumencie, który uczestnik podpisuje. Przesłanka podana
przez zleceniodawcę jest wygodna dokładnie tak samo jak własna.
