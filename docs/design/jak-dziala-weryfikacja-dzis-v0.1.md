# Jak dziś działa ocena zgłoszeń studenta — stan faktyczny

**Wersja:** v0.1 · 2026-06-29 · autorzy: Ethan (CTO) + Leo (Tech Lead)
**Dla:** Darek (CEO). Dokument opisowy, bez zmian w kodzie. Podstawa decyzji o głębi weryfikacji.

> **Jedno zdanie na start:** dzisiaj model AI ocenia projekt studenta **nie widząc ani jednej linijki jego kodu ani treści pracy** — dostaje tylko adres repozytorium i cztery suche pola opisowe z GitHuba.

## 1. Co student oddaje
Adres internetowy do swojej pracy: link do repozytorium na GitHubie (kod) i/lub link do notatnika (*notebook* — interaktywny dokument z kodem i opisem, np. Google Colab / Kaggle). Opcjonalnie kilka dodatkowych linków.

## 2. Co AI faktycznie dostaje na wejściu
Funkcja oceniająca (`reviewSubmission`) buduje dla modelu tekst złożony **wyłącznie** z poniższych elementów:

- **Tytuł i opis projektu** — z naszego katalogu, nie od studenta.
- **Kryteria oceny (rubryka)** — z naszego katalogu (patrz pkt 3).
- **Adres repozytorium** jako goły tekst (np. `github.com/jan/projekt`).
- **Adres notatnika** jako goły tekst.
- **Cztery pola opisowe (metadane) repozytorium pobrane z GitHub API:**
  1. pełna nazwa repozytorium,
  2. język programowania wykryty automatycznie przez GitHub,
  3. data utworzenia repozytorium,
  4. data ostatniego wgrania zmian (*last push*).

**Czy AI czyta treść kodu? NIE.** **Czy czyta treść notatnika? NIE** — adres notatnika jest tylko przepisany do tekstu, nasz system nigdzie go nie otwiera. Pobieramy jeden raz cztery powyższe pola z GitHuba i tyle. Nie pobieramy listy plików, liczby ani historii commitów (*commit* — pojedynczy zapis zmiany), nie pobieramy zawartości żadnego pliku. (Potwierdzone w `src/lib/ai/review-submission.ts`, jedyne zapytanie sieciowe to `fetchGithubRepoMeta`; brak pobierania treści potwierdzają też testy SSRF w `__tests__/review-submission.test.ts`.)

## 3. Jak powstaje werdykt
Rubryka (`rubricJson` w `tools/content/cyber-projects-partia-1.json`) to lista kryteriów z wagami procentowymi i opisem, np. „Zapytania wykrywające zdarzenia bezpieczeństwa (waga 30%): repozytorium z min. trzema zapytaniami…”. Model (Claude Sonnet 4.6) dostaje tę listę i jest proszony, by ocenić każde kryterium 0–100, policzyć średnią ważoną jako wynik ogólny i napisać 3–5 zdań komentarza. **Problem:** rubryka opisuje, co powinno być **w środku pracy**, ale model środka nie widzi — więc „ocenia” zgodność z kryteriami w praktyce zgadując na podstawie samego adresu i czterech metadanych. Werdykt końcowy (`route.ts`): „zweryfikowane” gdy wynik ≥ 70, ryzyko ściągania < 0,5 i ocenione ≥ 3 kryteria; „odrzucone” gdy wynik < 30; reszta „złożone”.

## 4. Wskaźnik ryzyka ściągania (`cheatRiskScore`, 0,0–1,0)
**Nie jest liczony żadnym algorytmem.** To liczba, którą **sam model zgaduje**, kierując się jedną wskazówką wpisaną w polecenie: „nowe repo, brak historii commitów = wyższe ryzyko”. W praktyce opiera się więc tylko na dacie utworzenia i dacie ostatniej zmiany repozytorium. Nie ma porównania z innymi pracami, nie ma wykrywania plagiatu, nie ma analizy historii zmian — bo tych danych w ogóle nie pobieramy.

## 5. Uczciwa diagnoza
Dzisiejsze „zaliczone” **nie znaczy „student umie”** — znaczy najwyżej „podał link do repozytorium, które wygląda wiarygodnie po nazwie, języku i dacie”. Cała ocena opiera się na metadanych i pozorach, a nie na rzeczywistej pracy: model nie sprawdza, czy kod w ogóle istnieje, czy się uruchamia, czy robi to, co miał, ani czy notatnik zawiera cokolwiek sensownego. Luka jest fundamentalna — student może wskazać pusty lub całkowicie niezwiązany projekt i przy „dojrzałej” dacie repozytorium dostać status „zweryfikowane”. Wskaźnik ryzyka ściągania daje fałszywe poczucie kontroli: nie wykrywa plagiatu, bo nie ma z czym porównywać.

## 6. Trzy opcje naprawy (bez rekomendacji — decyzja Darka)

**(a) Pobierać i czytać treść pracy.** System ściąga zawartość repozytorium / notatnika i podaje modelowi rzeczywisty kod i opisy do oceny.
- *Koszt:* średni — kod do pobierania plików, limity rozmiaru, obsługa różnych źródeł, wyższy rachunek za AI (więcej tekstu = drożej).
- *Ryzyko:* bezpieczeństwo (wykonujemy/parsujemy cudzą treść), prywatne lub gigantyczne repozytoria, model dalej nie *uruchamia* kodu — ocenia, czy „wygląda na działający”, nie czy działa.

**(b) Wymagać od studenta twardych metryk wyniku, sprawdzanych automatycznie.** Student podaje konkretny, mierzalny rezultat (np. liczbę wykrytych zdarzeń, dokładność modelu), a my porównujemy go z oczekiwaniem.
- *Koszt:* wysoki jednorazowo — trzeba zaprojektować mierzalne kryterium **per projekt** i mechanizm sprawdzania; nie każdy projekt da się tak ująć.
- *Ryzyko:* student może wpisać metrykę „z palca”; sprawdzalność realna tylko tam, gdzie wynik da się odtworzyć po naszej stronie.

**(c) Człowiek w pętli (*human-in-the-loop*).** Wykładowca/ekspert ogląda pracę i ma ostatnie słowo, AI tylko wstępnie sortuje (zgodne z filozofią produktu, CLAUDE.md sekcja 7).
- *Koszt:* niski technicznie, wysoki operacyjnie — potrzebny czas człowieka przy każdym (lub spornym) zgłoszeniu, nie skaluje się przy dużej liczbie studentów.
- *Ryzyko:* wąskie gardło i koszt rosnący liniowo z liczbą zgłoszeń; za to jedyna opcja dająca realną pewność „umie / nie umie”.

*Opcje nie wykluczają się — np. (a) + (c) razem są spójne z filozofią produktu.*
