# Kompletność wykonania art. 17 — rejestr miejsc, których kaskada nie czyści

**Wersja:** v0.3 · 2026-08-14 · **Owner:** Ryan (CRCO nordsignal) → Wendy (Legal) od Fazy 3

**Changelog v0.2 → v0.3 (2026-08-14) — sprostowanie jawne, jedna pozycja.** Akapit pod pozycją
**L-8** odsyłał po ocenę prawną do pliku w katalogu **ignorowanym przez kontrolę wersji** (nazwa
zacytowana dosłownie przy samej pozycji), którego **nie ma i nigdy nie było**. Znalezisko L-8 / dług A-3 **stoi bez zmian**;
nieprawdziwy był adres dowodu. Odesłanie prowadzi teraz do pozycji **L-j** w sekcji Z-5 klauzuli
art. 13. Stare brzmienie zacytowane dosłownie przy pozycji. Drugie wystąpienie tego samego
nieistniejącego pliku (tabela Z-2 klauzuli) sprostowane równolegle — sekcja Z-2a klauzuli.

**Changelog v0.1 → v0.2 (2026-08-10) — Ryan, zadanie E2c.** Nowa pozycja **L-8** (`audit_log.target_id`
zdarzeń paszportowych — osierocony, ale ponownie przypisywalny przez numer dokumentu na wydruku PDF).
Pozycja **potwierdza ostrzeżenie z nagłówka**, że ten rejestr jest niekompletny: metoda z sekcji 1
nie mogła jej wykryć, bo drugi koniec powiązania leży poza bazą.
**Powiązania:** `docs/data/ropa.md` (wpisy #4, #6, #7 + „Oświadczenie administratora") ·
`docs/data/retention.md` · `docs/data/audit-log-taksonomia.md` §6 · pozycja **E1b** pakietu RODO.

> **Po co ten plik.** Zdanie „art. 17 realizujemy kaskadą `student_id ON DELETE CASCADE`" powtarza
> się w naszych dokumentach od lipca i **jest prawdziwe wyłącznie dla tabel, które tę kaskadę mają**.
> Procedura usunięcia konta napisana wobec takiego zdania byłaby **niekompletna po cichu**: zamknęłaby
> żądanie, zostawiając dane. Ten rejestr jest **jedynym nośnikiem** listy wyjątków — `ropa.md`
> i `retention.md` odsyłają tutaj, zamiast wyliczać je u siebie (CLAUDE.md v1.17).

> **Ten rejestr jest NIEKOMPLETNY i tak go trzeba czytać.** Nikt nie przeszukał wszystkich tabel
> pod tym kątem. Poniżej jest pierwszy przebieg z nazwaną metodą i nazwanymi ograniczeniami —
> **nie jest to inwentaryzacja domknięta i nie wolno go cytować jako takiej.**

---

## 1. Metoda pierwszego przebiegu i czego NIE łapie

**Komenda** (mój odczyt 2026-08-10 15:20 UTC, drzewo `origin/main`, commit `06d0040`):

```
$ git show origin/main:src/lib/db/schema.ts \
  | grep -nE '(text|varchar)\("(.*(user|student|actor|reviewer|owner|author|created_by|person|email)).*"\)' \
  | grep -v "references"
25:	email: text("email").notNull().unique(),
39:	userAgent: text("user_agent"),
40:	userId: text("user_id")
49:	userId: text("user_id")
124:		userId: text("user_id")
918:		reviewerType: text("reviewer_type").notNull(),
919:		reviewerId: text("reviewer_id"),
1097:		userAgent: text("user_agent"),
1116:		actorId: text("actor_id"),
1121:		userAgent: text("user_agent"),
1164:		userId: text("user_id"),
```

**Odczytanie wyniku — pozycja po pozycji, bo filtr sam nie rozstrzyga:**

- **40, 49, 124** — fałszywe trafienia filtra: klucz obcy z kaskadą stoi w **następnej linii**
  (`.references(() => user.id, { onDelete: "cascade" })`), sprawdzone pojedynczo. **Czyste.**
- **25** (`user.email`) — kolumna kasowana razem z kontem. **Czyste.**
- **919** (`submission_reviews.reviewer_id`) → pozycja **L-3**.
- **1116** (`audit_log.actor_id`) → pozycja **L-1**.
- **1164** (`ai_usage_ledger.user_id`) → pozycja **L-2**, znalezisko nowe.
- **39, 1097, 1121** (`user_agent` w `session`, `faculty_sessions`, `audit_log`) — **nie są
  identyfikatorem, ale są daną osobową.** `session` kasuje się kaskadą z konta (czyste);
  `audit_log` wchodzi do L-1 razem z adresem IP; **`faculty_sessions` nie ma żadnej reguły
  retencji** — zmierzone (odczyt 2026-08-10 15:29 UTC):
  `git show origin/main:tools/enforce-retention.ts | grep -c "faculty_sessions"` → **`0`, kod
  wyjścia 1** (skrypt istnieje, tej tabeli w nim nie ma) — więc jego `user_agent` i adres IP żyją
  bez terminu. To składowa progu (ii) decyzji D-2 (`audit-log-taksonomia.md` §6.3), nie osobna
  pozycja tego rejestru.

**Czego ta metoda NIE łapie — wymieniam, bo inaczej rejestr obiecuje więcej, niż daje:**

1. **Identyfikatorów w kolumnach JSONB** (`metadata`, `result_json`, `hints_revealed_json`
   i podobnych). Konwencja mówi „wyłącznie kody i liczby" i pilnują jej testy, ale metoda
   nazewnicza tego nie sprawdza.
2. **Kolumn nazwanych inaczej** niż wzorzec (np. `owner`, `submitted_by_ref`, `external_ref`).
3. **Danych osobowych, które nie są identyfikatorem** — treść wolna wpisana przez człowieka
   o innym człowieku. Konkretnie: `submission_reviews.note` (notatka recenzenta) kaskaduje razem
   ze zgłoszeniem, więc jest bezpieczna, ale klasa problemu istnieje i metoda jej nie widzi.
4. **Wszystkiego poza bazą** — dziennika uruchomieniowego Vercela, kopii zapasowych Neona,
   podmiotów przetwarzających (pozycje L-5 i L-6).

**Domknięcie tej luki jest częścią E1b, nie tego pliku.** Właściwy przebieg to przegląd wszystkich
tabel schematu `public` (55 na produkcji, pomiar E0) z odczytem kluczy obcych **z katalogu bazy**,
nie z pliku schematu — i to jest zadanie dla wykonawcy E1b, z cytatem wyjścia.

---

## 2. Rejestr pozycji

| # | Miejsce | Co zostaje po usunięciu konta | Klasa | Da się naprawić? | Właściciel · próg |
|---|---|---|---|---|---|
| **L-1** | `audit_log.actor_id` + `ip_address` + `user_agent` | identyfikator osoby jako napis, jej adres IP i sygnatura przeglądarki — **na zawsze** (tabela append-only) | **dług A-1**, WAŻNE dla danych | **przyszłe wiersze: tak** (kierunek (a+)); **istniejące: nie** bez wyjątku od append-only | Ryan (kierunek) · Ethan (kod) · próg: przed rejestracją osoby nieznanej administratorowi |
| **L-2** | `ai_usage_ledger.user_id` | wiszący identyfikator konta logowania (`text` **bez klucza obcego**) | **dług A-2 — NOWY, znaleziony 2026-08-10** | **tak, i to łatwo** — ta tabela **nie ma** wyzwalacza append-only, więc zwykły `UPDATE … SET user_id = NULL` wystarcza | Ryan (klasyfikacja) · wykonanie: E1b |
| **L-3** | `submission_reviews.reviewer_id` | identyfikator **sesji recenzenta** (nie studenta) | klasa 2 — ta sama wada co `faculty.login.success` | nie dotyczy usuwania konta studenta; dla recenzenta problemem jest **model uwierzytelnienia**, nie kolumna | Ryan · progi jak w decyzji D-2 (`audit-log-taksonomia.md` §6.3) |
| **L-4** | Gwarancja append-only `audit_log` — szczelina „przebudowa tabeli" | ochronę można obejść i **skasować ją po drodze**; brak wyzwalacza zdarzeń języka definicji danych | ryzyko dla twierdzenia Built-to-Sell, nie dla art. 17 wprost | tak — wyzwalacz zdarzeń DDL; wymaga **migracji produkcyjnej** (domena Ethana) | Ryan → Darek · próg: pierwszy audyt zewnętrzny albo pierwsze pytanie kupującego |
| **L-5** | Gałęzie kopii zapasowych Neona (`prod-backup-*`) | pełne wiersze w kształcie sprzed usunięcia | **niezweryfikowane** — nie mierzyłem, ile gałęzi i z jakich dat zawiera dane osób | częściowo: kasowanie gałęzi (delegacja Ethana, CLAUDE.md v1.15, bramka (g) — zawsze zostają dwie najnowsze) | Ethan (wykonanie) · Ryan (reguła) · próg: pierwsze żądanie z art. 17 |
| **L-6** | Dziennik uruchomieniowy Vercela | identyfikatory w liniach dziennika (własna retencja dostawcy) | **niezweryfikowane** — nie znam dziś ani okresu retencji Vercela dla naszego planu, ani zawartości | ograniczanie u źródła (`src/lib/log.ts`, warunek W1 §3 taksonomii) | Ethan · próg: razem z E1b |
| **L-7** | **Brak ścieżki usunięcia konta w produkcie** | wszystko — kaskada jest gotowa, ale **nikt jej nie odpala** | **blokada art. 17 jako całości** | tak — pozycja **E1b** pakietu RODO | Ethan (wykonanie) · Ryan (odbiór) · próg: przed rejestracją osoby nieznanej administratorowi |
| **L-8** | `audit_log.target_id` zdarzeń paszportowych (`passport.share.*`) — **osierocony, ale ponownie przypisywalny** | identyfikator paszportu, którego **prefiks widnieje jako numer dokumentu na wydruku PDF krążącym poza platformą** | **dług A-3 — NOWY, znaleziony 2026-08-10** przy przeglądzie zasady odpowiedzi dla pracodawcy | częściowo — ochroną jest dziś **środek organizacyjny** (zakaz dopasowywania), nie techniczny | Ryan (klasyfikacja i zakaz) · Sophia (nośnik zasady) · próg: **pierwsze zapytanie pracodawcy** albo projekt A-1 |

**Zmierzone przesłanki do pozycji L-7** (mój odczyt 2026-08-10 15:17 UTC):
`git grep -c "deleteUser" origin/main -- .` → **zero trafień, kod wyjścia 1**;
`git grep -n "delete(user)" origin/main -- src/ tools/` → trzy trafienia, **wszystkie poza
produktem** (`src/lib/db/seed.ts:92`, `tools/b5-contract-test.ts:392,393`).

**Zmierzone przesłanki do pozycji L-8** (odczyty `origin/main`, 2026-08-10). Trzy odczyty, które
dopiero **czytane razem** pokazują wadę — i to jest powód, dla którego metoda z sekcji 1 nie mogła
jej znaleźć:

```
$ git show origin/main:src/components/passport/passport-document.tsx | sed -n '170p'
	const docNumber = `SB-2026-${data.id.slice(0, 8).toUpperCase()}`;
$ git show origin/main:src/app/passport/[id]/page.tsx | grep -n "id: passport.id"
138:		id: passport.id,
$ git show origin/main:src/app/api/passport/share/route.ts | sed -n '84,85p'
		targetType: "passports",
		targetId: shareToken.passportId,
```

**Wzorzec A7 zakłada, że osierocony `target_id` przestaje być daną osobową, bo nie prowadzi już do
nikogo. Dla zdarzeń paszportowych to założenie jest fałszywe:** na zewnątrz krąży plik PDF, który
niesie **prefiks tego samego identyfikatora** obok imienia i nazwiska. Identyfikator jest więc
ponownie przypisywalny **środkami, którymi rozsądnie może dysponować osoba trzecia** (motyw 26).
**Konsekwencja dla projektu A-1, którą trzeba znać przed jego wykonaniem:** usunięcie `actor_id`
**nie czyni tych wierszy anonimowymi** — ochroną pozostaje zakaz dopasowywania (środek
organizacyjny), a nie własność danych. Pełna ocena prawna i przekwalifikowanie zakazu z decyzji
produktowej na wymóg zgodności — **pozycja L-j w sekcji Z-5 klauzuli art. 13**
(`docs/legal/klauzula-informacyjna-art13.md`), pytanie do prawnika.
**Nie znalazłem tego własną metodą** — drugi koniec powiązania leży w pliku u obcej osoby, poza
zasięgiem jakiegokolwiek zapytania do bazy. Znalazło się przy przeglądzie cudzego dokumentu.

> **SPROSTOWANIE JAWNE 2026-08-14 — to samo, co w klauzuli, tylko drugie wystąpienie.**
> **Stare brzmienie, cytowane dosłownie** (v0.2, ten akapit): *„Pełna ocena prawna
> i przekwalifikowanie zakazu z decyzji produktowej na wymóg zgodności:
> `scratchpad/przeglad-zasada-pracodawcy-ryan.md` (pytanie 2)."*
>
> **Tego pliku nie ma i nigdy nie było w kontroli wersji** — zmierzone 2026-08-14:
> `git log --all --oneline -- 'scratchpad/przeglad-zasada-pracodawcy-ryan.md'` → brak wyjścia;
> `find` po obu repozytoriach → brak wyjścia. Kontrola dwustronna: to samo narzędzie widzi
> artefakt istniejący (`git show --stat e66312d` → 7 plików, 1284 wstawienia).
>
> **Znalezisko merytoryczne stoi bez zmian** — pozycja L-8 i dług A-3 są prawdziwe i zmierzone.
> Nieprawdziwy był **adres dowodu**, nie dowód. Odesłanie prowadzi teraz do nośnika w kontroli
> wersji (L-j w Z-5 klauzuli).
>
> **Dlaczego to nie jest drobiazg.** Ten sam nieistniejący plik był cytowany w **dwóch**
> dokumentach pakietu — tu i w tabeli Z-2 klauzuli. Naprawienie jednego wystąpienia zostawiłoby
> drugie żywe, a to ono trafiłoby do kolejnego cytowania. Drugie wystąpienie znalazła Sophia
> przy pisaniu nośnika W-5, **nie ja** — mimo że oba wpisy są moje i oba powstały tego samego dnia.
> Wniosek metodyczny (pełne brzmienie: sekcja Z-2a klauzuli): **ścieżka w katalogu ignorowanym
> przez kontrolę wersji nie jest dowodem w dokumencie zgodności — to błąd metody, nie pech.**
> Od 2026-08-14 pilnuje tego strażnik
> `tests/unit/rodo/klauzula-sciezki-istnieja.contract.test.ts`.

**Zmierzona przesłanka do pozycji L-2** (`git show origin/main:src/lib/db/schema.ts`, linie
1164–1166, odczyt 2026-08-10):

```
		userId: text("user_id"),
		studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
		tenantId: uuid("tenant_id").references(() => tenants.id),
```

Dwie kolumny atrybucji o **różnym zachowaniu w tej samej tabeli**: `student_id` czyści się przy
usunięciu konta (`set null` — poprawnie), `user_id` **zostaje**. To jest dokładnie ten sam kształt
wady co `audit_log.actor_id`, z jedną różnicą **na korzyść**: brak wyzwalacza append-only, więc
naprawa jest zwykłym poleceniem, a nie wyjątkiem od gwarancji bezpieczeństwa.

---

## 3. Wymóg wobec procedury z E1b — pięć warunków

Procedura obsługi żądania z art. 17 **nie jest gotowa**, dopóki nie spełnia wszystkich pięciu:

1. **Pokrywa każdą pozycję tego rejestru** — z jawnym rozstrzygnięciem, czy pozycję czyścimy, czy
   przyjmujemy świadomie i mówimy o tym osobie.
2. **Ma strażnika z mutacją.** Test pełnej pętli: konto → ścieżka generująca dane → usunięcie →
   sprawdzenie, że nie zostaje nic wskazującego na osobę. Mutacja czerwieniąca **osobno dla
   identyfikatora i osobno dla adresu IP** — strażnik sprawdzający tylko `actor_id` przepuściłby
   mój własny błąd z 2026-08-01.
3. **Kontrola dwustronna:** test pada, jeśli przebieg wygenerował **zero** wierszy do sprawdzenia.
   Bez tego przechodzi na pustym zbiorze i melduje „w porządku", nie sprawdzając niczego.
4. **Obejmuje obie przestrzenie identyfikatorów** — `user.id` (zdarzenia paszportu) i `students.id`
   (reszta). Procedura ćwicząca jedną z nich wygląda na kompletną i nie jest.
5. **Zostawia ślad wykonania** — kto, kiedy, czego żądanie, co usunięto, co zostało i dlaczego.
   Bez tego nie umiemy **wykazać** wykonania (art. 5 ust. 2), a to jest drugie pytanie organu po
   pierwszym.

---

## 4. Przegląd

Przy każdej zmianie schematu dodającej kolumnę-napis z identyfikatorem osoby oraz obowiązkowo:
**po domknięciu E1b** (weryfikacja, że pozycje L-1, L-2 i L-7 zmieniły status) i **przy pierwszym
realnym żądaniu z art. 17** — to ostatnie jest jedynym przeglądem, który sprawdza rejestr naprawdę.
