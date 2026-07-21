# %% [markdown]
# # F1.7 — LAB „Program, który decyduje"
#
# **SkillBridge · ścieżka Data Science · moduł F1 „Python I — podstawy języka"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Finał modułu F1 — bez szkieletu, z samą specyfikacją (pełna treść zadania
# i drabinka podpowiedzi są w SkillBridge). Napisz **program oceniający Twój
# tygodniowy budżet na dojazdy**:
#
# 1. Dane wejściowe (zmienne na górze): `budzet_tygodnia` (liczba),
#    `cena_przejazdu` (liczba, może być z kropką), `przejazdy_dziennie`
#    (liczba całkowita).
# 2. Obliczenie: `koszt_tygodnia` = cena × przejazdy dziennie × 5 dni
#    roboczych (jedno wyrażenie).
# 3. Decyzja `if`/`else`: jeśli koszt mieści się w budżecie — wypisz
#    f-stringiem, ile zostaje; w przeciwnym razie — ile brakuje. W OBU
#    gałęziach kwota ma być policzona w klamrze, nie wpisana ręcznie.
# 4. Po decyzji, bez wcięcia, jedna linia podsumowania z samym kosztem
#    (f-string).
#
# Sprawdź program dwa razy: z danymi, przy których się mieści, i z takimi,
# przy których brakuje (zmień tylko dane wejściowe — logika bez zmian).
# Ten lab zaliczasz pieczątką (jak w F1.4).

# %%
# Twój program — pisz tutaj:


# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka". Pieczątka sprawdza, że obliczenie
# zgadza się z bieżącymi danymi i że w komórce programu jest decyzja
# `if`/`else` — dopiero wtedy wypisze token.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    nazwy = ("budzet_tygodnia", "cena_przejazdu", "przejazdy_dziennie", "koszt_tygodnia")
    brak = [n for n in nazwy if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            'Napisz program w komórce „Twój program" wg specyfikacji i URUCHOM ją.'
        )
    for n in nazwy:
        if isinstance(g[n], bool) or not isinstance(g[n], (int, float)):
            raise RuntimeError(
                "`" + n + "` powinno być liczbą — popraw dane wejściowe "
                "i uruchom komórkę programu ponownie."
            )
    if abs(g["koszt_tygodnia"] - g["cena_przejazdu"] * g["przejazdy_dziennie"] * 5) >= 0.01:
        raise RuntimeError(
            "`koszt_tygodnia` nie zgadza się z bieżącymi danymi "
            "(cena × przejazdy dziennie × 5). Po zmianie danych uruchom "
            "komórkę programu PONOWNIE — w pamięci sesji siedzą stare wartości."
        )
    historia = g.get("In")
    if not isinstance(historia, list):
        raise RuntimeError(
            "Nie mogę odczytać historii tej sesji — uruchom notebook "
            "w Google Colab i spróbuj ponownie."
        )
    kandydaci = [
        zrodlo
        for zrodlo in historia
        if isinstance(zrodlo, str)
        and "koszt_tygodnia" in zrodlo
        and "_zbierz_wyniki" not in zrodlo
    ]
    if not kandydaci:
        raise RuntimeError(
            "Nie znajduję w tej sesji komórki z Twoim programem — napisz go "
            'w komórce „Twój program" i URUCHOM, zanim odbijesz pieczątkę.'
        )
    # Ostatni kandydat Z decyzją — komórka diagnostyczna (np. kontrolny print
    # z koszt_tygodnia) uruchomiona PO programie nie może przesłonić programu.
    z_decyzja = [z for z in kandydaci if "if" in z and "else" in z]
    if not z_decyzja:
        raise RuntimeError(
            "W programie ma być decyzja if/else (punkt 3 specyfikacji) — "
            "dopisz ją i uruchom komórkę programu ponownie."
        )
    zrodlo = z_decyzja[-1]
    if len(zrodlo) > 2500:
        raise RuntimeError(
            "Komórka programu jest bardzo długa — zostaw w niej sam program "
            "(kilkanaście linii wystarczy) i uruchom ją ponownie."
        )
    return {
        "budzet_tygodnia": g["budzet_tygodnia"],
        "cena_przejazdu": g["cena_przejazdu"],
        "przejazdy_dziennie": g["przejazdy_dziennie"],
        "koszt_tygodnia": g["koszt_tygodnia"],
        "_zrodlo": zrodlo,
    }
