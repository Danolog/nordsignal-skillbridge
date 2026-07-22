# %% [markdown]
# # Sonda środowiska Colab — SkillBridge, ścieżka Data Science
#
# **To nie jest lab.** Ten notebook nie ma pieczątki i nie wystawia tokenu.
# Mierzy, CO NAPRAWDĘ STOI w Colabie w dniu uruchomienia: wersje silników
# i dosłowne brzmienie 31 komunikatów, które nasza treść cytuje
# studentowi. Podstawa: ADR-016 D3.
#
# **Jak uruchomić (≈5 minut):**
#
# 1. **Środowisko wykonawcze → Uruchom wszystko** (Runtime → Run all).
# 2. Poczekaj, aż wykona się ostatnia komórka.
# 3. Skopiuj **CAŁE** wyjście ostatnich trzech komórek.
# 4. Wklej do repozytorium: `docs/curation/sondy/sonda-srodowiska-RRRRMMDD.txt`.
#
# Uruchamiaj w **świeżej sesji** (Środowisko wykonawcze → Uruchom ponownie
# sesję) i **bez** żadnego `pip install` — sonda ma zmierzyć to, co Colab
# daje studentowi z pudełka, a nie to, co sami sobie doinstalujemy.

# %% [markdown]
# ## 1. Wersje silników
#
# Nasza treść jest napisana i zweryfikowana pod piny z
# `tools/content/notebooks/srodowisko-colab.json`:
# `duckdb~=1.3.2`, `pandas~=2.2.0`, `requests~=2.32.0`.
# Jeżeli któryś import poniżej się nie uda — to samo w sobie jest wynikiem
# (treść M-SQL twierdzi, że DuckDB jest w Colabie preinstalowany).

# %%
import importlib.util
import json
import os
import platform
import sys

# GDZIE to biegnie. Sonda ma wartość WYŁĄCZNIE uruchomiona w Colabie —
# przebieg na laptopie mierzy nasze środowisko, nie środowisko studenta.
# Narzędzie zapisu w repo ODRZUCA wynik spoza Colaba, żeby pomiar lokalny
# nie otworzył bramki publikacji na 100 dni fałszywą liczbą.
def _czy_colab():
    # find_spec("google.colab") importuje pakiet nadrzędny google — poza
    # Colabem potrafi rzucić ModuleNotFoundError. Sonda nie ma prawa paść
    # na sprawdzaniu, GDZIE biegnie.
    try:
        return importlib.util.find_spec("google.colab") is not None
    except Exception:
        return False


SRODOWISKO = {
    "colab": _czy_colab(),
    "colab_release_tag": os.environ.get("COLAB_RELEASE_TAG"),
    "platforma": platform.platform(),
}
print("=== GDZIE BIEGNIE SONDA ===")
print("colab      %s" % SRODOWISKO["colab"])
print("release    %s" % (SRODOWISKO["colab_release_tag"] or "—"))
print("platforma  %s" % SRODOWISKO["platforma"])
if not SRODOWISKO["colab"]:
    print("!! To NIE jest sesja Colab. Wynik nadaje się do podglądu, NIE do repo.")

WERSJE = {"python": platform.python_version()}
for _nazwa in ("pandas", "duckdb", "requests"):
    try:
        WERSJE[_nazwa] = __import__(_nazwa).__version__
    except Exception as _e:
        WERSJE[_nazwa] = "BRAK (%s)" % type(_e).__name__

print("=== WERSJE SILNIKÓW W COLABIE ===")
for _k, _v in WERSJE.items():
    print("%-10s %s" % (_k, _v))

# %% [markdown]
# ## 2. Komunikaty silnika — czy treść nadal mówi prawdę
#
# Dla każdego cytatu z treści sonda WYKONUJE fragment kodu, który ten
# komunikat produkuje, i porównuje brzmienie. `ZGODNY` = obietnica wobec
# studenta jest nadal prawdziwa. `ROZJAZD` = student zobaczy co innego,
# niż mówi instrukcja — to jest sygnał do wpisania `"rozjazd": true`
# i tiketu dla Ethana.

# %%
import io
import re
from contextlib import redirect_stdout

PREAMBULY = json.loads(r"""{"python":"","pandas":"import pandas as pd\n","duckdb":"import duckdb\nimport pandas as pd\n\nprzejazdy = pd.DataFrame([\n    {\"id\": 1, \"strefa_id\": 10, \"minuty\": 12, \"kwota\": 23.5, \"godzina\": 8},\n    {\"id\": 2, \"strefa_id\": 20, \"minuty\": 35, \"kwota\": 61.0, \"godzina\": 8},\n    {\"id\": 3, \"strefa_id\": 10, \"minuty\": 7,  \"kwota\": 14.0, \"godzina\": 9},\n    {\"id\": 4, \"strefa_id\": 30, \"minuty\": 22, \"kwota\": 41.5, \"godzina\": 17},\n    {\"id\": 5, \"strefa_id\": 10, \"minuty\": 15, \"kwota\": 28.0, \"godzina\": 17},\n])\nstrefy = pd.DataFrame([\n    {\"strefa_id\": 10, \"nazwa\": \"Manhattan\"},\n    {\"strefa_id\": 20, \"nazwa\": \"Brooklyn\"},\n    {\"strefa_id\": 30, \"nazwa\": \"Queens\"},\n])\n"}""")
CYTATY = json.loads(r"""[{"id":"DB-01","silnik":"duckdb","cytat":"Catalog Error: Table with name przejazdyy does not exist!","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"duckdb.sql(\"SELECT * FROM przejazdyy\")","gdzie":"SQL.1 (hint 3) + notebook sql-1 — rytuał literówki w nazwie tabeli"},{"id":"DB-02","silnik":"duckdb","cytat":"Parser Error: syntax error at or near \"SELCT\"","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"duckdb.sql(\"SELCT id FROM przejazdy\")","gdzie":"SQL.1 (hint 3) + notebook sql-1 — literówka w słowie kluczowym"},{"id":"DB-03","silnik":"duckdb","cytat":"Parser Error: syntax error at end of input","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"duckdb.sql(\"SELECT id, minuty FROM przejazdy ORDER BY\")","gdzie":"notebook sql-6 — zapytanie urwane w połowie"},{"id":"DB-04","silnik":"duckdb","cytat":"Binder Error: Referenced column \"Manhattan\" not found in FROM clause!","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"duckdb.sql('SELECT * FROM strefy WHERE nazwa = \"Manhattan\"')","gdzie":"notebook sql-2 — podwójne cudzysłowy to NAZWA KOLUMNY, nie tekst"},{"id":"DB-05","silnik":"duckdb","cytat":"Binder Error: Referenced column \"Manhattan\" not found","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"duckdb.sql('SELECT * FROM strefy WHERE nazwa = \"Manhattan\"')","gdzie":"SQL.2 (contentMd) — ten sam błąd, cytat urwany przed „in FROM clause!”"},{"id":"DB-06","silnik":"duckdb","cytat":"Binder Error: Referenced column \"______\" not found in FROM clause!","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"duckdb.sql(\"SELECT ______ FROM przejazdy\")","gdzie":"notebooki sql-3, sql-4, sql-5 — nieuzupełniona luka w zapytaniu"},{"id":"DB-07","silnik":"duckdb","cytat":"Binder Error: column \"minuty\" must appear in the GROUP BY clause or must be part of an aggregate function","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"duckdb.sql(\"SELECT strefa_id, minuty, COUNT(*) FROM przejazdy GROUP BY strefa_id\")","gdzie":"SQL.3 (contentMd) + notebook sql-3 — kolumna „luzem” przy grupowaniu"},{"id":"DB-08","silnik":"duckdb","cytat":"Binder Error: Ambiguous reference to column name \"strefa_id\"","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"duckdb.sql(\"SELECT strefa_id FROM przejazdy JOIN strefy ON przejazdy.strefa_id = strefy.strefa_id\")","gdzie":"notebook sql-5 — ta sama nazwa kolumny w obu tabelach JOIN-a"},{"id":"PY-01","silnik":"python","cytat":"NameError: name 'kawa' is not defined","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"kawa","gdzie":"L0.3 (pytanie P2) + notebook l0-3 — sesja po restarcie nie pamięta zmiennej"},{"id":"PY-02","silnik":"python","cytat":"NameError: name 'pd' is not defined","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"pd.DataFrame()","gdzie":"PD.2 (hint 3) — komórka z importem nie została wykonana"},{"id":"PY-03","silnik":"python","cytat":"NameError: name '_luka_' is not defined","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"_luka_","gdzie":"14 notebooków F1–F3/M-PD — nieuzupełniona luka w kodzie"},{"id":"PY-04","silnik":"python","cytat":"NameError: name '______' is not defined","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"______","gdzie":"notebook eda-4 — nieuzupełniona luka (wariant z podkreśleniami)"},{"id":"PY-05","silnik":"python","cytat":"NameError: name 'podroz' is not defined","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"podroz","gdzie":"notebook f2-6 — zmienna lokalna funkcji nie istnieje na zewnątrz"},{"id":"PY-06","silnik":"python","cytat":"NameError: name '…' is not defined","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"dowolna_nieistniejaca_nazwa","gdzie":"L0.4 (hint 3) — schemat komunikatu, nazwa zależna od kodu studenta"},{"id":"PY-07","silnik":"python","cytat":"SyntaxError: expected ':'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"if 1 > 0\n    print(1)\n","gdzie":"F1.6 (contentMd, pytanie P2) + F2.3 (hint 3) — brak dwukropka w nagłówku"},{"id":"PY-08","silnik":"python","cytat":"IndentationError: expected an indented block","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"if 1 > 0:\nprint(1)\n","gdzie":"F1.6 (contentMd) + F2.3 (hint 3) — brak wcięcia pod nagłówkiem"},{"id":"PY-09","silnik":"python","cytat":"Maybe you meant '=='","rodzaj":"komunikat","dopasowanie":"zawiera","kod":"if cena = 65:\n    print(1)\n","gdzie":"F1.5 (contentMd) — podpowiedź interpretera przy pomyleniu `=` z `==`"},{"id":"PY-10","silnik":"python","cytat":"IndexError: list index out of range","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"ceny = [10, 20]\nceny[5]\n","gdzie":"F2.2 (contentMd, hint 3, pytanie P3) — indeks poza listą"},{"id":"PY-11","silnik":"python","cytat":"ZeroDivisionError: division by zero","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"1 / 0","gdzie":"F1.2 (contentMd, pytanie P3) — dzielenie przez zero"},{"id":"PY-12","silnik":"python","cytat":"KeyError: 'cena'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"{\"nazwa\": \"kawa\"}[\"cena\"]","gdzie":"F3.3 (contentMd) — klucz, którego w słowniku nie ma"},{"id":"PY-13","silnik":"python","cytat":"KeyError: 'Danie'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"{\"danie\": \"zupa\"}[\"Danie\"]","gdzie":"F3.3 (hint 3) — wielkość liter w kluczu ma znaczenie"},{"id":"PY-14","silnik":"python","cytat":"KeyError: 'Kategoria'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"{\"kategoria\": \"jedzenie\"}[\"Kategoria\"]","gdzie":"F3.5 (hint 3) — jw., w tabeli rekordów"},{"id":"PY-15","silnik":"python","cytat":"KeyError: 'Nazwa'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"{\"nazwa\": \"kawa\"}[\"Nazwa\"]","gdzie":"F3.3 (pytanie P3) — jw., w pytaniu kontrolnym"},{"id":"PY-16","silnik":"python","cytat":"KeyError: 'results'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"{\"errors\": [{\"errorCode\": 1}]}[\"results\"]","gdzie":"notebook eda-1 — odpowiedź API bez klucza `results` (zły adres → 404)"},{"id":"PY-17","silnik":"python","cytat":"ModuleNotFoundError: No module named 'nieistniejacy_pakiet'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"import nieistniejacy_pakiet","gdzie":"PD.1 (hint 3) — import pakietu, którego nie ma w środowisku"},{"id":"PY-18","silnik":"python","cytat":"ModuleNotFoundError: No module named 'wykresy_pro'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"import wykresy_pro","gdzie":"PD.1 (pytanie P2) — jw., w pytaniu kontrolnym"},{"id":"PY-19","silnik":"python","cytat":"ModuleNotFoundError: No module named '…'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"import dowolny_brakujacy_pakiet","gdzie":"PD.1 (contentMd) — schemat komunikatu, nazwa zależna od importu"},{"id":"PY-20","silnik":"python","cytat":"AttributeError: 'NoneType' object has no attribute 'append'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"wynik = [1, 2].append(3)\nwynik.append(4)\n","gdzie":"F3.1 (hint 3) — `.append()` zwraca None, przypisanie zjada listę"},{"id":"PY-21","silnik":"python","cytat":"AttributeError: 'NoneType' object has no attribute 'df'","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"wynik = None\nwynik.df()\n","gdzie":"notebook sql-7 — `duckdb.sql(...)` bez zapytania oddaje None"},{"id":"PY-22","silnik":"pandas","cytat":"TypeError: agg function failed …","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"df = pd.DataFrame({\"rok\": [2022, 2022], \"stopa\": [\"3,1\", \"4,2\"]})\ndf.groupby(\"rok\")[\"stopa\"].mean()\n","gdzie":"notebook eda-4 — średnia po kolumnie tekstowej (zła luka 2)"},{"id":"PY-23","silnik":"python","cytat":"ValueError: could not convert string to float","rodzaj":"komunikat","dopasowanie":"prefiks","kod":"float(\"brak danych\")","gdzie":"ML.1 (hint 3) — kolumna tekstowa podana modelowi"},{"id":"K2-01","silnik":"duckdb","cytat":"21.833333333333332","rodzaj":"wynik","dopasowanie":"prefiks","kod":"print(duckdb.sql(\"SELECT AVG(kwota) FROM przejazdy WHERE strefa_id = 10\").fetchone()[0])","gdzie":"notebook sql-3 — „srednia_kwota dla strefy 10 to 21.833333333333332”"},{"id":"K2-02","silnik":"duckdb","cytat":"count_star()","rodzaj":"wynik","dopasowanie":"zawiera","kod":"print(duckdb.sql(\"SELECT COUNT(*) FROM przejazdy\").columns)","gdzie":"SQL.3 (contentMd) + notebook sql-3 — domyślna nazwa kolumny bez aliasu"},{"id":"K2-03","silnik":"duckdb","cytat":"avg(kwota)","rodzaj":"wynik","dopasowanie":"zawiera","kod":"print(duckdb.sql(\"SELECT AVG(kwota) FROM przejazdy\").columns)","gdzie":"SQL.3 (contentMd, 2 pytania) + notebook sql-3 — jw., dla AVG"},{"id":"K2-04","silnik":"python","cytat":"16.200000000000003","rodzaj":"wynik","dopasowanie":"zawiera","kod":"print(5.4 + 10.8)","gdzie":"F2.5 (contentMd) — ogon cyfr float, powód istnienia `round()`"}]""")

# DuckDB niesie klasę błędu w TREŚCI komunikatu („Catalog Error: …"),
# a jego typ pythonowy nazywa się inaczej (CatalogException).
_KLASA_W_TRESCI = re.compile(r"^(?:[A-Z][A-Za-z]* )+(?:Error|Exception): ")


def _opis(e):
    if isinstance(e, SyntaxError):
        return "%s: %s" % (type(e).__name__, e.msg)
    tresc = str(e)
    if _KLASA_W_TRESCI.match(tresc):
        return tresc
    return "%s: %s" % (type(e).__name__, e)


def _spelniony(faktyczny, cytat, dopasowanie):
    # „…" w cytacie znaczy „tu treść urywa" — segmenty muszą wystąpić po kolei.
    segmenty = [s.strip() for s in cytat.split("…") if s.strip()]
    pozycja = 0
    for i, segment in enumerate(segmenty):
        if i == 0 and dopasowanie == "prefiks":
            if not faktyczny.startswith(segment):
                return False
            pozycja = len(segment)
            continue
        idx = faktyczny.find(segment, pozycja)
        if idx < 0:
            return False
        pozycja = idx + len(segment)
    return True


_PRZESTRZENIE = {}
for _silnik, _kod in PREAMBULY.items():
    _ns = {}
    try:
        exec(compile(_kod, "<preambula>", "exec"), _ns)
    except Exception as _e:
        print("!! preambuła %s nie wykonała się: %s" % (_silnik, _opis(_e)))
    _PRZESTRZENIE[_silnik] = _ns

WYNIKI_CYTATOW = []
print("=== CYTATY KOMUNIKATÓW: %d kształtów ===" % len(CYTATY))
for _w in CYTATY:
    _ns = dict(_PRZESTRZENIE.get(_w["silnik"], {}))
    _buf = io.StringIO()
    _blad = None
    try:
        with redirect_stdout(_buf):
            exec(compile(_w["kod"], "<fragment>", "exec"), _ns)
    except BaseException as _e:
        _blad = _opis(_e)
    _faktyczny = _blad if _w["rodzaj"] == "komunikat" else _buf.getvalue().strip()
    if _faktyczny is None:
        _faktyczny = "<fragment NIE rzucił błędu>"
    _ok = _spelniony(_faktyczny, _w["cytat"], _w["dopasowanie"])
    WYNIKI_CYTATOW.append(
        {"id": _w["id"], "cytat": _w["cytat"], "faktyczny": _faktyczny, "zgodny": _ok}
    )
    print("%-7s %-8s %s" % (_w["id"], "ZGODNY" if _ok else "ROZJAZD", _w["cytat"]))
    if not _ok:
        print("        silnik oddał: %s" % _faktyczny.replace("\n", " ⏎ "))

_ROZJAZDY = [w for w in WYNIKI_CYTATOW if not w["zgodny"]]
print()
print("Zgodnych: %d / %d" % (len(WYNIKI_CYTATOW) - len(_ROZJAZDY), len(WYNIKI_CYTATOW)))

# %% [markdown]
# ## 3. Kontrakt danych API GUS/BDL
#
# Moduł M-EDA wychodzi do żywego API Głównego Urzędu Statystycznego
# (Bank Danych Lokalnych). Kontrakt-testy w CI jadą na ATRAPIE odpowiedzi —
# świadomie, bo sieć w CI bywa zerwana, a BDL limituje anonimowe zapytania.
# Skutek uboczny: **gdyby GUS zmienił API, nasze testy zostałyby zielone,
# a notebook studenta by padł.** Ta komórka jest jedynym miejscem, które
# tę klasę awarii zobaczy (rekomendacja Quinna, QA).
#
# Kształt odniesienia zmierzony na żywym BDL 2026-07-22.

# %%
KONTRAKT_BDL = json.loads(r"""{"url":"https://bdl.stat.gov.pl/api/v1/data/by-variable/60270","parametry":{"unit-level":2,"year":[2022,2023],"format":"json","page-size":20},"status":200,"totalRecords":16,"kluczeOdpowiedzi":["results","totalRecords"],"kluczeRekordu":["id","name","values"],"typId":"str","typRok":"str"}""")

WYNIK_BDL = {"osiagalne": False, "obserwacje": {}, "rozjazdy": []}
print("=== KONTRAKT API GUS/BDL ===")
try:
    import requests

    _odp = requests.get(KONTRAKT_BDL["url"], params=KONTRAKT_BDL["parametry"], timeout=30)
    WYNIK_BDL["osiagalne"] = True
    _dane = _odp.json() if _odp.status_code == 200 else {}
    _rekord = (_dane.get("results") or [{}])[0]
    _pomiar = (_rekord.get("values") or [{}])[0]
    WYNIK_BDL["obserwacje"] = {
        "status": _odp.status_code,
        "totalRecords": _dane.get("totalRecords"),
        "kluczeOdpowiedzi": sorted(_dane.keys()),
        "kluczeRekordu": sorted(_rekord.keys()),
        "typId": type(_rekord.get("id")).__name__,
        "typRok": type(_pomiar.get("year")).__name__,
        "typWartosc": type(_pomiar.get("val")).__name__,
        "liczbaRekordow": len(_dane.get("results") or []),
    }

    def _sprawdz(nazwa, oczekiwane, faktyczne):
        znak = "ZGODNY " if faktyczne == oczekiwane else "ROZJAZD"
        print("%-8s %-16s oczekiwane=%r faktyczne=%r" % (znak, nazwa, oczekiwane, faktyczne))
        if faktyczne != oczekiwane:
            WYNIK_BDL["rozjazdy"].append(
                {"pole": nazwa, "oczekiwane": oczekiwane, "faktyczne": faktyczne}
            )

    _obs = WYNIK_BDL["obserwacje"]
    _sprawdz("status", KONTRAKT_BDL["status"], _obs["status"])
    _sprawdz("totalRecords", KONTRAKT_BDL["totalRecords"], _obs["totalRecords"])
    for _klucz in KONTRAKT_BDL["kluczeOdpowiedzi"]:
        _sprawdz("klucz." + _klucz, True, _klucz in _obs["kluczeOdpowiedzi"])
    _sprawdz("kluczeRekordu", KONTRAKT_BDL["kluczeRekordu"], _obs["kluczeRekordu"])
    _sprawdz("typ id", KONTRAKT_BDL["typId"], _obs["typId"])
    _sprawdz("typ year", KONTRAKT_BDL["typRok"], _obs["typRok"])
    print()
    print("Pełne obserwacje: %s" % json.dumps(_obs, ensure_ascii=False))
except Exception as _e:
    WYNIK_BDL["blad"] = "%s: %s" % (type(_e).__name__, _e)
    print("!! API BDL nieosiągalne z tej sesji: %s" % WYNIK_BDL["blad"])
    print("   (to też jest wynik — powtórz sondę; jeśli powtarzalne, zgłoś Ethanowi)")

# %% [markdown]
# ## 4. Wynik maszynowy — to jest to, co wracasz do repozytorium
#
# Skopiuj wszystko od linii `--- WYNIK MASZYNOWY (JSON) ---` do końca
# i wklej do `docs/curation/sondy/sonda-srodowiska-RRRRMMDD.txt`.
# Repozytorium przepisze stąd wersje i datę sondy komendą:
# `pnpm srodowisko:zapisz-sonde docs/curation/sondy/sonda-srodowiska-RRRRMMDD.txt`

# %%
import datetime

_PODSUMOWANIE = {
    "data": datetime.date.today().isoformat(),
    "srodowisko": SRODOWISKO,
    "wersje": WERSJE,
    "cytaty": WYNIKI_CYTATOW,
    "rozjazd_cytatow": len(_ROZJAZDY),
    "bdl": WYNIK_BDL,
}
print("--- WYNIK MASZYNOWY (JSON) ---")
print(json.dumps(_PODSUMOWANIE, ensure_ascii=False, indent=1))
