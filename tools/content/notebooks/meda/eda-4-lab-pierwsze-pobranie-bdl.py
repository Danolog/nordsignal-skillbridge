# %% [markdown]
# # EDA.4 — LAB „Pierwsze pobranie z BDL"
#
# **SkillBridge · ścieżka Data Science · moduł M-EDA „EDA: od API do repozytorium"**
#
# Najpierw kopia: **Plik → Zapisz kopię na Dysku** — dalej pracuj w karcie
# „Kopia…".
#
# Pełna ścieżka capstone'u w miniaturze: prawdziwe zapytanie do BDL →
# zagnieżdżony JSON → spłaszczenie pętlą → DataFrame → jeden wykres.
# Uzupełnij luki (`______`) i uruchamiaj komórki od góry: cztery są
# w kodzie (1, 2, 4, 5), a luka 3 to przewidywanie „w głowie".
# Ten lab zaliczasz pieczątką.
#
# ⚠ Nieuzupełniona luka daje:
#
# ```
# NameError: name '______' is not defined
# ```
#
# Python czyta `______` jako **nazwę zmiennej**, której nikt nie
# stworzył — to znak „tu została luka", a nie błąd składni.
#
# ⚠ Ten notebook wychodzi do internetu. Status `429` = BDL prosi
# o zwolnienie (100 zapytań na 15 minut anonimowo): odczekaj chwilę
# i uruchom komórkę ponownie.

# %%
import requests
import pandas as pd

# --- zapytanie (gotowe — zweryfikowane, działa) ---
url = "https://bdl.stat.gov.pl/api/v1/data/by-variable/60270"   # stopa bezrobocia rej.
parametry = {"unit-level": 2, "year": [2022, 2023], "format": "json", "page-size": 20}
odpowiedz = requests.get(url, params=parametry)
print(odpowiedz.status_code)              # ma być 200 — EDA.1!

dane = odpowiedz.json()

# %% [markdown]
# ## Obejrzyj, zanim spłaszczysz
#
# Nie zgaduj nazw pól — popatrz na jeden rekord. Zobaczysz w nim klucze
# rekordu-województwa i LISTĘ pomiarów w środku (po jednym na rok).

# %%
dane["results"][0]

# %% [markdown]
# ## Spłaszczenie: zagnieżdżony JSON → lista rekordów
#
# Pętla w pętli czyta się jak zdanie: „dla każdego województwa, dla
# każdego jego pomiaru — dołóż płaski rekord".
#
# - **Luka 1:** klucz z NAZWĄ województwa.
# - **Luka 2:** klucz z WARTOŚCIĄ pomiaru (nie z rokiem!).
#
# **Przewidź, zanim uruchomisz:** ile płaskich rekordów powstanie z 16
# województw po 2 pomiary?

# %%
rekordy = []
for wojewodztwo in dane["results"]:       # rekord-województwo ma w środku LISTĘ pomiarów
    for pomiar in wojewodztwo["values"]:  # pętla w pętli: dla każdego pomiaru…
        rekordy.append({
            "wojewodztwo": wojewodztwo[______],   # luka 1: pole z nazwą (podejrzyj JSON!)
            "rok": int(pomiar["year"]),           # rok wraca jako TEKST → konwersja (F2.1)
            "stopa": pomiar[______],              # luka 2: pole z wartością
        })

df = pd.DataFrame(rekordy)
print(len(df))                            # luka 3 (w głowie): ile rekordów oczekujesz?

# %% [markdown]
# ## Rytuał PD.2 i pierwszy wynik
#
# Najpierw popatrz na tabelę, potem licz.

# %%
df.head()

# %% [markdown]
# Teraz średnia stopa w każdym roku.
#
# - **Luka 4:** po której kolumnie grupujesz?
# - **Luka 5:** którą kolumnę uśredniasz?
#
# Nazwa `srednie_rok` jest **częścią specyfikacji** — pieczątka musi
# wiedzieć, gdzie patrzeć. Nie zmieniaj jej.
#
# **Przewidź, zanim uruchomisz:** ile linii wypisze wynik?
#
# ⚠ Jeśli w luce 2 (wyżej) podałeś(-aś) klucz z ROKIEM zamiast
# z wartością, TA komórka wywali:
#
# ```
# TypeError: agg function failed …
# ```
#
# W nawiasie kwadratowym pandas dokleja szczegóły (`how->mean`,
# `dtype->object`) — i to `dtype->object` jest tu prawdziwą wskazówką:
# oznacza kolumnę NIELICZBOWĄ, czyli że próbujesz uśrednić tekst. Błąd
# wyskakuje przy średniej, ale mieszka w luce 2 — wróć tam i uruchom
# komórki od nowa.

# %%
srednie_rok = df.groupby(______)[______].mean()   # luki 4-5: średnia stopa per rok
srednie_rok                               # nazwa w ostatniej linii = pokaż wynik

# %% [markdown]
# Dwie linie — po jednej na rok — a wartości rzędu kilku procent
# (to stopy procentowe, więc sprawdź rząd wielkości: kilka, nie kilkaset).
#
# ## Twój wykres
#
# Dorysuj trend dla JEDNEGO województwa: sito po kolumnie `wojewodztwo`
# (PD.3) → linia z opisanymi osiami i tytułem (PD.7). Przy dwóch latach
# wyjdzie skromnie — w capstonie pobierzesz więcej lat.
#
# Nazwy województw w odpowiedzi BDL są WIELKIMI literami — sprawdź
# w `df.head()`, zanim wpiszesz warunek.

# %%
# Twój wykres — pisz tutaj:


# %% [markdown]
# ## Pieczątka — zalicz ten lab w SkillBridge
#
# Uruchom komórkę poniżej, przepisz **kod atomu** z SkillBridge i przenieś
# wypisany **token** do pola „Pieczątka".
#
# Pieczątka sprawdza stan Twojej sesji: status udanego pobrania, kształt
# `df` (3 kolumny, 32 wiersze), typ kolumny `rok` (konwersja wykonana!)
# i zgodność `srednie_rok` z **niezależnym przeliczeniem** grupowania na
# Twoim `df`.
#
# Jawne limity: pieczątka **NIE odpytuje API ponownie** (chwilowa
# niedostępność BDL nie blokuje Ci tokenu — liczy się stan sesji po
# Twoim udanym pobraniu) i **nie ocenia wykresu** — ten sprawdź sam(a)
# wg PD.7, a przy capstonie zrobi to rubryka i viva.

# %% [pieczatka]
def _zbierz_wyniki():
    g = globals()
    brak = [n for n in ("pd", "odpowiedz", "df", "srednie_rok") if n not in g]
    if brak:
        raise RuntimeError(
            "Nie widzę w tej sesji: " + ", ".join(brak) + ". "
            "Uzupełnij luki i uruchom komórki od góry (L0.3) — pieczątka "
            "czyta stan sesji, nie plik."
        )
    pd = g["pd"]
    odpowiedz = g["odpowiedz"]
    df = g["df"]
    srednie_rok = g["srednie_rok"]

    # 1) Status pobrania — z sesji, BEZ ponownego zapytania (jawny limit).
    status = getattr(odpowiedz, "status_code", None)
    if not isinstance(status, int):
        raise RuntimeError(
            "`odpowiedz` nie wygląda na odpowiedź serwera (nie ma "
            "status_code) — uruchom pierwszą komórkę z requests.get(...) "
            "i nie nadpisuj nazwy `odpowiedz`."
        )
    if status != 200:
        raise RuntimeError(
            "status pobrania w tej sesji to " + str(status) + ", a ma być 200. "
            "404 - porównaj adres z EDA.1 znak po znaku; 429 - odczekaj chwilę "
            "i uruchom pierwszą komórkę ponownie; 5xx - problem po stronie BDL, "
            "spróbuj za moment."
        )

    # 2) Kształt tabeli — kontrakt zadania.
    if not isinstance(df, pd.DataFrame):
        raise RuntimeError(
            "`df` nie jest tabelą, tylko obiektem typu " + type(df).__name__
            + " — zbuduj ją z listy rekordów: df = pd.DataFrame(rekordy) (PD.2)."
        )
    kolumny = [str(k) for k in df.columns]
    braki_kolumn = [k for k in ("wojewodztwo", "rok", "stopa") if k not in kolumny]
    if braki_kolumn:
        raise RuntimeError(
            "`df` nie ma kolumn: " + ", ".join(braki_kolumn) + " (ma: "
            + ", ".join(kolumny) + ") — nazwy po lewej stronie w rekordach "
            "są częścią specyfikacji, zostaw je bez zmian."
        )
    if len(kolumny) != 3:
        raise RuntimeError(
            "liczba kolumn w `df` to " + str(len(kolumny)) + ", a ma być 3 "
            "(wojewodztwo, rok, stopa) — nie dokładaj pól do rekordu."
        )
    if len(df) != 32:
        raise RuntimeError(
            "liczba wierszy w `df` to " + str(len(df)) + ", a ma być 32 "
            "(16 województw x 2 lata). "
            "16 - pętla wewnętrzna nie dołożyła rekordu na KAŻDY pomiar; "
            "20 - odpowiedź przyszła bez page-size, czyli tylko pierwsza strona "
            "(10 województw - paginacja z EDA.1); inna liczba - sprawdź parametry "
            "zapytania w pierwszej komórce."
        )

    # 3) Luki 1-2: czy w kolumnach są WŁAŚCIWE pola JSON-a.
    # Uwaga: `id` jednostki w BDL też jest TEKSTEM (np. 011200000000), więc sam
    # typ kolumny nie odróżnia nazwy od identyfikatora — szukamy liter.
    nazwy = [str(w) for w in df["wojewodztwo"].tolist()]
    if not any(any(znak.isalpha() for znak in n) for n in nazwy):
        raise RuntimeError(
            "kolumna `wojewodztwo` nie zawiera nazw, tylko identyfikatory "
            "(pierwsza wartość: " + nazwy[0] + ") — w luce 1 podaj klucz "
            "z NAZWĄ województwa, nie z numerem jednostki; obejrzyj rekord "
            "komórką dane['results'][0]."
        )
    if not pd.api.types.is_numeric_dtype(df["stopa"]):
        raise RuntimeError(
            "kolumna `stopa` nie jest liczbą — w luce 2 podaj klucz "
            "z WARTOŚCIĄ pomiaru, nie z rokiem (rok już masz w osobnej kolumnie)."
        )
    if not pd.api.types.is_numeric_dtype(df["rok"]):
        raise RuntimeError(
            "kolumna `rok` nie jest liczbą — API oddaje rok jako tekst, "
            'np. "2022"; zostaw konwersję int(pomiar["year"]) przy spłaszczaniu, '
            "inaczej oś czasu na wykresie zachowa się dziwnie (F2.1)."
        )

    # 4) Luki 4-5: niezależne przeliczenie grupowania na TWOIM df.
    ref_srednie = df.groupby("rok")["stopa"].mean()
    # Równoważne zapisy grupowania mają przechodzić: as_index=False oddaje
    # TABELĘ z kolumną rok, a .mean(numeric_only=True) — tabelę z indeksem rok.
    wynik = srednie_rok
    if isinstance(wynik, pd.DataFrame):
        if "rok" in wynik.columns and "stopa" in wynik.columns:
            wynik = wynik.set_index("rok")["stopa"]
        elif "stopa" in wynik.columns:
            wynik = wynik["stopa"]
    if not isinstance(wynik, pd.Series):
        raise RuntimeError(
            "`srednie_rok` powinno być wynikiem groupby(...)[...].mean() — "
            "serią średnich per rok; teraz jest to " + type(srednie_rok).__name__
            + " (luki 4-5: grupujesz po kolumnie rok, uśredniasz kolumnę stopa)."
        )
    if set(wynik.index) != set(ref_srednie.index):
        grupy = sorted(str(i) for i in wynik.index)
        if len(grupy) <= 4:
            opis = ", ".join(grupy)
        else:
            opis = str(len(grupy)) + " grup (" + grupy[0] + ", " + grupy[1] + ", ...)"
        raise RuntimeError(
            "`srednie_rok` ma grupy: " + opis + ", a mają być lata: "
            + ", ".join(sorted(str(i) for i in ref_srednie.index))
            + " — w luce 4 grupujesz po kolumnie rok (po województwie wyjdzie "
            "16 grup, a pytanie brzmi: średnia w każdym ROKU)."
        )
    for rok in list(ref_srednie.index):
        if abs(float(wynik[rok]) - float(ref_srednie[rok])) >= 0.01:
            raise RuntimeError(
                "średnia dla roku " + str(rok) + " nie zgadza się z niezależnym "
                "przeliczeniem pieczątki — w luce 5 uśredniaj kolumnę stopa "
                "i licz na całym `df`, potem uruchom tamtą komórkę ponownie."
            )

    return {
        "status": int(status),
        "kolumny": int(len(kolumny)),
        "wiersze": int(len(df)),
        "rok_liczbowy": True,
        "srednie_zgodne": True,
    }
