# Dossier źródeł — projekty partia 3: domknięcie klastra IAM (PAM + CyberArk)

> **Zadanie:** E3 „domknięcie cyber" — slate projektów dla klastra „Tożsamość i zarządzanie dostępem (IAM)" ścieżki Cybersecurity Specialist.
> **Wersja:** v1.0 · 2026-07-01 · autor: Sophia (Product Owner), w parze z researcherem źródeł.
> **Zakres:** domyka liście **PAM** i **CyberArk** (IAM + Active Directory pokryte w partii 1 — projekt `cyber-iam-active-directory-lab`). Model dostępu uprzywilejowanego, sejf haseł (vault), rotacja sekretów, sesje uprzywilejowane, dostęp na czas (JIT), most PAM→SIEM.
> **Podstawa merytoryczna:** `tools/content/research/pam.md` (v1.0), `tools/content/research/cyberark.md` (v1.0), `tools/content/research/iam.md` (v1.0).
> **Kanon kontraktu:** `tools/content/README-cyber-projects.md`. Wzorzec jakości: `tools/content/cyber-projects-partia-2.json` (8 projektów SIEM).

---

## Zasada źródeł (decyzja projektowa, powtórzona z researchu CyberArk §1/§3)

**Nie da się dać studentowi licencji CyberArk** — to produkt komercyjny enterprise bez darmowej wersji do laba. Dlatego **każdy projekt ćwiczy dyscyplinę PAM na otwartoźródłowych (open-source) odpowiednikach**, a wiedzę *specyficzną dla CyberArk* (nazwy komponentów: Sejf/Safe, konto, platforma/Platform, CPM, PSM, PVWA) student zdobywa z czytania oficjalnej dokumentacji i darmowych szkoleń producenta. Główne źródło (`sourceUrl`) każdego projektu to **repozytorium OSS narzędzia**, które student uruchamia na własnym labie. CyberArk figuruje jako `learning_resource` (słownik + architektura), nigdy jako `sourceUrl`.

**Weryfikacja URL (2026-07-01, curl -L):** wszystkie główne źródła zwróciły HTTP 200. Portal dokumentacji CyberArk (`docs.cyberark.com`) blokuje automaty (bot-protection, 404 dla curl) — działa w przeglądarce; dlatego jako weryfikowalny materiał CyberArk używamy **CyberArk University** (`https://training.cyberark.com/`, darmowa rejestracja, 200) i publicznych baz MITRE/NIST/OWASP.

**Legalność bazowa (dotyczy wszystkich 6 projektów):** praca wyłącznie na własnym lub jawnie treningowym systemie z **fikcyjnymi** tożsamościami i poświadczeniami — nigdy realne hasła/konta osób ani cudza infrastruktura. Nieautoryzowany dostęp do cudzego systemu jest w Polsce przestępstwem (art. 267 Kodeksu karnego). Adresy IP w oddawanych artefaktach maskowane (np. `192.168.0.x`), bez re-identyfikacji osób (RODO, minimalizacja danych; adres IP bywa daną osobową — TSUE Breyer C-582/14). Każdy projekt cytuje licencję i atrybucję użytego narzędzia OSS w README.

---

## Zbiorcza mapa pokrycia klastra

| # | slug | poziom | liść `required` | liść `acquired` | główne źródło (OSS) |
|---|---|---|---|---|---|
| P1 | cyber-pam-inwentaryzacja-kont-uprzywilejowanych | L1 | PAM | Active Directory, Linux, IAM | BloodHound Community Edition |
| P2 | cyber-pam-skarbiec-sekretow-openbao | L2 | PAM, CyberArk | Linux, IAM | OpenBao (fork Vault) |
| P3 | cyber-pam-sekrety-poza-kodem-rotacja | L2 | PAM | Python, Linux, CyberArk, DevSecOps | OpenBao / HashiCorp Vault |
| P4 | cyber-pam-nagrywanie-sesji-teleport | L3 | CyberArk, PAM | Linux, RODO / GDPR | Teleport |
| P5 | cyber-pam-dostep-na-czas-jit-break-glass | L3 | PAM, CyberArk | Active Directory, IAM | Teleport (Access Requests) |
| P6 | cyber-pam-zdarzenia-uprzywilejowane-siem | L3 | PAM, SIEM | SOC, Incident Response | OpenBao audit device → SIEM |

**Pokrycie liści klastra:** PAM → required w P1/P2/P3/P5/P6 ✓ · CyberArk → required w P2/P4/P5 ✓ · IAM → acquired w P1/P2/P5 ✓ · Active Directory → acquired w P1/P5 ✓. Wszystkie ważne kompetencje klastra domknięte. Mix poziomów: L1×1 (fundament: discovery), L2×2 (skarbiec, rotacja), L3×3 (sesje, JIT/break-glass, most do SIEM — portfolio na rozmowę o pracę).

**Łańcuch zależności (kolejność autoringu):** P1 (inwentaryzacja) → P2 (skarbiec) → P3 (rotacja) → P4 (sesje) → P5 (JIT) → P6 (most do SIEM). Skarbiec (P2) musi poprzedzać rotację (P3), bo bez skarbca nie ma czym rotować. Cała pula zakłada ukończone projekty partii 1 (IAM/AD, Linux, Python) — patrz prerekwizyty per projekt.

---

## P1 — Inwentaryzacja kont uprzywilejowanych (L1)

- **slug:** `cyber-pam-inwentaryzacja-kont-uprzywilejowanych` · **est.:** 5 h
- **Koncept.** Student inwentaryzuje wszystkie konta uprzywilejowane na własnym treningowym labie (katalog Active Directory z partii 1 + serwer Linux): administrator domeny, `root`/`sudo`, konta usługowe, konta z prawem nadawania uprawnień. Mapą ścieżek do kont admin posłuży się przez BloodHound Community Edition (otwartoźródłowe narzędzie, które pokazuje „kto realnie jest administratorem" przez zagnieżdżone grupy). Odpowiada na niuans #2 researchu PAM: *nie wiesz, ilu masz administratorów*. Wskazuje współdzielone hasło administratora i tłumaczy, dlaczego niszczy rozliczalność.
- **Źródło (oss):** BloodHound Community Edition — `https://github.com/SpecterOps/BloodHound` (zweryfikowane 200; licencja Apache-2.0).
- **Legalność.** Narzędzie mapujące (technika o rodowodzie ofensywnym) uruchamiane **wyłącznie na własnym labie z fikcyjnymi personami** — nigdy przeciw cudzemu katalogowi. Klauzula etyczno-prawna (art. 267 KK) obowiązkowa — projekt dotyka techniki wykrywania ścieżek dostępu. Atrybucja BloodHound (SpecterOps, Apache-2.0) w README.
- **Prerekwizyty:** `cyber-iam-active-directory-lab` (katalog AD — źródło kont domenowych), `cyber-hardening-linux-bash` (konta `root`/usługowe na Linux). Wymaga opanowanego IAM (konto/grupa/rola).
- **Szkic rubryki (suma 100):** Kompletność inwentarza kont uprzywilejowanych 30 · Zmapowanie ścieżek do kont admin (BloodHound, zagnieżdżone grupy) 25 · Wskazanie współdzielonego hasła i utraty rozliczalności 20 · Rozróżnienie konto uprzywilejowane vs zwykłe (skutki przejęcia) 15 · Odtwarzalność i etyka 10.

## P2 — Skarbiec sekretów od zera: OpenBao/Vault (L2)

- **slug:** `cyber-pam-skarbiec-sekretow-openbao` · **est.:** 10 h
- **Koncept.** Student uruchamia otwartoźródłowy skarbiec sekretów (OpenBao — w pełni wolny fork HashiCorp Vault), umieszcza w nim poświadczenie uprzywilejowane, nadaje politykę dostępu wg najmniejszego uprawnienia i pobiera sekret kontrolowanie, z zapisem każdego pobrania. Mapuje słownik na CyberArk: Sejf (Safe), konto (account), platforma (Platform). Domyka niuans #1/#6: „hasła nie zna człowiek" oraz „skarbiec to najcenniejszy cel i pojedynczy punkt awarii".
- **Źródło (oss):** OpenBao — `https://github.com/openbao/openbao` (200; MPL-2.0). Alternatywa: HashiCorp Vault — `https://github.com/hashicorp/vault` (200).
- **Legalność.** OSS na własnym labie, sekrety fikcyjne. Klauzula bazowa wystarcza (brak techniki ofensywnej). Nota licencyjna OpenBao (MPL-2.0) + atrybucja w README. CyberArk jako `learning_resource` (dokumentacja + CyberArk University).
- **Prerekwizyty:** `cyber-hardening-linux-bash` (skarbiec stawia się na Linuksie), IAM (polityka dostępu = least privilege). P1 zalecane wcześniej (wiadomo, co objąć skarbcem).
- **Szkic rubryki (suma 100):** Uruchomienie skarbca + umieszczenie sekretu 25 · Polityka dostępu (least privilege do sekretu) 25 · Kontrolowane pobranie z zapisem/audytem 25 · Mapowanie słownika na CyberArk (Sejf/konto/platforma) 15 · Odtwarzalność, licencja, etyka 10.

## P3 — Sekrety poza kodem i rotacja (L2)

- **slug:** `cyber-pam-sekrety-poza-kodem-rotacja` · **est.:** 12 h
- **Koncept.** Student wyjmuje hasło zaszyte w skrypcie (hardcoded secret) i przerabia skrypt tak, by pobierał sekret ze skarbca w czasie działania. Konfiguruje automatyczną rotację (lub sekrety dynamiczne — tworzone na żądanie i wygasające). Omawia dwie pułapki zawodowca: *rotacja może położyć produkcję* (aplikacja trzyma stare hasło „na sztywno") oraz *sekret w repozytorium git nie znika po usunięciu* — trzeba go unieważnić (zrotować). Domyka niuanse #3/#4/#5 researchu PAM.
- **Źródło (oss):** OpenBao — `https://github.com/openbao/openbao` (200). Dokumentacja sekretów dynamicznych/baz: `https://developer.hashicorp.com/vault/docs/secrets/databases` (200, jako `learning_resource`).
- **Legalność.** OSS, własny lab, fikcyjne sekrety i skrypty. Klauzula bazowa. Pomost do DevSecOps (sekrety w CI/CD) — kontekst MITRE ATT&CK T1552 „Unsecured Credentials" (`https://attack.mitre.org/techniques/T1552/`, 200) jako `learning_resource`.
- **Prerekwizyty:** P2 (skarbiec — bez niego nie ma dokąd wyjąć sekretu), `cyber-python-automatyzacja-logow` (rozumienie skryptu i pliku konfiguracyjnego), Linux.
- **Szkic rubryki (suma 100):** Wyjęcie sekretu ze skryptu do skarbca (pobór w czasie działania) 30 · Konfiguracja rotacji / sekretów dynamicznych 25 · Pułapka „rotacja kładzie produkcję" (mapa zależności + okno serwisowe) 20 · „Sekret w git nie znika" — unieważnienie zamiast skasowania 15 · Odtwarzalność i etyka 10.

## P4 — Pośredniczona, nagrywana sesja uprzywilejowana: Teleport (L3)

- **slug:** `cyber-pam-nagrywanie-sesji-teleport` · **est.:** 22 h
- **Koncept.** Student zestawia na labie pośredniczony dostęp do serwera przez Teleport (otwartoźródłowa brama dostępu z nagrywaniem sesji) tak, że administrator **nie zna hasła docelowego** — podaje je brama. Włącza nagrywanie sesji, pokazuje ślad audytowy (kto, kiedy, jakie polecenia). Mapuje na komponent PSM (Privileged Session Manager) CyberArk. Kluczowe: omawia granicę prawną — nagranie pracy administratora to **monitoring pracownika** (Kodeks pracy art. 22²–22³) i **dane osobowe** (RODO: cel, minimalizacja, retencja, dostęp do nagrań). Domyka niuans #4/#8.
- **Źródło (oss):** Teleport — `https://github.com/gravitational/teleport` (200; community edition). Alternatywna brama: Apache Guacamole — `https://github.com/apache/guacamole-server` (200, Apache-2.0).
- **Legalność.** OSS na własnym labie, fikcyjne persony. **Podwójna klauzula:** bazowa (art. 267 KK) + RODO/monitoring pracownika (podstawa prawna, obowiązek poinformowania, retencja nagrań). Maskowanie IP w artefaktach. Atrybucja Teleport w README.
- **Prerekwizyty:** P2 (skarbiec), Linux, `cyber-iam-active-directory-lab` (konta domenowe, do których pośredniczymy dostęp). Znajomość RODO na poziomie „adres IP/nagranie = dana osobowa".
- **Szkic rubryki (suma 100):** Pośredniczony dostęp — administrator nie zna hasła docelowego 25 · Nagrywanie sesji + czytelny ślad audytowy 25 · Granica RODO / monitoring pracownika (podstawa, cel, retencja) 20 · Mapowanie na PSM CyberArk + wymóg regulacyjny (DORA/PCI-DSS) 15 · Etyka labu, licencja, maskowanie IP 15.

## P5 — Dostęp na czas (JIT), czworo oczu i konto break-glass (L3)

- **slug:** `cyber-pam-dostep-na-czas-jit-break-glass` · **est.:** 24 h
- **Koncept.** Student projektuje i odgrywa przepływ dostępu na czas zadania (just-in-time): wniosek → zatwierdzenie drugiej osoby (dual control, „czworo oczu") → automatyczne wygaszenie uprawnienia. Realizuje to przez mechanizm Access Requests w Teleport. Eliminuje stały dostęp uprzywilejowany (standing privilege) — cel „zero standing privilege". Projektuje konto awaryjne break-glass („rozbij szybę") z jego zabezpieczeniem i alertem na **każde** użycie oraz omawia jego paradoks (musi działać, gdy padnie wszystko, więc jest celem nr 1). Domyka niuanse #1/#5/#6/#7.
- **Źródło (oss):** Teleport Access Requests — `https://github.com/gravitational/teleport` (200); dokumentacja: `https://goteleport.com/docs/admin-guides/access-controls/access-requests/` (200, `learning_resource`).
- **Legalność.** OSS, własny lab, fikcyjne persony. Klauzula bazowa (art. 267 KK). Atrybucja Teleport. Bez techniki ofensywnej.
- **Prerekwizyty:** P2 (skarbiec), P4 zalecane (rozumienie sesji uprzywilejowanej), `cyber-iam-active-directory-lab` (role i grupy admin do zawężenia), IAM.
- **Szkic rubryki (suma 100):** Przepływ JIT (wniosek → zatwierdzenie → wygaszenie) 30 · Eliminacja standing privilege (dowód „ile stałego dostępu zlikwidowano") 20 · Czworo oczu (dual control) na najwrażliwszych kontach 15 · Projekt break-glass + alert na użycie + jego paradoks 25 · Odtwarzalność i etyka 10.

## P6 — PAM spotyka SIEM: alert o nadużyciu dostępu uprzywilejowanego (L3)

- **slug:** `cyber-pam-zdarzenia-uprzywilejowane-siem` · **est.:** 20 h
- **Koncept.** Student konfiguruje eksport zdarzeń uprzywilejowanych z audit logu skarbca (OpenBao audit device) i wysyła je do SIEM, a następnie buduje regułę alertu o nadużyciu: pobranie hasła administratora poza oknem zmianowym, użycie konta break-glass, próba ominięcia bramy. Pokazuje, które zdarzenia PAM są dla SOC krytyczne, i dopisuje triage (priorytet + następny krok analityka). Most między klastrem IAM a klastrem SIEM/SOC. Domyka niuans #1/#7 (nadużycie dostępu uprzywilejowanego widać dopiero w monitoringu).
- **Źródło (oss):** OpenBao audit device — `https://github.com/openbao/openbao` (200); dokumentacja audytu: `https://openbao.org/docs/audit/` (200). SIEM: może wykorzystać zbiór/instalację z partii 1/2 (Splunk tutorial / BOTS — `https://github.com/splunk/botsv3`, 200).
- **Legalność.** OSS, własny lab, fikcyjne zdarzenia. Klauzula bazowa + RODO (log dostępu uprzywilejowanego bywa daną osobową; maskowanie IP w artefaktach). Atrybucja OpenBao i użytego SIEM w README.
- **Prerekwizyty:** P2 (skarbiec generujący zdarzenia), P5 (zdarzenia JIT/break-glass do wykrycia), fundament SIEM (partia 1 `cyber-siem-pierwsze-alerty-splunk` + partia 2). Wymaga rozumienia loga i reguły detekcji.
- **Szkic rubryki (suma 100):** Eksport zdarzeń uprzywilejowanych z audit logu do SIEM 25 · Reguła alertu o nadużyciu (pobranie poza oknem / break-glass) 30 · Uzasadnienie, które zdarzenia PAM są krytyczne dla SOC 20 · Triage: priorytet + następny krok (Incident Response) 15 · Odtwarzalność, maskowanie IP, etyka 10.

---

## Źródła wspólne (learning_resources / source_links dla fazy autoringu E3-A)

Wszystkie zweryfikowane 2026-07-01 (curl -L, HTTP 200), publiczne/darmowe/otwarte:

- OpenBao (skarbiec OSS, MPL-2.0) — `https://github.com/openbao/openbao` · docs `https://openbao.org/docs/`
- HashiCorp Vault (skarbiec OSS) — `https://github.com/hashicorp/vault` · docs `https://developer.hashicorp.com/vault/docs`
- Teleport (brama dostępu + nagrywanie sesji, OSS) — `https://github.com/gravitational/teleport` · docs `https://goteleport.com/docs/`
- Apache Guacamole (brama zdalnego dostępu, Apache-2.0) — `https://github.com/apache/guacamole-server`
- BloodHound Community Edition (mapowanie ścieżek do kont admin, Apache-2.0) — `https://github.com/SpecterOps/BloodHound`
- CyberArk University (darmowe szkolenia producenta, słownik komponentów) — `https://training.cyberark.com/`
- MITRE ATT&CK — T1078 Valid Accounts `https://attack.mitre.org/techniques/T1078/` · T1552 Unsecured Credentials `https://attack.mitre.org/techniques/T1552/`
- OWASP Secrets Management Cheat Sheet — `https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html`
- NIST SP 800-207 „Zero Trust Architecture" (dostęp na żądanie, nie na stałe) — `https://csrc.nist.gov/pubs/sp/800/207/final`
- Splunk BOTS v3 (dane SOC do mostu P6) — `https://github.com/splunk/botsv3`

**Uwaga do Ryana (rzetelność/RODO/legalność):** brak źródeł pirackich; CyberArk uczony z czytania dokumentacji i darmowych szkoleń, nie z nielegalnej kopii produktu. Dwa punkty ryzyka prawnego wymagają twardej klauzuli w `theory_md` autoringu: (1) **P4 — nagrywanie sesji** = monitoring pracownika + dane osobowe (Kodeks pracy + RODO), nawet na labie z fikcyjnymi personami; (2) **P1 — BloodHound** = narzędzie o rodowodzie ofensywnym, wyłącznie na własnym katalogu (art. 267 KK). Portal `docs.cyberark.com` blokuje automaty — przed wejściem do `learning_resources` zweryfikować deep-linki w przeglądarce (docs CyberArk często zmieniają URL).
