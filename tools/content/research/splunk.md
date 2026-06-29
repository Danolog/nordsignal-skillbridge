# Research kompetencji: Splunk

> **Status:** research liścia-narzędzia w ETAP E3 — nadbudowuje nad wzorcem `tools/content/research/siem.md` (golden-example). Splunk jest *implementacją* konceptu SIEM — ten plik nie powtarza teorii SIEM, tylko dokłada to, co specyficzne dla narzędzia.
> **Wersja:** v1.0 · 2026-06-29 · autor: Sophia (Product Owner)
> **Recenzja przed autoringiem:** Ryan (rzetelność/RODO/legalność źródeł, §7) → Ethan/Leo (mapowanie nazw na dosłowne liście `career-model.ts`, struktura L4/L5).
> **Framework źródłowy:** `docs/product/skillbridge-etap-e3-autoring-framework-v0.1.md` (v0.3). North Star §0.1 jest nadrzędny nad całym tym plikiem.

---

## 1. Nagłówek — kompetencja i dane rynkowe

| Pole | Wartość |
|---|---|
| **Kompetencja (dosłowny liść modelu)** | `Splunk` |
| **Ścieżka** | Cybersecurity Specialist |
| **Grupa kontekstowa** | „SIEM i Monitorowanie Zdarzeń" (`unionShare` grupy: **18,3%** — udział grupy w ofertach ścieżki) |
| **Popyt liścia (`demandPercentage`)** | **4,3%** ofert ścieżki wymienia Splunk |
| **Liczba ofert (`offers`)** | **16** |
| **`kind`** | `tool` (konkretne narzędzie klasy SIEM, nie kompetencja koncepcyjna — patrz §2) |
| **`lift`** | 12,23 (siła powiązania liścia z tą ścieżką) |
| **Źródło danych rynku** | JustJoinIT, migawka 2026-02, kategoria Security (zob. pamięć projektu: rynek pracy = realne oferty, nie sylabus) |

**Pozycja w grupie** (te same dane rynkowe — kontekst dla pokrycia i prerekwizytów; liście pokrewne to osobne researche):

| Liść grupy | demand % | oferty | kind |
|---|---|---|---|
| SIEM (liść-rdzeń, osobny plik) | 10,8 | 40 | concept |
| SOC | 5,1 | 19 | concept |
| **Splunk** (ten plik) | 4,3 | 16 | tool |
| EDR / XDR | 3,2 | 12 | tool |
| SOAR | 2,4 | 9 | concept |
| Microsoft Defender | 1,6 | 6 | tool |
| CrowdStrike | 1,6 | 6 | tool |
| Incident Response | 1,1 | 4 | concept |

**Wniosek dla autoringu:** Splunk to **najczęściej wymagane konkretne narzędzie** klasy SIEM w całej ścieżce (4,3% ofert — więcej niż Defender i CrowdStrike razem wzięte). Rynek pyta o nie *imiennie*: ogłoszenia piszą „znajomość Splunk", a nie „znajomość dowolnego SIEM". To uzasadnia osobny research narzędziowy obok rdzenia SIEM. **Relacja jest jednokierunkowa i twarda:** liść-rdzeń `SIEM` (`kind: concept`) uczy *co i dlaczego* (zbieranie, normalizacja, korelacja, detekcja); ten liść (`kind: tool`) uczy *jak to zrobić w Splunku* — język zapytań SPL, indeksy, typy źródeł, pulpity, alerty, ekonomia licencji. Research narzędzia **zakłada** opanowany koncept SIEM i go nie powtarza (patrz §6 — Splunk ma SIEM jako prerekwizyt-rdzeń).

---

## 2. Definicja kompetencji i jej rola w pracy

**Splunk** to komercyjna platforma do zbierania, przeszukiwania i analizy danych maszynowych (logów — śladów tego, co działo się w systemie), używana w bezpieczeństwie jako system klasy **SIEM (Security Information and Event Management — zbieranie i korelowanie zdarzeń bezpieczeństwa)**. Mówiąc wprost: Splunk to *konkretny produkt*, w którym analityk bezpieczeństwa realnie wykonuje pracę opisaną w research SIEM. Tam, gdzie SIEM jako koncept mówi „skoreluj zdarzenia", Splunk mówi *jak* — przez język zapytań i mechanikę indeksów.

**Cztery filary Splunka, których musi dotknąć każdy analityk:**

1. **Zaciąg i indeksowanie (ingest + indexing — wczytanie i ułożenie danych do szybkiego wyszukania).** Dane wpadają do Splunka, dostają etykietę `sourcetype` (typ źródła — mówi Splunkowi, jak rozumieć dany format logu), trafiają do `index` (indeks — logiczny pojemnik na dane, jednostka uprawnień i retencji) i są rozbijane na zdarzenia z wyciągniętymi polami.
2. **SPL (Search Processing Language — język zapytań Splunk).** Sercem narzędzia jest język, w którym pisze się wyszukiwania. Składnia to potok (pipeline): wynik jednej komendy płynie do następnej przez znak `|`. Np. „znajdź zdarzenia → policz wg użytkownika → posortuj malejąco".
3. **Pulpity i alerty (dashboards + alerts).** Zapytanie SPL można zapisać jako alert (uruchamiany cyklicznie, wyzwala powiadomienie przy spełnieniu warunku) albo jako kafelek pulpitu (wizualizacja na żywo). To zamienia jednorazowe wyszukanie w stały mechanizm wykrywania.
4. **Wiedza aplikacyjna (knowledge objects — obiekty wiedzy: pola wyliczane, tagi, wyszukania zapisane, modele danych).** Warstwa, która sprawia, że surowe logi stają się sensowne i wielokrotnego użytku — m.in. mapowanie na wspólny model pól **CIM (Common Information Model — wspólny model pól Splunka)**, dzięki któremu gotowe reguły działają niezależnie od źródła.

**Czym Splunk NIE jest (rozróżnienie zawodowca):**
- Splunk to **nie jedyny SIEM** i nie synonim SIEM. Rynek to też Microsoft Sentinel (z językiem KQL — Kusto Query Language), Elastic, IBM QRadar. Zawodowiec rozumie, że *koncept* (SIEM) przenosi się między narzędziami, a SPL to dialekt — kompetencja przenośna, nie ślepy zaułek jednego producenta.
- Splunk to **nie tylko bezpieczeństwo.** To ogólna platforma analizy danych maszynowych (używana też w IT operations, monitorowaniu aplikacji). Dla nas liczy się zastosowanie SIEM, ale rekruter docenia świadomość, że narzędzie jest szersze.
- SPL to **nie SQL.** Wygląda podobnie (komendy, agregacje), ale to język potokowy nad indeksem pełnotekstowym, nie nad tabelami relacyjnymi. Przenoszenie nawyków z SQL 1:1 prowadzi do wolnych, drogich zapytań (patrz niuanse §4).

**Kto tego używa i jak wygląda dzień pracy.** Splunk to codzienny warsztat **analityka SOC (Security Operations Center — centrum monitorowania bezpieczeństwa)** i **inżyniera SIEM/detekcji**. Analityk SOC żyje w pasku wyszukiwania SPL — to jego główne narzędzie triage'u (segregacji alertów). Inżynier SIEM dba o zaciąg, `sourcetype`, mapowanie CIM, koszt licencji i wydajność zapytań. W ogłoszeniach „Splunk" pojawia się zwykle obok „SIEM", „SOC", czasem certyfikatów producenta (Splunk Core Certified Power User / Admin).

**Po co rynkowi ta kompetencja.** Splunk jest jednym z najbardziej rozpowszechnionych SIEM w dużych firmach EU (banki, telekomy, sektor publiczny — czyli właśnie ci, których dotyczą regulacje NIS2 i DORA, patrz research SIEM §2). Junior, który *realnie umie pisać SPL i nastroić alert w Splunku*, wchodzi do SOC bez kilkutygodniowego rozbiegu na samym narzędziu — i to jest dokładnie to, za co pracodawca płaci premię nad „znam SIEM teoretycznie".

---

## 3. Mapa zakresu wiedzy per poziom L1 → L5

Zasada: każdy poziom dokłada zakres, którego poprzedni nie obejmował, i **nie zakłada wiedzy spoza poziomów wcześniejszych ani spoza prerekwizytów z §6** (niezmiennik §4 frameworku). Czasowniki operacyjne mówią, co student musi *umieć zrobić* — nie „znać". Ponieważ Splunk to narzędzie nadbudowujące nad konceptem SIEM, **każdy poziom zakłada odpowiadający mu poziom SIEM jako już opanowany** i dokłada wyłącznie warstwę narzędziową.

### L1 — Fundamenty: środowisko Splunk, zaciąg, pierwsze wyszukania w SPL (3–6 h)

**Zakres wiedzy/umiejętności:**
- Uruchomienie darmowego środowiska: **Splunk Free** (lokalnie, limit 500 MB zaciągu na dobę — w zupełności wystarcza do nauki) albo **Splunk Cloud Trial** (wersja próbna w chmurze). Pojęcie, czym jest instancja, gdzie jest pasek wyszukiwania, gdzie ustawienia.
- **Zaciąg danych tutorialowych:** wczytanie oficjalnego zbioru danych ćwiczeniowych Splunka albo publicznego zbioru logów; nadanie poprawnego `sourcetype` i wybór `index`. Zrozumienie różnicy: `index` to *gdzie* dane leżą, `sourcetype` to *jak* są rozumiane.
- **Podstawy SPL:** zakres czasu (time picker), wyszukiwanie po słowie i po polu (`status=404`), potok `|`, komendy `stats count`, `top`, `sort`, `table`, `head`. Pojęcie, że SPL to potok — wynik płynie z lewej do prawej.
- Odczytanie z logów prostego zdarzenia bezpieczeństwa w Splunku: nieudane logowania (`stats count by user`), ruch z jednego adresu, kody błędów serwera WWW.

**Co student musi UMIEĆ ZROBIĆ:** uruchomić Splunk Free i wczytać zbiór logów z poprawnym `sourcetype` do wskazanego `index`; napisać 3–5 zapytań SPL filtrujących, zliczających i sortujących zdarzenia; słownie opisać, co dane zdarzenie znaczy dla bezpieczeństwa.

**Profesjonalne niuanse na tym poziomie (czego amator nie widzi):**
- **`index` i `sourcetype` to nie kosmetyka — to fundament wydajności i uprawnień.** Dane wrzucone do złego indeksu albo z błędnym `sourcetype` „znikają" dla zapytań, które ich szukają tam, gdzie być powinny. To pierwsza pułapka juniora: „wczytałem dane, a wyszukiwanie nic nie zwraca".
- **Czas w Splunku ma dwie warstwy** (jak w SIEM §3 L1): `_time` (kiedy zdarzenie się stało) vs czas indeksowania (kiedy dotarło). Zły zakres w time pickerze = puste wyniki przy danych, które *są* w indeksie. To narzędziowa wersja niuansu „znacznik czasu kłamie" z research SIEM.

### L2 — Zastosowanie: pola, model CIM, alerty i triage w Splunku (8–14 h)

**Zakres wiedzy/umiejętności:**
- **Wyciąganie pól (field extraction — rozbiór logu na pola w Splunku):** pola automatyczne vs własne; pojęcie `rex` (wyciąganie pola wyrażeniem) i pól wyliczanych. Dlaczego praca „po polach", a nie „po surowym tekście", jest szybsza i pewniejsza.
- **Komendy SPL warstwy detekcji:** `eval` (wyliczenie nowego pola), `where`, `stats` z grupowaniem i oknem, `dedup`, `eventstats`, `bucket`/`bin` (kubełkowanie czasu — grupowanie zdarzeń w okna). To narzędzia, którymi zamienia się opis zagrożenia na zapytanie.
- **Mapowanie na CIM (Common Information Model — wspólny model pól Splunka):** sprowadzenie pól z różnych źródeł do jednego słownika (np. żeby `src_ip` z zapory i `source_address` z serwera nazywały się tak samo), tak by reguła działała niezależnie od źródła. To narzędziowy odpowiednik niuansu normalizacji z SIEM §4.
- **Zapisanie wyszukania jako alertu (saved search → alert):** typy uruchamiania (cykliczny vs ciągły/real-time), warunek wyzwolenia (próg, liczba wyników), akcja alertu (powiadomienie, dopisanie do indeksu). Świadomy dobór częstotliwości — bo alert real-time kosztuje moc.
- **Triage w Splunku:** od alertu do wyszukania kontekstowego („pokaż mi wszystko z tego hosta w oknie ±15 min"), nadanie priorytetu, decyzja prawdziwy pozytyw (true positive) / fałszywy alarm (false positive).

**Co student musi UMIEĆ ZROBIĆ:** wyciągnąć własne pole z surowego logu w Splunku; zmapować dwa źródła na wspólny model CIM; napisać regułę detekcji w SPL z uzasadnionym progiem i oknem czasowym (np. wykrycie rozpylania haseł — password spraying); zapisać ją jako alert ze świadomie dobraną częstotliwością; przeprowadzić triage zwracając się zapytaniem kontekstowym.

**Profesjonalne niuanse:**
- **`stats` vs `transaction` — wybór, na którym junior topi licencję.** Komenda `transaction` (grupowanie powiązanych zdarzeń w „transakcję") jest wygodna, ale bardzo droga obliczeniowo; w większości przypadków da się to zrobić tańszym `stats by`. Zawodowiec sięga po `transaction` świadomie i rzadko.
- **Alert real-time to luksus, nie domyślny tryb.** Alert uruchamiany w trybie ciągłym (real-time) obciąża system stale; alert cykliczny (co X minut) daje 95% wartości za ułamek kosztu. Junior ustawia wszystko jako real-time i dziwi się, że Splunk zwalnia.
- **CIM to nie „dodatek dla porządku" — bez niego gotowe reguły i aplikacje Splunka (Splunk Enterprise Security) po prostu nie zadziałają.** Reguła oczekuje pola `user`, a źródło ma `account_name` — bez mapowania CIM reguła milczy mimo danych w indeksie.

### L3 — Portfolio: wydajne SPL, korelacja, pulpity i pokrycie detekcji (18–30 h)

**Zakres wiedzy/umiejętności:**
- **Wydajne SPL i dyscyplina kosztu zapytania:** filtrowanie *jak najwcześniej* (zawężenie indeksu, `sourcetype` i czasu przed potokiem komend), różnica między komendami strumieniowymi a generującymi, świadomość, że szerokie wyszukanie po całym indeksie bez filtra to klasyczny grzech. To narzędziowy fundament ekonomii Splunka (§4).
- **Korelacja wielu źródeł w SPL:** łączenie zdarzeń przez `stats by` na wspólnym polu albo przez wyszukania podrzędne (subsearch) i `lookup` (wzbogacenie z tabeli odniesienia — np. lista znanych złych adresów). Reguła łącząca log uwierzytelniania + log EDR + log zapory w jeden alert wyższej pewności (narzędziowa realizacja korelacji z SIEM §4).
- **Pulpity i metryki SOC w Splunku:** zbudowanie pulpitu (dashboard) z wizualizacjami i policzenie miar pracy SOC — MTTD (Mean Time To Detect — średni czas wykrycia), MTTR (Mean Time To Respond — średni czas reakcji), liczba fałszywych alarmów na regułę.
- **Mapowanie detekcji na MITRE ATT&CK** (otwarta baza taktyk i technik napastników — patrz research SIEM §4/§7) i świadomość, że reguły **Sigma** (otwarty, neutralny format reguł detekcji) tłumaczą się na SPL — czyli logika nie jest uwięziona w Splunku.
- **Higiena licencji i wydajności w skali:** pojęcie, że Splunk rozlicza się od wolumenu zaciągu (GB/dzień) lub mocy (patrz §4), oraz że wyszukania zaplanowane (scheduled searches) konkurują o zasoby — strojenie ich harmonogramu to realna część pracy inżyniera.

**Co student musi UMIEĆ ZROBIĆ:** napisać zestaw skorelowanych reguł SPL zmapowanych na ATT&CK, ze świadomie pokazaną luką pokrycia; zoptymalizować zapytanie tak, by pokazać różnicę kosztu przed/po (np. czas wykonania, liczba przeskanowanych zdarzeń); zbudować pulpit SOC z metrykami MTTD/MTTR i liczbą FP na regułę; wyjaśnić, jak ta sama logika wyglądałaby w Sigmie/KQL (dowód przenośności). To poziom „portfolio na rozmowę o pracę analityka SOC ze Splunkiem".

**Profesjonalne niuanse:**
- **Wydajne zapytanie to oszczędność liczona w pieniądzu, nie estetyka.** W Splunku „filtruj wcześnie" (zawęź indeks/sourcetype/czas, zanim zaczniesz przetwarzać) to nie porada stylistyczna — to różnica między zapytaniem za grosze a zapytaniem, które zajmuje cały klaster. Zawodowca poznaje się po tym, ile danych jego zapytanie *musiało* dotknąć.
- **`join` w Splunku to ostatnia deska ratunku, nie pierwszy odruch.** Junior z nawykami SQL sięga po `join`; w Splunku jest on wolny i ma ciche limity (ucina wyniki po przekroczeniu progu — i nikt go o tym nie informuje). Korelację robi się przez `stats by` albo `lookup`, a `join` rezerwuje na wyjątki.
- **Pulpit, który nikt nie czyta, to martwy koszt.** Pulpit odświeżający ciężkie zapytania co minutę dla nikogo to spalanie licencji. Zawodowiec dobiera odświeżanie i zakres do realnego użycia.

### L4 — Realny przypadek profesjonalny: wdrożenie/strojenie detekcji w Splunku w warunkach firmy (ZAPOWIEDŹ ZAKRESEM)

> **Uwaga (§3 frameworku):** struktura L4/L5 — referencyjny wynik profesjonalisty + mechanizm benchmarku (porównania) — jest projektowana **osobno przez Ethana/Leo** (rozszerzenie schemy `projects`, którego dziś nie ma). Research tu tylko **zapowiada zakres**, nie definiuje struktury projektu.

**Co obejmowałby zakres L4** (realny problem, jaki rozwiązuje profesjonalista):
- Przyjęcie *nieuporządkowanego, realnego* zestawu logów z wieloma źródłami o złej jakości (brakujące pola, niespójne `sourcetype`, śmieci) i doprowadzenie go w Splunku do stanu zdatnego do detekcji — poprawne `sourcetype`, wyciąganie pól, mapowanie CIM. To codzienność inżyniera SIEM, nie czysty zbiór tutorialowy.
- Zaprojektowanie i nastrojenie zestawu reguł SPL pod *konkretny scenariusz zagrożenia* istotny dla branży (np. wyłudzenie dostępu w firmie finansowej pod kątem DORA) tak, by kolejka alertów była obsługiwalna realnym zespołem SOC.
- **Benchmark:** wynik studenta (zestaw reguł SPL, redukcja fałszywych alarmów, pokrycie ATT&CK, MTTD na symulacji, koszt zapytań) zestawiony z tym, co osiągnął profesjonalista na tym samym przypadku.

### L5 — Biegłość: architektura wdrożenia Splunka i ekonomia licencji (ZAPOWIEDŹ ZAKRESEM)

**Co obejmowałby zakres L5** (dowód biegłości, nie ćwiczenie):
- **Architektura wdrożenia Splunka:** rola forwarderów (agentów zbierających logi), indekserów i głowicy wyszukiwania (search head); decyzja, *co* zaciągać, a co filtrować/odrzucić *przed* indeksowaniem (np. przez Splunk Edge Processor / pipeline), świadoma wobec kosztu.
- **Ekonomia licencji w skali:** modele rozliczeń Splunka (od wolumenu GB/dzień vs od mocy obliczeniowej — Workload Pricing), warstwy przechowywania (hot/warm/cold/frozen — gorąca/ciepła/zimna/zamrożona), zgodność retencji z wymogami prawnymi (NIS2/DORA/RODO). Decyzja architekta: który log jest wart swojego gigabajta.
- **Detection-as-code w Splunku:** reguły i obiekty wiedzy w repozytorium z kontrolą wersji i testami, wdrażane jak oprogramowanie — dojrzałość zespołu detekcji.
- **Benchmark** wobec rozwiązania realnego architekta SIEM: nie „czy wykrywa", lecz „czy wykrywa za rozsądny koszt licencji i da się to utrzymać".

---

## 4. Profesjonalne niuanse — sedno North Star (co odróżnia zawodowca od amatora)

To jest najważniejsza sekcja researchu — materiał na głębię projektów. Niuanse SIEM-konceptu (alert fatigue, korelacja, blind spoty, retencja, granica prawna) obowiązują tu w całości — patrz research SIEM §4. Poniżej **specyficzne dla Splunka** decyzje i pułapki, których nie ma w research konceptu.

1. **Filtruj wcześnie albo płać.** Najważniejszy nawyk SPL: zawęź `index`, `sourcetype` i zakres czasu *zanim* zaczniesz przetwarzać dane komendami. Szerokie wyszukanie po całym indeksie bez filtra przeszukuje miliardy zdarzeń, by potem wyrzucić 99,99% — to wolne i drogie. Amator pisze zapytanie „od wyniku"; zawodowiec „od filtra".

2. **`stats` zamiast `transaction`, `lookup`/`stats by` zamiast `join`.** Wygodne komendy (`transaction`, `join`) są kosztowne i mają ciche limity (ucinają wyniki bez ostrzeżenia). Te same wyniki niemal zawsze da się uzyskać tańszymi komendami strumieniowymi. To rozdzielnik amatora od inżyniera, który rozumie *jak* Splunk liczy.

3. **`index` i `sourcetype` to architektura, nie szczegół.** Dobór indeksów decyduje o uprawnieniach (kto widzi jakie dane — istotne dla RODO), retencji i wydajności. Wrzucanie wszystkiego do jednego indeksu z byle `sourcetype` to dług, który mści się przy każdym wyszukaniu i każdym audycie dostępu.

4. **CIM (wspólny model pól) to warunek działania gotowych treści.** Aplikacje detekcyjne Splunka (np. Splunk Enterprise Security) i przenośne reguły oczekują znormalizowanych nazw pól. Dane niezmapowane na CIM są „niewidzialne" dla tych reguł mimo obecności w indeksie. Zawodowiec mapuje na CIM; amator pisze reguły pod surowe pola jednego źródła.

5. **Ekonomia licencji liczona w gigabajtach (lub mocy).** Splunk historycznie rozlicza się od wolumenu zaciągu (GB/dzień), nowsze modele — od mocy obliczeniowej (Workload Pricing). W obu „zaciągnij wszystko" rujnuje budżet i topi sygnał w szumie. Decyzja *co* indeksować i *co* odfiltrować przed indeksowaniem (Edge Processor, Ingest Actions) to realna kompetencja, nie ciekawostka. To narzędziowa konkretyzacja niuansu #9 z research SIEM.

6. **Wyszukania zaplanowane konkurują o zasoby.** Dziesiątki alertów ustawionych „co 5 minut o równej godzinie" uderzają w Splunk jednocześnie i zatykają kolejkę (skipped searches — pominięte uruchomienia, czyli niewykryte zdarzenia). Rozłożenie harmonogramu (schedule windows) to cicha, ale realna część strojenia SOC.

7. **Real-time to nie domyślny tryb.** Alerty i pulpity w trybie ciągłym (real-time) obciążają system stale. W większości przypadków cykliczne uruchamianie daje tę samą wartość detekcyjną za ułamek kosztu. Junior nadużywa real-time „dla pewności" i degraduje całe wdrożenie.

8. **SPL ≠ SQL — potok nad indeksem pełnotekstowym, nie tabele.** Przenoszenie nawyków SQL (myślenie joinami, brak filtra czasu, agregacja przed filtrem) daje wolne, drogie zapytania. Zawodowiec myśli „potok i filtr wcześnie", nie „zapytanie tabelaryczne".

9. **Przenośność kompetencji — Splunk to dialekt, nie więzienie.** Wartość rynkowa rośnie, gdy student rozumie, że logika detekcji (Sigma, MITRE ATT&CK) przenosi się między Splunkiem a Sentinel/KQL czy Elast'em. Zawodowiec uczy się *konceptu w narzędziu*; amator uczy się klikania w jednym GUI i jest bezradny przy zmianie pracodawcy.

10. **Uprawnienia i dane osobowe w indeksach (RODO).** Logi w Splunku bywają danymi osobowymi (adres IP — wyrok TSUE Breyer, C-582/14; nazwy użytkowników). Indeksy i role w Splunku to mechanizm minimalizacji dostępu; maskowanie pól wrażliwych przy zaciągu (Ingest Actions) to element rzemiosła, nie „dodatek RODO". Granica prawna jak w research SIEM §4 #12 (art. 267 Kodeksu karnego — praca wyłącznie na własnym/treningowym systemie) obowiązuje w całości.

---

## 5. Reguła pokrycia → szkic puli projektów

**Reguła (§2 frameworku, twarda):** projekty Splunka muszą pokryć *wszystkie* umiejętności narzędziowe z §3 (L1–L3 teraz; L4–L5 po rozszerzeniu struktury), tak by student umiał realnie pracować w Splunku jako analityk SOC / inżynier SIEM — **nie powtarzając** pokrycia konceptu SIEM (to robią projekty liścia-rdzenia SIEM). Poniżej **mapa, co musi pokryć autoring** — to nie pełne projekty (te powstają w fazie E3-A wg kanonu README).

**Zasada granularności:** jeden projekt = jeden domknięty zakres umiejętności + jego niuanse. Nie upychamy całego L2 w jeden projekt.

| # | Poziom | Roboczy zakres projektu | Umiejętności z §3, które domyka | Niuanse z §4 |
|---|---|---|---|---|
| S1 | L1 | **Pierwsze wyszukania w Splunku** — zaciąg danych tutorialowych z poprawnym `index`/`sourcetype`, podstawy SPL (`stats`, `top`, `sort`), odczyt prostego zdarzenia (częściowo istnieje: `cyber-siem-pierwsze-alerty-splunk` w partii 1 — patrz nota niżej) | Środowisko, zaciąg, `index`/`sourcetype`, podstawy SPL | #1, #3 |
| S2 | L1 | **Pułapka indeksu i czasu** — czemu „wczytałem dane, a nic nie widać": zły indeks/sourcetype, zły zakres czasu, `_time` vs czas indeksowania | `index`/`sourcetype` jako fundament, czas w Splunku | #3 |
| S3 | L2 | **Pola i model CIM** — wyciąganie pól (`rex`, pola wyliczane), zmapowanie 2 źródeł na wspólny model CIM, reguła działająca na obu | Field extraction, CIM, praca po polach | #4 |
| S4 | L2 | **Reguła detekcji w SPL + alert** — np. rozpylanie haseł (password spraying): `eval`/`stats`/`bin`, uzasadniony próg i okno, zapis jako alert ze świadomą częstotliwością | Komendy detekcyjne SPL, alert, częstotliwość | #2, #7 |
| S5 | L2 | **Triage w Splunku** — od alertu do wyszukania kontekstowego (host ±15 min), priorytet, TP vs FP | Triage narzędziowy, wyszukanie kontekstowe | #2 |
| S6 | L3 | **Wydajne SPL — koszt zapytania przed/po** — to samo wyszukanie zoptymalizowane (filtr wcześnie, `stats` zamiast `transaction`/`join`), pomiar różnicy | Wydajne SPL, dyscyplina kosztu | #1, #2, #8 |
| S7 | L3 | **Korelacja wielu źródeł w SPL** — `stats by` / `lookup` łączące uwierzytelnianie + EDR + zaporę w alert wyższej pewności; mapowanie na ATT&CK + nota o Sigmie | Korelacja w SPL, ATT&CK, przenośność | #2, #9 |
| S8 | L3 | **Pulpit i metryki SOC w Splunku** — dashboard + MTTD/MTTR + FP na regułę, świadome odświeżanie | Pulpit, metryki SOC, higiena odświeżania | #6, #7 |
| (S9–S11) | L4–L5 | **ZAPOWIEDŹ** — realny brudny zbiór + scenariusz branżowy (DORA), architektura forwarder/indexer/search head + ekonomia licencji + retencja, detection-as-code; z benchmarkiem profesjonalisty | Zakres L4/L5 z §3 | #5, #10 |

**Szacowana pula dla pełnego pokrycia L1–L3: ok. 7–8 projektów** (z czego część zakresu S1 dotyka istniejący projekt partii 1 — patrz nota). L4–L5: 2–3 projekty, po rozszerzeniu struktury. Liczba wynika z pokrycia, nie z odgórnego targetu (§2 frameworku).

> **Nota o nakładaniu się z partią 1 i z rdzeniem SIEM (do decyzji Ethana/Leo w autoringu):** istniejący projekt `cyber-siem-pierwsze-alerty-splunk` (partia 1, L1) ma jednocześnie `SIEM`, `SOC` i `Splunk` jako `required`. Część zakresu S1 jest więc już pokryta. Autoring liścia Splunk powinien **nadbudować, nie zdublować**: skupić projekty narzędziowe na tym, czego rdzeń SIEM i ten istniejący projekt nie domykają — wydajność SPL, CIM, ekonomia licencji, architektura wdrożenia. Granicę „co należy do SIEM, a co do Splunka" rozstrzyga reguła z §1: koncept (co/dlaczego) → liść SIEM; mechanika narzędzia (jak w Splunku) → ten liść.

**Łańcuch zależności między projektami (kolejność autoringu, §4 frameworku):** S1→S2 (indeks/czas) → S3 (pola/CIM) → S4 (reguła/alert) → S5 (triage) → S6 (wydajność) → S7 (korelacja/ATT&CK) → S8 (pulpit/metryki). Żaden projekt nie wprowadza pojęcia, którego nie objął wcześniejszy ani prerekwizyt z §6.

---

## 6. Prerekwizyty — łańcuch zależności (niezmiennik §4 frameworku)

Splunk jako narzędzie **nie ma sensu** bez wcześniej opanowanego konceptu SIEM i fundamentów ścieżki. Co musi być wcześniej (liście potwierdzone w `career-model.ts`):

1. **Koncept SIEM (liść-rdzeń `SIEM`)** — *kluczowy i nadrzędny prerekwizyt narzędziowy.* Student musi rozumieć, *co* robi SIEM (zbieranie, normalizacja, korelacja, detekcja, triage, próg/okno, MITRE ATT&CK) i *dlaczego*, zanim uczy się, *jak* zrobić to w Splunku. Research SIEM jest rdzeniem; ten plik nadbudowuje. **Wymagane przed L1 Splunka** (cały koncept), pogłębiane równolegle na L2–L3.
2. **Podstawy sieci i TCP/IP** (liść `TCP/IP`, `Network`) — bez adresu IP, portu, protokołu student nie zinterpretuje logu zapory w SPL. **Wymagane przed L1.**
3. **Czytanie i pojęcie logu** — co to log, jakie ma pola; fundament logów uwierzytelniania domyka projekt `cyber-python-automatyzacja-logow` (partia 1, liść `Python`). **Wymagane/równoległe na L1.**
4. **Podstawy systemów operacyjnych** — `Linux` i/lub `Windows` (logi tych systemów to główne źródło zaciągu do Splunka); projekty partii 1 (`cyber-hardening-linux-bash`, `cyber-iam-active-directory-lab`) tworzą tę bazę. **Wymagane przed L2** (interpretacja zdarzeń logowania, procesów, usług).
5. **Pojęcie tożsamości i dostępu** — `IAM` / `Active Directory` (kto się loguje, czym jest konto i grupa) — żeby zrozumieć reguły uwierzytelniania pisane w SPL. **Wymagane przed L2.**
6. **Klauzula etyczno-prawna** — jak w każdym projekcie cyber (art. 267 Kodeksu karnego, praca wyłącznie na własnym/treningowym systemie). **Wymagane od L1.**

**Czego Splunk dostarcza jako prerekwizyt dla innych liści grupy:** Splunk jako *konkretne narzędzie* jest naturalnym środowiskiem wykonawczym dla `SOC` (analityk SOC pracuje w Splunku), bywa też platformą, na której nadbudowuje `SOAR` (orkiestracja reakcji — patrz research SOAR; Splunk ma własny moduł SOAR) oraz `Incident Response` (dochodzenie korzysta z danych w Splunku). W kolejności autoringu grupy Splunk idzie **po** rdzeniu SIEM, bo go zakłada.

---

## 7. Źródła (rzetelne, legalne, open/oficjalne — do akceptacji Ryana)

Wszystkie publiczne, darmowe lub otwarte; nadają się jako `learning_resources`/`source_links` w projektach. Ryan weryfikuje legalność i jakość. Część pokrywa się z research SIEM (te same dane ćwiczeniowe i bazy wiedzy) — tu dochodzi **dokumentacja specyficzna dla Splunka**.

**Dokumentacja Splunka (oficjalna, darmowa):**
- Splunk — wczytanie danych tutorialowych: https://docs.splunk.com/Documentation/Splunk/latest/SearchTutorial/GetthetutorialdataintoSplunk
- Splunk — referencja języka SPL (Search Reference): https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual
- Splunk — przewodnik wyszukiwania (Search Manual): https://docs.splunk.com/Documentation/Splunk/latest/Search/GetstartedwithSearch
- Splunk Common Information Model (CIM — wspólny model pól): https://docs.splunk.com/Documentation/CIM/latest/User/Overview
- Splunk — wprowadzanie danych (Getting Data In, `index`/`sourcetype`): https://docs.splunk.com/Documentation/Splunk/latest/Data/WhatSplunkcanmonitor
- Splunk — alerty (Alerting Manual): https://docs.splunk.com/Documentation/Splunk/latest/Alert/Aboutalerts
- Splunk — pulpity (Dashboards and Visualizations): https://docs.splunk.com/Documentation/Splunk/latest/Viz/Aboutthismanual
- Splunk Free (darmowa instancja do nauki): https://docs.splunk.com/Documentation/Splunk/latest/Admin/MoreaboutSplunkFree
- Splunk — optymalizacja wyszukań (Search optimization, koszt zapytań): https://docs.splunk.com/Documentation/Splunk/latest/Search/Aboutoptimization

**Dane do ćwiczeń (publiczne, otwarte — wprost pod Splunk):**
- Splunk Boss of the SOC (BOTS v3) — publiczny zbiór danych SOC do ćwiczeń w Splunku: https://github.com/splunk/botsv3
- loghub — publiczne zbiory logów systemowych (do zaciągu): https://github.com/logpai/loghub
- SecRepo — zbiory danych bezpieczeństwa: https://www.secrepo.com/

**Wiedza o zagrożeniach i detekcji (otwarte, autorytatywne — wspólne z SIEM):**
- MITRE ATT&CK (baza taktyk i technik napastników): https://attack.mitre.org/
- Sigma (otwarty, neutralny format reguł, tłumaczony na SPL — dowód przenośności): https://github.com/SigmaHQ/sigma
- Splunk Security Content / detekcje (otwarte repozytorium reguł Splunka): https://github.com/splunk/security_content
- Atomic Red Team (bezpieczne odwzorowania technik ATT&CK do testu detekcji): https://github.com/redcanaryco/atomic-red-team

**Standardy i kontekst prawny EU/PL (wspólne z SIEM, do klauzul):**
- NIST SP 800-92 „Guide to Computer Security Log Management": https://csrc.nist.gov/pubs/sp/800/92/final
- TSUE, sprawa Breyer C-582/14 (dynamiczny adres IP jako dana osobowa): https://curia.europa.eu/juris/liste.jsf?num=C-582/14
- Dyrektywa NIS2: https://eur-lex.europa.eu/eli/dir/2022/2555
- Rozporządzenie DORA: https://eur-lex.europa.eu/eli/reg/2022/2554

> **Do uwagi Ryana:** wszystkie pozycje to materiały oficjalne/otwarte; brak źródeł pirackich. Splunk Free i Splunk Cloud Trial to legalne, darmowe ścieżki do laba — projekty muszą jasno wskazać darmowy wariant, żeby student nie był zmuszony do płatnej licencji. Zbiór BOTS v3 zawiera dane mogące być danymi osobowymi (adresy IP, nazwy użytkowników) — wymaga klauzuli maskowania jak w partii 1. Linki do weryfikacji aktualności przed wejściem do `learning_resources` (dokumentacja Splunka pod „/latest/" bywa przekierowywana między wersjami — sprawdzić przy autoringu).

---

## 8. Self-critique (§8 QA) — krytyk: CISO firmy benchmarkowej

Wcieliłam się w najsurowszego krytyka — dyrektora bezpieczeństwa (CISO — Chief Information Security Officer), który zatrudnia juniorów SOC z rynku EU i ma ocenić, czy po projektach z tego researchu poleciłby platformę. Pięć konkretnych słabości pierwszej wersji i co poprawiłam:

1. **Słabość: research narzędziowy dublował koncept SIEM.** Pierwsza wersja powtarzała teorię korelacji, triage'u, ATT&CK. CISO: „nie płacę za to, żeby junior dwa razy słuchał, co to korelacja — płacę, żeby umiał ją *napisać w SPL*". **Poprawka:** §1 i §6 jawnie ustawiają SIEM jako prerekwizyt-rdzeń, a §3/§4 dokładają wyłącznie warstwę narzędziową (SPL, CIM, indeksy, ekonomia licencji). Niuanse konceptu odsyłam do research SIEM §4, nie przepisuję.

2. **Słabość: brak ekonomii licencji Splunka.** CISO: „junior, który zaciąga wszystko i ustawia alerty real-time, w tydzień wydrenuje mi licencję i zatka klaster — to pierwszy błąd, który tępię". **Poprawka:** dodałam niuanse #5 (GB/dzień, Workload Pricing), #6 (skipped searches), #7 (real-time to luksus) i wbudowałam je w L3/L5 oraz projekty S6 i S9–S11. To realny rozdzielnik amator↔zawodowiec specyficzny dla Splunka.

3. **Słabość: SPL traktowany jak SQL.** CISO: „połowa juniorów pisze `join` i `transaction` wszędzie, bo myślą bazami danych — i ich zapytania kładą system". **Poprawka:** dodałam niuanse #2 i #8 (`stats`/`lookup` zamiast `join`/`transaction`, potok zamiast tabel) i osobny projekt S6 z pomiarem kosztu przed/po — student musi *zobaczyć* różnicę, nie tylko o niej przeczytać.

4. **Słabość: ryzyko „więzienia jednego narzędzia".** CISO: „nie chcę kogoś, kto umie tylko klikać w Splunku — za rok mam Sentinel i jest bezradny". **Poprawka:** dodałam niuans #9 (przenośność: Splunk to dialekt, Sigma/ATT&CK przenoszą logikę) i wpisałam do S7 wymóg pokazania, jak ta sama reguła wygląda w Sigmie/KQL. `kind: tool` nie znaczy „ucz się narzędzia w oderwaniu od konceptu".

5. **Słabość: nakładanie się z istniejącym projektem partii 1 było zamiecione.** CISO: „jeśli macie już projekt «pierwsze alerty w Splunku», to po co kolejny o tym samym?". **Poprawka:** dodałam jawną notę w §5 — autoring ma **nadbudować, nie zdublować** `cyber-siem-pierwsze-alerty-splunk`; granicę „SIEM vs Splunk" rozstrzyga reguła z §1 (koncept vs mechanika narzędzia). Decyzję o ostatecznym podziale zakresu oddaję Ethanowi/Leo w autoringu — uczciwie oznaczone, nie ukryte.

**Sprawdzenie tłumaczenia żargonu (reguła firmy, sekcja 3 CLAUDE.md):** przejrzałam cały plik — każdy skrót i termin angielski rozwinięty po polsku przy pierwszym użyciu (Splunk, SIEM, SOC, SPL, `index`, `sourcetype`, ingest/zaciąg, indexing, field extraction, `rex`, `eval`, `stats`, `transaction`, `join`, `lookup`, `bin`/`bucket`, subsearch, CIM, knowledge objects, saved search, alert real-time/cykliczny, scheduled/skipped searches, dashboard, MTTD, MTTR, true/false positive, triage, MITRE ATT&CK, Sigma, KQL, forwarder/indexer/search head, Workload Pricing, hot/warm/cold/frozen, Ingest Actions/Edge Processor, detection-as-code, CISO, NIS2, DORA, RODO). Polskie nazwy tam, gdzie nie tracą precyzji.

**Sprawdzenie poprzeczki zawodowej (North Star §0.1):** test akceptacji „czy pracodawca EU uzna kandydata za przygotowanego do roli analityka SOC ze Splunkiem" — spełniony, jeśli autoring domknie projekty L1–L3 (S1–S8) z niuansami narzędziowymi #1–#9 *na bazie* opanowanego konceptu SIEM. Niuanse #5, #10 (ekonomia licencji w skali, architektura, RODO w indeksach) wymagają L4/L5 — research je zapowiada, ale pełna „zawodowość" Splunka domknie się dopiero po strukturze L4/L5 (zależność od Ethana/Leo). To uczciwie oznaczone, nie zamiecione.

---

## 9. Wynik do orkiestratora

Sekcje zwrócone osobno w wiadomości do orkiestratora (poza plikiem).
