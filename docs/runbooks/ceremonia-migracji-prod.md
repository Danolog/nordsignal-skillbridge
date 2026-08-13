# Runbook: ceremonia migracji produkcyjnej

**Wersja:** v1.0 · 2026-08-13 · **Właściciel:** Ethan (CTO) · **Delegacja:** `CLAUDE.md` v1.12 pkt 3 (zmiany bazy produkcyjnej), bramki jakości (a)–(f).

**Dlaczego ten plik powstał.** Ogólnego runbooka ceremonii migracji **nie było**. Istniejące dokumenty tego nie pokrywały: `k3-prod-migration.md` jest specyficzny dla K3 z maja 2026, `aktywacja-1e1/1e2-neon-console.md` to warianty konsolowe pojedynczych zapłonów, a `protokol-przejazdu-darka-v0.1.md` opisuje przejazd użytkownika, nie ceremonię techniczną. Krok pre-flightu wciśnięty w którykolwiek z nich byłby drugim nośnikiem w cudzym dokumencie (`CLAUDE.md` §8, v1.17).

**Żargon (tłumaczenie).** *Pre-flight* — sprawdzenie przed startem, które ma prawo powiedzieć „nie startuj". *Kod wyjścia* — liczba, którą program zwraca po zakończeniu; `0` umownie znaczy „w porządku". *Referencja zdalna* — wskaźnik na stan gałęzi na serwerze (`origin/main`), w odróżnieniu od stanu na dysku. *Migracja* — wersjonowana zmiana struktury bazy.

---

## 0. Kiedy stosować

Każda zmiana struktury bazy produkcyjnej (`db:migrate` na produkcję) oraz każdy zaciąg danych na produkcję. Dla samego odczytu — nie stosuje się.

## 1. Kopia zapasowa (bramka (b), nie do pominięcia)

Gałąź kopii w Neonie **przed** jakąkolwiek zmianą: `docs/runbooks/neon-kopia-zapasowa.md`.
Limit planu darmowego to 10 gałęzi — przycinanie kopii **przed** ceremonią, nigdy w jej trakcie (bramka (g), `CLAUDE.md` v1.15). Zostają zawsze dwie najnowsze kopie stanu produkcji.

## 2. Pre-flight — **umowa kodów wyjścia**

```bash
pnpm db:preflight
```

**Umowa jest wiążąca i mieszka tutaj, nie w pamięci operatora:**

| Kod | Werdykt | Co robisz |
|---|---|---|
| **0** | `SPÓJNY` | **Jedziesz.** To jedyny kod, który uprawnia do kroku 3. |
| **1** | `NIESPÓJNY` | **STOP.** Twarde znalezisko: rozjazd dziennika, luka, drift, nieświeże drzewo albo rozjazd treści `drizzle/`. Nie migrujesz; diagnozujesz. |
| **2** | `NIEROZSTRZYGNIĘTY` | **STOP.** Nie wiadomo, czy jest spójnie — brak potwierdzenia referencji wobec zdalnego. **To nie jest „prawie zielone".** Traktuj jak `1`. |

**Nie ma kodu, który znaczy „przejdź dalej mimo wszystko".** Jeśli chcesz obejść pre-flight, to znaczy, że ceremonia nie jest gotowa — wróć do kroku 1.

**Dlaczego `2` jest osobnym kodem, a nie ostrzeżeniem.** Do 2026-08-13 narzędzie potrafiło wypisać „WYNIK: spójny" w sytuacji, w której nie miało żadnej wiedzy o stanie zdalnym — wystarczyło `PROD_JOURNAL_SKIP_FETCH=1` albo `PROD_JOURNAL_REF=HEAD`. Migracja czekająca na zdalnym była wtedy niewidzialna. Znalazł to Leo (przegląd `#300`). Ostrzeżenie w logu ginie; **kod wyjścia nie ginie**.

## 3. Migracja

```bash
pnpm db:migrate
```

Wyłącznie po kodzie `0` z kroku 2. Zaciąg danych: **transakcyjny** `DELETE WHERE …` + `INSERT`, **nigdy** niszczący `db:seed` na produkcji (bramka (c)).

## 4. Weryfikacja po

Sprawdzasz **stan faktyczny**, nie komunikat narzędzia (`CLAUDE.md` §8, v1.16 — dowód z komendy, nie deklaracja):
- obiekt, który migracja miała utworzyć, **istnieje** (zapytanie do `information_schema`);
- dziennik migracji ma wpis o jeden większy;
- `pnpm db:preflight` zwraca teraz `0` i **zero** pozycji oczekujących.

## 5. Ślad

Wpis do `docs/ceremonie/<data>-ceremonia-prod.md`: co, kiedy, tożsamość bazy, cytaty z wyjścia komend, kto wykonał. Bez wartości sekretów. Dowód żyjący w oknie czatu ma wartość audytową zero.

---

## Granice — czego ten runbook NIE obejmuje

- **Wskazania cudzej referencji zdalnej.** Pre-flight wymaga referencji **zdalnej**, ale nie sprawdza, czy jest **nasza** — wskazanie własnego repozytorium z niezatwierdzonym SQL-em przejdzie wszystkie trzy bramki. Wymaga dwóch świadomych czynności i nic tego nie reklamuje. **Próg domknięcia (Leo): przed pierwszą ceremonią z checkoutu innego niż kanoniczny.**
- **Rotacji sekretów** — osobna ścieżka, `CLAUDE.md` v1.15 bramka (h).
- **Zmian wymagających sign-offu Darka** (sekcja 4 konstytucji) — runbook ich nie zastępuje.
