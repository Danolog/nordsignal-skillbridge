// @vitest-environment node
//
// AG.4 — E2E NA REALNEJ BAZIE (DoD z roadmapy):
//  • akceptacja robi SWAP w transakcji z auto-backupem (_bak == stary prod,
//    prod == staging),
//  • odrzucenie = prod bez zmian,
//  • strażnice: podwójna decyzja / starszy run → 409, prod nietknięty.
//
// Sprzątanie po testach akceptacji = UDOKUMENTOWANY ROLLBACK z runbooka
// (przywrócenie z job_market_data_bak) — test mimochodem dowodzi też procedury
// rollbacku. Konieczne: inne testy integracyjne w tym samym runie polegają na
// zaseedowanym job_market_data (np. onboarding liczy luki z katalogu).
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test`. Bez bazy → skip.

import { gzipSync } from "node:zlib";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// AG.5: recompute mockowany — ta suita dowodzi MECHANIKI SWAPU (tx, backup,
// strażnice). Realny recompute po swapie na katalog Java-only przepisałby luki
// WSZYSTKICH zaseedowanych studentów. Pełny recompute ma własną suitę:
// src/app/api/market-refresh/recompute/__tests__/recompute.integration.test.ts.
vi.mock("@/lib/market-refresh/recompute", () => ({
	runMarketRecompute: vi.fn(async () => ({
		students: 0,
		studentsWithNewGaps: 0,
		newGapsTotal: 0,
		uniqueDescriptionsGenerated: 0,
		llmCalls: 0,
		errors: 0,
	})),
}));

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const TOKEN = "integ-token-ag4";

const OFERTY_CSV = [
	"Slug;Stanowisko;Kategoria",
	...Array.from({ length: 12 }, (_, i) => `ag4-j${i};Java Developer;Java`),
].join("\r\n");
const TECH_CSV = [
	"Slug;Technologia",
	...Array.from({ length: 12 }, (_, i) => `ag4-j${i};Java`),
	...Array.from({ length: 12 }, (_, i) => `ag4-j${i};SQL`),
].join("\r\n");

function ingestRequest(): Request {
	const form = new FormData();
	form.append("oferty", new File([gzipSync(Buffer.from(OFERTY_CSV))], "o.csv.gz"));
	form.append("technologie", new File([gzipSync(Buffer.from(TECH_CSV))], "t.csv.gz"));
	return new Request("http://test.local/api/market-refresh/ingest", {
		method: "POST",
		body: form,
		headers: { "x-market-refresh-token": TOKEN },
	});
}

function decisionRequest(runId: string, decision: "accept" | "reject"): Request {
	return new Request(`http://test.local/api/market-refresh/runs/${runId}/decision`, {
		method: "POST",
		body: JSON.stringify({ decision }),
		headers: { "x-market-refresh-token": TOKEN, "Content-Type": "application/json" },
	});
}

dBack("AG.4 · decyzja accept/reject — swap z backupem, prod chroniony (realna baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let ingestPOST: any;
	// biome-ignore lint/suspicious/noExplicitAny: handlery ładowane dynamicznie.
	let decisionPOST: any;

	/** Odcisk zawartości merytorycznej (bez id — INSERT…SELECT zachowuje id, ale
	 *  porównujemy treść, nie klucze). */
	// biome-ignore lint/suspicious/noExplicitAny: wiersze różnych tabel o tym samym kształcie.
	const fingerprint = (rows: any[]) =>
		JSON.stringify(
			rows
				.map((r) => `${r.careerGoal}|${r.competencyName}|${r.demandPercentage}|${r.category}`)
				.sort(),
		);

	async function stageRun(): Promise<string> {
		const res = await ingestPOST(ingestRequest());
		expect(res.status).toBe(200);
		return ((await res.json()) as { runId: string }).runId;
	}

	beforeEach(async () => {
		vi.stubEnv("FLAG_PROACTIVE_MARKET_REFRESH", "1");
		vi.stubEnv("MARKET_REFRESH_TOKEN", TOKEN);
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ POST: ingestPOST } = await import("../../ingest/route"));
		({ POST: decisionPOST } = await import("../[id]/decision/route"));
		await db.delete(schema.marketRefreshRuns);
		await db.delete(schema.jobMarketDataStaging);
	});

	afterEach(async () => {
		// ROLLBACK z runbooka: jeśli test zrobił swap, przywróć prod z _bak
		// (inne testy integracyjne polegają na zaseedowanym rynku).
		const bak = await db.execute(sql`SELECT to_regclass('job_market_data_bak') AS t`);
		if ((bak.rows[0] as { t: string | null }).t) {
			await db.transaction(async (tx: typeof db) => {
				await tx.execute(sql`DELETE FROM job_market_data`);
				await tx.execute(sql`INSERT INTO job_market_data SELECT * FROM job_market_data_bak`);
				await tx.execute(sql`DROP TABLE job_market_data_bak`);
			});
		}
		await db.delete(schema.marketRefreshRuns);
		await db.delete(schema.jobMarketDataStaging);
		vi.unstubAllEnvs();
	});

	it("ACCEPT: swap w tx z auto-backupem — prod==staging, _bak==stary prod, run accepted", async () => {
		const prodBefore = await db.select().from(schema.jobMarketData);
		expect(prodBefore.length).toBeGreaterThan(0); // seed musi być (inaczej test nic nie dowodzi)
		const runId = await stageRun();
		const staged = await db.select().from(schema.jobMarketDataStaging);

		const res = await decisionPOST(decisionRequest(runId, "accept"), {
			params: Promise.resolve({ id: runId }),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { prodChanged: boolean; prodRows: number };
		expect(body.prodChanged).toBe(true);
		expect(body.prodRows).toBe(staged.length);

		// Prod == staging (treść), _bak == stary prod (treść).
		const prodAfter = await db.select().from(schema.jobMarketData);
		expect(fingerprint(prodAfter)).toBe(fingerprint(staged));
		const bak = await db.execute(
			sql`SELECT career_goal AS "careerGoal", competency_name AS "competencyName", demand_percentage AS "demandPercentage", category FROM job_market_data_bak`,
		);
		expect(fingerprint(bak.rows)).toBe(fingerprint(prodBefore));

		const [run] = await db.select().from(schema.marketRefreshRuns);
		expect(run.status).toBe("accepted");
		expect(run.acceptedAt).not.toBeNull();
	});

	it("REJECT: prod bajt-w-bajt bez zmian, run rejected, _bak NIE powstaje", async () => {
		const prodBefore = await db.select().from(schema.jobMarketData);
		const runId = await stageRun();

		const res = await decisionPOST(decisionRequest(runId, "reject"), {
			params: Promise.resolve({ id: runId }),
		});
		expect(res.status).toBe(200);

		const prodAfter = await db.select().from(schema.jobMarketData);
		expect(JSON.stringify(prodAfter)).toBe(JSON.stringify(prodBefore));
		const bak = await db.execute(sql`SELECT to_regclass('job_market_data_bak') AS t`);
		expect((bak.rows[0] as { t: string | null }).t).toBeNull();
		const [run] = await db.select().from(schema.marketRefreshRuns);
		expect(run.status).toBe("rejected");
	});

	it("podwójna decyzja → 409; prod po drugiej próbie bez zmian", async () => {
		const runId = await stageRun();
		await decisionPOST(decisionRequest(runId, "reject"), {
			params: Promise.resolve({ id: runId }),
		});
		const prodAfterFirst = await db.select().from(schema.jobMarketData);

		const again = await decisionPOST(decisionRequest(runId, "accept"), {
			params: Promise.resolve({ id: runId }),
		});
		expect(again.status).toBe(409);
		const prodAfterSecond = await db.select().from(schema.jobMarketData);
		expect(JSON.stringify(prodAfterSecond)).toBe(JSON.stringify(prodAfterFirst));
	});

	it("akceptacja STARSZEGO runu (staging trzyma nowszy upload) → 409, prod nietknięty", async () => {
		const olderRunId = await stageRun();
		// Drugi upload nadpisuje staging i tworzy nowszy run.
		const newerRunId = await stageRun();
		expect(newerRunId).not.toBe(olderRunId);
		const prodBefore = await db.select().from(schema.jobMarketData);

		const res = await decisionPOST(decisionRequest(olderRunId, "accept"), {
			params: Promise.resolve({ id: olderRunId }),
		});
		expect(res.status).toBe(409);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain("nowszy przebieg");

		const prodAfter = await db.select().from(schema.jobMarketData);
		expect(JSON.stringify(prodAfter)).toBe(JSON.stringify(prodBefore));
	});
});
