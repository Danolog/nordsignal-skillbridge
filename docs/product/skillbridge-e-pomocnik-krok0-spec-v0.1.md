# Strumień E (#5) — Pomocnik kariery jako Krok 0 onboardingu — spec produktowy

**Wersja:** v0.1 · 2026-06-05 · **Autor:** Sophia (Product Owner nordsignal) · **Status:** bramka PRZED implementacją (do sign-offu Darka, review Leo na feasibility)
**Strumień:** E z `nordsignal-operating-system/docs/product/plan-naprawy-6-bledow.md` (linie ~76–86)
**Repo produktu:** `Danolog/nordsignal-skillbridge` (lokalnie `C:\Users\D\Desktop\Kodowanie\SkillBridge_AI`)
**Decyzja Darka:** wpiąć Pomocnik Wyboru Kariery jako **Krok 0 onboardingu**; cel kariery (`careerGoal`) ma pochodzić Z POMOCNIKA i zniknąć z kroku „Profil".

---

## 0. TL;DR (jedno zdanie)

Pomocnik kariery (`CareerHelperFlow`) dziś działa, ale jest **sierotą** — nie ma go w sidebarze ani w przepływie onboardingu (commit ukrycia `bbe4571`). Ten spec wpina go jako **Krok 0 wizarda**, przenosi zbieranie celu kariery z kroku „Profil" do Pomocnika i definiuje, jak cel płynie z Pomocnika do reszty onboardingu — **bez F/G** (pełna przebudowa kompetencji z rynku jest poza zakresem).

---

## 1. Stan obecny (inspekcja realnego kodu, read-only)

Pliki przeczytane na gałęzi `main`:

- `src/components/onboarding/onboarding-wizard.tsx` — wizard, dziś **5 kroków**.
- `src/components/onboarding/step-profile.tsx` — krok „Profil", dziś zbiera `careerGoal`.
- `src/components/career-helper/career-helper-flow.tsx` — orkiestrator Pomocnika (3 ekrany: ankieta → czat → podsumowanie).
- `src/components/career-helper/summary-screen.tsx` + `career-path-card.tsx` — wybór ścieżki.
- `src/app/(dashboard)/pomocnik-kariery/page.tsx` — strona-trasa Pomocnika (sierota).
- `src/app/(dashboard)/onboarding/page.tsx` — strona wizarda (guard `onboardingCompleted`).
- `src/app/api/career-helper/session/[id]/select-path/route.ts` — zapis wybranej ścieżki.
- `src/app/api/onboarding/route.ts` — finalny zapis profilu + kompetencji.
- `src/components/dashboard/sidebar.tsx` — menu (brak pozycji Pomocnika).

### 1.1 Dzisiejsza sekwencja onboardingu (PRZED)

`STEPS` w `onboarding-wizard.tsx` (linie 28–34):

| # | label | co robi |
|---|---|---|
| 1 | **Profil** | `StepProfile` — uczelnia, kierunek, semestr, **`careerGoal`** (select `CAREER_GOALS` + „Inne") |
| 2 | **Sylabus** | `StepSyllabus` — wklej tekst **albo** wgraj PDF (strumień C już wszedł) → analiza AI |
| 3 | **Kompetencje** | `StepCompetencies` — wynik analizy, edycja; gate „X/5" (`MIN_COMPETENCIES`) |
| 4 | **Samoocena** | `StepSelfAssessment` — ocena kompetencji (B4) |
| 5 | **Wnioski** | ekran „Profil gotowy" → redirect `/dashboard` |

`careerGoal` jest dziś zbierany **wyłącznie** w Kroku 1 (Profil), trzymany w stanie `profile.careerGoal` (+ `customCareerGoal` dla opcji „Inne"), rozwiązywany do `resolvedCareerGoal` (wizard linia 57–58) i wysyłany do `/api/syllabus/parse` (krok 2) oraz `/api/onboarding` (submit kroku 3).

### 1.2 Co produkuje Pomocnik (kluczowe ustalenie)

Pomocnik **już dziś** zwraca cel kariery i **już dziś go utrwala**:

- Na ekranie 3 (`summary-screen.tsx`) student wybiera kartę ścieżki (`CareerPathCard` — etykieta + „dlaczego", **świadomie bez procentów/rankingu** — guardrail human-in-the-loop, ADR-004).
- Klik „Idź dalej do samooceny" woła `POST /api/career-helper/session/[id]/select-path` z `{ careerLabel, source: "helper" }`.
- Endpoint w **jednej transakcji**: zapisuje wybraną ścieżkę jako `isPrimary` **oraz NADPISUJE `students.career_goal = careerLabel`** (route linie 86–90, komentarz „rozstrzygnięcie Sophii: jeden aktualny cel").

Czyli kształt outputu Pomocnika = **`careerLabel: string`** (etykieta obszaru zawodowego, np. „Data Analyst"). To dokładnie ten sam typ co dzisiejszy `careerGoal` w wizardzie (string).

### 1.3 Dlaczego Pomocnik jest realnie sierotą (sedno błędu #5)

Dwa fakty z kodu, które razem czynią Krok 0 nieosiągalnym dla studenta przed onboardingiem:

1. **`pomocnik-kariery/page.tsx` linia 33:** `if (!student) redirect("/onboarding")`. Pomocnik wpuszcza **tylko studenta, który MA już rekord** (czyli po onboardingu). Nowy student nigdy tam nie dotrze.
2. **`onboarding/page.tsx` linia 17:** `if (student?.onboardingCompleted) redirect("/dashboard")`. A `select-path` nie tworzy rekordu studenta i nie ustawia `onboardingCompleted` — więc po wyborze ścieżki `CareerHelperFlow` robi `router.push("/onboarding")` (flow linia 53), ale dla studenta bez rekordu pomocnik i tak go wcześniej odbije.

Potwierdza to e2e `10-b0-pomocnik-kariery.spec.ts` (linia 23): testuje Pomocnika na koncie **„main" (onboardingCompleted=TRUE)**. Pomocnik działa **tylko jako wyspa dla już-onboardowanego studenta** — nigdy jako Krok 0.

**Wniosek architektoniczny (wiążący dla implementacji):** żeby Pomocnik był Krokiem 0, musi żyć **wewnątrz wizarda** (jako krok renderowany w `onboarding-wizard.tsx`), a `careerGoal` płynąć **w pamięci** (stan React) do dalszych kroków — bo na etapie Kroku 0 rekord studenta jeszcze nie istnieje i zapis bazowy `select-path` nie ma sensu (nie ma czego nadpisać). Trasa `/pomocnik-kariery` zostaje jako osobny punkt wejścia dla już-onboardowanego studenta (poza zakresem #5, patrz §7).

---

## 2. Nowa sekwencja onboardingu (PRZED → PO)

### PRZED (5 kroków)
```
1. Profil (zbiera careerGoal) → 2. Sylabus → 3. Kompetencje → 4. Samoocena → 5. Wnioski
```

### PO (6 kroków — Krok 0 z przodu)
```
0. Pomocnik kariery (ustala careerGoal) → 1. Profil (BEZ careerGoal) → 2. Sylabus → 3. Kompetencje → 4. Samoocena → 5. Wnioski
```

Konkretnie w `STEPS`:

| nowy # | label | zmiana vs PRZED |
|---|---|---|
| 0 | **Cel kariery** | **NOWY** — `CareerHelperFlow` osadzony w wizardzie; ustala `careerGoal` |
| 1 | Profil | **bez selecta `careerGoal`** (uczelnia, kierunek, semestr) |
| 2 | Sylabus | bez zmian funkcjonalnych |
| 3 | Kompetencje | bez zmian |
| 4 | Samoocena | bez zmian |
| 5 | Wnioski | bez zmian |

**Uwaga implementacyjna dla Jacka (numeracja):** progres-bar i etykiety w `onboarding-wizard.tsx` są dziś sztywno liczone od 5 kroków (`((step - 1) / 4) * 100`, `STEPS.map`). Po dodaniu Kroku 0 trzeba przeliczyć dzielnik i indeksowanie. Rekomendacja produktowa, żeby NIE przepisywać całej maszyny stanów: numerować nowy krok jako `0` i renderować pasek od 0 do 5 (6 punktów), albo przenumerować na 1–6 z Pomocnikiem jako „1". **Decyzja kształtu paska należy do Mili/Jacka** — produktowo wiążące jest tylko: Pomocnik jest PIERWSZY i widoczny jako osobny krok na pasku.

---

## 3. Kontrakt wpięcia

### 3.1 Jak `careerGoal` płynie z Pomocnika do wizarda

- `CareerHelperFlow` dostaje **nowy opcjonalny callback** `onCareerGoalChosen(careerLabel: string)`. Gdy student wybierze ścieżkę na ekranie 3, zamiast (lub obok) `router.push("/onboarding")` woła ten callback z `careerLabel`.
- Wizard trzyma cel w istniejącym stanie `profile.careerGoal` (string) — Krok 0 ustawia `setProfile({ ...profile, careerGoal: careerLabel, customCareerGoal: "" })`, po czym `setStep(1)` (przejście do Profilu).
- **Tryb osadzony vs samodzielny.** `CareerHelperFlow` dostaje flagę trybu (np. `embedded?: boolean` lub sama obecność `onCareerGoalChosen`):
  - **embedded (Krok 0):** po wyborze ścieżki **NIE** woła `select-path` (brak rekordu studenta — patrz §1.3), tylko `onCareerGoalChosen` → cel ląduje w pamięci wizarda; persystencja nastąpi w `POST /api/onboarding` (submit kroku 3), które już dziś zapisuje `careerGoal`.
  - **standalone (trasa `/pomocnik-kariery`, już-onboardowany student):** zachowuje dzisiejsze zachowanie — `select-path` + `router.push`. **Ta gałąź jest poza zakresem #5** (nie ruszamy jej, tylko nie psujemy).
- **Decyzja produktowa (potwierdzenie istniejącej):** „jeden aktualny cel" — `careerGoal` w bazie = ostatnio wybrany. W Kroku 0 zapisuje go finalny `POST /api/onboarding`; brak podwójnego zapisu (nie wołamy `select-path` w trybie embedded), więc nie ma wyścigu o `students.career_goal`.

### 3.2 Co znika z kroku „Profil"

Z `step-profile.tsx` znika **cała sekcja celu kariery**:
- usunięcie selecta „Cel kariery" (linie ~110–131) i bloku „Inne (wpisz)" / `customCareerGoal` (linie ~133–145);
- z interfejsu `ProfileData` (linie 44–50) **produktowo** znikają `careerGoal` i `customCareerGoal` z formularza Profilu. **Uwaga dla Jacka/Leo:** `careerGoal` jako pole stanu wizarda **zostaje** (wypełnia je Krok 0); pytanie, czy zostawić je w typie `ProfileData` czy wynieść do osobnego stanu wizarda, to decyzja techniczna Leo — produktowo wiążące: **w UI Profilu nie ma już pytania o cel kariery**.
- `isStep1Valid` (wizard linie 61–66) traci warunki `profile.careerGoal && (… || customCareerGoal)`. Po zmianie Profil jest ważny przy: uczelnia + kierunek + semestr.
- Stała `CAREER_GOALS` (eksport z `step-profile.tsx`) — sprawdzić, czy ktoś jej jeszcze używa poza Profilem (Leo: `grep`); jeśli nie, do usunięcia razem z selectem.

### 3.3 Nawigacja między krokami (pominięcie / powrót)

Human-in-the-loop (CLAUDE.md §7, `Decyzje produktowe.md` Element 2) wymaga, by student panował nad celem — AI go nie narzuca. Reguły:

- **Krok 0 → Krok 1 (dalej):** możliwy **tylko** po wyborze ścieżki w Pomocniku (`careerGoal` ustawiony). Bez wybranego celu „Dalej" nie przechodzi (analogia do dzisiejszego `isStep1Valid`). Disclaimer „To NIE są rekomendacje, decyzja jest Twoja" zostaje (już w `DisclaimerBanner`).
- **Powrót Krok 1 → Krok 0:** dozwolony. Student może wrócić i zmienić cel (restart rozmowy istnieje w Pomocniku — „Nic z tego, wracam do rozmowy"). Po zmianie celu w Kroku 0 nadpisujemy `profile.careerGoal` w pamięci.
- **Brak twardego „pomiń".** Cel kariery jest wymagany (jak dziś — pole `*`). Pomocnik to ścieżka jego ustalenia; nie dodajemy osobnego „pomiń Pomocnika", bo to przywróciłoby pytanie o cel gdzie indziej (sprzeczne z decyzją Darka „cel pochodzi z Pomocnika"). Jeśli Darek zechce furtkę manualną — to osobna decyzja produktowa (out of scope v0.1).
- **Wejście w trakcie / odświeżenie strony:** wizard jest stanowy (React, bez persystencji kroku). Odświeżenie wraca do Kroku 0 — akceptowalne w Becie (to samo dotyczy dziś Kroku 1). Persystencja postępu wizarda jest poza zakresem #5.

### 3.4 Human-in-the-loop — potwierdzenie

- Pomocnik **proponuje 1–3 obszary**, student **wybiera** (klik karty) i **może zmienić** (changeHint). AI nie zatwierdza celu samodzielnie.
- `careerGoal` wybrany przez studenta jest tym, co trafia do Profilu i bazy. Student widzi go (i mógłby go zweryfikować) — patrz §4 (opcja pokazania celu na starcie Profilu).
- Żaden krok nie opiera się na pozycji z OUT (F/G); cel = jawny wybór człowieka.

---

## 4. Copy Kroku 0 (po polsku, brand voice)

Pomocnik ma **własne** nagłówki ekranów wewnętrznych (w `lib/career-helper/copy.ts`: „krok 1 z 3: ankieta" itd.) — **tych nie ruszamy**. Kroku 0 dotyczy tylko warstwa wizarda (etykieta na pasku + ewentualny nagłówek nad osadzonym Pomocnikiem).

- **Etykieta kroku na pasku postępu (`STEPS`):** `Cel kariery`
  (krótko, spójnie z resztą: „Profil / Sylabus / Kompetencje / Samoocena / Wnioski". „Pomocnik kariery" jest dłuższe i myli z nazwą narzędzia; pasek opisuje *efekt* kroku — student ustala cel.)
- **Nagłówek nad osadzonym Pomocnikiem (opcjonalny — Mila decyduje, czy w ogóle):** jeśli wizard ma wspólny nagłówek karty kroku (jak Krok 1 „Opowiedz nam o sobie"), Krok 0:
  - tytuł: **„Zacznijmy od celu"**
  - podtytuł: **„Pomocnik zada Ci kilka pytań i pomoże nazwać obszar zawodowy, który do Ciebie pasuje. Ty wybierasz — to nie test."**
  (Konkret, peer-to-peer, bez buzzwordów; podkreśla human-in-the-loop.)
- **Mikrokopia po wyborze (na starcie Kroku 1, opcjonalna):** jeśli chcemy, by student widział wybrany cel wchodząc w Profil — krótka linijka na górze Profilu: **„Twój cel kariery: {careerGoal}. Możesz go zmienić, wracając do poprzedniego kroku."** To wzmacnia HITL (cel jest widoczny i edytowalny). Decyzja czy dodać — Mila/Sophia w implementacji; produktowo rekomendowane.

> Uwaga brand voice / żargon: w UI nie pada żaden żargon techniczny. „Pomocnik", „cel kariery", „obszar zawodowy" — wszystko po polsku. Termin „human-in-the-loop" w tym dokumencie = *człowiek ma ostatnie słowo* (nie pojawia się w UI).

---

## 5. Sygnał dla Quinna — co złamie zmiana sekwencji (testy do przepisania)

Zmiana kolejności kroków + usunięcie pola `careerGoal` z Profilu **złamie każdy test nawigujący onboarding, który zakłada, że Krok 1 = Profil z polem celu**. Lista (do przepisania przez Quinna, w tym samym PR co fix — dyscyplina R3):

1. **e2e Z2 — `tests/e2e-pw/40-onboarding-sylabus-pdf.spec.ts`** (na gałęzi `test/z2-syllabus-pdf-upload` / `main`): helper `fillProfileAndGoToSyllabus` (linie 63–79) **wybiera cel kariery w combobox nth(2)** i zakłada, że Profil to pierwszy ekran. Po zmianie: (a) najpierw trzeba przejść Krok 0 (Pomocnik — woła LLM! → segment `@llm` albo zaślepka celu), (b) w Profilu nie ma już comboboxa celu (`combos.nth(2)` przestaje istnieć). **Wymaga przepisania helpera** — przejście Kroku 0 + usunięcie wyboru celu z Profilu.
2. **e2e B0 — `tests/e2e-pw/10-b0-pomocnik-kariery.spec.ts`:** dziś testuje Pomocnika jako wyspę na koncie onboardowanym (`/pomocnik-kariery`). Po wpięciu Kroku 0 dochodzi **druga ścieżka** (Pomocnik w onboardingu, konto `b4` nie-onboardowane). Quinn: dodać/rozdzielić scenariusz „Pomocnik jako Krok 0 dla nowego studenta" vs „Pomocnik standalone dla onboardowanego". Sprawdzić, czy `onCareerGoalChosen` poprawnie ustawia cel i przechodzi do Profilu.
3. **e2e B4 (`tests/e2e-pw/20-b1-b4-dashboard-projects.spec.ts`):** jeśli jego setup przechodzi onboarding (sprawdzić — czytałem tylko nazwę), to samo ryzyko co Z2 (kolejność kroków + brak celu w Profilu). Quinn weryfikuje, czy ten plik nawiguje wizard.
4. **Z4 brama — `ui-consistency.test.tsx` (gałąź `test/z4-ui-inventory`):** `it.fails` „reachability `/pomocnik-kariery` / `career-helper` z wizarda" musi **flipnąć na zielono** po wpięciu (wizard realnie odwołuje się do `CareerHelperFlow`). Quinn zdejmuje `it.fails` w tym samym PR. (To brama strumienia E z planu, linia 82.)
5. **Z5 — `test/z5-rejestracja-onboarding` (ścieżka krytyczna, jeśli wejdzie):** cała sekwencja rejestracja→onboarding się wydłuża o Krok 0. Sophia to flagowała w review Z5 (plan linia 86). Quinn przepisuje kolejność.
6. **Testy jednostkowe wizarda/Profilu (vitest):**
   - `src/components/onboarding/__tests__/step-profile.test.tsx` — testuje pole celu kariery → **padnie**, gdy pole zniknie. Przepisać (usunąć asercje celu).
   - `src/components/onboarding/__tests__/onboarding-wizard-step4.test.tsx` i `…step3-gate.test.tsx` — sprawdzić, czy `setStep`/numeracja kroków się nie przesunęła; po dodaniu Kroku 0 indeksy mogą wymagać korekty.
   - `src/app/api/onboarding/__tests__/onboarding-route.test.ts` — `/api/onboarding` nadal dostaje `careerGoal` (z pamięci wizarda), kontrakt API **bez zmian** — ten test powinien przejść bez zmian (potwierdzić).

**Reguła twarda (z planu):** zmiana sekwencji jest zmianą zachowania UI, nie kontraktu API → ale dotyka front+back styku jednym efektem (`careerGoal` musi dojść do `/api/onboarding`). Quinn: **jeden test integracyjny realnej ścieżki** „Krok 0 ustawia cel → submit zapisuje ten cel w `students.career_goal`" (lekcja split-frontend-backend), nie tylko mock.

---

## 6. Czego NIE robimy (granica zakresu — twarda)

- **NIE** projektujemy strumieni **F/G** (dane rynku pracy + widok „Analiza rynku"). To NOWE funkcje z planu §3, nie błędy.
- **NIE** przebudowujemy kompetencji „ze ŹRÓDŁA" (kompetencje z analizy rynku zamiast z sylabusa; sylabus → adnotacja — decyzje planu §1 pkt 4/5). To zależy od F/G.
- **NIE** zmieniamy kontraktu `POST /api/onboarding` ani `select-path` (poza nie-wołaniem `select-path` w trybie embedded — to zmiana wywołania we froncie, nie kontraktu endpointu).
- **NIE** ruszamy treści ekranów wewnętrznych Pomocnika (ankieta/czat/podsumowanie, `copy.ts`), disclaimera HITL, kart bez procentów (ADR-004).
- **NIE** dodajemy Pomocnika do sidebara w ramach #5 (decyzja IA: brak kafelka w Becie; to osobna decyzja, gdyby Darek chciał go jako re-entry point).
- **NIE** persystujemy postępu wizarda (odświeżenie wraca do Kroku 0 — jak dziś do Kroku 1).

**#5 zamyka się SAMYM wpięciem Kroku 0.** Pełna przebudowa onboardingu = osobna inicjatywa zależna od F/G.

---

## 7. Otwarta kwestia do potwierdzenia (Leo + Darek)

- **Trasa `/pomocnik-kariery` po wpięciu.** Zostaje jako standalone dla już-onboardowanego studenta (dzisiejsze zachowanie `select-path` + `router.push`). Produktowo OK na Betę. Leo potwierdza, że `CareerHelperFlow` da się uruchomić w dwóch trybach (embedded w wizardzie + standalone na trasie) bez rozjazdu logiki. Jeśli to podniesie koszt — fallback: w Kroku 0 renderować `CareerHelperFlow` w trybie embedded i NIE zmieniać trasy standalone (minimalna zmiana = dodać callback, reszta bez ruszania).

---

## 8. Brama przed oddaniem (self-critique — co poprawiłam)

Rola: senior product lead z SaaS edukacyjnego po porażce źle zescope'owanego launchu. 5 słabości pierwszego szkicu + poprawki:

1. **Pierwszy szkic zakładał, że Pomocnik tylko `router.push("/onboarding")` wystarczy do Kroku 0.** Po inspekcji guardów (`pomocnik-kariery/page.tsx` + `onboarding/page.tsx`) okazało się, że to **niewykonalne** dla nowego studenta (redirect odbija przed onboardingiem). Poprawka: §1.3 + wiążący wniosek „Pomocnik musi żyć WEWNĄTRZ wizarda, cel płynie w pamięci".
2. **Pierwszy szkic kazał wołać `select-path` w Kroku 0.** Błąd — brak rekordu studenta, nie ma czego nadpisać, plus podwójny zapis z `/api/onboarding`. Poprawka: §3.1 tryb embedded NIE woła `select-path`; zapis wyłącznie w finalnym submit.
3. **Brak listy testów jednostkowych (tylko e2e).** Dodałem §5 pkt 6 — `step-profile.test.tsx` padnie na usuniętym polu celu; wskazane konkretne pliki vitest.
4. **Numeracja kroków była niedospecyfikowana** (0–5 vs 1–6) i groziła zamuleniem progres-baru. Poprawka: §2 zostawia kształt paska Mili/Jackowi, ale fiksuje produktowo wiążące minimum (Pomocnik pierwszy, widoczny krok).
5. **Żargon „human-in-the-loop" mógł wejść do UI.** Poprawka: §4 jawnie zakazuje żargonu w UI, tłumaczy termin, copy całe po polsku (brand voice §3).
