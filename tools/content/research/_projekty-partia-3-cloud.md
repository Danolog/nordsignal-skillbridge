# Dossier źródeł — projekty partii 3: klaster „Cloud Security"

> **Zadanie:** E3 „domknięcie cyber" — slate 2 projektów dla klastra „Cloud Security" ścieżki Cybersecurity Specialist.
> **Wersja:** v1.0 · 2026-07-01 · autor: Sophia (Product Owner), w parze z researcherem źródeł.
> **Recenzja przed autoringiem:** Ryan (legalność/RODO źródeł) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, kontrakt JSON).
> **Liście do pokrycia (grupa „Cloud Security"):** `AWS` · `Azure` · `GCP`. Każdy trafia do co najmniej jednego projektu jako `required`.
> **Twarda reguła klastra:** każdy projekt na **własnym darmowym koncie / emulatorze (LocalStack)** albo na **publicznym repozytorium infrastruktury jako kod (IaC)** — **nigdy na cudzej infrastrukturze ani cudzych danych** (art. 267 Kodeksu karnego, RODO).

---

## Decyzja projektowa: dlaczego 2 projekty i taki rozkład

Klaster ma 3 liście (AWS, Azure, GCP) i budżet 2 projektów. Rozkład wynika z **pokrycia**, nie z odgórnego targetu, i z twardej reguły „nigdy cudza infrastruktura":

- **Problem z realnymi kontami chmurowymi.** Pełny audyt postawy (CSPM) na żywym koncie AWS/Azure/GCP wymaga założenia konta, karty płatniczej i ryzyka kosztu — bariera dla studenta i furtka do przypadkowego dotknięcia cudzych zasobów. Dlatego oba projekty stoją na źródłach, które **nie wymagają żadnego realnego konta chmurowego**:
  1. **LocalStack** — emulator chmury AWS działający lokalnie w kontenerze na laptopie studenta (zero realnego konta, zero kosztu, zero cudzej infrastruktury).
  2. **Podatna-z-założenia infrastruktura jako kod (Vulnerable-by-Design IaC)** — publiczne repozytorium `terragoat` z celowo błędnie skonfigurowanym kodem Terraform dla AWS/Azure/GCP; student **skanuje kod statycznie** (nie uruchamia go w żadnej chmurze) skanerem otwartoźródłowym.
- **Rozkład poziomów (fundament niżej, portfolio wyżej):** projekt 1 = **L2** (zastosowanie: zbuduj błąd, wykryj, napraw — na emulatorze AWS), projekt 2 = **L3** (portfolio: pełny audyt postawy wielu chmur + mapowanie na standardy + raport dla decydenta).
- **Pokrycie liści:** AWS w projekcie 1 (`required`); Azure i GCP w projekcie 2 (`required`). AWS wraca w projekcie 2 jako `acquired` (prerekwizyt — rdzeń grupy opanowany w projekcie 1). Wszystkie trzy liście pokryte jako `required` w co najmniej jednym projekcie.

Rdzeń teorii grupy (model współdzielonej odpowiedzialności, błędna konfiguracja jako główny wektor, CSPM, tożsamość jako obwód) ustalony w `research/aws.md` §2/§4 — projekty go stosują, nie powtarzają trzeci raz.

---

## Projekt 1 — L2 · AWS na emulatorze LocalStack

- **slug:** `cyber-cloud-localstack-misconfig-aws`
- **Poziom / czas:** L2 · 12 h
- **Koncept:** Student stawia emulator chmury AWS **lokalnie na własnym laptopie** (LocalStack, kontener Docker) i sam odtwarza trzy klasyczne błędne konfiguracje: publiczny zasobnik S3 (magazyn plików wystawiony na cały internet), politykę tożsamości i dostępu (IAM) z gwiazdką `"*"` (pełnia władzy), oraz wyłączony dziennik audytu (CloudTrail). Następnie **wykrywa** te błędy audytem przez wiersz poleceń (`awslocal` — klient AWS wskazany na lokalny emulator) i **naprawia** je, dowodząc zamknięcia (publiczny dostęp odcięty we wszystkich warstwach, uprawnienie zawężone do najmniejszego, audyt włączony). Oddaje repozytorium ze skryptami odtworzenia labu, audytem przed/po i notatką o warstwach publicznego dostępu.
- **Źródło (`sourceType: oss`):**
  - **LocalStack** — emulator usług chmury AWS działający w jednym kontenerze na laptopie: https://github.com/localstack/localstack
  - Licencja: **Apache-2.0**. Wersja społecznościowa (Community) darmowa. **Uwaga o stanie repo (weryfikacja 2026-07-01):** repozytorium `localstack/localstack` jest od 2026-03-23 **zarchiwizowane (tylko do odczytu)** po konsolidacji do jednego obrazu — kod nadal publiczny i używalny; **aktywny punkt wejścia to dokumentacja** https://docs.localstack.cloud/getting-started/ (darmowa edycja Community/Hobby). W projekcie źródłem głównym jest emulator; dokumentacja startowa jako materiał.
- **Uzasadnienie legalności:** LocalStack działa **wyłącznie na maszynie studenta** — emuluje interfejsy AWS lokalnie, nie łączy się z żadnym realnym kontem ani cudzą infrastrukturą. Zero realnego konta chmurowego = zero ryzyka dotknięcia cudzych zasobów, zero kosztu. Publiczne adresy IP w przykładach maskowane; logi emulatora są syntetyczne (wygenerowane lokalnie), więc bez danych osobowych. Klauzula etyczno-prawna standardowa (art. 267 KK) — projekt dotyka technik konfiguracji obronnej, nie ofensywnych, ale klauzula obowiązuje jak w całej ścieżce.
- **Prerekwizyty (`acquired`):**
  - `IAM` — pojęcie tożsamości, roli, uprawnienia (baza: partia 1 `cyber-iam-active-directory-lab`). Bez tego polityki IAM w AWS to czarna skrzynka.
  - `Linux` — LocalStack w kontenerze, praca w wierszu poleceń (baza: partia 1 `cyber-hardening-linux-bash`).
- **Kompetencje (do kontraktu JSON):** `AWS` (required); `IAM` (acquired); `Linux` (acquired).
- **Szkic rubryki (suma wag = 100):**
  1. Odtworzenie 3 klasycznych błędnych konfiguracji na emulatorze — **20** (dowód: skrypty `awslocal` tworzące publiczny S3, politykę z `"*"`, wyłączony CloudTrail).
  2. Wykrycie błędów audytem — **25** (dowód: zapytania/skrypt audytu, które wskazują każdy z trzech błędów, z wypisaniem, co jest źle).
  3. Naprawa i dowód zamknięcia — **25** (publiczny dostęp odcięty we **wszystkich** warstwach — polityka zasobnika, lista kontroli dostępu ACL, ustawienie konta; uprawnienie zawężone; audyt włączony; dowód przed/po).
  4. Uzasadnienie: warstwy publicznego dostępu i least privilege — **20** (akapit: dlaczego zamknięcie jednej warstwy nie wystarcza; dlaczego `"*"` to czerwona flaga).
  5. Odtwarzalność i etyka — **10** (README z krokami, atrybucją LocalStack/Apache-2.0, maskowaniem IP, klauzulą etyczno-prawną).

---

## Projekt 2 — L3 · CSPM wielu chmur na podatnej IaC (Azure + GCP)

- **slug:** `cyber-cloud-cspm-terragoat-azure-gcp`
- **Poziom / czas:** L3 · 24 h
- **Koncept:** Student przeprowadza pełną ocenę postawy bezpieczeństwa chmury (CSPM — Cloud Security Posture Management) na **publicznym, celowo podatnym** kodzie infrastruktury jako kod (IaC) `terragoat`, skupiając się na modułach **Azure i GCP**. Skanuje kod **statycznie** skanerem otwartoźródłowym (Checkov — analiza kodu Terraform pod kątem błędnych konfiguracji; alternatywnie Prowler), mapuje ustalenia na **CIS Foundations Benchmark** dla Azure i GCP (punkt odniesienia dobrych praktyk) oraz na **MITRE ATT&CK for Cloud** (macierz technik napastników w chmurze), rysuje **mapę luk** (świadomie nazwane martwe pola) i oddaje **raport postawy dla decydenta** z priorytetyzacją koszt–ryzyko (które 10 ustaleń naprawić dziś). Oddaje repozytorium z wynikiem skanu, tabelami mapowania i raportem.
- **Źródło (`sourceType: oss`):**
  - **TerraGoat** — „Vulnerable by Design" (podatny z założenia) kod Terraform dla AWS/Azure/GCP/Oracle, do treningu skanerów bezpieczeństwa: https://github.com/bridgecrewio/terragoat — licencja **Apache-2.0**, publiczny.
  - **Checkov** — otwartoźródłowy skaner infrastruktury jako kod (>1000 wbudowanych reguł, AWS/Azure/GCP): https://github.com/bridgecrewio/checkov — licencja **Apache-2.0**, publiczny.
  - **Prowler** (wariant zamienny skanera, wielochmurowy): https://github.com/prowler-cloud/prowler — Apache-2.0, publiczny.
- **Uzasadnienie legalności:** `terragoat` to **cudzy kod, ale jawnie publiczny i przeznaczony do treningu** (Apache-2.0), a student **skanuje go statycznie na własnym laptopie** — nie wdraża w żadnej chmurze, nie uruchamia na cudzym koncie, nie dotyka niczyjej infrastruktury. To najbezpieczniejsza forma nauki CSPM: pełny zestaw realistycznych błędów bez ryzyka i kosztu realnej chmury. Skaner (Checkov/Prowler) analizuje pliki tekstowe Terraform — brak połączenia z jakimkolwiek żywym systemem. Adresy IP w przykładowych ustaleniach maskowane; brak danych osobowych (kod syntetyczny). Klauzula etyczno-prawna + sekcja licencji/atrybucji (Apache-2.0 dla terragoat, Checkov, Prowler; © MITRE dla ATT&CK; CIS Benchmarks).
- **Prerekwizyty (`acquired`):**
  - `AWS` — rdzeń grupy (model odpowiedzialności, błędna konfiguracja, CSPM) opanowany w projekcie 1 na emulatorze; tu przenoszony na Azure/GCP.
  - `IAM` — tożsamość, rola, uprawnienie (baza: partia 1).
- **Kompetencje (do kontraktu JSON):** `Azure` (required); `GCP` (required); `AWS` (acquired); `IAM` (acquired).
- **Szkic rubryki (suma wag = 100):**
  1. Skan podatnej IaC skanerem otwartoźródłowym (Azure + GCP) — **25** (dowód: wynik Checkov/Prowler na modułach Azure i GCP terragoat, lista ustaleń z identyfikatorami reguł).
  2. Mapowanie ustaleń na CIS Foundations Benchmark (Azure i GCP) — **20** (tabela: ustalenie → punkt CIS; raport zgodności/odchyleń).
  3. Mapowanie na MITRE ATT&CK for Cloud + mapa luk — **20** (przypisanie ryzyk do technik napastnika; jawnie nazwane martwe pola — czego skan nie widzi i dlaczego).
  4. Priorytetyzacja koszt–ryzyko + raport postawy dla decydenta — **25** (które 10 ustaleń naprawić dziś, dlaczego; surowa lista skanera to półprodukt, wartość jest w priorytetyzacji).
  5. Dokumentacja, odtwarzalność, etyka i licencja — **10** (README z krokami, atrybucją terragoat/Checkov/ATT&CK/CIS, maskowaniem IP, klauzulą etyczno-prawną).

---

## Weryfikacja źródeł (2026-07-01, publiczne i darmowe)

| Źródło | URL | Stan | Licencja |
|---|---|---|---|
| LocalStack (emulator AWS) | https://github.com/localstack/localstack | publiczny; repo zarchiwizowane (read-only) 2026-03, kod używalny; aktywny punkt wejścia = docs | Apache-2.0 |
| LocalStack — start (docs) | https://docs.localstack.cloud/getting-started/ | publiczny, żywy; edycja Community darmowa | — (dokumentacja) |
| TerraGoat (podatna IaC AWS/Azure/GCP) | https://github.com/bridgecrewio/terragoat | publiczny, żywy | Apache-2.0 |
| Checkov (skaner IaC) | https://github.com/bridgecrewio/checkov | publiczny, żywy; >1000 reguł AWS/Azure/GCP | Apache-2.0 |
| Prowler (skaner wielochmurowy, wariant) | https://github.com/prowler-cloud/prowler | publiczny, żywy; AWS/Azure/GCP | Apache-2.0 |
| ScoutSuite (skaner postawy, wariant) | https://github.com/nccgroup/ScoutSuite | publiczny (research grupy) | GPL-2.0 |
| CIS Microsoft Azure Foundations Benchmark | https://www.cisecurity.org/benchmark/azure | publiczny, PDF darmowy po rejestracji | CIS |
| CIS Google Cloud Platform Foundations Benchmark | https://www.cisecurity.org/benchmark/google_cloud_computing_platform | publiczny, PDF darmowy po rejestracji | CIS |
| MITRE ATT&CK for Cloud | https://attack.mitre.org/matrices/enterprise/cloud/ | publiczny, żywy | © MITRE (otwarta baza) |
| TSUE Breyer C-582/14 (IP jako dana osobowa) | https://curia.europa.eu/juris/liste.jsf?num=C-582/14 | publiczny | — |

Wszystkie pozycje oficjalne/otwarte, brak źródeł pirackich. Żaden projekt nie wymaga realnego konta chmurowego ani nie dotyka cudzej infrastruktury — reguła klastra spełniona.

---

## Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w dyrektora bezpieczeństwa (CISO) zatrudniającego juniorów do zespołu bezpieczeństwa chmury. Pięć słabości pierwszej wersji i poprawki:

1. **Słabość: ryzyko, że projekt wymusi realne konto chmurowe (koszt, dotknięcie cudzych zasobów).** Poprawka: oba projekty stoją na źródłach bez realnego konta — emulator LocalStack (lokalnie) i statyczny skan podatnej IaC. Zero karty płatniczej, zero cudzej infrastruktury.
2. **Słabość: dwa projekty mogłyby nie pokryć trzech liści.** Poprawka: AWS `required` w P1; Azure + GCP `required` w P2; AWS wraca jako `acquired` w P2. Każdy liść pokryty jako `required`.
3. **Słabość: LocalStack zarchiwizowany — martwy link?** Poprawka: zweryfikowałam 2026-07-01 — repo publiczne i używalne, a aktywny punkt wejścia to `docs.localstack.cloud` (darmowa Community). Stan jawnie opisany w dossier, nie zamieciony.
4. **Słabość: projekt 2 mógłby zostać „surowym wyrzutem skanera".** Poprawka: rubryka waży priorytetyzację koszt–ryzyko (25) i mapę luk (20) wyżej niż sam skan — wartość jest w tym, które 10 ustaleń naprawić dziś, nie w liczniku ustaleń (niuans rdzenia `aws.md` #5, #6).
5. **Słabość: brak dowodu, że praca jest legalna wobec RODO.** Poprawka: dane w obu projektach syntetyczne (emulator / kod terragoat), IP maskowane, klauzula etyczno-prawna + sekcja licencji Apache-2.0 w każdym `theory_md`.

**Sprawdzenie tłumaczenia żargonu (sekcja 3 CLAUDE.md):** każdy termin rozwinięty przy pierwszym użyciu (LocalStack/emulator, IaC/infrastruktura jako kod, CSPM, S3/zasobnik, IAM, ACL, CloudTrail, least privilege, CIS Benchmark, MITRE ATT&CK, blind spot/martwe pole, Checkov, Prowler, ScoutSuite, Vulnerable-by-Design). Polskie nazwy tam, gdzie nie tracą precyzji.
