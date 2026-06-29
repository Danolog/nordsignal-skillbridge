# Redesign panelu po zalogowaniu — spec v0.3 (render grupowy + domknięcie 5 widoków)

**Wersja:** v0.3 · 2026-06-28 · **Autor:** Mila (Product Designer nordsignal)
**Status:** ROZSZERZENIE zatwierdzonego LOCK v0.2 (sign-off Darka 2026-06-26). v0.3 **niczego z v0.2 nie podważa** — dokłada warstwę „funkcje danych" (grupy kompetencji z kontekstem, rozróżnienie narzędzie/koncepcja, komentarze grup w panelu) i domyka pięć widoków do **makiet hi-fi** gotowych do obejrzenia przez Darka i wdrożenia przez Jacka. Towarzyszą mu pliki HTML (makiety klikalne) — patrz sekcja 9.
**Zakres:** te same powłoka + 5 widoków co v0.2. Nowość: każdy widok pokazuje **grupy kompetencji** (klastry z rynku) zamiast płaskiej listy, etykiety samooceny zależne od typu kompetencji, a komentarze grup są widoczne też w panelu (mapa, analiza luk) — nie tylko w onboardingu.
**Wejścia:** `docs/design/redesign-panel-po-logowaniu-mila-v0.2.md` (LOCK, źródło prawdy kierunku) · `src/lib/db/data/career-model.json` (realne grupy cyber: `areas[].name/unionShare/description/type` + `leaves[].name/kind/demandPercentage`) · `tools/content/cyber-projects-partia-1.json` (4 realne projekty L1 cyber) · plan ETAP C (kroki C1–C5) · decyzje wiążące sesji (grupy z kontekstem + `kind`).

**Żargon (CLAUDE.md §3 — tłumaczę przy pierwszym użyciu).** *render grupowy* = sposób wyświetlania, w którym kompetencje są pokazane w klastrach (grupach) z nagłówkiem, a nie jedną długą płaską listą. *grupa / klaster kompetencji* = zestaw powiązanych umiejętności rynku (np. „SIEM i monitorowanie zdarzeń"), policzony z ofert pracy. *`unionShare` / „% udziału grupy"* = odsetek ofert ścieżki, w których wystąpiła **przynajmniej jedna** kompetencja z tej grupy (siła całego obszaru na rynku, nie pojedynczej technologii). *`kind` / typ kompetencji* = czy dana pozycja to **narzędzie** (konkretny program/technologia, którą się „obsługuje", np. Splunk, Linux) czy **koncepcja** (wiedza/podejście, które się „rozumie i stosuje", np. GRC, DevSecOps). *opis kontekstu grupy* = jedno-dwa zdania „po co się tego uczysz" — tłumaczy studentowi rolę całego obszaru na rynku. *liść* = pojedyncza kompetencja w grupie. *% popytu (liścia)* = odsetek ofert ścieżki, w których wystąpiła **ta jedna** kompetencja. Pozostały żargon (panel, token, Kanban, passa, kotwica, rubryka, USP, stany pusty/ładowania/błędu, kontrast, focus, czytnik ekranu) — patrz sekcja „Żargon" w v0.2.

---

## Changelog

- **v0.3 (2026-06-28):** ROZSZERZENIE LOCK v0.2 o warstwę danych i domknięcie makiet hi-fi.
  - **Render grupowy (nowość przekrojowa).** Wszędzie, gdzie v0.2 pokazywało płaską listę kompetencji, v0.3 wprowadza **klaster z nagłówkiem grupy**: nazwa grupy + **% udziału grupy** (`unionShare`) + **opis kontekstu** („po co się tego uczysz"), a pod spodem kompetencje (liście) z ich własnym % popytu. Dotyczy onboardingu (krok kompetencji), mapy kompetencji i analizy luk.
  - **Etykiety samooceny zależne od typu (`kind`).** Narzędzie → skala „nie znam / uczę się / **obsługuję** / biegle". Koncepcja → skala „nie znam / poznaję / **rozumiem** / stosuję samodzielnie". Jeden wzorzec wizualny (trzy/cztery kropki + słowo), różny słownik — bo „obsługuję Splunk" i „rozumiem GRC" to inne rzeczy.
  - **Komentarze grup w panelu (decyzja Darka, plan pkt 5).** Opis kontekstu grupy, widoczny dotąd tylko w onboardingu, **wraca w panelu**: w mapie kompetencji (przy grupowaniu węzłów) i w analizie luk (nad luką). „Cel nauki cały czas przed oczami", nie tylko na wejściu.
  - **Domknięcie 5 widoków do makiet hi-fi.** v0.2 opisała widoki słowami i ASCII; v0.3 dokłada **5 samodzielnych plików HTML** (sekcja 9) z realną treścią cyberbezpieczeństwa — Darek otwiera w przeglądarce i widzi panel, nie opis.
  - **Treść = realne dane cyber.** Zamiast „lorem": 10 grup cyber z `career-model.json` (SIEM 18,3%, Administracja systemami 16,2%, Python 14,8%, GRC 13,7%, Chmura 13,5%, IAM 12,7%, DevSecOps 10,8%, Sieci 9,2%, AppSec 4,9%, SQL 3,5%) + 4 realne projekty L1 z `cyber-projects-partia-1.json`. Cel studenta: „Specjalista ds. cyberbezpieczeństwa".
- **v0.2 (2026-06-26):** LOCK „Spokojny ekspert" — patrz osobny plik. (Niezmieniony — v0.3 go nie nadpisuje.)

---

## 1. Co z LOCK v0.2 zostaje NIETKNIĘTE (czerwona granica tego specu)

v0.3 jest **addytywne**. Wszystko poniżej z v0.2 obowiązuje bez zmian — makiety hi-fi realizują to 1:1:

- **Paleta `--ed-*`** (sekcja 2.2 v0.2): kremowy `#FAF6F1`, atrament `#1B1917`, bursztyn `#D0891E`, bursztyn-tekst `#8F5A0F`, powierzchnia `#F5EFE6`, krawędź `#D6CEC2`, mute `#6E6860`, ostrzeżenie `#F4D04F`, luka `#D0422B`, tło plakietki `#FDF3DD`, karta `#FEFCF9`. **Zero indygo/cyjanu.**
- **Typografia:** Playfair Display 700 (nagłówki) + DM Sans 400–700 (treść, liczby, tabele). **Zero Nunito.**
- **Pasek boczny jasny/kremowy** (`--ed-surface`), styl Notion; aktywna pozycja = tło `--ed-badge-bg` + pogrubienie + bursztynowa szyna 4px (potrójny sygnał).
- **Reguła jednego ciemnego akcentu-kotwicy na widok** (atrament = akcja, bursztyn = status) — sekcja 4 v0.2.
- **Cztery sygnatury kierunku:** Kanban kompetencji, checklista „Następny krok" (USP-hero), spokojna passa-kalendarz (NIE „płomień", zero rankingu), narracja pokrycia Start→teraz→Cel.
- **Plakietka „Oceniał człowiek"** + tag „✓ człowiek / auto" (human-in-the-loop = USP, §7 CLAUDE.md).
- **Wszystkie stany** (pusty / ładowania / błąd) i reguły dostępności (kontrast ≥ AA, focus bursztynowy, czerwień nigdy sama, liczby nie kodowane samym kolorem) z v0.2.
- **Flagi do ratyfikacji** (9a Kanban↔kolumna, 9b rubryka, 9c uczciwość haczyków) i decyzje „do Darka" z v0.2 — **nadal otwarte**, v0.3 ich nie przesądza.

v0.3 **dokłada** tylko warstwę grup/`kind`/komentarzy oraz makiety. Jeśli cokolwiek w v0.3 wygląda na sprzeczne z v0.2 — wygrywa v0.2 (LOCK).

---

## 2. Wzorzec „nagłówek grupy" (nowy komponent przekrojowy)

Jeden wzorzec, używany w trzech widokach (onboarding, mapa, analiza luk). To karta-nagłówek nad listą kompetencji grupy.

```
┌─ NAGŁÓWEK GRUPY (karta editorial) ───────────────────────────────────┐
│ SIEM i monitorowanie zdarzeń               [ 18,3% ofert ścieżki ]   │  ← nazwa Playfair + plakietka %
│ Codzienność Blue Teamu — zespołu broniącego firmy. System SIEM       │  ← opis kontekstu, DM Sans, --ed-muted
│ ściąga miliony logów w jedno miejsce; Twoim zadaniem jest wypatrzyć  │     („po co się tego uczysz")
│ w nich ślad włamania. Splunk to pierwszy realny warsztat analityka.  │
│ ──────────────────────────────────────────────────────────────────  │
│  ▸ kompetencje grupy (liście) renderowane pod spodem                 │
└────────────────────────────────────────────────────────────────────────┘
```

- **Nazwa grupy:** Playfair 700, `--ed-ink`.
- **Plakietka „% ofert ścieżki":** wzorzec `badge-soft` — tło `--ed-badge-bg`, tekst `--ed-amber-text`, krawędź `--ed-border`. To `unionShare` (siła całego obszaru), **nie** suma % liści. Etykieta dosłowna „% ofert ścieżki", żeby student nie mylił jej z % pojedynczej technologii.
- **Opis kontekstu:** DM Sans 400, `--ed-muted`, na `--ed-cream`/`--ed-card` (kontrast ≥4,5:1). Maks. 2–3 zdania; dłuższe zwijane „▸ więcej" (`aria-expanded`).
- **Sortowanie grup:** malejąco po `unionShare` (SIEM 18,3% u góry → SQL 3,5% na dole). To samo sortowanie we wszystkich trzech widokach — spójna mapa mentalna.
- **Dostępność:** nagłówek grupy = `<h3>`; lista kompetencji = `<ul>` powiązana z nagłówkiem (`aria-labelledby`). Plakietka % ma `aria-label="udział grupy 18,3 procent ofert ścieżki"`.

---

## 3. Wzorzec „samoocena per `kind`" (nowy słownik etykiet)

Jeden wzorzec wizualny (kropki + słowo / grupa wyboru 1–4), **dwa słowniki** zależne od typu kompetencji. Token `item.kind` z backendu (ETAP B) decyduje, którego słownika użyć.

| Poziom | `kind = narzędzie` („obsługuję") | `kind = koncepcja` („rozumiem/stosuję") |
|---|---|---|
| 0 | nie znam | nie znam |
| 1 | uczę się | poznaję |
| 2 | **obsługuję** | **rozumiem** |
| 3 | obsługuję biegle | stosuję samodzielnie |

- **Wskazówka wizualna typu:** przy nazwie liścia mała etykieta-typ — `narzędzie` (ikona klucza/programu) lub `koncepcja` (ikona żarówki/książki), tło `--ed-surface`, tekst `--ed-muted`. Neutralna, nie krzyczy — typ doprecyzowuje samoocenę, nie ocenia.
- **Dlaczego rozdział:** „obsługuję Splunk" (umiem kliknąć w narzędziu) i „rozumiem GRC" (pojmuję podejście do ryzyka) to różne deklaracje. Wspólna skala „1–4" myli; rozdzielony słownik mówi studentowi, czego od niego oczekujemy.
- **Stan:** wybór zaznaczony = `--ed-amber`; nieaktywne kropki = `--ed-border`.
- **Dostępność:** grupa wyboru w `<fieldset><legend>` (np. „SIEM — Twój poziom"); każdy poziom to `<input type=radio>` z `<label>`. Etykieta typu w `aria-label` liścia: „Splunk, narzędzie, popyt 4,3%".

---

## 4. Per widok — co dochodzi w v0.3 (na bazie sekcji 5–8 v0.2)

### 4.1 Pulpit (`pulpit.html`)
- **Z v0.2 bez zmian:** narracja pokrycia Start→teraz→Cel, 3 kafle liczb, checklista „Następny krok" (USP-hero), passa-kalendarz, Kanban kompetencji, plakietka „Oceniał człowiek".
- **Dochodzi (v0.3):** karty Kanbana niosą **etykietę typu** (`narzędzie`/`koncepcja`) obok tagu weryfikacji, a etykieta poziomu używa **słownika per `kind`** (sekcja 3) — np. SIEM (koncepcja) „poznaję", Linux (narzędzie) „obsługuję biegle". „Następny krok" jest **zakotwiczony w grupie**: nagłówek karty pokazuje nazwę grupy + jej % („SIEM i monitorowanie — 18,3% ofert ścieżki"), żeby student wiedział, że to nie kaprys, tylko najsilniejszy obszar rynku.
- **Funkcje danych widoczne:** typ kompetencji na każdej karcie; siła grupy w „Następnym kroku".

### 4.2 Mapa kompetencji (`mapa-kompetencji.html`) — największy dług, naprawiony
- **Z v0.2 bez zmian:** płótno + panel szczegółu węzła + „ścieżka dostępna" (lista luk) jako alternatywa dla czytnika ekranu; legenda na ekranie zawsze; czerwień luki = kolor + **przerywana ramka** + etykieta; tokeny `--ed-*` zamiast kolorów wpisanych w JS; koniec „jasny tekst na jasnym tle".
- **Dochodzi (v0.3):** węzły **pogrupowane wizualnie** wg grupy rynku — każda grupa to sekcja płótna z **nagłówkiem grupy** (nazwa + % + skrót opisu), węzły-kompetencje pod nim. Panel szczegółu węzła pokazuje **komentarz grupy** („Czemu ta kompetencja jest ważna" — opis kontekstu z grupy macierzystej) + **typ** (`narzędzie`/`koncepcja`). To realizuje decyzję Darka „komentarze grup w panelu".
- **Kontrast — punkt krytyczny:** tekst grupy/opisu na `--ed-cream`/`--ed-card` na tokenie `--ed-muted #6E6860` (≈4,7:1, AA OK) — koniec `slate-400` na białym. Wszystkie hexy w makiecie wzięte z tokenów, nie wpisane na oko.

### 4.3 Analiza luk (`analiza-luk.html`)
- **Z v0.2 bez zmian:** podsumowanie priorytetów (kropka + etykieta, nie samo tło), luka #1 z checklistą inline (USP-hero, ciemna kotwica „Otwórz projekt →"), pozostałe luki zwinięte do priorytetu + popytu + „Znajdź projekt →" (bursztynowy link).
- **Dochodzi (v0.3):** luki **pogrupowane po grupie rynku**; nad blokiem luk danej grupy stoi **komentarz grupy** (opis kontekstu) — student widzi nie tylko „brakuje Ci SIEM", ale „**dlaczego** cały obszar SIEM to 18,3% rynku i czym jest". Każda luka niesie etykietę typu (`narzędzie`/`koncepcja`).
- **Funkcje danych widoczne:** % grupy i opis kontekstu nad luką; typ przy każdej luce.

### 4.4 Projekty (`projekty.html`)
- **Z v0.2 bez zmian:** lista „Polecane dla Ciebie (zamykają Twoje luki)" z bursztynową szyną i ciemną kotwicą „Zacznij →"; szczegół z briefem, 2–3 źródłami danych (odporność linków), formularzem zgłoszenia i **gęstą rubryką oceny** „Ocena sprawdzającego (człowiek)" (flaga 9b — tabela, nie Kanban).
- **Dochodzi (v0.3):** każdy projekt jawnie pokazuje, **którą lukę-kompetencję zamyka** (anchor `required` z danych, np. „Zamyka: SIEM · SOC · Splunk") + **grupę macierzystą** tej luki z jej % („obszar SIEM — 18,3% ofert ścieżki"). Poziomy **L1–L3** (realne L1 z danych; L2/L3 jako zapowiedź planu). Realna treść: 4 projekty cyber L1 (SIEM/Splunk, hardening Linuksa, Python do logów, IAM/AD), realna rubryka SIEM (wagi 20/30/20/25/5).
- **Funkcje danych widoczne:** powiązanie projekt → luka → grupa → % rynku; jawne „co zamykasz".

### 4.5 Onboarding — krok kompetencji (`onboarding-krok-kompetencji.html`)
- **Z v0.2 bez zmian:** kreator (karta editorial, pasek kroków), kompetencje + poziom na jednym ekranie (D5), pusty stan = „czysta karta" (0 dozwolone, koniec bramki „min 5"), ciemna kotwica „Dalej". D4/D5 **nadal czekają na sign-off Darka** — makieta to szkielet, nie zamówienie wdrożenia.
- **Dochodzi (v0.3, rdzeń kroku C2/C3):** **render grupowy zamiast płaskiej listy** — nagłówek grupy (nazwa + % + opis kontekstu), pod spodem kompetencje grupy, każda z **samooceną per `kind`** (narzędzie „obsługuję" vs koncepcja „rozumiem/stosuję", sekcja 3). Flaga „w programie studiów" (z sylabusa, D4) zostaje. To jest ten widok, w którym funkcje danych są najgęstsze — i wzorzec, z którego mapa i analiza luk czerpią nagłówek grupy.

---

## 5. Tabela tokenów (nazwa → wartość → użycie w v0.3)

Tożsama z v0.2 (1:1 z `globals.css`); dodaję kolumnę „nowe użycie w v0.3". Token `--ed-card` to rekomendacja techniczna (dodać do `globals.css`) — w domenie Ethana/Jacka, odwracalne.

| Token | Wartość | Użycie (v0.2) | Nowe użycie w v0.3 |
|---|---|---|---|
| `--ed-cream` | `#FAF6F1` | tło strony, treść, pasek górny | tło sekcji grupy na płótnie mapy |
| `--ed-ink` | `#1B1917` | tekst główny, **ciemna kotwica (1/widok)** | nazwa grupy (nagłówek), aktywny poziom-słowo |
| `--ed-amber` | `#D0891E` | status „masz/postęp", passa, pokrycie | zaznaczony poziom samooceny (kropka) |
| `--ed-amber-text` | `#8F5A0F` | małe etykiety bursztynowe na jasnym (AA) | plakietka „% ofert ścieżki" (tekst), „% popytu" liścia |
| `--ed-surface` | `#F5EFE6` | pasek boczny, kolumny Kanbana, tła wgłębione | tło etykiety-typu (`narzędzie`/`koncepcja`) |
| `--ed-border` | `#D6CEC2` | krawędzie, separatory, ścieżki pasków | krawędź karty-nagłówka grupy, nieaktywne kropki poziomu |
| `--ed-muted` | `#6E6860` | tekst pomocniczy (AA na surface i cream) | **opis kontekstu grupy** (komentarz w panelu), etykieta typu |
| `--ed-warn` | `#F4D04F` | status „w trakcie", priorytet „ważna", 40–79% | priorytet luki „ważna" w grupie |
| `--ed-danger` | `#D0422B` | status „luka", priorytet „krytyczna", <40% | przerywana ramka węzła-luki w grupie mapy |
| `--ed-badge-bg` | `#FDF3DD` | plakietki bursztynowe, „Oceniał człowiek", aktywna nawigacja | tło plakietki „% ofert ścieżki" przy nagłówku grupy |
| `--ed-card` | `#FEFCF9` | karty (najjaśniejsze, „unoszą się") | karta-nagłówek grupy, karta projektu |
| `--font-ed-display` | Playfair Display 700 | nagłówki | nazwa grupy |
| `--font-ed-body` | DM Sans 400–700 | treść, liczby, tabele | opis kontekstu, etykiety typu, słownik poziomów |

**Tokeny oddechu (z v0.2):** `--gap-section: 46px`, `--pad-card: 26px`, `--radius: 16px`, `--shadow-soft: 0 1px 2px rgba(27,25,23,.05)`, `--shadow-lift: 0 6px 22px rgba(27,25,23,.07)`. Fokus klawiatury wszędzie: `outline 2,5px --ed-amber, offset 2px`.

---

## 6. Stany (pusty / ładowanie / błąd) — warstwa danych v0.3

Stany bazowe z v0.2 obowiązują. v0.3 dokłada zachowanie **dla braku danych grupy**:

- **Grupa bez opisu kontekstu** (`description` puste): nagłówek pokazuje samą nazwę + %, bez bloku opisu — **nie** placeholder „brak opisu". Opis to wzbogacenie, nie warunek renderu.
- **Grupa z `unionShare = null`** (obszar bez policzonego udziału — patrz `_meta` modelu): plakietka % ukryta, nie „0%". (Spójne z ETAP 0.1 planu: „demandPercentage null → UI nie renderuje 0%".)
- **`kind` brak/nieznany:** etykieta typu ukryta, samoocena spada do słownika neutralnego „nie znam / uczę się / znam / znam dobrze" — nigdy crash, nigdy pusty słownik.
- **Ładowanie:** szkielety kart-nagłówków grup (puls `--ed-border/60`), nie spinner.
- **Błąd wczytania katalogu grup:** awaryjnie płaska lista kompetencji (jak dziś) + komunikat „Nie udało się wczytać kontekstu grup. [Spróbuj ponownie]". Render grupowy to wzbogacenie — jego brak nie blokuje samooceny.

---

## 7. Dostępność — co dochodzi w v0.3

Reguły v0.2 bez zmian (kontrast ≥ AA, focus bursztynowy, czerwień nigdy sama, liczby nie samym kolorem). Nowe punkty warstwy grup:

- **Hierarchia nagłówków:** strona `<h1>` (Playfair) → grupa `<h3>` → lista kompetencji `<ul>` powiązana `aria-labelledby` z nagłówkiem grupy. Czytnik ekranu nawiguje grupami.
- **Plakietka %:** `aria-label="udział grupy 18,3 procent ofert ścieżki"` — żeby nie czytało „18,3 procent" bez kontekstu.
- **Etykieta typu:** w `aria-label` liścia, nie jako osobny, gubiący się węzeł („Splunk, narzędzie, popyt 4,3 procent").
- **Samoocena per `kind`:** `<fieldset><legend>` per kompetencja; słownik słowny (nie tylko kropki) — czytnik mówi „obsługuję", nie „poziom 2".
- **Kontrast opisu kontekstu:** `--ed-muted` na `--ed-cream`/`--ed-card` ≈4,7:1 (AA). To naprawia dokładnie dług mapy z v0.2 (jasny tekst na jasnym tle).

---

## 8. Granice tego specu (czego v0.3 świadomie NIE rozstrzyga)

- **Reguła kolumny Kanbana (flaga 9a v0.2)** — czy kolumna wynika z poziomu, czy z poziomu + statusu luki rynkowej. Nadal do ratyfikacji Sophii. Makieta pokazuje wariant „poziom + status luki" (rekomendacja v0.2), ale to nie przesądza.
- **Onboarding D4/D5** (sylabus jako adnotacja, próg 0 kompetencji) — **osobny sign-off Darka**. Makieta = szkielet.
- **Reguła ciemnej kotwicy vs bursztynowe CTA** — decyzja Darka z v0.2, nieprzesądzona. Makiety stosują kotwicę atramentową (rekomendacja), łatwo cofnąć.
- **Token `--ed-card`** — rekomendacja techniczna do Ethana/Jacka.
- **Migracja `group` do tabeli `competencies`** (krok C4) — preferowane złączenie przy renderze z `career-model.json` bez migracji; jeśli niewystarczające, decyzja Ethana (v1.12). To domena techniczna, nie projektowa.

---

## 9. Makiety hi-fi (pliki do obejrzenia)

Katalog: `.agents/designs/05-panel-spokojny-ekspert/wireframes/`. Każdy plik samodzielny (otwierasz w przeglądarce, działa bez serwera i bez budowania; style w pliku, czcionki z Google Fonts, treść = realne dane cyber).

| Plik | Widok | Co pokazuje (LOCK + dane) |
|---|---|---|
| `index.html` | spis | linki do piątki, kolejność oglądania |
| `pulpit.html` | Pulpit | Kanban + „Następny krok" (zakotwiczony w grupie SIEM 18,3%) + passa (bez płomienia) + pokrycie Start→teraz→Cel + plakietka „Oceniał człowiek"; karty niosą typ `narzędzie`/`koncepcja` |
| `mapa-kompetencji.html` | Mapa kompetencji | węzły pogrupowane po grupie (nagłówek + % + opis), panel szczegółu z komentarzem grupy i typem, poprawny kontrast na `--ed-*`, legenda + ścieżka dostępna |
| `analiza-luk.html` | Analiza luk | luki pogrupowane + komentarz grupy nad luką + checklista inline dla luki #1 + ciemna kotwica |
| `projekty.html` | Projekty | 4 realne projekty L1, „zamyka lukę X (grupa Y, %)", poziomy L1–L3, szczegół z rubryką „Ocena sprawdzającego (człowiek)" |
| `onboarding-krok-kompetencji.html` | Onboarding | render grupowy (nagłówek grupy + % + opis), kompetencje pod spodem, samoocena per `kind` |

---

## 10. Self-critique (rola: principal designer, dyscyplina Linear/Stripe)

Pięć słabości pierwszej wersji v0.3 + makiet, i co poprawiłam:

1. **Ryzyko nadpisania LOCK tylnymi drzwiami.** v0.3 dokłada dużo (grupy, `kind`, komentarze) — groziło to cichym przesunięciem kierunku v0.2. **Poprawka:** sekcja 1 jawnie wylicza, co z LOCK zostaje nietknięte, i ustala regułę „spór → wygrywa v0.2". Addytywność jest zadeklarowana, nie domyślna.
2. **Mylenie dwóch procentów.** `unionShare` grupy (18,3%) i % popytu liścia (np. Splunk 4,3%) to różne liczby — student mógłby je pomylić. **Poprawka:** plakietka grupy ma dosłowną etykietę „% ofert ścieżki" + `aria-label` z kontekstem; liść ma „% popytu". Dwa różne słowa, nie samo „%".
3. **Przeładowanie ekranu opisami grup.** Dziesięć grup × 2–3 zdania opisu = ściana tekstu. **Poprawka:** opis `--ed-muted` (cichy, nie krzyczy), zwijanie „▸ więcej" przy długich, sortowanie po sile grupy (najważniejsze u góry), a w analizie luk komentarz grupy tylko nad blokiem luk, nie przy każdej luce.
4. **`kind` jako ozdoba zamiast funkcji.** Etykieta typu mogła być dekoracją bez znaczenia. **Poprawka:** typ steruje **słownikiem samooceny** (sekcja 3) — „obsługuję" vs „rozumiem" — więc niesie sens, nie tylko ikonę. Plus stan awaryjny, gdy `kind` brak (słownik neutralny, zero crashu).
5. **Kontrast — dług mapy mógł wrócić.** Łatwo było znów wpisać jasny szary na jasnym tle przy opisach grup. **Poprawka:** sekcja 7 + tabela tokenów wiążą opis kontekstu na `--ed-muted` (≈4,7:1 AA); w makietach **zero kolorów wpisanych na oko** — wszystko z palety `--ed-*`. Skontrolowane: zero indygo, zero Nunito, zero „płomienia".

**Kontrola twarda przed oddaniem:** zero indygo/cyjanu (paleta tylko `--ed-*`); zero Nunito (Playfair + DM Sans z CDN); zero „płomienia" (passa = kalendarz tygodnia, kwadraty); kontrast tekstu ≥ AA (opisy na `--ed-muted`, kotwice atramentowe); human-in-the-loop widoczny (plakietka „Oceniał człowiek" + tag „✓ człowiek/auto" + rubryka „Ocena sprawdzającego (człowiek)"); żargon tłumaczony (sekcja „Żargon" + copy interfejsu po polsku).
