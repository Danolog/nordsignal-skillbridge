import { describe, expect, it } from "vitest";
import {
	checkBracketsBalanced,
	checkReadmeStructure,
	checkSqlSyntax,
	runHardChecks,
} from "../step2-hard-checks";
import type { FetchContentData, FetchedFile } from "../types";

function content(
	files: Array<Partial<FetchedFile> & { path: string; content: string }>,
	readme = "",
): FetchContentData {
	return {
		artifact: "",
		readme,
		files: files.map((f) => ({ lineCount: 1, truncated: false, ...f })),
		omittedFiles: [],
		inputMeta: { truncated: false, omittedFiles: [] },
		defaultBranch: "main",
	};
}

describe("step2 — twarde sprawdzenia (bez uruchamiania)", () => {
	it("README: wymaga sekcji Cel/Uruchomienie/Wnioski i minimalnej długości", () => {
		const full = `# Projekt\n## Cel\n${"x".repeat(60)}\n## Uruchomienie\npython main.py\n## Wnioski\nzrobione`;
		expect(checkReadmeStructure(full).ok).toBe(true);
		const missing = checkReadmeStructure("## Cel\ntyle");
		expect(missing.ok).toBe(false);
		expect(missing.missing).toContain("uruchomienie");
	});

	// Blok E (E3): sekcje to klasy synonimów — README „dla rekrutera" (układ z
	// rubryki L2: problem → jak odtworzyć → wyniki) przechodzi bez dosłownych
	// słów cel/uruchomienie/wnioski.
	it("README: synonimy adresują kontrakt (problem/odtworzyć/wyniki = cel/uruchomienie/wnioski)", () => {
		const rekruterskie = `# Analiza rotacji klientów\n## Problem biznesowy\n${"x".repeat(60)}\n## Jak odtworzyć\npip install -r requirements.txt\n## Wyniki\nF1 = 0.81`;
		expect(checkReadmeStructure(rekruterskie).ok).toBe(true);
		const angielskie = `# Churn\n## About\ngoal: churn problem\n## Getting started\nmake run\n## Results\nAUC 0.9 ${"x".repeat(60)}`;
		expect(checkReadmeStructure(angielskie).ok).toBe(true);
	});

	it("brackets: wykrywa zbalansowane i niezbalansowane (poza stringami)", () => {
		expect(checkBracketsBalanced("def f(): return [1, {'a': 2}]")).toBe(true);
		expect(checkBracketsBalanced("def f(: return")).toBe(false);
		// nawias w stringu nie liczy się jako struktura
		expect(checkBracketsBalanced('x = "to ( nie liczy"')).toBe(true);
	});

	it("SQL: wymaga słowa kluczowego i zbalansowanych nawiasów", () => {
		expect(checkSqlSyntax("SELECT * FROM logs WHERE id = 1")).toBe(true);
		expect(checkSqlSyntax("to nie jest sql")).toBe(false);
		expect(checkSqlSyntax("SELECT (FROM")).toBe(false);
	});

	it("runOk ZAWSZE null w Fazie 1 (nie uruchamiamy kodu)", () => {
		const r = runHardChecks(content([{ path: "main.py", content: "print(1)" }]), "code");
		expect(r.data.runOk).toBeNull();
	});

	it("typ code: brak pliku wejściowego → flaga hard_check_failed", () => {
		const r = runHardChecks(content([{ path: "notes.txt", content: "hej" }]), "code");
		expect(r.data.inputFilePresent).toBe(false);
		expect(r.ok).toBe(false);
		expect(r.flags.some((f) => f.code === "hard_check_failed")).toBe(true);
	});

	it("typ document: waliduje strukturę README, nie dotyka składni kodu", () => {
		const r = runHardChecks(
			content([], `## Cel\n${"a".repeat(150)}\n## Uruchomienie\nx\n## Wnioski\ny`),
			"document",
		);
		expect(r.data.readmeStructureOk).toBe(true);
		expect(r.data.syntaxOk).toBeNull();
		expect(r.ok).toBe(true);
	});

	it("typ sql: poprawne zapytanie przechodzi", () => {
		const r = runHardChecks(
			content([{ path: "q.sql", content: "SELECT a FROM t WHERE b > 1" }]),
			"sql",
		);
		expect(r.data.syntaxOk).toBe(true);
		expect(r.ok).toBe(true);
	});
});
