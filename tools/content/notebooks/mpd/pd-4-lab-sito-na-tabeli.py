# %% [markdown]
# # PD.4 — LAB „Sito na tabeli"
#
# **SkillBridge · ścieżka Data Science · moduł M-PD „Pandas: dane w tabelach"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Powtórzysz sito z F3.4 — ale na DataFrame i bez jednej pętli: maski
# i wybór kolumn na danych w kształcie, w jakim przyjdą z GUS BDL.
# Uzupełnij pięć luk (`_luka_`) i uruchamiaj komórki od góry. Ten lab
# zaliczasz pieczątką. (Uruchomienie bez uzupełnienia luk zatrzyma się
# na `NameError: name '_luka_' is not defined`.)

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
# ## Krok 1 — obejrzyj tabelę (rytuał PD.2)
#
# Luka 1: argument `head` — ile wierszy pokazać, żeby zobaczyć CAŁĄ tę
# małą tabelę?

# %%
df.head(_luka_)                 # luka 1: pokaż WSZYSTKIE wiersze tej małej tabeli

# %% [markdown]
# ## Kroki 2–3 — sito wierszy, potem sito wierszy + wybór kolumn
#
# Luka 2 — pełna maska (porównanie kolumny z liczbą); luki 3–5 —
# wartość tekstowa i dwie nazwy kolumn (wszystko co do znaku z danych).
# Po uruchomieniu zmień województwo w kroku 3 na „opolskie" — wynik ma
# się przeliczyć bez innych zmian.

# %%
# 2. Tylko rok 2020:
rok2020 = df[_luka_]            # luka 2: maska po kolumnie rok

# 3. Mazowieckie, tylko rok i wartość:
maz = df[df["wojewodztwo"] == _luka_][[_luka_, _luka_]]   # luki 3-5

print(len(rok2020), len(maz))

# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka". Pieczątka liczy WŁASNĄ maską na
# `df`, że `rok2020` to dokładnie wiersze roku 2020, a `maz` ma dokładnie
# 2 kolumny (`rok`, `wartosc`) i jego wartości pokrywają się z dokładnie
# JEDNYM województwem z `df` — po wyborze kolumn nazwy województwa w `maz`
# już nie ma, więc pieczątka porównuje wartości z pełną tabelą.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    brak = [n for n in ("pd", "df", "rok2020", "maz") if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            "Uzupełnij luki i uruchom komórki z krokami 1-3 (wyżej), od góry."
        )
    pd = g["pd"]
    df = g["df"]
    rok2020 = g["rok2020"]
    maz = g["maz"]
    if (
        not isinstance(df, pd.DataFrame)
        or list(df.columns) != ["rok", "wojewodztwo", "wartosc"]
        or len(df) != 8
    ):
        raise RuntimeError(
            '`df` nie wygląda jak tabela z komórki danych (8 wierszy, kolumny '
            "rok/wojewodztwo/wartosc) — przywróć komórkę z danymi i uruchom "
            "notebook od góry."
        )
    if not isinstance(rok2020, pd.DataFrame):
        raise RuntimeError(
            "`rok2020` powinno być TABELĄ (maska włożona w nawiasy df[...]), "
            "a jest typu " + type(rok2020).__name__ + " — samo porównanie "
            "df[\"rok\"] == 2020 to dopiero maska (PD.3)."
        )
    ref_rok2020 = df[df["rok"] == 2020]
    if len(rok2020) == 0:
        raise RuntimeError(
            "`rok2020` ma 0 wierszy — maska nic nie złapała. Porównuj kolumnę "
            "rok z LICZBĄ 2020 (bez cudzysłowów) i sprawdź nazwę kolumny."
        )
    if (
        "rok" not in rok2020.columns
        or not bool((rok2020["rok"] == 2020).all())
        or len(rok2020) != len(ref_rok2020)
    ):
        raise RuntimeError(
            "`rok2020` nie zgadza się z własną maską pieczątki "
            "(df[df[\"rok\"] == 2020]) — w kroku 2 filtruj CAŁĄ tabelę po "
            "kolumnie rok, bez wybierania kolumn."
        )
    if not isinstance(maz, pd.DataFrame):
        raise RuntimeError(
            "`maz` powinno być TABELĄ, a jest typu " + type(maz).__name__ + " "
            "— pojedyncze nawiasy z kluczem dają serię; wybór kolumn to LISTA "
            "nazw w podwójnych nawiasach (PD.3)."
        )
    if len(maz) == 0:
        raise RuntimeError(
            "`maz` ma 0 wierszy — wartość tekstowa w masce nie zgadza się co "
            'do znaku z danymi. Podejrzyj df["wojewodztwo"].unique() '
            "i porównaj znak po znaku (spacje! wielkość liter!)."
        )
    kolumny = list(maz.columns)
    if len(kolumny) != 2 or set(kolumny) != {"rok", "wartosc"}:
        raise RuntimeError(
            "`maz` powinno mieć DOKŁADNIE 2 kolumny: rok i wartosc (ma: "
            + ", ".join(str(k) for k in kolumny)
            + "). Krok 3 to dwa sita w jednej linii: maska wierszy, potem "
            "lista dwóch nazw kolumn w podwójnych nawiasach."
        )
    try:
        woj_maz = df.loc[maz.index, "wojewodztwo"]
        ref_maz = df.loc[maz.index, ["rok", "wartosc"]]
    except KeyError:
        raise RuntimeError(
            "wiersze `maz` nie pochodzą z `df` (indeksy się nie zgadzają) — "
            "zostaw tabelę prosto z sita, bez przestawiania indeksu "
            "i bez budowania jej ręcznie."
        ) from None
    if int(woj_maz.nunique()) != 1:
        raise RuntimeError(
            "`maz` miesza wiersze więcej niż jednego województwa — maska "
            "w kroku 3 ma porównywać kolumnę wojewodztwo z JEDNĄ nazwą."
        )
    rozjazd = False
    for a, b in zip(list(maz["rok"]), list(ref_maz["rok"])):
        if a != b:
            rozjazd = True
    for a, b in zip(list(maz["wartosc"]), list(ref_maz["wartosc"])):
        if abs(float(a) - float(b)) >= 0.01:
            rozjazd = True
    if rozjazd:
        raise RuntimeError(
            "wartości `maz` nie pokrywają się z pełną tabelą `df` — nie "
            "przepisuj danych ręcznie i nie przestawiaj indeksu (np. "
            "reset_index); zbuduj `maz` sitem z kroku 3 i uruchom komórkę "
            "ponownie."
        )
    return {
        "rok2020_wiersze": int(len(rok2020)),
        "rok2020_tylko_2020": True,
        "maz_kolumny": int(len(kolumny)),
        "maz_jedno_wojewodztwo": True,
        "maz_wiersze": int(len(maz)),
    }
