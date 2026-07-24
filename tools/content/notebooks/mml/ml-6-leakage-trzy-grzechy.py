# %% [markdown]
# # ML.6 — Leakage: trzy grzechy nieuczciwej ewaluacji (i sekcja Ograniczenia)
#
# **SkillBridge · ścieżka Data Science · moduł M-ML „Pierwszy model predykcyjny”**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…”.
#
# Ten notebook towarzyszy atomowi ML.6: dostajesz gotowy raport z liczbami
# i dopisujesz do niego brakującą sekcję Ograniczenia. **Ten notebook nie ma
# pieczątki** — atom zaliczasz, odpowiadając na pytania w SkillBridge.

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

acc_base = accuracy_score(y_te, DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr).predict(X_te))
acc_model = accuracy_score(y_te, DecisionTreeClassifier(random_state=42).fit(X_tr, y_tr).predict(X_te))

print("=== RAPORT (z ML.4) ===")
print(f"Baseline (głupi strzał):   {round(acc_base, 3)}")
print(f"Model (drzewo decyzyjne):  {round(acc_model, 3)}")
print("Podział: 18 trening / 6 test | ziarno 42")
print("Ograniczenia: (do dopisania — patrz brudnopis)")

# %% [markdown]
# **Przewidź, zanim uruchomisz:** raport wyżej ma wszystko oprócz jednego
# obowiązkowego elementu — sekcji **Ograniczenia**. Trzy drogi wycieku danych
# (leakage — przeciek informacji, której model nie miałby w prawdziwym użyciu),
# których szuka rubryka:
# 1. ocena na danych treningowych (ML.2: 1.0 vs 0.833),
# 2. preprocessing dopasowany na CAŁOŚCI danych (reguła: najpierw split, potem
#    wszystko inne),
# 3. informacja z przyszłości (cecha, której NIE znasz w chwili predykcji).
#
# ## Twoje zadanie — dopisz sekcję Ograniczenia (backward completion)
#
# Raport ma gotowe LICZBY; brakuje analizy ich granic. Dopisz 3 zdania
# (DANE / METODA / WNIOSKI), każde wg wzorca „słabość + konsekwencja”. To rodzona
# siostra hipotez z EDA.3: zastrzeżenie to dowód warsztatu, nie asekuracja. W
# raporcie „dowodzi” zamieniaj na „sugeruje”, a „zawsze” na „na tych danych”.

# %%
# Brudnopis — dopisz sekcję Ograniczenia do raportu wyżej (3 zdania,
# wzorzec „słabość + konsekwencja”):
#   Dane: ile rekordów? jak liczna jest klasa „bez napiwku” i co to znaczy dla
#     stabilności jej metryk?
#   Metoda: jeden podział czy wiele? prosty model? ile przykładów w teście i ile
#     waży jedna pomyłka (przy 6 przykładach — 0.167)?
#   Wnioski: co wynik 0.833 pokazuje na TYCH danych — a czego NIE dowodzi?
# Wzór dla pierwszego zdania (poziom szkieletu — DANE), dwa kolejne dopisz sam(a):
#   Dane: zbiór ma tylko 24 przejazdy, a klasa „bez napiwku” 7 przypadków, więc
#     metryki liczone dla niej są niestabilne.
# Wpisz swoje trzy zdania pełnymi zdaniami pod spodem.
