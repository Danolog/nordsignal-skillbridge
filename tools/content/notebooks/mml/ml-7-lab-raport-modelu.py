# %% [markdown]
# # ML.7 — LAB „Raport modelu" (samodzielny finał M-ML)
#
# **SkillBridge · ścieżka Data Science · moduł M-ML „Pierwszy model predykcyjny"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Tu nie ma luk do uzupełnienia — **piszesz sam(a)**, tak jak napiszesz na
# capstonie. Pełny rzetelny cykl: podział, baseline, model, macierz i metryki.
# Wyniki zapisz pod nazwami **`acc_base`**, **`acc_model`**, **`macierz`**,
# **`prec`**, **`rec`** — nazwy są częścią specyfikacji, bo pieczątka musi
# wiedzieć, gdzie patrzeć.

# %%
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_score,
    recall_score,
)

# Komórka „Dane" — zbiór przewodni `napiwki` (24 przejazdy). Zafiksowany
# treścią; NIE zmieniaj — z niego liczona jest pieczątka.
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

# %% [markdown]
# ## Twój model — napisz cały przepływ
#
# 1. Cechy `X` (minuty, kwota, godzina) i cel `y` (napiwek).
# 2. Podział z ziarnem: `X_tr, X_te, y_tr, y_te` (konwencja z ML.2).
# 3. Baseline `most_frequent` → **`acc_base`**; model (drzewo z ziarnem) →
#    **`acc_model`**; porównaj f-stringiem.
# 4. Macierz pomyłek na teście → **`macierz`**; z niej precyzja i czułość
#    funkcjami sklearn → **`prec`**, **`rec`**.
# 5. W komórce tekstowej niżej: dobór metryki z uzasadnieniem + sekcja
#    Ograniczenia (3 zdania, wzorzec z ML.6) — tego pieczątka nie sprawdza,
#    oceni rubryka capstone'u.

# %%
# Twój przepływ — cały raport modelu (napisz od podziału po metryki):
# ...

# %% [markdown]
# **Komórka tekstowa** (poza pieczątką — ćwiczysz formę na capstone):
# (a) które pole macierzy boli najbardziej i czemu; (b) dobór metryki dla
# problemu „przewidujemy napiwek" z uzasadnieniem jednym zdaniem; (c) sekcja
# Ograniczenia — 3 zdania.
#
# *Tu wpisz swoje zdania.*

# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka".
#
# Pieczątka bierze Twój podział, Twój model i Twoje metryki i sprawdza:
# czy zestaw testowy to zafiksowany podział, jaki wektor przewidział model,
# czy model nie strzela jedną klasą oraz czy któraś cecha nie „zna
# odpowiedzi" (przeciek celu). Łapie tym cztery klasyczne błędne drogi, które
# gołej trafności nie ruszają. Czego NIE sprawdza: samodzielności kodu ani
# zdań w komórce tekstowej — lab bramkuje postęp, nie wystawia kredencjału.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    wymagane = (
        "df", "X_tr", "X_te", "y_tr", "y_te", "model",
        "acc_base", "acc_model", "macierz", "prec", "rec",
    )
    brak = [n for n in wymagane if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widze w tej sesji: " + ", ".join(brak) + ". "
            "Napisz pelny przeplyw (podzial -> baseline -> model -> macierz -> metryki) "
            "w komorce 'Twoj model' i uruchom komorki od gory."
        )
    df = g["df"]
    if len(df) != 24 or int(df["napiwek"].sum()) != 17:
        raise RuntimeError(
            "Zbior `napiwki` jest zmieniony (ma byc 24 przejazdy, 17 z napiwkiem) — "
            "przywroc komorke 'Dane', bo z niej policzone sa checki."
        )
    X_tr, X_te, y_tr, model = g["X_tr"], g["X_te"], g["y_tr"], g["model"]

    # D2 — pochodzenie podzialu.
    test_ids = sorted(int(i) for i in X_te.index)
    ref_test_ids = [0, 8, 9, 11, 16, 18]
    if test_ids != ref_test_ids:
        if len(test_ids) != 6:
            raise RuntimeError(
                "Oceniasz model na " + str(len(test_ids)) + " przejazdach zamiast na 6 "
                "testowych — to ocena na treningu (grzech nr 1 z ML.6), a trafnosc 1.0 to "
                "iluzja sprawdzianu ze znanymi odpowiedziami. Policz metryke na `X_te`/`y_te`, "
                "nie na `X_tr` (najczestsza literowka `X_tr` zamiast `X_te`)."
            )
        raise RuntimeError(
            "Twoj zestaw testowy to przejazdy " + str(test_ids) + ", a zafiksowany podzial "
            "`random_state=42` daje [0, 8, 9, 11, 16, 18]. Zmieniles(-as) ziarno w "
            "`train_test_split` — inny podzial to inny sprawdzian (ML.2). Wroc do "
            "`random_state=42` w linii podzialu."
        )

    # D4 — rozklad predykcji (degeneracja do jednej klasy).
    pred = [int(p) for p in model.predict(X_te)]
    predykcja_stala = len(set(pred)) == 1
    if predykcja_stala:
        raise RuntimeError(
            "Twoj model przewiduje napiwek dla KAZDEGO z 6 przejazdow testowych — to strzelec "
            "«zawsze najczestsza klasa» / «wszystko pozytywne», nie nauczony model (ML.3). "
            "Czulosc 1.0 dostaje za darmo, ale tani przejazd id=11 (11 zl) powinien dostac "
            "«bez napiwku». Wytrenuj `DecisionTreeClassifier`, nie `DummyClassifier`, i zestaw "
            "wynik z baseline'em."
        )

    # D3 — anty-przeciek celu: najsilniejsza |korelacja| cechy z celem na treningu.
    max_corr = max(abs(float(X_tr[kol].corr(y_tr))) for kol in X_tr.columns)
    if max_corr >= 0.98:
        raise RuntimeError(
            "Wsrod cech masz kolumne, ktora jest funkcja celu «napiwek» (korelacja z celem "
            "≈ 1.0) — to przeciek etykiety (ML.6 grzech 3). Model «zna odpowiedz», wiec trafia "
            "nawet graniczny przejazd id=18 (19 zl), ktory uczciwy model myli. Zostaw w X "
            "wylacznie minuty/kwota/godzina; usun kolumne niosaca wynik."
        )

    # D1 — wektor predykcji z tozsamoscia probki.
    y_pred_test = sorted([int(i), int(p)] for i, p in zip(X_te.index, pred))
    ref_vec = [[0, 1], [8, 1], [9, 1], [11, 0], [16, 1], [18, 1]]
    if y_pred_test != ref_vec:
        raise RuntimeError(
            "Wektor predykcji Twojego modelu odbiega od wzorca uczciwego modelu (ml-7 D1) — "
            "model powinien mylic wylacznie graniczny przejazd id=18. Sprawdz kolumny cech, "
            "model i podzial."
        )

    macierz = []
    for wiersz in g["macierz"]:
        if hasattr(wiersz, "__iter__"):
            macierz.extend(int(x) for x in wiersz)
        else:
            macierz.append(int(wiersz))

    return {
        "acc_base": float(g["acc_base"]),
        "acc_model": float(g["acc_model"]),
        "test_ids": test_ids,
        "y_pred_test": y_pred_test,
        "predykcja_stala": predykcja_stala,
        "max_corr_cecha_cel": max_corr,
        "macierz": macierz,
        "prec": float(g["prec"]),
        "rec": float(g["rec"]),
    }
