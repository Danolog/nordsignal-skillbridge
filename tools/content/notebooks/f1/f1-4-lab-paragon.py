# %% [markdown]
# # F1.4 — LAB „Paragon"
#
# **SkillBridge · ścieżka Data Science · moduł F1 „Python I — podstawy języka"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Składasz klocki F1.1–F1.3 w pierwszy program-produkt: paragon zakupów.
# Uzupełnij trzy luki (`_luka_`), uruchom komórki OD GÓRY i przeczytaj swój
# paragon. Potem podmień dane wejściowe na własne zakupy i uruchom ponownie —
# program ma policzyć wszystko sam, bez zmian poniżej linii „obliczenia".
# Ten lab zaliczasz pieczątką (jak w L0).

# %%
# --- dane wejściowe programu (w F1 „wejściem" są zmienne na górze) ---
produkt = "chleb"
cena = 5.50          # cena za sztukę, zł
sztuki = 3

# %% [markdown]
# Luka 1 to wyrażenie z `*`; luka 2 — wyrażenie z `/` (zauważ kropkę w wyniku
# — wiesz z F1.2, skąd się bierze). Nie wpisuj gotowych liczb — paragon ma się
# przeliczać sam po zmianie danych. (Uruchomienie bez uzupełnienia da
# `NameError: name '_luka_' is not defined`.)

# %%
# --- obliczenia ---
razem = _luka_              # luka 1: kwota za wszystkie sztuki
srednio_dziennie = _luka_   # luka 2: ile to dziennie przy 30 dniach

# %%
# --- paragon ---
print(f"Kupuję: {produkt}, {sztuki} szt. po {cena} zł")
print(f"Razem: {_luka_} zł")            # luka 3: nazwa albo wyrażenie
print(f"W skali dnia: {srednio_dziennie} zł")

# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka". Pieczątka wypisze token dopiero,
# gdy obliczenia zgadzają się z bieżącymi danymi wejściowymi — czyli gdy
# paragon naprawdę się przeliczył.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    brak = [n for n in ("cena", "sztuki", "razem", "srednio_dziennie") if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            "Uzupełnij luki i uruchom komórki od góry (dane → obliczenia → paragon)."
        )
    for n in ("cena", "sztuki", "razem", "srednio_dziennie"):
        if isinstance(g[n], bool) or not isinstance(g[n], (int, float)):
            raise RuntimeError(
                "`" + n + "` powinno być liczbą — sprawdź komórki z danymi "
                "i obliczeniami, potem uruchom je ponownie."
            )
    zle_razem = abs(g["razem"] - g["cena"] * g["sztuki"]) >= 0.01
    zle_srednio = abs(g["srednio_dziennie"] - g["razem"] / 30) >= 0.01
    if zle_razem or zle_srednio:
        raise RuntimeError(
            "Obliczenia nie zgadzają się z bieżącymi danymi wejściowymi. "
            "Najczęstsza przyczyna: po zmianie danych nie uruchomiono PONOWNIE "
            "komórki obliczeń — w pamięci sesji siedzą stare wartości (L0.3). "
            "Uruchom komórki od góry i spróbuj jeszcze raz."
        )
    return {
        "cena": g["cena"],
        "sztuki": g["sztuki"],
        "razem": g["razem"],
        "srednio_dziennie": g["srednio_dziennie"],
    }
