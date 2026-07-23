# %% [markdown]
# # SQL.3 — GROUP BY: agregaty per grupa, po SQL-owemu
#
# **SkillBridge · ścieżka Data Science · moduł M-SQL „SQL: analiza danych w bazie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi SQL.3. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.
#
# Na końcu czeka luka do uzupełnienia — WEWNĄTRZ zapytania oznaczam ją
# sześcioma podkreśleniami `______`. Uruchomienie bez uzupełnienia NIE da
# `NameError` jak w Pythonie: silnik weźmie `______` za nazwę kolumny
# i odmówi komunikatem `Binder Error: Referenced column "______" not
# found in FROM clause!`.

# %%
import duckdb
import pandas as pd

przejazdy = pd.DataFrame([
    {"id": 1, "strefa_id": 10, "minuty": 12, "kwota": 50.0, "godzina": 8},
    {"id": 2, "strefa_id": 20, "minuty": 35, "kwota": 22.0, "godzina": 8},
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
# `groupby` z PD.6 — „podziel, policz w każdej grupie, sklej" — ma w SQL
# rodzonego brata.
#
# **Przewidź, zanim uruchomisz:** strefy kolejnych przejazdów to
# 10, 20, 10, 30, 10. Ile wierszy będzie miał wynik i co stanie
# w kolumnie `liczba_przejazdow`?

# %%
duckdb.sql("""
    SELECT
        strefa_id,
        COUNT(*)   AS liczba_przejazdow,   -- ile wierszy w grupie
        AVG(kwota) AS srednia_kwota        -- średnia w grupie
    FROM przejazdy
    GROUP BY strefa_id                     -- grupuj po strefie
""")

# %% [markdown]
# Trzy wiersze — po jednym NA GRUPĘ: strefa 10 z liczbą 3, strefy 20 i 30
# z liczbą 1. Grupowanie ZWIJA wiersze: z pięciu przejazdów robi trzy
# podsumowania.
#
# Trzy rzeczy do zauważenia w wyniku:
#
# - **Kolejność grup jest przypadkowa** — nie ma tu `ORDER BY`, więc
#   silnik niczego nie obiecał (SQL.2). Chcesz stałego porządku? Dopisz
#   `ORDER BY strefa_id`.
# - **`srednia_kwota` dla strefy 10 to 30.666666666666668** — surowa
#   liczba zmiennoprzecinkowa z długim ogonem (F1.4). W raporcie ją
#   zaokrąglisz; tutaj patrzysz na wynik bez upiększeń.
# - **Aliasy `AS` robią robotę** — bez nich kolumny nazywałyby się
#   `count_star()` i `avg(kwota)`. Zapytanie zadziała, ale nagłówki
#   raportu będą techniczne. Aliasuj wszystko, co policzone.
#
# Samokontrola każdego grupowania: suma `COUNT(*)` ze wszystkich grup ma
# równać się liczbie wierszy tabeli — u nas 3 + 1 + 1 = 5. Tanie
# sprawdzenie, że żaden wiersz nie zginął ani się nie zdublował.
#
# ## Reguła, której silnik pilnuje błędem
#
# W `SELECT` może stać TYLKO to, po czym grupujesz, albo agregat.
# Komórka poniżej CELOWO łamie tę regułę: `minuty` stoją luzem przy
# grupowaniu po strefie.

# %%
duckdb.sql("""
    SELECT strefa_id, minuty, COUNT(*)
    FROM przejazdy
    GROUP BY strefa_id             -- celowy błąd: `minuty` luzem
""")

# %% [markdown]
# `Binder Error: column "minuty" must appear in the GROUP BY clause or
# must be part of an aggregate function` — dla strefy o trzech
# przejazdach silnik nie wie, KTÓRE minuty pokazać, więc odmawia.
# Czytaj to jako „albo grupujesz, albo agregujesz". Poprawki: `AVG(minuty)`,
# `SUM(minuty)`, albo dodanie `minuty` do `GROUP BY` — ale wtedy zmieniasz
# grupy. (DuckDB dokleja jeszcze podpowiedź o `ANY_VALUE` — to obejście
# na „wartość dowolna, nieważne która", nie odpowiedź na Twoje pytanie.)
#
# ## Uzupełnij lukę (completion)
#
# Poniższe zapytanie ma dać sumę kwot per godzina, od najruchliwszej.
# W miejsce `______` wstaw kolumnę, po której trzeba grupować — tę samą,
# która stoi „luzem" w `SELECT`.

# %%
duckdb.sql("""
    SELECT
        godzina,
        SUM(kwota) AS suma_kwot
    FROM przejazdy
    GROUP BY ______            -- luka: po czym grupujesz?
    ORDER BY suma_kwot DESC
""")

# %% [markdown]
# Zanim uruchomisz uzupełnioną wersję: godziny w danych to 8, 8, 9, 17,
# 17 — ile grup powinno wyjść i która wygra ranking sumy? Policz w głowie,
# potem porównaj z wynikiem.
#
# `WHERE` przesiewa wiersze PRZED grupowaniem — „suma kwot per godzina,
# ale tylko dla kursów dłuższych niż 10 minut" to `WHERE minuty > 10`
# wstawione MIĘDZY `FROM` a `GROUP BY`. Pełna kolejność klauzul:
# `SELECT → FROM → WHERE → GROUP BY → ORDER BY → LIMIT`.
