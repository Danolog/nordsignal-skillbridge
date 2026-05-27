import { describe, expect, it } from "vitest";
import { DEMO_STUDENTS, PARTNER_TENANTS, partnerTenantForIndex } from "../seed-students";

// Pilnuje DoD §4 z docs/data/tenant-mapping-beta.md: reseed demo do 2 kampusów-partnerów,
// ≥6 studentów/tenant, ≥3 różne careerGoal. Próg jest produktowy — faculty dashboard
// ukrywa heatmapę przy <3 studentach, więc spadek dystrybucji = martwy panel u partnera.
// Czytamy realne DEMO_STUDENTS + tę samą logikę przypisania, której używa seed.ts —
// nie kopię — żeby edycja danych nie obeszła guardu po cichu.

// Odtworzenie przypisania seedu: student i → slug tenanta-partnera (round-robin).
function studentsByTenantSlug(): Map<string, (typeof DEMO_STUDENTS)[number][]> {
	const byTenant = new Map<string, (typeof DEMO_STUDENTS)[number][]>();
	DEMO_STUDENTS.forEach((student, i) => {
		const slug = partnerTenantForIndex(i).slug;
		const bucket = byTenant.get(slug) ?? [];
		bucket.push(student);
		byTenant.set(slug, bucket);
	});
	return byTenant;
}

describe("Reseed demo do 2 tenantów — DoD §4 (tenant-mapping-beta.md)", () => {
	it("dokładnie 2 tenanty-partnerzy (Szczecin + Warszawa)", () => {
		expect(PARTNER_TENANTS).toHaveLength(2);
		expect(PARTNER_TENANTS.map((t) => t.slug)).toEqual([
			"wsb-merito-szczecin",
			"wsb-merito-warszawa",
		]);
	});

	it("każdy student trafia do jednego z 2 tenantów-partnerów (zero sierot w demo)", () => {
		const partnerSlugs = new Set<string>(PARTNER_TENANTS.map((t) => t.slug));
		const byTenant = studentsByTenantSlug();
		const assigned = [...byTenant.values()].reduce((sum, list) => sum + list.length, 0);
		expect(assigned).toBe(DEMO_STUDENTS.length);
		for (const slug of byTenant.keys()) {
			expect(partnerSlugs.has(slug), `${slug} musi być tenantem-partnerem`).toBe(true);
		}
	});

	it("każdy tenant ma ≥6 studentów (próg ukrywania faculty dashboard = <3)", () => {
		const byTenant = studentsByTenantSlug();
		for (const t of PARTNER_TENANTS) {
			const count = byTenant.get(t.slug)?.length ?? 0;
			expect(count, `${t.slug} ma ${count} studentów, wymagane ≥6`).toBeGreaterThanOrEqual(6);
		}
	});

	it("każdy tenant ma ≥3 różne careerGoal", () => {
		const byTenant = studentsByTenantSlug();
		for (const t of PARTNER_TENANTS) {
			const goals = new Set((byTenant.get(t.slug) ?? []).map((s) => s.careerGoal));
			expect(
				goals.size,
				`${t.slug} ma ${goals.size} różnych careerGoal, wymagane ≥3`,
			).toBeGreaterThanOrEqual(3);
		}
	});

	it("partnerTenantForIndex jest deterministyczny i round-robin po 2 tenantach", () => {
		expect(partnerTenantForIndex(0).slug).toBe(PARTNER_TENANTS[0].slug);
		expect(partnerTenantForIndex(1).slug).toBe(PARTNER_TENANTS[1].slug);
		expect(partnerTenantForIndex(2).slug).toBe(PARTNER_TENANTS[0].slug);
		expect(partnerTenantForIndex(7).slug).toBe(partnerTenantForIndex(1).slug);
	});
});
