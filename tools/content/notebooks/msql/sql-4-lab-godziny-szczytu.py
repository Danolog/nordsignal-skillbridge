# %% [markdown]
# # SQL.4 — LAB „Godziny szczytu"
#
# **SkillBridge · ścieżka Data Science · moduł M-SQL „SQL: analiza danych w bazie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Trzy zapytania rosnącej mocy na mini-świecie capstone'u: podgląd →
# przesiew z porządkiem → agregacja per grupa. Uzupełnij pięć luk
# (`______`) i uruchamiaj komórki od góry. Ten lab zaliczasz pieczątką.
#
# ⚠ Luki siedzą **wewnątrz zapytań SQL**, więc nieuzupełniona luka nie da
# `NameError` jak w Pythonie. Zobaczysz:
#
# ```
# Binder Error: Referenced column "______" not found in FROM clause!
# ```
#
# Silnik uznaje `______` za **nazwę kolumny** i skarży się, że takiej nie
# ma — to znak „tu została luka", a nie błąd składni. Podział ról z SQL.1
# działa dalej: *Catalog Error* = nie znam TABELI, *Parser Error* = nie
# rozumiem SKŁADNI, *Binder Error* = nie znam takiej KOLUMNY.

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
# ## Z1 — obejrzyj tabelę (rytuał!)
#
# Zanim o cokolwiek zapytasz, popatrz na dane — ten rytuał znasz z PD.2.
#
# Luka 1: ile wierszy pokazać, żeby zobaczyć CAŁĄ tę małą tabelę?
#
# **Przewidź, zanim uruchomisz:** ile wierszy wypisze `z1`?

# %%
z1 = duckdb.sql("SELECT * FROM przejazdy LIMIT ______").df()   # luka 1
z1

# %% [markdown]
# ## Z2 — przejazdy dłuższe niż 10 minut, od najdłuższego
#
# Dwa klocki naraz: `WHERE` przesiewa wiersze, `ORDER BY` je porządkuje.
#
# - Luka 2: warunek — kolumna `minuty` większa od 10.
# - Luka 3: po której kolumnie porządkujesz malejąco (`DESC`)?
#
# **Przewidź, zanim uruchomisz:** ile wierszy zostanie i który przejazd
# stanie na czele?

# %%
z2 = duckdb.sql("""
    SELECT id, minuty, kwota
    FROM przejazdy
    WHERE ______                                              -- luka 2
    ORDER BY ______ DESC                                      -- luka 3
""").df()
z2

# %% [markdown]
# ## Z3 — ile przejazdów i jaka suma kwot w każdej godzinie?
#
# `GROUP BY` zwija wiersze w grupy, a agregaty liczą po jednej wartości
# na grupę.
#
# - Luka 4: agregat, który liczy WIERSZE w grupie.
# - Luka 5: agregat, który SUMUJE kolumnę `kwota`.
#
# **Przewidź, zanim uruchomisz:** ile wyjdzie grup i która godzina stanie
# na czele?

# %%
z3 = duckdb.sql("""
    SELECT
        godzina,
        ______   AS liczba,                                   -- luka 4
        ______   AS suma_kwot                                 -- luka 5
    FROM przejazdy
    GROUP BY godzina
    ORDER BY suma_kwot DESC
""").df()
z3

# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka".
#
# Pieczątka wykonuje **własną kopię** wszystkich trzech zapytań na tabeli
# `przejazdy` i porównuje wynik z Twoimi `z1`–`z3`. Czego NIE sprawdza:
# czy zapytanie napisałeś(-aś) samodzielnie ani czy jest ładnie
# sformatowane — lab bramkuje postęp, nie wystawia kredencjału.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    brak = [n for n in ("duckdb", "pd", "przejazdy", "z1", "z2", "z3") if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            "Uzupełnij luki i uruchom komórki Z1-Z3 (wyżej), od góry."
        )
    duckdb = g["duckdb"]
    pd = g["pd"]
    przejazdy = g["przejazdy"]

    # 1) Kontrakt danych wejściowych — komórka „Dane" musi być nietknięta.
    if len(przejazdy) != 5:
        raise RuntimeError(
            "tabela `przejazdy` ma " + str(len(przejazdy)) + " wierszy zamiast 5 "
            "— przywróć komórkę 'Dane' do pierwotnej postaci (checki są policzone "
            "z tych pięciu przejazdów)."
        )
    if abs(float(przejazdy["kwota"].sum()) - 168.0) >= 0.01 or int(przejazdy["minuty"].sum()) != 91:
        raise RuntimeError(
            "wartości w `przejazdy` nie zgadzają się z oryginałem (suma kwot ma "
            "wynosić 168.0, suma minut 91) — przywróć komórkę 'Dane'."
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

    # 3) Niezależne przeliczenie referencyjne — własna kopia SQL-a.
    ref1 = duckdb.sql("SELECT * FROM przejazdy").df()
    ref2 = duckdb.sql(
        "SELECT id, minuty, kwota FROM przejazdy WHERE minuty > 10 ORDER BY minuty DESC"
    ).df()
    ref3 = duckdb.sql(
        "SELECT godzina, COUNT(*) AS liczba, SUM(kwota) AS suma_kwot "
        "FROM przejazdy GROUP BY godzina ORDER BY suma_kwot DESC"
    ).df()

    if len(z1) != len(ref1):
        raise RuntimeError(
            "`z1` ma " + str(len(z1)) + " wierszy, a cała tabela ma " + str(len(ref1))
            + " — luka 1 to LIMIT: wpisz liczbę, która pokaże wszystkie wiersze."
        )
    if len(z2) != len(ref2):
        raise RuntimeError(
            "`z2` ma " + str(len(z2)) + " wierszy, a przejazdów dłuższych niż "
            "10 minut jest " + str(len(ref2)) + " — sprawdź warunek w luce 2 "
            "(kolumna minuty, ostry warunek 'większe niż')."
        )
    if len(z2) == 0:
        raise RuntimeError(
            "`z2` jest puste — warunek w luce 2 nie przepuścił żadnego wiersza; "
            "porównaj kolumnę minuty z liczbą 10."
        )
    if int(z2["id"].iloc[0]) != int(ref2["id"].iloc[0]):
        raise RuntimeError(
            "na czele `z2` stoi przejazd id=" + str(int(z2["id"].iloc[0]))
            + ", a powinien id=" + str(int(ref2["id"].iloc[0])) + " (najdłuższy). "
            "Sprawdź lukę 3: porządkujesz po kolumnie minuty, malejąco."
        )
    if len(z3) != len(ref3):
        raise RuntimeError(
            "`z3` ma " + str(len(z3)) + " grup zamiast " + str(len(ref3))
            + " — grupujesz po kolumnie godzina; nie dokładaj innych kolumn "
            "do GROUP BY."
        )
    kolumny3 = [str(k) for k in z3.columns]
    if "suma_kwot" not in kolumny3 or "liczba" not in kolumny3:
        raise RuntimeError(
            "`z3` nie ma kolumn `liczba` i `suma_kwot` (ma: " + ", ".join(kolumny3)
            + ") — nazwy po AS są częścią specyfikacji, zostaw je bez zmian."
        )
    if int(z3["godzina"].iloc[0]) != int(ref3["godzina"].iloc[0]):
        raise RuntimeError(
            "na czele `z3` stoi godzina " + str(int(z3["godzina"].iloc[0]))
            + ", a powinna " + str(int(ref3["godzina"].iloc[0]))
            + " — porządek jest po sumie kwot malejąco (ORDER BY suma_kwot DESC)."
        )
    if abs(float(z3["suma_kwot"].iloc[0]) - float(ref3["suma_kwot"].iloc[0])) >= 0.01:
        raise RuntimeError(
            "suma kwot na czele `z3` to " + str(float(z3["suma_kwot"].iloc[0]))
            + ", a powinna " + str(float(ref3["suma_kwot"].iloc[0]))
            + " — luka 5 ma sumować kolumnę kwota (SUM), nie liczyć wierszy."
        )
    if int(z3["liczba"].iloc[0]) != int(ref3["liczba"].iloc[0]):
        raise RuntimeError(
            "kolumna `liczba` na czele `z3` to " + str(int(z3["liczba"].iloc[0]))
            + ", a powinna " + str(int(ref3["liczba"].iloc[0]))
            + " — luka 4 ma liczyć WIERSZE w grupie (COUNT)."
        )

    return {
        "z1_wiersze": int(len(z1)),
        "z2_wiersze": int(len(z2)),
        "z2_pierwszy_id": int(z2["id"].iloc[0]),
        "z3_grupy": int(len(z3)),
        "z3_top_godzina": int(z3["godzina"].iloc[0]),
        "z3_top_suma": float(z3["suma_kwot"].iloc[0]),
    }
