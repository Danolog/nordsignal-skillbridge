/**
 * lift-candidates — generator ARTEFAKTU-KANDYDATA do ręcznej kuracji liści (Tor 1, Ethan).
 *
 * Dla każdej z 23 ścieżek liczy WSZYSTKIE technologie po bramce min-wolumenu (anchor-config:
 * countMinFor) z klasyfikacją kind (tool/cert/meta/soft) i scaleniem wariantów
 * nazw. Wynik = ściąga dla Sophii do RĘCZNEJ kuracji liści w career-model.ts (HITL,
 * Built-to-Sell — silnik podpowiada, człowiek decyduje).
 *
 * Dodatkowo na stdout: raport PRZED/PO dla płaskiego katalogu studenta — stary
 * (committowany) artefakt vs nowy z bramką min-wolumenu. Pokazuje wpływ bramki na cyber i
 * sygnalizuje ścieżki, które bramka OPRÓŻNIA przy obecnych (jeszcze nieskuratorowanych)
 * liściach — lista priorytetów do kuracji Sophii.
 *
 * NIE dotyka bazy. NIE nadpisuje artefaktów produktu (career-model.json /
 * job-market-justjoinit.json) — pisze tylko do podanej ścieżki wyjścia (scratchpad).
 *
 * UŻYCIE:
 *   pnpm exec tsx tools/lift-candidates.ts <ścieżka-wyjścia.json>
 *   JJIT_CSV_DIR="/inna/sciezka" pnpm exec tsx tools/lift-candidates.ts out.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { COUNT_MIN_ABS } from "../src/lib/db/data/anchor-config";
import {
	assignAll,
	buildAnchors,
	buildCandidates,
	buildCareerModel,
	buildTechIndex,
	type CareerGoalEntry,
	cleanOffers,
	flattenLeaves,
	globalTechFrequency,
	parseCsv,
	pathStats,
} from "./etl-justjoinit";

const DEFAULT_CSV_DIR = "/mnt/c/Users/D/Documents/WSB MERITO/25_26/Semestr 4/AI/";

function readCsv(path: string): Record<string, string>[] {
	let text = readFileSync(path, "utf-8");
	if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
	return parseCsv(text, ";");
}

/** Lista nazw kompetencji w płaskim katalogu danej ścieżki (po popycie malejąco). */
function compNames(entries: CareerGoalEntry[], goal: string): { name: string; pct: number }[] {
	const e = entries.find((x) => x.careerGoal === goal);
	return e ? e.competencies.map((c) => ({ name: c.name, pct: c.demandPercentage })) : [];
}

function main(): void {
	const outPath = process.argv[2];
	if (!outPath) {
		console.error("Podaj ścieżkę wyjścia: pnpm exec tsx tools/lift-candidates.ts <out.json>");
		process.exit(1);
	}
	const csvDir = process.env.JJIT_CSV_DIR ?? DEFAULT_CSV_DIR;
	const offerRows = readCsv(join(csvDir, "JustJoinIT_Oferty.csv"));
	const techRows = readCsv(join(csvDir, "JustJoinIT_Technologie.csv"));

	// Pełny pipeline (funkcje czyste z silnika).
	const techBySlug = buildTechIndex(techRows);
	const { offers } = cleanOffers(offerRows, techBySlug);
	const anchors = buildAnchors(offers);
	const assignment = assignAll(offers, anchors);
	const stats = pathStats(assignment, offers);
	const { freq, total } = globalTechFrequency(offers);

	// AFTER: nowy płaski katalog z bramką min-wolumenu (te same skuratorowane liście, nowa miara).
	const model = buildCareerModel(stats, freq, total);
	const after = flattenLeaves(model);

	// BEFORE: committowany artefakt (stary próg „udział < 1%").
	const beforeArtifact = JSON.parse(
		readFileSync(
			join(process.cwd(), "src", "lib", "db", "data", "job-market-justjoinit.json"),
			"utf-8",
		),
	) as { data: CareerGoalEntry[] };
	const before = beforeArtifact.data;

	// Kandydaci dla Sophii (pełna populacja, top-40 per ścieżka).
	const candidates = buildCandidates(stats, freq, total, 40);

	const outObj = {
		_meta: {
			generator: "tools/lift-candidates.ts (Tor 1, Ethan)",
			snapshot: "2026-02",
			cleanedOffers: total,
			countMinAbs: COUNT_MIN_ABS,
			note: "Kandydaci po bramce (meta + min-wolumen, BEZ krotności) + kind. passesGate=true → silne kandydatury do liści. lift = pole INFORMACYJNE (nie rankuje). variants = napisy scalone (countAs do kuracji). NIE jest artefaktem produktu.",
		},
		paths: candidates,
	};
	writeFileSync(outPath, `${JSON.stringify(outObj, null, "\t")}\n`, "utf-8");

	// ── Raport stdout ─────────────────────────────────────────────────────────
	console.log(`\n=== KANDYDACI zapisani: ${outPath} (${candidates.length} ścieżek) ===`);
	console.log(
		`Oczyszczonych ofert (mianownik globalny): ${total} | COUNT_MIN_ABS=${COUNT_MIN_ABS}\n`,
	);

	console.log("=== PRZED/PO — liczba kompetencji w płaskim katalogu per ścieżka ===");
	console.log("(PO = obecne liście + bramka min-wolumenu; kuracja Sophii dopiero doda właściwe liście)");
	const goals = before.map((e) => e.careerGoal);
	const emptied: string[] = [];
	for (const goal of goals) {
		const b = compNames(before, goal).length;
		const a = compNames(after, goal).length;
		const flag = a === 0 ? "  ⚠ PUSTA — pilna kuracja" : a < b ? "  (zawężona)" : "";
		if (a === 0) emptied.push(goal);
		console.log(`  ${goal.padEnd(28)} ${String(b).padStart(2)} → ${String(a).padStart(2)}${flag}`);
	}
	console.log(
		`\nŚcieżek opróżnionych przez bramkę na OBECNYCH liściach: ${emptied.length} (czekają na kurację)`,
	);

	console.log("\n=== CYBER — płaski katalog PRZED vs PO bramce (obecne liście) ===");
	console.log(
		"PRZED:",
		compNames(before, "Cybersecurity Specialist")
			.map((c) => `${c.name} ${c.pct}%`)
			.join(", ") || "(brak)",
	);
	console.log(
		"PO:   ",
		compNames(after, "Cybersecurity Specialist")
			.map((c) => `${c.name} ${c.pct}%`)
			.join(", ") || "(brak — obecne liście to stereotyp pentest, kuracja doda SIEM/IAM/SoC)",
	);

	console.log("\n=== CYBER — KANDYDACI (co bramka wskazuje do kuracji; top przechodzące) ===");
	const cyber = candidates.find((c) => c.careerGoal === "Cybersecurity Specialist");
	if (cyber) {
		console.log(
			`offerCount=${cyber.offerCount} countMin=${cyber.countMin} | przeszło bramkę: ${cyber.passing}`,
		);
		for (const c of cyber.candidates.filter((x) => x.passesGate).slice(0, 16)) {
			console.log(
				`  ${c.name.padEnd(20)} kind=${c.kind.padEnd(4)} n=${String(c.offers).padStart(3)} pathPct=${String(c.pathPct).padStart(4)}% lift=${c.lift}`,
			);
		}
		console.log("  --- odrzucone jako META/CERT/SOFT (do osobnego kubełka / blokady): ---");
		for (const c of cyber.candidates.filter((x) => x.kind !== "tool").slice(0, 8)) {
			console.log(
				`  ${c.name.padEnd(20)} kind=${c.kind.padEnd(4)} n=${String(c.offers).padStart(3)} pathPct=${String(c.pathPct).padStart(4)}% lift=${c.lift}`,
			);
		}
	}
}

main();
