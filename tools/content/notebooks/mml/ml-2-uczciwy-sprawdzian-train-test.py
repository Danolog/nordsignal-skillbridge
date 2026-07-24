# %% [markdown]
# # ML.2 — Uczciwy sprawdzian: dane, których model nie widział
#
# **SkillBridge · ścieżka Data Science · moduł M-ML „Pierwszy model predykcyjny”**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…”.
#
# Ten notebook towarzyszy atomowi ML.2: dzielisz dane na trening i test
# i oglądasz podręcznikowy objaw overfittingu (przeuczenia). **Ten notebook nie
# ma pieczątki** — atom zaliczasz, odpowiadając na pytania w SkillBridge.

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
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

X = df[["minuty", "kwota", "godzina"]]   # cechy (ML.1)
y = df["napiwek"]                        # cel (ML.1)

X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.25, random_state=42   # 25% na test, ziarno = powtarzalność
)
model = DecisionTreeClassifier(random_state=42)
model.fit(X_tr, y_tr)                        # trening WYŁĄCZNIE na części treningowej

print(accuracy_score(y_tr, model.predict(X_tr)))   # trafność na treningu
print(accuracy_score(y_te, model.predict(X_te)))   # trafność na TEŚCIE

# %% [markdown]
# **Przewidź, zanim uruchomisz:** 24 przejazdy, `test_size=0.25` — ile trafi do
# treningu, ile do testu? I która z dwóch trafności będzie wyższa? (Z teorii:
# 18 do treningu, 6 do testu; **1.0 na treningu, 0.833 na teście** — objaw
# overfittingu: świetnie na treningu, słabiej na nowych danych. Miara prawdy jest
# jedna — test.) Uwaga: druga linia wypisze pełny ułamek `0.8333333333333334` —
# to jest właśnie 0.833 po zaokrągleniu, sklearn nie zaokrągla za Ciebie.
#
# ## Brudnopis — powtarzalność w praktyce
#
# W komórce poniżej zmień `random_state` w `train_test_split` na inną liczbę
# (np. 7) i uruchom ponownie — trafność testowa DRGNIE (inny podział = inny
# sprawdzian; test ma 6 przykładów, więc jedna pomyłka waży 0.167). Potem wróć do
# 42 i sprawdź, że wynik wrócił. Ziarno MODELU zostaw 42 — zmieniasz tylko ziarno
# PODZIAŁU. Uwaga na pułapkę: przy niektórych ziarnach (np. 7) trafność testowa
# wyjdzie 1.0 — to NIE znaczy „lepszy model”, tylko łatwiejszy, wylosowany test.
# Właśnie dlatego ziarno ustawia się RAZ i nie poluje na to szczęśliwsze.

# %%
# Brudnopis — zmień tylko ziarno podziału i porównaj trafność testową:
# X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=7)
# model = DecisionTreeClassifier(random_state=42).fit(X_tr, y_tr)
# print(accuracy_score(y_te, model.predict(X_te)))   # inne ziarno → inny wynik
