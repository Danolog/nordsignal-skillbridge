# Decyzje produktowe 1E.7 · placement diagnozy w curriculum — mapa tagów, próg, reguła prefiksowa

**Changelog v0.5 → v0.6 (2026-07-30, Sophia):** dwa rozstrzygnięcia po L5 + lista tego, co musi wejść przed zapłonem. **Rozstrzygnięcia v0.1–v0.5 bez zmian.**
1. **Defekt wyspy — odrzucam OBIE zaproponowane drogi i podaję trzecią (§6e).** (a) przeliczanie placementu łamie niezmiennik, o który sama walczyłam („zapis w chwili odblokowania, nienadpisywany"); (b) świadoma dziura zostawia studenta z modułem **zablokowanym**, o którym UI mówi „do przejścia od nowa" — komunikat obiecuje coś, czego produkt nie pozwala zrobić. Reguła: **reset zeruje ZALICZENIE, nigdy DOSTĘPNOŚĆ.** Dostępność raz przyznana jest monotoniczna — ta sama zasada, co „placement nigdy nie odbiera" (§6b).
2. **`skipped_by_placement` NIE liczy się jak pozycja przerobiona przy rozstrzyganiu dowodu (§7 pkt 3).** Zgadzam się z Twoim odczuciem i mam na to argument twardszy niż odczucie: pod hybrydą ten status może powstać **wyłącznie** na pozycjach modułu zaliczonego przez `test_out`, więc liczenie go jak przerobionego kazałoby dowodowi `test_out` **skasować samego siebie** i pokazać `exam`.
3. **Sekcja „Co musi wejść przed zapłonem"** — dwie pozycje, obie moje; defekt wyspy i reguła z pkt 2 świadomie NIE są blokerami.

**Changelog v0.4 → v0.5 (2026-07-30, Sophia):** dwie interpretacje z L4 przesądzone. **Rozstrzygnięcia v0.1–v0.4 bez zmian; §7 punkt wejścia uogólniony.**
1. **W-7 — POTWIERDZAM odczyt Maxa: moduł zaliczony WYZNACZA k, tak samo jak poziom 4 z diagnozy.** Uzasadnienie w §6c. Skrót: reguła 5 odmawia `NULL`-owi prawa wyznaczania k dlatego, że `NULL` znaczy **niezmierzony** — a moduł zaliczony jest zmierzony najmocniejszym instrumentem, jaki mamy. Zarzut „pytania zamknięte nie transferują" nie bije w tę decyzję, bo dotyczy **zaliczania**, a tu nic się nie zalicza.
2. **§7 — rekomendacja startu MUSI uwzględniać zaliczenia; dotychczasowe brzmienie („najgłębszy odblokowany") było za wąskie.** Rekomendowanie `m-pandas` studentowi, który zdał `m-eda`, to cofanie go — na ekranie, którego jedynym zadaniem jest powiedzieć mu, gdzie jest. Nowa definicja: **najgłębszy moduł dostępny i niezaliczony**, ze wskazaniem dostępności z obu źródeł (łańcuch po module zaliczonym ∪ odblokowanie placementem). W-6 nienaruszone — rozdzielam **komunikat o placemencie** od **rekomendacji startu**; nowe mikrocopy w §8.
3. **Przyjmuję dwa pola Maxa ponad zlecenie** (`blockingHoleReason`, `alreadyCompletedCount`) — oba nośne, uzasadnienie w DECYZJI 2.

**Changelog v0.3 → v0.4 (2026-07-27, Sophia):** dwa rozstrzygnięcia po znaleziskach Ryana z L3. **Rozstrzygnięcia v0.1–v0.3 bez zmian; jedno uzupełnienie reguły z DECYZJI 5.**
1. **`blockingHoleSlug` na wierszu NIE wystarcza — nośnikiem drugiej strony asymetrii jest zdarzenie, nie kolumna.** Ryan ma rację, zweryfikowałam na kodzie (`placement-service.ts:218-220`: przy zerze odblokowań serwis wychodzi z `written: 0`, a policzony `outcome` razem z `blockingHoleSlug` jest odrzucany). **Pole dołożone w v0.3, żeby zobaczyć niedoszacowanie, było nieobecne dokładnie w najczystszym przypadku niedoszacowania** — sesji, w której nie otworzyło się nic. To był mój błąd projektowy, gorszy niż brak pola, bo dawał pozór pokrycia. Rozstrzygnięcie i wymagania w DECYZJI 2, podsekcja „Nośnik drugiej strony asymetrii".
2. **§6c — moduł już zaliczony: POMIJAMY (bez wiersza, bez komunikatu).** Potwierdzam kierunek Ryana, z argumentem produktowym mocniejszym niż dane: powiedzenie „diagnoza otworzyła ci moduł X" o module, który student **sam zdał egzaminem na ≈90%**, przypisuje produktowi jego pracę i miesza dwie waluty, których cała hybryda pilnuje osobno.
3. **Uzupełnienie DECYZJI 5 (nowe, niezgłoszone — do rozstrzygnięcia przed zapłonem):** moduł **zaliczony** musi **spełniać** warunek ciągłości prefiksu, a nie go łamać. Dziś reguła L2 nie wie o zaliczeniach (`computePlacement` bierze wyłącznie diagnozę), więc słaby instrument może unieważnić mocny. Szczegóły w §6c.

**Changelog v0.2 → v0.3 (2026-07-26, Sophia):** dwa rozstrzygnięcia wymagane przed L6 (pytania Maxa z budowy L2) + potwierdzenie rozjazdu punktu wejścia. **Rozstrzygnięcia v0.1/v0.2 bez zmian.**
1. **DECYZJA 2 — trzecia gałąź trybu wsparcia:** moduł wciągnięty prefiksem, bez własnego pomiaru (`f2-python-2`, `f3-dane-python`) → **pełne wsparcie**, ale z **odrębnym powodem** w zapisie, nie zlany z poziomem 3. Max słusznie zostawił `null` zamiast podstawiać domyślną wartość po cichu — reguła nie miała tej gałęzi. Nowe mikrocopy w §8 (dotychczasowy tekst dla modułu granicznego mówi o „jednym trafionym pytaniu" — dla F2/F3 byłby **nieprawdą**, bo o F2 nie padło żadne pytanie).
2. **DECYZJA 2 — miernik dostaje wyliczone pola i uzasadnienie per pole** (wymóg twardy dla L3). Sama lista odblokowanych slugów **kasuje możliwość weryfikacji progu na zawsze**. Dołożone `blockingHoleSlug` jako jedyne źródło danych o **drugiej stronie asymetrii** — dotąd miernik mierzył wyłącznie przestrzelenie w górę, czyli połowę problemu, na którym zbudowałam DECYZJĘ 2.
3. **§7 — punkt wejścia potwierdzony: „najgłębszy odblokowany", nie „pierwszy nieodblokowany".** Rozjazd ze zleceniem Olivera rozstrzygnięty na rzecz tego dokumentu (jego decyzja). Dopisane nazwy obu pól i zakaz nazywania któregokolwiek „punktem startu".
4. **Brama A2 — warunek ważności progu ≥3 SPEŁNIONY:** 1E.3 (mastery gate) live na prodzie od 2026-07-25 (`FLAG_MASTERY_GATE=1`), więc tania droga naprawcza przez „test out" istnieje realnie, nie tylko w projekcie.

**Changelog v0.1 → v0.2 (2026-07-26, Sophia):** trzy sprostowania faktograficzne, **zero zmian w rozstrzygnięciach** (mapa tagów, próg ≥3, reguła prefiksowa, l0-start, F1-only — bez zmian; L1 zbudowany przez Maxa na v0.1 zostaje ważny).
1. **§7 pkt 1 — poprawiony numer migracji z 0029 na 0035 (błąd niebezpieczny, zgłoszony przez Olivera).** Cytowałam migrację `competencies.verified_by_method`, gdzie zapis `'diagnostic'` jest **legalny i aktywny do dziś**, zamiast `curriculum_module_progress.verified_by_method`, która pod hybrydą faktycznie zamiera. To **dwie różne kolumny o tej samej nazwie** — dopisane wprost, bo mój zapis o mało nie wyprodukował kontrakt-testu blokującego działającą diagnozę.
2. **DECYZJA 5, tabela przypadków — „5 tagów" → 6** (`ds-python`, `ds-pandas`, `ds-eda`, `ds-sql`, `ds-uczenie-maszynowe`, `ds-llm`). Liczba w tym wierszu (≈3 na 10 milionów) była policzona dla sześciu i zostaje bez zmian — błędny był wyłącznie licznik w opisie.
3. **DECYZJA 2 — własna korekta tej samej rodziny, niezgłoszona:** pisałam, że odblokowanie `m-ml` wymaga **czterech** pomiarów (≈4 na 100 000). Z warunku braku dziury (reguła 3) wynika, że `m-ml` musi zakwalifikować się także **na własnym tagu** — czyli **pięć** pomiarów, ≈3 na milion. Ochrona jest o rząd wielkości silniejsza, niż deklarowałam; kierunek wniosku bez zmian.

**Autor:** Sophia (PO, dydaktyka) · **Data:** 2026-07-26 (v0.1–v0.3) · 2026-07-27 (v0.4) · 2026-07-30 (v0.5, v0.6) · **Status:** v0.6 — WIĄŻĄCY KONTRAKT produktowy dla slice'ów L1–L6 funkcji 1E.7 (Ethan — backend, Jack — UI, Mila — ekrany wyniku diagnozy)

## Co MUSI wejść przed zapłonem — lista zamknięta [v0.6]

Odpowiedź na pytanie Olivera. **Dwie pozycje, obie moje. Nic więcej z mojej strony nie blokuje zapłonu.**

1. **L6 — ekran wyniku diagnozy wg §7 i §8.** Rekomendacja startu liczona z **obu** źródeł dostępności (najgłębszy dostępny i niezaliczony) oraz mikrocopy w wiążącej kolejności zdań („najpierw jego praca, potem nasza diagnoza"). Bez tego ekran albo cofa studenta, albo przypisuje sobie jego pracę — a to jedyny ekran, na którym student styka się z placementem.
2. **Weryfikacja §6a przed pierwszym studentem: czy krok wyboru kompetencji (1.12) na ścieżce DS domyślnie proponuje komplet szóstki** (Python, Pandas, EDA, SQL, ML, LLM). Jeśli nie — placement po cichu nie odpala, bo diagnoza bada tylko zaznaczone kompetencje (Opcja A). **Przy 1–3 studentach pilotażu to różnica między zebraniem danych o placemencie a niezebraniem żadnych.** Nowe pole `blockingHoleReason` pokaże to w danych, ale **po** pilotażu, a pilotaż jest jedynym, jaki mamy. Jeśli poprawka nie mieści się przed zapłonem — decyzja świadoma: zapalamy wiedząc, że placement może nie odpalić, i nie wyciągamy z tego wniosków o progu.

**Świadomie NIE są blokerami:** defekt wyspy (§6e — nieosiągalny bez funkcji resetu) i reguła `skipped_by_placement` a dowód (§7 pkt 3 — żaden kod produkcyjny tego statusu nie zapisuje). Obie wiążą wykonawcę, który ruszy te obszary; żadna nie wstrzymuje pilotażu.

**Stan realizacji (2026-07-30):**
- **L1** (Max) — most danych `curriculum_modules.diagnostic_concept_id`, migracja **0044**, kontrakt ingestu na literówki w slugach; mapa tagów zweryfikowana w kodzie, zero rozbieżności. **Kolejność wdrożenia na prodzie (strażnik ingestu): migracja 0044 → ingest banku rynkowego → ingest curriculum.** Odwrotna kolejność przerywa ingest na pierwszym tagu — bezpiecznie, ale głośno.
- **L2** (Max) — reguła jako czysta funkcja, bez bazy. Równoważność z brzmieniem deklaratywnym z DECYZJI 5 **udowodniona**, nie zadeklarowana: test porównuje implementację z niezależną wersją reguł na **wszystkich 15 625 kształtach wyniku diagnozy**, dla progów 3 i 4. Sprostowanie z v0.2 (pięć pomiarów chroni `m-ml`) jest w kodzie.
- **L3** (Max) — `curriculum_placements` z pełnym werdyktem per moduł (`level`, `threshold` w chwili zapisu, `reason`, `support_mode`, `blocking_hole_slug`), wiersz niezmienny (wyzwalacz + `UNIQUE` + `ON CONFLICT DO NOTHING`), nienadpisywany przy ponownej diagnozie. Trzecia gałąź trybu wsparcia (`carried_untagged` → pełne wsparcie, powód odrębny) egzekwowana ograniczeniem bazy. **Dwa uzupełnienia z v0.4:** zdarzenie dla sesji bez odblokowań (DECYZJA 2, „Nośnik drugiej strony asymetrii") + pominięcie modułu zaliczonego (§6c).
- **L4** (Max) — drabina honoruje placement (`required.every(...) || placementUnlocked.has(...)`), W-6 i W-7 wdrożone, zdarzenie miernika w dzienniku audytowym przy **każdym** policzeniu placementu (warunek mianownika spełniony), plus dwa pola ponad zlecenie przyjęte w v0.5. **Do domknięcia w L6:** rekomendacja startu wg uogólnionej definicji z §7 (najgłębszy dostępny i niezaliczony) — dzisiejsza pomija zaliczenia.
- **L5** (Max) — dowód rozróżnia `'exam'` (student przeszedł moduł i zdał) od `'test_out'` (zdał bez ani jednej zaliczonej pozycji); dług otwarty od 2026-07-26 spłacony, na prodzie okno było puste. Dwa znaleziska rozstrzygnięte w v0.6: defekt wyspy (§6e) i `skipped_by_placement` wobec dowodu (§7 pkt 3) — **oba zapakowane jako testy pinujące, nie naprawy**.
- **Warunek ważności progu ≥3 (brama A2): SPEŁNIONY** — 1E.3 mastery gate live na prodzie od 2026-07-25 (`FLAG_MASTERY_GATE=1`), „test out" jako droga naprawcza istnieje realnie.
**Zleca:** Oliver (COO) — rozstrzygnięcia produktowe blokujące L1/L2.
**Rama nadrzędna:** decyzja Darka 2026-07-26 (sign-off) — **wariant hybrydowy: diagnoza OTWIERA, egzamin ZALICZA.** Wynik diagnozy ≥ progu → moduł **odblokowany** (zdjęty prerekwizyt), NIE zaliczony. Zaliczenie bez przechodzenia modułu = egzamin modułowy (silnik 1E.3, próg ≈90%) → `verified_by_method='test_out'`.
**Korekta ADR:** ten dokument **koryguje ADR-014 D8** (`docs/decisions/014-curriculum-sciezka-edukacyjna.md`), który zakładał, że placement ZALICZA moduły przez `verified_by_method='diagnostic'`. Powód korekty: spec diagnozy (`docs/design/skillbridge-a5-bank-pytan-diagnoza-spec-v0.2.md` §7) przyznaje rezydualną zgadywalność, a egzamin ma próg ≈90% — dwa instrumenty o różnej mocy dowodowej nie mogą dawać tego samego skutku. **Aktualizacja ADR-014 D8 = zadanie Ethana** (ADR to jego terytorium; ja rozstrzygam dydaktykę i produkt, nie przepisuję cudzego ADR-u).

> **Granica roli.** Decyduję CO i KIEDY (który moduł, przy jakim dowodzie, z jakim komunikatem). JAK technicznie (nośnik tagu w schemacie, kształt zapytania, moment liczenia) = Ethan. Tagi **[WYMÓG BACKENDU — Ethan]** i **[WYMÓG UI — Jack]** mówią, czyja jest realizacja.

**Preflight (Workflow 4, wykonany 2026-07-26):** `git log` na `docs/decisions/` + `docs/design/` — ostatnie ADR-y (022 LLM, 021 paszport, 020 M-ML, 018 M-EDA) dotyczą treści i checków modułów, zero kolizji z placementem. `git status` — drzewo robocze czyste, brak niezacommitowanych decyzji cudzych sesji. `docs/SESSION_HANDOFF.md` — 1E.7 w kolejce jako „placement — obie strony już istnieją", bez wcześniejszych rozstrzygnięć, które ten dokument mógłby unieważnić.

---

## 0. Fakty z kodu, na których stoją decyzje

Zweryfikowane czytaniem, nie z pamięci:

1. **Diagnoza zadaje DOKŁADNIE 2 pytania na kompetencję** (`src/lib/assessment/staircase.ts`, tabela §2.4 spec). Wyszukiwanie binarne po trudnościach: start na trudności 2 → poprawnie → trudność 3 (dobrze = **poziom 4**, źle = **poziom 3**); źle → trudność 1 (dobrze = **poziom 2**, źle = **poziom 1**). Tabela jest skończona — 4 trajektorie.
2. **Poziom 3 opiera się na JEDNYM poprawnym pytaniu** (trudność 2). Poziom 4 — na dwóch.
3. **Bank ma 6 pytań na koncept** (`tools/content/question-bank-ds-partia-1.json`): po dwa na trudność 1/2/3. Na trudnościach 2 i 3 **każdy koncept ma dokładnie jeden wariant `numeric` (odpowiedź liczbowa) i jeden `multi_choice` (wielokrotny wybór)**.
4. **Zgadywalność, policzona z kodu oceniania** (`src/lib/assessment/grade.ts` — `multi_choice` wymaga dokładnego dopasowania zbioru): `numeric` ≈ 0% (odpowiedź otwarta z tolerancją), `multi_choice` 4 opcje / 2 poprawne ≈ **17%** (student trafia jeden z 6 dwuelementowych podzbiorów) — 7%, jeśli strzela też rozmiarem. Wariant jest losowany deterministycznie z ziarna sesji (`plan.ts`, `fnv1a(sessionSeed:conceptSlug:difficulty)`), więc dla pojedynczego studenta to faktyczny rzut monetą, który z dwóch wariantów dostanie. **Oczekiwana szansa fałszywego trafienia na trudności 2 ≈ 8%** (połowa szans na `numeric` z zerową zgadywalnością).
5. **Skutek dla progów:** poziom ≥3 dla kogoś, kto nic nie umie, wypada z prawdopodobieństwem ≈8% na koncept; poziom 4 — ≈0,6% (dwa trafienia z rzędu).
6. **Mostu w danych nie ma.** Wszystkie pozycje curriculum wiszą na konceptach `trunk='foundations'`, diagnoza pyta o `trunk='market' AND diagnostic=true` (24 koncepty), a ingest **jawnie zabrania kolizji slugów** między pniami (`tools/ingest-curriculum.ts:171-176` — wyjątek przerywa ingest). Mapa niżej to **nowa, osobna warstwa tagów moduł → koncept diagnostyczny**, dokładnie jak zapowiada D8 („reguła rollupu"), a nie wpis do `curriculum_item_concepts`.
7. **Zakres diagnozy = Opcja A** (spec §8 pkt 2): badane są **tylko kompetencje zaznaczone przez studenta**. Kompetencja niezaznaczona albo bez pokrycia w banku → `uncovered` w `result_json`, jawna degradacja.
8. **Powtórki diagnozy = tylko re-onboarding** (spec §8 pkt 3) — w Becie nie ma przycisku „powtórz test". To założenie nośne dla decyzji 6b (monotoniczność).

---

## DECYZJA 1 — Mapa tagów: moduł → koncept diagnostyczny

Jeden tag na moduł (rollup wg D8). Slug z `trunk='market' AND diagnostic=true`.

| # | Moduł (slug) | Tytuł | Tag diagnostyczny | Siła dopasowania | Uzasadnienie dydaktyczne |
|---|---|---|---|---|---|
| 1 | `l0-start` | Start: środowisko pracy | **NULL** | — | Setup Colab i pierwsza uruchomiona komórka. To czynność, nie wiedza — nie ma konceptu rynkowego, który by ją mierzył, i nie da się jej „umieć" w oderwaniu od wykonania. Szczegóły: DECYZJA 3. |
| 2 | `f1-python-1` | Python I: zmienne, typy, warunki | **`ds-python`** | dobra | Bank na trudności 2 pyta o `len()`, sklejanie list, stwierdzenia o listach — to dokładnie warstwa „typy i wbudowane operacje", którą F1 uczy. |
| 3 | `f2-python-2` | Python II: pętle, funkcje, struktury danych | **NULL** | — | Bank `ds-python` **nie ma ani jednego pytania o pętlę ani o definiowanie funkcji** — sprawdzone pozycja po pozycji. Tag byłby deklaracją bez pokrycia w dowodzie. Szczegóły: DECYZJA 4. |
| 4 | `f3-dane-python` | Dane w Pythonie: kolekcje i rekordy | **NULL** | — | Bank nie pyta o słowniki, listę słowników ani agregaty. Dodatkowo moduł wieńczy **mini-projekt transferowy** (ADR-014 D3, pkt 12b) — miara transferu wprowadzona właśnie dlatego, że „mastery pytań zamkniętych nie transferuje do kodu". Pytanie zamknięte nie może zastąpić artefaktu, który istnieje z powodu niewydolności pytań zamkniętych. |
| 5 | `m-pandas` | Pandas: dane w tabelach | **`ds-pandas`** | bardzo dobra | Bank: `df["b"].mean()`, `dropna()` z domyślnymi parametrami, `loc`/`iloc`, liczba wierszy po `merge(how="inner")`. Moduł: DataFrame, selekcja, braki danych, grupowanie. Pokrycie niemal 1:1. |
| 6 | `m-eda` | EDA: od API do repozytorium | **`ds-eda`** | dobra | Bank: reguła IQR i wartości odstające, obsługa braków, interpretacja korelacji, pułapki agregacji — rdzeń przebiegu EDA. **Świadomie NIE `ds-git`**, choć moduł uczy Gita: Git wchodzi tu „na czas" (just-in-time, ADR-014 D10 pkt 9) jako narzędzie, nie jako cel modułu. Student, który zna Gita, ale nie zna EDA, ma przejść ten moduł. |
| 7 | `m-sql` | SQL: analiza danych w bazie | **`ds-sql`** | dobra | Bank: `COUNT(*)` z `WHERE`, `ORDER BY`/`LIMIT`, złączenia (JOIN), liczba wierszy złączenia. Moduł: od tabeli i `SELECT` po agregacje. **Ograniczenie:** bank nie sprawdza funkcji okna, których wymaga rubryka capstone'u (D10) — pod wariantem hybrydowym to nieszkodliwe, bo odblokowanie nie zalicza capstone'u. |
| 8 | `m-ml` | Pierwszy model predykcyjny | **`ds-uczenie-maszynowe`** | bardzo dobra | Bank: macierz pomyłek i dokładność, przeuczenie, wyciek danych, pułapka dokładności przy niezbalansowanych klasach. Moduł: baseline, walidacja, wyciek danych, metryki. Pokrycie niemal 1:1 — to najlepiej dopasowana para w całej drabinie. |
| 9 | `m-llm` | LLM: ekstrakcja strukturalna | **`ds-llm`** | **słaba — do rewizji jako pierwsza** | Bank pyta o RAG kontra dostrajanie modelu, arytmetykę okna kontekstu, ograniczanie halucynacji i **liczbę parametrów warstwy transformera** — to wiedza ogólna o modelach językowych, a moduł uczy strukturalnego wyjścia i ewaluacji względem wzorca (ground truth). Zostawiam tag, bo to jedyny kandydat i moduł jest ostatni w drabinie (chroni go pełen prefiks **5** wcześniejszych pomiarów), ale oznaczam jako pierwszy do przeglądu przy rozbudowie banku. |

**Koncepty diagnostyczne bez modułu** (15 z 24): `ds-git`, `ds-numpy`, `ds-statystyka`, `ds-ab-testing`, `ds-azure`, `ds-databricks`, `ds-gcp`, `ds-aws`, `ds-snowflake`, `ds-genai`, `ds-mlops`, `ds-nlp`, `ds-ci-cd`, `ds-kubernetes`, `ds-spark`, `ds-pyspark`, `ds-terraform`, `ds-kafka`. To poprawny stan — pilotaż obejmuje poziom L1, a te koncepty żyją na poziomie L2+ (wymagają kont zewnętrznych, D10). Wysoki wynik na `ds-kubernetes` **nie odblokowuje niczego** i tak ma zostać.

**[WYMÓG BACKENDU — Ethan]** Tag to atrybut MODUŁU (nowa warstwa), nie pozycji. Nośnik (kolumna w tabeli modułów, tabela mapująca, pole w manifeście drabiny) = Twoja decyzja techniczna. Warunek produktowy: **tag musi być danymi, nie stałą w kodzie** — mapa będzie się zmieniać przy każdej nowej ścieżce i przy rozbudowie banku, a zmiana mapy nie może wymagać wdrożenia kodu. Wartość `NULL` musi być odróżnialna od „tagu nieustawionego jeszcze" (brak wpisu = błąd konfiguracji do wyłapania kontrakt-testem; jawny `NULL` = decyzja).

---

## DECYZJA 2 — Próg odblokowania: **poziom ≥ 3**, a poziom 3 kontra 4 steruje trybem wsparcia

**Rozstrzygnięcie:** moduł kwalifikuje się do odblokowania przy **poziomie 3 lub 4** na swoim koncepcie diagnostycznym. Potwierdzam kierunek domyślny.

**Tryb wsparcia — trzy gałęzie, lista wyczerpująca** (bezpośrednie użycie C7/C8 z D8: „wejście w moduł graniczny od fazy completion, nigdy od zera wsparcia; przy niepewności domyślnie dawaj wsparcie"):

| Jak moduł się otworzył | Tryb wsparcia | Powód |
|---|---|---|
| **Poziom 4** na własnym tagu | normalne wygaszanie wsparcia (fading) | Dwa trafione pytania, w tym trudniejsze. Pomiar bezpośredni i najmocniejszy, jaki mamy. |
| **Poziom 3** na własnym tagu | **pełne wsparcie** (moduł graniczny) | Jedno trafione pytanie. Pomiar bezpośredni, ale słaby — niepewność wysoka. |
| **Brak własnego pomiaru** — wciągnięty prefiksem (`f2-python-2`, `f3-dane-python`) | **pełne wsparcie**, powód zapisany ODRĘBNIE | Dowód wyłącznie pośredni (DECYZJA 4: kto robi `merge`, ten umie pętle). Wnioskowanie jest mocne, ale to nadal wnioskowanie — nie zmierzyliśmy tego modułu ani razu. |

**Dlaczego trzecia gałąź nie jest zlana z poziomem 3, skoro tryb jest ten sam.** Bo **powód musi zostać w danych rozdzielony** — inaczej miernik z końca tej sekcji przestaje odróżniać dwie różne decyzje, które mogą się zepsuć niezależnie i wymagają przeciwnych napraw:

- studenci odblokowani na **poziomie 3** oblewają egzaminy → za niski **próg** (DECYZJA 2) → naprawa: podnieś próg do 4;
- studenci wchodzący w moduły **wciągnięte prefiksem** oblewają egzaminy → za luźna **reguła przeciągania** (DECYZJA 5, przejrzystość tagów `NULL`) → naprawa: F2/F3 przestają jechać z prefiksem, a nie zmiana progu.

Zlanie obu w jedno „pełne wsparcie" bez rozróżnienia powodu sprawiłoby, że w razie problemu zobaczyłabym objaw i nie wiedziała, którą decyzję cofnąć. **Max postąpił słusznie, zostawiając `null` zamiast podstawiać „pełne wsparcie" po cichu** — reguła nie miała tej gałęzi, a cicha wartość domyślna zabiłaby to rozróżnienie, zanim ktokolwiek by je zauważył.

### Który błąd jest droższy przy zerze studentów i pilotażu DS

**Droższe jest fałszywe odblokowanie** — i to nie jest bliska decyzja. Powody:

- **Porzucenie jest ciche i nieodwracalne.** Student, który wpadł do modułu ponad swój poziom, nie zgłasza tego — po prostu przestaje wracać. Przy pilotażu rzędu 1–3 studentów (czerwona linia domknięcia Fazy 1) utrata jednego to utrata jednej trzeciej sygnału, i to sygnału, którego już nie odzyskamy: nie wiemy, czy odpadł przez placement, przez treść, czy przez życie.
- **Nuda jest głośna i ma gotową drogę wyjścia.** Student, który przerabia rzeczy, które umie, mówi to wprost albo klika **„test out"** — przycisk jest przy każdym zablokowanym module z mocy D3. Ta droga produkuje dokładnie ten dowód, którego chcemy (zdany egzamin na ≈90%), więc błąd „za mało odblokowane" **sam się naprawia i przy okazji generuje dane**.
- **Persona pilotażu to „literalne zero"** (ADR-014, kontekst). Dla niej placement prawie nie strzela — wszystko wyjdzie na poziomie 1. Placement obsługuje mniejszość: przebranżowiających się z częściową wiedzą. Dla nich przestrzelenie w górę to najgorsze możliwe pierwsze wrażenie.

### Dlaczego mimo to NIE podnoszę progu do 4

Trzy powody, każdy wystarczający:

1. **Kolizja z ratyfikowaną semantyką mapy kompetencji.** `levelToStatus` (decyzja Darka 2026-06-01, ratyfikowana) mapuje poziomy **3 i 4 na `acquired`** — „opanowana". Próg 4 dla placementu produkuje sprzeczność widoczną na jednym ekranie: mapa kompetencji mówi „SQL opanowany", a drabina trzyma moduł SQL zablokowany. Student zgłosi to jako błąd i będzie miał rację. Rozbieżność dwóch liczników tej samej rzeczy kosztuje więcej zaufania niż jedno zbędne odblokowanie.
2. **Ochronę niesie reguła prefiksowa, nie próg.** Przy progu 3 fałszywe odblokowanie jednego konceptu ma szansę ≈8%. Ale żeby otworzyć `m-ml`, trzeba przejść próg na **pięciu niezależnych pomiarach**: `ds-python`, `ds-pandas`, `ds-eda`, `ds-sql` (prefiks) **oraz `ds-uczenie-maszynowe`** — bo warunek braku dziury (DECYZJA 5, reguła 3) wymaga kwalifikacji także od samego `m-ml`. To ≈0,08⁵ ≈ **3 na milion**. Głęboki przeskok, czyli jedyny naprawdę kosztowny, jest chroniony strukturalnie. Podnoszenie progu dokładałoby ochronę tam, gdzie już jej mamy w nadmiarze, a odbierałoby funkcję tym nielicznym, którym ona służy.
3. **Stawka pojedynczego błędu spadła wraz z wariantem hybrydowym.** Pod pierwotnym D8 fałszywy poziom 3 **zaliczał** moduł — trwała dziura w fundamentach plus wpis w postępie. Dziś ten sam błąd otwiera tylko nawigację: nic nie jest zaliczone, wszystkie moduły niżej zostają dostępne, a żeby cokolwiek policzyło się jako zaliczone, i tak trzeba przejść moduł albo zdać egzamin na ≈90%. Ostrożność, która była konieczna przy „diagnoza zalicza", jest przy „diagnoza otwiera" przepłacona.

### Gdzie w zamian dokładam ostrożność (bez ruszania progu)

Ryzyko przenoszę na mechanizmy, które nie psują funkcji: reguła prefiksowa (DECYZJA 5), tag tylko na F1 (DECYZJA 4), `l0-start` nigdy nie pomijany (DECYZJA 3), `uncovered` nigdy nie kwalifikuje (§6a), wsparcie domyślnie włączone przy poziomie 3 (wyżej) i rekomendacja punktu wejścia zamiast wymuszonego skoku (§7).

**[WYMÓG BACKENDU — twardy, slice L3] Miernik weryfikujący ten próg** (instrumentacja D11). **L3 zapisuje pełny werdykt per moduł, nie samą listę odblokowanych slugów.** To wymóg blokujący, nie życzenie: lista slugów jest zapisem *skutku* bez *przesłanki*, a przesłanka jest dokładnie tą zmienną, którą testuję. Zapisana lista bez poziomów **kasuje możliwość weryfikacji progu na zawsze** — danych z pilotażu nie da się odtworzyć wstecz, bo `result_json` tamtej sesji będzie już przeliczony inną mapą tagów i innym progiem.

Pola i uzasadnienie każdego (reguła L2 niesie już komplet):

| Pole | Po co, konkretnie |
|---|---|
| `level` | Rdzeń pomiaru: oblewalność pierwszego egzaminu modułu dla odblokowanych na 3 kontra na 4. Bez tego nie ma czego z czym porównać. |
| `reason` (własny pomiar / wciągnięty prefiksem) | Rozdziela DECYZJĘ 2 od DECYZJI 5 — dwie różne naprawy (patrz tabela trybów wsparcia wyżej). |
| `threshold` obowiązujący w chwili zapisu | Gdy podniosę próg do 4, rekordy sprzed zmiany bez tego pola stają się nieczytelne, a porównanie „przed/po" niemożliwe. To także wymóg audytowalności z §7 pkt 2. |
| `blockingHoleSlug` | Który moduł uciął prefiks tej sesji. **Uwaga: na wierszu pokrywa wyłącznie sesje, w których coś się otworzyło** — pełny nośnik niżej. |
| `supportMode` | Pełne wsparcie przy poziomie 3 to **moja** mitygacja ryzyka. Jeśli nie zmienia wyników, mam ją wycofać zamiast utrzymywać. |
| id sesji diagnozy + znacznik czasu | Audytowalność (§7 pkt 2) i powiązanie werdyktu z konkretnym pomiarem. |

**Zapis w chwili odblokowania, nigdy przeliczany wstecz** (§7 pkt 2) i **nienadpisywany przy ponownej diagnozie** — przy monotoniczności z §6b druga diagnoza dokłada odblokowania, ale **nie wolno jej przepisać powodu, dla którego moduł otworzył się za pierwszym razem**; inaczej miernik gubi pierwotny poziom i mierzy skutek własnej aktualizacji.

**Próg alarmowy: jeśli studenci odblokowani na poziomie 3 oblewają pierwsze podejście istotnie częściej niż odblokowani na poziomie 4 — podnoszę próg do 4.** Bez tego zapisu „≥3" pozostaje przekonaniem, a nie decyzją opartą na danych; przy zerze studentów mam dziś wyłącznie przekonanie i arytmetykę, i jest to jedyny sposób, żeby to zmienić.

### Nośnik drugiej strony asymetrii — zdarzenie, nie kolumna [rozstrzygnięte v0.4]

**Mój błąd z v0.3:** napisałam, że `blockingHoleSlug` daje mi drugą stronę asymetrii. Nie daje — pole żyje na wierszu, a wiersz powstaje wyłącznie wtedy, gdy coś się otworzyło (`placement-service.ts:218-220`: przy zerze odblokowań `written: 0`, `outcome` odrzucony). **Sesja, w której placement nie otworzył nic, to najczystszy przypadek niedoszacowania, jaki istnieje — i właśnie ona nie zostawiała śladu.** Pole sugerowało pokrycie, którego nie było; to gorsze niż jego brak, bo uśpiłoby czujność przy pierwszym przeglądzie danych z pilotażu.

**Rozstrzygnięcie: przyjmuję rekomendację Ryana — nośnikiem jest zdarzenie w `audit_log`, nie dodatkowy wiersz w `curriculum_placements`.** Uzasadnienie mam własne, produktowe, i zbieżne z jego zasadą: tabela placementów jest **nośnikiem uprawnienia** — obowiązuje w niej niezmiennik „moduł otwarty ⟺ istnieje wiersz". Wpuszczenie do niej wiersza, który niczego nie otwiera, psuje jedyne zdanie, jakim tę tabelę da się opisać studentowi i audytorowi. Dokłada się do tego dowód z kodu: `blockingHoleSlug` jest tam opisany wprost jako „migawka wspólna dla całego zapisu" — czyli **fakt o sesji zduplikowany na wiersze o modułach**. Sam kod mówi, że to dana sesyjna; zdarzenie jest jej właściwym miejscem.

**[WYMÓG — Ethan/Ryan] Zdarzenie powstaje przy KAŻDYM policzeniu placementu, także gdy nic się nie otworzyło.** To warunek nośny, nie preferencja: same zdarzenia „zero odblokowań" bez zdarzeń „coś się otworzyło" **nie mają mianownika** — nie odróżnię „placement nie odpala się nigdy" od „placement odpala się zwykle, ale ta grupa wypadła słabo". Jedno zdarzenie na diagnozę to wolumen pomijalny.

Zdarzenie ma pozwolić odpowiedzieć na trzy pytania **bez łączenia z czymkolwiek innym**:

1. **Jak często placement w ogóle odpala?** → liczba odblokowanych modułów (w tym zero).
2. **Gdzie się zatrzymuje?** → `blockingHoleSlug` + obowiązujący `threshold`.
3. **Czy student był daleko, czy o włos?** → poziom na koncepcie blokującym. Poziom 1 znaczy „faktycznie nie umie" i potwierdza regułę; **ściana poziomów 2 na tym samym module znaczy, że nasze pytanie o trudności 2 jest za trudne** — wtedy naprawiam bank, a nie próg. Bez tej jednej liczby oba przypadki wyglądają identycznie.

Kształt zdarzenia i minimalizacja danych — Ryan (konsekwencję RODO bierze na siebie). Poziom kompetencji nie jest nową kategorią danych: leży już w `result_json` tej samej sesji.

**[v0.5] Przyjmuję dwa pola dołożone przez Maxa ponad zlecenie — oba są nośne i oba zamykają dziury, których nie zauważyłam:**

- **`blockingHoleReason`** — odróżnia „zmierzyliśmy, wypadł słabo" od „**nie badaliśmy tej kompetencji**". To dwie różne naprawy: pierwsza to kalibracja banku pytań, druga to domyślny zestaw kompetencji w onboardingu, czyli **ryzyko, które sama zgłosiłam w §6a** i zostawiłam bez pomiaru. Bez tego pola §6a pozostaje przeczuciem — z nim widzę, ilu studentów traci placement przez własny wybór na wcześniejszym kroku, a nie przez brak wiedzy.
- **`alreadyCompletedCount`** — odróżnia zero odblokowań u studenta z **zaliczoną drabiną** od zera u kogoś, kto nic nie umie. Bez tego oba stany są w danych identyczne, a znaczą rzeczy przeciwne: pierwszy to placement działający poprawnie (nie ma czego otwierać), drugi to placement, który nie zadziałał. Zliczenie ich razem zawyżałoby „placement nic nie daje" o przypadki, w których nie miał nic do dania.

**Kolumna `blockingHoleSlug` na wierszach:** zostaje albo znika — decyzja Ethana/Maxa, jest już zbudowana i w review. Warunek jedyny: **po wprowadzeniu zdarzenia nie wolno jej cytować jako pokrycia niedoszacowania.** Źródłem prawdy dla tej analizy jest zdarzenie.

---

## DECYZJA 3 — `l0-start`: **nigdy nie odblokowywany placementem**

**Rozstrzygnięcie:** potwierdzam kierunek domyślny. `l0-start` nie ma tagu i **żaden wynik diagnozy go nie pomija ani nie zalicza**. Jednocześnie moduł jest korzeniem drabiny — nic go nie blokuje, więc jest dostępny dla każdego od pierwszej sekundy, niezależnie od placementu.

**Uzasadnienie dydaktyczne:**

1. **Nie ma czego pomijać.** To 4 atomy-listy kontrolne, zaliczane przez wykonanie, wariant lekki, bez egzaminu (D10). Koszt przejścia ≈15 minut — poniżej progu, przy którym pomijanie w ogóle się opłaca.
2. **Brak egzaminu = brak drogi awaryjnej.** Każdy inny moduł ma „test out". `l0-start` nie ma, bo nie da się egzaminem zamkniętym sprawdzić, czy komuś działa notebook. Gdyby placement go pomijał, nie istniałby żaden mechanizm domykający tę lukę.
3. **Wszystko powyżej na nim wisi fizycznie.** Laby uruchamiają kod w Colab. Student wrzucony placementem prosto do `m-pandas` bez działającego środowiska nie odbija się od pandasa — odbija się od pustego ekranu, a winę przypisze produktowi. To najtańszy do uniknięcia wariant porzucenia, jaki mamy.
4. **Weryfikacja przez wykonanie jest niezastępowalna.** Diagnoza mierzy wiedzę deklaratywną. „Mam uruchomiony notebook" to fakt o stanie świata, nie o wiedzy — nie ma pytania testowego, które by go stwierdziło.

**[WYMÓG UI — Jack]** Student z odblokowanym prefiksem widzi na ekranie wyniku diagnozy **`l0-start` jako rekomendowany pierwszy krok**, nawet jeśli placement otworzył mu `m-sql`. Mikrocopy w §8.

---

## DECYZJA 4 — F1/F2/F3 kontra jeden koncept „Python": **tag tylko na F1**

**Rozstrzygnięcie:** `ds-python` taguje **wyłącznie `f1-python-1`**. `f2-python-2` i `f3-dane-python` mają `NULL` i **nigdy nie kwalifikują się samodzielnie**. Wchodzą do odblokowanego prefiksu tylko wtedy, gdy odblokuje je moduł głębszy, który zakwalifikował się na własnym pomiarze (DECYZJA 5).

**Uzasadnienie dydaktyczne — trzy niezależne argumenty:**

1. **Bank fizycznie nie mierzy tego, czego uczą F2 i F3.** Przeszłam wszystkie 6 pozycji `ds-python`: `len()`, sklejanie list, stwierdzenia o listach, mutowalność, aliasowanie (`b = a; b.append(4)`). **Zero pytań o pętlę. Zero o definiowanie funkcji. Zero o słowniki, listę słowników i agregaty.** F2 to pętle, funkcje i struktury danych; F3 to kolekcje, rekordy i agregaty. Rozciągnięcie jednego tagu na trzy moduły to twierdzenie o wiedzy, której nie zmierzyliśmy — dokładnie ten błąd, przez który samoocena była bezwartościowa i przez który w ogóle budujemy diagnozę.
2. **Jeden pomiar nie może otwierać trzech modułów, bo obchodzi ochronę prefiksową.** Cała odporność tego projektu na fałszywe trafienie bierze się z tego, że głęboki przeskok wymaga wielu niezależnych pomiarów. Trzy moduły na jednym pytaniu (≈8% szansy na ślepy strzał) to jedyna luka w tej konstrukcji — i to luka w najbardziej wrażliwym miejscu, bo w fundamentach, na których stoi wszystko dalej.
3. **F3 wieńczy mini-projekt transferowy — miarę wprowadzoną właśnie przeciw pytaniom zamkniętym.** ADR-014 D3 (pkt 12b) dodał go z uzasadnieniem, że „mastery pytań zamkniętych nie transferuje do kodu". Pominięcie F3 na podstawie dwóch pytań zamkniętych byłoby użyciem instrumentu do zastąpienia artefaktu, który istnieje wyłącznie dlatego, że ten instrument nie wystarcza. To sprzeczność wewnętrzna, nie kompromis.

**Dlaczego mimo to F2 i F3 nie blokują nikogo na zawsze:** student, który potrafi zrobić `merge` w pandas i przeczytać `loc`/`iloc`, dowiódł pętli, funkcji i słowników **pośrednio, ale mocniej** niż jakiekolwiek pytanie o pętlę — praca w pandas jest bez nich niewykonalna. Dlatego kwalifikacja `m-pandas` przeciąga F2 i F3 do prefiksu (DECYZJA 5). Kompetencja pochodna otwiera fundament, ale fundament nie otwiera sam siebie w trzech krokach naraz.

**Skutek dla studenta znającego wyłącznie Pythona** (poziom 3–4 na `ds-python`, reszta niska): odblokowane `f1-python-1`, punkt wejścia = F1. F2 i F3 przechodzi albo wyklikuje „test out" — dwa egzaminy na ≈90%, uczciwa cena za pominięcie dwóch modułów, których nie zmierzyliśmy.

---

## DECYZJA 5 — Reguła prefiksowa: **POTWIERDZAM**, z jednym doprecyzowaniem

Reguła Olivera („odblokowujemy wyłącznie ciągły prefiks drabiny, żadnych modułów-dziur") jest **słuszna i jest głównym mechanizmem bezpieczeństwa tego projektu** — to ona, a nie próg, sprowadza ryzyko głębokiego przeskoku do rzędu 4 na 100 000. Potwierdzam bez zastrzeżeń co do zasady.

**Doprecyzowanie, bez którego reguła zabija funkcję:** w naiwnym brzmieniu („odblokowujemy prefiks modułów, które się kwalifikują") moduły z tagiem `NULL` nigdy się nie kwalifikują, więc prefiks zawsze zatrzymuje się na `f1-python-1` — i `m-pandas`, `m-sql`, `m-ml`, `m-llm` nie odblokowałyby się **nigdy, nikomu**. Placement stałby się funkcją otwierającą wyłącznie najłatwiejszy moduł drabiny. Kluczowe rozróżnienie: **`NULL` znaczy „nie zmierzyliśmy", nie „student nie umie".** Blokada wynikająca z dziury w naszym instrumencie karałaby studenta za naszą lukę pomiarową.

### Reguła w brzmieniu wiążącym

Drabina jest liniowa i ponumerowana: 1 `l0-start` · 2 `f1-python-1` · 3 `f2-python-2` · 4 `f3-dane-python` · 5 `m-pandas` · 6 `m-eda` · 7 `m-sql` · 8 `m-ml` · 9 `m-llm`.

1. **Moduł kwalifikuje się** ⟺ ma tag diagnostyczny (nie `NULL`) **i** `result_json.concepts[tag].level ≥ 3`. Brak pomiaru, `uncovered`, brak sesji — nie kwalifikuje się. **Wyjątek [v0.4]:** moduł **zaliczony** (`exam`/`test_out`) liczy się jako spełniający próg niezależnie od diagnozy — §6c.
2. Niech **k** = pozycja **najgłębszego kwalifikującego się** modułu. Brak takiego → **nic nie odblokowane**, student startuje od `l0-start`.
3. **Warunek braku dziury:** jeśli którykolwiek **otagowany** moduł na pozycjach 2…k się nie kwalifikuje, **k cofa się** na pozycję tuż przed pierwszym takim modułem. Powtarzaj, aż prefiks będzie wolny od dziur.
4. **Odblokowane = moduły na pozycjach 2…k.** Moduły z `NULL` leżące wewnątrz prefiksu jadą z nim.
5. **Moduł z `NULL` nigdy nie wyznacza k** — nie przedłuża prefiksu poza ostatni moduł potwierdzony własnym pomiarem.
6. **`l0-start` (pozycja 1) nigdy nie jest odblokowywany** (DECYZJA 3). Nie blokuje też prefiksu — jest korzeniem drabiny, dostępnym zawsze.

### Sprawdzenie reguły na przypadkach

| Wynik diagnozy | k | Odblokowane | Ocena |
|---|---|---|---|
| Wszystko poziom 1–2 | — | nic | Student zaczyna od `l0-start`. Zgodne z D8 („student bez diagnozy = moduł L0"). |
| `ds-python`=4, reszta niska | 2 | `f1-python-1` | DECYZJA 4 spełniona — jeden pomiar otwiera jeden moduł. |
| `ds-python`=4, `ds-pandas`=4, reszta niska | 5 | F1, F2, F3, `m-pandas` | F2/F3 przeciągnięte kompetencją pochodną. Wymagało **dwóch** niezależnych pomiarów. |
| `ds-pandas`=4, `ds-python`=1 | — | nic | **Kluczowy przypadek ochronny.** Pandas bez Pythona jest niewiarygodny — dziura na pozycji 2 cofa prefiks do zera. Dokładnie po to reguła powstała. |
| `ds-python`=4, `ds-pandas`=4, `ds-eda`=1, `ds-sql`=4 | 5 | F1, F2, F3, `m-pandas` | SQL wysoki, ale EDA to dziura na pozycji 6 → prefiks staje na 5. Student wchodzi w `m-eda` normalnie albo wyklikuje „test out". Uczciwe: EDA jest w tej drabinie prerekwizytem SQL-a, nie ozdobą. |
| Wszystkie 6 tagów ≥3 | 9 | cała drabina poza `l0-start` | Wymaga **6** niezależnych pomiarów (`ds-python`, `ds-pandas`, `ds-eda`, `ds-sql`, `ds-uczenie-maszynowe`, `ds-llm`); ślepym trafem ≈0,08⁶ ≈ 3 na 10 milionów. |

---

## 6. Przypadki brzegowe — rozstrzygnięte, żeby nikt ich nie zgadywał

**a) `uncovered` (kompetencja niezaznaczona lub bez pokrycia w banku) → NIE kwalifikuje, traktowana jak dziura.** Brak pomiaru nie jest dowodem opanowania. **Ryzyko produktowe, które z tego wynika:** przy Opcji A student sam wybiera badane kompetencje, więc student, który zaznaczy tylko „SQL", dostanie placement pusty i nie zrozumie dlaczego. **[WYMÓG UI — Jack]** wynik diagnozy musi nazwać powód wprost (mikrocopy §8), a **[do sprawdzenia w 1.12 — Mila/Ethan]** krok wyboru kompetencji na ścieżce DS powinien domyślnie proponować komplet konceptów drabiny (Python, Pandas, EDA, SQL, ML, LLM) — inaczej placement po cichu nie działa i wyjdzie to dopiero na pilotażu.

**b) Ponowna diagnoza (re-onboarding) → odblokowania są monotoniczne: nigdy nie odbieramy tego, co już otwarte.** Zabranie dostępu do modułu, w którym student może być w połowie, to kara za skorzystanie z naszej funkcji. Nowy wynik liczymy i **sumujemy** z dotychczasowym zbiorem odblokowań. **Warunek nośny:** to jest bezpieczne **wyłącznie dopóki nie ma przycisku „powtórz test"** (spec §8 pkt 3 — powtórki tylko przy re-onboardingu). Powtarzalna diagnoza plus monotoniczność to maszyna do zbierania odblokowań po ≈8% za podejście. **Jeśli powtórki kiedykolwiek wejdą do UI — ta decyzja wymaga rewizji** (wtedy: licz wyłącznie z najnowszej sesji). Zapisuję to jako jawną zależność, nie jako założenie w tle.

**c) Moduł już zaliczony (`exam` / `test_out`) → placement go POMIJA: bez wiersza, bez komunikatu, bez zmiany statusu.** [doprecyzowane v0.4 — w v0.1 było „nie dotyka", co dało się przeczytać jako „nie zmienia statusu, ale zapisuje"; L3 zapisywał wiersz.] Potwierdzam kierunek Ryana (warunek W-6). Trzy powody, dwa poza miernikiem:

1. **To jest tekst do studenta, nie tylko dane.** Pola `reason`, `supportMode` i `blockingHoleSlug` są wprost treścią mikrocopy z §8. Wiersz dla modułu zdanego egzaminem produkuje komunikat „diagnoza otworzyła ci moduł **{X}**" o module, który student **sam zdał na ≈90%**. To przypisanie produktowi cudzej pracy — i trafia w osobę, która właśnie zrobiła najtrudniejszą rzecz, jaką platforma oferuje. Nie ma gorszego adresata takiego zdania.
2. **Miesza dwie waluty, które hybryda rozdziela.** Cała rama brzmi „diagnoza OTWIERA, egzamin ZALICZA". Opisanie zaliczenia językiem otwarcia degraduje mocny dowód (egzamin, ≈90%, 15–20 pytań) do słownika słabego (dwa pytania). Raz zrobione, kasuje różnicę, którą tłumaczymy studentowi w każdym innym miejscu.
3. **Niezmiennik nośnika.** „Moduł otwarty ⟺ istnieje wiersz" — moduł zaliczony nie potrzebuje uprawnienia do wejścia, więc wiersza nie ma. Wariant „zapisz z flagą no-op" słusznie odrzucony: wpuszcza do tabeli nośnikowej wiersze, które nośnikami nie są, i rozjeżdża uzasadnienie retencji.

**Co student widzi na jego temat w komunikacie o placemencie: nic.** Moduł zaliczony pokazuje na drabinie swój własny stan („zaliczony — egzamin"), niezależny od diagnozy i wcześniejszy od niej.

**[ROZSTRZYGNIĘTE v0.5 — W-7] Moduł zaliczony WYZNACZA k, nie tylko „nie robi dziury".** Potwierdzam odczyt Maxa. Trzy powody:

1. **Zgodność z zasadą, która stoi za regułą 5.** Odmawiam `NULL`-owi prawa wyznaczania k **nie dlatego, że nie ma tagu**, tylko dlatego, że `NULL` znaczy **niezmierzony** — a k ma sięgać najgłębiej potwierdzonego miejsca. Moduł zaliczony jest zmierzony, i to instrumentem najmocniejszym z posiadanych (15–20 pytań, ≈90%) — przeciwieństwem `NULL`. Odmówienie mu prawa wyznaczania k byłoby stosowaniem litery reguły przeciw jej własnemu uzasadnieniu.
2. **Zarzut o transfer nie bije w tę decyzję.** Owszem, pisałam (DECYZJA 4), że mastery pytań zamkniętych nie transferuje do kodu — ale to argument przeciw **zaliczaniu** modułu pytaniami zamkniętymi. Tu nic się nie zalicza: `f2-python-2` i `f3-dane-python` zostają **otwarte i niezaliczone**, a żeby je zaliczyć, student i tak musi je przejść albo zdać ich egzaminy. Otwarcie ≠ zaliczenie; to ta sama granica, na której stoi cała hybryda.
3. **Stawka bliska zeru i asymetryczna na korzyść otwarcia.** Moduły wciągane przez zaliczony `m-pandas` leżą **poniżej** niego, więc nie są drogą naprzód — ścieżka w górę i tak jest otwarta łańcuchem (`m-pandas` zaliczony ⟹ `m-eda` dostępne). Jedyna realna konsekwencja to możliwość **cofnięcia się po brakującą podstawę** bez zaliczania wcześniejszych modułów. Odmowa kosztowałaby student, który chce uzupełnić lukę, przymus przechodzenia `f1` od zera; otwarcie nie kosztuje nic.

**Świadomie NIE dokładam osobnego powodu** dla modułu wciągniętego przez moduł *zaliczony* (kontra wciągniętego przez *zdiagnozowany*). Rozdzielałam powody w v0.3 tam, gdzie różne przyczyny wymagają różnych napraw — tutaj stawka jest bliska zeru (moduły poniżej już zdobytego punktu), a gdyby `f2`/`f3` zaczęły oblewać, sygnał i tak przyjdzie z `reason='carried_untagged'`. Trzecia gałąź dołożona „na wszelki wypadek" kosztuje ograniczenie w bazie i nic nie odpowiada.

**Warunek ciągłości — bez zmian od v0.4:** moduł zaliczony SPEŁNIA go i nigdy go nie łamie. Reguła L2 zna wyłącznie wynik diagnozy (`computePlacement` bierze `concepts` + `uncovered`), więc dziś student, który zdał `m-eda` egzaminem, a potem przy re-onboardingu wypadł na `ds-eda` słabo, dostaje **dziurę na module, który ma zaliczony** — i prefiks ucina się przed wszystkim powyżej. To słaby instrument unieważniający mocny, czyli odwrotność zasady, na której stoi cała hybryda. **Reguła produktowa: moduł ze statusem zaliczonym traktujemy jak spełniający próg, niezależnie od poziomu z diagnozy.**

Sposób realizacji zostawiam Ethanowi/Maxowi — funkcja może zostać czysta, jeśli dostanie zbiór modułów zaliczonych jako wejście (tak jak dostaje próg). **Pilność:** nie blokuje L4/L5; zapala się dopiero przy diagnozie **po** zaliczeniu jakiegoś modułu, czyli w ścieżce re-onboardingu — ale to jest dokładnie ta ścieżka, w której diagnoza wraca do studenta z historią. Proponuję traktować jak W-7 i domknąć przed zapłonem; ostateczną ocenę pilności zostawiam Tobie i Ryanowi.

**d) Student bez ukończonej diagnozy → zero odblokowań, start od `l0-start`.** Bez zmian wobec D8. Sesja porzucona lub niedokończona (trajektorie krótsze niż 2 kroki — `levelFromTrajectory` zwraca `null`) traktowana jak brak pomiaru dla tych konceptów, nie jak poziom 1.

**e) Reset / powtórzenie modułu (defekt wyspy) → reset zeruje ZALICZENIE, nigdy DOSTĘPNOŚĆ.** [rozstrzygnięte v0.6]

**Stan faktyczny (zmierzony, nie hipotetyczny):** po skasowaniu wiersza postępu modułu zaliczonego **wewnątrz** prefiksu drabina daje `l0-start=available, f1=available, f2=LOCKED, m-pandas=available` — `f2` jest wyspą, zablokowaną między dwoma otwartymi modułami. Mechanizm wynika wprost z W-6, które zatwierdziłam: moduł zaliczony świadomie nie dostaje wiersza placementu, więc jego dostępność stoi **na jednej nodze** — na wierszu postępu. Nie ma dziś ścieżki produkcyjnej, która ten wiersz kasuje; zapali to pierwsza funkcja „reset modułu" albo „powtórz moduł".

**Odrzucam obie zaproponowane drogi:**

- **(a) przeliczanie placementu przy kasowaniu postępu** — łamie niezmiennik, o który walczyłam w v0.3/v0.4: „zapis w chwili odblokowania, nigdy przeliczany wstecz, nienadpisywany". `threshold` z chwili zapisu przestałby być jednoznaczny, a późniejsza zmiana mapy tagów po cichu przepisywałaby historię. To kasuje mój miernik, żeby naprawić defekt niedostępny dla użytkownika.
- **(b) świadoma dziura z komunikatem „ten moduł masz do przejścia od nowa"** — moduł jest **zablokowany**, więc komunikat obiecuje czynność, której produkt nie pozwala wykonać. Uczciwe nazwanie defektu nie czyni go akceptowalnym: student, który świadomie zresetował moduł, zostaje ukarany za skorzystanie z funkcji, którą mu daliśmy.

**Reguła produktowa (wiążąca dla przyszłej funkcji resetu): dostępność raz przyznana jest monotoniczna.** Reset kasuje **dowód zaliczenia**, a nie **prawo wejścia** — to ta sama zasada, którą zapisałam w §6b („placement nigdy nie odbiera"), zastosowana do innego mechanizmu. Skutek: moduł po resecie ma być `available`, nie `locked`, i żaden wiersz placementu nie musi powstawać.

**[WYMÓG BACKENDU — Ethan/Max, przy budowie resetu]** Najprostsza realizacja spójna z tą regułą: **reset zmienia status wiersza postępu (`completed` → `available`/`in_progress`), zamiast kasować wiersz.** Wtedy wyspa nie powstaje, placement nie jest przeliczany, a miernik zostaje nienaruszony. Jeśli z powodów technicznych wiersz **musi** zniknąć, to ratunkowe dopisanie wiersza placementu jest odstępstwem od mojego niezmiennika i wymaga mojego sign-offu **przed** implementacją, nie po.

**Test pinujący Maxa zostaje** — z nagłówkiem „to nie jest kontrakt, to udokumentowany defekt". Proszę tylko o dopisanie w nim odsyłacza do tego punktu, żeby osoba, której test zaświeci na czerwono, przeczytała **rozstrzygnięcie**, a nie sam opis defektu.

**Nie jest blokerem zapłonu** — defekt jest dziś nieosiągalny.

---

## 7. Co placement ZAPISUJE — korekta wobec ADR-014 D8

Wariant hybrydowy zmienia nie tylko próg, ale i **ślad w danych**. Trzy konsekwencje, które Engineering musi znać, zanim napisze slice L1:

1. **`curriculum_module_progress.verified_by_method='diagnostic'` przestaje być używane.** Pod hybrydą diagnoza nie zalicza modułu, więc nic nie ma prawa zapisać tej wartości **w drabinie**. Wartość zostaje w schemacie (migracja **0035** ją dopuściła — bez migracji wstecznej), ale żadna ścieżka kodu jej nie zapisuje.

   ⚠ **To są DWIE RÓŻNE KOLUMNY o tej samej nazwie — nie pomyl ich.** `competencies.verified_by_method='diagnostic'` (migracja **0029**) jest **legalny i aktywny do dziś**: tak diagnoza oznacza pochodzenie poziomu kompetencji w mapie (`src/app/api/assessment/[id]/complete/route.ts:104`, priorytet źródeł w `src/app/api/onboarding/route.ts:283`). Zamiera **wyłącznie** wartość w `curriculum_module_progress`.

   **[WYMÓG BACKENDU — Ethan]** kontrakt-test pilnujący martwej wartości musi być **zawężony do `curriculum_module_progress`**. Test w brzmieniu „nigdzie nie zapisujemy `'diagnostic'`" **zablokuje działającą diagnozę**, wyglądając przy tym na strażnika jakości — v0.1 tego dokumentu o mało tego nie spowodowała (wyłapane przy budowie L1).
2. **Odblokowanie potrzebuje własnego nośnika, odrębnego od zaliczenia.** Wymogi produktowe (kształt = Twoja decyzja): musi być **trwałe** (nie liczone w locie z `result_json` przy każdym żądaniu — inaczej zmiana mapy tagów po cichu odbiera studentom dostęp), **audytowalne** (widać, z której sesji diagnozy i przy jakim poziomie powstało — bez tego miernik z DECYZJI 2 nie ma z czego liczyć) i **addytywne** (§6b).
3. **Żadna pozycja nie dostaje `skipped_by_placement`.** D3 przewidywał ten status dla pozycji pomijanych przez placement — pod hybrydą **placement nie pomija żadnej pozycji**, moduł jest tylko otwarty, a pozycje zostają do przejścia. Status pozostaje sensowny wyłącznie dla pozycji modułu zaliczonego przez **test out** (zaliczenie przy zerze ukończonych pozycji). **[ROZSTRZYGNIĘTE v0.6] Pozycja `skipped_by_placement` NIE liczy się jak przerobiona, gdy rozstrzygamy, JAKIM DOWODEM student zaliczył moduł.** Trzy powody:

1. **Argument domykający: liczenie jej jak przerobionej kazałoby dowodowi `test_out` skasować samego siebie.** Pod hybrydą ten status może powstać **wyłącznie** na pozycjach modułu zaliczonego przez `test_out` (placement nie pomija niczego — pkt wyżej). Gdyby liczył się jak przerobiony, moduł zdany bez ani jednej przerobionej pozycji pokazałby dowód `'exam'` — czyli status **stworzony przez** test-out zatarłby ślad, że test-out miał miejsce. To nie jest ryzyko brzegowe, to sprzeczność wewnętrzna.
2. **ADR-014 D3 już to rozstrzygnął w warstwie postępu:** pozycje pominięte dostają `skipped_by_placement`, a **nie** `completed`, z uzasadnieniem „postęp modułu liczy się z dowodów" (G8). Rozciągnięcie „pominięta = przerobiona" na warstwę dowodu cofa decyzję, która już zapadła.
3. **Dowód odpowiada na pytanie „czym to zdobyłeś".** Pozycja pominięta to z definicji praca niewykonana. Wliczanie jej sprawia, że rozróżnienie kłamie dokładnie w tym przypadku, dla którego powstało.

**Odpowiedź na obawę Maxa o „dwie prawdy": to nie są dwie prawdy o tym samym, tylko odpowiedzi na dwa różne pytania** — i dlatego jedna liczba nie może ich obsłużyć:

| Pytanie | Kto pyta | Czy `skipped_by_placement` się liczy |
|---|---|---|
| „Ile masz z głowy?" | ekran postępu, student | **TAK** — student nie ma tego do zrobienia; pokazanie jako zaległość byłoby nieprawdą i demotywacją |
| „Czym to zdobyłeś?" | dowód (`exam` / `test_out`), audyt | **NIE** — liczy się wyłącznie praca faktycznie wykonana |

**[WYMÓG BACKENDU — Ethan/Max]** Rozwiązaniem nie jest jedna wspólna definicja, tylko **dwie funkcje o jawnie różnych nazwach** (np. „pozycje z głowy" kontra „pozycje faktycznie przerobione"). Wspólna nazwa „pozycja zaliczona" dla obu jest źródłem tej pomyłki — dopóki obie się nazywają tak samo, każdy kolejny wykonawca będzie zakładał, że to jedno i to samo. **Nie jest blokerem zapłonu** (żaden kod produkcyjny tego statusu dziś nie zapisuje), ale wiąże każdego, kto zacznie go zapisywać — proszę o test pinujący w tym samym stylu co przy defekcie wyspy.

Nazwa `skipped_by_placement` przestaje opisywać rzeczywistość — **czy ją zmieniać, decyduje Ethan** (to nazewnictwo w schemacie, nie dydaktyka); ja tylko stwierdzam, że semantyka się przesunęła i nie wolno tego przeoczyć.

**Punkt wejścia (rekomendacja, nie przymus):** drabina **nie skacze** studenta automatycznie. Rekomendowany start to **najgłębszy moduł DOSTĘPNY i NIEZALICZONY** [uogólnione v0.5], a wszystkie moduły niżej zostają dostępne i widoczne.

**Dostępność płynie z dwóch źródeł i rekomendacja musi widzieć oba:** (a) łańcuch — moduł następujący po zaliczonym jest dostępny z mocy prerekwizytu; (b) placement — moduł odblokowany diagnozą. Definicja z v0.3 („najgłębszy odblokowany") widziała tylko (b) i dawała wynik wprost zły: student, który zdał `m-eda`, dostawał rekomendację `m-pandas` — **cofnięcie**, i to na jedynym ekranie, którego zadaniem jest powiedzieć mu, gdzie jest. To nie jest dziwne, tylko błędne; poprawiam definicję, nie komunikat.

Sprawdzenie: zdany `m-eda` (poz. 6) → łańcuch daje `m-sql` (7) → rekomendacja `m-sql`. Brak zaliczeń, placement otworzył do `m-pandas` (5) → rekomendacja `m-pandas` (jak w v0.3). Nic nie zdobyte → `l0-start`. Nowa definicja pochłania starą, nie zastępuje jej wyjątkiem.

**`l0-start` idzie przed wszystkim, dopóki jest niezaliczony** — także u studenta z zaliczonymi modułami wyżej (DECYZJA 3). To nie jest formalność: „test out" zdaje się pytaniami zamkniętymi, więc **można zaliczyć `m-eda`, nie uruchomiwszy nigdy notatnika**. Rekomendacja `m-sql` bez działającego środowiska trafia dokładnie w scenariusz, przed którym DECYZJA 3 chroni. Student ma prawo powiedzieć „wolę zacząć od początku" i produkt ma to uszanować — przy poziomie 3, opartym na jednym pytaniu, on często wie o sobie więcej niż nasz pomiar.

**[ROZSTRZYGNIĘTE 2026-07-26 — rozjazd ze zleceniem L2]** Zlecenie mówiło „punkt startu = **pierwszy NIEodblokowany** moduł". To jest błąd i nie obowiązuje. Kontrprzykład: przy `ds-python=4, ds-pandas=4` odblokowane są F1, F2, F3, `m-pandas`, a pierwszy nieodblokowany to `m-eda` — moduł, którego student wedle pomiaru **nie umie**. Rekomendowanie startu od materiału, na którym wypadł słabo, to dokładnie ten błąd, którego cała DECYZJA 2 unika (wrzucenie ponad poziom → porzucenie).

Obie wielkości są przydatne, ale znaczą co innego i **żadnej nie wolno nazwać „punktem startu"**:

| Wielkość | Znaczenie | Gdzie w UI |
|---|---|---|
| **najgłębszy dostępny i niezaliczony** | gdzie student **zaczyna** — uwzględnia zaliczenia i placement | rekomendacja „zacznij tutaj" na ekranie wyniku diagnozy |
| **najgłębszy odblokowany placementem** | co zrobiła **diagnoza** — wyłącznie do komunikatu o placemencie | zdanie „diagnoza otworzyła…", nigdy jako rekomendacja startu |
| **pierwszy nieodblokowany** | gdzie kończy się prefiks — **najbliższy cel** | znacznik celu na drabinie, nigdy jako sugestia startu |

**Rozdzielenie komunikatu od rekomendacji jest tym, co godzi W-6 z sensownym startem.** Komunikat o placemencie mówi wyłącznie o tym, co zrobiła diagnoza (więc nigdy nie przypisuje sobie modułu zdanego przez studenta); rekomendacja startu to **osobne zdanie** o tym, gdzie student jest — i ono zaliczenia widzi. Dwa zdania, dwa źródła, zero kolizji.

---

## 8. Mikrocopy — teksty wiążące 1:1 (moja domena, Jack wstawia bez tłumaczenia własnymi słowami)

Cel: student ma po jednym przeczytaniu rozumieć, że **otwarte ≠ zaliczone**. To jest miejsce, w którym wariant hybrydowy albo się obroni, albo wyprodukuje poczucie oszukania („myślałem, że mam to z głowy").

- **Ekran wyniku diagnozy, gdy placement zadziałał:**
  „Diagnoza otworzyła Ci ścieżkę aż do modułu **{tytuł modułu}**. To skrót w nawigacji, nie zaliczenie — moduły po drodze nadal czekają. Żeby moduł liczył się jako zaliczony, przejdź go albo zdaj jego egzamin (**test out**)."
- **Odznaka na module otwartym placementem:** „Otwarty na podstawie diagnozy · niezaliczony".
- **Student z modułami zaliczonymi wcześniej (dwa zdania, dwa źródła — §7):**
  „Masz już zaliczone: **{lista modułów zaliczonych}**. Diagnoza otworzyła dodatkowo: **{lista odblokowanych}**. Zacznij od **{najgłębszy dostępny i niezaliczony}**."
  Wariant, gdy placement nie dołożył nic: „Masz już zaliczone: **{lista}**. Diagnoza nie otworzyła nic ponad to — zacznij od **{moduł}**."
  **Uzasadnienie:** rozdzielenie „zaliczone" od „otwarte diagnozą" w jednym widoku jest jedynym miejscem, gdzie student widzi obie waluty obok siebie i uczy się różnicy między nimi bez wykładu. Kolejność zdań jest wiążąca — **najpierw jego praca, potem nasza diagnoza.**
- **Rekomendacja pierwszego kroku (zawsze, gdy `l0-start` niezaliczony):**
  „Zacznij od **Start: środowisko pracy** — około 15 minut. Bez działającego notebooka nie ruszysz żadnego ćwiczenia z kodem, nawet jeśli materiał znasz."
- **Wejście w moduł graniczny (kwalifikacja na poziomie 3, własny pomiar):**
  „Ten moduł otwieramy Ci na podstawie jednego trafionego pytania — zostawiamy pełne wsparcie włączone. Jeśli materiał okaże się znany, przeklikasz go szybko."
- **Wejście w moduł otwarty cudzym pomiarem (wciągnięty prefiksem — `f2-python-2`, `f3-dane-python`):**
  „Tego modułu nie sprawdzaliśmy w diagnozie. Otwieramy go, bo poradziłeś sobie z **{nazwa kompetencji głębszej}** — a bez tych podstaw to nie byłoby możliwe. Zostawiamy pełne wsparcie włączone; jeśli materiał znasz, przeklikasz go szybko."
  **Uzasadnienie osobnego tekstu:** komunikat dla modułu granicznego mówi o „jednym trafionym pytaniu" — dla F2 i F3 byłby **nieprawdą**, bo o te moduły nie padło ani jedno pytanie. Student, który to sprawdzi (a przebranżowiający się sprawdzają), przyłapie produkt na zmyślaniu przesłanki. Uczciwe nazwanie wnioskowania kosztuje jedno zdanie i jest jedyną wersją zgodną z „AI ocenia jako pierwsze, człowiek decyduje ostatni".
- **Placement nie zadziałał, bo kompetencja nie była badana (`uncovered`):**
  „Nie badaliśmy **{nazwa kompetencji}** w diagnozie, więc moduł **{tytuł}** zostaje na swoim miejscu. Jeśli znasz ten materiał — zdaj egzamin modułu (**test out**) i przeskocz go."
- **Placement nie zadziałał z powodu dziury w prefiksie:**
  „Twój wynik z **{kompetencja głębsza}** jest wysoki, ale **{kompetencja płytsza}** wypadła słabo — a w tej ścieżce to fundament pod resztę. Otwieramy do **{tytuł ostatniego odblokowanego}**; dalej przez naukę albo egzamin."

---

## 9. Zgodność z konstytucją §7 (CLAUDE.md v1.13)

**Jednym zdaniem:** placement steruje wyłącznie **progresją wewnętrzną** — otwiera nawigację po drabinie, nie zalicza modułu, nie tworzy wpisu w Paszporcie i nic z niego nie wychodzi na zewnątrz jako dowód kompetencji wobec pracodawcy, więc mieści się w całości po stronie „ocena formująca — maszyna samowystarczalna", a warstwa kredencjału (capstone → weryfikacja człowieka → receipt) zostaje nietknięta.

Uzupełniająco: wariant hybrydowy **wzmacnia** zgodność z §7 wobec pierwotnego D8. Pod D8 automat przyznawał modułowi status „zaliczony", który wchodził do historii postępu studenta; dziś automat przyznaje wyłącznie prawo wejścia, a każde zaliczenie ma za sobą albo pracę studenta, albo egzamin na ≈90%.

---

## 10. Brama przed oddaniem

### A1 — kompletność dostaw

| Zamówione przez Olivera | Sekcja tego dokumentu | Status |
|---|---|---|
| 1. Mapa tagów moduł → koncept (9 modułów, slug albo jawny NULL) | DECYZJA 1 (tabela 9 wierszy) | ✔ |
| 2. Próg odblokowania na skali 1–4 + analiza asymetrii kosztu przy pilotażu | DECYZJA 2 | ✔ |
| 3. Rozstrzygnięcie `l0-start` | DECYZJA 3 | ✔ |
| 4. Rozstrzygnięcie F1–F3 przy jednym koncepcie „Python" | DECYZJA 4 | ✔ |
| 5. Werdykt o regule prefiksowej (potwierdź albo obal) | DECYZJA 5 | ✔ |
| 6. Sprawdzenie zgodności z §7 + jedno zdanie uzasadnienia | Sekcja 9 | ✔ |
| 7. Dokument w drzewie roboczym, bez commita | ten plik | ✔ |

Żadne dwie dostawy nie wskazują tej samej sekcji. Sekcje 0, 6, 7, 8 to konsekwencje wymagane przez rozstrzygnięcia (fakty nośne, przypadki brzegowe, ślad w danych, mikrocopy), nie zlane dostawy.

### A2 — spójność: nic nie opiera się na tym, co wyłączone

| Element | Na czym stoi | Czy dotyka czegoś wyłączonego |
|---|---|---|
| Próg ≥3 | `staircase.ts` (poziomy 1–4), `levelToStatus` (3/4 = `acquired`) | Nie — obie rzeczy istnieją i są ratyfikowane |
| Reguła prefiksowa | kolejność `modules[]` w manifeście drabiny | Nie — łańcuch liniowy istnieje (D10, manifest) |
| „Test out" jako droga naprawcza przy błędzie w dół | egzamin modułowy 1E.3, próg ≈90% | **SPEŁNIONE 2026-07-25** — 1E.3 live na prodzie (`FLAG_MASTERY_GATE=1`). Warunek postawiony w v0.1 („kolejność 1E.3 → 1E.7 jest warunkiem ważności progu ≥3") jest domknięty: droga naprawcza istnieje realnie, nie tylko w projekcie. |
| Tryb wsparcia dla modułu wciągniętego prefiksem | trzecia gałąź tabeli trybów (DECYZJA 2) | Nie — gałąź dopisana w v0.3, `null` nie jest już stanem osiągalnym dla modułu odblokowanego |
| Miernik progu — przestrzelenie w górę | pola werdyktu w `curriculum_placements` (L3) | Zbudowane. Pokrywa sesje, w których coś się otworzyło |
| Miernik progu — niedoszacowanie | **zdarzenie przy każdym policzeniu placementu** (DECYZJA 2) | **Zależność jawna, niedomknięta:** dopóki zdarzenia nie ma, sesje bez odblokowań nie zostawiają śladu i druga strona asymetrii jest niemierzalna. `blocking_hole_slug` na wierszu **nie** wypełnia tego warunku |
| Pominięcie modułu zaliczonego (§6c) | status `exam`/`test_out` w `curriculum_module_progress` | Nie — status istnieje i jest zapisywany przez 1E.3 (live od 2026-07-25) |
| Ciągłość prefiksu przy module zaliczonym (§6c, W-7) | wiedza reguły o zaliczeniach | **DOMKNIĘTE w L4** — moduł zaliczony spełnia próg i wyznacza k (v0.5) |
| Rekomendacja startu (§7, uogólniona) | status modułów + odblokowania placementem | **Zależność jawna, niedomknięta:** wymaga obu źródeł dostępności. Do domknięcia w L6 — dzisiejsza wersja pomija zaliczenia i cofa studenta |
| Mikrocopy „masz już zaliczone / diagnoza otworzyła" | rozdzielone wielkości z §7 | Nie — obie wielkości istnieją po L4; potrzeba tylko złożyć je w dwa zdania |
| Reguła resetu modułu (§6e) | status wiersza postępu, nie jego istnienie | Nie opiera się na niczym z OUT; **świadomie NIE wymaga przeliczania placementu**, więc nie narusza niezmiennika miernika |
| Dowód `exam`/`test_out` (§7 pkt 3) | pozycje faktycznie przerobione | Nie — wymaga wyłącznie **oddzielenia nazw** dwóch istniejących liczników, nie nowej funkcji |
| Tryb wsparcia przy poziomie 3 | C7/C8 z D8 (wsparcie od fazy completion) | Nie — mechanizm zaprojektowany w ADR, nie wymyślony tutaj |
| Mikrocopy `uncovered` | `uncovered` w `result_json` | Nie — degradacja zaimplementowana w `plan.ts` |
| Monotoniczność odblokowań | brak przycisku powtórki (spec §8 pkt 3) | **Zależność jawna, opisana w §6b** — nie ukryta |
| `l0-start` dostępny zawsze | pozycja 1 łańcucha, brak prerekwizytu | Nie |

---

## 11. Self-critique — 5 słabości i co z nimi zrobiłam

Rola: senior product lead z SaaS edukacyjnego, świeżo po launchu, w którym źle ustawiony placement wypłukał połowę kohorty w pierwszym tygodniu.

**1. „Próg ≥3 uzasadniasz arytmetyką, nie danymi — a arytmetyka zakłada studenta, który strzela na oślep."** Realny przebranżowiający się nie strzela losowo; zna część materiału, więc rozkład jest inny niż mój model 8%. Moja liczba jest górnym oszacowaniem dla ignoranta i dolnym dla kogoś z częściową wiedzą. → **Zmienione:** dopisałam do DECYZJI 2 wymóg miernika z **progiem alarmowym i jawną deklaracją, że przy potwierdzonej różnicy w oblewalności podnoszę próg do 4**. Decyzja przestaje być nieodwołalna, a próg dostaje warunek rewizji zamiast obietnicy „będziemy obserwować".

**2. „Cała obrona progu 3 wisi na dostępności »test out« — a 1E.3 jeszcze nie jest na prodzie."** Gdyby 1E.7 wyszedł pierwszy, błąd „za mało odblokowane" traci tanią naprawę i moja analiza asymetrii się sypie. → **Zmienione:** wpisałam to do tabeli A2 jako **twardy warunek ważności progu** („kolejność 1E.3 → 1E.7 jest warunkiem ważności progu ≥3"), zamiast zostawiać jako założenie w tle.

**3. „Monotoniczność odblokowań to gotowy wektor nadużycia."** Sumowanie odblokowań z wielu diagnoz przy ≈8% na podejście to maszyna do zbierania dostępu — pisałam to, opierając się na tym, że powtórek nie ma, ale nie nazwałam zależności. → **Zmienione:** §6b dostał jawny warunek nośny i regułę zapadkową („jeśli powtórki wejdą do UI, licz wyłącznie z najnowszej sesji"). Kolejna osoba dodająca przycisk „powtórz test" zobaczy, że rozbraja czyjeś założenie.

**4. „Twoja reguła prefiksowa w pierwszej wersji zabijała funkcję i nie zauważyłaś tego."** Naiwny prefiks z `NULL` na F2/F3 zatrzymuje odblokowania na F1 na zawsze — placement stałby się funkcją otwierającą najłatwiejszy moduł drabiny, czyli niczego. → **Zmienione:** DECYZJA 5 rozdziela „kwalifikuje się" (tylko moduł otagowany, na własnym pomiarze) od „wchodzi do prefiksu" (także `NULL`), z regułą „moduł `NULL` nigdy nie wyznacza końca prefiksu", i przechodzi **sześć przypadków testowych w tabeli** zamiast deklaracji, że reguła działa.

**5. „Oddajesz mapę tagów, a nie mówisz, która pozycja jest najsłabsza — Engineering potraktuje wszystkie 9 wierszy jako równie pewne."** Dopasowanie `m-ml` jest niemal idealne, a `m-llm` opiera się na banku pytającym o liczbę parametrów warstwy transformera przy module o ekstrakcji strukturalnej. → **Zmienione:** tabela DECYZJI 1 dostała kolumnę **„siła dopasowania"** z jawnym „słaba — do rewizji jako pierwsza" przy `m-llm` i nazwanym ograniczeniem przy `m-sql` (brak funkcji okna w banku wobec wymagań rubryki capstone'u). Mapa przestaje udawać, że wszystkie wiersze mają ten sam ciężar dowodowy.

### Lekcja procesowa z v0.2 (dla mnie i dla kolejnych dokumentów)

Numer migracji 0029 wpisałam **z wnioskowania, nie z odczytu pliku migracji** — spec diagnozy wspomina 0029 przy `verified_by_method` i przyjęłam, że chodzi o tę samą kolumnę. Nie sprawdziłam, że nazwa `verified_by_method` występuje w **dwóch tabelach** (`competencies`, migracja 0029 — żywa; `curriculum_module_progress`, migracja 0035 — martwa pod hybrydą). Wszystkie pozostałe fakty w sekcji 0 czytałam z kodu; ten jeden przeszedł z pamięci — i to właśnie on o mało nie zablokował działającej funkcji.

**Reguła na przyszłość:** numer migracji, nazwa kolumny i nazwa tabeli to **fakt do odczytania z pliku**, nigdy do wywnioskowania z cudzego dokumentu — dokładnie jak w Workflow 5 (`skills/product/SKILL.md`). Przy nazwie kolumny występującej w wielu tabelach **zawsze piszę pełną ścieżkę `tabela.kolumna`**, nigdy samą nazwę kolumny; dokument czytają wykonawcy, którzy zamieniają moje zdania na kontrakt-testy.

---

## Sign-off

| Rola | Zakres | Status |
|---|---|---|
| Sophia (PO) | dydaktyka, mapa tagów, próg, mikrocopy | rozstrzygnięte tym dokumentem |
| Ethan (CTO) | nośnik tagu, nośnik odblokowania, korekta ADR-014 D8, nazewnictwo `skipped_by_placement` | do przeglądu |
| Darek (CEO) | wariant hybrydowy (rama) | ✔ sign-off 2026-07-26 |

Decyzja mieści się w mojej domenie (produkt/dydaktyka — CLAUDE.md §5 v1.11: odwracalna, wewnętrzna, bez wydatku, niewychodząca na zewnątrz), z przeglądem domenowym Ethana dla warstwy technicznej.
