# Zasada odpowiedzi dla pracodawcy — SkillBridge · DRAFT v0.1

**Wersja:** v0.1 · 2026-08-14 · **Autor:** Sophia (PO nordsignal) · **Zadanie:** B2 planu wpuszczenia
pierwszego uczestnika (warunek **W-5** klauzuli art. 13) · **Zleceniodawca:** Oliver (COO) ·
**Sign-off:** Darek (CEO) — wymagany, akt wychodzący na zewnątrz (CLAUDE.md §4).

> **STATUS: PROJEKT. NIE OBOWIĄZUJE. NIE POKAZUJEMY GO NIKOMU.**
> Wchodzi w życie z podpisem Darka, nie ze scaleniem. Warunki — sekcja S-2.

> **Ten dokument ma dwie części i to rozróżnienie jest wiążące.**
> **CZĘŚĆ I** to **treść pokazywana pracodawcy** — po sign-offie renderuje ją strona, na którą
> trafia ktoś z nieczynnym odnośnikiem do paszportu. **CZĘŚĆ II** (sekcje S-1…S-6) to **aparat
> wewnętrzny**: procedura dla człowieka, który odpowiada, uzasadnienia i luki. Część II **nigdy**
> nie jest publikowana.

---

## CZĘŚĆ II-A — co trzeba wiedzieć, zanim się to przeczyta

### S-1. Po co ten dokument istnieje i czego NIE rozstrzyga

Sekcja 9 klauzuli informacyjnej obiecuje studentowi konkretne zachowanie wobec pracodawcy:
*„nikomu — także pracodawcy, który ma Twój plik PDF — nie potwierdzimy ani nie zaprzeczymy, że
miałeś u nas konto"*. To jest **obietnica operacyjna**: zobowiązuje żywego człowieka do konkretnej
odpowiedzi w konkretnej rozmowie. Do 2026-08-14 nie miała nośnika — zmierzone:

```
$ git log --all --oneline -- "docs/product/zasada-odpowiedzi-dla-pracodawcy.md"
(brak wyjścia)   kod wyjścia: 0
$ find /Users/dariuszgradzik/Claude_Projekty/nordsignal-operating-system \
    -name "zasada-odpowiedzi-dla-pracodawcy*" -not -path "*/node_modules/*"
(brak wyjścia)
```
(odczyt 2026-08-14 17:09 CEST, oba repozytoria, wszystkie gałęzie)

**Ten dokument jest nośnikiem tej jednej reguły.** Nie jest polityką prywatności (nośnik:
klauzula art. 13), nie jest rejestrem tego, co przeżywa usunięcie konta (nośnik:
`docs/data/art17-kompletnosc-usuniecia.md`), nie ustanawia reguły o podpisie człowieka pod
kredencjałem (nośnik: **ADR-008**). Woła je — nie powtarza.

**Czego świadomie NIE rozstrzyga:** odpowiedzi na **żądanie organu lub sądu** (to nie jest pytanie
pracodawcy i idzie inną ścieżką — klauzula, sekcja 5) ani obsługi **wniosku samego studenta**
o jego dane (art. 15 — nośnikiem jest klauzula, sekcja 8). Kto pyta *o kogoś innego*, jest
pracodawcą w rozumieniu tego dokumentu, nawet jeśli nazywa się inaczej: rekruter, uczelnia,
firma weryfikująca dyplomy, „znajomy studenta".

### S-2. Warunki wejścia w życie

| # | Warunek | Właściciel |
|---|---|---|
| **S-W1** | **Sign-off Darka** pod CZĘŚCIĄ I i CZĘŚCIĄ II. Bez podpisu zasada nie obowiązuje, a sekcja 9 klauzuli zostaje obietnicą bez pokrycia | Darek |
| **S-W2** | **Strona pod nieczynnym odnośnikiem żyje** — nie domyślny 404 (pozycja S-5) | Jack (kod), Ethan (scalenie) |
| **S-W3** | **Przegląd RODO** — potwierdzenie, że odmowa uniformna jest właściwą podstawą, i przekwalifikowanie zakazu dopasowywania numeru dokumentu z decyzji produktowej na wymóg zgodności (pozycja **L-8** rejestru art. 17) | Ryan (CRCO) |
| **S-W4** | **Drugi nośnik nazwany i spięty strażnikiem** — sekcja 9 klauzuli powtarza tę regułę wobec studenta i musi to robić dalej (art. 13); wymaga progu i testu, który pada, gdy oba nośniki się rozjadą (pozycja S-4) | Ryan (klucze w klauzuli), Ethan (strażnik) |

**S-W3 jest twardy z powodu, który wyszedł przy pisaniu tego dokumentu.** Klauzula (tabela W-5)
i rejestr art. 17 (pozycja L-8, wiersz 119) **cytują jako wykonany** przegląd
`scratchpad/przeglad-zasada-pracodawcy-ryan.md`. Ten plik nie istnieje — zmierzone:

```
$ git log --all --oneline -- "scratchpad/przeglad-zasada-pracodawcy-ryan.md"
(brak wyjścia)   kod wyjścia: 0
$ ls scratchpad/przeglad-zasada-pracodawcy-ryan.md
ls: scratchpad/przeglad-zasada-pracodawcy-ryan.md: No such file or directory
```
(odczyt 2026-08-14 17:11 CEST, repozytorium produktu, wszystkie gałęzie)

Nie znam więc treści **poprawki R-2**, której W-5 wymaga w tekście strony. **Nie zgaduję jej** —
zapisuję lukę i oddaję ją właścicielowi przeglądu. To ta sama klasa wady co ta, którą ten dokument
naprawia: artefakt przywołany jako istniejący dowód, którego nie ma.

### S-3. Dlaczego odpowiedź jest jedna, a nie cztery

Nieczynny odnośnik ma **cztery różne przyczyny**: student wyłączył udostępnianie, odnośnik jest
nieaktualny (wyłączenie **rotuje token**, więc stary link nie wraca), konto zostało usunięte, albo
dokument nigdy u nas nie powstał. Gdybyśmy odpowiadali per przypadek, sama **różnica** w odpowiedzi
niosłaby informację o osobie — w tym dokładnie tę, którą usunięcie konta miało wymazać. Odmowa
różnicująca („tego konta już nie ma") jest potwierdzeniem, że konto **było**.

Dlatego reguła brzmi: **jedna odpowiedź, bez sprawdzania, o który przypadek chodzi.** Nie
sprawdzamy nie dlatego, że nam się nie chce — sprawdzenie samo w sobie byłoby przetwarzaniem
danych osoby, która nas o nie nie prosiła, i wytworzyłoby wiedzę, której potem nie da się
„odwiedzieć".

**Maszyna już dziś odpowiada jednakowo** i to jest jedyna warstwa tej zasady, która jest wdrożona.
Trasa publicznego paszportu ma jeden warunek dla wszystkich czterech przypadków — zmierzone
(odczyt 2026-08-14, repozytorium produktu, `main`):

```
$ grep -n "shareToken" "src/app/passport/[id]/page.tsx"
36:  where: and(eq(passports.shareToken, id), eq(passports.publicEnabled, true)),
63:  where: and(eq(passports.shareToken, id), eq(passports.publicEnabled, true)),
$ grep -n "notFound()" "src/app/passport/[id]/page.tsx"
65:  if (!passport) notFound();
```

Brakuje warstwy ludzkiej (S-6) i tekstu, który ten sam komunikat wypowie po ludzku (CZĘŚĆ I).

### S-4. Jeden nośnik — i świadomy drugi, nazwany

Nośnikiem tej reguły jest **ten dokument**. Wołają go, nie powtarzają: rejestr art. 17
(pozycja L-8), tabela Z-3 klauzuli, strona pod nieczynnym odnośnikiem (renderuje CZĘŚĆ I — nie
niesie przepisanej kopii).

**Świadomy drugi nośnik — nazwany, nie ukryty.** Sekcja 9 klauzuli **musi** wypowiedzieć tę regułę
wobec studenta własnymi słowami: art. 13 nie pozwala odesłać go do dokumentu wewnętrznego,
a obietnica wobec studenta jest częścią informacji o przetwarzaniu. Dwa nośniki tej samej reguły
to dokładnie ten kształt, o który rozszerzono minimum jakości (CLAUDE.md §8 v1.17), więc:

- **próg konsolidacji:** przy pierwszej zmianie brzmienia odpowiedzi w którymkolwiek nośniku —
  zmiana jest niedomknięta, dopóki nie trafi do obu;
- **strażnik:** test kontraktowy porównujący **treść normatywną** obu nośników. Kształt taki sam
  jak u strażnika okresów przechowywania (`tests/unit/rodo/okresy-retencji.contract.test.ts`):
  klucze maszynowe w komentarzach HTML po obu stronach, porównanie po kluczach, mutacja
  czerwieniąca **osobno dla każdego z czterech przypadków** i osobno dla zdania o niesprawdzaniu.
  Strażnik sprawdzający samo istnienie akapitu przepuściłby zmianę „nie potwierdzimy" →
  „potwierdzimy tylko pracodawcy z podpisem studenta".

**Strażnik nie istnieje w chwili pisania i nie udaję, że istnieje.** Wykonawca: Ethan (dział
Engineering), próg: **przed zapłonem klauzuli** (jest warunkiem S-W4). To dowód wykonalny jednym
testem bez bazy — więc etykieta „niepotwierdzony" tu **nie przysługuje** (precedens: sprostowanie
Z-3 klauzuli, warunek W-B Leo przy #290).

### S-5. Trzy rzeczy, których w CZĘŚCI I świadomie NIE MA

1. **Nie ma zaproszenia „napisz do nas, sprawdzimy".** Byłoby obietnicą sprzeczną z samą zasadą:
   nie ma czego sprawdzać, bo odpowiedź nie zależy od wyniku sprawdzenia. Adres kontaktowy pada,
   ale przy jednym pytaniu, na które **umiemy** odpowiedzieć — o samą zasadę.
2. **Nie ma słowa „usunięty", „nieaktualny" ani „wygasł".** Każde z nich różnicuje przypadek.
   Strona mówi „ten odnośnik nie udostępnia dokumentu", bo to zdanie jest prawdziwe we wszystkich
   czterech przypadkach naraz.
3. **Nie ma nazwiska, celu zawodowego ani numeru dokumentu** — także w tytule zakładki i w opisie
   dla wyszukiwarek. Strona nieczynnego odnośnika nie może potwierdzać niczego metadanymi.

---

# CZĘŚĆ I — treść dla osoby z nieczynnym odnośnikiem

> *Poniższy tekst jest tym, co zobaczy człowiek — najczęściej pracodawca lub rekruter, który
> dostał plik i chce sprawdzić, czy jest prawdziwy. Bez żargonu, bez oskarżania go o cokolwiek.*

---

## Ten odnośnik nie udostępnia dokumentu

Odnośnik, w który kliknąłeś, nie udostępnia paszportu kompetencji. Nie umiemy powiedzieć, dlaczego
— i **celowo tego nie sprawdzamy**.

**Odpowiadamy tak samo w każdej sytuacji.** Nie potwierdzamy i nie zaprzeczamy, że konkretna osoba
ma albo miała u nas konto, że ukończyła moduł, zdała egzamin czy uzyskała jakikolwiek wynik.
Odpowiedź jest identyczna niezależnie od tego, czy właściciel dokumentu wyłączył udostępnianie,
czy odnośnik pochodzi sprzed zmiany, czy dokument nigdy u nas nie powstał.

To nie jest wykręt. **Sama różnica w odpowiedzi mówiłaby o tej osobie dokładnie to, czego nie mamy
prawa powiedzieć** — a w części sytuacji to, o czym na jej żądanie mieliśmy zapomnieć. Odpowiedź,
która zależy od przypadku, nie jest odmową; jest potwierdzeniem wypowiedzianym okrężnie.

### Co w takim razie jest potwierdzeniem

**Jedynym potwierdzeniem, jakie wystawiamy, jest działający odnośnik, który udostępnia właściciel
dokumentu.** Nikt inny nie może go dla Ciebie włączyć — także my.

Jeśli zależy Ci na weryfikacji, **poproś tę osobę o aktualny odnośnik**. Włączenie i wyłączenie
udostępniania jest po jej stronie i zajmuje chwilę. Odnośnik, który otwiera dokument, jest
świadectwem aktualnym; my nie musimy niczego do niego dopowiadać.

**Plik, który masz — na przykład paszport w pliku PDF — jest wydrukiem, nie dowodem.** Powstał na
urządzeniu właściciela i od tej chwili jest poza naszym zasięgiem: nie widzimy go, nie umiemy go
wycofać i nie zestawiamy go z niczym, co u nas leży. Numer widniejący na wydruku nie jest kluczem,
który dla kogokolwiek sprawdzimy.

### O co warto zapytać, a o co nie ma sensu

| Pytanie | Nasza odpowiedź |
|---|---|
| Czy ta osoba ma u Was konto? | Nie potwierdzamy i nie zaprzeczamy — w żadną stronę |
| Czy ukończyła moduł, zdała egzamin, jaki miała wynik? | Nie udostępniamy wyników nauki nikomu poza samą osobą uczącą się |
| Czy ten plik jest prawdziwy? Możecie go zestawić z numerem? | Nie zestawiamy wydruków z naszymi danymi. Poproś o działający odnośnik |
| Czy konto zostało usunięte? | Nie potwierdzamy i nie zaprzeczamy — także tego |
| Na jakiej zasadzie w ogóle to działa? | Na to odpowiadamy chętnie: `kontakt@nordsignal.cc` |

### Dlaczego wyniki nauki nie wychodzą na zewnątrz

Większość tego, co platforma o kimś „wie", to **ocena robiona po to, żeby uczyć** — jak poszła
powtórka, ile podpowiedzi ktoś odsłonił, co mu się nie udało za pierwszym razem. Ta ocena należy
do procesu nauki i nie opuszcza platformy. Wydanie jej pracodawcy zamieniłoby narzędzie do nauki
w narzędzie oceny pracownika, a to jest coś, czego uczącym się obiecaliśmy nie robić.

**Dowodem kompetencji jest wyłącznie to, co dana osoba sama publikuje jako dokument** — i tylko ta
warstwa przechodzi przez człowieka, zanim stanie się dowodem. Pracodawca pytający „jaki miała
wynik" pyta więc zwykle o rzecz, której nie wolno nam wydać nawet wtedy, gdy pyta w dobrej wierze
i gdy odpowiedź byłaby dla tej osoby korzystna.

---

# CZĘŚĆ II-B — aparat wewnętrzny (nie publikujemy)

### S-6. Kto odpowiada i jak — procedura dla człowieka

**Odpowiada wyłącznie Darek.** Nie ma dziś drugiego człowieka w firmie i to nie jest szczegół
organizacyjny: odpowiedź na pytanie o konkretną osobę jest czynnością administratora danych.

**Wiążące dla każdego agenta.** Agent, do którego trafi takie pytanie — kanałem produktowym,
mailem, przez formularz — **nie odpowiada, nie sprawdza i nie zagląda do bazy**. Przekazuje
pytanie Darkowi w oryginalnym brzmieniu i na tym kończy udział. **Zajrzenie do bazy „tylko żeby
wiedzieć, co odpowiedzieć" jest samo w sobie naruszeniem tej zasady** — odpowiedź nie zależy od
tego, co tam jest, więc sprawdzenie nie służy odpowiedzi, tylko wytwarza wiedzę.

**Odpowiedź gotowa do wysłania** (nie wymaga sprawdzania czegokolwiek):

> Dzień dobry,
>
> nie potwierdzamy i nie zaprzeczamy, że konkretna osoba korzysta lub korzystała ze SkillBridge —
> odpowiadamy tak samo w każdej sytuacji i nie sprawdzamy, o którą z nich chodzi. Nie jest to
> stanowisko wobec Państwa ani wobec tej osoby; to reguła, którą stosujemy bez wyjątku, bo
> odpowiedź zależna od sytuacji sama ujawniałaby dane.
>
> Jedynym potwierdzeniem, jakie wystawiamy, jest działający odnośnik do paszportu kompetencji,
> który udostępnia właściciel dokumentu. Prosimy poprosić o niego bezpośrednio tę osobę —
> włączenie udostępniania jest po jej stronie. Pliku PDF ani numeru na nim nie zestawiamy z naszymi
> danymi.
>
> Chętnie odpowiemy na pytania o samą zasadę i o to, co paszport potwierdza.

**Gdy rozmówca naciska** (typowe: „to tylko formalność", „ona sama nas do Was odesłała", „mamy jej
zgodę na piśmie") — odpowiedź się **nie zmienia**. Zgoda przekazana przez osobę trzecią nie jest
zgodą: nie umiemy zweryfikować ani jej autentyczności, ani tego, czy nie została wycofana. Właściwa
droga jest jedna i jest łatwiejsza dla wszystkich — **działający odnośnik od właściciela**. Jeśli
osoba naprawdę chce, żebyśmy coś potwierdzili, niech napisze do nas sama; wtedy jest to wniosek
o własne dane i idzie ścieżką z klauzuli, a nie tą.

**Czego nie robimy nigdy** — lista zamknięta, każda pozycja z powodem:

| # | Nigdy | Dlaczego |
|---|---|---|
| **N-1** | Nie potwierdzamy i nie zaprzeczamy istnieniu konta, jego usunięciu ani czemukolwiek o konkretnej osobie | Różnica w odpowiedzi jest odpowiedzią. Dotyczy też milczenia wybiórczego: odpisanie jednemu, a zignorowanie drugiego, też różnicuje |
| **N-2** | **Nie zestawiamy numeru dokumentu z wydruku (`SB-2026-XXXXXXXX`) z niczym po naszej stronie** | Prefiks numeru jest identyfikatorem paszportu i występuje w śladzie zdarzeń. Zestawienie **ponownie przypisuje** dane, które usunięcie konta miało uczynić bezosobowymi — pozycja L-8 rejestru art. 17. Ochroną jest dziś ten zakaz, a nie własność danych: technicznie zestawienie jest wykonalne |
| **N-3** | Nie przywracamy, nie odtwarzamy i nie generujemy odnośnika na prośbę osoby trzeciej | Udostępnianie jest zgodą właściciela. Przywrócenie linku „bo pracodawca prosi" jest udostępnieniem danych bez podstawy |
| **N-4** | Nie wysyłamy kopii paszportu ani wyciągu z niego pracodawcy — w żadnym formacie | To samo co N-3, tylko okrężną drogą |
| **N-5** | Nie wydajemy ocen z nauki: postępów, wyników powtórek, liczby podpowiedzi, prób, sygnałów ryzyka z przeglądu pracy | Ocena formująca z założenia nie wychodzi na zewnątrz jako dowód (ADR-008). Wydana pracodawcy zmienia charakter całej platformy |
| **N-6** | Nie odpowiadamy na pytania o rzetelność osoby („czy ściągała", „czy sam to zrobił") | To najcięższa klasa: ocena z pętli uczenia wypowiedziana wobec rynku pracy, o skutkach dla człowieka, bez jego udziału i bez możliwości odwołania |
| **N-7** | Nie różnicujemy odpowiedzi ze względu na to, kto pyta — także gdy pyta uczelnia albo ktoś znajomy | Wyjątek dla „zaufanego" pytającego kasuje regułę, a przy naborze poza kręgiem znajomych nie ma kryterium, kto jest zaufany |

**Ślad.** Każde takie pytanie i wysłaną odpowiedź Darek odnotowuje: data, kanał, o co pytano
(bez danych osoby, której dotyczyło), co odpowiedziano. Nie po to, żeby budować rejestr pytań —
po to, żeby przy pierwszym audycie dało się **wykazać**, że reguła działa, a nie tylko że jest
zapisana. Nośnik śladu wskazuje Ryan przy przeglądzie S-W3; **nie ustanawiam go tutaj**, bo rejestr
zawierający dane pytającego sam wymaga podstawy.

### S-7. Dlaczego to musi działać przy 3–5 uczestnikach, nie przy jednym

Wcześniejsze przyjęcia ryzyka w pakiecie RODO były wyceniane **„na jednego uczestnika znanego
administratorowi"**. Ta zasada nie ma takiego wariantu i nie może mieć:

- **Odpowiedź nie może zależeć od tego, czy Darek kojarzy osobę.** Przy jednym uczestniku „wiem,
  o kogo chodzi" wygląda niewinnie; przy pięciu jest już sprawdzaniem, a kryterium „kojarzę"
  różnicuje odpowiedź dokładnie tak, jak zabrania tego N-1.
- **Wydruków krąży tyle, ilu uczestników** — a numer na wydruku jest kluczem do śladu zdarzeń
  (N-2). Przy pięciu paszportach zakaz zestawiania przestaje być hipotetyczny.
- **Rośnie szansa, że pierwsze pytanie przyjdzie w najgorszym momencie** — w trakcie rekrutacji
  uczestnika, z presją czasu i z prośbą „na już". Dlatego CZĘŚĆ II niesie gotową odpowiedź do
  wysłania: reguła, którą trzeba w tym momencie wymyślać, przegrywa z uprzejmością.
- **Zasada nie skaluje się dalej bez decyzji.** Przy uczelni jako stronie umowy pojawia się
  pytanie, kto jest administratorem i czy uczelnia ma tytuł do informacji o swoim studencie —
  to zmienia konstrukcję i **nie jest tu rozstrzygnięte** (próg: pierwsza umowa z uczelnią).

### S-8. Co zostaje do zrobienia po stronie kodu — zamówienie dla działu Engineering

**Stan dziś, zmierzony** (odczyt 2026-08-14, repozytorium produktu, `main`): trasa publicznego
paszportu woła `notFound()`, a **żaden `not-found.tsx` jej nie obsługuje** —

```
$ find src/app -name "not-found.tsx"
src/app/(dashboard)/not-found.tsx
$ ls src/app/not-found.tsx
ls: src/app/not-found.tsx: No such file or directory
```

Trasa `passport/[id]` leży poza grupą `(dashboard)`, więc obowiązuje **wbudowany 404 Next.js** —
angielskie „This page could not be found." (zmierzone w `node_modules/next/dist/client/components/`,
2026-08-14). Pracodawca dostaje dziś komunikat w obcym języku, który nie mówi nic — i pisze do nas
z pytaniem, na które nie mamy odpowiedzi. **To jest cała wada.**

**Zamówienie — jeden plik, mechanizm już istnieje** (wzorzec #310: strona **renderuje** nośnik,
nie kopiuje go):

1. **`src/app/passport/[id]/not-found.tsx`** — czyta CZĘŚĆ I tego dokumentu i renderuje ją
   istniejącymi elementami: `wytnijCzescI` + `podzielNaBloki` (`src/lib/legal/klauzula-art13.ts`,
   oba **już wyeksportowane i generyczne** — biorą markdown, nie ścieżkę) oraz komponent
   `KlauzulaMarkdown`. Nowego kodu: ładowarka ze ścieżką do tego pliku (kilka linii, wzorem
   `wczytajKlauzuleDlaStudenta`) + sama strona. **Fail-closed jak w klauzuli:** wyjątek przy
   nierozpoznanym kształcie dokumentu ma się propagować — lepiej błąd niż wydrukowanie CZĘŚCI II
   pracodawcy.
2. **Odciski aparatu wewnętrznego działają na ten dokument bez zmian — sprawdzone mutacją, nie
   deklaracją.** CZĘŚĆ I jest napisana pod nie: zero imion ról, zero ścieżek do plików, zero
   oznaczeń `Z-`/`W-`/`L-`. Uruchomiłam na tym pliku **prawdziwe** `wytnijCzescI` (odczyt
   2026-08-14, `node_modules/.bin/tsx`): cięcie przechodzi, CZĘŚĆ I ma 2997 znaków, tabela parsuje
   się jako 5 wierszy × 2 kolumny. Trzy mutacje wstawione **do CZĘŚCI I** i ich wynik:

   | Mutacja | Wynik |
   |---|---|
   | wstawione zdanie z imieniem roli („Zasadę tę ustalił Ryan…") | **wyjątek** — „znalazłem aparat wewnętrzny" |
   | wstawiona ścieżka do pliku wewnętrznego (`docs/…`) | **wyjątek** |
   | nota dla recenzenta **złamana w środku zdania** (wariant, który obszedł kiedyś obie warstwy) | **wyjątek** |
   | kontrola dodatnia: plik bez mutacji | **przechodzi** — brak fałszywego alarmu |

   Mutacje wykonane na kopii w pamięci, plik nietknięty. **To dowód na dziś, nie strażnik** —
   strażnikiem będzie dopiero test w repozytorium (punkt 1), bo mój przebieg nikogo nie zatrzyma
   przy następnej zmianie tekstu.

   Uwaga dla wykonawcy: komunikat błędu jest zaszyty jako „[klauzula art. 13]" i wskazuje ścieżkę
   klauzuli. Przy współdzieleniu mechanizmu warto, żeby niósł nazwę dokumentu, którego dotyczy —
   inaczej awaria tej strony będzie diagnozowana w cudzym pliku.
3. **Metadane strony bez treści osobowej** — tytuł zakładki i opis identyczne dla wszystkich
   przypadków, `noindex, nofollow` jak na trasie paszportu. Dziś `generateMetadata` zwraca tytuł
   „Paszport nie znaleziony"; jest jednakowy dla wszystkich czterech przypadków (sprawdzone), więc
   **nie różnicuje** — ale słowo „nie znaleziony" warto zestroić z brzmieniem strony.
4. **Flaga.** Proponuję za flagą domyślnie zgaszoną (wzorem `privacyNoticeArt13`): treść wychodzi
   na zewnątrz i wymaga podpisu, a zgaszona flaga = stan dzisiejszy. Decyzja o kształcie bramki
   należy do Ethana — **zapala ją dopiero sign-off Darka**, nie scalenie.

**Czego NIE zamawiam:** osobnej trasy pod stałym adresem. Pracodawca trafia tu z nieczynnego
odnośnika, więc strona „nie znaleziono" jest właściwym miejscem. Gdyby kiedyś potrzebny był stały
adres, renderuje się **tę samą CZĘŚĆ I** drugim plikiem strony — nośnik zostaje jeden.

### S-9. Czego nie zweryfikowałam

1. **Treści poprawki R-2** — przegląd, który ją nazywa, nie istnieje (S-2). CZĘŚĆ I jest napisana
   bez niej i może jej wymagać.
2. **Czy odmowa uniformna jest właściwą konstrukcją prawną** — to ocena prawna, nie produktowa.
   Znam jej uzasadnienie celowościowe, nie znam podstawy, na którą powołalibyśmy się wobec organu.
   Właściciel: Ryan, dalej: prawnik (rejestr Z-5 klauzuli).
3. **Czy ślad z sekcji S-6 wolno prowadzić i w jakim kształcie** — rejestr pytań zawiera dane
   pytającego. Nie ustanawiam go; wskazuję potrzebę.
4. **Zachowania kanałów innych niż nieczynny odnośnik** — nie sprawdziłam, czy formularz kontaktowy
   albo skrzynka `kontakt@` mają dziś jakąkolwiek automatyczną odpowiedź, która mogłaby coś
   potwierdzić. Przy 3–5 uczestnikach to realna droga pierwszego pytania.
5. **Czy wbudowany 404 nie wycieka niczego poza językiem** — zmierzyłam brak własnej strony i tekst
   wbudowany, nie uruchamiałam trasy w przeglądarce (główny katalog produktu jest zajęty przez inne
   sesje; nie wchodziłam w niego operacjami zapisu).

### S-10. Self-critique — senior product lead po nieudanym launchu

1. **„Napisałaś regułę, której nikt nie wykona, bo nie wie, że istnieje."** — Słuszne wobec wersji
   bez S-6. Dlatego procedura jest gotową odpowiedzią do wklejenia, a nie zasadą do interpretacji,
   i dlatego zakaz obejmuje **agentów** wprost: najbardziej prawdopodobnym pierwszym odbiorcą
   pytania nie jest Darek, tylko ktoś z zespołu.
2. **„Twoja CZĘŚĆ I brzmi jak odmowa i pracodawca odbierze ją jako ukrywanie czegoś."** —
   Częściowo słuszne i nie da się tego znieść do zera. Złagodzone strukturalnie: strona mówi
   **co potwierdzamy**, zanim powie, czego nie; daje drogę wyjścia (poproś o odnośnik) i tłumaczy
   powód bez moralizowania. Nie użyłam ani razu formy oskarżycielskiej.
3. **„Zbudowałaś drugi nośnik i nazwałaś to renderowaniem."** — Zarzut trafia w klauzulę, nie
   w stronę. Strona renderuje; klauzula **powtarza** i musi powtarzać. Dlatego S-4 nazywa to
   świadomym drugim nośnikiem, z progiem i strażnikiem — i mówi wprost, że strażnika **nie ma**.
4. **„Wyceniłaś to na jeden plik, a to zmiana zachowania produktu wobec osoby trzeciej."** —
   Słuszne. Dlatego S-8 punkt 4 nie zostawia decyzji o zapłonie mnie ani wykonawcy: strona wchodzi
   z podpisem Darka, a nie ze scaleniem.
5. **„Piszesz zasadę dla pracodawcy, a nie zapytałaś ani jednego pracodawcy."** — Prawda.
   To dokument napisany z pozycji zobowiązania wobec studenta, nie z discovery. Ryzyko: brzmienie
   może być odbierane gorzej, niż zakładam. Próg weryfikacji: **pierwsze realne pytanie** —
   odpowiedź i reakcja rozmówcy wracają tutaj jako poprawka, nie jako anegdota.

**Szóste, którego nikt by mi nie wytknął.** Pisząc S-8, przez chwilę miałam gotowe zdanie „strona
istnieje, brakuje tylko treści" — bo tak wynikało z opisu zadania, które dostałam. Sprawdziłam
dopiero przy trzecim czytaniu i **strony nie ma wcale**; wbudowany 404 jest angielski. Gdybym tego
nie zmierzyła, zamówienie dla działu Engineering brzmiałoby „podmień tekst" i wróciłoby jako
nieporozumienie. Przesłanka wygodna dla autora to ta, która skraca jego własne zadanie.
