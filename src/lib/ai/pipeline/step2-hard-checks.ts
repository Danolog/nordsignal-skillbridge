/**
 * Krok 2 — twarde sprawdzenia per typ deliverable (deterministyczne, BEZ AI,
 * BEZ uruchamiania kodu studenta — wariant (iii) z designu §3.2, Faza 1).
 *
 * Co liczymy:
 *  - document        → struktura README (Cel · Uruchomienie · Wnioski), długość,
 *  - code            → obecność pliku wejściowego + analiza statyczna składni
 *                      (zbalansowane nawiasy/cudzysłowy, plik niepusty),
 *  - detection_rule  → walidacja składni reguły (niepusta, ma strukturę),
 *  - sql             → walidacja składni zapytania (słowa kluczowe, średniki),
 *  - mixed           → suma powyższych właściwych części.
 *
 * `runOk` ZAWSZE null w Fazie 1 (nie uruchamiamy — to Faza 2/piaskownica).
 * Sprawdzenie, które nie przejdzie, NIE blokuje oceny semantycznej — zapala
 * flagę `hard_check_failed` kierującą do człowieka (krok 5).
 */

import type {
	DeliverableType,
	FetchContentData,
	HardTestResults,
	PipelineFlag,
	StepResult,
} from "@/lib/ai/pipeline/types";

/**
 * Wymagane sekcje README (kontrakt wejścia §I.3) — po Bloku E (E3) każda
 * sekcja to klasa synonimów, nie jedno słowo. Powód: żadna treść projektów
 * nie każe studentowi pisać dosłownie „cel/uruchomienie/wnioski", a rubryka
 * L2 dyktuje README „dla rekrutera" (problem → dane → wynik → jak odtworzyć) —
 * student idący za briefem dostawał `hard_check_failed` mimo dobrego README.
 * Kontrakt: README musi ADRESOWAĆ trzy funkcje (po co / jak uruchomić /
 * co wyszło), nie zawierać trzech konkretnych słów.
 */
const README_SECTIONS = [
	{ key: "cel", pattern: /\bcel|\bproblem|\bpo co\b|opis projektu|## o projekcie/ },
	{
		key: "uruchomienie",
		pattern: /uruchom|instalacj|odtworz|setup|installation|getting started|how to run|jak zacz/,
	},
	{ key: "wnioski", pattern: /wnios|wynik|podsumowanie|rezultat|conclusion|results/ },
] as const;
const README_MIN_CHARS = 120;

const CODE_EXTENSIONS = new Set([
	"py",
	"js",
	"jsx",
	"ts",
	"tsx",
	"sh",
	"ps1",
	"go",
	"rb",
	"java",
	"c",
	"cpp",
	"rs",
	"php",
]);
const SQL_EXTENSIONS = new Set(["sql"]);
const RULE_EXTENSIONS = new Set(["spl", "conf", "yml", "yaml"]);

function extOf(path: string): string {
	const base = path.split("/").pop() ?? "";
	const dot = base.lastIndexOf(".");
	return dot <= 0 ? "" : base.slice(dot + 1).toLowerCase();
}

/** README adresuje trzy funkcje (cel/uruchomienie/wnioski — klasy synonimów) i ma minimalną długość. */
export function checkReadmeStructure(readme: string): { ok: boolean; missing: string[] } {
	const lower = readme.toLowerCase();
	const missing = README_SECTIONS.filter((s) => !s.pattern.test(lower)).map((s) => s.key);
	const longEnough = readme.trim().length >= README_MIN_CHARS;
	return {
		ok: missing.length === 0 && longEnough,
		missing: longEnough ? missing : [...missing, "(za krótki)"],
	};
}

/**
 * Lekka analiza statyczna składni: zbalansowane nawiasy `()[]{}` poza stringami
 * i komentarzami liniowymi. NIE wykonuje kodu. Wykrywa atrapy/ucięte pliki i
 * grube błędy składni — celowo konserwatywna (false-negatives ok, bo decyzja i
 * tak idzie do oceny semantycznej + człowieka).
 */
export function checkBracketsBalanced(content: string): boolean {
	const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
	const opens = new Set(["(", "[", "{"]);
	const stack: string[] = [];
	let inString: string | null = null;
	let escaped = false;

	for (let i = 0; i < content.length; i++) {
		const ch = content[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === inString) inString = null;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			inString = ch;
			continue;
		}
		if (opens.has(ch)) stack.push(ch);
		else if (ch in pairs) {
			if (stack.pop() !== pairs[ch]) return false;
		}
	}
	return stack.length === 0 && inString === null;
}

/** Czy zapytanie SQL wygląda składniowo sensownie (bez wykonania). */
export function checkSqlSyntax(content: string): boolean {
	const lower = content.toLowerCase();
	const hasKeyword = /\b(select|insert|update|delete|create|with|merge)\b/.test(lower);
	if (!hasKeyword) return false;
	return checkBracketsBalanced(content);
}

function hasInputFile(files: FetchContentData["files"], exts: Set<string>): boolean {
	return files.some((f) => exts.has(extOf(f.path)));
}

/** Główne sprawdzenie — rozgałęzia się po typie deliverable. */
export function runHardChecks(
	content: FetchContentData,
	deliverableType: DeliverableType,
): StepResult<HardTestResults> {
	const messages: string[] = [];
	const flags: PipelineFlag[] = [];

	let readmeStructureOk: boolean | null = null;
	let syntaxOk: boolean | null = null;
	let inputFilePresent: boolean | null = null;

	const wantsReadme = deliverableType === "document" || deliverableType === "mixed";
	const wantsCode = deliverableType === "code" || deliverableType === "mixed";
	const wantsSql = deliverableType === "sql" || deliverableType === "mixed";
	const wantsRule = deliverableType === "detection_rule" || deliverableType === "mixed";

	if (wantsReadme) {
		const r = checkReadmeStructure(content.readme);
		readmeStructureOk = r.ok;
		if (!r.ok) messages.push(`README niekompletny: brak sekcji ${r.missing.join(", ")}.`);
	}

	if (wantsCode) {
		const codeFiles = content.files.filter((f) => CODE_EXTENSIONS.has(extOf(f.path)));
		inputFilePresent = hasInputFile(content.files, CODE_EXTENSIONS);
		if (!inputFilePresent) messages.push("Brak pliku z kodem wejściowym.");
		if (codeFiles.length > 0) {
			const allBalanced = codeFiles.every((f) => checkBracketsBalanced(f.content));
			syntaxOk = allBalanced;
			if (!allBalanced)
				messages.push("Analiza statyczna: niezbalansowane nawiasy/cudzysłowy w kodzie.");
		}
	}

	if (wantsSql) {
		const sqlFiles = content.files.filter((f) => SQL_EXTENSIONS.has(extOf(f.path)));
		if (sqlFiles.length > 0) {
			const allOk = sqlFiles.every((f) => checkSqlSyntax(f.content));
			syntaxOk = syntaxOk === false ? false : allOk;
			if (!allOk)
				messages.push(
					"Walidacja składni SQL nie przeszła (brak słów kluczowych lub błąd nawiasów).",
				);
		} else if (deliverableType === "sql") {
			inputFilePresent = false;
			messages.push("Brak pliku .sql w zgłoszeniu typu SQL.");
		}
	}

	if (wantsRule) {
		const ruleFiles = content.files.filter((f) => RULE_EXTENSIONS.has(extOf(f.path)));
		if (ruleFiles.length > 0) {
			const allOk = ruleFiles.every(
				(f) => f.content.trim().length > 0 && checkBracketsBalanced(f.content),
			);
			syntaxOk = syntaxOk === false ? false : allOk;
			if (!allOk) messages.push("Walidacja składni reguły detekcji nie przeszła.");
		} else if (deliverableType === "detection_rule") {
			inputFilePresent = false;
			messages.push("Brak pliku reguły detekcji w zgłoszeniu.");
		}
	}

	const failed = readmeStructureOk === false || syntaxOk === false || inputFilePresent === false;
	if (failed) {
		flags.push({
			code: "hard_check_failed",
			message: messages.join(" ") || "Twarde sprawdzenie nie przeszło.",
		});
	}

	return {
		ok: !failed,
		data: {
			deliverableType,
			readmeStructureOk,
			syntaxOk,
			inputFilePresent,
			runOk: null, // Faza 1: nie uruchamiamy kodu
			endpointChecks: null, // Blok E (E2): wypełnia krok 2c w index.ts (sieć poza tym krokiem)
			messages,
		},
		flags,
	};
}
