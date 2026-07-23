# %% [markdown]
# # SQL.2 — WHERE i ORDER BY: przesiej i uporządkuj
#
# **SkillBridge · ścieżka Data Science · moduł M-SQL „SQL: analiza danych w bazie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi SQL.2. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

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
# Zadanie brzmi: „przejazdy z Manhattanu, od najdroższego". Chwila —
# w `przejazdy` nie ma kolumny z nazwą strefy, jest `strefa_id`.
# Filtruj po tym, co JEST: Manhattan to `strefa_id = 10` (nazwy dołączysz
# JOIN-em w SQL.5 — ten zgrzyt jest dokładnie powodem, dla którego JOIN-y
# istnieją).
#
# **Przewidź, zanim uruchomisz:** kwoty w strefie 10 to 50.0, 14.0 i 28.0.
# Ile wierszy wróci i w jakiej kolejności?

# %%
duckdb.sql("""
    SELECT id, kwota
    FROM przejazdy
    WHERE strefa_id = 10      -- zostaw wiersze spełniające warunek
    ORDER BY kwota DESC       -- ułóż od największej (DESC = malejąco)
""")

# %% [markdown]
# Trzy wiersze: 50.0, 28.0, 14.0 — id kolejno 1, 5, 3. `WHERE` to maska
# z PD.3 po SQL-owemu, a `ORDER BY` ustawia porządek, którego bez niego
# NIKT Ci nie gwarantuje.
#
# Równość to POJEDYNCZY znak `=` — w SQL nie ma przypisania, więc pułapka
# z F1.5 tu nie istnieje.
#
# ## Mantra: DANE W APOSTROFACH
#
# Tekstów szukamy w `strefy`, bo tam mieszkają nazwy. Komórka poniżej
# CELOWO się wywali — nazwa strefy stoi w niej w PODWÓJNYCH cudzysłowach,
# czyli tak, jak pisze się teksty w Pythonie.

# %%
duckdb.sql("""
    SELECT strefa_id, nazwa
    FROM strefy
    WHERE nazwa = "Manhattan"     -- celowy błąd: podwójne cudzysłowy
""")

# %% [markdown]
# `Binder Error: Referenced column "Manhattan" not found in FROM clause!`
# — podwójne cudzysłowy znaczą w SQL NAZWĘ KOLUMNY, więc silnik posłusznie
# poszukał kolumny „Manhattan" i jej nie znalazł. To najczęstsza pomyłka
# przybysza z Pythona. Popraw na apostrofy:

# %%
duckdb.sql("""
    SELECT strefa_id, nazwa
    FROM strefy
    WHERE nazwa = 'Manhattan'     -- dane w APOSTROFACH
""")

# %% [markdown]
# ## Wzorzec top-N: porządek + ucięcie
#
# „Trzy najdroższe przejazdy" to `ORDER BY kwota DESC` plus `LIMIT 3` —
# najpierw ustaw porządek, dopiero potem tnij. Sam `LIMIT` bez `ORDER BY`
# odda pierwsze wiersze z brzegu, a nie najdroższe.
#
# Uruchom komórkę, a potem przerób ją na „dwa NAJTAŃSZE przejazdy":
# porządek rosnący jest domyślny, więc wystarczy usunąć `DESC` i zmienić
# liczbę przy `LIMIT`.

# %%
duckdb.sql("""
    SELECT id, kwota
    FROM przejazdy
    ORDER BY kwota DESC
    LIMIT 3
""")

# %% [markdown]
# ## Gdy wynik jest pusty
#
# Pusty wynik przy poprawnej składni znaczy, że warunek nie trafia
# w dane — nie że zapytanie jest złe. Zanim zaczniesz zgadywać, zobacz,
# co naprawdę siedzi w kolumnie: `SELECT DISTINCT` to SQL-owy odpowiednik
# `unique()` z M-PD.

# %%
duckdb.sql("SELECT DISTINCT strefa_id FROM przejazdy")

# %% [markdown]
# Kolejność klauzul jest sztywna: `SELECT → FROM → WHERE → ORDER BY →
# LIMIT`. Warunki łączysz spójnikami `AND` i `OR` (np. `WHERE minuty > 10
# AND strefa_id = 10`) — a przy mieszaniu obu stawiaj nawiasy wokół części
# `OR`, inaczej silnik zwiąże warunki inaczej, niż czytasz je po polsku.
