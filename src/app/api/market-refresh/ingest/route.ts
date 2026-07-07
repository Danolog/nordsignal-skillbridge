// ============================================================================
// AG.3 — INGEST MIESIĘCZNEGO ODŚWIEŻENIA RYNKU (upload CSV → ETL → STAGING).
//
// [CZERWONA LINIA — dane prod]: ta trasa pisze WYŁĄCZNIE do
// `job_market_data_staging` + `market_refresh_runs`. `job_market_data` jest tu
// tylko CZYTANA (do diffu). Swap na prod = AG.4, za jawną akceptacją Darka.
//
// Architektura (decyzja Darka 2026-07-07, zamiast crona pobierającego): dane
// rynku pochodzą z RĘCZNEGO eksportu JustJoinIT (CSV na dysku Darka, prowenicja
// z md5 — docs/data/job-market-provenance.md §0). Darek raz w miesiącu wgrywa
// oba pliki (najlepiej .gz — body Vercela ma limit ~4,5 MB), serwer liczy TEN
// SAM deterministyczny silnik ETL co lokalnie (tools/etl-justjoinit.ts przez
// shim etl-core) i odkłada wynik do stagingu z raportem diffu vs prod.
//
// Dostęp: flaga `proactiveMarketRefresh` (off = trasa nie istnieje, 404)
// + sekret `MARKET_REFRESH_TOKEN` (nagłówek x-market-refresh-token,
// porównanie stałoczasowe). To trasa operacyjna Darka, nie feature studenta —
// celowo poza Better Auth.
// ============================================================================

import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobMarketData, jobMarketDataStaging, marketRefreshRuns } from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { guardMarketRefresh } from "@/lib/market-refresh/auth";
import { diffMarket } from "@/lib/market-refresh/diff";
import { buildArtifact, parseCsv } from "@/lib/market-refresh/etl-core";

// ETL na pełnej skali zrzutu (≈10k ofert / 54k wierszy technologii) mieści się
// w pojedynczych sekundach (pomiar: tests/unit/etl-scale.test.ts), ale upload +
// gunzip + insert dokładają swoje — bierzemy pełny limit, żeby nie ścinać
// przebiegu na wolnym łączu.
export const maxDuration = 300;

/** Gunzip po magic bytes (1f 8b) — przyjmujemy .gz i goły CSV (testy/lokalnie). */
function maybeGunzip(buf: Buffer): Buffer {
	return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
}

/** Bufor → tekst CSV bez BOM (parseCsv oczekuje zdjętego BOM — jak readCsv w tools). */
function toCsvText(buf: Buffer): string {
	const text = buf.toString("utf-8");
	return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function md5Hex(buf: Buffer): string {
	return createHash("md5").update(buf).digest("hex");
}

/** Walidacja strukturalna: właściwy plik ma wymagane kolumny (ochrona przed
 *  pomyleniem plików / złym eksportem — magnitudy ocenia Darek w AG.4, HITL). */
function missingColumns(rows: Record<string, string>[], required: string[]): string[] {
	if (rows.length === 0) return required;
	const keys = new Set(Object.keys(rows[0]));
	return required.filter((c) => !keys.has(c));
}

export async function POST(req: Request) {
	// Wspólna bramka rodziny market-refresh (flaga → 404, token → 401).
	const denied = guardMarketRefresh(req);
	if (denied) return denied;

	let ofertyFile: File | null;
	let technologieFile: File | null;
	try {
		const form = await req.formData();
		ofertyFile = form.get("oferty") as File | null;
		technologieFile = form.get("technologie") as File | null;
	} catch {
		return NextResponse.json({ error: "Oczekiwano multipart/form-data" }, { status: 400 });
	}
	if (!ofertyFile || !technologieFile) {
		return NextResponse.json(
			{ error: 'Wymagane pola plikowe: "oferty" i "technologie" (CSV lub CSV.gz)' },
			{ status: 400 },
		);
	}

	try {
		const ofertyBuf = maybeGunzip(Buffer.from(await ofertyFile.arrayBuffer()));
		const technologieBuf = maybeGunzip(Buffer.from(await technologieFile.arrayBuffer()));

		const offerRows = parseCsv(toCsvText(ofertyBuf));
		const techRows = parseCsv(toCsvText(technologieBuf));

		const missingOferty = missingColumns(offerRows, ["Slug", "Stanowisko", "Kategoria"]);
		const missingTech = missingColumns(techRows, ["Slug", "Technologia"]);
		if (missingOferty.length > 0 || missingTech.length > 0) {
			return NextResponse.json(
				{
					error: "Zły format CSV — brak wymaganych kolumn",
					details: { oferty: missingOferty, technologie: missingTech },
				},
				{ status: 422 },
			);
		}

		// TEN SAM silnik co lokalny regen (prowenicja) — deterministyczny.
		const { artifact, model } = buildArtifact(offerRows, techRows);
		const stagedRows = artifact.data.flatMap((entry) =>
			entry.competencies.map((comp) => ({
				careerGoal: entry.careerGoal,
				competencyName: comp.name,
				demandPercentage: comp.demandPercentage,
				category: comp.category,
				// salaryRange zostaje NULL (decyzja „salary precz", v5).
			})),
		);

		// Diff liczony na treści, którą Darek zaakceptuje albo odrzuci w AG.4.
		const currentRows = await db
			.select({
				careerGoal: jobMarketData.careerGoal,
				competencyName: jobMarketData.competencyName,
				demandPercentage: jobMarketData.demandPercentage,
				category: jobMarketData.category,
			})
			.from(jobMarketData);
		const diff = diffMarket(currentRows, stagedRows);

		// Atomowo: świeży staging + wiersz przebiegu, albo nic (stary staging
		// zostaje przy awarii w środku — wzorzec 0.3).
		const runId = await db.transaction(async (tx) => {
			await tx.delete(jobMarketDataStaging);
			if (stagedRows.length > 0) {
				await tx.insert(jobMarketDataStaging).values(stagedRows);
			}
			const [run] = await tx
				.insert(marketRefreshRuns)
				.values({
					ofertyMd5: md5Hex(ofertyBuf),
					technologieMd5: md5Hex(technologieBuf),
					rawOffers: artifact._meta.rawOffers,
					uniqueOffers: artifact._meta.uniqueOffers,
					assignedOffers: artifact._meta.assignedOffers,
					stagedRows: stagedRows.length,
					diff,
					contentFlat: `${JSON.stringify(artifact, null, "\t")}\n`,
					contentModel: `${JSON.stringify(model, null, "\t")}\n`,
				})
				.returning({ id: marketRefreshRuns.id });
			return run.id;
		});

		return NextResponse.json({
			success: true,
			runId,
			meta: {
				rawOffers: artifact._meta.rawOffers,
				uniqueOffers: artifact._meta.uniqueOffers,
				assignedOffers: artifact._meta.assignedOffers,
				coveragePercent: artifact._meta.coveragePercent,
				paths: artifact._meta.paths,
				stagedRows: stagedRows.length,
				ofertyMd5: md5Hex(ofertyBuf),
				technologieMd5: md5Hex(technologieBuf),
			},
			diffSummary: diff.summary,
		});
	} catch (err) {
		logError("market-refresh.ingest", err);
		return NextResponse.json({ error: "Przetwarzanie nie powiodło się" }, { status: 500 });
	}
}
