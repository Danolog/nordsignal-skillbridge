# %% [markdown]
# # ML.5 — Metryki i macierz pomyłek: gdzie i jak model się myli
#
# **SkillBridge · ścieżka Data Science · moduł M-ML „Pierwszy model predykcyjny”**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…”.
#
# Ten notebook towarzyszy atomowi ML.5: czytasz macierz pomyłek i liczysz z niej
# precision/recall RĘCZNIE, zanim sprawdzisz funkcjami. **Ten notebook nie ma
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
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import confusion_matrix

X = df[["minuty", "kwota", "godzina"]]
y = df["napiwek"]
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=42)
model = DecisionTreeClassifier(random_state=42).fit(X_tr, y_tr)

print(confusion_matrix(y_te, model.predict(X_te)))
# [[1 1]
#  [0 4]]

# %% [markdown]
# **Przewidź, zanim uruchomisz:** to macierz pomyłek dla naszego testu
# (6 przejazdów). Wiersze = prawda (0, potem 1), kolumny = przewidywanie
# (0, potem 1). Czytamy: lewy-górny **1** — „bez napiwku” trafione; prawy-górny
# **1** — fałszywy alarm (FP); lewy-dolny **0** — przegapienia (FN), zero; dolny
# prawy **4** — napiwki trafione (TP=4). Stąd metryki dla klasy „1” (napiwek):
# **precision 0.8** (4/(4+1) — fałszywy alarm kosztuje), **recall 1.0** (4/(4+0)
# — żaden napiwek nie uciekł), **F1 0.889** (kompromis obu).
#
# ## Uzupełnij luki w środku
#
# Policz precision i recall z macierzy RĘCZNIE. Najpierw odczytaj z macierzy
# wyżej trzy pola: TP (prawy-dolny, trafione napiwki) = 4, FP (prawy-górny,
# fałszywe alarmy) = 1, FN (lewy-dolny, przegapienia) = 0. W komórce poniżej są
# dwie luki `_luka_`: wstaw właściwy skrót do mianownika. Precision psują
# fałszywe ALARMY (ogłosiłem — nie było), recall psują PRZEGAPIENIA (było — nie
# ogłosiłem). Uruchomienie bez uzupełnienia da `NameError: name '_luka_' is not
# defined`.

# %%
# Metryki dla klasy „1” (napiwek), z pól macierzy: TP=4, FP=1, FN=0.
TP, FP, FN = 4, 1, 0
precision = TP / (TP + _luka_)     # luka A: co psuje precision?
recall    = TP / (TP + _luka_)     # luka B: co psuje recall?
print(f"precision = {precision} | recall = {recall}")

# %% [markdown]
# ## Brudnopis — sprawdź ręczny rachunek funkcjami
#
# Ręczny rachunek ma się zgodzić z funkcjami sklearn co do joty (hint 2 atomu).
# Odkomentuj linie poniżej i porównaj.

# %%
# Brudnopis — sprawdź metryki funkcjami (mają dać 0.8, 1.0, 0.889):
# from sklearn.metrics import precision_score, recall_score, f1_score
# print(precision_score(y_te, model.predict(X_te)))   # 0.8
# print(recall_score(y_te, model.predict(X_te)))      # 1.0
# print(round(f1_score(y_te, model.predict(X_te)), 3))  # 0.889
