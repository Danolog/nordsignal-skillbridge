# %% [markdown]
# # F3.5 — Lista słowników: Twoja pierwsza tabela danych
#
# **SkillBridge · ścieżka Data Science · moduł F3 „Dane w Pythonie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F3.5. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
wydatki = [
    {"nazwa": "bilet",  "kategoria": "transport", "kwota": 4.40},
    {"nazwa": "obiad",  "kategoria": "jedzenie",  "kwota": 24.50},
    {"nazwa": "kawa",   "kategoria": "jedzenie",  "kwota": 12.00},
]
print(len(wydatki))                # ile rekordów?
print(wydatki[0]["nazwa"])         # rekord 0, pole "nazwa"

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypiszą oba printy? Zapis
# `wydatki[0]["nazwa"]` czytaj od lewej, dwoma krokami.

# %%
for wydatek in wydatki:
    print(f"{wydatek['nazwa']}: {wydatek['kwota']} zł")

# %% [markdown]
# ## Twoje zadanie — dopisz POCZĄTEK (backward completion)
#
# Komórka poniżej ma gotowe: start zbieracza i PODWÓJNIE wciętą linię
# sumowania. Dopisz dwie linie-piętra: nagłówek pętli po `wydatki`
# (pierwsza, BEZ wcięcia) i bramkę „kategoria równa się transport"
# (druga, z pojedynczym wcięciem). Ciało zdradza nazwę rekordu:
# `wydatek`. (Uruchomienie bez poprawki zatrzyma się na
# `IndentationError` — przeczytaj komunikat metodą z L0.3.)

# %%
suma_transport = 0
# dopisz tu nagłówek pętli po wydatki
# dopisz tu bramkę: kategoria równa "transport"
        suma_transport = suma_transport + wydatek["kwota"]
print(f"Transport: {suma_transport} zł")
