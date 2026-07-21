# %% [markdown]
# # F1.3 — Budowanie tekstu z wartości: f-string
#
# **SkillBridge · ścieżka Data Science · moduł F1 „Python I — podstawy języka"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F1.3. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
kawa = 12
dni = 30
koszt = kawa * dni
print(f"Kawa kosztuje mnie {koszt} zł miesięcznie.")  # f przed cudzysłowem!

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co dokładnie się wypisze? Gdzie w wyniku
# będą klamry? (Odpowiedź: nigdzie — klamry znikają, w ich miejsce wchodzi
# wartość. Jeśli klamry WIDAĆ w wyniku, brakło litery `f`.)
#
# ## Uzupełnij lukę (completion)
#
# W komórce poniżej jest luka `_luka_`. Do luki pasuje zarówno nazwa
# `tydzien`, jak i całe wyrażenie `przejazdy * bilet` — wypróbuj OBIE wersje
# i porównaj wyniki. (Uruchomienie bez uzupełnienia da `NameError: name
# '_luka_' is not defined` — czytasz go jak w L0.3.)

# %%
przejazdy = 8
bilet = 4
tydzien = przejazdy * bilet
print(f"Bilety kosztują mnie {_luka_} zł na tydzień.")   # luka: co w klamrze?
