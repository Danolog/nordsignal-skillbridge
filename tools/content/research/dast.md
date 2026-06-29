# Research kompetencji: DAST

> **Status:** research liścia-narzędzia grupy „Bezpieczeństwo aplikacji (AppSec)" w ETAP E3 — powstał wg wzorca `tools/content/research/siem.md` (golden-example). **Teorię podatności webowych dziedziczy w całości z `owasp.md`** (rdzeń koncepcyjny grupy). Ten plik **nie powtarza** tej teorii — skupia się na tym, **co widzi analiza działającej aplikacji, czego nie widzi SAST**, i na skanie uwierzytelnionym. Relację do statycznej analizy dziedziczy z `sast.md`.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7 — skan *aktywny* TYLKO aplikacji własnej/celowo podatnej, art. 267 KK) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `DAST` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Bezpieczeństwo aplikacji (AppSec)" (`unionShare` grupy: **4,9%**) |
| **Popyt liścia (`demandPercentage`)** | **1,1%** ofert ścieżki wymienia DAST |
| **Liczba ofert (`offers`)** | **4** |
| **`kind`** | `tool` (klasa narzędzi dynamicznej analizy działającej aplikacji — patrz §2) |
| **`lift`** | 21,40 |
| **Liść-rdzeń (dziedziczona teoria)** | `OWASP` → `tools/content/research/owasp.md` |
| **Narzędzie wiodące do laba** | OWASP ZAP (Zed Attack Proxy — otwarty skaner aplikacji webowych) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security |

**Wniosek dla autoringu:** DAST (Dynamic Application Security Testing — dynamiczne testowanie bezpieczeństwa aplikacji) to *narzędziowa* nadbudowa nad OWASP, komplementarna do SAST. Popyt 1,1% (4 oferty). Research **cienki w teorii podatności** (jest w `owasp.md`), **gruby w specyfice analizy dynamicznej:** jak narzędzie bada **działającą** aplikację z zewnątrz (czarna skrzynka — *black box*), co przez to potwierdza, czego SAST (analiza kodu) z definicji nie widzi, dlaczego **skan uwierzytelniony** jest kluczowy i gdzie leży twarda granica prawna (skan aktywny to wysyłanie ładunków atakujących — wyłącznie na własną aplikację). Narzędziem wiodącym jest **OWASP ZAP** — darmowe, otwarte, część samego projektu OWASP, więc spójne z rdzeniem grupy.

---

## 2. Definicja kompetencji i jej rola w pracy

**DAST (dynamiczne testowanie bezpieczeństwa aplikacji)** to badanie **działającej** aplikacji **z zewnątrz** — bez dostępu do kodu źródłowego. Narzędzie zachowuje się jak napastnik: wysyła do aplikacji żądania (w tym celowo złośliwe) i ocenia odpowiedzi. Stąd „dynamiczne" (przeciwieństwo statycznego SAST, który czyta kod bez uruchamiania) i „czarna skrzynka" (nie zaglądamy do środka, oceniamy zachowanie).

Jak działa (mechanizm OWASP ZAP i podobnych):
- **Pełza po aplikacji (crawling / spidering — automatyczne odwiedzanie stron i odnośników)**, żeby odkryć dostępne adresy i formularze.
- **Skan pasywny (passive scan)** — obserwuje ruch bez ingerencji, wyłapuje np. brakujące nagłówki bezpieczeństwa, ujawnione informacje. **Bezpieczny** — nie atakuje.
- **Skan aktywny (active scan)** — *wysyła ładunki atakujące* (payload) do parametrów i sprawdza, czy aplikacja reaguje jak podatna (np. odbija wstrzyknięty skrypt). **To realne wysyłanie ataków** — dozwolone WYŁĄCZNIE na aplikacji, którą wolno testować (patrz §7, granica prawna).
- **Proxy przechwytujące (intercepting proxy)** — ZAP staje pomiędzy przeglądarką a aplikacją, pozwala podejrzeć i ręcznie zmodyfikować każde żądanie.

**Co DAST WIDZI, a SAST NIE (sedno tego pliku — komplementarność):**
- **Potwierdzenie wykorzystywalności** — DAST nie mówi „w kodzie może być dziura" (to robi SAST), lecz „wysłałem atak i aplikacja realnie zareagowała jak podatna". To odpowiedź na słabość SAST z `sast.md` #1.
- **Błędy konfiguracji w czasie działania** — brakujące nagłówki bezpieczeństwa (np. polityka treści), gadatliwe komunikaty błędów ujawniające wersje, niezabezpieczone ciastka — rzeczy, których w kodzie nie widać.
- **Dziury widoczne tylko po złożeniu całości** — interakcja warstw, serwera, frameworka i konfiguracji, której statyczny analizator nie zsymuluje.

**Czego DAST NIE WIDZI (granica narzędzia):**
- **Nie wskaże linii kodu** — wie, że *jest* dziura, nie wie *gdzie* w źródle (to domena SAST). Dlatego DAST i SAST się uzupełniają: SAST = od środka (kod), DAST = od zewnątrz (zachowanie).
- **Nie dotrze tam, gdzie nie wpełznie** — adresy odkrywane tylko przez złożoną nawigację, aplikacje mocno oparte na JavaScript (SPA — single-page application) bywają trudne do spełzania; co nieodkryte, to nieprzeskanowane.
- **Logiki biznesowej** — jak każdy automat (niuans #11 z `owasp.md`).
- **Podatności w zależnościach** jako takich — to domena `sca.md`.

**Kto tego używa i jak wygląda dzień pracy.** Tester penetracyjny aplikacji webowych i inżynier AppSec. Cykl: skonfigurować skan (zakres, uwierzytelnienie), uruchomić skan pasywny + aktywny na **własnej/celowo podatnej** aplikacji, przejść wyniki, **potwierdzić ręcznie** prawdziwe pozytywy (DAST też daje fałszywe alarmy), napisać raport. Coraz częściej DAST wpina się też w potok CI/CD jako automatyczny skan przed wdrożeniem.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował (niezmiennik §4 frameworku). **Poziomy zakładają opanowaną teorię podatności z `owasp.md`** (O1–O4) — tu nadbudowujemy *specyfikę analizy dynamicznej*.

> **Twarda klauzula (mocniejsza niż w SAST):** skan **aktywny** wysyła realne ataki — wykonuje się **wyłącznie na aplikacji własnej lub celowo podatnej** (OWASP Juice Shop, DVWA), uruchomionej lokalnie. Skierowanie skanu aktywnego na cudzą aplikację to nieautoryzowany atak — przestępstwo (art. 267 KK). Klauzula wchodzi do `theory_md` każdego projektu, wyróżniona.

### L1 — Fundamenty: ZAP, proxy i skan pasywny własnego laba (3–6 h)

**Zakres wiedzy/umiejętności (specyfika DAST):**
- Uruchomienie OWASP ZAP i celowo podatnej aplikacji lokalnie (Juice Shop / DVWA w kontenerze).
- **Proxy przechwytujące:** skonfigurowanie ZAP między przeglądarką a aplikacją, podejrzenie żądań i odpowiedzi HTTP (wiedza o HTTP z prerekwizytów ożywa tu w praktyce).
- **Skan pasywny:** uruchomienie bezpiecznego skanu pasywnego, odczyt znalezisk (brakujące nagłówki, ujawnione informacje), mapowanie na kategorie Top 10 z `owasp.md`.

**Co student musi UMIEĆ ZROBIĆ:** uruchomić ZAP jako proxy na własnym labie; przechwycić i odczytać żądanie/odpowiedź; uruchomić skan pasywny i zinterpretować 3–5 znalezisk z mapowaniem na Top 10.

**Profesjonalne niuanse na tym poziomie:**
- **Pasywny jest bezpieczny, aktywny atakuje — różnica nie jest kosmetyczna.** Pierwsza rzecz, którą junior musi internalizować, zanim w ogóle kliknie „skanuj": co dany tryb *wysyła*. Pomyłka tu to złamanie prawa, nie literówka.
- **Skan z zewnątrz widzi tylko to, do czego dotrze.** Jeśli ZAP nie wpełznie na podstronę, ta podstrona jest dla skanu niewidzialna — choć może mieć dziurę.

### L2 — Zastosowanie: skan aktywny, skan uwierzytelniony, potwierdzanie znalezisk (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Skan aktywny** na własnej/celowo podatnej aplikacji: wysyłanie ładunków, wykrycie odbitego XSS i wstrzyknięcia (teoria w `owasp.md`, tu — jak potwierdza to dynamiczny skaner).
- **Skan uwierzytelniony (authenticated scan)** — skonfigurowanie ZAP tak, by był *zalogowany* podczas skanu. To kluczowe: bez logowania skaner widzi tylko stronę logowania, a 90% aplikacji jest *za* uwierzytelnieniem. Obsługa sesji, token, wykrywanie wylogowania.
- **Potwierdzanie znaleziska (verification):** ręczne sprawdzenie, czy zgłoszona dziura jest prawdziwa — DAST też daje fałszywe alarmy. Odróżnienie odbitego od trwałego (stored) XSS.

**Co student musi UMIEĆ ZROBIĆ:** wykonać skan aktywny i uwierzytelniony własnego laba; ręcznie potwierdzić co najmniej jedno prawdziwe znalezisko (pokazać działający dowód na własnej aplikacji); odróżnić prawdziwy pozytyw od fałszywego alarmu.

**Profesjonalne niuanse:**
- **Skan nieuwierzytelniony to skan strony logowania.** Najczęstszy błąd juniora: uruchamia DAST bez sesji, dostaje „czysto" i melduje, że aplikacja bezpieczna — a przeskanował tylko bramę, nie budynek.
- **DAST też kłamie.** Zgłoszenie skanera to hipoteza; trwały XSS potwierdza się inaczej niż odbity. Bez ręcznego potwierdzenia raport DAST jest tak samo zaszumiony jak SAST.
- **Skan aktywny może uszkodzić aplikację.** Ładunki potrafią zapełnić bazę śmieciowymi danymi albo wywrócić usługę — dlatego *nigdy* na produkcji bez zgody i okna, *nigdy* na cudzym systemie.

### L3 — Portfolio: pełny test aplikacji webowej + raport + DAST w CI/CD (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Pełna ocena dynamiczna** celowo podatnej aplikacji: zakres, spełzanie, skan pasywny + aktywny uwierzytelniony, ręczne potwierdzenie.
- **Raport testu** profesjonalnej jakości: znaleziska zmapowane na Top 10/CWE, dowód wykorzystywalności, dotkliwość z kontekstem (jak w `owasp.md` #7), rekomendacje, oddzielone fałszywe alarmy.
- **Granica DAST wobec SAST/SCA:** jawne nazwanie, czego skan dynamiczny *nie* pokrył (np. dziura w kodzie nieosiągalna z zewnątrz, podatna biblioteka) i co domyka SAST/SCA.
- **DAST w potoku CI/CD** (skan bazowy — *baseline scan* ZAP) jako automatyczna brama przed wdrożeniem.

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić pełny test dynamiczny celowo podatnej aplikacji z uwierzytelnieniem; napisać raport gotowy na rozmowę o pracę z dowodami wykorzystywalności; jawnie nazwać luki pokrycia i wskazać komplementarność z SAST/SCA. To poziom „portfolio".

**Profesjonalne niuanse:**
- **Pokrycie skanu = pokrycie spełzania.** Raport „nic nie znaleziono" jest bezwartościowy, jeśli skaner odwiedził 10% aplikacji. Zawodowiec najpierw dowodzi, *co* przeskanował.
- **DAST i SAST razem > każde osobno.** Dziura widoczna w kodzie, ale nieosiągalna z zewnątrz (SAST tak, DAST nie) i dziura konfiguracji niewidoczna w kodzie (DAST tak, SAST nie) — pełny obraz daje dopiero połączenie. To argument za korelacją na L4.

### L4 / L5 — ZAPOWIEDŹ ZAKRESEM

> **Uwaga (§3 frameworku):** struktura L4/L5 (referencyjny wynik profesjonalisty + benchmark) — **osobno Ethan/Leo**. Research tylko zapowiada zakres.

- **L4:** pełen test bezpieczeństwa realistycznej aplikacji bliskiej produkcyjnej (uwierzytelnianie, role, integracje), korelacja DAST z SAST i SCA w jeden raport, rozstrzygnięcie sprzeczności między skanerami. Benchmark wobec testera penetracyjnego.
- **L5:** strategia testowania dynamicznego dla organizacji — DAST w potoku wdrożeń bez blokowania, skanowanie aplikacji jednostronicowych i interfejsów API, balans głębia skanu ↔ czas. Benchmark wobec architekta bezpieczeństwa.

---

## 4. Profesjonalne niuanse — sedno North Star

Materiał na głębię. **Teoria *samych podatności* jest w `owasp.md` §4** — tu niuanse *specyficzne dla analizy dynamicznej*.

1. **DAST potwierdza wykorzystywalność, której SAST tylko się domyśla.** To jego główna wartość i powód, dla którego oba istnieją. SAST: „w kodzie jest ścieżka". DAST: „wysłałem atak, zadziałał". Razem dają pewność, której żadne osobno nie ma.
2. **Skan aktywny to realny atak — granica prawna, nie techniczna.** Najważniejszy niuans całego liścia. Skierowanie skanu aktywnego na cudzą aplikację to przestępstwo (art. 267 KK), niezależnie od intencji. Tryb skanu trzeba rozumieć *zanim* się go uruchomi.
3. **Skan nieuwierzytelniony jest prawie bezwartościowy.** Większość aplikacji żyje za logowaniem. Skan bez sesji widzi fasadę. Konfiguracja uwierzytelnienia (i wykrywanie wylogowania w trakcie) to rzemiosło, które odróżnia użyteczny test od teatru.
4. **Pokrycie skanu = pokrycie spełzania.** Skaner nie przeskanuje tego, czego nie odkrył. Aplikacje jednostronicowe (oparte na JavaScript) i ukryte adresy wymykają się spełzaniu — zawodowiec mierzy i raportuje *zasięg* skanu, nie tylko znaleziska.
5. **DAST też daje fałszywe alarmy — potwierdzenie ręczne obowiązkowe.** Zgłoszenie skanera to hipoteza. Trwały XSS, ślepe wstrzyknięcie — każde potwierdza się inaczej. Raport bez ręcznej weryfikacji jest tak samo zaszumiony jak w SAST.
6. **Skan aktywny bywa destrukcyjny.** Ładunki potrafią zaśmiecić bazę albo wywrócić usługę. Stąd: nigdy na produkcji bez zgody i okna serwisowego, najlepiej na osobnej kopii. To kolejny powód, by trzymać się aplikacji własnej/treningowej.
7. **DAST nie wskaże linii kodu** — diagnozuje objaw z zewnątrz; znalezienie *miejsca* w źródle wymaga SAST albo ręcznej analizy. To naturalna granica czarnej skrzynki, nie wada.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty DAST muszą pokryć umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury). Mapa pokrycia — nie pełne projekty (E3-A).

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3 | Niuanse z §4 |
|---|---|---|---|---|
| D1 | L1 | **ZAP jako proxy + skan pasywny laba** — przechwycenie ruchu, bezpieczny skan pasywny celowo podatnej aplikacji, mapowanie na Top 10 | Proxy, skan pasywny, odczyt | #2, #4 |
| D2 | L2 | **Skan aktywny + uwierzytelniony** — skan zalogowany własnego laba, wykrycie i ręczne potwierdzenie XSS/wstrzyknięcia | Skan aktywny, uwierzytelnienie, potwierdzenie | #1, #3, #5 |
| D3 | L2 | **Potwierdzanie znalezisk i odróżnianie typów** — TP/FP, odbity vs trwały XSS, dowód wykorzystywalności na własnej aplikacji | Weryfikacja, TP/FP | #5, #6 |
| D4 | L3 | **Pełny test + raport + DAST w CI/CD** — ocena dynamiczna z zasięgiem skanu, raport z dowodami, baseline scan w potoku, granica wobec SAST/SCA | Pełna ocena, raport, CI/CD, komplementarność | #4, #7 |
| (D5) | L4–L5 | **ZAPOWIEDŹ** — test aplikacji bliskiej produkcyjnej + korelacja z SAST/SCA; strategia DAST dla organizacji; benchmark | Zakres L4/L5 | #1, #6 |

**Szacowana pula L1–L3: ok. 4 projekty.** L4–L5: 1–2 po rozszerzeniu struktury.

**Łańcuch zależności:** D1 → D2 → D3 → D4. **Cały blok zakłada opanowane O1–O4 z `owasp.md`** (rozumienie dziury) — bez tego skan to klikanie bez interpretacji. D2 zakłada D1 (najpierw proxy/pasywny, dopiero potem aktywny — kolejność też chroni przed pochopnym skanem aktywnym).

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

1. **OWASP (rdzeń teorii)** — `owasp.md`: kategorie Top 10, mechanizm XSS/wstrzyknięć, triage. **Bezwzględnie wymagane przed L1 DAST** — bez tego student nie zinterpretuje, co skaner potwierdził.
2. **Podstawy webu i HTTP** — żądanie/odpowiedź, nagłówki, ciastka, sesje (proxy ZAP operuje wprost na HTTP). Liść `Network`/`TCP/IP`. **Wymagane przed L1.**
3. **Pojęcie uwierzytelnienia i sesji** — żeby skonfigurować skan uwierzytelniony na L2. Wiedza z `IAM`/`Active Directory` (partia 1) o tym, czym jest sesja i token. **Wymagane przed L2.**
4. **Pojęcie potoku CI/CD** — do wpięcia skanu bazowego na L3. Liść `CI/CD`. **Wymagane przed L3.**
5. **Klauzula etyczno-prawna — wzmocniona** — skan aktywny to realny atak; wyłącznie aplikacja własna/celowo podatna (art. 267 KK). **Wymagane od L1, wyróżnione.**

**Relacja do reszty grupy:** DAST jest komplementarny do `SAST` (analiza kodu) i `SCA` (zależności) — nie jest ich prerekwizytem ani pochodną; wszystkie trzy łączy wspólny rdzeń **OWASP**. Na L4 trzy źródła się korelują, dlatego student musi znać granice każdego.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

**Narzędzia DAST (darmowe/otwarte, do laba):**
- OWASP ZAP (Zed Attack Proxy — wiodący otwarty skaner): https://www.zaproxy.org/docs/
- OWASP ZAP — skan bazowy w CI/CD (baseline scan): https://www.zaproxy.org/docs/docker/baseline-scan/
- Burp Suite Community Edition (darmowa wersja, proxy + ręczne testy): https://portswigger.net/burp/documentation

**Wiedza i metodyka (otwarte, autorytatywne):**
- OWASP WSTG (Web Security Testing Guide — metodyka testowania): https://owasp.org/www-project-web-security-testing-guide/
- OWASP Vulnerability Scanning Tools (przegląd kategorii): https://owasp.org/www-community/Vulnerability_Scanning_Tools
- MITRE CWE (katalog typów słabości): https://cwe.mitre.org/

**Aplikacje do ćwiczeń (celowo podatne — legalny cel skanu aktywnego):**
- OWASP Juice Shop: https://owasp.org/www-project-juice-shop/
- DVWA — Damn Vulnerable Web Application: https://github.com/digininja/DVWA

**Granica prawna:**
- Art. 267 Kodeksu karnego (nieautoryzowany dostęp/atak): https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19970880553

> **Do uwagi Ryana — punkt newralgiczny grupy:** DAST ma **najostrzejszą granicę prawną** z całej grupy AppSec, bo skan *aktywny* to realne wysyłanie ataków. Wszystkie projekty muszą: (a) wyróżnić klauzulę „wyłącznie aplikacja własna/celowo podatna, uruchomiona lokalnie"; (b) jasno rozdzielić skan pasywny (bezpieczny) od aktywnego (atakujący); (c) zakazać kierowania skanu na jakikolwiek adres publiczny/cudzy. Narzędzia (ZAP, Burp Community) darmowe/otwarte; cele (Juice Shop, DVWA) celowo podatne i przeznaczone do legalnego ćwiczenia. To miejsce, gdzie review Ryana jest najważniejsze w całej grupie.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Najsurowszy krytyk — CISO zatrudniający juniorów AppSec/pentest. Pięć słabości pierwszej wersji i poprawki:

1. **Słabość: research powtarzał teorię podatności.** CISO: „nie czytam piąty raz, czym jest XSS — chcę wiedzieć, jak DAST go *potwierdza* i czym różni się od SAST". **Poprawka:** zadeklarowałam dziedziczenie z `owasp.md`, a cały ciężar przesunęłam na komplementarność (niuans #1, #7) i mechanikę dynamiczną (pasywny/aktywny, proxy, spełzanie).

2. **Słabość: granica prawna potraktowana jak w innych liściach.** CISO: „skan aktywny to atak — junior, który puści go na cudzy serwis, idzie do prokuratury, a ja z nim". **Poprawka:** wyróżniłam klauzulę wzmocnioną (mocniejszą niż w SAST), niuans #2 jako najważniejszy w liściu, osobny akapit dla Ryana w §7. Kolejność projektów (najpierw pasywny D1, potem aktywny D2) też chroni przed pochopnym atakiem.

3. **Słabość: pominięty skan uwierzytelniony.** CISO: „90% juniorów puszcza DAST bez logowania, dostaje «czysto» i melduje sukces — przeskanowali stronę logowania, nie aplikację". **Poprawka:** skan uwierzytelniony to rdzeń L2 (projekt D2), niuans #3 (skan nieuwierzytelniony prawie bezwartościowy). To rozdzielnik amator↔zawodowiec specyficzny dla DAST.

4. **Słabość: DAST jako „nieomylny wykrywacz".** CISO: „skaner dynamiczny też kłamie; raport bez ręcznego potwierdzenia jest bezwartościowy". **Poprawka:** niuans #5 (DAST też daje fałszywe alarmy), projekt D3 o potwierdzaniu i odróżnianiu odbity/trwały XSS. Dowód wykorzystywalności na *własnej* aplikacji.

5. **Słabość: brak miary pokrycia skanu i komplementarności.** CISO: „«nic nie znaleziono» przy 10% przeskanowanej aplikacji to nie wynik, to fałszywe poczucie bezpieczeństwa". **Poprawka:** niuans #4 (pokrycie = spełzanie), wymóg raportowania zasięgu na L3, oraz jawne nazwanie granic DAST i komplementarności z SAST/SCA (niuans #1, projekt D4). To uzasadnia korelację trzech źródeł na L4.

**Sprawdzenie tłumaczenia żargonu (sekcja 3 CLAUDE.md):** każdy termin rozwinięty po polsku przy pierwszym użyciu (DAST, black box, crawling/spidering, skan pasywny/aktywny, payload/ładunek, intercepting proxy, authenticated scan, baseline scan, SPA/aplikacja jednostronicowa, odbity/trwały XSS, ZAP, Burp, true/false positive, art. 267 KK). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** spełniona, jeśli autoring domknie 4 projekty L1–L3 z niuansami #1–#5, #7. Skala organizacyjna (#6 na produkcji, API, aplikacje jednostronicowe) wymaga L4/L5 — zapowiedziane, zależne od Ethana/Leo. Pełna „zawodowość" DAST domyka się dopiero w korelacji z SAST i SCA — uczciwie oznaczone.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
