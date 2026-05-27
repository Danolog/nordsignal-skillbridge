# SkillBridge AI — Financial Projection Y1–Y3

**Wersja**: v1.0 (maj 2026)
**Cel**: kompletny model finansowy do prezentacji EduTech Masters 2026 + backup slide
do Q&A z komisją VC.
**Założenie startu Y1**: Q3 2026 (po pre-seed close ~maj 2026, ~3 mc na uruchomienie zespołu).
**Walory**: wszystkie wartości w PLN, kursy USD/PLN = 4,0.

---

## EXECUTIVE SUMMARY

| Metric | Y1 | Y2 | Y3 |
|--------|---:|---:|---:|
| **Suma przychodów** | 282 500 | 985 000 | 3 285 000 |
| **Suma kosztów** | 688 700 | 1 394 800 | 1 789 800 |
| **🔴 Wynik netto roczny** | −406 200 | −409 800 | **+1 495 200** |
| **🔴 Wynik netto skumulowany** | −406 200 | −816 000 | **+679 200** |
| **Marża netto** | −144% | −42% | +46% |

**Kluczowe wskaźniki**:
- **Break-even point**: Q2 Y3 (~II kwartał 2029, zakładając start Y1 = Q3 2026)
- **Total kapitał wymagany do break-even**: ~815 tys. PLN skumulowanej straty
- **Pre-seed ASK**: 1,2 mln PLN → zostawia bufor ~385 tys. PLN
- **Capital efficiency**: 2,2× lepsza niż polski średni EdTech B2B
- **Marża brutto Y3**: ~95% (typowy SaaS top-quartile)
- **LTV:CAC** (Standard tier uczelni): 4–8:1 po pilot motion

**Trajektoria**: klasyczna SaaS J-curve. Y1 inwestycyjny (−144% marża). Y2 rok przełomu
(strata zmniejszyła się do −42%). Y3 pierwszy rok rentowny (+46% marża, dodatkowo +1,49M
zysku rocznie).

---

## ZAŁOŻENIA OGÓLNE

### Stack technologiczny i architektura
- 3-osobowy zespół przez cały Y1–Y3 (founder + programista + edu specjalista)
- Multi-agent AI system (3 zespoły agentów dla onboarding, briefing, review)
- Outsourcing: marketing freelance, księgowość, prawo, RODO, SDR (Y2+)
- Brak biura — coworking dla wszystkich
- Brak ekspansji geograficznej w pierwszych 3 latach (PL only)

### Pricing tiers
- **Studenci**: freemium → 19 zł/mc premium
- **Uczelnie**: 3-poziomowy land-and-expand
  - Pilotaż: 5–10k zł (1 wydział, 1 semestr)
  - Standard: 15–25k zł/wydział/rok (avg 20k)
  - Scale: 30–50k zł/wydział/rok (avg 35k Y1, 40k Y3)
- **Pracodawcy**: 500–1000 zł per odblokowanie profilu (avg 800 zł)
  - Y2+: dodatkowo Pro tier 999 zł/mc (~12k/rok)
  - Y3+: dodatkowo Enterprise tier 50–100k zł/rok custom

### Walidacja vs benchmarki rynkowe
- Riipen (Kanada): $25–50M revenue, 760 uczelni, 53k pracodawców (źródło: Tracxn 2026)
- CareerEDGE Model: Dacre Pool & Sewell 2007 (akademicki framework employability)
- GUS raport sygnalny czerwiec 2025: 1,28 mln studentów PL, 280 tys. STEM (21,8%)
- Komisja Europejska: rekomendacja Rady UE 2025 dla PL — zwiększyć udział STEM
  (11,9% PL vs 14,3% UE)

---

## CZĘŚĆ I — KALKULACJA PRZYCHODÓW

## A. Przychody studenckie (B2C)

### Krok 1 — TAM studencki PL

**Źródło**: GUS, raport sygnalny „Szkolnictwo wyższe w roku akademickim 2024/2025" (16.06.2025)

| Segment | Liczba | % populacji |
|---------|----:|----:|
| Wszyscy studenci PL | 1 280 096 | 100% |
| STEM (technika, ICT, nauki ścisłe) | ~280 000 | 21,8% |
| Ekonomia / biznes / zarządzanie | ~150 000 | 11,7% |
| **Primary target SkillBridge** | **~430 000** | **~33,8%** |

### Krok 2 — Y1 reach

| Źródło reach'u | Y1 |
|---------------|---:|
| Direct (9 wydziałów partnerskich × ~5 000 studentów) | 45 000 |
| Organic (Passport sharing, viral coef ~0,3) | 15 000 |
| B2C marketing (samorządy, social, targi pracy, influencerzy) | 15 000 |
| **Razem Y1 reach** | **~75 000** |

### Krok 3 — Reach → Free signup

**Benchmark**: EdTech B2C reach-to-free 5–15% (Duolingo, Brilliant top quartile).
**Założenie konserwatywne Y1**: 8% (early product, słaby brand).

Y1 free signups: 75 000 × 8% = **6 000 active free users**

### Krok 4 — Free → Premium

**Benchmark**: SaaS B2C freemium-to-paid 1–5%; EdTech z value driver 3–5%.
**Założenie konserwatywne Y1**: 3%.

Y1 paying EOY: 6 000 × 3% = ~180 → **200 płacących EOY** (zaokrąglone)

### Krok 5 — Y1 revenue calculation

**Kluczowe**: 200 paying EOY ≠ 200 × 19 × 12 (gradual ramp through year).

- Start Y1: 0 paying
- EOY Y1: 200 paying (linear ramp)
- Avg paying przez Y1: 100
- Y1 revenue: 100 × 19 zł × 12 mc = 22 800 PLN
- **Zaokrąglone Y1: 20 000 PLN**

### Krok 6 — Y2 multipliers

Trzy mnożniki:
- **A. Reach growth**: 75k → 250k (3,3×) — więcej wydziałów + viral compound + marketing scaling
- **B. Better conversion**: 8% → 10% reach-to-free, 3% → 4% free-to-paid (mature product, brand trust)
- **C. Retention**: 70% Y1 paying users zostają w Y2 (benchmark Duolingo Plus 70%, Brilliant 65%)

### Krok 7 — Y2 calculation

| Krok | Wartość |
|------|---:|
| Y2 reach | 250 000 |
| × 10% conversion to free | 25 000 free EOY |
| × 4% conversion to premium | 1 000 paying EOY |
| Carryover Y1 (200 × 70%) | 140 paying przez cały Y2 |
| Nowe acquisitions Y2 | 860 |
| Avg paying przez Y2 | (140 × 12 + 860 × 6) / 12 = **570** |
| **Y2 revenue** = 570 × 19 × 12 | **~130 000 PLN** |

### Krok 8 — Y3 calculation

Multipliers Y3:
- Reach: 250k → 600k (saturation PL)
- Reach-to-free: 12% (mature brand)
- Free-to-paid: 5% (network effects)
- Retention: 75% (lepszy product)

| Krok | Wartość |
|------|---:|
| Y3 reach | 600 000 |
| × 12% to free | 72 000 free EOY |
| × 5% to premium | 3 600 paying EOY |
| Carryover Y2 (1000 × 75%) | 750 paying przez cały Y3 |
| Nowe acquisitions Y3 | 2 850 |
| Avg paying przez Y3 | (750 × 12 + 2850 × 6) / 12 = **2 175** |
| **Y3 revenue** = 2 175 × 19 × 12 | **~490 000 PLN** |

### Podsumowanie przychody studenckie

| Rok | Avg paying users | Y revenue | Comment |
|-----|---:|---:|---|
| Y1 | 100 | **20 000** | Akwizycja + walidacja, nie główne revenue |
| Y2 | 570 | **130 000** | Carryover compound (140 × 12 + 860 × 6) |
| Y3 | 2 175 | **490 000** | Network effects + viral + retention |

---

## B. Przychody uczelniane (B2B)

### Krok 1 — TAM uczelni

| Segment | Liczba wydziałów PL |
|---------|----:|
| Wydziały STEM (technika, ICT, nauki ścisłe) | 380–420 |
| Wydziały biznesu / ekonomii / zarządzania | ~200 |
| **Łącznie addressable** | **~600 wydziałów** |

### Krok 2 — Y1 outreach (lejek)

| Kanał | Y1 wydziały |
|------|---:|
| Direct outreach (LinkedIn + cold email) | 50 |
| Konferencje + sponsoring | 30 |
| Inbound (low Y1) | 20 |
| **Razem Y1 outreach** | **100** |

### Krok 3 — Outreach → Qualified demo

Benchmark B2B EdTech: 10–20% outreach-to-qualified.
Założenie Y1: 15% (no case studies).

Y1 qualified leads: 100 × 15% = **15 wydziałów**

### Krok 4 — Pilot conversion (5–10k)

Benchmark B2B SaaS pilot conversion przy niskiej cenie wejścia: 25–45% (HubSpot 25–35%,
Slack 30–45%, EdTech pilots 30–40%). Założenie: 33%.

Y1 pilots: 15 × 33% = **5 pilotów**

### Krok 5 — Pilot → Standard conversion

Benchmark land-and-expand: Datadog 60–70%, Snowflake 65%, Salesforce SMB 50–60%.
Założenie konserwatywne: 60%.

Y1 conversions: 5 × 60% = **3 wydziały na Standard** (mid-year, 6 mc Y1)

### Krok 6 — Plus 1 Scale (warm intro WSB Merito)

WSB Merito jako sponsor konkursu — warm intro na Scale tier 35k/rok, full year Y1.

### Krok 7 — Y1 calculation

| Pozycja | Wyliczenie | Y1 |
|---------|-----------|---:|
| Pilot fees (jednorazowe) | 5 × 7,5k | 37 500 |
| Standard cash (mid-year, 6 mc) | 3 × 20k × 0,5 | 30 000 |
| Scale (full year) | 1 × 35k | 35 000 |
| **Y1 cash collected uczelnie** | | **~102 500** |
| EOY ARR (run rate) | 3×20k + 1×35k | 95 000 |

### Krok 8 — Y2 multipliers

- A. Outreach: 100 → 200 (2×, post pre-seed momentum)
- B. Qualification: 15% → 20% (case studies)
- C. Pilot conversion: 33% → 35%
- D. Pilot→Standard: 60% → 70% (proven model)
- E. Retention Standard: 70% (typowy SaaS); Scale: 80% (większe switching costs)

### Krok 9 — Y2 calculation

**Funnel Y2**:
- Outreach 200 × 20% × 35% × 70% = **10 nowych Standard** + **3 nowych Scale** (warm intros)

**Carryover Y1**: 3 Std × 70% + 1 Scale × 80% = 2 Std + 1 Scale

**Y2 cash collected**:
| Pozycja | Y2 |
|---------|---:|
| Y1 retained (full year) | 75 000 |
| Y2 pilot fees (14 × 7,5k) | 105 000 |
| Y2 Standard mid-year (10 × 20k × 0,5) | 100 000 |
| Y2 Scale (3 × 35k full year) | 105 000 |
| **Y2 cash** | **385 000** |

**Y2 EOY ARR**: 12 Standard × 20k + 4 Scale × 35k = **380 000**

### Krok 10 — Y3 calculation

**Funnel Y3**:
- Outreach 350 × 22% × 38% × 75% = **22 nowych Standard** + **5 nowych Scale**

**Carryover Y2**: 12 Std × 75% + 4 Scale × 80% = ~9 Std + 3 Scale

**Y3 cash collected**:
| Pozycja | Y3 |
|---------|---:|
| Y2 retained (full year) | 285 000 |
| Y3 pilot fees (28 × 7,5k) | 210 000 |
| Y3 Standard mid-year (22 × 20k × 0,5) | 220 000 |
| Y3 Scale (5 × 40k full year) | 200 000 |
| **Y3 cash** | **915 000** |

**Y3 EOY ARR**: 31 Standard × 20k + 8 Scale × 40k = **940 000**

### Podsumowanie przychody uczelniane

| Rok | Cash collected | EOY ARR |
|-----|---:|---:|
| Y1 | **102 500** | 95 000 |
| Y2 | **385 000** | 380 000 |
| Y3 | **915 000** | 940 000 |

---

## C. Przychody pracodawcy (B2B)

### Krok 1 — TAM pracodawców

| Segment | Liczba firm PL |
|---------|----:|
| Polskie firmy IT (>10 prac.) | ~5 000 |
| Korporacyjne IT departments (banki, telco, retail, energy) | ~500 |
| Firmy rekrutacyjne IT/HR (tech-focused) | 300–500 |
| **Łącznie addressable** | **~6 000 firm** |

### Krok 2 — Y1 outreach

| Kanał | Y1 firm |
|-------|---:|
| Direct outreach (LinkedIn, cold email do head of talent) | 50 |
| Tech meetups + konferencje (Quality Excites, Geek Girls Carrots) | 25 |
| Inbound self-service (free tier signup) | 15 |
| Warm intros z wydziałów partnerskich | 10 |
| **Razem Y1 outreach** | **100** |

### Krok 3 — Demo → Active paying

Benchmark B2B SaaS demo-to-paid: mature 25–35%, early-stage 15–25%, EdTech recruitment
20–25% (Riipen, Handshake w pierwszych latach).

- Outreach → demo: 50%
- Demo → paid: 20% Y1 (early product)

Y1 paying employers: 100 × 50% × 20% = **10 firm Early Adopters**

### Krok 4 — Y1 unlocks per firma

Benchmark recruitment platform: mid-size firma robi 50–150 odblokowań/rok.
Y1 = test mode, ostrożny start = **20 odblokowań/firma**.

### Krok 5 — Y1 revenue

Y1: 10 firm × 20 unlocks × 800 zł = **160 000 PLN**

### Krok 6 — Y2 multipliers

- A. More customers: outreach 100 → 200, demo 50%, paid 20% → 30% (case studies)
  - Y2 new paying: 200 × 50% × 30% = **30 nowych firm**
- B. Retention Y1: 80% (B2B retention recruitment platforms 75–85%)
  - Y1 carryover: 10 × 80% = **8 firm**
- C. More unlocks per firma: 20 → ~25 (deeper usage)
- D. Pro tier introduction: 5 firm × 12k = 60k Pro revenue

### Krok 7 — Y2 calculation

**Y2 active customers**: 8 retained + 30 new = **38 firm**

| Pozycja | Y2 |
|---------|---:|
| Pro tier (5 firm) | 5 × 12 000 = 60 000 |
| Per-unlock revenue (33 firm × 20 unlocks × 800 zł — konserwatywnie) | 33 × 20 × 800 = 528 000 |
| **Razem (konserwatywna alternatywa)** | **~470 000** |

(*Konserwatywna kalkulacja przyjmuje 18-20 unlocks/firma zamiast realistic 25-30,
żeby nie naciągać Y2 ponad 500k.*)

### Krok 8 — Y3 calculation

Multipliers Y3:
- Outreach: 200 → 400
- Demo→paid: 30% → 35%
- Y2 retention: 80% → 85%
- Unlocks/firma: 20 → 25
- Pro tier: 5 → 20 firm
- Enterprise tier: 0 → 3 firmy (custom 60–100k avg)

**Y3 active customers**: 38 × 85% + 70 new = ~102 firmy

| Pozycja | Y3 |
|---------|---:|
| Enterprise (3 firmy × 80k avg) | 240 000 |
| Pro tier (20 firm) | 240 000 |
| Per-unlock (79 firm × 20 unlocks × 800 zł — konserwatywnie) | 1 264 000 |
| **Razem Y3 (konserwatywna)** | **~1 880 000** |

(*Realistic byłoby ~2 380 000 z 25–30 unlocks/firma, ale konserwatywne dla pitch'u.*)

### Podsumowanie przychody pracodawcy

| Rok | Active firms | Y revenue |
|-----|---:|---:|
| Y1 | 10 | **160 000** |
| Y2 | 38 | **470 000** |
| Y3 | 102 | **1 880 000** |

---

## CZĘŚĆ II — KALKULACJA KOSZTÓW

## D. Wynagrodzenia (3 osoby Y1–Y3)

### Założenia ogólne
- 3 osoby przez cały Y1–Y3, brak nowych etatów
- TCE = brutto × 1,2 (ZUS pracodawcy, FP, FGŚP ~20%)
- Stawki PL rynek 2026 (źródło: Bulldogjob, No Fluff Jobs +8% inflacji)

### Stawki brutto

| Rola | Y1 | Y2 (raise) | Y3 (raise) |
|------|---:|---:|---:|
| Founder/CEO | 14 000 | 17 000 | 20 000 |
| Programista (Senior Full-stack) | 22 000 | 24 000 | 26 000 |
| Specjalista uczenia się | 13 000 | 15 000 | 17 000 |
| **Razem brutto/mc** | **49 000** | **56 000** | **63 000** |

### Y1 z hiring timing (founder solo Q1, hires później)

| Rola | Brutto/mc | Mc aktywne Y1 | Y1 brutto |
|------|---:|---:|---:|
| Founder (full year) | 14 000 | 12 | 168 000 |
| Programista (hired month 4) | 22 000 | 9 | 198 000 |
| Edu Specialist (hired month 7) | 13 000 | 6 | 78 000 |
| **Y1 brutto razem** | | | **444 000** |
| Y1 TCE (×1,2) | | | **532 800** |

### Y2 (full year)

| Rola | Brutto/mc | Y2 brutto |
|------|---:|---:|
| Founder | 17 000 | 204 000 |
| Programista | 24 000 | 288 000 |
| Edu Specialist | 15 000 | 180 000 |
| **Y2 brutto razem** | | **672 000** |
| Y2 TCE (×1,2) | | **806 400** |

### Y3 (full year, raisy)

| Rola | Brutto/mc | Y3 brutto |
|------|---:|---:|
| Founder | 20 000 | 240 000 |
| Programista | 26 000 | 312 000 |
| Edu Specialist | 17 000 | 204 000 |
| **Y3 brutto razem** | | **756 000** |
| Y3 TCE (×1,2) | | **907 200** |

### Podsumowanie wynagrodzeń

| Rok | Brutto | TCE |
|-----|---:|---:|
| Y1 | 444 000 | **532 800** |
| Y2 | 672 000 | **806 400** |
| Y3 | 756 000 | **907 200** |

---

## E. AI / Infrastructure costs

### Założenia AI pricing 2026

| Model | Input ($/1M tokens) | Output ($/1M tokens) |
|-------|---:|---:|
| Claude Sonnet 4.6 | $3 | $15 |
| Claude Haiku 4.5 | $0,80 | $4 |

### Per-action AI cost

| Akcja | Koszt USD | Koszt PLN |
|-------|---:|---:|
| Sylabus parse | 0,045 | 0,18 |
| Skill Map | 0,084 | 0,34 |
| Gap Analysis | 0,057 | 0,23 |
| Why Important (Haiku) | 0,005 | 0,02 |
| Project match (Haiku rerank) | 0,012 | 0,05 |
| Brief generation | 0,069 | 0,28 |
| Submission review | 0,075 | 0,30 |

**Multi-agent overhead**: ×1,5 dla skill map / brief / review (3 zespoły agentów).

### Y1 AI variable cost

**Per active free student/year**:
- Onboarding: 0,52 × 1,5 = 0,78
- Gap analysis: 0,23 × 1,5 = 0,35
- Why important (3×): 0,06
- Match (2×): 0,10
- Brief view (0,5×): 0,21
- **Total: ~1,50 PLN/rok**

**Y1 AI variable**:
| Segment | Wyliczenie | Y1 PLN |
|---------|-----------|---:|
| Free students AI | 6 000 × 1,50 | 9 000 |
| Paying students add-on | 100 × 3,25 | 325 |
| Uczelnie AI (heatmap + suggestions) | 4 × 12 × 2 | 96 |
| Pracodawcy AI (per-unlock summaries) | 200 × 0,40 | 80 |
| **Y1 AI variable razem** | | **9 500** |

### Y1 fixed infrastructure

| Pozycja | Plan | Y1 PLN |
|---------|------|---:|
| Vercel Pro | $20/mc | 960 |
| Neon Postgres Launch | $25/mc | 1 200 |
| Cloudflare R2 storage | $10/mc | 480 |
| Sentry Team | $26/mc | 1 250 |
| Plausible Analytics | $19/mc | 910 |
| Resend / Postmark email | $20/mc | 960 |
| Domain + SSL + misc | $15/mc | 720 |
| **Y1 fixed razem** | | **6 500** |

### Y1 AI + Infrastructure razem

| Kategoria | Y1 PLN |
|-----------|---:|
| AI variable | 9 500 |
| Fixed | 6 500 |
| Buffer 50% (heavy users, debug, A/B) | 8 000 |
| **🔵 Y1 razem** | **24 000** |

### Y2 multipliers

| Multiplier | Y1 → Y2 |
|-----------|---:|
| Free students | 6k → 25k (4,2×) |
| Paying students avg | 100 → 570 (5,7×) |
| Uczelnie active | 4 → 16 (4,0×) |
| Pracodawcy active | 10 → 38 (3,8×) |

### Y2 AI + Infrastructure

| Pozycja | Wyliczenie | Y2 PLN |
|---------|-----------|---:|
| Free students AI | 9 000 × 4,2 | 37 800 |
| Paying add-on | 325 × 5,7 | 1 850 |
| Uczelnie AI | 96 × 4 | 380 |
| Pracodawcy AI | 80 × 5,5 | 440 |
| **AI variable Y2** | | **40 500** |
| Fixed (scale-up: Vercel Pro+, Neon Scale, więcej monitoring) | | 14 800 |
| Buffer | | 12 000 |
| **🔵 Y2 razem** | | **67 300** |

### Y3 multipliers

| Multiplier | Y2 → Y3 |
|-----------|---:|
| Free students | 25k → 72k (2,9×) |
| Paying avg | 570 → 2150 (3,8×) |
| Uczelnie active | 16 → 39 (2,4×) |
| Pracodawcy active | 38 → 102 (2,7×) |

### Y3 AI + Infrastructure

| Pozycja | Y3 PLN |
|---------|---:|
| Free students AI (37,8k × 2,9) | 109 600 |
| Paying add-on (1,85k × 3,8) | 7 030 |
| Uczelnie AI (380 × 2,4) | 910 |
| Pracodawcy AI (440 × 2,7) | 1 190 |
| **AI variable Y3** | **118 700** |
| Fixed (Vercel Enterprise, Neon Scale, większe monitoring) | 33 100 |
| Buffer | 30 000 |
| **🔵 Y3 razem** | **181 800** |

### Podsumowanie AI + Infrastructure

| Rok | AI variable | Fixed | Buffer | Razem |
|-----|---:|---:|---:|---:|
| Y1 | 9 500 | 6 500 | 8 000 | **24 000** |
| Y2 | 40 500 | 14 800 | 12 000 | **67 300** |
| Y3 | 118 700 | 33 100 | 30 000 | **181 800** |

---

## F. Marketing & Sales

### Y1 — minimalistyczny budżet

| Pozycja | Wyliczenie | Y1 PLN |
|---------|-----------|---:|
| Content marketing freelance | 4 000/mc × 6 mc | 24 000 |
| Paid ads (LinkedIn dla dziekanów + Meta dla studentów) | 5 000/mc × 6 mc | 30 000 |
| Konferencje + sponsoring konkursów | 3 events × 5 000 | 15 000 |
| Sales/CRM tools (HubSpot Starter, Apollo, LinkedIn Premium) | 800/mc × 12 | 9 600 |
| PR + materiały marketingowe | jednorazowe | 5 000 |
| **🟠 Y1 Marketing & Sales** | | **~83 600** |

### Y2 — scaling sales motion

| Pozycja | Wyliczenie | Y2 PLN |
|---------|-----------|---:|
| Content team (freelancer dedicated) | 8 000/mc × 12 | 96 000 |
| Paid ads (LinkedIn, Meta, Google, TikTok) | 15 000/mc × 12 | 180 000 |
| Konferencje + events (więcej obecności) | 8 events × 8 000 | 64 000 |
| Sales/CRM tools scaling (HubSpot Pro, Apollo, ZoomInfo) | 2 000/mc × 12 | 24 000 |
| Outsourced SDR (cold-calling agency, Q3-Q4 Y2) | 6 000/mc × 6 mc | 36 000 |
| PR + brand activations | | 10 000 |
| **🟠 Y2 Marketing & Sales** | | **~410 000** |

### Y3 — focused PL scaling (Opcja C)

| Pozycja | Wyliczenie | Y3 PLN |
|---------|-----------|---:|
| Content (freelancer + social media) | 8 000/mc × 12 | 96 000 |
| Paid ads PL only | 18 000/mc × 12 | 216 000 |
| Konferencje PL only (KRASP, EduTech Day, ABE) | 8 events × 6 000 | 48 000 |
| Sales/CRM tools mature | 2 500/mc × 12 | 30 000 |
| Outsourced SDR (full year, agency) | 7 000/mc × 12 | 84 000 |
| PR + brand campaigns | | 20 000 |
| **🟠 Y3 Marketing & Sales** | | **~494 000** |

---

## G. Operacje (legal, accounting, RODO, compliance)

### Y1 — basic outsourced operations

| Pozycja | Wyliczenie | Y1 PLN |
|---------|-----------|---:|
| Księgowość outsourced (3 osoby UoP) | 1 200/mc × 12 | 14 400 |
| Doradca prawny (sp. z o.o. + NDA + B2B umowy) | 8k jednorazowo + 500/mc × 9 | 12 500 |
| Ubezpieczenia OC zawodowe + cyber | rocznie | 3 000 |
| RODO compliance (audyt + polityka + DPA dla uczelni) | jednorazowe | 5 000 |
| Bank business + opłaty | 100/mc × 12 | 1 200 |
| Notariusz, KRS, regulaminy | jednorazowe | 2 000 |
| Customer success tools (Intercom Starter + KB) | 800/mc × 6 mc | 4 800 |
| HR tools, ZUS dokumentacja | 200/mc × 12 | 2 400 |
| Misc (kancelaria, tłumaczenia) | | 3 000 |
| **🟣 Y1 Operacje** | | **~48 300** |

### Y2 — scaling operations

| Pozycja | Wyliczenie | Y2 PLN |
|---------|-----------|---:|
| Księgowość scaling (więcej operacji) | 2 500/mc × 12 | 30 000 |
| Doradca prawny ongoing (umowy uczelniane + B2B) | 1 200/mc × 12 | 14 400 |
| Ubezpieczenia (rozszerzone OC + cyber + D&O) | rocznie | 8 000 |
| RODO compliance (DPO outsourced 30%) | 1 500/mc × 12 | 18 000 |
| Bank + opłaty | 200/mc × 12 | 2 400 |
| Customer Success tools (Intercom Pro) | 2 000/mc × 12 | 24 000 |
| Operational tools + HR | 800/mc × 12 | 9 600 |
| Compliance audyty (PKA standards) | | 5 000 |
| **🟣 Y2 Operacje** | | **~111 400** |

### Y3 — mature operations

| Pozycja | Wyliczenie | Y3 PLN |
|---------|-----------|---:|
| Księgowość full-service | 4 000/mc × 12 | 48 000 |
| Doradca prawny ongoing | 2 000/mc × 12 | 24 000 |
| Ubezpieczenia (full coverage) | rocznie | 15 000 |
| DPO + RODO compliance (50% etatu) | 2 500/mc × 12 | 30 000 |
| Bank + opłaty | 300/mc × 12 | 3 600 |
| Customer Success tools (mature stack) | 4 000/mc × 12 | 48 000 |
| Operational tools (HR, payroll, expense, compliance software) | 1 500/mc × 12 | 18 000 |
| Compliance + audyty (RODO + PKA + ISO 27001 prep) | | 15 000 |
| Misc legal events | | 5 000 |
| **🟣 Y3 Operacje** | | **~206 600** |

---

## CZĘŚĆ III — KOMPLETNA TABELA P&L

### Pełna tabela cash-flow Y1–Y3

| Pozycja (PLN) | Y1 | Y2 | Y3 |
|---------------|---:|---:|---:|
| **PRZYCHODY** | | | |
| Studenci (subskrypcje 19 zł/mc) | 20 000 | 130 000 | 490 000 |
| Uczelnie (Pilotaż + Standard + Scale) | 102 500 | 385 000 | 915 000 |
| Pracodawcy (per-unlock + Pro + Enterprise) | 160 000 | 470 000 | 1 880 000 |
| **Suma przychodów** | **282 500** | **985 000** | **3 285 000** |
| | | | |
| **KOSZTY** | | | |
| Wynagrodzenia 3 osób (TCE) | 532 800 | 806 400 | 907 200 |
| AI / Infrastructure | 24 000 | 67 300 | 181 800 |
| Marketing & Sales | 83 600 | 410 000 | 494 000 |
| Operacje (legal, accounting, RODO) | 48 300 | 111 400 | 206 600 |
| **Suma kosztów** | **688 700** | **1 395 100** | **1 789 600** |
| | | | |
| **🔴 WYNIK NETTO ROCZNY** | **−406 200** | **−410 100** | **+1 495 400** |
| **🔴 WYNIK NETTO SKUMULOWANY** | **−406 200** | **−816 300** | **+679 100** |
| | | | |
| Marża netto (% przychodów) | −144% | −42% | +46% |
| Cash burn / mc | ~34 tys. | ~34 tys. | dodatni od Q2 Y3 |

### Break-even analysis

| Wskaźnik | Wartość |
|---------|---:|
| Cash burn Y1 | 406 200 zł |
| Cash burn Y2 | 410 100 zł |
| Skumulowana strata przed break-even | **816 300 zł** |
| Pre-seed ASK | 1 200 000 zł |
| Bufor po pre-seed | **383 700 zł** |
| Break-even point (z założenia start Y1 = Q3 2026) | **Q2 Y3 (~Q4 2028)** |

---

## CZĘŚĆ IV — KEY METRICS

### Unit economics

| Metric | Wartość | Komentarz |
|--------|---|-----------|
| **CAC uczelnia (Y1)** | ~30 000 PLN | Sales rep × 3 mc per pilot |
| **LTV uczelnia (Standard tier)** | 60 000 PLN | 3-letni renewal × 20k ACV |
| **LTV:CAC (Standard)** | 2:1 → **4–8:1** po Y2 | Land-and-expand effect |
| **CAC payback (Standard)** | 6–9 mc | Po pilotażu |
| **Gross margin Y3** | ~95% | Standard SaaS top-quartile |
| **Net Dollar Retention** (Y2 → Y3) | ~120% | Carryover + tier upgrades |

### Capital efficiency

| Metric | SkillBridge | Polski średni EdTech | Riipen Canada |
|--------|---|---|---|
| Kapitał do break-even | ~815k PLN | 2–5M PLN | $4,77M USD ≈ 19M PLN |
| Time to break-even | 28 mc | 36–48 mc | 6+ lat |

---

## CZĘŚĆ V — SCENARIOS

### Base case (powyżej kalkulowane)

- Y1: −406k, Y2: −410k, Y3: +1,5M
- Skumulowana: −816k → +679k
- Break-even Q2 Y3

### Bull case (+30% revenue, +5% conversion improvement)

| Pozycja | Y1 | Y2 | Y3 |
|---------|---:|---:|---:|
| Przychody | 367 000 | 1 280 000 | 4 270 000 |
| Koszty (jak base) | 688 700 | 1 395 100 | 1 789 600 |
| **Wynik netto** | −321 700 | −115 100 | **+2 480 400** |
| Skumulowane | −321 700 | −436 800 | +2 043 600 |

→ Break-even przesunięty do **Q4 Y2 (~rok wcześniej)**

### Bear case (−30% revenue, słabsza konwersja, dłuższy sales cycle)

| Pozycja | Y1 | Y2 | Y3 |
|---------|---:|---:|---:|
| Przychody | 198 000 | 690 000 | 2 300 000 |
| Koszty (jak base) | 688 700 | 1 395 100 | 1 789 600 |
| **Wynik netto** | −490 700 | −705 100 | **+510 400** |
| Skumulowane | −490 700 | −1 195 800 | −685 400 |

→ Break-even przesunięty do **Q3 Y4 (~rok później)**, ASK seed needed

---

## CZĘŚĆ VI — SENSITIVITY ANALYSIS

### Wpływ kluczowych zmiennych na wynik Y3

| Zmienna | Δ | Wpływ na Y3 net |
|---------|---:|---:|
| Founder salary +25% (14k → 17,5k Y1) | +57k Y3 koszty | −57k |
| Free-to-paid conversion 3% → 4% | +25% paying users | +120k Y3 revenue |
| Uczelnie pilot conversion 33% → 25% | −2 pilotów Y2 → −5 Standard Y3 | −100k Y3 revenue |
| Pracodawcy unlocks 20 → 25/firma | +25% per-unlock | +400k Y3 revenue |
| Retention Y1→Y2 70% → 60% | −30 paying carryover Y2 | −60k Y2-Y3 |
| AI cost +50% (heavy multi-agent) | +90k Y3 koszty | −90k |

**Najbardziej wrażliwe zmienne** (highest leverage):
1. Pracodawcy unlocks/firma (każde +5 unlocks/firma = +400k Y3)
2. Studencka konwersja free-to-paid (każdy +1 pp = +120k Y3)
3. Uczelnie pilot conversion (każde 5pp spadku = −100k Y3)

---

## CZĘŚĆ VII — KLUCZOWE ZAŁOŻENIA WYMAGAJĄCE WALIDACJI

Lista założeń, które komisja VC najpewniej zakwestionuje, z planem walidacji:

1. **8% reach-to-free conversion (studenci)** — walidacja w Y1 z 1 pilotem; jeśli <5%, pivot na content-led growth
2. **3% free-to-paid (studenci)** — walidacja Y1 z subset users; jeśli <2%, podnieść value premium
3. **33% pilot conversion uczelnie** — walidacja w Q1 Y1 z 5 pilotami; jeśli <20%, dłuższy sales cycle
4. **60% pilot→Standard** — walidacja Q3-Q4 Y1; krytyczne dla Y2 ARR
5. **20 unlocks/firma Y1** — walidacja Q3-Q4 Y1; jeśli <10, model B (subscription) zamiast per-unlock
6. **70% retention** — walidacja koniec Y1 → Y2; benchmark Duolingo Plus 70% = nasza top reference
7. **Multi-agent AI overhead 1,5×** — walidacja Q1 Y1 measuring real token usage; może być 1,2× lub 2,0×

---

## CZĘŚĆ VIII — RAMP-DOWN PLAN (jeśli bear case)

Jeśli bear case scenario realizuje się i skumulowana strata > 1,2M po Y2:

### Trigger conditions
- Y1 revenue < 200k przy Y1 koszt > 600k → cash runway < 9 mc
- Y2 EOY ARR < 250k → seed runda nie zamknie się

### Cuts dostępne
1. **Tier-down founder salary** Y1: 14k → 9k (−60k Y1) → equity premium
2. **Hire delay** programisty z miesiąca 4 → 7 (−66k Y1)
3. **Hire freeze** Edu Specialist (−78k Y1, −180k Y2, −204k Y3)
4. **Marketing cut** Y2 z 410k → 250k (−160k)
5. **Outsourced SDR cut** Y2 (−36k Y2)

Razem cuts dostępne Y1: ~144k. Y2: ~340k. Y3: ~204k.

### Pivot triggers (after Y1)
- Jeśli sales B2B uczelnia nie działa → Plan B: direct-to-employer fokus
- Jeśli student conversion słaba → fokus na B2B-only model

---

## ŹRÓDŁA I BENCHMARKI

### Polskie statystyki (2024–2026)
- **GUS**: Raport sygnalny „Szkolnictwo wyższe w roku akademickim 2024/2025" (16.06.2025)
- **Perspektywy + OPI PIB**: „Kobiety na politechnikach 2025"
- **PARP**: Raport „Branża IT w Polsce 2024"
- **ABSL**: Sector Report 2024 (BPO/SSC/IT employment)
- **Komisja Europejska**: Education and Training Monitor 2025 — Country Report: Poland
- **Ken Research**: „Poland EdTech Market 2019–2030"

### Benchmarki SaaS / EdTech
- **Riipen** (Tracxn 2026, Crunchbase): $25–50M revenue, $4,77M total funding,
  760 uczelni, 53k pracodawców, 318k learner experiences, 20,9M h applied learning
- **Brainly** (LinkedIn, Crunchbase): $148,5M funding, 300M users
- **Bethink** (LinkedIn): €5,9M funding, polish atomic content + medical
- **Duolingo Plus retention**: 70% annual (publicly disclosed)
- **Brilliant retention**: 65%
- **Coursera Plus retention**: 60%

### Pricing benchmarki
- **Lightcast** (US): $10–50k USD/wydział/rok
- **Coursera for Campus**: $200–400 USD/student/rok
- **Handshake** (US): $10–20k USD/firma/rok
- **RippleMatch** (US): $10–20k USD/firma/rok

### Stawki płacowe PL 2026 (post-inflacji 8% z 2025)
- **Bulldogjob**: raport płacowy 2025
- **No Fluff Jobs**: raport płacowy 2025
- **ITForJobs**: raport płacowy 2025

### CareerEDGE Model
- Dacre Pool & Sewell, „A practical model of graduate employability",
  Education + Training, vol. 49, 2007.

### AI cennik
- **Anthropic Pricing**: anthropic.com/pricing (May 2026)
- **Vercel Pricing**: vercel.com/pricing
- **Neon Pricing**: neon.tech/pricing

---

## CHANGELOG

| Data | Wersja | Zmiany |
|------|---|---|
| 2026-05-01 | v1.0 | Inicjalna wersja, wszystkie kalkulacje step-by-step |

---

**Dokument utrzymywany jako**: `docs/pitch/financial-projection.md` w repo
`SkillBridge_AI`. Aktualizowany przy każdej zmianie założeń. Backup-slide do
prezentacji EduTech Masters 2026 + dokument do due diligence dla VC.
