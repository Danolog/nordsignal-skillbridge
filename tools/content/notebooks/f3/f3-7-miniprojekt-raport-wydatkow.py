# %% [markdown]
# # F3.7 — MINI-PROJEKT „Tygodniowy raport wydatków"
#
# **SkillBridge · ścieżka Data Science · moduł F3 „Dane w Pythonie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Pierwsza samodzielna praca od zera do raportu (pełna specyfikacja
# i drabinka podpowiedzi w SkillBridge). Zbuduj **raport swoich wydatków
# z tygodnia**:
#
# 1. **Dane** — lista `wydatki` z co najmniej **8 rekordami**; rekord to
#    słownik z kluczami `"nazwa"` (tekst), `"kategoria"` (tekst; użyj
#    co najmniej 3 różnych kategorii) i `"kwota"` (liczba). Dane wpisujesz
#    w kod (bez input — raport ma być powtarzalny).
# 2. **Funkcja `suma_wszystkich(wydatki)`** — zwraca sumę pól `"kwota"`.
# 3. **Funkcja `suma_kategorii(wydatki, kategoria)`** — dwa parametry:
#    zwraca sumę kwot rekordów o podanej kategorii.
# 4. **Funkcja `najdrozszy(wydatki)`** — zwraca REKORD (cały słownik)
#    o największej kwocie (śledzenie lidera; start od `wydatki[0]`).
# 5. **Raport** — wypisany f-stringami, kwoty przez `round(..., 2)`:
#    suma tygodnia, suma dla każdej z Twoich kategorii, nazwa i kwota
#    najdroższego wydatku, liczba pozycji (`len`).
#
# Buduj przyrostowo (L0.4): najpierw dane i `suma_wszystkich` z printem;
# kolejne funkcje dopiero, gdy poprzednia się zgadza. Zaliczenie: trzy
# kamienie milowe sprawdzane pieczątką (poniżej).

# %%
# Twój program — pisz tutaj:


# %% [markdown]
# ## Pieczątka — zalicz mini-projekt w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token**. Pieczątka sprawdza trzy kamienie: **K1** strukturę
# `wydatki` (≥8 rekordów, komplet kluczy, ≥3 kategorie), **K2** — wywołuje
# WSZYSTKIE trzy Twoje funkcje na własnej próbnej tabeli (muszą policzyć
# każdą tabelę, nie tylko Twoją), **K3** — spójność: suma całości równa się
# sumie po kategoriach wyprowadzonych z TWOICH danych. Uwaga (jawny limit):
# samego WYDRUKU raportu pieczątka nie widzi — literówkę kategorii
# w print-ach porównaj z danymi sam(a).

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    brak = [
        n
        for n in ("wydatki", "suma_wszystkich", "suma_kategorii", "najdrozszy")
        if n not in g
    ]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            'Napisz program w komórce „Twój program" wg specyfikacji i URUCHOM ją.'
        )
    wydatki = g["wydatki"]
    # K1 — struktura danych.
    if not isinstance(wydatki, list) or len(wydatki) < 8:
        raise RuntimeError(
            "K1: `wydatki` powinno być listą co najmniej 8 rekordów "
            "(punkt 1 specyfikacji) — uzupełnij dane i uruchom program ponownie."
        )
    for rekord in wydatki:
        if not isinstance(rekord, dict) or not all(
            k in rekord for k in ("nazwa", "kategoria", "kwota")
        ):
            raise RuntimeError(
                "K1: każdy rekord ma być słownikiem z kluczami "
                '"nazwa", "kategoria", "kwota" — porównaj rekordy znak po znaku '
                "(literówka klucza = KeyError dopiero w pętli)."
            )
        if isinstance(rekord["kwota"], bool) or not isinstance(rekord["kwota"], (int, float)):
            raise RuntimeError('K1: pole "kwota" każdego rekordu ma być liczbą.')
        if not isinstance(rekord["nazwa"], str) or not isinstance(rekord["kategoria"], str):
            raise RuntimeError('K1: pola "nazwa" i "kategoria" mają być tekstami.')
    kategorie = []
    for rekord in wydatki:
        if rekord["kategoria"] not in kategorie:
            kategorie.append(rekord["kategoria"])
    if len(kategorie) < 3:
        raise RuntimeError(
            "K1: użyj co najmniej 3 RÓŻNYCH kategorii (masz: "
            + ", ".join(kategorie)
            + ") — uzupełnij dane i uruchom program ponownie."
        )
    for nazwa in ("suma_wszystkich", "suma_kategorii", "najdrozszy"):
        if not callable(g[nazwa]):
            raise RuntimeError("`" + nazwa + "` nie jest funkcją — zdefiniuj ją słowem def.")
    # K2 — sonda wielofunkcyjna na WŁASNEJ próbnej tabeli pieczątki.
    probka = [
        {"nazwa": "test-a", "kategoria": "alfa", "kwota": 10.0},
        {"nazwa": "test-b", "kategoria": "beta", "kwota": 5.5},
        {"nazwa": "test-c", "kategoria": "alfa", "kwota": 4.5},
    ]
    ref_all = 0
    for rekord in probka:
        ref_all = ref_all + rekord["kwota"]
    ref_alfa = 0
    for rekord in probka:
        if rekord["kategoria"] == "alfa":
            ref_alfa = ref_alfa + rekord["kwota"]
    ref_top = probka[0]
    for rekord in probka:
        if rekord["kwota"] > ref_top["kwota"]:
            ref_top = rekord
    try:
        s_all = g["suma_wszystkich"](probka)
        s_alfa = g["suma_kategorii"](probka, "alfa")
        top = g["najdrozszy"](probka)
    except Exception as blad:  # noqa: BLE001 — komunikat dla studenta
        raise RuntimeError(
            "K2: wywołanie Twoich funkcji na próbnej tabeli pieczątki "
            "zatrzymało się błędem: " + str(blad) + " — funkcje mają liczyć "
            "KAŻDĄ podaną tabelę (pętla po parametrze, nie po globalnych danych)."
        ) from None
    if s_all is None or s_alfa is None:
        raise RuntimeError(
            "K2: funkcja zwróciła None — w ciele został print zamiast "
            "`return` (F2.6). Dopisz return i uruchom program ponownie."
        )
    if (
        isinstance(s_all, bool)
        or not isinstance(s_all, (int, float))
        or abs(s_all - ref_all) >= 0.01
    ):
        raise RuntimeError(
            "K2: suma_wszystkich na próbnej tabeli powinna zwrócić "
            + str(ref_all)
            + ", a zwróciła "
            + repr(s_all)
            + ". Najczęstsza przyczyna: pętla po globalnej liście `wydatki` "
            "zamiast po PARAMETRZE (lekcja z F2.7)."
        )
    if (
        isinstance(s_alfa, bool)
        or not isinstance(s_alfa, (int, float))
        or abs(s_alfa - ref_alfa) >= 0.01
    ):
        raise RuntimeError(
            "K2: suma_kategorii(probka, \"alfa\") powinna zwrócić "
            + str(ref_alfa)
            + ", a zwróciła "
            + repr(s_alfa)
            + '. Sprawdź bramkę: porównujesz pole "kategoria" z DRUGIM '
            "parametrem funkcji?"
        )
    if not isinstance(top, dict):
        raise RuntimeError(
            "K2: najdrozszy ma zwrócić REKORD (cały słownik), a zwrócił "
            + repr(top)
            + " — return lider, nie lider[\"kwota\"]."
        )
    if top.get("nazwa") != ref_top["nazwa"]:
        raise RuntimeError(
            "K2: najdrozszy wskazał zły rekord na próbnej tabeli — sprawdź "
            "start od wydatki[0] i bramkę > (śledzenie lidera, F3.2)."
        )
    top_kwota = top.get("kwota")
    if (
        top_kwota is None
        or isinstance(top_kwota, bool)
        or not isinstance(top_kwota, (int, float))
        or abs(top_kwota - ref_top["kwota"]) >= 0.01
    ):
        raise RuntimeError(
            "K2: rekord z najdrozszy ma złą albo brakującą kwotę ("
            + repr(top_kwota)
            + " zamiast "
            + str(ref_top["kwota"])
            + ") — zwracaj CAŁY, NIEZMIENIONY rekord z tabeli (return lider), "
            "nie buduj nowego słownika."
        )
    sonda_suma = s_all + s_alfa + top_kwota
    ref_sonda = ref_all + ref_alfa + ref_top["kwota"]
    # K3 — spójność sum na TWOICH danych (kategorie wyprowadzone z danych).
    total = g["suma_wszystkich"](wydatki)
    lacznie = 0
    for kategoria in kategorie:
        lacznie = lacznie + g["suma_kategorii"](wydatki, kategoria)
    if (
        isinstance(total, bool)
        or not isinstance(total, (int, float))
        or abs(total - lacznie) >= 0.01
    ):
        raise RuntimeError(
            "K3: suma całości nie równa się sumie po kategoriach "
            "wyprowadzonych z Twoich danych. Najczęstsza przyczyna: bramka "
            "w suma_kategorii porównuje inny klucz niż \"kategoria\"."
        )
    return {
        "wydatki": [rekord["kwota"] for rekord in wydatki],
        "sonda_suma": sonda_suma,
        "ref_sonda_suma": ref_sonda,
        "suma_wszystkich": total,
        "suma_kategorii_lacznie": lacznie,
    }
