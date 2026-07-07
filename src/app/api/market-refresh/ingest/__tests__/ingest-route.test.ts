import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// DB mockowane — unit nie dotyka Postgresa (tx-mock: spies na db.transaction).
const { txMock } = vi.hoisted(() => ({
	txMock: {
		delete: vi.fn(async () => undefined),
		insert: vi.fn(() => ({
			values: vi.fn(() => ({ returning: vi.fn(async () => [{ id: "run-1" }]) })),
		})),
	},
}));

vi.mock("@/lib/db", () => ({
	db: {
		select: vi.fn(() => ({ from: vi.fn(async () => []) })),
		transaction: vi.fn(async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
	},
}));

import { db } from "@/lib/db";
import { POST } from "../route";

const mockTransaction = vi.mocked(db.transaction);

// 12 ofert Java + techs — minimalny zbiór, na którym silnik buduje 1 realną
// kotwicę (wzorzec z etl-justjoinit.test.ts buildArtifact).
const OFERTY_CSV = [
	"Slug;Stanowisko;Kategoria",
	...Array.from({ length: 12 }, (_, i) => `j${i};Java Developer;Java`),
].join("\r\n");
const TECH_CSV = [
	"Slug;Technologia",
	...Array.from({ length: 12 }, (_, i) => `j${i};Java`),
	...Array.from({ length: 12 }, (_, i) => `j${i};SQL`),
].join("\r\n");

const TOKEN = "sekret-testowy-ag3";
const URL_ = "http://test.local/api/market-refresh/ingest";

function makeRequest(opts: {
	token?: string;
	oferty?: BodyInit | Uint8Array | string | null;
	technologie?: Uint8Array | string | null;
	rawBody?: BodyInit;
}): Request {
	const headers: Record<string, string> = {};
	if (opts.token !== undefined) headers["x-market-refresh-token"] = opts.token;
	if (opts.rawBody !== undefined) {
		return new Request(URL_, { method: "POST", body: opts.rawBody, headers });
	}
	const form = new FormData();
	if (opts.oferty != null) {
		form.append("oferty", new File([opts.oferty as BlobPart], "JustJoinIT_Oferty.csv"));
	}
	if (opts.technologie != null) {
		form.append(
			"technologie",
			new File([opts.technologie as BlobPart], "JustJoinIT_Technologie.csv"),
		);
	}
	return new Request(URL_, { method: "POST", body: form, headers });
}

describe("POST /api/market-refresh/ingest", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("FLAG_PROACTIVE_MARKET_REFRESH", "1");
		vi.stubEnv("MARKET_REFRESH_TOKEN", TOKEN);
	});
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("flaga off → 404 (deploy ≠ release; trasa nie istnieje)", async () => {
		vi.stubEnv("FLAG_PROACTIVE_MARKET_REFRESH", "");
		const res = await POST(
			makeRequest({ token: TOKEN, oferty: OFERTY_CSV, technologie: TECH_CSV }),
		);
		expect(res.status).toBe(404);
		expect(mockTransaction).not.toHaveBeenCalled();
	});

	it("zły token → 401; brak tokenu → 401", async () => {
		expect(
			(await POST(makeRequest({ token: "zly", oferty: OFERTY_CSV, technologie: TECH_CSV }))).status,
		).toBe(401);
		expect((await POST(makeRequest({ oferty: OFERTY_CSV, technologie: TECH_CSV }))).status).toBe(
			401,
		);
	});

	it("brak skonfigurowanego MARKET_REFRESH_TOKEN = trasa zamknięta (nigdy fail-open)", async () => {
		vi.stubEnv("MARKET_REFRESH_TOKEN", "");
		const res = await POST(makeRequest({ token: "", oferty: OFERTY_CSV, technologie: TECH_CSV }));
		expect(res.status).toBe(401);
	});

	it("brak plików → 400", async () => {
		const res = await POST(makeRequest({ token: TOKEN, oferty: OFERTY_CSV, technologie: null }));
		expect(res.status).toBe(400);
	});

	it("body niebędące multipartem → 400", async () => {
		const res = await POST(makeRequest({ token: TOKEN, rawBody: '{"nie":"multipart"}' }));
		expect(res.status).toBe(400);
	});

	it("złe kolumny → 422 z listą braków (ochrona przed pomyleniem plików)", async () => {
		const res = await POST(
			makeRequest({ token: TOKEN, oferty: "A;B\r\n1;2", technologie: TECH_CSV }),
		);
		expect(res.status).toBe(422);
		const body = (await res.json()) as { details: { oferty: string[] } };
		expect(body.details.oferty).toEqual(["Slug", "Stanowisko", "Kategoria"]);
	});

	it("happy path (goły CSV): staging wipe+insert w tx, wiersz runu z diffem i md5, 200", async () => {
		const res = await POST(
			makeRequest({ token: TOKEN, oferty: OFERTY_CSV, technologie: TECH_CSV }),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			success: boolean;
			runId: string;
			meta: Record<string, unknown>;
			diffSummary: Record<string, number>;
		};
		expect(body.success).toBe(true);
		expect(body.runId).toBe("run-1");
		expect(body.meta.uniqueOffers).toBe(12);
		expect(body.meta.paths).toBe(1);
		expect(body.meta.ofertyMd5).toMatch(/^[0-9a-f]{32}$/);
		// Prod (mock) pusty → cała ścieżka Java jest NOWA w diffie.
		expect(body.diffSummary.newPaths).toBe(1);

		// Atomowość: delete staging + 2 inserty (staging, runs) w JEDNEJ transakcji.
		expect(mockTransaction).toHaveBeenCalledOnce();
		expect(txMock.delete).toHaveBeenCalledOnce();
		expect(txMock.insert).toHaveBeenCalledTimes(2);
		const stagingRows = vi.mocked(txMock.insert).mock.results[0].value.values.mock
			.calls[0][0] as Array<{ careerGoal: string; salaryRange?: unknown }>;
		expect(stagingRows.length).toBeGreaterThan(0);
		expect(stagingRows.every((r) => r.careerGoal === "Java Developer")).toBe(true);
		expect(stagingRows[0]).not.toHaveProperty("salaryRange");
		const runRow = vi.mocked(txMock.insert).mock.results[1].value.values.mock.calls[0][0] as Record<
			string,
			unknown
		>;
		expect(runRow.diff).toBeDefined();
		expect(runRow.contentFlat).toContain('"careerGoal": "Java Developer"');
		expect(runRow.stagedRows).toBe(stagingRows.length);
	});

	it("pliki .gz: gunzip po magic bytes; md5 liczone z ROZPAKOWANYCH bajtów (== md5 gołego CSV)", async () => {
		const plain = await POST(
			makeRequest({ token: TOKEN, oferty: OFERTY_CSV, technologie: TECH_CSV }),
		);
		const plainMeta = ((await plain.json()) as { meta: { ofertyMd5: string } }).meta;

		const gz = await POST(
			makeRequest({
				token: TOKEN,
				oferty: gzipSync(Buffer.from(OFERTY_CSV)),
				technologie: gzipSync(Buffer.from(TECH_CSV)),
			}),
		);
		expect(gz.status).toBe(200);
		const gzMeta = ((await gz.json()) as { meta: { ofertyMd5: string } }).meta;
		expect(gzMeta.ofertyMd5).toBe(plainMeta.ofertyMd5);
	});

	it("BOM utf-8-sig na wejściu nie psuje nagłówków kolumn", async () => {
		const res = await POST(
			makeRequest({ token: TOKEN, oferty: `﻿${OFERTY_CSV}`, technologie: TECH_CSV }),
		);
		expect(res.status).toBe(200);
	});
});
