# %% [markdown]
# # F3.2 — Decyzja w każdym obrocie: filtrowanie i zliczanie
#
# **SkillBridge · ścieżka Data Science · moduł F3 „Dane w Pythonie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F3.2. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
wydatki = [120, 80, 45, 200, 15]

duze = 0                        # licznik — startuje przed pętlą (F2.5)
for wydatek in wydatki:
    if wydatek > 100:           # bramka: decyzja dla BIEŻĄCEGO elementu
        duze = duze + 1         # podwójne wcięcie: należy do if wewnątrz for
print(f"Wydatków powyżej 100 zł: {duze}")

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypisze program? Przejdź listę palcem
# i przy każdym elemencie zadaj pytanie bramki.
#
# ## Uzupełnij lukę (completion) — odmiana filtrująca
#
# W miejsce `_luka_` wstaw gest odmiany 2: „dołóż BIEŻĄCY element do
# zbieracza-listy" (F3.1). Pamiętaj o podwójnym wcięciu — gest należy do
# `if`, który należy do `for`. (Uruchomienie bez uzupełnienia da
# `NameError: name '_luka_' is not defined`.)

# %%
wydatki = [120, 80, 45, 200, 15]
male = []
for wydatek in wydatki:
    if wydatek < 50:
        _luka_                    # luka: dołóż pasujący element do male
print(male)
