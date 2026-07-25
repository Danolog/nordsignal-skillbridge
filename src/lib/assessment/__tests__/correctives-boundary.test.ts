// ============================================================================
// 1E.3 (ADR-014 D3) — STRAŻNIK GRANICY: correctives.ts musi zostać CZYSTY
// (0 DB, 0 LLM). Nagłówek pliku deklaruje „CZYSTE funkcje, 0 LLM, 0 DB" (odczyt
// banku koncept↔atom robi warstwa serwisowa owner-side), ale bez egzekwowanej
// reguły ktoś mógłby wstrzyknąć `import { db }` / `@ai-sdk` i cicho przenieść
// I/O do warstwy czystej. Ten test to AUTOMATYCZNY strażnik: skanuje faktyczne
// specyfikatory importów pliku i pada, gdy pojawi się DB/AI.
//
// Wybór „test zamiast reguły Biome": prostszy i przenośny (zero konfiguracji
// override per-plik), a dowód, że guard REALNIE łapie import DB, jest wbudowany
// (kontrola negatywna niżej) — Quinn potwierdza: dodaj `import db` → czerwone.
// ============================================================================

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CORRECTIVES_PATH = join(process.cwd(), "src/lib/assessment/correctives.ts");

/**
 * Specyfikatory modułów z instrukcji `import … from "X"`, `export … from "X"`
 * oraz side-effect `import "X"`. Skan po SPECYFIKATORZE (nie po gołym podciągu),
 * więc komentarz „0 DB" ani identyfikator `db` w kodzie NIE dają fałszywego alarmu.
 */
function importedModules(src: string): string[] {
	const specifiers: string[] = [];
	for (const m of src.matchAll(
		/(?:^|\n)\s*(?:import|export)\b[^\n;]*?\bfrom\s*["']([^"']+)["']/g,
	)) {
		specifiers.push(m[1]);
	}
	for (const m of src.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g)) {
		specifiers.push(m[1]);
	}
	return specifiers;
}

/** Czy specyfikator to warstwa DB lub LLM (zakazana w correctives.ts). */
function isDbOrAiImport(spec: string): boolean {
	return (
		spec === "@/lib/db" ||
		spec.startsWith("@/lib/db/") ||
		spec === "@/lib/ai" ||
		spec.startsWith("@/lib/ai/") ||
		spec.startsWith("drizzle-orm") ||
		spec.startsWith("@ai-sdk") ||
		spec === "ai" ||
		spec === "pg" ||
		spec.startsWith("postgres")
	);
}

describe("granica correctives.ts — CZYSTE funkcje (0 DB, 0 LLM)", () => {
	const src = readFileSync(CORRECTIVES_PATH, "utf8");

	it("nie importuje warstwy DB (db/drizzle/pg) ani LLM (ai/@ai-sdk)", () => {
		const forbidden = importedModules(src).filter(isDbOrAiImport);
		expect(forbidden).toEqual([]);
	});

	it("KONTROLA NEGATYWNA: matcher REALNIE łapie import db/ai (guard nie jest ślepy)", () => {
		// Gdyby ktoś dodał te importy do correctives.ts, test wyżej byłby czerwony.
		const poisoned = [
			'import { db } from "@/lib/db";',
			'import { assessmentSessions } from "@/lib/db/schema";',
			'import { generateText } from "ai";',
			'import { openai } from "@ai-sdk/openai";',
			'import { eq } from "drizzle-orm";',
		].join("\n");
		expect(importedModules(poisoned).filter(isDbOrAiImport)).toEqual([
			"@/lib/db",
			"@/lib/db/schema",
			"ai",
			"@ai-sdk/openai",
			"drizzle-orm",
		]);
	});
});
