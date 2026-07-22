# %% [markdown]
# # SQL.7 — LAB „Raport stref" (samodzielny finał)
#
# **SkillBridge · ścieżka Data Science · moduł M-SQL „SQL: analiza danych w bazie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Tu nie ma luk do uzupełnienia — **piszesz sam(a)**, tak jak napiszesz na
# capstonie. Trzy zapytania raportu: złączenie ze słownikiem, agregat per
# strefa i ranking oknem. Każde w osobnym wywołaniu `duckdb.sql(...)`,
# wynik zapisany pod nazwą **`z1`**, **`z2`**, **`z3`** (z `.df()` na końcu)
# — nazwy są częścią specyfikacji, bo pieczątka musi wiedzieć, gdzie
# patrzeć.
#
# ⚠ Komórki poniżej mają w środku sam komentarz — dopóki nie wpiszesz
# zapytania, zobaczysz:
#
# ```
# AttributeError: 'NoneType' object has no attribute 'df'
# ```
#
# To nie usterka notebooka: `duckdb.sql(...)` nie dostał ŻADNEGO zapytania
# (sam komentarz `--` to dla silnika pusty tekst), więc nie ma czego
# zamienić na tabelę. Wpisz zapytanie w miejsce komentarza i uruchom
# komórkę ponownie.

# %%
import duckdb
import pandas as pd

przejazdy = pd.DataFrame([
    {"id": 1, "strefa_id": 10, "minuty": 12, "kwota": 23.5, "godzina": 8},
    {"id": 2, "strefa_id": 20, "minuty": 35, "kwota": 61.0, "godzina": 8},
    {"id": 3, "strefa_id": 10, "minuty": 7,  "kwota": 14.0, "godzina": 9},
    {"id": 4, "strefa_id": 30, "minuty": 22, "kwota": 41.5, "godzina": 17},
    {"id": 5, "strefa_id": 10, "minuty": 15, "kwota": 28.0, "godzina": 17},
])
strefy = pd.DataFrame([
    {"strefa_id": 10, "nazwa": "Manhattan"},
    {"strefa_id": 20, "nazwa": "Brooklyn"},
    {"strefa_id": 30, "nazwa": "Queens"},
])

# %% [markdown]
# ## Z1 — złączenie ze słownikiem
#
# Wszystkie przejazdy z NAZWĄ strefy: `id`, `nazwa`, `minuty`, `kwota`.
#
# Najpierw **rytuał ziarna** z SQL.5: policz `COUNT(*)` przed złączeniem
# i po nim. Jeśli po JOIN-ie wierszy przybyło — masz kartezjan i zgubiony
# warunek `ON`.

# %%
# Twój raport — Z1 (rytuał COUNT przed/po, potem złączenie):
z1 = duckdb.sql("""
    -- napisz tutaj złączenie przejazdów ze strefami
""").df()
z1

# %% [markdown]
# **Zapisz jednym zdaniem** wynik rytuału COUNT: ile wierszy było przed
# złączeniem, ile po, i co to znaczy. (To zdanie nie idzie do pieczątki —
# ćwiczysz formę, którą oceni rubryka capstone'u.)
#
# *Tu wpisz swoje zdanie.*

# %% [markdown]
# ## Z2 — agregat per strefa
#
# Nazwa strefy, liczba przejazdów, suma kwot — od najwyższej sumy.
# Uwaga: grupujesz po WYNIKU złączenia, bo nazwa strefy pochodzi ze
# słownika.
#
# Nazwy kolumn wynikowych: `nazwa`, `liczba`, `suma_kwot`.

# %%
# Twój raport — Z2 (JOIN + GROUP BY w jednym zapytaniu):
z2 = duckdb.sql("""
    -- napisz tutaj agregat per strefa
""").df()
z2

# %% [markdown]
# ## Z3 — ranking oknem
#
# `id`, nazwa strefy, `kwota` oraz **miejsce** przejazdu w rankingu
# najdroższych SWOJEJ strefy. Funkcja okna z SQL.6 — pamiętaj, że okno
# NIE zjada wierszy: w wyniku ma zostać tyle samo przejazdów, ile jest
# w tabeli.

# %%
# Twój raport — Z3 (JOIN + funkcja okna):
z3 = duckdb.sql("""
    -- napisz tutaj ranking oknem
""").df()
z3

# %% [markdown]
# **Zapisz jedno zdanie:** dlaczego tu okno, a nie `GROUP BY`? (Wzorzec
# uzasadnienia z SQL.6 — to kryterium rubryki. Zdanie nie idzie do
# pieczątki.)
#
# *Tu wpisz swoje zdanie.*

# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka".
#
# Pieczątka pisze **własne wersje Z1–Z3** i porównuje je z Twoimi. Czego
# NIE sprawdza: zdań w komórkach tekstowych (oceni je rubryka capstone'u)
# ani tego, czy zapytania napisałeś(-aś) samodzielnie — lab bramkuje
# postęp, nie wystawia kredencjału.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    brak = [n for n in ("duckdb", "pd", "przejazdy", "strefy", "z1", "z2", "z3") if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            "Napisz zapytania Z1-Z3 w komórkach 'Twój raport' i uruchom je od góry."
        )
    duckdb = g["duckdb"]
    pd = g["pd"]
    przejazdy = g["przejazdy"]
    strefy = g["strefy"]

    # 1) Kontrakt danych wejściowych — obie tabele muszą być nietknięte.
    if len(przejazdy) != 5 or len(strefy) != 3:
        raise RuntimeError(
            "dane wejściowe są zmienione (`przejazdy` ma mieć 5 wierszy, `strefy` 3; "
            "jest " + str(len(przejazdy)) + " i " + str(len(strefy))
            + ") — przywróć komórkę 'Dane', bo z niej policzone są checki."
        )
    if abs(float(przejazdy["kwota"].sum()) - 168.0) >= 0.01:
        raise RuntimeError(
            "wartości w `przejazdy` nie zgadzają się z oryginałem (suma kwot ma "
            "wynosić 168.0) — przywróć komórkę 'Dane'."
        )

    # 2) Typy wyników — czy student pamiętał o `.df()`.
    for nazwa in ("z1", "z2", "z3"):
        if not isinstance(g[nazwa], pd.DataFrame):
            raise RuntimeError(
                "`" + nazwa + "` nie jest tabelą, tylko obiektem typu "
                + type(g[nazwa]).__name__ + " — samo `duckdb.sql(...)` zwraca relację; "
                "dopisz na końcu `.df()` (SQL.1), żeby dostać tabelę pandas."
            )
    z1 = g["z1"]
    z2 = g["z2"]
    z3 = g["z3"]

    # 3) Własne wersje Z1-Z3 — referencja liczona niezależnie od studenta.
    ref1 = duckdb.sql(
        "SELECT p.id, s.nazwa, p.minuty, p.kwota "
        "FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id"
    ).df()
    ref2 = duckdb.sql(
        "SELECT s.nazwa, COUNT(*) AS liczba, SUM(p.kwota) AS suma_kwot "
        "FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id "
        "GROUP BY s.nazwa ORDER BY suma_kwot DESC"
    ).df()
    ref3 = duckdb.sql(
        "SELECT p.id, s.nazwa, p.kwota, "
        "ROW_NUMBER() OVER (PARTITION BY s.nazwa ORDER BY p.kwota DESC) AS miejsce "
        "FROM przejazdy AS p JOIN strefy AS s ON p.strefa_id = s.strefa_id"
    ).df()

    # Z1 — ziarno wiersza (kartezjan dałby 15).
    if len(z1) != len(ref1):
        if len(z1) == len(przejazdy) * len(strefy):
            raise RuntimeError(
                "`z1` ma " + str(len(z1)) + " wierszy — to kartezjan: każdy przejazd "
                "sklejony z KAŻDĄ strefą. Zgubiłeś(-aś) warunek `ON p.strefa_id = "
                "s.strefa_id`; wróć do rytuału ziarna z SQL.5."
            )
        raise RuntimeError(
            "`z1` ma " + str(len(z1)) + " wierszy, a powinno " + str(len(ref1))
            + " — złączenie ze słownikiem stref nie zmienia liczby przejazdów."
        )
    if "nazwa" not in [str(k) for k in z1.columns]:
        raise RuntimeError(
            "`z1` nie ma kolumny `nazwa` — to po nią robisz złączenie; dołóż "
            "`s.nazwa` do listy SELECT."
        )

    # Z2 — agregat per strefa.
    kol2 = [str(k) for k in z2.columns]
    for wymagana in ("nazwa", "liczba", "suma_kwot"):
        if wymagana not in kol2:
            raise RuntimeError(
                "`z2` nie ma kolumny `" + wymagana + "` (ma: " + ", ".join(kol2)
                + ") — nazwy kolumn wynikowych są częścią specyfikacji, nadaj je "
                "przez AS."
            )
    if len(z2) != len(ref2):
        raise RuntimeError(
            "`z2` ma " + str(len(z2)) + " wierszy zamiast " + str(len(ref2))
            + " — grupujesz po nazwie strefy, więc wychodzi jeden wiersz na strefę."
        )
    if str(z2["nazwa"].iloc[0]) != str(ref2["nazwa"].iloc[0]):
        raise RuntimeError(
            "na czele `z2` stoi " + str(z2["nazwa"].iloc[0]) + ", a powinien "
            + str(ref2["nazwa"].iloc[0]) + " — porządkuj malejąco po sumie kwot "
            "(ORDER BY suma_kwot DESC)."
        )
    if int(z2["liczba"].iloc[0]) != int(ref2["liczba"].iloc[0]) or abs(
        float(z2["suma_kwot"].iloc[0]) - float(ref2["suma_kwot"].iloc[0])
    ) >= 0.01:
        raise RuntimeError(
            "czołowa strefa w `z2` ma " + str(int(z2["liczba"].iloc[0])) + " przejazdów "
            "i sumę " + str(float(z2["suma_kwot"].iloc[0])) + ", a powinna "
            + str(int(ref2["liczba"].iloc[0])) + " i "
            + str(float(ref2["suma_kwot"].iloc[0]))
            + ". Suma zawyżona ×3? To kartezjan — sprawdź warunek ON."
        )

    # Z3 — ranking oknem. Nazwa kolumny z miejscem nie jest przybita w treści,
    # więc szukamy jej po semantyce: całkowite miejsca o rozkładzie jak referencja.
    if len(z3) != len(ref3):
        raise RuntimeError(
            "`z3` ma " + str(len(z3)) + " wierszy zamiast " + str(len(ref3))
            + " — funkcja okna NIE zjada wierszy (to różnica wobec GROUP BY); "
            "w wyniku ma zostać każdy przejazd."
        )
    wzorzec = sorted(int(v) for v in ref3["miejsce"])
    kolumna_miejsca = None
    for k in z3.columns:
        try:
            wartosci = sorted(int(v) for v in z3[k])
        except (TypeError, ValueError):
            continue
        if wartosci == wzorzec:
            kolumna_miejsca = k
            break
    if kolumna_miejsca is None:
        raise RuntimeError(
            "nie znajduję w `z3` kolumny z MIEJSCEM w rankingu strefy (spodziewam "
            "się miejsc " + str(wzorzec) + " — po jednym pierwszym miejscu na strefę). "
            "Dołóż ROW_NUMBER() OVER (PARTITION BY nazwa strefy ORDER BY kwota DESC) "
            "i nazwij tę kolumnę przez AS."
        )

    return {
        "z1_wiersze": int(len(z1)),
        "z2_top_nazwa": str(z2["nazwa"].iloc[0]),
        "z2_top_liczba": int(z2["liczba"].iloc[0]),
        "z2_top_suma": float(z2["suma_kwot"].iloc[0]),
        "z3_miejsca_1": int(sum(1 for v in z3[kolumna_miejsca] if int(v) == 1)),
    }
