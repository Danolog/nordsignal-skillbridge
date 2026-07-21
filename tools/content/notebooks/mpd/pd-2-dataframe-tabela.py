# %% [markdown]
# # PD.2 — DataFrame: Twoja tabela w opakowaniu narzędzia
#
# **SkillBridge · ścieżka Data Science · moduł M-PD „Pandas: dane w tabelach"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi PD.2. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.
#
# **Przewidź, zanim uruchomisz:** co stanie się kolumnami tej tabeli,
# a co wierszami?

# %%
import pandas as pd

wydatki = [
    {"nazwa": "bilet", "kategoria": "transport", "kwota": 4.40},
    {"nazwa": "obiad", "kategoria": "jedzenie",  "kwota": 24.50},
    {"nazwa": "kawa",  "kategoria": "jedzenie",  "kwota": 12.00},
    {"nazwa": "kino",  "kategoria": "rozrywka",  "kwota": 35.00},
]
df = pd.DataFrame(wydatki)   # lista słowników → tabela
df.head()                    # pokaż pierwsze wiersze

# %% [markdown]
# Klucze słowników (`nazwa`, `kategoria`, `kwota`) → **kolumny**; każdy
# rekord → **wiersz**. Kolumna bez nagłówka z lewej to **indeks** wierszy
# (numeracja od zera, jak w listach) — jest przypięty do wiersza na
# stałe: po odfiltrowaniu części wierszy numeracja będzie miała dziury
# i to jest normalne.
#
# ## Rytuał obejrzenia — zanim cokolwiek policzysz

# %%
print(len(df))    # liczba WIERSZY (stary znajomy len działa i tu)
df.info()         # podsumowanie: ile wierszy, jakie kolumny, ile niepustych, typy

# %%
df.dtypes         # same typy kolumn: int64/float64 = liczby; object/str czytaj: „tekst"

# %% [markdown]
# ## Kolumna jak klucz słownika: seria

# %%
kwoty = df["kwota"]      # seria: wszystkie wartości tej kolumny, z indeksami
print(kwoty)
print(kwoty.sum())       # suma kolumny bez żadnej pętli (akumulator z F2.5 w jednym słowie)
print(df.columns)        # lista nazw kolumn — zanim zaczniesz zgadywać klucze

# %% [markdown]
# Klucz kolumny musi się zgadzać co do znaku — `df["Kwota"]` to
# `KeyError`, ta sama zasada co w słownikach (F3.3). A gdy pandas kiedyś
# zrobi coś zaskakującego, wróć do myślenia rekordami z F3.5 — pod
# spodem to zawsze ta sama tabela: lista słowników.
