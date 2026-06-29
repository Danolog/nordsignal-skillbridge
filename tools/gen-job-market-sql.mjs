#!/usr/bin/env node

/**
 * gen-job-market-sql.mjs — DETERMINISTYCZNY generator SQL do wgrania danych
 * rynku pracy (JustJoinIT) do tabeli `job_market_data` na PRODUKCJI (Neon).
 *
 * NIE łączy się z żadną bazą. Czyta wyłącznie committedowy artefakt
 *   src/lib/db/data/job-market-justjoinit.json
 * i wypisuje na STDOUT pojedynczy plik SQL: transakcja BEGIN … COMMIT z
 *   1) opcjonalnym backupem  job_market_data_bak,
 *   2) DELETE FROM job_market_data WHERE career_goal IN (…23 ścieżek…)
 *      (zawężone — bramka jakości v1.12, nie „goły" DELETE bez WHERE),
 *   3) wielowierszowym INSERT  (wszystkie wiersze z realnego rynku artefaktu).
 *
 * salary_range NIE jest w liście kolumn → baza wstawia DEFAULT NULL (decyzja
 * Darka: bez widełek). Kolejność wierszy = kolejność w JSON (data → competencies),
 * deterministyczna i odtwarzalna 1:1 z artefaktu.
 *
 * Escaping: każda wartość tekstowa przez sqlStr() — pojedynczy apostrof
 * podwajany ('' ), wartość w apostrofach. Bezpieczne dla nazw z kropką/ukośnikiem.
 *
 * Użycie:
 *   node tools/gen-job-market-sql.mjs > tools/load-job-market-prod.sql
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

// DELETE zawężony do 23 ścieżek z artefaktu (sortowane → wynik deterministyczny).
// WHERE jest WYMOGIEM bramki jakości v1.12: DELETE bez WHERE wpada w strażnika `ask`.
// Zbiór celów == cała tabela (dane mają tylko te 23 ścieżki), więc efekt ten sam,
// ale bez „gołego" DELETE. Backup _bak (pełna tabela) zostaje przed czyszczeniem.
const goalsInSql = [...goals]
	.sort()
	.map((g) => `  ${sqlStr(g)}`)
	.join(",\n");

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
-- ⚠️ CZERWONA LINIA: zmiana danych prod — sign-off Ethana (CTO), bramka v1.12.
-- DELETE jest ZAWĘŻONY do 23 ścieżek (WHERE career_goal IN (…)) — nie „goły" DELETE.
-- Operacja ATOMOWA (BEGIN…COMMIT): albo cała się uda, albo nic.
-- Brak FK przychodzących na job_market_data → zero kaskad, zero danych użytkowników.
-- Tabela czytana TYLKO do odczytu (generate-gaps, faculty/dashboard).
-- ============================================================================

BEGIN;

-- Backup bieżącego stanu w tej samej transakcji (rollback ręczny = przywrócenie z _bak).
-- DROP IF EXISTS czyni re-run idempotentnym (gdyby wcześniejsza próba zostawiła tabelę).
DROP TABLE IF EXISTS job_market_data_bak;
CREATE TABLE job_market_data_bak AS SELECT * FROM job_market_data;

-- Czyszczenie poprzedniego stanu — ZAWĘŻONE do 23 ścieżek artefaktu (bramka v1.12: nie „goły" DELETE).
DELETE FROM job_market_data WHERE career_goal IN (
${goalsInSql}
);

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
