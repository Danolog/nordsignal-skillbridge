# %% [markdown]
# # PD.5 — Braki danych: policz, zrozum, dopiero potem decyduj
#
# **SkillBridge · ścieżka Data Science · moduł M-PD „Pandas: dane w tabelach"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi PD.5. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
import pandas as pd

dane = [
    {"rok": 2019, "wojewodztwo": "mazowieckie", "wartosc": 102.5},
    {"rok": 2020, "wojewodztwo": "mazowieckie", "wartosc": 98.7},
    {"rok": 2021, "wojewodztwo": "mazowieckie", "wartosc": 105.1},
    {"rok": 2019, "wojewodztwo": "opolskie",    "wartosc": 91.2},
    {"rok": 2020, "wojewodztwo": "opolskie",    "wartosc": None},
    {"rok": 2021, "wojewodztwo": "opolskie",    "wartosc": 93.8},
    {"rok": 2019, "wojewodztwo": "pomorskie",   "wartosc": 99.9},
    {"rok": 2020, "wojewodztwo": "pomorskie",   "wartosc": None},
]
df = pd.DataFrame(dane)
df.head(8)               # dwa braki pokazują się jako NaN — „brak wartości"

# %% [markdown]
# **Przewidź, zanim uruchomisz:** tabela ma 8 wierszy, w kolumnie
# `wartosc` dwa wiersze z `None`. Co pokaże `df.isna().sum()`?
#
# ## Krok pierwszy — ZAWSZE policz

# %%
df.isna()          # cała tabela True/False: gdzie jest brak?

# %%
df.isna().sum()    # ile braków W KAŻDEJ kolumnie (True liczy się jak 1)

# %% [markdown]
# Trzy linijki — po jednej na kolumnę: `rok 0`, `wojewodztwo 0`,
# `wartosc 2`. To Twoja mapa dziur. Krok drugi — ZROZUM, skąd dziury
# (strukturalne czy punktowe?). Od diagnozy zależy decyzja: `dropna()`
# przy nielicznych brakach punktowych; `fillna(wartość)` tylko, gdy brak
# ma naturalną wartość — dla wskaźników ciągłych wpisanie zera to
# FAŁSZOWANIE danych. Pamiętaj też: statystyki pandas domyślnie POMIJAJĄ
# braki — `mean()` policzy średnią z wartości, które SĄ, bez ostrzeżenia.
#
# ## Uzupełnij luki — pomiar kosztu decyzji
#
# Luka B: nazwa narzędzia usuwającego wiersze z brakami (uruchomienie bez
# podmiany da `AttributeError` — pandas nie zna metody `_luka_`);
# luka C: nazwa nowej tabeli z linii wyżej (goła `_luka_` da `NameError`).

# %%
print(len(df))            # ile wierszy przed czyszczeniem?
czysta = df._luka_()      # luka B: usuń wiersze z brakami
print(len(_luka_))        # luka C: ile wierszy zostało?

# %% [markdown]
# Krok trzeci — ZAPISZ decyzję: jedno zdanie w komórce tekstowej
# (dodaj ją tu: **+ Tekst**), np. „usuwam 2 z 8 wierszy (25% tabeli) —
# oba to pomiary roku 2020, tracę 2 z 3 pomiarów tego roku —
# akceptowalne, bo…". Rubryka ocenia uzasadnienie, nie samo wywołanie —
# i każda liczba w zdaniu ma pochodzić z komórki wyżej, nie z pamięci.
