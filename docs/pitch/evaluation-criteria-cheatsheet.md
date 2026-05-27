# SkillBridge AI — Cheat Sheet do Formularza Komisji

Każdy juror wypełnia formularz oceniający 7 kryteriów, każde 1–10 pkt (max 70/zespół).
Konkurujesz z 3 innymi zespołami — komisja porównuje. Cel: 9–10 pkt w 3 wybranych
„obszarach przewagi" + min. 7 pkt w pozostałych 4.

---

## ⚠️ Format konkursowy

- **Pitch: 4 minuty** (nie 8–10)
- **Q&A: 4 minuty**
- **Łącznie 8 minut na zespół**

Pitch deck zoptymalizowany na ten format jest w `pitch-deck-content.md` —
**7 slajdów, ~35–45 s na slajd, demo jako screenshot (NIE live)**.

W 4 minutach nie zdążysz solidnie pokryć 7 kryteriów. Skupiasz pitch na 3 obszarach
przewagi (innowacyjność / wykonalność / rynek) i pozwalasz Q&A wypełnić resztę
(model biznesowy / zespół / skalowalność).

---

## Formularz — co dokładnie ocenia komisja (cytat z PDF)

| # | Kryterium | Co pyta komisja |
|---|-----------|-----------------|
| 1 | **Innowacyjność produktu/usługi** | Jak innowacyjny jest produkt w porównaniu do istniejących rozwiązań? |
| 2 | **Potencjał rynkowy** | Rozmiar rynku? Czy jasno określona grupa docelowa? Czy propozycja wartości pasuje do potrzeb? |
| 3 | **Wykonalność techniczna** | Etap rozwoju technologicznego? Czy określono stan obecny? Łatwość wdrożenia i skalowania? |
| 4 | **Model biznesowy** | Spójność i realizm? Plan wejścia na rynek? Plan przychodów długoterminowych? |
| 5 | **Zespół** | Kompetencje i doświadczenie? Czy zespół ma niezbędne umiejętności? Świadomość luk i plan ich uzupełnienia? |
| 6 | **Skalowalność** | Możliwości przy wzroście liczby userów? Potencjał ekspansji na inne obszary/rynki? Wizja rozwoju? |
| 7 | **Jakość i atrakcyjność prezentacji** | Klarowność, profesjonalizm, skuteczność w odpowiadaniu na pytania |

---

## Twój strategiczny plan na każde kryterium

### 1. Innowacyjność (cel: 9–10 pkt) — **OBSZAR PRZEWAGI**

**3-zdaniowy „mantra" do powtarzania w 3 różnych slajdach**:

1. „Jako jedyni w PL łączymy AI matchmakera z marketplace'em projektów graduowanych 1–5"
2. „Riipen w Kanadzie udowodnił model — my lokalizujemy go na PL i dodajemy faculty
   curriculum loop, którego oni nie mają"
3. „Verified Receipts to nowa kategoria — nie self-assessed CV, tylko dowód pracy z
   linkiem do artefaktu"

**Konkretne dowody do wymienienia (juror lubi listy):**

- AI w roli matchmakera, nie generatora treści (świadoma decyzja architektoniczna,
  udokumentowana w Decision Document)
- 5 poziomów L1–L5 (od open-data po partner-driven production deploy)
- Faculty curriculum loop — heatmap pokrycia kompetencji per career goal
- Hybrid AI scoring — keyword + LLM rerank (cost-conscious, działa)

**Czego NIE mówić**: „rewolucyjne", „pierwszy w świecie", „disrupt". Komisja czyta to
jako blef. Zamiast tego: „nowa kategoria w PL", „pierwszy zlokalizowany model".

---

### 2. Potencjał rynkowy (cel: 9–10 pkt) — **OBSZAR PRZEWAGI**

**Kluczowe liczby do wbicia w głowę** (i wymienienia 2–3 razy w pitch'u):

- TAM: **$111B (2025) → $271B (2034)**, CAGR 10,4% — europejski e-learning
- SAM: **PLN 1,2 mld → 2,5 mld (2027)** — polski EdTech
- **SAM bottom-up** (GUS 2024/2025 + Perspektywy): **380–420 wydziałów STEM**
  × ~50k zł ACV = **PLN ~20 mln ARR adresowalne**
- **Wsparcie liczbowe**: 280 tys. studentów STEM (21,8% populacji studenckiej),
  192 tys. na publicznych politechnikach
- **SOM 24 mc**: 30% capture = **PLN ~6 mln ARR realnie zdobywalne**
- **Tailwind**: rekomendacja Rady UE 2025 dla PL — zwiększyć udział STEM
  (11,9% PL vs 14,3% UE)
- Y1 cel: **5 uczelni × ~10k studentów × PLN 30 = PLN 1,5 mln ARR**
- Corporate upskilling segment: **+15,2% CAGR** (najszybszy)

**Grupa docelowa — 3-stronny marketplace**:

1. Studenci STEM/biznes na uczelniach technicznych (free user)
2. Uczelnie wyższe publiczne i prywatne (B2B SaaS payer)
3. Firmy IT / banki / korpo szukające junior talent (freemium → pro/enterprise payer)

**Propozycja wartości per grupa (one-liner)**:

- Studentom — **portfolio zamiast deklaracji**
- Uczelniom — **dane, czego naprawdę uczyć**
- Firmom — **talent pre-vetted via verified receipts**

---

### 3. Wykonalność techniczna (cel: 9–10 pkt) — **OBSZAR PRZEWAGI**

**Killer fact**: większość zespołów konkursowych ma makietę. Ty masz 11 058 linii
produkcyjnego kodu.

**Stan obecny TRL** (Technology Readiness Level — komisja akademicka to lubi):

- TRL 6 — System prototype demonstration in operational environment (działający MVP
  na Vercel z zarejestrowanymi userami, real Postgres, real AI calls)
- Cel za 6 mc: TRL 7 — System prototype demonstration in operational environment
  with paying customers (5 uczelni pilot)
- Cel za 18 mc: TRL 8 — System complete and qualified

**Konkretne dowody**:

- 9 features fully implemented (auth, onboarding + AI sylabus parser, skill map React Flow,
  gap analysis, projects, passport + PDF, faculty panel)
- 11 058 linii kodu w 26 plikach testowych
- Stack: Next.js 15, React 19, TypeScript strict, Drizzle ORM, Postgres, Better Auth,
  Vercel AI SDK + Claude Sonnet 4.6
- Live demo w 30 sekund + open-source na GitHub
- Project catalog roadmap: 19-krokowy plan z atomowymi commitami i test-gate, w realizacji

**Łatwość wdrożenia**:

- B2B onboarding uczelni: SSO przez Better Auth (1 dzień)
- Branded portal per uczelnia (1 tydzień)
- Onboarding studenta: ~5 minut
- Onboarding firmy: ~30 minut (formularz partner module)

**Czego NIE mówić**: „nasza technologia jest unikalna". Stack jest standardowy —
wartość siedzi w architekturze AI + danych.

---

### 4. Model biznesowy (cel: 7–8 pkt — solidnie, ale nie killer)

**4 strumienie przychodu** (powtórz w pitch'u):

1. Studenci → 19 zł/mc (motywacja przez zaangażowanie, nie główny revenue)
2. Uczelnia → **3-poziomowy land-and-expand**:
   - Pilotaż 5–10k (1 wydział, 1 semestr — niski próg wejścia)
   - Standard 15–25k/wydział/rok (po dowiedzeniu wartości)
   - Scale 30–50k/wydział/rok (flagship, długoterminowe kontrakty)
3. Firmy → 500–1000 zł / odblokowanie + Pro PLN 999/mc + Enterprise custom
4. Państwo/UE → granty (KPO, FERS, Horizon Europe) za projekty NGO

**Za co uczelnia konkretnie płaci** (5 wartości — każda samodzielnie uzasadnia kontrakt):

1. 📄 **Auto-raport PKA** — 4 godziny pracy biura jakości → 5 minut
2. 📊 **Curriculum analytics** — real-time heatmapa luk vs rynek pracy
3. 🎯 **Wyróżnik rekrutacyjny** — argument przeciwko 54 uczelniom w likwidacji
4. 📉 **Redukcja dropoutu** — break-even przy 5 zatrzymanych studentach/rok
5. 💶 **KPO/FERS leverage** — implementacja sfinansowana z funduszu UE

**Unit economics (najczęściej pytane przez VC)**:

- ACV uczelnia (Standard tier): PLN 20k/rok · ACV Scale: PLN 40k/rok
- LTV: PLN 60–120k (3-yr renewal avg, mix tierów)
- CAC: PLN 30k (sales rep × 3 mc na pilotaż-tier)
- **LTV:CAC = 2–4:1** w pilot motion · **LTV:CAC = 4–8:1** po Standard tier
- CAC payback: 6–9 mc (dzięki niskiemu progowi pilotaża)
- Gross margin: >90% (AI cost ~3 zł/student/mc przy 10k aktywnych)

**Plan wejścia na rynek (GTM)**:

- Faza 1 (Q3 2026): pilot z WSB Merito + 1 uczelnia publiczna
- Faza 2 (Q4 2026): 5 uczelni pipeline + 10 firm freemium
- Faza 3 (2027): 30 uczelni, runda seed
- Faza 4 (2028): CEE expansion przez EIT Digital

**Plan B (dla VC)**: jeśli sales B2B uczelnia za wolny → przestawienie na
direct-to-employer model (skraca cycle z 9 mc do 6 tygodni).

---

### 5. Zespół (cel: 7–8 pkt — bezpieczny obszar, nie ryzykuj)

**Co powiedzieć (3 punkty, w tej kolejności)**:

1. Kim jesteś — kompetencje (full-stack, AI integration, MVP delivery solo)
2. Świadomość luk — B2B sales, customer success, finance
3. Plan uzupełnienia — Head of Partnerships jako pierwszy hire post pre-seed,
   advisory board (dziekan + recruiter + EdTech investor)

**Magic words dla komisji** (akademik to docenia, VC neutralnie):

- „Świadomość luk to nie wada, to dojrzałość operacyjna"
- „Pierwszy hire post pre-seed to co-founder-grade Head of Partnerships z equity"
- „Advisory board: cel — dziekan + head of talent z firmy IT + investor wczesnych etapów"

**Czego NIE mówić**:

- „Mam zespół 5 osób" jeśli to są tylko freelancerzy
- „Wszystko ogarniam sam" — to brzmi jak ego, nie kompetencja
- „Po pre-seed zatrudnimy 10 osób" — komisja wie, że za 1,2 mln to nierealne

---

### 6. Skalowalność (cel: 8–9 pkt — naturalna konsekwencja AI-first)

**3 wektory skalowania** (powtórz słowo w słowo na slajdzie 11):

1. **Geograficzny**: PL → CEE (170M obywateli, 4M studentów) → EU (450M, 18M studentów)
2. **Vertykalny**: STEM → wszystkie kierunki → korporacyjny upskilling
3. **Produktowy**: receipts marketplace → API rekrutacji → „LinkedIn dla early-career"

**Argument za niskim marginal cost**:

- AI-native = brak ręcznej produkcji treści
- AI cost ~3 PLN/student/miesiąc = >90% gross margin
- Marketplace efekt sieciowy: więcej uczelni → więcej studentów → więcej projektów
  → więcej firm → więcej projektów → flywheel
- Localization to UI translation + adapter na lokalny rynek pracy + lokalny dataset
  open-data — 8–12 tygodni per kraj

**Wizja jednym zdaniem**:

> „The default work-integrated learning layer for Eastern Europe by 2030."

---

### 7. Jakość prezentacji (cel: 9–10 pkt) — **OBSZAR PRZEWAGI**

**Co konkretnie podnosi tę ocenę**:

1. **Czas** — kończysz w 8 minut, nie 11. Komisja docenia dyscyplinę.
2. **Headline na każdym slajdzie** — komisja czyta nagłówek, jeśli przegapi mowę
3. **Live demo lub backup screencast** — jak nikt inny tego nie ma, jesteś memorable
4. **Brak pomyłek przy nawigacji** — testuj prezentację 3× przed galą
5. **Q&A z TL;DR + rozwinięcie** — krótkie, mocne, z liczbami
6. **Kontakt wzrokowy** — patrz na komisję, nie na laptop
7. **Odzież** — smart casual / business casual (nie garnitur, to overdress; nie t-shirt,
   to underdress)
8. **Last sentence matters** — zaplanuj zakończenie: „Most między salą wykładową
   a stanowiskiem pracy. Dziękuję."

**3 rzeczy do absolutnego unikania**:

- Czytanie ze slajdu (komisja widzi, wystawia 5/10)
- „Eee", „yyy", „w sensie" — ćwicz na video, eliminuj
- Tłumaczenie się: „jeszcze nie zdążyliśmy", „mieliśmy mniej czasu" — usuń ze
  słownika

---

## Score targeting (matematyka konkursu)

Gdyby komisja wystawiła ci średnio:

| Kryterium | Pesymizm | Realizm | Optymizm |
|-----------|----------|---------|----------|
| Innowacyjność | 7 | 9 | 10 |
| Potencjał rynkowy | 7 | 8 | 9 |
| Wykonalność techniczna | 8 | 9 | 10 |
| Model biznesowy | 6 | 7 | 8 |
| Zespół | 6 | 7 | 8 |
| Skalowalność | 7 | 8 | 9 |
| Prezentacja | 8 | 9 | 10 |
| **SUMA** | **49/70** | **57/70** | **64/70** |

**Realistyczny target: 57/70 = 81%**. Wymaga, żebyś faktycznie miał działający MVP
(masz), live demo (przygotuj), liczby SOM (są w `pitch-deck-content.md`),
plan B na model biznesowy (jest), świadomość luk zespołu (jest).

**Optimistic 64/70 = 91%** wymaga dodatkowo: konkretnego advisora wymienionego
z imienia, jednej zaakceptowanej rozmowy partnerskiej (uczelnia LUB firma), oraz
5 minutowej prezentacji bez pomyłek.

---

## Co zrobić w pozostałe 4 dni (1–5 maja)

**Dzień 1 (1.05) — DZIŚ**:

- ✅ Materiały pitch przeczytane i zaadaptowane do twojego stylu
- 🔲 Wybierz template wizualny (Figma / PPTX / Canva) — minimalistyczny, biały, jeden font
- 🔲 Zacznij szkic 12 slajdów — tylko nagłówki + 1 zdanie kontentu

**Dzień 2 (2.05)**:

- 🔲 Pełna treść slajdów (skopiuj z `pitch-deck-content.md`)
- 🔲 Live demo flow zarejestrowany na backup screencast (90 s)
- 🔲 Wypełnij wszystkie [PLACEHOLDER] z liczbami które potwierdzisz

**Dzień 3 (3.05)**:

- 🔲 Ćwicz pitch na głos 3× (z timerem) — cel 8 minut
- 🔲 Q&A drill z `qa-preparation.md` — 15 pytań na głos
- 🔲 Dopnij wizualny design — typografia, kolory, ikony

**Dzień 4 (4.05)**:

- 🔲 Próba generalna z kimś (rodzina/znajomy nie z branży) — czy to jest jasne?
- 🔲 Backup wszystkiego: PDF, PPTX, screencast na pendrive + chmura + email do siebie
- 🔲 Wcześnie spać. Nie cykluj kawy w noc przed galą.

**Dzień 5 (5.05) — DZIEŃ X**:

- 🔲 Lekkie śniadanie, dotrzyj 60 minut przed
- 🔲 Sprawdź setup techniczny w sali (rzutnik, dźwięk, internet)
- 🔲 Przed wystąpieniem: 3 głębokie oddechy, 30 sekund pacingu, last review hooku
- 🔲 Po pitch'u: zapisz pytania, jakie zadali — to feedback na seed pitch

---

## Cheat sheet do druku (1 strona A4)

```
SKILLBRIDGE AI — 4-MIN PITCH × 7 KRYTERIÓW

PACING:
  S1 Hook (10s) → S2 Problem (35s) → S3 Solution+demo (50s) →
  S4 Traction (40s) → S5 Market (40s) → S6 Diff+Biznes (45s) →
  S7 Team+Ask+Closing (35s) = 3:55 (cel)

1. INNOWACYJNOŚĆ:
   "Jako jedyni w PL — AI matchmaker + marketplace L1–L5
    + Verified Receipts + faculty curriculum loop."

2. RYNEK:
   "TAM $271B (2034). SAM PLN 2,5 mld (2027). 380–420 wydziałów STEM × 50k ACV
    = ~20 mln zł SAM. SOM 24 mc: ~6 mln. Y1 cel 345k = 6% SOM.
    Tailwind: rekomendacja Rady UE 2025 dla PL na STEM."

3. TECH:
   "Działające MVP. 11k LOC. 9 features. Demo screenshot na slide 3,
    live demo przy stoisku. TRL 6 → TRL 7 za 6 mc."

4. BIZNES:
   "3-tier uczelnie: Pilotaż 5-10k → Standard 15-25k → Scale 30-50k.
    Za co: raport PKA, curriculum analytics, rekrutacja, dropout, KPO.
    Land-and-expand. Plan B: direct-to-employer."

5. ZESPÓŁ:
   "Solo-founder dowiódł execution. Pierwszy hire: Head of
    Partnerships. Świadomość luk = dojrzałość."

6. SKALOWALNOŚĆ:
   "PL → CEE → EU. Marginal cost ~3 zł/student/mc.
    Vision: default work-integrated layer for CEE by 2030."

7. PREZENTACJA:
   "Kończ w 3:55. Demo statyczne, nie live. Q&A 30s/odpowiedź.
    Last words: 'Most między salą wykładową a stanowiskiem pracy.'"

Q&A PACING (4 min Q&A = 4–6 pytań):
  0–3s pauza → 3–10s TL;DR → 10–35s rozwinięcie → 35–40s zamknięcie
  NIGDY nie przekraczaj 45s na odpowiedź.
```

Wytnij to, wsadź pod laptop podczas pitch'u jako last-second-review.
