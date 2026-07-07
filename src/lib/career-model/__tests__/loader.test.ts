// Testy jednostkowe loadera modelu kariery (1.0).
//
// Kontrakt „flaga off = zero zmian": bez FLAG_CAREER_MODEL_FROM_DB loader NIE
// dotyka bazy i serwuje statyczny JSON. Z flagą: model z aktywnego wiersza DB
// po weryfikacji SHA-256; każda awaria (brak wiersza, zły checksum, błąd DB)
// = logError + fallback na statyczny JSON (onboarding nie może paść).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
vi.mock("@/lib/db", () => ({
	db: { query: { careerModelVersions: { findFirst: (...a: unknown[]) => findFirstMock(...a) } } },
}));

const logErrorMock = vi.fn();
vi.mock("@/lib/log", () => ({
	logError: (...a: unknown[]) => logErrorMock(...a),
}));

import {
	careerModelChecksum,
	ensureCareerModelLoaded,
	getCareerModel,
	getCareerModelGeneration,
	resetCareerModelForTests,
} from "../loader";

/** Minimalny poprawny artefakt do wstrzyknięcia „z DB". */
const DB_MODEL = {
	paths: [
		{
			careerGoal: "Data Scientist",
			areas: [
				{ name: "Testowa grupa", unionShare: 50, leaves: [{ name: "Python", kind: "tool" }] },
			],
		},
	],
};
const DB_CONTENT = JSON.stringify(DB_MODEL);

function activeRow(content: string, checksum = careerModelChecksum(content)) {
	return { content, checksum, snapshot: "test" };
}

beforeEach(() => {
	resetCareerModelForTests();
	findFirstMock.mockReset();
	logErrorMock.mockReset();
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("ensureCareerModelLoaded — flaga OFF (domyślnie)", () => {
	it("nie dotyka bazy i serwuje statyczny JSON (23 ścieżki)", async () => {
		await ensureCareerModelLoaded();
		expect(findFirstMock).not.toHaveBeenCalled();
		expect(getCareerModel().paths).toHaveLength(23);
		expect(getCareerModelGeneration()).toBe(0);
	});
});

describe("ensureCareerModelLoaded — flaga ON", () => {
	beforeEach(() => {
		vi.stubEnv("FLAG_CAREER_MODEL_FROM_DB", "1");
	});

	it("ładuje model z aktywnego wiersza po poprawnej weryfikacji checksum", async () => {
		findFirstMock.mockResolvedValue(activeRow(DB_CONTENT));
		await ensureCareerModelLoaded();
		expect(getCareerModel().paths).toHaveLength(1);
		expect(getCareerModel().paths[0]?.careerGoal).toBe("Data Scientist");
		expect(getCareerModelGeneration()).toBe(1);
		expect(logErrorMock).not.toHaveBeenCalled();
	});

	it("brak aktywnego wiersza → logError + fallback na statyczny JSON", async () => {
		findFirstMock.mockResolvedValue(undefined);
		await ensureCareerModelLoaded();
		expect(getCareerModel().paths).toHaveLength(23);
		expect(getCareerModelGeneration()).toBe(0);
		expect(logErrorMock).toHaveBeenCalledOnce();
	});

	it("zły checksum → logError + fallback (podejrzanej treści nie parsujemy)", async () => {
		findFirstMock.mockResolvedValue(activeRow(DB_CONTENT, "deadbeef"));
		await ensureCareerModelLoaded();
		expect(getCareerModel().paths).toHaveLength(23);
		expect(logErrorMock).toHaveBeenCalledOnce();
	});

	it("błąd DB → logError + fallback, bez rethrow", async () => {
		findFirstMock.mockRejectedValue(new Error("connection refused"));
		await expect(ensureCareerModelLoaded()).resolves.toBeUndefined();
		expect(getCareerModel().paths).toHaveLength(23);
		expect(logErrorMock).toHaveBeenCalledOnce();
	});

	it("czyta z DB tylko raz na proces (kolejne wywołania = no-op)", async () => {
		findFirstMock.mockResolvedValue(activeRow(DB_CONTENT));
		await ensureCareerModelLoaded();
		await ensureCareerModelLoaded();
		await ensureCareerModelLoaded();
		expect(findFirstMock).toHaveBeenCalledOnce();
	});

	it("równoległe wywołania nie dublują zapytania", async () => {
		findFirstMock.mockResolvedValue(activeRow(DB_CONTENT));
		await Promise.all([
			ensureCareerModelLoaded(),
			ensureCareerModelLoaded(),
			ensureCareerModelLoaded(),
		]);
		expect(findFirstMock).toHaveBeenCalledOnce();
	});
});

describe("careerModelChecksum", () => {
	it("liczy SHA-256 hex treści (wektor kontrolny)", () => {
		// sha256("abc") — znany wektor testowy FIPS 180-2.
		expect(careerModelChecksum("abc")).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});
});
