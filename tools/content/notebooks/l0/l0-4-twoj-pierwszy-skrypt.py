# %% [markdown]
# # L0.4 — Twój pierwszy własny skrypt
#
# **SkillBridge · ścieżka Data Science · moduł L0 „Start"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Tu składasz klocki z L0.1–L0.3 w pierwszą całość: skrypt, czyli listę
# instrukcji wykonywaną od góry do dołu. Zacznij od gotowego przykładu.

# %%
cena = 12               # liczba (bez cudzysłowu) — cena jednej kawy w zł
dni = 30                # liczba dni w miesiącu
koszt = cena * dni      # policz i zapamiętaj wynik pod nazwą: koszt
print("Kawa miesięcznie, zł:")   # tekst w cudzysłowie — etykieta wyniku
print(koszt)            # liczba spod nazwy koszt — bez cudzysłowu!

# %% [markdown]
# ## Rozgrzewka
#
# W komórce poniżej są **dwie luki** (`___`). Uzupełnij je i uruchom komórkę.
# Wskazówka do drugiej luki: użyj nazwy, pod którą zapamiętano liczbę
# przejazdów.

# %%
bilet = 4          # cena biletu w zł
przejazdy = ___    # ile razy jeździsz w tygodniu — wpisz liczbę
print(bilet * ___) # policz koszt tygodnia — jakiej nazwy tu użyć?

# %% [markdown]
# ## Twój skrypt (to zalicza atom i cały moduł L0)
#
# W pustej komórce poniżej napisz własny skrypt wg specyfikacji:
#
# - **co najmniej dwie zmienne liczbowe** o WŁASNYCH nazwach — spoza
#   przykładów tego notebooka (nie: `cena`, `dni`, `koszt`, `bilet`,
#   `przejazdy`),
# - **jedno działanie** na nich (`*`, `+` albo `-`),
# - **jeden `print`** z wynikiem.
#
# Policz coś swojego: wydatki, kilometry, strony książki — temat dowolny.
# Zasady nazw: bez spacji (zamiast spacji podkreślnik: `cena_biletu`),
# najbezpieczniej małymi literami, nazwa ma mówić, co jest w pudełku.
#
# Dopisuj linię po linii i uruchamiaj po każdej — błąd zawsze dotyczy wtedy
# ostatniej dopisanej linii. Czerwony komunikat? Czytaj jego ostatnią linię
# (jak w L0.3) i sprawdź drabinkę podpowiedzi w SkillBridge.

# %%
# Twój skrypt — pisz tutaj:


# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, podaj **kod atomu** z SkillBridge i przenieś
# token. Pieczątka wypisze go dopiero, gdy w bieżącej sesji istnieją co
# najmniej 2 zmienne liczbowe o Twoich własnych nazwach — czyli gdy Twój
# skrypt naprawdę się wykonał.

# %% [pieczatka]
def _zbierz_wyniki():
    # Nazwy z przykładów tego notebooka nie liczą się jako „własne".
    przyklady = {"cena", "dni", "koszt", "bilet", "przejazdy"}
    wlasne = [
        nazwa
        for nazwa, wartosc in globals().items()
        if not nazwa.startswith("_")
        and nazwa not in przyklady
        and isinstance(wartosc, (int, float))
        and not isinstance(wartosc, bool)
    ]
    if len(wlasne) < 2:
        raise RuntimeError(
            "W tej sesji widzę za mało własnych zmiennych liczbowych "
            "(znalezione: " + (", ".join(sorted(wlasne)) or "żadna") + "). "
            'Napisz w komórce „Twój skrypt" co najmniej dwie zmienne '
            "liczbowe o własnych nazwach i URUCHOM tę komórkę."
        )
    return {"_wlasne_zmienne": len(wlasne)}
