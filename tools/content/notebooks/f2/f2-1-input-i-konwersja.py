# %% [markdown]
# # F2.1 — Program pyta: input() i konwersja typów
#
# **SkillBridge · ścieżka Data Science · moduł F2 „Python II"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi F2.1. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge. Uwaga do komórek z `input()`: pod komórką pojawi
# się pole do wpisania odpowiedzi, a `[*]` kręci się, dopóki nie odpowiesz.
# Jeśli pole się nie pojawi — uruchom komórkę jeszcze raz (znana usterka
# Colab; szczegóły w „Pierwszej pomocy F2").

# %%
wiek = input("Ile masz lat? ")   # odpowiedź użytkownika — ZAWSZE str
print(wiek + 1)                  # str + int → jaki błąd znasz z F1?

# %% [markdown]
# **Przewidź, zanim uruchomisz:** wpiszesz 25 — co się stanie w drugiej
# linii? (Ten błąd jest tu CELOWO — zobacz go na własne oczy, a naprawę
# masz w komórce niżej.)

# %%
wiek = int(input("Ile masz lat? "))    # od razu: zapytaj i zamień na int
print(f"Za rok będziesz mieć {wiek + 1} lat.")

# %% [markdown]
# ## Uzupełnij luki
#
# W komórce poniżej wstaw w miejsca `_luka_`: właściwą KONWERSJĘ (cena
# „z groszami" — który typ?) i to, co mnożysz. (Uruchomienie bez
# uzupełnienia zatrzyma się na `NameError: name '_luka_' is not defined`
# — zanim jeszcze pojawi się pole odpowiedzi.)

# %%
cena = _luka_(input("Cena biletu (może być z groszami): "))
print(f"Dwa bilety: {round(_luka_ * 2, 2)} zł")
