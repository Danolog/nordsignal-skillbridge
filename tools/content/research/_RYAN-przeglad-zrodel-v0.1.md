# Przegląd źródeł i ryzyka prawno-etycznego — werdykt Ryana (CRCO)

**Wersja:** v0.1 · 2026-06-29 — pierwszy skonsolidowany werdykt bramy ryzyka dla researchu E3-R (37 plików) + redesignu weryfikacji zgłoszeń.
**Autor:** Ryan (CRCO — Chief Risk & Compliance Officer; ryzyko, bezpieczeństwo, ochrona danych / RODO).
**Zakres:** legalność i rzetelność źródeł (§7 każdego researchu), klauzule etyczno-prawne do `theory_md` projektów, ryzyko RODO redesignu weryfikacji (§IV.3).
**Status:** werdykt doradczy bramy — wiąże autoring (Sophia) i wdrożenie (Ethan/Leo); decyzje z czerwonych linii zostają przy Darku (oznaczone niżej).
**Czego TEN dokument NIE robi:** nie zmienia kodu, researchu ani bazy; nie edytuje plików rządzenia (`CLAUDE.md`/ADR) — to czerwona linia Darka.

Skróty użyte w dokumencie (rozwinięcie przy pierwszym użyciu): **KK** — Kodeks karny; **KP** — Kodeks pracy; **RODO** — ogólne rozporządzenie o ochronie danych (UE 2016/679); **TSUE** — Trybunał Sprawiedliwości Unii Europejskiej; **EOG** — Europejski Obszar Gospodarczy; **SCC** — standardowe klauzule umowne (ang. *standard contractual clauses*, podstawa transferu danych poza EOG); **DPIA** — ocena skutków dla ochrony danych (ang. *data protection impact assessment*); **SOAR** — automatyczna orkiestracja i reagowanie w bezpieczeństwie; **EDR/XDR** — wykrywanie i reagowanie na stacjach/szeroko; **PAM** — zarządzanie dostępem uprzywilejowanym; **RTR** — *Real Time Response*, zdalny dostęp do żywej maszyny w CrowdStrike; **DAST** — dynamiczne testowanie aplikacji (skan działającej aplikacji); **SQLi** — wstrzyknięcie SQL; **RTS/ITS** — regulacyjne/wykonawcze standardy techniczne doprecyzowujące rozporządzenie.

---

## WERDYKT OGÓLNY: **DOPUSZCZAM WARUNKOWO**

Cały komplet 37 researchów przeszedł bramę źródeł **bez ani jednego źródła pirackiego, nielegalnego czy budzącego wątpliwość pochodzenia**. Researcherzy sami, dyscyplinarnie, oflagowali mi każdy punkt ryzyka w sekcji „Do uwagi Ryana" — jakość tej samokontroli jest wysoka i ułatwiła werdykt. Dopuszczam autoring projektów cyber pod **warunkiem osadzenia kanonicznego zestawu klauzul** (sekcja 2 niżej) i zastosowania **najostrzejszej bramki** do liści podwyższonego ryzyka (sekcja 3).

**Nie ma blokera dla autoringu treści.** Jedyny twardy blok dotyczy **jednej funkcji redesignu** — uruchamiania cudzego kodu w piaskownicy (Faza 2): ta NIE może wejść na produkcję, dopóki nie spełni warunków z sekcji 4. Autoring projektów i sama ocena oparta na treści (pobranie + analiza, bez wykonania) mogą iść równolegle.

---

## 1. Klasyfikacja źródeł — werdykt per kategoria

### (a) Normy płatne — ISO/IEC 27001/27002/31000/27005/37301, CIS Benchmarks → **DOPUSZCZAM z zasadą „linkuj i atrybuuj, NIE reprodukuj"**

Potwierdzam zasadę zgłoszoną przez researcherów (`iso-27001.md`, `grc.md`, `risk-management.md`, `linux.md`, `aws.md`, `azure.md`, `kubernetes.md`).

- **Normy ISO** są objęte prawem autorskim ISO i płatne. Reguła twarda: **żaden projekt nie reprodukuje tekstu normy** (nie kopiuje, nie cytuje obszernie, nie udostępnia kopii). Uczymy *o* normie — struktury, pojęć, sposobu pracy — na własnym opracowaniu i materiałach otwartych. Linkujemy wyłącznie do **oficjalnej strony standardu ISO** (opis/zakres). Wyjątek bezpieczny: **ISO/IEC 27000** (słownik) jest jedyną pozycją rodziny dostępną oficjalnie za darmo — wolno jej użyć jako odnośnika do definicji.
- **Nośnikiem nauki jest NIST** (publikacje rządu USA — domena publiczna, pełna treść otwarta): SP 800-30/37/39/53/61/92, CSF 2.0. To świadomy, czysty wybór: NIST niesie metodę za darmo, ISO jest wskazywane jako standard rynkowy. Mapowania krzyżowe (NIST ↔ ISO, „crosswalk") są darmowe i dozwolone.
- **CIS Benchmarks** (Center for Internet Security): pobranie PDF darmowe po rejestracji, ale warunki ograniczają redystrybucję i użycie komercyjne. Reguła: **odwołujemy się linkiem i atrybucją, NIE redystrybuujemy treści benchmarku**. Wersja zautomatyzowana (CIS-CAT Pro) jest płatna — projekty używają wariantu otwartego (CIS-CAT Lite, Lynis GPL-3.0, kube-bench, Prowler), nie wymagają płatnej subskrypcji.

### (b) Publiczne zbiory danych SOC/logów — Splunk BOTS, loghub, SecRepo, Malware-Traffic-Analysis, Wireshark Sample Captures → **DOPUSZCZAM pod warunkiem maskowania adresów IP**

Potwierdzam (`siem.md`, `soc.md`, `splunk.md`, `bash.md`, `python.md`, `incident-response.md`, `network.md`, `tcp-ip.md`, `linux.md`, `firewall-ids-ips.md`).

- Zbiory są publiczne i udostępnione do badań/nauki — pochodzenie czyste. Ale **mogą zawierać dane wyglądające na osobowe** (adresy IP, loginy). Zgodnie z wyrokiem **TSUE w sprawie Breyer (C-582/14)** dynamiczny adres IP **w określonych warunkach** jest daną osobową — formułujemy to ostrożnie, nie jako regułę bezwarunkową.
- Reguła twarda: **w każdym artefakcie oddawanym przez studenta adresy IP są zamaskowane** (np. ostatni oktet `192.168.0.x`), zero re-identyfikacji osób. To ćwiczenie z zasady minimalizacji danych (RODO). Alternatywa: własny zbiór syntetyczny.
- Zbiory ćwiczeniowe z realnym ruchem (Malware-Traffic-Analysis, Wireshark) — praca **wyłącznie na udostępnionych publicznie zrzutach i własnym labie** (odtwarzanie `tcpreplay`), nigdy nasłuch cudzej sieci.

### (c) The DFIR Report (zewnętrzny serwis z opisami realnych włamań) → **DOPUSZCZAM WARUNKOWO**

Decyzja należała do mnie (`incident-response.md`). **Dopuszczam jako materiał edukacyjny** z trzema ograniczeniami:

1. Wyłącznie jako **`learning_resources`/`source_links`** (lektura) oraz źródło scenariuszy ćwiczeń sztabowych (ang. *tabletop*) — **NIE** jako dane do pobrania/wgrania do artefaktu studenta.
2. **Linkuj i atrybuuj, nie reprodukuj** — odsyłamy do publicznego raportu, nie kopiujemy jego treści (prawa autorskie autorów serwisu).
3. To źródło **zewnętrzne i niezależne** (nie instytucja). Przed wejściem do `learning_resources` autoring weryfikuje, że konkretny linkowany raport jest publiczną, zanonimizowaną publikacją (taki jest model tego serwisu). Mapowanie do MITRE ATT&CK i jakość czynią go cennym; ryzyko niskie przy lekturze, niedopuszczalne przy reprodukcji.

### (d) API reputacji — AbuseIPDB, VirusTotal → **DOPUSZCZAM WARUNKOWO (regulamin darmowego użytku + klucz poza kodem)**

Potwierdzam (`python.md`, `soar.md`).

- Używamy **wyłącznie darmowego planu** i nie zachęcamy do łamania regulaminu/limitów dostawcy. Projekt musi wskazać darmowy wariant.
- **Klucz API trzymany poza kodem** (zmienna środowiskowa, sekret) — projekt uczy bezpiecznego obchodzenia się z kluczem, więc instrukcja **nie może zawierać żadnego realnego klucza** ani przykładu z prawdziwym sekretem.
- To są zewnętrzne źródła danych w sensie produktowym, ale **nie nowy MCP firmy** — student podpina je we własnym labie, własnym kluczem. Nie uruchamia czerwonej linii „nowy MCP / źródło danych" (która zostaje przy Darku) — pod warunkiem, że to student, nie platforma SkillBridge, woła te API.

### (e) Źródła oficjalne/otwarte — NIST, OWASP, MITRE ATT&CK, RFC, EUR-Lex, UODO, ENISA, KNF, EBA/EIOPA/ESAs, Microsoft Learn, AWS/GCP docs, dokumentacja narzędzi otwartych → **DOPUSZCZAM — CZYSTE**

Bez zastrzeżeń. Domena publiczna (NIST, RFC), oficjalne teksty prawa (EUR-Lex, ISAP), otwarte standardy (OWASP, MITRE, Sigma), dokumentacja producentów (darmowa do czytania). Atrybucja jako dobra praktyka; aktualność linków weryfikowana przed wejściem do `learning_resources` (researcherzy słusznie oflagowali, że NIST/CISA/ESAs/Microsoft przebudowują adresy podstron).

**Wniosek po kategoriach:** zero źródeł nielegalnych. Cały blok źródeł czysty pod warunkiem reguł (a)–(d).

---

## 2. Kanoniczny zestaw klauzul etyczno-prawnych (do `theory_md` projektów)

To jest jedno źródło prawdy dla autoringu. Klauzula **K1 jest bazowa i obowiązkowa w KAŻDYM projekcie cyber**; pozostałe dokładane są **wg ryzyka** projektu (mapa w sekcji 3). Wzorzec brzmieniowy = istniejąca klauzula z partii 1 (`cyber-projects-partia-1.json`), tu rozszerzona.

**K1 — Klauzula bazowa, art. 267 KK (nieuprawniony dostęp).** [obowiązkowa zawsze, już wdrożona w partii 1]
> Pracujesz wyłącznie na własnym lub jawnie treningowym systemie/zbiorze danych. Nie skanujesz, nie atakujesz, nie testujesz ani nie uzyskujesz dostępu do żadnego systemu, sieci ani konta, które nie należą do Ciebie i na które nie masz pisemnej zgody właściciela. Nieautoryzowany dostęp do systemu lub danych jest w Polsce przestępstwem (**art. 267 Kodeksu karnego**) i łamie tę klauzulę oraz regulamin SkillBridge.

**K2 — Własny / izolowany lab, aplikacje celowo podatne.** [DAST, SQLi, AppSec, AD-ofensywa, K8s, CI/CD, chmury]
> Ćwiczysz wyłącznie na **własnej, lokalnie uruchomionej, celowo podatnej** aplikacji/laboratorium (np. OWASP Juice Shop, DVWA, WebGoat, GOAD, własny klaster `kind`/`minikube`, własne konto/najemca w chmurze). **Zakaz kierowania skanu/ataku/testu na jakikolwiek adres publiczny lub cudzy.** Skan pasywny (obserwacja) odróżniaj od aktywnego (wysyłanie ataków) — aktywny tylko na własnym celu.

**K3 — Art. 269a KK (zakłócenie pracy systemu/sieci).** [techniki wykonania kodu: PowerShell ofensywny, symulacje ATT&CK]
> Techniki wykonania kodu i symulacje ofensywne poznajesz **wyłącznie po to, by je wykrywać i im zapobiegać**, w izolowanym labie **bez sieci wyjściowej**, wyłącznie przez bezpieczne odwzorowania (np. Atomic Red Team) na własnej maszynie. Zakłócenie pracy cudzego systemu lub sieci jest przestępstwem (**art. 269a Kodeksu karnego**) — obok art. 267 KK.

**K4 — Art. 22³ Kodeksu pracy (monitoring pracownika).** [EDR/XDR, Microsoft Defender, nagrywanie sesji PAM/CyberArk, logi bloków skryptów PowerShell]
> Głęboka telemetria stacji / nagrywanie sesji uprzywilejowanej to **monitoring pracownika**: wymaga celu, proporcjonalności i **uprzedniego poinformowania** (**art. 22³ Kodeksu pracy**), a dane z monitoringu to dane osobowe (RODO — podstawa, cel, retencja). W labie pracujesz wyłącznie na **fikcyjnych kontach i własnych/treningowych maszynach**, ale musisz nazwać tę granicę prawną.

**K5 — Art. 22 RODO (decyzje zautomatyzowane).** [SOAR i każda auto-akcja wobec osoby]
> Automatyczna akcja podejmowana **wobec osoby** (np. blokada konta pracownika) podlega **art. 22 RODO** (zautomatyzowane podejmowanie decyzji) — wymaga podstawy, możliwości interwencji człowieka i przejrzystości. Projektuj punkt zatrzymania dla człowieka (ang. *human-in-the-loop*) tam, gdzie skutek dotyka osoby.

**K6 — Maskowanie IP / minimalizacja (Breyer C-582/14).** [wszystkie projekty na zbiorach logów: BOTS, loghub, SecRepo, PCAP]
> W każdym oddanym artefakcie **adresy IP są zamaskowane** (np. `192.168.0.x`), bez re-identyfikacji osób. Adres IP może być daną osobową **w określonych warunkach** (TSUE, Breyer **C-582/14**). To zasada minimalizacji danych (RODO).

**K7 — Wyłącznie dane fikcyjne/syntetyczne.** [IAM, Active Directory, RODO/GDPR, Risk, GRC]
> Katalog/rejestr/scenariusz wypełniasz **wyłącznie fikcyjnymi tożsamościami** (persony wymyślone lub z generatora typu Faker) — **nigdy danymi realnych osób**. Projekt o RODO sam musi być zgodny z RODO.

**K8 — Nota poufności dokumentacji GRC.** [GRC, Risk Management, dokumenty/analizy]
> Dokument (macierz zabezpieczeń, analiza luk, rejestr ryzyk) jest **mapą słabości** — traktuj go jak materiał poufny. **Nie odnoś go do realnej, cudzej organizacji** i nie twórz z niego materiału ofensywnego. Scenariusz jest fikcyjny.

**K9 — Nota licencyjna i atrybucja; zakaz reprodukcji norm płatnych.** [ISO, CIS, narzędzia otwarte]
> Normy ISO i CIS Benchmarks: **linkuj i atrybuuj, nie reprodukuj** treści (prawo autorskie). Narzędzia otwarte (Lynis GPL-3.0, ZAP, Trivy, Vault, Teleport, Guacamole Apache-2.0 itd.): nota licencyjna + atrybucja w README; *używasz* narzędzia, nie kopiujesz jego kodu do własnego rozwiązania.

**K10 — Transfer danych poza EOG.** [CrowdStrike, Microsoft Defender — telemetria do chmury dostawcy spoza UE]
> Telemetria aktywności trafia do chmury dostawcy (możliwy transfer **poza Europejski Obszar Gospodarczy**). Po wyroku **Schrems II (C-311/18)** Tarcza Prywatności UE–USA jest unieważniona, ale **standardowe klauzule umowne (SCC) zostały utrzymane** — z obowiązkiem oceny zabezpieczeń. Projekt nazywa: region danych, podstawę transferu, kontekst DORA dla sektora finansowego.

**K11 — Reguła precyzji cytowania regulacji (dla autoringu, nie do `theory_md` dosłownie).**
> Regulacje cytuj jako **ramę „co", nie kompletny przepis „jak"**. **DORA**: pięć filarów i terminy zgłoszeń podawaj ogólnie i **odsyłaj do RTS/ITS oraz komunikatów KNF** (progi i formaty się zmieniają) — nie cytuj samej DORA jako kompletu. **RODO**: progi (72 h, 20 mln EUR / 4% obrotu) bez uproszczeń wprowadzających w błąd. **Breyer** — „w określonych warunkach", nie bezwarunkowo. **Schrems II** — unieważnił Privacy Shield, SCC utrzymane. DORA ≠ NIS2 ≠ RODO (DORA jako *lex specialis* dla finansów; incydent może podlegać DORA i RODO równolegle — dwa zegary, KNF i UODO).

---

## 3. Liście podwyższonego ryzyka — najostrzejsza bramka przy autoringu

Te kompetencje wymagają, by przy autoringu **każdego** projektu klauzule były wyróżnione wizualnie i nieusuwalne. Kolejność = priorytet mojego review.

| # | Liść (research) | Ryzyko | Klauzule obowiązkowe |
|---|---|---|---|
| 1 | **DAST** (`dast.md`) | skan **aktywny** = realne wysyłanie ataków; najostrzejsza granica całej grupy AppSec | K1 + **K2** |
| 2 | **SQL injection** (`sql.md`) | jedyna kompetencja partii, gdzie junior realnie może złamać prawo | K1 + **K2** |
| 3 | **PowerShell** (`powershell.md`) | realne techniki wykonania kodu (`-EncodedCommand`) | K1 + **K3** + K6 |
| 4 | **Active Directory — ofensywa** (`active-directory.md`) | Kerberoasting, Pass-the-Hash; GOAD/Atomic Red Team | K1 + **K2** + K7 |
| 5 | **CyberArk / PAM** (`cyberark.md`, `pam.md`) | nagrywanie sesji uprzywilejowanej = monitoring pracownika | K1 + **K4** + K7 |
| 6 | **CrowdStrike** (`crowdstrike.md`) | **RTR** = zdalny dostęp do żywej końcówki **+ transfer poza EOG** | K1 + **K4** + **K10** |
| 7 | **EDR/XDR + Microsoft Defender** (`edr-xdr.md`, `microsoft-defender.md`) | głęboka inwigilacja stacji pracownika; auto-reakcja | K1 + **K4** (+ K10 dla chmury) |
| 8 | **SOAR** (`soar.md`) | auto-akcja **wobec osoby** (blokada konta) | K1 + **K5** |

Pozostałe liście (chmury, K8s, CI/CD, DevSecOps, SAST/SCA, sieci, SIEM/SOC/IR) — bramka standardowa: K1 zawsze + K6 (gdy zbiory logów) / K7 (gdy tożsamości) / K8 (gdy dokument GRC) / K9 (gdy normy/narzędzia) wg mapy.

---

## 4. RODO redesignu weryfikacji (§IV.3) — werdykt

Trzy nowe przetwarzania. Werdykt: **DOPUSZCZAM WARUNKOWO; jedna funkcja (Faza 2) zablokowana do prod do czasu spełnienia warunków.**

### 4.1 Przechowywanie fragmentów pracy/kodu studenta + feedbacku w `aiReviewJson`
- **Podstawa prawna:** art. 6 ust. 1 lit. b RODO — **wykonanie umowy** (student zamawia ocenę swojej pracy; to rdzeń usługi). Dla warstwy premium (ocena człowieka pod kredencjał) ta sama podstawa.
- **Charakter danych:** kod, styl i autorstwo mogą być **danymi osobowymi** (identyfikują autora). To nie są dane wrażliwe (art. 9), ale są danymi osobowymi — RODO obowiązuje.
- **Cel:** ocena i feedback edukacyjny + (premium) kredencjał. **Zakaz użycia wtórnego** bez odrębnej podstawy (np. trenowanie modeli na pracy studenta = osobna zgoda).
- **Warunki przed prod:** (1) **retencja zdefiniowana** (rekomendacja: czas trwania konta + okres reklamacji/odwołań od oceny, potem usunięcie albo anonimizacja artefaktu); (2) **aktualizacja polityki prywatności / klauzuli informacyjnej** (co przechowujemy, po co, jak długo, kto ma dostęp — w tym wykładowca w warstwie premium); (3) **prawo do usunięcia** obsłużone (usunięcie `aiReviewJson` + pobranych fragmentów); (4) dostęp wykładowcy/operatora jakości ograniczony rolą (`app_faculty`) i logowany.

### 4.2 Token GitHub — odczyt publiczny (zatwierdzony przez Darka)
- **Werdykt: OK z perspektywy RODO.** Repozytorium **publiczne** = dane już upublicznione przez samego studenta; odczyt to przetwarzanie o niskim ryzyku.
- **Warunki (granice tokenu):** (a) zakres **tylko odczyt publiczny** — bez zapisu, bez dostępu do repozytoriów prywatnych; (b) **zakaz pobierania repo prywatnych** bez odrębnej, świadomej zgody studenta i osobnej podstawy; (c) utrzymana istniejąca ochrona przed SSRF (`fetchGithubRepoMeta`); (d) token jako sekret, nie w kodzie.
- **To nie jest „nowy MCP / źródło danych" w sensie czerwonej linii** — Darek już zatwierdził token publicznego odczytu. Każde rozszerzenie zakresu (repo prywatne, zapis) = ponowny sign-off Darka.

### 4.3 Uruchamianie cudzego kodu w piaskownicy (Faza 2) — **BLOKER do prod**
- **Ryzyko:** wykonanie niezaufanego kodu studenta = wektor ataku (złośliwy kod, eksfiltracja danych/sekretów, atak na infrastrukturę, koszt zasobów, dostęp do prac innych studentów). To **najwyższe ryzyko techniczne całego redesignu**.
- **Odpowiedzialność:** platforma odpowiada za środowisko wykonania; student odpowiada za treść kodu — to musi być w regulaminie (oświadczenie o autorstwie i braku złośliwego kodu).
- **Warunki, które MUSZĄ być spełnione, zanim ta funkcja wejdzie na prod:**
  1. **Mocna izolacja** (potwierdzona w designie Ethana/Leo, §IV.1): jednorazowe kontenery, twarde limity zasobów (procesor/pamięć/czas), **odcięcie od sieci wyjściowej**, brak dostępu do sekretów i do danych innych studentów.
  2. **Sign-off Darka na wariant izolacji** (własna piaskownica vs izolowany runner) — to jawnie decyzja Darka per §V.4 redesignu (koszt × bezpieczeństwo).
  3. **Ocena, czy potrzebna DPIA** (ocena skutków dla ochrony danych) — przy skali i nowości przetwarzania (wykonywanie cudzego kodu masowo) rekomenduję DPIA przed uruchomieniem.
  4. **Regulamin + polityka prywatności** zaktualizowane o wykonywanie kodu i jego logowanie.
- **Do czasu spełnienia (1)–(4): funkcja wykonania kodu pozostaje wyłączona na prod.** Etap 1 oceny (pobranie + analiza treści **bez** wykonania) oraz autoring projektów mogą działać niezależnie.

---

## 5. Blokery vs warunki

### BLOKUJĘ (twardo, do spełnienia warunku):
- **Uruchamianie cudzego kodu w piaskownicy (redesign §IV.3, Faza 2)** — do prod dopiero po warunkach 4.3 (1)–(4). Nie blokuje autoringu ani Etapu 1 oceny.

### WARUNKI-Z-KLAUZULĄ (dopuszczam, gdy spełnione):
1. Autoring każdego projektu cyber osadza **K1** + właściwe klauzule wg mapy z sekcji 3. Brak klauzuli w liściu podwyższonego ryzyka = projekt nie wchodzi do bazy.
2. **Normy ISO/CIS** — wyłącznie link + atrybucja, zero reprodukcji (K9).
3. **Zbiory logów** — maskowanie IP w artefaktach studenta (K6).
4. **The DFIR Report, AbuseIPDB, VirusTotal** — dopuszczone warunkowo wg sekcji 1 (c)/(d): link/darmowy plan/klucz poza kodem, bez reprodukcji.
5. **Redesign 4.1/4.2** — retencja + klauzula informacyjna + granice tokenu przed wejściem na prod.
6. **Aktualność linków** weryfikowana przed wpisem do `learning_resources` (NIST/CISA/ESAs/Microsoft/Splunk przebudowują adresy).
7. **Precyzja cytowania regulacji** (K11) — DORA odsyłana do RTS/ITS+KNF; Breyer/Schrems II ujęte ostrożnie.

---

## 6. Co wymaga decyzji Darka (czerwone linie — poza moim mandatem)

1. **Edycja `CLAUDE.md` §7 + ADR-004** (pogodzenie „ocena formująca AI samowystarczalna ↔ kredencjał wysokiej stawki = człowiek/premium"). To plik rządzenia → **sign-off Darka w Plan Mode**. Już oflagowane w redesignie §IV.7; pakiet governance przygotowuje Oliver. **Nie wykonuję — to nie domena Ryana.**
2. **Wybór wariantu izolacji piaskownicy** (Faza 2) — koszt × bezpieczeństwo × złożoność. Ethan przynosi tradeoff, **Darek decyduje** (§V.4).
3. **Każde rozszerzenie zakresu tokenu GitHub** poza publiczny odczyt (repo prywatne / zapis) = ponowny **sign-off Darka** (czerwona linia „źródło danych").
4. **DPIA dla wykonywania cudzego kodu** — rekomenduję; decyzja o jej przeprowadzeniu i akceptacja wyniku po stronie Darka jako administratora danych.

---

*Werdykt doradczy bramy ryzyka. Nie zmienia kodu, researchu ani bazy. Decyzje z czerwonych linii (sekcja 6) zostają przy Darku. — Ryan (CRCO), 2026-06-29.*
