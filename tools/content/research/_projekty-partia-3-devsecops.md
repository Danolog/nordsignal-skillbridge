# Dossier źródeł — partia 3 projektów: klaster „DevSecOps i konteneryzacja"

> **Wersja:** v1.0 · 2026-07-01 · autor: Sophia (Product Owner), w parze z researcherem źródeł
> **Zadanie:** E3 „domknięcie cyber" — slate 2 projektów dla grupy kontekstowej „DevSecOps i konteneryzacja" ścieżki Cybersecurity Specialist.
> **Liście grupy do pokrycia (dosłownie z `career-model.ts`):** `Kubernetes` · `CI/CD` · `DevSecOps`.
> **Recenzja przed autoringiem (faza E3-A):** Ryan (rzetelność/RODO/legalność źródeł) → Ethan/Leo (mapowanie nazw na dosłowne liście, kontrakt narzędzia).
> **Soczewka grupy:** wpięcie bezpieczeństwa w taśmę dostarczania kodu; skan kodu/obrazu przed wdrożeniem. Zero administracji dla samej administracji — wszystko pod kątem „jak to zahartować i czego pilnować".

---

## Reguła pokrycia — jak 2 projekty domykają 3 liście

Grupa ma trzy liście. Slate dwóch projektów pokrywa każdy z nich **przez rolę `required`** (nie tylko `acquired`), więc matcher złapie luki niezależnie od tego, którą kompetencję student ma otwartą:

| Liść grupy | Projekt 1 (taśma CI/CD) | Projekt 2 (klaster K8s) | Pokrycie |
|---|---|---|---|
| **DevSecOps** | `required` | `acquired` | ✓ przez required |
| **CI/CD** | `required` | `acquired` | ✓ przez required |
| **Kubernetes** | — | `required` | ✓ przez required |

**Rozkład poziomów (fundament niżej, portfolio wyżej):** P1 = **L2** (wpięcie bramki w taśmę — zastosowanie), P2 = **L3** (hartowanie klastra end-to-end — portfolio na rozmowę o pracę). DevSecOps jest rdzeniem pojęciowym grupy (`lift` 14,01 — gdy oferta wymienia „DevSecOps", to prawie na pewno rola bezpieczeństwa), więc oba projekty patrzą na CI/CD i Kubernetes przez tę soczewkę, a nie przez administrację (oba te liście mają `lift` < 1 — same w sobie to ogólne kompetencje infrastrukturalne).

**Wspólna granica etyczno-prawna obu projektów:** cały lab działa **wyłącznie na własnym repozytorium / własnym lokalnym klastrze treningowym**. Żadnego skanowania cudzej taśmy, cudzego repozytorium ani cudzego klastra — to w Polsce przestępstwo (art. 267 Kodeksu karnego). Każdy projekt w fazie E3-A zaczyna `theory_md` od klauzuli etyczno-prawnej (wzorzec z golden-example partii 2).

---

## Projekt 1 — `cyber-cicd-bramka-skanu-tasma`

**Tytuł:** Bramka bezpieczeństwa w taśmie CI/CD: skan kodu, zależności i sekretów przed wdrożeniem
**Poziom:** L2 · **Szacunek:** 12 h (widełki L2: 8–14 h)
**Liście:** `required` → CI/CD, DevSecOps · `acquired` → SAST, SCA

### Koncept
Student buduje własną taśmę CI/CD (GitHub Actions na **własnym**, darmowym repozytorium) wokół celowo podatnej aplikacji treningowej OWASP Juice Shop, którą rozwidla (*fork*) na swoje konto. Taśma uruchamia przy każdej zmianie trzy klasy skanu: analizę statyczną kodu (SAST — Semgrep), analizę składu zależności (SCA — Trivy) i skan sekretów (Gitleaks). Sednem nie jest „włączenie skanera", lecz **bramka blokująca z uzasadnionym progiem** — co zatrzymuje wdrożenie, a co tylko ostrzega — plus odczyt wyników w znormalizowanym formacie SARIF i triage co najmniej jednego fałszywego alarmu z jawnym wyciszeniem.

### Źródło (główne)
- **Typ:** `oss`
- **URL:** `https://github.com/juice-shop/juice-shop` (zweryfikowane 2026-07-01, HTTP 200, publiczne repozytorium)
- **Rola źródła:** cel skanu — otwarta, celowo podatna aplikacja treningowa (Node.js) z realnymi podatnymi zależnościami i wzorcami kodu; daje skanerom prawdziwe znaleziska do interpretacji.

### Źródła narzędzi i wiedzy (do `learning_resources` / `source_links`)
- Semgrep — analiza statyczna SAST (otwarta): `https://semgrep.dev/docs/` (200)
- Trivy — skan zależności/konfiguracji SCA (otwarty): `https://trivy.dev/` (200)
- Gitleaks — skan sekretów (otwarty): `https://github.com/gitleaks/gitleaks` (200)
- GitHub — bezpieczne korzystanie z Actions (sekrety, uprawnienia, przypinanie do SHA): `https://docs.github.com/en/actions/security-guides` (200)
- OWASP Top 10 CI/CD Security Risks (najczęstsze ryzyka taśmy): `https://owasp.org/www-project-top-10-ci-cd-security-risks/` (200)
- SARIF — wspólny format wyników analizy: `https://sarifweb.azurewebsites.net/` (200)

### Uzasadnienie legalności
Wszystkie narzędzia i cel są otwartoźródłowe/publiczne i darmowe. Skan działa **wyłącznie na własnym forku** aplikacji treningowej — to praca na własnym systemie, nie na cudzym. SAST/SCA/skan sekretów są **nieofensywne** (czytają kod i zależności, nie atakują działającej aplikacji — DAST celowo poza zakresem tego projektu). Darmowe minuty GitHub Actions na koncie studenta wystarczają — projekt nie wymusza wydatku. **Potrzebna klauzula etyczno-prawna** (art. 267 KK): praca wyłącznie na własnym repozytorium i własnej taśmie; sekret wykryty w historii = natychmiastowa rotacja (unieważnienie i wymiana), nigdy samo skasowanie pliku.

### Prerekwizyty
- Podstawy git i wiersza poleceń (`Linux`, `Bash`; projekt partii 1 `cyber-hardening-linux-bash`).
- Rozumienie, co widzi SAST, a co SCA, i czym jest podatność aplikacji webowej (`OWASP`, `SAST`, `SCA` — grupa AppSec). Dlatego SAST i SCA wchodzą jako `acquired` (prereq), nie jako to, czego projekt uczy od zera.

### Szkic rubryki (suma wag = 100)
1. **Taśma z trzema klasami skanu jako kroki CI** — 25. Dowód: plik taśmy (workflow) na własnym repo uruchamiający SAST + SCA + skan sekretów przy każdej zmianie; log przebiegu ze wszystkimi trzema krokami.
2. **Bramka blokująca z uzasadnionym progiem** — 25. Konfiguracja, że taśma *zatrzymuje* zmianę przy wadze wysokiej/krytycznej, a niższe tylko raportuje; akapit: dlaczego ten próg, jaki to kompromis (fałszywy alarm vs przeoczenie).
3. **Odczyt SARIF + triage fałszywego alarmu** — 20. Odczytanie znormalizowanego wyniku (SARIF) i rozdzielenie co najmniej jednego realnego znaleziska od fałszywego alarmu, z **udokumentowanym** wyciszeniem (uzasadnienie + ryzyko), nigdy cichym.
4. **Hartowanie samej taśmy** — 15. Najmniejsze uprawnienie taśmy (np. tylko odczyt repo, jeśli nie musi zapisywać) + przypięcie zewnętrznych wtyczek do pełnego skrótu commita (SHA), nie do ruchomej etykiety (kontekst: incydent `tj-actions/changed-files`, 2025).
5. **Odtwarzalność, atrybucja i etyka** — 15. README z krokami odtworzenia na własnym forku, atrybucją Juice Shop/narzędzi, notą o darmowym planie Actions i klauzulą etyczno-prawną; sekrety przykładowe zamaskowane.

---

## Projekt 2 — `cyber-k8s-hartowanie-klastra-obraz`

**Tytuł:** Hartowanie klastra Kubernetes: RBAC, segmentacja sieci i bramka skanu obrazu
**Poziom:** L3 · **Szacunek:** 24 h (widełki L3: 18–30 h)
**Liście:** `required` → Kubernetes · `acquired` → DevSecOps, CI/CD, Linux, IAM

### Koncept
Student hartuje **własny, lokalny** klaster treningowy (kind lub minikube) end-to-end: audyt wobec CIS Benchmark narzędziem `kube-bench` z naprawą istotnych odchyleń, model RBAC najmniejszego uprawnienia (brak konta „na wszystko"), segmentacja sieci „domyślnie blokuj" (*default-deny*) oraz kontrola wpuszczania (*admission control*) silnikiem Kyverno, która **nie wpuści** na klaster poda łamiącego politykę (brak praw administratora, zakaz tagu `latest`, wymóg przeskanowanego obrazu). Skan obrazu (Trivy) wpięty jako **bramka w taśmie** — niezeskanowany obraz nie wchodzi na klaster (połączenie shift-left z CI/CD). Całość zmapowana na MITRE ATT&CK for Containers z jawnie nazwaną luką. To poziom „portfolio na rozmowę o pracę".

### Źródło (główne)
- **Typ:** `oss`
- **URL:** `https://github.com/aquasecurity/kube-bench` (zweryfikowane 2026-07-01, HTTP 200, publiczne repozytorium)
- **Rola źródła:** narzędzie audytu klastra wobec CIS Kubernetes Benchmark — punkt startu hartowania (lista kontrolna „czy klaster jest ustawiony zgodnie z dobrą praktyką").

### Źródła narzędzi i wiedzy (do `learning_resources` / `source_links`)
- kind — lokalny klaster treningowy (Kubernetes w kontenerze): `https://kind.sigs.k8s.io/` (200) · repo `https://github.com/kubernetes-sigs/kind` (200)
- Kyverno — silnik polityk / kontrola wpuszczania (otwarty): `https://kyverno.io/docs/` (200)
- Trivy — skan obrazu (otwarty): `https://trivy.dev/` (200)
- Kubernetes — RBAC (kontrola dostępu): `https://kubernetes.io/docs/reference/access-authn-authz/rbac/` (200)
- Kubernetes — Network Policies (polityki sieciowe): `https://kubernetes.io/docs/concepts/services-networking/network-policies/` (200)
- CIS Kubernetes Benchmark (sprawdzona konfiguracja): `https://www.cisecurity.org/benchmark/kubernetes` (200)
- MITRE ATT&CK for Containers (taktyki napastnika w kontenerach): `https://attack.mitre.org/matrices/enterprise/containers/` (200)

### Uzasadnienie legalności
Wszystkie narzędzia otwartoźródłowe/darmowe; klaster stawiany **lokalnie** (kind/minikube) na maszynie studenta — żadnej cudzej infrastruktury. `kube-bench` i Trivy pobierają bazy z internetu (brak danych osobowych). CIS Benchmark w wersji do pobrania wymaga darmowej rejestracji, ale narzędzie `kube-bench` implementuje testy bez potrzeby dokumentu — projekt działa bez wydatku i bez PDF za opłatą. **Potrzebna klauzula etyczno-prawna** (art. 267 KK): skanowanie i hartowanie **wyłącznie własnego lokalnego klastra**; testowanie cudzego klastra bez pisemnej zgody to przestępstwo. Kontrola wpuszczania wdrażana najpierw w trybie doradczym (*audit*), potem blokującym — świadomość napięcia „próg blokujący vs przepływ pracy".

### Prerekwizyty
- Linux, procesy i uprawnienia plików (`Linux`; kontener to w środku Linux — bez tego student nie zrozumie, czemu pod „jako root" jest groźny). Stąd `Linux` jako `acquired`.
- Pojęcie tożsamości i najmniejszego uprawnienia (`IAM`; projekt partii 1 `cyber-iam-active-directory-lab`) — RBAC to ten sam pomysł w realiach klastra. Stąd `IAM` jako `acquired`.
- Rdzeń DevSecOps (próg blokujący, skan jako krok taśmy, łańcuch dostaw) i taśma CI/CD (skan obrazu jako bramka) — stąd `DevSecOps` i `CI/CD` jako `acquired`. Zdrowa kolejność: student robi najpierw Projekt 1 (taśma), potem Projekt 2 (klaster jako miejsce, gdzie ląduje przeskanowany obraz).

### Szkic rubryki (suma wag = 100)
1. **Audyt CIS z naprawą (`kube-bench`)** — 20. Uruchomienie audytu, interpretacja i usunięcie istotnych odchyleń z uzasadnieniem, plus zdanie o tym, czego benchmark *nie* łapie (nadmiarowe RBAC, podatny obraz — „CIS to podłoga, nie sufit").
2. **RBAC najmniejszego uprawnienia** — 20. Rola i przypisanie (*role/rolebinding*) dla konkretnego zadania widzące tylko to, co potrzebne; brak konta „na wszystko" (`cluster-admin`); dowód ograniczenia (próba akcji poza zakresem odrzucona).
3. **Segmentacja sieci „domyślnie blokuj"** — 15. Polityka sieciowa *default-deny* + jawne przepuszczenie tylko potrzebnego ruchu; dowód: próba połączenia między podami zablokowana (zamknięcie ruchu bocznego).
4. **Kontrola wpuszczania + bramka skanu obrazu** — 25. Kyverno blokujący pody łamiące politykę (brak roota, zakaz tagu `latest`, wymóg przeskanowanego obrazu), wdrożony najpierw w trybie doradczym, potem blokującym; Trivy jako bramka — niezeskanowany/podatny obraz nie wchodzi na klaster (połączenie z CI/CD).
5. **Mapa ATT&CK, dokumentacja i etyka** — 20. Mapowanie pokrycia na MITRE ATT&CK for Containers z jawnie nazwaną luką; README z krokami odtworzenia na lokalnym klastrze, atrybucją źródeł, maskowaniem adresów IP i klauzulą etyczno-prawną (art. 267 KK, praca wyłącznie na własnym klastrze).

---

## Nota weryfikacji źródeł (do akceptacji Ryana)
- Wszystkie 15 adresów sprawdzone 2026-07-01 komendą `curl` — każdy zwraca HTTP 200, każdy publiczny i darmowy. Zero źródeł pirackich, zero cudzych danych/systemów.
- Oba projekty działają na **własnym** repozytorium / **własnym** lokalnym klastrze — brak kontaktu z cudzą infrastrukturą (RODO, art. 267 KK).
- Punkt do odnotowania: dokumentacja Kubernetes i macierze MITRE ATT&CK bywają przenoszone — przed wejściem do `learning_resources` w fazie E3-A zweryfikować adresy podstron ponownie.
- Adresy IP w przykładach i artefaktach zawsze maskowane; sekrety przykładowe wyłącznie fikcyjne.
