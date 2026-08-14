# Ceremonia: nadanie roli i uprawnień `app_runtime` na produkcji

**Właściciel dokumentu:** Ryan (CRCO). **Wersja:** v0.1 · 2026-08-13.
**Autoryzacja:** Darek, 2026-08-13 — *„możesz uruchomić sekwencję kroków"*. Autoryzacja dotyczy **procedury**, nie pojedynczego uruchomienia narzędzia.

> **Ta procedura NIE ZOSTAŁA JESZCZE WYKONANA.** Powstała, zanim ktokolwiek uruchomił narzędzie na produkcji — to jest cel: kroki mają być spisane, zanim ktoś stanie przed konsolą, a nie odtwarzane z pamięci po fakcie.

---

## 0. Do jakiej kategorii to należy i czyja to decyzja

Odpowiedź stoi tutaj, żeby następna osoba nie musiała jej odkrywać od nowa.

Nadanie roli i uprawnień (`CREATE ROLE`, `ALTER ROLE … PASSWORD`, `GRANT`) **nie mieści się w delegacji nieodwracalnych działań technicznych Ethana** (CLAUDE.md §5, v1.12/v1.15/v1.16). Delegacja wymienia: scalenie do `main`, wdrożenie na produkcję, migrację schemy i zaciąg danych, kasowanie gałęzi Neona, rotację `BETTER_AUTH_SECRET`, tworzenie poświadczeń dostępu dla CI pod bramką pięciu warunków. **Zmiana uprawnień w bazie nie jest żadnym z nich** — nie jest migracją schemy (nie zmienia struktury tabel) ani zaciągiem danych (nie zmienia wierszy).

To jest **luka w konstytucji, nie w rozumowaniu wykonawcy**: reguła opisuje czynności sąsiednie i milczy o tej. Ta sama klasa, co brak reguły o *tworzeniu* poświadczeń CI, zamknięty w v1.16 po audycie przy PR #261.

**Do czasu nazwania tego w konstytucji:** czynność należy do klasy „nieodwracalne działanie techniczne **poza** delegacją", czyli **decyzja Darka** (CLAUDE.md §4, granica twarda). Ta procedura jest wykonaniem jego autoryzacji z 2026-08-13, nie jej obejściem.

**Rekomendacja (nie zmiana — pliku rządzenia nie dotykam, to czerwona linia Darka):** przy najbliższej rewizji CLAUDE.md nazwać „zmianę ról i uprawnień w bazie produkcyjnej" jako **osobną pozycję** — albo jawnie w delegacji Ethana pod bramkami, albo jawnie przy Darku. Dziś jest w milczeniu, a milczenie za każdym razem kosztuje jedną turę ustaleń.

---

## 1. Warunek wejścia — kiedy wolno tę procedurę uruchomić

Wszystkie naraz:

1. **Jest powód** — aplikacja produkcyjna ma działać na roli `app_runtime` (nie na roli właściciela bazy), albo poświadczenie `app_runtime` wymaga wymiany.
2. **Migracja `0011`** (definiująca role `app_student` / `app_faculty`) **jest na produkcji.** Jeśli nie jest, narzędzie pójdzie ścieżką `CREATE ROLE` — to inna, cięższa klasa (patrz §4).
3. **Jest kopia zapasowa** — patrz §2 krok 1.
4. **Darek jest przy klawiaturze.** Bez niego nie ma sign-offu (§5).

**Stan dzisiejszy — domyślna odmowa.** `tools/activate-app-runtime.ts` woła bramkę bazy w polityce domyślnej, więc **każdy host zdalny jest odmawiany bezwarunkowo** i żadna zmienna środowiskowa tego nie obchodzi. To jest stan pożądany między ceremoniami, nie usterka.

---

## 2. Sekwencja kroków

### Krok 1 (PRZED) — kopia zapasowa

Wykonaj wg **`docs/runbooks/neon-kopia-zapasowa.md`**, sekcja *3b. Utworzenie kopii zapasowej*. Kroków stamtąd tu nie powtarzam — jeden nośnik.

Zapisz nazwę gałęzi kopii; będzie potrzebna w §4 i w §6.

### Krok 2 (PRZED) — odczyt stanu wyjściowego

Zanotuj, **co jest teraz**, żeby po zmianie było z czym porównać:

```sql
SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname = 'app_runtime';
SELECT r.rolname AS rola, m.rolname AS nadana
  FROM pg_auth_members am
  JOIN pg_roles r ON r.oid = am.member
  JOIN pg_roles m ON m.oid = am.roleid
 WHERE r.rolname = 'app_runtime';
```

Oczekiwane po ceremonii: `rolcanlogin = true`, **`rolbypassrls = false`**, przynależność do `app_student` i `app_faculty`.

> `rolbypassrls = false` jest **najważniejszą** liczbą w tej procedurze. Rola z `BYPASSRLS` widzi dane wszystkich najemców niezależnie od reguł bezpieczeństwa na wierszach. Jeśli po ceremonii wyjdzie `true` — ceremonia jest nieudana, niezależnie od tego, że aplikacja wstanie.

### Krok 3 (OTWARCIE ŚCIEŻKI) — co dokładnie się zmienia

Narzędzie ma **domyślną odmowę**. Otwarcie ścieżki produkcyjnej to **zmiana w kodzie pod przeglądem**, nie flaga w powłoce:

1. w `tools/activate-app-runtime.ts` wywołanie bramki dostaje `{ allowProduction: true }`;
2. narzędzie przenosi się z listy `NIGDY_PRODUKCJA` na listę ceremonii w `tests/unit/tools/assert-test-db-zasieg-ceremonii.test.ts`;
3. dokładasz **mutację** dowodzącą, że **bez** tej deklaracji narzędzie pada na hoście zdalnym.

Bez punktu 2 bramka zasięgu zapala się na czerwono — celowo: poszerzenie dostępu do produkcji nie ma przechodzić niezauważone.

### Krok 4 (WYKONANIE) — uruchomienie

```
CONFIRM_PROD_DB=1 pnpm exec tsx tools/activate-app-runtime.ts --zapis <ścieżka-poza-repozytorium>
```

- `--zapis` jest **wymagany**. Bez niego narzędzie odmawia startu, bo poświadczenie nie ma gdzie wyjść (§3).
- Ścieżka **poza repozytorium** (np. w katalogu domowym) — plik nigdy nie ma szansy trafić do gita.
- Wymiana poświadczenia bez zmiany roli: dodaj `--haslo-z-wejscia` i **wpisz wartość po zapytaniu narzędzia**. Nie podawaj jej przez `echo … |` ani w zmiennej środowiskowej — patrz §3.

Narzędzie samo, w tej samej sekwencji: sprawdza rolę (`rolcanlogin`, `rolbypassrls`) i **przerywa, jeśli wyjdzie źle**, a potem robi próbę połączenia nową rolą i sprawdza, że przy `SET LOCAL ROLE app_student` bez ustawionego identyfikatora użytkownika widać **0 wierszy** (deny-default działa). Test jest w transakcji wycofywanej.

### Krok 5 (PO) — sprawdzenie odczytem, nie zapewnieniem

Powtórz **oba zapytania z kroku 2** i porównaj z oczekiwaniem. Dodatkowo:

```sql
-- Czy rola faktycznie NIE omija bezpieczeństwa na wierszach:
SELECT rolbypassrls FROM pg_roles WHERE rolname = 'app_runtime';   -- oczekiwane: false
```

Potwierdzenie „mam tę samą wartość, co w pliku" bez pokazywania jej: porównaj **odcisk** wypisany przez narzędzie z odciskiem wartości wklejonej do Vercela (`sha256`, pierwsze 12 znaków).

### Krok 6 (PO) — wydanie poświadczenia do Vercela

1. Odczytaj wartość **z pliku**, nie z ekranu.
2. Wklej do Vercel → `skill-bridge-ai` → Settings → Environment Variables → Production + Preview.
3. Redeploy.
4. **Sprawdź logowanie po zmianie** — dopóki ktoś się nie zaloguje, ceremonia nie jest domknięta.
5. **Skasuj plik** z poświadczeniem po wklejeniu (`rm`). Trzymanie go „na wszelki wypadek" to trzymanie sekretu w miejscu bez rotacji.

### Krok 7 (PO) — zamknięcie ścieżki

Cofnij krok 3: `{ allowProduction: true }` znika, narzędzie wraca na listę `NIGDY_PRODUKCJA`. **Domyślna odmowa jest stanem spoczynkowym.** Ścieżka otwarta „bo może się przyda" to ścieżka otwarta w dniu, w którym ktoś pomyli środowiska.

### Krok 8 (PO) — ślad

Wpis do dziennika: co, kiedy, przez kogo, nazwa gałęzi kopii, odcisk wydanego poświadczenia (**nigdy wartość**), wynik odczytu z kroku 5.

---

## 3. Wydanie sekretu — połowa tej decyzji

**Reguła:** sekret wchodzi **wyłącznie wejściem standardowym**, wychodzi **wyłącznie do pliku o prawach 0600**. Nigdy jako argument polecenia, nigdy w zmiennej środowiskowej, nigdy na ekran.

**Co było zepsute (naprawione w tej samej zmianie, nie „potem"):** narzędzie wypisywało na ekran **pełny adres połączenia z sekretem oraz sam sekret**. Wyjście trafia do przewijania terminala, do zapisu sesji agenta i do dziennika przebiegu CI — trzech miejsc, których nikt nie sprząta i które przeżywają sesję. Poprzednio sekret dało się też podać zmienną środowiskową, a tę ustawia się w praktyce w jednej linii z poleceniem, czyli w historii powłoki.

To ta sama reguła, którą konstytucja rozstrzygnęła dla poświadczeń CI (CLAUDE.md §5, bramka (i) punkt 5 — „wyłącznie przez standardowe wejście, nigdy jako argument polecenia") i którą `tools/pilot-enroll.ts` stosuje u siebie dla adresu uczestnika. Tutaj domknięta jest **druga połowa: nigdy na wyjście**.

⚠ `echo "wartość" | pnpm tsx …` **przywraca dokładnie ten wyciek**. Wartość wraca do historii powłoki i do tablicy procesów.

**Konstrukcja, nie dyscyplina:** funkcja budująca komunikat dostaje **ścieżkę i odcisk**, a samej wartości nie widzi — więc nie ma czego wypisać nawet przez pomyłkę. Pilnuje tego `tests/unit/tools/activate-app-runtime-wydanie.test.ts` z mutacjami (m.in. przywrócenie wypisania na ekran → test czerwony).

---

## 4. Co jest odwracalne, a co nie

| Krok | Odwracalny? | Czym się cofa |
|---|---|---|
| `GRANT` przynależności do ról | **tak** | `REVOKE` |
| `ALTER ROLE … PASSWORD` (wymiana sekretu) | **tak**, ale **unieważnia bieżące poświadczenie** | ponowna wymiana; do czasu wklejenia nowej wartości do Vercela **aplikacja nie połączy się z bazą** |
| `ALTER ROLE … LOGIN` | tak | `NOLOGIN` |
| **`CREATE ROLE`** (gdy roli nie było) | **NIE w praktyce** | `DROP ROLE` wymaga wcześniejszego odebrania wszystkich uprawnień i zmiany właściciela obiektów; w bazie z danymi produkcyjnymi to osobna operacja o własnym ryzyku |
| Zapis do Vercel env + redeploy | tak | przywrócenie poprzedniej wartości + redeploy |

**Krok nieodwracalny stoi tu wprost, żeby nie wyszedł w trakcie:** jeśli `app_runtime` **nie istnieje**, narzędzie tworzy rolę. To znaczy, że migracja `0011` nie jest na produkcji — czyli **założenie tej procedury jest niespełnione**. W takiej sytuacji **przerwij i wróć do Darka**, zamiast pozwolić narzędziu utworzyć rolę „przy okazji". Utworzenie roli w bazie z danymi produkcyjnymi to inna klasa niż nadanie uprawnień istniejącej roli.

**Zawsze odwracalne w całości:** przywrócenie stanu z kopii zapasowej z kroku 1 — kosztem utraty danych zapisanych po jej wykonaniu. Dlatego ceremonia idzie w oknie bez ruchu użytkowników.

---

## 5. Kto wykonuje i czym potwierdza

**Wykonuje agent, potwierdza Darek — i to potwierdzenie JEST sign-offem.** Model wykonawczy z CLAUDE.md §13 pkt 7 i §4 („Mechanizm sign-offu przy wykonawstwie agenta"): agent uruchamia kroki własnymi narzędziami w uwierzytelnionym środowisku Darka, Darek potwierdza **każdy krok** w monicie uprawnień.

**Wykonawca nie szuka osobnej zgody.** Autoryzacja procedury (Darek, 2026-08-13) plus potwierdzenie per krok w monicie = komplet. Nie ma trzeciej bramki.

Czego to **nie** obejmuje: zmiany zakresu (inna rola, inne uprawnienia, inna baza) — to nowa decyzja, nie ten sam sign-off.

**Sekret wpisuje ta sama osoba, która siedzi przy klawiaturze.** Jeśli wartość miałaby do kogoś *jechać*, powstaje kanał przekazania sekretu, którego dziś nie ma — a wtedy wracamy z tym do mnie przed wykonaniem.

---

## 6. Warunek wyjścia — po czym poznać, że się udało

Wszystkie naraz:

1. `rolcanlogin = true` **i `rolbypassrls = false`** (odczyt z kroku 5, nie komunikat narzędzia);
2. przynależność do `app_student` i `app_faculty` potwierdzona odczytem;
3. próba deny-default zwróciła **0 wierszy**;
4. **logowanie do aplikacji po redeployu działa** — sprawdzone, nie założone;
5. plik z poświadczeniem **skasowany** po wklejeniu;
6. ścieżka produkcyjna **zamknięta** z powrotem (krok 7), bramka zasięgu zielona;
7. wpis w dzienniku (krok 8).

Brak któregokolwiek = ceremonia niedomknięta. Nie „prawie".

---

## 7. Czego ta procedura NIE obejmuje

- **Migracji `0047` ani żadnej innej migracji schemy** — to osobna sekwencja, prowadzona przez Ethana, i mimo podobnej nazwy nie miesza się z tą. Nie łącz ich w jedno okno.
- **Rotacji pozostałych sekretów produkcyjnych** (poświadczenie właściciela bazy, `NEON_API_KEY`, `GITHUB_TOKEN`, klucz dostawcy modelu) — sign-off Darka osobno, CLAUDE.md §4.
- **Zmiany reguł bezpieczeństwa na wierszach** — inna domena, inny przegląd.
