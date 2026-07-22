# %% [markdown]
# # SQL.6 — Funkcje okna: agregat, który nie zjada wierszy
#
# **SkillBridge · ścieżka Data Science · moduł M-SQL „SQL: analiza danych w bazie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi SQL.6. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.
#
# Ostatnia komórka to zadanie odwrotne: masz gotowy wynik, dopisujesz
# zapytanie. Uruchomienie urwanego zapytania da `Parser Error: syntax
# error at end of input` — to znak, że silnik doczytał do końca i czegoś
# mu zabrakło, nie że pomysł jest zły.

# %%
import duckdb
import pandas as pd

przejazdy = pd.DataFrame([
    {"id": 1, "strefa_id": 10, "minuty": 12, "kwota": 23.5, "godzina": 8},
    {"id": 2, "strefa_id": 20, "minuty": 35, "kwota": 61.0, "godzina": 8},
    {"id": 3, "strefa_id": 10, "minuty": 7,  "kwota": 14.0, "godzina": 9},
    {"id": 4, "strefa_id": 30, "minuty": 22, "kwota": 41.5, "godzina": 17},
    {"id": 5, "strefa_id": 10, "minuty": 15, "kwota": 28.0, "godzina": 17},
])
strefy = pd.DataFrame([
    {"strefa_id": 10, "nazwa": "Manhattan"},
    {"strefa_id": 20, "nazwa": "Brooklyn"},
    {"strefa_id": 30, "nazwa": "Queens"},
])

# %% [markdown]
# `GROUP BY` ma cenę: ZWIJA wiersze. A co, gdy potrzebujesz jednocześnie
# szczegółu i agregatu — przy każdym przejeździe pokazać sumę jego
# strefy? Grupowanie zje przejazdy; funkcja okna policzy agregat, nie
# zjadając wierszy.
#
# **Przewidź, zanim uruchomisz:** ile wierszy będzie miał wynik i co
# stanie w `suma_strefy` przy trzech przejazdach strefy 10 (kwoty 23.5,
# 14.0, 28.0)?

# %%
duckdb.sql("""
    SELECT
        id,
        strefa_id,
        kwota,
        SUM(kwota) OVER (PARTITION BY strefa_id) AS suma_strefy
    FROM przejazdy
    ORDER BY id
""")

# %% [markdown]
# **Pięć wierszy — wszystkie** — a przy każdym przejeździe strefy 10 ta
# sama wartość `65.5` (suma jego grupy). Powtórzona liczba to nie usterka,
# tylko definicja okna partycyjnego.
#
# Czytaj składnię od słowa **OVER**: „policz `SUM(kwota)` PONAD oknem",
# a okno definiuje nawias — `PARTITION BY strefa_id` znaczy „oknem są
# wiersze tej samej strefy". Okno to GROUP BY, który zagląda przez ramię
# każdemu wierszowi, zamiast zwijać tabelę.
#
# Dopiero to daje wskaźniki typu „udział przejazdu w sumie strefy":

# %%
duckdb.sql("""
    SELECT
        id,
        strefa_id,
        kwota,
        kwota / SUM(kwota) OVER (PARTITION BY strefa_id) AS udzial
    FROM przejazdy
    ORDER BY id
""")

# %% [markdown]
# Przejazdy 2 i 4 mają `udzial` równy 1.0 — są jedyne w swoich strefach,
# więc biorą całą sumę. To poprawny wynik, nie błąd zaokrąglenia.
#
# ## Druga rodzina okien: numerowanie i rankingi

# %%
duckdb.sql("""
    SELECT
        id,
        kwota,
        ROW_NUMBER() OVER (ORDER BY kwota DESC) AS miejsce
    FROM przejazdy
""")

# %% [markdown]
# `ROW_NUMBER()` nadaje kolejne numery wg porządku Z NAWIASU — tu od
# najdroższego, miejsca 1–5. Połącz oba mechanizmy w jednym nawiasie
# (`PARTITION BY … ORDER BY …`), a dostaniesz ranking OSOBNY w każdej
# strefie: to jest top-N per grupa, którego zwykły `ORDER BY … LIMIT`
# z SQL.2 nie potrafi. Kuzyni do skojarzenia: `RANK()` (remisy dostają to
# samo miejsce) i `LAG()` (wartość z poprzedniego wiersza okna).
#
# Reguła wyboru — i gotowe zdanie do uzasadnień, których żąda rubryka
# capstone'u: **potrzebujesz TYLKO wyników per grupa → GROUP BY;
# potrzebujesz agregatu OBOK szczegółu wierszy → funkcja okna.**
# Wzorzec zdania: „okno, bo chcę udział przejazdu w sumie strefy —
# GROUP BY zjadłby przejazdy".
#
# ## Zadanie odwrotne: wynik masz, dopisz zapytanie
#
# Kolumna `nr_w_strefie` numeruje przejazdy KAŻDEJ strefy od
# najdłuższego. Składniki nawiasu `OVER` wyczytasz z samego wyniku:
# numeracja osobna per strefa → `PARTITION BY` czym? „od najdłuższego" →
# `ORDER BY` czym i w którą stronę?
#
# Wiersze poniżej ułożyłam po `id`. Bez `ORDER BY id` w Twoim zapytaniu
# silnik może zwrócić je w innej kolejności (SQL.2: czego nie
# zadeklarujesz, tego nie obiecano) — porównuj ZAWARTOŚĆ, nie porządek.

# %%
# dopisz JEDNO zapytanie, które daje poniższy wynik:
# ┌───────┬────────┬──────────────┐
# │  id   │ minuty │ nr_w_strefie │
# │ int64 │ int64  │    int64     │
# ├───────┼────────┼──────────────┤
# │     1 │     12 │            2 │
# │     2 │     35 │            1 │
# │     3 │      7 │            3 │
# │     4 │     22 │            1 │
# │     5 │     15 │            1 │
# └───────┴────────┴──────────────┘

# %% [markdown]
# Autokontrola okna: liczba wierszy wyniku ma równać się liczbie wierszy
# tabeli (5) — jeśli wyszło mniej, gdzieś zwinęło się grupowanie zamiast
# okna. I szczegół kolejności na przyszłość: okno liczy się PO przesiewie
# `WHERE` — ranking „w całej tabeli" i ranking „wśród przefiltrowanych"
# to dwa różne rankingi.
