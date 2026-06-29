# SkillBridge — redesign weryfikacji zgłoszeń (ocena oparta na treści)

**Wersja:** v0.3 · 2026-06-29 — decyzja Darka: **werdykt maszyny obowiązuje samodzielnie, platforma samowystarczalna od dnia 1; ocena człowieka = opcjonalne potwierdzenie premium.** Zgłoszony konflikt z CLAUDE.md §7 / USP do świadomego pogodzenia (§IV.7). (v0.2 — model dwuetapowy + człowiek nie musi być specjalistą domenowym. v0.1 — pierwsza specyfikacja: §I/§II/§III.)
Dyrektywa Darka (CEO, perspektywa wykładowcy akademickiego i odpowiedzialności za jakość kształcenia), sesja Oliver, 2026-06-29.
**Status:** wymagania zatwierdzone przez Darka → wejście do fazy designu technicznego (Ethan/Leo) + pedagogicznego (Sophia) + bramy RODO (Ryan).
**Zastępuje:** mechanizm oceny opisany w `docs/design/jak-dziala-weryfikacja-dzis-v0.1.md` (diagnoza stanu zastanego: ocena „po okładce", nie po treści).
**Wpływ na framework E3:** odwraca decyzję §5 frameworku (`docs/product/...` w repo operating-system) — człowiek w pętli (wykładowca) wchodzi do architektury OD POCZĄTKU jako pętla ratunkowa, nie „dopiero po walidacji produktu". AI pełni rolę bramkarza.

---

## 0. Diagnoza, którą to naprawia

Stan zastany (v0.1 oceny): model AI wystawia werdykt **nie widząc ani jednej linijki kodu studenta** — dostaje tylko adres repozytorium + cztery pola metadanych z GitHuba (nazwa, wykryty język, daty). Werdykt „zweryfikowane" opiera się na pozorach; wskaźnik ryzyka ściągania jest zgadywany przez model z dwóch dat. Student może wskazać puste lub niezwiązane repozytorium z „dojrzałą" datą i przejść jako zweryfikowany. To **akademicka fikcja** — ocena za okładkę, bez zaglądania do książki. Cała warstwa AI jest z edukacyjnego punktu widzenia bezużyteczna, dopóki nie widzi faktycznej pracy.

**Decyzja Darka:** wdrażamy **hybrydę: (a) analiza faktycznej treści + (c) człowiek w pętli**, w dwóch etapach:

- **Etap 1 — maszyna ocenia w CAŁOŚCI + feedback dla studenta.** Maszyna przeprowadza pełną ocenę (kroki §II.1–4) i zwraca studentowi konkretny, formujący feedback: co zrobione dobrze, czego brakuje, dlaczego — z dowodami. To nie jest „bramkarz przepuszczający większość", lecz pełna ocena formująca. **Powód:** dla wielu użytkowników platformy maszyna zastępuje mentora domenowego, którego nie mają.
- **Etap 2 — ocena człowieka jako potwierdzenie PREMIUM (opcjonalne).** Werdykt maszyny z Etapu 1 **obowiązuje samodzielnie** — platforma jest samowystarczalna od dnia 1. Ocena przez człowieka to **dodatkowa, płatna warstwa potwierdzenia**, nie wymagana brama. Decyzja Darka 2026-06-29: „Musimy od początku budować platformę samowystarczalną."

**⚠️ Konflikt do rozstrzygnięcia (CLAUDE.md §7 / USP) — patrz §IV.7.** „Werdykt maszyny obowiązuje sam" stoi w sprzeczności z konstytucją §7 („AI nie jest autonomicznym sędzią; człowiek ma ostatnie słowo") i z USP marketingowym. Wymaga świadomego pogodzenia (rekomendacja: rozdzielić ocenę formującą — AI samowystarczalne — od kredencjału wysokiej stawki — człowiek/premium). Edycja CLAUDE.md = sign-off Darka w Plan Mode.

**Twarda zasada (założenie brzegowe):** człowiek oceniający w Etapie 2 **NIE może być wymagany jako specjalista domenowy.** Trzeba brać pod uwagę użytkowników bez dostępu do ekspertów w danej dziedzinie. Raport maszyny musi być samowystarczalny i poparty dowodami (cytaty z kodu, wynik testów twardych, sygnały ściągania) na tyle, by decyzję podjął człowiek bez wiedzy eksperckiej. Platforma niesie ekspertyzę, człowiek niesie osąd i odpowiedzialność.

System musi być wiarygodny, sprawiedliwy i odporny na manipulację — niezależnie od domeny projektu (analiza danych w Pythonie, aplikacja webowa, skrypt cyberbezpieczeństwa, dokument/analiza GRC).

---

## I. Założenia brzegowe (fundamenty wiarygodności)

1. **Zasada pełnej widoczności (konieczność opcji „a").** AI nie ocenia kryteriów, których nie widzi. System pobiera (np. przez GitHub API) i przetwarza zawartość kluczowych plików: kod (`.py`, `.js` itd.), pliki konfiguracyjne (`package.json`, `requirements.txt`), dokumentację (`README.md`).
2. **Rozdzielenie analizy twardej (deterministycznej) od miękkiej (semantycznej).** Model językowy (LLM) jest świetny w ocenie stylu, logiki i czytelności, ale zły w deterministycznym „czy kod się uruchamia". Ocena = testy mechaniczne (bez AI) + ocena miękka (AI).
3. **Standaryzacja wejścia (dla różnych domen).** Każdy projekt — niezależnie od tematu — ma `README.md` o ustandaryzowanej strukturze (**Cel · Uruchomienie · Wnioski**) oraz wyraźnie wskazany plik wejściowy (np. `main.py`, `index.js`). Dla projektów nie-kodowych (dokument/analiza) — odpowiednik: wskazany plik-deliverable i kryteria twarde właściwe dla typu (patrz §II.2, rozszerzenie nordsignal).
4. **Maszyna niesie ekspertyzę domenową; człowiek w pętli nie musi być specjalistą.** Trzeba projektować pod użytkowników bez dostępu do specjalisty domenowego. Pełna ocena maszynowa + formujący feedback (Etap 1) zastępują mentora, którego wielu nie ma. Raport maszyny (rekomendacja, dowody, cytaty, wynik testów twardych, sygnały ściągania) musi być na tyle samowystarczalny, by ocenę końcową (Etap 2) podjął człowiek bez wiedzy eksperckiej w danej dziedzinie.

---

## II. Wieloetapowy proces oceny (pipeline)

Ocena to **potok**, nie pojedyncze zapytanie do modelu. Każdy krok zależy od powodzenia poprzedniego.

1. **Ekstrakcja i filtrowanie (pobranie treści) — automatyka, bez AI.**
   System autoryzuje się w repozytorium, pobiera strukturę plików, ignoruje pliki binarne, obrazy i biblioteki (`node_modules`, `.venv`). Skleja pliki źródłowe w jeden ustrukturyzowany dokument (z limitem rozmiaru pod okno kontekstu modelu), z wyraźnym oznaczeniem ścieżek i zawartości.

2. **Weryfikacja uruchomieniowa (testy twarde) — automatyka, bez AI.**
   Sprawdzenie, czy projekt „żyje". Standardowe narzędzia: linter, kompilator albo dedykowane skrypty testowe przygotowane przez prowadzącego dla danego tematu. Wynik = PRAWDA/FAŁSZ („kod się kompiluje", „zależności się instalują").

3. **Ocena semantyczna i ewaluacja rubryki — AI (Claude).**
   Dopiero tu wchodzi AI. Model dostaje pełen kod + README + rubrykę. Mapuje konkretne fragmenty kodu do kryteriów („Kryterium: użycie algorytmu X → znaleziono w `logic.py`, linie 14–30"). **Każda ocena cząstkowa uzasadniona krótkim cytatem z kodu studenta.**

4. **Analiza historii zmian (prawdziwy cheat risk) — automatyka + AI.**
   System analizuje listę commitów. Projekt 2000 linii wgrany jednym commitem o 23:55 w niedzielę → flaga ostrzegawcza. AI analizuje ewolucję kodu — czy powstawał naturalnie.

5. **Werdykt maszyny obowiązuje sam; ocena człowieka = potwierdzenie PREMIUM (opcja „c").**
   Po pełnej ocenie maszynowej (kroki 1–4) i feedbacku dla studenta, **werdykt maszyny jest finalny i samowystarczalny** — student dostaje ocenę bez czekania na człowieka (jawnie oznaczona jako „ocena automatyczna"). Ocena człowieka to **opcjonalna, płatna warstwa premium**: kto jej chce (np. instytucja, student pod kredencjał wysokiej stawki), dostaje rekomendację maszyny (werdykt + dowody + sygnały ryzyka) do zatwierdzenia. **Człowiek NIE musi być specjalistą domenowym** (§I.4) — raport samowystarczalny dowodowo. W warstwie premium priorytet kolejki: pogranicze (np. 45–55%), wysokie ryzyko ściągania, błąd uruchomieniowy. **Decyzja Darka 2026-06-29:** platforma samowystarczalna od początku, werdykt maszyny stoi sam. (Pogodzenie z ADR-004/§7 — §IV.7.)

---

## III. Odbudowa wskaźnika ryzyka (cheat risk)

Zgadywanie ryzyka z daty utworzenia = proszenie się o kłopoty. Mierzalne wskaźniki:

| Wskaźnik | Czego szukamy? | Sposób weryfikacji |
| --- | --- | --- |
| **Brak przyrostu (historia commitów)** | Projekt powstawał etapami, czy wklejony „na raz"? | Liczba i wielkość (diff) commitów przez GitHub API. |
| **Brak spójności stylu** | Różne fragmenty w zupełnie innej konwencji nazewniczej (objaw kopiowania z różnych źródeł)? | Analiza AI (wymaga wglądu w kod). |
| **Martwe funkcje** | Skopiowany duży blok, użyta jedna funkcja, reszta to „śmieci"? | Analiza AI (LLM) + lintery AST. |

---

## IV. Kwestie do rozstrzygnięcia w designie (wniesione przez zespół, nie przez dyrektywę)

Te punkty dostawia zespół jako warunki bezpiecznego i kompletnego wdrożenia — do rozpisania w designie technicznym (Ethan/Leo), pedagogicznym (Sophia) i bramie RODO (Ryan):

1. **Izolacja niezaufanego kodu (krok II.2) — kluczowa decyzja architektoniczno-kosztowa Darka.** Uruchamianie cudzego kodu studenta wymaga mocnej piaskownicy: jednorazowe kontenery, limity zasobów (procesor/pamięć/czas), odcięcie od sieci, brak dostępu do sekretów. Warianty do wyboru: własna piaskownica vs gotowy bieg CI (np. izolowany runner). Ethan przynosi tradeoff (koszt, bezpieczeństwo, złożoność) — Darek decyduje.
2. **Świadomość typu deliverable.** Część projektów (zwłaszcza cyber: GRC, RODO, DORA, runbooki reagowania, reguły detekcji, zapytania SQL) to **dokumenty i analizy, nie kod** — „kompilacja" nie istnieje. Krok II.2 musi mieć ścieżkę twardych sprawdzeń per typ: kod → testy uruchomieniowe; dokument → sprawdzenie struktury/kompletności wg szablonu; reguła detekcji/SQL → walidacja składni/wykonania na zbiorze testowym.
3. **RODO (brama Ryana).** Pobieranie i przechowywanie kodu/pracy studenta = przetwarzanie danych (potencjalnie osobowych — autorstwo, styl). Podstawa prawna, cel, retencja kopii pracy i raportu AI, dostęp wykładowcy. Uruchamianie kodu studenta — odpowiedzialność za jego treść.
4. **Integracja ze stanem zastanym.** Punkt wyjścia: istniejący bezpieczny pobieracz metadanych (`fetchGithubRepoMeta`, ochrona przed SSRF), `review-submission.ts`, `aiReviewJson` (jsonb), rubryka `rubricJson`. Co rozszerzamy, czego nie psujemy (wsteczna zgodność L1–L3).
5. **Trasa wykładowcy (krok II.5).** Wymaga roli i ekranu oceny, których dziś nie ma (grant `app_faculty` istnieje na tabeli, ale brak trasy). Zakres i kolejność wdrożenia w Becie (czy faktyczny wykładowca, czy „operator jakości" przejściowo) — do decyzji produktowej Sophii/Darka.
6. **Standard `README.md`.** Sophia specyfikuje obowiązkową strukturę (Cel · Uruchomienie · Wnioski) + wskazanie pliku wejściowego, jako kontrakt wejścia oceny. Format rubryki musi wspierać mapowanie kryterium → fragment kodu (cytat).
7. **Pogodzenie z CLAUDE.md §7 / ADR-004 / USP — ROZSTRZYGNIĘTE (Darek 2026-06-29): rozdzielić wagę oceny.** Werdykt maszyny jest samowystarczalny dla oceny **formującej/edukacyjnej** (AI jako narzędzie nauki — §7 nie naruszone, bo to nie „istotny" werdykt wobec człowieka). Człowiek („ostatnie słowo") pozostaje wymagany dla **kredencjału wysokiej stawki pokazywanego pracodawcy** — i to jest właśnie warstwa **premium**. Platforma samowystarczalna w nauce; HITL chroni rzecz „istotną" (kredencjał na rynek). **Pozostaje do wykonania (czerwona linia, Plan Mode — sign-off Darka):** (a) edycja CLAUDE.md §7 + ADR-004 oddająca rozdział formująca↔kredencjał; (b) korekta pozycjonowania marki (Maya); (c) aktualizacja frameworku E3 §5. Pakiet governance Oliver przygotuje do sign-offu. Do czasu wdrożenia UI nazywa ocenę maszyny uczciwie „ocena automatyczna".

---

## V. Następne kroki (proces)

1. **Design techniczny pipeline'u (Ethan/Leo)** — architektura 5 kroków, izolacja kodu (warianty dla Darka), świadomość typu deliverable, zmiany schemy (sygnały cheat-risk, wynik testów twardych, trasa wykładowcy), integracja z `review-submission.ts`. → Leo review.
2. **Design pedagogiczny (Sophia)** — standard README, format rubryki z mapowaniem do kodu, doświadczenie wykładowcy, progi pogranicza.
3. **Brama RODO (Ryan)** — §IV.3.
4. **Sign-off Darka na design** (zwłaszcza wariant izolacji kodu) → wdrożenie pod delegacją v1.12 (Ethan: migracja schemy + scalenie + deploy pod bramkami jakości).

Powiązanie z ETAP E3: ten redesign jest **warunkiem wiarygodności** projektów cyber L1–L3 (i fundamentem benchmarku L4/L5 — odpowiada na lukę B1 z recenzji Leo designu L4/L5: „skąd substancja pracy studenta do porównania"). Autoring projektów może iść równolegle z researchem; **publikacja ścieżki cyber na produkcji wymaga działającej oceny opartej na treści.**
