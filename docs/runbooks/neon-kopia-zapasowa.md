# Runbook: kopia zapasowa Neona przed zmianą danych produkcyjnych

**Wersja:** v0.1 · 2026-08-01 · właściciel: Ethan (CTO)
**Po co:** bramka (b) delegacji (`CLAUDE.md` §5) — *„kopia zapasowa Neon przed każdą
zmianą danych"* — jest warunkiem, pod którym Ethan wykonuje zmiany na produkcji bez
sign-offu Darka per akcja. Bramka bez sprawdzonej procedury jest deklaracją, nie bramką.

Ten dokument zastępuje rozproszone kroki „backup gałęzią Neona" z ADR-009/010 i
`aktywacja-1e*-neon-console.md` jako **kanoniczne** miejsce procedury. Tamte zostają
jako zapis konkretnych, datowanych wykonań.

---

## 1. Stan zweryfikowany 2026-08-01 (odczytem, nie z pamięci)

| Fakt | Wartość | Jak sprawdzone |
|---|---|---|
| Projekt produkcyjny | `long-pond-11214233` („SkillBridge") | `GET /api/v2/projects/long-pond-11214233` |
| Organizacja | `org-snowy-credit-81923605` | pole `org_id` tego samego odczytu |
| Plan | `free_v3` | pole `owner.subscription_type` |
| **Limit gałęzi** | **10** | pole `owner.branches_limit` |
| Gałęzi w użyciu | **7** (zapas: 3) | `GET …/branches` |
| Gałąź produkcyjna | `main` = `br-proud-sun-al3aezrj`, `default=true` | jw. |

Identyfikatory cytowane w ADR-009/010 i `k3-prod-migration.md` **zgadzają się ze stanem
faktycznym** — to była jedyna część tamtych runbooków, którą dało się zweryfikować bez
przeglądarki.

### Zasięg klucza `NEON_API_KEY` — szerszy, niż zakładaliśmy

Klucz widzi **pięć projektów całej organizacji**, nie tylko produkcyjny SkillBridge:

```
icy-cherry-47017841   | nordsignal-kb
little-pond-07787183  | asystent-ai
long-pond-11214233    | SkillBridge      <- produkcja
calm-morning-30416716 | nela
square-wind-21272109  | MyHelper
```

To nie jest „władza nad projektem produkcyjnej bazy" — to władza nad **całą organizacją
Neona**. Wejście do rozmowy o rotacji (sekcja 5).

---

## 2. ⚠ `neonctl` NIE jest zainstalowany

```
$ which neonctl        -> neonctl not found
$ npx --no-install neonctl --version -> niezainstalowany lokalnie
$ ls -A ~/.config/neonctl/           -> 0 plików (brak logowania OAuth)
```

ADR-009 §53 i ADR-010 §57 mają pozycję *„`neonctl` zainstalowany i zalogowany do org
(`neonctl auth`)"* jako **checkbox pre-condition** — czyli stan do zapewnienia przy każdej
ceremonii, nie stan trwały. Dziś nie jest zapewniony.

Praktyczny wniosek: polecenia `neonctl …` rozsiane po ADR-ach **nie zadziałają
z pudełka**. Sekcja 3 podaje ścieżkę, która działa bez instalowania czegokolwiek.

---

## 3. Ścieżka A — REST API (działa dziś, bez instalacji)

Uwierzytelnienie: `NEON_API_KEY` z `.env.prod`. **Klucz podajemy wyłącznie przez nagłówek
z podstawionej zmiennej — nigdy w treści polecenia, nigdy do logu.**

```bash
cd <repo>
NEON_API_KEY=$(grep '^NEON_API_KEY=' .env.prod | cut -d= -f2- | tr -d '"'"'"'')
PROJ=long-pond-11214233
```

**Uwaga o API:** `GET /api/v2/projects` **bez** `org_id` zwraca `400`
(`"org_id is required"`). Zawsze podawaj `?org_id=org-snowy-credit-81923605`.

### 3a. Przegląd stanu przed zmianą (zawsze najpierw)

```bash
curl -s -H "Authorization: Bearer $NEON_API_KEY" \
  "https://console.neon.tech/api/v2/projects/$PROJ/branches" \
| python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['branches']),'galezi');[print(' ',b['created_at'][:10],b['id'],b['name']) for b in d['branches']]"
```

Jeśli gałęzi jest **10** — nie ma miejsca na kopię. Zwolnij slot wg sekcji 4 **przed**
ceremonią (nigdy w jej trakcie).

### 3b. Utworzenie kopii zapasowej

```bash
curl -s -X POST -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  "https://console.neon.tech/api/v2/projects/$PROJ/branches" \
  -d '{"branch":{"name":"prod-backup-pre-<CO>-<RRRRMMDD>","parent_id":"br-proud-sun-al3aezrj"}}'
```

Nazewnictwo trzymamy dotychczasowe — `prod-backup-pre-<zakres>-<data>`; przykłady
z realnego stanu w sekcji 1.

> **NIEZWERYFIKOWANE:** odczyty (3a) sprawdziłem realnym wywołaniem. Zapisu (3b)
> **nie wykonałem** — ceremonia 1E.7 była w locie, a bramka (g) zabrania ruszania gałęzi
> w trakcie ceremonii. Do sprawdzenia przejściem tam-i-z-powrotem (utwórz → potwierdź →
> skasuj) **przy najbliższym oknie poza ceremonią**. Do tego czasu traktuj 3b jako
> procedurę opisaną, nie sprawdzoną.

---

## 4. Zwalnianie slotu (bramka (g), delegacja v1.15)

Wolno kasować **wyłącznie** gałęzie `prod-backup-*` i robocze — **nigdy `main`, nigdy
projekt**. Zawsze zostają **dwie najnowsze** kopie stanu prod. Kopię młodszą niż 7 dni
tylko wtedy, gdy jest nadpisana nowszą kopią tego samego lub późniejszego stanu.
**Kasowanie przed ceremonią, nigdy w jej trakcie.**

```bash
curl -s -X DELETE -H "Authorization: Bearer $NEON_API_KEY" \
  "https://console.neon.tech/api/v2/projects/$PROJ/branches/<BRANCH_ID>"
```

Po skasowaniu **zweryfikuj** przeglądem 3a — brak weryfikacji to założenie, że się udało.

---

## 5. Ścieżka B — konsola Neona (droga awaryjna) — ⚠ NIEZWERYFIKOWANA

`aktywacja-1e2-neon-console.md:13` opisuje ją jako *„Konsola Neon → Branches → New branch
z production"*. To jest **cytat z dokumentu, nie z realnego przejścia** — i tak ma być
oznaczone, dopóki ktoś jej nie przejdzie.

**Czego brakuje, a jest potrzebne, żeby ta droga była realną drogą awaryjną:** dokładne
nazwy przycisków w obecnym interfejsie, miejsce wyboru gałęzi nadrzędnej, czas trwania,
zachowanie przy limicie 10 gałęzi.

**Kto to zrobi:** wymaga przeglądarki i ludzkiego przejścia — **agent tego nie wykona**.
Prośba do Darka: jedno przejście, zrzut kroków, wpis tutaj.

**Dlaczego to nie jest dziś pilne** (a wcześniej wyglądało na pilne): kopie dla trwającej
ceremonii **już istnieją** (sekcja 6), więc bramka (b) jest dla niej spełniona niezależnie
od tego, czy ścieżka B działa. Pilne staje się przy **następnej** zmianie danych.

---

## 6. Kopie ceremonii 1E.7 — istnieją (stan 2026-08-01)

```
2026-08-01  br-raspy-feather-al6nn1fe  prod-backup-pre-0044-0045-l6-20260801
2026-08-01  br-green-river-algm6epa    prod-backup-pre-ingest-curriculum-l6-20260801
2026-08-01  br-bold-smoke-aligu9kf     prod-backup-pre-0046-pathkey-b1-20260801
```

Bramka (b) dla migracji `0044`/`0045`, zaciągu treści L6 i migracji `0046` (#264) jest
**spełniona i udokumentowana**. To odczyt ze stanu Neona, nie zapewnienie z czatu.

---

## 7. Rotacja klucza — otwarte, wymaga sign-offu Darka

Klucz ma zasięg całej organizacji (sekcja 1) i jest jedynym uwierzytelnieniem ścieżki A.

- Wystawienie zastępnika **nie mieści się** w delegacji tworzenia poświadczeń (v1.16,
  bramka (i)): klucz zdolny tworzyć gałęzie **nie jest tylko-do-odczytu** (warunek 1) i
  **daje władzę nad produkcją** (warunek zawsze-sign-off). To sign-off Darka.
- Kolejność bez skrótów: nowy klucz → podmiana w `.env.prod` → **dowód działania**
  (przejście tam-i-z-powrotem z sekcji 3b/4) → dopiero unieważnienie starego.
  Nigdy odwrotnie (ta sama zasada co przy rotacji `CONTENT_REPO_KEY`).
- **Proporcja (Ryan, 2026-08-01):** zawężanie tego jednego klucza przy komplecie
  poświadczeń produkcyjnych leżącym jawnym tekstem w dziesięciu kopiach `.env.prod` to
  przestawianie mebli. Prawdziwą pozycją jest całość — propozycja Ryana do 2026-08-15.
  Rotacja Neona ma sens, ale nie jest najwyżej punktowaną pozycją.
