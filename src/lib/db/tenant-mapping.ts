import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";

/**
 * Mapowanie free-form `students.university` → slug tenanta (Beta v0.1).
 * LUSTRO logiki SQL z migracji 0006 (docs/data/tenant-mapping-beta.md sekcja 5).
 * Trzymaj zsynchronizowane z 0006: trim → lower → bez ogonków → zwinięcie spacji,
 * match dokładny na znormalizowanym kluczu; brak dopasowania → `__unmapped`.
 *
 * Dług (po Becie): onboarding wybiera tenant z listy (FK), `university` → FK,
 * koniec free-form — wtedy ten helper znika (tenant-mapping-beta.md sekcja 8).
 */

const DIACRITICS: Record<string, string> = {
	ł: "l", ą: "a", ę: "e", ó: "o", ż: "z", ź: "z", ś: "s", ć: "c", ń: "n",
};

export function normalizeUniversity(university: string): string {
	return university
		.trim()
		.toLowerCase()
		.replace(/[łąęóżźśćń]/g, (ch) => DIACRITICS[ch] ?? ch)
		.replace(/\s+/g, " ");
}

/** Znormalizowany klucz → slug partnera. Spójne z CASE w 0006. */
const SLUG_BY_KEY: Record<string, string> = {
	"wsb merito szczecin": "wsb-merito-szczecin",
	"wsb merito warszawa": "wsb-merito-warszawa",
};

export const UNMAPPED_SLUG = "__unmapped";

export function resolveTenantSlug(university: string): string {
	return SLUG_BY_KEY[normalizeUniversity(university)] ?? UNMAPPED_SLUG;
}

/** Zwraca tenant_id dla danej (free-form) uczelni; sieroty → __unmapped. */
export async function resolveTenantId(university: string): Promise<string> {
	const slug = resolveTenantSlug(university);
	const [row] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug));
	if (row) return row.id;
	// Fallback: __unmapped musi istnieć (seed 0005). Jeśli brak — twardy błąd.
	const [unmapped] = await db
		.select({ id: tenants.id })
		.from(tenants)
		.where(eq(tenants.slug, UNMAPPED_SLUG));
	if (!unmapped) throw new Error("tenant __unmapped nie istnieje — czy 0005 wykonana?");
	return unmapped.id;
}
