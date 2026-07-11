# SkillBridge AI — Product Requirements Document

> **PIVOT NOTICE (May 2026):** Micro-courses have been replaced by the **Project Marketplace** —
> real-world projects graduated L1-L5 from open data and OSS. AI now serves as matchmaker,
> brief writer, and reviewer. Students earn **Verified Project Receipts** in their Passport.
> See `docs/decisions/001-project-marketplace.md` for full decision document.
> References to "mikro-kursy" below are historical and reflect the original design.

## 1. Executive Summary

SkillBridge AI to platforma edtech, która w czasie rzeczywistym mapuje kompetencje studentów uczelni wyższych na wymagania rynku pracy, automatycznie wykrywa luki kompetencyjne i generuje spersonalizowane mikro-ścieżki nauki. Głównym użytkownikiem jest student (18–26 lat) sfrustrowany brakiem połączenia między programem studiów a oczekiwaniami pracodawców. Drugorzędnym użytkownikiem jest wykładowca/dziekan, który potrzebuje danych o aktualności swojego programu vs. rynek. Produkt powstaje w kontekście konkursowym (Grupa Merito — 14 uczelni, 100k+ studentów, 11 miast w Polsce) i łączy trzy elementy, których nikt dotąd nie połączył: przenośny Paszport Kompetencji (osobisty asset studenta), real-time market intelligence oparty o AI, oraz marketplace realnych projektów graduowanych L1-L5 (open data + OSS), recenzowanych przez AI, z Verified Project Receipts w Paszporcie Kompetencji. Sukces MVP oznacza, że student przechodzi pełny flow od uploadu sylabusa do wygenerowania Paszportu Kompetencji i podzielenia się nim z potencjalnym pracodawcą.

---

## 2. Problem Statement

### Konkretny problem

Studenci uczelni wyższych nie rozumieją związku między tym, czego się uczą, a tym, czego oczekuje rynek pracy. Pytanie „po co mi to?" zabija zaangażowanie i prowadzi do drop-outu. Jednocześnie uczelnie aktualizują programy co 3–5 lat, a rynek (szczególnie w branży tech/AI) zmienia się co kwartał.

### Kto tego doświadcza

Studenci kierunków informatycznych, biznesowych i technicznych w Polsce (18–26 lat), szczególnie na uczelniach Grupy Merito. Doświadczają tego problemu codziennie — przy wyborze przedmiotów, planowaniu kariery, szukaniu staży i pierwszej pracy.

### Jak radzą sobie dziś

Studenci samodzielnie przeglądają oferty pracy na JustJoin.it czy Pracuj.pl, próbując ręcznie dopasować swoje umiejętności. Wykładowcy nie mają żadnego narzędzia do porównania programu z rynkiem — opierają się na intuicji i własnym doświadczeniu. Oba podejścia są czasochłonne, subiektywne i nieaktualne.

### Dlaczego teraz

Trzy czynniki tworzą okno możliwości. Po pierwsze, AI (Claude API) pozwala na automatyczne parsowanie sylabusów i analizę ofert pracy w skali, która wcześniej wymagała zespołu analityków. Po drugie, trend „skills-based hiring" powoduje, że pracodawcy coraz częściej patrzą na konkretne kompetencje zamiast nazwy dyplomu. Po trzecie, kontekst konkursowy (EduTech Masters / Grupa Merito) daje dostęp do 100k+ potencjalnych użytkowników i waliduje product-market fit.

### Dowody

- 65% studentów w Polsce deklaruje brak zrozumienia, jak ich program łączy się z rynkiem pracy (badania Deloitte, „First Steps into the Labour Market").
- Dyplomy tracą na wartości — 72% rekruterów IT w Polsce bardziej ceni portfolio/certyfikaty niż tytuł uczelni (raport Bulldogjob 2024).
- Uczelnie Grupy Merito prowadzą 1000+ kierunków w 11 miastach — skala problemu jest ogromna.

---

## 3. Target Users

### Persona 1: Student — „Kasia, studentka 3. semestru Informatyki"

- **Rola**: Studentka uczelni Merito w Warszawie, 20 lat
- **Kontekst**: Korzysta z aplikacji na laptopie i telefonie, głównie wieczorami po zajęciach lub w weekendy. Szuka stażu na lato, czuje się zagubiona w wyborze specjalizacji.
- **Cel główny**: Chce wiedzieć, czy to, czego się uczy, przygotowuje ją do pracy jako Data Analyst, i co musi dorobić we własnym zakresie.
- **Pain points**: Nie wie, które przedmioty naprawdę się przydadzą. Przeglądanie ofert pracy ręcznie jest frustrujące — nie rozumie połowy wymagań. Nie ma jednego miejsca, gdzie mogłaby pokazać pracodawcy swoje kompetencje poza CV.

### Persona 2: Wykładowca — „dr Tomasz, kierownik katedry informatyki"

- **Rola**: Wykładowca i członek rady programowej na uczelni Merito w Poznaniu, 45 lat
- **Kontekst**: Korzysta z panelu na komputerze stacjonarnym w biurze. Raz na semestr przegląda aktualność programu nauczania.
- **Cel główny**: Chce wiedzieć, czy program jego kierunku jest aktualny vs. rynek pracy i jakie moduły powinien dodać/zmienić.
- **Pain points**: Brak danych — bazuje na intuicji i anegdotach. Proces akredytacji wymaga dowodów na aktualność programu, ale nie ma narzędzia, które by je dostarczało.

---

## 4. Product Vision & Goals

### Wizja produktu

SkillBridge AI daje każdemu studentowi spersonalizowaną, opartą na danych odpowiedź na pytanie „po co mi to?" — i konkretną ścieżkę do zamknięcia luk między jego wiedzą a wymaganiami rynku.

### Czym ten produkt NIE jest

- **Nie jest platformą kursową** (jak Udemy/Coursera) — mikro-kursy są mostem do istniejących zasobów, nie zamiennikiem platform edukacyjnych.
- **Nie jest portalem pracy** (jak JustJoin.it) — nie pośredniczy w rekrutacji, analizuje rynek jako źródło danych o kompetencjach.
- **Nie jest systemem LMS** (jak Moodle) — nie zarządza zajęciami, ocenami ani materiałami dydaktycznymi uczelni.
- **Nie jest narzędziem do tworzenia CV** — Paszport Kompetencji to portfolio umiejętności, nie formatka CV.

---

## 5. Success Metrics

### Leading Indicators (mierzalne w ciągu dni/tygodni od launchu)

| Metryka | Target | Metoda pomiaru | Checkpoint |
|---------|--------|----------------|------------|
| Rejestracje studentów | 50 w pierwszym tygodniu (w kontekście konkursu) | Liczba rekordów w tabeli `students` | Dzień 7 |
| Activation rate (ukończony onboarding + wygenerowana Skill Map) | >60% zarejestrowanych | Stosunek studentów z ≥1 skill map do zarejestrowanych | Dzień 14 |
| Generowanie mikro-kursów | Średnio ≥2 mikro-kursy na aktywnego studenta | Liczba wpisów w `micro_courses` / aktywni studenci | Dzień 14 |
| Share rate Paszportu | >20% studentów udostępnia publiczny link | Unikalne wizyty na `/passport/[id]` vs. liczba paszportów | Dzień 21 |
| Task completion: onboarding | >80% użytkowników kończy 3-krokowy formularz | Drop-off rate między krokami | Dzień 7 |

### Lagging Indicators (tygodnie/miesiące)

| Metryka | Target | Metoda pomiaru | Checkpoint |
|---------|--------|----------------|------------|
| Retencja 7-dniowa | >30% wraca w ciągu tygodnia | Session tracking (Vercel Analytics) | Miesiąc 1 |
| Ukończenie mikro-kursów | >40% rozpoczętych kursów oznaczonych jako ukończone | Stosunek `completed: true` do total w `micro_courses` | Miesiąc 1 |
| NPS od studentów | >40 | Prosty formularz po 7 dniach użytkowania | Miesiąc 1 |
| Zainteresowanie uczelni | ≥3 wykładowców aktywnie używa panelu | Unikalne loginy do `/faculty` | Miesiąc 2 |

---

## 6. User Stories

### Student

| # | User Story | Priorytet |
|---|-----------|-----------|
| S1 | Jako student chcę wgrać sylabus swojego kierunku, żeby system automatycznie rozpoznał moje kompetencje. | Must Have |
| S2 | Jako student chcę zobaczyć interaktywną mapę kompetencji (Skill Map), żeby zrozumieć, co umiem, czego się uczę i czego mi brakuje. | Must Have |
| S3 | Jako student chcę zobaczyć analizę luk kompetencyjnych posortowaną wg priorytetów, żeby wiedzieć, co uzupełnić w pierwszej kolejności. | Must Have |
| S4 | Jako student chcę otrzymać spersonalizowany mikro-kurs zamykający lukę kompetencyjną, żeby mieć konkretną ścieżkę nauki, a nie tylko listę braków. | Must Have |
| S5 | Jako student chcę mieć Paszport Kompetencji z unikalnym linkiem, żeby podzielić się nim z potencjalnym pracodawcą. | Must Have |
| S6 | Jako student chcę eksportować Paszport do PDF, żeby załączyć go do aplikacji o staż/pracę. | Should Have |
| S7 | Jako student chcę przy każdym przedmiocie z sylabusa zobaczyć wyjaśnienie „dlaczego to ważne" z konkretnymi ofertami pracy, żeby czuć motywację do nauki. | Should Have |
| S8 | Jako student chcę widzieć listę trending skills, żeby wiedzieć, w co warto inwestować czas. | Could Have |
| S9 | Jako student chcę oznaczać mikro-kursy jako ukończone, żeby widzieć swój postęp w Paszporcie. | Must Have |
| S10 | Jako student chcę edytować listę rozpoznanych kompetencji po parsowaniu sylabusa, żeby poprawić ewentualne błędy AI. | Should Have |

### Wykładowca

| # | User Story | Priorytet |
|---|-----------|-----------|
| W1 | Jako wykładowca chcę zobaczyć heatmapę dopasowania mojego kierunku do wymagań rynku, żeby wiedzieć, które przedmioty są aktualne. | Must Have |
| W2 | Jako wykładowca chcę zobaczyć top 5 brakujących kompetencji na moim kierunku, żeby wiedzieć, co dodać do programu. | Must Have |
| W3 | Jako wykładowca chcę otrzymać sugestie AI o brakujących modułach, żeby mieć konkretne argumenty na radzie programowej. | Should Have |
| W4 | Jako wykładowca chcę widzieć dane agregowane (zanonimizowane) z Paszportów studentów mojego kierunku. | Could Have |

---

## 7. Feature Specification

### 7.1 Onboarding — Profil studenta + Parser sylabusa

- **Description**: Trzystopniowy formularz rejestracji studenta z automatycznym parsowaniem sylabusa przez AI.
- **User stories**: S1, S10
- **Priority**: Must Have
- **Acceptance criteria**:
  - Given student otwiera `/onboarding`, when wypełnia krok 1 (imię, email, uczelnia z dropdown Merito, kierunek, semestr), then dane walidowane (email poprawny, semestr 1–10) i przechodzi do kroku 2.
  - Given student jest w kroku 2, when wybiera cel kariery z dropdown (np. Data Analyst, Frontend Developer, UX Designer + pole custom), then przechodzi do kroku 3.
  - Given student jest w kroku 3, when wkleja tekst sylabusa lub uploaduje PDF (max 10 MB), then AI parsuje dokument i zwraca listę 15–40 kompetencji w <30 sekund.
  - Given AI zwróciło listę kompetencji, when student przegląda wyniki, then może dodać, usunąć lub edytować nazwy kompetencji przed zatwierdzeniem.
  - Given student zatwierdza kompetencje, when klika „Zapisz", then profil + kompetencje zapisują się do bazy, student zostaje przekierowany do `/dashboard`.
  - Given student uploaduje plik nie-PDF lub >10 MB, when system go wykryje, then wyświetla czytelny komunikat błędu.
  - Given Claude API nie odpowiada w ciągu 60s, when timeout nastąpi, then student widzi „Spróbuj ponownie za chwilę" z przyciskiem retry.
- **Notes**: Upload PDF wymaga server-side text extraction. W MVP wystarczy textarea jako alternatywa. Cele kariery w dropdown: Data Analyst, Data Scientist, Frontend Developer, Backend Developer, Full-stack Developer, UX/UI Designer, Project Manager, DevOps Engineer, Cybersecurity Analyst + „Inne (wpisz)".

### 7.2 Skill Map — Interaktywna wizualizacja kompetencji

- **Description**: Interaktywny graf (React Flow) mapujący kompetencje studenta (z sylabusa) vs. wymagania rynku pracy. Węzły kolorowane wg statusu, kliknięcie otwiera panel szczegółów.
- **User stories**: S2
- **Priority**: Must Have
- **Acceptance criteria**:
  - Given student otwiera Skill Map, when dane są załadowane, then wyświetla się graf z minimum 15 węzłami.
  - Given węzeł ma status `acquired`, when jest renderowany, then jest zielony. `in_progress` → żółty. `missing` → czerwony.
  - Given student klika na węzeł, when panel boczny się otwiera, then widzi: nazwę kompetencji, źródło (sylabus/rynek), % ofert pracy wymagających tej kompetencji, listę przykładowych ofert (tytuł, firma, widełki).
  - Given student klika na czerwony węzeł, when panel się otwiera, then widzi przycisk „Zamknij tę lukę" prowadzący do generatora mikro-kursu.
  - Given graf ma >30 węzłów, when student używa zoom/pan/minimap, then nawigacja jest płynna (>30 FPS).
  - Given student otwiera Skill Map na telefonie, when ekran jest <768px, then graf automatycznie się skaluje (lub przełącza na widok listy).
- **Notes**: Krawędzie między węzłami reprezentują powiązania kompetencyjne (np. „Python" → „pandas" → „Analiza danych"). Powiązania generowane przez AI w momencie tworzenia Skill Map. React Flow obsługuje custom nodes, zoom, pan i minimap out-of-the-box.

### 7.3 Gap Analysis — Analiza luk kompetencyjnych

- **Description**: Lista brakujących kompetencji posortowana wg priorytetów (critical / important / nice-to-have) z kontekstem rynkowym i linkami do mikro-kursów.
- **User stories**: S3, S7
- **Priority**: Must Have
- **Acceptance criteria**:
  - Given student otwiera Gap Analysis, when dane są załadowane, then widzi minimum 5 luk kompetencyjnych.
  - Given luka ma priorytet `critical`, when jest wyświetlana, then ma czerwone oznaczenie i jest na górze listy.
  - Given każda luka, when jest wyświetlana, then zawiera: nazwę kompetencji, priorytet, „wymaga tego X% ofert na stanowisko [cel kariery]", szacowany czas nauki w godzinach, przycisk „Zamknij tę lukę".
  - Given student klika „Dlaczego to ważne?" przy przedmiocie z sylabusa, when AI generuje odpowiedź, then tekst zawiera min. 3 konkretne zawody, 3 zadania w pracy i widełki płacowe. Tekst po polsku, 150–250 słów.
  - Given dane nie są jeszcze gotowe (AI pracuje), when student widzi stronę, then wyświetla się skeleton loader z komunikatem „Analizujemy Twoje dane — to może potrwać do 30 sekund…"
- **Notes**: Gap Analysis zależy od dwóch źródeł: kompetencji studenta (z parsera sylabusa) i wymagań rynku (z market intelligence). Oba muszą być gotowe.

### 7.4 Generator mikro-kursów

- **Description**: Dla każdej luki kompetencyjnej AI generuje spersonalizowany mikro-kurs (15–30 min) z krokami, ćwiczeniami, zasobami i mini-projektem.
- **User stories**: S4, S9
- **Priority**: Must Have
- **Acceptance criteria**:
  - Given student klika „Zamknij tę lukę" w Gap Analysis, when AI generuje mikro-kurs, then kurs zawiera 3–5 kroków (każdy max 200 słów), min. 3 linki do darmowych zasobów, 1 mini-projekt i szacowany czas.
  - Given mikro-kurs jest wyświetlony, when student przegląda kroki, then każdy krok ma tytuł, treść (markdown), opcjonalne ćwiczenie praktyczne.
  - Given zasoby w mikro-kursie, when student je przegląda, then każdy link prowadzi do realnego, darmowego zasobu (YouTube, dokumentacja, Google Colab).
  - Given student oznacza mikro-kurs jako „ukończony", when status się zmieni, then kompetencja w Paszporcie zmienia kolor z czerwonego na żółty (lub zielony, jeśli to jedyny brakujący element).
  - Given student ma kilka mikro-kursów, when otwiera listę kursów, then widzi progress bar i stosunek ukończonych do wszystkich.
  - Given Claude API zwraca błąd przy generowaniu kursu, when student widzi komunikat, then jest przycisk retry.
- **Notes**: Mikro-kursy generowane on-demand (nie pre-generowane). Jakość zależy od system promptu — prompt uwzględnia kontekst studenta (semestr, pokrewne kompetencje, cel kariery). Ćwiczenia muszą być wykonywalne bez instalowania oprogramowania (Google Colab, CodePen, online IDE).

### 7.5 Paszport Kompetencji

- **Description**: Cyfrowy, żywy dokument studenta — profil z listą kompetencji, progress bar pokrycia rynku, eksport PDF i publiczny link do udostępniania.
- **User stories**: S5, S6, S9
- **Priority**: Must Have
- **Acceptance criteria**:
  - Given student otwiera Paszport, when dane są załadowane, then widzi: imię, uczelnia, kierunek, semestr, cel kariery, progress bar „X% pokrycia wymagań rynkowych", listę kompetencji z badge'ami (zielony/żółty/czerwony).
  - Given student klika „Eksportuj PDF", when PDF się generuje, then plik ma profesjonalny layout z: nagłówkiem (SkillBridge AI), danymi studenta, listą kompetencji z kolorami, datą wygenerowania.
  - Given student klika „Kopiuj link", when link jest skopiowany, then prowadzi do `/passport/[uuid]` — publiczny, read-only widok.
  - Given pracodawca otwiera publiczny link Paszportu, when strona się ładuje, then widzi kompetencje studenta BEZ nawigacji dashboardu, z profesjonalnym layoutem i logo SkillBridge AI.
  - Given student ukończył mikro-kurs, when Paszport się odświeża, then badge zmienia kolor i progress bar się aktualizuje.
- **Notes**: UUID w linku publicznym — nie ujawnia danych wewnętrznych. Publiczny widok nie wymaga logowania.

### 7.6 Panel Uczelni

- **Description**: Dashboard dla wykładowców z heatmapą dopasowania programu do rynku, listą brakujących kompetencji i sugestiami AI.
- **User stories**: W1, W2, W3, W4
- **Priority**: Must Have (uproszczona wersja)
- **Acceptance criteria**:
  - Given wykładowca otwiera `/faculty/login`, when wpisuje poprawne hasło (shared password z env), then dostaje dostęp do panelu.
  - Given wykładowca jest w panelu, when dane są załadowane, then widzi heatmapę: lista przedmiotów kierunku × % pokrycia wymagań rynkowych (zielony >70%, żółty 40–70%, czerwony <40%).
  - Given heatmapa jest wyświetlona, when wykładowca przegląda dane, then widzi też „Top 5 brakujących kompetencji" z % ofert wymagających każdej.
  - Given sugestie AI, when są wyświetlone, then każda zawiera: „Rozważ dodanie modułu o [temat] — X% ofert na stanowisko [Y] tego wymaga."
  - Given mniej niż 3 studentów na kierunku, when dane są niewystarczające, then panel wyświetla komunikat „Za mało danych — zachęć studentów do korzystania z SkillBridge".
  - Given wykładowca wpisuje złe hasło, when klika „Zaloguj", then widzi komunikat „Nieprawidłowe hasło".
- **Notes**: Dane agregowane i zanonimizowane. W MVP wystarczy shared password — po konkursie migracja do OAuth. Heatmapa oparta na Recharts.

---

## 8. User Flows

### Flow 1: Onboarding nowego studenta

**Trigger**: Student klika „Stwórz swój Paszport" na landing page.

**Steps**:
1. Student widzi ekran powitalny z krótkim opisem procesu (3 kroki, ~5 minut) → klika „Zaczynamy".
2. Student wypełnia krok 1: imię, email, uczelnia (dropdown z 14 uczelni Merito), kierunek (tekst), semestr (1–10) → klika „Dalej".
3. Student wypełnia krok 2: cel kariery (dropdown z popularnymi stanowiskami + pole custom) → klika „Dalej".
4. Student wypełnia krok 3: wkleja tekst sylabusa do textarea LUB uploaduje PDF → klika „Analizuj sylabus".
5. System wyświetla loader „Analizujemy Twój sylabus…" (do 30 sekund).
6. System wyświetla listę rozpoznanych kompetencji (15–40). Student może dodać/usunąć/edytować → klika „Zatwierdź i utwórz Paszport".
7. System zapisuje dane → redirect do `/dashboard`.

**Success state**: Student ma profil, kompetencje z sylabusa i wygenerowany Paszport.

**Error states**: Upload PDF >10 MB → komunikat o limicie. AI timeout → retry button. Pusty sylabus → komunikat „Wklej tekst sylabusa lub prześlij PDF".

### Flow 2: Analiza luk i zamykanie ich mikro-kursem

**Trigger**: Student otwiera „Gap Analysis" w dashboardzie.

**Steps**:
1. Student widzi listę luk kompetencyjnych posortowaną wg priorytetów (critical na górze).
2. Student klika na lukę → widzi szczegóły: nazwa, % ofert wymagających, szacowany czas, kontekst rynkowy.
3. Student klika „Dlaczego to ważne?" → AI generuje wyjaśnienie z konkretnymi zawodami i ofertami.
4. Student klika „Zamknij tę lukę" → system generuje mikro-kurs (loader 10–20 sekund).
5. Student przegląda mikro-kurs: kroki z ćwiczeniami, zasoby, mini-projekt.
6. Student realizuje ćwiczenia (w zewnętrznych narzędziach — Google Colab, CodePen).
7. Student klika „Ukończ kurs" → kompetencja w Paszporcie zmienia status.

**Success state**: Luka kompetencyjna zamknięta, Paszport zaktualizowany.

**Error states**: AI nie może wygenerować kursu → retry + komunikat. Student nie ma żadnych luk (edge case) → komunikat „Gratulacje! Twój profil pokrywa wymagania rynku w X%".

### Flow 3: Udostępnianie Paszportu pracodawcy

**Trigger**: Student otwiera zakładkę „Paszport" w dashboardzie.

**Steps**:
1. Student widzi swój Paszport: dane osobowe, progress bar, lista kompetencji z badge'ami.
2. Student klika „Kopiuj link" → link `/passport/[uuid]` skopiowany do schowka, toast „Link skopiowany!".
3. Student wkleja link w email/LinkedIn/CV do pracodawcy.
4. Pracodawca otwiera link → widzi profesjonalny, read-only widok Paszportu bez logowania.
5. Alternatywnie: student klika „Eksportuj PDF" → plik się pobiera.

**Success state**: Pracodawca widzi kompetencje studenta w czytelnym formacie.

**Error states**: Nieprawidłowy UUID → strona 404 „Paszport nie został znaleziony". Paszport bez kompetencji → komunikat „Ten paszport nie ma jeszcze kompetencji".

### Flow 4: Wykładowca przegląda panel uczelni

**Trigger**: Wykładowca otwiera `/faculty/login`.

**Steps**:
1. Wykładowca wpisuje shared password → klika „Zaloguj".
2. System weryfikuje hasło → redirect do `/faculty`.
3. Wykładowca widzi heatmapę: lista przedmiotów swojego kierunku z % pokrycia rynku.
4. Wykładowca scrolluje do „Top 5 brakujących kompetencji" → widzi konkretne sugestie.
5. Wykładowca czyta sugestie AI: „Rozważ dodanie modułu o [temat]…"

**Success state**: Wykładowca ma dane do decyzji o aktualizacji programu.

**Error states**: Złe hasło → „Nieprawidłowe hasło" + retry. Brak danych studentów → „Za mało danych — zachęć studentów do korzystania z SkillBridge".

---

## 9. Screen Descriptions

### Screen: Landing Page (`/`)

- **Purpose**: Przedstawienie produktu i konwersja do rejestracji.
- **Key elements**: Nagłówek z logo SkillBridge AI, hero section z jednozdaniowym pitchem, 3 ikony prezentujące kluczowe wartości (Paszport, Market Intelligence, Mikro-kursy), sekcja „Jak to działa" (3 kroki), CTA button „Stwórz swój Paszport", footer z informacjami.
- **User actions**: Kliknięcie CTA → przejście do `/onboarding`.
- **Navigation**: Header z linkami: Strona główna, Jak to działa, Panel Uczelni, Zaloguj się.
- **States**: Brak stanów specjalnych — strona statyczna.

### Screen: Onboarding (`/onboarding`)

- **Purpose**: Zebranie danych studenta i sylabusa w 3 krokach.
- **Key elements**: Progress bar (krok 1/3, 2/3, 3/3), formularz z walidacją, przyciski „Wstecz"/„Dalej", w kroku 3 textarea + opcja upload PDF, po analizie — edytowalna lista kompetencji.
- **User actions**: Wypełnianie pól, nawigacja między krokami, upload/wklejanie sylabusa, edycja listy kompetencji, zatwierdzenie.
- **Navigation**: Wstecz do poprzedniego kroku, po zatwierdzeniu → `/dashboard`.
- **States**: Loading (analiza sylabusa — skeleton + komunikat), Error (AI timeout — retry button), Empty (brak kompetencji po parsowaniu — komunikat + sugestia wklejenia innego sylabusa).

### Screen: Dashboard — Strona główna (`/dashboard`)

- **Purpose**: Centralny hub studenta z podsumowaniem i nawigacją do sekcji.
- **Key elements**: Karta powitalna (imię, kierunek, cel kariery), mini progress bar Paszportu (X% completion), 4 kafelki nawigacyjne: Skill Map, Gap Analysis, Mikro-kursy, Paszport — każdy z liczbą (np. „5 luk", „2 ukończone kursy").
- **User actions**: Kliknięcie na kafelek → przejście do sekcji.
- **Navigation**: Sidebar lub top nav z linkami do wszystkich sekcji dashboardu.
- **States**: Loading (skeleton dla kafelków), Empty (nowy student — „Twoja Skill Map jest generowana, poczekaj chwilę…").

### Screen: Skill Map (`/dashboard/skill-map`)

- **Purpose**: Wizualne przedstawienie kompetencji studenta vs. wymagania rynku.
- **Key elements**: Interaktywny graf React Flow (węzły kolorowane + krawędzie), minimap w rogu, panel boczny (sheet/drawer) ze szczegółami wybranego węzła, legenda kolorów (zielony = masz, żółty = uczysz się, czerwony = brakuje).
- **User actions**: Zoom, pan, kliknięcie na węzeł (otwiera panel boczny), kliknięcie „Zamknij tę lukę" w panelu → generowanie mikro-kursu.
- **Navigation**: Powrót do dashboard, link do Gap Analysis z panelu bocznego.
- **States**: Loading (skeleton grafu), Error (AI błąd — retry), Empty (brak kompetencji — redirect do onboardingu).

### Screen: Gap Analysis (`/dashboard/gap-analysis`)

- **Purpose**: Lista luk kompetencyjnych z priorytetami i akcjami.
- **Key elements**: Lista kart, każda karta zawiera: nazwę luki, priorytet (badge critical/important/nice-to-have), „X% ofert wymaga", szacowany czas, przycisk „Zamknij tę lukę", rozwijana sekcja „Dlaczego to ważne?".
- **User actions**: Przeglądanie listy, rozwijanie „Dlaczego to ważne?", kliknięcie „Zamknij tę lukę" → generowanie mikro-kursu.
- **Navigation**: Powrót do dashboard, link do mikro-kursu po wygenerowaniu.
- **States**: Loading (skeleton kart), Error (AI błąd — retry), Empty (brak luk — komunikat gratulacyjny z % pokrycia).

### Screen: Mikro-kurs (`/dashboard/micro-courses` + widok kursu)

- **Purpose**: Przeglądanie i realizacja wygenerowanych mikro-kursów.
- **Key elements**: Lista kursów z progress bar i statusem (nie rozpoczęty / w trakcie / ukończony), widok pojedynczego kursu: kroki (accordion lub stepper), treść markdown, ćwiczenie, zasoby (lista linków), mini-projekt, przycisk „Ukończ kurs".
- **User actions**: Wybór kursu z listy, przeglądanie kroków, kliknięcie linków do zasobów, oznaczenie jako ukończony.
- **Navigation**: Powrót do listy kursów, powrót do Gap Analysis.
- **States**: Loading (generowanie kursu — loader), Empty (brak kursów — „Przejdź do Gap Analysis, żeby wygenerować pierwszy mikro-kurs").

### Screen: Paszport Kompetencji (`/dashboard/passport`)

- **Purpose**: Przeglądanie, eksport i udostępnianie Paszportu.
- **Key elements**: Karta profilu (imię, uczelnia, kierunek, cel kariery), progress bar completion, lista kompetencji z badge'ami (zielony/żółty/czerwony), przyciski „Eksportuj PDF" i „Kopiuj link".
- **User actions**: Przeglądanie, eksport PDF, kopiowanie linku, kliknięcie na kompetencję → szczegóły.
- **Navigation**: Powrót do dashboard.
- **States**: Loading (skeleton), Empty (brak kompetencji — redirect do onboardingu).

### Screen: Publiczny widok Paszportu (`/passport/[id]`)

- **Purpose**: Read-only widok dla pracodawców.
- **Key elements**: Logo SkillBridge AI, dane studenta (imię, uczelnia, kierunek), lista kompetencji z badge'ami, progress bar, data wygenerowania. BEZ nawigacji dashboardu, BEZ opcji edycji.
- **User actions**: Przeglądanie (read-only).
- **Navigation**: Link „Stwórz swój Paszport" na dole (CTA dla pracodawców/nowych studentów).
- **States**: 404 (nieprawidłowy UUID — „Paszport nie został znaleziony").

### Screen: Panel Uczelni — Login (`/faculty/login`)

- **Purpose**: Autoryzacja wykładowcy.
- **Key elements**: Logo, pole hasła, przycisk „Zaloguj".
- **User actions**: Wpisanie hasła, kliknięcie „Zaloguj".
- **Navigation**: Po sukcesie → `/faculty`.
- **States**: Error (złe hasło — komunikat „Nieprawidłowe hasło").

### Screen: Panel Uczelni — Dashboard (`/faculty`)

- **Purpose**: Przegląd aktualności programu kierunku vs. rynek.
- **Key elements**: Heatmapa (Recharts) — przedmioty × % pokrycia rynku (zielony >70%, żółty 40–70%, czerwony <40%), sekcja „Top 5 brakujących kompetencji", sekcja „Sugestie AI" z kartami rekomendacji.
- **User actions**: Przeglądanie heatmapy, czytanie sugestii, ewentualnie filtrowanie po kierunku/stanowisku.
- **Navigation**: Logout, powrót do landing page.
- **States**: Loading (skeleton), Empty (za mało danych — komunikat).

---

## 10. Non-Functional Requirements

### Wydajność

- Landing page: First Contentful Paint <1.5s, Lighthouse Performance Score >80.
- Parsowanie sylabusa (AI): response time <30s (z timeoutem 60s).
- Generowanie mikro-kursu (AI): response time <30s.
- Skill Map: płynna interakcja (>30 FPS) przy grafie do 50 węzłów.
- Eksport PDF: generowanie <5s.
- Publiczny widok Paszportu: ładowanie <2s.

### Bezpieczeństwo i prywatność

- RODO/GDPR: dane studentów przechowywane w EU (Neon region: eu-central-1).
- Hasła hashowane (bcrypt) — nigdy przechowywane w plaintext.
- Publiczny widok Paszportu pod UUID — nie da się zgadnąć linku.
- Panel wykładowcy: dane studenckie anonimizowane (brak imion/emaili).
- HTTPS enforced na Vercel.
- Zmienne środowiskowe (API keys, database URL) nigdy w kodzie — tylko `.env.local` / Vercel env.

### Dostępność

- WCAG 2.1 Level AA (podstawowe wymagania): kontrast kolorów, alt text na obrazkach, nawigacja klawiaturą.
- Kolorystyka Skill Map: oprócz kolorów, badge'e mają tekst statusu (dla daltonistów).

### Platformy i urządzenia

- Web-first: Chrome, Firefox, Safari, Edge (ostatnie 2 wersje).
- Responsive: mobile (360px+), tablet, desktop.
- Brak natywnej aplikacji mobilnej w MVP.

---

## 11. Dependencies & Timeline

### Hard deadlines

- ~~**Konkurs EduTech Masters**: **19 marca 2026** — 12 dni od dziś (7 marca).~~
  **ROZSTRZYGNIĘTE (2026-07-11): konkurs odbył się i został WYGRANY.** Deadline
  nieaktualny — projekt rozwijany dalej jako produkt, tempo dyktują przepustowość
  zespołu i jakość (decyzja Darka). Pozostałe wzmianki o deadlinie w tym PRD to
  kontekst historyczny fazy MVP.

### Zespół

- **Darek — solo developer z Claude Code** (agent teams, 4 równoległe LANE'y). Nie jest zawodowym programistą, ale aktywnie buduje SaaS-y z AI-assisted development.

### Zależności zewnętrzne

- **Anthropic Claude API**: Konto z API key i budżet ~$5–15 na MVP.
- **Neon**: Darmowy tier (0.5 GB storage, 190h compute).
- **Vercel**: Darmowy tier (wystarczający na demo/konkurs).
- **Dataset ofert pracy**: Jednorazowy run Apify scrapera JustJoin.it (~$5) lub ręczny scraping.
- **Syllabusy Merito**: Minimum 3–5 przykładowych sylabusów do testowania parsera. **⚠️ OPEN QUESTION: Czy mamy dostęp do realnych sylabusów?**

### Sugerowany fazowanie

| Faza | Czas | Zakres |
|------|------|--------|
| **Faza 1 — Fundament** | Dzień 1–3 | Setup projektu, schema bazy, CRUD API, auth, formularz onboardingu, parser sylabusa |
| **Faza 2 — Market Intelligence** | Dzień 4–6 | Dataset ofert, Skill Map (React Flow), Gap Analysis, „Dlaczego to ważne?" |
| **Faza 3 — Mikro-kursy + Paszport** | Dzień 7–9 | Generator mikro-kursów, widok kursów, Paszport (view + PDF + public link) |
| **Faza 4 — Panel Uczelni + Polish** | Dzień 10–11 | Dashboard wykładowcy, responsive, error handling, SEO |
| **Faza 5 — Testy + Deploy** | Dzień 12–13 | Testy z użytkownikami, fix bugów, deploy na Vercel, dokumentacja |

---

## 12. Risks & Open Questions

### Known Risks

| Ryzyko | Impact | Mitygacja |
|--------|--------|-----------|
| Jakość parsowania sylabusów przez AI — syllabusy Merito mogą mieć niestandardowy format | High | Przygotować 5+ przykładowych sylabusów do tuningu promptu. Dać studentowi opcję edycji wyników. |
| Koszty Claude API mogą rosnąć przy dużej liczbie użytkowników | Medium | Cache AI (tabela `ai_cache` z hash promptu). Nie generować tego samego dwa razy. Budget cap w Anthropic dashboard. |
| Statyczny dataset ofert pracy szybko się dezaktualizuje | Medium | Jasna komunikacja w UI: „Dane rynkowe z [miesiąc/rok]". Post-MVP: cron job z Apify co tydzień. |
| React Flow performance przy dużych grafach (>100 węzłów) | Low | Limitować graf do 50 węzłów (top kompetencje). Lazy loading szczegółów. |
| Studenci nie wrócą po pierwszym użyciu (niska retencja) | High | Mikro-kursy + tracking postępów jako hook do powrotu. Opcjonalnie: email reminder z postępem. |

### Open Questions

| Pytanie | Owner | Blocking? |
|---------|-------|-----------|
| ~~Jaka jest dokładna data deadline konkursu EduTech Masters?~~ | Darek | ✅ RESOLVED — **19 marca 2026** |
| ~~Kto buduje MVP — Darek solo z Claude Code czy jest zespół?~~ | Darek | ✅ RESOLVED — Solo z Claude Code |
| Czy mamy dostęp do realnych sylabusów uczelni Merito do testów? | Darek | YES — bez tego parser nie będzie przetestowany |
| Czy lepiej NextAuth v5 czy better-auth? (better-auth lżejsze, lepsze DX z Drizzle) | Engineering | NO — można zdecydować w trakcie Fazy 1 |
| Czy potrzebujemy dark mode w MVP? | Darek | NO — nice-to-have |
| Jak wygląda formularz zgłoszeniowy EduTech Masters? Jakie materiały potrzebujemy? | Darek | NO — ale dobrze wiedzieć wcześniej |

### Parking Lot (dobre pomysły, ale poza MVP)

- Real-time scraping ofert pracy (cron job co tydzień)
- OAuth (Google/Microsoft) zamiast credentials
- Integracja z LMS (Moodle, Canvas)
- Mobile app (React Native)
- AI chat „zapytaj o swoją karierę"
- Gamification (achievements, leaderboard)
- API dla pracodawców do weryfikacji Paszportów
- Blockchain-based credential verification
- A/B testing mikro-kursów
- Wielojęzyczność (EN, DE, ES)

---

## 13. MVP Scope Recommendation

### Phase 1 — MVP (13 dni, kontekst konkursowy)

Budujemy najwęższy scope, który waliduje core hypothesis: **„Studenci chcą widzieć związek między swoim programem a rynkiem pracy, i są skłonni używać narzędzia, które ten związek pokazuje i pomaga zamykać luki."**

MVP zawiera:

- Onboarding z parserem sylabusa (AI)
- Skill Map — interaktywny graf kompetencji (React Flow)
- Gap Analysis z priorytetami + „Dlaczego to ważne?"
- Generator mikro-kursów (on-demand, AI)
- Paszport Kompetencji (view + PDF + public link)
- Panel Uczelni (uproszczony, shared password)

### Phase 2 — Post-konkurs (1–2 miesiące)

- Real-time scraping ofert (Vercel cron + Apify)
- Pełna auth z OAuth
- Rozbudowany panel uczelni (filtrowanie, eksport raportów)
- Email notifications (postęp, nowe luki, trending skills)
- Testowanie z większą grupą (50+ studentów)

### Phase 3 — Skalowanie (3–6 miesięcy)

- Elementy z parking lot
- Integracja z LMS
- API dla pracodawców
- Mobile app

### Dlaczego ten podział

MVP celuje w jedno: **zrobić wrażenie na jury konkursu (deadline: 19 marca) i zebrać feedback od realnych studentów**. Wszystkie 4 warstwy (Paszport, Market Intelligence, Mikro-kursy, Panel Uczelni) są obecne, ale w minimalnej formie. Statyczny dataset ofert zamiast real-time scrapingu. Shared password zamiast OAuth. Generowanie on-demand zamiast pre-generowanych kursów. Buduje jedna osoba (Darek) z Claude Code i agent teams — to pozwala na 4 równoległe LANE'y pracy, co daje efektywność zbliżoną do małego zespołu. 12 dni do deadline — tight, ale realne z AI-assisted development.
