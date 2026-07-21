# %% [markdown]
# # F3.3 — Słownik: wartość pod kluczem, nie pod numerem
#
# **SkillBridge · ścieżka Data Science · moduł F3 „Dane w Pythonie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F3.3. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
wydatek = {"nazwa": "bilet", "kategoria": "transport", "kwota": 4.40}
print(wydatek["nazwa"])          # odczyt: klucz w nawiasach kwadratowych
print(wydatek["kwota"] * 2)      # wartość spod klucza to zwykła wartość

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypiszą oba printy?

# %%
wydatek["oplacone"] = True     # nowa para dopisana
wydatek["kwota"] = 4.90        # istniejąca wartość podmieniona
print(wydatek)

# %% [markdown]
# ## Uzupełnij luki — opisz swój obiad
#
# Wstaw w miejsca `_luka_`: tekst i liczbę (które gdzie?) oraz klucz
# dania przy odczycie. Wewnątrz f-stringa klucz ujmij w POJEDYNCZE
# cudzysłowy (`'danie'`). (Uruchomienie bez uzupełnienia da
# `NameError: name '_luka_' is not defined`.)

# %%
obiad = {"danie": _luka_, "cena": _luka_}   # luki: tekst i liczba — które gdzie?
print(f"{obiad[_luka_]} za {obiad['cena']} zł")   # luka: klucz dania
