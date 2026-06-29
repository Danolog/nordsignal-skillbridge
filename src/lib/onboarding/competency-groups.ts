// ============================================================================
// ZŁĄCZENIE KATALOGU RYNKU Z HIERARCHIĄ (career-model.json) — Partia 5, ETAP B
//
// Serwerowy moduł: dokłada KONTEKST grup do płaskiego katalogu rynku. Płaski katalog
// (`job_market_data` → loadMarketCatalog) ma nazwę + % + kategorię; hierarchia grup
// (nazwa grupy, unionShare, proza „po co się uczysz", kind liścia) żyje w
// career-model.json. Klucz złączenia: careerGoal + znormalizowana nazwa kompetencji.
//
// BEZ migracji bazy (czerwona linia): career-model.json jest w repo, czytany STATYCZNIE
// po stronie serwera. NIE importuj tego modułu z komponentu klienckiego („use client") —
// ciągnąłby duży JSON do bundla; endpoint zwraca gotowe `groups[]`/`kind` jako dane.
//
// Reguła twarda (Built-to-Sell): złączenie deterministyczne, zero modelu. Pozycja bez
// dopasowania w hierarchii zostaje w płaskiej liście (zgodność wstecz) i trafia do
// grupy „Pozostałe" w widoku grupowym — niezmiennik: suma items grup == płaska lista.
// ============================================================================

import type { LeafKind } from "@/lib/db/data/anchor-config";
import careerModelData from "@/lib/db/data/career-model.json";
import type {
	GroupCatalog,
	GroupCatalogItem,
	MarketCatalogItem,
} from "@/lib/onboarding/market-catalog";

// Zawężony kształt career-model.json (resolveJsonModule daje szeroki typ literałowy —
// czytamy tylko te pola). Liść ZAWSZE ma kind w artefakcie (ETL: leaf.kind ?? auto).
interface ModelLeaf {
	name: string;
	kind?: string;
}
interface ModelArea {
	name: string;
	description?: string;
	unionShare: number | null;
	leaves: ModelLeaf[];
}
interface ModelPath {
	careerGoal: string;
	areas: ModelArea[];
}
const MODEL = careerModelData as unknown as { paths: ModelPath[] };

/** Normalizacja nazwy do złączenia — trim + lower (odporne na różnice wielkości liter). */
function norm(s: string): string {
	return s.trim().toLowerCase();
}

/** Bezpieczne rzutowanie napisu z JSON na LeafKind (5 dozwolonych wartości). */
const LEAF_KINDS: ReadonlySet<string> = new Set(["tool", "concept", "cert", "meta", "soft"]);
function toLeafKind(v: string | undefined): LeafKind | null {
	return v && LEAF_KINDS.has(v) ? (v as LeafKind) : null;
}

interface GroupMeta {
	name: string;
	unionShare: number | null;
	description: string | null;
}
interface LeafHit {
	kind: LeafKind | null;
	/** Referencja do meta grupy-rodzica — kontekst panelu (B3) w O(1), bez ponownego find. */
	group: GroupMeta;
}
interface CareerModelIndex {
	/** znormalizowana nazwa liścia → { kind, grupa-rodzic } */
	leafToGroup: Map<string, LeafHit>;
	/** grupy w kolejności modelu (= kolejność obszarów ścieżki) */
	groups: GroupMeta[];
}

// Indeks per careerGoal — budowany leniwie i zapamiętany (JSON statyczny, deterministyczny).
const indexCache = new Map<string, CareerModelIndex | null>();

function buildIndex(careerGoal: string): CareerModelIndex | null {
	const path = MODEL.paths.find((p) => p.careerGoal === careerGoal);
	if (!path) return null;
	const leafToGroup = new Map<string, LeafHit>();
	const groups: GroupMeta[] = [];
	for (const area of path.areas) {
		const group: GroupMeta = {
			name: area.name,
			unionShare: area.unionShare ?? null,
			description: area.description ?? null,
		};
		groups.push(group);
		for (const leaf of area.leaves) {
			// Liść w dwóch obszarach (np. Swagger w Java) → przypisz do PIERWSZEGO w kolejności
			// modelu (pierwsze wystąpienie wygrywa) — spójne z flattenLeaves (max %, pierwszy na remis).
			const key = norm(leaf.name);
			if (!leafToGroup.has(key)) {
				leafToGroup.set(key, { kind: toLeafKind(leaf.kind), group });
			}
		}
	}
	return { leafToGroup, groups };
}

function getIndex(careerGoal: string): CareerModelIndex | null {
	if (!indexCache.has(careerGoal)) indexCache.set(careerGoal, buildIndex(careerGoal));
	return indexCache.get(careerGoal) ?? null;
}

/**
 * B1: wzbogaca płaskie pozycje katalogu o `kind` z career-model.json (złączenie po
 * careerGoal + znormalizowanej nazwie). Pozycja bez dopasowania zostaje bez zmian.
 * NIE zmienia kolejności ani liczby pozycji (zgodność wstecz pokrycia/luk).
 */
export function enrichWithKind(
	careerGoal: string,
	items: MarketCatalogItem[],
): MarketCatalogItem[] {
	const idx = getIndex(careerGoal);
	if (!idx) return items;
	return items.map((item) => {
		const hit = idx.leafToGroup.get(norm(item.competencyName));
		return hit?.kind ? { ...item, kind: hit.kind } : item;
	});
}

/**
 * B2: grupuje płaskie pozycje wg obszarów career-model.json (unionShare + opis per grupa).
 * Kolejność pozycji w obrębie grupy = jak na płaskiej liście (malejąco wg popytu); grupy
 * w kolejności modelu. Pozycje spoza modelu → grupa „Pozostałe" (defensywnie; w prod płaski
 * katalog i model pochodzą z tego samego ETL, więc każda pozycja ma grupę). Puste grupy
 * pominięte. Niezmiennik: suma items wszystkich grup == płaska lista (nic nie ginie).
 */
export function buildCatalogGroups(careerGoal: string, items: MarketCatalogItem[]): GroupCatalog[] {
	const idx = getIndex(careerGoal);
	if (!idx) return [];
	const LEFTOVER = "Pozostałe";
	const buckets = new Map<string, GroupCatalogItem[]>();
	for (const g of idx.groups) buckets.set(g.name, []);
	for (const item of items) {
		const hit = idx.leafToGroup.get(norm(item.competencyName));
		const groupName = hit?.group.name ?? LEFTOVER;
		if (!buckets.has(groupName)) buckets.set(groupName, []);
		buckets.get(groupName)?.push({
			competencyName: item.competencyName,
			demandPercentage: item.demandPercentage,
			kind: hit?.kind ?? item.kind ?? null,
		});
	}
	const result: GroupCatalog[] = [];
	for (const g of idx.groups) {
		const its = buckets.get(g.name);
		if (its && its.length > 0) {
			result.push({
				name: g.name,
				unionShare: g.unionShare,
				description: g.description,
				items: its,
			});
		}
	}
	const left = buckets.get(LEFTOVER);
	if (left && left.length > 0) {
		result.push({ name: LEFTOVER, unionShare: null, description: null, items: left });
	}
	return result;
}

/** Kontekst pojedynczej kompetencji do PANELU studenta (B3). */
export interface CompetencyContext {
	groupName: string;
	groupDescription: string | null;
	unionShare: number | null;
	kind: LeafKind | null;
}

/**
 * B3: kontekst grupy (opis + unionShare) + kind dla JEDNEJ kompetencji, po nazwie i
 * careerGoal. Do reużycia w mapie kompetencji i analizie luk (panel studenta) — bez
 * migracji, bez modelu. null gdy ścieżka lub kompetencja nieznana w hierarchii.
 */
export function getCompetencyContext(
	careerGoal: string,
	competencyName: string,
): CompetencyContext | null {
	const idx = getIndex(careerGoal);
	if (!idx) return null;
	const hit = idx.leafToGroup.get(norm(competencyName));
	if (!hit) return null;
	return {
		groupName: hit.group.name,
		groupDescription: hit.group.description,
		unionShare: hit.group.unionShare,
		kind: hit.kind,
	};
}
