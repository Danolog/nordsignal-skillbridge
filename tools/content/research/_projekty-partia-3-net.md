# Dossier źródeł — partia 3 (klaster „Infrastruktura i sieci")

> **Wersja:** v1.0 · 2026-07-01 · autor: Sophia (Product Owner), w parze z researcherem źródeł
> **Zadanie:** E3 „domknięcie cyber" — slate 2 projektów dla klastra „Infrastruktura i sieci" ścieżki Cybersecurity Specialist.
> **Liście do pokrycia:** `Network`, `TCP/IP`, `Firewall / IDS-IPS` (grupa `context-group` w `src/lib/db/data/career-model.ts`, l. 593–607).
> **Kanon kontraktu:** `tools/content/README-cyber-projects.md` (v0.1, Leo). **Wzorzec jakości:** `tools/content/cyber-projects-partia-2.json` (8 projektów SIEM).
> **Research liści:** `tools/content/research/{network,tcp-ip,firewall-ids-ips}.md`.

---

## 0. Decyzja projektowa — pokrycie 3 liści dwoma projektami

Klaster ma trzy liście. Slate ma dwa projekty — więc każdy projekt musi pokryć więcej niż jeden liść, a każdy **ważny** liść musi trafić do co najmniej jednego projektu przez `required` lub `acquired` (reguła pokrycia E3). Podział wynika z naturalnej granicy rzemiosła w klastrze i z łańcucha prerekwizytów researchu (`TCP/IP` → `Network` → `Firewall / IDS-IPS`):

- **Projekt 1 (L2) — czytanie ruchu.** Analiza publicznego zrzutu PCAP: rekonstrukcja sesji (język pakietu = `TCP/IP`) i rozpoznanie wzorca wrogiego ruchu w kontekście architektury sieci (strefy, wschód–zachód, ruch boczny = `Network`). Domyka `TCP/IP` (required) **i** `Network` (required).
- **Projekt 2 (L3) — egzekucja i wykrywanie.** Napisanie i strojenie reguły IDS w Suricacie, dowód wykrycia przez odtworzenie ruchu na własnym labie, mapa na ATT&CK i most do SIEM. Domyka `Firewall / IDS-IPS` (required) i nadbudowuje na `TCP/IP` + `Network` (acquired).

**Tabela pokrycia (reguła E3 — każdy ważny liść w ≥1 projekcie):**

| Liść klastra | Projekt 1 (L2) | Projekt 2 (L3) |
|---|---|---|
| `TCP/IP` | **required** | acquired |
| `Network` | **required** | acquired |
| `Firewall / IDS-IPS` | — | **required** |

Wszystkie trzy liście pokryte. Poziomy: fundament (L2 — czytanie ruchu) niżej, portfolio (L3 — inżynieria detekcji) wyżej. L1 klastra domykają projekty partii 1 (`cyber-hardening-linux-bash` — `Linux`/`Bash`) jako prerekwizyt systemowy; sam `TCP/IP` na poziomie L2 jest sensownym progiem wejścia do klastra sieciowego (student już umie uruchomić narzędzie i porusza się w wierszu poleceń).

---

## 1. Projekt 1 — `cyber-network-analiza-ruchu-wireshark` (L2)

**Tytuł:** Analiza ruchu sieciowego: co naprawdę dzieje się w publicznym zrzucie PCAP

**Koncept (co student zbuduje).** Student bierze publiczny, edukacyjny zrzut ruchu sieciowego (PCAP — packet capture, standardowy plik zapisu ruchu) i w Wiresharku (darmowy analizator ruchu) udowadnia, co się w nim wydarzyło: rekonstruuje sesje (Follow TCP stream), odczytuje warstwy pakietu (adres, port, protokół), rozpoznaje co najmniej dwa wzorce wrogiego ruchu (np. skan portów, regularne „bicie serca" kanału C2 / beaconing, nietypowo duży transfer wychodzący) i osadza je w kontekście architektury sieci — klasyfikuje ruch jako wschód–zachód (między maszynami wewnątrz) czy północ–południe (na zewnątrz), wskazując, gdzie widać ruch boczny napastnika. Oddaje repozytorium z filtrami wyświetlania, osią czasu i krótkim raportem — nie żywą sesję laba.

**Poziom / czas:** L2 · 12 h (widełki L2: 8–14 h).

**Źródło główne (open_data, PCAP):**
- **Wireshark Sample Captures** — https://wiki.wireshark.org/SampleCaptures
  Oficjalna wiki Wiresharka, setki zrzutów PCAP per protokół, jawnie do nauki i testu. Publiczna, darmowa. **Zweryfikowane 2026-07-01: strona istnieje, publiczna, oferuje pobieralne pliki PCAP.**

**Źródło zapasowe / alternatywne (open_data, PCAP z analizą):**
- **Malware-Traffic-Analysis.net — ćwiczenia treningowe** — https://www.malware-traffic-analysis.net/training-exercises.html
  Publiczne, edukacyjne ćwiczenia z realnym ruchem złośliwym i gotową analizą (setki od 2014, aktualizacje do 2026-02). **Zweryfikowane 2026-07-01: strona istnieje, publiczna, edukacyjna.**

**Materiały pomocnicze (learning_resources):**
- Wireshark User's Guide — https://www.wireshark.org/docs/wsug_html_chunked/ (docs)
- Wireshark DisplayFilters (referencja filtrów) — https://wiki.wireshark.org/DisplayFilters (docs)
- MITRE ATT&CK — T1046 Network Service Discovery (skan) — https://attack.mitre.org/techniques/T1046/ (docs)

**Uzasadnienie legalności.** Oba zbiory to **publiczne, udostępnione do nauki zrzuty** — nie ma tu nasłuchu cudzej sieci ani cudzych danych. Zrzuty Malware-Traffic-Analysis zawierają realny ruch, więc `theory_md` **zaczyna się od klauzuli etyczno-prawnej** (praca wyłącznie na udostępnionych publicznie zrzutach i własnym/treningowym labie; nieuprawniony dostęp/nasłuch = przestępstwo, art. 267 Kodeksu karnego). Adresy IP w oddanym raporcie **maskowane** (adres IP bywa daną osobową — wyrok TSUE Breyer C-582/14; RODO — minimalizacja danych). Atrybucja źródła w README. **Klauzula etyczno-prawna: wymagana** (dane ruchu + techniki rozpoznawania ataku).

**Prerekwizyty (acquired):** `Linux` — uruchomienie narzędzia (`tshark`/`tcpdump`) i poruszanie się w wierszu poleceń; budowane w partii 1 (`cyber-hardening-linux-bash`). Wiedza o adresie/porcie/protokole jest domykana w tym samym projekcie (liść `TCP/IP` jako required), nie zakładana z zewnątrz — projekt jest progiem wejścia do klastra.

**Szkic rubryki (suma = 100):**
1. Rekonstrukcja sesji i odczyt warstw pakietu — 25
2. Rozpoznanie ≥2 wzorców wrogiego ruchu (skan / beaconing / eksfiltracja) — 25
3. Klasyfikacja wschód–zachód vs północ–południe + kontekst architektury/ruchu bocznego — 20
4. Mapowanie obserwacji na technikę MITRE ATT&CK — 15
5. Odtwarzalność, maskowanie IP (RODO) i klauzula etyczno-prawna — 15

---

## 2. Projekt 2 — `cyber-ids-reguly-suricata-strojenie` (L3)

**Tytuł:** Reguły IDS w Suricacie: napisz, nastrój i udowodnij wykrycie

**Koncept (co student zbuduje).** Student pisze zestaw reguł detekcji w Suricacie (otwartoźródłowy silnik IDS/IPS — systemu wykrywania/zapobiegania włamaniom), łapiących konkretny wzorzec ataku z publicznego zrzutu PCAP. Sednem nie jest napisanie reguły, lecz **strojenie** — redukcja fałszywych alarmów (false positive) bez gubienia realnego wykrycia, z udokumentowaniem każdego wyjętku (allowlist) i jego ryzyka. Następnie **udowadnia**, że reguła działa: odtwarza ruch na własnym labie narzędziem `tcpreplay` (odtwarzacz zapisanego ruchu) i potwierdza, że reguła się odpaliła — „reguła nieprzetestowana nie istnieje". Mapuje każdą regułę na technikę MITRE ATT&CK, nazywa lukę pokrycia (np. ruch szyfrowany TLS jako ślepe pole IDS sygnaturowego) i opisuje, jak alert stałby się zdarzeniem w SIEM. Oddaje repozytorium: reguły przed/po strojeniu, dokumentacja wyjątków, dowód wykrycia, mapa ATT&CK.

**Poziom / czas:** L3 · 24 h (widełki L3: 18–30 h).

**Źródło główne (oss — silnik + składnia reguł):**
- **Suricata — dokumentacja i składnia reguł** — https://docs.suricata.io/en/latest/
  (składnia: https://docs.suricata.io/en/latest/rules/intro.html) Oficjalna dokumentacja otwartoźródłowego silnika. **Zweryfikowane 2026-07-01: strona istnieje, oficjalna dokumentacja OSS, opisuje format reguł (akcja/nagłówek/opcje).**

**Źródła wspierające (oss / open_data):**
- **Emerging Threats Open** — https://rules.emergingthreats.net/
  Otwarty zbiór reguł Suricata/Snort (katalog `open/`) do nauki wzorców — student pisze własne, cudzych nie oddaje jako swoich. **Zweryfikowane 2026-07-01: strona istnieje, oferuje darmowe reguły w wersji Open.**
- **tcpreplay** — https://tcpreplay.appneta.com/
  Otwartoźródłowy odtwarzacz ruchu do testu detekcji na **własnym labie**. **Zweryfikowane 2026-07-01: oficjalna strona, narzędzie OSS do odtwarzania PCAP.**
- **Wireshark Sample Captures / Malware-Traffic-Analysis** (jak w projekcie 1) — źródło ruchu do odtworzenia i strojenia.

**Materiały pomocnicze (learning_resources):**
- Suricata Rules format (składnia reguły) — https://docs.suricata.io/en/latest/rules/intro.html (docs)
- MITRE ATT&CK — baza taktyk i technik napastników — https://attack.mitre.org/ (docs)
- NIST SP 800-94 „Guide to Intrusion Detection and Prevention Systems (IDPS)" — https://csrc.nist.gov/pubs/sp/800/94/final (docs)

**Uzasadnienie legalności.** Suricata i tcpreplay to **oprogramowanie otwartoźródłowe**; Emerging Threats Open to **otwarty** zbiór reguł. Ruch do strojenia i testu pochodzi z publicznych zrzutów, a odtwarzanie (`tcpreplay`) odbywa się **wyłącznie na własnym/treningowym, izolowanym labie** — nigdy w cudzej sieci. `theory_md` **zaczyna się od klauzuli etyczno-prawnej** (art. 267 KK — nieuprawniony dostęp/nasłuch; odtwarzanie ruchu tylko na labie odciętym od cudzej infrastruktury). Adresy IP w raporcie **maskowane** (TSUE Breyer C-582/14; RODO). Reguły z Emerging Threats/Suricata student traktuje jako naukę wzorca, nie kopiuje jako własnych (atrybucja w README). **Uwaga prawna (research §7):** projekt **nie dotyka deszyfrowania TLS** — inspekcja treści szyfrowanej to osobna wrażliwość prawna (RODO, prawo pracy); tu TLS pojawia się wyłącznie jako **nazwana luka pokrycia**, nie jako czynność. **Klauzula etyczno-prawna: wymagana** (techniki detekcji + odtwarzanie ruchu ofensywnego na labie).

**Prerekwizyty (acquired):** `TCP/IP` — reguła operuje na adresie/porcie/protokole i zawartości pakietu; `Network` — reguły egzekwują architekturę (które strefy rozdzielić, gdzie punkt kontroli); `Linux` — uruchomienie Suricaty/tcpreplay w wierszu poleceń. `TCP/IP` i `Network` domknięte w projekcie 1 (łańcuch autoringu).

**Szkic rubryki (suma = 100):**
1. Napisana reguła Suricata łapiąca konkretny wzorzec (poprawny nagłówek + opcje) — 25
2. Strojenie: redukcja fałszywych alarmów bez gubienia wykrycia + dokumentacja wyjątków (allowlist) i ich ryzyka — 25
3. Dowód wykrycia: odtworzenie ruchu `tcpreplay` na własnym labie i potwierdzenie zadziałania reguły — 25
4. Mapowanie reguł na MITRE ATT&CK + świadomie nazwana luka pokrycia (np. TLS) — 15
5. Etyka labu (izolacja, brak sieci wyjściowej), maskowanie IP, klauzula etyczno-prawna i atrybucja — 10

---

## 3. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Pięć słabości pierwszego szkicu i poprawki:

1. **Ryzyko: dwa projekty nie pokryją trzech liści.** Sprawdzone tabelą pokrycia (§0) — `TCP/IP` i `Network` są `required` w P1, `Firewall / IDS-IPS` `required` w P2; każdy liść w ≥1 projekcie. Poprawka: `Network` awansowany z „tła" do `required` w P1 (klasyfikacja wschód–zachód, ruch boczny to realnie kompetencja Network, nie tylko TCP/IP).
2. **Ryzyko: L3 IDS bez dowodu, że reguła działa.** CISO: „reguła nieprzetestowana to teatr". Poprawka: kryterium 3 rubryki P2 (30→25, ale twarde) = odtworzenie ruchu `tcpreplay` na labie; bez tego projekt jest deklaracją.
3. **Ryzyko: deszyfrowanie TLS jako pułapka prawna.** Research §7 firewall ostrzega. Poprawka: P2 jawnie **nie** deszyfruje TLS — TLS wchodzi tylko jako nazwana luka pokrycia; klauzula w dossier i przyszłym `theory_md`.
4. **Ryzyko: skok trudności L2→L3 bez fundamentu L1 w klastrze.** Poprawka: prerekwizyt `Linux` (partia 1) jawnie wskazany jako acquired w obu; P1 sam domyka `TCP/IP` od podstaw czytania pakietu — próg wejścia jest w projekcie, nie zakładany.
5. **Ryzyko: cudze reguły oddane jako własne (plagiat/licencja).** Poprawka: Emerging Threats Open jako **nauka wzorca**, nie materiał do skopiowania; atrybucja w README; ocena za reguły napisane samodzielnie.

**Tłumaczenie żargonu (sekcja 3 CLAUDE.md):** PCAP, Wireshark, Follow TCP stream, C2/beaconing, wschód–zachód/północ–południe, ruch boczny, MITRE ATT&CK, IDS/IPS, Suricata, false positive, allowlist, tcpreplay, TLS, SIEM — rozwinięte po polsku przy pierwszym użyciu.

**Weryfikacja URL (2026-07-01):** wszystkie 5 głównych/wspierających źródeł sprawdzone WebFetch — istnieją, publiczne/darmowe/OSS. Zero zmyślonych adresów. Zero cudzych danych/systemów.
