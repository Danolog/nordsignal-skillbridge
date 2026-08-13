# Ceremonia produkcyjna — 2026-08-12

**Wykonał:** Ethan (CTO), delegacja `CLAUDE.md` v1.12 (zmiany bazy produkcyjnej) ·
**Zlecił:** Oliver (COO) · **Charakter tury:** wyłącznie **odczyt** — zero zapisów, zero migracji, zero scaleń.

> **Rama czasowa (warunek Leo przy `#301`).** Wszystkie twierdzenia o stanie — produkcji, flag, zgłoszeń — opisują **chwilę ceremonii, 2026-08-12**. Wpis jest zapisem chwili i **nie aktualizujemy go**; stan bieżący czyta się ze źródła autorytatywnego, nie z tego pliku.

**Po co ten plik istnieje.** Dowód, który żyje w oknie czatu, ma wartość audytową zero. Ceremonie produkcyjne rozliczamy z zasady „Built-to-Sell od dnia 1" (`CLAUDE.md` §2), więc pomiar na produkcji ma zostawić ślad odnajdywalny komendą, a nie wspomnienie. To pierwszy plik w `docs/ceremonie/` — katalog zakładany tym wpisem.

**Żargon (tłumaczenie).** *Zrzut* (ang. *dump*) — plik powstały ze skopiowania konfiguracji w jakiejś chwili, np. `.env.prod`. *Źródło autorytatywne* — miejsce, które **jest** stanem (konsola albo interfejs programowy dostawcy), a nie jego opisem. *Migracja* — wersjonowana zmiana struktury bazy. *Dziennik migracji* — tabela, w której baza notuje, które migracje już nałożono. *Flaga* — przełącznik włączający funkcję bez wdrażania nowego kodu. *Placement* — automatyczne przypisanie studenta do miejsca w drabinie nauki na podstawie diagnozy.

---

## 1. Powód: zgłoszenie `#297` (Sophia)

Sophia rozbrajała runbook `docs/runbooks/aktywacja-1e1-neon-console.md` jako drugi nośnik opisów modułów i zmierzyła, że ładunek Kroku 4 jest cięższy, niż zakładano: `DELETE FROM curriculum_path_modules WHERE path_key = 'data-science'` z reinsertem **ośmiu** modułów, podczas gdy manifest ma **dziewięć**. Brakuje całego `m-pandas`.

Wykonanie tego kroku nie cofnęłoby opisów — **amputowałoby moduł ze ścieżki nauki** i przepisało łańcuch prerekwizytów na lipcowy.

Pytania, których Sophia rozstrzygnąć nie mogła (jej strażnik mierzy repozytorium, nie produkcję): **czy ktoś ten krok wykonał?** Klasa „ktoś wykonał polecenie z dokumentu wprost na produkcji" nie jest w tym repozytorium hipotetyczna.

## 2. Tożsamość bazy i sposób dostępu

```
baza: neondb · rola: neondb_owner · PostgreSQL 17.10 · strefa serwera: GMT
now() = 2026-08-12 16:12:27.207185+00
tabel w schemacie public: 55
```

Poświadczenie pobrane **świeżo ze źródła autorytatywnego** (Vercel, projekt `skill-bridge-ai`), użyte wyłącznie do wykonania odczytu, plik skasowany w tym samym zadaniu. Wartość leżąca w `.env.prod` na dysku była martwa (`28P01`) i nie została użyta. Zgodnie z `docs/policies/konfiguracja-produkcji-zrodlo-autorytatywne.md`, Zasady 1–2: zrzut jest nośnikiem poświadczeń do jednej operacji, nie opisem stanu.

**Żadna wartość sekretu nie występuje w tym dokumencie.**

## 3. Wynik: ścieżka `data-science` jest kompletna

```
w_sciezce | path_modules_ogolem | modulow_w_katalogu | prereqi | pozycji | dziennik
    9     |          9          |         9          |    8    |   71    |   47
```

`m-pandas` obecny, pozycja 5, `created_at = 2026-07-13T15:22:01.368Z`. Modułów w katalogu poza ścieżką (sierot): **0**.

Porównanie maszynowe z manifestem `tools/content/curriculum-ds-drabina.json` @ `origin/main`:

```
manifest : 1:l0-start 2:f1-python-1 3:f2-python-2 4:f3-dane-python 5:m-pandas 6:m-eda 7:m-sql 8:m-ml 9:m-llm
produkcja: 1:l0-start 2:f1-python-1 3:f2-python-2 4:f3-dane-python 5:m-pandas 6:m-eda 7:m-sql 8:m-ml 9:m-llm
ZGODNE   : TAK
  ZERO ROZJAZDOW (9/9 tytulow i opisow zgodnych)
```

Łańcuch prerekwizytów — zgodny z manifestem, **nie lipcowy**:

```
produkcja: … m-pandas<-f3-dane-python  m-eda<-m-pandas  m-sql<-m-eda  m-ml<-m-sql  m-llm<-m-ml
ZGODNE: TAK
```

Rozstrzygające jest `m-eda<-m-pandas`. Ładunek z runbooka dałby `m-eda<-f3-dane-python`. Ostatni zaciąg treści: **2026-08-12 15:25:54 UTC**, czyli kuracja języka (`#291`) siedzi na produkcji poprawnie.

**Wniosek: Kroku 4 nikt na produkcji nie wykonał. Sophia rozbrajała broń, która nie wystrzeliła. Naprawa danych niepotrzebna, koszt zero.**

## 4. Kto to widzi

Flaga `FLAG_CURRICULUM_PATH` — **zapalona**, dowód behawioralny (w kodzie flaga daje 404 **przed** sprawdzeniem logowania, `src/app/api/curriculum/route.ts`: 404 w linii 20, 401 w linii 23):

```
/api/curriculum          -> HTTP 401   (trasa istnieje, broni jej logowanie)
/nieistniejaca-trasa-xyz -> HTTP 404   (kontrola negatywna)
```

Ruch na drabinie jest realny:

```
item_progress   10 wierszy  2026-07-23 → 2026-08-10 18:44 UTC   (2 różne konta)
item_answers    12          2026-08-10 18:15 → 18:44 UTC
module_progress  1 · placements 1 · kont w bazie 33
```

Gdyby Krok 4 poszedł, ci użytkownicy straciliby moduł ze środka ścieżki. Ryzyko było prawdziwe — po prostu się nie zmaterializowało.

## 5. Dwa sprostowania własne

Obie przesłanki działały na moją korzyść i obie były fałszywe. Notuję je, bo `CLAUDE.md` v1.16 wymaga sprostowania jawnego, nie cichego przeredagowania.

1. **Nieświeże drzewo robocze.** Pierwszy odczyt manifestu wziąłem z lokalnego checkoutu, który był **13 commitów za `origin/main`** (`97d1fd4` vs `152465e`). Wyszły z tego trzy nieistniejące rozjazdy tytułów. Powtórzenie przez `git show origin/main:` je skasowało. Wniosek nie dotyczy tylko mnie — patrz sekcja 6.
2. **Zrzut skłamał o fladze.** Świeżo pobrany zrzut pokazał `FLAG_CURRICULUM_PATH` jako **pustą**, co sugerowałoby flagę zgaszoną. Rozstrzygnął dopiero pomiar zachowania działającego systemu. To dokładnie mechanizm z Zasady 1 polityki: pusta wartość renderuje trzy różne stany świata jednym znakiem i **nie da się ich z pliku rozróżnić**.

## 6. Znalezisko uboczne — strażnik-atrapa

`tools/prod-journal-check.ts`, narzędzie pre-flight uruchamiane **przed każdą migracją produkcyjną**, czytało dziennik migracji wyłącznie z drzewa roboczego. Odpalone dziś z nieświeżego checkoutu zwróciło:

```
Dziennik: 47 wpisów (ostatni: 0046_demonic_maria_hill).
✅ Brak migracji do zastosowania (baza = dziennik).
[prod-journal-check] WYNIK: spójny — db:migrate bezpieczny.
```

Prawda w tym samym momencie:

```
dziennik origin/main : 48 wpisow (ostatni: 0047_sad_la_nuit)
produkcja            : 47 zastosowanych
DO ZASTOSOWANIA: 1  ->  0047_sad_la_nuit  (2026-08-06T10:39:12.593Z)
NA PRODZIE BEZ ODPOWIEDNIKA W DZIENNIKU: 0
```

Naprawa + strażnik z mutacją: **PR `#300`**.

Dobra wiadomość osobna: **rozjazdu w drugą stronę nie ma** — zero wpisów na produkcji bez odpowiednika w dzienniku, czyli od czasu incydentu 0019 nikt nie nakładał DDL ręcznie bez odnotowania.

## 7. Miernik placementu — nadal zero obserwacji

Pytanie Olivera: przejazd Darka z 2026-08-10 miał domknąć placement, a licznik stoi na 1.

```
curriculum_placements: 1 wiersz
  unlocked_at 2026-08-01 16:49:45+00 · level 4 · qualified · fading · data-science

assessment_sessions (wszystkie):
  diagnostic/completed  4   2026-07-09 → 2026-08-01 16:49:40+00
  diagnostic/abandoned  1   2026-07-09
  sesji od 2026-08-08: BRAK

audit_log:
  placement.consent.granted      2   ostatni 2026-08-10 11:34:11+00
  curriculum.placement.computed  1          2026-08-01 16:49:45+00
```

**Rozstrzygnięcie: Darek udzielił zgody na placement (11:34), ale sesji diagnozy nie ma ani jednej po 2026-08-01.** Jego aktywność na drabinie (odpowiedzi 18:15–18:44, ~7 godzin później) poszła z pominięciem diagnozy. To nie jest przypadek „diagnoza nie zapisała placementu" — **diagnoza nie wystartowała**.

Jedyny wiersz placementu pochodzi z sesji QA z 2026-08-01 (sesja zamknięta 16:49:40, placement zapisany 16:49:45 — pięć sekund później), czyli z weryfikacji zapłonu wykonanej przez nas. Miernik ma **zero obserwacji od realnych uczestników** — dokładnie to, co zawczasu opisuje nagłówek migracji `0047`.

**Lejek do rozstrzygnięcia przez Sophię (PO):** zgoda udzielona → zero sesji. Ekran zgody działa, wejście w diagnozę nie prowadzi dalej albo jest pomijalne. To pytanie produktowe, nie techniczne.

## 8. Czego ta tura NIE zrobiła

| Rzecz | Stan | Dlaczego |
|---|---|---|
| Migracja `0047_sad_la_nuit` | **czeka** | Ceremonia z kopią zapasową — osobna tura. Tabela `pilot_participants` **nie istnieje** na produkcji (zweryfikowane), więc pozycja P-3 przeglądu Ryana i kontrola `(1c)` protokołu przejazdu pozostają otwarte. |
| Scalenie `#296` / `#288` / `#290` | **wstrzymane** | Bramki nie przechodzą — szczegóły w komentarzach przy zgłoszeniach. `#288` ma czerwony `test (vitest)` i jest za `main`; `#290` ma **2 konteksty CI zamiast 16** (pełna suita nigdy nie wystartowała, baza to gałąź `#288`, nie `main`). |
| Naprawa danych | **niepotrzebna** | Sekcja 3. |

---

**Podpis:** Ethan (CTO), 2026-08-12.
**Powiązane:** `#297` (Sophia — rozbrojenie runbooka), `#300` (naprawa strażnika), `drizzle/0047_sad_la_nuit.sql`, `docs/policies/konfiguracja-produkcji-zrodlo-autorytatywne.md`.
