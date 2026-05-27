# SkillBridge AI — Q&A Preparation

Dokument do trzymania pod ręką podczas prezentacji 05.05.2026. Pytania pogrupowane
po obszarach, z którymi komisja prawdopodobnie się przyjdzie. Każde pytanie ma:
**TL;DR** (jednozdaniowa odpowiedź), **rozwinięcie** (do 30 s wypowiedzi),
**red flag** (czego unikać).

Komisja jest mieszana — akademik patrzy inaczej niż VC. Tam gdzie odpowiedź się różni,
oznaczone jest jako **[AKADEMIK]** lub **[VC]**.

---

## ⚠️ Format Q&A: 4 minuty łącznie

Sesja Q&A trwa **4 minuty po pitch'u**. To realistycznie **4–6 pytań**.
Każda odpowiedź **30–45 sekund max**. Nie 60. Nie 90.

**Schemat pacingu odpowiedzi**:

1. **0–3 s**: pauza, kontakt wzrokowy z pytającym
2. **3–10 s**: TL;DR — jedno zdanie odpowiedzi
3. **10–35 s**: rozwinięcie — 2–3 konkrety
4. **35–40 s**: zamknięcie — „chętnie rozwinę po pitch'u jeśli interesuje"

Jeśli pytanie wymaga dłuższej odpowiedzi — odpowiedz najważniejszą część w 30 s
i zaproponuj kontynuację po prezentacji. **Nigdy nie przekraczaj 45 s**, bo
komisja nie zdąży zadać kolejnego pytania, a krótkich pytań i odpowiedzi jest
więcej, więc wyglądasz lepiej.

**Tonowanie odpowiedzi w wersji 30 s**: bierz tylko TL;DR + 1–2 zdania z rozwinięcia.
Reszta rozwinięcia (oznaczona poniżej dla każdego pytania) to materiał na ewentualne
follow-up albo „jeśli komisja drąży".

---

## Sekcja 1 — Innowacyjność

### Q1.1: Czym wasze rozwiązanie naprawdę różni się od Riipen?

**TL;DR**: Riipen to dystrybutor projektów — my to inteligentna warstwa nad projektami,
zlokalizowana na PL i z curriculum loop dla uczelni.

**Rozwinięcie**:

> Riipen jest świetnym benchmarkiem — dowiódł, że model działa i robi 25–50 mln dolarów
> rocznie. Trzy konkretne różnice. Po pierwsze, Riipen jest passive marketplace —
> uczelnia musi wybrać projekt z listy. My matchujemy projekt do studenta przez AI
> na podstawie jego sylabusa i luki kompetencyjnej. Drugie — Riipen nie ma sprzężenia
> zwrotnego do dziekanatu. My budujemy faculty panel z heatmapą, który mówi
> wykładowcom co naprawdę aktualizować w sylabusie. Trzecie — Riipen jest po angielsku,
> integruje się z kanadyjskim systemem akademickim. My jesteśmy native PL, integrujemy
> dane.gov.pl, BDL GUS, polski rynek pracy w PLN.

**Red flag**: nie mów „my robimy wszystko co Riipen plus więcej". To brzmi jak naiwność.
Powiedz „uczymy się od Riipen, ale zaczynamy od innego problemu".

---

### Q1.2: Czy AI nie jest hype'em? Co jeśli model jutro będzie 10× tańszy/lepszy?

**TL;DR**: Nasz moat to nie model AI — to dane (rynek, sylabusy, projekty) i sieć
(uczelnie + firmy). Model AI jest commodity, ale dostęp do polskiego pipeline'u nie jest.

**Rozwinięcie**:

> AI w naszej architekturze jest narzędziem, nie produktem. Jeśli jutro Claude czy GPT
> stanie się 10× tańszy, to my zarabiamy więcej. Jeśli ktoś wypuści lepszy model,
> przepiamy się — używamy Vercel AI SDK właśnie po to, żeby model był wymienny.
> Nasza wartość siedzi gdzie indziej: w danych rynku pracy w PL, w katalogu
> kuratorowanych projektów, w relacjach z 5–30 uczelniami i 50–100 firmami partnerskimi.
> To buduje się latami, nie da się tego zreplikować nawet z lepszym modelem.

**Red flag**: nie pchaj się w defensywę „bo my mamy lepszy prompt". To słabe.

---

### Q1.3 [AKADEMIK]: Jak weryfikujecie autentyczność pracy studenta — czy nie jest to po prostu LLM-cheat?

**TL;DR**: Trzy linie obrony — commit history check, rubric wymaga artefaktów których
LLM nie produkuje (decisions, kompromisy), manual override przez wykładowcę dla L3+.

**Rozwinięcie**:

> Doskonałe pytanie i to jest dla nas priorytet. Nie publikujemy nigdy „rozwiązania
> wzorcowego" — co odróżnia nas od typowego e-learningu. Każdy projekt na poziomie
> L1–L2 wymaga submission'u z linkiem do repo z prawdziwą historią commitów —
> AI sprawdza, czy to wygląda na pracę rozłożoną w czasie czy 5 commitów w 10 minut.
> Rubric wymaga README z wyborami i kompromisami — czego LLM bez monitora nie robi
> dobrze. Dla poziomów L3+ z firmami partnerskimi mamy manual override przez
> wykładowcę-opiekuna. Trzy warstwy nie są bulletproof, ale podnoszą koszt cheatu
> powyżej kosztu szczerej pracy.

**Red flag**: nie mów „AI wykrywa AI" — to magic-thinking, akademicy wyłapią.

---

## Sekcja 2 — Potencjał rynkowy

### Q2.1 [VC]: Skąd liczba SOM?

**TL;DR**: 380–420 wydziałów STEM × ~50k średnie ACV = **~20 mln zł SAM**. Realny SOM
24 mc: 30% capture = ~6 mln zł ARR. Y1 cel 345k = ~6% SOM. To bottom-up na danych
GUS z czerwca 2025 + Perspektywy.

**Rozwinięcie**:

> Bottom-up, oparte o raport sygnalny GUS z czerwca 2025. Polska ma milion dwieście
> osiemdziesiąt tysięcy studentów, z czego dwieście osiemdziesiąt tysięcy na
> kierunkach STEM. Wydziałów STEM mamy między trzysta osiemdziesiąt a czterysta
> dwadzieścia. Pricing per wydział to średnio pięćdziesiąt tysięcy ACV — to daje
> SAM dwadzieścia milionów. Realny SOM w 24 miesiące przy konserwatywnym 30%
> capture to sześć milionów. Y1 cel trzysta czterdzieści pięć tysięcy to sześć
> procent SOM — wykonalne przy 3–5 wydziałach pilotażu.

**Red flag**: nie cytuj 271 mld dolarów europejskiego rynku jako „nasz rynek".
VC patrzą na takie liczby z grymasem.

---

### Q2.2: Polska to mały rynek. Czy planujecie ekspansję?

**TL;DR**: Tak — CEE od 2028, EU od 2029. Ale dowodzimy najpierw model na PL przed
skalą.

**Rozwinięcie**:

> CEE to 170 milionów obywateli i 4 miliony studentów — Czechy, Słowacja, Węgry,
> Rumunia mają identyczny problem co PL: słabe sprzężenie uczelnia–rynek pracy.
> Architektura jest multilingual ready od dnia pierwszego. Plan ekspansji uruchamia
> się w 2028, gdy mamy 30 uczelni w PL i ARR rzędu 5–10 mln. Wtedy seed umożliwia
> wejście CEE przez network EIT Digital — Anthropic Claude rozumie polski, czeski,
> węgierski wystarczająco. EU od 2029 — Horizon Europe granty, KE jako partner.

**Red flag**: nie obiecuj ekspansji „od zera" — VC wie, że premature scaling to
death of startups.

---

### Q2.3 [AKADEMIK]: Czy model dla uczelni publicznych i prywatnych będzie taki sam?

**TL;DR**: Cena ta sama, mechanizm sprzedaży inny — publiczne idą przez przetargi,
prywatne przez direct sales.

**Rozwinięcie**:

> Cena per-student jest ta sama, bo wartość jest ta sama. Ale go-to-market różni się
> diametralnie. Uczelnie publiczne kupują przez Prawo Zamówień Publicznych — to długi
> cykl, ale duża wolumenowo. Uczelnie prywatne, jak WSB Merito, Vistula, Łazarski,
> kupują direct — krótki cykl, niższa średnia, ale szybkie ARR. Pierwszy pilot
> celujemy z prywatną właśnie dla szybkości, a publiczne dochodzą w fazie 2 z
> partnerstwem strategicznym (np. konsorcjum kilku uczelni przez fundacje).

---

## Sekcja 3 — Wykonalność techniczna

### Q3.1: Co konkretnie macie zbudowane dziś?

**TL;DR**: Działające MVP — 9 features, 11k linii kodu, 26 plików testów, deploy na
Vercel + Postgres na Neon. Mogę pokazać live.

**Rozwinięcie**:

> Mogę otworzyć demo dosłownie teraz. Zarejestrowanie konta przez email lub Google,
> 3-stopniowy onboarding z AI parserem sylabusa, interaktywny Skill Map w React Flow,
> Gap Analysis z AI-generowanym uzasadnieniem „dlaczego ta kompetencja jest ważna",
> publiczny Competency Passport z eksportem PDF, faculty panel z heatmapą.
> Backend Next.js 15, Drizzle ORM, Postgres, autoryzacja Better Auth, AI przez
> Vercel AI SDK i Claude Sonnet 4.6. Repo open-source na GitHub. 26 plików testów
> jednostkowych i integracyjnych. Project catalog w fazie wdrożenia — 19-krokowy
> plan implementacyjny z atomowymi commitami i test-gate.

**Red flag**: nie mów „prawie skończone" jeśli coś jeszcze nie ma. Komisja zapyta
o szczegóły.

---

### Q3.2 [VC]: Ile kosztuje wam jedno wywołanie AI? Skalowalność cost-side?

**TL;DR**: ~5–15 groszy per matchmaker call (Haiku), ~30–60 groszy per review
(Sonnet). Przy 10k aktywnych studentów to ~3 PLN/student/miesiąc — gross margin > 90%.

**Rozwinięcie**:

> Trzy główne akcje AI: matching projektu (cheap), generowanie briefu (medium),
> review submission (heavier). Używamy Claude Haiku dla matchmakera — 5 do 15 groszy
> per call. Sonnet dla briefu i review — 30 do 60 groszy. Przy 10 tysiącach
> aktywnych studentów miesięcznie to średnio 3 złote per student per miesiąc na AI cost.
> Studencki przychód idzie przez uczelnię — 30 PLN per student per rok plus tier
> firm. Gross margin powyżej 90% nawet przy konserwatywnych założeniach. Cache'ujemy
> wyniki matchmakera nightly, żeby nie wywoływać per pageview.

**Red flag**: nie mów „AI cost is negligible" — to brzmi naiwnie. Pokaż liczby.

---

### Q3.3 [AKADEMIK]: Jak chronicie dane studentów (RODO)?

**TL;DR**: Better Auth z hashowanymi hasłami, Postgres na Neon (EU region), brak
sprzedaży danych, opt-in dla każdej kategorii sharowania.

**Rozwinięcie**:

> Architektura RODO-first. Hasła hashowane przez Better Auth. Baza w europejskim
> regionie Neon. Sylabus i kompetencje studenta są jego własnością — w Passport może
> on udostępnić publicznie, prywatnie z linkiem, lub tylko zapisać. Faculty panel
> nigdy nie pokazuje imion ani emaili — tylko zagregowane statystyki, z minimum
> 3 studentów per agregacja jako próg anonimizacji. Firmy partnerskie podpisują DPA
> i mają dostęp tylko do tych studentów, którzy aplikowali do ich projektu.
> Każdy export jest auditowany.

---

## Sekcja 4 — Model biznesowy

### Q4.1 [VC]: Jaki jest sales cycle przy uczelni?

**TL;DR**: 6–9 miesięcy dla prywatnej, 9–18 miesięcy dla publicznej (przetarg).
Pierwsze umowy budujemy przez warm intros + sponsoring konkursów.

**Rozwinięcie**:

> To jest największe ryzyko operacyjne. Uczelnie publiczne to 12 do 18 miesięcy
> przez Prawo Zamówień Publicznych. Uczelnie prywatne to 6 do 9 miesięcy.
> Strategia akcelerująca: warm intros od dziekanów-advisorów, sponsoring konkursów
> studenckich, pilotaże freemium na pierwszy semestr. Pierwsze 5 uczelni to ścieżka
> relacyjna — nie skalowalna, ale konieczna do udowodnienia ROI. Od 5 do 30 uczelni
> przechodzimy w sales motion z dedykowanym Head of Partnerships.

---

### Q4.2: Czy student jest waszym klientem?

**TL;DR**: Nie. Student jest userem (free), uczelnia i firma to klient (paying).

**Rozwinięcie**:

> Student korzysta za darmo, bo to nasza akwizycja i dystrybucja Passport jako CV.
> Płaci uczelnia przez B2B SaaS — ona dostaje insighty, których normalnie nie ma.
> Płacą firmy przez tier system — dostają talent pipeline. Student byłby trzecim
> klientem, gdybyśmy szli w model B2C jak Riipen Level UP z stipendium, ale
> świadomie tego nie robimy w MVP — to scope creep i niska jakość przychodu.

---

### Q4.3 [AKADEMIK + VC]: Za co konkretnie uczelnia płaci 30–50 tysięcy rocznie?

**TL;DR**: Pięć rzeczy. Auto-raport PKA do akredytacji, real-time curriculum analytics,
wyróżnik rekrutacyjny, redukcja dropoutu, leverage funduszy KPO. Każdy z nich
samodzielnie uzasadnia kontrakt.

**Rozwinięcie (do 35 s)**:

> Pięć konkretnych wartości. Pierwsze i najmocniejsze: **automatyczny raport do oceny
> programowej PKA** — dane employability, heatmapa kompetencji, statystyki portfolio
> studentów w jednym kliknięciu. Cztery godziny pracy biura jakości stają się pięcioma
> minutami. Drugie: **real-time curriculum analytics** — dziekan widzi, czego naprawdę
> brakuje w sylabusie względem rynku pracy, w czasie rzeczywistym. Trzecie: **wyróżnik
> rekrutacyjny** — uczelnia z weryfikowalnym Competency Passport ma argument
> w walce o studenta, zwłaszcza przy 54 uczelniach w likwidacji. Czwarte: **redukcja
> dropoutu** — studenci, którzy widzą sens nauki, rezygnują rzadziej. Piąte:
> implementację można sfinansować z **KPO/FERS** — cost neutral dla uczelni publicznej.

**Red flag**: nie zaczynaj od "platforma" albo "narzędzie". Komisja akademicka kupuje
**outcome dla swojej pracy** (raport PKA, retencja), nie technologię.

---

### Q4.3 [VC]: Co jeśli uczelnie nie kupią?

**TL;DR**: Plan B — direct B2B do firm jako talent sourcing platform, by-passing
uczelnie. Student pozostaje free, firma płaci za pipeline.

**Rozwinięcie**:

> Mamy plan B. Jeśli sales B2B do uczelni okaże się za wolne, przestawiamy się na
> direct-to-employer model. Studenci dalej są na platformie za darmo — atrakcja
> to portfolio. Firmy płacą za dostęp do talent pipeline'u — pre-vetted via
> verified receipts. To upraszcza sales cycle z 9 miesięcy do 6 tygodni. Tracimy
> faculty panel jako differentiator, ale zyskujemy szybszy revenue. Decyzję
> o zmianie modelu albo kontynuacji obecnej ścieżki podejmujemy po 12 miesiącach
> na podstawie traction w obu kanałach.

**Red flag**: nie zaprzeczaj możliwości zmiany modelu — VC chce wiedzieć, że masz plan B.

---

## Sekcja 5 — Zespół

### Q5.1: Czemu solo-founder? Gdzie są co-foundery?

**TL;DR**: MVP wymagało execution, nie negocjacji. Pierwszy hire post pre-seed to
co-founder-grade Head of Partnerships.

**Rozwinięcie**:

> Solo-founder to świadoma decyzja na fazę pre-MVP. Potrzebowałem dowieść, że da się
> to zbudować, zanim sprzedaję wizję komuś innemu. Teraz mam działający produkt
> i roadmap rozplanowany — to jest moment, w którym pierwszy partner ma sens.
> Pierwszy hire post pre-seed to Head of Partnerships z equity stake — to faktyczny
> co-founder, nie kwartalny pracownik. Nie udajemy, że jestem mistrzem od wszystkiego.

**Red flag**: nie tłumacz się — solo-founder na MVP jest ok, byle plan na partnera
był jasny.

---

### Q5.2: Jakie macie luki kompetencyjne?

**TL;DR**: B2B sales (zwłaszcza enterprise/edukacja), customer success na skalę,
finance/CFO. Plan: hire + advisors.

**Rozwinięcie**:

> Trzy znane luki. Pierwsza — sprzedaż B2B do uczelni i firm na poziomie kontraktów
> 200k+ ACV. Plan: Head of Partnerships z 5+ lat doświadczenia w EdTech sprzedaży.
> Druga — customer success przy skali kilkudziesięciu uczelni — to operations,
> nie engineering. Plan: post-seed hire. Trzecia — finance/CFO na model przejść
> kontraktów publicznych. Plan: fractional CFO + advisor z doświadczeniem grants UE.
> Świadomość luk to nie minus — to dojrzałość operacyjna.

---

## Sekcja 6 — Skalowalność

### Q6.1: Jak skaluje się jakość projektów przy wzroście liczby?

**TL;DR**: Hybrid moderacja — open-data ingester automatyczny, partner submissions
manual review, peer review w fazie B.

**Rozwinięcie**:

> W fazie A — 20 do 100 projektów — kuracja jest manualna przez foundera. To nie
> skaluje się dobrze, ale daje kontrolę jakości w MVP. W fazie B — 100 do 500 —
> wprowadzamy ingester z dane.gov.pl, GitHub OSS i automatyczne propozycje briefów
> AI. Manual zostaje quality gate na koniec. W fazie C — 500+ — peer review:
> wykładowcy z partnerskich uczelni mogą submitować i moderować nawzajem.
> Network effect: im więcej uczelni, tym więcej dobrego content'u.

---

### Q6.2 [VC]: Jaki jest path do exit?

**TL;DR**: Acquisition target dla globalnych EdTech (Coursera, Pearson, Stepstone)
albo HR-tech (LinkedIn, Workday). 5–7 lat horyzont.

**Rozwinięcie**:

> Trzy ścieżki. Pierwsza — acquisition przez globalny EdTech (Coursera, edX, Pearson)
> jako CEE entry point. Drugą jest acquisition przez HR-tech (LinkedIn, Workday,
> Stepstone) — Verified Receipts są wartościową bazą danych dla rekrutacji.
> Trzecia — Series A i continued growth w region z exit IPO w 7+ lat. Najprawdopodobniej
> druga, bo HR-tech aktywnie konsoliduje skill verification market.
> Comparable — Riipen jest w pre-Series B, my chcemy ich przeskoczyć w PL/CEE.

**Red flag**: nie mów „IPO w 3 lata" — niewiarygodne.

---

## Sekcja 7 — Pytania nieprzewidywalne (przygotuj się)

### Q7.1: Co was różni od dlastudenta.pl czy biura karier uczelni?

**Odpowiedź**: Tamto jest agregator ofert pracy/staży. My to platforma do produkcji
weryfikowalnych portfolio _przed_ aplikacją.

### Q7.2: Czy można to zrobić bez AI?

**Odpowiedź**: Nie skalowalnie. AI matching i AI review pozwalają na 1 osobę
operacyjną na 10 000 studentów. Ręczne to 1:50.

### Q7.3 [AKADEMIK]: Co z ECTS / akredytacją?

**Odpowiedź**: Faza 2. W MVP projekty są opcjonalne, dodatkowe. Faza 2 — partner
uczelnia może umownie nadawać 1–3 ECTS za ukończenie projektu L3+. To wymaga zmiany
regulaminu studiów — proces 6–12 mc per uczelnia.

### Q7.4: Co jeśli OpenAI / Anthropic wypuszczą konkurencyjny produkt?

**Odpowiedź**: Foundation model companies historycznie nie schodzą w pionowe
aplikacje (zob. Anthropic strategia — sprzedają tylko API). Nasz moat to dane
i sieć, nie model.

### Q7.5: Jak liczycie ROI dla uczelni?

**Odpowiedź**: 3 metryki — wzrost employability score absolwentów, redukcja czasu
do pierwszego zatrudnienia z N miesięcy do M, wskaźnik aktualizacji sylabusu na
podstawie analytics. Wszystkie 3 mierzalne, wszystkie 3 wpisują się w KPI rektora.

---

## 5 zasad odpowiadania (utrzymuj w głowie)

1. **Najpierw TL;DR, potem rozwinięcie**. Komisja często przerywa po 1 zdaniu jak
   im wystarczy.
2. **Nigdy nie kłam o liczbach**. „Nie wiem dokładnie, ale rząd wielkości to X"
   jest 100× lepsze niż wymyślona dokładność.
3. **Jeśli pytanie jest słabe / agresywne** — odpowiedz spokojnie i mostkuj do
   swojej narracji: „To pytanie zakłada X. Rzeczywistość jest taka, że…"
4. **Akademik vs VC** — czytaj kto pyta. Akademik chce społecznego impactu, VC
   chce return.
5. **Last 30 seconds matter most** — Q&A często kończy się punktem, który zostaje
   w głowie. Zachowaj na koniec mocną metaforę („SkillBridge to most między salą
   wykładową a stanowiskiem pracy").
