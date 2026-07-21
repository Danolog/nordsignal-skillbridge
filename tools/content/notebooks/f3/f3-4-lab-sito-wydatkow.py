# %% [markdown]
# # F3.4 — LAB „Sito wydatków"
#
# **SkillBridge · ścieżka Data Science · moduł F3 „Dane w Pythonie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Jednym przejściem pętli rozdzielisz wydatki na duże i małe ORAZ policzysz
# sumę dużych — trzy zbieracze pracujące równolegle. Uzupełnij trzy luki
# (`_luka_`) i uruchom. Potem zmień `prog` na 50 i uruchom ponownie —
# wyniki mają się przeliczyć same. Ten lab zaliczasz pieczątką.
# (Uruchomienie bez uzupełnienia luk zatrzyma się na `NameError: name
# '_luka_' is not defined`.)

# %%
wydatki = [120, 80, 45, 200, 15, 95]
prog = 100

duze = []                      # zbieracz-lista na wydatki >= prog
suma_duzych = 0                # zbieracz-liczba
male_licznik = 0               # zbieracz-licznik

for wydatek in wydatki:
    if wydatek >= prog:
        duze.append(_luka_)            # luka 1: co dokładasz?
        suma_duzych = _luka_           # luka 2: wzorzec z F2.5
    else:
        male_licznik = _luka_          # luka 3: zliczanie (F3.2)

print(f"Duże wydatki: {duze}")
print(f"Suma dużych: {suma_duzych} zł")
print(f"Małych wydatków: {male_licznik}")

# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka". Pieczątka przelicza sito WŁASNĄ
# pętlą dla bieżących danych — token wypisze dopiero, gdy Twoje trzy
# zbieracze naprawdę policzyły.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    brak = [
        n for n in ("wydatki", "prog", "duze", "suma_duzych", "male_licznik") if n not in g
    ]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            "Uzupełnij luki i uruchom komórkę z sitem (wyżej)."
        )
    wydatki = g["wydatki"]
    prog = g["prog"]
    if (
        not isinstance(wydatki, list)
        or len(wydatki) == 0
        or not all(isinstance(w, (int, float)) and not isinstance(w, bool) for w in wydatki)
    ):
        raise RuntimeError("`wydatki` powinno być NIEPUSTĄ listą liczb — przywróć komórkę danych.")
    if isinstance(prog, bool) or not isinstance(prog, (int, float)):
        raise RuntimeError("`prog` powinien być liczbą — przywróć komórkę danych.")
    ref_duze = [w for w in wydatki if w >= prog]
    if g["duze"] != ref_duze:
        raise RuntimeError(
            "Lista `duze` nie zgadza się z własnym przeliczeniem pieczątki "
            "dla bieżących danych. Najczęstsze przyczyny: gest w złej gałęzi "
            "(porównaj wcięcia) albo stare wartości w sesji po zmianie `prog` "
            "— uruchom komórkę z sitem PONOWNIE."
        )
    ref_suma = 0
    for w in ref_duze:
        ref_suma = ref_suma + w
    ref_licznik = len(wydatki) - len(ref_duze)
    zle_suma = abs(g["suma_duzych"] - ref_suma) >= 0.01
    if zle_suma or g["male_licznik"] != ref_licznik:
        raise RuntimeError(
            "`suma_duzych` albo `male_licznik` nie zgadzają się z niezależnym "
            'przeliczeniem. Sprawdź: luka 2 to „stara suma + bieżący element" '
            '(F2.5), luka 3 to „licznik + 1" (zliczanie ≠ sumowanie) — popraw '
            "i uruchom komórkę z sitem ponownie."
        )
    return {
        "duze": g["duze"],
        "suma_duzych": g["suma_duzych"],
        "male_licznik": g["male_licznik"],
        "ref_suma_duzych": ref_suma,
        "ref_male_licznik": ref_licznik,
    }
