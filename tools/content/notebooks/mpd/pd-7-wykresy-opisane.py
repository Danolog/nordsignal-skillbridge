# %% [markdown]
# # PD.7 — Wykres, który wspiera wniosek
#
# **SkillBridge · ścieżka Data Science · moduł M-PD „Pandas: dane w tabelach"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi PD.7. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
import pandas as pd

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

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co będzie na osi poziomej, co na
# pionowej i skąd wykres weźmie legendę?

# %%
maz = df[df["wojewodztwo"] == "mazowieckie"]     # sito z PD.3
maz.plot(x="rok", y="wartosc", kind="line",
         title="Wskaźnik w woj. mazowieckim",
         xlabel="Rok", ylabel="Wartość wskaźnika (2015 = 100)")

# %% [markdown]
# Poziomo lata (`x="rok"`), pionowo wartości (`y="wartosc"`), legenda
# powstaje sama z nazwy kolumny `y`. `kind="line"` = TREND (coś zmienia
# się w czasie). W `ylabel` podawaj JEDNOSTKĘ — czytelnik musi wiedzieć,
# czy patrzy na procenty, złotówki czy indeks. Wykres ZOSTAJE w zapisanym
# notebooku — kto otworzy Twój plik, zobaczy go bez uruchamiania.
#
# ## Drugi rodzaj: histogram — ROZKŁAD jednej kolumny liczb

# %%
df["wartosc"].plot(kind="hist", title="Rozkład wartości")

# %% [markdown]
# Reguła doboru: „jak zmienia się w czasie?" → linia; „jakie wartości
# i jak często?" → histogram. Zauważ różnicę surowca: histogram rysujesz
# na SERII (jednej kolumnie), linię — na tabeli ze wskazanym `x` i `y`.
#
# ## Zadanie — narysuj OBA wykresy z kompletem opisów
#
# 1. Trend dla JEDNEGO województwa innego niż w przykładzie (najpierw
#    sito, potem linia) — `title`, `xlabel`, `ylabel` z jednostką.
# 2. Rozkład wszystkich wartości (histogram) — też z kompletem opisów.
#
# Test dobrego tytułu: czy mógłby być zdaniem WNIOSKU („Wskaźnik rośnie
# nieprzerwanie od 2020"), a nie etykietą („Wykres 1")? Trzymaj jedno
# wywołanie `.plot(...)` na komórkę, najlepiej jako ostatnią linię.

# %%
# Wykres 1 — trend dla jednego województwa (sito + kind="line"):


# %%
# Wykres 2 — rozkład wszystkich wartości (kind="hist"):
