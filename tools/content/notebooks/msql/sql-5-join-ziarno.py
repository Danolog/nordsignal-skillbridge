# %% [markdown]
# # SQL.5 — JOIN i ziarno wiersza: łącz bez mnożenia
#
# **SkillBridge · ścieżka Data Science · moduł M-SQL „SQL: analiza danych w bazie"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Notebook towarzyszy atomowi SQL.5. **Bez pieczątki** — atom zaliczasz
# pytaniami w SkillBridge.
#
# W środku czekają dwie luki — WEWNĄTRZ zapytania oznaczam je sześcioma
# podkreśleniami `______`. Uruchomienie bez uzupełnienia NIE da
# `NameError` jak w Pythonie: silnik weźmie `______` za nazwę kolumny
# i odmówi komunikatem `Binder Error: Referenced column "______" not
# found in FROM clause!`.

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
# Zgrzyt z SQL.2 wraca: fakty (`przejazdy`) noszą tylko `strefa_id`,
# a nazwa strefy siedzi w słowniku (`strefy`). Tak wyglądają prawie
# wszystkie prawdziwe dane — nazwę trzyma się RAZ, nie przy każdym
# z tysięcy przejazdów. Skleja je z powrotem `JOIN`.
#
# **Przewidź, zanim uruchomisz:** przejazdów jest 5, stref 3.
# Ile wierszy będzie miał wynik złączenia?

# %%
duckdb.sql("""
    SELECT p.id, s.nazwa, p.kwota
    FROM przejazdy AS p                  -- alias tabeli: p
    JOIN strefy    AS s                  -- druga tabela: s
      ON p.strefa_id = s.strefa_id       -- WARUNEK łączenia: co pasuje do czego
""")

# %% [markdown]
# **Pięć wierszy** — do każdego przejazdu silnik dopasował jego strefę.
# To jest sedno: **ziarno wyniku = ziarno przejazdów** (jeden wiersz =
# jeden przejazd, teraz z nazwą strefy). Pytanie „czy po złączeniu jeden
# wiersz nadal znaczy to samo, co przed?" to najważniejsze pytanie
# analitycznego SQL-a.
#
# Prefiksy `p.` i `s.` mówią, z której tabeli pochodzi kolumna. Przy
# wspólnej nazwie `strefa_id` są OBOWIĄZKOWE — komórka poniżej CELOWO je
# pomija.

# %%
duckdb.sql("""
    SELECT id, strefa_id, nazwa          -- celowy błąd: strefa_id bez prefiksu
    FROM przejazdy AS p
    JOIN strefy AS s ON p.strefa_id = s.strefa_id
""")

# %% [markdown]
# `Binder Error: Ambiguous reference to column name "strefa_id"` — silnik
# nie zgaduje, o którą z dwóch kolumn Ci chodzi, tylko pyta wprost.
#
# ## Rytuał ziarna: COUNT przed, COUNT po
#
# Po KAŻDYM złączeniu porównaj liczbę wierszy przed i po. Równe? Ziarno
# zachowane, agregaty policzą się uczciwie. Większa po? Mnożysz wiersze.

# %%
duckdb.sql("""
    SELECT COUNT(*) AS wierszy, SUM(kwota) AS suma
    FROM przejazdy                       -- stan PRZED złączeniem
""")

# %% [markdown]
# Teraz to samo po złączeniu — uzupełnij warunek `ON`: po lewej kolumna
# z aliasu przejazdów, po prawej ta sama kolumna z aliasu stref.

# %%
duckdb.sql("""
    SELECT COUNT(*) AS wierszy, SUM(p.kwota) AS suma
    FROM przejazdy AS p
    JOIN strefy AS s
      ON ______ = ______                 -- luki: warunek łączenia
""")

# %% [markdown]
# ## Antyprzykład: iloczyn kartezjański
#
# Zapomnij warunku `ON` — napisz `FROM przejazdy, strefy` — a silnik
# sklei KAŻDY przejazd z KAŻDĄ strefą. Bez błędu, bez ostrzeżenia.

# %%
duckdb.sql("SELECT COUNT(*) AS wierszy, SUM(kwota) AS suma FROM przejazdy, strefy")

# %% [markdown]
# 15 wierszy zamiast 5 (bo 5 × 3) i suma 504.0 zamiast 168.0 — każda
# kwota weszła do sumy TRZY razy. Wynik wygląda wiarygodnie i jest
# fałszywy: najgroźniejsze błędy nie mają komunikatu. Rytuał `COUNT`
# przed/po łapie to w dwie sekundy.
#
# Ostatnia rzecz o zwykłym `JOIN`-ie: **gubi wiersze bez pary**. Przejazd
# ze strefą spoza słownika po prostu zniknie z wyniku — cicho. Gdy
# WSZYSTKIE wiersze lewej tabeli mają zostać (a brakująca para ma wrócić
# jako pustka), piszesz `LEFT JOIN`. To decyzja analityczna, nie
# techniczna — zapisz ją komentarzem, tak jak decyzje o brakach w PD.5.
# W naszym mini-świecie par nie brakuje; na danych NYC bywa różnie.
