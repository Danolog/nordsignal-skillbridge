// ============================================================================
// LOADER MODELU KARIERY (1.0) — flag-gated źródło: statyczny JSON albo DB.
//
// Zasada „deploy ≠ release": flaga `careerModelFromDb` OFF (domyślnie) =
// zachowanie sprzed 1.0 — model czytany statycznie z repo, ZERO zapytań do DB.
// Flaga ON = model z aktywnego wiersza `career_model_versions` (ingest:
// tools/ingest-career-model.ts), z weryfikacją SHA-256 przed parsowaniem.
//
// Semantyka awarii (dostępność > rygor, świadomie): brak aktywnego wiersza,
// zły checksum albo błąd DB → logError + fallback na statyczny JSON do końca
// życia procesu. Onboarding nie może paść, bo konfiguracja w DB kuleje —
// statyczny artefakt w repo jest zawsze poprawny (ten sam ETL go wygenerował).
//
// Cache per PROCES (instancja serverless): model czytany raz; nowy ingest
// widoczny po recyklingu instancji/redeployu. Świadomy kompromis P0 —
// odświeżanie na żywo, jeśli będzie potrzebne, to osobne zadanie.
// ============================================================================

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import staticCareerModel from "@/lib/db/data/career-model.json";
import { careerModelVersions } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import type { CareerModelData } from "./types";

// Stan modułu: aktualny model + pokolenie (generation). Pokolenie rośnie przy
// podmianie źródła — konsumenci z własnym cache (indeks competency-groups)
// unieważniają się, porównując pokolenie, zamiast trzymać stale indeksy
// zbudowane na starym modelu.
let currentModel: CareerModelData = staticCareerModel as unknown as CareerModelData;
let generation = 0;
let dbLoadAttempted = false;

/** SHA-256 (hex) treści artefaktu — ta sama funkcja co w ingest (jedna definicja). */
export function careerModelChecksum(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Preload modelu. Wołać na WEJŚCIACH serwerowych (async) przed użyciem sync
 * akcesorów competency-groups. Flaga off → natychmiastowy return (zero DB).
 * Flaga on → jednorazowa (per proces) próba odczytu aktywnego wiersza z DB.
 */
export async function ensureCareerModelLoaded(): Promise<void> {
	if (!isFeatureEnabled("careerModelFromDb")) return;
	if (dbLoadAttempted) return;
	// Sygnatura „już próbowano" ustawiana PRZED await — równoległe wywołania nie
	// dublują zapytania; przegrany wyścig po prostu użyje statycznego modelu do
	// czasu, aż zwycięzca podmieni (akcesory czytają currentModel na żywo).
	dbLoadAttempted = true;
	try {
		const row = await db.query.careerModelVersions.findFirst({
			where: eq(careerModelVersions.isActive, true),
			columns: { content: true, checksum: true, snapshot: true },
		});
		if (!row) {
			logError("career-model-loader", new Error("Brak aktywnego wiersza career_model_versions"));
			return; // fallback: statyczny JSON
		}
		const actual = careerModelChecksum(row.content);
		if (actual !== row.checksum) {
			logError(
				"career-model-loader",
				new Error(`Checksum aktywnego modelu nie zgadza się (snapshot ${row.snapshot})`),
			);
			return; // fallback: statyczny JSON (nie parsujemy podejrzanej treści)
		}
		currentModel = JSON.parse(row.content) as CareerModelData;
		generation += 1;
	} catch (err) {
		logError("career-model-loader", err);
		// fallback: statyczny JSON — brak rethrow (dostępność onboardingu > rygor)
	}
}

/** Aktualny model (statyczny JSON albo załadowany z DB). Sync — po preloadzie. */
export function getCareerModel(): CareerModelData {
	return currentModel;
}

/** Pokolenie modelu — rośnie przy podmianie źródła (unieważnianie cache konsumentów). */
export function getCareerModelGeneration(): number {
	return generation;
}

/** TYLKO do testów: reset stanu modułu (model statyczny, pokolenie 0, brak próby DB). */
export function resetCareerModelForTests(): void {
	currentModel = staticCareerModel as unknown as CareerModelData;
	generation = 0;
	dbLoadAttempted = false;
}
