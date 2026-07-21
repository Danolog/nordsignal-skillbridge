# ADR-015 — Kontrakt checków labów i tokenu pieczątki (1E.6b)

- **Status:** ZAAKCEPTOWANY (autonomia wykonawcza Darka, 2026-07-14)
- **Kontekst:** 1E.6b — największy bloker produktowy fazy 1E
- **Powiązania:** ADR-014 D3/D10/pkt 11 (koryguje jedno założenie — patrz §6), ADR-009/010 (ingest),
  roadmapa §4 (1E.6b), `docs/design/curriculum-atomy-format-spec-v0.1.md`
- **Zastępuje:** nic. **Koryguje:** ADR-014 D3 w części „reuse infrastruktury sandboxa 1.9".

---

## 1. Problem

Całe L0 (wejście do drabiny) to laby. `POST /api/curriculum/items/[id]/complete` zwraca dla
`kind='lab'` **`501 "Lab checks not implemented yet"`**. Skutek: **drabina jest nieprzechodnia**
— student nie może zaliczyć ani jednej pozycji L0, więc nie odblokuje F1. Onboarding realnych
studentów jest niemożliwy.

Jednocześnie 66 notebooków Colab (dług treściowy 1E.2) **nie może powstać**, bo każdy kończy się
komórką-pieczątką, której kontraktu nie ma. Napisanie ich przed tą decyzją = ryzyko przepisania 66
plików.

## 2. Stan zastany (zweryfikowany w kodzie, nie w opisach)

- **18 pozycji `kind='lab'`** w 9 modułach (L0×4, F1×2, F2×2, F3×2, M-PD×2, M-EDA×1, M-SQL×2,
  M-ML×2, M-LLM×2). Capstone'y (`kind='project'`, 4 szt.) są osobną klasą.
- **`configJson.checks` to dziś ATRAPA, nie kontrakt.** `tools/pack-curriculum-atoms.ts` wpisuje
  stałą `TOKEN_CHECK` (`{type:"token", note:"..."}`) dla 17/18 labów; F3.7 ma trzy
  `{type:"milestone", id:"K1|K2|K3", note}`. **Packer nie parsuje niczego z markdownu Sophii** —
  sekcje „Zaliczenie" są prozą dla człowieka. Walidator (`tools/content-curriculum-atoms.ts`)
  traktuje `config` jako `Record<string, unknown>` i **nie sprawdza `checks` w ogóle**.
- To było ZAMIERZONE: `curriculum-atomy-format-spec-v0.1.md` — *„definicje checków automatycznych
  (1E.6 — zostaw hak `config.checks` pusty lub opisowy)"*. 1E.2 dostarczyło hak i intencję;
  wykonywalny kontrakt to zadanie tego ADR-a.

## 3. Decyzja D1 — checki liczą się w sesji Colab, NIE w sandboxie

Mechanizm: **komórka-pieczątka + token**. Notebook liczy check deterministycznie w sesji studenta
i wypisuje token; student wkleja token do SkillBridge; serwer go weryfikuje.

- 0 LLM, 0 kosztu inferencji, 0 infrastruktury wykonawczej po naszej stronie.
- Zgodne z treścią, którą Sophia JUŻ napisała (każdy moduł deklaruje: *„deterministyczne, 0 LLM,
  bez sandboxa"*).

## 4. Decyzja D2 — token przenosi WYLICZONE WARTOŚCI, a serwer sam je weryfikuje

**Odrzucone:** `token = f(kod_atomu, passed: bool)` (pierwotny szkic). Skoro `f` jest widoczna
w komórce, a student zna swój `kod_atomu`, podrobienie sprowadza się do przepisania jednej linijki
— **bez wykonania laba**. Serwer nie ma z czym porównać i nie dowiaduje się niczego poza „student
twierdzi, że zaliczył".

**Przyjęte:** pieczątka przenosi **ładunek** — wartości wyliczone z sesji — a weryfikuje go serwer:

```
token = base64(canonical(wyniki)) + "." + HMAC-SHA256(kod_atomu, canonical(wyniki))[:12]
```

gdzie `wyniki` = `{ id_checku → wyliczona wartość }` z sesji studenta.

Serwer: rozkłada ładunek → sprawdza podpis → **niezależnie weryfikuje każdy check wg reguły
z `configJson.checks`**. Nie ufa fladze „zaliczone" — ufa wyłącznie własnej ocenie wartości.

### ⚠ Czym HMAC tutaj NIE jest

**HMAC nie jest kontrolą bezpieczeństwa.** Student zna swój `kod_atomu` (dostaje go z SkillBridge),
więc może policzyć podpis ręcznie. Podpis pełni tu rolę **sumy kontrolnej**: wykrywa literówkę przy
przepisywaniu i uniemożliwia wklejenie tokenu KOLEGI (bo `kod_atomu` jest per student+pozycja).
Przed zdeterminowanym oszustem nie broni i nie ma udawać, że broni. Prawdziwą barierą jest to,
**co serwer robi z ładunkiem** (niżej).

### Trzy klasy checków — i uczciwa siła każdej

| Klasa | Serwer weryfikuje | Siła | Ile |
|---|---|---|---|
| `value` | porównanie z wartością znaną z góry (treść deterministyczna: zafiksowane ziarna i dane — np. M-ML `acc_model`, M-LLM „zawsze 4/5", M-EDA „32 wiersze") | **mocna** — trzeba mieć poprawny wynik | ~5 |
| `relation` | przelicza relację z wartości przysłanych przez studenta (np. `razem == cena * sztuki`, gdzie `cena`/`sztuki` to DANE STUDENTA — serwer nie zna ich z góry) | **średnia** — relację da się spełnić trywialnymi liczbami; mierzy WYKONANIE, nie DROGĘ (limit Sophii nr 4) | ~10 |
| `predicate` | tylko prawda/fałsz (np. L0.2 „`imie` ≠ domyślne") | **słaba** — podrabialna trywialnie | ~3 |

To jest uczciwy obraz: **żadna klasa nie dowodzi, że student napisał kod sam.** Dowodzi, że
w sesji istniały wartości spełniające warunek. Dlatego §5 — laby nie wystawiają kredencjału.

## 5. Decyzja D3 — jawne limity (MUSZĄ być zapisane, bo produkt sprzedaje weryfikowalność)

**Token laba NIE jest kredencjałem i nigdy nim nie będzie.** Laby **bramkują postęp w drabinie**;
dowodem kompetencji jest wyłącznie Verified Project Receipt, który wymaga:
sandbox (ukryte testy, 1.9) + viva (1.16) + recenzja człowieka (1.5), a od 2026-07-14 dodatkowo
paszport czyta wyłącznie `verified_competencies` (flaga `passportVerifiedOnly` ON na prodzie).
To są **dwie różne waluty** (ADR-014 D3, wariant C) i ta separacja jest tym, co czyni akceptowalnym
podrabialny token.

Limity odziedziczone z treści (Sophia zadeklarowała je jawnie — przenoszę komplet):

1. Funkcja tokenu jest widoczna w komórce → token jest podrabialny (D2 podnosi koszt, nie eliminuje).
2. L0.3: restart sesji jest z poziomu Pythona **nieweryfikowalny** — token dowodzi wykonania komórek,
   kroki restartu są instruktażowe.
3. L0.4: „≥2 zmienne spoza listy przykładów" da się spełnić ręcznym przypisaniem.
4. F1.4 i pochodne: check mierzy WYKONANIE (istnienie relacji), nie DROGĘ dojścia — stałe wpisane
   ręcznie przejdą.
5. F2.4: check nie widzi wypisań linii paragonu.
6. F3.4: obchodzilny dla jednego ustawienia progu.
7. F3.7/K3: samego wydruku raportu pieczątka nie widzi (literówki kategorii niewykrywalne).
8. Komórki tekstowe (uzasadnienia, wnioski, sekcja Ograniczeń) w M-PD/M-SQL/M-ML/M-LLM są **poza
   checkiem** — ocenia je rubryka capstone'u i viva, nie automat.
9. EDA.4: pieczątka świadomie NIE odpytuje API ponownie (token niezależny od dostępności BDL).
10. Porównania liczb zmiennoprzecinkowych: **`abs(x - y) < 0.01`**, NIGDY `round(...) ==`
    (kolejność dodawania floatów potrafi fałszywie oblać).
11. F1.7: introspekcja tekstu komórki (`if`/`else`) jest kruchym dodatkiem — fallback do samego
    checku wartości, jeśli okaże się zawodna.

## 6. Decyzja D4 — KOREKTA ADR-014: sandbox 1.9 nie jest potrzebny

ADR-014 D3 zakłada: *„tam, gdzie trzeba uruchomić kod studenta, reuse infrastruktury sandboxa 1.9"*.
**Audyt wszystkich 18 checków: ZERO wymaga uruchomienia kodu studenta po stronie SkillBridge.**

Jedyne checki wychodzące poza sesję Colab to 3 kamienie capstone'ów (K3 w M-EDA / M-SQL / M-LLM):
pobranie repo studenta i statyczny skan plików. To **HTTP fetch + grep**, nie wykonanie kodu —
i infrastruktura już istnieje: `src/lib/ai/pipeline/github.ts` (`fetchRepoMeta` z guardem
`private` z 0.7 — obrona confused-deputy, `fetchRepoTree`, `fetchBlobText`).

**Wniosek: sandbox wypada z zakresu 1E.6b.** Zostaje tam, gdzie należy — w ocenie projektów.

## 7. Kontrakt `configJson.checks` (wykonywalny)

```ts
type LabCheck =
  | { id: string; kind: "value";     note: string; expect: unknown; tolerance?: number }
  | { id: string; kind: "relation";  note: string; rule: RelationRule }
  | { id: string; kind: "predicate"; note: string }
  | { id: string; kind: "milestone"; note: string; of: LabCheck[] };   // F3.7: K1–K3
```

- `id` — stabilny (`C1`, `C2`, … / `K1`–`K3`). Dziś 17 z 18 labów **nie ma `id`** → packer musi je nadać.
- `expect` — wartość oczekiwana; **NIGDY nie opuszcza serwera** (inaczej podpowiada wynik).
- `tolerance` — dla liczb zmiennoprzecinkowych; **domyślnie `0.01`, porównanie przez `abs(x-y) < tol`,
  NIGDY przez `round(...) ==`** (limit Sophii nr 10 — kolejność dodawania floatów potrafi fałszywie oblać).
- `rule` — deklaratywna relacja między nadesłanymi wartościami (np. `{op:"eq", left:"razem",
  right:{mul:["cena","sztuki"]}}`). **Serwer ją przelicza sam** — nie ufa studentowi, że policzył.
- **Walidacja w packerze** — dziś `checks` **nie jest sprawdzane w ogóle** (`config` to
  `Record<string, unknown>`); to trzeba domknąć, inaczej kontrakt jest tylko na papierze.

### Kod atomu i token

```
kod_atomu = HMAC-SHA256(LAB_TOKEN_SECRET, studentId + ":" + itemId)[:10]   # serwer wydaje, student przepisuje do notebooka
token     = base64(canonical(wyniki)) + "." + HMAC(kod_atomu, canonical(wyniki))[:12]   # notebook wypisuje
```

`LAB_TOKEN_SECRET` — nowa zmienna środowiskowa. Rotacja unieważnia tokeny w obiegu, **nie postęp**
(postęp jest już zapisany w `curriculum_item_progress`).

### Rozdzielenie warstw w notebooku (to jest to, co chroni 66 notebooków)

- **Warstwa treści** — funkcja checku per atom: co policzyć. Różna w każdym z 66.
- **Warstwa pieczątki** — serializacja + podpis: **JEDEN blok, identyczny we wszystkich 66**.

Dzięki temu zmiana decyzji o formacie tokenu = **podmiana jednego bloku**, a nie przepisywanie treści.
To jedyny powód, dla którego notebooki czekały na ten ADR.

> **Doprecyzowanie (Krok 4 partia 2, 2026-07-21):** komórkę-pieczątkę mają wyłącznie
> notebooki pozycji `lab` (zaliczenie tokenem). Od F1 istnieją też notebooki
> TOWARZYSZĄCE ćwiczeń (WE + brudnopisy, `config.notebookUrl` przy `kind="exercise"`)
> — świadomie **bez pieczątki**: atom `exercise` zalicza się pytaniami. Inwentarz
> „66 notebooków" obejmuje obie klasy; kontrakt tego ADR dotyczy klasy labowej.

## 8. Konsekwencje

**Pozytywne:** drabina staje się przechodnia (L0 → F1 → …); 66 notebooków odblokowanych; zero
kosztu LLM i zero nowej infrastruktury; sandbox nie jest angażowany.

**Negatywne / koszt:**
- Packer musi zacząć generować realne `checks` (dziś stała) → **przepakowanie 9 JSON-ów**
  → **re-ingest na prod** [CZERWONA LINIA, ADR-010].
- `expect` trzeba wyprowadzić z treści Sophii — 18 labów, ręczna robota, ryzyko błędu
  (mitygacja: kontrakt-test + wykonanie snippetów).
- Tokeny są podrabialne (D2/D3) — akceptowane, bo laby nie wystawiają kredencjału.

**Rollback:** flaga `curriculumPath` (istnieje, OFF na prodzie). Nowa kolumna nie jest potrzebna —
`configJson` jest jsonb, zmiana jest addytywna w treści, nie w schemacie.
