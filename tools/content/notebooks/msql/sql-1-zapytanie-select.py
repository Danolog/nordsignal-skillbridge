# %% [markdown]
# # SQL.1 — Zapytanie: powiedz tabeli, czego chcesz
#
# **SkillBridge · ścieżka Data Science · moduł M-SQL „SQL: analiza danych w bazie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi SQL.1. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

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
# Dwa DataFrame'y w sesji — nic więcej. DuckDB w Colab jest
# preinstalowany i widzi je PO NAZWIE: `przejazdy` i `strefy` są od tej
# chwili tabelami dla silnika SQL.
#
# **Przewidź, zanim uruchomisz:** `przejazdy` ma 5 wierszy i 5 kolumn.
# Ile wierszy i ile kolumn zwróci zapytanie poniżej?

# %%
duckdb.sql("""
    SELECT id, kwota             -- które kolumny chcę
    FROM przejazdy               -- z której tabeli
    LIMIT 3                      -- ile wierszy na początek
""")

# %% [markdown]
# Trzy wiersze, dwie kolumny: `LIMIT` ucina WIERSZE, `SELECT` wybiera
# KOLUMNY. Tekst w potrójnych cudzysłowach to mowa do silnika SQL, nie
# do Pythona — dlatego rządzą w nim klauzule i komentarze po `--`.
#
# Zwróć uwagę na zapis: słowa kluczowe wielkimi, każda klauzula od nowej
# linii. To konwencja czytelności, za którą rubryka capstone'u płaci 30%
# punktów — trenuj ją od pierwszego zapytania.
#
# ## `.df()` — z powrotem do pandas
#
# Wynik `duckdb.sql(...)` to obiekt silnika. Metoda `.df()` zamienia go
# w zwykły DataFrame — tę samą tabelę, którą znasz z filtrów PD.3
# i wykresów PD.7. Dwa języki, jedna analiza.

# %%
podglad = duckdb.sql("SELECT id, kwota FROM przejazdy LIMIT 3").df()
print(type(podglad))     # DataFrame — od tej linii pracuje pandas
podglad                  # ta sama tabela w reprezentacji pandas

# %% [markdown]
# ## Twoja kolej: zmień zamówienie
#
# W komórce poniżej zmień listę kolumn na `id, minuty`, a `LIMIT` na 2 —
# i uruchom. Porównaj wynik z własnym przewidywaniem.
#
# Uwaga: kolumny `nazwa` w `przejazdy` NIE MA (są tam tylko `id`,
# `strefa_id`, `minuty`, `kwota`, `godzina`) — nazwy stref mieszkają
# w drugiej tabeli i dołączysz je JOIN-em dopiero w SQL.5.

# %%
duckdb.sql("""
    SELECT id, kwota
    FROM przejazdy
    LIMIT 3
""")

# %% [markdown]
# ## Rytuał czytania błędu
#
# Komórka poniżej CELOWO się wywali: w nazwie tabeli siedzi literówka
# (`przejazdyy`). Uruchom ją i przeczytaj komunikat — ten błąd zobaczysz
# za każdym razem, gdy silnik nie znajdzie tabeli o podanej nazwie.

# %%
duckdb.sql("SELECT * FROM przejazdyy LIMIT 3")   # celowa literówka: nazwa tabeli

# %% [markdown]
# `Catalog Error: Table with name przejazdyy does not exist!` — katalog
# to spis tabel, które silnik zna. Dwie przyczyny, obie do sprawdzenia
# w tej kolejności: literówka w nazwie ALBO DataFrame nie istnieje
# w sesji (komórka z danymi się nie wykonała — L0.3: uruchom komórki od
# góry). Jedna poprawka do rytuału z L0.3 („czytaj koniec zgłoszenia"):
# DuckDB dokleja NA SAMYM DOLE podpowiedź „Did you mean…", która bywa
# absurdalna — prawdę mówi linia z nazwą błędu tuż nad nią.
#
# Drugi błąd-strażnik: literówka nie w nazwie, lecz w SŁOWIE KLUCZOWYM.

# %%
duckdb.sql("SELCT id FROM przejazdy")   # celowa literówka: słowo kluczowe

# %% [markdown]
# `Parser Error: syntax error at or near "SELCT"` — parser wskazuje
# miejsce, w którym przestał rozumieć zapytanie, i podkreśla je
# strzałką. Zapamiętaj podział ról: **Catalog Error** = nie znam takiej
# TABELI; **Parser Error** = nie rozumiem takiej SKŁADNI.
