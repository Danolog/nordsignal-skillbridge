# Research kompetencji: Microsoft Defender

> **Status:** research liścia-narzędzia rodziny „detekcja na końcówce" (endpoint) w ETAP E3 — powstał wg wzorca `tools/content/research/siem.md` (golden-example). **Teorię detekcji dziedziczy w całości z `edr-xdr.md`** (rdzeń rodziny): wykrywanie zachowań, IOC vs IOA, izolacja hosta, polowanie na zagrożenia, mapowanie na MITRE ATT&CK. Ten plik **nie powtarza** tych podstaw — skupia się na specyfice ekosystemu Microsoft.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7 — monitoring pracownika, dane w chmurze Microsoft/EU) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Microsoft Defender` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „SIEM i Monitorowanie Zdarzeń" (`unionShare` grupy: **18,3%**) |
| **Popyt liścia (`demandPercentage`)** | **1,6%** ofert ścieżki wymienia Microsoft Defender |
| **Liczba ofert (`offers`)** | **6** |
| **`kind`** | `tool` (konkretna platforma klasy EDR/XDR od Microsoftu) |
| **`lift`** | 22,92 |
| **Liść-rdzeń (dziedziczona teoria)** | `EDR / XDR` → `tools/content/research/edr-xdr.md` |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security |

**Wniosek dla autoringu:** Microsoft Defender to *konkretyzacja* kompetencji EDR/XDR w ekosystemie, który w polskich firmach jest najczęstszy — bo ogromna część rynku stoi na Microsoft 365 (poczta, pakiet biurowy, tożsamość). Popyt 1,6% (6 ofert) jest niższy niż samego EDR/XDR (3,2%), ale oferty traktują Defendera jako *dowód*, że kandydat umie EDR „na sprzęcie, który u nas stoi". Dlatego research jest cienki w teorii (ta jest w `edr-xdr.md`), a gruby w specyfice: jak ta sama detekcja zachowań wygląda w narzędziach Microsoftu, jak pisać zapytania w KQL, jak Defender łączy się z Sentinel (SIEM w chmurze) i Entra (tożsamość). Autoring tego liścia to **warianty „to samo, ale w Defenderze"** projektów rdzenia EDR/XDR, nie nowa teoria.

---

## 2. Definicja kompetencji i jej rola w pracy

**Microsoft Defender** to nie jeden produkt, lecz *rodzina* narzędzi bezpieczeństwa Microsoftu spięta w platformę **Microsoft Defender XDR** (dawniej Microsoft 365 Defender). Dla tej ścieżki liczą się przede wszystkim:

- **Microsoft Defender for Endpoint (MDE — ochrona i wykrywanie na końcówkach)** — to jest właściwy EDR: agent na laptopach i serwerach zbiera telemetrię (procesy, sieć, pliki), wykrywa zachowania i pozwala reagować (izolacja hosta, kwarantanna). Cała teoria z `edr-xdr.md` opisuje *właśnie to*, tu po prostu w wykonaniu Microsoftu.
- **Microsoft Defender XDR** — warstwa łącząca: spina telemetrię z końcówek (MDE) z tożsamością (**Defender for Identity** — ataki na Active Directory), pocztą (**Defender for Office 365** — złośliwe załączniki i linki) i aplikacjami chmurowymi. To realizacja idei XDR z `edr-xdr.md` §2 w jednym ekosystemie.
- **Microsoft Sentinel** — SIEM (i SOAR) w chmurze Azure, do którego Defender wpina się jako źródło. Tu domyka się relacja EDR ↔ SIEM z `edr-xdr.md` niuans #7: Defender to głębokie źródło końcówki, Sentinel to szeroka korelacja całej firmy.
- **Microsoft Entra ID** (dawniej Azure AD — Azure Active Directory, tożsamość w chmurze) — kto się loguje, skąd, z jakim ryzykiem; źródło sygnałów tożsamości dla korelacji.

**Spoiwo całości — KQL (Kusto Query Language, język zapytań Microsoftu).** To samo zapytanie KQL działa w Defenderze (zaawansowane polowanie — advanced hunting) i w Sentinelu. Opanowanie KQL to *centralna, przenośna umiejętność* tego liścia — junior, który zna KQL, jest produktywny w obu narzędziach od pierwszego dnia.

**Czym specyfika Defendera różni się od ogólnego EDR/XDR (to jest sedno tego pliku):**
- **Wszystko jest w chmurze i zintegrowane z resztą Microsoftu.** Nie wdrażasz osobnego serwera — Defender to usługa w chmurze, sterowana z portalu, a agent jest często *już wbudowany* w Windows. To zmienia sposób wdrożenia (przez Microsoft Intune — zarządzanie urządzeniami, albo zasady grupy GPO) i model licencji (zwykle pakiet Microsoft 365 E5 albo dodatek).
- **Telemetria w nazwanych tabelach.** Zamiast surowego strumienia — gotowe tabele do odpytania: `DeviceProcessEvents` (zdarzenia procesów), `DeviceNetworkEvents` (połączenia sieciowe), `DeviceFileEvents`, `IdentityLogonEvents` (logowania tożsamości) i inne. Junior musi wiedzieć, *którą tabelę odpytać* dla danej techniki ATT&CK.
- **Reguły redukcji powierzchni ataku (ASR — Attack Surface Reduction).** Gotowe reguły blokujące typowe wektory (np. „blokuj uruchamianie skryptów przez programy biurowe") — konkretny mechanizm Defendera realizujący to, co w `edr-xdr.md` było ogólną „regułą zachowania".
- **Automatyczne dochodzenie i reakcja (AIR — Automated Investigation and Response).** Defender potrafi sam zbadać alert i zaproponować/wykonać reakcję — co czyni niuans #11 z `edr-xdr.md` (koszt błędnej reakcji automatycznej) szczególnie istotnym tutaj.

**Kto tego używa.** Analityk SOC w firmie na Microsoft 365, inżynier bezpieczeństwa Microsoftu, administrator, który łączy IT z bezpieczeństwem. Na polskim rynku to bardzo częsty układ — stąd obecność w ofertach.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował (niezmiennik §4 frameworku). **Poziomy zakładają opanowaną teorię detekcji z `edr-xdr.md`** (L1–L3 tamtego liścia) — tu nadbudowujemy *specyfikę Microsoftu*, nie uczymy detekcji od zera (patrz §6).

### L1 — Fundamenty: portal Defendera, tabele telemetrii, pierwsze KQL (3–6 h)

**Zakres wiedzy/umiejętności (specyfika Microsoft):**
- Orientacja w portalu Microsoft Defender: gdzie są urządzenia, alerty, incydenty (Defender grupuje powiązane alerty w *incydent*).
- **Tabele zaawansowanego polowania:** `DeviceProcessEvents`, `DeviceNetworkEvents`, `DeviceFileEvents` — co która zawiera i kiedy której użyć.
- **Pierwsze zapytania KQL:** filtr (`where`), wybór kolumn (`project`), zliczanie (`summarize count()`), sortowanie (`top`), zakres czasu. To samo, co student umiał w SPL/KQL na SIEM (`siem.md` L1), ale w tabelach końcówki Defendera.
- Odczyt drzewa procesów w Defenderze i powiązanie alertu z techniką MITRE ATT&CK (Defender sam ją wyświetla — student ma ją *zweryfikować*, nie przyjąć na wiarę).

**Co student musi UMIEĆ ZROBIĆ:** odnaleźć w portalu alert i powiązany incydent; napisać 3–5 zapytań KQL na tabelach urządzeń; wskazać tabelę właściwą dla danego pytania; odczytać drzewo procesów alertu.

**Profesjonalne niuanse (specyfika Microsoft):**
- **Nie każda tabela ma to samo okno retencji.** Domyślnie zaawansowane polowanie sięga ograniczonego okresu wstecz (zależnie od licencji) — junior, który szuka incydentu sprzed kwartału w tabeli z krótką retencją, „nic nie znajdzie". To wariant niuansu o retencji z SIEM, w realiach Defendera.
- **Alert ≠ incydent.** Defender sam scala powiązane alerty w jeden incydent. Junior, który traktuje każdy alert osobno, gubi obraz całości, który Microsoft już za niego złożył.

### L2 — Zastosowanie: polowanie w KQL, reguły niestandardowe, reagowanie w Defenderze (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Zaawansowane polowanie w KQL:** łączenie tabel (`join` — np. zdarzenie procesu z logowaniem tożsamości), wyrażenia czasowe, wykrywanie wzorca zachowania (IOA z `edr-xdr.md`) zapytaniem KQL.
- **Niestandardowe reguły wykrywania (custom detection rules):** zamiana zapytania KQL w regułę, która sama alarmuje — odpowiednik „reguły detekcji" z rdzenia, w mechanice Defendera.
- **Reagowanie w Defenderze:** izolacja urządzenia (izolacja hosta z `edr-xdr.md` #3), zatrzymanie i kwarantanna pliku, zebranie pakietu dochodzeniowego — z portalu.
- **Reguły ASR (redukcja powierzchni ataku):** włączenie i strojenie gotowej reguły blokującej wektor ataku, ze świadomością ryzyka fałszywego pozytywu blokującego legalny program (#11 z rdzenia).

**Co student musi UMIEĆ ZROBIĆ:** napisać zapytanie KQL łączące dwie tabele i wykrywające wzorzec ataku; zamienić je w niestandardową regułę wykrywania; wykonać i uzasadnić reakcję (izolacja vs obserwacja); włączyć i nastroić jedną regułę ASR.

**Profesjonalne niuanse (specyfika Microsoft):**
- **Reguła ASR w trybie blokowania potrafi zatrzymać legalny proces biznesowy.** Zawodowiec najpierw uruchamia ją w trybie audytu (tylko loguje, nie blokuje), patrzy, co by zablokowała, dopiero potem włącza blokadę. Junior włącza blokadę od razu i dostaje telefon od księgowości.
- **KQL kusi do `join` wszystkiego ze wszystkim.** Nieprzemyślane łączenie wielkich tabel jest wolne i kosztowne. Zawodowiec najpierw zawęża czasem i filtrem, potem łączy — to bezpośrednie przełożenie ekonomii zaciągu z SIEM na realia Defendera.

### L3 — Portfolio: polowanie wieloźródłowe XDR, mapowanie ATT&CK, testowanie (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Polowanie wieloźródłowe (logika XDR Microsoftu):** zapytanie łączące końcówkę (`DeviceProcessEvents`) z tożsamością (`IdentityLogonEvents`) i — jeśli dostępne — pocztą, w jeden obraz incydentu. To realizacja korelacji końcówka↔reszta z `edr-xdr.md` L3 w tabelach Microsoftu.
- **Mapowanie własnych reguł na MITRE ATT&CK** i świadome nazwanie luk pokrycia w Defenderze (które techniki tabele *widzą*, których nie).
- **Integracja Defender → Sentinel:** zrozumienie, kiedy zostać w Defenderze, a kiedy przekazać dane do Sentinela (SIEM) dla szerszej korelacji i dłuższej retencji — domknięcie relacji EDR↔SIEM z rdzenia.
- **Testowanie detekcji:** odtworzenie techniki na własnej maszynie testowej (Atomic Red Team) i potwierdzenie, że reguła Defendera/zapytanie KQL faktycznie wykrywa.

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić polowanie łączące co najmniej dwa źródła Defendera, oparte na hipotezie z ATT&CK; zmapować zestaw reguł na techniki i nazwać lukę; uzasadnić decyzję „Defender vs przekaż do Sentinela"; udowodnić wykrycie odtworzeniem techniki. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse (specyfika Microsoft):**
- **„Defender wszystko skoreluje sam" to pułapka licencji i konfiguracji.** Pełna korelacja XDR (końcówka + tożsamość + poczta) wymaga, by *wszystkie* te moduły były wdrożone i licencjonowane. W realnej firmie często brakuje jednego — i obraz incydentu jest niepełny. Zawodowiec wie, *czego w danych nie ma*, zanim zaufa korelacji (wariant niuansu #7 z rdzenia).
- **KQL jest przenośne — narzędzie konkretne nie.** Umiejętność warta jest tyle, ile rozumienie, *co* się odpytuje (zachowania, ATT&CK), nie samo klikanie w portalu. Zawodowiec myśli detekcją, narzędzie traktuje jako wymienne.

### L4 — Realny przypadek profesjonalny (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 projektowana **osobno przez Ethana/Leo**. Research tu tylko **zapowiada zakres**.

**Co obejmowałby zakres L4:** reakcja na realny incydent w firmie na Microsoft 365 — od alertu MDE, przez polowanie w KQL łączące końcówkę i tożsamość, decyzję o izolacji w kontekście biznesowym, po rekomendację reguł ASR zapobiegających nawrotowi. **Benchmark** wobec analityka SOC pracującego na Defenderze na tym samym przypadku.

### L5 — Biegłość: architektura Defender + Sentinel w organizacji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5:** decyzja, co zostawić w Defenderze, a co przekazać do Sentinela (koszt, retencja, korelacja), polityka automatycznej reakcji (AIR — co automat, co człowiek), pełne pokrycie końcówek przez Intune, ekonomia licencji E5. **Benchmark** wobec architekta bezpieczeństwa Microsoftu.

---

## 4. Profesjonalne niuanse — sedno North Star

> **Dziedziczenie:** dwanaście niuansów rozdzielających zawodowca od amatora w detekcji na końcówce jest w `edr-xdr.md §4` (wykrywanie zachowań, IOC vs IOA, izolacja jako decyzja biznesowa, LOLBins, polowanie z hipotezą, pokrycie końcówek, granica RODO/monitoring). **Tu tylko niuanse swoiste dla Microsoftu** — nadbudowa, nie powtórka.

1. **KQL to centralna, przenośna umiejętność — narzędzie portalu nie.** Wartość juniora to płynność w KQL i myślenie detekcją, nie znajomość rozmieszczenia przycisków w portalu (który Microsoft i tak co rok przebudowuje, łącznie ze zmianą nazwy produktu — Azure AD → Entra ID, M365 Defender → Defender XDR). Zawodowiec inwestuje w KQL i ATT&CK, nie w „gdzie był ten guzik".

2. **Właściwa tabela do właściwego pytania.** Telemetria Defendera jest rozbita na nazwane tabele. Junior, który nie wie, że dane procesu są w `DeviceProcessEvents`, a logowania w `IdentityLogonEvents`, traci czas i „nie znajduje" tego, co jest w danych obok. To swoisty dla Defendera wariant „znajomości źródeł".

3. **Reguła ASR: najpierw audyt, potem blokada.** Włączenie reguły redukcji powierzchni ataku od razu w trybie blokowania to klasyczny błąd — może zatrzymać legalny proces biznesowy. Zawodowiec uruchamia w trybie audytu, mierzy wpływ, dopiero potem blokuje.

4. **Automatyczna reakcja (AIR) wymaga progu zaufania.** Defender potrafi sam izolować i naprawiać. Pełna automatyzacja na środowisku, którego się nie zna, to ryzyko zatrzymania biznesu błędną reakcją (#11 z rdzenia, spotęgowane automatyką). Zawodowiec stopniuje poziom automatyzacji wraz z dojrzałością środowiska.

5. **Licencja kształtuje, co w ogóle widzisz.** Zakres telemetrii, retencja polowania i dostępność modułów XDR zależą od poziomu licencji (E3 vs E5 vs dodatki). Junior, który zakłada, że „Defender to Defender", myli się co do możliwości u konkretnego klienta. Zawodowiec najpierw sprawdza, *co firma kupiła*.

6. **Dane w chmurze Microsoftu — gdzie leżą i kto ma dostęp (RODO).** Telemetria końcówek (a więc i aktywność pracowników) trafia do chmury Microsoftu. Region przechowywania, dostęp i zgodność z RODO to realna decyzja, nie szczegół IT — szczególnie w sektorze publicznym i finansowym (DORA). Rozszerza granicę prawną #12 z rdzenia o wymiar „dane u dostawcy chmury".

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Microsoft Defender muszą pokryć umiejętności *swoiste* z §3 — **bez powielania** projektów rdzenia EDR/XDR. Student, który zrobił projekty EDR/XDR, ma już teorię; tu udowadnia, że umie ją wykonać w narzędziach Microsoftu (centralnie: KQL).

| # | Poziom | Roboczy zakres projektu (swoisty dla Microsoft) | Umiejętności z §3 | Dziedziczy z `edr-xdr.md` |
|---|---|---|---|---|
| D1 | L1 | **Pierwsze polowanie w KQL na tabelach Defendera** — portal, tabele urządzeń, 5 zapytań KQL, odczyt drzewa procesów alertu | Portal, tabele, podstawy KQL | teoria telemetrii i drzewa procesów (#1 rdzenia) |
| D2 | L2 | **Niestandardowa reguła wykrywania + reguła ASR** — wzorzec IOA jako zapytanie KQL → reguła; włączenie ASR w trybie audytu, potem blokada | KQL z `join`, reguła własna, ASR, reagowanie | wykrywanie zachowań, IOA, izolacja (#1–#3 rdzenia) |
| D3 | L3 | **Polowanie XDR: końcówka + tożsamość** — zapytanie łączące `DeviceProcessEvents` z `IdentityLogonEvents`, mapowanie na ATT&CK, decyzja „Defender vs Sentinel", dowód wykrycia (Atomic Red Team) | Polowanie wieloźródłowe, ATT&CK, integracja z SIEM, test | korelacja, ATT&CK, testowanie (#5–#7 rdzenia) |
| (D4–D5) | L4–L5 | **ZAPOWIEDŹ** — reakcja na incydent w firmie M365; architektura Defender+Sentinel + licencje + AIR; benchmark profesjonalisty | Zakres L4/L5 | ekonomia, dwell time, RODO (#4,#8,#12 rdzenia) |

**Szacowana pula L1–L3: ok. 3 projekty swoiste** (rdzeń teorii pokryty w EDR/XDR; tu warianty narzędziowe). L4–L5: 2 projekty po rozszerzeniu struktury. Każdy projekt dostanie pełny `theory_md` z **klauzulą etyczno-prawną o monitoringu pracownika i danych w chmurze Microsoft** (niuans #6, dziedziczone #12 z rdzenia), rubrykę (wagi = 100), źródła wg kanonu README.

**Łańcuch zależności:** (EDR/XDR P1–P8 jako prerekwizyt) → D1 (KQL/portal) → D2 (reguły/ASR) → D3 (XDR + Sentinel). Żaden projekt nie wprowadza pojęcia detekcji, którego nie objął wcześniej rdzeń EDR/XDR.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

1. **`EDR / XDR`** (`edr-xdr.md`) — **najważniejszy prerekwizyt**. Cała teoria detekcji na końcówce (wykrywanie zachowań, IOC/IOA, izolacja, polowanie z hipotezą, ATT&CK, granica RODO) jest tam. Defender to jej wykonanie w konkretnym narzędziu. **Wymagane przed L2 Defendera; pożądane przed L1.**
2. **`SIEM`** (`siem.md`) — pojęcie KQL, korelacji, progu i triage, oraz relacja EDR↔SIEM domykana tu integracją Defender↔Sentinel. **Wymagane przed L1** (KQL startuje w SIEM).
3. **`Windows`** (i podstawy `Active Directory`/`IAM`) — Defender to przede wszystkim ekosystem Windows/Microsoft 365; bez rozumienia procesów Windows, kont i logowań tożsamości student nie zinterpretuje tabel `Device*`/`Identity*`. Bazę daje `cyber-iam-active-directory-lab` (partia 1). **Wymagane przed L2.**
4. **Podstawy sieci `TCP/IP`** — do interpretacji `DeviceNetworkEvents`. **Wymagane przed L2.**
5. **Klauzula etyczno-prawna** — art. 267 KK + monitoring pracownika (art. 22³ Kodeksu pracy) + dane w chmurze (RODO). **Wymagane od L1.**

**Czego Microsoft Defender dostarcza dalej:** zasila praktyką `SOC` i `Incident Response` w realiach Microsoft 365 (najczęstszych na polskim rynku) oraz domyka integrację z `SIEM` (Sentinel) i automatyzacją `SOAR`.

---

## 7. Źródła (rzetelne, legalne, oficjalne — do akceptacji Ryana)

> **Dziedziczenie:** otwarte źródła ogólne (MITRE ATT&CK, Atomic Red Team, Sigma, LOLBAS, NIST) są w `edr-xdr.md §7`. Tu **tylko źródła swoiste dla Microsoftu** plus prawo.

**Dokumentacja Microsoft (oficjalna, darmowa):**
- Microsoft Defender for Endpoint — dokumentacja: https://learn.microsoft.com/en-us/defender-endpoint/
- Microsoft Defender XDR — przegląd platformy: https://learn.microsoft.com/en-us/defender-xdr/
- Zaawansowane polowanie — język KQL i schemat tabel (`DeviceProcessEvents` i in.): https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-schema-tables
- Reguły redukcji powierzchni ataku (ASR): https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction
- Microsoft Sentinel (SIEM/SOAR w chmurze) — dokumentacja: https://learn.microsoft.com/en-us/azure/sentinel/
- KQL — kurs/przewodnik Microsoft Learn (Kusto Query Language): https://learn.microsoft.com/en-us/kusto/query/
- Microsoft Learn — ścieżki bezpieczeństwa (SC-200 Security Operations Analyst, darmowe moduły): https://learn.microsoft.com/en-us/training/

**Społecznościowe, otwarte (KQL pod Defender/Sentinel):**
- KQL „cheat sheet" i przykłady detekcji (otwarte repozytoria społeczności, np. Azure-Sentinel na GitHub Microsoftu): https://github.com/Azure/Azure-Sentinel

**Kontekst prawny EU/PL (do klauzul):**
- UODO — monitoring pracownika i dane osobowe w miejscu pracy: https://uodo.gov.pl/
- RODO a przetwarzanie danych w chmurze (region, powierzenie, dostawca): https://eur-lex.europa.eu/eli/reg/2016/679
- Rozporządzenie DORA (sektor finansowy — istotne przy chmurze dostawcy): https://eur-lex.europa.eu/eli/reg/2022/2554

> **Do uwagi Ryana:** projekty wymagają wersji próbnej Defendera/Microsoft 365 — używać wyłącznie zgodnie z regulaminem Microsoft, na własnym najemcie (tenant) testowym, nigdy na cudzym środowisku produkcyjnym. Klauzula obowiązkowa: monitoring pracownika (art. 22³ KP) + świadomość, że telemetria trafia do chmury Microsoftu (region, dostęp — RODO). Wszystkie źródła oficjalne/otwarte; warunki wersji próbnej do weryfikacji aktualności przed `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w CISO, który prowadzi SOC na Microsoft 365 i ocenia, czy poleciłby kandydata po tych projektach. Pięć słabości i poprawki:

1. **Słabość: research powtarzał teorię EDR zamiast skupić się na Microsoft.** CISO: „nie płacę za drugi wykład o tym, czym jest EDR — chcę wiedzieć, czy junior umie KQL i moje tabele". **Poprawka:** całą teorię detekcji jawnie oddelegowałam do `edr-xdr.md` (nagłówek, §4, §6 pkt 1) i przepisałam §2–§3 wyłącznie na specyfikę Microsoftu: tabele, KQL, ASR, AIR, integracja Sentinel/Entra.

2. **Słabość: KQL traktowane jako jedna z umiejętności, nie jako rdzeń.** CISO: „KQL to jest *ta* umiejętność — kto go zna, jest produktywny w Defenderze i Sentinelu od pierwszego dnia". **Poprawka:** wyniosłam KQL na centralną, przenośną umiejętność (§2 spoiwo, niuans #1, obecny we wszystkich projektach D1–D3).

3. **Słabość: pominięty problem licencji.** CISO: „junior, który zakłada, że ma pełny XDR, a klient kupił tylko E3, narobi sobie wstydu na pierwszym spotkaniu". **Poprawka:** dodałam niuans #5 (licencja kształtuje, co widzisz) i wbudowałam decyzję „co firma kupiła" w L3 oraz zapowiedź L5.

4. **Słabość: ASR i automatyczna reakcja bez ostrzeżenia o ryzyku.** CISO: „włączona od razu blokada ASR zatrzyma mi produkcję — to pierwsze, co tępię". **Poprawka:** niuans #3 (najpierw audyt, potem blokada) i #4 (próg zaufania dla AIR), wbudowane w projekt D2.

5. **Słabość: dane w chmurze Microsoftu pominięte w wątku RODO.** CISO: „w sektorze publicznym i finansowym region danych i dostęp dostawcy to być albo nie być projektu". **Poprawka:** niuans #6 i rozszerzenie klauzuli o „dane u dostawcy chmury" (§5, §6 pkt 5, uwaga dla Ryana) — ponad dziedziczone #12 z rdzenia.

**Sprawdzenie tłumaczenia żargonu (sekcja 3 CLAUDE.md):** każdy termin rozwinięty przy pierwszym użyciu (Microsoft Defender XDR, MDE/Defender for Endpoint, Defender for Identity/Office 365, Sentinel, Entra ID/Azure AD, KQL, advanced hunting/zaawansowane polowanie, tabele `Device*`/`Identity*`, ASR, AIR, Intune, GPO, tenant/najemca, licencje E3/E5, incydent vs alert). Terminy detekcji (IOA, izolacja, ATT&CK) odsyłane do `edr-xdr.md`, gdzie są pierwotnie tłumaczone.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test „czy pracodawca EU na Microsoft 365 uzna kandydata za gotowego" — spełniony, jeśli autoring domknie 3 projekty swoiste L1–L3 (centralnie KQL + tabele + ASR + XDR/Sentinel) *na bazie* opanowanego rdzenia EDR/XDR. Pełna zawodowość organizacyjna (architektura, licencje, region danych) wymaga L4/L5 — zapowiedziane, zależne od Ethana/Leo. **Granica dziedziczenia uczciwie oznaczona:** ten plik bez `edr-xdr.md` jest niekompletny — to świadomy wybór przeciw duplikacji.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
