// @vitest-environment node
//
// SPIS POWIELONYCH BRAMEK — strażnik świadomego drugiego nośnika.
//
// PO CO TO ISTNIEJE
// -----------------
// `CLAUDE.md` §8 v1.17 dopuszcza świadome powielenie tej samej reguły w wielu
// miejscach WYŁĄCZNIE pod dwoma warunkami naraz:
//   (1) jest test-strażnik, który PADA, gdy kopie się rozjadą,
//   (2) jest JAWNY PRÓG konsolidacji.
// Ten plik jest jednym i drugim: sprawdza zgodność kopii (niżej) i wykonuje
// próg (niżej), zamiast go tylko deklarować w komentarzu.
//
// CO JEST POWIELONE
// -----------------
// Wzorzec rozpoznający lokalną bazę testową po fragmencie `użytkownik@host`:
//
//     /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//
//
// Żyje w każdym pliku `*.integration.test.*` (bramka `dBack = … ? describe :
// describe.skip`) oraz — i to jest ta część, o której łatwo zapomnieć — w dwóch
// testach Playwrighta POZA projektem `integration`, gdzie warunek wstępny
// z `integration-db-guard.ts` nie sięga.
//
// ═══ PRÓG KONSOLIDACJI (wymóg v1.17 pkt 2) ═══
//
// Konsolidujemy powielone bramki do jednego źródła:
//
//   PRÓG A — przy PIERWSZEJ ZMIANIE WZORCA bramki. W chwili, gdy ktokolwiek
//            musi zmienić semantykę rozpoznawania bazy testowej, edytuje się
//            JEDNO miejsce, nie N. Wyzwalany maszynowo: test „wszystkie kopie
//            są dosłownie identyczne" (niżej) czerwieni się przy pierwszej
//            rozjeżdżonej kopii.
//
//   PRÓG B — przy POJAWIENIU SIĘ TRZECIEGO NOŚNIKA POZA projektem
//            `integration`. Dziś są dokładnie dwa i są wymienione z nazwy.
//            Tam nie sięga strażnik projektowy, więc każdy nowy nośnik poza
//            `integration` to NOWA dziura na ciche pominięcie — nie kolejna
//            kopia tej samej, już domkniętej. Wyzwalany maszynowo: test
//            „nośniki poza `integration` to dokładnie te dwa" (niżej).
//
// Właściciel obu progów: Quinn (QA). Opis długu i planu konsolidacji:
// `docs/2026-08-10-dlug-bramki-powielone-i-syllabus.md`.
//
// ŚWIADOMIE NIE MA progu „liczba kopii przekroczyła N". Powód jest
// merytoryczny, nie wygodowy: wewnątrz projektu `integration` ciche pominięcie
// jest już odcięte warunkiem wstępnym (`integration-db-guard.ts`), więc kolejna
// kopia tam podnosi koszt przyszłej konsolidacji, ale NIE podnosi ryzyka.
// Bramka na samą liczbę czerwieniłaby się przy co drugim nowym teście
// integracyjnym i uczyłaby ludzi podbijać liczbę bez myślenia — czyli
// produkowałaby dokładnie ten odruch, który ten plik ma zwalczać.
//
// DLACZEGO SPIS LICZY SAM, ZAMIAST TRZYMAĆ LICZBĘ W KOMENTARZU
// ------------------------------------------------------------
// Bo liczba w prozie gnije, i to szybko. Zmierzone na tym repo:
// nośników było 36 (2026-07-23), 53 (2026-07-30), 58 (2026-08-06) i 59
// (2026-08-10). Opis tego PR-a niósł „53" — liczbę prawdziwą przez trzy dni
// lipca. Liczba wpisana ręcznie zawsze opisuje przeszłość; liczba mierzona
// w przebiegu opisuje teraźniejszość.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** Korzeń repo — liczony od położenia tego pliku, nie od katalogu roboczego. */
const KORZEN = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");

/** Katalogi przeszukiwane. Poza nimi wzorzec nie ma prawa żyć. */
const KATALOGI = ["src", "tests", "tools"];

/**
 * Wzorzec kanoniczny — zapisany jako TEKST, nie jako wyrażenie regularne.
 * Porównujemy znak po znaku, bo „równoważne semantycznie" nie wystarcza:
 * rozjazd zaczyna się od literówki, która nadal działa w 9 przypadkach na 10.
 */
const WZORZEC_KANONICZNY = String.raw`/@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//`;

/**
 * Nośniki POZA projektem `integration` — zamknięta lista (PRÓG B).
 * Oba czytają `E2E_DATABASE_URL ?? DATABASE_URL`, nie samo `DATABASE_URL`,
 * i gatują przez `test.skip(!isLocalTestDb, …)` Playwrighta. To dlatego
 * konsolidacja musi wystawić pomocnika przyjmującego adres ARGUMENTEM,
 * a nie czytającego środowisko samodzielnie.
 */
const NOSNIKI_POZA_INTEGRATION = [
	"tests/e2e-pw/60-c11-tutor.spec.ts",
	"tests/e2e-pw/70-b7-viva.spec.ts",
];

/**
 * Kopie, które ŚWIADOMIE nie używają wzorca kanonicznego — zamknięta lista
 * z powodem przy każdej pozycji.
 *
 * `ingest-curriculum` zaostrzył bramkę już 2026-07-26 (commit `d33ba28`, dług C1
 * z przeglądu Leo 1E.7 L2): `../ingest-curriculum` ładuje przy imporcie
 * `.env.local`, więc przy gołym `pnpm test:integration` adres wskazywał na bazę
 * DEWELOPERSKĄ, a suita — kasująca i przepisująca wiersze — pisała do niej,
 * wyglądając na pominiętą. Ten plik przeszedł więc na `isDedicatedTestDbUrl`
 * (host lokalny ORAZ nazwa bazy `test`/`_test`) i jest PROTOTYPEM semantyki,
 * którą warunek wstępny z `integration-db-guard.ts` uogólnia teraz na wszystkie
 * pliki. Rozjazd jest tu poprawą, nie zaniedbaniem — dlatego wpis, nie porażka.
 *
 * Wniosek dla konsolidacji: jedno źródło ma nieść semantykę
 * `isDedicatedTestDbUrl`, nie sam regexp na host.
 */
const WARIANTY_UZGODNIONE = new Map<string, string>([
	[
		"tools/__tests__/ingest-curriculum.integration.test.ts",
		"zaostrzenie do isDedicatedTestDbUrl (d33ba28, dług C1 przeglądu Leo 1E.7 L2)",
	],
]);

/**
 * Pliki `*.integration.test.*` świadomie BEZ bramki — zamknięta lista.
 *
 * `syllabus-pdf-upload` nie dotyka bazy: stoi w całości na atrapach (auth, model
 * AI), więc bramka byłaby w nim ozdobą. Wada jest nazewnicza — plik obiecuje
 * kontrakt na realnej bazie, którego nie sprawdza — i naprawia się przenosinami
 * do projektu `unit`. Dług: `docs/2026-08-10-dlug-bramki-powielone-i-syllabus.md`.
 *
 * Lista jest zamknięta celowo: DRUGI plik integracyjny bez bramki zapala
 * czerwone, zamiast dołączyć po cichu do znanego wyjątku.
 */
const INTEGRACYJNE_BEZ_BRAMKI = [
	"src/app/api/syllabus/parse/__tests__/syllabus-pdf-upload.integration.test.ts",
];

/** Dolna granica kontroli dodatniej — patrz test „spis w ogóle coś znajduje". */
const MINIMUM_WIARYGODNOSCI = 40;

/**
 * Szukana deklaracja, SKŁADANA W TRAKCIE PRZEBIEGU — nigdy nie występuje
 * dosłownie w źródle tego pliku.
 *
 * Powód nie jest kosmetyczny. Pierwszy przebieg tego spisu (2026-08-10) znalazł
 * 60 nośników zamiast 59: sześćdziesiątym był TEN plik, bo linia filtrująca
 * zawierała szukany napis dosłownie. Sonda złapała samą siebie i zameldowała
 * nieistniejący nośnik poza projektem `integration` — czyli skłamała w stronę
 * wygodną dla mierzącego (fałszywy alarm wygląda na czujność).
 *
 * To ta sama awaria co `grep`, który łapie własne `argv` (lekcja Leo, #265,
 * `skills/qa/SKILL.md` §8). Lekarstwo też to samo: rozdzielić narzędzie od
 * mierzonego, zamiast dopisywać wyjątek na siebie.
 */
const SZUKANA_DEKLARACJA = ["const", "isLocalTestDb"].join(" ");

interface Nosnik {
	/** Ścieżka względem korzenia repo. */
	plik: string;
	/** Numer linii (1-indeksowany) — żeby porażka mówiła GDZIE. */
	linia: number;
	/** Treść linii bez wcięcia. */
	tresc: string;
}

function czyKomentarz(linia: string): boolean {
	const t = linia.trimStart();
	return t.startsWith("*") || t.startsWith("//") || t.startsWith("/*");
}

function zbierzPliki(katalog: string, zebrane: string[] = []): string[] {
	for (const wpis of readdirSync(katalog)) {
		if (wpis === "node_modules" || wpis === ".next" || wpis === "dist") continue;
		const sciezka = join(katalog, wpis);
		if (statSync(sciezka).isDirectory()) {
			zbierzPliki(sciezka, zebrane);
		} else if (sciezka.endsWith(".ts") || sciezka.endsWith(".tsx")) {
			zebrane.push(sciezka);
		}
	}
	return zebrane;
}

/**
 * Spis ŻYWYCH nośników. „Żywy" = linia kodu, nie cytat w komentarzu.
 *
 * Rozróżnienie nie jest pedanterią: nagłówek `integration-db-guard.ts` cytuje
 * ten wzorzec dwukrotnie w dokumentacji, więc zwykły `grep` liczy o jeden za
 * dużo — i tak właśnie powstała rozbieżność „57 wg grepa / 56 realnych kopii"
 * w review tego PR-a.
 */
function spiszNosniki(): Nosnik[] {
	const nosniki: Nosnik[] = [];
	for (const katalog of KATALOGI) {
		for (const plik of zbierzPliki(join(KORZEN, katalog))) {
			const linie = readFileSync(plik, "utf8").split("\n");
			linie.forEach((tresc, i) => {
				if (!tresc.includes(SZUKANA_DEKLARACJA)) return;
				if (czyKomentarz(tresc)) return;
				nosniki.push({
					plik: relative(KORZEN, plik),
					linia: i + 1,
					tresc: tresc.trim(),
				});
			});
		}
	}
	return nosniki;
}

const NOSNIKI = spiszNosniki();

describe("spis powielonych bramek — kontrola dodatnia", () => {
	// Bez tego testu WSZYSTKIE asercje niżej są w postaci „dla każdego nośnika…",
	// czyli są PRAWDZIWE dla zbioru pustego. Zepsuty spacer po katalogach (zła
	// ścieżka korzenia, zmiana rozszerzeń, literówka we wzorcu wyszukiwania)
	// dawałby zero nośników i komplet zieleni — sonda milczałaby i to milczenie
	// czytałoby się jako „kopie są zgodne".
	//
	// Reguła (baza wiedzy QA, `skills/qa/SKILL.md` §8): sonda, której wynik
	// negatywny jest tym uspokajającym, wymaga kontroli dodatniej.
	it("spis w ogóle coś znajduje — inaczej każda asercja niżej jest pusta", () => {
		expect(NOSNIKI.length).toBeGreaterThanOrEqual(MINIMUM_WIARYGODNOSCI);
	});

	it("spis sięga POZA projekt integration — inaczej próg B jest ślepy", () => {
		// Druga kontrola dodatnia, węższa: spacer musi wchodzić do `tests/e2e-pw`.
		// Gdyby obejmował wyłącznie `src`, próg B nigdy by nie zadziałał, a jego
		// zieleń oznaczałaby „nie patrzyłem tam", nie „tam jest czysto".
		const pozaSrc = NOSNIKI.filter((n) => !n.plik.startsWith("src/"));
		expect(pozaSrc.length).toBeGreaterThan(0);
	});
});

describe("spis powielonych bramek — zgodność kopii (PRÓG A)", () => {
	it("każda kopia używa DOSŁOWNIE wzorca kanonicznego (poza uzgodnionymi wariantami)", () => {
		const rozjechane = NOSNIKI.filter(
			(n) => !n.tresc.includes(WZORZEC_KANONICZNY) && !WARIANTY_UZGODNIONE.has(n.plik),
		).map((n) => `${n.plik}:${n.linia}\n      ${n.tresc}`);

		expect(
			rozjechane,
			[
				"",
				"PRÓG A KONSOLIDACJI PRZEKROCZONY.",
				"",
				`Kopia bramki rozjechała się ze wzorcem kanonicznym (${NOSNIKI.length} kopii w repo).`,
				"Wzorzec kanoniczny:",
				`      ${WZORZEC_KANONICZNY}`,
				"",
				"To jest umówiony moment konsolidacji: zamiast poprawiać kopie po jednej,",
				"wystaw jedno źródło (pomocnik przyjmujący adres ARGUMENTEM — dwa nośniki",
				"e2e czytają E2E_DATABASE_URL, nie DATABASE_URL) i usuń powielenie.",
				"Właściciel: Quinn (QA). Dług: docs/2026-08-10-dlug-bramki-powielone-i-syllabus.md",
				"",
				"Rozjechane kopie:",
			].join("\n"),
		).toEqual([]);
	});
});

describe("spis powielonych bramek — lista wyjątków nie może zgnić", () => {
	// Wyjątek, który przestał być prawdziwy, jest gorszy niż brak wyjątku:
	// wygląda na świadomą decyzję, a jest śladem po nieistniejącym problemie.
	it("każdy uzgodniony wariant nadal istnieje i nadal jest wariantem", () => {
		const nieaktualne: string[] = [];
		for (const [plik, powod] of WARIANTY_UZGODNIONE) {
			const nosnik = NOSNIKI.find((n) => n.plik === plik);
			if (!nosnik) {
				nieaktualne.push(`${plik} — nośnik zniknął (powód wpisu: ${powod})`);
				continue;
			}
			if (nosnik.tresc.includes(WZORZEC_KANONICZNY)) {
				nieaktualne.push(`${plik} — wrócił do wzorca kanonicznego, wpis zbędny`);
			}
		}
		expect(nieaktualne, "Lista uzgodnionych wariantów rozeszła się z kodem").toEqual([]);
	});

	it("każdy plik z listy `bez bramki` nadal istnieje", () => {
		const wszystkie = new Set(
			KATALOGI.flatMap((k) => zbierzPliki(join(KORZEN, k))).map((p) => relative(KORZEN, p)),
		);
		const znikniete = INTEGRACYJNE_BEZ_BRAMKI.filter((p) => !wszystkie.has(p));
		expect(znikniete, "Plik z listy wyjątków już nie istnieje — usuń wpis").toEqual([]);
	});
});

describe("spis powielonych bramek — zakres poza projektem integration (PRÓG B)", () => {
	it("nośniki poza `integration` to DOKŁADNIE te dwa, które znamy", () => {
		const poza = NOSNIKI.filter((n) => !n.plik.includes(".integration.test.")).map((n) => n.plik);

		expect(
			poza.sort(),
			[
				"",
				"PRÓG B KONSOLIDACJI PRZEKROCZONY (albo nośnik zniknął).",
				"",
				"Poza projektem `integration` nie działa warunek wstępny z",
				"src/test/integration-db-guard.ts — plik z tą bramką MOŻE pominąć się",
				"po cichu i pokazać zieleń bez pokrycia. Dlatego lista jest zamknięta.",
				"",
				"Doszedł nośnik? Skonsoliduj (właściciel: Quinn) albo dopisz go tutaj",
				"ŚWIADOMIE, razem z powodem, dla którego wolno mu pomijać się cicho.",
				"Nośnik zniknął (np. po konsolidacji)? Zaktualizuj listę.",
			].join("\n"),
		).toEqual([...NOSNIKI_POZA_INTEGRATION].sort());
	});
});

describe("spis powielonych bramek — pliki integracyjne bez bramki", () => {
	it("każdy plik `*.integration.test.*` niesie bramkę, poza znanym wyjątkiem", () => {
		const plikiIntegracyjne = KATALOGI.flatMap((k) => zbierzPliki(join(KORZEN, k)))
			.map((p) => relative(KORZEN, p))
			.filter((p) => p.includes(".integration.test."));

		// Kontrola dodatnia dla TEGO testu: gdyby filtr nie łapał niczego,
		// „wszystkie mają bramkę" byłoby prawdą o zbiorze pustym.
		expect(plikiIntegracyjne.length).toBeGreaterThanOrEqual(MINIMUM_WIARYGODNOSCI);

		const zBramka = new Set(NOSNIKI.map((n) => n.plik));
		const bezBramki = plikiIntegracyjne.filter((p) => !zBramka.has(p)).sort();

		expect(
			bezBramki,
			[
				"",
				"Plik `*.integration.test.*` bez bramki bazy — nowy, nieuzgodniony.",
				"",
				"Nazwa obiecuje kontrakt na realnej bazie. Jeśli plik jej nie dotyka",
				"i stoi na atrapach, to jest test JEDNOSTKOWY w przebraniu — jego",
				"miejsce jest w projekcie `unit`, nie tutaj.",
				"Znany wyjątek jest dokładnie jeden i jest zapisany jako dług:",
				"docs/2026-08-10-dlug-bramki-powielone-i-syllabus.md",
			].join("\n"),
		).toEqual([...INTEGRACYJNE_BEZ_BRAMKI].sort());
	});
});
