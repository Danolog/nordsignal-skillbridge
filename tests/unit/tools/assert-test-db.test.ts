import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertTestDb, parseDbHost } from "../../../tools/assert-test-db";

// 0.14 — guard bezpieczeństwa bazy był NIETESTOWANY, a zależy od niego run-sql-file
// (i db-guard-*). Pokrywamy sześć ścieżek decyzyjnych + parsowanie hosta.

const LOCAL = "postgres://u:p@localhost:5432/app";
const LOCAL_IP = "postgres://u:p@127.0.0.1:5432/app";
const REMOTE = "postgres://u:p@db.example.com:5432/app";
const PROD_FRAGMENT = "postgres://u:p@ep-skill-bridge-ai-123.neon.tech/app";

beforeEach(() => {
	// Domyślnie brak flag (nie dziedzicz z ambientu CI/dev).
	vi.stubEnv("CONFIRM_PROD_DB", "");
	vi.stubEnv("E2E_ALLOW_REMOTE", "");
});
afterEach(() => {
	vi.unstubAllEnvs();
});

describe("parseDbHost", () => {
	it("parsuje host z DSN postgres/postgresql", () => {
		expect(parseDbHost("postgres://u:p@localhost:5432/db")).toBe("localhost");
		expect(parseDbHost("postgresql://u@db.example.com/db")).toBe("db.example.com");
	});
	it("normalizuje IPv6 (strip nawiasów)", () => {
		expect(parseDbHost("postgresql://u@[::1]:5432/db")).toBe("::1");
	});
	it("zwraca null dla nieparseowalnego DSN", () => {
		expect(parseDbHost("nie-dsn")).toBeNull();
		expect(parseDbHost("mysql://x")).toBeNull();
	});
});

describe("assertTestDb", () => {
	it("host lokalny → przechodzi cicho (localhost / 127.0.0.1)", () => {
		expect(() => assertTestDb(LOCAL)).not.toThrow();
		expect(() => assertTestDb(LOCAL_IP)).not.toThrow();
	});

	it("host zdalny + brak flagi → ABORT", () => {
		expect(() => assertTestDb(REMOTE)).toThrow(/zdalny host/);
	});

	it("host zdalny + CONFIRM_PROD_DB=1 → przechodzi", () => {
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		expect(() => assertTestDb(REMOTE)).not.toThrow();
	});

	it("host zdalny + E2E_ALLOW_REMOTE=1 → przechodzi", () => {
		vi.stubEnv("E2E_ALLOW_REMOTE", "1");
		expect(() => assertTestDb(REMOTE)).not.toThrow();
	});

	it("hard-deny prod fragment blokuje NAWET z CONFIRM_PROD_DB=1", () => {
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		expect(() => assertTestDb(PROD_FRAGMENT)).toThrow(/ODMOWA|skill-bridge-ai/i);
	});

	it("brak DATABASE_URL → STOP", () => {
		expect(() => assertTestDb(undefined)).toThrow(/nie jest ustawiona/);
	});

	it("nieparseowalny DSN + brak flagi → STOP; + flaga → przechodzi", () => {
		expect(() => assertTestDb("nie-dsn")).toThrow(/sparsować hosta/);
		vi.stubEnv("CONFIRM_PROD_DB", "1");
		expect(() => assertTestDb("nie-dsn")).not.toThrow();
	});
});
