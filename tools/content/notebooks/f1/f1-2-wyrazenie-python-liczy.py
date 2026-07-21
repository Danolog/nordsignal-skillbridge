# %% [markdown]
# # F1.2 — Wyrażenie: Python liczy, zanim wypisze
#
# **SkillBridge · ścieżka Data Science · moduł F1 „Python I — podstawy języka"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F1.2. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
pizza = 48                    # cena pizzy w zł
dostawa = 6                   # dowóz w zł
osoby = 3
skladka = (pizza + dostawa) / osoby   # nawias: NAJPIERW suma, potem dzielenie
print(skladka)

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypisze `print(skladka)`? I pytanie
# pomocnicze: co wyszłoby BEZ nawiasu, z zapisu `pizza + dostawa / osoby`?
# Kropka w wyniku to nie usterka — dzielenie `/` zawsze daje `float`.
#
# ## Brudnopis
#
# Licz najpierw na kartce, w dwóch przejściach (najpierw wszystkie `*` i `/`
# od lewej, potem `+` i `-`; nawias przed wszystkim) — dopiero potem sprawdzaj
# uruchomieniem. Rachunki z pytań atomu możesz rozpisywać po kroku: podkreśl
# fragment, zastąp wynikiem, policz resztę.

# %%
# Brudnopis — sprawdź obie wersje rachunku:
# print(10 + 20 / 2)
# print((10 + 20) / 2)
