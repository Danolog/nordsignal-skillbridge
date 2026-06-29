# Research kompetencji: GCP

> **Status:** research liścia ścieżki Cybersecurity Specialist (ETAP E3), wg wzorca `tools/content/research/siem.md`. **Nadbudowuje na rdzeniu grupy** ustalonym w `tools/content/research/aws.md` (model współdzielonej odpowiedzialności, błędna konfiguracja, CSPM, tożsamość jako obwód) — tu nie powtarzamy teorii trzeci raz, tylko **wskazujemy różnice platformy Google**.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny.
> **Soczewka (twarda):** uczymy **bezpieczeństwa** chmury Google (tożsamość, uprawnienia, organizacja zasobów, audyt logów, błędne konfiguracje) — **nie** budowania aplikacji na GCP.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `GCP` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Cloud Security" (`unionShare` grupy: **13,5%**) |
| **Popyt liścia (`demandPercentage`)** | **4,9%** ofert ścieżki wymienia GCP |
| **Liczba ofert (`offers`)** | **18** |
| **`kind`** | `tool` (platforma — w soczewce bezpieczeństwa, §2) |
| **`lift`** | 0,96 (najniższy w grupie — najsłabsze powiązanie ze ścieżką cyber) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security |

**Pozycja w grupie:**

| Liść grupy | demand % | oferty | lift | kind |
|---|---|---|---|---|
| AWS (`aws.md`, rdzeń) | 9,2 | 34 | 1,04 | tool |
| Azure (`azure.md`) | 8,4 | 31 | 1,11 | tool |
| **GCP** (ten plik) | 4,9 | 18 | 0,96 | tool |

**Wniosek dla autoringu:** GCP ma najniższy popyt (4,9%) i najniższy `lift` (0,96) w grupie — to **trzecia chmura** na polskim rynku cyber, mniej obecna niż AWS i Azure. Konsekwencja dla SkillBridge: **GCP to wybór dla studenta, który celuje w konkretne firmy na Google Cloud** (część firm produktowych, startupy, działy danych/ML), nie domyślny pierwszy wybór. Dlatego ten research jest **najbardziej oszczędny** — opiera się w pełni na rdzeniu grupy i koncentruje na *różnicach* modelu Google, nie powtarza ani teorii chmury, ani szczegółów wspólnych z AWS/Azure. Student, który zna rdzeń (z `aws.md` lub `azure.md`), przenosi 80% wiedzy; tu dokłada specyfikę GCP.

---

## 2. Definicja kompetencji i jej rola w pracy

**GCP (Google Cloud Platform — chmura obliczeniowa Google)** w soczewce bezpieczeństwa to **panowanie nad dostępem i konfiguracją w modelu Google**, którego główną cechą wyróżniającą jest **silna, narzucona hierarchia zasobów** i **scentralizowany audyt**.

**Rdzeń wspólny (ustalony w `aws.md` §2 — tu tylko przywołany, bez powtarzania):** model współdzielonej odpowiedzialności, błędna konfiguracja jako główny wektor, tożsamość jako obwód, CSPM. Student, który nie zna rdzenia, robi go najpierw na jednej platformie (§6).

**Soczewka konkretnie dla GCP (czym różni się od AWS i Azure):**

- **IAM w GCP — model „kto (principal) → rola (role) → na zasobie (resource)".** Różnica wobec AWS: w GCP uprawnienia nadaje się przez **przypisanie roli do tożsamości na danym węźle hierarchii**, a uprawnienie **dziedziczy się w dół drzewa zasobów**. To bliżej modelu ról niż polityk JSON z AWS. Kluczowe: **role podstawowe (basic: Owner/Editor/Viewer) są zbyt szerokie** — zawodowiec używa **ról predefiniowanych lub własnych** wąsko dopasowanych.
- **Organizacja zasobów — hierarchia Organizacja → Foldery → Projekty → Zasoby.** To **mocniejsza różnica niż w AWS**. GCP narzuca jasne drzewo, w którym polityki i uprawnienia spływają z góry na dół. Bezpieczeństwo zaczyna się od **dobrze zaprojektowanej hierarchii** i **polityk organizacji (Organization Policies — guardraile narzucone na cały pień, np. „zakaz tworzenia publicznych zasobów")**.
- **Security Command Center (SCC) — natywny CSPM Google.** Centralne miejsce, które skanuje projekty pod kątem błędnych konfiguracji i podatności, wystawia ustalenia i ocenę postawy. Odpowiednik Security Hub (AWS) / Defender for Cloud (Azure).
- **Cloud Audit Logs — scentralizowany audyt.** GCP rozdziela logi audytu na typy: **Admin Activity (zawsze włączone, kto co zmienił w konfiguracji)**, **Data Access (dostęp do danych — często domyślnie wyłączone, trzeba włączyć), System Event, Policy Denied**. Kluczowy niuans bezpieczeństwa: **logi dostępu do danych bywają domyślnie wyłączone** — bez ich włączenia nie ma dowodu, kto czytał dane. To źródło dla SIEM (powiązanie z liściem `SIEM`).
- **Konta usług (service accounts) — częsta pułapka GCP.** Tożsamość maszynowa (nie człowiek), którą aplikacje używają do dostępu. Nadmiarowe uprawnienia konta usługi i wyciekłe klucze konta usługi to jeden z najczęstszych wektorów w GCP — bardziej eksponowany niż w pozostałych chmurach.

**Kto tego używa i jak wygląda dzień pracy.** Inżynier/analityk bezpieczeństwa w firmie na Google Cloud: przegląd ustaleń SCC, audyt ról IAM i kont usług pod kątem nadmiaru, przegląd polityk organizacji (czy guardraile działają), sprawdzenie, czy logi dostępu do danych są włączone tam, gdzie trzeba, analiza Cloud Audit Logs przy podejrzeniu incydentu.

**Po co rynkowi ta kompetencja.** Niższy, ale realny popyt (4,9%) — głównie firmy produktowe i działy danych/ML wybierające GCP. Dla juniora to różnicowanie: mniej kandydatów zna GCP niż AWS/Azure, więc znajomość bywa przewagą w konkretnym wycinku rynku.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6**. **Free tier (darmowy poziom):** wszystkie poziomy wykonalne na **własnym koncie laboratoryjnym** — GCP Free Tier (kredyt startowy + zawsze-darmowe usługi „Always Free"). Klauzula własnego konta w §5/§7.

### L1 — Fundamenty: model odpowiedzialności, hierarchia, czytanie dostępu (3–6 h)

**Zakres:**
- Model współdzielonej odpowiedzialności w wydaniu Google (rdzeń z `aws.md` zastosowany do GCP).
- Założenie własnego projektu laboratoryjnego, MFA na koncie Google, rezygnacja z codziennego użycia konta właściciela (Owner).
- **Zrozumienie hierarchii zasobów** Organizacja → Foldery → Projekty → Zasoby i tego, że uprawnienia dziedziczą się w dół.
- **Czytanie, kto ma dostęp:** odczyt przypisań IAM na projekcie — która tożsamość ma jaką rolę; rozpoznanie zbyt szerokich ról podstawowych (Owner/Editor).
- Włączenie/odczyt Cloud Audit Logs: odczytanie zdarzenia Admin Activity (kto zmienił konfigurację).

**Co student musi UMIEĆ ZROBIĆ:** zabezpieczyć konto (MFA, brak codziennego Owner); narysować hierarchię zasobów i wskazać, jak dziedziczą się uprawnienia; odczytać przypisania IAM projektu i wskazać zbyt szerokie role; odczytać z Cloud Audit Logs konkretne zdarzenie.

**Profesjonalne niuanse:**
- **Role podstawowe (Owner/Editor/Viewer) to wygodna pułapka.** Dają ogromny zakres jednym kliknięciem. Amator nadaje Editor „żeby działało"; zawodowiec używa wąskiej roli predefiniowanej.
- **Dziedziczenie w dół hierarchii zaskakuje.** Rola nadana na folderze spływa na wszystkie projekty pod nim. Bez mapy hierarchii nie widać, kto faktycznie ma dostęp do danego zasobu.

### L2 — Zastosowanie: least privilege, konta usług, polityki organizacji, SCC (8–14 h)

**Zakres:**
- **Najmniejsze uprawnienie w IAM GCP:** zamiana roli podstawowej na predefiniowaną/własną, dokładnie dopasowaną; nadawanie na właściwym węźle hierarchii.
- **Bezpieczeństwo kont usług (service accounts):** ograniczenie uprawnień tożsamości maszynowej, unikanie i rotacja kluczy, świadomość ryzyka wyciekłego klucza.
- **Polityki organizacji (Organization Policies) jako guardraile:** wymuszenie ograniczenia na cały pień (np. zakaz publicznego dostępu, zakaz kluczy konta usługi) — zapobieganie, nie tylko wykrywanie.
- **Security Command Center:** włączenie, odczyt ustaleń, triage co najmniej jednego (priorytet, czy realne).
- **Wykrywanie błędnych konfiguracji:** typowe błędy GCP (publiczny zasobnik Cloud Storage, zbyt szeroka reguła zapory, nadmiarowe konto usługi, wyłączone logi dostępu do danych) i ich naprawa.

**Co student musi UMIEĆ ZROBIĆ:** zastąpić rolę podstawową wąską i wykazać odebranie nadmiaru; ograniczyć uprawnienia konta usługi z uzasadnieniem; ustawić politykę organizacji blokującą niebezpieczne działanie; przejść audyt typowych błędnych konfiguracji i je naprawić; przeprowadzić triage ustalenia SCC.

**Profesjonalne niuanse:**
- **Klucz konta usługi to trwały klucz — najgorszy rodzaj sekretu.** Wyciekły klucz konta usługi z szerokimi uprawnieniami to przejęcie środowiska. Zawodowiec unika kluczy (woli tożsamość bez klucza) i rotuje to, co musi istnieć — analogia do „role > trwałe klucze" z rdzenia AWS (#9).
- **Polityka organizacji bije naprawę pojedynczego projektu.** Guardrail na pniu organizacji *uniemożliwia* błąd we wszystkich projektach naraz — to dźwignia, której nie ma na poziomie pojedynczego zasobu (różnica skali wobec AWS guardraili).

### L3 — Portfolio: CSPM, CIS, korelacja Audit Logs, mapa luk (18–30 h)

**Zakres:**
- **Pełna ocena postawy (CSPM):** SCC lub skaner otwartoźródłowy (ScoutSuite/Prowler — §7) na całym projekcie/organizacji; lista ustaleń z priorytetami.
- **Mapowanie na CIS Google Cloud Platform Foundations Benchmark** (punkt odniesienia — §7): raport zgodności/odchyleń.
- **Mapowanie na MITRE ATT&CK for Cloud** (macierz technik napastników w chmurze — §7): przypisanie ryzyk, nazwanie luk pokrycia (blind spots).
- **Korelacja Cloud Audit Logs:** wykrycie skorelowanego ciągu podejrzanych zdarzeń (np. nadanie roli → utworzenie klucza konta usługi → dostęp do danych) — łączenie z liściem `SIEM`; świadomość, że bez włączonych logów Data Access ten ciąg jest niewidoczny.
- **Raport postawy bezpieczeństwa** dla decydenta z priorytetyzacją koszt–ryzyko.

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić CSPM projektu/organizacji, zmapować ustalenia na CIS GCP i MITRE ATT&CK, nazwać luki; wykryć w Cloud Audit Logs skorelowany ciąg podejrzanych zdarzeń; oddać raport postawy z priorytetyzacją. Poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Wyłączone logi Data Access to najczęstsza luka pokrycia w GCP.** Admin Activity widać zawsze, ale „kto czytał dane" trzeba świadomie włączyć — i to kosztuje (ekonomia logów). Zawodowiec wie, gdzie włączyć Data Access (zasoby z danymi wrażliwymi), a gdzie nie warto. To wprost martwe pole (blind spot) z rdzenia.
- **Hierarchia ułatwia audyt — i ukrywa dziedziczone uprawnienia.** Silne drzewo GCP daje porządek, ale uprawnienie odziedziczone z folderu/organizacji łatwo przeoczyć, patrząc tylko na projekt. Zawodowiec audytuje *efektywne* uprawnienie (z dziedziczeniem), nie tylko nadane lokalnie.

### L4 — Realny przypadek profesjonalny (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 projektowana **osobno przez Ethana/Leo**. Research tu tylko **zapowiada zakres**.

**Zakres L4:** przyjęcie zaniedbanej organizacji GCP (role podstawowe wszędzie, nadmiarowe konta usług z kluczami, wyłączone logi Data Access, brak polityk organizacji) i doprowadzenie do bezpiecznego stanu bez przerywania działających usług; scenariusz branżowy. **Benchmark** wobec wyniku profesjonalisty.

### L5 — Biegłość: architektura organizacji i ekonomia (ZAPOWIEDŹ ZAKRESEM)

**Zakres L5:** projekt bezpiecznej hierarchii zasobów od zera (organizacja, foldery, polityki organizacji jako guardraile, centralne logowanie), strategia tożsamości bez kluczy (workload identity — tożsamość obciążeń bez trwałych sekretów), bezpieczeństwo jako kod, ekonomia logów i SCC. **Benchmark** wobec architekta bezpieczeństwa chmury.

---

## 4. Profesjonalne niuanse — sedno North Star

Niuanse **[RDZEŃ]** są wspólne dla grupy (pełny opis w `aws.md` §4 — tu tylko nazwane); **[GCP]** to specyfika Google.

1. **[RDZEŃ] Model współdzielonej odpowiedzialności** (`aws.md` §4 pkt 1).
2. **[RDZEŃ] Błędna konfiguracja > wyrafinowany atak** (`aws.md` §4 pkt 2).
3. **[RDZEŃ] Tożsamość to obwód** (`aws.md` §4 pkt 3).
4. **[RDZEŃ] Najmniejsze uprawnienie i pełzanie uprawnień** (`aws.md` §4 pkt 4) — w GCP realizowane przez role na węzłach hierarchii.
5. **[RDZEŃ] CSPM i priorytetyzacja ustaleń** (`aws.md` §4 pkt 5) — narzędzie: Security Command Center.
6. **[RDZEŃ] Zgodność z benchmarkiem to podłoga, nie sufit** (`aws.md` §4 pkt 6).
7. **[GCP] Role podstawowe (Owner/Editor/Viewer) są zbyt szerokie.** Wygodna pułapka — zawodowiec używa ról predefiniowanych/własnych.
8. **[GCP] Hierarchia zasobów dziedziczy uprawnienia w dół.** Rola na folderze spływa na projekty pod nim; audytuj *efektywne* uprawnienie, nie tylko lokalne.
9. **[GCP] Klucze kont usług to najgorszy sekret.** Tożsamość maszynowa z wyciekłym kluczem = przejęcie środowiska; unikaj kluczy, rotuj nieuniknione (rozszerzenie rdzenia #9 „role > klucze").
10. **[GCP] Logi Data Access są domyślnie wyłączone.** Bez nich nie ma dowodu, kto czytał dane — najczęstsza luka pokrycia w GCP. Włącz tam, gdzie są dane wrażliwe (świadomie wobec kosztu).
11. **[GCP] Polityki organizacji to guardrail na cały pień.** Zakaz na poziomie organizacji uniemożliwia błąd we wszystkich projektach naraz — dźwignia większa niż naprawa pojedynczego zasobu.
12. **[RDZEŃ] Wykrywanie vs zapobieganie** — SCC wykrywa; polityki organizacji zapobiegają.
13. **[RDZEŃ] Audyt musi być włączony PRZED incydentem** — w GCP szczególnie dotyczy logów Data Access (pkt 10).
14. **[RDZEŃ] Ekonomia bezpieczeństwa chmury** — logi (zwłaszcza Data Access) i SCC kosztują; „włącz wszystko" rujnuje budżet i topi sygnał (ekonomia zaciągu, research SIEM §9).
15. **[RDZEŃ] Granica etyczno-prawna** — logi bywają danymi osobowymi (TSUE Breyer C-582/14); RODO/NIS2/DORA; praca **wyłącznie na własnym projekcie laboratoryjnym** (art. 267 KK).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty GCP muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu).

**Klauzula darmowego poziomu i własnego konta (twarda):** każdy projekt wykonalny na **GCP Free Tier (kredyt startowy + Always Free)**, **wyłącznie na własnym projekcie laboratoryjnym** studenta. Projekty nie zmuszają do płatnych zasobów; gdzie usługa ma koszt poza darmowym poziomem — wariant otwartoźródłowy (ScoutSuite) lub sprzątanie zasobów po ćwiczeniu (uwaga na koszt logów Data Access — projekt instruuje włączać je punktowo i wyłączać po ćwiczeniu).

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3 | Niuanse z §4 |
|---|---|---|---|---|
| G1 | L1 | **Zabezpieczenie projektu + hierarchia** — MFA, brak codziennego Owner, mapa hierarchii i dziedziczenia | Model odpowiedzialności, hierarchia | #1, #8 |
| G2 | L1 | **Czytanie dostępu IAM** — odczyt przypisań ról, rozpoznanie zbyt szerokich ról podstawowych | Czytanie dostępu | #4, #7 |
| G3 | L1 | **Audyt: Cloud Audit Logs** — odczyt zdarzenia Admin Activity | Audyt, czytanie kto-co-zrobił | #13 |
| G4 | L2 | **Least privilege: rola predefiniowana zamiast podstawowej** — zwężenie z uzasadnieniem | Least privilege w IAM | #4, #7 |
| G5 | L2 | **Bezpieczeństwo kont usług** — ograniczenie uprawnień, unikanie/rotacja kluczy | Konta usług, klucze | #9 |
| G6 | L2 | **Polityka organizacji jako guardrail** — wymuszenie zakazu (np. publiczny zasób) na pniu | Polityki organizacji, zapobieganie | #11, #12 |
| G7 | L2 | **SCC: triage ustalenia + audyt błędnych konfiguracji** — włączenie, naprawa typowych błędów | CSPM, wykrywanie, triage | #2, #5 |
| G8 | L3 | **CSPM + CIS GCP + MITRE ATT&CK** — pełny audyt, mapowanie, mapa luk, priorytetyzacja | CSPM, CIS, ATT&CK, raport | #5, #6, #10 |
| G9 | L3 | **Korelacja Cloud Audit Logs** — wykrycie skorelowanego ciągu (z włączeniem Data Access; powiązanie z SIEM) | Korelacja logów, blind spots | #10, #13, #14 |
| (G10–G12) | L4–L5 | **ZAPOWIEDŹ** — naprawa zaniedbanej organizacji (scenariusz branżowy), bezpieczna hierarchia + tożsamość bez kluczy + ekonomia; z benchmarkiem profesjonalisty | Zakres L4/L5 | #11, #14, #15 |

**Szacowana pula L1–L3: ok. 9 projektów.** L4–L5: 2–3, po rozszerzeniu struktury. Liczba z pokrycia, nie z targetu.

**Łańcuch zależności:** G1→G2→G3 (fundamenty + hierarchia) → G4→G5→G6→G7 (uprawnienia + guardraile + wykrywanie) → G8→G9 (postawa + korelacja). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności

1. **Rdzeń grupy „Cloud Security"** — model współdzielonej odpowiedzialności, błędna konfiguracja, CSPM (ustalony w `aws.md` §2). Student opanowuje rdzeń **raz**; ze względu na najniższy popyt GCP zwykle **nie jest pierwszą platformą** — student najczęściej zna już rdzeń z AWS lub Azure i tu dokłada specyfikę Google. Jeśli GCP jest pierwsze — rdzeń budują G1–G3. **Wymagane przed L2.**
2. **Pojęcie tożsamości i dostępu** (liść `IAM`; projekt partii 1 `cyber-iam-active-directory-lab`) — kto się loguje, rola, uprawnienie. **Wymagane przed L2.**
3. **Podstawy sieci i TCP/IP** (liście `Network`, `TCP/IP`) — adres IP, port, reguła zapory w chmurze. **Wymagane przed L2.**
4. **Podstawy systemu operacyjnego (Linux)** — chmura uruchamia głównie Linuksa; bazę buduje `cyber-hardening-linux-bash` (partia 1). **Równoległe na L1–L2.**
5. **Podstawy `SIEM`** — Cloud Audit Logs to źródło dla SIEM; korelacja (G9) opiera się na warsztacie z researchu SIEM. **Wymagane przed L3 (projekt G9).**
6. **Klauzula etyczno-prawna i klauzula darmowego poziomu** — własny projekt laboratoryjny, art. 267 KK, GCP Free Tier. **Wymagane od L1.**

**Czego GCP dostarcza dalej:** Cloud Audit Logs/SCC zasilają `SIEM`/`SOC`; postawa organizacji wiąże się z `DevSecOps`, `Risk Management`, `ISO 27001`, `NIST`. Rdzeń grupy współdzielony z `aws.md` i `azure.md`.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

**Dokumentacja producenta (oficjalna, darmowa):**
- Google Cloud — model współdzielonej odpowiedzialności (shared responsibility): https://cloud.google.com/architecture/framework/security/shared-responsibility-shared-fate
- Google Cloud IAM — przegląd (tożsamość i dostęp): https://cloud.google.com/iam/docs/overview
- Google Cloud — hierarchia zasobów (Organizacja/Foldery/Projekty): https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy
- Google Cloud — polityki organizacji (Organization Policy Service): https://cloud.google.com/resource-manager/docs/organization-policy/overview
- Google Cloud — konta usług (service accounts), najlepsze praktyki: https://cloud.google.com/iam/docs/best-practices-service-accounts
- Security Command Center (CSPM): https://cloud.google.com/security-command-center/docs
- Cloud Audit Logs (typy logów, Data Access): https://cloud.google.com/logging/docs/audit
- Google Cloud — darmowy poziom (Free Tier / Always Free): https://cloud.google.com/free

**Standardy i benchmarki:**
- CIS Google Cloud Platform Foundations Benchmark: https://www.cisecurity.org/benchmark/google_cloud_computing_platform
- MITRE ATT&CK for Cloud (techniki w chmurze, w tym IaaS): https://attack.mitre.org/matrices/enterprise/cloud/
- NIST Cybersecurity Framework 2.0: https://www.nist.gov/cyberframework

**Narzędzia otwartoźródłowe do oceny postawy (darmowe):**
- ScoutSuite — audyt postawy wielu chmur (w tym GCP): https://github.com/nccgroup/ScoutSuite
- Prowler — audyt bezpieczeństwa wielu chmur (w tym GCP): https://github.com/prowler-cloud/prowler

**Kontekst prawny EU/PL:**
- TSUE Breyer C-582/14 (adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- NIS2: https://eur-lex.europa.eu/eli/dir/2022/2555
- DORA: https://eur-lex.europa.eu/eli/reg/2022/2554

> **Do uwagi Ryana:** materiały oficjalne/otwarte; brak źródeł pirackich. GCP Free Tier (kredyt startowy + Always Free) pozwala wykonać projekty bez płatności — z jednym zastrzeżeniem: **logi Data Access generują koszt** poza darmowym poziomem, więc projekty instruują włączać je punktowo i wyłączać po ćwiczeniu (klauzula kosztu w §5). Skanery (ScoutSuite/Prowler) działają **wyłącznie na własnym projekcie** studenta (art. 267 KK). Logi mogą zawierać dane osobowe — klauzula maskowania jak w partii 1.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

CISO firmy produktowej na Google Cloud. Pięć słabości pierwszej wersji i poprawki:

1. **Słabość: research powielał teorię chmury i nie uzasadniał, po co GCP przy najniższym popycie.** CISO: „skoro to trzecia chmura, powiedz uczciwie, dla kogo jest". **Poprawka:** §1 wprost stawia GCP jako wybór dla studenta celującego w konkretne firmy (produktowe/dane/ML), z pełnym oparciem na rdzeniu i koncentracją na różnicach — bez powtarzania teorii (oznaczenia [RDZEŃ] vs [GCP]).
2. **Słabość: pominięte konta usług.** CISO: „w GCP to wyciekłe klucze kont usług są moim najczęstszym incydentem, nie publiczne zasobniki". **Poprawka:** dodałam niuans #9 i osobny projekt L2 (G5) o kontach usług i kluczach, jako rozszerzenie rdzeniowego „role > klucze".
3. **Słabość: logi Data Access potraktowane jak detal.** CISO: „junior, który nie włączył Data Access, nie udowodni mi, kto wykradł dane — i nie wie, że to kosztuje". **Poprawka:** niuans #10 (najczęstsza luka pokrycia GCP) + #14 (koszt) + projekt G9 z włączaniem Data Access; klauzula kosztu logów w §5/§7.
4. **Słabość: hierarchia zasobów pokazana jako udogodnienie, nie ryzyko.** CISO: „dziedziczone uprawnienie z folderu to dokładnie to, co audytorzy przeoczają". **Poprawka:** niuans #8 — audytuj *efektywne* uprawnienie z dziedziczeniem, nie tylko lokalne; #11 — polityki organizacji jako dźwignia guardraili.
5. **Słabość: ryzyko płatnych zasobów (zwłaszcza logi).** **Poprawka:** klauzula darmowego poziomu z konkretnym zastrzeżeniem o koszcie Data Access (włączać punktowo, wyłączać po ćwiczeniu) + wariant otwartoźródłowy ScoutSuite.

**Sprawdzenie tłumaczenia żargonu (sekcja 3 CLAUDE.md):** każdy termin rozwinięty przy pierwszym użyciu (GCP, IAM, rola podstawowa/predefiniowana, hierarchia zasobów, foldery, projekty, polityki organizacji, guardrail, konto usługi, Security Command Center, Cloud Audit Logs, Admin Activity, Data Access, workload identity, MFA, CSPM, CIS Benchmark, MITRE ATT&CK, blind spot, Free Tier, Always Free, CISO, NIS2, DORA). Polskie nazwy, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test pracodawcy EU (firma na GCP) — spełniony po 9 projektach L1–L3 z niuansami #1–#13; pełna „zawodowość" (architektura organizacji, tożsamość bez kluczy, ekonomia) domyka się na L4/L5 (zależność od Ethana/Leo). Uczciwie oznaczone.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
