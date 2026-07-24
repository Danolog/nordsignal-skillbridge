# 1E.2 · Moduł M-LLM „LLM: ekstrakcja strukturalna" — treść atomów + rampa capstone'u

**Autor:** Sophia (PO, kuracja + autoring) · **Data:** 2026-07-11 ·
**Status:** **ZATWIERDZONY (Darek, 2026-07-11)** — po przeglądzie QG
(2 agentów Fable 5: zgodność z ADR-014 z wykonaniem wszystkich fixtures
— zero krytyków + research SDK/UI/zasobów; przebieg na końcu dokumentu);
przed ingest 1E.2: TODO z notatek (notebooki z parami LLM.1 z żywego
API, seanse wideo, screenshot Secrets) + **sign-off Ryana dla materii
RODO (LLM.6/E15)**.
**Rewizja treści 2026-07-24 (ADR-022, zmiany 2/3/6 — kuracja Sophia):**
kanoniczne zbiory LLM.4 i LLM.7 przebudowane, by uczyć różnicy
**parsowanie ≠ zgodność ze schematem**. Dołożony przypadek
*sparsowany-ale-niezgodny* (słownik bez pola `widelki_min`): sam
`rekord is not None` go przepuszcza, a `rekord["widelki_min"]` wywala
`KeyError` — dlatego uczony filtr trafności zaostrzony do
**schema-valid** (`rekord is not None and all(pole in rekord for pole
in POLA)`). Skutek liczbowy: LLM.7 `zgodnosc` 0.875 → **0.75** (6 z 8);
LLM.4 „4/5" → **parse 5 / schema 4** (6 odpowiedzi). Kontrolne
zweryfikowane wykonaniem (log QG 2026-07-24). **Pieczątki (kontrakt
`configJson.checks`) buduje builder po finalizacji ADR-022 przez Ethana
— TĄ SAMĄ regułą schema-valid** (nota dla buildera w „Notatkach dla
Olivera"). Rewizja czeka na finalizację ADR-022 i re-sign-off treści.

**Podstawa:** ADR-014 D1/D3/D5/D6.5; prerekwizyt: **M-ML zaliczony**
(ewaluacja z ground truth to rodzona siostra metryk z ML.5; Git z EDA.2;
API z EDA.1). OSTATNI moduł drabiny pilotażu.
**Środowisko (zweryfikowane 2026-07-11):** SDK **`google-genai` 2.10.0
preinstalowany w Colab** (backend-info); klucz Gemini API z darmowego
tieru bez karty (AI Studio — konto Google ze ścieżki wystarcza; limity
do potwierdzenia researchem QG). **Strategia determinizmu treści:** atomy
i laby pracują na ZAPISANYCH przykładach odpowiedzi (spreparowanych
dydaktycznie — jawna deklaracja w notatkach); żywe API wchodzi dopiero
w capstonie. Cały kod parsowania/ewaluacji wykonany w Pythonie przed
pisaniem treści.

## Audyt pojemności D10

Dekompozycja rubryki (`ds-llm-strukturalna-ekstrakcja`: jakość promptu
25, poprawność struktury 25, mini-ewaluacja 30, reprodukowalność 20)
+ opisu projektu (darmowy tier, klucz w env, pseudonimizacja danych
osobowych):

| # | Koncept wymagany | Pokrycie |
|---|---|---|
| G1 | czym jest LLM: przewidywanie tokenów, niedeterminizm, temperatura | **NOWY → LLM.1** |
| G2 | prompt-specyfikacja: schemat JSON, reguła null, few-shot, wersjonowanie | **NOWY → LLM.2** |
| G3 | parsowanie odpowiedzi (`json.loads`) + walidacja pól + obsługa złego formatu (`try/except` — nowa składnia JIT, deklaracja w notatkach) | **NOWY → LLM.3** |
| G4 | halucynacje: definicja, wykrywanie (pole wypełnione mimo braku w źródle) | **NOWY → LLM.5** (z ewaluacją — jedna materia) |
| G5 | mini-ewaluacja: ground truth, accuracy per pole, wskaźnik halucynacji | **NOWY → LLM.5** (pętla porównań = czysty F2/F3; spłata zapowiedzi z M-ML: „iteracja po przykładach zwykłym for") |
| G6 | klucz API jako sekret (env/Colab Secrets, nigdy w repo), limity darmowego tieru, dane osobowe (pseudonimizacja) | **NOWY → LLM.6** |
| G7 | wywołanie API modelu | EDA.1 (wzorzec zapytania) + LLM.1 (specyfika SDK); żywe wywołanie w capstonie |
| G8 | repro: README/requirements/Git | EDA.2 + kroki capstone'u |

**Bilans: 5 nowych atomów — w widełkach D1, bez podziału modułu.**

---

## Zasady modułu M-LLM

- **Struktura:** 5 atomów `exercise` + 2 laby + **egzamin 15 × 2, próg
  ≤1 błąd** + przegląd przed egzaminem + **capstone** (position 100).
  Zaliczenia jak w poprzednich modułach.
- **Dane przewodnie:** syntetyczne ogłoszenia o pracę PO POLSKU
  (spreparowane — zero danych osobowych; jawnie zadeklarowane) + schemat
  ekstrakcji `{"stanowisko": tekst, "miasto": tekst|null,
  "widelki_min": liczba|null}` — ten sam świat co capstone.
- **Zapisane odpowiedzi zamiast żywego API w atomach:** treść musi być
  deterministyczna (QG wykonuje każdą liczbę), a LLM z natury nie jest —
  dlatego atomy uczą na utrwalonych przykładach odpowiedzi (w tym
  celowo zepsutych), a pierwsze ŻYWE wywołanie robisz w capstonie,
  uzbrojony(-a) we wszystko. To samo przejście co L0→F1: najpierw
  mechanika na pewnym gruncie, potem żywioł.
- **Nowa składnia uczona na miejscu (deklaracja):** `json.loads`
  (moduł `json`), `try/except` oraz ZAPISY SKRÓCONE — `all(...)`
  i wyrażenia w stylu `{pole: 0 for pole in POLA}` (LLM.3/LLM.5,
  objaśnione przy pierwszym użyciu z odesłaniem do pełnych pętli,
  które drabina zna). Wszystko inne to klocki z drabiny.
- **Fading (D5a):** LLM.1–LLM.2 pełne WE → LLM.3 completion → LLM.4
  lab-szkielet → LLM.5 luki w środku → LLM.6 backward (student pisze
  regułę bezpieczeństwa do gotowej checklisty) → LLM.7 lab samodzielny
  → capstone z rubryką.
- **Koncepty kluczowe (≤4 — D6.3):** `llm-niedeterminizm-temperatura`
  (LLM.1), `prompt-specyfikacja` (LLM.2), `json-parsowanie-walidacja`
  (LLM.3), `ewaluacja-halucynacje` (LLM.5). LLM.6
  (`klucz-sekrety-rodo`) — koncept zwykły, egzekwowany kamieniem K3.
- **Przegląd przed egzaminem (reuse):** EDA.1-P1, EDA.3-P3, ML.3-P2,
  ML.5-P3, LLM.1-P2, LLM.2-P1, LLM.2-P3, LLM.3-P2, LLM.5-P1, LLM.6-P2
  (10 pytań).
- **Sesja i czas:** 9 pozycji ≈ 5–6 sesji (suma szacunków ~160–165 min
  z przeglądem i egzaminem); capstone ~5 h estymaty.

---

## Atom LLM.1 — LLM: maszyna przewidująca tekst (i jak z nią rozmawiać)

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`llm-niedeterminizm-temperatura` (KLUCZOWY) · **Krok fadingu:** pełne WE

### Cel

Zrozumiesz, czym LLM jest (przewidywaniem kolejnych tokenów), czym NIE
jest (bazą prawdy) i jak parametr temperatury oraz niedeterminizm
wpływają na pracę z danymi — zanim wywołasz model choć raz.

### Teoria

**LLM** (duży model językowy) to sieć wytrenowana na ogromnych tekstach
do jednej rzeczy: **przewidywania kolejnego fragmentu tekstu** (tokenu).
Z tej prostej reguły wyrastają zaskakujące zdolności — streszczanie,
tłumaczenie, wyciąganie informacji — ale reguła pozostaje regułą: model
generuje NAJBARDZIEJ PRAWDOPODOBNĄ kontynuację, nie „prawdę". Briefing
Twojego capstone'u nazywa LLM **parserem semantycznym**: narzędziem do
zamiany tekstu swobodnego w dane — i w tej roli będziesz go używać.

Rozmowa z modelem wygląda znajomo po EDA.1 — wysyłasz zapytanie,
dostajesz odpowiedź — tyle że zamiast parametrów wysyłasz **prompt**
(tekst-polecenie), a odpowiedzią jest tekst:

```python
from google import genai
from google.genai import types

client = genai.Client(api_key=MOJ_KLUCZ)          # klucz = hasło do usługi (LLM.6!)
odpowiedz = client.models.generate_content(
    model="gemini-2.5-flash",                     # który model
    contents=prompt,                              # Twoje polecenie
    config=types.GenerateContentConfig(temperature=0),   # losowość: minimum (niżej!)
)
print(odpowiedz.text)                             # odpowiedź to TEKST
```

**Przewidź:** wyślesz ten sam prompt dwa razy. Czy dostaniesz dwie
identyczne odpowiedzi?

Niekoniecznie — i to jest najważniejsza różnica względem WSZYSTKIEGO,
czego dotąd używałeś(-aś). `sum()` liczy zawsze tak samo; LLM
**losuje** spośród prawdopodobnych kontynuacji. Skalę tej losowości
kontroluje **temperatura**: wysoka = kreatywna różnorodność (dobra do
burzy mózgów), niska/zerowa = maksymalna powtarzalność. Do ekstrakcji
danych ustawiasz **temperaturę 0** — to odpowiednik `random_state`
z ML.1: nie poprawia jakości, zmniejsza losowość (pełnej gwarancji
powtarzalności, jak przy ziarnie, nie ma — i rubryka każe ten parametr
RAPORTOWAĆ właśnie dlatego).

Skąd model „wie" różne rzeczy? Z treningu — i ta wiedza jest ZAMROŻONA:
model nie zna Twoich ogłoszeń, dzisiejszych cen ani niczego, co
wydarzyło się po jego treningu. Dlatego ekstrakcja działa odwrotnie niż
pytanie „z głowy": cały tekst źródłowy wkładasz DO promptu, a model ma
czytać z niego — nie ze swojej pamięci. To rozróżnienie wróci
w regule null (LLM.2): „z wiedzy ogólnej" model potrafi uzupełnić
typowe widełki płacowe, których w TWOIM ogłoszeniu nie ma.

Druga różnica: model NIE wie, kiedy nie wie. Zapytany o informację,
której nie ma, potrafi płynnie ją ZMYŚLIĆ — to **halucynacja** (zmierzysz
je w LLM.5). Dlatego w pracy z danymi model dostaje od Ciebie ścisłą
specyfikację (LLM.2), a jego odpowiedzi są ZAWSZE walidowane (LLM.3)
i mierzone (LLM.5) — nigdy przyjmowane na wiarę. LLM w pipeline to
pracownik zdolny, szybki i skłonny do konfabulacji: dostaje precyzyjne
instrukcje i kontrolę jakości.

### Pytania (retrieval)

**P1. Ten sam prompt wysłany dwa razy dał różne odpowiedzi. To…**

- A. Awaria API — zgłoś błąd — *Nie — to natura modelu: generuje
  z prawdopodobieństw, więc odpowiedzi mogą się różnić.* (diagnoza:
  wini narzędzie — kalka L0.2-P2/A, tym razem o cesze, nie usterce)
- B. **Normalne — LLM losuje spośród prawdopodobnych kontynuacji;
  losowość zmniejsza temperatura 0** ✓ — *Tak — dlatego do ekstrakcji
  danych zjeżdżasz z temperaturą do zera i raportujesz ją w repo.*
- C. Dowód, że model się uczy między wywołaniami — *Nie — model między
  Twoimi wywołaniami się NIE zmienia; różnice to losowanie, nie nauka.*
  (diagnoza: antropomorfizacja — model „żyje")
- D. Skutek złego klucza API — *Nie — klucz uwierzytelnia, nie wpływa
  na treść odpowiedzi.* (diagnoza: miesza warstwę dostępu z warstwą
  generacji)

**P2. Czym temperatura 0 różni się od `random_state` z ML.1?**

- A. Niczym — to synonimy — *Blisko intencji, ale nie mechaniki:
  ziarno daje PEŁNĄ powtarzalność, temperatura 0 tylko ją maksymalizuje
  — bez twardej gwarancji.* (diagnoza: przenosi gwarancję ziarna 1:1)
- B. **Cel ten sam (powtarzalność), gwarancja słabsza: temperatura 0
  minimalizuje losowość, ale nie mrozi jej całkowicie — dlatego się ją
  raportuje** ✓ — *Tak — rubryka: „ustawiony seed/temperatura" właśnie
  z tego powodu.*
- C. Temperatura poprawia trafność ekstrakcji — *Nie — jak ziarno:
  kontroluje losowość, nie jakość (ML.1-P2 w nowym kostiumie).*
  (diagnoza: powtarzalność mylona z jakością)
- D. random_state jest dla LLM, temperatura dla sklearn — *Nie —
  dokładnie odwrotnie.* (diagnoza: zamienione etykiety)

**P3. Model zapytany o widełki płacowe ogłoszenia, w którym ich NIE MA,
odpowiedział „8000–12000 zł". Co się stało i czemu to groźne?**

- A. Model znalazł widełki w internecie — *Nie — model nie przeszukuje
  Twojego ogłoszenia ani internetu w locie: wygenerował prawdopodobną
  kontynuację.* (diagnoza: model jako wyszukiwarka)
- B. **Halucynacja: model zmyślił płynną, wiarygodnie brzmiącą wartość
  — groźna, bo wygląda jak prawdziwa dana i wejdzie do analizy** ✓ —
  *Tak — dlatego prompt dostanie regułę null (LLM.2), a pipeline —
  wskaźnik halucynacji (LLM.5).*
- C. Błąd w Twoim koncie API — *Nie — to zachowanie modelu, nie
  infrastruktury.* (diagnoza: warstwa dostępu vs generacji — jak P1/D)
- D. Nic groźnego — liczby wyglądają sensownie — *Nie — „wygląda
  sensownie" to definicja NIEBEZPIECZEŃSTWA halucynacji: fałsz
  nieodróżnialny na oko od danych (najgroźniejsze błędy nie mają
  komunikatów — F2.5-P2).* (diagnoza: ocena po powierzchni)

### Drabinka hintów

1. **Koncepcyjny:** Trzy zdania-kotwice atomu: (1) LLM przewiduje
   tekst, nie zna prawdy; (2) losowość kontroluje temperatura —
   do danych: 0, i raportuj; (3) odpowiedzi się waliduje i mierzy,
   nigdy nie przyjmuje na wiarę.
2. **Szkielet:** W notebooku LLM.1 dostajesz DWIE zapisane odpowiedzi
   modelu na ten sam prompt (temperatura wysoka) — porównaj je
   i podkreśl różnice; potem dwie przy temperaturze 0 — co się
   zmieniło?
3. **Pełne rozwiązanie z objaśnieniem:** przy wysokiej temperaturze
   różnią się sformułowania i czasem TREŚĆ (w przykładzie: raz „brak
   widełek", raz zmyślone „8000" — halucynacja na żywo); przy 0
   odpowiedzi są (niemal) identyczne. Wniosek do zapamiętania: parametry
   generacji to część METODY — jak ziarno w ML — i należą do raportu.

---

## Atom LLM.2 — Prompt jako specyfikacja: schemat, reguła null, przykład

**Typ:** `exercise` · **Czas studenta:** ~15–20 min · **Koncept:**
`prompt-specyfikacja` (KLUCZOWY) · **Krok fadingu:** pełne WE

### Cel

Napiszesz prompt ekstrakcyjny jak specyfikację: dokładny schemat JSON,
reguła „null zamiast zmyślania" i przykład few-shot — trzy elementy,
z których rubryka rozlicza co czwarty punkt.

### Teoria

Prompt do ekstrakcji to nie prośba — to **specyfikacja**, jak brief dla
wykonawcy. Rubryka wymienia jej trzy obowiązkowe elementy:

```text
Wyciągnij z ogłoszenia o pracę dane do JSON o DOKŁADNIE tym schemacie:
{"stanowisko": tekst, "miasto": tekst lub null, "widelki_min": liczba lub null}

Zasady:
- Jeśli informacji NIE MA w tekście, wpisz null. Nie zgaduj, nie uzupełniaj z wiedzy ogólnej.
- Zwróć wyłącznie JSON, bez żadnego tekstu wokół.

Przykład:
Ogłoszenie: "Szukamy testera do zespołu w Krakowie."
Odpowiedź: {"stanowisko": "tester", "miasto": "Kraków", "widelki_min": null}

Ogłoszenie: {tresc_ogloszenia}
Odpowiedź:
```

**Przewidź:** po co w przykładzie ogłoszenie BEZ widełek, a nie
„pełne", z kompletem danych?

Bo przykład (few-shot) uczy model przez pokaz — a najbardziej trzeba mu
pokazać zachowanie TRUDNE: brak danych → `null`. Przykład z kompletem
pól uczyłby tylko tego, co model i tak umie. Rozbiór trzech elementów:

- **Schemat z nazwami i typami pól** — model ma wiedzieć DOKŁADNIE,
  jakie klucze i jakie wartości zwrócić; „wyciągnij najważniejsze
  informacje" to zaproszenie do twórczości, nie specyfikacja.
- **Reguła null** — bez niej model przy braku danych halucynuje
  (LLM.1-P3); z nią ma legalne wyjście awaryjne. To najtańsza
  pojedyncza obrona przed halucynacją.
- **Few-shot** (co najmniej jeden przykład) — pokaz działa lepiej niż
  opis; przykład powinien demonstrować regułę null w akcji.

Kolejność części promptu też robi robotę: najpierw CO (schemat), potem
JAK (zasady), potem POKAZ (przykład), na końcu wejście — model czyta
sekwencyjnie i najlepiej trzyma instrukcje podane przed zadaniem.
Zdanie „zwróć wyłącznie JSON, bez tekstu wokół" nie jest ozdobą: modele
lubią formatować odpowiedzi „dla człowieka" (proza, płotki markdown),
a Twój parser z LLM.3 chce czystego JSON-a. I pisz śmiało PO POLSKU —
współczesne modele są wielojęzyczne, a polskie ogłoszenia najlepiej
opisuje polska specyfikacja z polskimi nazwami pól.

Czwarty wymóg rubryki jest organizacyjny: **prompty wersjonujesz
w repozytorium** (osobny plik, np. `prompts/ekstrakcja_v1.txt`) —
prompt to kod: zmieniasz go, wyniki się zmieniają, więc historia zmian
(EDA.2!) należy mu się tak samo. Praktyka wygląda jak pętla
popraw-zmierz: v1 → ewaluacja (LLM.5) → widzisz, które pole kuleje →
v2 z poprawką → ewaluacja ponownie — i to właśnie ta historia wersji
Z WYNIKAMI czyni Twój raport wiarygodnym. Ostatnia linia WE —
`{tresc_ogloszenia}` — to miejsce wstawienia właściwego tekstu: robisz
to f-stringiem (F1.3), jedno ogłoszenie na wywołanie, pętlą po zbiorze
(F2.3).

### Pytania (retrieval)

**P1. Czemu „wyciągnij najważniejsze informacje z ogłoszenia" to zły
prompt ekstrakcyjny?**

- A. Za krótki — dobre prompty są długie — *Nie — miarą nie jest
  długość, lecz PRECYZJA: brak schematu, reguły null i przykładu.*
  (diagnoza: kryterium ilościowe zamiast jakościowego)
- B. **Nie definiuje schematu (pól i typów), więc każda odpowiedź może
  mieć inny kształt — pipeline nie ma czego walidować** ✓ — *Tak —
  specyfikacja zamiast prośby; kształt wyjścia to fundament ekstrakcji.*
- C. Modele nie rozumieją polskiego — *Nie — rozumieją; problem leży
  w nieokreśloności zadania, nie języku.* (diagnoza: fałszywa bariera)
- D. Brakuje słowa „proszę" — *Nie — uprzejmość nie jest parametrem
  jakości ekstrakcji.* (diagnoza: antropomorfizacja)

**P2. Które zachowanie wymusza reguła „jeśli informacji nie ma, wpisz
null"?**

- A. Model odpowie szybciej — *Nie — reguła dotyczy TREŚCI odpowiedzi,
  nie tempa.* (diagnoza: „techniczna korzyść")
- B. **Przy braku danych model ma legalne wyjście (null) zamiast
  zmyślania — najtańsza obrona przed halucynacją** ✓ — *Tak — a w LLM.5
  policzysz, jak często mimo to zmyśla (wskaźnik halucynacji).*
- C. Model przestanie w ogóle zwracać null — *Nie — odwrotnie: reguła
  null CZYNI null poprawną odpowiedzią.* (diagnoza: odwrócony sens
  reguły)
- D. JSON będzie krótszy — *Nie — null zajmuje tyle co wartość; chodzi
  o prawdziwość, nie rozmiar.* (diagnoza: jak A)
  
**P3. Po co wersjonować prompty w repo, skoro to „tylko tekst"?**

- A. Bo GitHub wymaga plików tekstowych — *Nie — GitHub przyjmie
  wszystko; to potrzeba metodyczna.* (diagnoza: przymus narzędzia)
- B. **Bo prompt steruje wynikami jak kod: inna wersja promptu = inne
  dane na wyjściu — bez historii nie odtworzysz, skąd wzięła się
  tabela ewaluacji** ✓ — *Tak — prompt to kod; rubryka rozlicza
  wersjonowanie wprost.*
- C. Żeby prompt był tajny — *Nie — repo capstone'u jest publiczne;
  tajny jest KLUCZ (LLM.6), nie prompt.* (diagnoza: myli sekret ze
  specyfikacją)
- D. Nie trzeba — wystarczy pamiętać — *Nie — „pamiętanie" nie jest
  reprodukowalnością (EDA.2): recenzent i Ty-za-miesiąc musicie widzieć
  dokładną wersję.* (diagnoza: repro na słowo honoru)

### Drabinka hintów

1. **Koncepcyjny:** Checklist promptu ekstrakcyjnego: (1) schemat —
   nazwy i typy pól, dosłownie; (2) reguła null — jednym zdaniem,
   z zakazem zgadywania; (3) przykład pokazujący null w akcji;
   (4) „zwróć wyłącznie JSON". Plik do repo, wersjonowany.
2. **Szkielet:** W notebooku LLM.2: dostajesz prompt z DWIEMA
   usterkami (brak reguły null; przykład z kompletem pól zamiast
   z brakiem) — znajdź je i popraw wg checklisty.
3. **Pełne rozwiązanie z objaśnieniem:** usterka 1: dopisz regułę null
   z zakazem uzupełniania „z wiedzy ogólnej" (model zna typowe widełki
   rynkowe — i właśnie dlatego je zmyśla!); usterka 2: podmień przykład
   na ogłoszenie bez którejś informacji, z null w odpowiedzi. Test
   jakości poprawki: czy z samego promptu da się jednoznacznie
   odtworzyć, co model MA zwrócić dla ogłoszenia „Szukamy analityka"?
   (stanowisko: „analityk", miasto: null, widelki_min: null).

---

## Atom LLM.3 — Od odpowiedzi do danych: parsuj, waliduj, obsłuż porażkę

**Typ:** `exercise` · **Czas studenta:** ~20 min · **Koncept:**
`json-parsowanie-walidacja` (KLUCZOWY) · **Krok fadingu:** completion
(luka na końcu WE)

### Cel

Sparsujesz tekst odpowiedzi do słownika (`json.loads`), zwalidujesz
pola i — nową składnią `try/except` — obsłużysz odpowiedź w złym
formacie tak, żeby jedna zepsuta nie zatrzymała całego pipeline'u.

### Teoria

Model zwraca TEKST (LLM.1) — nawet gdy ten tekst wygląda jak JSON.
Żeby na nim liczyć, zamieniasz go w prawdziwy słownik (F3.3) modułem
`json`:

```python
import json

odpowiedz = '{"stanowisko": "Analityk danych", "miasto": "Radom", "widelki_min": 8000}'
rekord = json.loads(odpowiedz)        # tekst → słownik (loads = "load string")
print(rekord["stanowisko"])           # dalej: znany świat F3.3
```

**Przewidź:** co wypisze print? I co by się stało, gdyby model
odpowiedział `Oto wynik: {"stanowisko": "Analityk"` — uciętym,
obudowanym prozą tekstem?

`Analityk danych` — a w drugim przypadku `json.loads` zatrzyma się
błędem **`JSONDecodeError`** (spotkałeś go w pierwszej pomocy M-EDA —
teraz rozumiesz mechanizm: tekst nie jest poprawnym JSON-em). I tu
zaczyna się inżynieria: przy 30 ogłoszeniach JEDNA zepsuta odpowiedź
nie może wywracać całej pętli. Poznaj **`try/except`** — nową składnię
(ostatnią na tej ścieżce!):

```python
try:                                   # SPRÓBUJ wykonać blok...
    rekord = json.loads(odpowiedz)
except json.JSONDecodeError:           # ...a JEŚLI poleci ten błąd — zrób to:
    rekord = None                      # oznacz porażkę, pętla idzie dalej
```

Czytaj: „spróbuj sparsować; jeśli się nie da — zapisz `None` i żyj
dalej". Mechanika bloków znana z `if`/`for`: dwukropki, wcięcia. Zasada
higieny: łap KONKRETNY błąd (`json.JSONDecodeError`), nie „wszystko" —
inne błędy mają dalej głośno krzyczeć (L0.3: błąd to informacja).

Co dalej z `None`? To świadoma decyzja pipeline'u, nie śmieć: rekordy-
porażki LICZYSZ w odsetku zgodności (rubryka!), a WYKLUCZASZ z pomiaru
trafności (LLM.5/LLM.7) — porażka parsowania i porażka ekstrakcji to
dwie różne miary. Skąd w ogóle złamane odpowiedzi przy dobrym prompcie?
Modele formatują „dla człowieka" (proza wokół JSON-a, płotek markdown —
zdejmiesz go metodami tekstu w LLM.4), a resztka niedeterminizmu
(LLM.1) zostaje nawet przy temperaturze 0 — parser z ochroną to pas
bezpieczeństwa, który zakładasz zawsze, nie tylko gdy pada deszcz.

Parsowanie to połowa pracy; druga to **walidacja** — czy słownik ma
komplet pól ze schematu (głębsza walidacja typów wartości — np. czy
`widelki_min` to na pewno liczba — wchodzi w capstonie, briefing
prowadzi). Zanim spojrzysz na kod: poznasz w nim dwa ZAPISY SKRÓCONE,
których drabina dotąd nie używała. **`all(pytanie for element in
lista)`** to skrócona pętla-pytanie — czyta się jak zdanie: „czy dla
KAŻDEGO elementu listy odpowiedź brzmi tak?"; samo **`all`** to kuzyn
`sum` z F3.6, tylko dla True/False: zwraca True, gdy wszystkie
odpowiedzi na tak. Pełna pętla z bramką (F3.2) zrobiłaby to samo
w czterech liniach — skrót jest po to, że warunek mieści się w jednym
spojrzeniu:

```python
POLA = ["stanowisko", "miasto", "widelki_min"]
poprawny = rekord is not None and all(______ in rekord for pole in POLA)   # luka!
```

Zwróć uwagę na DWA warunki połączone `and` — i dlaczego oba są
konieczne. Odpowiedź może się SPARSOWAĆ (jest poprawnym JSON-em, więc
`rekord is not None`), a mimo to nie mieć kompletu pól: model zwrócił
`{"stanowisko": "kurier", "miasto": "Radom"}`, gubiąc `widelki_min`.
Taki rekord przechodzi `is not None`, ale gdy sięgniesz po brakujące
pole — `rekord["widelki_min"]` — dostaniesz **`KeyError`** i pętla
wybucha. Dlatego **parsowanie ≠ zgodność ze schematem**: to dwie osobne
bramki, a `rekord is not None` SAM jest za słaby jako warunek dopuszczenia
do dalszej pracy. Do liczenia trafności (LLM.5/LLM.7) bierzesz wyłącznie
rekordy **zgodne ze schematem** — cały `poprawny` powyżej, nie samo
nie-None — inaczej pierwszy rekord bez kompletu pól wywali Ci `KeyError`
w środku ewaluacji.

Rubryka każe raportować **odsetek odpowiedzi zgodnych ze schematem** —
licznik poprawnych przez liczbę wszystkich odpowiedzi (wzorzec
zliczania z F3.2, nic zupełnie nowego). Częsty
przypadek z życia: model opakowuje JSON w płotek markdown
(` ```json … ``` `) — zdejmiesz go metodami tekstu przed parsowaniem
(gotowy przepis w notebooku; to kosmetyka, nie nowa idea).

### Pytania (retrieval)

**P1. Czym różni się tekst `'{"a": 1}'` od wyniku `json.loads` na nim?**

- A. Niczym — to już słownik — *Nie — z cudzysłowami wokół całości to
  NAPIS (F1.1); po kluczu sięgniesz dopiero w sparsowanym słowniku.*
  (diagnoza: myli zapis z wartością — F1.1 na nowym poziomie)
- B. **Tekst to znaki; `json.loads` robi z nich słownik, w którym
  działa `rekord["a"]`** ✓ — *Tak — parsowanie = przejście ze świata
  znaków do świata struktur (F3.3).*
- C. json.loads tylko sprawdza poprawność — *Nie — sprawdza I BUDUJE
  strukturę; wynik to pełnoprawny słownik.* (diagnoza: parser jako
  walidator-tylko)
- D. Tekst jest szybszy w użyciu — *Nie — na tekście nie policzysz
  ani nie zagregujesz; cała ekstrakcja istnieje po to, by mieć
  struktury.* (diagnoza: gubi cel modułu)

**P2. Po co `try/except` wokół parsowania w pętli po 30 ogłoszeniach?**

- A. Przyspiesza parsowanie — *Nie — to obsługa porażki, nie
  optymalizacja.* (diagnoza: „techniczna korzyść")
- B. **Jedna niepoprawna odpowiedź nie zatrzyma pętli: porażka zostaje
  oznaczona (None), reszta się przetwarza, a odsetek zgodnych trafia
  do raportu** ✓ — *Tak — dokładnie zachowanie, które rozlicza rubryka
  („obsługuje przypadki niepoprawnego formatu").*
- C. Ukrywa błędy, żeby raport wyglądał lepiej — *Nie — odwrotnie:
  porażki są LICZONE i raportowane; ukrywanie to fałszowanie (ML.3-P3).*
  (diagnoza: obsługa błędu mylona z zamiataniem)
- D. Bez try/except Python nie wykona json.loads — *Nie — wykona;
  try/except zmienia tylko to, co dzieje się PO błędzie.* (diagnoza:
  przymus składniowy)

**P3. Dlaczego łapiemy `json.JSONDecodeError`, a nie „każdy błąd"?**

- A. Bo innych błędów nie da się złapać — *Nie — da się (i czasem
  trzeba); pytanie brzmi, czy POWINNO się tutaj.* (diagnoza: mylenie
  możliwości z zasadnością)
- B. **Bo inne błędy (np. literówka w kodzie) mają dalej głośno
  krzyczeć — złapanie wszystkiego zamiata prawdziwe usterki pod
  dywan** ✓ — *Tak — błąd to informacja (L0.3); wyciszamy wyłącznie
  ten, który umiemy obsłużyć.*
- C. Bo JSONDecodeError jest najgroźniejszy — *Nie — jest najbardziej
  SPODZIEWANY w tym miejscu; groźniejsze są te, których nie
  przewidzieliśmy — i właśnie dlatego mają krzyczeć.* (diagnoza:
  ranking grozy zamiast logiki obsługi)
- D. Wszystko jedno, byle był try — *Nie — `except:` bez typu to
  antywzorzec: pipeline „działa", a Ty nie wiesz, co w nim umiera.*
  (diagnoza: rytuał zamiast zrozumienia — najgroźniejsze błędy bez
  komunikatów, F2.5-P2)

### Drabinka hintów (completion z teorii)

1. **Koncepcyjny:** Luka w walidacji czyta się jak zdanie: „każde POLE
   ze schematu jest w rekordzie" — pętla po POLA już stoi w `all(...)`,
   brakuje tego, CO sprawdzasz w słowniku (operator z F3.3).
2. **Szkielet:** `all(pole in rekord for pole in POLA)` — które słowo
   w luce?
3. **Pełne rozwiązanie z objaśnieniem:** `pole in rekord` — operator
   `in` na słowniku (F3.3) pyta o obecność klucza; `all` zbiera
   odpowiedzi (mechanika z teorii). Całość: rekord nie-None ORAZ
   komplet pól = „zgodny ze schematem".
   Typowe potknięcie: walidacja przed try/except (na None poleci
   TypeError) — kolejność: parsuj-z-ochroną, POTEM waliduj.

---

## Atom LLM.4 — LAB „Parser na porażki" (6 odpowiedzi → parsowanie vs schemat)

**Typ:** `lab` · **Czas studenta:** ~20 min · **Koncepty ćwiczone:**
`json-parsowanie-walidacja` (+ pętle/liczniki F2–F3) · **Krok fadingu:**
szkielet z lukami

### Cel

Przepuścisz przez parser 6 zapisanych odpowiedzi modelu — w tym jedną
złamaną, jedną w płotku markdown i jedną, która się SPARSUJE, ale nie
ma kompletu pól — i policzysz DWIE różne liczby: ile odpowiedzi w ogóle
się sparsowało i ile jest zgodnych ze schematem. To nie to samo, a
rozróżnienie decyduje o kryterium rubryki za 25%.

### Zadanie (notebook LLM.4 — lista `odpowiedzi` (6 tekstów) w komórce
„Dane", uzupełnij luki)

```python
import json

POLA = ["stanowisko", "miasto", "widelki_min"]
rekordy = []
sparsowane = 0      # udane parsowania (JSON się wczytał)
zgodne = 0          # zgodne ze schematem (parsowanie ORAZ komplet pól)

for tekst in odpowiedzi:
    czysty = tekst.strip().removeprefix("```json").removesuffix("```").strip()
    try:
        rekord = json.loads(______)                      # luka 1: co parsujesz?
    except ______:                                       # luka 2: który błąd łapiesz?
        rekord = None
    if rekord is not None:
        sparsowane = sparsowane + 1                      # sparsowało się (jeszcze nie „zgodne"!)
    if rekord is not None and all(pole in rekord for pole in POLA):
        zgodne = ______                                  # luka 3: licznik zgodnych (F3.2!)
    rekordy.append(rekord)

print(f"Sparsowane: {sparsowane}/{len(odpowiedzi)}")
print(f"Zgodne ze schematem: {zgodne}/{len(odpowiedzi)}")
```

**Zaliczenie:** komórka-pieczątka: przelicza parsowanie i walidację
niezależnie (dane zapisane ⇒ wynik jedyny: **sparsowane 5/6, zgodne
4/6** — jedna odpowiedź celowo złamana [nie sparsuje się], jedna
sparsowana-ale-niezgodna [brak pola `widelki_min` — sparsuje się, lecz
wypada ze zgodnych]) i porównuje `sparsowane`, `zgodne` oraz zawartość
`rekordy` — token przy zgodności. Limity klasy L0 obowiązują.

### Drabinka hintów

1. **Koncepcyjny:** Trzy luki to trzy atomy w pigułce: parsujesz tekst
   PO zdjęciu płotka (linia wyżej robi to za Ciebie); łapiesz KONKRETNY
   błąd z LLM.3; a liczysz DWIE rzeczy osobno — udane parsowania i
   zgodne ze schematem — bo rekord potrafi się sparsować i mimo to nie
   mieć kompletu pól (LLM.3: parsowanie ≠ zgodność).
2. **Szkielet:** luka 1: `czysty`; luka 2: `json.JSONDecodeError`;
   luka 3: `zgodne + 1`.
3. **Pełne rozwiązanie z objaśnieniem:** wynik `sparsowane 5/6, zgodne
   4/6`. Odpowiedź nr 3 (ucięta, obudowana prozą) ląduje jako `None` —
   ani sparsowana, ani zgodna; pipeline żyje dalej. Odpowiedź nr 5
   (`{"stanowisko": …, "miasto": …}` bez `widelki_min`) SPARSUJE się —
   liczy się do `sparsowane` — ale wypada ze `zgodne`, bo brak jej pola
   ze schematu; to jest dokładnie różnica, której uczy ten lab.
   Odpowiedź nr 2 (w płotku ```json) przechodzi dzięki zdjęciu płotka
   PRZED parsowaniem. Jeśli masz `sparsowane 4/6` — płotek nie został
   zdjęty (parsujesz `tekst` zamiast `czysty` — luka 1); jeśli `zgodne
   5/6` — policzyłeś(-aś) rekord bez kompletu pól jako zgodny (pominięte
   `all(pole in rekord for pole in POLA)`); jeśli pętla się wywala —
   łapiesz zły typ błędu albo walidujesz przed try (LLM.3, drabinka).

---

## Atom LLM.5 — Ewaluacja: ground truth, trafność pól i wskaźnik halucynacji

**Typ:** `exercise` · **Czas studenta:** ~20 min · **Koncept:**
`ewaluacja-halucynacje` (KLUCZOWY) · **Krok fadingu:** luki w środku WE

### Cel

Zmierzysz jakość ekstrakcji jak w ML.5 — tylko że „modelem" jest LLM,
a metrykami: trafność per pole i osobny wskaźnik halucynacji. To
kryterium za 30% rubryki.

### Teoria

„Model ładnie odpowiada" to nie pomiar. Pomiar wymaga **ground truth**
— ręcznie oznaczonych poprawnych odpowiedzi: Ty czytasz ogłoszenie
i wpisujesz prawdę do słownika. Rubryka chce ~30 sztuk i ta liczba ma
uzasadnienie, które znasz z ML.2: przy 5 przykładach jedna pomyłka
zmienia trafność o 20 punktów procentowych — takim wynikiem nie da się
sterować poprawkami promptu. Oznaczanie bywa nudne i to jest jego
ukryta zaleta: czytając 30 ogłoszeń, poznajesz SWOJE dane (przypadki
brzegowe, dziwne zapisy widełek) lepiej niż z niejednego wykresu. Potem
porównujesz pole po polu — czysta pętla z F3.5, żadnej magii:

```python
POLA = ["stanowisko", "miasto", "widelki_min"]
trafienia = {pole: 0 for pole in POLA}     # skrócony zapis budowy słownika —
                                           # pełna pętla z F3.3 zrobiłaby to samo
halucynacje = 0

for przypadek in przypadki:                # przypadek = {"model": …, "prawda": …}
    for pole in POLA:
        if przypadek["model"][pole] == przypadek["prawda"][pole]:
            trafienia[pole] = trafienia[pole] + 1
        if przypadek["prawda"][pole] is None and przypadek["model"][______] is not None:
            halucynacje = halucynacje + 1      # luka wyżej: które pole sprawdzasz?
```

**Przewidź:** dla 4 przypadków testowych notebooka (każdy z 3 polami)
trafienia wychodzą po 3/4 na pole. Co mówi wynik „stanowisko: 0.75"?

Że w JEDNYM z czterech przypadków model podał inne stanowisko niż
prawda (w naszych danych: „Data Scientist" zamiast „Starszy Data
Scientist" — ekstrakcja zgubiła seniority). **Trafność per pole** —
osobna liczba dla każdego pola — mówi, GDZIE pipeline kuleje; jedna
średnia by to ukryła (ta sama lekcja co accuracy w ML.5!).

**Wskaźnik halucynacji** to osobna miara z osobnej definicji: pole,
które w prawdzie jest `null` (informacji NIE MA w tekście), a model je
WYPEŁNIŁ. W naszych 4 przypadkach: prawda ma 4 pola-braki, model
wypełnił 2 z nich → wskaźnik 2/4 = 0.5 — poważny sygnał (co drugi brak
model zmyśla!). Zauważ asymetrię: pomyłka „Warszawa" zamiast „Radom"
psuje trafność; zmyślenie „Warszawa" tam, gdzie miasta nie było, to
halucynacja — groźniejsza, bo tworzy dane z niczego. Dlatego rubryka
żąda OSOBNEGO wskaźnika, nie wliczenia w trafność.

Jedno założenie tej pętli warto nazwać wprost: `przypadki` to rekordy
ZGODNE ZE SCHEMATEM. W LLM.7 i w capstonie przychodzą one z parsowania,
gdzie część może być `None` (parse-fail) albo sparsowana-ale-bez-
kompletu-pól. Trafność i halucynacje liczysz **tylko** na rekordach
zgodnych ze schematem — `rekord is not None and all(pole in rekord for
pole in POLA)`, nie na samym „nie-None". Gdybyś puścił(a) tę pętlę na
rekordzie bez pola `widelki_min`, `przypadek["model"]["widelki_min"]`
rzuciłoby `KeyError` w środku ewaluacji (LLM.3: parsowanie ≠ zgodność).
Filtr schema-valid na wejściu jest tarczą przed tym — i pilnuje, byś
liczył(a) trafność na tych samych przypadkach, na których liczysz
`zgodnosc`.

Wyniki idą do tabeli w repo (rubryka: „tabela ewaluacji") — trafność
per pole + wskaźnik halucynacji + odsetek zgodnych ze schematem
(LLM.4). Trzy liczby, które zamieniają „ładnie odpowiada" w pomiar —
a gdy zestawisz je dla promptu v1 i v2 (LLM.2), tabela staje się
dowodem, że Twoje poprawki naprawdę poprawiają, a nie tylko zmieniają.

### Pytania (retrieval)

**P1. Czym jest ground truth w tym projekcie?**

- A. Odpowiedziami modelu przy temperaturze 0 — *Nie — to nadal
  odpowiedzi MODELU; prawdą jest to, co człowiek odczytał z tekstu.*
  (diagnoza: model jako sędzia we własnej sprawie — kalka „konfirmacji
  na tych samych danych" z EDA.3)
- B. **Ręcznie oznaczonymi poprawnymi odpowiedziami — Ty czytasz
  ogłoszenie i zapisujesz prawdę** ✓ — *Tak — ~30 sztuk w capstonie;
  nudne i bezcenne: bez prawdy nie ma pomiaru.*
- C. Dokumentacją API — *Nie — dokumentacja opisuje narzędzie, nie
  prawdę Twoich danych.* (diagnoza: myli źródła autorytetu)
- D. Największym publicznym zbiorem — *Nie — prawda musi dotyczyć
  TWOICH tekstów, pole po polu.* (diagnoza: „więcej danych" zamiast
  właściwych danych)

**P2. Po co trafność PER POLE zamiast jednej średniej?**

- A. Bo tak liczy się szybciej — *Nie — liczy się tyle samo; chodzi
  o diagnozę.* (diagnoza: „techniczna korzyść")
- B. **Bo średnia ukrywa, KTÓRE pole kuleje — a naprawa promptu
  wymaga wiedzy gdzie (np. widełki 0.4 przy stanowisku 0.95)** ✓ —
  *Tak — ta sama lekcja co pułapka accuracy z ML.5: uśrednianie
  chowa porażkę.*
- C. Bo pola tekstowe i liczbowe nie sumują się — *Nie — policzyć
  średnią się DA; problemem jest jej ślepota, nie arytmetyka.*
  (diagnoza: przeszkoda techniczna zamiast metodycznej)
- D. Rubryka każe, powód nieznany — *Nie — powód właśnie poznałeś(-aś);
  rubryki tej ścieżki rozliczają praktyki, nie rytuały.* (diagnoza:
  wymóg jako biurokracja)

**P3. Model wpisał „Kraków" w polu miasto, a ogłoszenie miasta nie
podaje (prawda: null). Jak to liczysz?**

- A. Tylko jako nietrafienie pola — *Połowicznie — to TAKŻE
  nietrafienie, ale rubryka żąda OSOBNEGO zliczenia: zmyślenie z niczego
  to inna klasa błędu niż pomyłka.* (diagnoza: spłaszcza halucynację do
  zwykłego błędu)
- B. **Jako nietrafienie ORAZ halucynację (prawda null + model
  wypełnił) — dwa liczniki, dwie miary** ✓ — *Tak — asymetria jest
  celowa: dane z niczego są groźniejsze niż dane pomylone.*
- C. Jako trafienie, bo Kraków to duże miasto — *Nie —
  prawdopodobieństwo to mechanizm HALUCYNACJI, nie usprawiedliwienie:
  w tekście miasta nie było.* (diagnoza: ocena po wiarygodności —
  LLM.1-P3/D)
- D. Pomijam ten przypadek — *Nie — pomijanie niewygodnych przypadków
  to fałszowanie ewaluacji (ML.3-P3/B w nowym kostiumie).* (diagnoza:
  kosmetyka wyników)

### Drabinka hintów (luka z teorii)

1. **Koncepcyjny:** Warunek halucynacji czyta się: „prawda mówi BRAK,
   a model coś wpisał" — obie strony dotyczą TEGO SAMEGO pola
   z bieżącego obrotu pętli.
2. **Szkielet:** `przypadek["model"][pole]` — ta sama zmienna pętli,
   którą sprawdziłeś po stronie prawdy.
3. **Pełne rozwiązanie z objaśnieniem:** luka: `pole`. Wyniki dla
   danych notebooka: trafienia 3/4 na każde pole, halucynacje 2 przy
   4 polach-brakach (0.5). Samokontrola ewaluacji: suma pól-braków
   w prawdzie policzona ręcznie musi się zgadzać z mianownikiem
   wskaźnika — jeśli nie, licznik zlicza złe pola (wcięcia! — piętra
   pętli jak w F3.2-P2).

---

## Atom LLM.6 — Klucz, limity, dane osobowe: higiena pracy z API

**Typ:** `exercise` · **Czas studenta:** ~15 min · **Koncept:**
`klucz-sekrety-rodo` · **Krok fadingu:** backward — student pisze
regułę do gotowej checklisty · **Atom CZĘŚCIOWO OPERACYJNY** (panel
Colab Secrets — etykiety do potwierdzenia researchem QG)

### Cel

Schowasz klucz API tam, gdzie jego miejsce (Colab Secrets / zmienna
środowiskowa — nigdy w kodzie i repo), zaplanujesz pracę w darmowym
tierze i wyczyścisz dane osobowe z tekstów PRZED wysłaniem do modelu.

### Teoria

Klucz API to **hasło do usługi wystawione na Twoje konto**: kto ma
klucz, ten zużywa Twoje limity jako Ty — bez pytania i bez śladu. Stąd żelazna reguła (rubryka rozlicza ją
wprost): **klucz nigdy nie stoi w kodzie ani w repo** — commit
z kluczem w publicznym repozytorium to klucz oddany światu (historia
Gita pamięta wszystko — EDA.2!). W Colab klucz trzymasz w panelu
sekretów — ikona klucza w lewym pasku bocznym („Secrets" → „Add new
secret"; etykiety angielskie z polskim opisem, jak w GitHubie —
EDA.2) — a w kodzie tylko go POBIERASZ:

```python
from google.colab import userdata
klucz = userdata.get("GEMINI_API_KEY")    # wartość mieszka w panelu, nie w kodzie
```

**Przewidź:** co zobaczy osoba czytająca Twój notebook w repo —
klucz czy nazwę?

Tylko NAZWĘ sekretu — wartość żyje w Twoim panelu Colab i nie jedzie
z plikiem. Poza Colab tę samą rolę pełni **zmienna środowiskowa**
(`os.environ` — stąd sformułowanie rubryki „klucz pobierany ze zmiennej
środowiskowej"); mechanizm inny, zasada identyczna. Jeżeli klucz mimo wszystko
trafił do repo: sama edycja pliku NIE wystarcza (historia commitów!) —
klucz **unieważniasz i generujesz nowy** w panelu usługi.

Dwie pozostałe higieny z opisu projektu:

- **Limity darmowego tieru.** Gemini API w darmowym tierze (klucz
  z AI Studio na konto Google, bez podpinania karty) wystarcza na
  capstone (~30 przykładów), ale limituje zapytania — rzędu 10 na
  minutę (dokładne limity zmieniają się; sprawdzisz je w panelu AI
  Studio). Pętla po przykładach może więc dostać `429` (znasz z BDL,
  EDA.1); lekarstwo: odczekaj i wznów, nie strzelaj w pętli bez
  przerw. Zużycie kontrolujesz, wysyłając każdy przykład RAZ
  i ZAPISUJĄC odpowiedzi (lista — F3.1), zamiast odpytywać ponownie
  przy każdej poprawce ewaluacji.
- **Dane osobowe.** Realne ogłoszenia miewają nazwiska, e-maile,
  telefony rekruterów. Opis projektu wymaga wprost: **usuń lub
  pseudonimizuj PRZED wysłaniem do modelu i niczego takiego nie
  commituj** — wysyłka do zewnętrznego API to przekazanie danych
  osobie trzeciej, a repo jest publiczne. Najprościej: pracuj na
  ogłoszeniach syntetycznych (jak w tym module) albo wytnij dane
  kontaktowe zanim tekst opuści Twój notebook.

Backward completion (notebook LLM.6): dostajesz checklistę
bezpieczeństwa capstone'u z JEDNĄ pustą pozycją — dopisz regułę „co
robię, gdy klucz trafił do repo" (dwa kroki, oba z teorii).

### Pytania (retrieval)

**P1. Dlaczego klucz nie może stać w kodzie notebooka, skoro repo jest
Twoje?**

- A. Bo kod z kluczem nie działa — *Nie — działa aż za dobrze; problem
  jest w UJAWNIENIU, nie działaniu.* (diagnoza: szuka przeszkody
  technicznej)
- B. **Repo capstone'u jest publiczne, a historia Gita wieczna — klucz
  w kodzie to klucz oddany każdemu, kto zajrzy** ✓ — *Tak — kto ma
  klucz, zużywa TWOJE limity jako Ty; sekret mieszka w panelu/env,
  kod zna tylko nazwę.*
- C. Bo klucz jest za długi na komórkę — *Nie — zmieściłby się;
  nie wolno mu tam być.* (diagnoza: ograniczenie wymyślone)
- D. Bo Google blokuje klucze w plikach — *Nie — skanery wycieków
  istnieją, ale to siatka asekuracyjna, nie pozwolenie: reguła jest
  Twoja.* (diagnoza: outsourcing odpowiedzialności)

**P2. Klucz trafił do publicznego repo. Usuwasz linię i commitujesz
poprawkę. Wystarczy?**

- A. Tak — pliku już nie ma — *Nie — plik zniknął z OSTATNIEJ wersji,
  ale historia commitów (EDA.2-P2!) pamięta każdą migawkę: klucz nadal
  jest do odczytania.* (diagnoza: nie rozumie, że commit = wieczna
  migawka — sedno pytania)
- B. **Nie — klucz unieważniasz w panelu usługi i generujesz nowy;
  edycja pliku nie cofa ujawnienia** ✓ — *Tak — rotacja klucza to
  jedyna skuteczna odpowiedź na wyciek.*
- C. Wystarczy zrobić repo prywatnym na godzinę — *Nie — nie wiesz,
  kto już sklonował/zeskanował; ujawnienie jest nieodwracalne.*
  (diagnoza: cofanie czasu zamiast rotacji)
- D. Wystarczy zmienić nazwę sekretu — *Nie — nazwa jest jawna
  z definicji; ujawniona została WARTOŚĆ i to ją się wymienia.*
  (diagnoza: myli nazwę z wartością — odwrotność P1)

**P3. Realne ogłoszenie zawiera nazwisko i telefon rekruterki. Co robisz
PRZED wysłaniem do modelu?**

- A. Nic — model to nie człowiek — *Nie — wysyłka do zewnętrznego API
  to przekazanie danych podmiotowi trzeciemu; opis projektu wymaga
  czyszczenia wprost.* (diagnoza: „to tylko program" jako zwolnienie
  z RODO)
- B. **Usuwam/pseudonimizuję dane kontaktowe (i nie commituję surowych
  rekordów) — albo pracuję na ogłoszeniach syntetycznych** ✓ — *Tak —
  czyszczenie PRZED wysyłką i PRZED repo; syntetyki załatwiają problem
  u źródła.*
- C. Wysyłam, ale nie zapisuję odpowiedzi — *Nie — przekazanie już się
  odbyło; niezapisanie niczego nie cofa.* (diagnoza: sprząta po fakcie
  — kalka P2/C)
- D. Zmieniam tylko nazwisko, telefon zostaje — *Nie — numer telefonu
  to dana kontaktowa jak nazwisko; czyścisz komplet.* (diagnoza:
  pseudonimizacja połowiczna)

### Drabinka hintów (backward completion z teorii)

1. **Koncepcyjny:** Reguła ma dwa kroki i żaden nie brzmi „usuń
   linię z pliku" — myśl o WARTOŚCI klucza (gdzie żyje? jak przestaje
   działać?), nie o pliku.
2. **Szkielet:** „Gdy klucz trafił do repo: (1) natychmiast ______
   klucz w panelu usługi; (2) wygeneruj ______ i umieść go w ______,
   nie w kodzie."
3. **Pełne rozwiązanie z objaśnieniem:** „(1) unieważnij (revoke)
   stary klucz w panelu usługi — od tej chwili wyciek jest bezzębny;
   (2) wygeneruj nowy i umieść go w panelu sekretów/zmiennej
   środowiskowej." Edycja pliku może być KROKIEM TRZECIM (porządki),
   nigdy pierwszym — kolejność odwrotna zostawia działający klucz
   w wiecznej historii.

---

## Atom LLM.7 — LAB „Tabela ewaluacji" (samodzielny finał drabiny)

**Typ:** `lab` · **Czas studenta:** ~30 min · **Koncepty ćwiczone:**
wszystkie z M-LLM · **Krok fadingu:** zadanie samodzielne (sama
specyfikacja)

### Cel

Ostatni lab całej ścieżki: z 8 zapisanych trójek (tekst ogłoszenia,
odpowiedź modelu, ground truth) zbudujesz kompletną tabelę ewaluacji —
dokładnie artefakt, którego rubryka capstone'u żąda za 30%.

### Zadanie (notebook LLM.7 — lista `przypadki` (8 trójek, w tym
1 odpowiedź złamana [parse-fail], 1 sparsowana-ale-niezgodna [słownik
bez pola `widelki_min`] i 2 halucynacje; prawda zawiera **dokładnie
4 pola-braki** `null` — WSZYSTKIE w przypadkach zgodnych ze schematem —
kształt danych jest częścią kontraktu pieczątki) + pusta komórka
„Twoja ewaluacja" + pieczątka)

1. Parsowanie z ochroną (LLM.3/LLM.4): odpowiedzi → rekordy; odsetek
   ZGODNYCH ZE SCHEMATEM (sparsowane ORAZ z kompletem pól) **jako ułamek
   0–1** → **`zgodnosc`** (odsetek, nie licznik — do tabeli wchodzi
   liczba porównywalna między wersjami promptu; UWAGA: rekord, który się
   sparsował, ale nie ma kompletu pól, NIE liczy się do zgodnych).
2. Trafność per pole (LLM.5) na przypadkach ZGODNYCH ZE SCHEMATEM —
   filtr `rekord is not None and all(pole in rekord for pole in POLA)`,
   nie samo „nie-None" (inaczej rekord bez pola wywali `KeyError`) →
   słownik **`trafnosc`** (pole → ułamek).
3. Wskaźnik halucynacji (LLM.5: wypełnione pola-braki / wszystkie
   pola-braki w prawdzie, liczone TYLKO na zgodnych, ułamek 0–1) →
   **`halucynacje_wskaznik`**.
4. Tabela wyników: DataFrame (PD.2!) z wierszami per pole + wydruk —
   to Twoja „tabela ewaluacji w repozytorium".
5. Komórka tekstowa: 2 zdania wniosków (które pole kuleje? co byś
   zmienił(a) w prompcie? — wzorzec EDA.3) + 1 zdanie Ograniczeń
   (ML.6: „8 przykładów to za mało, by…").

Nazwy pogrubione = część specyfikacji (pieczątka wie, gdzie patrzeć).

**Zaliczenie:** komórka-pieczątka: przelicza ewaluację niezależnie tym
samym filtrem schema-valid (dane zapisane ⇒ wynik jedyny: `zgodnosc`
**0.75** [6 z 8], `halucynacje_wskaznik` **0.5** [2 z 4], `trafnosc`
stanowisko ≈ 0.83 / miasto ≈ 0.67 / widelki_min 0.50) i porównuje
`zgodnosc`, `trafnosc` (pieczątka odczytuje słownik jako listę ułamków
w kolejności `POLA`), `halucynacje_wskaznik` — token przy zgodności
(tolerancja float z F3). Komórki tekstowe poza checkiem — ocenia je
rubryka capstone'u.

### Drabinka hintów

1. **Koncepcyjny:** To LLM.4 + LLM.5 sklejone + tabela z PD.2 na
   wierzchu. Kolejność: parsuj-z-ochroną → waliduj → licz TYLKO na
   zgodnych → tabela → słowa. Ostatni raz na ścieżce: buduj
   przyrostowo, uruchamiaj po każdym kroku (L0.4 — od pierwszego dnia
   do ostatniego).
2. **Szkielet:** krok 1 = pętla z LLM.4 (bez luk, z pamięci); krok 2–3
   = pętla z LLM.5 z filtrem SCHEMA-VALID na wejściu — `rekord is not
   None and all(pole in rekord for pole in POLA)`, NIE samo `if rekord
   is not None` (przypadek nr 8 sparsuje się, ale nie ma pola
   `widelki_min` — na samym „nie-None" `przypadek["model"]["widelki_min"]`
   rzuciłoby `KeyError` i wywaliło Ci ewaluację); krok 4:
   `pd.DataFrame([{"pole": p, "trafnosc": trafnosc[p]} for p in POLA])`
   — albo zwykłą pętlą z F3.1, jak wolisz.
3. **Pełne rozwiązanie z objaśnieniem:** (w notebooku, zwinięte) —
   wartości kontrolne: `zgodnosc` 0.75 (6 z 8 — jedna złamana
   [parse-fail], jedna sparsowana-ale-bez-kompletu-pól [nie liczy się do
   zgodnych]); trafność liczona na 6 ZGODNYCH: stanowisko 5/6 ≈ 0.83,
   miasto 4/6 ≈ 0.67, widelki_min 3/6 = 0.50 (od razu widać: ekstrakcja
   widełek kuleje najmocniej — tam celujesz poprawkę promptu);
   halucynacje: 2 wypełnione z 4 pól-braków → `halucynacje_wskaznik` 0.5.
   Najczęstsze potknięcie finału: liczenie trafności na przypadku
   sparsowanym-ale-niezgodnym (brak pola → `KeyError`) albo na złamanym
   (None) — filtr SCHEMA-VALID z kroku 2 jest po to, żeby ani porażka
   parsowania, ani rekord bez kompletu pól nie udawały porażki
   EKSTRAKCJI: to osobne miary (zgodność vs trafność), rubryka chce obu
   OSOBNO.

---

## Egzamin modułu M-LLM (mastery gate — D3)

**Konfiguracja (`examConfigJson`):** 15 pytań, **próg: ≤1 błąd**;
2 warianty izomorficzne (cap 2); retry z drugim wariantem; po 2. oblaniu
correctives; „zarezerwuj ~25 min"; pokrycie 3 × 5 atomów; kalibracja
OSOBNA, przy WE. Format jak poprzednie moduły.

**E1** · A: LLM generuje odpowiedź przez… — wyszukiwanie w bazie prawdy
/ **przewidywanie najbardziej prawdopodobnej kontynuacji tekstu** /
kopiowanie dokumentacji / obliczenia statystyczne na Twoich danych —
*maszyna przewidująca tekst.* · B: Ten sam prompt może dać różne
odpowiedzi, bo… — API ma usterkę / **model losuje spośród
prawdopodobnych kontynuacji** / klucz się zmienia / prompt za krótki —
*niedeterminizm to natura, nie awaria.* → `llm-niedeterminizm-temperatura`
→ LLM.1

**E2** · A: Do ekstrakcji danych temperaturę ustawiasz na… — wysoką
(kreatywność) / **0 — minimalna losowość, maksymalna powtarzalność** /
dowolną / ujemną — *odpowiednik ziarna, słabsza gwarancja.* · B:
Temperaturę raportujesz w repo, bo… — tak wypada / **to parametr
metody wpływający na wyniki (rubryka: seed/temperatura)** / GitHub
wymaga / podnosi trafność — *parametry generacji = część metody.*
→ `llm-niedeterminizm-temperatura` → LLM.1

**E3** · A: Halucynacja to… — błąd składni odpowiedzi / **płynnie
zmyślona informacja, której nie ma w źródle** / odmowa odpowiedzi /
literówka modelu — *fałsz nieodróżnialny na oko.* · B: Halucynacja
jest groźna, bo… — zatrzymuje pipeline błędem / **wygląda jak
prawdziwa dana i wchodzi do analizy bez ostrzeżenia** / zużywa limity
/ psuje formatowanie — *najgroźniejsze błędy bez komunikatów.*
→ `llm-niedeterminizm-temperatura` → LLM.1

**E4** · A: Trzy obowiązkowe elementy promptu ekstrakcyjnego (rubryka)
to… — grzeczność, długość, język / **schemat pól, reguła null,
przykład few-shot** / temperatura, klucz, model / imię modelu, data,
podpis — *specyfikacja, nie prośba.* · B: Reguła „jeśli informacji nie
ma — wpisz null" służy… — skróceniu odpowiedzi / **daniu modelowi
legalnego wyjścia zamiast zmyślania** / przyspieszeniu / walidacji
typów — *najtańsza obrona przed halucynacją.* → `prompt-specyfikacja`
→ LLM.2

**E5** · A: Najlepszy przykład few-shot do ekstrakcji pokazuje… —
ogłoszenie z kompletem pól / **przypadek trudny: brak informacji →
null w odpowiedzi** / najdłuższe ogłoszenie / odpowiedź bez JSON —
*pokazuj zachowanie, którego model sam nie zgadnie.* · B: Prompty
wersjonujesz w repo, bo… — są tajne / **sterują wynikami jak kod —
bez historii nie odtworzysz, skąd wzięły się wyniki** / GitHub tego
chce / są długie — *prompt to kod.* → `prompt-specyfikacja` → LLM.2

**E6** · A: „Wyciągnij najważniejsze informacje" to zły prompt, bo… —
za krótki / **nie definiuje schematu — każda odpowiedź może mieć inny
kształt** / nieuprzejmy / po polsku — *bez schematu nie ma walidacji.*
· B: Schemat w prompcie podaje… — tylko liczbę pól / **nazwy i typy
pól, dosłownie** / przykładowe wartości bez nazw / adres API —
*specyfikacja kształtu wyjścia.* → `prompt-specyfikacja` → LLM.2

**E7** · A: `json.loads(tekst)` zwraca… — tekst bez zmian / **struktury
Pythona (słownik/listę) zbudowane z JSON-a** / plik na Dysku / True/
False — *ze świata znaków do świata struktur.* · B: Odpowiedź modelu
ucięta w połowie JSON-a → `json.loads` … — zwróci połowę słownika /
**zatrzyma się błędem JSONDecodeError** / naprawi JSON / zwróci None
samo z siebie — *None to TWOJA decyzja w except.*
→ `json-parsowanie-walidacja` → LLM.3

**E8** · A: `try/except json.JSONDecodeError` w pętli po 30
odpowiedziach służy temu, by… — ukryć błędy / **jedna zła odpowiedź
nie zatrzymała pętli, a porażka została policzona** / przyspieszyć /
poprawić JSON — *obsłuż i raportuj, nie zamiataj.* · B: Łapiemy
KONKRETNY błąd, nie „wszystko", bo… — innych nie da się złapać /
**inne błędy mają dalej głośno krzyczeć — to informacja o usterkach**
/ tak krócej / wszystko jedno — *wyciszasz tylko to, co umiesz
obsłużyć.* → `json-parsowanie-walidacja` → LLM.3

**E9** · A: Walidacja „zgodny ze schematem" sprawdza… — czy odpowiedź
jest długa / **czy rekord ma komplet pól ze schematu (po udanym
parsowaniu)** / czy model użył null / czy tekst jest po polsku —
*parsuj, potem waliduj.* · B: Rubryka każe raportować odsetek
odpowiedzi zgodnych ze schematem — liczysz go jako… — zgodne przez
zgodne / **zgodne przez WSZYSTKIE odpowiedzi** / wszystkie przez
zgodne / średnią trafności — *licznik z F3.2, mianownik pełny.*
→ `json-parsowanie-walidacja` → LLM.3

**E10** · A: Ground truth w mini-ewaluacji to… — odpowiedzi modelu
przy temperaturze 0 / **ręcznie oznaczone poprawne odpowiedzi
(~30 przykładów)** / dokumentacja API / dane z internetu — *prawdę
oznacza człowiek.* · B: Bez ground truth… — ewaluacja jest szybsza /
**nie ma pomiaru — „ładnie odpowiada" to wrażenie, nie metryka** /
model działa lepiej / wystarczy zgodność schematu — *pomiar wymaga
prawdy.* → `ewaluacja-halucynacje` → LLM.5

**E11** · A: Trafność liczysz PER POLE, bo… — średnia się nie liczy /
**średnia ukrywa, które pole kuleje — a naprawa promptu wymaga wiedzy
gdzie** / pól jest mało / rubryka nie podaje powodu — *lekcja accuracy
z ML.5.* · B: „widelki_min: 0.4 przy stanowisko: 0.95" mówi Ci, że… —
model zepsuty całkiem / **ekstrakcja widełek kuleje — tam celujesz
poprawkę promptu** / dane złe / ewaluacja błędna — *diagnoza zamiast
wyroku.* → `ewaluacja-halucynacje` → LLM.5

**E12** · A: Wskaźnik halucynacji zlicza przypadki, gdy… — model
pomylił wartości / **prawda mówi null (braku danych), a model pole
wypełnił** / model zwrócił null / JSON się nie sparsował — *dane
z niczego.* · B: Halucynację liczysz OSOBNO od trafności, bo… — tak
łatwiej / **zmyślenie z niczego to groźniejsza klasa błędu niż
pomyłka — rubryka żąda osobnej miary** / trafność jej nie widzi
technicznie / to to samo — *asymetria celowa.*
→ `ewaluacja-halucynacje` → LLM.5

**E13** · A: Klucz API w kodzie publicznego repo to problem, bo… —
kod działa wolniej / **klucz jest oddany każdemu — zużyje Twoje limity
jako Ty; sekret mieszka w panelu/env** / plik robi się długi / Google
zabrania składniowo — *hasło do usługi.* · B: W kodzie notebooka
z sekretem stoi… — wartość klucza / **tylko NAZWA sekretu (wartość
w panelu/env)** / zaszyfrowany klucz / nic — *kod zna nazwę, nie
wartość.* → `klucz-sekrety-rodo` → LLM.6

**E14** · A: Klucz wyciekł do historii repo. Skuteczna kolejność to… —
usuń linię i commit / **unieważnij klucz w panelu, wygeneruj nowy,
dopiero potem porządki w plikach** / zrób repo prywatne / zmień nazwę
sekretu — *historia Gita jest wieczna.* · B: Edycja pliku nie cofa
wycieku, bo… — GitHub robi kopie zapasowe / **każdy commit to wieczna
migawka — stara wersja z kluczem zostaje w historii** / plik się
cache'uje / klucz jest w nazwie — *EDA.2-P2 w wersji bezpieczeństwa.*
→ `klucz-sekrety-rodo` → LLM.6

**E15** · A: Realne ogłoszenie z nazwiskiem i telefonem rekruterki —
przed wysłaniem do API… — wysyłasz, to tylko program / **usuwasz/
pseudonimizujesz dane kontaktowe (i nie commitujesz surowych)** /
skracasz tekst / zmieniasz tylko nazwisko — *wysyłka = przekazanie
podmiotowi trzeciemu.* · B: Najprostszy sposób na zero problemu
z danymi osobowymi w capstonie to… — mało przykładów / **ogłoszenia
syntetyczne (jak w atomach)** / repo prywatne / wysyłka nocą —
*problem rozwiązany u źródła.* → `klucz-sekrety-rodo` → LLM.6

---

## Pozycja CAPSTONE — `ds-llm-strukturalna-ekstrakcja` (rampa i kamienie)

**Typ:** `project` (REUSE-as-capstone, D4; rubryka NIETKNIĘTA) ·
**Czas studenta:** ~5 h (estymata projektu). OSTATNI capstone drabiny.

**Rampa — mapowanie 4 kryteriów rubryki:** jakość promptu (25%) →
LLM.2; poprawność struktury (25%) → LLM.3+LLM.4; mini-ewaluacja (30%)
→ LLM.5+LLM.7 (tabela przećwiczona 1:1); reprodukowalność (20%) →
LLM.1 (temperatura), LLM.6 (klucz w env), EDA.2 (repo/README/
requirements/Git). Pierwsze ŻYWE wywołanie API: capstone — z kluczem
z LLM.6, promptem z LLM.2 i parserem z LLM.3/4; briefing (`theory_md`)
prowadzi przez SDK i darmowy tier. Dane: ogłoszenia/opisy — syntetyczne
albo czyszczone wg LLM.6-P3.

**Kamienie milowe (propozycja do `configJson.checks`, 4 szt.;
definicja finalna przy 1E.6):**

- **K1 „Pipeline parsuje":** w sesji istnieje lista rekordów
  sparsowanych z odpowiedzi + policzony odsetek zgodnych (check
  generyczny — struktura, nie wartości).
- **K2 „Ewaluacja policzona":** tabela z trafnością per pole
  i wskaźnikiem halucynacji dla ≥25 przykładów z ground truth
  (struktura tabeli + zakresy 0–1 — deterministyczne).
- **K3 „Repo bez sekretów":** link do publicznego repo; check HTTP:
  README, requirements, katalog promptów, tabela ewaluacji — ORAZ
  skan wzorców kluczy (np. prefiks kluczy Google) w plikach —
  deterministyczny strażnik reguły LLM.6 (szczegół wzorców przy 1E.6).
- **K4 „Submit"** do pipeline'u recenzji (rubryka + viva; wariant C;
  ochrona streaka — D9).

---

## Strona „Pierwsza pomoc — M-LLM" (D5a, statyczna, per moduł)

Strony L0–M-ML obowiązują. Przyrost M-LLM:

1. **`JSONDecodeError` na odpowiedzi modelu** → odpowiedź obudowana
   prozą albo płotkiem ```json — zdejmij płotek przed parsowaniem
   (przepis LLM.4); ucięta odpowiedź → zostaje None w try/except,
   liczona w odsetku zgodności (LLM.3).
2. **`KeyError` przy czytaniu rekordu** → model pominął pole — to nie
   powód do crashu, tylko rekord NIEZGODNY ze schematem: walidacja
   kompletu pól PRZED sięganiem po wartości (LLM.3).
3. **Model raz zwraca czysty JSON, raz z komentarzem** → temperatura
   ponad 0 albo prompt bez „zwróć wyłącznie JSON" — popraw oba (LLM.1/
   LLM.2); resztki niedeterminizmu łapie parser z ochroną.
4. **`429` / komunikat o limicie** → darmowy tier limituje zapytania
   na minutę: odczekaj i wznów; wysyłaj każdy przykład RAZ i zapisuj
   odpowiedzi (LLM.6) zamiast odpytywać w kółko.
5. **Klucz „nie działa" w Colab** → sekret nieustawiony w panelu,
   literówka NAZWY w `userdata.get(...)`, albo brak zgody notebooka
   na dostęp do sekretu (przełącznik przy sekrecie w panelu).
6. **Klucz trafił do repo** → NIE zaczynaj od edycji pliku: unieważnij
   klucz w panelu usługi, wygeneruj nowy, dopiero potem porządki
   (LLM.6-P2 — historia Gita jest wieczna).
7. **Wskaźnik halucynacji = 0 przy podejrzanie gładkich danych** →
   sprawdź, czy ground truth w ogóle MA pola-braki (mianownik!);
   ewaluacja bez trudnych przypadków niczego nie mierzy (LLM.5,
   samokontrola z drabinki).
8. **Trafność liczona na złamanych rekordach (None) albo `KeyError`
   w środku ewaluacji** → filtruj rekordy ZGODNE ZE SCHEMATEM przed
   liczeniem trafności: `rekord is not None and all(pole in rekord for
   pole in POLA)`, nie samo „nie-None" (rekord, który się sparsował, ale
   nie ma pola `widelki_min`, przejdzie „nie-None" i wywali `KeyError`).
   Zgodność i trafność to dwie OSOBNE miary (LLM.7, hint 3).

---

## Zasoby opcjonalne modułu (pod `curriculum_item_resources`; do weryfikacji QG)

| url | label | function | license | language | registrationRequired | verifiedAt |
|---|---|---|---|---|---|---|
| https://ai.google.dev/gemini-api/docs | Gemini API — dokumentacja (z projektu; ścieżka główna capstone'u). UWAGA przy briefingu: quickstart Google pokazuje już NOWSZE API (`client.interactions.create`) — nie linkować go jako „ten sam kod"; `generate_content` z atomów pozostaje wspierane | praktyka-docs (EN z fragmentami PL) | własnościowa (Google) | EN/PL | tak (konto Google — bez kroku billingu; free tier potwierdzony cennikiem) | 2026-07-11 (HTTP 200; gemini-2.5-flash: Stable, free tier „Free of charge") |
| https://huggingface.co/learn/llm-course/chapter1/1 | Hugging Face LLM Course — rozdz. 1 (z projektu) | kurs (EN — poza ścieżką krytyczną) | Apache 2.0 (materiały HF) | EN | nie | 2026-07-11 (HTTP 200, bez rejestracji) |
| https://www.youtube.com/watch?v=PO0hL_6clPo | „Jak działa ChatGPT? … duży model językowy (LLM) w 30 minut" (Robert Sikora, ~30 min, 2024) | wideo/kurs (trzecia funkcja QG-5) | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane; „czym jest LLM" dla laika; halucynacje pokrywa teoria atomów; seans kontrolny przed ingest) |
| https://www.youtube.com/watch?v=8uO_oBQ2j54 | „AI LLM — co to jest i jak działa?" (Marszałkowski projektuje, ~11 min, 2024) — szybki wstęp | wideo pomocnicze | YouTube Standard License | **PL** | nie | 2026-07-11 (metadane) |

Sedno M-LLM w całości w polskiej teorii atomów (D4).

---

## Słowniczek terminów EN (M11) — przyrost względem L0–M-ML

| Termin | Po polsku |
|---|---|
| LLM / token | model przewidujący kolejne fragmenty tekstu / fragment-jednostka tekstu |
| temperatura | pokrętło losowości generacji; do ekstrakcji: 0 (raportowana jak ziarno) |
| prompt / few-shot | tekst-specyfikacja dla modelu / przykład(y) pokazujące oczekiwane zachowanie |
| halucynacja | płynnie zmyślona informacja, której nie ma w źródle |
| `json.loads` | tekst JSON → struktury Pythona (słownik/lista) |
| `try` / `except` | „spróbuj; jeśli poleci TEN błąd — zrób to" (łap konkretny typ!) |
| ground truth | ręcznie oznaczona prawda do pomiaru jakości |
| wskaźnik halucynacji | odsetek pól-braków (null w prawdzie), które model wypełnił |
| klucz API / sekret | hasło do usługi — żyje w panelu sekretów/env, nigdy w kodzie i repo |
| Colab Secrets / `userdata.get` | panel sekretów Colab / pobranie wartości po nazwie |
| pseudonimizacja | usunięcie/zamiana danych osobowych przed wysyłką i przed repo |

---

## Notatki dla Olivera (ingest/1E.3/1E.6) — haki i jawne decyzje

- **Struktura pozycji (`order`):** LLM.1 → LLM.2 → LLM.3 → LLM.4 (lab)
  → LLM.5 → LLM.6 → LLM.7 (lab) → przegląd przed egzaminem (reuse) →
  egzamin (15/≤1) → CAPSTONE. Modelowanie atomów jak poprzednie moduły.
- **Audyt pojemności D10 — w tym dokumencie:** 5 atomów, bez podziału.
- **Strategia determinizmu (kluczowa decyzja treściowa):** atomy i laby
  na ZAPISANYCH przykładach — **spreparowanych dydaktycznie, NIE
  będących prawdziwymi odpowiedziami modelu** (jawna deklaracja;
  realistyczne kształty błędów: ucięcie, płotek markdown, halucynacja).
  **Jeden jawny wyjątek: pary odpowiedzi do LLM.1 hint 2 (wysoka vs
  zerowa temperatura) będą PRAWDZIWYMI, utrwalonymi odpowiedziami
  z żywego API** — wygenerowanymi raz przy budowie notebooków (TODO
  poz. 1): demonstracja niedeterminizmu musi być autentyczna, żeby
  „halucynacja na żywo" z hintu 3 mówiła prawdę. Pierwsze żywe
  wywołanie STUDENTA = capstone. Dzięki temu QG wykonuje każdą liczbę,
  a treść nie zależy od zachowania modelu w czasie.
- **Kanoniczne zbiory LLM.4 i LLM.7 (ADR-022 zmiany 2/3/6; JEDYNY
  obowiązujący listing).** Komórki „Dane" notebooków LLM.4/LLM.7 muszą
  odtworzyć te zbiory co do znaku; pieczątki liczą kontrolne z NICH.
  Zbiory deterministyczne (spreparowane, nie z żywego API) ⇒ każda
  kontrolna ma jeden legalny wynik.

  LLM.4 — 6 tekstów odpowiedzi:

  ````python
  odpowiedzi = [
      '{"stanowisko": "tester", "miasto": "Kraków", "widelki_min": 8000}',            # R1 zgodna
      '```json\n{"stanowisko": "analityk", "miasto": "Radom", "widelki_min": 7000}\n```',  # R2 zgodna (płotek)
      'Oto wynik: {"stanowisko": "kurier", "miasto":',                               # R3 PARSE-FAIL (ucięta)
      '{"stanowisko": "grafik", "miasto": null, "widelki_min": 5000}',               # R4 zgodna (miasto=null OK)
      '{"stanowisko": "magazynier", "miasto": "Katowice"}',                          # R5 PARSE-BUT-INVALID (brak widelki_min)
      '{"stanowisko": "kucharz", "miasto": "Wrocław", "widelki_min": 6000}',         # R6 zgodna
  ]
  # kontrolne: sparsowane 5/6 (R3 pada), zgodne 4/6 (R5 parsuje, ale bez pola)
  ````

  LLM.7 — 8 trójek `(odpowiedz_modelu_TEKST, prawda)`:

  ````python
  przypadki = [
      # C1: prawda M=null, W=null; model HALUCYNUJE miasto, W poprawnie null
      ('{"stanowisko": "tester oprogramowania", "miasto": "Warszawa", "widelki_min": null}',
       {"stanowisko": "tester oprogramowania", "miasto": None, "widelki_min": None}),
      # C2: prawda M=null; model M=null (trafienie), W trafia
      ('{"stanowisko": "kurier", "miasto": null, "widelki_min": 8000}',
       {"stanowisko": "kurier", "miasto": None, "widelki_min": 8000}),
      # C3: prawda W=null; model HALUCYNUJE widelki 8000
      ('{"stanowisko": "analityk danych", "miasto": "Kraków", "widelki_min": 8000}',
       {"stanowisko": "analityk danych", "miasto": "Kraków", "widelki_min": None}),
      # C4: model myli miasto (Gdańsk vs Kraków) i widelki (5000 vs 6000) — wartości, nie null
      ('{"stanowisko": "grafik", "miasto": "Gdańsk", "widelki_min": 5000}',
       {"stanowisko": "grafik", "miasto": "Kraków", "widelki_min": 6000}),
      # C5: pełne trafienie (odpowiedź w płotku markdown)
      ('```json\n{"stanowisko": "kucharz", "miasto": "Wrocław", "widelki_min": 12000}\n```',
       {"stanowisko": "kucharz", "miasto": "Wrocław", "widelki_min": 12000}),
      # C6: model gubi seniority (stanowisko) i myli widelki (7000 vs 9000)
      ('{"stanowisko": "programista", "miasto": "Poznań", "widelki_min": 7000}',
       {"stanowisko": "starszy programista", "miasto": "Poznań", "widelki_min": 9000}),
      # C7: PARSE-FAIL (ucięta, obudowana prozą)
      ('Oto dane: {"stanowisko": "recepcjonista", "miasto": "Łódź"',
       {"stanowisko": "recepcjonista", "miasto": "Łódź", "widelki_min": 5000}),
      # C8: PARSE-BUT-INVALID (brak pola widelki_min) — TU siedzi mina KeyError
      ('{"stanowisko": "magazynier", "miasto": "Katowice"}',
       {"stanowisko": "magazynier", "miasto": "Katowice", "widelki_min": 4500}),
  ]
  # kontrolne (filtr schema-valid!): zgodnosc 0.75 (6/8 — C7 parse-fail, C8 bez pola);
  # 4 pola-braki w prawdzie: C1.miasto, C1.widelki_min, C2.miasto, C3.widelki_min;
  # halucynacje 2 (C1.miasto=Warszawa, C3.widelki_min=8000) → halucynacje_wskaznik 0.5;
  # trafnosc na 6 zgodnych: stanowisko 5/6≈0.83, miasto 4/6≈0.67, widelki_min 3/6=0.50
  ````

  Zweryfikowane wykonaniem 2026-07-24 (log QG poniżej) — Python stdlib,
  bez żywego API.
- **[NOTA DLA BUILDERA — pieczątki M-LLM po finalizacji ADR-022 przez
  Ethana] Recompute pieczątki MUSI użyć filtra SCHEMA-VALID**, tego
  samego, co uczy treść: `rekord is not None and all(pole in rekord for
  pole in POLA)` — **nie** samego `rekord is not None`. Powód: przypadek
  C8 (LLM.7) / R5 (LLM.4) sparsuje się, ale nie ma pola `widelki_min`;
  na naiwnym filtrze `przypadek["model"]["widelki_min"]` rzuca `KeyError`
  i pieczątka pada. Jeśli pieczątka policzy innym filtrem niż student,
  wyniki się ROZJADĄ (student 0.75, pieczątka 0.875) — parytet Python↔TS
  na TYM SAMYM filtrze. Docelowy kontrakt `configJson.checks` (do
  wpisania przez buildera w manifeście packera — dziś jeszcze na starych
  wartościach):
  - **LLM.4:** `rekordy` len == **6** (było 5); `zgodne` == **4** (bez
    zmian wartości, zmiana mianownika 5→6); **NOWY** check parsowania
    `sparsowane` == **5** (rozdziela parse od schematu — sedno zmiany).
  - **LLM.7:** `przypadki_liczba` == 8 (bez zmian); `zgodnosc` == **0.75**
    (było 0.875); `halucynacje_wskaznik` == **0.5** (bez zmian);
    `trafnosc` — recompute schema-valid daje `[5/6, 4/6, 3/6]` w
    kolejności `POLA` (predykat `trafnosc_zgodna` liczony na 6 zgodnych,
    nie na 8).
- **Komunikaty odmowy pieczątki LLM.7 (treść — do wpięcia przez
  buildera; wzorzec honest-message G4).** Zbiór jest deterministyczny,
  więc każda kontrolna ma JEDEN legalny wynik — odmowa nazywa KONKRETNY
  błąd studenta, nigdy „pipeline zepsuty". Cztery diagnozy:
  1. **Wcięcia w pętli ewaluacji (LLM.5).** „Twój `halucynacje_wskaznik`
     wyszedł {x}, a z tego zbioru jedyny wynik to 0.5 (2 z 4). Najczęściej
     to WCIĘCIE: instrukcja zliczająca halucynację albo sprawdzenie
     `prawda[pole] is None` stoi o piętro wyżej/niżej, niż trzeba — należy
     do pętli po POLA i ma dotyczyć TEGO pola z bieżącego obrotu (piętra
     pętli jak w F3.2-P2). Sprawdź, na którym wcięciu rośnie licznik."
  2. **Trafność liczona poza zgodnymi (filtr).** „Twoja `trafnosc` nie
     zgadza się ze wzorcem (stanowisko ≈0.83, miasto ≈0.67, widelki_min
     0.50). Liczysz ją na WSZYSTKICH 8 przypadkach zamiast na 6 zgodnych
     ze schematem — złamany (None) i sparsowany-bez-pola wchodzą do
     mianownika i psują ułamek. Odfiltruj przed liczeniem: `rekord is not
     None and all(pole in rekord for pole in POLA)`."
  3. **Parsowanie pomylone ze schematem.** „Twoja `zgodnosc` wyszła 0.875,
     a jedyny poprawny wynik to 0.75 (6 z 8). Policzyłeś(-aś) SPARSOWANE
     (7 — w tym odpowiedź, która się wczytała, ale nie ma pola
     `widelki_min`) zamiast ZGODNYCH ZE SCHEMATEM (6). To dwie bramki
     (LLM.4): do `zgodnosc` wchodzi tylko rekord z KOMPLETEM pól — dołóż
     `all(pole in rekord for pole in POLA)`."
  4. **Licznik/mianownik halucynacji.** „Twój `halucynacje_wskaznik` ≠ 0.5
     (2 z 4). Sprawdź OBIE liczby osobno: mianownik to pola-braki w
     PRAWDZIE (`prawda[pole] is None`) liczone TYLKO na zgodnych = 4;
     licznik to te braki, które model WYPEŁNIŁ (`model[pole] is not
     None`) = 2. Mianownik ≠ 4 → liczysz braki także na złamanym/
     niezgodnym przypadku (filtruj wejście); licznik ≠ 2 → mylisz »model
     wypełnił« z »model trafił« (halucynacja to prawda=null ORAZ
     model≠null, niezależnie od trafności)."
- **1 koncept = 1 atom — deklaracje (standard L0.2):** LLM.5 —
  bundling ewaluacja+halucynacje (jedna materia: pomiar jakości
  ekstrakcji wobec prawdy; wskaźnik halucynacji to metryka tej samej
  ewaluacji). **LLM.6 — najszerszy bundling drabiny: klucz + limity +
  dane osobowe**; wspólny mianownik: „higiena pracy z zewnętrznym,
  płatnym-w-limitach API na cudzych danych" — trzy reguły jednego
  kontraktu z usługą, egzekwowane razem kamieniem K3; do oceny
  w standardzie QG-5.
- **Monitoring par egzaminu w D11 (precedensy od F2): E2, E3, E5, E9,
  E13, E15** — 6/15 par „dwustronnych" (najwyższy odsetek w ścieżce —
  spodziewany przy atomach koncepcyjnych); przy odstającym success
  rate — kandydaci do przepisania w pierwszej kolejności.
- **Nazwa modelu w WE LLM.1 (`gemini-2.5-flash`):** podlega konwencji
  świeżości verifiedAt (reweryfikacja kwartalna jak etykiety UI) —
  identyfikatory modeli starzeją się szybciej niż składnia SDK
  (research: 2.0-flash już wycofany, 2.5-flash Stable).
- **RODO (bramka Ryana):** LLM.6 + E15 to jedyna materia danych
  osobowych w drabinie (pseudonimizacja, przekazanie podmiotowi
  trzeciemu) — **do sign-offu Ryana przy ingest** (konwencja person);
  treść trzyma się litery opisu projektu.
- **Nowa składnia JIT (deklaracja):** `json.loads` + `try/except`
  (LLM.3) — ostatnie nowości Pythona na ścieżce; `try/except` uczony
  z regułą „łap konkretny typ". Snippet SDK w LLM.1 (`google-genai`
  2.10.0 preinstalowany — backend-info 2026-07-11) — składnię
  potwierdza research QG; atomy go nie wykonują (żywe API poza
  atomami), capstone + briefing prowadzą.
- **Spłata zapowiedzi z M-ML:** „iteracja po przykładach zwykłym for"
  — zrealizowana w LLM.4/LLM.5/LLM.7 (F2.3, zero nowej składni pętli);
  obietnica `while`/`range()` NIE dotyczy M-LLM — drabina pilotażu
  kończy się bez nich (just-in-time pozostaje na przyszłe ścieżki).
- **LLM.6 częściowo operacyjny:** etykiety panelu Colab Secrets
  (ikona klucza, przełącznik dostępu per notebook) — DO POTWIERDZENIA
  researchem QG + screenshot przy budowie (konwencja L0/EDA.2);
  `userdata.get` — składnia do potwierdzenia tamże.
- **Kamień K3 — skan sekretów:** deterministyczny grep wzorców kluczy
  w plikach repo (prefiks kluczy Google itp.) — szczegół wzorców przy
  1E.6; fałszywe alarmy możliwe (dokumentacyjne przykłady) — decyzja
  progu tamże.
- **Budżety słów (D1, zmierzone po poprawkach QG):** teorie
  LLM.1–LLM.6 = 357–462 słów z blokami kodu, 301–376 bez nich —
  w widełkach przy obu metodach (LLM.3 urósł poprawką W1 —
  objaśnienie zapisów skróconych w teorii).
- **TODO przed ingest 1E.2:**
  1. Budowa 9 notebooków M-LLM (fixtures z treści; pieczątki
     deterministyczne); pary odpowiedzi do LLM.1 hint 2 wygenerować
     na żywym API RAZ przy budowie i utrwalić (jawny wyjątek od
     strategii determinizmu — deklaracja wyżej).
     ⚠ Konstrukcja zbioru LLM.7 (QG 2026-07-21 INFO-2, zaostrzone
     2026-07-24 ADR-022): wszystkie **4 pola-braki prawdy muszą leżeć w
     przypadkach ZGODNYCH ZE SCHEMATEM** (nie w złamanej odpowiedzi ANI
     w sparsowanej-bez-kompletu-pól) — pętla wzorcowa z LLM.5 czyta
     `przypadek["model"][pole]`, a dla złamanego rekordu to `None`
     („wypełnione" nieokreślone), zaś dla rekordu bez pola `KeyError`;
     kontrakt 0.5 = 2/4 liczy braki wyłącznie na 6 zgodnych. W bieżącym
     zbiorze braki siedzą w C1/C2/C3 (wszystkie schema-valid); C7
     (parse-fail) i C8 (parse-but-invalid) mają prawdę BEZ `null`.
  2. Seanse kontrolne wideo PL (Robert Sikora ~30 min; Marszałkowski
     ~11 min) — składnia SDK, free tier, Colab Secrets zweryfikowane
     researchem 2026-07-11 (szczegóły w zasobach i pierwszej pomocy).
  3. Screenshot panelu Secrets przy budowie (etykiety EN potwierdzone
     researchem; przełącznik „Notebook access" per notatnik
     potwierdzony).

## Przebieg QG tego dokumentu (2026-07-11)

Draft → przepływy parsowania/ewaluacji wykonane przez autora w Pythonie
PRZED pisaniem treści (fixtures deterministyczne; 0.75 per pole /
2 halucynacje / JSONDecodeError zweryfikowane) → **2 agentów
weryfikacyjnych (Fable 5)**: (1) przegląd zgodności z ADR-014
z wykonaniem wszystkich fixtures (LLM.4 4/5 z kontrpróbą 3/5 bez
zdjęcia płotka; LLM.7 7/8 + 2 halucynacje — osiągalne i jednoznaczne)
— ZERO znalezisk krytycznych; 4 WAŻNE (comprehension i `all()` nigdy
nieuczone, a luka ćwiczeniowa stała wewnątrz nieznanej składni —
mechanika przeniesiona do teorii LLM.3/LLM.5 + skorygowana deklaracja
JIT; sprzeczność deklaracji determinizmu z fixtures LLM.1 —
rozstrzygnięta jawnym wyjątkiem; wpisy bundlingu LLM.5/LLM.6
i monitoringu 6 par dwustronnych; pomiary budżetów), 4 drobne —
wcielone (5–6 sesji; verifiedAt dla nazwy modelu; bramka Ryana dla
RODO; poz. 5 pierwszej pomocy potwierdzona researchem); werdykt
„gotowe po poprawkach"; (2) research — składnia `google-genai`
potwierdzona (temperatura przez `config=GenerateContentConfig` —
dodana do WE; quickstart Google pokazuje już nowsze API — nota
w zasobach), `gemini-2.5-flash` Stable i darmowy (free tier bez kroku
billingu potwierdzony cennikiem; limity nieoficjalne ~10/min —
pierwsza pomoc odsyła do AI Studio), Colab Secrets potwierdzone
(panel/`userdata.get`/przełącznik per notatnik; etykiety EN + opis PL
— wzorzec GitHub), wideo PL: Robert Sikora (30 min, 2024)
+ Marszałkowski (11 min, 2024).

## Przebieg QG spłaty długu labu LLM.7 (2026-07-21)

Semantyka `zgodnosc` rozstrzygnięta: ODSETEK 0–1 (0.875 = 7 z 8), nie
licznik; przybite „dokładnie 4 pola-braki" w prawdzie → `halucynacje_wskaznik`
0.5 = 2/4 (definicja LLM.5, arytmetyka zweryfikowana przez agenta QG na
spójność z LLM.4/LLM.5); `trafnosc` odczytywana przez pieczątkę jako lista
ułamków w kolejności `POLA`. INFO-2 wcielone jako nota konstrukcyjna zbioru
w TODO (wszystkie 4 braki w przypadkach parsowalnych). **GO Z NOTAMI.**

## Przebieg QG rewizji zbiorów LLM.4/LLM.7 (2026-07-24, ADR-022 zmiany 2/3/6)

**Kontekst.** Przegląd ADR-022 (kuracja): dołożenie przypadku
*sparsowany-ale-niezgodny* (słownik bez pola `widelki_min`) rozbija
dotychczasowy filtr `if rekord is not None` — taki rekord przechodzi
`is not None`, a `rekord["widelki_min"]` rzuca `KeyError` w kodzie
STUDENTA. Zmiana 2 (zaostrzenie filtra do schema-valid), zmiana 3
(kanoniczne zbiory z rozdziałem parse↔schema), zmiana 6 (rekoncyliacja
liczb). To SUPERSEDUJE semantykę z 2026-07-21 (`zgodnosc` 0.875 → 0.75).

**Wykonanie (Python stdlib, zbiory deterministyczne, bez żywego API).**
Oba kanoniczne zbiory (listing w „Notatkach dla Olivera") przeliczone
skryptem weryfikacyjnym:

- **LLM.4** (6 odpowiedzi): `sparsowane` **5/6** (R3 parse-fail pada),
  `zgodne ze schematem` **4/6** (R5 parsuje, ale bez pola `widelki_min`
  — wypada). Rozdział parse↔schema policzony, nie deklarowany.
- **LLM.7** (8 trójek): `zgodnosc` **0.75** (6/8 — C7 parse-fail, C8
  parse-but-invalid poza zgodnymi); pola-braki w prawdzie **4** (C1.miasto,
  C1.widelki_min, C2.miasto, C3.widelki_min); halucynacje **2** (C1.miasto,
  C3.widelki_min) → `halucynacje_wskaznik` **0.5**; `trafnosc` na 6
  zgodnych: stanowisko **5/6**, miasto **4/6**, widelki_min **3/6**
  (0.83 / 0.67 / 0.50 — `widelki_min` kuleje najmocniej, czytelne dla
  studenta). Kontrpróba: naiwny filtr `is not None` → `KeyError:
  'widelki_min'` na C8 (dowód miny odtworzony).

**Ripple wcielony w prozie (student-facing, VERBATIM):** LLM.3 teoria
(parsowanie ≠ zgodność + `KeyError`), LLM.4 (cel/zadanie/zaliczenie/
hinty — dwa liczniki), LLM.5 teoria (filtr schema-valid przed trafnością),
LLM.7 (zadanie/kroki/zaliczenie/hinty 2–3), Pierwsza pomoc poz. 8.
Rekoncyliacja 0.875 → 0.75: wszędzie w sekcjach atomów (0.875 pozostaje
WYŁĄCZNIE w historycznych logach QG 2026-07-11/2026-07-21 jako zapis
poprzedniej decyzji — nie fałszujemy historii; obowiązuje ten log).

**Granica roli.** To warstwa DYDAKTYCZNA (wartości `expect` policzone z
treści — styk 1 skilla). Pieczątki / kontrakt `configJson.checks`
(manifest packera) buduje builder po finalizacji ADR-022 przez Ethana —
TĄ SAMĄ regułą schema-valid; docelowe wartości checków i nota parytetu
Python↔TS w „Notatkach dla Olivera". Manifest packera na 2026-07-24
wciąż na starych wartościach (0.875 / rekordy 5) — to świadomy blocker
pieczątek, nie przeoczenie.

### Brama przed oddaniem — część A (T1–T5)

| Test | Zakres | Wynik |
|---|---|---|
| **T1 — źródło i determinizm** | Poprawki wyłącznie w `docs/curation/sophia-1e2-mllm-atomy.md`; `m-llm.json` regenerowany packerem (`pnpm content:pack-curriculum`), zero ręcznej edycji JSON; kontrakt-test determinizmu zielony dwukrotnie | **PASS** (repack + 2× determinizm — patrz log komend) |
| **T2 — czystość widoku studenta** | Grep sekcji atomów (Cel/Teoria/Zadanie/Pytania/Drabinka) na „errata/QG/WAŻN/KRYT/INFO-/TODO/nota/poprawione po": 0 trafień. 0.875 tylko w logach QG (poza widokiem studenta) | **PASS** |
| **T3 — liczby policzone** | Wszystkie kontrolne (LLM.4 sparsowane 5/zgodne 4; LLM.7 zgodnosc 0.75, halucynacje 0.5, trafnosc 5/6·4/6·3/6) policzone wykonaniem Pythona ze zbioru; brak liczby oszacowanej | **PASS** |
| **T4 — błędy zapowiedziane i placeholdery** | `KeyError` na C8/R5 zapowiedziany treścią i odtworzony wykonaniem (kontrpróba). Grep `___` (dokładnie 3 podkreślenia) w nowej treści = 0; luki ćwiczeniowe to `______` (≥4). Brak `„`/`"` wewnątrz stringów `"…"` w dodanym kodzie | **PASS** |
| **T5 — cudze UI** | Rewizja nie dotyka etykiet cudzego UI (LLM.6 bez zmian) — brak nowych cytatów do zrzutu | **N/D** |

### Brama część B — self-critique (instruktor zer)

Rola: instruktor kursu dla literalnych zer, wieczór, pół grupy utknęło.
Pięć słabości bieżącej rewizji + naprawy:

1. *„Dwa liczniki w LLM.4 bez wyjaśnienia, po co ten drugi — student
   przepisze i nie zrozumie".* → Cel LLM.4 nazywa wprost „DWIE różne
   liczby… to nie to samo"; hint 1 i hint 3 tłumaczą różnicę na R5.
2. *„Skąd student ma wiedzieć, że filtr `is not None` jest za słaby,
   skoro dotąd wystarczał?"* → LLM.3 teoria wprowadza `KeyError` na
   konkretnym rekordzie bez pola PRZED labami; LLM.5/LLM.7 odwołują się
   do tej lekcji, nie postulują jej.
3. *„0.83/0.67/0.50 — czy student odczyta z tego, że to widełki kuleją?"*
   → hint 3 LLM.7 mówi wprost „widełki kuleją najmocniej — tam celujesz
   poprawkę promptu" (wzorzec diagnozy, nie wyroku).
4. *„Komunikat odmowy, który mówi »źle«, ale nie »co zrobić«".* → cztery
   diagnozy nazywają konkretny mechanizm (wcięcie, filtr, parse-vs-schema,
   licznik/mianownik) i podają operację naprawczą; żadna nie brzmi
   „pipeline zepsuty".
5. *„Czy atom LLM.4 nie przemyca teraz drugiego konceptu?"* → nie:
   parse-vs-schema to dwie twarze JEDNEGO konceptu (`json-parsowanie-
   walidacja`) — walidacja była w atomie od początku; rewizja tylko
   czyni ją policzalną osobno. 1 koncept = 1 atom zachowane.

**GO — treść. Blocker: pieczątki (manifest packera) do przestawienia
przez buildera po ADR-022.**
