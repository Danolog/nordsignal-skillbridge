# %% [markdown]
# # ML.4 — LAB „Napiwki: pełna ścieżka"
#
# **SkillBridge · ścieżka Data Science · moduł M-ML „Pierwszy model predykcyjny"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Złóż rytuał rzetelnego modelowania w jeden przepływ: **podział → baseline →
# model → uczciwe porównanie**. Uzupełnij sześć luk w komórce „Twój przepływ".
# Nazwy zmiennych (`acc_base`, `acc_model`) są częścią specyfikacji — pieczątka
# musi wiedzieć, gdzie patrzeć (lekcja PD.8).

# %%
import pandas as pd

# Komórka „Dane" — zbiór przewodni `napiwki` (24 przejazdy, cel: czy pasażer
# zostawił napiwek). Zafiksowany treścią; NIE zmieniaj — z niego liczona jest
# pieczątka.
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
# ## Twój przepływ — uzupełnij sześć luk
#
# Kolejność żelazna z ML.2: model uczy się WYŁĄCZNIE na `_tr`, oceniany jest
# WYŁĄCZNIE na `_te`. Ziarno (`random_state`) wpisz zgodnie z notebookiem — bez
# niego podział losuje się za każdym razem inaczej (ML.2-P3).

# %%
from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

X = df[[______]]                          # luka 1: trzy kolumny cech
y = df[______]                            # luka 2: kolumna celu

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25,
                                          random_state=______)   # luka 3

baseline = DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr)
acc_base = accuracy_score(y_te, baseline.predict(X_te))

model = DecisionTreeClassifier(random_state=42).fit(______, ______)  # luki 4-5
acc_model = accuracy_score(y_te, model.predict(______))              # luka 6

print(f"Baseline: {round(acc_base, 3)} | Model: {round(acc_model, 3)}")

# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka".
#
# Pieczątka NIE ufa samej liczbie trafności: bierze Twój podział i Twój model
# i sprawdza, KTÓRE przejazdy trafiły do testu oraz co model dla nich
# przewidział. Dzięki temu łapie drogi, które dają „ładną" liczbę błędnie —
# inny podział niż zafiksowany albo model strzelający zawsze jedną klasą.
# Czego pieczątka NIE sprawdza: czy kod napisałeś(-aś) samodzielnie — lab
# bramkuje postęp, nie wystawia kredencjału.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    brak = [
        n
        for n in ("df", "X_tr", "X_te", "y_tr", "y_te", "model", "acc_base", "acc_model")
        if n not in g
    ]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            "Uzupełnij luki w komórce 'Twój przepływ' i uruchom komórki od góry."
        )
    df = g["df"]
    if len(df) != 24 or int(df["napiwek"].sum()) != 17:
        raise RuntimeError(
            "Zbiór `napiwki` jest zmieniony (ma być 24 przejazdy, 17 z napiwkiem) — "
            "przywroc komorke 'Dane', bo z niej policzone sa checki."
        )
    X_tr, X_te, model = g["X_tr"], g["X_te"], g["model"]

    # D2 — pochodzenie podzialu: zestaw testowy studenta.
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
            "`train_test_split` (luka 3) — inny podzial to inny sprawdzian (ML.2). Wroc do "
            "`random_state=42` w linii podzialu."
        )

    # D1 + D4 — wektor predykcji modelu studenta na jego tescie.
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
    y_pred_test = sorted([int(i), int(p)] for i, p in zip(X_te.index, pred))
    ref_vec = [[0, 1], [8, 1], [9, 1], [11, 0], [16, 1], [18, 1]]
    if y_pred_test != ref_vec:
        raise RuntimeError(
            "Wektor predykcji odbiega od wzorca tego labu. Wzorcowy model — "
            "`DecisionTreeClassifier(random_state=42)` z luki 4 — myli dokladnie jeden przejazd: "
            "graniczny id=18 (19 zl, tuz pod progiem napiwku). Twoj wektor jest inny, wiec cos w "
            "pipelinie sie rozjechalo: sprawdz, czy nie zmieniles(-as) modelu z luki 4, czy "
            "trenujesz na `X_tr`/`y_tr`, oceniasz na `X_te`, a podzial ma `random_state=42`."
        )

    return {
        "acc_base": float(g["acc_base"]),
        "acc_model": float(g["acc_model"]),
        "test_ids": test_ids,
        "y_pred_test": y_pred_test,
        "predykcja_stala": predykcja_stala,
    }
