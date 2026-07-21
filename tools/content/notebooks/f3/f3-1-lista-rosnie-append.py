# %% [markdown]
# # F3.1 — Lista rośnie: metoda .append()
#
# **SkillBridge · ścieżka Data Science · moduł F3 „Dane w Pythonie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F3.1. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
wydatki = [120, 80, 45]
wydatki.append(60)          # dopisz 60 NA KONIEC listy
print(wydatki)              # cała lista po zmianie
print(len(wydatki))

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypiszą oba printy? Pamiętaj mantrę:
# append wywołujesz, wyniku NIE przypisujesz.

# %%
kwoty_brutto = []                     # pusty zbieracz PRZED pętlą (jak suma = 0)
for kwota in [100, 200, 50]:
    kwoty_brutto.append(kwota * 1.23) # dołóż przeliczony element
print(kwoty_brutto)

# %% [markdown]
# ## Uzupełnij luki — ceny po rabacie
#
# Wstaw w miejsca `_luka_`: pusty start zbieracza i to, co przerabiasz
# w każdym obrocie (nazwa z nagłówka pętli). (Uruchomienie bez uzupełnienia
# da `NameError: name '_luka_' is not defined`.)

# %%
ceny_po_rabacie = _luka_               # pusty start (zbieracz przed pętlą)
for cena in [100, 40, 250]:
    ceny_po_rabacie.append(_luka_ * 0.9)   # co przerabiasz w każdym obrocie?
print(ceny_po_rabacie)
