# %% [markdown]
# # F1.5 — Porównanie: pytanie, na które odpowiedź brzmi True albo False
#
# **SkillBridge · ścieżka Data Science · moduł F1 „Python I — podstawy języka"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F1.5. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
budzet = 50
cena = 65
print(cena > budzet)    # pytanie: czy cena przekracza budżet?

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypisze ta komórka? Wynik to wartość typu
# `bool` — `True` albo `False`, wielką literą, bez cudzysłowu.
#
# ## Uzupełnij luki
#
# W komórce poniżej odkomentuj (usuń `# ` z początku linii) dwa printy i wstaw
# znak porównania w miejsce `_luka_`. Pamiętaj: jeden znak `=` robi, dwa znaki
# `==` pytają; `!=` czytaj „różne od". (Uwaga: wstaw znak, ZANIM uruchomisz —
# odkomentowana linia z niepodmienionym `_luka_` zatrzyma się na `SyntaxError`,
# bo w miejscu znaku porównania nie może stać słowo.)

# %%
wiek = 17
print(wiek >= 18)      # pełnoletność? → przewidź wynik
# Odkomentuj i wstaw znak w miejsce _luka_:
# print(wiek _luka_ 17)    # luka A: jaki znak da True, pytając „równe"?
# print(wiek _luka_ 20)    # luka B: jaki znak da True, pytając „różne od"?

# %% [markdown]
# ## Brudnopis
#
# Porównanie licz jak Python, w dwóch krokach: najpierw policz OBIE strony
# znaku do pojedynczych wartości, potem odpowiedz na pytanie znaku. W komórce
# poniżej wpisuj najpierw SAME strony (np. `print(cena - 20)`), zanim wpiszesz
# całe porównanie — zobaczysz półprodukty.

# %%
# Brudnopis — najpierw strony, potem całe porównanie:
# print(cena - 20)
# print(cena - 20 <= budzet)
