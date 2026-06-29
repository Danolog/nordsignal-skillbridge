# Research kompetencji: Active Directory

> **Status:** research liścia ścieżki Cybersecurity Specialist (grupa „Tożsamość i zarządzanie dostępem (IAM)"), powstały wg wzorca `tools/content/research/siem.md`.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.
> **Zależność treściowa:** ten research **nadbudowuje nad konceptem IAM** (zarządzanie tożsamością i dostępem) — nie powtarza jego teorii. Fundament katalogu (struktura, konta, model najmniejszych uprawnień) buduje już projekt partii 1 `cyber-iam-active-directory-lab`. Tutaj wchodzimy głębiej: uwierzytelnianie, ataki na katalog i obrona.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Active Directory` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „Tożsamość i zarządzanie dostępem (IAM)" (`unionShare` grupy: **12,7%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **4,3%** ofert ścieżki wymienia Active Directory |
| **Liczba ofert (`offers`)** | **16** |
| **`kind`** | `tool` (konkretne narzędzie/produkt — katalog użytkowników Microsoftu, nie kompetencja koncepcyjna) |
| **`lift`** | 3,37 (siła powiązania liścia z tą ścieżką — niski, bo AD bywa też w ofertach administracyjnych spoza cyber) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind | lift |
|---|---|---|---|---|
| IAM | 7,5 | 28 | concept | 12,69 |
| Active Directory (ten plik) | 4,3 | 16 | tool | 3,37 |
| PAM | 3,0 | 11 | concept | 26,74 |
| CyberArk | 2,4 | 9 | tool | 20,06 |

**Wniosek dla autoringu:** Active Directory (w skrócie **AD**) to *narzędziowy* liść grupy IAM o najwyższym popycie spośród narzędzi (4,3% — więcej niż CyberArk). Niski `lift` (3,37) mówi, że AD pojawia się też poza twardym cyberbezpieczeństwem (administracja systemami, helpdesk) — to dobra wiadomość dla juniora: **AD jest przyjazną bramą wejścia**, obecną w prawie każdej polskiej firmie. Kompetencja koncepcyjna grupy to IAM (7,5%); AD jest jej najpopularniejszym konkretnym wcieleniem. Dlatego research AD zakłada opanowany koncept IAM i schodzi na poziom *tego* narzędzia: jak naprawdę działa logowanie w domenie, jak się je atakuje i jak broni.

---

## 2. Definicja kompetencji i jej rola w pracy

**Active Directory (usługa katalogowa Microsoftu — centralna baza kont, komputerów i uprawnień w sieci firmowej)** to miejsce, w którym firma trzyma odpowiedź na pytanie „kto jest kim i do czego ma dostęp". Gdy pracownik loguje się rano na komputer, to AD potwierdza jego tożsamość; gdy próbuje otworzyć udział sieciowy, to AD rozstrzyga, czy wolno. W praktyce AD to **baza zaufania całej organizacji** — i właśnie dlatego jest celem numer jeden napastnika.

AD robi cztery rzeczy, których pojedynczy serwer z hasłami nie potrafi:

1. **Przechowuje tożsamości i zasoby w hierarchii (katalog).** Konta użytkowników, komputery, grupy i zasady ułożone są w **domenie** (granica administracyjna i baza kont), pogrupowane w **jednostki organizacyjne** (OU — Organizational Unit, „foldery" na konta i komputery, do których przypina się polityki). Wiele domen tworzy **las** (forest — najwyższa granica zaufania; wewnątrz lasu domeny ufają sobie nawzajem).
2. **Uwierzytelnia (sprawdza tożsamość)** — głównie protokołem **Kerberos** (patrz §3, L2): zamiast wysyłać hasło przy każdym dostępie, użytkownik dostaje po zalogowaniu „bilet", którym potem posługuje się wobec usług.
3. **Autoryzuje (rozstrzyga dostęp)** przez członkostwo w grupach — to grupa, nie pojedyncze konto, dostaje uprawnienie do zasobu.
4. **Wymusza konfigurację i polityki** przez **zasady grup** (GPO — Group Policy Object, zestaw ustawień narzucany na konta/komputery w danym OU: polityka haseł, blokada konta, ustawienia zabezpieczeń, instalacje). Jedno GPO potrafi zmienić ustawienia tysięcy komputerów naraz.

**Czym AD NIE jest (rozróżnienie zawodowca):**
- AD to nie „serwer z hasłami" — to **rozproszona baza zaufania** replikowana między kontrolerami domeny (DC — Domain Controller, serwer obsługujący logowania i trzymający kopię katalogu). Przejęcie jednego kontrolera domeny = przejęcie całej domeny.
- AD ≠ Entra ID (dawniej Azure AD). AD (zwane też AD DS — Active Directory Domain Services) to katalog *lokalny*, oparty o Kerberos i protokół LDAP w sieci firmowej. Entra ID to usługa tożsamości *w chmurze* Microsoftu, oparta o protokoły webowe (OAuth/SAML). W większości firm działają **obie naraz** (środowisko hybrydowe) — to osobny, zaawansowany temat (L5).
- AD to nie to samo co IAM. IAM to *dyscyplina* (kto, do czego, jak długo). AD to *jedno narzędzie*, którym tę dyscyplinę realizuje się w świecie Microsoftu. Junior, który myli narzędzie z dyscypliną, klika ustawienia bez rozumienia, po co.

**Kto tego używa i jak wygląda dzień pracy.** Kompetencja AD jest na styku dwóch ról:
- **Administrator systemów / IT (brama wejścia):** zakłada konta, układa OU i grupy, pisze GPO, rozwiązuje problemy z logowaniem. To najczęstszy pierwszy kontakt juniora z AD.
- **Specjalista bezpieczeństwa / inżynier IAM:** patrzy na ten sam katalog oczami napastnika — szuka nadmiarowych uprawnień, słabych kont usługowych, błędnych delegacji; utwardza domenę, monitoruje podejrzane logowania (we współpracy z SIEM), planuje model warstw (tiering, §3 L4) i odzyskiwanie po ataku.

**Po co rynkowi ta kompetencja.** Statystyki branżowe od lat powtarzają: zdecydowana większość włamań korporacyjnych przechodzi w którymś momencie przez Active Directory — bo to tam są konta, którymi napastnik chce się poruszać po firmie (tzw. ruch boczny, lateral movement — przeskakiwanie z przejętego komputera na kolejne). Regulacje (NIS2 — dyrektywa o cyberbezpieczeństwie; DORA — rozporządzenie o odporności cyfrowej sektora finansowego) wymagają kontroli dostępu i rozliczalności, a w polskiej rzeczywistości IT oznacza to najczęściej właśnie utwardzony, monitorowany AD. Stąd stały popyt (4,3% ofert) i status „kompetencji, której pracodawca oczekuje wprost".

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". **L1 tej kompetencji domyka już projekt partii 1** `cyber-iam-active-directory-lab` — tutaj jest opisany skrótowo dla ciągłości, a research koncentruje się na L2–L5.

### L1 — Fundamenty: struktura katalogu i konta (3–6 h) — *pokryte w partii 1*

**Zakres wiedzy/umiejętności** (realizowany przez istniejący projekt `cyber-iam-active-directory-lab`):
- Budowa katalogu na własnym labie: domena, jednostki organizacyjne (OU), grupy, konta — na otwartoźródłowym **Samba AD** w kontenerze albo na darmowej wersji ewaluacyjnej Windows Server.
- Model najmniejszych uprawnień (least privilege — każdy dostaje dokładnie tyle dostępu, ile potrzebuje) odwzorowany na grupy.
- Polityka haseł i blokady konta jako GPO; eksport dowodu poleceniami PowerShell (`Get-ADUser`, `Get-ADGroupMember`) lub `samba-tool`/`ldbsearch`.

**Co student musi UMIEĆ ZROBIĆ:** zaprojektować i zbudować treningowy katalog z sensowną strukturą OU/grup i uzasadnionym modelem uprawnień (patrz rubryka projektu partii 1).

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **Grupa, nie konto, jest jednostką dostępu.** Amator nadaje uprawnienie wprost użytkownikowi; zawodowiec — grupie, bo tylko to jest utrzymywalne w skali. Konta przychodzą i odchodzą, model ról zostaje.
- **OU to nie foldery dla porządku — to punkty zaczepienia polityk (GPO).** Zła struktura OU = polityka trafia nie tam, gdzie trzeba.

### L2 — Zastosowanie: uwierzytelnianie w domenie (Kerberos, NTLM) (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Jak naprawdę działa logowanie w domenie.** Protokół **Kerberos** (domyślny w AD): po zalogowaniu użytkownik dostaje od kontrolera domeny **bilet startowy** (TGT — Ticket Granting Ticket, „przepustka, którą zdobywa się kolejne przepustki"); kiedy chce skorzystać z usługi (np. udziału plików), wymienia TGT na **bilet usługowy** (TGS — Ticket Granting Service ticket) dla tej konkretnej usługi. Hasło nie wędruje przy każdym dostępie — to klucz do bezpieczeństwa i, jak się okaże w L3, do ataków.
- **SPN** (Service Principal Name — nazwa, pod którą usługa jest znana w katalogu): wiąże konto usługowe z usługą, do której wydaje się bilety. Pojęcie krytyczne dla zrozumienia Kerberoastingu (L3).
- **NTLM** — starszy protokół uwierzytelniania (sprzed Kerberosa), wciąż obecny jako rezerwa. Operuje na **skrócie hasła** (hash — nieodwracalny „odcisk palca" hasła), co otwiera drogę do ataku Pass-the-Hash (L3).
- **Rola DNS i czasu.** Kerberos nie zadziała bez działającego DNS (system nazw — tłumaczy nazwy na adresy; AD jest od niego całkowicie zależny) i bez zsynchronizowanego zegara (dopuszczalne rozjechanie zwykle 5 minut — patrz niuans §4).
- **Odczyt zdarzeń logowania** z logu zabezpieczeń kontrolera domeny: żądanie TGT (zdarzenie 4768), żądanie TGS (4769), udane/nieudane logowanie (4624/4625) — fundament późniejszej detekcji.

**Co student musi UMIEĆ ZROBIĆ:** prześledzić na własnym labie pełną ścieżkę logowania Kerberos (TGT → TGS → dostęp do usługi); wskazać konta usługowe i ich SPN; odczytać z logu kontrolera, kto, kiedy i o jaki bilet poprosił; wyjaśnić, czym różni się uwierzytelnienie Kerberos od NTLM i dlaczego to drugie jest ryzykowniejsze.

**Profesjonalne niuanse:**
- **Bilet to nie hasło — i to jest dwusieczne.** Skoro biletem można się posługiwać bez hasła, to **skradziony bilet** działa jak skradzione hasło aż do wygaśnięcia. Cała klasa ataków (L3) polega na kradzieży biletu lub skrótu, nie hasła.
- **NTLM to dług, nie funkcja.** Każde miejsce, gdzie firma wciąż używa NTLM, to potencjalny Pass-the-Hash. Zawodowiec wie, *gdzie* w jego środowisku jeszcze żyje NTLM i dlaczego.
- **Konto usługowe ze stałym hasłem to mina.** Usługi (bazy, aplikacje) logują się własnymi kontami; jeśli takie konto ma słabe, niezmieniane hasło i SPN — staje się celem Kerberoastingu (L3). To bezpośredni pomost do kompetencji PAM i CyberArk (rotacja sekretów).

### L3 — Portfolio: ataki na katalog i obrona (18–30 h)

**Zakres wiedzy/umiejętności** (wyłącznie na własnym, izolowanym labie — patrz klauzula etyczno-prawna i §7):
- **Kerberoasting** (technika MITRE ATT&CK T1558.003): każdy uwierzytelniony użytkownik może poprosić o bilet usługowy dla konta z SPN i próbować **złamać go offline** (poza systemem, na własnym sprzęcie), odzyskując hasło konta usługowego. Obrona: silne, długie, rotowane hasła kont usługowych (najlepiej zarządzane konta usługowe — gMSA, group Managed Service Accounts, którym system sam rotuje hasło).
- **AS-REP Roasting** (T1558.004): konta z wyłączonym wstępnym uwierzytelnianiem Kerberos pozwalają zdobyć materiał do łamania bez żadnych poświadczeń.
- **Pass-the-Hash / Pass-the-Ticket** (T1550.002 / T1550.003): posłużenie się skradzionym skrótem hasła (NTLM) albo skradzionym biletem Kerberos zamiast hasła — rdzeń ruchu bocznego po firmie.
- **Golden Ticket / Silver Ticket** (T1558.001/.002): sfałszowanie biletu po przejęciu klucza konta `krbtgt` (konto, którego klucz podpisuje wszystkie bilety w domenie) — „klucz do królestwa".
- **Wykrywanie tych ataków w logach** (pomost do grupy SIEM): nietypowy wzorzec żądań 4769 (wiele biletów usługowych naraz = możliwy Kerberoasting), słabe typy szyfrowania biletu, logowania niezgodne z modelem warstw.
- **Obrona i utwardzanie (hardening):** gMSA dla kont usługowych, ograniczanie i porządkowanie delegacji Kerberos (patrz niuans §4), usuwanie nadmiarowych członków grup uprzywilejowanych, wyłączanie NTLM tam, gdzie się da, monitoring kont `krbtgt`.

**Co student musi UMIEĆ ZROBIĆ:** odtworzyć na własnym labie (np. otwartoźródłowe środowisko GOAD — Game of Active Directory, celowo podatny las do nauki) co najmniej dwa ataki (np. Kerberoasting + Pass-the-Hash), **udokumentować ślad, jaki zostawiają w logach**, a następnie wdrożyć i zweryfikować konkretną obronę (np. zamiana konta usługowego na gMSA, redukcja delegacji) z dowodem „przed/po". To poziom „portfolio na rozmowę o pracę": pokazuje, że kandydat rozumie atak *po to, by go wykryć i zatrzymać*.

**Profesjonalne niuanse:**
- **Uprawnienia się kumulują — i to jest niewidzialne.** Konto może trafić do grupy, która jest członkiem innej grupy, która ma prawa administracyjne („zagnieżdżanie grup", privilege creep — pełzanie uprawnień). Deklarowane uprawnienia ≠ rzeczywiste. Zawodowiec liczy *efektywny* dostęp, nie czyta listy grup.
- **Delegacja Kerberos to ukryta furtka.** Tzw. nieograniczona delegacja (unconstrained delegation) pozwala serwerowi działać „w imieniu" użytkownika — przy przejęciu takiego serwera napastnik podszywa się pod każdego, kto się na niego zalogował. Klasyczna, niedoceniana droga do przejęcia domeny.
- **„Cisza" w logach nie znaczy bezpieczeństwo.** Kerberoasting wygląda w logu jak zwykłe żądanie biletu — bez nastrojonej detekcji (próg, typ szyfrowania) nikt go nie zobaczy. To dosłowny pomost do kompetencji SIEM: AD jest *źródłem* logów, SIEM jest *miejscem ich korelacji*.

### L4 — Realny przypadek profesjonalny: utwardzanie domeny w warunkach firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *zastanej, „brudnej"* domeny (nadmiarowe uprawnienia narosłe latami, konta usługowe ze starymi hasłami, resztki NTLM, chaotyczne OU) i doprowadzenie jej do stanu utwardzonego bez psucia działania firmy — to realna codzienność, nie czysty lab.
- **Model warstw (tiering):** rozdzielenie kont na poziomy (Tier 0 — kontrolery domeny i konta zarządzające całą domeną; Tier 1 — serwery; Tier 2 — stacje użytkowników) tak, by konto administratora domeny **nigdy** nie logowało się na zwykłą stację (gdzie napastnik mógłby ukraść jego poświadczenia). To pojedyncza decyzja, która tnie większość dróg ruchu bocznego.
- Uporządkowanie GPO, wdrożenie zaleceń z uznanych baz utwardzania (Microsoft Security Baselines, przewodnik ANSSI dla AD), integracja monitoringu z SIEM.
- **Benchmark:** wynik studenta (zredukowane uprawnienia, wdrożony tiering, pokrycie detekcji ataków na AD) zestawiony z tym, co na tym samym przypadku osiągnął profesjonalista.

### L5 — Biegłość: tożsamość hybrydowa i odzyskiwanie lasu (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Tożsamość hybrydowa AD ↔ Entra ID:** świadome zarządzanie współistnieniem katalogu lokalnego i chmurowego (synchronizacja kont, ryzyka przenikania ataku między światami).
- **Plan odtworzenia lasu (forest recovery):** najtrudniejszy scenariusz w zawodzie — odbudowa AD po ataku ransomware, który zaszyfrował lub skompromitował kontrolery domeny. Obejmuje kopie zapasowe stanu systemu, izolowane odtwarzanie, reset klucza `krbtgt`. „Czy umiesz odbudować zaufanie całej firmy od zera" to pytanie dla seniora.
- **Strategia i ekonomia tożsamości:** kiedy warto migrować do chmury, jak utrzymać model warstw operacyjnie, jak pogodzić bezpieczeństwo z wygodą pracy (każde utwardzenie ma koszt operacyjny).
- **Benchmark** wobec rozwiązania realnego architekta tożsamości: nie „czy zabezpieczone", ale „czy zabezpieczone, odtwarzalne i da się tym żyć na co dzień".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Każdy punkt to realna decyzja lub pułapka, na której amator się wykłada.

1. **AD to baza zaufania całej firmy, nie „serwer z kontami".** Kto przejmie kontroler domeny, przejmuje wszystko. Z tego wynika cała filozofia obrony AD — chroni się nie pojedyncze konto, lecz integralność katalogu i kont, które nim zarządzają.

2. **Grupa, nie konto, jest jednostką dostępu — a grupy się zagnieżdżają.** Rzeczywiste uprawnienie konta wynika z całego łańcucha członkostw (privilege creep — pełzanie uprawnień). Zawodowiec audytuje *efektywny* dostęp; amator czyta listę grup i nie widzi, że trzy poziomy wyżej jest grupa administratorów.

3. **Kerberos: bilet zastępuje hasło — więc kradzież biletu zastępuje kradzież hasła.** Pass-the-Ticket, Pass-the-Hash, Golden/Silver Ticket — cała ta rodzina ataków bierze się z tego, że uwierzytelnienie opiera się na materiale, który da się ukraść z pamięci maszyny. Obrona to ograniczanie, gdzie poświadczenia w ogóle lądują (model warstw).

4. **Konta usługowe to najsłabsze ogniwo.** Konto usługowe ze stałym, słabym hasłem i SPN = gotowy cel Kerberoastingu, łamany offline bez alarmu. Rozwiązanie (gMSA, rotacja przez PAM) to bezpośredni pomost do kompetencji PAM i CyberArk.

5. **Delegacja Kerberos — potężna i niebezpieczna.** Nieograniczona delegacja pozwala przejętemu serwerowi podszywać się pod każdego, kto się na niego logował. To jedna z najczęściej przeoczanych dróg do przejęcia domeny; zawodowiec wie, które konta i serwery mają delegację i dlaczego.

6. **Model warstw (tiering) to pojedyncza decyzja, która tnie najwięcej ataków.** Administrator domeny logujący się na zwykłą stację zostawia tam swoje poświadczenia — i oddaje całą firmę przy pierwszym przejętym laptopie. Rozdzielenie Tier 0/1/2 jest niewygodne i właśnie dlatego amator je pomija.

7. **GPO to broń obosieczna.** Zasady grup wymuszają bezpieczeństwo na tysiącach maszyn — ale błędne GPO rozjeżdża się po całej domenie tak samo szybko, a przejęte GPO to wektor masowego ataku. Każda zmiana GPO to zmiana w skali; zawodowiec testuje na wąskim OU, zanim puści na wszystkich.

8. **Logi AD są źródłem, SIEM jest mózgiem.** Detekcja ataków na AD (Kerberoasting po wzorcu zdarzeń 4769, słabe szyfrowanie biletu, logowania łamiące tiering) ma sens dopiero w korelacji w SIEM. To uzasadnia kolejność: AD dostarcza dane, kompetencja SIEM je interpretuje.

9. **Czas i DNS to fundament, nie szczegół.** Kerberos przestaje działać przy rozjechanym zegarze (ponad ~5 minut) lub zepsutym DNS. Połowa „tajemniczych" problemów z logowaniem w domenie to czas albo nazwy. Dojrzały inżynier sprawdza je pierwsze.

10. **Konto `krbtgt` to klucz do królestwa.** Jego klucz podpisuje wszystkie bilety w domenie; jego przejęcie pozwala fałszować dowolne bilety (Golden Ticket). Rotacja klucza `krbtgt` to element odzyskiwania po incydencie — i wiedza, której amator nie ma.

11. **Utwardzanie ma koszt operacyjny — i to jest realny kompromis.** Każde wyłączenie NTLM, każdy tiering, każda restrykcja delegacji utrudnia coś użytkownikom lub aplikacjom. Zawodowiec waży bezpieczeństwo wobec działania firmy i dokumentuje *dlaczego* taki kompromis; amator albo nie utwardza, albo utwardza tak, że nic nie działa.

12. **Granica etyczno-prawna jest częścią kompetencji.** Techniki ataku (Kerberoasting, Pass-the-Hash) ćwiczy się **wyłącznie na własnym, izolowanym labie** (np. GOAD) — nigdy na cudzej ani firmowej domenie bez pisemnej zgody. Nieautoryzowany dostęp do systemu jest w Polsce przestępstwem (art. 267 Kodeksu karnego). Konta w labie to fikcyjne persony, nie dane realnych osób (RODO).

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty AD muszą pokryć *wszystkie* umiejętności z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student mógł samodzielnie wykonywać zadania administratora/inżyniera IAM w środowisku Microsoftu. Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L3 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| P1 | L1 | **IAM w praktyce: Active Directory i model najmniejszych uprawnień** — już istnieje: `cyber-iam-active-directory-lab` (partia 1) | Struktura katalogu, OU, grupy, least privilege, polityka haseł, dowód PowerShell/samba-tool | #1, #2 |
| P2 | L2 | **Ścieżka logowania Kerberos** — prześledzenie TGT → TGS → dostęp na własnym labie; wskazanie kont usługowych i SPN; odczyt zdarzeń 4768/4769 | Kerberos, TGT/TGS, SPN, NTLM vs Kerberos, rola DNS/czasu, odczyt logów | #3, #4, #9 |
| P3 | L3 | **Kerberoasting i obrona** — odtworzenie ataku na koncie usługowym na własnym labie, ślad w logach, wdrożenie gMSA i dowód „przed/po" | Kerberoasting, SPN, łamanie offline, gMSA, detekcja w logach | #4, #8 |
| P4 | L3 | **Ruch boczny: Pass-the-Hash / Pass-the-Ticket** — odtworzenie na labie, wykrycie w logach, obrona (tiering, ograniczanie NTLM) | Pass-the-Hash/Ticket, ruch boczny, NTLM, model warstw | #3, #6 |
| P5 | L3 | **Audyt nadmiarowych uprawnień i delegacji** — policzenie efektywnego dostępu, wykrycie zagnieżdżonych grup uprzywilejowanych i ryzykownej delegacji, plan naprawy | Privilege creep, efektywny dostęp, delegacja Kerberos | #2, #5 |
| (P6–P7) | L4–L5 | **ZAPOWIEDŹ** — utwardzanie „brudnej" domeny z tieringiem i baseline'ami + tożsamość hybrydowa / plan odtworzenia lasu; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #7, #10, #11 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 5 projektów** (z czego 1 już istnieje). L4–L5: 2 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku). Każdy projekt w fazie E3-A dostanie pełny `theory_md` z klauzulą etyczno-prawną, rubrykę (wagi = 100) i źródła wg kanonu README.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** P1 (istnieje) → P2 (Kerberos — bez tego nie ma sensu mówić o atakach na bilety) → P3 (Kerberoasting) → P4 (Pass-the-Hash) → P5 (audyt uprawnień/delegacji). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy — w szczególności P3/P4 zakładają zrozumiany Kerberos z P2.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Active Directory **nie ma sensu** bez wcześniej opanowanych fundamentów. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **Koncept IAM** (liść `IAM`, grupa „Tożsamość i zarządzanie dostępem") — czym jest tożsamość, konto, grupa, model najmniejszych uprawnień. Buduje go projekt partii 1 `cyber-iam-active-directory-lab`. **Wymagane przed L1 / równolegle z L1** (ten sam projekt domyka oba).
2. **Podstawy systemów operacyjnych** — `Windows` (AD to świat Microsoftu) i pomocniczo `Linux` (Samba AD, narzędzia). Rozumienie konta, usługi, procesu. **Wymagane przed L1.**
3. **Podstawy sieci, TCP/IP i DNS** (liście `Network`, `TCP/IP`) — Kerberos jest całkowicie zależny od DNS i czasu; bez rozumienia nazw, portów i protokołów student nie zdiagnozuje problemów z logowaniem. **Wymagane przed L2.**
4. **Kompetencja SIEM** (grupa „SIEM i Monitorowanie Zdarzeń", liść `SIEM`) — do detekcji ataków na AD w logach (L3). AD jest *źródłem* logów; ich korelacja to robota SIEM. **Wymagane/równoległe na L3.**
5. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 KK, praca wyłącznie na własnym/treningowym labie, fikcyjne persony). **Wymagane od L1, krytyczne od L3** (techniki ofensywne).

**Czego AD dostarcza jako prerekwizyt dla innych liści grupy i ścieżki:**
- **`PAM` i `CyberArk`** — to konta uprzywilejowane *w AD* (administratorzy domeny, konta usługowe) są tym, co PAM/CyberArk chroni i którym rotuje hasła. Bez rozumienia AD nie wiadomo, *czego* pilnuje PAM.
- **`SIEM` / `SOC` / `Incident Response`** — logi AD to jedno z najważniejszych źródeł detekcji; dochodzenie po incydencie niemal zawsze rekonstruuje ślad w AD.
- **`DevSecOps`** — konta usługowe i sekrety przenikają do potoków CI/CD; higiena kont usługowych zaczyna się w AD.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość.

**Dokumentacja oficjalna (Microsoft, darmowa):**
- Active Directory Domain Services — przegląd: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview
- Jak działa uwierzytelnianie Kerberos: https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview
- Group Policy (zasady grup) — przegląd: https://learn.microsoft.com/en-us/previous-versions/windows/desktop/policy/group-policy-objects
- Group Managed Service Accounts (gMSA — zarządzane konta usługowe): https://learn.microsoft.com/en-us/windows-server/security/group-managed-service-accounts/group-managed-service-accounts-overview
- Microsoft — model warstw / Tier 0 (Enterprise Access Model): https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model
- Microsoft Security Compliance Toolkit (bazy utwardzania / Security Baselines): https://learn.microsoft.com/en-us/windows/security/operating-system-security/device-management/windows-security-configuration-framework/security-compliance-toolkit-10
- Windows Server — darmowa wersja ewaluacyjna (lab): https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server
- Samba AD — otwartoźródłowa alternatywa (lab dla słabszego sprzętu): https://wiki.samba.org/index.php/Setting_up_Samba_as_an_Active_Directory_Domain_Controller

**Wiedza o atakach i obronie (otwarte, autorytatywne):**
- MITRE ATT&CK — Kerberoasting (T1558.003): https://attack.mitre.org/techniques/T1558/003/
- MITRE ATT&CK — Use Alternate Authentication Material / Pass-the-Hash (T1550.002): https://attack.mitre.org/techniques/T1550/002/
- MITRE ATT&CK — Golden/Silver Ticket (T1558.001 / T1558.002): https://attack.mitre.org/techniques/T1558/
- ANSSI — przewodnik utwardzania Active Directory (oficjalny, francuska agencja cyberbezpieczeństwa, wersja EN): https://www.cert.ssi.gouv.fr/uploads/guide-ad.html
- Atomic Red Team — bezpieczne odwzorowania technik (m.in. AD) do testu detekcji na własnym labie: https://github.com/redcanaryco/atomic-red-team

**Lab do ćwiczeń ataków (otwarte, legalne — wyłącznie na własnym środowisku):**
- GOAD — Game of Active Directory (celowo podatny las do nauki, otwartoźródłowy): https://github.com/Orange-Cyberdefense/GOAD

**Standardy i kontekst prawny EU/PL:**
- NIST SP 800-53 — kontrole dostępu (rodzina AC): https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- Dyrektywa NIS2 (cyberbezpieczeństwo, kontrola dostępu i rozliczalność): https://eur-lex.europa.eu/eli/dir/2022/2555
- TSUE, sprawa Breyer C-582/14 (adres IP / dane w logach jako dane osobowe): https://curia.europa.eu/juris/liste.jsf?num=C-582/14

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. **Czerwony punkt do weryfikacji:** projekty L3 uczą technik ofensywnych (Kerberoasting, Pass-the-Hash) — konieczna twarda klauzula etyczno-prawna jak w partii 1 (praca wyłącznie na własnym, izolowanym labie GOAD / Samba AD; fikcyjne persony, nie dane realnych osób; art. 267 KK). GOAD i Atomic Red Team to środowiska treningowe — wymagają jawnej noty „nie uruchamiać przeciw cudzej infrastrukturze". Linki do weryfikacji aktualności przed wejściem do `learning_resources`.

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów do zespołu IAM/administracji w polskiej firmie i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research powielał projekt partii 1 (budowanie katalogu).** CISO: „Macie już lab AD na L1 — jeśli drugi research uczy tego samego, marnujecie czas kandydata". **Poprawka:** jawnie oznaczyłam L1 jako *pokryte w partii 1* i przesunęłam ciężar tego researchu na L2–L5 (uwierzytelnianie, ataki, obrona, tiering). Nadbudowa nad konceptem IAM, nie powtórka.

2. **Słabość: brak realnego mechanizmu uwierzytelniania.** Pierwsza wersja mówiła „AD loguje użytkowników" bez Kerberosa. CISO: „Junior, który nie rozumie biletu Kerberos, nie zrozumie ani jednego ataku na AD — a to 80% incydentów". **Poprawka:** dodałam pełny L2 o Kerberosie (TGT/TGS/SPN), NTLM jako dług i osobny niuans #3 — to fundament, na którym stoi cały L3.

3. **Słabość: ataki bez obrony i bez wykrywania.** Pierwsza wersja wymieniała Kerberoasting jako ciekawostkę. CISO: „Nie zatrudniam pentesterów do zespołu obrony — chcę kogoś, kto atak *wykryje w logach i zatrzyma*". **Poprawka:** każdy projekt L3 wymaga teraz pary atak → ślad w logach → wdrożona obrona z dowodem „przed/po", a niuans #8 spina to z kompetencją SIEM. Przesunęłam akcent z ofensywy na detekcję i hardening.

4. **Słabość: pominięty model warstw (tiering) — najważniejsza decyzja obronna.** CISO: „Pierwsze, o co pytam na rozmowie: czy admin domeny loguje się na stację użytkownika. Jeśli kandydat nie rozumie tieringu, jest niegotowy". **Poprawka:** wyniosłam tiering do niuansu #6 i uczyniłam rdzeniem zakresu L4; powiązałam z Pass-the-Hash (P4), bo to ten atak tiering blokuje.

5. **Słabość: prerekwizyty i pomosty do innych kompetencji były dorozumiane.** CISO: „Bez DNS i czasu Kerberos nie działa, a bez SIEM nie wykryjecie ataku — kandydat musi wiedzieć, że to się łączy". **Poprawka:** §6 przepisałam jako jawny łańcuch z „wymagane przed L_n", dopisałam zależność od DNS/czasu (#9) i od SIEM (#8), oraz to, czego AD dostarcza dalej (PAM/CyberArk — konta uprzywilejowane; SIEM/IR — źródło logów).

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (AD, DC, OU, GPO, las/forest, Kerberos, TGT, TGS, SPN, NTLM, hash/skrót, DNS, Kerberoasting, AS-REP Roasting, Pass-the-Hash, Pass-the-Ticket, Golden/Silver Ticket, krbtgt, gMSA, delegacja, ruch boczny/lateral movement, privilege creep, tiering/model warstw, Entra ID, GOAD, CISO, NIS2, DORA). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU/PL uzna kandydata za przygotowanego" — spełniony dla roli administracja/junior IAM, jeśli autoring domknie 5 projektów L1–L3 z niuansami #1–#9. Pełna „zawodowość" (tiering w skali, odzyskiwanie lasu, hybryda — niuanse #10, #11) wymaga L4/L5 i zależy od struktury Ethana/Leo — research to zapowiada, nie udaje, że to już jest. To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
