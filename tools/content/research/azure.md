# Research kompetencji: Azure

> **Status:** research liścia ścieżki Cybersecurity Specialist (ETAP E3), wg wzorca `tools/content/research/siem.md`. **Nadbudowuje na rdzeniu grupy** ustalonym w `tools/content/research/aws.md` (model współdzielonej odpowiedzialności, błędna konfiguracja, CSPM, tożsamość jako obwód) — tu nie powtarzamy teorii trzeci raz, tylko **wskazujemy różnice platformy Microsoftu**.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny.
> **Soczewka (twarda):** uczymy **bezpieczeństwa** chmury Microsoftu (tożsamość, role, błędne konfiguracje, wycieki, monitoring) — **nie** budowania aplikacji na Azure.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Azure` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Cloud Security" (`unionShare` grupy: **13,5%**) |
| **Popyt liścia (`demandPercentage`)** | **8,4%** ofert ścieżki wymienia Azure |
| **Liczba ofert (`offers`)** | **31** |
| **`kind`** | `tool` (platforma — w soczewce bezpieczeństwa, §2) |
| **`lift`** | 1,11 (najwyższy w grupie — najsilniejsze powiązanie ze ścieżką cyber) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security |

**Pozycja w grupie:**

| Liść grupy | demand % | oferty | lift | kind |
|---|---|---|---|---|
| AWS (`aws.md`, rdzeń) | 9,2 | 34 | 1,04 | tool |
| **Azure** (ten plik) | 8,4 | 31 | 1,11 | tool |
| GCP (`gcp.md`) | 4,9 | 18 | 0,96 | tool |

**Wniosek dla autoringu:** Azure ma drugi popyt w grupie (8,4%), ale **najwyższy `lift` (1,11)** — czyli najmocniej „przyciąga się" do ścieżki cyber spośród trzech chmur. Powód jest rynkowy: **polskie korporacje stoją na Microsofcie** (Microsoft 365, Active Directory, Windows), więc bezpieczeństwo Azure i tożsamości Microsoftu to dla wielu firm domyślna chmura bezpieczeństwa. Dla juniora w PL Azure bywa praktyczniejszym pierwszym wyborem niż AWS, mimo niższego surowego popytu. **Rdzeń teorii (model odpowiedzialności, błędna konfiguracja, CSPM) student opanowuje raz** — tu skupiamy się na tym, co w Microsofcie jest *inne*.

---

## 2. Definicja kompetencji i jej rola w pracy

**Azure (Microsoft Azure — chmura obliczeniowa Microsoftu)** w soczewce bezpieczeństwa to **panowanie nad tożsamością, dostępem i konfiguracją w ekosystemie Microsoftu** — tym samym, w którym polskie firmy mają już pocztę, dokumenty i katalog użytkowników.

**Rdzeń wspólny (ustalony w `aws.md` §2 — tu w skrócie, bez powtarzania teorii):** model współdzielonej odpowiedzialności (większość wycieków = wina konfiguracji klienta, nie dostawcy), błędna konfiguracja jako główny wektor, tożsamość jako obwód, CSPM (ocena postawy bezpieczeństwa chmury). Jeśli student nie zna tego rdzenia — robi go najpierw na jednej platformie (§6).

**Soczewka konkretnie dla Azure (czym ten plik różni się od AWS i GCP):**

- **Entra ID — tożsamość Microsoftu (dawniej Azure Active Directory).** To **serce** bezpieczeństwa Azure i kluczowa różnica wobec AWS. Entra ID zarządza tożsamością nie tylko w chmurze Azure, ale w **całym Microsoft 365** (poczta, Teams, dokumenty). Pojęcia: użytkownicy i grupy, **dostęp warunkowy (Conditional Access — reguła „kto, skąd, na jakim urządzeniu może się zalogować")**, uwierzytelnianie wieloskładnikowe (MFA), tożsamości uprzywilejowane.
- **Role RBAC (Role-Based Access Control — kontrola dostępu oparta na rolach).** Azure nadaje uprawnienia przez **przypisanie roli do zakresu** (subskrypcja / grupa zasobów / pojedynczy zasób). To inny model niż polityki JSON w AWS — student musi rozumieć **dziedziczenie uprawnień w hierarchii zakresów** (uprawnienie nadane wyżej spływa w dół) i różnicę między rolami wbudowanymi a własnymi.
- **Microsoft Defender for Cloud — natywny CSPM + ochrona obciążeń.** Skanuje subskrypcje pod kątem błędnych konfiguracji, wystawia **Secure Score (wskaźnik postawy bezpieczeństwa — jedna liczba mówiąca, jak dobrze skonfigurowane jest środowisko)** i podpowiada naprawy. To odpowiednik Security Hub z AWS, ale z mocniej wbudowanym wskaźnikiem postawy.
- **Microsoft Sentinel — SIEM w chmurze.** Tu domyka się powiązanie z liściem `SIEM`: Sentinel to natywny system zbierania i korelowania zdarzeń (SIEM) działający w chmurze, używający języka zapytań **KQL (Kusto Query Language)** — tego samego, który student poznał w researchu SIEM. Sentinel zbiera logi z Entra ID, Microsoft 365, Defender i zasobów Azure w jedno miejsce.
- **Typowe błędy w polskich firmach na Microsoft 365.** To realna soczewka rynkowa: konta bez MFA, nadmiarowi administratorzy globalni, brak dostępu warunkowego, publiczne udostępnienia w SharePoint/OneDrive, „stare" konta byłych pracowników z aktywnym dostępem. Junior, który umie zrobić przegląd higieny tożsamości w M365, jest od razu użyteczny.

**Kto tego używa i jak wygląda dzień pracy.** Inżynier/analityk bezpieczeństwa w firmie na Microsofcie: przegląd Secure Score w Defender for Cloud, triage incydentów w Sentinel (KQL), audyt ról RBAC i administratorów Entra ID pod kątem nadmiaru, sprawdzenie reguł dostępu warunkowego, przegląd udostępnień w M365.

**Po co rynkowi ta kompetencja.** Dominacja Microsoftu w polskich korporacjach + regulacje (NIS2, DORA, RODO) = wysoki, „lepki" popyt. Najwyższy `lift` w grupie to sygnał, że gdy oferta cyber wymienia chmurę, częściej jest to właśnie Azure.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6**. **Free tier (darmowy poziom):** wszystkie poziomy wykonalne na **własnym koncie laboratoryjnym** — darmowe konto Azure (kredyt startowy) + darmowy najemca deweloperski Microsoft 365 (Microsoft 365 Developer tenant). Klauzula własnego konta w §5/§7.

### L1 — Fundamenty: model odpowiedzialności, tożsamość, czytanie dostępu (3–6 h)

**Zakres:**
- Model współdzielonej odpowiedzialności w wydaniu Microsoftu (rdzeń z `aws.md` zastosowany do Azure).
- Założenie własnego najemcy (tenant — odizolowana instancja organizacji w chmurze Microsoftu) i włączenie MFA na koncie administratora.
- **Czytanie tożsamości w Entra ID:** kto jest użytkownikiem, kto administratorem, jakie role są przypisane — odpowiedź na „kto może co".
- **Czytanie dostępu RBAC:** odczytanie, kto ma jaką rolę na jakim zakresie (subskrypcja/grupa zasobów).
- Włączenie dziennika audytu Entra ID i odczytanie zdarzenia logowania.

**Co student musi UMIEĆ ZROBIĆ:** zabezpieczyć konto administratora (MFA); odczytać przypisania ról i administratorów w Entra ID; odczytać przypisanie RBAC na zakresie i wyjaśnić dziedziczenie; znaleźć w logu logowania konkretne zdarzenie.

**Profesjonalne niuanse:**
- **Administrator globalny to klucz do całej firmy, nie tylko do chmury.** W Microsofcie tożsamość Entra ID otwiera też pocztę i dokumenty M365 — nadmiarowy administrator globalny to ryzyko większe niż w AWS. Zawodowiec liczy administratorów globalnych i tnie do minimum.
- **Dziedziczenie RBAC zaskakuje.** Rola nadana na poziomie subskrypcji spływa na *wszystkie* zasoby pod nią. Amator nadaje „dla wygody" wysoko i nieświadomie otwiera całość.

### L2 — Zastosowanie: RBAC least privilege, dostęp warunkowy, Defender for Cloud (8–14 h)

**Zakres:**
- **Najmniejsze uprawnienie w RBAC:** dobór roli i zakresu tak, by dać dokładnie tyle, ile trzeba; rola własna, gdy wbudowana daje za dużo.
- **Dostęp warunkowy (Conditional Access):** reguła wymuszająca MFA / blokująca logowanie z nietypowego kraju lub niezarządzanego urządzenia — zapobieganie, nie tylko wykrywanie.
- **Higiena tożsamości M365:** wyłapanie kont bez MFA, nadmiarowych administratorów, kont byłych pracowników, ryzykownych udostępnień.
- **Defender for Cloud:** włączenie, odczyt Secure Score, interpretacja rekomendacji i triage co najmniej jednego ustalenia (priorytet, czy realne).

**Co student musi UMIEĆ ZROBIĆ:** przypisać rolę RBAC wg least privilege i wykazać odebranie nadmiaru; zbudować regułę dostępu warunkowego wymuszającą MFA; przeprowadzić przegląd higieny tożsamości M365 z listą znalezisk; odczytać Secure Score i przeprowadzić triage rekomendacji Defender for Cloud.

**Profesjonalne niuanse:**
- **Dostęp warunkowy to broń obosieczna.** Źle ułożona reguła zablokuje legalnych użytkowników (np. cały dział w podróży) albo zostawi furtkę (wykluczenia „awaryjne", o których wszyscy zapominają). Zawodowiec testuje reguły w trybie raportowania, zanim je wymusi.
- **Secure Score to wskazówka, nie cel sam w sobie.** Gonienie 100% Secure Score potrafi prowadzić do włączania kontroli, które nie pasują do firmy. Liczba ma służyć priorytetyzacji, nie być fetyszem (analogia do „zgodność ≠ bezpieczeństwo", rdzeń `aws.md` #6).

### L3 — Portfolio: CSPM, CIS, Sentinel jako SIEM, korelacja (18–30 h)

**Zakres:**
- **Pełna ocena postawy (CSPM):** Defender for Cloud lub skaner otwartoźródłowy (ScoutSuite/Prowler — §7) na całej subskrypcji; lista ustaleń z priorytetami.
- **Mapowanie na CIS Microsoft Azure Foundations Benchmark** (punkt odniesienia dobrych praktyk — §7): raport zgodności/odchyleń.
- **Mapowanie na MITRE ATT&CK for Cloud** (macierz technik napastników w chmurze, w tym techniki specyficzne dla tożsamości Microsoftu — §7): przypisanie ryzyk, nazwanie luk pokrycia (blind spots).
- **Sentinel jako SIEM:** podłączenie źródeł (Entra ID, M365, Defender), napisanie reguły detekcji w **KQL** (powiązanie z researchem SIEM — student używa tego samego języka), triage incydentu.
- **Raport postawy bezpieczeństwa** dla decydenta z priorytetyzacją koszt–ryzyko.

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić CSPM subskrypcji, zmapować ustalenia na CIS Azure i MITRE ATT&CK, nazwać luki; napisać regułę detekcji KQL w Sentinel i przeprowadzić triage incydentu; oddać raport postawy z priorytetyzacją. Poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Sentinel rozlicza się od ilości danych — jak każdy SIEM.** Podłączenie wszystkich logów M365 i Azure „bo można" generuje rachunek i szum. To dokładnie ekonomia zaciągu z researchu SIEM (§9 SIEM) i niuans #12 z rdzenia `aws.md`. Zawodowiec wybiera, co warto zbierać.
- **Tożsamość hybrydowa to ulubione pole napastnika.** Wiele polskich firm łączy lokalny Active Directory z Entra ID (synchronizacja). Ten most bywa najsłabszym ogniwem — atak na lokalny AD przenosi się do chmury. Zawodowiec rozumie ryzyko synchronizacji tożsamości.

### L4 — Realny przypadek profesjonalny (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 projektowana **osobno przez Ethana/Leo**. Research tu tylko **zapowiada zakres**.

**Zakres L4:** przyjęcie zaniedbanego najemcy M365/Azure (nadmiarowi administratorzy, konta bez MFA, brak dostępu warunkowego, ryzykowne udostępnienia) i doprowadzenie do bezpiecznego stanu bez blokowania legalnej pracy; scenariusz branżowy (np. wyłudzenie dostępu w firmie finansowej pod kątem DORA). **Benchmark** wobec wyniku profesjonalisty.

### L5 — Biegłość: architektura tożsamości i ekonomia (ZAPOWIEDŹ ZAKRESEM)

**Zakres L5:** architektura zarządzania wieloma subskrypcjami (hierarchia grup zarządzania + polityki Azure jako guardraile), strategia tożsamości hybrydowej i uprzywilejowanej (PIM — Privileged Identity Management, dostęp uprzywilejowany na żądanie), bezpieczeństwo jako kod (polityki w repozytorium), ekonomia Sentinel/Defender. **Benchmark** wobec architekta bezpieczeństwa.

---

## 4. Profesjonalne niuanse — sedno North Star

Niuanse **[RDZEŃ]** są wspólne dla grupy (pełny opis w `aws.md` §4 — tu tylko nazwane, by nie powielać); **[AZURE]** to specyfika Microsoftu.

1. **[RDZEŃ] Model współdzielonej odpowiedzialności** — granica wina-klienta vs wina-dostawcy (`aws.md` §4 pkt 1).
2. **[RDZEŃ] Błędna konfiguracja > wyrafinowany atak** (`aws.md` §4 pkt 2).
3. **[RDZEŃ] Tożsamość to obwód** — w Microsofcie szczególnie dosłownie, bo Entra ID otwiera też M365.
4. **[RDZEŃ] Najmniejsze uprawnienie i pełzanie uprawnień** (`aws.md` §4 pkt 4) — w Azure realizowane przez RBAC + zakresy.
5. **[RDZEŃ] CSPM i priorytetyzacja ustaleń** (`aws.md` §4 pkt 5) — narzędzie: Defender for Cloud + Secure Score.
6. **[RDZEŃ] Zgodność z benchmarkiem to podłoga, nie sufit** — dotyczy też Secure Score: liczba służy priorytetyzacji, nie jest celem.
7. **[AZURE] Administrator globalny = klucz do całej firmy.** Tożsamość Entra ID otwiera chmurę i M365 naraz — nadmiarowy administrator globalny to większe ryzyko niż w AWS. Tnij do minimum.
8. **[AZURE] Dziedziczenie RBAC w hierarchii zakresów.** Rola nadana na subskrypcji spływa na wszystkie zasoby pod nią. Nadawaj jak najniżej w hierarchii.
9. **[AZURE] Dostęp warunkowy testuj przed wymuszeniem.** Źle ułożona reguła blokuje legalnych albo zostawia furtkę przez wykluczenia awaryjne. Tryb raportowania najpierw.
10. **[AZURE] Tożsamość hybrydowa to most i ryzyko.** Synchronizacja lokalnego AD z Entra ID przenosi atak z lokalu do chmury. Najsłabsze ogniwo wielu polskich firm.
11. **[RDZEŃ] Wykrywanie vs zapobieganie** — Defender/Sentinel wykrywają; dostęp warunkowy i polityki Azure zapobiegają.
12. **[RDZEŃ] Audyt musi być włączony PRZED incydentem** — bez logów Entra ID/Sentinel nie ma dochodzenia.
13. **[RDZEŃ] Ekonomia bezpieczeństwa chmury** — Sentinel rozlicza się od ilości danych, jak każdy SIEM (ekonomia zaciągu, research SIEM §9).
14. **[RDZEŃ] Granica etyczno-prawna** — logi bywają danymi osobowymi (TSUE Breyer C-582/14); RODO/NIS2/DORA; praca **wyłącznie na własnym najemcy laboratoryjnym** (art. 267 KK).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Azure muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu).

**Klauzula darmowego poziomu i własnego konta (twarda):** każdy projekt wykonalny na **darmowym koncie Azure + darmowym najemcy deweloperskim Microsoft 365**, **wyłącznie na własnym koncie laboratoryjnym** studenta. Projekty nie zmuszają do płatnych zasobów; gdzie usługa ma koszt poza darmowym poziomem — wariant otwartoźródłowy (ScoutSuite) lub sprzątanie zasobów po ćwiczeniu.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3 | Niuanse z §4 |
|---|---|---|---|---|
| Z1 | L1 | **Zabezpieczenie najemcy** — MFA na adminie, model odpowiedzialności, policzenie administratorów globalnych | Model odpowiedzialności, tożsamość, MFA | #1, #7 |
| Z2 | L1 | **Czytanie dostępu: Entra ID + RBAC** — odczyt ról i przypisań, wyjaśnienie dziedziczenia zakresów | Czytanie tożsamości i RBAC | #3, #8 |
| Z3 | L1 | **Audyt logowań** — włączenie dziennika Entra ID, odczyt zdarzenia logowania | Audyt tożsamości | #12 |
| Z4 | L2 | **RBAC least privilege** — przypisanie roli na właściwym zakresie, odebranie nadmiaru | Least privilege w RBAC | #4, #8 |
| Z5 | L2 | **Dostęp warunkowy** — reguła wymuszająca MFA, test w trybie raportowania | Conditional Access, zapobieganie | #9, #11 |
| Z6 | L2 | **Higiena tożsamości M365 + Secure Score** — przegląd kont/udostępnień, triage rekomendacji Defender | Higiena M365, CSPM, triage | #2, #5, #6 |
| Z7 | L3 | **CSPM subskrypcji + CIS Azure** — pełny audyt, mapowanie na CIS, priorytetyzacja | CSPM, benchmark CIS, raport | #5, #6, #13 |
| Z8 | L3 | **MITRE ATT&CK + mapa luk** — przypisanie ryzyk do technik, blind spots | Mapowanie ATT&CK, pokrycie | #2, #5 |
| Z9 | L3 | **Sentinel jako SIEM** — podłączenie źródeł, reguła detekcji KQL, triage incydentu (powiązanie z SIEM) | Sentinel/KQL, korelacja | #11, #13 |
| (Z10–Z12) | L4–L5 | **ZAPOWIEDŹ** — naprawa zaniedbanego najemcy (scenariusz branżowy), architektura tożsamości + PIM + ekonomia; z benchmarkiem profesjonalisty | Zakres L4/L5 | #10, #13, #14 |

**Szacowana pula L1–L3: ok. 9 projektów.** L4–L5: 2–3, po rozszerzeniu struktury. Liczba z pokrycia, nie z targetu.

**Łańcuch zależności:** Z1→Z2→Z3 (fundamenty tożsamości) → Z4→Z5→Z6 (uprawnienia + higiena) → Z7→Z8→Z9 (postawa + SIEM). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności

1. **Rdzeń grupy „Cloud Security"** — model współdzielonej odpowiedzialności, błędna konfiguracja, CSPM (ustalony w `aws.md` §2). Student opanowuje rdzeń **raz**, na jednej platformie. **Wymagane przed L2 Azure**, jeśli zaczyna od Azure — wtedy rdzeń budują projekty Z1–Z3.
2. **Pojęcie tożsamości i dostępu** (liść `IAM`; projekt partii 1 `cyber-iam-active-directory-lab`) — szczególnie ważne dla Azure, bo Entra ID to bezpośrednia kontynuacja Active Directory. **Wymagane przed L1.**
3. **Active Directory** (liść w grupie IAM) — lokalny AD to fundament tożsamości hybrydowej; bez niego niuans #10 jest niejasny. **Wymagane/równoległe na L2–L3.**
4. **Podstawy sieci i TCP/IP** (liście `Network`, `TCP/IP`) — adres IP, kraj logowania (dla dostępu warunkowego), port. **Wymagane przed L2.**
5. **Podstawy `SIEM`** — Sentinel to SIEM; KQL student poznaje w researchu SIEM. **Wymagane przed L3 (projekt Z9).**
6. **Klauzula etyczno-prawna i klauzula darmowego poziomu** — własny najemca laboratoryjny, art. 267 KK, darmowe konto Azure + M365 Developer. **Wymagane od L1.**

**Czego Azure dostarcza dalej:** logi Entra ID/Defender/Sentinel zasilają `SIEM`/`SOC`; postawa subskrypcji wiąże się z `DevSecOps`, `Risk Management`, `ISO 27001`, `NIST`. Rdzeń grupy jest współdzielony z `aws.md` i `gcp.md`.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

**Dokumentacja producenta (oficjalna, darmowa):**
- Microsoft — model współdzielonej odpowiedzialności w chmurze: https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility
- Microsoft Entra ID — tożsamość (dokumentacja): https://learn.microsoft.com/en-us/entra/identity/
- Microsoft Entra — dostęp warunkowy (Conditional Access): https://learn.microsoft.com/en-us/entra/identity/conditional-access/
- Azure RBAC — kontrola dostępu oparta na rolach: https://learn.microsoft.com/en-us/azure/role-based-access-control/overview
- Microsoft Defender for Cloud (CSPM + Secure Score): https://learn.microsoft.com/en-us/azure/defender-for-cloud/
- Microsoft Sentinel — SIEM w chmurze: https://learn.microsoft.com/en-us/azure/sentinel/
- KQL — język zapytań Kusto (Sentinel): https://learn.microsoft.com/en-us/kusto/query/
- Microsoft 365 Developer Program — darmowy najemca deweloperski: https://developer.microsoft.com/en-us/microsoft-365/dev-program
- Azure — darmowe konto (kredyt startowy): https://azure.microsoft.com/en-us/free/

**Standardy i benchmarki:**
- CIS Microsoft Azure Foundations Benchmark: https://www.cisecurity.org/benchmark/azure
- MITRE ATT&CK for Cloud (Azure AD / Office 365 w macierzy): https://attack.mitre.org/matrices/enterprise/cloud/
- NIST Cybersecurity Framework 2.0: https://www.nist.gov/cyberframework

**Narzędzia otwartoźródłowe do oceny postawy (darmowe):**
- ScoutSuite — audyt postawy wielu chmur (w tym Azure): https://github.com/nccgroup/ScoutSuite
- Prowler — audyt bezpieczeństwa wielu chmur (w tym Azure): https://github.com/prowler-cloud/prowler

**Kontekst prawny EU/PL:**
- TSUE Breyer C-582/14 (adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- NIS2: https://eur-lex.europa.eu/eli/dir/2022/2555
- DORA: https://eur-lex.europa.eu/eli/reg/2022/2554

> **Do uwagi Ryana:** materiały oficjalne/otwarte; brak źródeł pirackich. Darmowy najemca M365 Developer i darmowe konto Azure pozwalają wykonać wszystkie projekty bez płatności. Skanery (ScoutSuite/Prowler) działają **wyłącznie na własnym najemcy** studenta (art. 267 KK). Logi M365 mogą zawierać dane osobowe — klauzula maskowania jak w partii 1.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

CISO firmy na Microsofcie (typowa polska korporacja). Pięć słabości pierwszej wersji i poprawki:

1. **Słabość: research powtarzał teorię chmury z AWS.** CISO: „nie płacę za to, żeby student trzy razy czytał o modelu odpowiedzialności". **Poprawka:** wyraźnie nadbudowałam na rdzeniu `aws.md` (oznaczenia [RDZEŃ] vs [AZURE]); §2 i §4 skupiają się na tym, co w Microsofcie *inne* — Entra ID, RBAC, dostęp warunkowy, tożsamość hybrydowa.
2. **Słabość: pominięta tożsamość hybrydowa.** CISO: „połowa polskich firm ma synchronizację lokalnego AD z chmurą — to mój największy ból, a research milczał". **Poprawka:** dodałam niuans #10 (most lokalny AD ↔ Entra ID jako wektor) i prerekwizyt Active Directory (§6 pkt 3).
3. **Słabość: dostęp warunkowy podany jak włącznik.** CISO: „junior, który wymusi złą regułę, zablokuje mi cały dział handlowy w podróży". **Poprawka:** niuans #9 — testowanie w trybie raportowania przed wymuszeniem; projekt Z5 to ujmuje.
4. **Słabość: Sentinel oderwany od SIEM.** CISO: „skoro uczycie KQL w SIEM, czemu Sentinel zaczyna od zera?". **Poprawka:** powiązałam Z9/L3 z researchem SIEM (ten sam KQL, prerekwizyt §6 pkt 5) i dodałam ekonomię Sentinel (#13) jako kontynuację ekonomii zaciągu.
5. **Słabość: ryzyko płatnych zasobów.** **Poprawka:** klauzula darmowego poziomu (darmowe konto Azure + M365 Developer) w §5/§6/§7, z wariantem otwartoźródłowym tam, gdzie usługa ma koszt.

**Sprawdzenie tłumaczenia żargonu (sekcja 3 CLAUDE.md):** każdy termin rozwinięty przy pierwszym użyciu (Azure, Entra ID, RBAC, MFA, dostęp warunkowy, Secure Score, Defender for Cloud, Sentinel, KQL, tenant/najemca, PIM, tożsamość hybrydowa, Microsoft 365, CSPM, CIS Benchmark, MITRE ATT&CK, blind spot, CISO, NIS2, DORA). Polskie nazwy, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test pracodawcy EU — spełniony po 9 projektach L1–L3 z niuansami #1–#12; pełna „zawodowość" (architektura tożsamości, ekonomia, skala) domyka się na L4/L5 (zależność od Ethana/Leo). Uczciwie oznaczone.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
