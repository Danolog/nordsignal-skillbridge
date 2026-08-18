# Rejestr żądań usunięcia danych (art. 17 RODO) — SkillBridge

**Wersja:** v0.2 · 2026-08-15 · **Owner:** Ryan (CRCO nordsignal) → Wendy (Legal) od Fazy 3
**Operator rejestru:** Darek (do zatrudnienia operatora jakości)
**Status:** **założony, WSTRZYMANY do utworzenia wartości dosalającej** (§2a) — pierwszy wiersz
wolno wpisać dopiero po jej powstaniu

**Changelog v0.1 → v0.2 (2026-08-15) — przegląd Leo przy #324.** Skrót adresu **dosalany**
(`HMAC-SHA-256` zamiast gołego `SHA-256`); nowa sekcja **2a** z sprostowaniem jawnym mojego zdania
z v0.1, odrzuconymi wariantami i trzema własnościami wartości dosalającej. Powód: repozytorium jest
**publiczne**, a niesolony skrót **potwierdza hipotezę** „czy X brał udział" — ta sama klasa wady,
którą sam opisałem jako dług A-3.

> **JEDYNY NOŚNIK dowodu, że żądanie usunięcia zostało wykonane.** Klauzula art. 13 (sekcja 9)
> obiecuje uczestnikowi, że po odtworzeniu systemu z kopii zapasowej **ponowimy jego usunięcie**.
> Ten plik jest jedynym miejscem, z którego da się to zrobić i udowodnić.

---

## 1. Po co to istnieje — i dlaczego akurat w tej postaci

**Zmierzony fakt, który wymusił ten rejestr** (pomiar 2026-08-14, `grep -rn "logs/audit" src/ tools/`
→ brak wyjścia; kontrola dodatnia → 1 trafienie): produkt wdrożony na hostingu **nie ma ani jednego
odwołania** do dziennika zdarzeń firmy. Cokolwiek zapisalibyśmy o żądaniu usunięcia **wewnątrz
bazy produkcyjnej**, zniknęłoby razem z kontem albo razem z gałęzią produkcyjną. Rejestr żądań
usunięcia trzymany w bazie produkcyjnej jest więc z konstrukcji pusty w chwili, w której staje się
potrzebny.

**Decyzja i jej podstawa.** Pakiet B miał trzy warianty: (1) osobny projekt bazy, (2) rejestr ręczny
prowadzony przez operatora, (3) przyjęcie ryzyka z zapisem w klauzuli. Moja rekomendacja z 2026-08-14
brzmiała „(3) na jednego uczestnika, (1) przed naborem". **Decyzja Darka o naborze 3–5 osób
(2026-08-15) unieważnia wariant (3)** — to jest dokładnie ten próg, który sam postawiłem. Wariant (1)
jest przy tej skali **nieproporcjonalny i jest czerwoną linią** (nowe źródło danych, sekcja 4
CLAUDE.md). **Wybrany wariant (2)** — ten plik. Zdejmuje pozycję z biurka Darka bez tworzenia nowego
miejsca przetwarzania.

**Dlaczego plik w repozytorium kodu jest „poza gałęzią produkcyjną".** Bo jest: żyje w historii
kontroli wersji, kopiuje się na każdy klon, przeżywa skasowanie bazy, skasowanie gałęzi Neona
i skasowanie całego projektu Neona. Dokładnie te zdarzenia, wobec których rejestr ma być odporny.

---

## 2. Co wpisujemy — i czego NIE wpisujemy

**Zasada nadrzędna: rejestr dowodzący wykonania prawa do usunięcia nie może sam być składem danych
osobowych.** Osobę identyfikujemy **skrótem kryptograficznym**, nigdy adresem.

| Kolumna | Co wpisać | Uwaga |
|---|---|---|
| **Nr** | kolejny, `Ż-001`, `Ż-002`… | nigdy nie zmienia się po nadaniu |
| **Skrót osoby** | pierwsze **12 znaków** `HMAC-SHA-256` adresu e-mail **z wartością dosalającą** (§2a), adres małymi literami, bez spacji | **liczony w chwili przyjęcia żądania** — po usunięciu konta nie będzie już z czego go policzyć |
| **Data żądania** | `RRRR-MM-DD` | data wpływu, nie data przeczytania |
| **Kanał** | `e-mail` / `ekran usunięcia konta w produkcie` | skąd przyszło |
| **Zakres** | `konto w całości` albo opis węższy | np. samo cofnięcie zgody na dane o stażu = **nie** jest żądaniem z art. 17 i tu nie trafia |
| **Data wykonania** | `RRRR-MM-DD` | RODO daje miesiąc; celujemy w ten sam dzień |
| **Potwierdzenie** | `RRRR-MM-DD` albo `brak kontaktu` | kiedy poinformowaliśmy osobę, że wykonaliśmy |
| **Ponowienia po odtworzeniu** | lista dat, puste dopóki nie było odtworzenia | **serce tego rejestru** — patrz §4 |
| **Uwagi** | wyłącznie fakty operacyjne | nigdy treść korespondencji |

**NIE wpisujemy nigdy:** adresu e-mail, imienia, nazwiska, adresu IP, identyfikatora konta z bazy,
treści wiadomości, powodu żądania (**osoba nie ma obowiązku go podawać** i pytanie o niego byłoby
wadą samo w sobie).

**Dlaczego skrót, a nie identyfikator z bazy.** Identyfikator z bazy po odtworzeniu z kopii
zapasowej **może się nie zgadzać** (kopia sprzed zmiany, inny wiersz), a adres e-mail jest tym, po
czym da się osobę odnaleźć w odtworzonym systemie. Skrót adresu pozwala **znaleźć i usunąć
ponownie**.

---

## 2a. Wartość dosalająca — dlaczego sam skrót NIE wystarczał

> **SPROSTOWANIE JAWNE 2026-08-15 — moje własne zdanie z v0.1 tego pliku.**
> **Stare brzmienie, cytowane dosłownie:**
>
> > „Skrót adresu pozwala **znaleźć i usunąć ponownie**, nie pozwalając odtworzyć adresu z samego
> > rejestru."
>
> Zdanie jest **prawdziwe dosłownie i mylące w skutku** — i to drugie przesądza. Adresu z krótkiego
> skrótu faktycznie nikt nie odtworzy (funkcja skrótu jest jednokierunkowa). **Ale nie o odtworzenie
> chodzi.** Kto ma **hipotezę** („czy Jan Kowalski brał udział w pilotażu"), policzy skrót jego
> adresu i **porówna** — a to jest odpowiedź na pytanie, na które ten rejestr nigdy nie powinien
> odpowiadać osobie trzeciej. Przy grupie 3–5 osób zbiór kandydatów jest **znikomy**, więc
> sprawdzenie jest kwestią sekund.
>
> **To jest dokładnie ta klasa wady, którą sam opisałem jako pozycję L-8 / dług A-3**: prefiks
> identyfikatora paszportu na wydruku PDF też niczego nie „ujawnia", tylko **pozwala potwierdzić
> hipotezę**. Napisałem o tym w rejestrze art. 17 pięć dni wcześniej i **powtórzyłem tę samą wadę
> we własnym nowym dokumencie**. Wykrył ją Leo przy przeglądzie #324, nie ja.
>
> **Przesłanka, której nie wziąłem pod uwagę, choć jest sprawdzalna jedną komendą** —
> `gh repo view Danolog/nordsignal-skillbridge --json visibility` → `visibility=PUBLIC`
> (odczyt 2026-08-15). **Repozytorium jest publiczne.** Cała moja argumentacja o trwałości rejestru
> („kopiuje się na każdy klon") działa więc **także na korzyść osoby trzeciej**, nie tylko naszą.

**Decyzja: dosalamy skrót.** Rozważałem trzy drogi i odrzucam dwie:

| Droga | Werdykt |
|---|---|
| Sprostować zdanie i **przyjąć ryzyko jawnie** | **ODRZUCONE.** Rejestr istnieje po to, żeby dowodzić wykonania prawa do usunięcia. Rejestr, którego samo istnienie **publicznie potwierdza, że dana osoba z tego prawa skorzystała**, jest wewnętrznie sprzeczny. Osoba żąda usunięcia śladu, a dostaje trwały publiczny ślad żądania |
| Trzymać rejestr **poza repozytorium publicznym** | **ODRZUCONE.** Kasuje własność, dla której ten rejestr powstał: przeżywa skasowanie bazy, gałęzi i projektu, bo jest w kontroli wersji i na każdym klonie. Przeniesienie go „gdzieś indziej" znaczy **nowe miejsce przetwarzania** — czyli czerwona linia, której właśnie uniknęliśmy wariantem (2) |
| **Dosolić skrót wartością spoza repozytorium** | **WYBRANE.** Zachowuje wszystkie własności rejestru i kosztuje jeden sekret. Operator (ma wartość) nadal odnajdzie konta po odtworzeniu kopii; osoba trzecia (nie ma wartości) **nie policzy skrótu kandydata**, więc nie potwierdzi żadnej hipotezy |

**Wartość dosalająca** (*pieprz* — pojedyncza, tajna wartość wspólna dla całego rejestru, w odróżnieniu
od soli, którą zwykle zapisuje się jawnie obok każdego wpisu):

- **losowa, co najmniej 32 bajty**, zapisana wyłącznie w nośniku sekretów **poza repozytorium**;
- **nazwa: `REJESTR_USUNIEC_PIEPRZ`**;
- **właściciel utworzenia: Ethan.** Wskazuję wymóg, nie mechanizm — nośnik na pęku kluczy
  z kontrolą dwustronną (brak wpisu → kod wyjścia 44) **przekazała mi koordynacja i nie
  weryfikowałem go własnym odczytem**; oznaczam to jako **niezweryfikowane**. Wymóg z mojej strony
  jest od implementacji niezależny: **wartość nie może istnieć w żadnym pliku pod kontrolą wersji
  ani w żadnym pliku `.env*`**, a brak wpisu ma być **głośnym błędem**, nigdy cichym pominięciem;
- **do rejestru nie trafia nigdy** — ani wartość, ani jej skrót, ani jej fragment.

**Jak policzyć wpis** (adres podajemy standardowym wejściem, żeby nie trafił do historii powłoki
ani do tablicy procesów; wartość dosalająca czytana z nośnika, nigdy wpisywana w komendę):

```
printf '%s' 'adres@przyklad.pl' \
  | openssl dgst -sha256 -hmac "$REJESTR_USUNIEC_PIEPRZ" -r \
  | cut -c1-12
```

**Trzy własności tej wartości, które trzeba znać, zanim powstanie pierwszy wiersz:**

1. **Jest nierotowalna — i to jest świadomy koszt, nie przeoczenie.** Po usunięciu konta **nie mamy
   już adresu**, więc nie da się przeliczyć istniejących wpisów na nową wartość. Zmiana wartości
   **unieważnia cały dotychczasowy rejestr**, czyli niszczy dowód wykonania art. 17. Wartość
   ustawiamy **raz**.
2. **Jej wyciek cofa nas do stanu sprzed tej decyzji** — wpisy znów stają się sprawdzalne
   hipotezą. Nie da się tego naprawić po fakcie (patrz punkt 1). **Próg:** przy podejrzeniu wycieku
   **natychmiastowe zgłoszenie jako incydent P0** i decyzja Darka, czy rejestr skrócić do samych
   dat i liczb, tracąc zdolność ponowienia z §4.
3. **Bez niej rejestr jest bezużyteczny operacyjnie.** Utrata wartości = utrata możliwości
   odnalezienia kont po odtworzeniu kopii. **Kopia zapasowa wartości jest obowiązkowa** i podlega
   tym samym regułom co pozostałe sekrety produkcyjne.

**Próg wykonania: przed pierwszym wierszem tabeli z §3.** Dziś tabela jest pusta, więc koszt to
jedna decyzja i jedno utworzenie sekretu. Po pierwszym żądaniu usunięcia byłaby to **migracja
danych, których z definicji nie wolno nam trzymać dłużej** — bo do przeliczenia wpisów
potrzebowalibyśmy adresów, które właśnie usunęliśmy. **Dopóki wartość nie istnieje, nie wolno
wpisać do rejestru ani jednego wiersza.**

---

## 3. Rejestr

> **NIE WPISUJ WIERSZA, DOPÓKI NIE ISTNIEJE WARTOŚĆ DOSALAJĄCA `REJESTR_USUNIEC_PIEPRZ`** (§2a).
> Wpis policzony gołym skrótem trafi do **publicznego** repozytorium i **nie da się go później
> naprawić** — do przeliczenia potrzebny byłby adres, który w tym momencie już usunęliśmy.

*(pusty na 2026-08-15 — żadne żądanie usunięcia jeszcze nie wpłynęło; zero uczestników)*

| Nr | Skrót osoby | Data żądania | Kanał | Zakres | Data wykonania | Potwierdzenie | Ponowienia po odtworzeniu | Uwagi |
|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — |

---

## 4. Procedura ponowienia po odtworzeniu z kopii zapasowej

**To jest jedyny powód, dla którego ten rejestr musi przeżyć bazę.** Klauzula art. 13 sekcja 9 mówi
uczestnikowi: *„jeśli musimy odtworzyć system po awarii — **ponawiamy na nim Twoje usunięcie**"*.
Bez rejestru poza gałęzią produkcyjną ta obietnica jest niewykonalna, bo odtworzenie przywraca
również usunięte konta, a nie ma z czego odczytać, które to były.

**Kroki — wykonać w tej samej ceremonii, w której odtwarzamy bazę, nigdy „później":**

1. Odtworzyć bazę z kopii (runbook: `docs/runbooks/neon-kopia-zapasowa.md`).
2. Otworzyć ten plik i wziąć **wszystkie** wiersze, w których `Data wykonania` jest wcześniejsza
   niż **data stanu odtworzonej kopii** (nie data odtworzenia — data **stanu**).
3. Dla każdego wiersza: policzyć wpis (`HMAC-SHA-256` **z wartością dosalającą**, §2a) dla adresów
   kont istniejących w odtworzonej bazie i **usunąć te, które pasują**. Porównanie idzie po wpisie —
   adres nie musi nigdzie paść. **Bez wartości dosalającej ten krok jest niewykonalny** i nie da się
   go obejść.
4. Dopisać dzisiejszą datę do kolumny **Ponowienia po odtworzeniu** w każdym ruszonym wierszu.
5. Wpis w dzienniku zdarzeń firmy: co odtworzono, ile żądań ponowiono, z jakiego stanu.

**Kontrola, że krok 3 zadziałał** (dwustronna, obowiązkowa): po usunięciu policzyć konta pasujące
do skrótów z rejestru → oczekiwane **0**; oraz policzyć konta **niepasujące** → oczekiwane
**więcej niż 0**. Sam wynik „0 pasujących" nie odróżnia „usunięto" od „zapytanie nic nie widziało" —
ta pomyłka kosztowała nas w tym pakiecie już jedną dobę.

---

## 5. Granice tego rozwiązania — nazwane, nie przemilczane

1. **Rejestr jest ręczny i tyle jest wart, ile dyscyplina operatora.** Nic nie pilnuje maszynowo,
   że żądanie zostało wpisane. Przy 3–5 uczestnikach to jest proporcjonalne; **próg powrotu do
   wariantu (1)**: pierwsza grupa **powyżej 20 osób** albo pierwsze żądanie, które wpłynęło
   i **nie zostało wpisane** — co znaczy, że dyscyplina zawiodła i nie wolno na niej dłużej stać.
2. **Ekran usunięcia konta w produkcie nie zasila tego rejestru automatycznie.** Gdy uczestnik
   usunie konto sam, **operator musi wpisać to ręcznie**. Dopóki nie ma powiadomienia, jedynym
   sygnałem jest ślad zdarzeń. **Właściciel domknięcia: Ethan** (powiadomienie o samodzielnym
   usunięciu), **próg: pierwsze samodzielne usunięcie konta przez uczestnika**.
3. **Okres przechowywania samego rejestru — moja propozycja, nie ustalenie.** Proponuję
   **24 miesiące** od daty wykonania: krócej niż typowy czas, w którym osoba może zakwestionować
   wykonanie prawa przed organem, i wyraźnie dłużej niż 30-dniowe okno wygasania kopii zapasowych.
   **To jest moja rekomendacja jako CRCO, nie ocena prawna** — do potwierdzenia przez prawnika
   razem z listą z sekcji Z-5 klauzuli. Do czasu potwierdzenia **nie usuwamy żadnego wiersza**.
4. **Rejestr nie zastępuje wykonania.** Wiersz w tabeli nie jest dowodem, że dane zniknęły —
   jest dowodem, że **wiedzieliśmy o żądaniu i kiedy je wykonaliśmy**. Dowodem wykonania jest stan
   bazy plus kontrola z §4.
5. **Rejestr żyje w repozytorium publicznym i to jest przesłanka, nie tło.** Zmierzone
   2026-08-15: `visibility=PUBLIC`. Dlatego wartość dosalająca z §2a **nie jest ulepszeniem, tylko
   warunkiem działania** — bez niej rejestr odpowiada osobie trzeciej na pytanie „czy X brał
   udział". **Próg powrotu do tej decyzji:** zmiana widoczności repozytorium na prywatne (wtedy
   wartość dosalająca zostaje, ale przestaje być jedyną warstwą) albo pierwsza grupa na tyle duża,
   że zbiór kandydatów przestaje być znikomy.
6. **Nikt nie pilnuje maszynowo, że wpis jest dosolony.** Rozważyłem strażnika sprawdzającego to
   automatycznie i **nie da się go napisać uczciwie**: test bez wartości dosalającej nie odróżni
   wpisu dosolonego od gołego skrótu (oba są 12 znakami szesnastkowymi), a test z wartością
   wymagałby wniesienia sekretu do CI — czyli **poszerzenia zasięgu sekretu po to, żeby pilnować
   sekretu**. **Oznaczam to jako strażnika NIEPOTWIERDZONEGO** i wskazuję barierę zastępczą:
   ostrzeżenie w §3 stoi bezpośrednio nad tabelą, a rejestr jest **wstrzymany** do czasu powstania
   wartości. To jest słabsze niż test i tak to nazywam.

---

## 6. Powiązania

- `docs/legal/klauzula-informacyjna-art13.md` — sekcja 9 (obietnica wobec uczestnika) i sekcja Z-7
  (pozycja **S-1**, z której ten rejestr powstał).
- `docs/data/art17-kompletnosc-usuniecia.md` — czego kaskada nie czyści; rejestr **nie zastępuje**
  tamtej listy i jej nie powtarza.
- `docs/runbooks/neon-kopia-zapasowa.md` — odtwarzanie, do którego wpina się §4.
