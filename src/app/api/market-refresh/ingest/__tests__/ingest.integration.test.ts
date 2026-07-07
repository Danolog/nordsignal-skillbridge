// @vitest-environment node
//
// AG.3 — INTEGRACJA NA REALNEJ BAZIE: ingest pisze staging + run, a
// `job_market_data` (prod-odpowiednik) zostaje NIETKNIĘTA [CZERWONA LINIA].
//
// Test realny (lekcja split-frontend-backend): prawdziwy handler POST na
// prawdziwej bazie :5433. Mock tylko na granicy env (flaga + token przez
// vi.stubEnv). Bez lokalnej bazy → describe.skip (nie failuje).
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test` (tabele 0023).

import { gzipSync } from "node:zlib";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

const dBack = isLocalTestDb ? describe : describe.skip;

const TOKEN = "integ-token-ag3";
const URL_ = "http://test.local/api/market-refresh/ingest";

const OFERTY_CSV = [
	"Slug;Stanowisko;Kategoria",
	...Array.from({ length: 12 }, (_, i) => `integ-j${i};Java Developer;Java`),
].join("\r\n");
const TECH_CSV = [
	"Slug;Technologia",
	...Array.from({ length: 12 }, (_, i) => `integ-j${i};Java`),
	...Array.from({ length: 12 }, (_, i) => `integ-j${i};SQL`),
].join("\r\n");

function gzRequest(token: string): Request {
	const form = new FormData();
	form.append("oferty", new File([gzipSync(Buffer.from(OFERTY_CSV))], "oferty.csv.gz"));
	form.append("technologie", new File([gzipSync(Buffer.from(TECH_CSV))], "technologie.csv.gz"));
	return new Request(URL_, {
		method: "POST",
		body: form,
		headers: { "x-market-refresh-token": token },
	});
}

dBack("POST /api/market-refresh/ingest — staging + run, prod nietknięty (realna baza)", () => {
	// Importy dynamiczne po sprawdzeniu env (wzorzec integration testów repo).
	// biome-ignore lint/suspicious/noExplicitAny: klient/moduły ładowane dynamicznie.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: handler ładowany dynamicznie.
	let POST: any;

	beforeEach(async () => {
		vi.stubEnv("FLAG_PROACTIVE_MARKET_REFRESH", "1");
		vi.stubEnv("MARKET_REFRESH_TOKEN", TOKEN);
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ POST } = await import("../route"));
		// Czysty punkt startu przebiegu (staging to zawsze „ostatni upload").
		await db.delete(schema.marketRefreshRuns);
		await db.delete(schema.jobMarketDataStaging);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	afterAll(async () => {
		if (!db || !schema) return;
		await db.delete(schema.marketRefreshRuns);
		await db.delete(schema.jobMarketDataStaging);
	});

	it("ingest zapisuje staging + wiersz runu z diffem; job_market_data bajt-w-bajt bez zmian", async () => {
		// Odcisk prod-odpowiednika PRZED (posortowany JSON — wykryje każdą zmianę).
		const prodBefore = await db.select().from(schema.jobMarketData);
		const fingerprintBefore = JSON.stringify(
			[...prodBefore].sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)),
		);

		const res = await POST(gzRequest(TOKEN));
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			runId: string;
			meta: { stagedRows: number };
			diffSummary: Record<string, number>;
		};

		// Staging = dokładnie wiersze tego przebiegu.
		const staged = await db.select().from(schema.jobMarketDataStaging);
		expect(staged.length).toBe(body.meta.stagedRows);
		expect(staged.length).toBeGreaterThan(0);
		expect(staged.every((r: { careerGoal: string }) => r.careerGoal === "Java Developer")).toBe(
			true,
		);

		// Run: status staged, diff jsonb obecny, prowenicja md5.
		const runs = await db.select().from(schema.marketRefreshRuns);
		expect(runs).toHaveLength(1);
		expect(runs[0].id).toBe(body.runId);
		expect(runs[0].status).toBe("staged");
		expect(runs[0].ofertyMd5).toMatch(/^[0-9a-f]{32}$/);
		expect(runs[0].diff.summary).toEqual(body.diffSummary);
		expect(runs[0].contentModel).toContain('"careerGoal"');

		// [CZERWONA LINIA] prod-odpowiednik NIETKNIĘTY.
		const prodAfter = await db.select().from(schema.jobMarketData);
		const fingerprintAfter = JSON.stringify(
			[...prodAfter].sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)),
		);
		expect(fingerprintAfter).toBe(fingerprintBefore);
	});

	it("drugi upload NADPISUJE staging (wipe+insert) i dokłada drugi run", async () => {
		await POST(gzRequest(TOKEN));
		const stagedFirst = await db.select().from(schema.jobMarketDataStaging);

		const res2 = await POST(gzRequest(TOKEN));
		expect(res2.status).toBe(200);

		const stagedSecond = await db.select().from(schema.jobMarketDataStaging);
		// Wipe+insert: liczność identyczna (ten sam plik), nie 2× (brak akumulacji).
		expect(stagedSecond.length).toBe(stagedFirst.length);
		const runs = await db.select().from(schema.marketRefreshRuns);
		expect(runs).toHaveLength(2);
	});

	it("zły token = 401 i ZERO śladów w bazie", async () => {
		const res = await POST(gzRequest("zly-token"));
		expect(res.status).toBe(401);
		expect(await db.select().from(schema.marketRefreshRuns)).toHaveLength(0);
		expect(await db.select().from(schema.jobMarketDataStaging)).toHaveLength(0);
	});
});
