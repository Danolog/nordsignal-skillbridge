# %% [markdown]
# # F2.3 — Pętla for: zrób to dla każdego elementu
#
# **SkillBridge · ścieżka Data Science · moduł F2 „Python II"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F2.3. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
wydatki = [120, 80, 45, 60]
for wydatek in wydatki:                  # nagłówek: dwukropek jak w if!
    print(f"Pozycja: {wydatek} zł")      # ciało pętli — WCIĘTE jak w if
print("--- koniec paragonu ---")         # bez wcięcia: wykona się RAZ, po pętli

# %% [markdown]
# **Przewidź, zanim uruchomisz:** ile linii wypisze ten program i co będzie
# w ostatniej?
#
# ## Uzupełnij nagłówek (completion)
#
# W komórce poniżej dopisz nagłówek pętli w miejsca `_luka_` — wskazówka
# jest w CIELE pętli: jakiej nazwy zmiennej ono oczekuje? (Uruchomienie bez
# uzupełnienia da `NameError: name '_luka_' is not defined`.)

# %%
zakupy = ["chleb", "masło", "ser"]
for _luka_ in _luka_:
    print(f"Do koszyka: {produkt}")
