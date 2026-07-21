# %% [markdown]
# # F2.4 — LAB „Paragon z listy"
#
# **SkillBridge · ścieżka Data Science · moduł F2 „Python II"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Przepisujesz paragon z F1.4 na listę i pętlę: jeden program obsłuży
# dowolną liczbę pozycji. Uzupełnij trzy luki (`_luka_`) i uruchom. Potem
# **dopisz do listy piątą cenę i uruchom ponownie** — paragon ma się
# wydłużyć bez żadnej zmiany w kodzie poniżej linii „paragon". Ten krok
# jest sednem labu i sprawdza go pieczątka. (Uruchomienie bez uzupełnienia
# luk wypisze pierwszą linię i zatrzyma się na `NameError: name '_luka_'
# is not defined`.)

# %%
# --- dane wejściowe ---
ceny = [5.50, 12.00, 3.75, 8.25]      # ceny zakupów w zł

# --- paragon ---
print("--- PARAGON ---")
for _luka_ in _luka_:                  # luka 1: nagłówek pętli
    print(f"Pozycja: {_luka_} zł")     # luka 2: co w klamrze?
print(f"Pozycji na paragonie: {_luka_}")   # luka 3: ile zakupów? (jedna funkcja z F2.2)

# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka". Pieczątka wypisze token dopiero,
# gdy lista `ceny` ma co najmniej 5 pozycji-liczb — czyli po kroku
# „dopisz piątą cenę i uruchom ponownie".

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    if "ceny" not in g:
        raise RuntimeError(
            "Nie widzę listy `ceny` w tej sesji — uruchom komórkę z danymi "
            "i paragonem (wyżej), potem wróć do pieczątki."
        )
    ceny = g["ceny"]
    if not isinstance(ceny, list):
        raise RuntimeError(
            "`ceny` powinno być LISTĄ w nawiasach kwadratowych, "
            "np. ceny = [5.50, 12.00] — popraw komórkę danych i uruchom ją."
        )
    if not all(isinstance(c, (int, float)) and not isinstance(c, bool) for c in ceny):
        raise RuntimeError(
            "Wszystkie pozycje `ceny` powinny być liczbami (bez cudzysłowów) "
            "— popraw dane i uruchom komórkę ponownie."
        )
    if len(ceny) < 5:
        raise RuntimeError(
            "Lista `ceny` ma " + str(len(ceny)) + " pozycje(-i), a sednem labu "
            'jest krok „dopisz do listy piątą cenę i uruchom ponownie" — '
            "dopisz ją w komórce danych i uruchom komórki od góry."
        )
    return {"ceny": ceny}
