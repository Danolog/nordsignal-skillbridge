# %% [markdown]
# # ML.3 — Baseline: najpierw głupi strzał, potem model
#
# **SkillBridge · ścieżka Data Science · moduł M-ML „Pierwszy model predykcyjny”**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…”.
#
# Ten notebook towarzyszy atomowi ML.3: liczysz baseline (punkt odniesienia —
# głupi strzał najczęstszą klasą) i porównujesz z nim model. **Ten notebook nie
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
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

X = df[["minuty", "kwota", "godzina"]]
y = df["napiwek"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=42)

baseline = DummyClassifier(strategy="most_frequent")   # strzelec: zawsze klasa większościowa
baseline.fit(X_tr, y_tr)                               # "trening": zapamiętaj, która częstsza
acc_baseline = accuracy_score(y_te, baseline.predict(X_te))
print(f"Baseline (głupi strzał): {round(acc_baseline, 3)}")

model = DecisionTreeClassifier(random_state=42).fit(X_tr, y_tr)
acc_model = accuracy_score(y_te, model.predict(X_te))
print(f"Model (drzewo decyzyjne): {round(acc_model, 3)}")

# %% [markdown]
# **Przewidź, zanim uruchomisz:** napiwek daje ~7 na 10 pasażerów. Jakiej
# trafności baseline'u spodziewasz się na teście? (Z teorii: **0.667** — cztery
# z sześciu przypadków testowych to napiwki, więc strzelec „zawsze będzie napiwek”
# trafia 4/6. Prawdziwy model bije głupi strzał o ~0.17 — i TO jest wynik do
# raportowania, nie goła trafność.)
#
# ## Uzupełnij lukę (completion)
#
# W komórce poniżej jest luka `_luka_`. Wstaw zmienną policzoną w linii wyżej,
# żeby f-string wypisał różnicę między modelem a baseline'em (F1.3: f-string
# wstawia WARTOŚĆ zmiennej). Uruchomienie bez uzupełnienia da `NameError: name
# '_luka_' is not defined` — czytasz go jak w L0.3. Poprawny wynik: `0.167`.

# %%
roznica = acc_model - acc_baseline
print(f"Model bije baseline o {round(_luka_, 3)}")   # luka: co wstawiasz?
