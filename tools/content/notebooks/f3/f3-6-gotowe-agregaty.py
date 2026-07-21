# %% [markdown]
# # F3.6 — Gotowe agregaty: sum, min, max
#
# **SkillBridge · ścieżka Data Science · moduł F3 „Dane w Pythonie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F3.6. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
kwoty = [120, 80, 45, 200, 15]
print(sum(kwoty))     # suma wszystkich
print(max(kwoty))     # największa
print(min(kwoty))     # najmniejsza
print(round(sum(kwoty) / len(kwoty), 2))   # średnia — złożenie gotowców

# %% [markdown]
# **Przewidź, zanim uruchomisz:** cztery wyniki?

# %%
wydatki = [
    {"nazwa": "bilet",  "kategoria": "transport", "kwota": 4.40},
    {"nazwa": "obiad",  "kategoria": "jedzenie",  "kwota": 24.50},
    {"nazwa": "kawa",   "kategoria": "jedzenie",  "kwota": 12.00},
]
jedzenie_kwoty = []
for wydatek in wydatki:                       # tabela z F3.5
    if wydatek["kategoria"] == "jedzenie":
        jedzenie_kwoty.append(wydatek["kwota"])
print(sum(jedzenie_kwoty))                    # gotowiec na przefiltrowanym

# %% [markdown]
# ## Twoje zadanie — trzy linijki, zero pętli
#
# Wpisz w listę pięć swoich ostatnich wydatków (liczby w miejsca `_luka_`)
# i policz `min`, `max` oraz średnią. (Uruchomienie bez uzupełnienia da
# `NameError: name '_luka_' is not defined`.)

# %%
moje = [_luka_, _luka_, _luka_, _luka_, _luka_]   # pięć ostatnich wydatków
print(min(moje))
print(max(moje))
print(round(sum(moje) / len(moje), 2))
