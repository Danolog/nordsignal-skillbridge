# QG partii naprawczej 1E.R — projekty DS (5 sztuk)

**Prowadzący bramkę:** Oliver · **Data:** 2026-07-13
**Przedmiot:** `tools/content/ds-projects-partia-1r.json` — partia naprawcza projektów
Data Science (ADR-014 D7), 5 projektów: 4× L1 + 1× L2.
**Proces:** `docs/runbooks/projekty-sciezki-runbook.md` (bramki QG-1…QG-7).
**Recenzenci:** Ryan (CRCO — RODO/licencje) · Ethan (CTO — tech/inwarianty QG-2) ·
audyt QG-4 (portfolio-grade).

---

## WERDYKT PO NAPRAWACH: **GO** — partia NA PRODUKCJI (2026-07-13, wieczór)

Blokery K1–K5 naprawione w PR **#172** (wyłącznie `description`/`theory_md`/
`source_links`; rubryki, kompetencje, estymaty i materiały bit-w-bit nietknięte —
zweryfikowane maszynowo). Warunek Ethana spełniony (łatki K3/K4 w tym samym PR).
**Re-review Ryana (diff projektu LLM, zgodnie z jego zastrzeżeniem): GO Z NOTAMI**
— K1 i K2 zamknięte, etykieta linku warunków Gemini potwierdzona na żywej stronie,
zero nowych ryzyk. Noty Ryana (nieblokujące, do najbliższej iteracji treści):
(1) dodać link do polityki danych Groq albo zawęzić rekomendację fallbacku;
(2) w syntetycznych przykładach jawnie nakazać fikcyjne nazwiska i domeny
`example.com`.

### Rekord wykonania (audit log wg ADR-010 §10; polecenie Darka, wykonał Oliver)

- **Migracja 0037** (verified_competencies, Blok C — przy okazji tej samej sesji
  czerwonej linii): backup `prod-backup-pre-0037-20260713-2130`
  (`ep-jolly-wind-aljy93t8`, 2026-07-13T19:27Z) → journal-check spójny (37→38)
  → `db:migrate` DIRECT OK → weryfikacja: RLS ENABLE+FORCE, polityki
  `student_sees_own`(SELECT/app_student) + `owner_passthrough`(neondb_owner),
  grant tylko SELECT app_student, backfill 2 kredencjały z 1 submisji `verified`.
- **Ingest 1E.R**: backup `prod-backup-pre-ingest-1er-20260713`
  (`ep-hidden-hat-alxesr4j`, 2026-07-13T19:36Z) → bieg 1: wstawiono 0,
  **zaktualizowano 5**, błędów 0 (kompetencji 23, materiałów 21, linków 18) →
  bieg 2 identyczny (idempotencja) → weryfikacja treści na prodzie: teorie
  792/793/787 słów (próg 600–800), markery K1/K2/K3 w description LLM, K4 w teorii
  ML, K5 (borough) w description SQL, LLM source_links = 4, pokrycie liści DS
  (required) = 23, projektów `ds-*` = 10 → smoke: `/` 200, `/login` 200,
  `/api/curriculum` 401.
- **Retencja backupów:** oba branche Neona trzymać min. kilka dni, potem
  `neonctl branches delete`.

Otwarte pozostają: **D1/Blok B** (chmury hands-on — decyzja zapadła, realizacja
w partii 2), **QG-6** (żywy ekspert przed pierwszym receiptem — akcja Darka do
pilotażu), dług **1E.R2** i dług platformowy P1–P4 (P1/P2/P3 spłacone w PR #176,
P4 czeka na Blok B4).

Poniżej oryginalny werdykt NO-GO z 2026-07-13 (historia bramki).

---

## WERDYKT: **NO-GO** — 5 blokerów, wszystkie naprawialne w `theory_md`/`source_links`

Partia **nie idzie na produkcję** w obecnym kształcie. Blokery nie są kosmetyczne:
dwa z nich to antywzorce metodyczne w partii, której **całą racją bytu jest rygor
metodyczny**, a jeden to ryzyko prawne tej samej klasy, co błąd, dla którego 1E.R
w ogóle powstała (linkowanie do płatnego produktu).

**Żaden bloker nie wymaga dotknięcia rubryk, kompetencji ani modułów Sophii** —
naprawy mieszczą się w `theory_md`, `description` i `source_links`, więc nie
otwierają ponownie QG-2/QG-5 ani audytu pojemności D10.

### Kalibracja (rozbieżność recenzentów — rozstrzygnięta)

Ethan dał **GO z zastrzeżeniami**, Ryan i audyt QG-4 — **NO-GO**. Ethan ma rację
w przesłance: 1E.R jest **ściśle lepszy** od treści żyjącej na prodzie (rubryki
i kompetencje bit-w-bit identyczne z partią 1; zmiany wyłącznie addytywne), więc
blokowanie go za **dług odziedziczony** utrzymywałoby gorszą treść na produkcji.

Rozstrzygam na **NO-GO**, bo trzy z pięciu blokerów **nie są długiem
odziedziczonym**:
- B3 to **regresja wprowadzona przez samą 1E.R**,
- K1 i K2 to antywzorce, które ingest utrwaliłby w treści reklamowanej jako
  naprawiona metodycznie,
- K3 to ryzyko prawne wobec **osoby trzeciej** (dane osobowe rekrutera), nie wobec nas.

Koszt zdjęcia blokady: ~4 akapity tekstu. To nie uzasadnia wpuszczania ich na prod.

---

## Bramki

| Bramka | Kiedy | Status | Uzasadnienie |
|---|---|---|---|
| **QG-1** Benchmark pracodawców | przed autoringiem | **DZIEDZICZONA ✅** | Rubryki, kompetencje i `estimatedHours` **nietknięte** względem partii 1 (dowód: diff). Tabela „kryterium → oferta" ze specu partii 1 pozostaje w mocy. |
| **QG-2** Parytet akademicki | przed autoringiem | **DZIEDZICZONA ⚠** | Rubryki niezmienione, ale **inwarianty QG-2 są w rubrykach tylko 2/5 projektów** (dług partii 1 → ticket 1E.R2). Teoria 1E.R spełnia pkt 4 („dlaczego i kiedy") w 4/5 projektów. |
| **QG-3** Job-readiness | przed autoringiem | **DZIEDZICZONA ✅** | Zakres projektów niezmieniony. |
| **QG-4** Portfolio-grade | przed ingestem | **❌ NO-GO** | B1 (brak danych i licencji w LLM), B2 (brak metryki biznesowej w jedynym L2), B3 (regresja §7 — utrata osi różnicowania w SQL). |
| **QG-5** Teoria i źródła | przed ingestem | **⚠ GO Z NOTAMI** | Progi teorii i źródeł **spełnione we wszystkich 5** (L1: 723–799 słów przy progu 600–800; L2: 991 przy 800–1500; źródła 4–5). 21/21 zasobów z licencją i `verifiedAt`. Naruszenia: §3 (dataset LLM bez licencji → bloker B1/K2), §4 (`ds-chmura`: 4/4 zasoby za rejestracją, choć istnieją odpowiedniki bez), §1 (`ds-chmura` bez źródła-kanonu), §6 (NYC TLC bez fallbacku). |
| **QG-6** Sign-off eksperta domenowego | przed ingestem | **⛔ NIEWYKONANA** | Wymaga **praktyka spoza zespołu autorskiego** (senior/lead DS z firmy zatrudniającej juniorów) dla projektów L3 — decyzja i kontakt po stronie Darka. Nie da się zastąpić agentem. |
| **QG-7** Kalibracja i pilot | po publikacji | **N/D** | Po ingeście i pilocie. |

---

## BLOKERY (5)

### K1 · `ds-llm-strukturalna-ekstrakcja` — dane osobowe do darmowego tieru LLM
**Zgłosił: Ryan (KRYTYCZNY).** Brief zamawia ekstrakcję z realnych ogłoszeń o pracę
(te rutynowo zawierają nazwisko, e-mail i telefon rekrutera), każe pracować
**wyłącznie na darmowym tierze**, a pseudonimizację nakazuje **„przed commitem"** —
czyli już **po** wysłaniu surowych danych do API.

Warunki Google dla Unpaid Services (ai.google.dev/gemini-api/terms) mówią wprost:
input czytają **ludzcy recenzenci** i służy on rozwojowi produktów, oraz —
dosłownie — *„Do not submit sensitive, confidential, or personal information to the
Unpaid Services."* Instruujemy studenta, żeby zrobił dokładnie to, czego dostawca
zakazuje; przy okazji to transfer danych osobowych osoby trzeciej do państwa
trzeciego bez podstawy prawnej.

**Naprawa:** anonimizacja/pseudonimizacja **przed pierwszym wywołaniem API** — jako
krok briefu; dwa zdania do teorii („darmowy tier = Twój input może być czytany
i użyty do trenowania"). Domyślnie skierować na korpus zredagowany/syntetyczny.

### K2 · `ds-llm-strukturalna-ekstrakcja` — zero datasetów z licencją
**Zgłosili: Ryan (KRYTYCZNY) + audyt QG-4 (B1) — niezależnie.** `source_links`
zawiera **wyłącznie dokumentację API** (rate-limits Gemini, cennik, Groq). Student ma
zdobyć ~30 „realnych ogłoszeń" bez wskazanego, legalnego źródła — najprostsza droga
to scraping portali pracy wbrew ich regulaminom, **na naszą instrukcję**. QG-5 §3
nazywa licencję przy datasecie **warunkiem merge'a**.

**Naprawa:** wskazać konkretny korpus z otwartą licencją (nazwa + URL licencji
w `source_links`) albo zamówić korpus syntetyczny generowany przez studenta.

### K3 · `ds-llm-strukturalna-ekstrakcja` — strojenie promptu na zbiorze testowym
**Zgłosił: Ethan (KRYTYCZNY).** Teoria każe iterować prompt i po każdej zmianie
mierzyć metryki — na **jedynym** zbiorze etykietowanym (~30 przykładów, bez podziału
dev/test). To leakage w przebraniu: raportowana trafność jest obciążona
optymistycznie, a student uczy się nawyku, którego **inwariant QG-2 nr 2 zabrania
w sąsiednim projekcie tej samej partii**. Brakuje też baseline'u: teoria *twierdzi*,
że LLM bije regex, i nigdy nie każe tego **zmierzyć** (inwariant nr 1).

**Naprawa:** podział ~30 przykładów na dev (≈10 — iterujesz) i test (≈20 — dotykasz
raz, na koniec) + baseline regexowy dla ≥1 pola. Mieści się w istniejących
kryteriach rubryki.

### K4 · `ds-pierwszy-model-predykcyjny` — projekt nie mówi, co przewidywać
**Zgłosili: Ethan (KRYTYCZNY) + audyt QG-4 (D6).** UCI Online Retail to zbiór
transakcyjny **bez kolumny-celu**. Ani opis, ani rubryka, ani teoria nie nazywają
zadania — a moduł M-ML deleguje ten wybór do briefingu projektu, który go nie
podejmuje. Gorzej: najbardziej naturalny cel (anulowana faktura — `InvoiceNo`
z prefiksem `C`) niesie **podręcznikowy wyciek** (`Quantity < 0` to idealny
predyktor → trafność 1.0 → student „wygrywa", ucząc się złego nawyku).

**Naprawa:** 2–3 sankcjonowane zadania + jawne nazwanie pułapki wycieku przy
anulacjach. To jednocześnie naturalna oś różnicowania per student (§7).

### K5 · `ds-sql-analiza-przejazdow` — REGRESJA wprowadzona przez 1E.R
**Zgłosił: audyt QG-4 (B3).** Nowa teoria przypina konkretny miesiąc TLC
(*„miesiąca nie zmieniaj"*), a spec partii §5.6 wskazuje **„inny miesiąc TLC" jako
jedyną zadeklarowaną oś różnicowania artefaktów** w tym projekcie. W partii 1
przypięcia nie było. Efekt: wszyscy studenci dostają ten sam plik i te same
deliverables → artefakty niemal identyczne, antyklisza platformowa (QG-4 §7)
przestaje działać.

**Naprawa:** zostawić przypięcie schematu (uzasadnione — TLC zmienia schemat między
latami), ale dać briefowi inną oś: przypisana strefa/borough albo przypisane pytanie
analityczne.

---

## PUNKT DECYZJI DLA DARKA (nie do rozstrzygnięcia przez zespół)

### D1 · Verified Receipt na Azure/GCP/AWS za esej porównawczy
**Zgłosili: Ryan (W4) + Ethan (W2) — niezależnie.** `ds-chmura-wdrozenie-modelu` ma
`Azure`, `GCP` i `AWS` jako kompetencje **`required`** (= „co projekt domyka"), choć
student **żadnej z tych chmur nie dotyka** — pisze mapę wdrożenia, bo ścieżka jest
świadomie bezkartowa. Matchmaker rekomenduje więc ten projekt studentowi z luką
„Azure", której projekt nie zamknie.

> **Sprostowanie (2026-07-13).** Pierwotne zdanie tej sekcji — „paszport wystawi
> Verified Project Receipt na trzy chmury za esej porównawczy" — było **nieprawdziwe**:
> mostek „zaliczony projekt → kompetencja w paszporcie" dziś nie istnieje (zaliczenie
> projektu nie zapisuje żadnej kompetencji; sekcja „Opanowane" paszportu pochodzi
> wyłącznie z samooceny studenta). Ryzyko jest realne, ale **przyszłe** — zaktywuje
> się z chwilą zbudowania mostka (plan napraw, blok C).

To dotyka rdzenia obietnicy produktu (receipt jest oświadczeniem wobec pracodawcy),
dotyczy treści **już żyjącej na prodzie** i nie wstrzymuje 1E.R — ale wymaga decyzji
**przed komunikacją ścieżki DS na zewnątrz**. Opcje:
- (a) uznać, że liść domykany jest „na poziomie architektury wdrożenia", i tak go
  nazwać w receipt;
- (b) wrócić do hands-on (tracimy card-free — czyli cofamy naprawę 1E.R);
- (c) zejść do 21/24 pokrycia liści i zaktualizować test kontraktowy.

**Decyzja właściciela (2026-07-13): wariant (b) w wersji rozszerzonej** — chmury mają
być pokryte hands-on, nawet za cenę karty płatniczej (Azure 35%, AWS 30%, GCP 19%
ofert). Realizacja: trzy projekty `ds-endpoint-*` + `ds-chmura` przełożony na
bezkartowe `CI/CD`+`MLOps` (plan napraw, blok B).

### QG-6 — ekspert domenowy
Bramka wymaga praktyka **spoza zespołu autorskiego**. Nie zastąpi go agent. Bez niej
DoD partii jest formalnie niedomknięty (dotyczy L3; w tej piątce L3 nie ma, ale
partia 1 jako całość ma dwa).

> **Doprecyzowanie (2026-07-13, runbook v1.1):** QG-6 dotyczy L3 (+ zalecany losowy
> L2) — **1E.R nie ma ani jednego L3, więc ta bramka jej nie blokuje.** Sign-off
> partii 1 wykonał agent-persona, co runbook v1.1 uznaje za dopuszczalne **przed
> pilotażem**; sign-off żywego praktyka (senior/lead DS, ~2 h, checklist z runbooka)
> jest wymagany, **zanim pierwszy Verified Receipt trafi do pracodawcy** — dotyczy
> `ds-mlops-pipeline-treningowy`, `ds-capstone-strumien-i-raport` (L3) + losowego L2,
> w tym co najmniej jednego z przyszłych projektów chmurowych. Akcja Darka
> (kanał: WSB Merito / kontakty z EduTech Masters).

---

## DŁUG (ticket **1E.R2** — rewizja rubryk pod inwarianty QG-2; z Sophią)

Nie blokuje 1E.R (rubryki są identyczne jak na prodzie), ale wymaga skoordynowanej
zmiany rubryk + modułów + testu pokrycia:

- **W1.** Inwarianty QG-2 poza rubrykami 3/5 projektów: brak „Ograniczeń" w EDA, SQL,
  LLM; brak baseline'u w LLM. DoD runbooka żąda „inwarianty **w rubrykach**".
  Sprzężenie: wagi rubryk są cytowane dosłownie w audytach pojemności D10 Sophii →
  każde przeważenie wymaga re-audytu modułów.
- **W2.** `ds-chmura` (jedyny L2) bez **metryki biznesowej** w rubryce — runbook §5
  wymusza dla L2+ zdanie „[technika] + [metryka] + [wynik/wpływ]"; rubryka ma tylko
  metryki inżynierskie (latencja, dostępność). *(Audyt QG-4 klasyfikuje to jako
  bloker B2; klasyfikuję jako dług, bo rubryka jest niezmieniona względem produ —
  ale do naprawy w 1E.R2, nie „kiedyś".)*
- **W3.** `ds-chmura` bez kryterium jakości danych / walidacji wejścia (QG-4 §2,
  wymóg L2+), mimo że teoria ma właściwy odpowiednik (train/serve skew).
- **W4.** `Statystyka` jako `required` w projekcie ML bez kryterium sprawdzającego
  wnioskowanie statystyczne (rdzeń akademicki QG-2 pkt 5).
- **W5.** `ds-chmura` bez źródła-kanonu (QG-5 §1: kanon + docs + pogłębienie) i 4/4
  zasoby za rejestracją mimo istniejących odpowiedników bez (QG-5 §4).
- **W6.** NYC TLC bez fallbacku (QG-5 §6) — pojedynczy przypięty plik na CloudFront,
  strona oficjalna zwraca 403 automatom.
- **W7.** Błędny graf prerekwizytów: `SQL` jako `acquired` w projekcie EDA, choć
  M-SQL jest **po** M-EDA i SQL w tym projekcie nie występuje.
- **W8.** Projekt L2 wchodzi „na zimno" — Docker/Streamlit/CI-CD wymagane rubryką,
  nieuczone w żadnym atomie (jedyny projekt partii bez mostka kodowego w teorii).

---

## DŁUG PLATFORMOWY (poza treścią — dla Ethana/Leo)

- **P1. Reviewer nie może zaliczyć dwóch ciężkich kryteriów.** Pipeline oceny czyta
  **wyłącznie drzewo plików i ich zawartość** — nie odwiedza URL-i i nie czyta
  historii commitów — a prompt każe zerować kryterium bez dowodu. Skutek: „sensowna
  historia commitów" (20% wagi w 4 projektach) i „publiczny, klikalny endpoint"
  (**25% wagi jedynego L2**) są dziś **niemożliwe do zaliczenia**.
- **P2. Metadane compliance nie docierają do studenta.** UI źródeł renderuje typ +
  tytuł (`truncate`) + host; `license` / `registrationRequired` / `verifiedAt`
  **nie są wyświetlane**, a ostrzeżenia wszyte w tytuł zostaną obcięte. Treść spełnia
  QG-5 §4 („oznaczyć w opisie zasobu"), produkt tego oznaczenia **nie dostarcza**.
- **P3. Kontrakt README platformy vs treść.** Hard-check wymaga sekcji
  `cel / uruchomienie / wnioski` od wszystkich projektów; żadna treść o nich nie
  wspomina, a L2 dyktuje inny układ README → student idący za briefem dostanie
  `hard_check_failed`.
- **P4. Test kontraktowy** czyta tylko `ds-projects-partia-1.json`. Po upsercie 1E.R
  po slugu prod rozjedzie się z plikiem pilnowanym przez test (5 z 10 slugów).
  Zalecenie: glob `ds-projects-partia-*.json` + assercja unikalności slugów.

---

## Co przeszło bez zastrzeżeń

- **Faza E (walidacja narzędziem ingestu) — 3/3 zielone** (uruchomione, nie
  zadeklarowane): wagi rubryk sumują się do 100 we wszystkich 5; wszystkie 14 nazw
  kompetencji to **dosłowne liście** ścieżki Data Scientist (0 literówek — ryzyko #1
  z E1); pokrycie po upsercie zostaje **23/24 liści** (niepokryty tylko `Snowflake`,
  świadomie wg specu).
- **Zero datasetów-klisz** (zakaz Titanic/Iris/MNIST/Boston) — dane realnie brudne,
  co treść **dowodzi**, a nie deklaruje („mimo deklaracji «brak braków»… około jedna
  czwarta wierszy ma pusty CustomerID").
- **≥1 polski zbiór na partię** — GUS BDL (CC BY 4.0). ✅
- **Zero zasobów wymagających karty płatniczej** — ścieżka bezkartowa jest domyślna,
  nie awaryjna, i wchodzi do rubryki jako punktowane kryterium. To jest dokładnie ta
  lekcja, dla której 1E.R powstała.
- **Zero kopiowania treści** z licencji restrykcyjnych (PDSH CC BY-NC-ND, ISLP
  All Rights Reserved, Pro Git CC BY-NC-SA) — teorie są autorskie, a etykieta ISLP
  niesie wprost „linkuj, nie kopiuj".
- **Higiena kluczy API** — panel Sekretów Colab, `userdata.get`, „historia Gita
  pamięta wszystko, nawet po usunięciu pliku".
- **Estymaty godzin** zgodne z kalibracją QG-2 (L1 3–6 h, L2 8–14 h) i **co do
  godziny** z modułami Sophii.

---

## Ścieżka do GO

1. Naprawić **K1–K5** w `theory_md` / `description` / `source_links` (~4 akapity;
   zero dotknięcia rubryk).
2. Ryan: **wystarczy diff projektu LLM**, nie potrzeba pełnego re-review.
3. Ethan: łatki K3/K4 muszą wejść **w tym samym PR** co 1E.R.
4. Ingest prod = [CZERWONA LINIA] wg ADR-010: sign-off + backup gałęzią Neona +
   transakcyjny SQL.
5. **QG-6** (ekspert domenowy) i **D1** (Verified Receipt) — decyzje Darka; QG-6 nie
   blokuje tej piątki (brak L3), D1 nie blokuje ingestu, ale blokuje komunikację
   ścieżki na zewnątrz.
