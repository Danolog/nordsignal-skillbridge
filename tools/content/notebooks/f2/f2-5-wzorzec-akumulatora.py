# %% [markdown]
# # F2.5 — Wzorzec akumulatora: zbierz wynik z całej listy
#
# **SkillBridge · ścieżka Data Science · moduł F2 „Python II"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F2.5. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
wydatki = [120, 80, 45, 60]

suma = 0                       # akumulator: startuje z zerem PRZED pętlą
for wydatek in wydatki:
    suma = suma + wydatek      # nowa suma = stara suma + bieżący element
print(f"Łącznie: {suma} zł")   # po pętli akumulator ma wynik z całości

# %% [markdown]
# **Przewidź, zanim uruchomisz:** jaką wartość ma `suma` po pierwszym
# obrocie? A po ostatnim? Rozpisz stany na kartce (obrót | element | suma)
# — to najlepszy sposób sprawdzania każdej pętli z akumulatorem.
#
# ## Uzupełnij luki — policz średnią ocen
#
# Wstaw w miejsca `_luka_`: start zbieracza (luka A) i linię „nowa wartość
# = stara wartość + bieżący element" (luka B — obie nazwy już są
# w programie). (Uruchomienie bez uzupełnienia da `NameError: name
# '_luka_' is not defined`.)

# %%
oceny = [4, 5, 3, 4]

suma = _luka_                  # luka A: od czego startuje zbieracz?
for ocena in oceny:
    suma = _luka_ + _luka_     # luka B: nowa wartość zbieracza
srednia = suma / len(oceny)    # F2.2: len zlicza elementy
print(f"Średnia: {srednia}")
