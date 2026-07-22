# %% [markdown]
# # EDA.3 — EDA to metoda: pytania, eksploracja, hipotezy
#
# **SkillBridge · ścieżka Data Science · moduł M-EDA „EDA: od API do repozytorium"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi EDA.3. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge. Tu ćwiczysz jedną umiejętność: **odróżnić
# uczciwą hipotezę od nadinterpretacji i od ucieczki** — bo to ostatnie
# kryterium rubryki Twojego capstone'u.
#
# Przebieg EDA w czterech krokach (do zapamiętania):
#
# 1. **PYTANIE** — konkretne, przed kodem.
# 2. **PORZĄDEK** — obejrzyj i wyczyść, z uzasadnieniem (PD.2, PD.5).
# 3. **EKSPLORACJA** — rozkłady, grupy, trendy; każdy wykres to PYTANIE.
# 4. **HIPOTEZY** — „dane sugerują X; żeby to potwierdzić, trzeba by Y".
#
# Granica: **EDA generuje hipotezy, ale ich NIE dowodzi.**

# %%
zdania = [
    "Bezrobocie na pewno spadlo dzieki inwestycjom zagranicznym.",
    "Dane sa zbyt niepewne, zeby cokolwiek stwierdzic.",
    "Dane sugeruja szybszy spadek bezrobocia w wojewodztwach zachodnich; "
    "weryfikacja wymaga kolejnych lat.",
]
for i, z in enumerate(zdania, start=1):
    print("Z" + str(i) + ": " + z)

# %% [markdown]
# ## Twoja kolej — oceń trzy zdania
#
# Każde zdanie zaklasyfikuj jako jedno z trzech:
#
# - **uczciwa hipoteza** — obserwacja z danych + warunek weryfikacji;
# - **nadinterpretacja** — „dowodzi", „na pewno" albo przyczyna, której
#   w danych nie było;
# - **ucieczka** — brak wniosku podany jako ostrożność.
#
# Wpisz swoje odpowiedzi w komórce poniżej i uruchom ją. Potem —
# dopiero potem — odsłoń klucz.

# %%
moja_ocena = {
    "Z1": "wpisz tutaj",
    "Z2": "wpisz tutaj",
    "Z3": "wpisz tutaj",
}
for kod, ocena in moja_ocena.items():
    print(kod + " -> " + ocena)

# %% [markdown]
# ## Klucz — uruchom PO własnej próbie

# %%
klucz = {
    "Z1": "nadinterpretacja",
    "Z2": "ucieczka",
    "Z3": "uczciwa hipoteza",
}
powody = {
    "Z1": "podwojny grzech: 'na pewno' (EDA nie dowodzi) + przyczyna "
    "(inwestycje), ktorej w danych w ogole nie bylo",
    "Z2": "EDA MA sformulowac hipoteze; uczciwosc to nie brak wnioskow",
    "Z3": "co widac + czego trzeba do potwierdzenia - forma z rubryki",
}
for kod in ("Z1", "Z2", "Z3"):
    trafione = moja_ocena[kod].strip().lower() == klucz[kod]
    werdykt = "zgadza sie " if trafione else "ROZJAZD    "
    print(werdykt + kod + ": " + klucz[kod] + " - " + powody[kod])

# %% [markdown]
# ## Popraw nadinterpretację
#
# Weź zdanie Z1 i przepisz je do formy z kroku 4. Wzorzec poprawy:
#
# 1. usuń „dowodzi" / „na pewno";
# 2. usuń przyczynę, której nie badałeś(-aś);
# 3. zostaw obserwację z konkretnej komórki („w latach A–B wartość
#    spada o…");
# 4. dodaj warunek weryfikacji („wymaga danych o…" / „kolejnych lat").
#
# Wpisz swoją wersję w komórce poniżej.

# %%
moja_poprawka = "wpisz tutaj poprawione zdanie Z1"
print(moja_poprawka)

# %% [markdown]
# ## Autotest przed capstone'em
#
# Każda hipoteza w Twoim raporcie ma mieć dwie rzeczy:
#
# - **(a)** obserwację z KONKRETNEJ komórki notebooka,
# - **(b)** zastrzeżenie weryfikacji.
#
# Brakuje (a)? To nie hipoteza z danych, tylko przekonanie. Brakuje (b)?
# To konfirmacja na tych samych danych, z których hipoteza wyrosła —
# rozumowanie w kółko.
#
# W raporcie EDA to zastrzeżenie nie jest asekuracją. To znak, że wiesz,
# co robisz.
