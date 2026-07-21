# %% [markdown]
# # PD.8 — LAB „Mini-EDA bez API" (samodzielny finał M-PD)
#
# **SkillBridge · ścieżka Data Science · moduł M-PD „Pandas: dane w tabelach"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Kompletna mini-eksploracja tabeli — capstone M-EDA w miniaturze, na
# danych wpisanych w kod (API dojdzie w M-EDA). Na danych z komórki
# „Dane" (**dokładnie 12 wierszy**: 3 województwa × 4 lata, **dokładnie
# 2 braki w `wartosc`** — kształt danych jest częścią kontraktu
# pieczątki):
#
# 1. **Rytuał PD.2:** obejrzyj tabelę (`head`, `len`, `info`).
# 2. **Braki (PD.5):** policz je, podejmij decyzję (drop / zostaw /
#    zawęź — przy zawężeniu np. do 3 ostatnich lat, nie węziej)
#    i UZASADNIJ jednym zdaniem w komórce tekstowej.
# 3. **Grupy (PD.6):** średnia `wartosc` per województwo; wskaż w komórce
#    tekstowej, które województwo najwyżej.
# 4. **Wykres (PD.7):** trend `wartosc` w czasie dla wybranego
#    województwa — komplet opisów.
# 5. **Wniosek:** 1–2 zdania w komórce tekstowej — co widać na wykresie
#    i jaka hipoteza z tego płynie (hipoteza = „do sprawdzenia", nie
#    „udowodnione").
#
# Dwie nazwy są CZĘŚCIĄ specyfikacji (pieczątka musi wiedzieć, gdzie
# patrzeć): tabelę po decyzji o brakach nazwij **`dane_analiza`**
# (również gdy zostawiasz braki: `dane_analiza = df`), wynik grupowania —
# **`srednie_woj`**. Reszta nazw dowolna. Ten lab zaliczasz pieczątką.

# %%
# Dane — NIE zmieniaj tej komórki; analizę rób na kopiach (dane_analiza).
import pandas as pd

dane = [
    {"rok": 2019, "wojewodztwo": "mazowieckie", "wartosc": 101.2},
    {"rok": 2020, "wojewodztwo": "mazowieckie", "wartosc": 103.5},
    {"rok": 2021, "wojewodztwo": "mazowieckie", "wartosc": 106.8},
    {"rok": 2022, "wojewodztwo": "mazowieckie", "wartosc": 110.4},
    {"rok": 2019, "wojewodztwo": "opolskie",    "wartosc": 92.1},
    {"rok": 2020, "wojewodztwo": "opolskie",    "wartosc": None},
    {"rok": 2021, "wojewodztwo": "opolskie",    "wartosc": 94.6},
    {"rok": 2022, "wojewodztwo": "opolskie",    "wartosc": 95.3},
    {"rok": 2019, "wojewodztwo": "pomorskie",   "wartosc": 98.4},
    {"rok": 2020, "wojewodztwo": "pomorskie",   "wartosc": 99.1},
    {"rok": 2021, "wojewodztwo": "pomorskie",   "wartosc": None},
    {"rok": 2022, "wojewodztwo": "pomorskie",   "wartosc": 101.7},
]
df = pd.DataFrame(dane)

# %% [markdown]
# ## Twoja analiza
#
# Pisz poniżej — dodawaj własne komórki kodu (**+ Kod**) i tekstowe
# (**+ Tekst**) na uzasadnienie decyzji o brakach, wskazanie województwa
# i wniosek. Buduj przyrostowo (L0.4): każdy krok sprawdź, zanim
# przejdziesz do następnego.

# %%
# Twoja analiza — pisz tutaj:


# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token**. Pieczątka sprawdza, że tabela wejściowa jest
# nietknięta (12 wierszy, 2 braki, wartości bez zmian), `dane_analiza`
# ma spójny rozmiar (od 7 do 12 wierszy — każda z trzech decyzji
# o brakach legalna) i wiersze POCHODZĄCE z tabeli wejściowej (wpisywanie
# wartości w braki to nie decyzja, to fałszowanie — PD.5), a `srednie_woj`
# zgadza się z NIEZALEŻNYM przeliczeniem grupowania na `dane_analiza`. Uwaga (jawny limit): komórek TEKSTOWYCH (uzasadnienie,
# wniosek) i wykresu pieczątka nie ocenia — oceń je sam(a) wg drabinki;
# przy capstonie zrobi to rubryka i viva.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    brak = [n for n in ("pd", "df") if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            'Uruchom komórkę „Dane" (wyżej) i przejdź analizę od góry.'
        )
    pd = g["pd"]
    df = g["df"]
    if (
        not isinstance(df, pd.DataFrame)
        or list(df.columns) != ["rok", "wojewodztwo", "wartosc"]
        or len(df) != 12
        or int(df["wartosc"].isna().sum()) != 2
        or abs(float(df["wartosc"].sum()) - 1003.1) >= 0.01
    ):
        raise RuntimeError(
            "Tabela wejściowa `df` wygląda na zmienioną (kontrakt: 12 "
            "wierszy, kolumny rok/wojewodztwo/wartosc, 2 braki w wartosc, "
            "wartości bez zmian). Analizę rób na KOPIACH — przywróć komórkę "
            '„Dane" i uruchom notebook od góry.'
        )
    if "dane_analiza" not in g:
        raise RuntimeError(
            "Nie widzę tabeli `dane_analiza` — tak (dokładnie) nazwij tabelę "
            "po decyzji o brakach (krok 2); również gdy zostawiasz braki: "
            "dane_analiza = df."
        )
    dane_analiza = g["dane_analiza"]
    if not isinstance(dane_analiza, pd.DataFrame) or not all(
        k in dane_analiza.columns for k in ("rok", "wojewodztwo", "wartosc")
    ):
        raise RuntimeError(
            "`dane_analiza` powinno być TABELĄ z kolumnami "
            "rok/wojewodztwo/wartosc — rób sito/dropna na całej tabeli, "
            "nie na pojedynczej kolumnie."
        )
    wiersze_analiza = int(len(dane_analiza))
    if wiersze_analiza > 12:
        raise RuntimeError(
            "`dane_analiza` ma więcej wierszy niż tabela wejściowa — "
            "decyzja o brakach nie dokłada danych; wróć do kroku 2."
        )
    if wiersze_analiza < 7:
        raise RuntimeError(
            "`dane_analiza` ma mniej niż 7 wierszy — wycięto za dużo. "
            "Legalne decyzje: usuń braki, zostaw wszystko albo zawęź lata "
            "(np. do 3 ostatnich, nie węziej) — także łącznie z dropna."
        )
    # Wiersze `dane_analiza` muszą POCHODZIĆ z tabeli wejściowej (porównanie
    # rekordów, niezależne od indeksu) — fillna/podmiana wartości nie jest
    # żadną z trzech decyzji kroku 2.
    pozostale = []
    for i in range(len(df)):
        w = df.iloc[i]
        pozostale.append(
            (
                int(w["rok"]),
                str(w["wojewodztwo"]),
                None if pd.isna(w["wartosc"]) else round(float(w["wartosc"]), 6),
            )
        )
    for i in range(len(dane_analiza)):
        w = dane_analiza.iloc[i]
        rekord = (
            int(w["rok"]),
            str(w["wojewodztwo"]),
            None if pd.isna(w["wartosc"]) else round(float(w["wartosc"]), 6),
        )
        if rekord in pozostale:
            pozostale.remove(rekord)
        else:
            raise RuntimeError(
                "wartości w `dane_analiza` nie pochodzą z tabeli wejściowej — "
                "wpisywanie wartości w braki (np. fillna(0)) FAŁSZUJE wskaźnik "
                "ciągły i nie jest decyzją z kroku 2 (PD.5): usuń braki, "
                "zostaw je albo zawęź lata; wróć do kroku 2 i uruchom "
                "komórki ponownie."
            )
    if "srednie_woj" not in g:
        raise RuntimeError(
            "Nie widzę `srednie_woj` — tak (dokładnie) nazwij wynik "
            "grupowania z kroku 3: średnia wartosc per województwo, "
            "liczona na dane_analiza."
        )
    srednie_woj = g["srednie_woj"]
    ref_srednie = dane_analiza.groupby("wojewodztwo")["wartosc"].mean()
    if isinstance(srednie_woj, pd.DataFrame) and "wartosc" in srednie_woj.columns:
        srednie_woj = srednie_woj["wartosc"]
    if not isinstance(srednie_woj, pd.Series):
        raise RuntimeError(
            "`srednie_woj` powinno być wynikiem "
            'groupby("wojewodztwo")["wartosc"].mean() — serią średnich '
            "per województwo (PD.6)."
        )
    if set(srednie_woj.index) != set(ref_srednie.index):
        raise RuntimeError(
            "grupy w `srednie_woj` nie zgadzają się z województwami "
            "w `dane_analiza` — grupuj po kolumnie wojewodztwo, na tabeli "
            "dane_analiza (nie na df)."
        )
    for woj in list(ref_srednie.index):
        if abs(float(srednie_woj[woj]) - float(ref_srednie[woj])) >= 0.01:
            raise RuntimeError(
                "średnie w `srednie_woj` nie zgadzają się z niezależnym "
                "przeliczeniem pieczątki na `dane_analiza` — licz .mean() "
                "na dane_analiza (PO decyzji o brakach), nie na df, "
                "i uruchom komórkę z krokiem 3 ponownie."
            )
    return {
        "wiersze_wejscie": int(len(df)),
        "braki_wejscie": int(df["wartosc"].isna().sum()),
        "wiersze_analiza": wiersze_analiza,
        "srednie_zgodne": True,
    }
