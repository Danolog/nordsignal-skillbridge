# %% [markdown]
# # F2.7 — LAB „Strażnik budżetu"
#
# **SkillBridge · ścieżka Data Science · moduł F2 „Python II"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Finał modułu F2 — bez szkieletu, z samą specyfikacją (pełna treść
# zadania i drabinka podpowiedzi są w SkillBridge). Napisz **program
# porównujący wydatki z budżetem**:
#
# 1. Lista `wydatki` z co najmniej pięcioma kwotami (mogą być z kropką).
# 2. Funkcja `suma_wydatkow(lista)` — wzorzec akumulatora w ciele,
#    `return` sumy (żadnych printów w funkcji).
# 3. Pobranie budżetu od użytkownika: `input()` + właściwa konwersja
#    (kwota może mieć grosze — który typ?).
# 4. Wywołanie funkcji, zapamiętanie wyniku w zmiennej.
# 5. Decyzja `if`/`else`: wydatki w budżecie → f-string „ile zostaje";
#    przekroczony → f-string „ile brakuje"; obie kwoty liczone w klamrze
#    i zaokrąglone `round(..., 2)`.
# 6. Po decyzji, bez wcięcia: podsumowanie z sumą wydatków i liczbą
#    pozycji (`len`).
#
# Przetestuj dwa przebiegi: budżet powyżej i poniżej sumy (zmieniasz tylko
# odpowiedź na input — kod bez zmian). Jeśli pole odpowiedzi się nie
# pojawi — uruchom komórkę jeszcze raz („Pierwsza pomoc F2", poz. 1).
# Ten lab zaliczasz pieczątką.

# %%
# Twój program — pisz tutaj:


# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka". Pieczątka sprawdza listę
# `wydatki`, **wywołuje Twoją funkcję `suma_wydatkow` na własnej próbnej
# liście** (musi policzyć każdą listę, nie tylko Twoją!) i zagląda, czy
# w komórce programu są `input(` oraz `if`/`else` — dopiero wtedy liczy
# token.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    brak = [n for n in ("wydatki", "suma_wydatkow") if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            'Napisz program w komórce „Twój program" wg specyfikacji i URUCHOM ją.'
        )
    wydatki = g["wydatki"]
    if not isinstance(wydatki, list) or len(wydatki) < 5:
        raise RuntimeError(
            "`wydatki` powinno być listą co najmniej PIĘCIU kwot "
            "(punkt 1 specyfikacji) — popraw dane i uruchom program ponownie."
        )
    if not all(isinstance(w, (int, float)) and not isinstance(w, bool) for w in wydatki):
        raise RuntimeError(
            "Wszystkie pozycje `wydatki` powinny być liczbami (bez cudzysłowów)."
        )
    if not callable(g["suma_wydatkow"]):
        raise RuntimeError(
            "`suma_wydatkow` nie jest funkcją — zdefiniuj ją słowem `def` "
            "(punkt 2 specyfikacji) i uruchom komórkę programu ponownie."
        )
    try:
        sonda = g["suma_wydatkow"]([1, 2, 3])
    except Exception as blad:  # noqa: BLE001 — komunikat dla studenta
        raise RuntimeError(
            "Wywołanie suma_wydatkow([1, 2, 3]) zatrzymało się błędem: "
            + str(blad)
            + " — funkcja ma liczyć sumę KAŻDEJ podanej listy."
        ) from None
    if sonda is None:
        raise RuntimeError(
            "suma_wydatkow([1, 2, 3]) zwróciła None — w funkcji został "
            "print zamiast `return` (F2.6). Dopisz return i uruchom ponownie."
        )
    if isinstance(sonda, bool) or not isinstance(sonda, (int, float)) or abs(sonda - 6) >= 0.01:
        raise RuntimeError(
            "suma_wydatkow([1, 2, 3]) powinna zwrócić 6, a zwróciła "
            + repr(sonda)
            + ". Najczęstsza przyczyna: pętla w funkcji idzie po globalnej "
            "liście `wydatki` zamiast po PARAMETRZE (hint 3 drabinki)."
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
        and "suma_wydatkow" in zrodlo
        and "_zbierz_wyniki" not in zrodlo
    ]
    if not kandydaci:
        raise RuntimeError(
            "Nie znajduję w tej sesji komórki z Twoim programem — napisz go "
            'w komórce „Twój program" i URUCHOM, zanim odbijesz pieczątkę.'
        )
    # Ostatni kandydat z KOMPLETEM: input( oraz if/else — komórka
    # diagnostyczna po programie nie może przesłonić programu (lekcja F1.7).
    z_kompletem = [
        z for z in kandydaci if "input(" in z and "if" in z and "else" in z
    ]
    if not z_kompletem:
        raise RuntimeError(
            "W programie mają być: pobranie budżetu przez input() (punkt 3) "
            "oraz decyzja if/else (punkt 5) — dopisz brakujące i uruchom "
            "komórkę programu ponownie."
        )
    zrodlo = z_kompletem[-1]
    if len(zrodlo) > 2500:
        raise RuntimeError(
            "Komórka programu jest bardzo długa — zostaw w niej sam program "
            "(kilkanaście linii wystarczy) i uruchom ją ponownie."
        )
    return {
        "wydatki": wydatki,
        "sonda_suma_wydatkow": sonda,
        "_zrodlo": zrodlo,
    }
