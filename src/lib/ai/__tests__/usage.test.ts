import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type AiUsageEntry,
	computeCostUsd,
	recordAiUsage,
	setAiUsageSinkForTests,
	streamUsageTracker,
	withAiUsage,
} from "../usage";

// Zadanie 0.0 — testy wrappera obserwowalności kosztu AI.
//
// Dowód red-green: przed wprowadzeniem src/lib/ai/usage.ts ten plik nie
// kompiluje się (brak modułu) — każdy test pada. Po wprowadzeniu wrappera
// wszystkie przechodzą. Testy pilnują KONTRAKTU przezroczystości (wynik i
// błąd bez modyfikacji, awaria telemetrii nie wywraca wywołania) oraz
// poprawności zliczania tokenów i kosztu.

describe("ai usage wrapper (zadanie 0.0)", () => {
	let entries: AiUsageEntry[];

	beforeEach(() => {
		entries = [];
		setAiUsageSinkForTests(async (entry) => {
			entries.push(entry);
		});
		// Stabilny cennik: bez override'ów modelu z env.
		vi.stubEnv("SKILLBRIDGE_AI_MODEL", "");
		vi.stubEnv("SKILLBRIDGE_AI_MODEL_STANDARD", "");
		vi.stubEnv("SKILLBRIDGE_AI_MODEL_FAST", "");
		vi.stubEnv("SKILLBRIDGE_AI_MODEL_PREMIUM", "");
	});

	afterEach(() => {
		setAiUsageSinkForTests(null);
		vi.unstubAllEnvs();
	});

	describe("computeCostUsd", () => {
		it("liczy koszt wg cennika Sonneta (3/15 USD za MTok)", () => {
			// 1M tokenów wejścia = 3 USD; 1M wyjścia = 15 USD.
			expect(computeCostUsd("claude-sonnet-4-6", 1_000_000, 1_000_000)).toBe("18.000000");
			expect(computeCostUsd("claude-sonnet-4-6", 100_000, 50_000)).toBe("1.050000");
		});

		it("liczy koszt Haiku i Opusa", () => {
			expect(computeCostUsd("claude-haiku-4-5-20251001", 1_000_000, 0)).toBe("1.000000");
			expect(computeCostUsd("claude-opus-4-8", 0, 1_000_000)).toBe("25.000000");
		});

		it("zwraca null dla modelu spoza cennika", () => {
			expect(computeCostUsd("nieznany-model", 1000, 1000)).toBeNull();
		});
	});

	describe("withAiUsage", () => {
		it("zlicza tokeny z result.usage i zapisuje wpis sukcesu", async () => {
			await withAiUsage({ scope: "test-scope", tier: "standard" }, async () => ({
				text: "odpowiedź",
				usage: { inputTokens: 1200, outputTokens: 340 },
			}));

			expect(entries).toHaveLength(1);
			const entry = entries[0];
			expect(entry.scope).toBe("test-scope");
			expect(entry.tier).toBe("standard");
			expect(entry.modelId).toBe("claude-sonnet-4-6");
			expect(entry.inputTokens).toBe(1200);
			expect(entry.outputTokens).toBe(340);
			expect(entry.success).toBe(true);
			expect(entry.errorName).toBeNull();
			// 1200/1M*3 + 340/1M*15 = 0.0036 + 0.0051 = 0.0087 USD
			expect(entry.costUsd).toBe("0.008700");
			expect(entry.latencyMs).toBeGreaterThanOrEqual(0);
		});

		it("jest przezroczysty — zwraca dokładnie wynik wywołania", async () => {
			const result = { text: "abc", usage: { inputTokens: 1, outputTokens: 2 } };
			const returned = await withAiUsage({ scope: "s", tier: "fast" }, async () => result);
			expect(returned).toBe(result);
		});

		it("zapisuje atrybucję studenta i tenanta", async () => {
			await withAiUsage(
				{
					scope: "s",
					tier: "fast",
					attribution: { studentId: "student-uuid", tenantId: "tenant-uuid", userId: "user-1" },
				},
				async () => ({ usage: { inputTokens: 10, outputTokens: 5 } }),
			);
			expect(entries[0].studentId).toBe("student-uuid");
			expect(entries[0].tenantId).toBe("tenant-uuid");
			expect(entries[0].userId).toBe("user-1");
		});

		it("brakujące pola usage traktuje jako 0 tokenów", async () => {
			await withAiUsage({ scope: "s", tier: "standard" }, async () => ({}));
			expect(entries[0].inputTokens).toBe(0);
			expect(entries[0].outputTokens).toBe(0);
			expect(entries[0].costUsd).toBe("0.000000");
		});

		it("przy błędzie wywołania zapisuje success=false + errorName i rzuca dalej", async () => {
			const boom = new Error("model down");
			boom.name = "APICallError";

			await expect(
				withAiUsage({ scope: "failing", tier: "premium" }, async () => {
					throw boom;
				}),
			).rejects.toBe(boom);

			expect(entries).toHaveLength(1);
			expect(entries[0].success).toBe(false);
			expect(entries[0].errorName).toBe("APICallError");
			expect(entries[0].modelId).toBe("claude-opus-4-8");
			expect(entries[0].inputTokens).toBe(0);
		});

		it("awaria zapisu telemetrii NIE wywraca wywołania AI", async () => {
			setAiUsageSinkForTests(async () => {
				throw new Error("db offline");
			});
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await withAiUsage({ scope: "s", tier: "standard" }, async () => ({
				text: "ok",
				usage: { inputTokens: 1, outputTokens: 1 },
			}));

			expect(result.text).toBe("ok");
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it("koszt jest null przy override'zie modelu spoza cennika", async () => {
			vi.stubEnv("SKILLBRIDGE_AI_MODEL", "ci-tani-model");
			await withAiUsage({ scope: "s", tier: "standard" }, async () => ({
				usage: { inputTokens: 100, outputTokens: 100 },
			}));
			expect(entries[0].modelId).toBe("ci-tani-model");
			expect(entries[0].costUsd).toBeNull();
		});
	});

	describe("streamUsageTracker", () => {
		it("onFinish zapisuje totalUsage i woła dalszy callback", async () => {
			const track = streamUsageTracker({ scope: "career-helper.turn", tier: "standard" });
			const next = vi.fn();

			await track.onFinish(next)({
				text: "odpowiedź pomocnika",
				totalUsage: { inputTokens: 500, outputTokens: 200 },
			} as never);

			expect(entries).toHaveLength(1);
			expect(entries[0].scope).toBe("career-helper.turn");
			expect(entries[0].inputTokens).toBe(500);
			expect(entries[0].outputTokens).toBe(200);
			expect(entries[0].success).toBe(true);
			expect(next).toHaveBeenCalledWith(expect.objectContaining({ text: "odpowiedź pomocnika" }));
		});

		it("onError zapisuje wpis błędu z nazwą błędu", async () => {
			const track = streamUsageTracker({ scope: "career-helper.turn", tier: "standard" });
			const err = new Error("stream broken");
			err.name = "StreamError";

			await track.onError({ error: err });

			expect(entries).toHaveLength(1);
			expect(entries[0].success).toBe(false);
			expect(entries[0].errorName).toBe("StreamError");
		});
	});

	describe("recordAiUsage w środowisku testowym", () => {
		it("bez wstrzykniętego sinka nic nie zapisuje (nie dotyka bazy w unit)", async () => {
			setAiUsageSinkForTests(null); // powrót do domyślnego sinka DB
			// NODE_ENV=test → guard pomija zapis; brak próby połączenia z placeholderem.
			await expect(
				recordAiUsage({
					scope: "s",
					tier: "standard",
					modelId: "claude-sonnet-4-6",
					inputTokens: 1,
					outputTokens: 1,
					costUsd: null,
					success: true,
					errorName: null,
					latencyMs: 0,
					userId: null,
					studentId: null,
					tenantId: null,
				}),
			).resolves.toBeUndefined();
		});
	});
});
