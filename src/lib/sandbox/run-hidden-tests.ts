// ============================================================================
// B6/1.8 (ADR-012) — RUNNER ukrytych test-suites w Vercel Sandbox.
//
// Kontrakt bezpieczeństwa (twarde niezmienniki z ADR-012):
//  • jednorazowe mikroVM per bieg (żadnych snapshotów/persystencji),
//  • sieć: deny-all; WYŁĄCZNIE gdy suite ma deps — allowlista domen PyPI
//    (read-only CDN; ryzyko eksfiltracji szczątkowe i udokumentowane),
//  • ZERO env/sekretów aplikacji w piaskownicy,
//  • budżet: limiter sandboxRun per student/dzień (wzorzec 0.0) — przekroczenie
//    = runOk null + reason 'budget' (fail-closed, decyzja człowieka w 1.9),
//  • timeout suite'u ≪ maxDuration trasy; sandbox.stop() ZAWSZE (finally).
//
// runOk: true (exit 0) / false (exit != 0) / null (infra/budżet — NIE werdykt).
// Spike wykonalności (tools/spike-sandbox.ts, 2026-07-08): create 0,7 s +
// pip pandas/numpy 7,6 s + bieg 0,8 s = 9,7 s — ~30× zapasu w budżecie trasy.
// ============================================================================

import { Sandbox } from "@vercel/sandbox";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit";

/** Domeny PyPI — jedyny wyjątek od deny-all, tylko na czas biegu z deps. */
const PYPI_DOMAINS = ["pypi.org", "files.pythonhosted.org"];

/** Ile ogona stdout/stderr trzymamy do raportu (diagnoza bez zalewania DB). */
const OUTPUT_TAIL_CHARS = 4000;

export type SandboxFile = { path: string; content: string };

/** Kształt wiersza project_hidden_tests po stronie runnera. */
export type HiddenTestSuite = {
	deps: string[];
	files: SandboxFile[];
	command: string[];
	timeoutMs: number;
};

export type HiddenTestRunResult = {
	/** true/false = werdykt testów; null = bieg się NIE odbył (patrz reason). */
	runOk: boolean | null;
	exitCode: number | null;
	/** Ogon wyjścia (stdout+stderr) dla raportu recenzenta. */
	outputTail: string;
	durationMs: number;
	/** Wypełnione tylko przy runOk=null. */
	reason?: "budget" | "infra";
};

function tail(s: string): string {
	return s.length > OUTPUT_TAIL_CHARS ? s.slice(-OUTPUT_TAIL_CHARS) : s;
}

/**
 * Uruchamia pliki studenta + ukryty suite w jednorazowej piaskownicy.
 * Wołający (1.9, krok 2 potoku) decyduje, co znaczy runOk=null (fail-closed
 * do człowieka) — runner NIGDY nie zgaduje werdyktu przy awarii.
 */
export async function runHiddenTests(args: {
	studentId: string;
	studentFiles: SandboxFile[];
	suite: HiddenTestSuite;
}): Promise<HiddenTestRunResult> {
	const { studentId, studentFiles, suite } = args;
	const started = Date.now();

	// Budżet per student/dzień — PRZED utworzeniem mikroVM (koszt zero).
	const budget = await applyRateLimit(rateLimiters.sandboxRun, `sandbox:${studentId}`);
	if (!budget.success) {
		return {
			runOk: null,
			exitCode: null,
			outputTail: "",
			durationMs: Date.now() - started,
			reason: "budget",
		};
	}

	let sandbox: Awaited<ReturnType<typeof Sandbox.create>> | null = null;
	try {
		sandbox = await Sandbox.create({
			runtime: "python3.13",
			// Zapas nad timeoutem suite'u na create+pip; mikroVM i tak ubijamy w finally.
			timeout: suite.timeoutMs + 120_000,
			resources: { vcpus: 2 },
			// deny-all, chyba że trzeba PyPI na deps (jedyny wyjątek, ADR-012).
			networkPolicy: (suite.deps.length > 0
				? { mode: "custom", allowedDomains: PYPI_DOMAINS }
				: "deny-all") as never,
		});

		await sandbox.writeFiles(
			[...studentFiles, ...suite.files].map((f) => ({
				path: f.path,
				content: Buffer.from(f.content, "utf8"),
			})),
		);

		if (suite.deps.length > 0) {
			const pip = await sandbox.runCommand("pip", ["install", "--quiet", ...suite.deps]);
			if (pip.exitCode !== 0) {
				// Zależności suite'u to NASZ artefakt kuracji — ich awaria nie może
				// obciążać studenta werdyktem false.
				return {
					runOk: null,
					exitCode: pip.exitCode,
					outputTail: tail(await pip.stderr()),
					durationMs: Date.now() - started,
					reason: "infra",
				};
			}
		}

		const [cmd, ...cmdArgs] = suite.command;
		const run = await sandbox.runCommand(cmd, cmdArgs);
		const [stdout, stderr] = await Promise.all([run.stdout(), run.stderr()]);

		return {
			runOk: run.exitCode === 0,
			exitCode: run.exitCode,
			outputTail: tail(`${stdout}\n${stderr}`.trim()),
			durationMs: Date.now() - started,
		};
	} catch (err) {
		logError("sandbox.run-hidden-tests", err, { studentId });
		return {
			runOk: null,
			exitCode: null,
			outputTail: "",
			durationMs: Date.now() - started,
			reason: "infra",
		};
	} finally {
		// Jednorazowość: mikroVM ubijana ZAWSZE, także po błędzie.
		if (sandbox) {
			await sandbox.stop().catch(() => {
				// stop() best-effort — timeout sandboxa i tak go zabije.
			});
		}
	}
}
