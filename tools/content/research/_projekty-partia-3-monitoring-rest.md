# Dossier źródeł — partia 3: domknięcie klastra „SIEM i Monitorowanie Zdarzeń"

> **Wersja:** v1.0 · 2026-07-01 · autor: Sophia (Product Owner), w parze z researcherem źródeł
> **Zadanie:** E3 „domknięcie cyber" — slate 2 projektów domykających klaster „SIEM i Monitorowanie Zdarzeń" ścieżki Cybersecurity Specialist.
> **Kontekst:** SIEM/SOC/Splunk pokryte głębiej (partia 1+2, 12 projektów). Ta partia dokłada dwie ostatnie, nadbudowane warstwy cyklu: **automatyzację reakcji (SOAR)** i **reagowanie na incydent (Incident Response, NIST SP 800-61)**. EDR/XDR + konkretne platformy (Microsoft Defender, CrowdStrike) wchodzą jako **kontekst** (role acquired), bo w praktyce to one dostarczają alert wyzwalający playbook i telemetrię do rekonstrukcji incydentu.
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7 — art. 22 RODO dla auto-akcji SOAR, monitoring pracownika przy telemetrii EDR) → Ethan/Leo (dosłowne liście `career-model.ts`, kontrakt `README-cyber-projects.md`).
> **Źródła researchu bazowego:** `research/soar.md`, `research/incident-response.md`, `research/edr-xdr.md`, `research/microsoft-defender.md`, `research/crowdstrike.md`.

---

## Reguła pokrycia klastra (weryfikacja)

Ważne liście klastra do domknięcia: **SOAR · EDR / XDR · Microsoft Defender · CrowdStrike · Incident Response**. Każdy musi trafić do ≥1 projektu (required lub acquired):

| Liść | Projekt 1 (SOAR) | Projekt 2 (Incident Response) |
|---|---|---|
| SOAR | **required** | — |
| EDR / XDR | **required** | acquired |
| Microsoft Defender | acquired | — |
| CrowdStrike | — | acquired |
| Incident Response | acquired | **required** |

Każdy ważny liść ma pokrycie; każdy projekt ma ≥1 `required`. Mix poziomów: **L3 (SOAR, portfolio) + L2 (Incident Response, ćwiczenie)** — fundament reakcji niżej, zwieńczenie automatyzacji wyżej.

---

## Projekt 1 — `cyber-soar-playbook-reakcja-edr-bramka-czlowieka` (L3, 24 h)

**Koncept.** Student buduje i testuje pełny playbook (scenariusz reakcji) automatyzacji odpowiedzi na alert z EDR (wykrywanie na końcówce) — od wejścia (alert typu „przejęcie konta / podejrzane drzewo procesów") przez wzbogacenie kontekstem, ocenę ryzyka, rozgałęzienie (auto-akcja dla niskiego ryzyka, bramka zatwierdzenia człowieka dla działania nieodwracalnego) po reakcję, zamknięcie zgłoszenia i powiadomienie. Sednem nie jest „ile da się zautomatyzować", lecz **klasyfikacja kroków wg odwracalności**, para metryk (oszczędność czasu + wskaźnik błędnych auto-akcji) i bezpiecznik (wyłącznik awaryjny + wycofanie). Środowisko: otwartoźródłowy SOAR **Shuffle** we własnym labie.

**Źródło główne (oss):** https://github.com/Shuffle/Shuffle
- Zweryfikowane 2026-07-01: repozytorium publiczne. Backend na licencji AGPLv3, workflowy/aplikacje/SDK/dokumentacja na MIT. „Open source automation platform, built for and by security professionals."
- Dokumentacja (publiczna): https://shuffler.io/docs

**Materiały pomocnicze (publiczne/oficjalne):**
- NIST SP 800-61r3 „Incident Response Recommendations and Considerations" (kwiecień 2025, zastępuje r2) — osadzenie playbooka w fazach reakcji: https://csrc.nist.gov/pubs/sp/800/61/r3/final
- MITRE ATT&CK — techniki napastnika jako wyzwalacze playbooka: https://attack.mitre.org/
- Microsoft Defender for Endpoint — schemat alertu i API reakcji jako przykładowe źródło wyzwalacza (kontekst liścia Microsoft Defender): https://learn.microsoft.com/en-us/defender-endpoint/
- RODO art. 22 (zautomatyzowane decyzje wobec osób — blokada konta pracownika): https://eur-lex.europa.eu/eli/reg/2016/679

**Uzasadnienie legalności.** Shuffle to otwarte oprogramowanie (AGPLv3/MIT) uruchamiane **wyłącznie we własnym labie** — zero cudzej infrastruktury. Wzbogacanie przez publiczne API reputacji (AbuseIPDB / VirusTotal darmowy limit albo otwarte listy zagrożeń) używane zgodnie z regulaminem darmowego użytku, bez zachęty do jego łamania; klucz API w magazynie sekretów narzędzia, nigdy na sztywno w playbooku. **Wymagana klauzula etyczno-prawna** rozszerzona: art. 267 Kodeksu karnego (nieautoryzowany dostęp) **plus art. 22 RODO** — SOAR podejmuje działania wobec ludzi (blokada konta), więc log każdej auto-akcji, możliwość interwencji człowieka i uzasadnienie to wymóg, nie dodatek. Adresy IP w przykładach maskowane.

**Prerekwizyty (acquired + łańcuch):** SIEM/SOC (partia 1+2), Incident Response (osadzenie w fazach — acquired w tym projekcie), Python (integracja API/JSON — `cyber-python-automatyzacja-logow`), IAM/Active Directory (auto-akcje na tożsamości — `cyber-iam-active-directory-lab`), EDR/XDR (źródło alertu — required).

**Szkic rubryki (suma 100):**
1. Playbook reakcji od alertu do domknięcia z ≥1 auto-akcją i ≥1 bramką człowieka — 30
2. Klasyfikacja kroków wg odwracalności + świadoma bramka human-in-the-loop przed działaniem nieodwracalnym — 20
3. Wzbogacanie alertu przez integrację API (klucz w magazynie sekretów, nie w treści) — 15
4. Para metryk (oszczędność czasu + wskaźnik błędnych auto-akcji) oraz bezpiecznik (wyłącznik awaryjny / wycofanie) — 20
5. Obsługa błędów integracji, dowód testu przed produkcją, dokumentacja/etyka (art. 267 KK + art. 22 RODO) — 15

---

## Projekt 2 — `cyber-incident-response-nist-cykl-zycia` (L2, 12 h)

**Koncept.** Ćwiczenie reagowania na incydent poprowadzone wprost przez sześć kroków cyklu życia NIST SP 800-61 (przygotowanie → wykrycie/analiza → powstrzymanie → eradykacja → odtworzenie → wnioski). Na publicznym, wieloźródłowym zbiorze danych SOC student klasyfikuje incydent (kategoria + waga), wybiera i uzasadnia strategię powstrzymania (kompromis „odciąć szybko vs zachować widoczność"), buduje oś czasu z wielu źródeł logów, zabezpiecza dowód z łańcuchem dowodowym (skrót kryptograficzny + historia kto/kiedy/jak) na **własnym, syntetycznym artefakcie**, i pisze komunikat o stanie incydentu rozdzielający fakty od domysłów wraz z decyzją, czy rusza zegar zgłoszenia (RODO 72 h / NIS2). Telemetria końcówki w danych (Sysmon, zdarzenia Windows) daje kontekst EDR/CrowdStrike.

**Źródło główne (open_data):** https://github.com/splunk/botsv3
- Zweryfikowane 2026-07-01: publiczny zbiór „Boss of the SOC v3", 320 MB, dane wieloźródłowe (ruch sieciowy, logi systemowe Linux/Windows/Sysmon, chmura AWS/O365/Azure AD, ochrona końcówek). Idealny do rekonstrukcji osi czasu incydentu i decyzji reakcji.

**Materiały pomocnicze (publiczne/oficjalne):**
- NIST SP 800-61r3 „Incident Response Recommendations and Considerations" (kanon cyklu życia, kwiecień 2025): https://csrc.nist.gov/pubs/sp/800/61/r3/final
- NIST SP 800-86 „Integrating Forensic Techniques into Incident Response" (dowody i łańcuch dowodowy): https://csrc.nist.gov/pubs/sp/800/86/final
- CISA — Federal Incident and Vulnerability Response Playbooks (oficjalne wzorce procedur): https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks
- MITRE ATT&CK — mapowanie ścieżki napastnika dla pełnej eradykacji: https://attack.mitre.org/
- RODO art. 33 (zgłoszenie naruszenia w 72 h) + NIS2 (24 h/72 h): https://eur-lex.europa.eu/eli/reg/2016/679 , https://eur-lex.europa.eu/eli/dir/2022/2555

**Uzasadnienie legalności.** BOTS v3 to publiczny, darmowy zbiór edukacyjny Splunka (bez redystrybucji poza labem). Cała praca na danych publicznych/treningowych — zero cudzej infrastruktury ani realnych danych osobowych osób trzecich. Dowód forensyczny zabezpieczany **wyłącznie na własnym, syntetycznym artefakcie**. **Wymagana klauzula etyczno-prawna** standardowa: art. 267 Kodeksu karnego; adresy IP w oddanym artefakcie maskowane (RODO, minimalizacja danych; adres IP bywa daną osobową — TSUE Breyer C-582/14). Uwaga Ryana: NIST 800-61r2 wycofany 2025 — cytujemy r3 jako aktualny, r2 pozostaje pomocniczo (zgodność z partią 2).

**Prerekwizyty (acquired + łańcuch):** SOC (IR startuje po triage/eskalacji — required tu), SIEM (oś czasu z danych — partia 1+2), EDR/XDR (telemetria końcówki — acquired), CrowdStrike (styl wykrycia/telemetrii na końcówce — acquired), TCP/IP i Windows/Linux (interpretacja śladów — partia 1).

**Szkic rubryki (suma 100):**
1. Osadzenie scenariusza w sześciu krokach NIST 800-61 z uzasadnieniem kolejności (powstrzymanie przed eradykacją, dowody przed czyszczeniem) — 25
2. Wybór i uzasadnienie strategii powstrzymania (kompromis czas ↔ widoczność) — 20
3. Oś czasu z wielu źródeł logów + łańcuch dowodowy (skrót kryptograficzny + kto/kiedy/jak) na własnym artefakcie — 25
4. Komunikat o stanie incydentu (fakty vs domysły) + decyzja o zegarze zgłoszenia (RODO 72 h / NIS2) — 20
5. Odtwarzalność, maskowanie IP, RODO i klauzula etyczno-prawna — 10

---

## Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

1. **Ryzyko: SOAR jako „automatyzuj wszystko".** Ujęte — rubryka P1 kryterium 2 (klasyfikacja wg odwracalności + bramka człowieka) jest drugie co do wagi; art. 22 RODO wpisany w klauzulę. Nie celebrujemy automatyzacji, tylko powściągliwość.
2. **Ryzyko: metryka oszczędności bez metryki błędu.** Ujęte — kryterium 4 wymaga *pary* metryk (oszczędność + wskaźnik błędnych auto-akcji).
3. **Ryzyko: IR jako sama technika.** Ujęte — rubryka P2 kryterium 4 (komunikacja + zegar zgłoszenia) traktuje wymiar prawno-komunikacyjny na równi z techniką.
4. **Ryzyko: pokrycie Defender/CrowdStrike „na siłę".** Uczciwie oznaczone jako **kontekst (acquired)** — to konkretyzacje EDR/XDR; SOAR reaguje na alert Defendera (API reakcji), IR rekonstruuje telemetrię, jaką prezentuje Falcon/Defender. Nie udajemy pełnego kursu narzędzia — to zgodne z regułą „acquired = prereq/kontekst".
5. **Ryzyko: przeterminowane źródło (NIST 800-61r2 wycofany).** Ujęte — cytujemy r3 (2025) jako aktualny; r2 tylko pomocniczo dla ciągłości z partią 2.

**Tłumaczenie żargonu (sekcja 3 CLAUDE.md):** playbook, SOAR, EDR/XDR, human-in-the-loop, wyłącznik awaryjny, łańcuch dowodowy, skrót kryptograficzny, IOA/IOC, telemetria — rozwinięte po polsku przy pierwszym użyciu w tekstach projektów (theory_md, faza E3-A).
