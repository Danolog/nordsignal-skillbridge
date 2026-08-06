# Inwentarz flag produkcyjnych SkillBridge — stan zmierzony 2026-08-06

**Wersja:** v1.0 · 2026-08-06 · autor: Eva (Platform/DevOps) · zlecenie: Oliver (COO), zadanie A1 roadmapy v4 §8.2
**Rewizja repo:** `97d1fd40a8777aebe3e1ad6863f8b52b6ce8704b` (`origin/main`)
**Produkcja:** `https://skill-bridge-ai-seven.vercel.app`
**Okno pomiarowe:** 2026-08-06, 12:26–12:33 CEST (trzy przebiegi, wyniki zgodne)

---

## 0. Co ten dokument ustala, a czego nie

Ustala **efektywny stan zapłonu** 18 flag na produkcji, zmierzony wyłącznie zachowaniem
publicznych odczytów (GET). **Żadna wartość zmiennej środowiskowej nie została odczytana
ani nie jest tu cytowana** — zmienne flag są typu wrażliwego, a `FLAG_PLACEMENT_DIAGNOSTIC`
jest wrażliwa na trwałe. Metoda jest w całości behawioralna i w całości nieinwazyjna:
wykonano **wyłącznie żądania GET**, zero POST, zero zapisów, zero zmian stanu.

**Wynik w jednym zdaniu: 5 flag żywych, 1 martwa, 12 niezweryfikowanych sondą anonimową.**
Dla każdej z 12 niezweryfikowanych podana jest nazwana luka dowodowa i konkretna sonda
domykająca (sekcja 5). Zgodnie z CLAUDE.md §8 v1.16 etykieta „niezweryfikowane" jest
dopuszczalna; udawanie sprawdzonego nie jest — i **żadnego z tych 12 wierszy nie wolno
cytować później jako ustalenia faktu**.

---

## 1. Weryfikacja liczby flag — 18 potwierdzone

Zlecenie mówiło o 18 wpisach. Sprawdzone, nie przyjęte na słowo.

```
$ grep -c 'envVar: "FLAG_' src/lib/flags.ts
18
```

Nazwy kluczy rejestru `FLAGS` (`src/lib/flags.ts`, linie 51–194), 18 wpisów:
`proactiveMarketRefresh, marketGapNotifications, advisorMemory, humanReviewQueue,
sandboxRunner, diagnosticAssessment, socraticTutor, vivaDefense, placementTracking,
studyRhythm, careerModelFromDb, curriculumPath, passportVerifiedOnly, confidenceProbe,
passportFreshness, masteryGate, spacedRepetition, placementDiagnostic`.

Liczba zgadza się. **Uwaga dla przyszłych inwentarzy:** flaga `gapVerifier` (AG.1) została
usunięta z rejestru 2026-07-07, a jej zmienna `FLAG_GAP_VERIFIER` mogła zostać na Vercelu
(komentarz `src/lib/flags.ts:195–198`). Zmienna bez wpisu w rejestrze jest niewidoczna dla
tej metody i dla każdej innej metody behawioralnej — nic jej nie czyta.

---

## 2. Metoda — i dwie pułapki, które ją fałszują

Sonda opiera się na jednym fakcie o kodzie: w tym repo bramka flagi w trasie API stoi
**przed** sprawdzeniem sesji. Wzorzec, dosłownie (`src/app/api/curriculum/route.ts:18–23`):

```ts
export async function GET() {
	if (!isFeatureEnabled("curriculumPath")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

Stąd kryterium dla **trasy API eksportującej GET, z bramką flagi przed auth**:

| Kod HTTP | Znaczenie |
|---|---|
| **404** z ciałem `{"error":"Not found"}` (typ `application/json`) | flaga **zgaszona** — kod trasy się wykonał i sam zwrócił tę odpowiedź |
| **404** z ciałem HTML | **trasy nie ma w buildzie** — to strona błędu frameworka, nie odpowiedź trasy |
| **401** | flaga **zapalona** — żądanie przeszło bramkę flagi i zatrzymało się dopiero na sesji |

Rozróżnienie dwóch rodzajów 404 jest istotne i **zmierzone**, nie założone. Bez niego werdykt
„martwa" byłby nieodróżnialny od „kodu nie ma na produkcji" (odczyt 2026-08-06 12:32:48 CEST):

```
$ curl -s -D - -o - .../api/market-refresh/runs/latest | grep -iE '^(HTTP|content-type)'
HTTP/2 404
content-type: application/json
body: {"error":"Not found"}                       <- odpowiedź TRASY: kod wdrożony, flaga zgaszona

$ curl -s -D - -o - .../api/nie-istnieje-kontrola | grep -iE '^(HTTP|content-type)'
HTTP/2 404
content-type: text/html; charset=utf-8
body: <!DOCTYPE html><html lang="pl">…            <- strona błędu frameworka: trasy nie ma
```

### Pułapka 1 — kod 405 nie niesie żadnej informacji o fladze

Roadmapa czytała 405 jako „trasa żyje". To jest **fałszywy sygnał**. Trasa eksportująca
wyłącznie POST odpowiada na GET kodem 405 **zanim uruchomi jakikolwiek kod modułu** — bramka
flagi siedzi wewnątrz handlera POST, którego GET nigdy nie wywołuje. 405 mówi wyłącznie
„plik trasy jest w buildzie", czyli „kod wdrożony", i milczy o zapłonie.

Dowód empiryczny, nie rozumowanie: rodzina `market-refresh` ma flagę **zmierzoną jako
martwą** (sekcja 3, `/api/market-refresh/runs/latest` → 404), a jej trasy POST-only i tak
zwracają 405:

```
$ curl -s -o /dev/null -w '%{http_code}' https://skill-bridge-ai-seven.vercel.app/api/market-refresh/ingest
405
$ curl -s -o /dev/null -w '%{http_code}' https://skill-bridge-ai-seven.vercel.app/api/market-refresh/recompute
405
```

Martwa flaga, a mimo to 405. Poprawka Olivera („cokolwiek innego niż 404 = trasa istnieje")
jest **prawdziwa co do istnienia trasy i nieprawdziwa co do stanu flagi**. W tym inwentarzu
405 traktuję wyłącznie jako dowód, że kod jest wdrożony — nigdy jako werdykt o zapłonie.

Ta sama obserwacja ma pożyteczną stronę: 405 pozwala odróżnić „flaga zgaszona" od „kodu nie
ma na produkcji". Rodzina `market-refresh` jest wdrożona (405 na dwóch trasach POST), więc
404 na jej trasie GET pochodzi z bramki flagi, a nie z braku deployu.

### Pułapka 2 — pośrednik żądań przechwytuje strony przed bramką flagi

Sondy **stronowe** pod `/curriculum` są bezwartościowe i o mało nie dały mi fałszywego
„żywa". W repo jest pośrednik żądań (ang. *middleware* — kod wykonywany przed dotarciem
żądania do strony), `src/middleware.ts:45–58`:

```ts
export const config = {
	matcher: [ "/api/:path*", "/dashboard/:path*", "/onboarding/:path*", "/skill-map/:path*",
		"/gap-analysis/:path*", "/projects/:path*", "/passport", "/profil/:path*",
		"/curriculum/:path*" ],
};
```

Dla stron (nie-API) pośrednik przekierowuje żądanie bez ciasteczka sesji na `/login`
**zanim strona się wykona** — więc bramka flagi w kodzie strony nigdy nie zostaje osiągnięta.
Rozpoznanie w wyjściu: pośrednik dokłada parametr `callbackUrl`, a `redirect("/login")`
w kodzie strony — nie:

```
$ curl -s -D - -o /dev/null https://skill-bridge-ai-seven.vercel.app/curriculum | grep -i '^location:'
location: /login?callbackUrl=%2Fcurriculum          <- pośrednik, sonda NIEWAŻNA

$ curl -s -D - -o /dev/null https://skill-bridge-ai-seven.vercel.app/powtorki | grep -i '^location:'
location: /login                                    <- kod strony, sonda WAŻNA
```

`/powtorki` nie jest w matcherze, więc jego 307 dowodzi, że strona **się wykonała** i minęła
`if (!isFeatureEnabled("spacedRepetition")) notFound();`
(`src/app/(dashboard)/powtorki/page.tsx:36–39`). Odwrotnie: 307 na `/curriculum/<uuid>/exam`
nie dowodzi niczego o `masteryGate` — dlatego ta flaga jest niżej oznaczona jako
niezweryfikowana, mimo że sonda zwróciła „obiecujący" kod.

### Kontrole negatywne

```
$ curl -s -o /dev/null -w '%{http_code}' .../api/nie-istnieje-kontrola
404
$ curl -s -o /dev/null -w '%{http_code}' .../api/diagnoza/summary
404
$ curl -s -o /dev/null -w '%{http_code}' .../nie-istnieje-strona-kontrola
404
```

`/api/diagnoza/summary` to ścieżka **zgadnięta**, nie wzięta z drzewa `src/app/api` — nie ma
jej w repo, więc jej 404 nie mówi nic o żadnej fladze. Wszystkie ścieżki w tabeli poniżej
pochodzą z `find src/app/api -name route.ts` i z powiązania flaga→trasa odczytanego z kodu
(`grep -rn "isFeatureEnabled(" src`), nigdy z pamięci.

---

## 3. Tabela inwentarza — 18 flag

Wszystkie sondy: `curl -s -o /dev/null -w '%{http_code}' -X GET https://skill-bridge-ai-seven.vercel.app<ścieżka>`,
odczyt **2026-08-06 12:26 CEST** (redirecty: 12:27 CEST). Kolumna „wyjście" cytuje realny kod zwrócony przez tę komendę.

| # | Flaga | Zmienna | Powierzchnia (z kodu) | Sonda (ścieżka GET) | Wyjście | Werdykt |
|---|---|---|---|---|---|---|
| 1 | `curriculumPath` | `FLAG_CURRICULUM_PATH` | `/api/curriculum` (GET, bramka przed auth, `route.ts:19`) | `/api/curriculum` | **401** | **ŻYWA** |
| 2 | `curriculumPath` (kontrola) | j.w. | `/api/curriculum/modules/[id]` (GET, `route.ts:20`) | `/api/curriculum/modules/0000…0000` | **401** | **ŻYWA** (potwierdzenie) |
| 3 | `spacedRepetition` | `FLAG_SPACED_REPETITION` | `/api/review/queue` (GET, bramka przed auth, `route.ts:57`) | `/api/review/queue` | **401** | **ŻYWA** |
| 4 | `spacedRepetition` (kontrola) | j.w. | strona `/powtorki` (`notFound()` przed sesją, poza matcherem pośrednika) | `/powtorki` | **307 → `/login`** (bez `callbackUrl`) | **ŻYWA** (potwierdzenie niezależne) |
| 5 | `humanReviewQueue` | `FLAG_HUMAN_REVIEW_QUEUE` | `/api/review-queue` (GET, bramka przed auth, `route.ts:79`) | `/api/review-queue` | **401** | **ŻYWA** |
| 6 | `humanReviewQueue` (kontrola) | j.w. | strona `/review/login` (`notFound()` gdy off, strona publiczna) | `/review/login` | **200** | **ŻYWA** (potwierdzenie niezależne) |
| 7 | `socraticTutor` | `FLAG_SOCRATIC_TUTOR` | `/api/projects/[id]/tutor` (GET, bramka przed auth, `route.ts:61`) | `/api/projects/0000…0000/tutor` | **401** | **ŻYWA** |
| 8 | `vivaDefense` | `FLAG_VIVA_DEFENSE` | `/api/submissions/[id]/viva` (GET, bramka przed auth, `route.ts:24`) | `/api/submissions/0000…0000/viva` | **401** | **ŻYWA** |
| 9 | `proactiveMarketRefresh` | `FLAG_PROACTIVE_MARKET_REFRESH` | `/api/market-refresh/runs/latest` (GET, `guardMarketRefresh`: flaga przed tokenem, `auth.ts:33–41`) | `/api/market-refresh/runs/latest` | **404**, ciało `{"error":"Not found"}`, typ `application/json` | **MARTWA** (kod wdrożony — odpowiedź pochodzi z trasy, nie z frameworka) |
| 10 | `masteryGate` | `FLAG_MASTERY_GATE` | wyłącznie POST (`/api/exam/*`) + strony pod `/curriculum` | `/api/exam/start` → 405; `/curriculum/0000…/exam` → 307 z `callbackUrl` | **405 / 307** | **NIEZWERYFIKOWANA** — obie sondy ślepe (pułapka 1 i 2) |
| 11 | `studyRhythm` | `FLAG_STUDY_RHYTHM` | wyłącznie POST (`/api/rhythm`, `/rhythm/checkin`, `/rhythm/stagnation-dismiss`) + sekcja na `/moja-droga` **za** sprawdzeniem sesji | `/api/rhythm` | **405** | **NIEZWERYFIKOWANA** — brak trasy GET |
| 12 | `placementTracking` | `FLAG_PLACEMENT_TRACKING` | wyłącznie POST (`/api/placement/consent`, `/api/placement/events`) + fragmenty UI onboardingu i profilu | `/api/placement/consent` → 405; `/api/placement/events` → 405 | **405 / 405** | **NIEZWERYFIKOWANA** — brak trasy GET |
| 13 | `diagnosticAssessment` | `FLAG_DIAGNOSTIC_ASSESSMENT` | wyłącznie POST (`/api/assessment/start`, `/[id]/answer`, `/[id]/complete`, `/api/onboarding`) + prop strony onboardingu | `/api/assessment/start` | **405** | **NIEZWERYFIKOWANA** — brak trasy GET |
| 14 | `marketGapNotifications` | `FLAG_MARKET_GAP_NOTIFICATIONS` | wyłącznie POST (`/api/market-notifications/consent`, `/read`) + kafel pulpitu za sesją | `/api/market-notifications/consent` → 405; `/read` → 405 | **405 / 405** | **NIEZWERYFIKOWANA** — brak trasy GET |
| 15 | `advisorMemory` | `FLAG_ADVISOR_MEMORY` | gałąź **wewnątrz** POST `/api/career-helper/session/[id]/{turn,summary}` — nie bramkuje trasy | brak sondy GET | — | **NIEZWERYFIKOWANA** — nie bramkuje żadnej powierzchni HTTP |
| 16 | `sandboxRunner` | `FLAG_SANDBOX_RUNNER` | gałąź **wewnątrz** POST `/api/projects/[id]/submit:114` — nie bramkuje trasy | brak sondy GET | — | **NIEZWERYFIKOWANA** — nie bramkuje żadnej powierzchni HTTP |
| 17 | `careerModelFromDb` | `FLAG_CAREER_MODEL_FROM_DB` | źródło danych w `ensureCareerModelLoaded` — **zero różnicy w kodzie HTTP**, a przy błędzie/braku wiersza cichy powrót do statycznego JSON (`loader.ts:47–77`) | brak sondy GET | — | **NIEZWERYFIKOWANA** — nierozstrzygalna behawioralnie (patrz §5) |
| 18 | `passportVerifiedOnly` | `FLAG_PASSPORT_VERIFIED_ONLY` | **treść** odpowiedzi `/api/passport` i `/api/passport/[id]` oraz stron paszportu — nie kod HTTP | brak sondy anonimowej | — | **NIEZWERYFIKOWANA** — bramkuje kształt, nie istnienie |
| 19 | `passportFreshness` | `FLAG_PASSPORT_FRESHNESS` | prywatny panel na `/passport` **za** sesją; dodatkowo sprzężona w kodzie z `passportVerifiedOnly` (`passport/page.tsx:57`) | brak sondy anonimowej | — | **NIEZWERYFIKOWANA** — powierzchnia wyłącznie za logowaniem |
| 20 | `confidenceProbe` | `FLAG_CONFIDENCE_PROBE` | prop `confidenceProbeEnabled` widoku elementu curriculum + gałąź w POST `/api/curriculum/items/[id]/answer` | brak sondy anonimowej | — | **NIEZWERYFIKOWANA** — fragment UI za logowaniem |
| 21 | `placementDiagnostic` | `FLAG_PLACEMENT_DIAGNOSTIC` | pole `openedByPlacementEver` w elementach `modules[]` odpowiedzi `/api/curriculum` + wybór tekstu wstępu na `/curriculum`; `requires: ["masteryGate"]` | brak sondy anonimowej | — | **NIEZWERYFIKOWANA** — bramkuje klucz w odpowiedzi, nie trasę |

Wiersze 2, 4 i 6 to kontrole potwierdzające tę samą flagę drugą, niezależną powierzchnią —
**inwentarz obejmuje 18 flag**, nie 21 pozycji.

### Podsumowanie liczbowe

| Werdykt | Liczba | Flagi |
|---|---|---|
| **ŻYWA** | 5 | `curriculumPath`, `spacedRepetition`, `humanReviewQueue`, `socraticTutor`, `vivaDefense` |
| **MARTWA** | 1 | `proactiveMarketRefresh` |
| **NIEZWERYFIKOWANA** | 12 | `masteryGate`, `studyRhythm`, `placementTracking`, `diagnosticAssessment`, `marketGapNotifications`, `advisorMemory`, `sandboxRunner`, `careerModelFromDb`, `passportVerifiedOnly`, `passportFreshness`, `confidenceProbe`, `placementDiagnostic` |

---

## 4. Pełne wyjście sondy — cytat dosłowny

Odczyt **2026-08-06 12:26:26 CEST**, jeden przebieg, wyjście niezredagowane:

```
$ B=https://skill-bridge-ai-seven.vercel.app; U=00000000-0000-4000-8000-000000000000
$ for p in ...; do printf "%-45s -> %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' -X GET "$B$p")"; done

/api/curriculum                               -> 401
/api/curriculum/modules/00000000-0000-4000-8000-000000000000 -> 401
/api/review/queue                             -> 401
/api/review-queue                             -> 401
/review/login                                 -> 200
/api/projects/00000000-0000-4000-8000-000000000000/tutor -> 401
/api/submissions/00000000-0000-4000-8000-000000000000/viva -> 401
/api/market-refresh/runs/latest               -> 404
/curriculum                                   -> 307
/curriculum/00000000-0000-4000-8000-000000000000/exam -> 307
/curriculum/atom/ds/foo                       -> 307
/powtorki                                     -> 307
/api/rhythm                                   -> 405
/api/exam/start                               -> 405
/api/placement/consent                        -> 405
/api/placement/events                         -> 405
/api/assessment/start                         -> 405
/api/nie-istnieje-kontrola                    -> 404
/api/diagnoza/summary                         -> 404
```

Odczyt **2026-08-06 12:27:04 CEST**, przekierowania i kontrole:

```
/curriculum                                -> 307 | location: /login?callbackUrl=%2Fcurriculum
/curriculum/00000000-…-000000000000/exam   -> 307 | location: /login?callbackUrl=%2Fcurriculum%2F…%2Fexam
/curriculum/atom/ds/foo                    -> 307 | location: /login?callbackUrl=%2Fcurriculum%2Fatom%2Fds%2Ffoo
/powtorki                                  -> 307 | location: /login
/api/market-refresh/ingest                 -> 405
/api/market-refresh/recompute              -> 405
/api/market-notifications/consent          -> 405
/api/market-notifications/read             -> 405
/nie-istnieje-strona-kontrola              -> 404 | (brak Location)
/market-refresh                            -> 200 | (brak Location)
/moja-droga                                -> 307 | location: /login
/onboarding                                -> 307 | location: /login?callbackUrl=%2Fonboarding
/profil                                    -> 307 | location: /login?callbackUrl=%2Fprofil
/dashboard                                 -> 307 | location: /login?callbackUrl=%2Fdashboard
```

Odczyt **2026-08-06 12:32:48 CEST**, powtórzenie sond kluczowych (kontrola stabilności —
sprawdzenie, czy wynik nie był chwilowym stanem, np. zimnym startem):

```
/api/curriculum                                    -> 401
/api/review/queue                                  -> 401
/api/review-queue                                  -> 401
/api/projects/00000000-…-000000000000/tutor        -> 401
/api/submissions/00000000-…-000000000000/viva      -> 401
/api/market-refresh/runs/latest                    -> 404
/review/login                                      -> 200
/powtorki                                          -> 307
```

Wyniki identyczne z przebiegiem sprzed sześciu minut — żaden werdykt tego dokumentu nie
stoi na pojedynczym odczycie.

Uwaga do wiersza `/market-refresh` → **200**: ta strona **nie ma bramki flagi** w kodzie
(nie występuje w wyniku `grep -rn "isFeatureEnabled(" src`), więc jej 200 nie mówi nic
o `proactiveMarketRefresh`. Werdykt „martwa" dla tej flagi stoi wyłącznie na 404 z
`/api/market-refresh/runs/latest`, podpartym 405 z dwóch tras POST tej samej rodziny
(dowód, że kod jest wdrożony).

---

## 5. Nazwane luki dowodowe i sondy domykające

Dla każdej z 12 niezweryfikowanych flag: **dlaczego** sonda anonimowa nie rozstrzyga i
**czym** to domknąć. Wszystkie sondy domykające są nadal odczytami (GET) — żadna nie
wymaga zapisu ani odczytu wartości zmiennej.

**Wymagają konta studenta testowego (ciasteczko sesji) — 7 flag.** Luka: powierzchnia flagi
leży wyłącznie za logowaniem albo za pośrednikiem żądań.

| Flaga | Sonda domykająca (GET z ciasteczkiem sesji) | Rozstrzygnięcie |
|---|---|---|
| `masteryGate` | `/curriculum/<realny moduleId>/exam` | 404 = zgaszona (przy `curriculumPath` żywej, co jest ustalone) / 200 = zapalona |
| `studyRhythm` | `/moja-droga` | obecność sekcji rytmu nauki w HTML = zapalona |
| `placementTracking` | `/profil` | obecność sekcji historii placement = zapalona |
| `diagnosticAssessment` | `/onboarding` | ścieżka diagnozy zamiast samooceny = zapalona |
| `confidenceProbe` | `/curriculum/<moduleId>/<itemId>` | obecność kontrolki pewności 1–3 = zapalona |
| `placementDiagnostic` | `/api/curriculum` (JSON) | obecność pola `openedByPlacementEver` w elementach `modules[]`; wariant zapasowy: tekst wstępu na `/curriculum` — `CURRICULUM_INTRO_WITH_PLACEMENT` („…albo od razu, jeśli diagnoza pokazała…") kontra `CURRICULUM_INTRO` („…bez skrótów") |
| `passportFreshness` | `/passport` | obecność panelu świeżości kredencjałów = zapalona (sensowna tylko przy `passportVerifiedOnly`) |

**Wymagają konta recenzenta albo publicznego odnośnika paszportu — 1 flaga.**

| Flaga | Sonda domykająca | Rozstrzygnięcie |
|---|---|---|
| `passportVerifiedOnly` | `/api/passport` (sesja studenta) albo `/passport/<token udostępnienia>` | obecność sekcji „W trakcie nauki" = **zgaszona**; wyłącznie kompetencje zweryfikowane = zapalona |

**Nierozstrzygalne żadną sondą HTTP — 4 flagi.** Tu brakuje nie poświadczeń, lecz
obserwowalnego skutku. Domknięcie wymaga innej klasy dowodu.

| Flaga | Dlaczego HTTP nie wystarczy | Droga domknięcia |
|---|---|---|
| `advisorMemory` | gałąź wewnątrz POST rozmowy z doradcą; brak różnicy w kształcie odpowiedzi | ślad w bazie (kontekst studenta zapisany między sesjami) albo log wykonania |
| `sandboxRunner` | gałąź wewnątrz POST zgłoszenia projektu; skutek to bieg testów, nie kod odpowiedzi | obecność wyniku `runOk` w rekordzie zgłoszenia / log Sandbox |
| `careerModelFromDb` | **przy zapalonej fladze i braku aktywnego wiersza w bazie kod cicho wraca do statycznego JSON** (`loader.ts:58–75`) — odpowiedź jest wtedy identyczna jak przy fladze zgaszonej | wpis błędu `career-model-loader` w Sentry/logu **albo** obecność aktywnego wiersza `career_model_versions`; sam kształt odpowiedzi nie rozstrzygnie nigdy |
| `marketGapNotifications` | trasy tylko POST; kafel pulpitu za sesją | GET `/dashboard` z ciasteczkiem sesji — obecność kafla powiadomień o lukach rynku |

`careerModelFromDb` to najostrzejszy przypadek i wart osobnej uwagi: to flaga, przy której
„zapalona" i „zgaszona" mogą wyglądać **dokładnie tak samo z zewnątrz**, bo cicha ścieżka
zapasowa jest świadomym wyborem projektowym (dostępność onboardingu ponad rygor). Dopóki
nie ma sygnału z logu, twierdzenie o jej stanie będzie zgadywaniem niezależnie od tego, ile
sond wykonamy.

---

## 6. Czego ta metoda NIE mierzy

Siedem granic, poza którymi ten dokument nie jest dowodem. Wypisane wprost, żeby nikt nie
zacytował go szerzej, niż sięga.

1. **Nie mierzy wartości zmiennych środowiskowych.** Mierzy **efektywny zapłon** — to nie
   jest to samo. `isFeatureEnabled` gasi flagę także wtedy, gdy jej zmienna jest zapalona,
   ale niespełniona jest przesłanka z `requires` (`flags.ts:303–319`, tryb fail-closed).
   Konkretnie: **`placementDiagnostic` z zapaloną zmienną i zgaszonym `masteryGate` jest
   z zewnątrz nieodróżnialna od zgaszonej.** Werdykt „martwa" w tym dokumencie zawsze
   znaczy „funkcja nie działa", nigdy „zmienna jest ustawiona na zero".

2. **Nie mierzy, która rewizja kodu jest na produkcji.** Sondy porównuję z kodem
   `97d1fd4` (`origin/main`), ale **nie zweryfikowałam, że produkcja serwuje tę rewizję** —
   to twierdzenie o stanie faktycznym, którego nie postawiłam, bo nie mam jak go sprawdzić
   odczytem HTTP. Gdyby produkcja była starsza, powiązanie flaga→trasa mogłoby się
   rozjechać. Domknięcie: odczyt rewizji wdrożenia ze źródła autorytatywnego (konsola albo
   interfejs programowy Vercel), zgodnie z `docs/policies/konfiguracja-produkcji-zrodlo-autorytatywne.md`.

3. **Odróżnia „flaga zgaszona" od „kodu nie ma w buildzie" tylko dzięki typowi treści
   odpowiedzi** (JSON z trasy kontra HTML frameworka, §2) — i tylko dlatego, że wszystkie
   bramki flag w tym repo zwracają `NextResponse.json`. Gdyby przyszła trasa zwracała 404
   inaczej (np. przez `notFound()`), to rozróżnienie znika i sonda przestaje rozstrzygać.
   To własność obecnego kodu, nie prawo natury.

4. **Nie mierzy flag bez powierzchni HTTP.** Cztery flagi (`advisorMemory`, `sandboxRunner`,
   `careerModelFromDb`, częściowo `marketGapNotifications`) sterują gałęzią **wewnątrz**
   obsługi żądania. Żadna liczba sond GET tego nie zmieni — potrzebny jest inny nośnik
   dowodu (log, ślad w bazie).

5. **Nie mierzy flag zmieniających kształt odpowiedzi, a nie jej istnienie.**
   `passportVerifiedOnly`, `passportFreshness`, `confidenceProbe`, `placementDiagnostic`
   przełączają zawartość, nie kod HTTP. Sonda po kodzie odpowiedzi ich nie rozstrzyga
   **z definicji**, nie z powodu braku poświadczeń.

6. **Nie jest trwała.** Zmienne na Vercelu przestawia się **bez wdrożenia** — to fakt
   zapisany wprost w komentarzu rejestru (`flags.ts:16–19`). Ten inwentarz jest zdjęciem
   stanu z 2026-08-06 12:26 CEST i traci ważność przy pierwszej zmianie zmiennej, bez
   żadnego śladu w gicie. Wniosek operacyjny dla mojej roli: **inwentarz robiony ręcznie
   raz na kwartał jest atrapą strażnika.** Właściwym domknięciem jest trasa diagnostyczna
   zwracająca listę nazw flag i ich stan zapłonu (nigdy wartości zmiennych), za sekretem
   operatora — wtedy stan jest odczytem jednej komendy, a nie śledztwem. To decyzja
   architektoniczna, więc **propozycja do Ethana (ADR)**, nie moje rozstrzygnięcie (granica
   G1 mojej roli).

7. **Nie mierzy stanu na środowiskach innych niż produkcja.** Wyłącznie
   `skill-bridge-ai-seven.vercel.app`. Nic tu nie mówi o stanie flag na dev ani staging.

**Wszystkie sondy były odczytami.** Zero POST, zero zapisu, zero zmiany stanu produkcji.
Żadna komenda w tym dokumencie nie modyfikuje niczego i wszystkie można powtórzyć.

---

## 7. Co z tego wynika dla bramki F1

- Zadanie A1 domyka **6 z 18** flag twardym dowodem behawioralnym (5 żywych, 1 martwa),
  a dla pozostałych 12 zamienia „nie wiemy" na **nazwaną lukę z konkretną sondą domykającą**.
  To jest realny postęp wobec stanu wyjściowego, ale **nie jest to pełny inwentarz** i nie
  wolno go tak raportować.
- **Domknięcie 8 z 12 pozostałych flag kosztuje jedno konto studenta testowego** — sondy
  z sekcji 5 są gotowe do wykonania, dalej wyłącznie odczytami. Rekomendacja: A1 faza druga,
  po udostępnieniu poświadczenia konta testowego (nie proszę o dostęp do konta prawdziwego
  studenta i nie potrzebuję go).
- **4 flagi zostaną nierozstrzygnięte behawioralnie na zawsze.** Ich domknięcie wymaga
  decyzji Ethana o trasie diagnostycznej stanu flag (punkt 6.6). Dopóki jej nie ma, każde
  twierdzenie o ich stanie jest zgadywaniem.
- Znalezisko poboczne, do rozważenia przez Ethana: `proactiveMarketRefresh` jest **martwa
  na produkcji**, a `MARKET_REFRESH_TOKEN` prawdopodobnie nadal siedzi w konfiguracji
  środowiska. Sekret pilnujący zgaszonej funkcji to sekret bez konsumenta — dokładnie ta
  klasa, którą audyt PR #261 wyłapał przy `NEON_API_KEY`. Zgłaszam jako obserwację, **nie
  jako ustalenie**: nie sprawdzałam, czy ten token istnieje w konfiguracji (nie mam jak,
  nie odczytuję zmiennych), i nie należy tego zdania cytować jako faktu.

---

## Sprostowania

Brak — wersja pierwsza.
