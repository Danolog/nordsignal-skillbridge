#!/usr/bin/env node
/**
 * mutacje-e1b — powtarzalny przebieg mutacji dla strażników pakietu E1b.
 *
 * ── PO CO TO ISTNIEJE ──────────────────────────────────────────────────────
 *
 * CLAUDE.md v1.17: strażnik bez udokumentowanej mutacji, która go czerwieni,
 * nie liczy się jako strażnik. Dowód w opisie zgłoszenia jest jednak wart tyle,
 * ile jego odtwarzalność — recenzent musi móc powtórzyć go JEDNĄ KOMENDĄ,
 * zamiast odtwarzać całą pracę od zera. Blok Leo na #293 nazwał to wprost:
 * narzędzie, które wyprodukowało dowód dla pięciu strażników, samo nie miało
 * śladu w repozytorium — „a właśnie udowodniło, że potrafi kłamać".
 *
 * ── DWIE WADY, KTÓRE TO NARZĘDZIE MUSI WYKLUCZAĆ Z KONSTRUKCJI ─────────────
 *
 * (1) FAŁSZYWA ZIELEŃ: mutacja się NIE NAŁOŻYŁA, a wynik brzmi „strażnik nie
 *     strzeże". Zdarzyło się naprawdę (2026-08-12): wielozdaniowy SQL przeszedł
 *     przez powłokę, nie wykonał się, a przebieg zameldował „zielony". Dlatego
 *     każda mutacja ma OBOWIĄZKOWĄ funkcję `sprawdz()`, która czyta stan PO
 *     nałożeniu — z katalogu bazy albo z dysku. Bez potwierdzonego nałożenia
 *     wynik jest odrzucany jako NIEROZSTRZYGNIĘTY, nigdy jako „zielony".
 *
 * (2) FAŁSZYWA CZERWIEŃ: plik pada z powodu innego niż mutacja. Dlatego wynik
 *     jest KLASYFIKOWANY, nie sprowadzany do „czerwony":
 *       • `asercja`  — padły konkretne testy na konkretnych asercjach. Mocne:
 *                      strażnik ORZEKŁ o regule.
 *       • `wyjatek`  — padł hak przygotowawczy, część testów NIGDY SIĘ NIE
 *                      WYKONAŁA. Czerwień prawdziwa, ale SŁABSZA: dowodzi „coś
 *                      się psuje głośno", nie „strażnik asertuje tę semantykę".
 *                      To także kształt, jaki produkuje ZEPSUTA mutacja —
 *                      dlatego wymaga osobnej etykiety, a nie wiersza w tabeli
 *                      obok pozostałych.
 *     Rozróżnienie wprowadzone po przeglądzie Leo (#293), który powtórzył M3
 *     i pokazał, że w tabeli stała jako wynik równorzędny, choć nie była.
 *
 * ── UŻYCIE ────────────────────────────────────────────────────────────────
 *
 *   docker run -d --name skillbridge-e1b -e POSTGRES_HOST_AUTH_METHOD=trust \
 *     -e POSTGRES_USER=postgres -e POSTGRES_DB=skillbridge_e1b_test \
 *     -p 5457:5432 postgres:16
 *   DATABASE_URL=postgresql://postgres@localhost:5457/skillbridge_e1b_test \
 *     pnpm db:migrate:test
 *   DATABASE_URL=postgresql://postgres@localhost:5457/skillbridge_e1b_test \
 *     node tools/mutacje-e1b.mjs            # wszystkie
 *   … node tools/mutacje-e1b.mjs M7         # jedna
 *
 * ⚠ WŁASNY KONTENER, WŁASNY PORT. Nie uruchamiać na współdzielonej `:5433` —
 * mutacje SCHEMATU zmieniają więzi w katalogu i przebieg innego agenta zobaczy
 * cudzy stan. Narzędzie odmawia startu na porcie 5433.
 *
 * ⚠ URUCHAMIAĆ WYŁĄCZNIE PRZY CZYSTYM DRZEWIE ROBOCZYM — cofanie mutacji to
 * `git checkout`, więc przy niezacommitowanej pracy „cofnij mutację" i „cofnij
 * pracę" to ta sama komenda. Narzędzie sprawdza to i odmawia startu.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const DSN = process.env.DATABASE_URL ?? "";
const TRASA_DECYZJI = "src/app/api/review-queue/[id]/decision/route.ts";
const PLIK_ZACZEPOW = "src/lib/auth/account-deletion.ts";
const PLIK_AUDYTU = "src/lib/audit.ts";
const PLIK_AUTH = "src/lib/auth/server.ts";
const PLIK_STRAZNIKA_A1 = "src/lib/__tests__/audit-obejscie-surowym-sql.test.ts";

const S = {
	petla: "src/lib/db/__tests__/rodo-e1b-usuniecie-konta-petla.integration.test.ts",
	kaskada: "src/lib/db/__tests__/rodo-e1b-kompletnosc-kaskady.integration.test.ts",
	droga: "src/lib/__tests__/rodo-e1b-jedna-droga-usuniecia.test.ts",
	slad: "src/app/api/review-queue/__tests__/rodo-e1b-slad-decyzji-czlowieka.integration.test.ts",
	parytet: "src/lib/db/__tests__/rodo-e1b-parytet-regula-aktora.integration.test.ts",
	konfig: "src/lib/auth/__tests__/account-deletion-konfiguracja.test.ts",
};

// ── warunki wstępne ─────────────────────────────────────────────────────────

if (!/@(localhost|127\.0\.0\.1)/.test(DSN)) {
	console.error("STOP: DATABASE_URL musi wskazywać lokalną bazę testową.");
	process.exit(1);
}
if (/:5433\//.test(DSN)) {
	console.error("STOP: :5433 jest współdzielona. Postaw własny kontener na innym porcie.");
	process.exit(1);
}
if (execFileSync("git", ["status", "--porcelain"]).toString().trim()) {
	console.error("STOP: drzewo robocze nie jest czyste. Zacommituj pracę przed mutacjami.");
	process.exit(1);
}

// ── narzędzia ───────────────────────────────────────────────────────────────

const czytaj = (p) => readFileSync(p, "utf8");

function podmien(sciezka, stare, nowe) {
	const s = czytaj(sciezka);
	if (!s.includes(stare)) throw new Error(`wzorzec nieobecny w ${sciezka}`);
	writeFileSync(sciezka, s.replace(stare, nowe));
}

/** SQL bez powłoki — przez plik i sterownik, po jednym zdaniu. */
async function sql(zdania) {
	const { default: pg } = await import("pg");
	const pool = new pg.Pool({ connectionString: DSN });
	try {
		for (const z of zdania) await pool.query(z);
	} finally {
		await pool.end();
	}
}

async function odczyt(zapytanie) {
	const { default: pg } = await import("pg");
	const pool = new pg.Pool({ connectionString: DSN });
	try {
		return (await pool.query(zapytanie)).rows;
	} finally {
		await pool.end();
	}
}

/** Uruchamia strażnika i KLASYFIKUJE czerwień. */
function uruchom(plik, projekt, filtr) {
	const args = ["vitest", "run", "--project", projekt, plik];
	if (filtr) args.push("-t", filtr);
	let out = "";
	let kod = 0;
	try {
		out = execFileSync("npx", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
	} catch (e) {
		out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
		kod = e.status ?? 1;
	}
	const podsum = out.split("\n").find((l) => l.includes("Tests ") && /passed|failed/.test(l));
	const nazwyPadlych = [...out.matchAll(/^\s*×\s+(.+?)\s+\d+ms\s*$/gm)].map((m) => m[1]);
	const sutyPadle = /Failed Suites\s+\d/.test(out);
	const pominiete = /(\d+) skipped/.exec(podsum ?? "");
	const asercje = (out.match(/AssertionError/g) ?? []).length;

	let ksztalt = "ZIELONY";
	if (kod !== 0) ksztalt = asercje > 0 && nazwyPadlych.length > 0 ? "asercja" : "wyjatek";
	return {
		czerwony: kod !== 0,
		ksztalt,
		podsumowanie: (podsum ?? "brak podsumowania").trim(),
		padle: nazwyPadlych,
		pominiete: pominiete ? Number(pominiete[1]) : 0,
		sutyPadle,
		cytat: (out.split("\n").find((l) => l.trim().startsWith("AssertionError")) ?? "")
			.trim()
			.slice(0, 200),
	};
}

function przywroc() {
	execFileSync("git", ["checkout", "--", "src", "tools", "drizzle", "docs", ".env.example"]);
	if (existsSync("tools/nowe-kasowanie.ts")) unlinkSync("tools/nowe-kasowanie.ts");
}

const AKCJA_WIEZI = `SELECT conname, CASE confdeltype WHEN 'c' THEN 'cascade' WHEN 'n' THEN 'set null'
	WHEN 'a' THEN 'no action' ELSE confdeltype::text END AS akcja
	FROM pg_constraint WHERE conname IN
	('passports_student_id_students_id_fk','students_user_id_user_id_fk')`;

// ── katalog mutacji ─────────────────────────────────────────────────────────
// Każda: `zastosuj`, `sprawdz` (OBOWIĄZKOWO — dowód, że mutacja wylądowała),
// `cofnij` (dla mutacji schematu; kod cofa `git checkout`).

const MUTACJE = [
	{
		id: "M1",
		straznik: "S-U-1",
		plik: S.kaskada,
		projekt: "integration",
		opis: "nowa tabela t_probna(student_id text) BEZ klucza obcego",
		zastosuj: () =>
			sql([
				"CREATE TABLE t_probna (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id text)",
			]),
		sprawdz: async () => (await odczyt("SELECT to_regclass('t_probna') AS t"))[0]?.t === "t_probna",
		cofnij: () => sql(["DROP TABLE IF EXISTS t_probna"]),
	},
	{
		id: "M2",
		straznik: "S-U-1",
		plik: S.kaskada,
		projekt: "integration",
		opis: "passports.student_id → ON DELETE NO ACTION",
		zastosuj: () =>
			sql([
				"ALTER TABLE passports DROP CONSTRAINT passports_student_id_students_id_fk",
				"ALTER TABLE passports ADD CONSTRAINT passports_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE NO ACTION",
			]),
		sprawdz: async () =>
			(await odczyt(AKCJA_WIEZI)).some(
				(r) => r.conname.startsWith("passports") && r.akcja === "no action",
			),
		cofnij: () =>
			sql([
				"ALTER TABLE passports DROP CONSTRAINT passports_student_id_students_id_fk",
				"ALTER TABLE passports ADD CONSTRAINT passports_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE",
			]),
	},
	{
		id: "M3",
		straznik: "S-U-2",
		plik: S.petla,
		projekt: "integration",
		filtr: "S-U-2 ·",
		opis: "students.user_id → SET NULL (więź nośna)",
		zastosuj: () =>
			sql([
				"ALTER TABLE students DROP CONSTRAINT students_user_id_user_id_fk",
				'ALTER TABLE students ADD CONSTRAINT students_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL',
			]),
		sprawdz: async () =>
			(await odczyt(AKCJA_WIEZI)).some(
				(r) => r.conname.startsWith("students") && r.akcja === "set null",
			),
		cofnij: () =>
			sql([
				"ALTER TABLE students DROP CONSTRAINT students_user_id_user_id_fk",
				'ALTER TABLE students ADD CONSTRAINT students_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE',
				"DELETE FROM students WHERE user_id IS NULL",
			]),
	},
	{
		id: "M4",
		straznik: "S-U-2",
		plik: S.petla,
		projekt: "integration",
		filtr: "S-U-2 ·",
		opis: "ślad usunięcia zapisany Z actorId (klasa faculty)",
		zastosuj: () =>
			podmien(
				PLIK_ZACZEPOW,
				`		actorType: "student",`,
				`		actorType: "faculty",\n		actorId: user.id,`,
			),
		sprawdz: () => czytaj(PLIK_ZACZEPOW).includes("actorId: user.id"),
	},
	{
		id: "M5",
		straznik: "S-U-3",
		plik: S.droga,
		projekt: "unit",
		opis: "db.delete(user) dopisane w trasie HTTP",
		zastosuj: () =>
			podmien(
				TRASA_DECYZJI,
				"	const reviewer = await checkReviewerAuth();",
				"	await db.delete(user);\n	const reviewer = await checkReviewerAuth();",
			),
		sprawdz: () => czytaj(TRASA_DECYZJI).includes("await db.delete(user);"),
	},
	{
		id: "M6",
		straznik: "S-U-3",
		plik: S.droga,
		projekt: "unit",
		opis: "nowe narzędzie tools/nowe-kasowanie.ts (pilnuje ZASIĘGU)",
		zastosuj: () =>
			writeFileSync(
				"tools/nowe-kasowanie.ts",
				`export const q = \`${"DELETE"} FROM "user" WHERE id = $1\`;\n`,
			),
		sprawdz: () => existsSync("tools/nowe-kasowanie.ts"),
	},
	{
		id: "M7",
		straznik: "S-U-4",
		plik: S.slad,
		projekt: "integration",
		filtr: "S-U-4 ·",
		opis: 'actorType → "system" (klasa bez tożsamości)',
		zastosuj: () =>
			podmien(
				TRASA_DECYZJI,
				`					actorType: reviewer.kind === "quality_operator" ? "operator" : "faculty",\n					actorId: reviewer.sessionId,`,
				`					actorType: "system",`,
			),
		sprawdz: () => czytaj(TRASA_DECYZJI).includes(`actorType: "system",`),
	},
	{
		id: "M8",
		straznik: "S-U-4",
		plik: S.slad,
		projekt: "integration",
		filtr: "S-U-4 ·",
		opis: "usunięte metadata.reviewerType",
		zastosuj: () => podmien(TRASA_DECYZJI, "						reviewerType: reviewer.kind,\n", ""),
		// ⚠ PREDYKAT MUSI BYĆ PRECYZYJNY. `reviewerType: reviewer.kind` występuje
		// w tym pliku DWA razy — raz w kolumnie `submission_reviews` (zostaje) i raz
		// w metadanych audytu (mutowane). Szerszy predykat dawał FAŁSZYWY
		// „NIEROZSTRZYGNIĘTY" przy poprawnie nałożonej mutacji (2026-08-12).
		sprawdz: () => !czytaj(TRASA_DECYZJI).includes("\t\t\t\t\t\treviewerType: reviewer.kind,"),
	},
	{
		id: "M9",
		straznik: "S-U-5",
		plik: S.slad,
		projekt: "integration",
		filtr: "S-U-5 ·",
		opis: "zapis śladu z powrotem POZA transakcję (dosłowne cofnięcie D-U7)",
		zastosuj: () => podmien(TRASA_DECYZJI, "				{ tx },\n", ""),
		sprawdz: () => !czytaj(TRASA_DECYZJI).includes("{ tx },"),
	},
	{
		id: "M10",
		straznik: "parytet D-U8",
		plik: S.parytet,
		projekt: "integration",
		opis: "szósty typ działającego w REGULA_AKTORA bez ruszenia ograniczenia",
		zastosuj: () =>
			podmien(
				PLIK_AUDYTU,
				"	operator: { actorId: true, kontekstZadania: true },",
				"	operator: { actorId: true, kontekstZadania: true },\n	partner: { actorId: false, kontekstZadania: false },",
			),
		sprawdz: () => czytaj(PLIK_AUDYTU).includes("partner: { actorId: false"),
	},
	{
		id: "M11",
		straznik: "konfiguracja",
		plik: S.konfig,
		projekt: "unit",
		opis: "włączony tryb potwierdzenia POCZTĄ (pułapka tabeli verification)",
		zastosuj: () =>
			podmien(
				PLIK_AUTH,
				"			beforeDelete: beforeDeleteAccount,",
				"			sendDeleteAccountVerification: async () => {},\n			beforeDelete: beforeDeleteAccount,",
			),
		sprawdz: () => czytaj(PLIK_AUTH).includes("sendDeleteAccountVerification"),
	},
	{
		id: "M12",
		straznik: "bramka flagi",
		plik: S.petla,
		projekt: "integration",
		filtr: "S-U-2b",
		opis: "usunięta bramka flagi z beforeDelete (zostaje tylko odczyt przy starcie)",
		zastosuj: () =>
			podmien(
				PLIK_ZACZEPOW,
				`	if (!isFeatureEnabled(FLAGA_USUWANIA_KONTA)) {\n		throw APIError.fromStatus("NOT_FOUND");\n	}`,
				"	return;",
			),
		sprawdz: () => !czytaj(PLIK_ZACZEPOW).includes("APIError.fromStatus"),
	},
	{
		id: "M13",
		straznik: "S-A1-4",
		plik: PLIK_STRAZNIKA_A1,
		projekt: "unit",
		filtr: "warunki wpisu",
		opis: "narzędzie operacyjne dopisane do SONDY_ODRZUCENIA (nie jest testem)",
		// Warunek wiążący Ryana (CRCO) przy #293: bez tej mutacji asercja
		// „kazdy wpis na SONDY_ODRZUCENIA spelnia oba warunki wpisu" byłaby
		// strażnikiem bez dowodu, że potrafi się zaczerwienić (CLAUDE.md v1.17).
		//
		// KSZTAŁT JEDNOPRZYCZYNOWY — pozostałe asercje S-A1-4 mają milczeć:
		// `tools/viva-flag-off-recompute.ts` ma trafienie (kontrola pozycji
		// martwych cicho), jego linia `INSERT` nie zawiera `actor_id` (A1 cicho),
		// jest już na `DOPUSZCZONE` (lista przejrzanych cicho). Łamie wyłącznie
		// warunek (1): to narzędzie operacyjne, nie test.
		//
		// ⚠ SPROSTOWANIE DO ZALECENIA RYANA. Ryan zapisał, że ten plik „nie ma
		// ROLLBACK (łamie (b))". Zmierzone na drzewie `#293`: MA —
		// `tools/viva-flag-off-recompute.ts:102` → `await pool.query("ROLLBACK")`.
		// Mutacja ćwiczy więc warunek (1), nie oba. Warunek (2) zostaje
		// NIEPOTWIERDZONY mutacją i jest tak nazwany w opisie zgłoszenia — na
		// dzisiejszym drzewie żaden plik z trafieniem nie jest go w stanie złamać
		// (wszystkie cztery zawierają `ROLLBACK`, zmierzone).
		zastosuj: () =>
			podmien(
				PLIK_STRAZNIKA_A1,
				"const SONDY_ODRZUCENIA: Record<string, string> = {",
				'const SONDY_ODRZUCENIA: Record<string, string> = {\n\t"tools/viva-flag-off-recompute.ts": "mutacja M13 — narzedzie operacyjne, nie test",',
			),
		sprawdz: () => czytaj(PLIK_STRAZNIKA_A1).includes("mutacja M13"),
	},
];

// ── przebieg ────────────────────────────────────────────────────────────────

const wybrane = process.argv[2] ? MUTACJE.filter((m) => m.id === process.argv[2]) : MUTACJE;
const wyniki = [];

for (const m of wybrane) {
	przywroc();
	let nalozona = false;
	try {
		await m.zastosuj();
		nalozona = await m.sprawdz();
	} catch (e) {
		console.error(`[${m.id}] błąd nakładania: ${e.message}`);
	}

	if (!nalozona) {
		// NIGDY nie raportujemy tego jako „zielony" — to jest brak pomiaru.
		wyniki.push({ ...m, stan: "NIEROZSTRZYGNIETY (mutacja sie NIE nalozyla)" });
		console.log(`\n### ${m.id} [${m.straznik}] NIEROZSTRZYGNIĘTY — mutacja się nie nałożyła`);
		if (m.cofnij) await m.cofnij();
		przywroc();
		continue;
	}

	const r = uruchom(m.plik, m.projekt, m.filtr);
	if (m.cofnij) await m.cofnij();
	przywroc();

	wyniki.push({ ...m, ...r, stan: r.czerwony ? r.ksztalt : "ZIELONY — STRAZNIK NIE STRZEZE" });
	console.log(
		`\n### ${m.id} [${m.straznik}] ${r.czerwony ? r.ksztalt.toUpperCase() : "!!! ZIELONY !!!"}`,
	);
	console.log(`    ${m.opis}`);
	console.log(`    ${r.podsumowanie}`);
	if (r.padle.length) console.log(`    padłe testy: ${r.padle.join(" | ")}`);
	if (r.ksztalt === "wyjatek") {
		console.log(`    ⚠ WYJĄTEK, nie asercja — ${r.pominiete} testów NIGDY SIĘ NIE WYKONAŁO.`);
		console.log("      Czerwień prawdziwa, ale słabsza: dowodzi „psuje się głośno”,");
		console.log("      nie „strażnik asertuje tę semantykę”.");
	}
	if (r.cytat) console.log(`    ${r.cytat}`);
}

console.log("\n\n===== PODSUMOWANIE =====");
for (const w of wyniki) {
	console.log(
		`${w.id.padEnd(4)} ${w.straznik.padEnd(14)} ${String(w.stan).padEnd(16)} ${w.podsumowanie ?? ""}`,
	);
}
const zle = wyniki.filter((w) => !["asercja", "wyjatek"].includes(w.stan));
console.log(
	zle.length
		? `\n⚠ WYMAGA UWAGI: ${zle.map((w) => w.id).join(", ")}`
		: "\nWszystkie mutacje nałożone i wszystkie zaczerwieniły.",
);
