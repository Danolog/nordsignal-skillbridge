# ADR-024 — migracja warstwy modelu (rodzina AI SDK) jednym krokiem, z dowodem wykonaniowym

- **Status:** PROPONOWANY — plan zakresu i ryzyka, **nie decyzja o wykonaniu**. Do spakowania
  Darkowi przez Olivera (COO) jako decyzja o zakresie i terminie. Kodu nie zaczynamy przed
  tą decyzją.
- **Data:** 2026-08-10 · **Autor:** Ethan (CTO)
- **Rozstrzyga:** co zrobić z PR-ami #87 (`@ai-sdk/react` 3→4) i #88 (`@ai-sdk/anthropic` 3→4),
  które Leo (Tech Lead) zawiesił jako „dwie połowy jednej migracji", oraz z trzecim,
  brakującym krokiem (`ai` ^6→^7), którego nie robi żadne z nich.
- **Powiązania:** #87, #88 (zawieszone), werdykt Leo z 2026-08-10; `CLAUDE.md` §8 v1.16
  (weryfikacja przesłanek dowodem z komendy).

---

## 1. Stan dzisiejszy — zmierzony, nie przypomniany

Odczyt z `package.json` na `main` (`06d0040`), 2026-08-10:

```
@ai-sdk/anthropic  ^3.0.58    [dependencies]   -> #88 proponuje 4.0.20
@ai-sdk/react      ^3.0.118   [dependencies]   -> #87 proponuje 4.0.39
ai                 ^6.0.116   [dependencies]   -> nie rusza tego ŻADEN z dwóch PR-ów
```

Wszystkie trzy są zależnościami **produkcyjnymi**, nie deweloperskimi.

## 2. Dlaczego jednym krokiem, a nie po kolei

Trzy pakiety są sprzężone wersją protokołu dostawcy. Ustalenie Leo, które przyjmuję:
**każda kolejność pojedynczych scaleń kończy się drzewem niespójnym.**

| Scalone samo | Stan drzewa po scaleniu |
|---|---|
| #87 (`@ai-sdk/react` 3→4) | klient na v7, dostawca na v3 |
| #88 (`@ai-sdk/anthropic` 3→4) | dostawca na v4, rdzeń na v6 |
| którekolwiek | brakuje kroku `ai` ^6→^7 |

Nie istnieje kolejność, która przechodzi przez stan spójny. To nie jest preferencja
porządkowa — to jest własność sprzężenia. Wniosek: **jedno zgłoszenie obejmujące wszystkie
trzy pakiety naraz**, albo żadne.

Konsekwencja dla #87 i #88: **oba do zamknięcia bez scalania**, z odesłaniem do tego ADR.
Nie są złe — są niekompletne z definicji i żadne domknięcie po stronie Dependabota tego
nie naprawi, bo Dependabot podnosi pakiety, nie migruje warstw.

## 3. Promień rażenia — liczby

Odczyt z `src/`, 2026-08-10:

| Pakiet | Pliki produkcyjne | Pliki testowe | Z ręczną atrapą |
|---|---|---|---|
| `@ai-sdk/anthropic` | **1** (`src/lib/ai/model.ts`) | 10 | **9** (`vi.mock("@ai-sdk/anthropic")`) |
| `@ai-sdk/react` | **1** (`src/components/career-helper/chat-screen.tsx`) | 1 | — |
| `ai` (rdzeń) | 14 | 11 | **9** (`vi.mock("ai")`) |

**Ustalenie Leo o jednym punkcie wejścia jest prawdziwe — i niewystarczające.**
`model.ts` faktycznie jest jedynym nośnikiem dostawcy w kodzie produkcyjnym
(`import { anthropic } from "@ai-sdk/anthropic"`, `getModel(tier)` zwraca `LanguageModel`).
Ale powierzchnia migracji to nie jest jeden plik: to jeden plik produkcyjny **plus
dziewięć ręcznie pisanych atrap**, które kodują stary kształt dostawcy, plus 14 plików
produkcyjnych konsumujących rdzeń `ai`.

## 4. Ryzyko główne — zielona suita nie będzie dowodem

To jest powód, dla którego ten ADR w ogóle powstaje.

Dziewięć plików testowych podmienia dostawcę własną atrapą, w rodzaju:

```
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "mocked-model") }));
```

Atrapa zwraca to, co autor uznał za kształt dostawcy **w wersji 3**. Po migracji na 4
atrapa nadal będzie pasować do kodu, który ją woła — bo obie strony podmieniliśmy sami.
Znaczy to dokładnie tyle:

> **Po migracji zielona suita nie dowodzi, że nowy dostawca działa. Dowodzi, że atrapy
> nadal pasują do siebie.**

To jest **ta sama klasa luki**, którą złapaliśmy w tym repozytorium trzy razy w ciągu
tygodnia, za każdym razem w innym przebraniu:

1. **Ścieżka produkcyjna niewykonywana przez suitę** — `@vercel/sandbox → undici` (#269):
   `build` i `typecheck` przechodzą, zero dowodu wykonaniowego.
2. **Test pomijający się po cichu** — `placement-metric.integration.test.ts` (#270):
   bez bazy `describe.skip`, „5 skipped", kod wyjścia 0, kolor zielony.
3. **Krok, którego zielony przebieg nie wykonuje** — `upload-artifact@v7` pod
   `if: failure()` (#83): zmiana, której żadna zielona bramka nie dotyka.

Wspólny wzór: **kolor bramki mówi o czymś innym niż to, o co pytamy.** Migracja warstwy
modelu jest czwartym wystąpieniem tego wzoru i jedynym, w którym stawką jest ścieżka
produkcyjna produktu, a nie infrastruktura.

## 5. Jaki dowód wykonaniowy uznajemy za wystarczający

Bramka wyjścia migracji. **Zielony komplet 12 bramek jest warunkiem koniecznym i
jawnie niewystarczającym.** Dodatkowo wymagamy:

1. **Jedno realne wywołanie dostawcy na nowej wersji, przez `model.ts`, bez atrapy** —
   wykonane w CI, z zacytowanym wyjściem (identyfikator modelu, kształt odpowiedzi).
   Nośnik: istniejący tor nocny `e2e-llm`, który już dziś biega z prawdziwym kluczem pod
   `schedule`/`workflow_dispatch` i jest wyłączony z bramek per-PR. Zmierzone w
   `.github/workflows/pr.yml` (2026-08-10):

   ```
   if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
   ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY_CI }}
   if [ -z "${ANTHROPIC_API_KEY}" ]; then
     echo "::error::Brak klucza modelu (sekret ANTHROPIC_API_KEY_CI). Job e2e-llm nie moze zweryfikowac segmentu @llm."
   ```

   Tor ma więc prawdziwy klucz i **twardo pada przy jego braku** zamiast cicho przechodzić —
   to jest własność, której ten dowód wymaga. Migracja nie wchodzi na `main`, dopóki
   `e2e-llm` nie przejdzie **na gałęzi migracji**, wywołany ręcznie.
2. **Strumieniowanie odpowiedzi w interfejsie** — `chat-screen.tsx` jest jedynym nośnikiem
   `@ai-sdk/react`; zmiana wersji głównej klienta dotyka kontraktu strumienia. Dowód:
   przebieg Playwrighta na realnej ścieżce rozmowy, nie test jednostkowy komponentu.
3. **Zakaz „zielono, bo atrapa"** — żadna z dziewięciu atrap nie jest dowodem w tej
   migracji i nie wolno jej cytować jako dowodu w opisie PR-a.

Punkt 1 jest bramką rozstrzygającą. Dopóki nie zobaczymy realnego wywołania na nowej
wersji, migracja jest hipotezą — dokładnie w tym znaczeniu, w jakim naprawa `deps-scan`
była hipotezą, zanim zobaczyliśmy zielony `deps-scan` na `main`.

## 6. Co robimy z dziewięcioma atrapami

Trzy warianty, w kolejności rosnącej pracy i rosnącej wartości:

| Wariant | Na czym polega | Koszt | Co zostaje niedowiedzione |
|---|---|---|---|
| **A. Zostawić** | atrapy przepisane pod nowy kształt, ręcznie | najniższy | wszystko — problem wraca przy następnej wersji głównej |
| **B. Jedna atrapa wspólna** | dziewięć atrap → jeden moduł pomocniczy, jedno miejsce do poprawienia | średni | kształt nadal pisany ręcznie, ale **jeden raz**, nie dziewięć |
| **C. Atrapa na kontrakcie** | atrapa budowana z typów dostawcy, więc zmiana kontraktu łamie kompilację testów | najwyższy | prawie nic — rozjazd staje się widoczny w `typecheck` |

**Rekomendacja: B teraz, C jako dług nazwany.** Wariant A odrzucam: dziewięć ręcznych
poprawek tego samego kształtu to dziewięć okazji do rozjazdu, a rozjazd atrapy z
dostawcą jest niewidoczny w żadnej bramce. Wariant C jest właściwy docelowo, ale wiąże
migrację z przeprojektowaniem podejścia do atrap w całym `src/lib/ai/` — to osobne
zadanie, nie warunek tej migracji.

## 7. Szacunek pracy

Podane w osobodniach agentowych, przy założeniu jednego pisarza gita na gałąź.

| Krok | Szacunek | Uwaga |
|---|---|---|
| Rozpoznanie zmian łamiących w trzech pakietach (dziennik zmian dostawcy, nie domysł) | 0,5 | wykonuje Ethan albo Leo |
| Migracja `model.ts` + `chat-screen.tsx` | 0,5 | jeden i jeden plik produkcyjny |
| Konsolidacja dziewięciu atrap do jednej wspólnej (wariant B) | 1,5 | największa pozycja, i to ona niesie wartość |
| Przejście po 14 plikach produkcyjnych konsumujących rdzeń `ai` | 1,0 | głównie typy, ale `^6→^7` to wersja główna |
| Dowód wykonaniowy: `e2e-llm` na gałęzi + ścieżka rozmowy w Playwright | 0,5 | zużywa budżet modelu — pozycja kosztowa |
| Zapas na nieznane (wersja główna ×3) | 1,0 | |
| **Razem** | **~5 osobodni** | |

Pozycja kosztowa poza czasem: dowód wykonaniowy woła prawdziwy model. Przy Fazie 2
i budżecie firmowym to Felix (CFO), dziś — pozycja do odnotowania, nie do zatwierdzenia.

## 8. Czego ten ADR nie domyka

- **Nie ustala terminu.** Zakres i termin to decyzja Darka; ten dokument daje jej podstawę.
- **Nie rozstrzyga wariantu C** (atrapa na kontrakcie) — zapisany jako dług nazwany.
- **Nie obejmuje pozostałych dostawców modeli**, jeśli kiedyś dojdą; dziś rodzina jest jedna.
- **Nie mierzy, czy `e2e-llm` w obecnym kształcie wystarczy jako nośnik dowodu z §5 pkt 1.**
  To trzeba sprawdzić przed startem migracji — jeśli tor nocny nie dotyka `model.ts`
  realnym wywołaniem, dowód wymaga osobnego kroku i szacunek z §7 rośnie.
