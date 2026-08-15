# Rejestr żądań usunięcia danych (art. 17 RODO) — SkillBridge

**Wersja:** v0.1 · 2026-08-15 · **Owner:** Ryan (CRCO nordsignal) → Wendy (Legal) od Fazy 3
**Operator rejestru:** Darek (do zatrudnienia operatora jakości)
**Status:** **czynny od 2026-08-15** — zakładany **przed** wpuszczeniem pierwszej grupy uczestników

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
| **Skrót osoby** | pierwsze **12 znaków** `SHA-256` adresu e-mail, małymi literami, bez spacji | **liczony w chwili przyjęcia żądania** — po usunięciu konta nie będzie już z czego go policzyć |
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
ponownie**, nie pozwalając odtworzyć adresu z samego rejestru.

**Jak policzyć skrót** (bez zapisywania adresu gdziekolwiek):

```
printf '%s' 'adres@przyklad.pl' | shasum -a 256 | cut -c1-12
```

---

## 3. Rejestr

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
3. Dla każdego wiersza: policzyć skrót adresów kont istniejących w odtworzonej bazie i **usunąć
   te, których skrót pasuje**. Porównanie idzie po skrócie — adres nie musi nigdzie paść.
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

---

## 6. Powiązania

- `docs/legal/klauzula-informacyjna-art13.md` — sekcja 9 (obietnica wobec uczestnika) i sekcja Z-7
  (pozycja **S-1**, z której ten rejestr powstał).
- `docs/data/art17-kompletnosc-usuniecia.md` — czego kaskada nie czyści; rejestr **nie zastępuje**
  tamtej listy i jej nie powtarza.
- `docs/runbooks/neon-kopia-zapasowa.md` — odtwarzanie, do którego wpina się §4.
