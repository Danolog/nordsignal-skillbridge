# Pre-brief 1E.0: sesje nauki — benchmark MIT/Harvard/Stanford + dowody naukowe

**Status:** research przed spikiem 1E.0 (pytanie Darka, 2026-07-11). Wejście do Fazy A
spike'a (`docs/curation/research-kognitywistyka-1e0.md` — powstanie w spiku) oraz do
sekcji D1 (atom postępu i granulacja) i D6 (model pedagogiczny) ADR-014.

**Metoda:** 3 niezależnych agentów researchu webowego, wymóg źródeł pierwotnych + URL,
ranga dowodu per ustalenie (SILNY / MIESZANY / SŁABY-MIT). Raporty źródłowe wklejone
niżej w całości (sekcje A–C), synteza i rekomendacja na początku.

---

## Synteza i rekomendacja (Oliver, 2026-07-11)

### Weryfikacja tezy „25 minut koncentracji"

Liczba 25 minut **nie ma poparcia w literaturze pierwotnej** — pochodzi z techniki
Pomodoro Francesca Cirillo (osobiste eksperymenty z minutnikiem, nie badanie).
Pokrewny mit „uwaga spada po 10–15 min" został obalony w przeglądzie krytycznym
(Wilson & Korn 2007). Nauka nie wskazuje żadnej jednej „optymalnej liczby minut
koncentracji" — zamiast tego wspiera (rangi SILNE):

1. **Krótkie jednostki treści**: mediana zaangażowania w wideo edukacyjne ≈6 min
   niezależnie od długości klipu (Guo/Kim/Rubin 2014, 6,9 mln sesji edX).
2. **Ćwiczenie natychmiast po każdej jednostce**: odsetek podejść do zadania spada
   z 56% po najkrótszych wideo do 31% po najdłuższych (tamże).
3. **Rozłożenie nauki w czasie (spacing)** zamiast maratonów — najsilniejszy wniosek
   całej literatury (Cepeda 2006: 317 eksperymentów; Dunlosky 2013: technika
   „wysokiej użyteczności" obok practice testing).
4. **Przerwy** mają silny dowód dla redukcji zmęczenia (Albulescu 2022, d≈0,35),
   słabszy dla wydajności.
5. **Nowicjusz męczy się szybciej niż zaawansowany** (cognitive load) — długość
   bloku powinna zależeć od poziomu, nie być sztywna.

### Jak robią to uczelnie wzorcowe (wersje ONLINE)

| Uczelnia | Jednostka konsumpcji | Ćwiczenia | Rytm |
|---|---|---|---|
| MIT (MITx 6.00.1x, 6.431x, 6.002x) | segmenty wideo **5–10 min** (cel <6), wykład = 8–10 klipów | finger exercises **po każdym klipie**, nielimitowane próby, natychmiastowy feedback, bez deadline'u | tydzień: 2 tematy + 1 problem set (2–4 h) |
| Harvard (CS50x) | wykład ~2 h, ale **chapteryzowany na segmenty ~5–12 min** + 54 shorts (1 koncept = 1 wideo, ~4–20 min) | problem set tygodniowy ze scaffoldingiem: spec+demo+pseudokod+walkthrough+hinty+lista testów („nigdy pusta kartka") | tydzień: wykład → section → shorts → pset (10–20 h) |
| Stanford (Code in Place) | wykłady cięte fizycznie na **10-minutowe kawałki** | 4 assignmenty + creative extensions; sekcja 40–50 min w grupie 10 os. z section leaderem | 6 tygodni, 3 publikacje wideo/tydz., 1 sekcja/tydz. |

Wzorce przekrojowe wszystkich trzech:
- **Mała jednostka konsumpcji, większa jednostka rytmu**: klip 5–10 min + ćwiczenie
  → sesja/temat → tydzień z jednym większym deliverable (problem set / projekt).
- **Mikro-ćwiczenia niskostawkowe i nieblokujące** (nielimitowane próby, feedback
  natychmiast); duże stawki tylko na tygodniowym problem secie.
- **„Nigdy pusta kartka"** — scaffolding przed pierwszą linijką kodu.
- **Pomoc dozowana**: CS50 Duck (AI, 24/7) z limitem 10 „serduszek" (regeneracja
  1/3 min), guardrails „prowadź, nie zdradzaj" — wzorzec 1:1 dla naszego
  „utknąłem" z limitami i ledgerem.
- **Człowiek/sekcja jako mechanizm retencji**: Code in Place z sekcjami 1:10 osiąga
  56–70% ukończeń vs 2–5,5% klasycznych MOOC-ów.
- **Jawny kontrakt czasowy** (CS50: „10–20 h/tydz"; Stanford: stały kalendarz).

### Rekomendacja dla SkillBridge (do ratyfikacji w D1/D6 ADR-014)

1. **Parametr Darka „sesja 15–30 min" zostaje** — jest zgodny z dowodami, o ile
   sesja jest KOMPOZYTEM mniejszych atomów, nie monolitem. 25 min może być miękkim
   domyślnym celem sesji, ale nie komunikujemy go jako „naukowo optymalnego czasu
   koncentracji" (brak takiego dowodu).
2. **Właściwa jednostka projektowa to atom, nie sesja**: teoria ~5–8 min
   (~300–600 słów, ekwiwalent progu ≤6 min z Guo 2014) + ćwiczenie retrieval
   1–5 pytań **bezpośrednio po teorii** (nie na końcu sesji). Sesja 15–30 min
   = 2–4 atomy + checkpoint.
3. **Mikro-ćwiczenia niskostawkowe**: nielimitowane próby, natychmiastowy feedback
   deterministyczny (0 LLM), bez kar — wzorzec finger exercises. Stawka rośnie
   dopiero na egzaminie modułu (1E.3) i projekcie-capstone.
4. **Spacing przez rytm 1.18**: najsilniejszy dowód literatury konsumujemy nie
   długością sesji, lecz mechaniką powrotów — krótkie sesje w kolejnych dniach
   (streak) > jedna długa; haki pod FSRS (1E.4) zgodne z regułą Cepeda 2008
   (odstęp ≈10–20% horyzontu zapamiętania).
5. **Adaptacja do poziomu**: persona „literalne zero" męczy się najszybciej
   (cognitive load) — na początku ścieżki atomy krótsze i gęstsze checkpointy;
   parametry rozmiaru kroku strojone, walidowane instrumentacją D11 (drop-off
   per pozycja), nie opinią.
6. **Przerwy**: po sesji sugerowana przerwa (komunikat „wróć jutro" wspiera
   spacing); nie budujemy twierdzeń o „konsolidacji w mikroprzerwach" — dowód
   dotyczy uczenia motorycznego i jest kwestionowany (PNAS 2025).

Ranga dowodu w skrócie: atom ≤6–10 min (SILNY, behawioralny — zaangażowanie),
ćwiczenie po każdym atomie (SILNY behawioralny + testing effect SILNY),
spacing (SILNY, metaanalizy), sesja dokładnie 25 min (BRAK — heurystyka),
microlearning jako etykieta (MIESZANY — młode pole, ryzyko marketingu).

---

## Sekcja A — raport: dowody naukowe o długości sesji (agent 1)

# RAPORT: Optymalna długość sesji nauki — co mówią badania

Zakres: kognitywistyka, neurobiologia, nauka o uczeniu się. Nacisk na weryfikację tezy "~25 minut koncentracji" (Pomodoro). Kluczowe rozróżnienie w całym raporcie: **badania o utrzymaniu UWAGI ≠ badania o EFEKTYWNOŚCI UCZENIA SIĘ (retencji)**.

## 1. Teza "25 minut" / Pomodoro

- **Liczba "25 minut" NIE ma poparcia w literaturze pierwotnej jako empirycznie wyprowadzone optimum. — MIT / FOLK WISDOM —** Technika pochodzi od Francesca Cirillo (koniec lat 80.), który wybrał interwał na podstawie osobistego eksperymentowania z kuchennym minutnikiem w kształcie pomidora; nie było to badanie naukowe. Nie istnieje badanie pierwotne testujące i potwierdzające akurat 25 minut jako optimum koncentracji lub uczenia się. Popularne "uzasadnienia" (blogi, marketing) odwołują się post hoc do ogólnego przedziału 20–45 min uwagi, ale to racjonalizacja, nie źródło liczby. Sam esej Cirillo: [arxiv.org/pdf/1402.4320](https://arxiv.org/pdf/1402.4320) (opis techniki produktywności, nie eksperyment). Krytyczne omówienia: [Brown Daily Herald fact-check](https://www.browndailyherald.com/article/2026/03/fact-check-is-the-pomodoro-technique-actually-effective-for-studying), [Founder Foundry](https://www.founderfoundry.com/article/pomodoro-myths-and-does-it-actually-work).

- **Regularne, krótkie przerwy realnie redukują zmęczenie i podnoszą wigor (dobrostan). — SILNY (metaanaliza) —** Albulescu i in. (2022), "Give me a break!", PLOS ONE: 22 próby, N=2335. Mikroprzerwy (≤10 min): wigor d=0,36 (95% CI [0,16; 0,55]); zmęczenie d=0,35 (95% CI [0,19; 0,50]), obie istotne. [journals.plos.org/plosone/…0272460](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0272460)

- **Wpływ mikroprzerw na WYDAJNOŚĆ jest słaby i niejednoznaczny; dłuższe przerwy potrzebne po zadaniach mocno wyczerpujących. — MIESZANY —** Ta sama metaanaliza: ogólny efekt na wydajność d=0,16, p=0,116 (nieistotny). Zależny od zadania: zadania kreatywne d=0,38, klerykalne d=0,56, ale zadania poznawcze d=−0,09 (nieistotne). Meta-regresja: dłuższa przerwa = większy efekt (b=0,07, p=0,006); autorzy wprost: regeneracja po silnie wyczerpujących zadaniach może wymagać >10 min. **Wniosek: przerwy pomagają samopoczuciu z mocnym dowodem; korzyść dla wydajności zależy od typu zadania i bywa mała.**

## 2. Spacing effect / distributed practice

- **Rozłożenie nauki w czasie (spacing) daje istotnie lepszą trwałą retencję niż masowanie ("wkuwanie"). — SILNY (metaanaliza, setki eksperymentów) —** Cepeda, Pashler, Vul, Wixted, Rohrer (2006), Psychological Bulletin: 839 pomiarów w 317 eksperymentach, 184 artykuły; efekt rozłożonej praktyki solidny i szeroki. [pubmed.ncbi.nlm.nih.gov/16719566](https://pubmed.ncbi.nlm.nih.gov/16719566/) · [PDF](https://augmentingcognition.com/assets/Cepeda2006.pdf)

- **Distributed practice = jedna z DWÓCH technik o "wysokiej użyteczności" (obok practice testing); działa w różnym wieku, dla różnych materiałów. — SILNY —** Dunlosky, Rawson, Marsh, Nathan, Willingham (2013), "Improving Students' Learning With Effective Learning Techniques", Psychological Science in the Public Interest. [journals.sagepub.com/…1529100612453266](https://journals.sagepub.com/doi/abs/10.1177/1529100612453266) · [pełny tekst PDF](https://stafforini.com/works/dunlosky-2013-improving-students-learning/)

- **Optymalny ODSTĘP między sesjami zależy od tego, jak długo materiał ma być pamiętany (nie ma jednej liczby minut). — SILNY —** Cepeda i in. (2008), "Spacing Effects in Learning: A Temporal Ridgeline of Optimal Retention", Psychological Science (N>1350): optymalna luka to ok. 10–20% docelowego czasu przechowania — ~20% przy teście za tygodnie, spadając do ~5% przy teście za rok. [files.eric.ed.gov/fulltext/ED505660.pdf](https://files.eric.ed.gov/fulltext/ED505660.pdf)

- **Uwaga interpretacyjna: te metaanalizy mówią o ROZKŁADZIE sesji (dni/tygodnie), NIE o optymalnej długości pojedynczej sesji w minutach. — kontekst —** Dają mocny argument za "krótszymi, częstszymi, rozłożonymi" sesjami zamiast maratonów, ale nie definiują liczby minut jednej sesji.

## 3. Uwaga podczas wykładów — mit "10–15 minut"

- **Teza "uwaga spada po 10–15 min" NIE ma solidnego poparcia empirycznego; to zniekształcona folk wisdom. — SŁABY / MIT (obalone w przeglądzie krytycznym) —** Wilson & Korn (2007), "Attention During Lectures: Beyond Ten Minutes", Teaching of Psychology: przegląd notatek studentów, obserwacji, samoopisów i miar fizjologicznych — dowody na spadek po 10–15 min są "płytkie i nieprecyzyjne", brak spójnego dowodu na stały punkt załamania; ogromna zmienność indywidualna i zależność od zadania. [journals.sagepub.com/doi/10.1080/00986280701291291](https://journals.sagepub.com/doi/10.1080/00986280701291291) · [ERIC EJ772424](https://eric.ed.gov/?id=EJ772424)

- **Uwaga podczas nauki fluktuuje (mind-wandering, spadki vigilance), ale nie w formie jednego uniwersalnego progu minutowego. — MIESZANY —** Nowsze badania nad błądzeniem myśli i czujnością pokazują narastanie odpływów uwagi w czasie zadania, jednak momenty i tempo są silnie zależne od osoby, materiału i pory — nie potwierdzają sztywnego "10/15/25 min". [Faculty Focus omówienie](https://www.facultyfocus.com/articles/course-design-ideas/student-attention-spans/)

## 4. Microlearning (jednostki 5–15 min)

- **Krótkie jednostki nauki wiążą się z lepszą retencją i wynikami — ale baza dowodowa jest nierówna, heterogeniczna i częściowo obciążona. — MIESZANY (z sygnałami pozytywnymi) —** Metaanaliza w szkolnictwie wyższym (42 badania, 15 673 uczestników) raportuje istotne efekty: retencja OR=1,87 (95% CI [1,45; 2,41]), wyniki SMD=0,74 (95% CI [0,58; 0,90]). Liczby są duże, ale to młode, heterogeniczne pole (różne definicje "micro", ryzyko efektu nowości i publikacyjnego). [MATHEMA — meta-analiza](https://publikasi.teknokrat.ac.id/index.php/jurnalmathema/article/view/517) · [przegląd systematyczny, ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2405844024174440)

- **W edukacji medycznej microlearning poprawia nabywanie wiedzy, umiejętności i zaangażowanie. — MIESZANY —** Przeglądy i badania w naukach o zdrowiu wskazują korzyści (dostępność, zwięzłość, dostęp asynchroniczny), lecz projekty często bez randomizacji i z krótkim horyzontem. [Frontiers in Medicine 2025](https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2025.1639475/full) · [JMIR Medical Education 2026](https://mededu.jmir.org/2026/1/e87980) **Uwaga: znaczna część "dowodów" na microlearning to materiały marketingowe branży e-learning — należy je oddzielać od recenzowanych badań.**

## 5. Wideo edukacyjne — próg długości

- **Zaangażowanie w wideo edukacyjne gwałtownie spada z długością; mediana czasu oglądania to ~6 minut niezależnie od długości klipu. Rekomendacja: klipy ≤6 min. — SILNY (bardzo duża próba behawioralna) —** Guo, Kim, Rubin (2014), "How Video Production Affects Student Engagement", ACM Learning@Scale: 6,9 mln sesji oglądania na edX. Mediana zaangażowania ≈6 min i nie rośnie dla dłuższych wideo; przy wideo 9–12 min oglądano medianie ok. połowy, a przy >12 min zaangażowanie spadało poniżej ~20% długości. [learningatscale.acm.org/…paper_philip_guo2.pdf](https://learningatscale.acm.org/las2014/talks/paper_philip_guo2.pdf)

- **Ważne zastrzeżenie: to metryka ZAANGAŻOWANIA (czas oglądania), nie dowód lepszego UCZENIA SIĘ. — kontekst —** Guo mierzył, jak długo studenci oglądają i czy próbują rozwiązać zadanie po wideo — nie retencję długoterminową. Silny argument za krótkimi jednostkami treści online, ale o zaangażowaniu, nie o nauce per se.

## 6. Nowicjusz vs ekspert, przerwy i konsolidacja pamięci

- **Nowicjusze wyczerpują zasoby poznawcze szybciej niż eksperci (wyższe obciążenie pamięci roboczej). — SILNY (teoria cognitive load, szeroko replikowana) —** Teoria obciążenia poznawczego (Sweller i in.): brak schematów u nowicjusza → wyższy load elementów interaktywnych → szybsze zmęczenie i przeciążenie; ekspert dzięki schematom (chunking) utrzymuje wysiłek dłużej. Implikacja: optymalna długość skupionej pracy jest KRÓTSZA dla nowicjusza i rośnie z ekspertyzą — nie jest stałą liczbą.

- **Krótkie przerwy "wakeful rest" wspomagają szybką konsolidację uczenia MOTORYCZNEGO ("micro-offline gains"). — SILNY dla uczenia motorycznego, ale KWESTIONOWANY interpretacyjnie —** Bönstrup i in. (2019, Current Biology) oraz Buch, Claudino, Quentin, Bönstrup, Cohen (2021, Cell Reports, NIH). [Buch i in. 2021, PMC8259719](https://pmc.ncbi.nlm.nih.gov/articles/PMC8259719/) · [Bönstrup i in. 2019](https://www.cell.com/current-biology/fulltext/S0960-9822(19)30219-2)

- **Przenośność "micro-offline gains" na uczenie DEKLARATYWNE (fakty, pojęcia) jest NIEUSTALONA, a sama interpretacja efektu jest podważana. — SŁABY / SPORNY (dla nauki deklaratywnej) —** Nowsze prace (2024–2025) argumentują, że mikro-przyrosty offline mogą być artefaktem pomiaru/zmęczenia. [PNAS 2025](https://www.pnas.org/doi/10.1073/pnas.2509233122) · [bioRxiv 2024](https://www.biorxiv.org/content/10.1101/2024.07.11.602795v1.full) **Nie należy używać tych badań jako dowodu na optymalną długość sesji nauki deklaratywnej online — to nadużycie ekstrapolacji.**

## Co z tego wynika dla długości sesji nauki online

1. **Nie ma "magicznej liczby" — a już na pewno nie 25 minut.** Interwał Pomodoro to heurystyka produktywności Cirillo, nie wynik badania (sekcja 1). Można go używać jako wygodnej struktury, ale nie należy go sprzedawać jako "naukowo optymalnego czasu koncentracji".
2. **Rozkładaj naukę zamiast masować — to najmocniejszy, najlepiej udokumentowany wniosek.** Spacing/distributed practice ma poparcie w metaanalizach setek eksperymentów (Cepeda 2006; Dunlosky 2013). Dla produktu edukacyjnego oznacza to projektowanie POWROTÓW do materiału w kolejnych dniach, nie jednej długiej sesji (sekcja 2).
3. **Odstępy między powtórkami skaluj do horyzontu zapamiętania (~10–20% czasu do "egzaminu"), nie do minut sesji.** Cepeda 2008 daje konkretną regułę projektowania harmonogramu powtórek/spaced repetition (sekcja 2).
4. **Trzymaj jednostki treści krótkie: wideo/moduł ≤6 min.** Najsilniejszy behawioralny dowód (Guo 2014, 6,9 mln sesji) — ale to optymalizacja ZAANGAŻOWANIA, nie dowód retencji (sekcja 5). Łącz z mechanizmem sprawdzającym naukę (practice testing).
5. **Wbuduj regularne przerwy — mają mocny dowód dla samopoczucia/wigoru, słabszy dla wydajności.** Albulescu 2022: mikroprzerwy ≤10 min istotnie redukują zmęczenie (d≈0,35), ale efekt na wydajność jest mały i zależny od zadania; po intensywnych zadaniach potrzeba >10 min (sekcja 1).
6. **Dostosuj długość skupionej pracy do poziomu użytkownika — nowicjusz krócej.** Z cognitive load wynika, że początkujący męczy się szybciej; sensowniejsze są krótsze bloki dla nowicjuszy i dłuższe dla zaawansowanych, zamiast jednego sztywnego interwału dla wszystkich (sekcja 6).
7. **Nie strasz użytkownika mitem "uwaga pada po 10–15 min".** Wilson & Korn (2007) obalili tę tezę; komunikacja produktu nie powinna się na niej opierać (sekcja 3).
8. **Ostrożnie z neuro-argumentami o "mikroprzerwach konsolidujących".** Dowód dotyczy uczenia motorycznego i jest obecnie kwestionowany (PNAS 2025); nie używaj go jako uzasadnienia długości sesji nauki pojęciowej/faktograficznej (sekcja 6).

**Nadrzędny wniosek metodologiczny:** literatura mocno wspiera "krótsze jednostki + rozłożenie w czasie + powtórki + przerwy", ale robi to na gruncie ZAANGAŻOWANIA i RETENCJI DŁUGOTERMINOWEJ, a nie jednej optymalnej liczby minut ciągłej koncentracji. Każdą deklarację typu "X minut to naukowo optymalny czas skupienia" należy traktować jako nieuprawnioną.

---

## Sekcja B — raport: MIT (agent 2)

# MIT — struktura sesji nauki w kursach online (MITx/edX): raport researchu

## 1. MITx 6.00.1x „Introduction to Computer Science and Programming Using Python" (edX)

**Źródło pierwotne — oficjalny sylabus kursu (PDF, autor: Eric Grimson, MIT):**

- Finger exercises są osadzone „within each lecture video sequence" (wewnątrz każdej sekwencji wideo wykładu) i stanowią **10% oceny końcowej** — https://courses.edx.org/asset-v1:MITx+6.00.1x+2T2016+type@asset+block/6001x_syllabus.pdf
- Pełny rozkład oceny: finger exercises **10%**, problem sets **40%**, quiz (midterm) **25%**, final **25%**; zaliczenie od **55%** (C) — tamże
- Finger exercises **nie mają deadline'u** („Finger exercises have no due date, but we encourage students to complete them as they view the lectures"); problem sets mają sztywne deadliny (23:30 UTC), najniższy wynik PS jest odrzucany — tamże
- Materiał wypuszczany rytmicznie o **14:00 UTC**; kurs = **14 wykładów**, każdy wykład rozbity na **4–10 podtematów** odpowiadających segmentom wideo w sekwencji edX — tamże

**Struktura tygodniowa i czas pracy (źródła wtórne — recenzje uczestników):**

- Kurs trwa **9 tygodni**; wg listingu edX z okresu recenzji: „6 lub więcej godzin tygodniowo" — https://startupnextdoor.com/course-review-6-00-1x-introduction-to-computer-science-and-programming-using-python/
- Tygodniowy rytm: **2 tematy (wykłady) na tydzień + 1 problem set** — sylabus wersji 2020: https://studylib.net/doc/25405988/asset-v1-mitx-6.00.1x-2t2020a-type@asset-block@6001x-syll...
- Problem sety zajmują **2–4 godziny każdy** — startupnextdoor j.w.
- Nowszy listing podaje **~15 h/tydz × 9 tygodni ≈ 120 h**; recenzent szacuje realnie **10–12 h/tydz** — https://sackofcrazy.com/mooc-review-introduction-to-computer-science-and-programming-using-python/ (rozbieżność wynika z różnych edycji listingu edX)
- Finger exercises = „mini-quizy przeplatane między segmentami wideo wykładu", **nielimitowane próby odpowiedzi** — startupnextdoor j.w.
- Gęstość ćwiczeń (spis społecznościowy per wykład): Lecture 1: **10 ćwiczeń**, Lecture 2: **7 (+12 pod-ćwiczeń)**, Lecture 4: **7 + 9 zadań kodowania** itd. — https://github.com/lcsm29/edx-mit-6.00.1x/blob/main/finger_exercises.md
- **Niepotwierdzone**: dokładna długość minutowa pojedynczych segmentów wideo 6.00.1x (kurs za loginem edX). Pośrednio: format „learning sequence" z segmentami **5–10 min** został „zapoczątkowany przez Grimsona i Lozano-Péreza" (twórców 6.00x/6.00.1x) — patrz sekcja 4.

## 2. Badanie Guo, Kim, Rubin 2014 „How Video Production Affects Student Engagement" (Learning@Scale)

URL pierwotny: https://up.csail.mit.edu/other-pubs/las2014-pguo-engagement.pdf

- Zbiór danych: **6,9 mln sesji oglądania wideo**, **862 wideo**, **127 839 studentów**, 4 kursy edX z jesieni 2012 (w tym 6.00x MIT — 141 wideo, 2 218 821 sesji)
- **Mediana czasu zaangażowania ≤ 6 minut niezależnie od całkowitej długości wideo** — kluczowa liczba badania
- Wideo dłuższe niż **9 minut**: studenci docierają średnio **poniżej połowy** materiału
- Najkrótsze wideo (**0–3 min**): najwyższe zaangażowanie; **75% sesji trwało ponad 3/4 długości wideo**
- Odsetek sesji zakończonych próbą rozwiązania zadania po wideo, wg 5 koszyków długości (od najkrótszych do najdłuższych): **56%, 48%, 43%, 41%, 31%**
- Rekomendacja nr 1: „Instructors should segment videos into short chunks, **ideally less than 6 minutes**"
- Produkcja nieformalna > studio: na wideo 6.00x (wykładowca przy biurku) studenci spędzali **~2× więcej czasu** przy wideo 6–12 min i **~3× więcej** przy >12 min niż na PH207x (studio TV)
- Tutoriale (wiedza proceduralna): oglądane średnio tylko **2–3 minuty niezależnie od długości**, częściej odtwarzane ponownie → projektować pod skimming i powroty
- Tempo mówienia: **48–254 słów/min (średnia 156)**; szybsze i entuzjastyczne mówienie koreluje z wyższym zaangażowaniem

## 3. MITx MicroMasters „Statistics and Data Science" — jednostka postępu

**6.431x „Probability" (Tsitsiklis):**

- Każdy wykład podzielony na **8–10 krótkich klipów wideo** przeplatanych pytaniami koncepcyjnymi; „It will be like doing mini-homework during class" — MIT News: https://news.mit.edu/2014/mitx-course-builds-a-systematic-approach-to-understanding-the-uncertain
- Przewodnik kursu: tygodniowo **2 h czystych klipów → realnie 4–5 h z ćwiczeniami**; „solve exercises right after each clip — do not defer this for later"; rozwiązania widoczne natychmiast po wysłaniu odpowiedzi; dodatkowo **3–4 h** „solved problems" + **~4 h** problem set — https://github.com/newking9088/MITx-6.431x-Probability---The-Science-of-Uncertainty-and-Data
- Jednostka postępu: **overview unitu → sekwencje (klip → ćwiczenie)× → unit summary → tygodniowy problem set → egzaminy** — tamże
- Listing kursu: **10–14 h/tydz** — wtórne

## 4. 6.002x — pierwszy kurs MITx i wzorzec „learning sequence" (Mitros et al., ISCAS 2013)

URL pierwotny: http://mitros.org/p/papers/iscas2013.pdf

- Zamiast wykładu: „learning sequences" — **segmenty wideo 5–10 minut przeplatane ćwiczeniami samooceny**
- Format „pioneered by Grimson and Lozano-Perez" (twórcy 6.00x/6.00.1x); pytania „deeply embedded", cel: metoda sokratejska
- Tygodniowo: **~2 h treści interaktywnych** + tutoriale + **1 problem set + 1 design lab**; kurs **16 tygodni**
- **Nieskończona liczba prób** + natychmiastowy feedback
- Obserwacja z forów: „students actually found shorter segments more engaging"
- Deklarowany nakład: **~10 h/tydz** — https://openlearning.mit.edu/news/first-course-offered-mitx-begins

## 5. MIT Open Learning / OCW — oficjalne wytyczne dot. chunkingu

- MIT Open Learning **nie publikuje liczbowych wytycznych** długości wideo w poradniku dla wykładowców — https://openlearning.mit.edu/share-your-teaching-world/develop-teach-massive-open-online-course
- Faktyczny standard liczbowy funkcjonuje przez badanie Guo/Kim/Rubin — próg **<6 minut** cytowany jako best practice m.in. przez SUNY OSCQR — https://oscqr.suny.edu/how-long-should-instructional-videos-be/
- Open Learning Library 6.036 (ML): **13 tygodni, ~12 h/tydz** — https://openlearninglibrary.mit.edu/courses/course-v1:MITx+6.036+1T2019/about

## Wzorce przekrojowe MIT

1. **Segment wideo: cel <6 min, praktyka 5–10 min.**
2. **Ćwiczenie bezpośrednio po KAŻDYM segmencie, nie po sesji** — odsetek podejść do zadania spada z 56% do 31% wraz z długością wideo.
3. **Mikro-ćwiczenia niskostawkowe i nieblokujące**: nielimitowane próby, natychmiastowy feedback, brak deadline'u (10% oceny) vs problem sety (40%, sztywne deadliny, 2–4 h).
4. **Jednostka postępu = trójpoziomowa hierarchia**: klip (5–10 min) + ćwiczenie → sekwencja/temat → tydzień (2 tematy + problem set); rytm tygodniowy, semi-synchroniczny.
5. **Budżet sesji tygodniowej ~6–15 h, czyste wideo ≤1/3.**
6. **Wykład vs tutorial**: materiał proceduralny konsumowany po 2–3 min z powrotami — projektowany pod skimming; wykłady pod ciągłe pierwsze obejrzenie.

**Luki (niepotwierdzone):** dokładne długości segmentów bieżącej edycji 6.00.1x; aktualna oficjalna wartość „hours per week" na edX; brak liczbowego style-guide'u MIT Open Learning.

---

## Sekcja C — raport: Harvard CS50 + Stanford Code in Place (agent 3)

# Raport: Struktura sesji nauki w kursach online Harvard CS50 i Stanford Code in Place

Metodologia: źródła pierwotne (cs50.harvard.edu, cs50.readthedocs.io, papers zespołów kursów — SIGCSE'21 Piech et al., SIGCSE 2024 Liu/Malan et al.), metadane oficjalnych nagrań YouTube CS50, prasa (Forbes, Stanford Engineering) tam, gdzie brak pierwotnych.

## Sekcja 1: HARVARD CS50 (CS50x)

### 1.1 Struktura tygodnia

- Kurs to 11 tygodni materiału + projekt finałowy; rekomendowany przepływ tygodnia: Wykład → Section (zalecane) → Shorts (zalecane) → Problem Set — https://cs50.harvard.edu/x/2025/
- Do certyfikatu: 10 problem setów + final project, każdy zaliczony na ≥70% — https://cs50.harvard.edu/x/syllabus/
- Jeden wykład tygodniowo; przykładowe długości: Lecture 0 (2025) — 1 h 58 min; Lecture 1 (2024) — 2 h 27 min — oficjalny kanał YouTube CS50
- Wykład JEST dzielony na rozdziały (chapters): Lecture 0 (2025) ma 20+ rozdziałów po ~1–12 min (np. „Binary" ~12,5 min, „Pseudocode" ~6 min) — https://video.cs50.io/2WtPyqwTLKM
- Sections: nagrane wcześniej, ~1 h (Section 1 2025 — 1:04:18) — https://cs50.harvard.edu/x/2025/faqs/
- Shorts: biblioteka 54 krótkich wideo (jeden koncept = jedno wideo), zmierzone długości ~3:33–20:25, typowo ~4–20 min — https://cs50.harvard.edu/x/2024/shorts/

### 1.2 Mechanika „nigdy pusta kartka"

- Struktura strony problemu (Mario „less comfortable", pset 1): „Problem to Solve" → „Demo" → „Advice" (gotowy pseudokod, strategia przyrostowa) → „Walkthrough" (wideo) → „Hints" → „How to Test" (przypadki brzegowe) → „How to Submit" — https://cs50.harvard.edu/x/2025/psets/1/mario/less/
- Warianty „less comfortable" / „more comfortable": „NIE dostajesz dodatkowych punktów za wersję more comfortable" — https://cs50.harvard.edu/x/2025/faqs/
- Distribution code (starter ZIP) w złożonych problemach (np. Filter, pset 4); w prostszych pseudokod w „Advice" — https://cs50.harvard.edu/x/2020/psets/4/filter/less/

### 1.3 CS50 Duck (cs50.ai)

Źródło: „Teaching CS50 with AI" (Liu, Zenke, Liu, Holmes, Thornton, Malan, SIGCSE 2024) — https://cs.harvard.edu/malan/publications/V1fp0567-liu.pdf · https://cs50.readthedocs.io/cs50.ai/

- Trzy narzędzia: „Explain Highlighted Code", style50 z „Explain Changes", CS50 Duck (chatbot, strona + VS Code + forum Ed)
- „Pedagogical guardrails": duck „prowadzi do odpowiedzi zamiast je zdradzać"; zakaz pełnych rozwiązań; cel: „office hours 24/7", ratio 1:1
- Rate limiting „serduszkami": start 10, każda interakcja −1, regeneracja 1 co 3 min; cel: koszty + wymuszona refleksja — paper, sekcja 4.6
- Na forum Ed każda odpowiedź ducka podlega zatwierdzeniu przez staff — sekcja 4.5
- RAG: napisy wykładów cięte na segmenty 30-sekundowe
- Skala: >50 000 użytkowników, >1,8 mln zapytań do XII 2023; trafność 88% kursowych
- Wykorzystanie (ankieta ~500 studentów): 17% >10×/tydz., 32% 5–10×; ocena: 47% „very helpful", 26% „helpful"
- Polityka: komercyjne AI zakazane, narzędzia AI kursu — zalecane

### 1.4 Czas pracy

- Oficjalnie: „10–20 godzin na problem sety każdego tygodnia" — https://cs50.harvard.edu/x/2025/faqs/

## Sekcja 2: STANFORD — Code in Place (CS106A online)

Źródło główne: paper SIGCSE'21 (Piech, Malik, Jue, Sahami) — https://stanford.edu/~cpiech/bio/papers/codeInPlace.pdf

- Edycja 2020: kurs 5-tygodniowy; od 2023 format 6-tygodniowy
- Rytm wykładów: wideo 3× w tygodniu, każda publikacja ~50–60 min treści **POCIĘTEJ NA 10-MINUTOWE KAWAŁKI** „by była łatwiejsza do strawienia online"; łącznie >14 h w 74 filmach — paper, sekcja 2.3
- Sekcje: raz w tygodniu, grupa 10 studentów + section leader, 40 min (2020) / 50 min (2023–24); ratio 1:10
- Section leaderzy dostają szczegółowe scenariusze lekcji
- Zadania: 3 assignmenty (2020) / 4 + final project (2023+); „creative extensions" ponad minimum
- Drabina pomocy: section leader → forum sekcyjne (10 os.) → forum główne → forum SL; wszystko na EdStem
- Skala i skuteczność 2020: 10 428 studentów, 904 SL; >56% oddało wszystkie assignmenty — vs 2% ukończeń CS50x i 5,5% średniej edX; NPS +90,3
- Zaangażowanie: 6,02 h wideo/studenta; ocena przydatności: wykłady 93%, SL 81%, assignmenty 79%
- 2023–25: >30 000 uczestników; prognoza ukończeń 60–70%; opcja self-paced (2024); IDE w przeglądarce (PyodideU, SIGCSE 2024 — https://dl.acm.org/doi/10.1145/3626252.3630913); AI feedback stylu — https://arxiv.org/html/2403.14986v1
- Teza „lekcje ~15 min" w wersji self-guided: **NIEPOTWIERDZONE** (SPA bez treści dla crawlerów). Najbliższy potwierdzony fakt: cięcie wykładów na 10-minutowe kawałki.

## Wzorce przekrojowe Harvard + Stanford

1. **Mała jednostka konsumpcji, duża jednostka rytmu.** Tygodniowy rytm z JEDNYM deliverable, treść cięta na małe kawałki: Stanford 10-min chunki, CS50 chaptery ~5–12 min + 54 shorts.
2. **„Nigdy pusta kartka".** Spec + demo + pseudokod + walkthrough + hinty + lista testów przed pierwszą linijką.
3. **Samodzielny wybór trudności bez kary i bez nagrody.** less/more comfortable bez dodatkowych punktów; challenge problems opcjonalne.
4. **Drabina pomocy z celową rzadkością.** Duck 24/7 z limitem serduszek (regeneracja 1/3 min); u Stanforda najpierw człowiek (1:10), potem fora; nadzór staffu.
5. **Człowiek lub jego aproksymacja jako mechanizm retencji.** Sekcje 1:10 → ukończenia 56–70% vs 2–5,5% w MOOC.
6. **Jawny, liczbowo zakotwiczony koszt czasu.** CS50: 10–20 h/tydz; Stanford: stały kalendarz — przewidywalny kontrakt czasowy.
