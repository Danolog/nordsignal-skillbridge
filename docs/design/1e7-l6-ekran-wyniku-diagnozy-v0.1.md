# Dokument projektowy — 1E.7 L6, wynik diagnozy w curriculum (placement)

**Wersja:** v0.2 · **Autor:** Mila (Product Designer) · **Status:** hi-fi + spec, gotowe do implementacji przez Jacka
**Wejście:** `docs/product/decyzje-1e7-placement-v0.1.md` **v0.9**, §12 (wiążąca) + §8 (mikrocopy, wiążąca 1:1)
**Zlecenie:** Oliver (COO), na podstawie §12.10 („Mila — warstwa wizualna")

**Changelog v0.1 → v0.2 (Sophia, v0.9, trzy rozstrzygnięcia na moje pytania z §11 v0.1):**
1. **Karta wejścia w moduł usunięta z zakresu.** §12.4 (v0.9) zawężona do powierzchni B: `supportMode` nie ma dziś ani jednego czytelnika w produkcie (piszą go wyłącznie `placement.ts`/`placement-service.ts`), więc karta opisywałaby decyzję bez skutku — ta sama wada co nagłówek D7. Zaksięgowane jako dług **D12** (§13 dokumentu źródłowego), próg: pierwszy czytelnik `supportMode`. Usunięte: §9 pkt 1 (dawne „czego nie zaprojektowałam"), pytanie 1 z §11, wszystkie odwołania do trzeciej powierzchni w §2/§3.
2. **Nagłówek sekcji na powierzchni A: „Twoja ścieżka" → „Po diagnozie" (tekst wiążący, teraz w §8).** Odrzucone z trzech powodów niezależnych (§12.3 v0.9): koliduje nazwą z `/curriculum` = „Ścieżka nauki" i pokazuje węższą treść niż strona, do której odsyła; ramuje listę modułów pod sobą jako „wycinek = stan ścieżki" (zakaz §12.7 pkt 1); duplikuje już istniejącą etykietę „Twój plan nauki" w tym samym pliku. Sophia dołożyła regułę generalną: nagłówki i `aria-label` tej sekcji są odtąd mikrocopy i podlegają §8 — moje zgłoszenie pytania (nie wstawienie po cichu) było poprawną procedurą. Poprawione: §3.7, §5.3 (`<h3>` i `aria-label`).
3. **Sprostowanie faktu w uzasadnieniu „bez linku" na bloku 3 — decyzja bez zmian, przesłanka błędna.** Mój §9 pkt 2 twierdził, że `POST /api/onboarding` (zapis `career_goal`) leci dopiero po kliknięciu „Przejdź do pulpitu" — nieprawda: leci **przed** renderem kroku 4, wewnątrz `handleDiagnosisFinished` (`onboarding-wizard.tsx:429`). Cel kariery **jest** w wierszu studenta, gdy student widzi ten ekran; link nie byłby martwy. Blok 3 mimo to zostaje tekstem — z trzech powodów produktowych, nie technicznych (§12.3 v0.9): link ominąłby powierzchnię B przy pierwszym kontakcie; czwarty przycisk rozpuszcza jedyny akcent ekranu; rekomendacja w pilotażu to niemal zawsze `l0-start` (pierwszy wiersz drabiny), więc koszt braku linku jest pomijalny. Poprawione: §9 pkt 2, wiersz „Brak linku" w §12.

---

## 0. Cel w jednym zdaniu

Student, który właśnie skończył diagnozę, ma w kilka sekund zrozumieć **co już umie z własnej pracy, co diagnoza mu doskonaliła jako skrót nawigacyjny, i od czego zacząć** — bez ani jednego zdania sugerującego, że skrót w nawigacji to zaliczenie; a każdy student, który wraca do drabiny dni później, ma tę samą prawdę odczytać z odznaki, nie z pamięci o ekranie, którego już nie ma.

To zdanie ma dwa podmioty, bo ekran ma dwie powierzchnie (§12.1) — i druga z nich jest jedynym trwałym nośnikiem tej prawdy.

---

## 1. Brief

| Wymiar | Ustalenie |
|---|---|
| **Problem** | Wariant hybrydowy („diagnoza OTWIERA, egzamin ZALICZA") jest niewidoczny, dopóki nie ma go na ekranie. Bez tego ekranu student odczyta „otwarty moduł" jako „zaliczony moduł" — i cała konstrukcja z §2–§7 dokumentu źródłowego (próg, prefiks, tryb wsparcia) nie ma jak się obronić. |
| **User** | Student pilotażu DS, chwilę po ukończeniu diagnozy (powierzchnia A) albo wracający do nauki dni/tygodnie później (powierzchnia B). Persona pilotażu (ADR-014) to **„literalne zero"** — dla większości ten ekran pokaże zero odblokowań, i to jest wynik poprawny, nie awaria (§12.5). |
| **Kontekst w produkcie** | A: ostatni krok onboardingu, tuż przed „Przejdź do pulpitu". B: strona, do której student wraca przez cały pilotaż — jedyne trwałe miejsce prawdy o placemencie. |
| **Ryzyko #1** | Student bierze „otwarty" za „zaliczony" i czuje się oszukany, gdy odkryje, że musi jednak przejść moduł. Cały układ (hierarchia, brak pasków postępu, brak ikon ostrzegawczych, odznaka na drabinie) broni się przed tym jednym ryzykiem — nie jest to lista niezależnych wymagań. |
| **Ryzyko #2** | Student z zerem odblokowań odczyta ekran jako informację „nie umiesz nic" i porzuci produkt. §12.5 nazywa to najczęstszym przypadkiem pilotażu — projekt musi go traktować jako **domyślny**, nie brzegowy. |
| **Ograniczenie zakresu** | Bez commit, bez zmian w `src/`. Dokument jest wejściem dla Jacka. Dwie powierzchnie, liczba zamknięta (§12.1 v0.9). „Karta wejścia w moduł" — trzecia lokalizacja, którą zgłosiłam jako sprzeczność w v0.1 — jest oficjalnie **poza L6**: zaksięgowana jako dług D12 (§13 dokumentu źródłowego), teksty z §8 czekają na powierzchnię, nie projektuję ich umiejscowienia. |

**Czerwona linia produktu (human-in-the-loop, CLAUDE.md §7):** ten ekran mieści się w całości po stronie „ocena formująca — maszyna samowystarczalna" (§9 dokumentu źródłowego) — nic z niego nie wychodzi jako kredencjał. To nie zwalnia z ostrożności: mikrocopy jest wiążąca 1:1 właśnie dlatego, że jest jedynym miejscem, w którym student weryfikuje, czy może zaufać temu, co widzi (§12, „stawka tego ekranu").

---

## 2. Dwie powierzchnie — mapa

| # | Powierzchnia | Plik | Trwałość | Co dostarcza ten dokument |
|---|---|---|---|---|
| **A** | Krok 4 onboardingu „Wnioski" | `src/components/onboarding/step-wnioski.tsx` | jednorazowa (§12.7 pkt 6, decyzja świadoma) | nowy komponent `PlacementSummary` + miejsce w drzewie renderu |
| **B** | Drabina `/curriculum` | `src/components/curriculum/ladder-view.tsx` + `.../curriculum/page.tsx` | trwała — jedyny nośnik „otwarte ≠ zaliczone" po zniknięciu A | odznaka na wierszu modułu + poprawka nagłówka strony |

**Kolizja nazw (§12.1, wiążąca):** oba komponenty idą do `src/components/curriculum/`, **nigdy** do `src/components/placement/` (zajęte przez 1.17 — placement zawodowy, inna klasa danych). Proponowana ścieżka nowego pliku: `src/components/curriculum/placement-summary.tsx`.

---

## 3. Powierzchnia A — rozbiór

### 3.1. Gdzie w istniejącym drzewie renderu

Przeczytałam `step-wnioski.tsx` w całości (nie z opisu zlecenia). Obecna kolejność sekcji: nagłówek → oś pokrycia → **panel „Wynik testu"** (warunek: `diagnosisResult` istnieje) → **`profileNote`** → grupy e-CF → plan nauki (luki) → stopka CTA → karta zgody 1.17. Nowa sekcja wchodzi dokładnie między panel „Wynik testu" a `profileNote` — zgodnie z zamówieniem i z uzasadnieniem samego dokumentu źródłowego: „placement jest konsekwencją diagnozy i ma stać zaraz za nią" (§12.10).

```tsx
{diagnosisResult && ( … panel „Wynik testu" — bez zmian … )}

{/* NOWE — 1E.7 L6, powierzchnia A */}
<PlacementSummary summary={placementSummary} />

{profileNote && ( … bez zmian … )}
```

`placementSummary` to nowy prop na `StepWnioski` (`PlacementSummaryViewModel | null | undefined`, domyślnie `undefined` — ten sam wzorzec co `diagnosisResult` i `placementEnabled`, opcjonalne propy z wartością domyślną, żeby istniejące wywołania komponentu w testach nie musiały się zmieniać). `PlacementSummary` **sam** renderuje `null`, gdy `summary` jest `null`/`undefined` — rodzic nie musi warunkować.

### 3.2. Dlaczego `PlacementSummary` renderuje się sam, a nie przez `if` w rodzicu

`step-wnioski.tsx` już ma ten wzorzec dla `diagnosisResult` (`{diagnosisResult && (...)}`) — mogłabym go powtórzyć. Nie robię tego świadomie: warunek „czy sekcja istnieje" dla placementu ma **cztery niezależne przyczyny** (flaga OFF, brak sesji, `pathKey===null`, drabina pusta, błąd hooka — §12.6 warianty 1–4), a backend i tak musi je złożyć w jedną decyzję, zanim cokolwiek wyśle (§12.8 pkt 1: „ekran nie liczy reguły placementu"). Rozwiązanie: backend zwraca `null`, gdy którykolwiek z czterech warunków zachodzi, komponent traktuje `null` jednoznacznie jako „nie renderuj" — jedna reguła po stronie frontu zamiast czterech warunków przepisanych z backendu. Gdyby `step-wnioski.tsx` warunkował renderowanie osobno (np. po `pathKey`), duplikowałby logikę, którą backend już rozstrzygnął, i groziłby rozjazdem dokładnie w stylu, przed którym ostrzega `ladder.ts` („parytet obu derywacji pilnuje test integracyjny, nie umowa").

### 3.3. Macierz — dziesięć wariantów renderu (§12.6), z projektem każdego

Wszystkie dziesięć są zdefiniowane w źródle; poniżej **projektuję wygląd**, nie powtarzam tekstu (teksty patrz §12.3/§8 dokumentu źródłowego, cytowane 1:1 w kontraktach §5).

| # | Warunek (§12.6) | Co się renderuje na ekranie | Kontener |
|---|---|---|---|
| 1–4 | flaga OFF / brak sesji / `pathKey=null` / drabina pusta / błąd hooka | **`PlacementSummary` zwraca `null`** — zero DOM, zero odstępu, panel „Wynik testu" i tak stoi tuż nad `profileNote` | — |
| 5 | 0 odblokowań, 0 zaliczeń, dziura jest | wyłącznie: (2b neutralny akapit) + (3 accent-box, pełny tekst `l0-start`) | 2b w karcie neutralnej, 3 w accent-boxie |
| 6 | 0 odblokowań, 0 zaliczeń, dziury brak | wyłącznie (3 accent-box, `l0-start`) — karta neutralna 1/2/2b w ogóle się nie renderuje (żaden z trzech akapitów nie ma treści) | tylko accent-box |
| 7 | odblokowania > 0, zaliczenia = 0 | (2 akapit „aż do modułu") + (2b jeśli dziura) w karcie neutralnej + (3 accent-box) | karta neutralna + accent-box |
| 8 | odblokowania = 0, zaliczenia > 0 | (1 akapit „masz już zaliczone") + (2-wariant-C, zdanie łączone z rekomendacją) w karcie neutralnej. **Bez osobnego accent-boxu 3** — zdanie 2-wariant-C już kończy się rekomendacją (patrz uzasadnienie §3.4) | tylko karta neutralna |
| 9 | odblokowania > 0, zaliczenia > 0 | (1) + (2 „dodatkowo") + (2b jeśli dziura) w karcie neutralnej + (3 accent-box) | karta neutralna + accent-box |
| 10 | brak kandydatów na rekomendację | bloki 1/2 jak w wariantach 7–9 (wg stanu odblokowań/zaliczeń) w karcie neutralnej + (3 accent-box z tekstem zastępczym „wszystko zaliczone" albo „kolejny moduł w przygotowaniu") | karta neutralna + accent-box |

### 3.4. Decyzja projektowa — wariant 8 nie dostaje osobnego bloku 3

**Dlaczego to jest decyzja, nie przeoczenie.** Tabela `12.6` dla wariantu 8 podaje **jedno gotowe zdanie**: „Masz już zaliczone: {lista}. Diagnoza nie otworzyła nic ponad to — zacznij od {moduł}." Zdanie to już zawiera czasownik rekomendacji („zacznij od") i nazwę modułu — czyli dokładnie to, co w innych wariantach niesie blok 3. Renderowanie osobnego accent-boxu 3 obok tego zdania powtórzyłoby „zacznij od {moduł}" dwa razy na jednym ekranie, w dwóch różnych stylach wizualnych — student przeczytałby tę samą rekomendację jako dwie różne rzeczy. Odrzucam to. Zamiast tego: wariant 8 renderuje zdanie jako **blok 2-wariant-C** (osobna gałąź obok „dodatkowo" i „aż do modułu"), wewnątrz tej samej karty neutralnej co blok 1 — bo semantycznie to nadal jest „nasza diagnoza" (mówi, co diagnoza zrobiła: nic), tylko z domkniętą rekomendacją w tym samym zdaniu. Wiersze 5–7/9/10 w tabeli §12.6 jawnie oddzielają blok 2b/3, więc to nie jest reguła generalna „rekomendacja zawsze bez accent-boxu" — to jest własność jednego konkretnego zdania.

### 3.5. Hierarchia wizualna (§12.10, wiążąca)

1. **Blok 1 („jego praca") nie słabszy wizualnie niż blok 2 („nasza diagnoza").** Realizacja: oba w tej samej karcie neutralnej (`rounded-lg border border-border bg-card`), ta sama typografia (`text-sm text-foreground`), interpolowane nazwy w tym samym stylu (`<span className="font-medium">`). Żaden z dwóch nie dostaje koloru akcentu, boldu nagłówkowego ani większego rozmiaru czcionki niż drugi — parytet jest dosłowny, nie „mniej więcej podobny".
2. **Blok 2b jest informacją, nie ostrzeżeniem.** `text-sm text-muted-foreground` — jeden stopień niżej niż 1/2, zero koloru ostrzegawczego, zero ikony (zakaz wprost w §12.10). To jest świadome zejście w hierarchii: 2b tłumaczy, dlaczego prefiks stanął, a to jest kontekst do bloku 3, nie osobny komunikat o tej samej wadze co 1/2.
3. **Blok 3 jest jedynym akcentem — i akcent niesie kontener, nie krój pisma.** Blok 3 stoi w osobnym boxie (`border-ed-amber bg-ed-badge-bg text-ed-amber-text`, `rounded-lg p-4`) **poza** kartą neutralną 1/2/2b, nie w niej. Reużywam ten dokładny token-set — nie wprowadzam nowego: w tym samym pliku (`step-wnioski.tsx`) tak samo stylowana jest karta „Zaznaczyłeś wszystko z katalogu rynku" (linia ok. 269) i `profileNote` (linia ok. 224). Trzy niezależne miejsca w jednym ekranie z tym samym znaczeniem („to jest to, co masz teraz zrobić / na co zwrócić uwagę") dostają ten sam token-set — spójność w obrębie samego pliku, nie tylko z design systemem w abstrakcie.
4. **Brak ikony w bloku 3.** Rozważyłam `ArrowRight` (już zaimportowany w pliku, użyty na przyciskach CTA) jako wzmocnienie „to jest następny krok". Odrzucam: ikona przy zdaniu, które i tak stoi w wyróżnionym boxie, nie dodaje informacji — sam kontener już niesie „to jest akcent". Zero ozdobnika bez funkcji (brand voice, CLAUDE.md §3) — dodanie ikony byłoby ozdobnikiem, bo box sam wystarcza.

### 3.6. Struktura — ASCII

```
┌─────────────────────────────────────────────────┐
│  Panel „Wynik testu" (istniejący, bez zmian)      │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌─ karta neutralna (border-border, bg-card) ──┐ │
│  │ h3  Po diagnozie                             │ │  ← nagłówek wiążący (§8 v0.9), patrz 3.7
│  │                                               │ │
│  │ p   Masz już zaliczone: SQL, Pandas.          │ │  ← blok 1 (§12.3 #1)
│  │ p   Diagnoza otworzyła dodatkowo: F1, F2, F3. │ │  ← blok 2 (§12.3 #2)
│  │ p   (muted) Twój wynik z Pandas jest wysoki,  │ │  ← blok 2b (§12.3 #2b)
│  │     ale EDA wypadła słabo — a w tej ścieżce…  │ │
│  └───────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ accent-box (border-ed-amber, bg-ed-badge-bg)┐ │
│  │ p   Zacznij od EDA: od API do repozytorium.   │ │  ← blok 3 (§12.3 #3)
│  └───────────────────────────────────────────────┘ │
│                                                   │
├─────────────────────────────────────────────────┤
│  profileNote (istniejący, bez zmian)              │
└─────────────────────────────────────────────────┘
```

Każdy z trzech akapitów (1/2/2b) renderuje się **tylko gdy ma treść** — pusty akapit nie zostawia pustej linii ani marginesu-widma; `space-y-2`/`space-y-3` w kontenerze naturalnie znika dla pominiętych dzieci (flex/grid z `gap`, nie ręczne marginesy na każdym dziecku — patrz kontrakt w §5).

### 3.7. Nagłówek sekcji — „Po diagnozie" (tekst wiążący, §8 v0.9)

**v0.2:** w v0.1 zaproponowałam „Twoja ścieżka" jako moją własną etykietę strukturalną i zgłosiłam to Sophii zamiast wstawić po cichu — reguła „teksty 1:1 z §8" jest twarda, a §8 w v0.1 nie obejmował jeszcze nagłówków. Sophia rozstrzygnęła: **„Twoja ścieżka" odrzucone, obowiązuje „Po diagnozie"**, i rozszerzyła regułę „teksty 1:1" na wszystkie etykiety strukturalne tej sekcji (nagłówki, `aria-label`) — nie tylko na zdania narracji.

**Dlaczego „Twoja ścieżka" było błędem, nie tylko gorszym wyborem (§12.3 dokumentu źródłowego, trzy powody):**

1. **Koliduje nazwą z `/curriculum` („Ścieżka nauki").** Sekcja pod tym nagłówkiem pokazuje węższą treść (kilka modułów) niż strona, do której odsyła (cała drabina) — dokładnie ten rozjazd, przed którym broni §12.2 („ekran mówiący co innego niż drabina, na którą odsyła").
2. **Ramuje listę modułów pod sobą jako stan całej ścieżki.** Blok 2 to lista czterech modułów; „Twoja ścieżka" nad nią podaje wycinek jako stan — zakaz wprost z §12.7 pkt 1 („`unlockedSlugs` to co otworzyła DIAGNOZA, nigdy stan drabiny").
3. **Duplikuje istniejącą etykietę.** W tym samym pliku stoi już „Twój plan nauki" — dwie bliźniacze etykiety dzierżawcze o różnej treści na jednym ekranie.

**„Po diagnozie" jest bezpieczne z innego powodu: nazywa chwilę, nie własność.** Nie twierdzi nic o stanie ścieżki, nie zawiera liczby ani listy, jest prawdziwe we wszystkich wariantach renderu, w których sekcja w ogóle powstaje — i nie podporządkowuje pracy studenta (blok 1) naszej diagnozie, bo nie nazywa się „diagnoza", tylko moment czytania. Jawna słabość, którą Sophia sama nazwała: nagłówek jest czasowy, a stoi też nad blokiem 1, który mówi o pracy **sprzed** diagnozy — obronione tym, że nagłówek nazywa chwilę czytania, a pierwsze zdanie pod nim nazywa właściciela dorobku. Oznaczone jako pierwsze do rewizji z rozmów pilotażowych; koszt zmiany: jedna stała tekstowa (§4.2, ten sam wzorzec co `PLACEMENT_BADGE_LABEL`).

`aria-label` sekcji dostaje **dokładnie tę samą wartość** — „Po diagnozie", nie rozszerzoną frazę. Poprawka do mojego własnego draftu z v0.1 (§5.3): tam `aria-label="Twoja ścieżka po diagnozie"` niosła odrzucone słowo w odrzuconym znaczeniu, a czytnik ekranu dostawałby frazę, której widzący student nigdy nie zobaczy — dwie wersje jednej etykiety to dwie wersje prawdy.

---

## 4. Powierzchnia B — projekt

### 4.1. Odznaka na wierszu modułu (`ladder-view.tsx`)

Przeczytałam `ladder-view.tsx` i `labels.ts` w całości. Istniejąca odznaka statusu: `rounded-full border px-2 py-0.5 text-xs font-medium` + `statusBadgeClass(status)` (cztery warianty koloru: emerald=zaliczony/pominięty, amber=w trakcie, muted=zablokowany/treść w drodze, sky=domyślny=dostępny).

**Nowa odznaka — kształt, nie kolor, jest różnicownikiem.** `border-border bg-muted text-muted-foreground` (te same tokeny co `locked`/`coming_soon`), ale `rounded-md` zamiast `rounded-full`. Uzasadnienie:

- **Dlaczego nie nowy kolor.** W repo nie ma dziś piątej barwy statusu — cztery istniejące (emerald/amber/muted/sky) mają już przypisane znaczenie. Wprowadzenie np. fioletu byłoby dosłownie „wymyślaniem nowego koloru", czego zlecenie zabrania wprost. Rodzina `ed-*` (bursztyn) jest w repo, ale należy do **innego** podsystemu wizualnego (onboarding, skill-map, landing) — drabina `curriculum` konsekwentnie używa neutralnych tokenów shadcn (`border`, `card`, `muted-foreground`) + Tailwind status-hues, nigdy `ed-*`. Mieszanie rodzin tokenów w jednym komponencie byłoby niespójnością, nie spójnością.
- **Dlaczego bezpiecznie dzielić klasy z `locked`/`coming_soon`.** Odznaka placementu renderuje się **wyłącznie** przy `status === 'available' || status === 'in_progress'` (guard w §4.3) — moduł `locked`/`coming_soon` nigdy nie dostaje tej odznaki. Te dwie pary (status vs. placement-badge) nigdy nie stoją obok siebie z tym samym kolorem, więc nie ma przypadku, w którym student pomyliłby „ten moduł jest zablokowany" z „ten moduł otworzyła diagnoza" — mimo wspólnej palety.
- **Dlaczego kształt, nie tylko tekst.** Tekst już wystarcza do rozróżnienia (a11y — patrz §6), ale odznaka statusu i odznaka placementu stoją **obok siebie** w jednym rzędzie (§12.9 pkt 2: „obok odznaki statusu, nie zamiast niej") — bez różnicy kształtu dwie identyczne pigułki jedna przy drugiej czytają się jak dwa duplikaty tego samego typu informacji. `rounded-md` sygnalizuje „to jest metadana o pochodzeniu", `rounded-full` zostaje zarezerwowany dla „to jest stan".

```tsx
<div className="flex flex-wrap items-center gap-2">
	<h2 className="text-base font-semibold text-foreground">{m.title}</h2>
	<span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(m.status)}`}>
		{MODULE_STATUS_LABEL[m.status]}
	</span>
	{showPlacementBadge && (
		<span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
			{PLACEMENT_BADGE_LABEL}
		</span>
	)}
</div>
```

`flex-wrap` już istnieje w tym rzędzie (obsługuje długie tytuły) — trzecia pigułka nie wymaga zmiany layoutu, tylko spada do nowej linii na wąskich ekranach, tak jak dziś robi to sam status przy długich tytułach.

### 4.2. Kontrakt tekstu — jedno miejsce, nie literał w JSX

```ts
// src/components/curriculum/labels.ts — dopisać obok MODULE_STATUS_LABEL
export const PLACEMENT_BADGE_LABEL = "Otwarty na podstawie diagnozy · niezaliczony";
```

Cytat 1:1 z §8 dokumentu źródłowego. Stała, nie funkcja — tekst nie zależy od żadnego parametru (w przeciwieństwie do mikrocopy na powierzchni A, która interpoluje nazwy).

### 4.3. Guard — kiedy odznaka się renderuje

```ts
const showPlacementBadge = m.openedByPlacement === true && m.status !== "completed";
```

**Podwójny warunek, nie jeden.** `openedByPlacement` przychodzi z backendu (nowe pole, §7), ale **nie ufam mu jako jedynemu źródłu prawdy o tym, czy odznaka ma zniknąć po zaliczeniu** — §12.9 pkt 2 mówi wprost „odznaka znika, gdy moduł zostanie zaliczony", a wiersz w `curriculum_placements` jest **nienadpisywany i nigdy nie usuwany** (§7 pkt 2 dokumentu źródłowego: „zapis w chwili odblokowania, nigdy przeliczany wstecz, nienadpisywany"). Jeśli backend wyliczy `openedByPlacement` prostym „czy istnieje wiersz w `curriculum_placements`", to pole **zostanie `true` na zawsze**, także po zaliczeniu modułu — bo wiersz nie znika. Guard po stronie frontu (`status !== 'completed'`) jest tani i nie zależy od tego, czy backend pamięta o tym wyjątku. To jest defensywna warstwa, nie duplikacja logiki: backendowe `openedByPlacement` odpowiada na pytanie „czy KIEDYKOLWIEK", front odpowiada na pytanie „czy TERAZ warto to pokazać" — dwa różne pytania, jak w §7 pkt 3 dokumentu źródłowego przy `skipped_by_placement`.

### 4.4. Wymóg dla Ethana/Jacka — pole na `LadderModule`

`LadderModule` (`src/lib/curriculum/ladder.ts`) dziś nie niesie informacji o pochodzeniu dostępności (dług D8 z §13 dokumentu źródłowego). Proponowany kształt, wzorowany na **już istniejącym** w tym samym pliku wzorcu `hasExam?: boolean` (`ladder-view.tsx:22-26` — „ustawiane WYŁĄCZNIE gdy flaga ON, `undefined` przy OFF = linia się nie renderuje, wiersz jak dziś"):

```ts
export interface LadderModuleWithProgress extends LadderModule {
	completedItems: number;
	hasExam?: boolean;
	/**
	 * 1E.7 L6/D8 — czy moduł jest dostępny DZIĘKI wierszowi w `curriculum_placements`
	 * (reason 'qualified' | 'carried_untagged'). Ustawiane WYŁĄCZNIE gdy flaga
	 * placementDiagnostic ON. `undefined` przy OFF → odznaka się nie renderuje,
	 * wiersz jak dziś (ten sam wzorzec co `hasExam`).
	 */
	openedByPlacement?: boolean;
}
```

Nośnik i moment liczenia (czy backend woła istniejące `loadPlacementUnlockedModuleIds` i eksponuje je dalej, czy liczy osobno) — decyzja Ethana; kontrakt propsów jest mój.

### 4.5. Nagłówek `/curriculum` — poprawka D7

`src/app/(dashboard)/curriculum/page.tsx`, linie 58–61. Tekst źródłowy z §12.9 (cytat 1:1):

```tsx
<p className="mt-1 text-sm text-muted-foreground">
	{isFeatureEnabled("placementDiagnostic")
		? "Moduły od podstaw do projektu. Kolejny moduł otwiera się po zaliczeniu poprzedniego — albo od razu, jeśli diagnoza pokazała, że znasz wcześniejszy materiał. Otwarty moduł to nie zaliczony moduł."
		: "Moduły od podstaw do projektu. Kolejny moduł otwiera się dopiero po zaliczeniu poprzedniego — bez skrótów."}
</p>
```

**Dlaczego gating po fladze, nie po tym, czy KONKRETNY student ma coś odblokowane placementem.** Zdanie „bez skrótów" jest fałszywe, gdy mechanizm skrótu **istnieje w produkcie i może zadziałać**, nie tylko wtedy, gdy akurat zadziałał temu studentowi. Student z zerem odblokowań (najczęstszy przypadek, §12.5) nadal korzysta z produktu, w którym skrót jest możliwy — stary nagłówek byłby dla niego formalnie „prawdziwy dziś", ale fałszywy w chwili, gdy diagnoza kiedykolwiek coś otworzy, bez ponownego wdrożenia. Gating po fladze jest też spójny ze wzorcem całej reszty pliku (`isFeatureEnabled("curriculumPath")`, `isFeatureEnabled("masteryGate")`) — nagłówek nie wprowadza nowego rodzaju warunku.

---

## 5. `PlacementSummary` (Powierzchnia A) — kontrakt

**Nowy komponent.** `src/components/curriculum/placement-summary.tsx`.

### 5.1. Kontrakt propsów

```ts
export interface PlacementSummaryProps {
	/**
	 * null/undefined = warianty 1–4 z §12.6 (flaga OFF, brak sesji, pathKey null,
	 * drabina pusta, błąd hooka best-effort) — komponent NIE renderuje nic.
	 * Backend rozstrzyga to PRZED wysłaniem — komponent nie zgaduje przyczynę.
	 */
	summary: PlacementSummaryViewModel | null | undefined;
}

export interface PlacementSummaryViewModel {
	/** Blok 1. [] = pomiń akapit. Kolejność = kolejność drabiny (rosnąco po pozycji). */
	completedModuleTitles: string[];
	/** Blok 2, wariant „dodatkowo" — używany TYLKO gdy completedModuleTitles.length > 0. */
	unlockedModuleTitles: string[];
	/** Blok 2, wariant „aż do modułu" — używany TYLKO gdy completedModuleTitles.length === 0 i unlockedModuleTitles.length > 0. */
	deepestUnlockedTitle: string | null;
	/** Blok 2b. null = brak dziury do wyjaśnienia — akapit pominięty CAŁKOWICIE. */
	hole: PlacementHoleViewModel | null;
	/** Blok 3 — zawsze dokładnie jeden z trzech kształtów, nigdy null. */
	recommendation: PlacementRecommendation;
}

export interface PlacementHoleViewModel {
	competencyName: string;
	moduleTitle: string;
	reason: "below_threshold" | "uncovered" | "no_measurement";
	/** true = odblokowania=0 (warianty zerowe §8) → inny tekst niż niezerowy. */
	zeroUnlocked: boolean;
}

export type PlacementRecommendation =
	| { kind: "module"; title: string; isRoot: boolean } // isRoot → pełny tekst l0-start (§8)
	| { kind: "all_completed" } // wariant 10a
	| { kind: "coming_soon" }; // wariant 10b
```

**Fail-closed, jak w §12.4 dokumentu źródłowego.** Jeśli `hole.reason` nie jest jedną z trzech wartości enumerowanych w typie, TypeScript to wyłapie na etapie kompilacji — świadomie **nie** projektuję dla Jacka gałęzi `default: null` w `switch`, tylko wymuszam wyczerpujący `switch` na unii typów (Biome/TS zgłosi błąd przy nieobsłużonej wartości). To jest silniejsza wersja reguły „nieznany powód = brak zdania" niż runtime-check: błąd wychodzi na etapie budowania, nie dopiero na ekranie studenta.

### 5.2. Mapowanie viewmodel → tekst (referencja, nie duplikacja)

Nie przepisuję dziewięciu tekstów z §8 — Jack bierze je stamtąd 1:1. Tabela niżej wiąże **pole viewmodelu** z **miejscem w §8**, żeby przy implementacji nie trzeba było zgadywać, który akapit renderuje który tekst:

| Pole / warunek | Tekst z §8 |
|---|---|
| `completedModuleTitles.length > 0` | „Masz już zaliczone: **{lista}**." |
| `completedModuleTitles.length > 0 && unlockedModuleTitles.length > 0` | „Diagnoza otworzyła dodatkowo: **{lista}**." |
| `completedModuleTitles.length === 0 && unlockedModuleTitles.length > 0` | „Diagnoza otworzyła Ci ścieżkę aż do modułu **{deepestUnlockedTitle}**. To skrót w nawigacji…" |
| `completedModuleTitles.length > 0 && unlockedModuleTitles.length === 0` | „Diagnoza nie otworzyła nic ponad to — zacznij od **{moduł}**." (blok 2-wariant-C, §3.4) |
| `hole !== null && !hole.zeroUnlocked` | tekst `below_threshold`/`uncovered`/`no_measurement` (niezerowy) |
| `hole !== null && hole.zeroUnlocked` | wariant zerowy odpowiedniego powodu (§8, „Warianty »dziura, ale ZERO odblokowań«") |
| `recommendation.kind==='module' && recommendation.isRoot` | pełny tekst `l0-start` („Zacznij od Start: środowisko pracy…") |
| `recommendation.kind==='module' && !recommendation.isRoot` | „Zacznij od **{title}**." |
| `recommendation.kind==='all_completed'` | „Masz zaliczone wszystko, co dziś jest w ścieżce." |
| `recommendation.kind==='coming_soon'` | „Kolejny moduł jest w przygotowaniu." |

### 5.3. Szkic JSX (struktura, nie ostateczny kod)

```tsx
export function PlacementSummary({ summary }: PlacementSummaryProps) {
	if (!summary) return null;
	const { completedModuleTitles, unlockedModuleTitles, deepestUnlockedTitle, hole, recommendation } = summary;
	const hasCompleted = completedModuleTitles.length > 0;
	const hasUnlocked = unlockedModuleTitles.length > 0 || deepestUnlockedTitle !== null;

	return (
		<>
			{(hasCompleted || hasUnlocked || hole) && (
				<section className="rounded-lg border border-border bg-card p-4 space-y-2" aria-label="Po diagnozie">
					<h3 className="font-heading text-base font-semibold text-foreground">Po diagnozie</h3>
					{/* blok 1 */}
					{hasCompleted && <p className="text-sm text-foreground">…</p>}
					{/* blok 2 — trzy warianty, patrz 5.2 */}
					{/* blok 2b */}
					{hole && <p className="text-sm text-muted-foreground">…</p>}
				</section>
			)}
			{/* blok 3 — accent, POZA kartą neutralną, pomijamy TYLKO w wariancie 8 (§3.4) */}
			{!(hasCompleted && !hasUnlocked) && (
				<div className="rounded-lg border border-ed-amber bg-ed-badge-bg p-4 text-sm text-ed-amber-text">…</div>
			)}
		</>
	);
}
```

Kolejność DOM = kolejność JSX = kolejność zdań (§12.3, §12.10 „dostępność") — bez żadnego `order-*`/`flex-direction: row-reverse`, więc czytnik ekranu i wzrok czytają w tej samej kolejności.

---

## 6. Dostępność

- **Kolejność DOM = kolejność zdań.** Zrealizowane strukturą JSX w §5.3 — nie ma potrzeby dodatkowego `aria-*` do wymuszenia kolejności, bo kolejność jest fizyczna, nie wizualna.
- **Odznaka na drabinie czytelna tekstem.** `PLACEMENT_BADGE_LABEL` to zdanie, nie ikona ani sam kolor (§4.2) — spełnia to bez dodatkowego `aria-label`, ale dokładam `aria-label={\`Status: ${MODULE_STATUS_LABEL[m.status]}. ${showPlacementBadge ? PLACEMENT_BADGE_LABEL : ""}\`}` na kontenerze odznak, żeby czytnik ekranu przeczytał obie pigułki jako jedno zdanie, nie jako dwa oderwane fragmenty tekstu w rzędzie.
- **Kontrast.** `ed-amber-text` na `ed-badge-bg` i `text-muted-foreground` na `bg-muted` są już audytowane w tym repo (`globals.css:220`, komentarz „ŚCIEMNIONA dla kontrastu AA"; `globals.css:194`, `--muted-foreground` poprawione do 5.50:1 przy fix R5 1E.3). Nie wprowadzam nowej pary kolor tła/tekst — używam wyłącznie par, które już mają udokumentowany audyt AA w tym pliku. To jest wprost warunek ze zlecenia („dług kontrastu był już raz spłacany — nie przywracaj go").
- **Focus/klawiatura.** Ekran L6 nie wprowadza nowych elementów interaktywnych (blok 3 to tekst, nie link — patrz §9, „czego nie zaprojektowałam"). Jedyny nowy interaktywny element to odznaka na drabinie, a odznaka jest statycznym `<span>`, nie przyciskiem — nie wymaga własnego stanu fokusu.

---

## 7. Zakazy wizualne — checklist zgodności

Z §12.7 i §12.10 dokumentu źródłowego, jako lista kontrolna dla mnie i dla Jacka:

- [x] Zero pasków postępu w sekcji placementu (panel „Wynik testu" tuż wyżej już pokazuje pomiar; nowa sekcja go nie powtarza).
- [x] Zero procentów, zero wykresów.
- [x] Zero emoji.
- [x] Zero ikon ostrzegawczych przy bloku 2b (żadna ikona w ogóle — patrz §3.5 pkt 4).
- [x] Zero slugów, kodów powodów, numerów progu, poziomów 1–4 per koncept na ekranie — viewmodel niesie wyłącznie tytuły/nazwy czytelne dla człowieka (§5.1), zero pola typu `reason` renderowanego wprost jako tekst (używane tylko do wyboru gałęzi `switch`).
- [x] Zero słów „zaliczone/masz z głowy/przerobione/ukończone" przy module odblokowanym placementem — teksty z §8 tego nie zawierają, kontrakt viewmodelu nie dodaje własnych słów.
- [x] Zero obietnicy powtórki testu.
- [x] Zero licznika „X z N modułów" w nagłówku/pierwszym zdaniu przy zerze odblokowań (§12.5) — wariant 5/6 zaczyna od bloku 3, nie od informacji o tym, czego nie ma.

---

## 8. Design tokeny użyte — bez nowych

| Element | Token | Skąd (precedens w repo) |
|---|---|---|
| Karta neutralna (A) | `border-border`, `bg-card` | `step-wnioski.tsx`, panel „Wynik testu" (linia ok. 190) |
| Tekst bloku 1/2 (A) | `text-sm text-foreground`, interpolacja `font-medium` | `step-wnioski.tsx`, nagłówek celu (linia ok. 148) |
| Tekst bloku 2b (A) | `text-sm text-muted-foreground` | `step-wnioski.tsx`, tekst uncovered (linia ok. 215) |
| Accent-box bloku 3 (A) | `border-ed-amber`, `bg-ed-badge-bg`, `text-ed-amber-text` | `step-wnioski.tsx`, `profileNote` i karta „zaznaczyłeś wszystko" (linie ok. 224, 269) |
| Odznaka statusu (B, bez zmian) | `statusBadgeClass()` | `labels.ts` |
| Odznaka placementu (B, nowa) | `border-border`, `bg-muted`, `text-muted-foreground`, `rounded-md` | te same tokeny co `locked`/`coming_soon` w `labels.ts`, nowy kształt (§4.1) |
| Odstępy | `space-y-2`/`gap-2`, `p-4` | zgodne ze skalą 4 px używaną w całym pliku |

Zero nowego tokena w `globals.css`. Każdy kolor użyty tu już istnieje i już ma przypisane znaczenie gdzie indziej w repo — nowość jest wyłącznie w **kompozycji** (który token, w którym miejscu), nie w palecie.

---

## 9. Czego NIE zaprojektowałam — i dlaczego

1. **„Karta wejścia w moduł" dla powodów `qualified`/`carried_untagged` (§12.4 dokumentu źródłowego).** **[v0.2 — rozstrzygnięte, nie luka.]** W v0.1 zgłosiłam to jako pytanie o zakres: §12.1 deklarowało „dwie powierzchnie", a §12.4 wymagało trzeciej lokalizacji dla dwóch z dziewięciu powodów. Sophia rozstrzygnęła w v0.9: **karta nie wchodzi do L6** — `supportMode` (pole, które miała komunikować) nie ma dziś w produkcie ani jednego czytelnika poza samym silnikiem placementu, więc karta opisywałaby decyzję bez skutku. §12.4 zawężona do wyłącznie powierzchni B; teksty z §8 czekają na powierzchnię jako dług **D12** (§13 dokumentu źródłowego, próg: pierwszy czytelnik `supportMode`). Nic do zaprojektowania — nie ma czego umiejscawiać, dopóki dług nie zostanie spłacony gdzie indziej.
2. **Link/CTA na bloku 3.** Rozważyłam zrobienie z tytułu rekomendowanego modułu klikalnego linku do `/curriculum/[moduleId]`. **[v0.2 — decyzja „bez linku" zostaje, przesłanka z v0.1 była błędna i została sprostowana przez Sophię.]** W v0.1 pisałam, że `POST /api/onboarding` (zapis `career_goal`) leci dopiero po kliknięciu „Przejdź do pulpitu" — nieprawda: leci **przed** renderem kroku 4, wewnątrz `handleDiagnosisFinished` (`onboarding-wizard.tsx:429`). Cel kariery jest już w wierszu studenta, gdy student widzi ten ekran — link nie byłby martwy z powodu, który podałam. Mimo to zostaje tekstem, z trzech powodów produktowych (§12.3 dokumentu źródłowego v0.9, w kolejności wagi): (a) link ominąłby powierzchnię B przy pierwszym kontakcie — powierzchnia A znika po jednym przejściu kreatora, więc wysłanie studenta prosto do środka modułu omija jedyny trwały nośnik „otwarte ≠ zaliczone"; (b) krok „Wnioski" ma już trzy wyjścia (`onComplete()` na pulpit, `/gap-analysis`, `/projects`) — czwarty przycisk nie wzmacnia rekomendacji, tylko rozpuszcza jedyny akcent, który §12.10 jej przyznaje; (c) rekomendacja w pilotażu to niemal zawsze `l0-start` (nadpisanie z DECYZJI 3, pierwszy wiersz drabiny) — koszt braku linku to jedno spojrzenie na górę listy, nie uzasadnia (a)+(b). **Wymóg wiążący na przyszłość (Sophia, dla Jacka):** jeśli rekomendacja kiedykolwiek stanie się klikalna, wyłącznie przez istniejący wzorzec `onComplete(target)` prowadzący do `/curriculum` — nigdy surowym `<Link>`/`<a>` z kroku 4 (wyjście poza `onComplete()` zostawia `onboardingCompleted=false`, więc powrót do `/onboarding` wznawia kreator, który student uważa za skończony). Taka zmiana wymaga sign-offu Sophii.
3. **Stan ładowania / błędu dla `PlacementSummary` na powierzchni A.** Świadomie brak — komponent dostaje `summary` jako gotowy prop w tym samym przejściu renderu co reszta Wniosków (`step-wnioski.tsx` jest już server-driven, dane są na miejscu przy pierwszym renderze, nie ma osobnego `fetch` z tego komponentu). Gdyby backend kiedyś zamienił to na fetch po stronie klienta, potrzebny byłby stan ładowania — dziś nie jest, i dodanie go byłoby projektowaniem dla architektury, która nie istnieje.
4. **Zdanie o trybie wsparcia przy wejściu w moduł graniczny** (§8: „zostawiamy pełne wsparcie włączone…") — tekst istnieje, powierzchni nie ma (dług D12, punkt 1 wyżej). Nie projektuję dla niego miejsca, dopóki dług nie zostanie odebrany komuś z nazwanym właścicielem.

---

## 10. Self-critique — 5 słabości i co z nimi zrobiłam

Rola: principal designer z SaaS-u znanego z dyscypliny produktowej (Linear, Stripe), świeżo po launchu, w którym poprawny werdykt merytoryczny wyrenderował się jako ekran, który student **przeczytał inaczej, niż go napisano**, bo hierarchia zdradziła treść.

**1. „Reużywasz `border-ed-amber/bg-ed-badge-bg` dla bloku 3, ale ten sam token-set w tym samym pliku już oznacza dwie RÓŻNE rzeczy — ostrzeżenie (`profileNote`, zastrzeżenie o pokryciu) i pochwałę (»zaznaczyłeś wszystko«, koniec listy luk). Dokładasz TRZECIE znaczenie (»zrób to teraz«) do tego samego wizualnego słownika — student, który widział dwa poprzednie boxy, nie ma gwarancji, że trzeci odczyta tak samo."**
→ Sprawdziłam: to nie jest przypadek, tylko wspólny mianownik trzech pozornie różnych sytuacji. Wszystkie trzy boxy w tym pliku mówią jedno: „przeczytaj to zdanie uważnie, zanim pójdziesz dalej" — zastrzeżenie, pochwała i rekomendacja są różnymi *treściami* tej samej *funkcji* (uwaga wyżej niż przeciętne zdanie na ekranie). To wzmacnia spójność, nie osłabia ją. Zostawiam, ale dopisuję to uzasadnienie explicite w §3.5 pkt 3, zamiast zakładać, że czytelnik specyfikacji sam to wywnioskuje.

**2. „Guard `status !== 'completed'` na odznace placementu jest dobry, ale nie sprawdziłaś przypadku »moduł zaliczony, POTEM zresetowany« (§6e defekt wyspy) — po resecie status wraca na `available`, a `openedByPlacement` z backendu (jeśli liczone z istnienia wiersza) nadal jest `true`. Odznaka WRÓCI, mimo że student zresetował moduł, który wcześniej zaliczył zwykłą pracą, nie diagnozą."**
→ To prawdziwa luka, ale dokument źródłowy sam nazywa reset „nieosiągalnym dziś" (§6e: „nie jest blokerem zapłonu — defekt jest dziś nieosiągalny", nie ma jeszcze funkcji resetu). Nie projektuję rozwiązania dla mechanizmu, który nie istnieje — zapisuję to jednak jako świadome ograniczenie w §9 zamiast milczeć: guard `status !== 'completed'` chroni przed jednym znanym przypadkiem (zaliczenie), nie przed hipotetycznym drugim (reset po zaliczeniu przez pracę, nie przez placement). Gdy reset wejdzie do produktu, ten guard wymaga rewizji razem z resztą reguł resetu (Ethan, §6e) — dopisuję to zastrzeżenie do §4.3.

**3. „Twoja tabela w §3.3 mówi »2b jeśli dziura« dla wariantów 5/6/7/9, ale wariant 6 (»dziury brak«) z definicji NIE MA dziury — po co ta adnotacja tam w ogóle stoi w Twojej głowie, skoro w tabeli i tak piszesz »wyłącznie blok 3«? To niespójność zapisu, nie logiki."**
→ Sprawdziłam własną tabelę: wiersz 6 poprawnie **nie ma** adnotacji „2b" (bo nie może jej mieć), więc kod jest spójny — ale mój opis w tym punkcie samokrytyki był nieprecyzyjny w pierwszym szkicu (napisałam „5/6/7/9" łącznie, sugerując, że 6 też warunkowo dostaje 2b). Poprawiłam sformułowanie w §3.3, żeby wiersz 6 nie sugerował fałszywej symetrii z 5/7/9.

**4. „Blok 2-wariant-C (wariant 8) żyje w Twoim viewmodelu jako trzecia gałąź `if` bez własnego pola w `PlacementSummaryViewModel` — Jack musi WYWNIOSKOWAĆ ją z kombinacji `completedModuleTitles.length>0 && unlockedModuleTitles.length===0`, zamiast dostać ją jako jawny stan. To jest dokładnie błąd, przed którym ostrzega Twój własny cytat z reguły fail-closed w §12.4 dokumentu źródłowego — niejawna gałąź wynikająca z kombinacji pól to źródło pomyłek."**
→ Trafne i naprawiłam: to nie jest to samo ryzyko co fail-closed na `reason` (tam wartości są skończone i enumerowane przez typ), ale masz rację, że kombinacja dwóch długości tablic jest łamliwsza niż jawne pole. Dodałam w §5.2 jawną tabelę warunków (już była), ale w tym przebiegu dopisuję **explicit note w kontrakcie** (§5.1, komentarz przy `unlockedModuleTitles`), że `length===0` przy `completedModuleTitles.length>0` jest właśnie tym trzecim wariantem — nie zostawiam Jacka z samą tabelą w oddzielnej sekcji.

**5. „Nie zaprojektowałaś, co się dzieje, gdy `PlacementSummary` na powierzchni A renderuje pusty box `blok 3`, bo `recommendation` przyszedł jako `undefined` z powodu błędu backendu W TRAKCIE gdy reszta danych (blok 1/2) jest poprawna — Twój kontrakt mówi »recommendation zawsze jeden z trzech kształtów, nigdy null«, ale »nigdy« w kontrakcie TypeScript nie znaczy »nigdy w praktyce«, jeśli backend ma bug."**
→ Słuszne — kontrakt typu nie jest gwarancją runtime. Nie dodaję jednak osobnego stanu błędu w komponencie: to dokładnie ten przypadek, który §12.6 wariant 4 już rozstrzyga na poziomie backendu („placement policzył się z błędem → sekcja NIE ISTNIEJE, nigdy pusta ani »nie udało się«") — więc poprawną odpowiedzią na błędny/niekompletny wynik jest **backend nie wysyła `summary` w ogóle** (cały obiekt `null`), nie „wysyła połowicznie wypełniony obiekt i front łata dziury". Zapisuję to jako wymóg kontraktu w §5.1 (już tam jest przez typ `| null`), ale precyzuję explicite w komentarzu przy `recommendation`, że backend **nigdy nie wysyła `summary` z brakującą rekomendacją** — całość albo nic, tak jak §12.8 pkt 3 wymaga dla samej dziury („dziura przychodzi jako komplet albo nie przychodzi wcale") — rozszerzam tę samą regułę na cały obiekt, nie tylko na `hole`.

---

## 11. Pytania do Sophii — rozstrzygnięte w v0.9 (zapis historyczny)

Trzy pytania z v0.1. Wszystkie rozstrzygnięte przez Sophię w `decyzje-1e7-placement-v0.1.md` v0.9 — zapisuję werdykty tu, żeby jeden dokument nie musiał być czytany obok drugiego dla zrozumienia, co się zmieniło i dlaczego.

1. **„Karta wejścia w moduł" — trzecia powierzchnia czy poza zakresem?** → **Poza zakresem, na stałe.** §12.4 zawężona do powierzchni B; dług **D12**, próg „pierwszy czytelnik `supportMode`". Szczegóły: §9 pkt 1.
2. **Nagłówek „Twoja ścieżka" — mój tekst poza §8.** → **Odrzucony.** Wiążący nagłówek: **„Po diagnozie"**, teraz w §8; reguła „teksty 1:1" rozszerzona przez Sophię na nagłówki i `aria-label`. Szczegóły: §3.7.
3. **Czy blok 3 powinien kiedyś być linkiem?** → **Zostaje tekstem — ale moje uzasadnienie (kolejność zapisów D0) było oparte na nieprawdziwym fakcie i Sophia je sprostowała.** Cel kariery jest w wierszu studenta już w chwili renderu kroku 4 (`handleDiagnosisFinished` zapisuje go przed `advanceTo(4)`) — link nie byłby martwy. Decyzja „bez linku" stoi na trzech powodach produktowych, nie na tym błędnym fakcie. Szczegóły i wymóg na przyszłość: §9 pkt 2.

Żadne z trzech nie blokuje implementacji Jacka po tej wersji — wszystkie mają rozstrzygnięty, wiążący wybór udokumentowany w tym dokumencie.

---

## 12. Podsumowanie decyzji — dla szybkiego przeglądu

| Decyzja | Uzasadnienie w skrócie |
|---|---|
| `PlacementSummary` renderuje `null` sam, rodzic nie warunkuje | cztery przyczyny „sekcji nie ma" złożone w jedną decyzję backendu — front nie duplikuje logiki |
| Blok 1/2/2b w jednej karcie neutralnej, identyczna typografia | dosłowny parytet 1 vs 2 (§12.10); 2b o jeden stopień niżej, bo to kontekst, nie osobny komunikat |
| Blok 3 w osobnym accent-boxie, poza kartą neutralną | jedyny akcent na ekranie; token-set reużyty z dwóch istniejących miejsc w tym samym pliku |
| Wariant 8 bez osobnego bloku 3 | zdanie 2-wariant-C już zawiera rekomendację — osobny box powtórzyłby ją w innym stylu |
| Odznaka placementu: te same kolory co `locked`/`coming_soon`, inny kształt (`rounded-md`) | brak wolnej piątej barwy statusu; kolory bezpieczne, bo nigdy nie współwystępują z odznaką placementu na tym samym module |
| Guard `status !== 'completed'` na odznace, dodatkowo do pola z backendu | wiersz w `curriculum_placements` nigdy nie znika — front nie może polegać wyłącznie na backendowym polu, by odznaka zniknęła po zaliczeniu |
| Brak linku na bloku 3 | **[v0.2]** nie dlatego, że link byłby martwy (cel kariery jest w wierszu studenta już przy renderze kroku 4 — sprostowanie Sophii) — tylko bo link ominąłby powierzchnię B przy pierwszym kontakcie, rozpuściłby jedyny akcent ekranu czwartym przyciskiem, a rekomendacja w pilotażu to niemal zawsze pierwszy wiersz drabiny |
| Nagłówek sekcji: „Po diagnozie", nie „Twoja ścieżka" | **[v0.2]** „Twoja ścieżka" koliduje nazwą z `/curriculum`, ramuje wycinek jako stan ścieżki (zakaz §12.7 pkt 1) i duplikuje istniejącą etykietę „Twój plan nauki"; „Po diagnozie" nazywa chwilę, nie stan — wiążący tekst z §8 |
| Karta wejścia w moduł poza zakresem L6 | **[v0.2]** `supportMode` (co karta miała komunikować) nie ma dziś czytelnika w produkcie — komunikat opisywałby decyzję bez skutku; zaksięgowane jako dług D12 |
| Zero nowych tokenów kolorów | każdy użyty token ma już audyt AA i przypisane znaczenie gdzie indziej w repo |
