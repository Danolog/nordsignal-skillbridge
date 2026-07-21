# %% [markdown]
# # PD.3 — Maska: warunek na całej kolumnie naraz
#
# **SkillBridge · ścieżka Data Science · moduł M-PD „Pandas: dane w tabelach"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi PD.3. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
import pandas as pd

wydatki = [
    {"nazwa": "bilet", "kategoria": "transport", "kwota": 4.40},
    {"nazwa": "obiad", "kategoria": "jedzenie",  "kwota": 24.50},
    {"nazwa": "kawa",  "kategoria": "jedzenie",  "kwota": 12.00},
    {"nazwa": "kino",  "kategoria": "rozrywka",  "kwota": 35.00},
]
df = pd.DataFrame(wydatki)

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co siedzi w `maska` dla kwot
# 4.40 / 24.50 / 12.00 / 35.00?

# %%
maska = df["kwota"] > 20     # porównaj KAŻDĄ kwotę z 20 — hurtem
print(maska)

# %% [markdown]
# Seria `False, True, False, True` — po jednej odpowiedzi na wiersz.
# To **maska logiczna**: te same `True`/`False` z F1.5, tylko hurtowo
# (bramka z F3.2 pytała w każdym obrocie pętli; pandas pyta wszystkie
# wiersze jednocześnie). Maskę wkładasz w nawiasy tabeli — zostają
# wiersze z `True`:

# %%
drogie = df[df["kwota"] > 20]     # tabela ograniczona do wierszy True
drogie                            # zwróć uwagę na DZIURY w indeksie — ślad filtra

# %% [markdown]
# Wynik to NOWA, mniejsza tabela — oryginalny `df` zostaje nietknięty.
# Jeśli wynik ma żyć dłużej niż jedno spojrzenie, przypisz go do nazwy —
# bez przypisania przepada.
#
# ## Dwa warunki naraz: dwa sita jedno po drugim

# %%
rozrywka = df[df["kategoria"] == "rozrywka"]        # sito 1 → nazwana tabela
rozrywka_drogie = rozrywka[rozrywka["kwota"] > 30]  # sito 2 — maska budowana Z rozrywka!
print(len(rozrywka), len(rozrywka_drogie))

# %% [markdown]
# Ważny szczegół: drugą maskę budujesz z tabeli POŚREDNIEJ
# (`rozrywka[...]`), nie z oryginalnego `df` — sito zawsze na tym, co
# przesiewasz.
#
# ## Druga oś selekcji: wybór kolumn

# %%
df[["nazwa", "kwota"]]            # LISTA nazw w nawiasach tabeli → tabela z 2 kolumnami

# %% [markdown]
# ## Uzupełnij lukę (completion)
#
# W miejsce `_luka_` wstaw: którą kolumną filtrujesz i jaką wartość
# tekstową porównujesz, żeby zostały wiersze kategorii „jedzenie".
# (Uruchomienie bez uzupełnienia da `NameError: name '_luka_' is not
# defined`.)

# %%
jedzenie = df[df[_luka_] == _luka_]   # luka: która kolumna, jaka wartość?
print(len(jedzenie))
