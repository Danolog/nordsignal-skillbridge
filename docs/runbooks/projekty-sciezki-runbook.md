# Runbook: przygotowanie projektów dla ścieżki kariery (proces kanoniczny)

**Autor:** Oliver (agent) · **Data:** 2026-07-01 · **Wersja:** v1.0
**Geneza:** uogólnienie procesu, którym przeszła ścieżka Cyber Security (partie 1–3, 38 projektów), **rozszerzone o bramki jakości merytorycznej (QG-1…QG-7)** wynikające z krytycznej weryfikacji planu DS (`docs/curation/weryfikacja-ds-plan-projektow.md`). Ten dokument jest **nadrzędnym procesem** dla przygotowania projektów każdej kolejnej ścieżki (DS, AI Engineer, QA, Data Engineer, …).
**Dokumenty podrzędne (bez zmian merytorycznych, obowiązują nadal):** `docs/curation/ethan-e1-struktura-projektow.md` (struktura, kontrakt, 7 reguł autora), `tools/content/README-cyber-projects.md` (kontrakt JSON + narzędzie ingestu), `docs/decisions/009-prod-ingest-cyber-partia-3.md` (wzorzec ingestu prod).

---

## 0. Zasada nadrzędna

Proces cyber był solidny **operacyjnie** (kontrakt JSON, idempotentny ingest, bramki RODO/tech), ale nie miał żadnej bramki **jakości merytorycznej**: pokrycie liczyliśmy względem tagów ofert, nie względem realnych wymagań; nie było odniesienia akademickiego, kryterium job-readiness ani standardu portfolio. Od tej wersji: **żadna partia projektów nie przechodzi do autoringu bez QG-1…QG-3, ani do ingestu prod bez QG-4…QG-6.** QG-7 działa po publikacji.

**Lekcja fundamentalna z weryfikacji DS:** *tagi ofert pokazują wyróżniki, nie fundamenty roli.* Pracodawca taguje „Azure" i „LLM", a scikit-learn i statystykę wymaga w opisie — bo są domyślnie zawarte w tytule stanowiska. Kuracja liści z tagów pozostaje podstawą modelu (uczciwy sygnał rynku), ale **treść projektów musi pokrywać także fundamenty z opisów ofert** (warsztat wbudowany). Nigdy więcej nie projektujemy treści z samych tagów.

---

## 1. Pipeline — fazy A–F (bez zmian) + bramki QG (nowe)

```
A. ETL ofert (etl-justjoinit.ts)  ──────────────►  dane rynkowe per ścieżka
B. Kuracja kompetencji (Sophia)   ──────────────►  grupy + liście w career-model.ts
        │
        ├── QG-1  Benchmark pracodawców (tagi + OPISY ofert)          ┐
        ├── QG-2  Parytet akademicki (kalibracja L1–L3 + inwarianty)  ├─ przed autoringiem
        └── QG-3  Job-readiness (profil wejścia junior)               ┘
C. Mapa pokrycia → projekty L1–L3 (wzór E1 §2.4)
D. Autoring treści (Sophia, 7 reguł autora + kontrakt JSON)
        │
        ├── QG-4  Standard portfolio-grade (artefakty)                ┐
        ├── QG-5  Standard teorii i źródeł                            ├─ przed ingestem prod
        └── QG-6  Sign-off eksperta domenowego (L3)                   ┘
   Review: Ryan (RODO/licencje) → Ethan (tech/wykonalność) → ekspert domenowy (L3)
E. Walidacja + narzędzie ingestu (Leo; keyed-by-slug, guard prod)
F. Ingest prod (Ethan, bramki v1.12: backup Neon, transakcyjnie, audit log)
        │
        └── QG-7  Kalibracja i pilot (post-launch, pętla poprawek)
```

Fazy A–F wykonujemy dokładnie jak w cyber (szczegóły: E1 §1–6, README narzędzia, ADR-009). Poniżej wyłącznie nowe bramki.

---

## QG-1 — Benchmark pracodawców (przed autoringiem)

**Cel:** projekt uczy tego, czego pracodawca realnie wymaga — nie tego, co wynika z tagów.

**Kroki (owner: Sophia, artefakt: sekcja w specu partii):**
1. Zbierz **≥5 realnych, aktualnych ofert junior/mid** dla ścieżki (justjoin.it / nofluffjobs / rocketjobs / pracuj.pl + min. 1 globalna). Zapisz URL-e i daty w specu partii.
2. Wynotuj wymagania z **opisów** (nie tagów). Porównaj z liśćmi kuracji: co się pokrywa, czego w liściach nie ma.
3. Wymagania obecne w ≥3/5 opisów, a nieobecne w liściach = **warsztat wbudowany**: wchodzą do projektów jako kroki briefu i kryteria rubryki (bez zmiany `career-model.ts`). Jeśli sygnał jest masowy — dodatkowo rekomendacja rozszerzenia kuracji dla osobnej iteracji (decyzja Sophia+Darek).
4. Mapowanie rubryk: **każde kryterium rubryki** każdego projektu musi dać się wskazać w wymaganiu z ≥1 zebranej oferty (tabela „kryterium → oferta" w specu partii). Kryterium bez pokrycia w żadnej ofercie wymaga jawnego uzasadnienia (np. inwariant metodyczny z QG-2).
5. Pokrycie grup/liści liczymy jak dotąd względem `career-model.ts` (mapa E1 §2.4) — QG-1 tego nie zastępuje, tylko uzupełnia o warstwę opisową.

**Kryterium przejścia:** spec partii zawiera listę ofert z URL-ami, listę warsztatu wbudowanego i tabelę mapowania rubryk.

## QG-2 — Parytet akademicki (przed autoringiem)

**Cel:** rygor metodyczny porównywalny z topowymi kursami uczelnianymi — dorównujemy **metodą**, nie nakładem (i tak to komunikujemy).

**Kalibracja poziomów (stała procesu):**
- **L1 (3–6 h)** ≈ projekt tygodniowy typu Harvard CS50-x (jedno narzędzie + jedno pojęcie teoretyczne sprawdzane w artefakcie)
- **L2 (8–14 h)** ≈ jeden duży homework kursu typu Harvard CS109a (pełny mini-cykl na brudnych danych)
- **L3 (18–30 h)** ≈ skompresowany trening metodologii projektu badawczego (proposal → baseline → raport); **nigdy nie nazywamy L3 „ekwiwalentem capstone'a"** (capstone CS109a/CS230 to 100–250 osobogodzin zespołu z mentorem)

**Kroki (owner: Sophia + recenzja Ethan):**
1. Wskaż **≥1 darmowy kurs referencyjny** topowej uczelni dla ścieżki (MIT OCW / Harvard / Stanford public; dla DS: MIT 6.390, Harvard CS109a). Zapisz URL w specu partii.
2. Wypisz tematy-rdzeń tego kursu; zaznacz, które ścieżka pokrywa (projekt/teoria), a które są **jawnie poza formułą** (→ komunikacja QG-3 pkt „czego nie uczymy").
3. **Inwarianty metodyczne ścieżki** — zdefiniuj 3–5 wymagań metodycznych obowiązujących w rubryce każdego projektu merytorycznego ścieżki. Dla ścieżek danych/ML (wiążące):
   1. baseline przed modelem właściwym, 2. poprawna walidacja + opis ryzyka leakage, 3. analiza błędów, 4. sekcja „Ograniczenia", 5. reprodukowalność (seed, requirements, README, historia Gita).
4. `theory_md` pisany w duchu „dlaczego i kiedy metoda działa" (nie „co to jest X"): intuicja + warunki stosowalności + typowy błąd praktyka + powiązanie z kryterium rubryki.
5. **Elementy rdzenia akademickiego** (Darek, 2026-07-01 — „dodaj potrzebne elementy") — dla ścieżek danych/ML zestaw partii MUSI pokryć w projektach i teorii poniższy rdzeń, którego kursy MIT 6.390 / Harvard CS109a wymagają, a sama kuracja tagów gubi:
   - **Statystyka i wnioskowanie** — testy hipotez, przedziały ufności, regresja jako model (nie tylko `fit`).
   - **Trenowanie i ewaluacja modeli** — klasyczny ML (regresja/klasyfikacja) z metrykami dobranymi do problemu (precision/recall/ROC vs MAE/RMSE), obsługa danych niezbalansowanych.
   - **Generalizacja** — bias–variance, overfitting, regularyzacja, walidacja krzyżowa, leakage (operacjonalizacja inwariantu 2).
   - **EDA jako metoda** — eksploracja i czyszczenie brudnych danych z decyzjami, nie tylko `df.describe()`.
   - **Metodologia eksperymentu** — hipoteza → metryka + guardrail → test → decyzja (A/B); przynajmniej jeden projekt L2/L3 partii.
   - **Etyka i ograniczenia** — bias danych, granice modelu (operacjonalizacja inwariantu 4).
   Te elementy mapują się na grupę „Fundamenty" ścieżki DS w `career-model.ts` (liście: Statystyka, Uczenie maszynowe, EDA, A/B testing — kuracja ekspercka 2026-07-01). Dla nowej ścieżki: dodaj analogiczną grupę fundamentów, jeśli tagi jej nie pokazują.

**Reguła językowa (marketing + treść):** wolno pisać „standardy metodyczne kursów MIT/Harvard"; **nie wolno** pisać „wiedza/poziom MIT/Harvard".

**Kryterium przejścia:** spec partii zawiera kurs referencyjny, mapę tematów, listę inwariantów i pokrycie rdzenia akademickiego (pkt 5); rubryki projektów zawierają inwarianty.

## QG-3 — Job-readiness (przed autoringiem)

**Cel:** zestaw projektów ścieżki domyka minimalny profil wejścia do roli junior — i uczciwie mówi, czego nie domyka.

**Kroki (owner: Sophia):**
1. Z ofert QG-1 + publicznych opisów procesów rekrutacyjnych zbuduj **checklist profilu wejścia junior** (co kandydat musi umieć pokazać/obronić).
2. Zmapuj checklist na projekty partii: każda pozycja pokryta ≥1 projektem albo świadomie odłożona.
3. **Jawna lista „czego ta ścieżka NIE uczy"** — w specu partii i (produktowo) w komunikacji ścieżki: np. live coding pod presją, praca zespołowa, rozmowa techniczna. Zawyżona obietnica = ryzyko reputacyjne.
4. Drabina kariery w komunikacji: „portfolio-grade artefakty + samodzielne przygotowanie do rozmów → junior w PL/EU → top firmy po 2–3 latach doświadczenia". Nie sugerujemy skrótów, których nie ma.

**Kryterium przejścia:** checklist + mapowanie + lista wyłączeń w specu partii.

## QG-4 — Standard portfolio-grade (przed ingestem prod)

**Cel:** artefakt projektu robi wrażenie na hiring managerze, nie tylko przechodzi rubrykę.

**Wymagania twarde (walidowane na treści przez Ethana w review):**
1. **Dane prawdziwe i brudne** — open data / API / scraping. **Zakaz datasetów-klisz** (Titanic, Iris, MNIST, Boston Housing i odpowiedniki per dziedzina). Preferencja: ≥1 polski zbiór na partię (GUS BDL, dane.gov.pl, dane miejskie), tam gdzie pasuje.
2. **Widoczna praca z jakością danych** — EDA/czyszczenie z decyzjami i uzasadnieniem jako jawny krok briefu i kryterium rubryki (w L2+).
3. **Deployment min. 1 projektu na ścieżkę** (Streamlit/Gradio/HF Spaces/prosty API) — dowód inżynierii poza notebookiem.
4. **README „dla rekrutera" (60 sekund)** — każdy L2/L3: problem biznesowy → dane → podejście → wynik z liczbą → demo/zrzut → jak odtworzyć; struktura repo (`data/`, `notebooks/`, `src/`, `requirements.txt`).
5. **Metryka biznesowa, nie tylko modelowa** — rubryka L2+ wymusza zdanie „[technika] + [metryka] + [wynik/wpływ]".
6. **Szablon portfolio dla L3** — sekcje: Cel · Dane · Metoda · Wynik · Wnioski/Ograniczenia · README dla nie-technicznego czytelnika.
7. **Zróżnicowanie per student** — brief AI parametryzuje dane/zakres tak, by artefakty studentów nie były identyczne (antyklisza platformowa).
8. **Kryteria rubryki sprawdzalne z artefaktu** (repo/notebook/raport), nie z żywej sesji — zasada z E1 §7.6 zostaje.
9. **Eksperymentacja, product sense i decision memo** (Darek, 2026-07-01 — dla ścieżek danych/produktowych; największa luka wobec procesów rekrutacyjnych Google→Booking):
   - **≥1 projekt L2/L3 partii** oparty na **eksperymentacji A/B**: hipoteza → metryka sukcesu + guardrail → power/MDE → test → decyzja.
   - **Product sense** — brief L2+ zaczyna się od „zdefiniuj metrykę sukcesu i guardrail"; rubryka ocenia **framing problemu**, nie tylko kod.
   - **Decision memo** — obowiązkowy artefakt (1 strona) w projektach eksperymentacyjnych/analitycznych: rekomendacja biznesowa dla nie-technicznego odbiorcy (ćwiczy komunikację stakeholderską — kompetencja pierwszych miesięcy pracy).

**Kryterium przejścia:** przegląd treści partii potwierdza 1–9 (checklista w PR treści).

## QG-5 — Standard teorii i źródeł (przed ingestem prod)

**Cel:** `theory_md` + `learning_resources` wystarczają do samodzielnego wykonania projektu na poziomie inwariantów QG-2.

**Progi minimalne (zamiast dotychczasowego „~600 słów + 2–3 linki"; zasada zatwierdzona przez Darka 2026-07-01 dla L2/L3):**

| Poziom | theory_md | learning_resources |
|---|---|---|
| L1 | 600–800 słów | 3 (1 kanon-teoria, 1 docs-praktyka, 1 wideo/kurs) |
| **L2** | **800–1500 słów** z obowiązkową sekcją **„Metodyka i pułapki"** | **3–5** (kanon + docs + pogłębienie) |
| **L3** | **800–1500 słów** z sekcją metodyczną + sekcją „architektura rozwiązania" | **3–5**, w tym ≥1 rozdział podręcznika open-access i ≥1 oficjalna dokumentacja |

> **Zasada L2/L3 (Darek, 2026-07-01):** teoria **800–1500 słów** z sekcją metodyczną, **3–5 źródeł**. Dolna granica 800 to minimum na sekcję metodyczną; górna 1500 chroni przed przeładowaniem (teoria wprowadza, nie zastępuje źródeł).

**Reguły źródeł (rozszerzenie 7 reguł autora):**
1. **Trzy funkcje źródła** w każdym projekcie: kanon (podręcznik/wykład), praktyka (oficjalne docs), pogłębienie (kurs/wideo).
2. **Trwałe URL-e**: oficjalne domeny projektów, strony autorów, OCW — nie agregatory/blogi/Medium.
3. **Licencja przy każdym datasecie** w `source_links` (nazwa + URL licencji) — warunek merge'a. „Darmowy PDF ≠ wolna licencja": linkować wolno, kopiować do `theory_md` nie (przykład: ISLP „All Rights Reserved"; CC BY-NC-ND = bez tłumaczeń fragmentów).
4. **Zakaz materiałów za rejestracją, gdy istnieje odpowiednik bez** — jeśli rejestracja konieczna, oznaczyć w opisie zasobu.
5. **Środowiska „trial-safe"**: projekt chmurowy projektujemy pod darmowe środowisko bez karty i bez wygasania (sandbox), a limity/wygasanie triali komunikujemy w briefie. Sprawdzamy stan darmowości NA DZIŚ (przykład-lekcja: Databricks Community Edition wycofana 1.01.2026 — linkujemy Free Edition).
6. **Fallback**: dla każdego kluczowego zasobu wskazane źródło zapasowe tej samej funkcji.
7. **Data weryfikacji linków** w specu partii; okresowy link-check (HTTP 200, brak redirectu do loginu/paywalla) — mechanizm `project_source_links.isDead` już istnieje.

**Kryterium przejścia:** wszystkie projekty partii spełniają progi; licencje odnotowane.

## QG-6 — Sign-off eksperta domenowego (przed ingestem prod)

**Cel:** ktoś z branży potwierdza, że projekty uczą realnej praktyki, nie „Hollywoodu".

- Dotyczy **wszystkich projektów L3** partii (zalecane też losowy L2).
- Ekspert: praktyk danej roli (dla DS: senior DS / lead z firmy zatrudniającej juniorów; dla cyber: CISO/architekt SOC) — spoza zespołu autorskiego.
- Checklist eksperta: (1) czy scenariusz odzwierciedla realną pracę, (2) czy artefakt byłby atutem na rozmowie, (3) czy student nie uczy się złych nawyków, (4) czy poziom trudności odpowiada deklarowanemu.
- Wynik: sign-off w PR treści (komentarz/approval) — trzecia bramka obok Ryana (RODO) i Ethana (tech).

## QG-7 — Kalibracja i pilot (po publikacji)

**Cel:** zamknięcie pętli — deklarowane godziny i poziomy vs rzeczywistość studentów.

1. Po wdrożeniu partii 1 ścieżki: pilot na 10–15 studentach (WSB Merito).
2. Metryki: rzeczywisty czas wykonania vs `estimatedHours`, wskaźnik ukończeń, rozkład ocen AI-review, samoocena „czy czuję się gotów do zadań junior po tym projekcie", feedback za trudne/za proste/niejasne.
3. Iteracja treści (poprawki przez to samo narzędzie ingestu — upsert po slugu) + korekta kalibracji QG-2 dla kolejnych partii.

---

## 2. Definition of Done partii projektów (checklista zbiorcza)

- [ ] Faza B: kuracja w `career-model.ts` (grupy + liście) — jak dotąd
- [ ] **QG-1**: ≥5 ofert z URL-ami, warsztat wbudowany, tabela kryterium→oferta
- [ ] **QG-2**: kurs referencyjny, mapa tematów, inwarianty w rubrykach
- [ ] **QG-3**: checklist profilu wejścia + lista „czego nie uczymy"
- [ ] Faza C: mapa pokrycia grup/liści (wzór E1 §2.4) z jawną listą liści świadomie niepokrytych
- [ ] Faza D: treść wg kontraktu JSON + 7 reguł autora (E1 §3/§5)
- [ ] **QG-4**: dane nie-kliszowe + licencje, EDA widoczne, deployment ≥1, README dla rekrutera, metryka biznesowa, szablon portfolio L3, zróżnicowanie per student
- [ ] **QG-5**: progi teorii/źródeł per poziom, 3 funkcje źródła, trial-safe, fallbacki, data weryfikacji linków
- [ ] Review: Ryan (RODO/licencje) → Ethan (tech) → **QG-6** ekspert domenowy (L3)
- [ ] Faza E: walidacja narzędziem ingestu na bazie testowej (nazwy kompetencji DOSŁOWNIE = liście)
- [ ] Faza F: ingest prod pod bramkami v1.12 (backup Neon, transakcyjnie, audit log — wzór ADR-009)
- [ ] **QG-7**: pilot + iteracja (po publikacji)

---

## 3. Historia wersji

- **v1.0 (2026-07-01, Oliver):** pierwsza wersja kanoniczna — uogólnienie procesu cyber + bramki QG-1…QG-7 z weryfikacji DS (`docs/curation/weryfikacja-ds-plan-projektow.md`).
