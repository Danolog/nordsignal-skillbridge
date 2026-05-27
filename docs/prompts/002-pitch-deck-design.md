# Misja: zbudować pitch deck SkillBridge AI v2.0 w PowerPoint

Tworzysz finalny pitch deck w formacie `.pptx` + `.pdf` zgodnie z briefem zapisanym
w `docs/pitch/pitch-deck-content.md`. To jest wersja v2.0 — **10 slajdów / 4:02
minuty prezentacji**, gala finałowa **EduTech Masters 2026 (5 maja 2026)**.

Komisja konkursowa jest mieszana (akademicy + przedstawiciele VC) i ocenia 4 zespoły
według formularza z 7 kryteriami × 10 pkt (max 70). Mapowanie kryteriów na slajdy
jest w `docs/pitch/evaluation-criteria-cheatsheet.md` — przeczytaj przed rozpoczęciem.

---

## Reguły operacyjne (BEZWZGLĘDNE)

1. **Single source of truth dla treści**: `docs/pitch/pitch-deck-content.md`. Każdy
   headline, bullet, speaker note pochodzi stamtąd. Nie improwizuj treści.
2. **Single source of truth dla finansów**: `docs/pitch/financial-projection.md`.
   Wszystkie liczby finansowe (przychody Y1/Y2/Y3, koszty, marże, break-even)
   muszą być zgodne z tym dokumentem. Jeśli pitch-deck-content i financial-projection
   się różnią, **wygrywa financial-projection**.
3. **Skill obowiązkowy**: użyj `pptx` skill (`anthropic-skills:pptx`). Przeczytaj
   `SKILL.md` PRZED rozpoczęciem budowy.
4. **Output**:
   - Primary: `presentations/skillbridge-pitch-v2.pptx` (10 slajdów main + 3 backup)
   - Backup: `presentations/skillbridge-pitch-v2.pdf` (export z PPTX)
   - Speaker notes: w PPTX jako Notes per slide (pełne speaker notes z `.md`)
5. **Język**: cały tekst user-facing po **polsku**. Nazwy techniczne zostają po
   angielsku (SkillBridge AI, MVP, ARR, TAM/SAM/SOM, B2B, B2C, freemium).
6. **Branding**: logo SkillBridge AI + tagline „Z kursu w portfolio" w stopce
   każdego slajdu (małe, prawy dolny róg). Na slajdzie 1 logo+tagline jest
   dominującym elementem hero.
7. **Branch**: utwórz `feat/pitch-deck-v2` od `main`. PR po Step 5.
8. **Test-gate po każdym kroku**: otwórz wynikowy `.pptx` w LibreOffice/PowerPoint,
   sprawdź wizualnie, że nic nie jest zepsute. Jeśli jest błąd — napraw przed
   commit'em, nie idź dalej.
9. **Czas pracy**: cel — 1 dzień. Jeśli któraś faza zajmuje > 3h, zatrzymaj się
   i raportuj blocker.

---

## Wytyczne wizualne (z `pitch-deck-content.md`)

**Tło**: białe (#FFFFFF) lub off-white (#FAFAFA). Bez gradientów, bez tekstur.

**Paleta kolorów** — max 3:

- **Primary**: indigo `#4F46E5` (lub granat `#1E3A8A` jako alternatywa)
- **Accent**: zielony `#10B981` (do highlightów, „TAK"/sukces) — opcjonalnie
  pomarańczowy `#F59E0B` dla call-to-action
- **Neutralny szary**: `#64748B` (text secondary), `#0F172A` (text primary)

**Typografia** — jeden font sans-serif w całej prezentacji:

- Preferowany: **Inter** (alt: Manrope, Söhne, Source Sans 3)
- Nagłówki: 40–48 pt, weight 700
- Treść / bullets: 24–28 pt, weight 400
- Stopka / fine print: 16–18 pt, weight 400
- Liczby (statystyki, pricing): 56–72 pt, weight 700, primary color

**Layout**:

- 16:9 widescreen (1920×1080 px)
- Margines bezpieczeństwa: min. 60 px od każdej krawędzi
- Headline grid: jeden nagłówek u góry + jeden „bucket" content pod
- Każdy slajd musi pracować w 30 s czytania **bez audio** (komisja czyta slajd
  jednocześnie ze słuchaniem — visual musi się bronić sam)

**Charts / wykresy**:

- Minimal, **bez 3D**, bez cieni, bez animacji
- Jeden kolor primary + jeden szary dla porównań
- Etykiety bezpośrednio na elementach (nie w legendzie po stronie)

**Ikony**:

- Lucide-react styl: outline, weight 1.5–2, kolor primary lub neutral
- Wszystkie ikony spójne — nie mieszaj filled z outlined

**Brand consistency**:

- Logo SkillBridge AI — wektorowy SVG (jeśli jeszcze nie ma — zaproponuj prosty
  wordmark + ikonę, zob. sekcję „Asset requirements")
- Stopka: małe logo + numer slajdu + tagline (16 pt) — na każdym slajdzie
  oprócz slajdu 1 (cover)

---

## Plan budowy — 5 faz

Każda faza kończy się commitem + wizualnym przeglądem `.pptx` w PowerPoint/LibreOffice.

### FAZA 1 — Setup + design system (Krok 1–2)

**Krok 1: Branch + struktura folderów**

- Utwórz branch `feat/pitch-deck-v2` od `main`
- Utwórz folder `presentations/` w roocie repo
- Utwórz folder `presentations/assets/` na zdjęcia, screenshoty, ikony, logo
- Test-gate: brak (placeholder commit)
- Commit: `chore(pitch): scaffold presentations folder`

**Krok 2: Master template + design system**

- Stwórz pusty `.pptx` z 1 master slide:
  - Tło białe
  - Stopka z miejscem na: logo (lewy dolny róg), tagline (centrum), nr slajdu (prawy dolny)
  - Title placeholder (góra) z fontem Inter 40pt
  - Body placeholder (środek) z fontem Inter 24pt
- Zdefiniuj 4 layouty:
  - „Cover" (slajd 1) — full bleed, logo + tagline duże
  - „Two-column" (slajdy 2, 3, 6, 7) — left/right split 50/50
  - „Stat-heavy" (slajdy 5, 6, 8) — duże liczby + opis
  - „Closing" (slajd 10) — bold typography
- Zapisz jako `presentations/skillbridge-pitch-v2.pptx`
- Test-gate: otwórz, sprawdź czy layouty są spójne
- Commit: `feat(pitch): add master template with design system`

### FAZA 2 — Treść 10 slajdów (Krok 3)

**Krok 3: Wypełnij wszystkie 10 slajdów treścią z `pitch-deck-content.md`**

Pracuj slajd po slajdzie. Dla każdego:

1. Skopiuj headline z `.md`
2. Wypełnij body content zgodnie z opisem „Co na slajdzie"
3. W Notes wklej pełne speaker notes z `.md` (z timingiem)
4. Użyj layoutu odpowiedniego dla slajdu (zob. niżej)

**Slajd 1 — Cover + Origin** (layout: Cover):

- TOP (60% wysokości): logo SkillBridge AI (duże, ~200px wysokości), pod nim
  tagline „Z kursu w portfolio." (font 56pt, weight 700) + sub-tagline
  „Łączymy sylabus z rynkiem pracy przez projekty." (32pt, weight 400)
- BOTTOM (40% wysokości): mała grafika rozjazdu — dwie linie wykresu
  rozchodzące się w prawą stronę, etykiety „Program studiów" i „Wymagania
  pracodawców"
- Stopka (16pt): imię + rola + email
- Bez logo+tagline w prawym dolnym (cover slide)

**Slajd 2 — Diagnoza + Product Reveal** (layout: Two-column):

- LEFT 50% — „Diagnoza" header + 3 etapy z ikonami:
  - 🔍 Krok 1: 10 000 ofert pracy → top kompetencje
  - 📚 Krok 2: Sylabus + kursy → matrix
  - 🎯 Krok 3: Mapa luk
- Visual: prosty diagram strzałkowy między etapami
- RIGHT 50% — „Rozwiązanie" header + product reveal:
  - Headline: **„SkillBridge AI"** (48pt, primary color, bold)
  - One-liner: „Platforma, która zamienia mapę luk w portfolio realnych projektów"
  - 3 ikony stack'a z labelami: 🎓 Student / 🏛️ Uczelnia / 🏢 Pracodawca

**Slajd 3 — Jak działa SkillBridge** (layout: Two-column):

- LEFT — 5 poziomów trudności (vertical stack):
  - L1 Otwarte dane (ikona: 📊)
  - L2 OSS (ikona: 📦)
  - L3 Symulacje (ikona: 🎮)
  - L4 Realne firmy (ikona: 🏢)
  - L5 Wdrożenia produkcyjne (ikona: 🚀)
- RIGHT — screenshot Competency Passport (zob. „Asset requirements"
  — wymaga zrzutu z działającego MVP)
- Headline (góra całego slajdu): „Big Tech odchodzi od dyplomu — patrzą na praktykę"

**Slajd 4 — MVP + WhatsApp social proof** (layout: Two-column):

- LEFT — strona tytułowa raportu z analizy rynku pracy (screenshot z MVP)
- RIGHT — screenshot z WhatsApp z wiadomościami od kolegów
- Stopka pod oboma: „MVP: 3 zespoły agentów AI · Next.js + Claude · open-source na GitHub"
- ⚠️ **Asset critical**: screenshoty muszą być prawdziwe, nie mock-up

**Slajd 5 — Trzystronny rynek** (layout: Stat-heavy):

- Centralny diagram trzech aktorów połączonych strzałkami:
  - 👨‍🎓 **Studenci** (1,28 mln PL · 280 tys. STEM (21,8%) · 192 tys. publiczne politechniki · 48% to 25+ · 100 tys. Merito)
  - 🎓 **Uczelnie** (352 ogółem · 337 aktywnych · **380–420 wydziałów STEM**)
  - 🏢 **Pracodawcy** (niższe koszty rekrutacji)
- **SOM bottom-up**: 380–420 wydziałów STEM × ~50k ACV = **~20 mln zł SAM** · SOM 24 mc ~6 mln
- **Footer-badge** (akcent kolorowy): „⚡ Rada UE 2025 — zalecenie krajowe dla PL: zwiększyć udział STEM (11,9% vs 14,3% UE)"
- Strzałki dwukierunkowe między aktorami z labelami value (np.
  „portfolio ↔ talent" między studentem a pracodawcą)

**Slajd 6 — Konkurencja: Riipen + CareerEDGE** (layout: Two-column):

- LEFT — 3 mapy w pionie (Polska, Europa, Świat) z liczbami konkurentów: 0 / 0 / 1
- RIGHT — „Riipen — benchmark" headline + 5 statystyk w grid 2×3:
  - **760+** uczelni
  - **53k+** pracodawców
  - **318k+** projektów
  - **20,9M+** godzin pracy
  - **$4,7M → $25–50M** kapitał → revenue
- Footer (cały slajd): „Bazujemy na akademickim modelu **CareerEDGE**
  (Dacre Pool & Sewell 2007), ale dodajemy faculty curriculum loop"

**Slajd 7 — Model biznesowy + value dla uczelni** (layout: Stat-heavy):

- 3 kolumny / piktogramy:
  - 👨‍🎓 Studenci → **19 zł/mc**
  - 🎓 Uczelnie (3-poziomowy land-and-expand):
    - **Pilotaż** 5–10k (1 wydział, 1 semestr)
    - **Standard** 15–25k/wydział/rok
    - **Scale** 30–50k/wydział/rok
  - 🏢 Pracodawcy → **500–1000 zł/odblokowanie**
- **Footer-value** (akcent kolorowy, pod pricingiem uczelni):
  „Uczelnia płaci za: 📄 **Auto-raport PKA** · 📊 **Curriculum analytics** · 🎯 **Wyróżnik rekrutacyjny** · 📉 **Redukcja dropoutu**"
- Pod każdą kolumną drobny benchmark (16 pt):
  - Lightcast: 10–50k USD/wydział
  - Coursera for Campus: 200–400 USD/student
  - Handshake / RippleMatch: 10–20k USD/rok

**Slajd 8 — Projekcja finansowa Y1–Y3 + J-curve marży** (layout: Stat-heavy):

> ⚠️ **Pełne źródło**: `docs/pitch/financial-projection.md` — wszystkie liczby
> i założenia tam. Slajd to **kondensat** dla 28 sekund. Szczegółowe rozbicia
> per segment + scenarios (bull/base/bear) + sensitivity analysis dostępne jako
> backup-slides do Q&A (zob. niżej).

- **Główna tabela (środek slajdu)** — 3 lata Y1/Y2/Y3:

| (PLN) | Y1 | Y2 | Y3 |
|-------|---:|---:|---:|
| Studenci | 20 000 | 130 000 | 490 000 |
| Uczelnie | 102 500 | 385 000 | 915 000 |
| Pracodawcy | 160 000 | 470 000 | 1 880 000 |
| **Przychody** | **282 500** | **985 000** | **3 285 000** |
| Koszty (wszystkie) | 688 700 | 1 395 100 | 1 789 600 |
| **Wynik netto** | **−406 200** | **−410 100** | **+1 495 400** |
| Marża netto | −144% | −42% | **+46%** |

- **Highlight** (akcent kolorowy nad tabelą): „**Break-even Q2 Y3** · skumulowana strata
  815k · pre-seed 1,2M wystarcza z buforem 384k"
- **Tailwind footer-badge** (poniżej tabeli): „📈 Szczyt demograficzny 2032:
  2,11 mln 20–24-latków (GUS) · marża netto J-curve: −144% → −42% → **+46%**"

> ⚠️ **Visual emphasis**: marża netto Y3 +46% powinna być **wyróżniona** kolorem accent
> (np. green #10B981) — to jest najmocniejszy single number na slajdzie. VC patrzy na
> trajektorię marży, nie absolutne straty.

**Slajd 9 — Zespół + Advisory** (layout: Two-column):

- LEFT — „Core team" header + 3 sylwetki:
  - 👤 [Twoje imię] — Founder · Sales · Organizacja
  - 👨‍💻 Programista — Rozwój techniczny
  - 🎓 Specjalista uczenia się — Pedagogika · sektor edukacyjny
- RIGHT — „Advisory (cel)" header + 3 placeholdery:
  - 🏛️ Dziekan uczelni technicznej
  - 🏢 Head of Talent z firmy IT
  - 💼 Inwestor wczesnych etapów EdTech

**Slajd 10 — Trinity + ASK** (layout: Closing):

- TOP (60% wysokości): bold typography
  - **SYLABUS → PROJEKTY → PRACA**
  - 80–96 pt, primary color
- BOTTOM (40% wysokości): 2 punkty ASK (większe ikony + krótki tekst):
  - 💰 **Pre-seed na rozwój produktu**
  - 🤝 **Partnerstwo z WSB Merito** — **lider niestacjonarnych w PL** (11,6 tys. zgłoszeń · 100 tys. studentów)
- Pod ASK (centrowane, italic, 28 pt): „Most między salą wykładową a stanowiskiem pracy"

Test-gate po Kroku 3:

- Otwórz `.pptx`, przejdź wszystkie 10 slajdów
- Sprawdź: każdy ma headline, każdy ma stopkę z logo (poza slajdem 1),
  każdy ma kompletną notatkę spikera
- Sprawdź czas: czytanie speaker notes na głos powinno mieścić się w czasach
  z tabeli pacingu (slajd po slajdzie)
- Commit: `feat(pitch): add content for all 10 slides`

### FAZA 2.5 — Backup slides do Q&A (Krok 3.5)

**Krok 3.5: Backup slides — financial deep-dive (do pokazania w Q&A)**

Komisja VC najpewniej zapyta o szczegóły finansowe. Stwórz **3 dodatkowe slajdy**
(slajdy 11–13, niewidoczne w głównym pitch'u 4-min, ale wczytane w PPTX i widoczne
po naciśnięciu „next" — używane tylko w Q&A na pytanie).

**Slajd 11 (backup) — Pełna tabela P&L Y1–Y3** (layout: Stat-heavy):

- Cała tabela P&L z `financial-projection.md` (Część III)
- Wszystkie linie: Studenci, Uczelnie, Pracodawcy → Wynagrodzenia, AI, Marketing, Operacje
- Wynik netto roczny + skumulowany
- Marża netto + cash burn/mc

**Slajd 12 (backup) — Sensitivity analysis** (layout: Stat-heavy):

- Top 6 najwrażliwszych zmiennych z `financial-projection.md` (Część VI)
- Wpływ na Y3 net per zmienna
- Highlight: 3 najwyżej leveraged zmienne

**Slajd 13 (backup) — Scenarios bull/base/bear** (layout: Two-column lub Stat-heavy):

- 3 scenariusze: bull (+30% revenue), base (kalkulacja standardowa), bear (−30% revenue)
- Break-even point w każdym scenariuszu
- Skumulowana strata w każdym scenariuszu

**Speaker notes (per backup slide)**: nie ma — backup slides nie mają być
prezentowane na głos. Notatki to **bullet points odpowiedzi na typowe pytania**:
- „Skąd numer X?" → odpowiedź z założeniami z `financial-projection.md`
- „A jeśli konwersja będzie niższa?" → przekaz na slajd 12 sensitivity
- „A jeśli rynek odpadnie?" → przekaz na slajd 13 bear scenario

Test-gate po Kroku 3.5:
- 13 slajdów łącznie w PPTX (10 main + 3 backup)
- Backup slides oznaczone w Notes: „BACKUP — pokazać tylko w Q&A na pytanie X"
- Commit: `feat(pitch): add backup slides for financial Q&A`

### FAZA 3 — Zasoby graficzne (Krok 4)

**Krok 4: Pozyskaj / wygeneruj wszystkie zasoby**

Lista zasobów do pozyskania, z priorytetami:

**P0 — KRYTYCZNE (bez nich nie ma slajdu)**:

1. **Logo SkillBridge AI** — jeśli nie istnieje, stwórz prostą wersję:
   wordmark „SkillBridge AI" w foncie Inter Bold + opcjonalna ikona-most
   (3 punkty połączone linią, primary color). Format SVG. Zapisz w
   `presentations/assets/logo-skillbridge.svg`
2. **Screenshot Competency Passport** (slajd 3): uruchom MVP lokalnie
   (`pnpm dev`), zaloguj się demo userem, wygeneruj passport, zrób
   pełen zrzut ekranu. Zapisz `passport-screenshot.png`. Jeśli MVP nie
   działa lokalnie — użyj zrzutu z `live deploy` URL
3. **Screenshot raportu z analizy rynku pracy** (slajd 4) — strona tytułowa
   raportu z MVP. Zapisz `report-cover.png`
4. **Screenshot WhatsApp** (slajd 4) — wymaga od foundera (Darek). Zapisz
   `whatsapp-feedback.png`. UWAGA RODO: zamaskuj imiona/numery telefonów
   kolegów (rozmycie albo zaczernione paski). Zostaw tylko treść wiadomości
   i timestampy

**P1 — DOPRECYZUJĄCE (ułatwiają odbiór)**:

5. Mapy Polski / Europy / Świata (slajd 6) — proste outliny w primary color,
   z liczbą wpisaną w środek. Stwórz jako 3 oddzielne SVG albo użyj biblioteki
   ikon (Lucide ma `map`, można zmodyfikować)
6. Ikony L1–L5 (slajd 3) — możesz użyć emoji (📊 📦 🎮 🏢 🚀) albo
   konsekwentnych ikon Lucide
7. Wykres rozjazdu sylabus vs rynek (slajd 1) — prosty SVG: dwie linie
   na osi X (czas), rozchodzące się od wspólnego punktu startowego;
   etykiety na końcach
8. 3-stronny diagram rynku (slajd 5) — koło z 3 podziałami (student / uczelnia
   / pracodawca) ze strzałkami między nimi

**P2 — POLISH (nice-to-have)**:

9. Header background pattern — bardzo subtelna siatka kropek `#E5E7EB` (10% opacity)
10. Animacje — **NIE używaj**. Komisja widzi PDF, nie PPTX live

Test-gate po Kroku 4:

- Wszystkie pliki z P0 są w `presentations/assets/`
- Wszystkie są wstawione do odpowiednich slajdów
- Sprawdź wizualnie: nic nie jest rozciągnięte, piksele nie skacze
- Commit: `feat(pitch): add all visual assets`

### FAZA 4 — Polish + eksport (Krok 5)

**Krok 5: Final polish + export do PDF**

Przejdź wszystkie 10 slajdów i wykonaj checklist:

- [ ] Każdy slajd ma stopkę (oprócz Cover) z logo + tagline + nr slajdu
- [ ] Spójna typografia: Inter wszędzie, brak fallback Arial
- [ ] Spójna paleta: max 3 kolory + biel + szary
- [ ] Headline każdego slajdu zaczyna się z dużej litery, bez kropki na końcu
- [ ] Liczby z separatorami: „1 200 000" nie „1200000"
- [ ] Kropki dziesiętne: użyj przecinka („18,4 mln" nie „18.4 mln")
- [ ] Speaker notes per slajd, kompletne (timing + treść)
- [ ] Numery slajdów widoczne w stopce (1/10, 2/10, …)
- [ ] Slajd 4 — twarde sprawdzenie czy WhatsApp ma zamaskowane dane osobowe
- [ ] Slajd 8 — tabela Y1 jest czytelna z odległości 3m
- [ ] Slajd 10 — bold typography ma odpowiednie wagi
- [ ] Sprawdź na telefonie / iPadzie (komisja może przeglądać PDF mobile)

Eksport:

- Save as `presentations/skillbridge-pitch-v2.pptx`
- Export to PDF: `presentations/skillbridge-pitch-v2.pdf` (1920×1080,
  high-res, embed fonts)

Test-gate:

- Otwórz oba pliki, przewiń całość
- Sprawdź na innym komputerze (jeśli dostępny) — czy fonty się renderują
- Commit: `feat(pitch): polish + export PDF`

### FAZA 5 — PR (Krok 6)

**Krok 6: Push + open PR**

- `git push -u origin feat/pitch-deck-v2`
- Otwórz PR do `main` z tytułem: `feat: add pitch deck v2.0 for EduTech Masters 2026`
- Opis PR:

  ```
  ## Cel
  Pitch deck v2.0 do gali finałowej EduTech Masters 2026 (5 maja 2026).
  Format: 4 minuty prezentacji + 4 minuty Q&A + backup slides do Q&A.

  Treść zgodna z:
  - `docs/pitch/pitch-deck-content.md` (narracja 10 slajdów main)
  - `docs/pitch/financial-projection.md` (financials slajd 8 + backup 11–13)

  ## Deliverables
  - presentations/skillbridge-pitch-v2.pptx (10 main + 3 backup = 13 slajdów)
  - presentations/skillbridge-pitch-v2.pdf (export do dystrybucji)
  - presentations/assets/ (logo, screenshoty, ikony)

  ## Checklist
  - [ ] 10 slajdów main zgodnie z pacingiem 4:02
  - [ ] 3 backup slides (P&L, sensitivity, scenarios) — niewidoczne w głównym pacingu
  - [ ] Speaker notes per slide (main: pełne; backup: bullet points odpowiedzi Q&A)
  - [ ] Brand spójny (Inter, indigo #4F46E5, biel)
  - [ ] Slajd 8 financial: wszystkie liczby zgodne z `financial-projection.md`
  - [ ] Marża netto Y3 +46% wyróżniona kolorem accent (green)
  - [ ] Wszystkie placeholdery z .md wypełnione
  - [ ] WhatsApp screenshot zanonimizowany (RODO)
  - [ ] Eksport PDF działa, fonty osadzone

  ## Co wymaga akcji foundera
  - Wstawienie własnego zdjęcia (slajd 1)
  - Wstawienie WhatsApp screenshot (slajd 4) — z anonimizacją
  - Weryfikacja statystyk PARP/ABSL (slajd 5) jeśli zostały dodane
  - Walidacja założeń finansowych z `financial-projection.md` Część VII
  ```

- Po otwarciu PR: zatrzymaj się i raportuj numer PR.

---

## Co robić, gdy coś idzie źle

- **Brak `pptx` skill** → zatrzymaj się, raportuj. Nie próbuj budować PPTX
  ręcznie przez `python-pptx` bez kontekstu skilla.
- **Screenshoty MVP nie do pozyskania** → użyj wireframes z folderu
  `.agents/designs/` jako placeholder + flag w PR „wymaga prawdziwego screenshota
  przed prezentacją".
- **Logo SkillBridge AI nie istnieje** → wygeneruj minimalny wordmark sam.
  Zaproponuj 3 warianty w PR (let user pick).
- **Eksport PDF psuje fonty** → przejdź na fallback Arial / Helvetica i poinformuj.
  Ale zalecane: pre-osadzić fonty w PPTX (File → Options → Save → Embed fonts).
- **Treść z `.md` jest niejasna lub niepełna** → zatrzymaj się i zapytaj
  zanim zaimprowizujesz.

---

## Quality criteria — jak ocenić pracę

**Akademik patrzy na**:

- Czy slajd 6 cytuje CareerEDGE (Dacre Pool & Sewell 2007)? **MUST HAVE**
- Czy slajd 5 ma wiarygodne źródła statystyk?
- Czy slajd 8 ma uczciwie skalibrowane projekcje (nie hopium)?

**VC patrzy na**:

- Czy slajd 6 ma benchmark Riipen z liczbami? **MUST HAVE**
- Czy slajd 7 ma unit economics albo benchmark cenowy? **MUST HAVE**
- Czy slajd 8 ma trajektorię marży netto (J-curve) i break-even point? **MUST HAVE**
- Czy slajd 8 ma 3-letnią projekcję (nie tylko Y1)? **MUST HAVE**
- Czy są backup-slides 11–13 z financial deep-dive? **MUST HAVE dla Q&A**
- Czy slajd 10 ma jasny ASK?

**Komisja ogólnie patrzy na**:

- Czy każdy slajd jest czytelny w 30 s bez audio?
- Czy nie ma więcej niż 5–7 linii tekstu na slajd?
- Czy nie ma więcej niż 3 kolorów w paletcie?
- Czy speaker notes mieszczą się w timing-budżecie (zob. tabela pacingu w `.md`)?

---

## Sources (priorytetyzowane)

**Single source of truth dla treści**:
- `docs/pitch/pitch-deck-content.md` — content + design guidelines + speaker notes

**Single source of truth dla finansów**:
- `docs/pitch/financial-projection.md` — pełna kalkulacja P&L Y1–Y3 + scenariusze +
  sensitivity. **Wszystkie liczby finansowe na slajdzie 8 i backup-slides 11–13
  muszą być zgodne z tym dokumentem.** Jeśli widzisz rozbieżność z
  `pitch-deck-content.md`, uznaj `financial-projection.md` za authoritative.

**Wsparcie kontekstowe**:
- `docs/pitch/qa-preparation.md` — kontekst Q&A (nie używasz w pitch'u, ale
  pomocne przy zrozumieniu narracji)
- `docs/pitch/evaluation-criteria-cheatsheet.md` — mapowanie slajdów na kryteria
  formularza komisji
- `docs/decisions/001-project-marketplace.md` — decyzje architektoniczne (kontekst)

**Skill obowiązkowy**:
- `pptx` skill — `~/.claude/skills/pptx/SKILL.md` (czytaj przed budową)

Powodzenia.
