/**
 * Krok 4 partia 7 (ADR-015) — kontrakt notebooków Colab M-EDA.
 *
 * Nowości względem M-SQL:
 *
 *  1. PIERWSZA PARTIA, KTÓRA WYCHODZI DO SIECI. EDA.1 i EDA.4 wołają żywe
 *     API GUS BDL (`requests.get`). Test NIE MA prawa od tego zależeć:
 *     sieć w CI bywa zerwana, BDL limituje anonimowe zapytania (429 po
 *     100/15 min), a treść ma być weryfikowana deterministycznie. Dlatego
 *     scenariusze jadą na ATRAPIE odpowiedzi (`insertCells` + `replacements`
 *     na wywołaniu) — kształt atrapy przepisany z żywej odpowiedzi zmierzonej
 *     2026-07-22 (`totalRecords` 16, rekord `{id, name, values}`, `id`
 *     dwunastocyfrowym TEKSTEM `"011200000000"`, `year` TEKSTEM `"2022"`,
 *     `val` liczbą, bez `page-size` wraca pierwsza strona = 10 rekordów,
 *     zły adres = 404 z jedynym kluczem `errors`).
 *
 *  2. STRAŻNIK SIECI ZAMIAST OBIETNICY. Komórka atrapy podmienia `requests.get`
 *     na funkcję, która RZUCA. Gdyby kotwica podmiany przestała pasować (ktoś
 *     przepisze wywołanie w notebooku), test nie poszedłby po cichu do internetu
 *     — poleci `AssertionError`. Jeden test celowo NIE podmienia wywołania
 *     i wymaga, żeby strażnik zadziałał: odcięcie sieci jest sprawdzone,
 *     nie zadeklarowane.
 *
 *  3. ATRAPA ≡ ŻYWE API pod względem tokenu — zweryfikowane, nie przyjęte
 *     na słowo. Ładunek pieczątki EDA.4 niesie wyłącznie kształt sesji
 *     (status, liczba kolumn, liczba wierszy, dwie flagi), a ZERO wartości
 *     stóp bezrobocia. Przebieg na żywym BDL, na atrapie z realistycznymi
 *     stopami i na atrapie z wartościami z sufitu (100, 107, …) dały ten sam
 *     token `…e9a705dce252` (pomiar 2026-07-22). Test trzyma to twierdzenie
 *     w ryzach na przyszłość: dwa warianty atrapy o RÓŻNYCH wartościach mają
 *     dać identyczny token — jeśli kiedyś ładunek zacznie nieść dane, ten test
 *     zrobi się czerwony i będzie trzeba wrócić po żywy przebieg.
 *
 *  4. Regresje na defektach z kontroli jakości partii 7
 *     (`docs/curation/sophia-1e2-meda-atomy.md`, sekcja „Znaleziska"):
 *       • KRYT-1 — `id` jednostki w BDL jest TEKSTEM, więc kontrola typu
 *         kolumny nie odróżniała nazwy od identyfikatora i student z błędną
 *         luką 1 dostawał ten sam token co poprawny. Test: luka 1 = `"id"`
 *         NIE MOŻE dać tokenu i musi cytować pierwszą obcą wartość.
 *       • U1 (blokada Leo, 2026-07-22) — pierwsza naprawa KRYT-1 ZASTĄPIŁA
 *         kontrolę typu szukaniem liter w wartościach, więc zamknęła objaw,
 *         a nie klasę: `values` (lista pomiarów) ma w środku litery i dalej
 *         dawała token bit w bit ten sam co poprawna luka 1. Pomiar
 *         wykonaniem na WSZYSTKICH polach rekordu pokazał cztery wejścia
 *         przechodzące przez bramkę (`values`, cały rekord, `values[0]`,
 *         `str(rekord)`) oraz piąte w luce 2 (`attrId` — liczba, więc
 *         kontrola typu ją przepuszczała). Pieczątka pyta teraz o
 *         POCHODZENIE, nie o kształt: wartości kolumn muszą należeć do
 *         zbiorów z odpowiedzi API (`dane`). Regresje niżej trzymają po
 *         jednym reprezentancie każdej klasy (lista, słownik, obca liczba)
 *         + ścieżkę „`dane` nadpisane".
 *       • WAŻN-3 — trzy równoważne zapisy grupowania (kanoniczny,
 *         `as_index=False`, `mean(numeric_only=True)`) muszą dać IDENTYCZNY
 *         token. Zasada z M-SQL: sprawdzamy WYNIK, nie sposób zapisu.
 *
 *  5. CI: harness wykonuje `import requests` REALNIE (podmieniamy dopiero
 *     wywołanie), więc job `test` musi mieć ten pakiet. Wersja pochodzi
 *     z `srodowisko-colab.json` (ADR-016 D1: jedno źródło prawdy o środowisku)
 *     — workflow ją STAMTĄD CZYTA, więc nie ma już dwóch kopii do porównywania.
 *     Bramka pomostowa, która tu stała, zastąpiona kontraktem środowiska:
 *     `tests/unit/ds/srodowisko-silnikow.contract.test.ts` (ADR-016 D2).
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import { evaluateChecks, parseChecks, type StampPayload } from "@/lib/curriculum/lab-checks";
import { atomCode, parseToken, signToken } from "@/lib/curriculum/lab-token";
import {
	buildNotebook,
	listNotebookSources,
	sharedStampBlock,
} from "../../../tools/build-notebooks";
// Atomy niosą klucze odpowiedzi → prywatne repo treści (tools/tresc-prywatna.ts).
// Notebooki i ich źródła ZOSTAJĄ publiczne — student je pobiera.
import { czytajTrescJson, describeTresc } from "../../support/tresc-prywatna";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "tools", "content", "notebooks");
const OUT_DIR = join(ROOT, "notebooks");
const HARNESS = join(ROOT, "tests", "unit", "ds", "notebook-stamp-harness.py");

const STUDENT_ID = "student-parytet-meda-fixture";
const itemIdFor = (slug: string) => `item-${slug}-fixture`;

/**
 * Każdy scenariusz odpala OSOBNY proces python3 z importem pandas i requests.
 * Na świeżej maszynie CI pierwszy taki import potrafi zająć kilka sekund —
 * domyślne 5 s Vitesta wywracało wtedy pierwszy test partii M-PD/M-SQL.
 * Limit hojny celowo: ma łapać zawieszkę, nie zimny start.
 */
const HARNESS_TIMEOUT_MS = 30_000;

type HarnessResult = { stdout: string; error: string | null };

function runHarness(req: Record<string, unknown>): HarnessResult {
	const out = execFileSync("python3", [HARNESS], {
		input: JSON.stringify(req),
		encoding: "utf8",
	});
	return JSON.parse(out) as HarnessResult;
}

/** Token pieczątki to jedyna linia w formacie base64url.podpis12hex. */
function tokenFrom(stdout: string): string | null {
	const m = stdout.match(/^[A-Za-z0-9_-]+\.[0-9a-f]{12}$/m);
	return m ? m[0] : null;
}

type PackedMeda = {
	items: { slug: string; kind: string; config?: { notebookUrl?: unknown; checks?: unknown } }[];
};

function packedMeda(): PackedMeda {
	return czytajTrescJson<PackedMeda>("tools/content/curriculum-atoms/m-eda.json", {
		items: [],
	} as PackedMeda);
}

// ───────────────────────────────────────────────────────────────────────────
// ATRAPA API BDL — warstwa testowa, której notebook studenta NIE MA.
//
// Kształt 1:1 z żywej odpowiedzi (pomiar 2026-07-22, `requests.get` na
// `bdl.stat.gov.pl/api/v1/data/by-variable/60270`). Świadomie odtworzone:
//   • `id` jednostki jako TEKST z samych cyfr — bez tego regresja KRYT-1
//     nie miałaby czego łapać,
//   • `year` jako TEKST — bez tego check C4 („konwersja int wykonana")
//     przechodziłby za darmo,
//   • brak `page-size` ⇒ pierwsza strona = 10 rekordów (paginacja z EDA.1),
//   • zły adres ⇒ 404 z jedynym kluczem `errors` (rytuał czytania błędu).
// ───────────────────────────────────────────────────────────────────────────
const ATRAPA_NAGLOWEK = `# --- ATRAPA API BDL (warstwa testowa; notebook studenta jej nie ma) ---
import json as _json

import requests as _requests

_JEDNOSTKI = [
    ("011200000000", "MAŁOPOLSKIE"),
    ("012400000000", "ŚLĄSKIE"),
    ("020800000000", "LUBUSKIE"),
    ("023000000000", "WIELKOPOLSKIE"),
    ("023200000000", "ZACHODNIOPOMORSKIE"),
    ("030200000000", "DOLNOŚLĄSKIE"),
    ("031600000000", "OPOLSKIE"),
    ("040400000000", "KUJAWSKO-POMORSKIE"),
    ("042200000000", "POMORSKIE"),
    ("042800000000", "WARMIŃSKO-MAZURSKIE"),
    ("051000000000", "ŁÓDZKIE"),
    ("052600000000", "ŚWIĘTOKRZYSKIE"),
    ("060600000000", "LUBELSKIE"),
    ("061800000000", "PODKARPACKIE"),
    ("062000000000", "PODLASKIE"),
    ("071400000000", "MAZOWIECKIE"),
]


class _OdpowiedzAtrapy:
    def __init__(self, status_code, tresc):
        self.status_code = status_code
        self._tresc = tresc

    def json(self):
        return _json.loads(_json.dumps(self._tresc))


class _AtrapaBDL:
    def __init__(self, wartosc):
        self._wartosc = wartosc

    def get(self, url, params=None):
        params = dict(params or {})
        if "/by-variable/" not in url:
            return _OdpowiedzAtrapy(
                404,
                {"errors": [{"errorResult": "Nieprawidłowy url " + url, "errorCode": 1}]},
            )
        lata = params.get("year", 2023)
        if not isinstance(lata, (list, tuple)):
            lata = [lata]
        strona = int(params.get("page-size", 10))
        wyniki = []
        for i, (ident, nazwa) in enumerate(_JEDNOSTKI[:strona]):
            wyniki.append(
                {
                    "id": ident,
                    "name": nazwa,
                    "values": [
                        {"year": str(rok), "val": self._wartosc(i, rok), "attrId": 1}
                        for rok in lata
                    ],
                }
            )
        return _OdpowiedzAtrapy(
            200,
            {
                "totalRecords": len(_JEDNOSTKI),
                "variableId": 60270,
                "measureUnitId": 8,
                "aggregateId": 1,
                "lastUpdate": "2026-07-22T00:00:00",
                "results": wyniki,
            },
        )


def _bez_sieci(*_a, **_k):
    raise AssertionError(
        "STRAZNIK SIECI: test poszedl do zywego BDL - podmiana wywolania "
        "requests.get nie trafila (kotwica w notebooku sie zmienila?)"
    )


_requests.get = _bez_sieci
_requests.request = _bez_sieci
_requests.Session.request = _bez_sieci
`;

/** Komórka atrapy z podaną funkcją wartości pomiaru (`wartosc(i, rok)`). */
function atrapaBdl(wartosc: string): string {
	return `${ATRAPA_NAGLOWEK}\n_ATRAPA_BDL = _AtrapaBDL(${wartosc})\n`;
}

/** Realistyczne stopy bezrobocia (rząd wielkości jak w BDL: kilka procent). */
const WARTOSCI_REALNE =
	"lambda i, rok: round(3.0 + i * 0.4 + (0.2 if str(rok) == '2023' else 0.0), 1)";
/** Wartości z sufitu — do dowodu, że ładunek NIE niesie danych. */
const WARTOSCI_ABSURDALNE = "lambda i, rok: float(100 + i * 7)";

/** Kotwice podmiany: wywołanie sieciowe → atrapa. Ich brak = czerwony test niżej. */
const KOTWICA_EDA4 = "odpowiedz = requests.get(url, params=parametry)";
const PODMIANA_EDA4: [string, string] = [
	KOTWICA_EDA4,
	"odpowiedz = _ATRAPA_BDL.get(url, params=parametry)",
];
const KOTWICA_EDA1 = "requests.get(";
const PODMIANA_EDA1: [string, string] = [KOTWICA_EDA1, "_ATRAPA_BDL.get("];

// Wzorcowe uzupełnienie luk EDA.4 (hint 3 dokumentu Sophii). Lewa strona to
// DOKŁADNY fragment ze źródła percent — pieczątka nie toleruje przybliżeń.
const LUKA_1: [string, string] = ["wojewodztwo[______]", 'wojewodztwo["name"]'];
const LUKA_2: [string, string] = ["pomiar[______]", 'pomiar["val"]'];
const LUKI_45: [string, string] = [
	"df.groupby(______)[______].mean()",
	'df.groupby("rok")["stopa"].mean()',
];
const LUKI_WZORCOWE: [string, string][] = [LUKA_1, LUKA_2, LUKI_45];
const PAYLOAD_EDA4: StampPayload = {
	status: 200,
	kolumny: 3,
	wiersze: 32,
	rok_liczbowy: true,
	srednie_zgodne: true,
};

beforeAll(() => {
	// Jak w lab-checks.test.ts — fixture, nie sekret.
	process.env.LAB_TOKEN_SECRET = ["fixture", "testowy", "krok4", "nie", "sekret"].join("-");
});

describeTresc("notebooki M-EDA — warstwy, drift buildera i podział lab/ćwiczenie", () => {
	const sources = listNotebookSources().filter((s) => s.module === "meda");
	const items = packedMeda().items;
	const atoms = items.filter((i) => i.slug !== "eda-przeglad");
	const labSlugs = items.filter((i) => i.kind === "lab").map((i) => i.slug);

	it("istnieją 4 źródła M-EDA — po jednym na atom EDA.1–EDA.4 (przegląd bez notebooka)", () => {
		expect(sources).toHaveLength(4);
		expect(atoms).toHaveLength(4);
		// Pieczątkę ma WYŁĄCZNIE eda-4; EDA.1–EDA.3 to ćwiczenia zaliczane
		// pytaniami — notebook, który nie ma czego bramkować, nie ma prawa
		// wystawić tokenu (ADR-015 §7).
		expect(labSlugs).toEqual(["eda-4"]);
		const files = readdirSync(join(OUT_DIR, "meda")).filter((f) => f.endsWith(".ipynb"));
		for (const atom of atoms) {
			const matching = files.filter((f) => f.startsWith(`${atom.slug}-`));
			expect(matching, `notebook dla ${atom.slug}`).toHaveLength(1);
		}
	});

	it("notebookUrl KAŻDEGO atomu M-EDA wskazuje na Colaba i na ISTNIEJĄCY plik; przegląd bez URL-a", () => {
		// Pułapka z partii M-PD: manifest packera może wskazywać plik, którego
		// nie ma w repo — student dostałby wtedy 404 zamiast notebooka.
		const files = new Set(readdirSync(join(OUT_DIR, "meda")).filter((f) => f.endsWith(".ipynb")));
		for (const atom of atoms) {
			const url = atom.config?.notebookUrl;
			expect(typeof url, `${atom.slug}: config.notebookUrl`).toBe("string");
			const parsed = new URL(url as string);
			expect(parsed.host).toBe("colab.research.google.com");
			const file = parsed.pathname.split("/").at(-1) ?? "";
			expect(files.has(file), `${atom.slug}: plik ${file} istnieje w notebooks/meda`).toBe(true);
			expect(file.startsWith(`${atom.slug}-`), `${atom.slug}: nazwa pliku od sluga`).toBe(true);
		}
		const przeglad = items.find((i) => i.slug === "eda-przeglad");
		expect(przeglad?.config?.notebookUrl).toBeUndefined();
	});

	it("zbudowane .ipynb w repo == świeży rebuild ze źródeł (zero ręcznych edycji)", () => {
		for (const src of sources) {
			const rebuilt = buildNotebook(join(SRC_DIR, src.module, src.file), src.slug);
			const committed = readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8");
			expect(committed, src.slug).toBe(rebuilt);
		}
	});

	it("lab ma DOKŁADNIE jedną pieczątkę ze wspólnym blokiem; ćwiczenia — ZERO", () => {
		// Blok wspólny (podpis + wypisanie tokenu) musi wejść bajt w bajt —
		// każda lokalna wariacja rozjeżdża parytet Python↔TS.
		const shared = sharedStampBlock();
		for (const src of sources) {
			const nb = JSON.parse(
				readFileSync(join(OUT_DIR, src.module, `${src.slug}.ipynb`), "utf8"),
			) as { cells: { cell_type: string; source: string[] }[] };
			const stampCells = nb.cells.filter(
				(c) => c.cell_type === "code" && c.source.join("").includes("_pieczatka_token"),
			);
			const isLab = labSlugs.some((slug) => src.slug.startsWith(`${slug}-`));
			if (isLab) {
				expect(stampCells, `${src.slug}: lab ma pieczątkę`).toHaveLength(1);
				const source = stampCells[0].source.join("");
				expect(source.endsWith(shared), `${src.slug}: blok wspólny bajt w bajt`).toBe(true);
				expect(source).toContain("def _zbierz_wyniki");
			} else {
				expect(stampCells, `${src.slug}: ćwiczenie BEZ pieczątki`).toHaveLength(0);
			}
		}
	});
});

describeTresc("parytet pieczątki M-EDA: stringi wielolinijkowe i typy w ładunku", () => {
	const STAMP_PATH = join(SRC_DIR, "pieczatka.py");
	const PARITY_PAYLOADS: { name: string; payload: StampPayload; floatKeys?: string[] }[] = [
		{
			name: "ładunek EDA.4: liczby całkowite + flagi logiczne",
			payload: { status: 200, kolumny: 3, wiersze: 32, rok_liczbowy: true, srednie_zgodne: true },
		},
		{
			// Diagnozy pieczątki cytują wartości z API — gdyby kiedyś trafiły
			// do ładunku, polskie znaki i wielolinijkowość muszą przejść.
			name: "wielolinijkowy string z polskimi znakami i cudzysłowami",
			payload: {
				_zrodlo: 'nazwa = "WARMIŃSKO-MAZURSKIE"\nprint(f"{nazwa} — {5.9}%")\n',
			},
		},
		{
			// JSON nie odróżnia 2 od 2.0 — kanonizacja musi zrzucić „.0"
			// identycznie po obu stronach (Python i TS).
			name: "float całkowity (2.0) kanonizowany bez ogona",
			payload: { srednia: 2 },
			floatKeys: ["srednia"],
		},
	];

	for (const testCase of PARITY_PAYLOADS) {
		it(
			`ładunek: ${testCase.name}`,
			() => {
				const itemId = itemIdFor("parity");
				const code = atomCode(STUDENT_ID, itemId);
				const result = runHarness({
					mode: "payload",
					stampPath: STAMP_PATH,
					atomCode: code,
					payload: testCase.payload,
					floatKeys: testCase.floatKeys ?? [],
				});
				expect(result.error).toBeNull();
				const token = tokenFrom(result.stdout);
				expect(token, `token w stdout:\n${result.stdout}`).not.toBeNull();
				expect(token).toBe(signToken(code, testCase.payload));
				expect(parseToken(STUDENT_ID, itemId, token as string).ok).toBe(true);
			},
			HARNESS_TIMEOUT_MS,
		);
	}
});

describeTresc("odcięcie od żywego API BDL — atrapa, strażnik i niezależność ładunku", () => {
	const notebookPath = (slug: string) => {
		const file = readdirSync(join(OUT_DIR, "meda")).find((f) => f.startsWith(`${slug}-`));
		if (!file) throw new Error(`brak notebooka dla ${slug}`);
		return join(OUT_DIR, "meda", file);
	};
	const zrodlo = (slug: string) => readFileSync(notebookPath(slug), "utf8");

	it("kotwice podmiany istnieją DOSŁOWNIE w zbudowanych notebookach", () => {
		// Podmiana, która nie trafia, jest cichym no-opem — test poszedłby
		// wtedy do żywego BDL i zieleniałby zależnie od pogody w internecie.
		// Ten test zamienia taki dryf w czerwony wynik z konkretem.
		const eda4 = JSON.parse(zrodlo("eda-4")) as { cells: { source: string[] }[] };
		const kod4 = eda4.cells.map((c) => c.source.join("")).join("\n");
		expect(kod4).toContain("import requests");
		expect(kod4.split(KOTWICA_EDA4)).toHaveLength(2); // dokładnie jedno wystąpienie

		const eda1 = JSON.parse(zrodlo("eda-1")) as { cells: { source: string[] }[] };
		const kod1 = eda1.cells.map((c) => c.source.join("")).join("\n");
		expect(kod1).toContain("import requests");
		// EDA.1 pyta API trzy razy: pobranie, ta sama prośba bez page-size,
		// zły adres (rytuał czytania błędu).
		expect(kod1.split(KOTWICA_EDA1).length - 1).toBe(3);
	});

	it(
		"strażnik działa: atrapa BEZ podmiany wywołania NIE idzie po cichu do sieci",
		() => {
			const result = runHarness({
				mode: "notebook",
				notebookPath: notebookPath("eda-4"),
				atomCode: atomCode(STUDENT_ID, itemIdFor("eda-4")),
				replacements: [],
				insertCells: [[0, atrapaBdl(WARTOSCI_REALNE)]],
			});
			expect(result.error).toMatch(/STRAZNIK SIECI/);
			expect(tokenFrom(result.stdout)).toBeNull();
		},
		HARNESS_TIMEOUT_MS,
	);

	it(
		"ładunek EDA.4 NIE niesie wartości stóp: atrapa z absurdalnymi danymi daje ten sam token",
		() => {
			// Dowód (a nie założenie), że wolno testować na atrapie: sesja
			// z realistycznymi stopami i sesja z wartościami 100, 107, 114…
			// dają IDENTYCZNY token. Zweryfikowane też przeciwko ŻYWEMU BDL
			// 2026-07-22 (ten sam token `…e9a705dce252`) — tamten przebieg
			// świadomie NIE wchodzi do CI (sieć, limit 429, niedeterminizm).
			const code = atomCode(STUDENT_ID, itemIdFor("eda-4"));
			const tokeny = [WARTOSCI_REALNE, WARTOSCI_ABSURDALNE].map((wartosc) => {
				const result = runHarness({
					mode: "notebook",
					notebookPath: notebookPath("eda-4"),
					atomCode: code,
					replacements: [...LUKI_WZORCOWE, PODMIANA_EDA4],
					insertCells: [[0, atrapaBdl(wartosc)]],
				});
				expect(result.error).toBeNull();
				const token = tokenFrom(result.stdout);
				expect(token, `token w stdout:\n${result.stdout}`).not.toBeNull();
				return token;
			});
			expect(tokeny[0]).toBe(tokeny[1]);
			expect(tokeny[0]).toBe(signToken(code, PAYLOAD_EDA4));
		},
		HARNESS_TIMEOUT_MS,
	);

	it(
		"EDA.1 (ćwiczenie) wykonuje się od góry do dołu i pokazuje liczby obiecane w treści",
		() => {
			const result = runHarness({
				mode: "notebook",
				notebookPath: notebookPath("eda-1"),
				atomCode: atomCode(STUDENT_ID, itemIdFor("eda-1")),
				replacements: [PODMIANA_EDA1],
				insertCells: [[0, atrapaBdl(WARTOSCI_REALNE)]],
			});
			expect(result.error).toBeNull();
			// Cztery obietnice z prozy atomu, każda wypisana przez notebook:
			expect(result.stdout).toMatch(/^200$/m); // status udanego pobrania
			expect(result.stdout).toContain("'totalRecords'"); // klucze odpowiedzi
			expect(result.stdout).toMatch(/^16 10$/m); // paginacja: JEST 16, dostałeś 10
			expect(result.stdout).toMatch(/^404$/m); // zły adres to ODPOWIEDŹ
			expect(result.stdout).toMatch(/^\['errors'\]$/m); // …a błąd wraca JSON-em
			// Ćwiczenie NIE MA prawa wystawić tokenu.
			expect(tokenFrom(result.stdout)).toBeNull();
		},
		HARNESS_TIMEOUT_MS,
	);

	it(
		"EDA.2 i EDA.3 (ćwiczenia bez sieci) wykonują się bez błędu i bez tokenu",
		() => {
			for (const slug of ["eda-2", "eda-3"]) {
				const result = runHarness({
					mode: "notebook",
					notebookPath: notebookPath(slug),
					atomCode: atomCode(STUDENT_ID, itemIdFor(slug)),
					// Strażnik sieci także tutaj. Dziś te źródła nie importują
					// `requests`, więc komórka jest nadmiarowa — ale EDA.2 jest
					// o Gicie i GitHubie i pierwsza rewizja, która dołoży
					// zapytanie do API GitHuba, zamieniłaby ten test w cichy
					// ruch do internetu: zielony, dopóki sieć działa. Strażnik
					// robi z tego AssertionError zamiast pogody w CI.
					insertCells: [[0, atrapaBdl(WARTOSCI_REALNE)]],
				});
				expect(result.error, `${slug}: wykonanie od góry do dołu`).toBeNull();
				expect(tokenFrom(result.stdout), `${slug}: brak tokenu`).toBeNull();
			}
		},
		HARNESS_TIMEOUT_MS,
	);
});

describeTresc("symulacja sesji studenta EDA.4: komórki → token → checki z prodowego JSON-a", () => {
	const checksBySlug = new Map(
		packedMeda()
			.items.filter((i) => i.kind === "lab")
			.map((i) => [i.slug, parseChecks(i.config)]),
	);
	const notebookPath = (slug: string) => {
		const file = readdirSync(join(OUT_DIR, "meda")).find((f) => f.startsWith(`${slug}-`));
		if (!file) throw new Error(`brak notebooka dla ${slug}`);
		return join(OUT_DIR, "meda", file);
	};

	const HAPPY: { name: string; replacements: [string, string][] }[] = [
		{
			name: "eda-4: cztery luki wypełnione wzorcowo → token zalicza wszystkie checki",
			replacements: LUKI_WZORCOWE,
		},
		{
			// REGRESJA WAŻN-3 (1/2): `as_index=False` oddaje TABELĘ z kolumną
			// `rok` zamiast serii z indeksem — pieczątka mówiła wtedy „grupy to
			// ['0','1'], grupujesz po złej kolumnie" studentowi, który zrobił
			// dobrze. Fałszywy alarm to defekt bramki, nie drobiazg.
			name: "eda-4 (WAŻN-3): groupby(..., as_index=False) — ten sam token",
			replacements: [
				LUKA_1,
				LUKA_2,
				[LUKI_45[0], 'df.groupby("rok", as_index=False)["stopa"].mean()'],
			],
		},
		{
			// REGRESJA WAŻN-3 (2/2): `mean(numeric_only=True)` oddaje tabelę
			// z indeksem `rok` i kolumną `stopa` — też legalny zapis.
			name: "eda-4 (WAŻN-3): groupby('rok').mean(numeric_only=True) — ten sam token",
			replacements: [LUKA_1, LUKA_2, [LUKI_45[0], 'df.groupby("rok").mean(numeric_only=True)']],
		},
	];

	for (const scenario of HAPPY) {
		it(
			scenario.name,
			() => {
				const itemId = itemIdFor("eda-4");
				const code = atomCode(STUDENT_ID, itemId);
				const result = runHarness({
					mode: "notebook",
					notebookPath: notebookPath("eda-4"),
					atomCode: code,
					replacements: [...scenario.replacements, PODMIANA_EDA4],
					insertCells: [[0, atrapaBdl(WARTOSCI_REALNE)]],
				});
				expect(result.error).toBeNull();
				const token = tokenFrom(result.stdout);
				expect(token, `token w stdout:\n${result.stdout}`).not.toBeNull();
				// Python i TS produkują IDENTYCZNY token…
				expect(token).toBe(signToken(code, PAYLOAD_EDA4));

				const parsed = parseToken(STUDENT_ID, itemId, token as string);
				expect(parsed.ok).toBe(true);
				if (!parsed.ok) return;

				// …i serwerowe checki C1–C5 z m-eda.json przechodzą.
				const checks = checksBySlug.get("eda-4");
				expect(checks, "checki eda-4 w m-eda.json").toBeDefined();
				expect(checks?.length).toBe(5);
				const verdict = evaluateChecks(checks ?? [], parsed.payload);
				expect(verdict.passed, JSON.stringify(verdict.results)).toBe(true);
			},
			HARNESS_TIMEOUT_MS,
		);
	}

	const REFUSALS: {
		name: string;
		replacements?: [string, string][];
		skipCells?: number[];
		insertCells?: [number, string][];
		/** Odmowa pieczątki (komunikat) — domyślnie oczekiwana. */
		message?: RegExp;
		/** …albo wyjątek sesji, gdy błąd wywala się PRZED pieczątką. */
		error?: RegExp;
	}[] = [
		{
			// REGRESJA KRYT-1 — sedno defektu: `id` jednostki BDL to TEKST
			// ("011200000000"), więc kontrola typu kolumny przepuszczała
			// błędną lukę 1 i wystawiała token identyczny z poprawnym.
			name: "eda-4 (KRYT-1): luka 1 = `id` zamiast `name` — ZERO tokenu, odmowa cytuje wartość",
			replacements: [["wojewodztwo[______]", 'wojewodztwo["id"]'], LUKA_2, LUKI_45],
			message: /wartości spoza nazw województw z odpowiedzi API[\s\S]*011200000000/,
		},
		{
			// REGRESJA U1 (1/3) — defekt, który przeszedł przez pierwszą naprawę
			// KRYT-1: `values` to lista słowników, więc „są w tym litery" mówiło
			// TAK. Kształt tabeli się zgadza (3 kolumny, 32 wiersze), ładunek
			// niesie tylko kształt — token wychodził bit w bit ten sam co
			// poprawny, na labie, którego CELEM jest spłaszczenie JSON-a.
			name: "eda-4 (U1): luka 1 = `values` — lista pomiarów zamiast nazwy, ZERO tokenu",
			replacements: [["wojewodztwo[______]", 'wojewodztwo["values"]'], LUKA_2, LUKI_45],
			message: /wartości spoza nazw województw z odpowiedzi API[\s\S]*'year': '2022'/,
		},
		{
			// REGRESJA U1 (2/3) — cały rekord zamiast pola. Też przechodziło:
			// w reprezentacji słownika są litery. Klasa: „wartość kolumny nie
			// pochodzi ze zbioru nazw z `dane`".
			name: "eda-4 (U1): luka 1 bez klucza — cały rekord w kolumnie, ZERO tokenu",
			replacements: [["wojewodztwo[______]", "wojewodztwo"], LUKA_2, LUKI_45],
			message: /wartości spoza nazw województw z odpowiedzi API[\s\S]*MAŁOPOLSKIE/,
		},
		{
			// REGRESJA U1 (3/3) — ta sama klasa w luce 2: `attrId` jest LICZBĄ,
			// więc kontrola typu ją przepuszczała, a średnie liczone na tym
			// samym `df` zgadzały się same ze sobą. Znalezione pomiarem
			// wszystkich pól rekordu pomiaru, nie zgadywaniem.
			name: "eda-4 (U1): luka 2 = `attrId` — liczba spoza pomiarów, ZERO tokenu",
			replacements: [LUKA_1, ["pomiar[______]", 'pomiar["attrId"]'], LUKI_45],
			message: /w kolumnie `stopa` są liczby spoza wartości pomiarów z odpowiedzi API[\s\S]*1\.0/,
		},
		{
			// Nowa ścieżka odmowy wprowadzona naprawą U1: pieczątka czyta teraz
			// `dane`, więc nadpisanie tej nazwy musi dać KOMUNIKAT, nie
			// KeyError/AttributeError z wnętrza pieczątki.
			name: "eda-4 (U1): `dane` nadpisane w sesji — odmowa mówi, co przywrócić",
			replacements: LUKI_WZORCOWE,
			insertCells: [[6, 'dane = "moje notatki"\n']],
			message: /nie widzę w `dane` odpowiedzi API z nazwami województw/,
		},
		{
			// WAŻN-2: błędna luka 2 nie dociera do pieczątki — wywala się
			// komórka średniej. Treść to ZAPOWIADA (prefiks komunikatu wg
			// konwencji ADR-016 D5), więc test pilnuje, że zapowiedź jest prawdą.
			name: "eda-4 (WAŻN-2): luka 2 = `year` — TypeError w komórce średniej, nie w pieczątce",
			replacements: [LUKA_1, ["pomiar[______]", 'pomiar["year"]'], LUKI_45],
			error: /^TypeError: agg function failed/,
		},
		{
			name: "eda-4: zapytanie bez page-size — 20 wierszy, odmowa z diagnozą paginacji",
			replacements: [
				LUKA_1,
				LUKA_2,
				LUKI_45,
				[
					'parametry = {"unit-level": 2, "year": [2022, 2023], "format": "json", "page-size": 20}',
					'parametry = {"unit-level": 2, "year": [2022, 2023], "format": "json"}',
				],
			],
			message: /liczba wierszy w `df` to 20[\s\S]*bez page-size/,
		},
		{
			name: "eda-4: pętla wewnętrzna bierze jeden pomiar — 16 wierszy, odmowa nazywa przyczynę",
			replacements: [
				LUKA_1,
				LUKA_2,
				LUKI_45,
				['wojewodztwo["values"]:', 'wojewodztwo["values"][:1]:'],
			],
			message: /liczba wierszy w `df` to 16[\s\S]*pętla wewnętrzna/,
		},
		{
			name: "eda-4: dodatkowe pole w rekordzie — 4 kolumny zamiast 3, odmowa odporna na odmianę",
			replacements: [
				LUKA_1,
				["pomiar[______],", 'pomiar["val"], "attr": pomiar["attrId"],'],
				LUKI_45,
			],
			message: /liczba kolumn w `df` to 4, a ma być 3/,
		},
		{
			// INFO-3: diagnoza wypisywała wszystkie 16 nazw — skrócona do dwóch
			// z wielokropkiem. Test pilnuje i sedna (grupujesz po województwie),
			// i tego, że komunikat nie jest ścianą tekstu.
			name: "eda-4: luka 4 = województwo zamiast roku — 16 grup, odmowa z krótką diagnozą",
			replacements: [LUKA_1, LUKA_2, [LUKI_45[0], 'df.groupby("wojewodztwo")["stopa"].mean()']],
			message: /grupy: 16 grup \(DOLNOŚLĄSKIE, KUJAWSKO-POMORSKIE, \.\.\.\)[\s\S]*mają być lata/,
		},
		{
			// C5 z zębami: suma zamiast średniej ma te same grupy, inne wartości.
			name: "eda-4: suma zamiast średniej — grupy się zgadzają, wartości nie; odmowa",
			replacements: [LUKA_1, LUKA_2, [LUKI_45[0], 'df.groupby("rok")["stopa"].sum()']],
			message: /średnia dla roku 2022 nie zgadza się z niezależnym przeliczeniem/,
		},
		{
			// Komórki kodu eda-4: 0=pobranie, 1=podgląd rekordu, 2=spłaszczenie,
			// 3=head, 4=średnie, 5=wykres, 6=pieczątka.
			name: "eda-4: komórka średnich nie wykonana — pieczątka odmawia z listą braków",
			replacements: [LUKA_1, LUKA_2],
			skipCells: [4],
			message: /Nie widzę w tej sesji: srednie_rok/,
		},
		{
			// INFO-2 z logu QG: realna siła checku C1. Student ponawia pobranie,
			// dostaje 429, ale ma w pamięci `df` z poprzedniego, udanego biegu —
			// pieczątka MUSI odmówić zamiast podpisać nieaktualne pobranie.
			name: "eda-4 (INFO-2): ponowione pobranie zwraca 429 — pieczątka nie podpisuje starej sesji",
			replacements: LUKI_WZORCOWE,
			insertCells: [
				[6, "odpowiedz = _ATRAPA_BDL.get(url, params=parametry)\nodpowiedz.status_code = 429\n"],
			],
			message: /status pobrania w tej sesji to 429, a ma być 200/,
		},
	];

	for (const scenario of REFUSALS) {
		it(
			scenario.name,
			() => {
				const result = runHarness({
					mode: "notebook",
					notebookPath: notebookPath("eda-4"),
					atomCode: atomCode(STUDENT_ID, itemIdFor("eda-4")),
					replacements: [...(scenario.replacements ?? []), PODMIANA_EDA4],
					skipCells: scenario.skipCells ?? [],
					insertCells: [[0, atrapaBdl(WARTOSCI_REALNE)], ...(scenario.insertCells ?? [])],
				});
				// Pod żadnym pozorem nie może wypaść token.
				expect(tokenFrom(result.stdout), `stdout:\n${result.stdout}`).toBeNull();
				if (scenario.error) {
					expect(result.error ?? "").toMatch(scenario.error);
					return;
				}
				// Odmowa ma być KOMUNIKATEM pieczątki, nie wyjątkiem sesji…
				expect(result.error).toBeNull();
				expect(result.stdout).toMatch(scenario.message as RegExp);
			},
			HARNESS_TIMEOUT_MS,
		);
	}

	it("token eda-4 wklejony przy innej pozycji jest odrzucany (bad_signature)", () => {
		const token = signToken(atomCode(STUDENT_ID, itemIdFor("eda-4")), PAYLOAD_EDA4);
		const parsed = parseToken(STUDENT_ID, itemIdFor("eda-1"), token);
		expect(parsed).toEqual({ ok: false, reason: "bad_signature" });
	});
});
