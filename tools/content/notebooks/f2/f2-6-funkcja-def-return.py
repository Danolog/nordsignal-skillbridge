# %% [markdown]
# # F2.6 — Funkcja: nazwij fragment kodu i używaj go wielokrotnie
#
# **SkillBridge · ścieżka Data Science · moduł F2 „Python II"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F2.6. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
def brutto(cena):                  # DEFINICJA: słowo def, nazwa, parametr, dwukropek
    return cena * 1.23             # ciało WCIĘTE; return odsyła wynik

print(brutto(100))                 # WYWOŁANIE: nazwa + wartość w nawiasie
print(brutto(200))

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypiszą dwa printy?
#
# ## Twoje zadanie — dopisz DEFINICJĘ (backward completion)
#
# Komórka poniżej ma gotowe WYWOŁANIA — dopisz nad nimi definicję funkcji
# `podroz(kilometry)`, która ZWRACA koszt przejazdu: `kilometry * 0.85`.
# Wywołania zdradzają wszystko: nazwę, jeden parametr i to, że wynik ma
# WRACAĆ (printy wypisują wartość wywołania → w ciele musi być `return`).
# (Uruchomienie bez definicji da `NameError: name 'podroz' is not
# defined` — przeczytaj go metodą z L0.3.)

# %%
# dopisz tu definicję funkcji podroz(kilometry),
# która zwraca koszt przejazdu: kilometry * 0.85

print(podroz(10))     # ma wypisać 8.5
print(podroz(100))    # ma wypisać 85.0
