/**
 * GET /api/onboarding/market-catalog?careerGoal=<ścieżka>
 *
 * Katalog kompetencji RYNKU dla wybranej ścieżki (Partia 4, element 2): wiersze
 * `job_market_data` per `career_goal`, posortowane malejąco wg popytu (% ofert).
 * To źródło prawdy scalonego kroku kompetencji — zastępuje listę z analizy sylabusa.
 *
 * `job_market_data` to dane GLOBALNE (katalog rynku, nie dane studenta) — bez RLS
 * tenant-owej. Wymagamy sesji (endpoint onboardingu), ale nie kontekstu tenanta.
 *
 * Kontrakt (front↔back, jedna gałąź — lekcja split-frontend-backend):
 *   { careerGoal, isRealCareerGoal,
 *     items:  [{ competencyName, demandPercentage, category, kind }],   // płaska lista (pokrycie)
 *     groups: [{ name, unionShare, description, items: [{ competencyName, demandPercentage, kind }] }] }
 * Pusty `items`/`groups` przy realnym celu = brak danych rynku dla ścieżki (sygnał do UI).
 */
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { isRealCareerGoal } from "@/lib/db/data/career-paths";
import { logError } from "@/lib/log";
import { buildCatalogGroups } from "@/lib/onboarding/competency-groups";
import { loadMarketCatalog } from "@/lib/onboarding/market-gaps";

export async function GET(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const careerGoal = new URL(req.url).searchParams.get("careerGoal")?.trim() ?? "";
	if (!careerGoal) {
		return NextResponse.json({ error: "Brak parametru careerGoal" }, { status: 400 });
	}

	// Czy cel jest jedną z 23 realnych ścieżek (klucz katalogu). Cel spoza listy
	// (np. wolny tekst z Pomocnika) → isRealCareerGoal=false, items pusty → UI
	// poprosi o wybór realnej ścieżki, zamiast pokazać 0 kompetencji bez kontekstu.
	const real = isRealCareerGoal(careerGoal);

	try {
		const items = real ? await loadMarketCatalog(careerGoal) : [];
		// B2: widok grupowy z kontekstem (unionShare + opis + kind) OBOK płaskiego items[].
		// Płaska lista ZOSTAJE źródłem pokrycia (computeMarketCoverage) — groups[] to dodatek.
		const groups = real ? buildCatalogGroups(careerGoal, items) : [];
		return NextResponse.json({
			careerGoal,
			isRealCareerGoal: real,
			items: items.map((i) => ({
				competencyName: i.competencyName,
				demandPercentage: i.demandPercentage,
				category: i.category,
				kind: i.kind ?? null,
			})),
			groups,
		});
	} catch (err) {
		logError("market-catalog", err, { careerGoal });
		return NextResponse.json({ error: "Nie udało się wczytać katalogu rynku" }, { status: 500 });
	}
}
