# %% [markdown]
# # F2.2 — Lista: jedno pudełko, wiele przegródek
#
# **SkillBridge · ścieżka Data Science · moduł F2 „Python II"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F2.2. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.

# %%
wydatki = [120, 80, 45, 60]     # lista: nawiasy KWADRATOWE, wartości po przecinku
print(len(wydatki))             # len(...) = ile przegródek?
print(wydatki[0])               # wartość z przegródki numer 0

# %% [markdown]
# **Przewidź, zanim uruchomisz:** co wypiszą dwie ostatnie linie?
# Pamiętaj: Python numeruje przegródki od ZERA.
#
# ## Brudnopis — indeksy na własne oczy
#
# Uruchom komórkę poniżej i przekonaj się, co wisi pod którym numerem.
# Potem odkomentuj ostatnią linię i zobacz `IndexError` ŚWIADOMIE — ma Cię
# nie zaskakiwać (jak `NameError` w L0.3).

# %%
oceny = [3, 5, 4]
print(oceny[0])
print(oceny[1])
print(oceny[2])
# Teraz świadomie POZA zakres — odkomentuj i przeczytaj komunikat:
# print(oceny[3])
