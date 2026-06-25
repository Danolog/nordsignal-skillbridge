#!/usr/bin/env node

/**
 * gen-job-market-sql.mjs — DETERMINISTYCZNY generator SQL do wgrania danych
 * rynku pracy (JustJoinIT) do tabeli `job_market_data` na PRODUKCJI (Neon).
 *
 * NIE łączy się z żadną bazą. Czyta wyłącznie committedowy artefakt
 *   src/lib/db/data/job-market-justjoinit.json
 * i wypisuje na STDOUT pojedynczy plik SQL: transakcja BEGIN … COMMIT z
 *   1) opcjonalnym backupem  job_market_data_bak,
 *   2) DELETE FROM job_market_data  (czyści 9 wierszy demo / poprzedni stan),
 *   3) wielowierszowym INSERT  (240 wierszy z realnego rynku).
 *
 * salary_range NIE jest w liście kolumn → baza wstawia DEFAULT NULL (decyzja
 * Darka: bez widełek). Kolejność wierszy = kolejność w JSON (data → competencies),
 * deterministyczna i odtwarzalna 1:1 z artefaktu.
 *
 * Escaping: każda wartość tekstowa przez sqlStr() — pojedynczy apostrof
 * podwajany ('' ), wartość w apostrofach. Bezpieczne dla nazw z kropką/ukośnikiem.
 *
 * Użycie:
 *   node scratchpad/gen-job-market-sql.mjs > scratchpad/load-job-market-prod.sql
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACT = resolve(__dirname, "../src/lib/db/data/job-market-justjoinit.json");

const raw = readFileSync(ARTIFACT, "utf8");
const artifact = JSON.parse(raw);
const sha = createHash("sha256").update(raw).digest("hex");

/** Escape wartości do literału SQL: apostrof → '' , owinięty w apostrofy. */
function sqlStr(v) {
	return `'${String(v).replace(/'/g, "''")}'`;
}

// ── Spłaszczenie: identyczne z seed.ts (DATA.flatMap → competencies.map) ──
const rows = [];
for (const entry of artifact.data) {
	for (const comp of entry.competencies) {
		// Walidacja twarda — kolumny NOT NULL w schemacie.
		if (
			typeof entry.careerGoal !== "string" ||
			typeof comp.name !== "string" ||
			typeof comp.category !== "string" ||
			!Number.isInteger(comp.demandPercentage)
		) {
			throw new Error(`Zły wiersz: ${entry.careerGoal} / ${JSON.stringify(comp)}`);
		}
		rows.push({
			careerGoal: entry.careerGoal,
			competencyName: comp.name,
			demandPercentage: comp.demandPercentage,
			category: comp.category,
		});
	}
}

const goals = new Set(rows.map((r) => r.careerGoal));

const valuesSql = rows
	.map(
		(r) =>
			`  (${sqlStr(r.careerGoal)}, ${sqlStr(r.competencyName)}, ${r.demandPercentage}, ${sqlStr(r.category)})`,
	)
	.join(",\n");

const out = `-- ============================================================================
-- load-job-market-prod.sql — wgranie realnego rynku pracy (JustJoinIT) do
-- tabeli job_market_data na PRODUKCJI (Neon, baza 'main'/neondb).
--
-- WYGENEROWANE deterministycznie przez scratchpad/gen-job-market-sql.mjs z:
--   src/lib/db/data/job-market-justjoinit.json
--   snapshot:     ${artifact._meta?.snapshot ?? "?"}
--   źródło:       ${artifact._meta?.source ?? "?"}
--   sha256(json): ${sha}
--
-- Wierszy do wstawienia: ${rows.length}   (distinct career_goal: ${goals.size})
-- Kolumny INSERT: career_goal, competency_name, demand_percentage, category
-- salary_range:   POMINIĘTE → baza wstawia NULL (decyzja Darka: bez widełek).
--
-- ⚠️ CZERWONA LINIA: DELETE bez WHERE na danych prod — wymaga sign-offu Darka.
-- Operacja ATOMOWA (BEGIN…COMMIT): albo cała się uda, albo nic.
-- Brak FK przychodzących na job_market_data → zero kaskad, zero danych użytkowników.
-- Tabela czytana TYLKO do odczytu (generate-gaps, faculty/dashboard).
-- ============================================================================

BEGIN;

-- Backup bieżącego stanu w tej samej transakcji (rollback ręczny = przywrócenie z _bak).
-- DROP IF EXISTS czyni re-run idempotentnym (gdyby wcześniejsza próba zostawiła tabelę).
DROP TABLE IF EXISTS job_market_data_bak;
CREATE TABLE job_market_data_bak AS SELECT * FROM job_market_data;

-- Czyszczenie poprzedniego stanu job_market_data (DELETE bez WHERE — czerwona linia).
DELETE FROM job_market_data;

-- Wstawienie ${rows.length} wierszy realnego rynku.
INSERT INTO job_market_data (career_goal, competency_name, demand_percentage, category) VALUES
${valuesSql};

-- Sanity-check W TEJ SAMEJ transakcji (przed COMMIT). Jeśli liczby się nie zgadzają — ROLLBACK.
--   Oczekiwane: count = ${rows.length}, distinct career_goal = ${goals.size}, salary NULL = ${rows.length}
SELECT
  count(*)                                          AS wierszy,
  count(DISTINCT career_goal)                       AS sciezek,
  count(*) FILTER (WHERE salary_range IS NULL)      AS salary_null
FROM job_market_data;

COMMIT;

-- Po COMMIT, jeśli wszystko OK — backup można usunąć (lub zostawić na kilka dni):
--   DROP TABLE job_market_data_bak;
`;

process.stdout.write(out);
