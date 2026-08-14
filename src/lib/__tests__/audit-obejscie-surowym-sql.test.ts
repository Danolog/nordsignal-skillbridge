// @vitest-environment node
//
// S-A1-4 — STRAŻNIK OBEJŚCIA: zapis do `audit_log` surowym SQL-em
// (ADR A-1 (a+), Ryan v0.4 §5 i §3.3).
//
// Czego pilnuje: nośnik reguły z A3 (typ `AuditEntry`) jest jedynym ZAMIERZONYM
// wejściem do tabeli, ale nie jedynym MOŻLIWYM — kilka narzędzi i migracji pisze
// do `audit_log` bezpośrednim `INSERT`-em, którego kompilator nie widzi. Reguła
// ma jeden nośnik i jedno obejście; CLAUDE.md v1.17 nie pozwala tego przemilczeć,
// więc obejście dostaje własnego strażnika.
//
// Strażnik jest DWUCZĘŚCIOWY, bo dwie różne rzeczy mogą pójść źle:
//   (1) istniejące miejsce zaczyna pisać `actor_id`  → czerwone natychmiast,
//   (2) powstaje NOWE miejsce spoza listy            → czerwone, nawet jeśli
//       akurat jest zgodne. Reguła „nikt nie pisze tu bokiem bez przeglądu"
//       jest tu ważniejsza niż jednorazowa poprawność wstawki.
//
// ── ZASIĘG: ARTEFAKTY WYKONYWALNE, NIE „wszystko, co śledzi git" ────────────
//
// Strażnik w pierwszym brzmieniu (#289) czytał WSZYSTKIE śledzone pliki i przez
// to czerwienił się na WŁASNEJ DOKUMENTACJI: zdanie w
// `docs/data/audit-log-taksonomia.md`, które OPISUJE tę regułę, musi zacytować
// jej literał — i stawało się „naruszeniem". Reguła karała za dokładne
// opisanie samej siebie, czyli tworzyła zachętę do pisania dokumentacji
// bezpieczeństwa NIEPRECYZYJNIE. Od tej zmiany skan obejmuje wyłącznie
// artefakty WYKONYWALNE (`ROZSZERZENIA_WYKONYWALNE`) — dokument nie zapisuje
// nic do bazy, więc nie może być miejscem zapisu. `drizzle/*.sql` i `tools/`
// zostają w zasięgu w całości.
//
// ⚠ CZEGO TEN STRAŻNIK NIE PILNUJE (etykieta, nie naprawa): zasięg detektora
// obejmuje wyłącznie `INSERT INTO` w JEDNEJ LINII — zapis złamany na dwie linie
// jest dla niego niewidoczny (M-D, #299). Zmierzone 2026-08-13: 0 wieloliniowych
// na 6 miejsc zapisu. Domknięcie wymaga skanu po zdaniach, co przepisuje model
// `Trafienie` i asercję A1 — właściciel Leo, przegląd Ryan, próg: pierwsza zmiana
// `znajdzSuroweWstawki`/`ROZSZERZENIA_WYKONYWALNE` albo siódme miejsce zapisu,
// zapora 2026-08-31.
//
// ── DWIE LISTY, BO DWA RÓŻNE PYTANIA ────────────────────────────────────────
//
// `DOPUSZCZONE`      — „wolno omijać `recordAudit`" (asercja 3).
// `SONDY_ODRZUCENIA` — „wolno podać `actor_id`, bo sprawdzam, że baza go
//                      ODRZUCA, i wycofuję zapis" (asercja A1).
// Asercja A1 świadomie NIE czyta `DOPUSZCZONE` — inaczej przestałaby pilnować
// rdzenia długu A-1. Komunikaty obu asercji mówią to wprost, bo pierwsza próba
// naprawy kolizji poszła właśnie tą ścieżką („dopisz do DOPUSZCZONE") i NIE
// zadziałała: strażnik zalecał lekarstwo, które w tym przypadku nie leczy.
//
// ZNALEZISKO PRZY WDROŻENIU (zgłoszone Ryanowi): inwentaryzacja w ADR §3.3
// wymienia DWIE ścieżki surowego SQL-a (`tools/pilot-enroll.ts`,
// `drizzle/0006_far_shaman.sql`). W drzewie na `origin/main` = `06d0040` są
// CZTERY, a czwarta — `tools/viva-flag-off-recompute.ts` — zapisywała
// `actor_id` = `students.id` przy zdarzeniu `submission.verified`. Naprawione
// w tym samym zgłoszeniu zmiany; ten strażnik istnieje po to, żeby piąte
// takie miejsce nie przeszło po cichu.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Katalog główny repozytorium (ten plik leży w `src/lib/__tests__/`). */
const KORZEN = resolve(__dirname, "../../..");

/**
 * Miejsca, w których zapis surowym SQL-em jest ŚWIADOMIE dopuszczony —
 * każde przejrzane pole po polu i każde zgodne z A1 (bez `actor_id`).
 *
 * Dopisanie pozycji do tej listy jest decyzją przeglądu, nie formalnością:
 * oznacza „ten zapis omija kontrakt TypeScriptu i sprawdziliśmy go ręcznie".
 */
const DOPUSZCZONE = [
	// Zaciąg uczestników pilotażu — `actor_type='operator'`, bez `actor_id`,
	// `target_id` = `students.id` (kaskada z konta). ADR §3.3 poz. 1.
	"tools/pilot-enroll.ts",
	// Włącz operacyjny gaszenia flagi obrony — po naprawie A1 bez `actor_id`.
	"tools/viva-flag-off-recompute.ts",
	// Sonda migracji K3 — wstawka kontrolna `('system','k3-validate-probe')`.
	"tools/k3-validate.ts",
	// Historyczna migracja `tenant.backfill.unmapped`, bez `actor_id`.
	// ADR §3.3 poz. 2. Historii migracji się nie przepisuje.
	"drizzle/0006_far_shaman.sql",
	// Oprzyrządowanie testu miernika placementu — wiersz-atrapa bez `actor_id`.
	"src/lib/curriculum/__tests__/placement-metric.integration.test.ts",
	// UWAGA: pozycji „ten plik" tu NIE MA i to jest świadome. Wzorzec zapisany
	// jest w nim wyłącznie jako wyrażenie regularne (`insert +into +…`, ze
	// znakami `+`), więc sam siebie nie łapie — pozycja była MARTWA i wypadła
	// razem z dołożeniem kontroli martwych pozycji.
];

/**
 * SONDY ODRZUCENIA — miejsca, które zapisują `actor_id` CELOWO, po to żeby
 * udowodnić, że baza taki zapis ODRZUCA.
 *
 * To jest lista ODDZIELNA od `DOPUSZCZONE` i musi taka zostać, bo odpowiada na
 * INNE pytanie:
 *   • `DOPUSZCZONE`        → „temu miejscu wolno ominąć `recordAudit`",
 *   • `SONDY_ODRZUCENIA`   → „to miejsce podaje `actor_id` UMYŚLNIE, jako
 *                             bodziec ujemny, i sprawdza, że baza mówi »nie«".
 * Zlanie ich w jedną listę zdjęłoby asercję A1 ze WSZYSTKICH miejsc mogących
 * pisać surowym SQL-em — czyli wyłączyłoby jedyną asercję pilnującą rdzenia
 * długu A-1. Dlatego lista jest osobna, krótka i obwarowana.
 *
 * WARUNEK WPISU (obie rzeczy naraz) — od `#293` sprawdzany MASZYNOWO, asercją
 * „kazdy wpis na SONDY_ODRZUCENIA spelnia oba warunki wpisu" niżej:
 *   (1) to TEST, nie kod produktu ani narzędzie operacyjne;
 *   (2) zapis jest WYCOFYWANY (`ROLLBACK`) — sonda nie zostawia wiersza.
 *       `audit_log` jest append-only (wyzwalacz blokuje `UPDATE`/`DELETE`),
 *       więc sonda zapisująca na trwałe zatruwa bazę bez możliwości sprzątnięcia.
 *
 * DLACZEGO ASERCJA, SKORO PIERWSZY WPIS OBA WARUNKI SPEŁNIA. Bo dziś pilnuje
 * ich KOD SONDY (`describe.skip` poza bazą lokalną, `ROLLBACK` w `finally`), a
 * nie ta lista — czyli DRUGI wpis wszedłby przy zielonej suicie i bez śladu.
 * Wyciszenie działa na CAŁY PLIK (`!SONDY_ODRZUCENIA[t.plik]`), a klucz jest
 * zwykłym napisem: bez tej asercji „warunek wpisu" byłby wyłącznie komentarzem.
 * Warunek wiążący Ryana (CRCO) przy `#293`, domena 8; podstawa: CLAUDE.md v1.17.
 *
 * ZASIĘG ŚWIADOMIE STATYCZNY — sprawdzamy KSZTAŁT wpisu, nie jego zachowanie:
 * że ścieżka jest ścieżką testu i że plik zawiera `ROLLBACK`. Że wycofanie
 * NAPRAWDĘ zachodzi w czasie wykonania — tego ta asercja nie dowodzi i nie
 * udaje, że dowodzi (Ryan jawnie nie wymaga dowodu wykonaniowego).
 *
 * NAZWA LISTY JEST WĘŻSZA NIŻ JEJ ZAKRES (przyjęte przez Ryana, nie blokuje):
 * dla `faculty`/`operator` nośnik `REGULA_AKTORA` `actor_id` DOPUSZCZA, więc
 * sonda parytetu bywa bodźcem DODATNIM — baza przyjmuje, zapis i tak wraca
 * `ROLLBACK`-iem. Warunek wpisu brzmi „test + wycofanie", nie „musi zostać
 * odrzucone", i tak jest sprawdzany.
 *
 * MECHANIZM POWSTAŁ PUSTY (`#296`) I TAK MIAŁO BYĆ — wyjątek dopisuje
 * zgłoszenie, które go wnosi, nie zgłoszenie, które buduje mechanizm. Pierwszy
 * i na dziś jedyny wpis przyszedł z `#293` (sonda parytetu D-U8), po przeglądzie
 * obu warunków na kodzie sondy, nie na jej opisie.
 */
const SONDY_ODRZUCENIA: Record<string, string> = {
	// Sonda parytetu D-U8: podaje `actor_id` UMYŚLNIE, bo mierzy, czy ograniczenie
	// `audit_log_regula_aktora` w bazie robi DOKŁADNIE to, co mówi `REGULA_AKTORA`.
	// Warunek (1) — to test, i to zamknięty w bazie lokalnej: cały blok jest pod
	// `describe.skip`, dopóki `DATABASE_URL` nie wskazuje na `localhost`/`127.0.0.1`/`[::1]`.
	// Warunek (2) — `ROLLBACK` stoi w `finally`, więc wykonuje się na KAŻDEJ ścieżce,
	// także przy zapisie przyjętym; ani jeden wiersz nie powstaje.
	// ⚠ Zakres szerszy niż nazwa listy: dla `faculty`/`operator` nośnik POZWALA na
	// `actor_id`, więc tam sonda jest bodźcem DODATNIM (baza przyjmuje) i też jest
	// wycofywana. Warunek wpisu (test + ROLLBACK) spełniony w obie strony; rozbieżność
	// nazwy z klasą zgłoszona Ryanowi jako pozycja przeglądu, nie naprawiana tutaj.
	"src/lib/db/__tests__/rodo-e1b-parytet-regula-aktora.integration.test.ts":
		"Sonda parytetu D-U8 — podaje `actor_id` celowo, żeby zmierzyć, czy ograniczenie " +
		"w bazie odrzuca dokładnie to, czego zabrania REGULA_AKTORA; każda próba biegnie " +
		"w transakcji zakończonej ROLLBACK-iem, więc nie zostaje po niej ani jeden wiersz.",
};

/**
 * Warunek (1) wpisu na `SONDY_ODRZUCENIA` — „to jest test", wyrażone ścieżką:
 * katalog `__tests__/` albo nazwa `*.test.ts(x)` / `*.spec.ts(x)`. To jest ta
 * sama konwencja, po której zbiera testy `vitest.config.ts` — jeśli plik jej nie
 * spełnia, nie jest testem także dla narzędzia, które go uruchamia.
 */
const WZORZEC_SCIEZKI_TESTU = /(^|\/)__tests__\/|\.(test|spec)\.tsx?$/;

type Trafienie = { plik: string; linia: number; tresc: string };

/**
 * Rozszerzenia plików objętych skanem — LISTA DOZWOLONYCH, nie czarna lista.
 *
 * DLACZEGO ALLOWLISTA, A NIE „wyklucz `*.md`". Strażnik odpowiada na pytanie
 * „które MIEJSCE ZAPISUJE do audit_log". Zapisać może wyłącznie artefakt
 * WYKONYWALNY: kod (`.ts`/`.tsx`/`.js`/`.mjs`/`.cjs`) albo migracja (`.sql`).
 * Dokument nie zapisuje niczego — cytuje regułę. Czarna lista `*.md` usunęłaby
 * JEDEN format i wróciłaby przy `.mdx`, `.txt`, `.adoc`, przy notatce w `.json`
 * albo przy dzienniku zmian. Allowlista usuwa KLASĘ.
 *
 * PRÓG POWROTU: pierwszy artefakt wykonywalny w rozszerzeniu spoza tej listy
 * (np. `.py` w `tools/`) — wtedy dopisz rozszerzenie, nie wyjątek na plik.
 */
const ROZSZERZENIA_WYKONYWALNE = [
	"*.ts",
	"*.tsx",
	"*.js",
	"*.mjs",
	"*.cjs",
	"*.mts",
	"*.cts",
	"*.sql",
];

/**
 * Szuka po ŚLEDZONYCH plikach repozytorium (`git grep`), nie po dysku — dzięki
 * temu wynik nie zależy od tego, co ktoś ma w `node_modules`, w `.next`
 * ani w niezacommitowanym śmieciu obok.
 *
 * Zasięg zawężony do artefaktów wykonywalnych (patrz wyżej). Zawężenie jest
 * pilnowane WŁASNĄ mutacją w obie strony: dokument z literałem NIE czerwieni,
 * nowe narzędzie w `tools/` czerwieni.
 */
function znajdzSuroweWstawki(): Trafienie[] {
	let wyjscie = "";
	try {
		wyjscie = execFileSync(
			"git",
			[
				"grep",
				"-n",
				"-I",
				"-i",
				"-E",
				'insert +into +"?audit_log',
				"--",
				...ROZSZERZENIA_WYKONYWALNE,
			],
			{ cwd: KORZEN, encoding: "utf8" },
		);
	} catch (err) {
		// `git grep` kończy kodem 1 przy zerowej liczbie trafień — to nie awaria.
		const e = err as { status?: number; stdout?: string };
		if (e.status === 1) return [];
		throw err;
	}
	return wyjscie
		.split("\n")
		.filter(Boolean)
		.map((linia) => {
			const m = linia.match(/^([^:]+):(\d+):(.*)$/);
			if (!m) throw new Error(`Nieoczekiwany format wyjścia git grep: ${linia}`);
			return { plik: m[1], linia: Number(m[2]), tresc: m[3] };
		});
}

describe("S-A1-4 · obejscie kontraktu TypeScriptu — surowy INSERT do audit_log", () => {
	const trafienia = znajdzSuroweWstawki();

	it("wzorzec faktycznie cos znajduje (straznik nie przechodzi na pustym zbiorze)", () => {
		// Bez tej asercji cały plik byłby zielony także wtedy, gdyby wyszukiwanie
		// przestało działać — rodzina awarii „mechanizm melduje w porządku".
		expect(trafienia.length).toBeGreaterThanOrEqual(4);
	});

	it("A1: zadna surowa wstawka nie zapisuje kolumny actor_id", () => {
		// Wyłączone są WYŁĄCZNIE sondy odrzucenia — NIE `DOPUSZCZONE`. Miejsce
		// z listy dopuszczonych, które zacznie pisać `actor_id`, ma się tu
		// zaczerwienić i to jest sedno tej asercji (mutacja 3 w opisie zmiany).
		const lamiace = trafienia
			.filter((t) => /\bactor_id\b/.test(t.tresc))
			.filter((t) => !SONDY_ODRZUCENIA[t.plik]);
		expect(
			lamiace.map((t) => `${t.plik}:${t.linia} → ${t.tresc.trim()}`),
			"Surowy INSERT do audit_log z kolumną actor_id omija typ AuditEntry " +
				"i przywraca dług A-1. Trzy wyjścia i ani jednego czwartego: (a) usuń kolumnę; " +
				"(b) jeśli to zdarzenie klasy 2 (faculty/operator) — przeprowadź przez recordAudit; " +
				"(c) jeśli to SONDA UJEMNA (test, który podaje actor_id po to, żeby sprawdzić, " +
				"że baza go ODRZUCA, i wycofuje zapis ROLLBACK-iem) — dopisz plik do " +
				"SONDY_ODRZUCENIA, nie do DOPUSZCZONE. ⚠ Dopisanie do DOPUSZCZONE NIE wycisza " +
				"tej asercji i nie ma tego wyciszyć — to dwie różne reguły.",
		).toEqual([]);
	});

	it("kazde miejsce zapisu surowym SQL-em jest na liscie przejrzanych", () => {
		const znane = new Set([...DOPUSZCZONE, ...Object.keys(SONDY_ODRZUCENIA)]);
		const nieznane = [...new Set(trafienia.map((t) => t.plik))].filter((p) => !znane.has(p));
		expect(
			nieznane,
			"Nowe miejsce zapisu do audit_log z pominięciem recordAudit. " +
				"Jeśli jest świadome i zgodne z A1 — dopisz je do DOPUSZCZONE w tym pliku " +
				"razem z jednozdaniowym uzasadnieniem (to pozycja przeglądu, nie formalność). " +
				"⚠ Jeśli linia zawiera też `actor_id`, samo DOPUSZCZONE NIE wystarczy — " +
				"czerwona zostanie asercja A1, która listy dopuszczonych świadomie nie czyta. " +
				"Wtedy właściwą listą jest SONDY_ODRZUCENIA (o ile to sonda ujemna z ROLLBACK-iem) " +
				"albo zapis nie ma prawa istnieć.",
		).toEqual([]);
	});

	it("kazdy wpis na SONDY_ODRZUCENIA spelnia oba warunki wpisu", () => {
		// Sprawdzenie KSZTAŁTU wpisu, statyczne — patrz „ZASIĘG ŚWIADOMIE
		// STATYCZNY" przy liście. Każdy wpis raportuje WSZYSTKIE złamane warunki
		// naraz, nie pierwszy z brzegu: inaczej naprawa jednego odsłaniałaby drugi
		// dopiero w kolejnej rundzie CI.
		const naruszenia = Object.keys(SONDY_ODRZUCENIA).flatMap((plik) => {
			const powody: string[] = [];
			if (!WZORZEC_SCIEZKI_TESTU.test(plik)) {
				powody.push("(1) ścieżka nie jest ścieżką testu");
			}
			let tresc = "";
			try {
				tresc = readFileSync(resolve(KORZEN, plik), "utf8");
			} catch {
				powody.push("plik nie istnieje w drzewie roboczym");
			}
			if (tresc && !/\bROLLBACK\b/i.test(tresc)) {
				powody.push("(2) brak `ROLLBACK` w treści pliku");
			}
			return powody.length ? [`${plik}: ${powody.join("; ")}`] : [];
		});
		expect(
			naruszenia,
			"Wpis na SONDY_ODRZUCENIA nie spełnia warunku wpisu. Wyciszenie asercji A1 " +
				"działa na CAŁY PLIK, więc na tę listę wchodzi wyłącznie miejsce, które " +
				"(1) JEST TESTEM — ścieżka w `__tests__/` albo nazwa `*.test.ts(x)`/`*.spec.ts(x)` — " +
				"oraz (2) WYCOFUJE ZAPIS — treść pliku zawiera `ROLLBACK`; `audit_log` jest " +
				"dopisywalny-tylko (wyzwalacz blokuje UPDATE/DELETE), więc sonda zapisująca na " +
				"trwałe zatruwa bazę bez możliwości sprzątnięcia. Narzędzie operacyjne nie wchodzi " +
				"na tę listę nigdy — dla niego właściwą listą jest DOPUSZCZONE, a `actor_id` " +
				"nie ma prawa się w nim znaleźć.",
		).toEqual([]);
	});

	// ── Kontrola martwych pozycji — w OBIE strony, wzorem S-U-1/S-U-3 ─────────

	it("listy przejrzanych nie zawieraja pozycji martwych", () => {
		// Lista, która puchnie o pozycje bez pokrycia, przestaje być czytana —
		// a wtedy dopisanie kolejnej nie budzi nikogo. To atrapa w drugą stronę.
		// Ta asercja jest DOKŁADANA w tej zmianie: `S-A1-4` jej nie miał, a jedna
		// martwa pozycja już się w nim uchowała (pomiar w opisie zmiany).
		const plikiZTrafieniami = new Set(trafienia.map((t) => t.plik));
		const martweDopuszczone = DOPUSZCZONE.filter((p) => !plikiZTrafieniami.has(p));
		const martweSondy = Object.keys(SONDY_ODRZUCENIA).filter((p) => !plikiZTrafieniami.has(p));
		expect(
			{ martweDopuszczone, martweSondy },
			"Pozycja na liście przejrzanych bez ani jednego trafienia — plik zmienił nazwę, " +
				"przestał pisać surowym SQL-em albo wypadł z zasięgu skanu. Usuń ją; listy mają " +
				"być krótkie i prawdziwe.",
		).toEqual({ martweDopuszczone: [], martweSondy: [] });
	});
});
