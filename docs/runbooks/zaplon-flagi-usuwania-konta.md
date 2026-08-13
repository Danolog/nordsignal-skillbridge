# Runbook: zapłon flagi `FLAG_ACCOUNT_DELETION` (usunięcie konta, art. 17 RODO)

**Wersja:** v0.2 · 2026-08-14 — **bramka 5 domknięta** ceremonią z 2026-08-13 (`docs/ceremonie/2026-08-13-ceremonia-prod.md`): migracja `0048` jest na produkcji. Wykonanie przejął Ethan zamiast potoku wdrożeniowego Evy — przypisanie miało własny powód (rozdzielenie wykonawcy od sign-offującego), jego zniesienie jest zapisane wprost razem z progiem powrotu przy pierwszej migracji nie-addytywnej. **Stan bramek żyje wyłącznie tutaj** — wpis ceremonii go woła, nie ogłasza (warunek Leo przy `#316`).
**Wersja:** v0.1 · 2026-08-12 · **właściciel: Ethan (CTO)** · autor: Max (backend)

**Po co ten dokument.** Kod ścieżki usunięcia konta jest wdrożony za **zgaszoną** flagą
(zgłoszenie #293). Ten plik jest **jedynym nośnikiem listy bramek**, które muszą być
domknięte, zanim flaga zapali się na produkcji. Opis zgłoszenia i komentarze w kodzie tej
listy **nie powtarzają — wołają ją stąd** (CLAUDE.md v1.17).

**Dlaczego lista mieszka w runbooku, a nie w opisie zgłoszenia.** Opis zgłoszenia czyta
recenzent w dniu przeglądu. Flagę zapala ktoś inny, w innym dniu, patrząc na konsolę
Vercela — i tej osoby stała w kodzie ani zamknięte zgłoszenie **nie obudzą**. Blok Leo
na #293 nazwał to wprost: bez imiennego kroku z właścicielem to jest „strażnik-atrapa
w warstwie procesu".

> ⚠ **Zapłon flagi jest osobną decyzją, nie skutkiem scalenia #293.** Scalenie dostarcza
> kod za zgaszoną flagą. Zapłon wymaga wszystkich bramek poniżej.

---

## Bramki zapłonu — wszystkie muszą być domknięte

| # | Bramka | Właściciel | Stan na 2026-08-12 |
|---|---|---|---|
| 1 | **S-U-1 zielony** — kompletność kaskady czytana z katalogu bazy | Max | **DOMKNIĘTE** (7/7, mutacje M1/M2 czerwienią) |
| 2 | **Porównanie katalogu produkcji z katalogiem migracji** — sekcja 1 niżej | **Ethan** | **OTWARTE** |
| 3 | **Kopie zapasowe: reguła 30 dni + rejestr poza bazą + krok „ponów usunięcia"** | **Ethan** | **OTWARTE** (pakiet 7 projektu E1b) |
| 4 | **Sign-off domeny 8 (RLS / retencja)** | **Ryan (CRCO)** | **OTWARTE** |
| 5 | **Migracja `0048` wdrożona na produkcję** | **Ethan** (wykonanie i sign-off schemy — patrz nota niżej) | **DOMKNIĘTE 2026-08-13** — ceremonia `docs/ceremonie/2026-08-13-ceremonia-prod.md`; ograniczenie `audit_log_regula_aktora` istnieje na produkcji (`NOT VALID`, zgodnie z projektem), dziennik migracji 49 |
| 6 | **Klauzula informacyjna z art. 13** — bez niej zapłon daje prawo do usunięcia danych, o których zbieraniu nikogo nie poinformowano | Sophia / Ryan (E2c, #290) | **OTWARTE** |
| 7 | **Ekran w interfejsie** (`/profil`, okno potwierdzenia, ekran po usunięciu) | **Jack** (frontend) | **OTWARTE** — bez niego ścieżka jest osiągalna wyłącznie wywołaniem trasy |
| 8 | **Ścieżka logowania Google przećwiczona** — 18 z 33 kont produkcyjnych nie ma hasła i idzie wariantem „świeża sesja" | Quinn / Max | **OTWARTE** (niedowiedzione behawioralnie) |

---

## 1. Bramka 2 — porównanie katalogu produkcji z katalogiem migracji

**Czego dotyczy.** Strażnik S-U-1 dowodzi kompletności kaskady na **bazie testowej
budowanej z `drizzle/`**. Tabela utworzona **ręcznie na produkcji** jest dla niego
**strukturalnie niewidzialna** i żaden test tego nie naprawi — dlatego domknięciem jest
procedura, nie kolejny strażnik.

**Że to nie jest ryzyko teoretyczne, jest zmierzone.** Na produkcji istnieje
`job_market_data_bak` (240 wierszy, pomiar Ethana 2026-08-10), której **nie ma w żadnej
migracji** — więc nie ma jej w bazie testowej i S-U-1 nigdy jej nie zobaczy. Gdyby taka
tabela niosła identyfikator studenta, usunięcie konta zostawiłoby go bez śladu w żadnym
teście.

### Procedura (wykonuje Ethan — ja nie mam poświadczeń produkcji)

**Krok 1.** Odczytaj listę tabel z **produkcji** (źródło autorytatywne — interfejs
programowy Neona albo konsola, nie zrzut konfiguracji):

```sql
SELECT c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'
 ORDER BY 1;
```

**Krok 2.** Odczytaj to samo z bazy testowej **po** `pnpm db:migrate:test` (czyli
z katalogu zbudowanego wyłącznie z `drizzle/`).

**Krok 3.** Porównaj oba zbiory. Dla **każdej** tabeli obecnej na produkcji, a nieobecnej
w migracjach, odpowiedz na jedno pytanie i zapisz odpowiedź:

> *Czy po usunięciu konta ten wiersz nadal mówi, co robił ten konkretny człowiek?*

- **NIE** → dopisz tabelę do `TABELE_BEZ_DANYCH_OSOBY`
  (`src/lib/db/__tests__/rodo-e1b-zakres-usuwania.ts`) z jednozdaniowym powodem
  **albo** usuń ją z produkcji, jeśli jest kopią roboczą po naprawie.
- **TAK** → **STOP, flagi nie zapalamy.** Tabela musi dostać klucz obcy z kaskadą
  (wtedy wejdzie do zasięgu S-U-1) albo zostać wyczyszczona.

**Krok 4.** Zapisz wynik porównania w audit logu firmy razem z datą odczytu — tak jak
każde inne twierdzenie o stanie produkcji (CLAUDE.md §8, v1.16: dowód z komendy, nie
deklaracja).

### Kiedy powtarzać

Przy **każdym** zapłonie tej flagi oraz po **każdej** ręcznej zmianie schematu produkcji
wykonanej poza migracjami. Wynik starszy niż ostatnia taka zmiana jest bezwartościowy.

---

## 2. Czego ten runbook NIE rozstrzyga

- **Zapłonu flagi jako decyzji** — to Ethan, po domknięciu bramek 1–8.
- **Sign-offu domeny 8** — Ryan; implementacja jest moja, sign-off nie (granica G4).
- **Wdrożenia migracji `0048`** — **wykonane 2026-08-13 przez Ethana** (nie potokiem wdrożeniowym Evy, jak zakładał pierwotny podział). **Przypisanie miało własny powód: rozdzielało wykonawcę od sign-offującego** — Eva nakładała, Ethan zatwierdzał schemę, więc zmianę produkcyjną oglądały dwie pary oczu **przed** faktem. **Przejęcie ten bezpiecznik znosi i trzeba to zapisać wprost: 2026-08-13 Ethan był wykonawcą i sign-offującym naraz.** Uzasadnienie przejęcia (migracja w pełni addytywna, `NOT VALID`, zero zmiany danych; rozbicie na drugi przejazd oznaczałoby drugą kopię zapasową i drugie okno ryzyka) broni się co do mandatu — `CLAUDE.md` sekcja 5 punkt 3 daje zmiany bazy produkcyjnej Ethanowi wprost — ale **nie odtwarza czterech oczu**. Zastąpiły je kontrole nierównoważne, bo działające **po** fakcie albo mechanicznie: pre-flight z kodem wyjścia, kopia zapasowa przed zmianą, weryfikacja z katalogu bazy oraz przegląd tego wpisu przez Leo. **Próg powrotu:** przy pierwszej migracji **nie-addytywnej** (cokolwiek z `DROP`, `ALTER … TYPE`, zmianą danych) rozdzielenie wykonawcy od sign-offującego wraca jako warunek — wtedy nakłada Eva albo Max, a Ethan wyłącznie zatwierdza (granica G3).
- **Rozbieżności zakresu wokół pakietu 3** (`CHECK (user_id IS NULL)` na
  `ai_usage_ledger`): Oliver zapisał „D-U8 to jedyna migracja schemy w tym zadaniu",
  Ethan wyceniał dwie. Rozstrzygają Ethan z Sophią, nie wykonawca.

## 3. Powiązane

- Strażnicy i mutacje: zgłoszenie **#293**.
- Nośnik zakresu kasowania: `src/lib/db/__tests__/rodo-e1b-zakres-usuwania.ts`.
- Kopia zapasowa przed zmianą danych produkcyjnych:
  `docs/runbooks/neon-kopia-zapasowa.md` (właściciel: Ethan).
