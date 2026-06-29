# Research kompetencji: IAM

> **Status:** research kompetencji w ETAP E3 — powstał wg wzorca (golden-example) `tools/content/research/siem.md` (struktura, głębia, poprzeczka North Star §0.1).
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md`. North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `IAM` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Tożsamość i zarządzanie dostępem (IAM)" (`unionShare` grupy: **12,7%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **7,5%** ofert ścieżki wymienia IAM |
| **Liczba ofert (`offers`)** | **28** |
| **`kind`** | `concept` (kompetencja koncepcyjna, nie pojedyncze narzędzie — patrz §2) |
| **`lift`** | 12,69 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| **IAM** (ten plik) | 7,5 | 28 | concept |
| Active Directory | 4,3 | 16 | tool |
| PAM | 3,0 | 11 | concept |
| CyberArk | 2,4 | 9 | tool |

**Wniosek dla autoringu:** IAM to liść o najwyższym popycie w swojej grupie (7,5% — więcej niż konkretne narzędzia Active Directory czy CyberArk) i drugi co do popytu liść-koncept w całej ścieżce po SIEM (10,8%). Rynek pyta o *kompetencję koncepcyjną* „umiem zarządzać tożsamością i dostępem", a Active Directory (katalog użytkowników) czy CyberArk (narzędzie PAM) to pochodne. IAM jest więc rdzeniem grupy — PAM (`tools/content/research/pam.md`) i CyberArk się o niego opierają. Opis grupy w modelu mówi to wprost: *„większość włamań to nie spektakularny atak, tylko ktoś wszedł na cudze konto"* — to zdanie jest osią całego researchu.

---

## 2. Definicja kompetencji i jej rola w pracy

**IAM (Identity and Access Management — zarządzanie tożsamością i dostępem)** to dyscyplina pilnowania trzech rzeczy naraz: **kto** (tożsamość), **do czego** (dostęp do zasobu) i **jak długo** (czas trwania uprawnienia). To nie pojedyncze narzędzie, lecz proces obejmujący cały *cykl życia tożsamości* — od chwili, gdy pracownik dołącza do firmy, przez każdą zmianę jego roli, aż po dzień, w którym odchodzi i trzeba mu odebrać wszystkie dostępy. IAM odpowiada na cztery pytania, których pojedyncze logowanie nie rozstrzyga:

1. **Tożsamość (identity).** Kim jest ten, kto chce wejść — i skąd wiemy, że to naprawdę on (a nie ktoś z jego hasłem)?
2. **Uwierzytelnianie (authentication — sprawdzenie tożsamości).** Czy dowód tożsamości jest wiarygodny? Samo hasło to słaby dowód — stąd uwierzytelnianie wieloskładnikowe (MFA — Multi-Factor Authentication, logowanie potwierdzane drugim czynnikiem: aplikacją, kluczem sprzętowym).
3. **Autoryzacja (authorization — przyznanie uprawnień).** Do czego ta tożsamość *ma prawo*? Tu działa **model najmniejszego uprawnienia (least privilege)** — każdy dostaje dokładnie tyle dostępu, ile potrzebuje do pracy, i ani trochę więcej.
4. **Rozliczalność i wygaszanie (accounting + deprovisioning — ewidencja i odbieranie dostępu).** Kto i kiedy z czego korzystał, oraz: czy dostęp został odebrany, gdy przestał być potrzebny?

**Czym IAM NIE jest (rozróżnienie zawodowca):**
- IAM to nie „założenie konta i nadanie hasła". Założenie konta to pierwsza minuta cyklu życia tożsamości; cała trudność jest w *zmianie* i *odebraniu* dostępu, których nikt nie pilnuje (patrz niuans #1 i #2 w §4).
- IAM ≠ PAM. PAM (Privileged Access Management — zarządzanie dostępem uprzywilejowanym) to *podzbiór* IAM skupiony wyłącznie na kontach administratorów (root, admin, konta usługowe). IAM rządzi dostępem *wszystkich*; PAM dokłada twardsze rygory dla nielicznych kont o największej władzy. To osobny liść grupy (`pam.md`).
- IAM ≠ Active Directory. Active Directory to *jedno narzędzie* (katalog użytkowników Microsoftu) realizujące IAM w świecie Windows. IAM jest pojęciem ponad narzędziem — dotyczy też chmury (AWS IAM, Entra ID), aplikacji SaaS i federacji między nimi.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja IAM jest rdzeniem pracy **inżyniera/administratora IAM**, **specjalisty ds. tożsamości (identity engineer)** oraz coraz częściej **analityka bezpieczeństwa** (bo większość alertów SIEM dotyczy właśnie kont — patrz §6). Typowy dzień:
- **Operacyjnie:** obsługa cyklu życia tożsamości — nadanie dostępu nowemu pracownikowi (joiner), zmiana przy awansie/przeniesieniu (mover), odebranie przy odejściu (leaver); rozpatrywanie wniosków o dostęp; reset MFA.
- **Projektowo i kontrolnie:** przeglądy dostępu (access review — okresowe potwierdzenie, że ludzie mają tylko to, co im się należy), budowa modelu ról (RBAC — Role-Based Access Control, dostęp przypisany do roli, nie do osoby), wdrażanie logowania jednokrotnego (SSO) i federacji, polowanie na martwe konta i nadmiarowe uprawnienia.

**Po co rynkowi ta kompetencja.** Branżowe raporty o naruszeniach (np. Verizon DBIR) od lat pokazują, że *przejęte poświadczenia* (skradzione lub wyłudzone hasła) są jednym z najczęstszych punktów wejścia napastnika — drożej kosztuje firmę cudze konto niż „spektakularny" exploit. Regulacje EU (NIS2 — dyrektywa o cyberbezpieczeństwie; DORA — odporność cyfrowa sektora finansowego; RODO — art. 32 wymaga adekwatnej kontroli dostępu do danych osobowych) wprost wymagają kontroli, kto ma dostęp do czego. Stąd stały, wysoki popyt (7,5% ofert ścieżki, drugi koncept po SIEM).

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". **Ważne:** liść IAM ma już jeden projekt L1 w partii 1 (`cyber-iam-active-directory-lab` — katalog Active Directory + model najmniejszego uprawnienia). Ten research **nadbudowuje nad nim**, nie powtarza go: L1 zamyka fundament, ciężar nowego autoringu leży na L2–L3.

### L1 — Fundamenty: tożsamość, konto, uprawnienie (3–6 h)

**Zakres wiedzy/umiejętności:**
- Czym jest tożsamość, konto, grupa, rola; różnica między *uwierzytelnianiem* (kim jesteś) a *autoryzacją* (do czego masz prawo).
- Model najmniejszego uprawnienia (least privilege) w praktyce: nadanie dostępu przez grupę/rolę, nie wprost osobie; struktura jednostek organizacyjnych.
- Czytanie i interpretacja konta: kiedy ostatnio użyte, jakie ma uprawnienia, do jakich grup należy.
- *(W dużej części pokryte projektem partii 1 `cyber-iam-active-directory-lab` — Samba AD w kontenerze lub ewaluacyjny Windows Server, fikcyjne persony.)*

**Co student musi UMIEĆ ZROBIĆ:** zbudować treningowy katalog z jednostkami organizacyjnymi, grupami i polityką haseł; nadać dostęp przez grupę zgodnie z least privilege; udowodnić konfigurację eksportem (PowerShell / `samba-tool`).

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Dostęp przez grupę, nie przez osobę.** Amator nadaje uprawnienia wprost użytkownikowi „na szybko". Po roku nikt nie wie, dlaczego Jan ma dostęp do działu kadr — bo decyzja nie jest zapisana w żadnej roli. Zawodowiec nadaje dostęp *przez* grupę/rolę, która ma nazwę i właściciela.
- **Konto to nie człowiek.** Jeden człowiek bywa kilkoma tożsamościami (konto zwykłe + konto administratora + konto w chmurze). Konta usługowe (service accounts) w ogóle nie mają człowieka za sobą — i właśnie dlatego bywają zapomniane (patrz PAM).

### L2 — Zastosowanie: cykl życia tożsamości, MFA, SSO (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Cykl życia tożsamości (joiner–mover–leaver — dołączający, zmieniający rolę, odchodzący):** zaprojektowanie procesu nadania, zmiany i *odebrania* dostępu na każdym z trzech etapów; świadomość, że *mover* (zmiana roli) jest najtrudniejszy, bo dostępy się *kumulują*, a stare rzadko się odbiera.
- **Uwierzytelnianie wieloskładnikowe (MFA):** różnica między czynnikami (coś wiesz / coś masz / czymś jesteś), dlaczego SMS jest słabym drugim czynnikiem, czym jest MFA odporne na wyłudzenie (phishing-resistant — klucz sprzętowy / WebAuthn).
- **Logowanie jednokrotne (SSO — Single Sign-On, jedno logowanie do wielu aplikacji):** zasada działania, jego zalety (mniej haseł = mniej wycieków) i jego ryzyko (pojedynczy punkt awarii — patrz niuans #5).
- **Model dostępu oparty na rolach (RBAC):** zamiana opisu „kto czego potrzebuje" na zestaw ról i przypisań; pierwsze starcie z *eksplozją ról* (zbyt wiele ról drobiazgowych).
- **Prowizjonowanie i deprowizjonowanie (provisioning/deprovisioning — nadawanie i wygaszanie dostępu):** automatyczne zakładanie i *kasowanie* kont na podstawie źródła prawdy (np. systemu kadrowego).

**Co student musi UMIEĆ ZROBIĆ:** rozpisać kompletny cykl życia tożsamości dla wymyślonej firmy (joiner/mover/leaver) z jawnym krokiem odebrania dostępu; skonfigurować MFA i SSO w darmowym dostawcy tożsamości (np. Keycloak — otwartoźródłowy serwer tożsamości); zaprojektować zestaw ról RBAC i uzasadnić każdą rolę; pokazać, jak deprovisioning zamyka konto przy „odejściu" persony.

**Profesjonalne niuanse:**
- **Mover jest groźniejszy niż leaver.** Wszyscy pamiętają o odebraniu dostępu przy odejściu. Mało kto odbiera *stare* dostępy przy zmianie działu — tak rośnie *narastanie uprawnień* (privilege creep): po pięciu awansach pracownik ma dostęp do wszystkiego, czego kiedykolwiek dotykał. To główne źródło nadmiarowych uprawnień.
- **MFA da się obejść.** Włączenie MFA to nie koniec — istnieją zmęczenie powiadomieniami (MFA fatigue — zasypywanie ofiary prośbami o zatwierdzenie, aż kliknie) i przechwycenie sesji. Zawodowiec rozumie, że MFA na SMS to minimum, a phishing-resistant to standard dla kont wrażliwych.
- **Eksplozja ról.** Zbyt drobiazgowy RBAC tworzy setki ról, których nikt nie ogarnia — i wraca się do nadawania wprost. Dobór ziarnistości roli to kompromis, nie „im więcej ról, tym lepiej".

### L3 — Portfolio: zarządzanie tożsamością, przeglądy dostępu, federacja (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Przeglądy i recertyfikacja dostępu (access review / recertification — okresowe potwierdzenie uprawnień):** przeprowadzenie przeglądu, w którym właściciel zasobu potwierdza lub odbiera dostępy; wykrycie i usunięcie *nadmiarowych uprawnień*.
- **Polowanie na martwe konta (orphaned / stale accounts — konta osierocone i nieużywane):** znalezienie kont bez właściciela, kont po odejściu pracownika, kont nigdy nieużytych; ich ryzyko i wygaszenie.
- **Rozdział obowiązków (SoD — Separation of Duties — żeby jedna osoba nie miała kompletu uprawnień do nadużycia):** wykrycie konfliktów uprawnień (np. ktoś, kto zarówno tworzy dostawcę, jak i zatwierdza mu przelew).
- **Federacja tożsamości (federation — zaufanie tożsamości między organizacjami/domenami):** zasada działania protokołów SAML i OIDC (OpenID Connect — standard logowania przez zewnętrznego dostawcę); logowanie do aplikacji SaaS tożsamością firmową.
- **Integracja IAM z monitorowaniem (SIEM):** połączenie zdarzeń tożsamości (logowania, zmiany uprawnień, nadania ról) z detekcją — wykrycie przejęcia konta, eskalacji uprawnień, logowania z niemożliwej lokalizacji (impossible travel).
- **Governance tożsamości (IGA — Identity Governance and Administration — ład nad tym, kto co ma i dlaczego):** dokumentacja decyzji dostępowych tak, by przeszły audyt (NIS2/DORA/ISO 27001).

**Co student musi UMIEĆ ZROBIĆ:** przeprowadzić pełny przegląd dostępu na treningowym katalogu i udokumentować, co odebrał i dlaczego; wykryć i wygasić martwe konta; zaprojektować regułę SoD i pokazać wykryty konflikt; skonfigurować federację (SSO przez OIDC/SAML w Keycloak) do przykładowej aplikacji; opisać, jakie zdarzenia tożsamości wysyła do SIEM i jaki alert z nich buduje. To poziom „portfolio na rozmowę o pracę".

**Profesjonalne niuanse:**
- **Przegląd dostępu, w którym wszyscy klikają „zatwierdź wszystko", jest gorszy niż jego brak.** Daje fałszywe poczucie kontroli i papierek dla audytora, a nie odbiera ani jednego nadmiarowego uprawnienia. Zawodowiec projektuje przegląd tak, by wymuszał świadomą decyzję (np. pokazuje, kiedy dostęp był ostatnio użyty).
- **Martwe konto to wymarzone wejście napastnika.** Konto po odejściu pracownika, wciąż aktywne, bez MFA, którego nikt nie obserwuje — idealny cel. Większość włamań „przez cudze konto" zaczyna się właśnie tu.
- **Federacja przenosi zaufanie — i ryzyko.** Logowanie przez zewnętrznego dostawcę jest wygodne, ale jeśli on padnie lub zostanie przejęty, padają wszystkie aplikacje, które mu zaufały. Zawodowiec zna ten kompromis i ma plan awaryjny.

### L4 — Realny przypadek profesjonalny: cykl życia tożsamości i recertyfikacja w skali firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`; design: `docs/design/skillbridge-projekty-l4-l5-struktura-v0.1.md`). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *nieuporządkowanego, realnego* stanu tożsamości w firmie (rozjechane grupy, martwe konta, dostępy nadawane „na szybko" przez lata) i doprowadzenie go do ładu — to realna codzienność, nie czysty laboratoryjny katalog.
- Zaprojektowanie i przeprowadzenie *kampanii recertyfikacji* dla setek tożsamości pod konkretny wymóg branżowy (np. DORA w firmie finansowej), z wykryciem konfliktów SoD i wygaszeniem nadmiarowych uprawnień, tak by proces był wykonalny przez realny zespół.
- **Benchmark:** wynik studenta (liczba odebranych nadmiarowych dostępów, wykryte martwe konta, jakość modelu ról, ślad audytowy) zestawiony z tym, co osiągnął profesjonalista na tym samym przypadku.

### L5 — Biegłość: architektura tożsamości i Zero Trust (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Strategia tożsamości dla całej organizacji:** decyzja o modelu (centralny dostawca tożsamości, federacja, model ról dla całej firmy) świadoma kosztu operacyjnego i wygody użytkownika.
- **Architektura Zero Trust (model „nigdy nie ufaj, zawsze weryfikuj" — dostęp oceniany przy każdym żądaniu, nie raz przy wejściu do sieci):** tożsamość jako nowy obwód bezpieczeństwa; dostęp warunkowy (conditional access) zależny od ryzyka.
- **Tożsamość w chmurze i CIEM (Cloud Infrastructure Entitlement Management — ład nad uprawnieniami w chmurze):** opanowanie eksplozji uprawnień w AWS/Azure/GCP, gdzie liczba możliwych uprawnień idzie w tysiące.
- **Benchmark** wobec rozwiązania realnego architekta tożsamości: nie tylko „czy działa", ale „czy jest bezpieczne, wykonalne operacyjnie i znośne dla użytkownika".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **Cały ciężar IAM leży w *odbieraniu* dostępu, nie w nadawaniu.** Założyć konto umie każdy. Sztuką jest odebrać dostęp przy zmianie roli i przy odejściu — bo nikt o tym nie pamięta, a stary dostęp nie boli, dopóki ktoś go nie wykorzysta. Amator myśli „nadałem dostęp"; zawodowiec myśli „kto to odbierze i kiedy".

2. **Narastanie uprawnień (privilege creep) i nadmiarowe uprawnienia.** Pracownik po latach awansów i przeniesień ma dostęp do wszystkiego, czego kiedykolwiek dotykał. To największy cichy dług IAM. Zawodowiec aktywnie tnie uprawnienia przez przeglądy; amator tylko dokłada.

3. **Martwe konta (orphaned / stale accounts).** Konto bez właściciela, konto po odejściu, konto nigdy nieużyte — to najczęstsze wejście napastnika „przez cudze konto". Zawodowiec regularnie poluje na te konta; amator zakłada, że „skoro nikt się nie skarży, to jest dobrze".

4. **Model najmniejszego uprawnienia to dyscyplina ciągła, nie ustawienie jednorazowe.** Least privilege rozjeżdża się sam z upływem czasu (patrz #2). Utrzymanie go wymaga procesu (przeglądy, RBAC, deprovisioning), nie pojedynczej dobrej konfiguracji na starcie.

5. **SSO i federacja to pojedynczy punkt awarii.** Logowanie jednokrotne jest wygodne i *zmniejsza* liczbę haseł (mniej wektorów wycieku), ale jeśli dostawca tożsamości padnie albo zostanie przejęty — padają *wszystkie* aplikacje za nim. Zawodowiec zna ten kompromis, twardo chroni konto dostawcy (MFA odporne na wyłudzenie, monitorowanie) i ma plan awaryjny; amator widzi tylko wygodę.

6. **MFA da się obejść — włączenie to nie koniec.** Zmęczenie powiadomieniami (MFA fatigue), przechwycenie sesji, słaby kanał (SMS) — to realne drogi obejścia. Dla kont wrażliwych standardem jest MFA odporne na wyłudzenie (klucz sprzętowy / WebAuthn), nie kod z SMS.

7. **Rozdział obowiązków (SoD).** Jedna osoba nie powinna móc wykonać całego nadużycia sama (np. założyć fikcyjnego dostawcę *i* zatwierdzić mu przelew). Wykrycie i rozplątanie konfliktów SoD to klasyczny wymóg audytu (ISO 27001, DORA) — i miejsce, gdzie czysty RBAC bez governance nie wystarcza.

8. **Eksplozja ról vs nadawanie wprost — kompromis ziarnistości RBAC.** Zbyt mało ról = każdy ma za dużo (łamie least privilege). Zbyt wiele ról = nikt nie ogarnia, wraca się do nadawania wprost. Dobór ziarnistości to świadoma decyzja, nie domyślne ustawienie.

9. **Konta usługowe i nieludzkie tożsamości (machine identities).** Konta aplikacji, skryptów i integracji często mają szerokie, stałe uprawnienia i hasło ustawione raz na zawsze — a nie ma za nimi człowieka, który zmieni hasło przy odejściu. To pomost do PAM (zarządzanie dostępem uprzywilejowanym, `pam.md`) i rosnąca większość tożsamości w firmie.

10. **Tożsamość jest punktem styku z RODO.** Konto, login, adres IP, czas logowania to dane osobowe. Przeglądy dostępu i logi tożsamości muszą respektować minimalizację i cel przetwarzania. Adres IP bywa daną osobową (wyrok TSUE Breyer, C-582/14). To nie „dodatek RODO", lecz element zawodowego rzemiosła IAM.

11. **Granica etyczno-prawna jest częścią kompetencji.** Student pracuje wyłącznie na własnym/treningowym katalogu z *fikcyjnymi* tożsamościami (persony wymyślone lub z generatora typu faker) — nigdy danymi realnych osób. Nieautoryzowany dostęp do cudzych kont/systemów jest w Polsce przestępstwem (art. 267 Kodeksu karnego).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty IAM muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania inżyniera IAM. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **Katalog AD i least privilege** (już istnieje: `cyber-iam-active-directory-lab` w partii 1) | Tożsamość/konto/grupa, least privilege, dostęp przez grupę, dowód konfiguracji | #1, #4 |
| P2 | L2 | **Cykl życia tożsamości (joiner–mover–leaver)** — rozpisanie i odegranie nadania/zmiany/odebrania dostępu dla persony, z naciskiem na *mover* i *leaver* | Cykl życia, deprovisioning, odebranie dostępu | #1, #2 |
| P3 | L2 | **MFA i SSO w praktyce** — konfiguracja MFA i logowania jednokrotnego w darmowym dostawcy tożsamości (Keycloak), porównanie czynników, słabości SMS | MFA, SSO, czynniki, phishing-resistant | #5, #6 |
| P4 | L2 | **Model ról (RBAC)** — zaprojektowanie i uzasadnienie zestawu ról dla wymyślonej firmy, świadomy dobór ziarnistości | RBAC, prowizjonowanie przez role | #4, #8 |
| P5 | L3 | **Przegląd i recertyfikacja dostępu** — przeprowadzenie przeglądu, odebranie nadmiarowych uprawnień, wykrycie privilege creep z udokumentowaniem decyzji | Access review, recertyfikacja, nadmiarowe uprawnienia | #1, #2, #4 |
| P6 | L3 | **Polowanie na martwe konta** — wykrycie kont osieroconych/nieużywanych/po odejściu i ich wygaszenie, z uzasadnieniem ryzyka | Martwe konta, higiena tożsamości | #3 |
| P7 | L3 | **Rozdział obowiązków (SoD)** — zaprojektowanie reguł SoD, wykrycie i rozplątanie konfliktu uprawnień pod kątem audytu | SoD, governance/IGA | #7 |
| P8 | L3 | **Federacja i SSO między aplikacjami** — konfiguracja federacji (OIDC/SAML) do przykładowej aplikacji, omówienie ryzyka pojedynczego punktu awarii | Federacja, OIDC/SAML | #5 |
| P9 | L3 | **Tożsamość spotyka SIEM** — wysłanie zdarzeń tożsamości do SIEM i zbudowanie alertu o przejęciu konta / impossible travel (most do grupy SIEM) | Integracja IAM↔SIEM, detekcja kont | #3, #10 |
| (P10–P11) | L4–L5 | **ZAPOWIEDŹ** — recertyfikacja w skali + scenariusz branżowy (DORA); architektura Zero Trust + CIEM w chmurze; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #2, #5, #9, #10 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 9 projektów** (z czego 1 już istnieje). L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (istnieje) → P2 (cykl życia) → P3 (MFA/SSO) → P4 (RBAC) → P5 (przegląd) → P6 (martwe konta) → P7 (SoD) → P8 (federacja) → P9 (most do SIEM). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy. RBAC (P4) musi poprzedzać przegląd (P5), bo bez ról nie ma czego recertyfikować sensownie.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

IAM **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (w ramach ścieżki Cybersecurity Specialist — liście potwierdzone w `career-model.ts`):

1. **Podstawy systemów operacyjnych** — `Linux` i/lub `Windows` (gdzie żyją konta, grupy, uprawnienia plików); rozumienie, czym jest konto systemowe i logowanie. Projekty partii 1 (`cyber-hardening-linux-bash`) tworzą tę bazę. **Wymagane przed L1.**
2. **Active Directory jako pierwszy katalog** — projekt partii 1 `cyber-iam-active-directory-lab` daje konkretny, dotykalny katalog (jednostki organizacyjne, grupy, least privilege). IAM jako *koncept ponad narzędziem* nadbudowuje nad tym praktycznym fundamentem. **Wymagane/równoległe na L1–L2.**
3. **Podstawy sieci i TCP/IP** (`TCP/IP`, `Network`) — federacja (SAML/OIDC), SSO i logowanie w chmurze to wymiana komunikatów przez sieć; bez pojęcia protokołu i sesji student nie zrozumie federacji. **Wymagane przed L3 (federacja).**
4. **Pojęcie logu i monitorowania** — żeby na L3 połączyć tożsamość z SIEM, student musi już rozumieć, czym jest log i alert. Fundament logów daje partia 1 (`cyber-python-automatyzacja-logow`) oraz research SIEM (`tools/content/research/siem.md`, prerekwizyt §6 pkt 4 tam wskazuje IAM jako warunek detekcji kont — zależność jest *dwukierunkowa*: SIEM uczy logu, IAM uczy znaczenia konta). **Wymagane przed L3 (most P9).**
5. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK; praca wyłącznie na własnym/treningowym katalogu z fikcyjnymi tożsamościami). **Wymagane od L1.**

**Czego IAM dostarcza jako prerekwizyt dla innych liści:** IAM jest fundamentem dla **`PAM`** (zarządzanie dostępem uprzywilejowanym to *zaostrzony* IAM dla kont administratorów — `pam.md` nadbudowuje wprost nad tym researchem), **`CyberArk`** (narzędzie PAM) oraz dla detekcji kont w grupie **SIEM/SOC** (większość alertów dotyczy tożsamości). Dlatego w grupie „Tożsamość i zarządzanie dostępem" IAM autorowany jest pierwszy, a PAM drugi.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Standardy i normy (oficjalne, darmowe):**
- NIST SP 800-63 „Digital Identity Guidelines" — rdzeń tożsamości cyfrowej: 800-63-3 (przegląd), 800-63A (rejestracja tożsamości), **800-63B (uwierzytelnianie i MFA)**, 800-63C (federacja): https://pages.nist.gov/800-63-3/
- NIST SP 800-53 r5, rodzina **AC (Access Control)** — m.in. AC-2 (zarządzanie kontami), AC-6 (najmniejsze uprawnienie): https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- NIST SP 800-207 „Zero Trust Architecture" (model „nigdy nie ufaj, zawsze weryfikuj"): https://csrc.nist.gov/pubs/sp/800/207/final
- NIST Cybersecurity Framework 2.0 (funkcja Protect — kontrola dostępu): https://www.nist.gov/cyberframework

**Dobre praktyki i wiedza branżowa (otwarte, autorytatywne):**
- OWASP Authentication Cheat Sheet (dobre praktyki uwierzytelniania): https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Access Control Cheat Sheet (autoryzacja, least privilege): https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html
- OWASP ASVS — rozdział uwierzytelniania i zarządzania sesją (standard weryfikacji): https://owasp.org/www-project-application-security-verification-standard/
- CIS Controls v8 — Control 5 (zarządzanie kontami) i Control 6 (zarządzanie kontrolą dostępu): https://www.cisecurity.org/controls
- FIDO Alliance / WebAuthn (MFA odporne na wyłudzenie, klucze sprzętowe): https://fidoalliance.org/ oraz https://www.w3.org/TR/webauthn-2/

**Dokumentacja narzędzi (oficjalna, darmowa / otwartoźródłowa — do labów):**
- Keycloak — otwartoźródłowy serwer tożsamości (SSO, MFA, federacja OIDC/SAML; idealny do labu L2–L3): https://www.keycloak.org/documentation
- Microsoft Entra ID (dawniej Azure AD) — dokumentacja tożsamości, dostęp warunkowy: https://learn.microsoft.com/en-us/entra/identity/
- Microsoft Learn — Active Directory i zarządzanie tożsamością (atrybucja + link w README): https://learn.microsoft.com/en-us/windows-server/identity/
- Samba AD (otwartoźródłowy katalog do labu, jak w partii 1): https://wiki.samba.org/index.php/Setting_up_Samba_as_an_Active_Directory_Domain_Controller

**Kontekst prawny EU/PL (do projektów i klauzul):**
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- RODO, art. 32 (bezpieczeństwo przetwarzania — adekwatna kontrola dostępu): https://eur-lex.europa.eu/eli/reg/2016/679
- Dyrektywa NIS2 (cyberbezpieczeństwo, kontrola dostępu i MFA): https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA (odporność cyfrowa sektora finansowego — zarządzanie tożsamością i dostępem): https://eur-lex.europa.eu/eli/reg/2022/2554

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Kluczowe ryzyko RODO w tej kompetencji: projekty IAM operują na *kontach i tożsamościach* — wymagana twarda klauzula „wyłącznie fikcyjne persony, nigdy dane realnych osób" (jak w partii 1, projekt AD). Linki do weryfikacji aktualności przed wejściem do `learning_resources` (zwłaszcza Entra/Microsoft Learn — częste zmiany URL).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research groził powtórzeniem istniejącego projektu AD z partii 1.** CISO: „jeśli IAM = jeszcze raz Active Directory, junior umie założyć konto, a nie zarządzać dostępem". **Poprawka:** jawnie oznaczyłam, że P1 (katalog AD) już istnieje, i przesunęłam cały ciężar nowego autoringu na L2–L3 (cykl życia, przeglądy, SoD, federacja). IAM jest tu *konceptem ponad narzędziem*, nie powtórką AD.

2. **Słabość: nadawanie dostępu przesłaniało jego odbieranie.** CISO: „nadać umie każdy stażysta; firmę topią dostępy, których nikt nie odbiera". **Poprawka:** uczyniłam *odebranie* dostępu osią całego researchu (niuans #1, #2), wyróżniłam *mover* jako trudniejszy od *leaver* (P2) i dodałam osobne projekty na przegląd dostępu (P5) i martwe konta (P6).

3. **Słabość: MFA i SSO potraktowane jako „włącz i gotowe".** CISO: „junior, który myśli, że MFA załatwia sprawę, jest groźny — bo MFA się obchodzi, a SSO to pojedynczy punkt awarii". **Poprawka:** dodałam niuans #5 (SSO jako single point of failure, wprost z wymogu zadania) i #6 (MFA fatigue, phishing-resistant), i wbudowałam je w projekt P3.

4. **Słabość: brak rozdziału obowiązków i kąta audytu.** CISO: „w banku pod DORA pierwsze pytanie audytora to SoD — junior bez tego nie wejdzie do finansów". **Poprawka:** dodałam SoD jako osobną umiejętność L3 (niuans #7, projekt P7) i powiązałam governance/IGA z konkretnymi normami (ISO 27001, DORA) w §3 i §7.

5. **Słabość: IAM wisiał w próżni, oderwany od reszty ścieżki.** CISO: „tożsamość bez detekcji to teoria — chcę juniora, który wie, że przejęte konto widać w SIEM". **Poprawka:** dodałam projekt-most P9 (zdarzenia tożsamości → SIEM → alert o przejęciu konta) i opisałam *dwukierunkową* zależność z researchem SIEM w §6; PAM wskazany jako naturalna nadbudowa (`pam.md`).

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (IAM, MFA, SSO, RBAC, SoD, IGA, CIEM, least privilege, joiner-mover-leaver, provisioning/deprovisioning, privilege creep, orphaned/stale accounts, access review/recertification, federation, SAML, OIDC, WebAuthn, MFA fatigue, phishing-resistant, conditional access, Zero Trust, impossible travel, service account, machine identity, CISO, NIS2, DORA). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego" — spełniony, jeśli autoring domknie projekty L1–L3 z niuansami #1–#8, #10. Niuanse #2 (privilege creep w skali), #5 (SSO/federacja w skali), #9 (tożsamości maszynowe), #10 (RODO w skali) domykają się w pełni dopiero na L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje (a)–(d) zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
