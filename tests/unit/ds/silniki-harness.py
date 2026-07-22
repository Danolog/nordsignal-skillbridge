# Harness asercji cytatów silnika (ADR-016 D2, poziom 2/2b) — wykonuje fragmenty
# kodu, które PRODUKUJĄ komunikat cytowany w treści, i oddaje faktyczne brzmienie.
#
# PO CO OSOBNY HARNESS (obok notebook-stamp-harness.py): tamten symuluje sesję
# studenta na całym notebooku, ten wykonuje pojedyncze fragmenty w izolowanej
# przestrzeni nazw i interesuje go WYŁĄCZNIE tekst błędu / wypisany wynik.
# Jeden proces na wszystkie wiersze — import pandas i duckdb kosztuje sekundy,
# a wierszy jest kilkadziesiąt.
#
# stdin (JSON):
#   { "preambuly": {"python": "...", "duckdb": "..."},
#     "wiersze": [{"id": "PY-01", "silnik": "python", "kod": "1/0"}, ...] }
# stdout (JSON):
#   { "wersje": {"python": "3.13.2", "pandas": "...", "duckdb": "...", "requests": "..."},
#     "wyniki": [{"id": "PY-01", "blad": "ZeroDivisionError: division by zero",
#                 "stdout": ""}, ...] }
import contextlib
import io
import json
import re
import sys

# DuckDB niesie klasę błędu W TREŚCI komunikatu („Catalog Error: …"), a jego typ
# pythonowy nazywa się inaczej (CatalogException) — wtedy bierzemy samą treść.
# („Catalog Error: …", „Binder Error: …", „Invalid Input Error: …" — zawsze
# co najmniej jedno słowo PRZED „Error"; komunikaty Pythona tak nie wyglądają.)
KLASA_W_TRESCI = re.compile(r"^(?:[A-Z][A-Za-z]* )+(?:Error|Exception): ")


def opis_bledu(e: BaseException) -> str:
    # Błędy składni: interpreter pokazuje SAM komunikat (plik i linia idą do
    # nagłówka ramki), a str(e) dokleiłby „ (<fragment>, line 1)".
    if isinstance(e, SyntaxError):
        return f"{type(e).__name__}: {e.msg}"
    tresc = str(e)
    if KLASA_W_TRESCI.match(tresc):
        return tresc
    return f"{type(e).__name__}: {e}"


def wersje() -> dict:
    out = {"python": ".".join(str(x) for x in sys.version_info[:3])}
    for nazwa in ("pandas", "duckdb", "requests"):
        try:
            out[nazwa] = __import__(nazwa).__version__
        except Exception as e:  # noqa: BLE001 — brak pakietu to fakt do zaraportowania
            out[nazwa] = f"BRAK ({type(e).__name__})"
    return out


req = json.load(sys.stdin)
preambuly = req.get("preambuly", {})
przestrzenie: dict[str, dict] = {}
for silnik, kod in preambuly.items():
    ns: dict = {}
    exec(compile(kod, f"<preambula {silnik}>", "exec"), ns)  # noqa: S102 — harness testowy
    przestrzenie[silnik] = ns

wyniki = []
for wiersz in req["wiersze"]:
    ns = dict(przestrzenie.get(wiersz["silnik"], {}))
    captured = io.StringIO()
    blad = None
    try:
        with contextlib.redirect_stdout(captured):
            exec(compile(wiersz["kod"], "<fragment>", "exec"), ns)  # noqa: S102
    except BaseException as e:  # noqa: BLE001 — celem jest złapanie DOWOLNEGO błędu
        blad = opis_bledu(e)
    wyniki.append({"id": wiersz["id"], "blad": blad, "stdout": captured.getvalue()})

print(json.dumps({"wersje": wersje(), "wyniki": wyniki}, ensure_ascii=False))
