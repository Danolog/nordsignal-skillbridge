# Przegląd checków M-LLM — „jaka błędna droga daje ten sam ładunek?"

- **Data:** 2026-07-23
- **Autor:** Ethan (CTO)
- **Zakres:** moduł M-LLM (`tools/content/curriculum-atoms/m-llm.json`) — 2 laby (LLM.4, LLM.7), przed budową 7 notebooków/pieczątek.
- **Metoda:** ta sama profilaktyka, co przegląd 16 labów, który ujawnił wadliwy scaffold M-ML (→ ADR-020). Per check klasy `value`/`relation`: „jaka błędna droga studenta daje ten sam ładunek tokenu?"
- **Źródła:** `m-llm.json` (kind=lab: LLM.4, LLM.7), `docs/curation/sophia-1e2-mllm-atomy.md`, kontrakt checków `docs/decisions/015-kontrakt-checkow-labow.md`, weryfikator serwera `src/lib/curriculum/lab-checks.ts`. **Kontrakt-test M-LLM nie istnieje** (`tests/unit/ds/notebooks-mllm*.contract.test.ts` — brak) — to samo w sobie luka: checki M-LLM nie są pod testem.
- **Ograniczenie:** READ-ONLY. To DIAGNOZA. Żadnej zmiany treści, żadnego scalenia.

---

## 1. Podsumowanie

- **Laby przejrzane:** 2 (LLM.4 — parser na porażki; LLM.7 — tabela ewaluacji, finał całej drabiny).
- **Checki łącznie:** 8. Z tego **klasy `value`: 4** (LLM.4 C2; LLM.7 C1, C2, C3), **klasy `relation`: 0**, **klasy `predicate`: 4** (LLM.4 C1; LLM.7 C4, C5, C6).
- **Werdykt per check `value`/`relation`:** MOCNY 1 · SŁABY 3 · 🔴 0.
- **Werdykt per lab:** LLM.4 — **SŁABY** · LLM.7 — **SŁABY (wielokrotnie, najcięższy w module)**.
- **🔴 na prodzie: BRAK.** Pieczątki M-LLM nie są jeszcze zbudowane (przegląd jest PRZED budową), a laby z definicji nie wystawiają kredencjału (ADR-015 §5). Nie ma żywego fałszywego zaliczenia do wybicia na alarm. To dług projektowy do domknięcia PRZED budową, nie pożar na produkcji.

**Sedno:** M-LLM ma **ten sam profil kolizji co M-ML** (metryka na kilku próbkach = wąski zbiór wartości, wiele błędnych dróg trafia w ten sam skalar), a w **dwóch miejscach jest SŁABSZY niż M-ML**:

1. **`halucynacje_wskaznik` = 0.5 (LLM.7/C3)** — mianownik (liczba pól-braków = 4) jest deklarowany w treści jako „część kontraktu pieczątki", ale **żaden check go nie kotwiczy**. 0.5 to najbardziej kolizyjny ułamek (1/2, 2/4, 3/6, 4/8). M-ML swoje skalary (acc/prec/rec) ma podparte kotwicą strukturalną `macierz`=[1,1,0,4]; M-LLM analogicznej kotwicy pod wskaźnikiem halucynacji **nie ma**.
2. **`trafnosc` (LLM.7/C4–C6)** — GŁÓWNY artefakt rubryki capstone'u (trafność per pole, 30%) **nie ma ani jednego serwerowego checku `value`**. C4/C5 to predykaty strukturalne (długość 3, „to liczby"), a C6 (`trafnosc_zgodna`, `is_true`) to **boolean policzony w notebooku i przyjęty przez serwer na wiarę** (weryfikator, linia 178: `v === true`). Serwer nigdy nie przelicza ułamków trafności. M-ML swoją odpowiadającą strukturę (`macierz`) pinuje jako `value`-wektor; M-LLM zostawia trafność bez kotwicy.

---

## 2. Tabela per check

| Lab · check | Klasa · ładunek | Jaka błędna droga daje TEN SAM ładunek | Werdykt | Rekomendacja (wzór ADR-020) |
|---|---|---|---|---|
| **LLM.4 · C1** | predicate `len_eq rekordy=5` | Zbudowanie listy 5 elementów bez parsowania (np. 5× `None`). Rola: strażnik liczności, nie dowód drogi. | MOCNY (jako strażnik) | Zostaw. |
| **LLM.4 · C2** | value `zgodne == 4` (LICZNIK 0–5) | Zliczenie *powodzeń parsowania* zamiast *zgodności ze schematem* → nadal 4/5, bo w danych JEDYNА porażka to porażka parsowania. Check nie odróżnia „zwalidował schemat" od „policzył, co się sparsowało" — dwie miary, które atom explicite rozdziela, zapadają się w ten sam skalar. | **SŁABY** | Dodać do zbioru danych 1 przypadek, który PARSUJE się, ale łamie schemat (brak pola) → wtedy „licz powodzenia parsowania" daje inny wynik niż „licz zgodne". Osobno zakotwiczyć licznik pól: struktura zamiast gołego skalara. |
| **LLM.7 · C1** | value `przypadki_liczba == 8` | Wpisanie 8 z palca. Rola: strażnik + zakotwiczenie mianownika dla C2. | MOCNY (jako strażnik) | Zostaw. |
| **LLM.7 · C2** | value `zgodnosc == 0.875` (ODSETEK 7/8) | Mianownik zakotwiczony przez C1 (=8), więc licznik wymuszony na 7 — to chroni. Reszta kolizji jak w LLM.4/C2: „powodzenia parsowania" ≡ „zgodne ze schematem" (7/8), bo tylko jedna porażka jest porażką parsowania. | SŁABY (łagodny — mianownik zakotwiczony) | Ta sama korekta danych co LLM.4/C2 (przypadek parsowalny-ale-niezgodny). Wtedy odsetek rozróżnia obie drogi. |
| **LLM.7 · C3** | value `halucynacje_wskaznik == 0.5` (2/4) | **Najcięższy.** Mianownik (pola-braki = 4) NIEZAKOTWICZONY. Student liczący 1 halucynację na 2 błędnie policzone pola-braki → 1/2 = 0.5 — **ten sam ładunek przy DWÓCH błędach naraz** (zły licznik i zły mianownik). 0.5 to najgęstszy ułamek kolizji. Samokontrola „suma pól-braków = mianownik" jest tylko PROZĄ w hincie, nie checkiem. | **SŁABY (graniczny 🔴; do 🔴 brakuje tylko, że wymaga dwóch zbieżnych błędów)** | Rozłożyć wskaźnik na składowe i zakotwiczyć każdą jako `value`: `pola_braki_liczba == 4` (mianownik — treść i tak nazywa go kontraktem) ORAZ `halucynacje_liczba == 2` (licznik). Bramka anty-degeneracja: sam ułamek przestaje wystarczać. Obie liczby całkowite → dokładne porównanie bez problemu float. |
| **LLM.7 · C4** | predicate `len_eq trafnosc_wartosci=3` | Dowolne 3 liczby (np. `[1,1,1]`). Nie sprawdza WARTOŚCI ani tożsamości pola. | SŁABY (strukturalny) | Patrz C6 — zastąpić kotwicą `value` per pole. |
| **LLM.7 · C5** | predicate `all_numbers trafnosc_wartosci` | j.w. — `[1,1,1]` przechodzi. | SŁABY (strukturalny) | j.w. |
| **LLM.7 · C6** | predicate `is_true trafnosc_zgodna` | Weryfikator ufa boolowi z notebooka (`v === true`, linia 178). Serwer NIE przelicza trafności. Ładunek `trafnosc_wartosci=[1,1,1]` + `trafnosc_zgodna=true` → **komplet zielony**, a trafność zmyślona. GŁÓWNY artefakt rubryki (trafność per pole) bez serwerowej kotwicy `value`. | **SŁABY (najgroźniejszy dla wartości dydaktycznej — 30% rubryki bez kotwicy)** | Zamienić trafność na **`value` per pole z tożsamością pola**: `value trafnosc_stanowisko == x` (tol), `trafnosc_miasto == y`, `trafnosc_widelki_min == z` — wartości są deterministyczne z zafiksowanych danych (jak `acc_model` w M-ML). **NIE listą-`value`**: weryfikator porównuje listy dokładnym `JSON.stringify` BEZ tolerancji (linie 130–134), a ułamki typu 6/7 tego nie przejdą; do tego lista czytana „w kolejności POLA" gubi tożsamość pola (permutacja o tym samym multizbiorze przechodzi). Skalary per pole dają JEDNOCZEŚNIE tolerancję float i tożsamość pola. |

---

## 3. Czy M-LLM potrzebuje własnego ADR przed pieczątkami?

### TAK.

Uzasadnienie:

1. **Ten sam tryb awarii, co M-ML** (który dostał ADR-020): checki `value` na skalarach z małej próbki (odsetki/liczniki) mają wąski zbiór wartości — wiele błędnych dróg trafia w ten sam ładunek. To nie jest hipoteza: LLM.7/C3 (0.5) ma jawnie niezakotwiczony mianownik, a `trafnosc` nie ma żadnej serwerowej kotwicy.

2. **M-LLM jest w DWÓCH miejscach SŁABSZY niż M-ML** — więc „przykryjemy tym samym ADR-020" nie wystarcza bez własnej decyzji o konkretnych kotwicach:
   - `halucynacje_wskaznik` — mianownik (pola-braki=4) deklarowany jako kontrakt, ale niekotwiczony (M-ML kotwiczy przez `macierz`).
   - `trafnosc` — główny artefakt 30% rubryki bez checku `value` (M-ML pinuje odpowiednik `macierz` jako `value`-wektor).

3. **Poprawka jest strukturalna i zmienia kontrakt checków** → wymaga przepakowania `m-llm.json` + re-ingest na prod (CZERWONA LINIA, ADR-010). Zmiana klasy „decyzja o kontrakcie + nieodwracalny re-ingest" należy do udokumentowanej decyzji, dokładnie jak ADR-020.

4. **Koszt teraz vs po budowie:** 7 notebooków M-LLM (w tym pieczątka LLM.7) buduje się przeciw tym checkom. Zbudowanie ich teraz zabetonuje słaby scaffold w FINALE całej drabiny (ostatni lab ścieżki). Decyzja przed budową jest wielokrotnie tańsza niż przepisywanie pieczątek po.

**Forma:** rekomenduję **własny ADR M-LLM** (ADR-022, wzorem ADR-020), a nie samo rozszerzenie ADR-020, bo luki M-LLM są specyficzne (niezakotwiczony mianownik halucynacji; nieweryfikowana serwerowo trafność) i wymagają nazwanych, per-pole kotwic — nie tej samej recepty co macierz pomyłek.

**Zakres ADR (3 kotwice, wzór ADR-020 „struktura zamiast gołego skalara"):**
- **A. Anty-degeneracja wskaźnika halucynacji:** rozłóż 0.5 na `pola_braki_liczba==4` (mianownik) + `halucynacje_liczba==2` (licznik) jako osobne `value`.
- **B. Trafność jako wektor z tożsamością pola:** `value` per pole (skalar + tolerancja), nie lista, nie boolean klienta.
- **C. Rozdzielenie parsowanie vs schemat w danych:** dodaj przypadek parsowalny-ale-niezgodny-ze-schematem, żeby `zgodnosc`/`zgodne` mierzyły to, co deklarują.
- (Poboczne, ale w tym samym ruchu:) kontrakt-test M-LLM — dziś nie istnieje.

---

## 4. Czy coś BLOKUJE budowę M-LLM?

- **Twardego blokera brak.** M-LLM i tak jest po M-ML w kolejności budowy, a jego laby nie wystawiają kredencjału — nie ma żywego 🔴 na prodzie.
- **Bramka miękka (rekomendowana):** budowa 7 notebooków M-LLM powinna czekać na ADR M-LLM (jak M-ML czekał na ADR-020). Budowa przeciw obecnym C3/`trafnosc` utrwali słaby scaffold w finale drabiny.
- **Kolejność:** ADR-020 (M-ML) → ADR-022 (M-LLM) → dopiero budowa pieczątek obu modułów przeciw wzmocnionym checkom.
