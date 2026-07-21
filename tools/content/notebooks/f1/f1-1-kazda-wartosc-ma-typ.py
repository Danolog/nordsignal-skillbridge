# %% [markdown]
# # F1.1 — Każda wartość ma typ
#
# **SkillBridge · ścieżka Data Science · moduł F1 „Python I — podstawy języka"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Ten notebook towarzyszy atomowi F1.1: tu uruchamiasz przykład z teorii
# i sprawdzasz w brudnopisie wartości z pytań. **Ten notebook nie ma
# pieczątki** — atom zaliczasz, odpowiadając na pytania w SkillBridge.

# %%
cena = 12          # liczba całkowita
waga = 0.5         # liczba z kropką — część ułamkowa
nazwa = "jabłko"   # tekst w cudzysłowie
print(type(cena))  # sprawdź typ wartości spod nazwy: cena
print(type(waga))
print(type(nazwa))

# %% [markdown]
# **Przewidź, zanim uruchomisz:** które z trzech linijek `print` wypiszą co?
# Zapis `<class 'int'>` czytaj po prostu: „to jest int".
#
# ## Brudnopis
#
# Komórka poniżej jest Twoja. Wpisuj `print(type(TU_WSTAW_WARTOŚĆ))`
# z wartościami z pytań atomu (np. `"3.14"`, `12.5`, `"7"`) i porównuj wynik
# z regułą: (1) jest cudzysłów? → `str`, koniec. (2) Nie ma — jest kropka? →
# `float`. (3) Nie ma ani jednego → `int`.

# %%
# Brudnopis — sprawdzaj typy, np.:
# print(type("3.14"))
