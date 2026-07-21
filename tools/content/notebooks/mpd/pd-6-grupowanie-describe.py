# %% [markdown]
# # PD.6 — Grupowanie: podziel, policz w każdej grupie, sklej
#
# **SkillBridge · ścieżka Data Science · moduł M-PD „Pandas: dane w tabelach"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi PD.6. **Bez pieczątki** — atom zaliczasz
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
# **Przewidź, zanim uruchomisz:** co wyjdzie dla tej tabeli
# (transport 4.40; jedzenie 24.50 i 12.00; rozrywka 35.00)?
# Czytaj od lewej, człon po członie: „weź tabelę → pogrupuj po kategorii
# → z każdej grupy weź kolumnę kwota → policz sumę".

# %%
df.groupby("kategoria")["kwota"].sum()

# %% [markdown]
# Po jednej linii na grupę — odpowiedź na pytania typu „która
# kategoria…", „które województwo…". Zamiast `.sum()` wstaw `.mean()`,
# `.max()`, `.min()`, `.count()` — agregaty z F3.6, tylko per grupa.
#
# ## `describe()` — streszczenie kolumny jednym wywołaniem

# %%
df["kwota"].describe()

# %% [markdown]
# Czytaj `count` uważnie: to liczba wartości NIEPUSTYCH — gdy jest
# mniejsza niż `len(df)`, właśnie znalazłeś(-aś) braki (PD.5) bez żadnej
# dodatkowej komendy. Kwantyle `25%` / `50%` (mediana) / `75%` to radar
# na wartości odstające: gdy `max` jest DALEKO ponad `75%`, masz
# KANDYDATA na odstającą obserwację — kandydata, nie wyrok: sprawdź go
# i zdecyduj z uzasadnieniem.
#
# ## Backward completion — wynik gotowy, dopisz wywołanie
#
# Od tej komórki pracujemy na NOWEJ tabeli: nazwa `df` wskazuje teraz
# dane à la BDL z PD.4 (liczy się OSTATNIE przypisanie — pamięć sesji,
# L0.3).

# %%
dane = [
    {"rok": 2019, "wojewodztwo": "mazowieckie", "wartosc": 102.5},
    {"rok": 2020, "wojewodztwo": "mazowieckie", "wartosc": 98.7},
    {"rok": 2021, "wojewodztwo": "mazowieckie", "wartosc": 105.1},
    {"rok": 2019, "wojewodztwo": "opolskie",    "wartosc": 91.2},
    {"rok": 2020, "wojewodztwo": "opolskie",    "wartosc": 89.4},
    {"rok": 2021, "wojewodztwo": "opolskie",    "wartosc": 93.8},
    {"rok": 2019, "wojewodztwo": "pomorskie",   "wartosc": 99.9},
    {"rok": 2020, "wojewodztwo": "pomorskie",   "wartosc": 97.3},
]
df = pd.DataFrame(dane)

# %%
# dopisz JEDNO zdanie kodu, które daje poniższy wynik
# (wartości zaokrąglone tu do 2 miejsc dla czytelności —
#  surowy wynik pokaże więcej cyfr po kropce):
# wojewodztwo
# mazowieckie    102.10
# opolskie        91.47
# pomorskie       98.60
# Name: wartosc, dtype: float64

# %% [markdown]
# Wskazówki w samym wyniku: po czym pogrupowano? którą kolumnę policzono?
# jaka to statystyka — sumy byłyby większe od pojedynczych wartości…
# (Drabinka podpowiedzi przy atomie PD.6 w SkillBridge.)
