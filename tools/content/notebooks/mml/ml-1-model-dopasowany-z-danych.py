# %% [markdown]
# # ML.1 — Model: funkcja, której nie piszesz — dopasowujesz ją z danych
#
# **SkillBridge · ścieżka Data Science · moduł M-ML „Pierwszy model predykcyjny”**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…”.
#
# Ten notebook towarzyszy atomowi ML.1: uruchamiasz tu przykład z teorii —
# trening (`fit`) i przewidywanie (`predict`) — i sprawdzasz w brudnopisie
# wartości z pytań. **Ten notebook nie ma pieczątki** — atom zaliczasz,
# odpowiadając na pytania w SkillBridge.

# %%
import pandas as pd

# Komórka „Dane” — zbiór przewodni `napiwki` (24 przejazdy, cel: czy pasażer
# zostawił napiwek). Zafiksowany treścią — NIE zmieniaj; od niego zależą
# podział i wszystkie liczby w tym notebooku.
dane = [
    {"minuty": 12, "kwota": 23.5, "godzina": 8,  "napiwek": 1},
    {"minuty": 35, "kwota": 61.0, "godzina": 8,  "napiwek": 1},
    {"minuty": 7,  "kwota": 14.0, "godzina": 9,  "napiwek": 0},
    {"minuty": 22, "kwota": 41.5, "godzina": 17, "napiwek": 1},
    {"minuty": 15, "kwota": 28.0, "godzina": 17, "napiwek": 1},
    {"minuty": 5,  "kwota": 9.5,  "godzina": 23, "napiwek": 0},
    {"minuty": 40, "kwota": 72.0, "godzina": 18, "napiwek": 1},
    {"minuty": 9,  "kwota": 16.5, "godzina": 7,  "napiwek": 0},
    {"minuty": 28, "kwota": 50.0, "godzina": 16, "napiwek": 1},
    {"minuty": 18, "kwota": 33.0, "godzina": 12, "napiwek": 1},
    {"minuty": 11, "kwota": 21.0, "godzina": 10, "napiwek": 1},
    {"minuty": 6,  "kwota": 11.0, "godzina": 2,  "napiwek": 0},
    {"minuty": 25, "kwota": 45.5, "godzina": 15, "napiwek": 1},
    {"minuty": 31, "kwota": 57.0, "godzina": 19, "napiwek": 1},
    {"minuty": 8,  "kwota": 15.0, "godzina": 3,  "napiwek": 0},
    {"minuty": 20, "kwota": 37.0, "godzina": 14, "napiwek": 1},
    {"minuty": 14, "kwota": 26.0, "godzina": 11, "napiwek": 1},
    {"minuty": 45, "kwota": 80.5, "godzina": 18, "napiwek": 1},
    {"minuty": 10, "kwota": 19.0, "godzina": 22, "napiwek": 0},
    {"minuty": 16, "kwota": 30.0, "godzina": 13, "napiwek": 1},
    {"minuty": 27, "kwota": 48.0, "godzina": 16, "napiwek": 1},
    {"minuty": 13, "kwota": 24.5, "godzina": 9,  "napiwek": 1},
    {"minuty": 4,  "kwota": 8.0,  "godzina": 1,  "napiwek": 0},
    {"minuty": 33, "kwota": 60.0, "godzina": 17, "napiwek": 1},
]
df = pd.DataFrame(dane)
df

# %%
from sklearn.tree import DecisionTreeClassifier

X = df[["minuty", "kwota", "godzina"]]   # cechy: tabela (PD.3 — podwójne nawiasy!)
y = df["napiwek"]                        # cel: seria

model = DecisionTreeClassifier(random_state=42)   # drzewo decyzyjne + ziarno
model.fit(X, y)                                   # TRENING: dopasuj się do przykładów
model.predict(pd.DataFrame([{"minuty": 10, "kwota": 18.0, "godzina": 23}]))

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co zwróci ostatnia linia — tekst, liczbę czy
# tabelę? (Z teorii: przewidzianą KLASĘ dla nowego przejazdu — u nas `0`,
# „bez napiwku” dla krótkiego nocnego kursu. Ostatnia linia komórki wyświetli
# `array([0])` — tablicę z jedną przewidzianą etykietą, tu `0`.)
#
# ## Brudnopis
#
# Komórka poniżej jest Twoja. Dwa ćwiczenia z pytań atomu:
# 1. Przewidź napiwek dla WŁASNEGO przejazdu — zmień trzy liczby w `predict`
#    (minuty, kwota, godzina) i uruchom. Wynik `0` albo `1` — oba są poprawne
#    składniowo; czy im WIERZYĆ, rozstrzygną następne atomy (ML.2).
# 2. Zobacz, co robi model PRZED treningiem: stwórz świeży
#    `DecisionTreeClassifier(random_state=42)` i wywołaj na nim `predict` BEZ
#    `fit`. Zatrzyma się na `NotFittedError` — przeczytaj komunikat metodą
#    z L0.3 (kolejność fit→predict jest bezwzględna).

# %%
# Brudnopis — Twój przejazd (zmień trzy liczby) i rytuał NotFittedError:
# model.predict(pd.DataFrame([{"minuty": 30, "kwota": 55.0, "godzina": 14}]))
#
# swiezy = DecisionTreeClassifier(random_state=42)
# swiezy.predict(pd.DataFrame([{"minuty": 10, "kwota": 18.0, "godzina": 23}]))  # NotFittedError
