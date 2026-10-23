# ADR-019 — Sufit kosztu modeli: degradacja na tańszy model + alert (nie odcięcie)

- **Status:** PROPOZYCJA (projekt) — do przeglądu domenowego **Ryana** (ryzyko/koszt/nadużycie,
  to jego zgłoszenie E-1) i **Sophii** (jakość degradowanego podsumowania). Po akceptacji:
  implementacja za flagą → testy → review Leo → scalenie (Ethan, v1.12). **Ten dokument niczego
  nie wdraża i nie zmienia limitów na żywo.**
- **Data:** 2026-07-23 · **Autor:** Ethan (CTO) · **Zlecił:** Oliver (COO), decyzja Darka 2026-07-23
- **Rozstrzyga:** kształt reakcji na przekroczenie sufitu kosztu modeli — **degradacja na tańszy
  model + alert do Darka**, nie twarde odcięcie (decyzja Darka 2026-07-23). Plus domknięcie dziury
  kosztowej `/summary` zgłoszonej przez Ryana (E-1).
- **Powiązania:** `src/lib/ai/model.ts` (wybór modelu per warstwa), `src/lib/ai/usage.ts` +
  `ai_usage_ledger` (rejestr kosztu, dziś rejestruje-ale-nie-egzekwuje), `src/lib/rate-limit.ts`
  (istniejące budżety dobowe: `tutorDaily`, `vivaDaily`, `sandboxRun` — filozofia fail-closed),
  ADR-012 (budżet piaskownicy), ADR-013 (cap vivy), `CLAUDE.md` §7 (rozdział wagi oceny / HITL),
  `CLAUDE.md` §4 (czerwone linie: nowy MCP, wydatek).
- **Blokuje/odblokowuje:** onboarding realnych studentów (bezpieczne włączenie kosztu AI na
  produkcji) — mechanizm ma być gotowy i wyłączony, próg ustawiony przy pierwszej rejestracji.

> **Słowniczek** (żargon rozwinięty przy pierwszym użyciu): **degradacja** — po przekroczeniu progu
> ta sama funkcja działa dalej, ale na **tańszym modelu**, zamiast zostać zablokowana (odcięta);
> **sufit / cap** — górna granica kosztu, po której reagujemy; **fail-closed** — po przekroczeniu
> **blokujemy** akcję (dzisiejsze budżety); **fail-degraded** — po przekroczeniu **obniżamy jakość
> zamiast blokować** (decyzja Darka dla tego mechanizmu); **idempotencja** — powtórzone to samo
> żądanie nie wykonuje pracy drugi raz, oddaje zapisany wynik; **warstwa / tier** — `standard`
> (Sonnet), `fast` (Haiku), `premium` (Opus) z `model.ts`; **HITL** — human-in-the-loop, człowiek ma
> ostatnie słowo tam, gdzie ocena wychodzi jako dowód kompetencji (§7); **agent-as-judge / sędzia** —
> drugi model oceniający wyjście pierwszego; **ledger** — `ai_usage_ledger`, tabela z kosztem per
> wywołanie; **Redis/Upstash** — szybki magazyn liczników (już wymagany na prodzie przez rate-limit);
> **TTL** — czas życia klucza w Redis, po którym sam znika; **MCP** — kanał integracji zewnętrznej.

---

## 1. Kontekst — co jest zepsute i co Darek rozstrzygnął

**Rejestr kosztu istnieje, egzekucji nie ma.** `ai_usage_ledger` (zadanie 0.0) zapisuje koszt USD
per wywołanie modelu z atrybucją (`user_id` / `student_id` / `tenant_id`, `scope`, `tier`,
`cost_usd`, `created_at`). To dobra podstawa pomiaru — ale **nic z niej nie czyta, żeby cokolwiek
ograniczyć**. Rejestr mierzy po fakcie, nie hamuje.

**Najgroźniejszy punkt — `/summary`** (`POST /api/career-helper/session/[id]/summary`):

- Wywołuje `generateSummary` = **generator (premium/Opus) + sędzia (premium/Opus)**, blokująco, na
  pełnym transkrypcie rozmowy. Oba modele mają ponawianie: **do 8 wywołań Opusa** w najgorszym
  przypadku na jedno żądanie trasy (`career-helper.ts:377` — „2 próby gen + 2 próby sędzia").
- Jedyny limit to `aiHeavy` = **5/min per użytkownik** (burst). **Brak capu dobowego**
  (inne ciężkie trasy mają: `tutorDaily` 40/dzień, `vivaDaily` 30/dzień — `/summary` nie ma nic).
- **Brak idempotencji:** każdy POST regeneruje podsumowanie od zera, nawet gdy sesja jest już
  `completed` i podsumowanie istnieje. Student może wielokrotnie POST-ować na tej samej ukończonej
  sesji → za każdym razem znów Opus.
- **Rejestracja otwarta** — konto zakłada dowolny.

Sufit teoretyczny (Ryan, E-1): 5/min × 1440 min = **7 200 wywołań trasy / dobę / konto**, ×2–8
Opusów każde = **14 400 – 57 600 wywołań Opusa / dobę / konto**. Przy Opusie ($5/$25 za 1M tokenów)
i długim transkrypcie to koszt liczony w setkach–tysiącach USD **z jednego konta**, bez realnego
studenta.

**Decyzja Darka 2026-07-23:** reakcją na przekroczenie sufitu jest **degradacja na tańszy model +
alert do Darka**, **nie** twarde odcięcie. Konkretna liczba (miesięczny sufit) **świadomie niepodana
— zero realnych studentów, nic do zmierzenia**. Mechanizm ma być parametryzowany: próg jako
konfiguracja, wartość wpisana przy pierwszej rejestracji na podstawie zmierzonego kosztu per student.

**Dlaczego degradacja, nie odcięcie (uzasadnienie kształtu):** `/summary` produkuje artefakt
zbliżony do kredencjału (ścieżki kariery + podsumowanie po sędzim, §7). Odcięcie = student, który
uczciwie skończył rozmowę, dostaje błąd zamiast wyniku — kara za cudze nadużycie. Degradacja daje mu
wynik (gorszej, ale zdefiniowanej jakości) i przenosi koszt nadużycia z „awaria produktu" na
„niższa jakość + sygnał do człowieka". To jest zgodne z filozofią produktu: platforma ma być
samowystarczalna, człowiek dostaje sygnał.

---

## 2. Decyzja

### D1 · Parametryzacja progu — dwa poziomy, wyłączone domyślnie, włączenie = jedna zmiana konfiguracji

Dwa niezależne sufity, **oba wyrażone w USD**, oba czytane z konfiguracji (nie z kodu):

| Poziom | Klucz konfiguracji | Okno | Znaczenie |
|---|---|---|---|
| **(a) per-konto dobowy** | `AI_COST_CAP_ACCOUNT_DAILY_USD` | doba (UTC) | koszt AI zaksięgowany na `user_id` od północy |
| **(b) organizacyjny miesięczny** | `AI_COST_CAP_ORG_MONTHLY_USD` | miesiąc kalendarzowy (UTC) | koszt AI całej organizacji od 1. dnia miesiąca |

- **`null`/brak = mechanizm bezczynny.** Gdy klucz nieustawiony, degradacja się nie włącza, a
  pomiar (`ai_usage_ledger`) leci dalej. **To jest stan startowy na produkcji** — mierzymy, nie
  hamujemy, dopóki Darek nie wpisze liczby. Włączenie = ustawienie jednej wartości, **bez zmiany
  kodu i bez redeployu logiki**.
- **Gdzie żyje wartość — rekomendacja: wiersz w bazie, nie zmienna środowiskowa.** Zmienna env
  wymaga redeployu przy każdej korekcie progu; do „strojenia przy pierwszej rejestracji" chcemy
  zmiany na żywo. Proponuję jednowierszową tabelę-konfigurację `ai_cost_policy`
  (`account_daily_usd numeric NULL`, `org_monthly_usd numeric NULL`, `degrade_tier text`,
  `updated_at`, `updated_by`) czytaną z krótkim cache (Redis, 60 s). **Zmienna env jako fallback**
  na wypadek braku wiersza (spójne z istniejącym wzorcem `SKILLBRIDGE_AI_MODEL_*`). Dla MVP —
  gdy realnych studentów zero — env wystarczy; migracja do wiersza wchodzi razem z pierwszą
  rejestracją. **Wybór env vs tabela zostaje do rozstrzygnięcia w przeglądzie Ryana** (koszt zmiany
  na żywo vs prostota), oba mieszczą się w tym samym interfejsie `readCostPolicy()`.
- **Pętla „zmierz → ustaw":** `tools/report-ai-usage.ts` (istnieje) rozszerzyć o rozkład kosztu
  **per student / dobę** i **per organizacja / miesiąc** (percentyle P50/P90/P99 z `ai_usage_ledger`).
  Próg ustawiamy jako wielokrotność P99 uczciwego studenta — liczba pochodzi z pomiaru, nie z sufitu.

### D2 · Degradacja — ten sam mechanizm na obu poziomach, wpięty w rozstrzyganie modelu

Degradacja jest **jedną decyzją w jednym miejscu**: rozstrzyganiu modelu warstwy. Dziś
`getModel(tier)` (`model.ts`) mapuje warstwę na model. Wprowadzamy **efektywną warstwę** zależną od
stanu kosztu:

```
getModel(tier, ctx)  →  resolveEffectiveTier(tier, ctx)  →  anthropic(resolveModelId(effTier))
```

- `ctx` niesie atrybucję (`userId`, `tenantId`) potrzebną do sprawdzenia obu sufitów.
- **`resolveEffectiveTier`**: jeśli **którykolwiek** sufit (a lub b) jest przekroczony i warstwa =
  `premium`, zwróć warstwę degradacji (`degrade_tier`, domyślnie `standard`). Warstwy `standard`/`fast`
  nie degradują (są już tanie; degradacja premium→standard to główny nośnik kosztu). **Ta sama
  filozofia na obu poziomach** — poziom to tylko inne okno czasowe tego samego licznika kosztu.
- **Tańszy model wciąż przechodzi przez `getModel`**, więc `ai_usage_ledger` rejestruje go pod jego
  realnym `model_id` — degradacja jest widoczna w rejestrze, nie znika z pomiaru.
- **Degradacja to podłoga, nie cięcie:** funkcja działa dalej, wynik powstaje.

**Sprawdzanie sufitu bez SUM po bazie na gorącej ścieżce.** Zapytanie `SUM(cost_usd)` per żądanie
dokłada latencję do trasy blokującej. Zamiast tego — **licznik w Redis** (Upstash jest już
obowiązkowy na prodzie, `rate-limit.ts`): każdy `recordAiUsage` robi `INCRBYFLOAT` na dwóch kluczach
z TTL (`cost:acct:<userId>:<YYYY-MM-DD>` TTL 48 h, `cost:org:<YYYY-MM>` TTL 40 dni). Sprawdzenie
sufitu = `GET` (O(1)). **`ai_usage_ledger` zostaje trwałym źródłem prawdy** (rekonsyliacja, alert,
raport) — Redis jest szybkim licznikiem, nie księgą. Rozjazd licznika (restart Redis) jest
samo-gojący: TTL wygasza, a alert i raport liczą z ledgera.

- **Fail-safe kierunek: gdy licznik niedostępny → NIE degraduj** (Redis padł ≠ kara dla studenta).
  Ryzyko kosztowe w oknie awarii jest ograniczone przez idempotencję (D4) i alert z ledgera (D5).
  To świadomy wybór „nie degraduj po cichu z powodu awarii infrastruktury" — do zatwierdzenia przez
  Ryana (on może uznać fail-closed korzystniejszym; **to jego rozstrzygnięcie ryzyka**).

### D3 · Docelowy model degradacji dla `/summary` — generator vs sędzia — PYTANIE DO SOPHII

`/summary` ma **dwa** modele premium: **generator** (`summary.generate`) i **sędzia**
(`summary.judge`). `generateSummary` przyjmuje je osobno (`summaryModel`, `judgeModel`) — są
rozdzielne. Degradacja może dotknąć jednego, drugiego albo obu.

**Rekomendacja inżynierska (do potwierdzenia jakościowego przez Sophię):**

- **Generator: premium → `standard` (Sonnet 4.6).** Nie do `fast` (Haiku): podsumowanie kariery to
  jakość subiektywna > 8 kryteriów, a reguła twarda `CLAUDE.md` §10 zakazuje Haiku dla takiej klasy.
- **Sędzia: NIE degradować w pierwszej wersji — zostaje premium.** Sędzia jest bramką HITL (§7);
  obniżenie modelu, który pilnuje, czy wynik nie łamie zasady „człowiek ma ostatnie słowo", osłabia
  gwarancję kredencjału mocniej niż obniżenie generatora. Sędzia jest też tańszy z natury (krótki
  prompt oceniający vs pełny transkrypt), więc degradacja generatora zdejmuje większość kosztu.

**To pytanie dotyka Sophii (jakość produktu) i wprost §7:**
1. Czy podsumowanie z Sonneta jest akceptowalne jako artefakt pokazywany studentowi? (jakość)
2. Czy degradacja **sędziego** jest kiedykolwiek dopuszczalna, skoro to bramka HITL? (rozdział wagi §7)
3. Czy degradowane podsumowanie ma nieść **widoczny znacznik** „wygenerowano w trybie oszczędnym"
   (analogia do „ocena automatyczna" z §7)? Rekomenduję **tak** — uczciwość wobec studenta i ślad
   audytowy. Ostateczne słowa etykiety: Sophia.

Do czasu decyzji Sophii **wartością domyślną `degrade_tier` jest `standard` i degraduje wyłącznie
generatora**; sędzia premium. Zmiana = konfiguracja, nie kod (D1).

### D4 · Domknięcie dziury `/summary` — idempotencja (główny fix) + cap dobowy + degradacja

Trzy warstwy obrony, w kolejności skuteczności:

**(1) Idempotencja — usuwa główny wektor nadużycia.** Dziś powtórny POST na ukończonej sesji znów
woła Opusa. Projekt:

- Utrwalać **wynik podsumowania per sesja** (dziś `summaryText` ląduje tylko w `advisorMemory` za
  flagą; ścieżki w `student_career_paths`; brak jednego miejsca do odtworzenia odpowiedzi). Dodać
  trwały zapis ostatniego wyniku sędziowanego na sesji (kolumna JSONB na `career_helper_sessions`
  albo mała tabela `career_helper_summaries` — decyzja przy implementacji).
- Na `POST /summary`: jeśli istnieje **sędziowane** podsumowanie dla tej sesji **i transkrypt nie
  urósł** od jego wygenerowania (brak nowych tur po `summary.created_at`), **oddaj zapisany wynik
  bez wołania modelu** (0 Opusów). Regeneracja tylko, gdy rozmowa realnie się zmieniła.
- Klucz idempotencji tenant-świadomy (odczyt w `withTenantContext` jak reszta trasy) — zapisany
  wynik nigdy nie przecieka między studentami/tenantami. **To punkt do weryfikacji Ryana.**
- Skutek: „7 200 trasa → 57 600 Opus" spada do **kosztu jednej generacji per realna zmiana sesji**.
  Pętla POST na niezmienionej sesji = 0 wywołań modelu.

**(2) Cap dobowy per konto → degradacja (D2).** Nawet z idempotencją student generujący wiele
**różnych** sesji/regeneracji jest ograniczony sufitem dobowym: po przekroczeniu `/summary` degraduje
generatora na Sonneta. Nie odcina.

**(3) `aiHeavy` (5/min) zostaje** jako obrona przed burstem. **Opcjonalny backstop count** —
hojny dobowy limit *liczby* generacji per konto (np. `summaryDaily` 50/dzień, wzorzec
`vivaDaily`) jako twarda siatka na absurd (bot generujący tysiące sesji). To **jedyne miejsce, gdzie
dopuszczam fail-closed** — i tylko jako ostateczność ponad degradacją. **Czy backstop w ogóle
potrzebny — do rozstrzygnięcia Ryana** (idempotencja + degradacja mogą wystarczyć).

### D5 · Alert do Darka po przekroczeniu progu

- **Zdarzenie:** pierwsze przekroczenie sufitu (a) w danej dobie per konto, oraz pierwsze
  przekroczenie sufitu (b) w danym miesiącu. **Deduplikacja** kluczem w Redis
  (`alert:acct:<userId>:<YYYY-MM-DD>`, `alert:org:<YYYY-MM>`) — jeden alert na okno, nie na żądanie
  (inaczej ticket-spam przy każdym degradowanym wywołaniu).
- **Kanał:** dziś **ticket Linear** przypisany do Darka z prefiksem `[koszt]` (wzorzec kanału
  interwencji Olivera — Linear jest w whitelist). Treść: który poziom, które konto/organizacja,
  zmierzony koszt vs próg, że **degradacja już działa** (to sygnał, nie prośba o akcję ratunkową).
  **Docelowo Google Chat** — **MCP niepodłączony, to czerwona linia (§4), osobny sign-off Darka.**
  Nie zakładam go w tym projekcie.
- **Best-effort, nigdy nie blokuje ścieżki użytkownika** i **nie woła LLM** (wzorzec `recordAiUsage`:
  try/catch + `logError`; awaria alertu nie wywraca odpowiedzi ani degradacji).
- **Alert liczy z ledgera, nie z Redis** — trwałe źródło prawdy; Redis tylko dedupuje.

---

## 3. Alternatywy rozważone i odrzucone

| Wariant | Dlaczego odrzucony |
|---|---|
| **Twarde odcięcie po przekroczeniu** | Karze uczciwego studenta cudzym nadużyciem; sprzeczne z decyzją Darka i z filozofią „platforma samowystarczalna, człowiek dostaje sygnał". |
| **`SUM(cost_usd)` z bazy per żądanie** | Dokłada latencję do trasy blokującej `/summary`; przy wolumenie robi się gorącym zapytaniem. Redis-licznik daje O(1), ledger zostaje źródłem prawdy. |
| **Próg tylko w env (bez wiersza)** | Każda korekta progu = redeploy; sprzeczne z „strojenie przy pierwszej rejestracji na żywo". Env zostaje jako fallback, nie jako jedyne miejsce. |
| **Degradacja także sędziego od razu** | Sędzia to bramka HITL (§7); jego osłabienie uderza w gwarancję kredencjału. Zostaje premium do decyzji Sophii; i tak jest tańszy. |
| **Cap tylko organizacyjny (bez per-konto)** | Jedno złośliwe konto wyczerpuje budżet całej organizacji, zanim miesięczny sufit drgnie. Per-konto dobowy łapie nadużycie u źródła. |
| **Idempotencja przez nagłówek klienta** | Klient deklaruje idempotency-key = ten sam dług, co `hintDepth` (klient kłamie). Idempotencja liczona serwerowo ze stanu sesji. |

---

## 4. Konsekwencje

- **Odwracalność:** cała zmiana za flagą `FLAG_AI_COST_CEILING` (albo równoważną); progi `null` =
  bezczynne. Rollback = flaga OFF lub wyzerowanie progów; degradacja znika, zostaje czysty pomiar.
- **Zero regresji jakości przy wyłączonym mechanizmie:** gdy progi `null`, `resolveEffectiveTier`
  zwraca warstwę wejściową 1:1 — modele produkcyjne bez zmian (gwarancja jak w `model.ts`).
- **Nowa zależność gorącej ścieżki od Redis** — ale Upstash jest już obowiązkowy na prodzie
  (`assertRateLimitConfigured`), więc nie dokłada nowego wymogu infrastrukturalnego.
- **Koszt implementacji (szacunek):** licznik+policy+resolveEffectiveTier ~pół dnia; idempotencja
  `/summary` (zapis wyniku + gałąź odczytu) ~1 dzień z testami; alert+dedup ~pół dnia; migracja
  (idempotency store + ewentualne `ai_cost_policy`) — mała, addytywna. Razem ~2–3 dni Maxa.
- **Rollback migracji:** addytywny (nowe kolumny/tabele), wycofanie = revert; kolumny zostają puste
  i nieczytane (migracje append-only).

---

## 5. Podział decyzji — kto co zatwierdza

**Do przeglądu domenowego Ryana (ryzyko/koszt/nadużycie — to jego E-1):**
1. Semantyka progów i **czy env vs wiersz `ai_cost_policy`** (koszt zmiany na żywo vs prostota).
2. **Kierunek fail-safe przy awarii Redis** (D2): „nie degraduj" (moja rekomendacja) vs „degraduj/blokuj".
3. **Poprawność i izolacja idempotencji** (D4): czy zapisany wynik jest szczelnie tenant-scoped,
   czy „transkrypt nie urósł" jest właściwym warunkiem świeżości, czy nie otwiera kanału odczytu
   cudzego podsumowania.
4. Czy **backstop count** (D4.3) jest potrzebny, czy idempotencja + degradacja wystarczą.
5. Dedup i treść alertu (D5) — czy nie wycieka PII do ticketu (tylko `user_id`/agregat, nigdy transkrypt).
6. Czy degradacja **sędziego** kiedykolwiek dopuszczalna wobec §7 (wspólnie z Sophią).

**Do przeglądu Sophii (jakość produktu + §7):**
- Czy podsumowanie z Sonneta jest akceptowalne (D3.1); czy degradacja sędziego dopuszczalna (D3.2);
  czy degradowany wynik nosi widoczny znacznik i jego treść (D3.3).

**Wymaga sign-offu Darka (nie zakładam w projekcie):**
- **Ustawienie realnej liczby progu** — wpisanie miesięcznego/dobowego sufitu USD (decyzja
  kosztowa, jego intencja: przy pierwszej rejestracji). To nie jest przelew > 1000 PLN, ale jest
  polityką wydatkową — jego liczba.
- **Podłączenie Google Chat MCP** dla alertu docelowego (nowy MCP = czerwona linia §4). Do tego
  czasu alert idzie Linearem (bez nowego MCP).
- **Włączenie flagi na produkcji** po implementacji (jak każde wejście na prod; wykonanie moje,
  v1.12, po review Leo).

**W moim mandacie (v1.12, po akceptacji Ryana + Leo):** implementacja za flagą, migracja addytywna,
scalenie, wdrożenie za wyłączoną flagą.

---

## 6. Kryteria „zrobione" dla przyszłej implementacji (dla Maxa i Leo)

1. Progi `null` → `resolveEffectiveTier(t)` zwraca `t` dla każdej warstwy; test: modele produkcyjne
   identyczne jak bez mechanizmu (parytet z `model.ts`).
2. Sufit (a) przekroczony → `premium` degraduje do `degrade_tier` (domyślnie `standard`);
   `standard`/`fast` bez zmian; test na liczniku ustawionym ponad próg.
3. Sufit (b) przekroczony niezależnie od (a) → ta sama degradacja; test osobno.
4. `recordAiUsage` inkrementuje oba liczniki Redis z poprawnym TTL; ledger zapisuje realny
   (zdegradowany) `model_id`.
5. Redis niedostępny → brak degradacji (fail-safe kierunek z D2, o ile Ryan nie zdecyduje inaczej);
   test na wstrzykniętej awarii.
6. `/summary` idempotentny: drugi POST na niezmienionej sędziowanej sesji → **0 wywołań modelu**,
   oddaje zapisany wynik; test liczy wywołania przez `setAiUsageSinkForTests`/spy modelu.
7. `/summary` po nowej turze → regeneruje (warunek świeżości działa).
8. Idempotencja szczelna tenantowo: żądanie innego studenta/tenanta nie odczytuje cudzego
   podsumowania; test izolacji (wzorzec macierzy RLS).
9. Alert: jedno zdarzenie na okno (dedup Redis), treść bez PII (tylko `user_id`/agregat), best-effort
   (awaria alertu nie wywraca trasy); test dedup i test „awaria alertu = odpowiedź OK".
10. Flaga OFF → cała powierzchnia bezczynna; `pnpm test:run` zielone; degradacja niewidoczna w prod.

---

## 7. Self-critique — pięć słabości tego projektu, nazwanych zamiast wygładzonych

Rola: principal engineer po incydencie, w którym „miękki" limit kosztu okazał się nieszczelny.

1. **Redis jako licznik kosztu to eventually-consistent budżet.** Między inkrementem a odczytem
   równoległe żądania mogą chwilowo przekroczyć próg, zanim degradacja zaskoczy (wyścig). Świadomie
   akceptuję: to sufit „miękki" z natury (degradacja, nie odcięcie), a rozjazd jest ograniczony do
   okna kilku żądań. Twardą siatką pozostaje idempotencja (zdejmuje główny wolumen) i backstop count.
   Gdyby potrzebny był ścisły budżet — trzeba atomowego „increment-and-check" (Lua w Redis), i to
   nazywam jako opcję, nie zamiatam.
2. **Idempotencja zależy od poprawnej definicji „transkrypt urósł".** Jeśli warunek świeżości jest
   źle dobrany (np. tura zapisana po `summary.created_at` z tym samym `createdAt`), albo student
   edytuje odpowiedzi w miejscu, można albo cache'ować nieświeży wynik, albo regenerować za często.
   To najcięższy punkt do przeglądu — dlatego jest jawnie u Ryana (D4, §5.3), z konkretnym pytaniem,
   a nie schowany w „idempotencja rozwiązana".
3. **Degradacja sędziego dotyka §7 mocniej, niż wygląda.** Zostawiłem sędziego premium, ale
   `degrade_tier` jest konfiguracją — ktoś może w panice ustawić degradację obu i po cichu osłabić
   bramkę HITL. Mitygacja: `resolveEffectiveTier` **nie degraduje warstwy sędziego bez osobnej,
   jawnej flagi** (nie jednej wspólnej `degrade_tier`), żeby obniżenie sędziego było świadomą
   decyzją, nie skutkiem ubocznym. Dopisane jako wymóg do implementacji i do decyzji Sophia+Ryan.
4. **Alert Linearem wymaga, by ktoś go czytał.** Ticket bez człowieka patrzącego = brak reakcji.
   Dopóki Google Chat MCP nieподłączony (sign-off Darka), alert jest tak dobry jak dyscyplina
   przeglądania Lineara. Nazwane wprost: kanał docelowy to osobna czerwona linia, nie założenie.
5. **Próg w USD zależy od cennika w `usage.ts`, który jest wpisany ręcznie** (`PRICE_USD_PER_MTOK`,
   „stan 2026-06"). Jeśli Anthropic zmieni cennik, licznik kosztu się rozjedzie z rzeczywistością,
   a sufit USD przestanie znaczyć to, co myślimy. Dopisuję do przeglądu Ryana: cennik jako
   konfiguracja z datą i notą „zweryfikuj przy zmianie modelu/cennika", nie magiczna stała.
