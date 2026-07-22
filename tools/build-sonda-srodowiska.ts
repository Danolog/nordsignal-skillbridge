/**
 * ADR-016 D3 — generator SONDY ŚRODOWISKA COLAB.
 *
 * CZEGO CI NIE ZOBACZY NIGDY: CI instaluje NASZ pin, więc mierzy nasze
 * środowisko, nie środowisko studenta. Dryf po stronie Google widać wyłącznie
 * z wnętrza Colaba — a Colab nie ma API środowiska do odpytania z workflow
 * (wymagałby konta i automatyzacji przeglądarki: nowa infrastruktura + sekret
 * pod dryf mierzony w miesiącach). Dlatego pomiar jest RĘCZNY, a jego wynik
 * wraca do repo jako artefakt — dokładnie wzorzec zrzutów ekranu UI z 2026-07-22
 * (dowód, nie deklaracja).
 *
 * DLACZEGO GENERATOR, A NIE RĘCZNIE PISANY NOTEBOOK: sonda ma mierzyć DOKŁADNIE
 * te kształty, które asertuje CI (`cytaty-silnikow.ts`). Ręcznie utrzymywana
 * kopia listy rozjechałaby się z tablicą przy pierwszym dopisanym cytacie —
 * i sonda mierzyłaby wczorajszą treść. Tu tablica jest jedynym źródłem, a test
 * kontraktowy porównuje wygenerowane źródło z tym w repo (zero ręcznych edycji).
 *
 * Uruchomienie: `pnpm content:build-sonda && pnpm content:build-notebooks`
 * Wynik: tools/content/notebooks/sonda/sonda-srodowiska.py → notebooks/sonda/*.ipynb
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CYTATY_SILNIKOW, PREAMBULY } from "./content/notebooks/cytaty-silnikow";
import { pinySpec } from "./srodowisko-colab";

const SRC_DIR = join(process.cwd(), "tools", "content", "notebooks", "sonda");
const SRC_FILE = "sonda-srodowiska.py";

/** Kontrakt danych API GUS/BDL zmierzony na żywym API 2026-07-22 (partia 7). */
export const KONTRAKT_BDL = {
	url: "https://bdl.stat.gov.pl/api/v1/data/by-variable/60270",
	parametry: { "unit-level": 2, year: [2022, 2023], format: "json", "page-size": 20 },
	status: 200,
	totalRecords: 16,
	kluczeOdpowiedzi: ["results", "totalRecords"],
	kluczeRekordu: ["id", "name", "values"],
	typId: "str",
	typRok: "str",
};

/** Markdown w formacie percent: każda linia treści z prefiksem „# ". */
function md(tekst: string): string {
	const linie = tekst
		.trim()
		.split("\n")
		.map((l) => (l.length > 0 ? `# ${l}` : "#"));
	return `# %% [markdown]\n${linie.join("\n")}\n`;
}

function kod(tekst: string): string {
	return `# %%\n${tekst.trim()}\n`;
}

export function buildSondaSource(): string {
	const wiersze = CYTATY_SILNIKOW.filter((w) => w.kod !== null).map((w) => ({
		id: w.id,
		silnik: w.silnik,
		cytat: w.cytat,
		rodzaj: w.rodzaj,
		dopasowanie: w.dopasowanie ?? "prefiks",
		kod: w.kod,
		gdzie: w.gdzie,
	}));
	const preambuly = Object.fromEntries(
		Object.entries(PREAMBULY).filter(([silnik]) => wiersze.some((w) => w.silnik === silnik)),
	);
	const liczbaKsztaltow = wiersze.filter((w) => w.rodzaj === "komunikat").length;

	const czesci: string[] = [];

	czesci.push(
		md(`
# Sonda środowiska Colab — SkillBridge, ścieżka Data Science

**To nie jest lab.** Ten notebook nie ma pieczątki i nie wystawia tokenu.
Mierzy, CO NAPRAWDĘ STOI w Colabie w dniu uruchomienia: wersje silników
i dosłowne brzmienie ${liczbaKsztaltow} komunikatów, które nasza treść cytuje
studentowi. Podstawa: ADR-016 D3.

**Jak uruchomić (≈5 minut):**

1. **Środowisko wykonawcze → Uruchom wszystko** (Runtime → Run all).
2. Poczekaj, aż wykona się ostatnia komórka.
3. Skopiuj **CAŁE** wyjście ostatnich trzech komórek.
4. Wklej do repozytorium: \`docs/curation/sondy/sonda-srodowiska-RRRRMMDD.txt\`.

Uruchamiaj w **świeżej sesji** (Środowisko wykonawcze → Uruchom ponownie
sesję) i **bez** żadnego \`pip install\` — sonda ma zmierzyć to, co Colab
daje studentowi z pudełka, a nie to, co sami sobie doinstalujemy.
`),
	);

	czesci.push(
		md(`
## 1. Wersje silników

Nasza treść jest napisana i zweryfikowana pod piny z
\`tools/content/notebooks/srodowisko-colab.json\`:
${pinySpec()
	.map((p) => `\`${p}\``)
	.join(", ")}.
Jeżeli któryś import poniżej się nie uda — to samo w sobie jest wynikiem
(treść M-SQL twierdzi, że DuckDB jest w Colabie preinstalowany).
`),
	);

	czesci.push(
		kod(`
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
`),
	);

	czesci.push(
		md(`
## 2. Komunikaty silnika — czy treść nadal mówi prawdę

Dla każdego cytatu z treści sonda WYKONUJE fragment kodu, który ten
komunikat produkuje, i porównuje brzmienie. \`ZGODNY\` = obietnica wobec
studenta jest nadal prawdziwa. \`ROZJAZD\` = student zobaczy co innego,
niż mówi instrukcja — to jest sygnał do wpisania \`"rozjazd": true\`
i tiketu dla Ethana.
`),
	);

	czesci.push(
		kod(`
import io
import re
from contextlib import redirect_stdout

PREAMBULY = json.loads(r"""${JSON.stringify(preambuly, null, 0)}""")
CYTATY = json.loads(r"""${JSON.stringify(wiersze, null, 0)}""")

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
        print("        silnik oddał: %s" % _faktyczny.replace("\\n", " ⏎ "))

_ROZJAZDY = [w for w in WYNIKI_CYTATOW if not w["zgodny"]]
print()
print("Zgodnych: %d / %d" % (len(WYNIKI_CYTATOW) - len(_ROZJAZDY), len(WYNIKI_CYTATOW)))
`),
	);

	czesci.push(
		md(`
## 3. Kontrakt danych API GUS/BDL

Moduł M-EDA wychodzi do żywego API Głównego Urzędu Statystycznego
(Bank Danych Lokalnych). Kontrakt-testy w CI jadą na ATRAPIE odpowiedzi —
świadomie, bo sieć w CI bywa zerwana, a BDL limituje anonimowe zapytania.
Skutek uboczny: **gdyby GUS zmienił API, nasze testy zostałyby zielone,
a notebook studenta by padł.** Ta komórka jest jedynym miejscem, które
tę klasę awarii zobaczy (rekomendacja Quinna, QA).

Kształt odniesienia zmierzony na żywym BDL 2026-07-22.
`),
	);

	czesci.push(
		kod(`
KONTRAKT_BDL = json.loads(r"""${JSON.stringify(KONTRAKT_BDL, null, 0)}""")

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
`),
	);

	czesci.push(
		md(`
## 4. Wynik maszynowy — to jest to, co wracasz do repozytorium

Skopiuj wszystko od linii \`--- WYNIK MASZYNOWY (JSON) ---\` do końca
i wklej do \`docs/curation/sondy/sonda-srodowiska-RRRRMMDD.txt\`.
Repozytorium przepisze stąd wersje i datę sondy komendą:
\`pnpm srodowisko:zapisz-sonde docs/curation/sondy/sonda-srodowiska-RRRRMMDD.txt\`
`),
	);

	czesci.push(
		kod(`
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
`),
	);

	return `${czesci.join("\n")}`;
}

function main(): void {
	mkdirSync(SRC_DIR, { recursive: true });
	const zrodlo = buildSondaSource();
	writeFileSync(join(SRC_DIR, SRC_FILE), zrodlo);
	console.log(`✅ Źródło sondy: tools/content/notebooks/sonda/${SRC_FILE} (${zrodlo.length} B)`);
	console.log("   Teraz: pnpm content:build-notebooks (buduje notebooks/sonda/*.ipynb)");
}

const isDirectRun =
	typeof process.argv[1] === "string" && process.argv[1].includes("build-sonda-srodowiska");
if (isDirectRun) main();
