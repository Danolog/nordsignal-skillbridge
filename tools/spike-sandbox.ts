/**
 * B6/1.8 — SPIKE WYKONALNOŚCI Vercel Sandbox (ADR-012).
 *
 * Mierzy na ŻYWEJ usłudze, czy piaskownica mieści się w budżecie czasu
 * submitu (maxDuration trasy = 300 s):
 *   1. czas utworzenia mikroVM (python3.13),
 *   2. czas `pip install pandas numpy` (sieć zawężona do PyPI — deny-all
 *      blokuje wszystko, więc na fazę instalacji otwieramy WYŁĄCZNIE domeny
 *      PyPI; kod studenta w 1.8 pobiegnie już po instalacji),
 *   3. czas biegu krótkiego skryptu pandas (proxy „ukrytego test-suite"),
 *   4. dowód izolacji: żądanie do example.com MUSI paść.
 *
 * Uruchomienie (token z `vercel env pull`, poza repo):
 *   set -a && source <scratchpad>/spike.env && set +a && pnpm exec tsx tools/spike-sandbox.ts
 *
 * Wynik = tabela czasów na stdout; wnioski trafiają do PR-a 1.8.
 */

import { Sandbox } from "@vercel/sandbox";

const PYPI_DOMAINS = ["pypi.org", "files.pythonhosted.org"];

function ms(from: number, to: number): string {
	return `${((to - from) / 1000).toFixed(1)}s`;
}

async function main() {
	const marks: Record<string, string> = {};
	const t0 = Date.now();

	const sandbox = await Sandbox.create({
		runtime: "python3.13",
		timeout: 240_000,
		resources: { vcpus: 2 },
		networkPolicy: {
			mode: "custom",
			allowedDomains: PYPI_DOMAINS,
		} as never,
	});
	const tCreated = Date.now();
	marks["1. utworzenie mikroVM"] = ms(t0, tCreated);

	try {
		// 4a. Izolacja: domena spoza allowlisty musi być odcięta.
		const net = await sandbox.runCommand("python3", [
			"-c",
			"import urllib.request; urllib.request.urlopen('https://example.com', timeout=5)",
		]);
		marks["4. example.com odcięte"] = net.exitCode !== 0 ? "TAK (exit != 0)" : "NIE — LEAK!";

		const tPipStart = Date.now();
		const pip = await sandbox.runCommand("pip", ["install", "--quiet", "pandas", "numpy"]);
		const tPipEnd = Date.now();
		marks["2. pip install pandas numpy"] = `${ms(tPipStart, tPipEnd)} (exit ${pip.exitCode})`;

		const tRunStart = Date.now();
		const run = await sandbox.runCommand("python3", [
			"-c",
			[
				"import pandas as pd, numpy as np",
				"df = pd.DataFrame({'x': np.arange(1000), 'y': np.random.rand(1000)})",
				"assert len(df.groupby(df.x % 7).y.mean()) == 7",
				"print('PANDAS_OK', df.y.sum() > 0)",
			].join("; "),
		]);
		const tRunEnd = Date.now();
		const stdout = await run.stdout();
		marks["3. bieg skryptu pandas"] =
			`${ms(tRunStart, tRunEnd)} (exit ${run.exitCode}, stdout: ${stdout.trim()})`;

		marks["RAZEM (utworzenie→wynik)"] = ms(t0, tRunEnd);
	} finally {
		await sandbox.stop();
	}

	console.log("\n=== SPIKE Vercel Sandbox — wyniki ===");
	for (const [k, v] of Object.entries(marks)) console.log(`${k}: ${v}`);
}

main().catch((err) => {
	console.error("SPIKE FAILED:", err);
	process.exit(1);
});
