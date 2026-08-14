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
cena = 5.50              # cena za bochenek, zł
sztuki = 3               # ile bochenków kupuję
kromek_w_bochenku = 20   # ile kromek ma jeden bochenek

# %% [markdown]
# Luka 1 to wyrażenie z `*`; luka 2 — wyrażenie z `/` (zauważ kropkę w wyniku
# — wiesz z F1.2, skąd się bierze). Każda liczba, której potrzebujesz, jest
# w komórce z danymi wejściowymi — nie musisz niczego zakładać ani dopisywać.
# Nie wpisuj gotowych liczb — paragon ma się przeliczać sam po zmianie danych.
# (Uruchomienie bez uzupełnienia da `NameError: name '_luka_' is not defined`.)

# %%
# --- obliczenia ---
razem = _luka_           # luka 1: kwota za wszystkie bochenki
cena_kromki = _luka_     # luka 2: ile kosztuje jedna kromka

# %%
# --- paragon ---
print(f"Kupuję: {produkt}, {sztuki} szt. po {cena} zł")
print(f"Razem: {_luka_} zł")            # luka 3: nazwa albo wyrażenie
print(f"Jedna kromka: {cena_kromki} zł")

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
    brak = [n for n in ("cena", "sztuki", "kromek_w_bochenku", "razem", "cena_kromki") if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            "Uzupełnij luki i uruchom komórki od góry (dane → obliczenia → paragon)."
        )
    for n in ("cena", "sztuki", "kromek_w_bochenku", "razem", "cena_kromki"):
        if isinstance(g[n], bool) or not isinstance(g[n], (int, float)):
            raise RuntimeError(
                "`" + n + "` powinno być liczbą — sprawdź komórki z danymi "
                "i obliczeniami, potem uruchom je ponownie."
            )
    zle_razem = abs(g["razem"] - g["cena"] * g["sztuki"]) >= 0.01
    zle_kromka = abs(g["cena_kromki"] - g["cena"] / g["kromek_w_bochenku"]) >= 0.01
    if zle_razem:
        raise RuntimeError(
            "`razem` nie zgadza się z danymi wejściowymi: powinna to być cena "
            "bochenka pomnożona przez liczbę bochenków (luka 1). Popraw lukę 1 "
            "i uruchom komórki od góry."
        )
    if zle_kromka:
        raise RuntimeError(
            "`cena_kromki` nie zgadza się z danymi wejściowymi: powinna to być "
            "cena bochenka podzielona przez liczbę kromek w bochenku (luka 2). "
            "Uwaga: dzieli się `cena`, a nie `razem` — cena kromki nie zależy "
            "od tego, ile bochenków kupujesz. Popraw lukę 2 i uruchom komórki "
            "od góry."
        )
    return {
        "cena": g["cena"],
        "sztuki": g["sztuki"],
        "kromek_w_bochenku": g["kromek_w_bochenku"],
        "razem": g["razem"],
        "cena_kromki": g["cena_kromki"],
    }
