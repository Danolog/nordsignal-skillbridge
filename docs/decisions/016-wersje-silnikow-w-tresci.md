# ADR-016 — Wersje silników (pandas / DuckDB / Python) jako przedmiot reweryfikacji treści

- **Status:** ZAAKCEPTOWANY — decyzja Ethana (CTO) w domenie Engineering.
  Podstawa mandatu: `CLAUDE.md` v1.11 §5 („stała władza Poziomu 2 szefów działów" —
  decyzja **odwracalna, wewnętrzna, bez wydatku, niewychodząca na zewnątrz, spoza
  plików rządzenia"). **Nie wymaga sign-offu Darka.**
- **Data:** 2026-07-22 · **Autor:** Ethan (CTO)
- **Przegląd domenowy przed wejściem w życie:** Sophia (treść — konwencja cytowania,
  D5), Eva (wykonalność w CI — D2/D3). Okno weta 24 h.
- **Rozszerza:** ADR-014 D4 (linia utrzymaniowa `verifiedAt`). Nie zmienia treści
  ADR-014 — wzorem ADR-015 §6 korekta/rozszerzenie żyje we własnym ADR-ze,
  podpisany dokument nie jest przepisywany.
- **Powiązania:** ADR-015 (kontrakt checków labów), `.github/workflows/pr.yml`
  (job `test`), `tests/unit/ds/notebook-stamp-harness.py`.
- **Wykonanie:** Eva (CI + kontrakt-test), Sophia (konwencja cytowania w treści
  i naprawa długu z §2), Darek (jednorazowo: uruchomienie sondy w Colabie —
  akcja wymagająca ludzkiej sesji przeglądarkowej).

---

## 1. Problem — cicha awaria treści

Treść edukacyjna ścieżki Data Science cytuje **wytwory środowiska wykonawczego**:
dosłowne komunikaty błędów, surowe liczby zmiennoprzecinkowe, domyślne nazwy kolumn.
Te wytwory są **funkcją wersji** biblioteki (pandas, DuckDB) i interpretera (Python).
Colab podbija preinstalowane wersje bez uprzedzenia i bez naszego udziału.

Reweryfikacja kwartalna `verifiedAt` (ADR-014 D4) obejmuje **etykiety interfejsu
i świeżość odnośników** (URL żyje, język, licencja, ekran „Kopiuj do GitHuba"),
a **nie wersje silników**. Skutek: gdy Colab przesunie wersję, treść przestaje
opisywać rzeczywistość — i **nic tego nie wykrywa**:

- CI nie wykryje, bo instaluje **naszą przypiętą wersję** (`pandas~=2.2.0`,
  `duckdb~=1.3.2`) — testy pozostają zielone na środowisku, którego student już nie ma;
- dependabot nie wykryje, bo to `pip install` w kroku workflow, a nie zależność
  z `package.json` — żadne narzędzie nie obserwuje tych dwóch linii;
- kontrakt-testy notebooków asertują **nasze polskie komunikaty pieczątki**,
  nigdy komunikatów silnika.

Student dostaje wtedy instrukcję opisującą komunikat, którego nie zobaczy — czyli
dokładnie ten rodzaj usterki, którego pedagogika L0 („czytaj błąd, on mówi prawdę")
nie przetrwa.

## 2. Dowód, że to nie jest ryzyko hipotetyczne (znalezisko 2026-07-22)

Treść F1/F2 cytuje `IndentationError: expected an indented block`. To brzmienie
z Pythona ≤ 3.9. Od 3.10 (Colab jest znacznie dalej) interpreter zwraca:

```
IndentationError: expected an indented block after 'if' statement on line 1
```

Zmierzone realnym interpreterem (Python 3.13.2, maszyna dev, 2026-07-22).
Cytat jest dziś **prefiksem** prawdziwego komunikatu, więc szkoda jest ograniczona
(student rozpozna początek linii) — ale dług już jest w produkcie:

| Miejsce | Charakter |
|---|---|
| `docs/curation/sophia-1e2-f1-atomy.md:697, 1002` | źródło treści |
| `docs/curation/sophia-1e2-f2-atomy.md:420` | źródło treści |
| `tools/content/curriculum-atoms/f1-python-1.json`, `f2-python-2.json` | artefakt spakowany |
| baza produkcyjna (`curriculum_module_items.contentMd`) | **treść u studenta** |

Żadna bramka tego nie zatrzymała, bo żadna bramka na to nie patrzy. To jest
uzasadnienie tego ADR-a w jednym akapicie.

## 3. Zakres reweryfikacji — co dokładnie się starzeje

Trzy klasy, każda z innym profilem ryzyka:

| Klasa | Przykład z treści | Wrażliwość |
|---|---|---|
| **K1 · komunikat błędu dosłownie** | `Binder Error: Referenced column "______" not found in FROM clause!`; `SyntaxError: invalid syntax. Maybe you meant '==' …?` | **wysoka** — brzmienie zmienia się między wersjami minor |
| **K2 · surowy wynik zależny od formatowania** | `srednia_kwota` strefy 10 = `21.833333333333332`; domyślne nazwy `count_star()`, `avg(kwota)` bez aliasu | **średnia** — zmiana repr/dtype w pandas albo nazewnictwa w DuckDB |
| **K3 · zachowanie bez gwarancji kontraktowej** | kolejność grup bez `ORDER BY`; rozstrzyganie remisów przy `ORDER BY` | **znana i opisana** — treść już mówi „silnik niczego nie obiecuje"; kontrakt-test M-SQL jawnie dopuszcza dwie diagnozy przy remisie |

Inwentarz cytatów K1 w dzisiejszej treści (zliczone 2026-07-22): **5 kształtów
DuckDB** (`Catalog Error` — brak tabeli; `Binder Error` — nieznana kolumna;
`Binder Error` — kolumna spoza `GROUP BY`; `Binder Error` — niejednoznaczna kolumna;
`Parser Error` — składnia) i **11 kształtów Pythona** (`NameError`, `SyntaxError:
expected ':'`, `SyntaxError … Maybe you meant '=='`, `IndentationError` ×2,
`TypeError`, `ValueError: could not convert string to float`, `KeyError`,
`IndexError`, `ZeroDivisionError`, `ModuleNotFoundError`). Razem **16 asercji** —
to jest cały rozmiar zadania, nie „setki".

## 4. Decyzja

### D1 · Jedno źródło prawdy o środowisku, które obiecujemy studentowi

Powstaje `tools/content/notebooks/srodowisko-colab.json` — deklaracja środowiska,
pod które treść jest napisana i zweryfikowana:

```json
{
  "python":  { "zakres": "3.11 – 3.13", "zweryfikowano": null },
  "pandas":  { "pin": "~=2.2.0", "zaobserwowano": "2.2.2", "zweryfikowano": "2026-07-11" },
  "duckdb":  { "pin": "~=1.3.2", "zaobserwowano": "1.3.2", "zweryfikowano": "2026-07-11" },
  "rozjazd": false
}
```

- Workflow `pr.yml` **przestaje mieć wersje wpisane na sztywno** — czyta pin stąd.
  Dziś ta sama liczba żyje w trzech miejscach (workflow, komentarze w testach,
  proza w dokumentach kuracji) i rozjeżdża się po cichu.
- `zaobserwowano` = co realnie stoi w Colabie (pomiar), `pin` = co instalujemy w CI.
  Rozdzielone celowo: pin to nasza decyzja, obserwacja to fakt zewnętrzny.
- `python.zweryfikowano: null` jest **świadomym przyznaniem się do luki**: wersji
  Pythona w Colabie nikt u nas nie zmierzył (przeszukanie repo 2026-07-22 —
  zero wystąpień). Pierwsza sonda (D3) to wypełnia. Nie wpisuję liczby, której nie
  zmierzyłem — wpisana „na oko" byłaby gorsza niż `null`, bo wyglądałaby na dowód.

### D2 · Asercje w CI — dwa poziomy, jawnie rozdzielone

Nowy kontrakt-test `tests/unit/ds/srodowisko-silnikow.contract.test.ts`
(wykonanie: Eva; wzorzec — istniejący harness `notebook-stamp-harness.py`):

**Poziom 1 — parytet pinu (CZERWONE CI).**
Test odpala `python3` i porównuje `duckdb.__version__`, `pandas.__version__`,
`sys.version_info` z zakresami z `srodowisko-colab.json`. Niezgodność = błąd.
Łapie: dryf na NASZEJ stronie (ktoś podbił pin bez aktualizacji deklaracji,
maszyna dev z duckdb 1.5.x udająca CI, zmiana rozstrzygania zależności pipa).

**Poziom 2 — asercja cytatów (CZERWONE CI).**
Dla każdego z 16 kształtów z §3: test wykonuje fragment kodu, który ten komunikat
produkuje, i sprawdza, że **cytat z treści nadal jest prefiksem** faktycznego
komunikatu. Nie porównuje całości — ogon (`Candidate bindings: …`,
`Did you mean "pg_prepared_statements"?`, numer linii) jest nieprzewidywalny
i cytowanie go byłoby budowaniem długu. Inwentarz cytat↔fragment kodu leży
w jednym pliku tablicowym obok testu — to jedyne miejsce, w którym kurator dopisuje
nowy cytat.

**Poziom 2a — domknięcie inwentarza (CZERWONE CI). Bez tego cały poziom 2 jest
teatrem.** Tablica asercji to potencjalne DRUGIE źródło prawdy: gdyby kurator dopisał
cytat do treści, a nie do tablicy, test sprawdzałby własną kopię, nie produkt.
Dlatego test dodatkowo **skanuje spakowane `tools/content/curriculum-atoms/*.json`**
wyrażeniem łapiącym kształt `<NazwaBłędu>: <tekst>` w blokach kodu i w tekście
otoczonym grawisami — i wymaga, by **każdy znaleziony kształt miał wiersz w tablicy**.
Nowy cytat bez asercji ⇒ czerwone CI w tym samym PR-ze, w którym powstał. To jest
różnica między bramką a listą życzeń.

To jest sedno: **asercja nie na numerze wersji, tylko na artefakcie, który student
zobaczy.** Numer wersji może się zmienić bez szkody dla treści; brzmienie komunikatu
zmienić się bez szkody nie może.

**Poziom 2b — asercja K2 (CZERWONE CI).** Trzy wartości, które treść cytuje
dosłownie jako surowy wynik: średnia z długim ogonem float, domyślne nazwy kolumn
bez aliasu. Wykonanie + porównanie z cytatem.

### D3 · Sonda Colab — to, czego CI nie zobaczy nigdy

CI nie ma dostępu do Colaba i mieć nie będzie. Dryf po stronie Google mierzy się
wyłącznie ręcznie:

- **Artefakt:** `tools/content/notebooks/sonda/sonda-srodowiska.py` → budowany
  `notebooks/sonda/sonda-srodowiska.ipynb` (bez pieczątki — to nie lab).
  Jedna komórka: wypisuje `sys.version`, `pd.__version__`, `duckdb.__version__`
  oraz **te same 16 kształtów komunikatów**, wykonanych na miejscu.
- **Wykonanie:** Darek, świeża sesja Colab, wynik wklejony do repo jako
  `docs/curation/sondy/sonda-srodowiska-RRRRMMDD.txt` — konwencja dokładnie
  taka jak przy zrzutach ekranu UI z 2026-07-22 (dowód, nie deklaracja).
- **Częstotliwość:** kwartalnie, razem z reweryfikacją `verifiedAt` (ADR-014 D4) —
  jedna linia utrzymaniowa, nie dwie. **Dodatkowo wyzwalane zdarzeniem:**
  (a) przed każdym ingestem nowej partii notebooków na produkcję,
  (b) po każdym zgłoszeniu studenta „widzę inny komunikat niż w instrukcji".
- **Właściciel linii:** Ethan (CTO). Właściciel poprawek treści wynikających
  z sondy: Sophia.

### D4 · Rozstrzygnięcie wprost: Colab podbija wersję szybciej niż my

Pytanie z briefu — **CI czerwone czy ostrzeżenie**. Odpowiedź: **ani jedno, ani
drugie na poziomie PR-a; twarda bramka stoi w innym miejscu.**

- **PR-y NIE robią się czerwone od dryfu Colaba.** Autor PR-a o froncie ani o RLS
  nie ma jak naprawić tego, że Google wydał duckdb 1.4. Czerwone CI, którego nie da
  się naprawić w PR-ze, uczy zespół ignorować czerwone CI — to jest strata trwała,
  większa niż opóźnienie wykrycia dryfu o jeden ingest.
- **Twardą bramką jest publikacja treści**, nie kod: gdy `srodowisko-colab.json`
  ma `"rozjazd": true`, **packer/walidator odmawia spakowania modułów M-\*** (i tym
  samym blokuje ingest na produkcję) do czasu rozstrzygnięcia. Uzasadnienie: dryf
  szkodzi dokładnie w chwili, w której treść trafia do studenta — tam ma stać stop.
- **Świeżość samej sondy jest częścią tej bramki.** `rozjazd` ustawia człowiek po
  sondzie — więc gdyby sondy nikt nie uruchamiał, flaga zostałaby `false` na zawsze
  i cała bramka byłaby martwa. Dlatego packer sprawdza także **`ostatnia_sonda`:
  starsza niż 100 dni ⇒ odmowa spakowania modułów M-\*** z komunikatem „sonda
  środowiska przeterminowana — uruchom `notebooks/sonda/`". Kwartał + 10 dni luzu;
  wzorzec dokładnie jak `verifiedAt` dla odnośników (ADR-014 D4). Bramka wiąże się
  z wydarzeniem, które i tak zachodzi (ingest partii), a nie z czyjąś pamięcią.
- **Sygnałem jest ticket, nie kolor buildu:** sonda z rozjazdem ⇒ wpis
  `"rozjazd": true` + ticket Linear `[Ethan] rozjazd wersji Colab` — widoczny,
  policzalny, z datą.
- **Kto rozstrzyga: Ethan (CTO), sam.** To decyzja odwracalna w domenie
  technicznej (`CLAUDE.md` §5, v1.11) — bez udziału Darka. Dwie legalne odpowiedzi:
  1. **idziemy za Colabem** — podbij pin, uruchom kontrakt-testy; komunikat czerwony
     ⇒ zadanie treściowe dla Sophii ⇒ repack ⇒ ingest (nieodwracalny krok, ale
     od `CLAUDE.md` v1.12 również w mandacie Ethana, pod bramkami jakości);
  2. **zostajemy** — treść bez zmian, `rozjazd: true` udokumentowany z uzasadnieniem
     i datą przeglądu. Legalne, jeśli różnica dotyczy wyłącznie klasy K3.
  **Sign-off Sophii wymagany tylko wtedy, gdy zmienia się tekst widziany przez
  studenta** — to jej domena, nie moja.

### D5 · Konwencja cytowania (żeby nowa treść nie dokładała długu)

Wiążące dla `skills`-owego standardu autorstwa treści (QG-5) i dla każdego nowego atomu:

1. **Cytuj prefiks, nigdy ogon.** Dozwolone: `IndentationError: expected an indented
   block …`. Zakazane: cytowanie fragmentów z numerem linii, listą kandydatów
   (`Candidate bindings: …`) lub podpowiedzią silnika (`Did you mean …`) jako
   obiecanego brzmienia. Ogon wolno **opisać** („pod spodem silnik dokleja
   podpowiedź, bywa absurdalna — prawdę mówi linia z nazwą błędu"), co treść
   SQL.1 już robi poprawnie i co zostaje wzorcem.
2. **Każdy nowy cytat verbatim = nowy wiersz w tablicy asercji.** Cytat bez asercji
   jest długiem od pierwszego dnia. Sprawdzane w QG.
3. **Numer wersji nie wchodzi do treści studenta** (dzisiejsze „np. `2.3.3` —
   zależnie od środowiska; sam numer jest nieistotny" w M-PD to wzorzec do
   powielania). Wersje żyją w `srodowisko-colab.json`, nie w prozie.

## 5. Alternatywy rozważone

| Opcja | Werdykt |
|---|---|
| Nic nie robić — polegać na kwartalnym `verifiedAt` | ODRZUCONE — §2 pokazuje, że ta linia już przepuściła defekt; jej zakres to etykiety UI i odnośniki, nie silniki |
| Asertować tylko numery wersji (pin ≡ zainstalowane) | ODRZUCONE jako komplet — po `pip install` asercja jest prawie tautologią; łapie dryf u nas, nie łapie zmiany brzmienia komunikatu w obrębie tej samej rodziny wersji |
| CI czerwone przy dryfie Colaba | ODRZUCONE — nienaprawialne w PR-ze, uczy ignorowania czerwonego CI (D4) |
| Ostrzeżenie w logu CI | ODRZUCONE — log nikt nie czyta; sygnał bez adresata to brak sygnału. Zamiast tego ticket + bramka na ingeście |
| Cotygodniowy nocny job odpytujący Colaba | ODRZUCONE — Colab nie ma API środowiska do odpytania z CI; wymagałby konta i automatyzacji przeglądarki (nowa infrastruktura + sekret) przy dryfie mierzonym w miesiącach |
| Wyrzucić cytaty komunikatów z treści (opisywać ogólnie) | ODRZUCONE — dosłowny komunikat jest sednem pedagogiki L0/F1 („czytaj błąd"); tańszym rozwiązaniem jest asercja niż rezygnacja z mechanizmu |
| Przypiąć wersje do maszyny dev zamiast do Colaba | ODRZUCONE (potwierdzenie decyzji z partii 6) — student ma dostać to, co przetestowane; dev ma duckdb 1.5.x, Colab 1.3.2 |

## 6. Konsekwencje

**Pozytywne:** klasa „cicha awaria treści" przestaje być cicha — 16 dosłownych
obietnic wobec studenta ma wykonywalną asercję; jedna liczba wersji zamiast trzech
kopii; dryf Colaba ma właściciela, wyzwalacz i bramkę.

**Koszt (policzony):**

| Pozycja | Wykonawca | Nakład |
|---|---|---|
| `srodowisko-colab.json` + wpięcie do `pr.yml` (koniec wpisów na sztywno) | Eva | 0,5 h |
| Kontrakt-test 16 asercji (K1+K2) + tablica cytatów | Eva | 2,0 h |
| Skaner inwentarza (poziom 2a — cytat bez asercji = czerwone) | Eva | 0,5 h |
| Sonda Colab (źródło percent + build) | Eva | 0,5 h |
| Pierwsze uruchomienie sondy + wklejenie wyniku | Darek | 15 min |
| Bramka `rozjazd:true` **i** `ostatnia_sonda` > 100 dni w packerze | Eva | 0,5 h |
| Naprawa długu `IndentationError` (§2) w 2 dokumentach + repack + ingest | Sophia (treść), Ethan (ingest) | 0,5 h + ingest |
| **Razem inżynieryjnie** | | **≈ 4,5 h** |

**Negatywne:** przybywa 16 asercji do utrzymania (świadome — to jest produkt tego
ADR-a); przybywa jeden krok ręczny per kwartał (sonda), którego nie da się usunąć
bez automatyzacji przeglądarki.

**Rollback:** usunięcie kontrakt-testu i deklaracji; wersje wracają do wpisów
na sztywno w workflow. Zmiana jest w całości addytywna — zero migracji, zero schematu.

## 7. Weryfikacja (kryteria „zrobione" — dla Evy)

1. `srodowisko-colab.json` istnieje i jest **jedynym** miejscem z wersjami:
   `grep -rn "pandas~=\|duckdb~=" .github/ tools/` zwraca wyłącznie odczyt z pliku.
2. Ręczna podmiana pinu w deklaracji ⇒ **czerwony** `test:run` (parytet, poziom 1).
3. Ręczne zepsucie jednego cytatu w tablicy ⇒ **czerwony** `test:run` (poziom 2).
3a. Dopisanie do treści cytatu `Foo Error: bar`, którego nie ma w tablicy ⇒
   **czerwony** `test:run` (poziom 2a — inwentarz domknięty).
4. `"rozjazd": true` **albo** `ostatnia_sonda` starsza niż 100 dni ⇒
   `pnpm content:pack-curriculum` odmawia z czytelnym komunikatem.
5. `notebooks/sonda/sonda-srodowiska.ipynb` uruchamia się w Colabie i wypisuje
   komplet: trzy wersje + 16 komunikatów.
6. Dług z §2 (`IndentationError`) domknięty w dokumentach Sophii **i** na produkcji
   (weryfikacja PO ingeście: zero wystąpień starego brzmienia w `contentMd`).
