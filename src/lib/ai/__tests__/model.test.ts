import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// anthropic() zwraca identyfikator przekazany do niego — pozwala sprawdzić,
// jaki model getModel faktycznie wybrał, bez realnego SDK.
vi.mock("@ai-sdk/anthropic", () => ({
	anthropic: vi.fn((id: string) => `model:${id}`),
}));

import { getModel, getModelId } from "../model";

const ENV_KEYS = [
	"SKILLBRIDGE_AI_MODEL",
	"SKILLBRIDGE_AI_MODEL_STANDARD",
	"SKILLBRIDGE_AI_MODEL_FAST",
	"SKILLBRIDGE_AI_MODEL_PREMIUM",
] as const;

describe("model selection (getModel / getModelId)", () => {
	beforeEach(() => {
		for (const k of ENV_KEYS) delete process.env[k];
		vi.clearAllMocks();
	});
	afterEach(() => {
		for (const k of ENV_KEYS) delete process.env[k];
	});

	it("domyślne modele produkcyjne bez żadnego override (gwarancja: zero regresji na prod)", () => {
		expect(getModelId("standard")).toBe("claude-sonnet-4-6");
		expect(getModelId("fast")).toBe("claude-haiku-4-5-20251001");
		expect(getModelId("premium")).toBe("claude-opus-4-8");
	});

	it("globalny SKILLBRIDGE_AI_MODEL nadpisuje WSZYSTKIE warstwy (ścieżka CI → Haiku)", () => {
		process.env.SKILLBRIDGE_AI_MODEL = "claude-haiku-4-5-20251001";
		expect(getModelId("standard")).toBe("claude-haiku-4-5-20251001");
		expect(getModelId("fast")).toBe("claude-haiku-4-5-20251001");
		expect(getModelId("premium")).toBe("claude-haiku-4-5-20251001");
	});

	it("override per-warstwa działa i nie dotyka pozostałych warstw", () => {
		process.env.SKILLBRIDGE_AI_MODEL_PREMIUM = "claude-sonnet-4-6";
		expect(getModelId("premium")).toBe("claude-sonnet-4-6");
		expect(getModelId("standard")).toBe("claude-sonnet-4-6"); // domyślny, nie override
		expect(getModelId("fast")).toBe("claude-haiku-4-5-20251001");
	});

	it("globalny override ma pierwszeństwo przed per-warstwowym", () => {
		process.env.SKILLBRIDGE_AI_MODEL = "claude-haiku-4-5-20251001";
		process.env.SKILLBRIDGE_AI_MODEL_PREMIUM = "claude-opus-4-8";
		expect(getModelId("premium")).toBe("claude-haiku-4-5-20251001");
	});

	it("pusta/biała wartość override jest ignorowana (nie wywraca na pusty ID)", () => {
		process.env.SKILLBRIDGE_AI_MODEL = "   ";
		expect(getModelId("standard")).toBe("claude-sonnet-4-6");
	});

	it("getModel przekazuje rozstrzygnięty ID do anthropic()", () => {
		process.env.SKILLBRIDGE_AI_MODEL = "claude-haiku-4-5-20251001";
		expect(getModel("standard")).toBe("model:claude-haiku-4-5-20251001");
	});
});
