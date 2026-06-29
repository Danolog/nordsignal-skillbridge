# Research kompetencji: AWS

> **Status:** research liścia ścieżki Cybersecurity Specialist (ETAP E3), wg wzorca `tools/content/research/siem.md`. **Plik rdzeniowy grupy „Cloud Security"** — ustala wspólny rdzeń teorii chmury (model współdzielonej odpowiedzialności, CSPM, błędne konfiguracje), na którym nadbudowują researche `azure.md` i `gcp.md`.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny nad całym tym plikiem.
> **Soczewka (twarda):** uczymy **bezpieczeństwa** chmury (kto ma dostęp, jakie uprawnienia, błędne konfiguracje, wycieki) — **nie** tworzenia aplikacji w chmurze. To nie kurs AWS dla deweloperów; to kurs obrony konta AWS dla analityka/inżyniera bezpieczeństwa.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `AWS` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Cloud Security" (`unionShare` grupy: **13,5%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **9,2%** ofert ścieżki wymienia AWS |
| **Liczba ofert (`offers`)** | **34** |
| **`kind`** | `tool` (konkretna platforma — ale w soczewce bezpieczeństwa, patrz §2) |
| **`lift`** | 1,04 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | lift | kind |
|---|---|---|---|---|
| **AWS** (ten plik) | 9,2 | 34 | 1,04 | tool |
| Azure (`azure.md`) | 8,4 | 31 | 1,11 | tool |
| GCP (`gcp.md`) | 4,9 | 18 | 0,96 | tool |

**Wniosek dla autoringu:** AWS ma najwyższy popyt w grupie (9,2%) i jest najdojrzalszą, najszerzej udokumentowaną platformą — dlatego to **plik rdzeniowy grupy**. Wspólny rdzeń teorii (model współdzielonej odpowiedzialności, błędne konfiguracje, CSPM, tożsamość w chmurze) ustalamy tutaj w pełni; Azure i GCP nadbudowują i wskazują różnice, zamiast trzy razy powtarzać tę samą teorię. Grupa „uczy przynajmniej jednej z trzech platform" (opis grupy w modelu) — student wybiera jedną, ale rdzeń jest wspólny i przenośny.

---

## 2. Definicja kompetencji i jej rola w pracy

**AWS (Amazon Web Services — chmura obliczeniowa Amazona)** w soczewce bezpieczeństwa to nie „jak postawić serwer", tylko **jak zapanować nad tym, kto ma dostęp do zasobów firmy w chmurze, jakie ma uprawnienia i czy nic nie wycieka przez źle ustawioną konfigurację**. Opis grupy w modelu mówi wprost: *„źle ustawiona chmura to dziś jedna z najczęstszych przyczyn wycieków"* — i to jest cała teza tego liścia.

**Wspólny rdzeń grupy (ustalony tutaj, używany też przez Azure i GCP):**

1. **Model współdzielonej odpowiedzialności (shared responsibility model).** Dostawca chmury odpowiada za bezpieczeństwo *samej chmury* (sprzęt, fizyczne centra danych, hipervisor). Klient odpowiada za bezpieczeństwo *w chmurze* (kto ma dostęp, jak ustawione uprawnienia, czy dane są zaszyfrowane, czy kubełek nie jest publiczny). **Większość wycieków to wina klienta, nie dostawcy** — zła konfiguracja po stronie, za którą odpowiada firma. Zrozumienie tej granicy to pierwsza rzecz, którą weryfikuje rozmowa o pracę.

2. **Błędna konfiguracja (misconfiguration) jako główny wektor.** Nie spektakularne włamanie, tylko zostawione otwarte drzwi: publiczny zasobnik z danymi, konto z nadmiarowymi uprawnieniami, wyłączony zapis logów, klucz dostępu w publicznym repozytorium kodu. Raporty branżowe od lat pokazują błędną konfigurację chmury jako jedną z czołowych przyczyn naruszeń.

3. **Tożsamość to nowy obwód (identity is the new perimeter).** W chmurze nie ma muru wokół serwerowni — granicą bezpieczeństwa jest **tożsamość i uprawnienie**. Kto się uwierzytelnił i co wolno mu zrobić zastępuje dawną zaporę na brzegu sieci.

4. **CSPM — ocena postawy bezpieczeństwa chmury (Cloud Security Posture Management).** Klasa narzędzi (i dyscyplina), która **automatycznie skanuje konto w poszukiwaniu błędnych konfiguracji** i porównuje stan z punktem odniesienia dobrych praktyk (np. CIS Benchmark — patrz §7). To rdzeń pracy inżyniera bezpieczeństwa chmury.

**Soczewka konkretnie dla AWS (czym ten plik różni się od Azure/GCP):**

- **IAM w AWS (Identity and Access Management — zarządzanie tożsamością i dostępem).** Model AWS opiera się na **politykach (policies)** — dokumentach mówiących „kto, co, na jakim zasobie, pod jakim warunkiem". Kluczowe pojęcia: **role IAM** (tożsamość przyjmowana tymczasowo, zamiast trwałych kluczy), **polityka oparta na tożsamości vs na zasobie**, **konto root** (najwyższe konto — nigdy do codziennej pracy). Tu mieszka większość błędów uprawnień.
- **S3 i publiczne zasobniki (buckets).** S3 (Simple Storage Service — magazyn plików w AWS) to historycznie najczęstsze źródło głośnych wycieków — **publiczny zasobnik** z danymi klientów wystawiony na cały internet. Student musi umieć rozpoznać i zamknąć publiczny dostęp (Block Public Access), zrozumieć politykę zasobnika i listę kontroli dostępu (ACL).
- **CloudTrail — dziennik audytu (audit log).** Zapis *kto co zrobił* w koncie AWS (każde wywołanie API). Bez CloudTrail nie ma dochodzenia — to źródło prawdy o działaniach w koncie i kluczowe źródło logów dla SIEM (powiązanie z liściem `SIEM`).
- **GuardDuty — wykrywanie zagrożeń (threat detection).** Natywna usługa, która analizuje logi konta i wykrywa podejrzane wzorce (nietypowe API, znane złośliwe adresy, kopanie kryptowalut na przejętej maszynie). Odpowiednik „SIEM w pudełku" dla samego AWS.
- **Security Hub — agregator postawy bezpieczeństwa.** Zbiera ustalenia z GuardDuty, skanerów konfiguracji i benchmarków CIS w jeden pulpit oceny konta. To natywny CSPM AWS.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja AWS w soczewce bezpieczeństwa to praca **inżyniera bezpieczeństwa chmury (cloud security engineer)** i **analityka SOC obsługującego środowiska chmurowe**. Typowy dzień: przegląd ustaleń Security Hub (które konta/zasoby są źle skonfigurowane), triage alertów GuardDuty (czy to realne zagrożenie, czy szum), przegląd uprawnień IAM pod kątem nadmiaru, sprawdzenie, czy nowy zasobnik S3 nie jest publiczny, analiza CloudTrail przy podejrzeniu incydentu.

**Po co rynkowi ta kompetencja.** Firmy przeniosły dane do chmury, a regulacje (NIS2, DORA, RODO) wymagają udowodnienia kontroli nad dostępem i zdolności wykrywania incydentów — również w chmurze. AWS to najczęstsza platforma w grupie (9,2% ofert), więc to najbezpieczniejszy pierwszy wybór dla juniora.

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić*. **Free tier (darmowy poziom):** wszystkie poziomy wykonalne na **własnym koncie laboratoryjnym** w ramach AWS Free Tier — żaden projekt nie zmusza do płatnego zasobu (klauzula w §5 i §7).

### L1 — Fundamenty: model odpowiedzialności, czytanie dostępu, włączenie audytu (3–6 h)

**Zakres wiedzy/umiejętności:**
- **Model współdzielonej odpowiedzialności** — co należy do AWS, co do klienta; umiejętność wskazania, kto odpowiada za daną kontrolę.
- **Założenie własnego konta laboratoryjnego** i natychmiastowe zabezpieczenie konta root: uwierzytelnianie wieloskładnikowe (MFA — drugi składnik logowania poza hasłem), zaprzestanie używania root do codziennej pracy, utworzenie zwykłego użytkownika.
- **Czytanie, kto ma dostęp:** przegląd użytkowników, grup, ról i przypisanych polityk IAM — odpowiedź na pytanie „kto może co".
- **Włączenie dziennika audytu (CloudTrail)** i odczytanie z niego prostego zdarzenia: kto się zalogował, kto utworzył zasób.
- **Znalezienie publicznego zasobu:** sprawdzenie zasobnika S3 pod kątem publicznego dostępu i zamknięcie go (Block Public Access).

**Co student musi UMIEĆ ZROBIĆ:** zabezpieczyć konto root (MFA, brak codziennego użycia); wskazać w modelu odpowiedzialności, kto za co odpowiada na 3 przykładach; włączyć CloudTrail i odczytać z niego konkretne zdarzenie; znaleźć publiczny zasobnik S3 i go zamknąć, opisując słownie, dlaczego był groźny.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Konto root to nie „konto admina do pracy".** Najczęstszy pierwszy błąd: codzienna praca na root bez MFA. Root służy wyłącznie do nielicznych operacji założycielskich. Zawodowiec blokuje root od pierwszej minuty.
- **„Publiczny" ma kilka warstw.** Zasobnik S3 może być publiczny przez politykę zasobnika, przez ACL albo przez ustawienie konta — zamknięcie jednej warstwy nie zamyka pozostałych. Amator wyłącza jedną i myśli, że gotowe.
- **Brak włączonego CloudTrail = ślepota.** Jeśli audyt nie był włączony *przed* incydentem, danych do dochodzenia po prostu nie ma — nie da się ich odtworzyć wstecz.

### L2 — Zastosowanie: least privilege, wykrywanie błędnych konfiguracji, GuardDuty (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Najmniejsze uprawnienie (least privilege)** w praktyce IAM: napisanie polityki dającej dokładnie tyle dostępu, ile trzeba — i ani trochę więcej; różnica między polityką opartą na tożsamości a opartą na zasobie.
- **Role zamiast kluczy:** dlaczego rola IAM (tożsamość tymczasowa) jest bezpieczniejsza niż trwały klucz dostępu, i jak działa założenie roli (assume role).
- **Wykrywanie błędnych konfiguracji:** świadome przejście po liście typowych błędów (publiczny S3, otwarta grupa zabezpieczeń na port 22/3389 do całego internetu, konto bez MFA, nadmiarowe uprawnienia, niezaszyfrowane wolumeny) i ich naprawa.
- **Włączenie GuardDuty** i interpretacja ustalenia: co znaczy dany alert, jaki ma priorytet, czy to prawdziwy pozytyw (realne zagrożenie) czy fałszywy alarm.
- **Polityka kontroli (guardrail)** na poziomie konta: pojęcie zapory uprawnień (np. polityka kontroli usług w organizacji), która **uniemożliwia** niebezpieczne działanie, zamiast tylko je wykrywać.

**Co student musi UMIEĆ ZROBIĆ:** napisać politykę IAM wg least privilege i wykazać, że nadmiarowy dostęp został odebrany; przejść audyt 5 typowych błędnych konfiguracji i je naprawić z uzasadnieniem; włączyć GuardDuty i przeprowadzić triage co najmniej jednego ustalenia (priorytet + następny krok).

**Profesjonalne niuanse:**
- **Least privilege to proces, nie jednorazowy akt.** Uprawnienia „pełzają" (privilege creep) — przyznane na chwilę zostają na zawsze. Zawodowiec regularnie przegląda i odbiera nieużywany dostęp; amator przyznaje „na wszelki wypadek" i zapomina.
- **`Action: "*"` i `Resource: "*"` to czerwona flaga.** Polityka z gwiazdką wszędzie daje pełnię władzy — to dokładnie to, czego szuka napastnik po przejęciu konta. Zawodowiec uzasadnia każde rozszerzenie zakresu.
- **Wykrywanie bez zapobiegania to za mało.** GuardDuty *powie*, że coś się stało; guardrail (polityka kontroli) *nie pozwoli*, żeby się stało. Dojrzałość to przesunięcie z „wykryliśmy" na „uniemożliwiliśmy".

### L3 — Portfolio: CSPM, benchmark CIS, audyt konta, korelacja logów (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Ocena postawy bezpieczeństwa konta (CSPM)** narzędziem natywnym (Security Hub) lub otwartoźródłowym skanerem (np. Prowler, ScoutSuite — patrz §7): pełny przegląd konta, lista ustaleń z priorytetami.
- **Mapowanie na CIS Benchmark dla AWS** (punkt odniesienia dobrych praktyk — patrz §7): porównanie stanu konta z uznanym standardem i raport zgodności/odchyleń.
- **Mapowanie na MITRE ATT&CK for Cloud** (otwarta baza taktyk i technik napastników, macierz chmurowa — §7): przypisanie wykrytych ryzyk do technik napastnika, świadome nazwanie luk pokrycia (blind spots — martwych pól).
- **Korelacja logów audytu:** analiza CloudTrail pod kątem podejrzanego ciągu zdarzeń (np. utworzenie użytkownika → nadanie uprawnień → utworzenie kluczy → eksfiltracja danych) — łączenie z liściem `SIEM`.
- **Raport postawy bezpieczeństwa:** dokument dla decydenta — co znaleziono, jak priorytetyzowano, co naprawić najpierw, jaki jest koszt vs ryzyko.

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić pełny audyt CSPM własnego konta laboratoryjnego, zmapować ustalenia na CIS Benchmark i na MITRE ATT&CK for Cloud, świadomie nazwać luki; wykryć w CloudTrail skorelowany ciąg podejrzanych zdarzeń; oddać raport postawy bezpieczeństwa z priorytetyzacją koszt–ryzyko. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Skaner zwróci setki ustaleń — wartość jest w priorytetyzacji.** Surowa lista 300 odchyleń jest bezużyteczna. Zawodowiec wie, które 10 trzeba naprawić dziś (publiczny S3 z danymi, root bez MFA), a które są kosmetyką. Amator oddaje surowy raport skanera.
- **Zgodność z benchmarkiem ≠ bezpieczeństwo.** CIS Benchmark to podłoga, nie sufit. Konto może być w 100% zgodne i nadal mieć krytyczną dziurę specyficzną dla tej firmy. Zawodowiec traktuje benchmark jako start, nie metę.
- **Logi audytu też kosztują i bywają danymi osobowymi.** CloudTrail w pełnej szczegółowości generuje koszt i może zawierać dane osobowe (adres IP — wyrok TSUE Breyer, §4 pkt prawny). Decyzja o zakresie i retencji to kompromis koszt–dowód–RODO.

### L4 — Realny przypadek profesjonalny: audyt i naprawa zaniedbanego konta (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem profesjonalisty):
- Przyjęcie *realnie zaniedbanego* konta laboratoryjnego (wiele kont użytkowników, narosłe uprawnienia, wyłączone części audytu, publiczne zasoby) i doprowadzenie go do bezpiecznego stanu bez zatrzymania działających usług — to realna codzienność, nie czyste konto z tutoriala.
- Zaprojektowanie zestawu zabezpieczeń pod *konkretny scenariusz zagrożenia* istotny dla branży (np. wyciek danych klientów przez publiczny S3 w firmie e-commerce) i udowodnienie, że naprawa zamyka wektor.
- **Benchmark:** wynik studenta (redukcja krytycznych ustaleń, pokrycie ATT&CK, brak przestojów) zestawiony z tym, co osiągnął profesjonalista na tym samym przypadku.

### L5 — Biegłość: architektura bezpiecznego środowiska i ekonomia (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości):
- **Architektura wielokontowa (landing zone — uporządkowany fundament organizacji w AWS):** świadomy podział na konta, centralne polityki kontroli (guardraile), centralne logowanie audytu — bezpieczeństwo zaprojektowane od fundamentu, nie doklejone.
- **Bezpieczeństwo jako kod (security-as-code):** polityki i kontrole w repozytorium z kontrolą wersji i testami; automatyczna ocena postawy w taśmie wdrożeniowej (powiązanie z `DevSecOps`).
- **Ekonomia bezpieczeństwa chmury:** świadomy dobór, które logi i skany włączyć wobec kosztu (GuardDuty, CloudTrail, Security Hub rozliczają się od ilości danych/zdarzeń) — bezpieczeństwo „za rozsądny koszt, który da się utrzymać".
- **Benchmark** wobec rozwiązania realnego architekta bezpieczeństwa chmury.

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

Najważniejsza sekcja — materiał na głębię projektów. Część niuansów jest **wspólna dla całej grupy** (oznaczone [RDZEŃ] — Azure i GCP się do nich odwołują), część jest **specyficzna dla AWS** [AWS].

1. **[RDZEŃ] Model współdzielonej odpowiedzialności rozumiany dosłownie.** Większość wycieków to wina konfiguracji po stronie klienta, nie awarii dostawcy. Zawodowiec wie, gdzie biegnie granica, i nie liczy na to, że „chmura sama jest bezpieczna".
2. **[RDZEŃ] Błędna konfiguracja > wyrafinowany atak.** Publiczny zasobnik, nadmiarowe uprawnienie, klucz w repozytorium kodu — to są realne przyczyny naruszeń, nie filmowe włamania. Higiena konfiguracji bije polowanie na egzotyczne podatności.
3. **[RDZEŃ] Tożsamość to obwód.** W chmurze granicą jest uprawnienie, nie zapora sieciowa. Kto się uwierzytelnił i co mu wolno — to pierwsza linia obrony.
4. **[RDZEŃ] Najmniejsze uprawnienie i pełzanie uprawnień (privilege creep).** Dostęp przyznany „na chwilę" zostaje na zawsze. Bez regularnego przeglądu i odbierania nieużywanego dostępu konto z czasem staje się polem minowym.
5. **[RDZEŃ] CSPM i priorytetyzacja ustaleń.** Skaner zwraca setki odchyleń; wartość jest w wiedzy, które 10 naprawić dziś. Surowy raport skanera to nie praca — to półprodukt.
6. **[RDZEŃ] Zgodność z benchmarkiem to podłoga, nie sufit.** CIS Benchmark/standard to minimum; pełna zgodność nie znaczy bezpieczeństwa. Zawodowiec idzie dalej niż checklista.
7. **[AWS] Konto root i MFA.** Codzienna praca na root bez drugiego składnika to pierwszy błąd, który tępi każdy audyt. Root = wyłącznie operacje założycielskie, z MFA.
8. **[AWS] Publiczny S3 ma wiele warstw (polityka, ACL, ustawienie konta).** Zamknięcie jednej nie zamyka reszty — i to jest historycznie najczęstszy głośny wyciek w tej platformie.
9. **[AWS] Role > trwałe klucze dostępu.** Trwały klucz w repozytorium kodu albo na dysku to gotowy łup. Tożsamość tymczasowa (rola) ogranicza okno ataku. Zawodowiec nie rozsiewa trwałych kluczy.
10. **[RDZEŃ] Wykrywanie vs zapobieganie.** GuardDuty/Defender/SCC *powiedzą*, że coś się stało; guardrail (polityka kontroli) *nie pozwoli*, żeby się stało. Dojrzałość = przesunięcie ciężaru na zapobieganie.
11. **[RDZEŃ] Audyt musi być włączony PRZED incydentem.** Bez wcześniej włączonego dziennika (CloudTrail) nie ma danych do dochodzenia — nie da się ich odtworzyć wstecz. Cisza w logach nie znaczy „bezpiecznie", może znaczyć „nic nie zapisywaliśmy".
12. **[RDZEŃ] Ekonomia bezpieczeństwa chmury.** Logi audytu, wykrywanie zagrożeń i skanowanie rozliczają się od ilości danych/zdarzeń. „Włącz wszystko wszędzie" rujnuje budżet i topi sygnał w szumie — jak ekonomia zaciągu w SIEM (§9 researchu SIEM). Zawodowiec decyduje, co warto zbierać.
13. **[RDZEŃ] Granica etyczno-prawna jest częścią kompetencji.** Logi chmury bywają danymi osobowymi (adres IP — wyrok TSUE Breyer, C-582/14). Minimalizacja, maskowanie, retencja zgodna z RODO/NIS2/DORA to element rzemiosła. Nieautoryzowany dostęp do cudzego konta/zasobu jest w Polsce przestępstwem (art. 267 Kodeksu karnego) — **pracujemy wyłącznie na własnym koncie laboratoryjnym**.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty AWS muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student umiał samodzielnie wykonywać zadania inżyniera bezpieczeństwa chmury. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Klauzula darmowego poziomu i własnego konta (twarda, w każdym projekcie):** każdy projekt jest wykonalny w ramach **AWS Free Tier** i **wyłącznie na własnym koncie laboratoryjnym** studenta — nigdy na cudzej infrastrukturze. Projekty nie mogą zmuszać do płatnych zasobów; jeśli usługa ma koszt poza darmowym poziomem, projekt podaje wariant bezpłatny (np. skaner otwartoźródłowy zamiast płatnej usługi, sprzątanie zasobów po ćwiczeniu).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| A1 | L1 | **Zabezpieczenie nowego konta AWS** — MFA na root, użytkownik zamiast root, model odpowiedzialności na przykładach | Model odpowiedzialności, root/MFA, czytanie dostępu | #1, #7 |
| A2 | L1 | **Włączenie audytu i odczyt zdarzenia** — CloudTrail + odczytanie konkretnego działania w koncie | Audyt, czytanie kto-co-zrobił | #11 |
| A3 | L1 | **Polowanie na publiczny S3** — znalezienie i zamknięcie publicznego zasobnika we wszystkich warstwach | Publiczny zasób, warstwy dostępu | #2, #8 |
| A4 | L2 | **Polityka least privilege** — napisanie i wykazanie odebrania nadmiaru; rola zamiast klucza | Least privilege, role vs klucze | #3, #4, #9 |
| A5 | L2 | **Audyt 5 typowych błędnych konfiguracji** — przegląd i naprawa z uzasadnieniem | Wykrywanie błędnych konfiguracji | #2, #5 |
| A6 | L2 | **GuardDuty: triage ustalenia** — włączenie, interpretacja, priorytet, następny krok | Wykrywanie zagrożeń, triage TP/FP | #10 |
| A7 | L3 | **CSPM całego konta + CIS Benchmark** — pełny audyt skanerem, mapowanie na CIS, priorytetyzacja | CSPM, benchmark CIS, raport postawy | #5, #6, #12 |
| A8 | L3 | **Mapowanie na MITRE ATT&CK for Cloud + mapa luk** — przypisanie ryzyk do technik, nazwanie blind spots | Mapowanie ATT&CK, pokrycie | #2, #5 |
| A9 | L3 | **Korelacja CloudTrail** — wykrycie skorelowanego ciągu podejrzanych zdarzeń (powiązanie z SIEM) | Korelacja logów audytu | #11, #13 |
| (A10–A12) | L4–L5 | **ZAPOWIEDŹ** — naprawa zaniedbanego konta (scenariusz branżowy), landing zone + security-as-code + ekonomia; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #12, #13 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów.** L4–L5: 2–3, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną i klauzulą darmowego poziomu, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności (kolejność autoringu, §4 frameworku):** A1→A2→A3 (fundamenty konta) → A4→A5→A6 (uprawnienia + wykrywanie) → A7→A8→A9 (postawa + korelacja). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Bezpieczeństwo AWS **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (liście potwierdzone w `career-model.ts`, ścieżka Cybersecurity Specialist):

1. **Pojęcie tożsamości i dostępu** (liść `IAM`, grupa „Tożsamość i zarządzanie dostępem") — kto się loguje, czym jest konto, grupa, rola, uprawnienie. Bez tego polityki IAM w AWS to czarna skrzynka. **Wymagane przed L2.** Bazę buduje projekt partii 1 `cyber-iam-active-directory-lab`.
2. **Podstawy sieci i TCP/IP** (liście `Network`, `TCP/IP`, grupa „Infrastruktura i sieci") — adres IP, port, protokół, sesja; bez tego student nie zrozumie grupy zabezpieczeń (firewall w chmurze) ani logu ruchu. **Wymagane przed L2.**
3. **Podstawy systemu operacyjnego (Linux)** — chmura uruchamia głównie Linuksa; logi, procesy, dostęp SSH. Bazę buduje `cyber-hardening-linux-bash` (partia 1). **Wymagane/równoległe na L1–L2.**
4. **Rdzeń grupy „Cloud Security"** — model współdzielonej odpowiedzialności, błędna konfiguracja, CSPM (§2 tego pliku). To prerekwizyt *koncepcyjny* dla Azure i GCP — student robi rdzeń raz, na jednej platformie. **Wymagane przed L2 na drugiej platformie.**
5. **Klauzula etyczno-prawna i klauzula darmowego poziomu** — praca wyłącznie na własnym koncie laboratoryjnym, art. 267 KK, AWS Free Tier. **Wymagane od L1.**

**Czego AWS dostarcza jako prerekwizyt dla innych liści:** logi CloudTrail/GuardDuty to źródło dla `SIEM` i `SOC` (korelacja zdarzeń chmurowych); rdzeń grupy zasila `Azure` i `GCP`; postawa konta wiąże się z `DevSecOps` (bezpieczeństwo w taśmie) i `Risk Management`/`NIST`/`ISO 27001` (zgodność). Dlatego AWS autorowany jest w grupie pierwszy.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links`. Ryan weryfikuje legalność i jakość.

**Dokumentacja producenta (oficjalna, darmowa):**
- AWS — model współdzielonej odpowiedzialności: https://aws.amazon.com/compliance/shared-responsibility-model/
- AWS IAM — przewodnik użytkownika (tożsamość i dostęp): https://docs.aws.amazon.com/IAM/latest/UserGuide/
- AWS IAM — najlepsze praktyki bezpieczeństwa: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- Amazon S3 — blokowanie publicznego dostępu (Block Public Access): https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS CloudTrail — dziennik audytu: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/
- Amazon GuardDuty — wykrywanie zagrożeń: https://docs.aws.amazon.com/guardduty/latest/ug/
- AWS Security Hub — agregacja postawy bezpieczeństwa: https://docs.aws.amazon.com/securityhub/latest/userguide/
- AWS Well-Architected — filar bezpieczeństwa (Security Pillar): https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html
- AWS Free Tier — darmowy poziom: https://aws.amazon.com/free/

**Standardy i benchmarki (punkty odniesienia dobrych praktyk):**
- CIS Benchmarks (Center for Internet Security — uznane punkty odniesienia konfiguracji, w tym AWS Foundations Benchmark): https://www.cisecurity.org/cis-benchmarks
- MITRE ATT&CK for Cloud (macierz technik napastników w chmurze): https://attack.mitre.org/matrices/enterprise/cloud/
- NIST Cybersecurity Framework 2.0 (funkcje Identify/Protect/Detect): https://www.nist.gov/cyberframework
- NIST SP 800-53 (kontrole bezpieczeństwa): https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final

**Narzędzia otwartoźródłowe do oceny postawy (CSPM, darmowe):**
- Prowler — otwartoźródłowy audyt bezpieczeństwa AWS (i innych chmur): https://github.com/prowler-cloud/prowler
- ScoutSuite — otwartoźródłowy audyt postawy wielu chmur: https://github.com/nccgroup/ScoutSuite

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Dyrektywa NIS2 (cyberbezpieczeństwo): https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA (odporność cyfrowa sektora finansowego): https://eur-lex.europa.eu/eli/reg/2022/2554

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. CIS Benchmarks są darmowe do pobrania w formacie PDF po rejestracji (wersja zautomatyzowana płatna — projekty używają wersji PDF lub skanera otwartoźródłowego Prowler, nie wymagają płatnej subskrypcji CIS). Prowler/ScoutSuite skanują **wyłącznie własne konto** studenta — klauzula art. 267 KK obowiązuje. Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów do zespołu bezpieczeństwa chmury w firmie EU. Pięć słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research zsuwał się w „jak używać AWS", nie „jak bronić AWS".** CISO: „nie potrzebuję kolejnego kursu deweloperskiego — potrzebuję kogoś, kto zamknie publiczny S3 i przejrzy uprawnienia". **Poprawka:** twardo postawiłam soczewkę bezpieczeństwa w nagłówku i §2; każdy poziom mówi o dostępie, konfiguracji, wykrywaniu — nie o budowaniu aplikacji.
2. **Słabość: brak ekonomii bezpieczeństwa.** CISO: „junior, który włącza pełny audyt wszędzie, generuje mi rachunek i szum". **Poprawka:** dodałam niuans #12 (ekonomia logów/skanów) i wbudowałam go w L5 oraz projekty A10–A12 — wprost analogicznie do ekonomii zaciągu w SIEM.
3. **Słabość: wykrywanie bez zapobiegania.** CISO: „GuardDuty mi powie, że już mnie okradli — wolę guardrail, który nie pozwoli". **Poprawka:** dodałam niuans #10 i pojęcie polityki kontroli (guardrail) w L2, żeby student rozumiał różnicę wykrywanie vs zapobieganie.
4. **Słabość: ryzyko, że projekty zmuszą do płatnych zasobów.** CISO (i realia studenta): „nie zapłacę za lab, żeby się nauczyć". **Poprawka:** dodałam twardą klauzulę darmowego poziomu i własnego konta laboratoryjnego (§5, §6 pkt 5, §7), z wariantem otwartoźródłowym (Prowler) zamiast płatnej usługi tam, gdzie trzeba.
5. **Słabość: prerekwizyty i relacja do Azure/GCP były niejasne.** CISO: „nie chcę, żeby student trzy razy uczył się tego samego modelu odpowiedzialności". **Poprawka:** wyznaczyłam AWS jako plik rdzeniowy grupy, oznaczyłam niuanse [RDZEŃ] vs [AWS], a w §6 pkt 4 zapisałam rdzeń grupy jako prerekwizyt koncepcyjny dla pozostałych platform.

**Sprawdzenie tłumaczenia żargonu (sekcja 3 CLAUDE.md):** przejrzałam plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (AWS, IAM, MFA, S3, ACL, CloudTrail, GuardDuty, Security Hub, CSPM, least privilege, privilege creep, guardrail, landing zone, security-as-code, shared responsibility model, misconfiguration, CIS Benchmark, MITRE ATT&CK, blind spot, root, Free Tier, CISO, NIS2, DORA). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, gdy autoring domknie 9 projektów L1–L3 z niuansami #1–#11. Niuanse #12 (ekonomia) i pełna #13 w skali wymagają L4/L5 — research je zapowiada; pełna „zawodowość" domknie się po strukturze L4/L5 (zależność od Ethana/Leo). Uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
