# ADR-023 — Placement odblokowuje, egzamin zalicza (korekta ADR-014 D8)

**Status:** ZAAKCEPTOWANY · **Data:** 2026-07-26 · **Autor:** Ethan (CTO)
**Decyzja nadrzędna:** Darek 2026-07-26 — wariant hybrydowy placementu (sign-off ramy)
**Koryguje:** `docs/decisions/014-curriculum-sciezka-edukacyjna.md` §D8 („Placement — interfejs, nie algorytm")
**Źródła:** `docs/product/decyzje-1e7-placement-v0.1.md` v0.2 (Sophia, PO — dydaktyka i mapa tagów) · `docs/design/skillbridge-a5-bank-pytan-diagnoza-spec-v0.2.md` §7 (rezydualna zgadywalność)
**Implementacja:** plasterek 1E.7 L1 (migracja `0044` — kolumna `curriculum_modules.diagnostic_concept_id`; PR #255)

---

## Dlaczego osobny dokument, a nie edycja ADR-014

ADR-014 ma sign-off Darka z 2026-07-11 na komplecie 13 punktów. Przepisanie D8 w miejscu skasowałoby rekord tego, **co wtedy zatwierdzono** — a zatwierdzono wariant, który dziś odrzucamy. Rekord audytowy (Built-to-Sell, `CLAUDE.md` §2) wymaga, żeby dało się odtworzyć nie tylko obowiązujący stan, ale i drogę do niego. ADR-014 zostaje nietknięty; ten dokument jest wobec niego **nadrzędny w zakresie D8** i tylko w nim.

Kolejność czytania dla kogoś, kto trafia tu pierwszy raz: ADR-014 D8 = intencja z lipca, ADR-023 = obowiązująca reguła.

---

## Kontekst — co się nie zgadzało

ADR-014 D8 zakładał, że diagnoza **zalicza** moduły: „moduł opanowany wg diagnozy → `curriculum_module_progress.verified_by_method='diagnostic'`, pozycje wewnątrz → `skipped_by_placement`". Student przechodziłby diagnozę i miałby moduły z głowy.

Problem jest dowodowy, nie techniczny. **Dwa instrumenty o różnej mocy dowodowej nie mogą dawać tego samego skutku:**

- **Diagnoza** mierzy koncept jednym pytaniem, a spec (`…diagnoza-spec-v0.2.md` §7) jawnie przyznaje **rezydualną zgadywalność** — przy progu ≥3 szansa fałszywego odblokowania pojedynczego konceptu to ≈8%.
- **Egzamin modułowy** ma próg ≈90% i wiele pozycji.

Jeżeli oba prowadzą do „moduł zaliczony", to zaliczenie z diagnozy jest zaliczeniem bez pokrycia. A zaliczenie modułu nie jest sprawą wewnętrzną — wchodzi do drabiny kompetencji, która karmi Paszport Kompetencji, czyli **artefakt pokazywany na zewnątrz jako dowód**. To sytuuje sprawę po stronie „kredencjał wysokiej stawki" z `CLAUDE.md` §7 i ADR-008: maszynowy werdykt o niskiej mocy dowodowej nie ma prawa produkować kredencjału.

---

## Decyzja

**Placement ODBLOKOWUJE. Zalicza wyłącznie egzamin.**

1. **Diagnoza otwiera drabinę, nie zamyka modułów.** Wynik diagnozy (`result_json.concepts`) przy poziomie ≥3 na tagu modułu powoduje, że moduł staje się **dostępny** — student może w niego wejść od razu, zamiast przechodzić drabinę od korzenia. Nie powoduje zaliczenia, nie oznacza pozycji jako pominiętych, nie trafia do paszportu.

2. **Zaliczenie ma zawsze pokrycie egzaminem.** Jedyne wartości `curriculum_module_progress.verified_by_method`, które wolno zapisać:
   - `'exam'` — zdany egzamin modułowy (1E.3, plasterek L0 tej funkcji),
   - `'test_out'` — egzamin zdany „na wejściu", bez przechodzenia pozycji (D8 zachowane w tej części).

3. **`'diagnostic'` w `curriculum_module_progress` to WARTOŚĆ MARTWA.** Migracja `0035` ją dopuściła i **nie cofamy tego migracją wsteczną** (zmiana ograniczenia na żywej kolumnie kosztuje więcej, niż daje). Żadna ścieżka kodu jej nie zapisuje. Pilnuje tego kontrakt-test `tests/unit/ds/placement-martwa-wartosc-diagnostic.contract.test.ts`.

   ⚠ **Dwie różne kolumny o tej samej nazwie.** `competencies.verified_by_method='diagnostic'` (migracja `0029`) jest **legalna i żywa** — tak diagnoza oznacza *pochodzenie* poziomu kompetencji w mapie kompetencji. Zamiera wyłącznie wartość w drabinie curriculum. Kontrakt-test jest z tego powodu **zawężony do `curriculum_module_progress`**; test w brzmieniu „nigdzie nie zapisujemy `'diagnostic'`" wyglądałby na strażnika jakości, a realnie zabiłby działającą diagnozę.

4. **Odblokowanie dostaje własny nośnik — jeszcze go nie ma.** Nie doklejamy odblokowania do kolumny od zaliczania; to dwa różne fakty o różnej mocy. Nośnik powstaje w plasterku **L3** i musi być:
   - **trwały** — nie liczony w locie z `result_json` przy każdym żądaniu (inaczej korekta mapy tagów po cichu odbiera studentom dostęp, który już mieli),
   - **audytowalny** — widać, z której sesji diagnozy i przy jakim poziomie powstał,
   - **addytywny** — nigdy nie odbiera dostępu już przyznanego.

5. **Tag placementu jest DANYMI, nie stałą w kodzie.** `curriculum_modules.diagnostic_concept_id` (migracja `0044`, nullable, klucz obcy do `question_concepts`, bez `ON DELETE`) wypełnia ingest z manifestu. Zmiana mapy tagów nie może wymagać wdrożenia. Brak `ON DELETE` jest celowy: skasowanie konceptu, na którym wisi mapa, ma **wywalić operację**, a nie po cichu wyzerować mapę.

### Korekta drugiego założenia D8 — „każdy moduł otagowany"

D8 postulował regułę rollupu: „**każdy** moduł jest dodatkowo otagowany konceptem diagnostycznym". Zderzenie z bankiem pytań tego nie wytrzymało — kuracja Sophii otagowała **6 z 9** modułów. Trzy zostają z `NULL`, bo bank nie ma czym ich zmierzyć (`f2-python-2` i `f3-dane-python` — zero pytań o pętle, definiowanie funkcji i słowniki; `l0-start` — setup środowiska to czynność, nie wiedza).

**`NULL` znaczy „nie zmierzyliśmy", nigdy „student nie umie".** To rozróżnienie jest nośne, nie kosmetyczne: pod regułą prefiksową (DECYZJA 5 Sophii) moduł z `NULL` wjeżdża do odblokowanego prefiksu razem z nim, ale **sam nigdy go nie przedłuża**. Odwrócenie tej semantyki na „NULL = nie umie" zamyka te trzy moduły na stałe i zabija funkcję.

### Rozstrzygnięcie nazwy `skipped_by_placement` (Sophia zostawiła mi jawnie)

Semantyka się przesunęła: pod hybrydą placement **nie pomija żadnej pozycji**, więc status ma sens już tylko dla pozycji modułu zaliczonego przez **test-out**. Nazwa opisuje rzeczywistość, której nie ma.

**Decyzja: nazwy NIE zmieniam teraz.** Rename to migracja na wartości statusu w żywej tabeli plus obejście wszystkich odczytów — koszt realny, zysk wyłącznie nazewniczy, a ryzyko (pominięty odczyt = student z zablokowaną pozycją) niezerowe. Zamiast tego: znaczenie jest tu udokumentowane, a nazwa idzie na listę długu do spłaty przy pierwszej migracji, która i tak rusza tę kolumnę. Nie wprowadzam nieodwracalnej zmiany danych dla estetyki nazwy — zwłaszcza że nazwa nie wychodzi do studenta (jest wewnętrzna, mikrocopy jest osobne).

---

## Co z D8 zostaje w mocy (litera zachowana)

- **Student bez diagnozy = moduł L0.** Bez pomiaru drabina startuje od korzenia — brak diagnozy nigdy nie blokuje wejścia do produktu.
- **Drabina widoczna-ale-zablokowana + test-out.** Student widzi całą drogę przed sobą (moduły zablokowane są widoczne, nie ukryte), a jeżeli uważa, że moduł już umie — może przystąpić do egzaminu wprost i zaliczyć go przez `'test_out'`.
- **Placement steruje trybem wsparcia** (C7/C8): wejście w moduł graniczny od fazy completion, przy niepewności domyślnie z włączonym wsparciem.
- **Diagnoza mierzy koncepty `diagnostic=true` z pnia rynkowego**, a curriculum wisi na pniu `foundations` — to nadal dwie warstwy tagów, a nie jedna.

## Czego D8 już NIE obowiązuje

| D8 (2026-07-11) | ADR-023 (obowiązuje) |
|---|---|
| Diagnoza → `verified_by_method='diagnostic'` (zaliczenie) | Diagnoza → odblokowanie; `'diagnostic'` w drabinie **martwe** |
| Pozycje modułu → `skipped_by_placement` przy placemencie | Placement **nie pomija pozycji**; status tylko dla test-outu |
| **Każdy** moduł otagowany konceptem diagnostycznym | **6 z 9**; `NULL` = „nie zmierzyliśmy", legalny i nośny |

---

## Konsekwencje

- **Dla studenta:** „otwarte ≠ zaliczone". Diagnoza skraca drogę, ale nie daje nic, czego nie potwierdził egzaminem. Mikrocopy (§8 dokumentu Sophii) jest wiążące 1:1 — to miejsce, w którym hybryda albo się obroni, albo wyprodukuje poczucie oszukania.
- **Dla paszportu:** do kredencjału nie wchodzi nic, co ma pokrycie wyłącznie w jednym pytaniu diagnozy. Spójne z `CLAUDE.md` §7 i ADR-008 (rozdział wagi oceny).
- **Dla Engineeringu:** L3 musi zbudować nośnik odblokowania; do tego czasu funkcja jest niekompletna i **placement nie może być zapalony na produkcji**.
- **Dla danych produkcyjnych:** migracja `0044` jest czysto addytywna, ale **na prodzie NEON jeszcze jej nie ma** — wchodzi z wydaniem L6, razem z ponownym zaciągiem treści i kopią zapasową. Do tego czasu schemat Drizzle deklaruje kolumnę, której baza produkcyjna nie zna; bezpieczeństwo tego stanu opiera się na tym, że **wszystkie zapytania do `curriculum_modules` mają jawną listę kolumn** (zweryfikowane przy scaleniu #255 — 15 miejsc). Każde nowe zapytanie bez projekcji kolumn wywali produkcję do czasu L6.

## Dług świadomie zostawiony

1. **Nazwa `skipped_by_placement`** — do spłaty przy najbliższej migracji ruszającej tę kolumnę (wyżej).
2. **Para `m-llm` → `ds-llm`** — kuracja Sophii oznaczyła ją jako słabą; pierwsza do rewizji, gdy bank pytań urośnie.
3. **Wartość `'diagnostic'` w ograniczeniu `0035`** — martwa, ale nadal dopuszczona przez schemat. Strażnikiem jest kontrakt-test, nie baza. Świadomy kompromis: tańszy i odwracalny.
