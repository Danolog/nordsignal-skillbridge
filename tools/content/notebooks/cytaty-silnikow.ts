/**
 * ADR-016 D2 — TABLICA ASERCJI CYTATÓW SILNIKA.
 *
 * To jest jedyne miejsce, w którym kurator dopisuje nowy cytat verbatim.
 * Każdy wiersz mówi: „treść obiecuje studentowi TAKIE brzmienie, a oto fragment
 * kodu, który to brzmienie produkuje". Kontrakt-test wykonuje fragment realnym
 * interpreterem i sprawdza, czy obietnica dalej jest prawdą.
 *
 * DLACZEGO NIE ASERCJA NA NUMERZE WERSJI: po `pip install "duckdb~=1.3.2"`
 * sprawdzenie, że stoi duckdb 1.3.x, jest prawie tautologią. Numer wersji może
 * się zmienić bez szkody dla treści; brzmienie komunikatu zmienić się bez szkody
 * NIE MOŻE — bo student czyta je dosłownie („czytaj błąd, on mówi prawdę", L0).
 *
 * DLACZEGO TU, A NIE OBOK TESTU (odstępstwo od litery ADR-016 D2, Eva 2026-07-22):
 * tablicę czyta nie tylko test, ale i GENERATOR SONDY (`build-sonda-srodowiska.ts`)
 * — sonda ma mierzyć DOKŁADNIE te same kształty w Colabie. Gdyby tablica żyła
 * w `tests/`, narzędzie budujące treść importowałoby z katalogu testów (odwrócona
 * zależność). Inwentarz cytatów jest artefaktem TREŚCI, więc leży przy treści,
 * obok `srodowisko-colab.json`.
 *
 * JAK DOPISAĆ CYTAT (procedura kuratora):
 *   1. dopisz wiersz niżej: `cytat` dosłownie jak w treści + `kod`, który go produkuje;
 *   2. `pnpm test:run -- srodowisko-silnikow` — musi być zielone;
 *   3. `pnpm content:build-sonda` — sonda Colab dostaje nowy kształt automatycznie.
 * Cytat dopisany do treści BEZ wiersza tutaj = czerwone CI w tym samym PR-ze
 * (poziom 2a: skaner inwentarza).
 */

/** Przestrzeń wykonania fragmentu — decyduje, co jest zaimportowane. */
export type SilnikCytatu = "python" | "pandas" | "duckdb" | "sklearn";

export type WierszCytatu = {
	id: string;
	silnik: SilnikCytatu;
	/**
	 * Cytat DOKŁADNIE jak w treści. Znak `…` oznacza „tu treść urywa" — segmenty
	 * rozdzielone wielokropkiem muszą wystąpić w faktycznym komunikacie po kolei.
	 */
	cytat: string;
	/**
	 * `komunikat` — fragment MA rzucić błąd, porównujemy z jego brzmieniem;
	 * `wynik` — fragment MA wypisać wartość, porównujemy z tym, co wypisał (K2).
	 */
	rodzaj: "komunikat" | "wynik";
	/** `prefiks` (domyślnie) — cytat otwiera komunikat; `zawiera` — cytowany jest środek. */
	dopasowanie?: "prefiks" | "zawiera";
	/** Fragment produkujący komunikat/wynik. `null` wyłącznie przy `odroczono`. */
	kod: string | null;
	/** Gdzie w treści student to widzi (orientacja kuratora, nie asercja). */
	gdzie: string;
	uwaga?: string;
	/**
	 * ODROCZENIE ASERCJI — jedyna legalna furtka, celowo wąska i widoczna w diffie.
	 * Powód z zamkniętej listy; test wymaga niepustego odnośnika. Wiersz odroczony
	 * DALEJ domyka inwentarz (poziom 2a), więc cytat nie znika z pola widzenia.
	 */
	odroczono?: { powod: "silnik-poza-pinem"; odnosnik: string };
};

/** Preambuły przestrzeni nazw — identyczne z tym, co student ma w notebooku. */
export const PREAMBULY: Record<SilnikCytatu, string> = {
	// Świadomie PUSTA: cytaty `NameError: name 'pd' is not defined` mają sens
	// tylko tam, gdzie pandas NIE jest zaimportowany.
	python: "",
	pandas: "import pandas as pd\n",
	// Mini-świat M-SQL — 1:1 z komórką danych notebooków SQL.1–SQL.7.
	duckdb: `import duckdb
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
`,
	sklearn: "",
};

// ── K1 · DuckDB — komunikaty silnika SQL ────────────────────────────────────

const DUCKDB: WierszCytatu[] = [
	{
		id: "DB-01",
		silnik: "duckdb",
		cytat: "Catalog Error: Table with name przejazdyy does not exist!",
		rodzaj: "komunikat",
		kod: 'duckdb.sql("SELECT * FROM przejazdyy")',
		gdzie: "SQL.1 (hint 3) + notebook sql-1 — rytuał literówki w nazwie tabeli",
	},
	{
		id: "DB-02",
		silnik: "duckdb",
		cytat: 'Parser Error: syntax error at or near "SELCT"',
		rodzaj: "komunikat",
		kod: 'duckdb.sql("SELCT id FROM przejazdy")',
		gdzie: "SQL.1 (hint 3) + notebook sql-1 — literówka w słowie kluczowym",
	},
	{
		id: "DB-03",
		silnik: "duckdb",
		cytat: "Parser Error: syntax error at end of input",
		rodzaj: "komunikat",
		kod: 'duckdb.sql("SELECT id, minuty FROM przejazdy ORDER BY")',
		gdzie: "notebook sql-6 — zapytanie urwane w połowie",
	},
	{
		id: "DB-04",
		silnik: "duckdb",
		cytat: 'Binder Error: Referenced column "Manhattan" not found in FROM clause!',
		rodzaj: "komunikat",
		kod: "duckdb.sql('SELECT * FROM strefy WHERE nazwa = \"Manhattan\"')",
		gdzie: "notebook sql-2 — podwójne cudzysłowy to NAZWA KOLUMNY, nie tekst",
	},
	{
		id: "DB-05",
		silnik: "duckdb",
		cytat: 'Binder Error: Referenced column "Manhattan" not found',
		rodzaj: "komunikat",
		kod: "duckdb.sql('SELECT * FROM strefy WHERE nazwa = \"Manhattan\"')",
		gdzie: "SQL.2 (contentMd) — ten sam błąd, cytat urwany przed „in FROM clause!”",
		uwaga:
			"Wariant SKRÓCONY tego samego komunikatu — treść atomu urywa cytat wcześniej niż notebook.",
	},
	{
		id: "DB-06",
		silnik: "duckdb",
		cytat: 'Binder Error: Referenced column "______" not found in FROM clause!',
		rodzaj: "komunikat",
		kod: 'duckdb.sql("SELECT ______ FROM przejazdy")',
		gdzie: "notebooki sql-3, sql-4, sql-5 — nieuzupełniona luka w zapytaniu",
	},
	{
		id: "DB-07",
		silnik: "duckdb",
		cytat:
			'Binder Error: column "minuty" must appear in the GROUP BY clause or must be part of an aggregate function',
		rodzaj: "komunikat",
		kod: 'duckdb.sql("SELECT strefa_id, minuty, COUNT(*) FROM przejazdy GROUP BY strefa_id")',
		gdzie: "SQL.3 (contentMd) + notebook sql-3 — kolumna „luzem” przy grupowaniu",
	},
	{
		id: "DB-08",
		silnik: "duckdb",
		cytat: 'Binder Error: Ambiguous reference to column name "strefa_id"',
		rodzaj: "komunikat",
		kod: 'duckdb.sql("SELECT strefa_id FROM przejazdy JOIN strefy ON przejazdy.strefa_id = strefy.strefa_id")',
		gdzie: "notebook sql-5 — ta sama nazwa kolumny w obu tabelach JOIN-a",
	},
];

// ── K1 · Python — komunikaty interpretera i bibliotek ───────────────────────

const PYTHON: WierszCytatu[] = [
	{
		id: "PY-01",
		silnik: "python",
		cytat: "NameError: name 'kawa' is not defined",
		rodzaj: "komunikat",
		kod: "kawa",
		gdzie: "L0.3 (pytanie P2) + notebook l0-3 — sesja po restarcie nie pamięta zmiennej",
	},
	{
		id: "PY-02",
		silnik: "python",
		cytat: "NameError: name 'pd' is not defined",
		rodzaj: "komunikat",
		kod: "pd.DataFrame()",
		gdzie: "PD.2 (hint 3) — komórka z importem nie została wykonana",
	},
	{
		id: "PY-03",
		silnik: "python",
		cytat: "NameError: name '_luka_' is not defined",
		rodzaj: "komunikat",
		kod: "_luka_",
		gdzie: "14 notebooków F1–F3/M-PD — nieuzupełniona luka w kodzie",
	},
	{
		id: "PY-04",
		silnik: "python",
		cytat: "NameError: name '______' is not defined",
		rodzaj: "komunikat",
		kod: "______",
		gdzie: "notebook eda-4 — nieuzupełniona luka (wariant z podkreśleniami)",
	},
	{
		id: "PY-05",
		silnik: "python",
		cytat: "NameError: name 'podroz' is not defined",
		rodzaj: "komunikat",
		kod: "podroz",
		gdzie: "notebook f2-6 — zmienna lokalna funkcji nie istnieje na zewnątrz",
	},
	{
		id: "PY-06",
		silnik: "python",
		cytat: "NameError: name '…' is not defined",
		rodzaj: "komunikat",
		kod: "dowolna_nieistniejaca_nazwa",
		gdzie: "L0.4 (hint 3) — schemat komunikatu, nazwa zależna od kodu studenta",
		uwaga: "Cytat z wielokropkiem: asercja sprawdza obie strony schematu, nie nazwę.",
	},
	{
		id: "PY-07",
		silnik: "python",
		cytat: "SyntaxError: expected ':'",
		rodzaj: "komunikat",
		kod: "if 1 > 0\n    print(1)\n",
		gdzie: "F1.6 (contentMd, pytanie P2) + F2.3 (hint 3) — brak dwukropka w nagłówku",
	},
	{
		id: "PY-08",
		silnik: "python",
		cytat: "IndentationError: expected an indented block",
		rodzaj: "komunikat",
		kod: "if 1 > 0:\nprint(1)\n",
		gdzie: "F1.6 (contentMd) + F2.3 (hint 3) — brak wcięcia pod nagłówkiem",
		uwaga:
			"DŁUG ADR-016 §2: od Pythona 3.10 pełny komunikat brzmi „…block after 'if' " +
			"statement on line 1”. Cytat jest dziś PREFIKSEM prawdy, więc asercja przechodzi; " +
			"uzupełnienie brzmienia w treści to zadanie Sophii, nie bramki.",
	},
	{
		id: "PY-09",
		silnik: "python",
		cytat: "Maybe you meant '=='",
		rodzaj: "komunikat",
		dopasowanie: "zawiera",
		kod: "if cena = 65:\n    print(1)\n",
		gdzie: "F1.5 (contentMd) — podpowiedź interpretera przy pomyleniu `=` z `==`",
		uwaga: "Cytowany ŚRODEK komunikatu (treść nie obiecuje początku) — stąd „zawiera”.",
	},
	{
		id: "PY-10",
		silnik: "python",
		cytat: "IndexError: list index out of range",
		rodzaj: "komunikat",
		kod: "ceny = [10, 20]\nceny[5]\n",
		gdzie: "F2.2 (contentMd, hint 3, pytanie P3) — indeks poza listą",
	},
	{
		id: "PY-11",
		silnik: "python",
		cytat: "ZeroDivisionError: division by zero",
		rodzaj: "komunikat",
		kod: "1 / 0",
		gdzie: "F1.2 (contentMd, pytanie P3) — dzielenie przez zero",
	},
	{
		id: "PY-12",
		silnik: "python",
		cytat: "KeyError: 'cena'",
		rodzaj: "komunikat",
		kod: '{"nazwa": "kawa"}["cena"]',
		gdzie: "F3.3 (contentMd) — klucz, którego w słowniku nie ma",
	},
	{
		id: "PY-13",
		silnik: "python",
		cytat: "KeyError: 'Danie'",
		rodzaj: "komunikat",
		kod: '{"danie": "zupa"}["Danie"]',
		gdzie: "F3.3 (hint 3) — wielkość liter w kluczu ma znaczenie",
	},
	{
		id: "PY-14",
		silnik: "python",
		cytat: "KeyError: 'Kategoria'",
		rodzaj: "komunikat",
		kod: '{"kategoria": "jedzenie"}["Kategoria"]',
		gdzie: "F3.5 (hint 3) — jw., w tabeli rekordów",
	},
	{
		id: "PY-15",
		silnik: "python",
		cytat: "KeyError: 'Nazwa'",
		rodzaj: "komunikat",
		kod: '{"nazwa": "kawa"}["Nazwa"]',
		gdzie: "F3.3 (pytanie P3) — jw., w pytaniu kontrolnym",
	},
	{
		id: "PY-16",
		silnik: "python",
		cytat: "KeyError: 'results'",
		rodzaj: "komunikat",
		kod: '{"errors": [{"errorCode": 1}]}["results"]',
		gdzie: "notebook eda-1 — odpowiedź API bez klucza `results` (zły adres → 404)",
	},
	{
		id: "PY-17",
		silnik: "python",
		cytat: "ModuleNotFoundError: No module named 'nieistniejacy_pakiet'",
		rodzaj: "komunikat",
		kod: "import nieistniejacy_pakiet",
		gdzie: "PD.1 (hint 3) — import pakietu, którego nie ma w środowisku",
	},
	{
		id: "PY-18",
		silnik: "python",
		cytat: "ModuleNotFoundError: No module named 'wykresy_pro'",
		rodzaj: "komunikat",
		kod: "import wykresy_pro",
		gdzie: "PD.1 (pytanie P2) — jw., w pytaniu kontrolnym",
	},
	{
		id: "PY-19",
		silnik: "python",
		cytat: "ModuleNotFoundError: No module named '…'",
		rodzaj: "komunikat",
		kod: "import dowolny_brakujacy_pakiet",
		gdzie: "PD.1 (contentMd) — schemat komunikatu, nazwa zależna od importu",
	},
	{
		id: "PY-20",
		silnik: "python",
		cytat: "AttributeError: 'NoneType' object has no attribute 'append'",
		rodzaj: "komunikat",
		kod: "wynik = [1, 2].append(3)\nwynik.append(4)\n",
		gdzie: "F3.1 (hint 3) — `.append()` zwraca None, przypisanie zjada listę",
	},
	{
		id: "PY-21",
		silnik: "python",
		cytat: "AttributeError: 'NoneType' object has no attribute 'df'",
		rodzaj: "komunikat",
		kod: "wynik = None\nwynik.df()\n",
		gdzie: "notebook sql-7 — `duckdb.sql(...)` bez zapytania oddaje None",
	},
	{
		id: "PY-22",
		silnik: "pandas",
		cytat: "TypeError: agg function failed …",
		rodzaj: "komunikat",
		kod: 'df = pd.DataFrame({"rok": [2022, 2022], "stopa": ["3,1", "4,2"]})\ndf.groupby("rok")["stopa"].mean()\n',
		gdzie: "notebook eda-4 — średnia po kolumnie tekstowej (zła luka 2)",
		uwaga: "Regresja WAŻN-2 kontraktu M-EDA opiera się na tym samym prefiksie.",
	},
	{
		id: "PY-23",
		silnik: "python",
		cytat: "ValueError: could not convert string to float",
		rodzaj: "komunikat",
		kod: 'float("brak danych")',
		gdzie: "ML.1 (hint 3) — kolumna tekstowa podana modelowi",
	},
	{
		id: "PY-24",
		silnik: "sklearn",
		cytat: "NotFittedError: This DecisionTreeClassifier instance is not fitted yet…",
		rodzaj: "komunikat",
		// Aktywowane z partią M-ML (ADR-020): scikit-learn wszedł do
		// srodowisko-colab.json (pin ~=1.6.1) razem z labami ML.4/ML.7, więc CI ma
		// teraz sklearn i cytat wykonuje się naprawdę (koniec odroczenia „silnik-poza-pinem").
		// Komunikat identyczny w 1.6.1 i 1.9.0 (zweryfikowane wykonaniem).
		kod: "from sklearn.tree import DecisionTreeClassifier\nDecisionTreeClassifier().predict([[1, 2, 3]])\n",
		gdzie: "ML.1 (hint 3) — `predict` przed `fit`",
	},
];

// ── K2 · surowe wyniki zależne od formatowania silnika (ADR-016 D2, poziom 2b) ─

const WYNIKI: WierszCytatu[] = [
	{
		id: "K2-01",
		silnik: "duckdb",
		cytat: "21.833333333333332",
		rodzaj: "wynik",
		kod: 'print(duckdb.sql("SELECT AVG(kwota) FROM przejazdy WHERE strefa_id = 10").fetchone()[0])',
		gdzie: "notebook sql-3 — „srednia_kwota dla strefy 10 to 21.833333333333332”",
		uwaga: "Ogon float: repr zależy od silnika i od Pythona — dlatego cytat jest asercją.",
	},
	{
		id: "K2-02",
		silnik: "duckdb",
		cytat: "count_star()",
		rodzaj: "wynik",
		dopasowanie: "zawiera",
		kod: 'print(duckdb.sql("SELECT COUNT(*) FROM przejazdy").columns)',
		gdzie: "SQL.3 (contentMd) + notebook sql-3 — domyślna nazwa kolumny bez aliasu",
	},
	{
		id: "K2-03",
		silnik: "duckdb",
		cytat: "avg(kwota)",
		rodzaj: "wynik",
		dopasowanie: "zawiera",
		kod: 'print(duckdb.sql("SELECT AVG(kwota) FROM przejazdy").columns)',
		gdzie: "SQL.3 (contentMd, 2 pytania) + notebook sql-3 — jw., dla AVG",
	},
	{
		id: "K2-04",
		silnik: "python",
		cytat: "16.200000000000003",
		rodzaj: "wynik",
		dopasowanie: "zawiera",
		kod: "print(5.4 + 10.8)",
		gdzie: "F2.5 (contentMd) — ogon cyfr float, powód istnienia `round()`",
	},
];

export const CYTATY_SILNIKOW: WierszCytatu[] = [...DUCKDB, ...PYTHON, ...WYNIKI];

/** Segmenty cytatu rozdzielone wielokropkiem — `…` znaczy „tu treść urywa". */
export function segmentyCytatu(cytat: string): string[] {
	return cytat
		.split("…")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/**
 * Czy faktyczny komunikat/wynik spełnia obietnicę cytatu.
 * `prefiks` — pierwszy segment otwiera komunikat (ogon silnika jest nieprzewidywalny
 * i cytowanie go byłoby długiem — ADR-016 D5.1); `zawiera` — cytowany jest środek.
 */
export function cytatSpelniony(
	faktyczny: string,
	cytat: string,
	dopasowanie: "prefiks" | "zawiera" = "prefiks",
): boolean {
	const segmenty = segmentyCytatu(cytat);
	let pozycja = 0;
	for (const [i, segment] of segmenty.entries()) {
		if (i === 0 && dopasowanie === "prefiks") {
			if (!faktyczny.startsWith(segment)) return false;
			pozycja = segment.length;
			continue;
		}
		const idx = faktyczny.indexOf(segment, pozycja);
		if (idx < 0) return false;
		pozycja = idx + segment.length;
	}
	return true;
}
