import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
import { config } from "dotenv";
import { Pool } from "pg";
import { assertTestDb } from "./assert-test-db";
import { komunikatWydania, odcisk, zapiszPoufnie } from "./zapis-poufny";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
	console.error("DATABASE_URL not set");
	process.exit(1);
}
const ownerUrl: string = process.env.DATABASE_URL;

// #305 klasa A — POLITYKA DOMYŚLNA (odmowa dla każdego hosta zdalnego), świadomie
// BEZ ceremonii. Powód: to narzędzie nadaje ROLĘ i UPRAWNIENIA (CREATE ROLE /
// ALTER ROLE ... PASSWORD / GRANT), a to NIE MIEŚCI SIĘ w delegacji v1.12 — nie
// jest ani migracją schemy, ani zaciągiem danych. Otwarcie ścieżki produkcyjnej
// wymaga osobnej ceremonii z sign-offem Darka (eskalacja Olivera, 2026-08-12);
// do tego czasu fail-closed jest stanem docelowym, nie długiem.
try {
	assertTestDb(ownerUrl, "DATABASE_URL");
} catch (e) {
	console.error(e instanceof Error ? e.message : String(e));
	process.exit(1);
}

/**
 * ŚCIEŻKA ZAPISU poświadczenia — wymagana, bo poświadczenie NIE IDZIE NA EKRAN.
 * Podaj ścieżkę POZA repozytorium (np. w katalogu domowym).
 */
const sciezkaZapisu = (() => {
	const i = process.argv.indexOf("--zapis");
	return i !== -1 ? process.argv[i + 1] : undefined;
})();

/** `--haslo-z-wejscia` = podam istniejące hasło na WEJŚCIU STANDARDOWYM (nie zmieniam roli). */
const hasloZWejscia = process.argv.includes("--haslo-z-wejscia");

/**
 * Wczytuje sekret z WEJŚCIA STANDARDOWEGO.
 *
 * Dlaczego nie ze zmiennej środowiskowej (tak było wcześniej): zmienną ustawia
 * się w praktyce w jednej linii z poleceniem, więc ląduje w historii powłoki.
 * To ten sam mechanizm wycieku, który `tools/pilot-enroll.ts` zamknął u siebie
 * dla adresu uczestnika i który konstytucja rozstrzygnęła dla poświadczeń CI
 * (CLAUDE.md §5, bramka (i) punkt 5 — „wyłącznie przez standardowe wejście,
 * nigdy jako argument polecenia").
 *
 * ⚠ `echo … | pnpm tsx …` PRZYWRACA DOKŁADNIE TEN WYCIEK — wartość wraca do
 * historii powłoki i do tablicy procesów. Wpisz ją po zapytaniu narzędzia.
 *
 * Monit idzie na wyjście DIAGNOSTYCZNE, nie standardowe, żeby nie mieszał się
 * z treścią przekierowaną do pliku.
 */
async function wczytajSekret(): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stderr });
	try {
		return await new Promise<string>((res) => {
			rl.question("Sekret app_runtime (wejście standardowe, nie zostanie wypisany): ", (v) =>
				res(v.trim()),
			);
		});
	} finally {
		rl.close();
	}
}

async function main() {
	if (!sciezkaZapisu) {
		console.error(
			"Brak --zapis <ścieżka>. Poświadczenie NIE jest wypisywane na ekran — musi trafić\n" +
				"do pliku o prawach 0600. Podaj ścieżkę POZA repozytorium.",
		);
		process.exit(1);
	}
	const sekret = hasloZWejscia ? await wczytajSekret() : randomBytes(32).toString("base64url");
	const useExisting = hasloZWejscia;
	if (useExisting && sekret.length === 0) {
		console.error("Puste wejście — przerywam.");
		process.exit(1);
	}

	// 1. Połącz się jako owner i zrób ALTER ROLE (lub CREATE jeśli z jakiegoś
	// powodu brakuje). Idempotentne.
	const ownerPool = new Pool({ connectionString: ownerUrl });
	const ownerClient = await ownerPool.connect();
	try {
		const existing = await ownerClient.query(
			`SELECT rolname FROM pg_roles WHERE rolname = 'app_runtime'`,
		);
		if (existing.rowCount === 0) {
			console.log("⚠️  app_runtime nie istnieje — CREATE (migracja 0011 nieaplikowana?)");
			await ownerClient.query(`CREATE ROLE app_runtime LOGIN NOBYPASSRLS PASSWORD $1`, [sekret]);
			await ownerClient.query("GRANT app_student TO app_runtime");
			await ownerClient.query("GRANT app_faculty TO app_runtime");
			await ownerClient.query("GRANT USAGE ON SCHEMA public TO app_runtime");
		} else if (useExisting) {
			console.log("ℹ️  Sekret podany na wejściu standardowym — nie zmieniam roli");
		} else {
			console.log("✅ app_runtime istnieje — ALTER ROLE LOGIN + PASSWORD");
			// pg.escapeIdentifier byłby idealny, ale password musi iść jako literal w SQL;
			// używamy parametryzowanej formy + pg-format-style nie ma. Próbujemy w sposób
			// natywny: ALTER ROLE nie wspiera $1 dla PASSWORD (PG parser). Generujemy
			// pojedynczy string przez `quote_literal`.
			const safePwd = await ownerClient.query(`SELECT quote_literal($1::text) AS q`, [sekret]);
			const literal = safePwd.rows[0].q;
			await ownerClient.query(`ALTER ROLE app_runtime LOGIN PASSWORD ${literal}`);
		}

		// 2. Verify
		const verify = await ownerClient.query(
			`SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname = 'app_runtime'`,
		);
		const row = verify.rows[0];
		const ok = row.rolcanlogin === true && row.rolbypassrls === false;
		console.log(
			`Verify: rolcanlogin=${row.rolcanlogin}, rolbypassrls=${row.rolbypassrls} → ${ok ? "✅ OK" : "❌ WRONG"}`,
		);
		if (!ok) {
			console.error("Spodziewane: rolcanlogin=true, rolbypassrls=false");
			process.exit(1);
		}
	} finally {
		ownerClient.release();
		await ownerPool.end();
	}

	// 3. Zbuduj DATABASE_URL_RUNTIME przez podmianę user+password
	const u = new URL(ownerUrl);
	u.username = "app_runtime";
	u.password = sekret;
	const runtimeUrl = u.toString();

	// 4. Smoke test nowego URL — login + simple query
	console.log("\n4. Smoke test app_runtime connection...");
	const runtimePool = new Pool({ connectionString: runtimeUrl });
	try {
		const rc = await runtimePool.connect();
		try {
			const me = await rc.query(`SELECT current_user, current_database()`);
			console.log("  Connected as:", me.rows[0]);

			// app_runtime nie ma SELECT bez SET LOCAL ROLE (bezpośrednio = deny)
			// ale `current_user` zawsze jest dozwolony.
			// Test: SET LOCAL ROLE app_student + SELECT students → expect: deny-default
			// (bez current_user_id ustawionego).
			await rc.query("BEGIN");
			await rc.query("SET LOCAL ROLE app_student");
			const denyRes = await rc.query(`SELECT COUNT(*)::int AS c FROM students`);
			await rc.query("ROLLBACK");
			console.log(
				`  Cross-role test: app_runtime → SET LOCAL ROLE app_student → SELECT students (bez current_user_id) = ${denyRes.rows[0].c} wierszy`,
			);
			if (denyRes.rows[0].c !== 0) {
				console.error("  ❌ Spodziewane 0 wierszy (FORCE RLS + deny-default)");
				process.exit(1);
			}
			console.log("  ✅ FORCE + deny-default działa pod app_runtime");
		} finally {
			rc.release();
		}
	} finally {
		await runtimePool.end();
	}

	// 5. WYDANIE POŚWIADCZENIA — do pliku 0600, nigdy na ekran.
	// Było tu `console.log(runtimeUrl)` i wypisanie sekretu wprost. Wyjście
	// narzędzia trafia do przewijania terminala, zapisu sesji agenta i dziennika
	// CI — trzech miejsc, których nikt nie sprząta i które przeżywają sesję.
	zapiszPoufnie(sciezkaZapisu, `DATABASE_URL_RUNTIME=${runtimeUrl}`);
	for (const linia of komunikatWydania(sciezkaZapisu, odcisk(runtimeUrl))) {
		console.log(linia);
	}
	console.log("\nNastępne kroki:");
	console.log("1. Odczytaj wartość Z PLIKU (nie z ekranu) i wklej do Vercel Dashboard →");
	console.log("   skill-bridge-ai → Settings → Environment Variables → Production + Preview");
	console.log("2. Vercel Dashboard → Deployments → najnowszy production → ⋯ → Redeploy");
	console.log("3. Powiedz mi 'gotowe' — zrobię smoke przez Vercel MCP");
}

main().catch((err) => {
	console.error("ERROR:", err.message);
	if (err.code) console.error("CODE:", err.code);
	process.exit(1);
});
