# Dossier źródeł — partia 3: domknięcie cyber (Windows + PowerShell)

> **Zadanie:** E3 „domknięcie cyber" — slate projektów dla klastra „Administracja systemami i skrypty" ścieżki Cybersecurity Specialist.
> **Wersja:** v1.0 · 2026-07-01 · autor: Sophia (Product Owner), w parze z researcherem źródeł.
> **Zakres:** liście `Windows` i `PowerShell` (Linux/Bash pokryte w partii 1 przez `cyber-hardening-linux-bash`). Domykamy hartowanie i widoczność Windows + audyt/automatyzację/detekcję w PowerShell na własnej maszynie.
> **Wejście researchu:** `tools/content/research/windows.md` (v1.0) + `tools/content/research/powershell.md` (v1.0) — głębokie, recenzowane. Ten plik NIE powtarza teorii; wybiera z niej zakres na 6 projektów i przypina zweryfikowane, publiczne źródła.
> **Recenzja przed autoringiem treści (faza E3-A):** Ryan (legalność/RODO) → Ethan/Leo (dosłowne liście `career-model.ts`, kontrakt narzędzia).

---

## 0. Zasada i pokrycie klastra

Klaster „Administracja systemami i skrypty" ma cztery liście: `Linux`, `Windows`, `PowerShell`, `Bash`. Linux i Bash domyka partia 1 (`cyber-hardening-linux-bash`, `cyber-python-automatyzacja-logow`). **Ta partia domyka dwa pozostałe: `Windows` i `PowerShell`** — oba trafiają do slate jako `required` w co najmniej dwóch projektach każdy (reguła pokrycia §2 frameworku spełniona).

**6 projektów, mix poziomów** (fundament niżej, portfolio wyżej):

| # | Slug | Poziom | h | Liść wiodący (required) | Mosty (required/acquired) |
|---|---|---|---|---|---|
| 1 | `cyber-windows-dziennik-zdarzen-triage` | L1 | 5 | Windows | TCP/IP, Network (acquired) |
| 2 | `cyber-windows-hartowanie-audyt-widocznosc` | L2 | 12 | Windows | Linux (acquired) |
| 3 | `cyber-windows-slad-ataku-detekcja-attack` | L3 | 24 | Windows, SIEM, SOC | Incident Response (acquired) |
| 4 | `cyber-powershell-dziennik-triage-obronca` | L1 | 5 | PowerShell | Windows, Bash (acquired) |
| 5 | `cyber-powershell-audyt-zbieranie-dowodow` | L2 | 12 | PowerShell | Windows (acquired) |
| 6 | `cyber-powershell-detekcja-naduzycia-attack` | L3 | 26 | PowerShell, SIEM, SOC | Windows, Incident Response (acquired) |

Łańcuch autoringu (kolejność zależności): 1 → 2 → 3 (Windows) oraz 4 → 5 → 6 (PowerShell, po Windows). Żaden projekt nie wprowadza pojęcia bez pokrycia we wcześniejszym: nie ma detekcji (3, 6) bez włączonej widoczności (2, 6-część logowania), a tej nie ma bez rozumienia dziennika (1, 4).

**Wszystkie slugi sprawdzone przeciw liście istniejących** (12 projektów cyber: partia 1 + partia 2 SIEM) — zero kolizji, prefiks `cyber-`, kebab-case.

---

## 1. Źródła — zweryfikowane 2026-07-01 (realne, publiczne, darmowe)

Każdy adres sprawdzony na żywo. Dwa adresy z researchu Windows/PowerShell okazały się przeniesione (404) — podmienione na aktualne, poprawne strony Microsoft Learn (oznaczone [PODMIANA]).

**Zbiory danych i repozytoria OSS (główne źródła projektów):**

| Źródło | URL | Licencja | Rola |
|---|---|---|---|
| EVTX-ATTACK-SAMPLES (sbousseaden) | https://github.com/sbousseaden/EVTX-ATTACK-SAMPLES | GPL-3.0 | ~200 realnych plików dziennika zdarzeń Windows (`.evtx`) zmapowanych na MITRE ATT&CK — logowania, tworzenie procesów, nadużycie PowerShella. Publiczny zbiór, gotowy do czytania i parsowania bez własnego ataku. |
| Sysmon (Microsoft Sysinternals) | https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon | darmowe (Microsoft) | Rozszerzona telemetria: tworzenie procesów z linią poleceń, połączenia, rejestr. |
| sysmon-modular (olafhartong) | https://github.com/olafhartong/sysmon-modular | MIT | Modułowa, publiczna konfiguracja Sysmon zmapowana na ATT&CK — punkt startu widoczności. |
| Atomic Red Team (Red Canary) | https://github.com/redcanaryco/atomic-red-team | MIT | Bezpieczne odwzorowania technik ATT&CK do testu detekcji na własnym, izolowanym labie. |
| Sigma (SigmaHQ) | https://github.com/SigmaHQ/sigma | DRL / open | Neutralny, otwarty format reguł detekcji (tłumaczony na SPL/KQL). |
| Kansa (davehull) | https://github.com/davehull/Kansa | Apache-2.0 | Publiczny, modułowy framework zbierania dowodów w PowerShell — wzorzec do nauki (student pisze własne, nie kopiuje). |

**Dokumentacja oficjalna (Microsoft, darmowa) i standardy:**

| Źródło | URL |
|---|---|
| PowerShell — logowanie (Script Block/Module/Transcription, Event ID 4104) | https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_logging_windows |
| Get-WinEvent (odczyt dziennika poleceniem) | https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent |
| About Execution Policies (czemu to nie zabezpieczenie) | https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies |
| System Audit Policy recommendations [PODMIANA — stary URL 404] | https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/audit-policy-recommendations |
| Advanced Audit Policy Configuration [PODMIANA] | https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/security-best-practices/advanced-audit-policy-configuration |
| Microsoft Security Baselines | https://learn.microsoft.com/en-us/windows/security/operating-system-security/device-management/windows-security-configuration-framework/windows-security-baselines |
| Windows Server — darmowa wersja ewaluacyjna (180 dni, do laba) | https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server |
| CIS Benchmarks for Microsoft Windows | https://www.cisecurity.org/benchmark/microsoft_windows_desktop |
| MITRE ATT&CK | https://attack.mitre.org/ |
| MITRE ATT&CK — T1059.001 (PowerShell) | https://attack.mitre.org/techniques/T1059/001/ |
| NIST SP 800-92 (zarządzanie logami) | https://csrc.nist.gov/pubs/sp/800/92/final |
| NIST Cybersecurity Framework 2.0 | https://www.nist.gov/cyberframework |

**Kontekst prawny EU/PL (klauzule):**

| Źródło | URL |
|---|---|
| TSUE, Breyer C-582/14 (adres IP jako dana osobowa) | https://curia.europa.eu/juris/liste.jsf?num=C-582/14 |
| Dyrektywa NIS2 | https://eur-lex.europa.eu/eli/dir/2022/2555 |

**Uzasadnienie legalności (całość):** wyłącznie materiały oficjalne/otwarte, zero źródeł pirackich. Windows tylko w darmowej wersji ewaluacyjnej (180 dni, cel nauki). EVTX-ATTACK-SAMPLES to publiczny zbiór treningowy — student pracuje na cudzych *danych treningowych oddanych do tego celu*, nie na cudzym systemie. Symulacje ofensywne (Atomic Red Team) wyłącznie na własnym, izolowanym labie bez sieci wyjściowej. Dzienniki zdarzeń bywają danymi osobowymi (login, adres IP — Breyer C-582/14) → każdy projekt wymaga maskowania IP i klauzuli etyczno-prawnej. Projekty L3 (3, 6) dotykają wykonania kodu → twardsza klauzula: art. 267 **i** 269a Kodeksu karnego, lab odcięty od internetu.

---

## 2. Projekty — koncept, źródło, legalność, prerekwizyty, szkic rubryki

### Projekt 1 — `cyber-windows-dziennik-zdarzen-triage` (L1, 5 h)

- **Koncept:** na publicznym zbiorze realnych plików dziennika zdarzeń Windows (EVTX-ATTACK-SAMPLES) student odnajduje i interpretuje kluczowe zdarzenia bezpieczeństwa — udane (4624) i nieudane (4625) logowanie, utworzenie konta (4720) — odczytuje konto, czas i **typ logowania** (interaktywne/sieciowe/RDP), eksportuje fragment jako dowód. Oddaje repozytorium z tabelą interpretacji i eksportem.
- **Źródło:** EVTX-ATTACK-SAMPLES (open_data, GPL-3.0). Zapasowo: własna maszyna ewaluacyjna Windows Server (180 dni).
- **Legalność:** cudze *dane treningowe* oddane do nauki, nie cudzy system; maskowanie IP; klauzula art. 267 KK. Bez technik ofensywnych na L1 → klauzula w wersji bazowej (jak golden `cyber-siem-czas-strefy-event-time`).
- **Prerekwizyty (acquired):** `TCP/IP`, `Network` — bez pojęcia adresu/portu/sesji student nie zinterpretuje typu logowania 3 (sieciowe) i 10 (RDP). (Research Windows §6 pkt 2.)
- **Szkic rubryki (Σ=100):** interpretacja 4624/4625/4720 z odczytem konta/czasu (30) · rozróżnienie typu logowania i jego znaczenia (25) · Event ID w kontekście, nie w izolacji — pokazanie, że sam ID kłamie (25) · eksport fragmentu jako dowód (10) · odtwarzalność, atrybucja, etyka/maskowanie (10).
- **Niuanse z researchu:** #2 (ID bez kontekstu kłamie), #3 (typ logowania to klucz interpretacji).

### Projekt 2 — `cyber-windows-hartowanie-audyt-widocznosc` (L2, 12 h)

- **Koncept:** student utwardza własną treningową maszynę Windows wg jawnej listy zmian (hasła, zbędne usługi, zapora) opartej o publiczny punkt odniesienia (CIS / Microsoft Security Baseline), **i** — co równie ważne — włącza politykę audytu oraz Sysmon (konfiguracja sysmon-modular), by właściwe ślady w ogóle powstawały. Dla każdej zmiany dokumentuje, na jaki atak odpowiada; mierzy przed/po. Oddaje repozytorium z listą zmian, konfiguracją audytu/Sysmon i dowodem, że nowe zdarzenia powstają.
- **Źródło:** sysmon-modular (oss, MIT) jako główny artefakt widoczności; CIS Benchmark + Microsoft Security Baselines jako standard hartowania (learning_resources).
- **Legalność:** wyłącznie własna maszyna (eval 180 dni); zero cudzej infrastruktury; klauzula bazowa. Bez symulacji ataku → art. 267 KK w wersji bazowej.
- **Prerekwizyty (acquired):** `Linux` — pojęcie hartowania („zamykanie zbędnych drzwi") budowane równolegle przez partię 1 `cyber-hardening-linux-bash`; Windows nadbudowuje specyfiką. (Research Windows §6 pkt 3.)
- **Szkic rubryki (Σ=100):** lista zmian hartujących z uzasadnieniem per zmianę wobec konkretnego ataku (30) · włączenie polityki audytu + Sysmon z dowodem, że właściwe zdarzenia teraz powstają (30) · odniesienie do punktu bazowego (CIS/MS) i świadome odstępstwo z dokumentacją, nie ślepe wklejenie (20) · pomiar powierzchni ataku przed/po (10) · odtwarzalność, atrybucja, etyka (10).
- **Niuanse:** #1 (domyślny Windows loguje za mało — hartowanie bez audytu to połowa roboty), #6 (najmniejsze uprawnienie to architektura), #10 (baseline to punkt wyjścia, nie wyrocznia).

### Projekt 3 — `cyber-windows-slad-ataku-detekcja-attack` (L3, 24 h)

- **Koncept:** na własnym, izolowanym labie student odtwarza bezpieczną symulację techniki ATT&CK (Atomic Red Team) — albo analizuje gotowy ślad z EVTX-ATTACK-SAMPLES — pokazuje, jaki ślad technika zostawiła w dzienniku/Sysmon, buduje oś czasu zdarzeń hosta, pisze regułę detekcji w formacie Sigma zmapowaną na konkretną technikę ATT&CK, dowodzi jej odpalenia i doprowadza zdarzenia do SIEM (most). Świadomie nazywa lukę pokrycia.
- **Źródło:** Atomic Red Team (oss, MIT) — główne; EVTX-ATTACK-SAMPLES jako gotowy ślad; Sigma + MITRE ATT&CK.
- **Legalność:** **twardsza klauzula** — art. 267 i 269a KK; lab odcięty od internetu (bez sieci wyjściowej); symulacja wyłącznie przez Atomic Red Team na własnej maszynie (wzorzec golden `cyber-siem-strojenie-testowanie-detekcji`). Maskowanie IP.
- **Prerekwizyty (acquired):** `Incident Response` — triage hosta i budowa osi czasu to rzemiosło IR wprowadzane w grupie SIEM. Wiodące required: `Windows` (system), `SIEM` + `SOC` (most detekcji).
- **Szkic rubryki (Σ=100):** ślad techniki pokazany w dzienniku/Sysmon (linia poleceń jako serce detekcji) (25) · reguła Sigma zmapowana na technikę ATT&CK z dowodem odpalenia (30) · oś czasu zdarzeń hosta po incydencie (15) · świadomie nazwana luka pokrycia (blind spot) + doprowadzenie zdarzeń do SIEM (15) · etyka labu (art. 269a, brak sieci wyjściowej), odtwarzalność, atrybucja (15).
- **Niuanse:** #4 (linia poleceń), #5 (living-off-the-land), #7 (mapowanie ATT&CK), #8 (trwałość w nudnych miejscach).

### Projekt 4 — `cyber-powershell-dziennik-triage-obronca` (L1, 5 h)

- **Koncept:** student pisze 3–5 poleceń / krótki skrypt PowerShell (`Get-WinEvent`), który pobiera wybrane zdarzenia bezpieczeństwa (np. 4625) z publicznych plików `.evtx`, filtruje **po polach obiektu** (nie po tekście), zlicza i eksportuje do CSV; dodatkowo zbiera prosty „zrzut stanu" maszyny (procesy, konta, zadania). Opisuje, do czego obrońcy służy każdy wynik.
- **Źródło:** EVTX-ATTACK-SAMPLES (open_data) parsowane `Get-WinEvent`; docs PowerShell.
- **Legalność:** dane treningowe + własna maszyna; maskowanie IP; klauzula bazowa (L1, bez technik ofensywnych).
- **Prerekwizyty (acquired):** `Windows` (twardy — konta, uprawnienia, Event ID; research PowerShell §6 pkt 1) oraz `Bash` (analogia powłoki/automatyzacji z partii 1). Wiodące required: `PowerShell`.
- **Szkic rubryki (Σ=100):** skrypt pobiera i filtruje właściwe zdarzenia po polach obiektu, z eksportem (30) · filtrowanie po właściwości obiektu, nie „cięcie tekstu" — dowód rozumienia potoku/obiektu (25) · zrzut stanu maszyny (procesy/konta/zadania) (20) · opis wartości obrończej każdego wyniku (15) · odtwarzalność, atrybucja, etyka (10).
- **Niuanse:** #3 (PowerShell zwraca obiekty, nie tekst — pierwszy próg), #10 (czas/strefy w zdarzeniach). Świadomość, że execution policy to nie zabezpieczenie (#4) — wprowadzana jako pojęcie.

### Projekt 5 — `cyber-powershell-audyt-zbieranie-dowodow` (L2, 12 h)

- **Koncept:** student pisze dwa czytelne, parametryzowane, idempotentne skrypty PowerShell: (a) audyt konfiguracji z raportem „zgodne/niezgodne" wobec listy oczekiwań (polityka haseł, usługi, zapora, członkostwo w grupie administratorów), (b) zbieranie pakietu dowodów po podejrzeniu incydentu (procesy z linią poleceń, połączenia, zadania zaplanowane, autostart, ostatnie logowania). Framework Kansa jako wzorzec do nauki — student pisze własne. Dokumentuje, na jaki cel bezpieczeństwa odpowiada każdy element i że własny skrypt też zostawia ślad.
- **Źródło:** Kansa (oss, Apache-2.0) jako wzorzec architektury zbierania; CIS Benchmark jako lista oczekiwań audytu (learning_resources).
- **Legalność:** wyłącznie własna maszyna; „zbieranie dowodów zmienia dowody" udokumentowane; klauzula bazowa. Bez symulacji ataku.
- **Prerekwizyty (acquired):** `Windows` (konta, uprawnienia, dziennik). Wiodące required: `PowerShell`.
- **Szkic rubryki (Σ=100):** skrypt audytu parametryzowany, idempotentny, z obsługą błędów i raportem zgodności (30) · skrypt zbierania pakietu dowodów triage — komplet artefaktów (30) · higiena skryptu bezpieczeństwa: odwracalność, brak wartości zaszytych na sztywno, ograniczenie uprawnień (20) · udokumentowanie własnego śladu („obserwator zmienia obserwowane") (10) · odtwarzalność, atrybucja Kansa, etyka (10).
- **Niuanse:** #4 (execution policy to nie zabezpieczenie), #9 (skrypt obrońcy też szkodzi i zostawia ślad).

### Projekt 6 — `cyber-powershell-detekcja-naduzycia-attack` (L3, 26 h)

- **Koncept:** student włącza logowanie bloków skryptów (Script Block Logging, Event ID 4104) na własnej maszynie, na izolowanym labie odtwarza bezpieczną symulację nadużycia PowerShella (Atomic Red Team, technika T1059.001 — zakodowane polecenie, pobranie kodu z sieci), pokazuje jej ślad w logu 4104, pisze regułę detekcji **opartą na zachowaniu, nie na nazwie procesu**, zmapowaną na T1059.001, dowodzi jej odpalenia, doprowadza zdarzenia 4104 do SIEM i nazywa lukę pokrycia (np. atak przez zejście do PowerShell 2.0).
- **Źródło:** Atomic Red Team (oss, MIT) — atomики T1059.001; about_logging_windows (4104); Sigma; MITRE ATT&CK T1059.001.
- **Legalność:** **najtwardsza klauzula w slate** — art. 267 i 269a KK; lab bez sieci wyjściowej; wykonanie kodu wyłącznie przez Atomic Red Team na własnej maszynie (research PowerShell §7 — podwyższone ryzyko). Maskowanie IP; logi bloków skryptów bywają danymi osobowymi.
- **Prerekwizyty (acquired):** `Windows`, `Incident Response`. Wiodące required: `PowerShell`, `SIEM`, `SOC` (most detekcji living-off-the-land).
- **Szkic rubryki (Σ=100):** włączenie Script Block Logging (4104) + pokazanie śladu nadużycia (25) · reguła detekcji po zachowaniu (argumenty/pobieranie), nie po nazwie `powershell.exe`, zmapowana na T1059.001, z dowodem odpalenia (30) · doprowadzenie 4104 do SIEM + nazwana luka pokrycia (downgrade do 2.0) (20) · rozumienie dwoistości: to samo narzędzie broni i atakuje (10) · etyka labu (art. 269a, brak sieci wyjściowej), odtwarzalność, atrybucja (15).
- **Niuanse:** #2 (Script Block Logging zamienia zagrożenie w źródło detekcji), #3 (detekcja po zachowaniu, nie po nazwie), #5 (living-off-the-land), #7 (downgrade attack), #8 (mapowanie T1059.001).

---

## 3. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

1. **Ryzyko „kursu administracji", nie bezpieczeństwa.** Poprawka: każdy projekt Windows ma soczewkę obrońcy (ślad, hartowanie pod atak, detekcja), nie „instalację ról". Administracja tylko tam, gdzie służy bezpieczeństwu.
2. **Ryzyko detekcji deklaratywnej bez dowodu.** Poprawka: L3 (projekty 3, 6) wymagają dowodu odpalenia reguły na realnym śladzie (Atomic Red Team / 4104), nie „napisz regułę na 4625". Wzorzec golden `cyber-siem-strojenie-testowanie-detekcji`.
3. **Ryzyko nauczenia ataku bez ramy prawnej.** Poprawka: projekty dotykające wykonania kodu (3, 6) dostają twardszą klauzulę (art. 267 + 269a, lab bez sieci wyjściowej) — spójne z podwyższonym ryzykiem z researchu PowerShell §7.
4. **Ryzyko martwego pola „domyślny Windows loguje za mało".** Poprawka: osobny projekt L2 (2) o włączeniu audytu i Sysmon — widoczność jako warunek detekcji, nie dodatek; a projekt 6 czyni Script Block Logging fundamentem detekcji PowerShella.
5. **Ryzyko nieaktualnych źródeł.** Poprawka: wszystkie URL sprawdzone 2026-07-01; dwa przeniesione adresy Microsoft (audit-policy) podmienione na obowiązujące. Każde źródło ma jawną licencję (GPL-3.0/MIT/Apache-2.0/darmowe MS).

**Tłumaczenie żargonu:** każdy termin rozwinięty po polsku przy pierwszym użyciu w konceptach i rubrykach (dziennik zdarzeń/Event Log, Event ID, typ logowania, hartowanie, Sysmon, baseline, Script Block Logging, living-off-the-land, MITRE ATT&CK, Sigma, T1059.001, idempotencja, triage). Faza E3-A (pełny `theory_md`) dopełni to w każdym projekcie.

**Poprzeczka zawodowa (North Star):** slate domyka klaster Windows+PowerShell dla juniora SOC/admina bezpieczeństwa — od czytania śladu (L1), przez hartowanie i widoczność (L2), po detekcję zmapowaną na ATT&CK z dowodem (L3). Zakres L4/L5 (dochodzenie z brudnego zrzutu, strategia floty) świadomie odłożony — zależny od rozszerzenia schemy przez Ethana/Leo.
