# %% [markdown]
# # L0.2 — Komórki: tekst, kod i Twoja własna kopia
#
# **SkillBridge · ścieżka Data Science · moduł L0 „Start"**
#
# ## Najpierw: zrób własną kopię
#
# Ten notebook otwarty z linku jest **tylko do odczytu** — możesz uruchamiać
# komórki, ale zmiany nie zapiszą się na stałe. Zanim cokolwiek zmienisz:
#
# **Plik → Zapisz kopię na Dysku** — Colab otworzy nową kartę z Twoją kopią.
#
# Sprawdź nazwę pliku w lewym górnym rogu: powinna zaczynać się od **„Kopia"**.
# Jeśli nie zaczyna — nadal jesteś w oryginale. Od tego miejsca pracujesz
# zawsze w swojej kopii (zapisuje się sama, na Twoim Dysku Google, w folderze
# „Colab Notebooks").

# %% [markdown]
# ## To jest komórka tekstowa
#
# Ta komórka (i wszystkie z szarym tekstem na białym tle) zawiera tylko
# objaśnienia. Nie ma przycisku ▶ i **nie wykonuje się** — jest do czytania.
# Komórka kodu to szare pole z kodem — tylko ona „coś robi".
#
# Notebooki na tej ścieżce przeplatają jedno z drugim: komórka tekstowa mówi,
# CO zaraz zrobimy i po co, komórka kodu — robi to. Czytaj po kolei.

# %%
imie = "Alex"            # zapamiętaj tekst "Alex" pod nazwą: imie
print("Cześć, " + imie)  # wypisz "Cześć, " sklejone z tym, co kryje się pod: imie

# %% [markdown]
# ## Twoje zadanie
#
# 1. Uruchom komórkę powyżej — wypisze `Cześć, Alex`.
# 2. Kliknij w linię `imie = "Alex"` i zamień `Alex` na swoje imię.
#    **Cudzysłowy zostają!** (`imie = "Kasia"`, nie `imie = Kasia`).
#    Gdyby coś się zepsuło — Ctrl+Z wewnątrz komórki cofa zmiany.
# 3. Uruchom komórkę **ponownie** (▶ albo Ctrl+Enter) i sprawdź, że wynik
#    się zmienił. Pamiętaj: zmiana kodu nie zmienia wyniku sama z siebie —
#    wynik pochodzi z OSTATNIEGO uruchomienia.
#
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, podaj **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka" w SkillBridge. Pieczątka wypisze
# token dopiero, gdy `imie` naprawdę różni się od domyślnego.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    if "imie" not in g:
        raise RuntimeError(
            "Zmienna `imie` nie istnieje w tej sesji — uruchom najpierw "
            "komórkę z linią imie = ... (wyżej)."
        )
    imie = g["imie"]
    if not isinstance(imie, str) or not imie.strip():
        raise RuntimeError(
            "`imie` powinno być niepustym tekstem w cudzysłowie, "
            'np. imie = "Kasia" — popraw komórkę i uruchom ją ponownie.'
        )
    if imie == "Alex":
        raise RuntimeError(
            '`imie` to nadal domyślne „Alex" — zamień je na swoje imię '
            "i uruchom tamtą komórkę PONOWNIE (a jeśli masz na imię Alex, "
            "dopisz np. pierwszą literę nazwiska)."
        )
    return {"imie": imie}
