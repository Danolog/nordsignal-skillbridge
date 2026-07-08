// @vitest-environment node
/**
 * B6/1.8 — kontrakt runnera ukrytych testów (SDK @vercel/sandbox zmockowane;
 * żywy bieg dowiedziony spikiem tools/spike-sandbox.ts: 9,7 s E2E).
 *
 * Twarde niezmienniki ADR-012 sprawdzane tutaj:
 *  deny-all bez deps / PyPI-only z deps; pliki studenta+suite'u wpisane;
 *  exit 0→true, ≠0→false; awaria pip/infra → null (nigdy werdykt); budżet
 *  przekroczony → null 'budget' i ZERO mikroVM; stop() zawsze (finally).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sandboxMock, createMock } = vi.hoisted(() => {
	// Parametry jawnie typowane — bez nich mock.calls to krotka `[]` (lekcja AG.6/B8).
	const sandboxMock = {
		writeFiles: vi.fn(async (_files: { path: string; content: Buffer }[]) => {}),
		runCommand: vi.fn(),
		stop: vi.fn(async () => {}),
	};
	return {
		sandboxMock,
		createMock: vi.fn(async (_opts: Record<string, unknown>) => sandboxMock),
	};
});
vi.mock("@vercel/sandbox", () => ({ Sandbox: { create: createMock } }));

const mockApplyRateLimit = vi.fn(async () => ({ success: true, reset: 0, remaining: 4 }));
vi.mock("@/lib/rate-limit", () => ({
	applyRateLimit: (...a: unknown[]) => mockApplyRateLimit(...(a as [])),
	rateLimiters: { sandboxRun: {} },
}));
vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

import { runHiddenTests } from "../run-hidden-tests";

function cmdResult(exitCode: number, stdout = "", stderr = "") {
	return {
		exitCode,
		stdout: async () => stdout,
		stderr: async () => stderr,
	};
}

const SUITE_NO_DEPS = {
	deps: [],
	files: [{ path: "run_hidden_tests.py", content: "print('ok')" }],
	command: ["python3", "run_hidden_tests.py"],
	timeoutMs: 60_000,
};
const STUDENT_FILES = [{ path: "solution.py", content: "def f(): return 42" }];

beforeEach(() => {
	vi.clearAllMocks();
	mockApplyRateLimit.mockResolvedValue({ success: true, reset: 0, remaining: 4 });
});
afterEach(() => {
	vi.restoreAllMocks();
});

describe("runHiddenTests", () => {
	it("bez deps → networkPolicy 'deny-all'; pliki studenta + suite'u wpisane; exit 0 → runOk=true", async () => {
		sandboxMock.runCommand.mockResolvedValue(cmdResult(0, "2 passed"));
		const result = await runHiddenTests({
			studentId: "s-1",
			studentFiles: STUDENT_FILES,
			suite: SUITE_NO_DEPS,
		});

		expect(result.runOk).toBe(true);
		expect(result.exitCode).toBe(0);
		expect(result.outputTail).toContain("2 passed");

		const createArgs = createMock.mock.calls[0][0] as Record<string, unknown>;
		expect(createArgs.networkPolicy).toBe("deny-all");
		expect(createArgs.runtime).toBe("python3.13");

		const written = sandboxMock.writeFiles.mock.calls[0][0] as { path: string }[];
		expect(written.map((f) => f.path)).toEqual(["solution.py", "run_hidden_tests.py"]);
		expect(sandboxMock.stop).toHaveBeenCalledTimes(1);
	});

	it("z deps → sieć zawężona WYŁĄCZNIE do domen PyPI, pip przed biegiem", async () => {
		sandboxMock.runCommand
			.mockResolvedValueOnce(cmdResult(0)) // pip
			.mockResolvedValueOnce(cmdResult(1, "", "1 failed")); // testy
		const result = await runHiddenTests({
			studentId: "s-1",
			studentFiles: STUDENT_FILES,
			suite: { ...SUITE_NO_DEPS, deps: ["pandas", "numpy"] },
		});

		expect(result.runOk).toBe(false); // exit != 0 = testy nie przeszły
		const createArgs = createMock.mock.calls[0][0] as {
			networkPolicy: { mode: string; allowedDomains: string[] };
		};
		expect(createArgs.networkPolicy.mode).toBe("custom");
		expect(createArgs.networkPolicy.allowedDomains).toEqual(["pypi.org", "files.pythonhosted.org"]);
		expect(sandboxMock.runCommand).toHaveBeenNthCalledWith(1, "pip", [
			"install",
			"--quiet",
			"pandas",
			"numpy",
		]);
	});

	it("awaria pip (nasze deps, nie kod studenta) → runOk=null 'infra', NIE false", async () => {
		sandboxMock.runCommand.mockResolvedValueOnce(cmdResult(1, "", "No matching distribution"));
		const result = await runHiddenTests({
			studentId: "s-1",
			studentFiles: STUDENT_FILES,
			suite: { ...SUITE_NO_DEPS, deps: ["nieistniejacy-pakiet"] },
		});
		expect(result.runOk).toBeNull();
		expect(result.reason).toBe("infra");
		expect(sandboxMock.stop).toHaveBeenCalled();
	});

	it("budżet przekroczony → runOk=null 'budget' i ZERO utworzonych mikroVM", async () => {
		mockApplyRateLimit.mockResolvedValue({ success: false, reset: 0, remaining: 0 });
		const result = await runHiddenTests({
			studentId: "s-1",
			studentFiles: STUDENT_FILES,
			suite: SUITE_NO_DEPS,
		});
		expect(result.runOk).toBeNull();
		expect(result.reason).toBe("budget");
		expect(createMock).not.toHaveBeenCalled();
	});

	it("wyjątek SDK (awaria infry) → runOk=null 'infra'; stop() mimo błędu gdy sandbox powstał", async () => {
		sandboxMock.runCommand.mockRejectedValue(new Error("sandbox died"));
		const result = await runHiddenTests({
			studentId: "s-1",
			studentFiles: STUDENT_FILES,
			suite: SUITE_NO_DEPS,
		});
		expect(result.runOk).toBeNull();
		expect(result.reason).toBe("infra");
		expect(sandboxMock.stop).toHaveBeenCalledTimes(1);
	});

	it("ogon wyjścia przycięty do limitu (raport nie zalewa DB)", async () => {
		sandboxMock.runCommand.mockResolvedValue(cmdResult(0, "x".repeat(10_000)));
		const result = await runHiddenTests({
			studentId: "s-1",
			studentFiles: STUDENT_FILES,
			suite: SUITE_NO_DEPS,
		});
		expect(result.outputTail.length).toBeLessThanOrEqual(4000);
	});
});
