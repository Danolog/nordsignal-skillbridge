// @vitest-environment jsdom
//
// Test integracyjny #7 — odporność linków źródła danych na REALNYM kontenerze testowym.
//
// Wymaga DATABASE_URL na lokalny kontener (postgres:16) po `pnpm db:migrate:test`
// (migracja 0018 zakłada tabelę project_source_links). Bez lokalnej bazy — describe
// POMIJANY (skip), nie failuje (nie blokuje `pnpm test` bez kontenera).
//
// Realna ścieżka #7 = page.tsx czyta przez findFirst z relacją sourceLinks sort po
// position. Ten test odtwarza ZAPYTANIE page.tsx + renderuje ProjectSourceLinks na
// realnych danych (3 linki, jeden martwy, wstawione w złej kolejności position).

import { render } from "@testing-library/react";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProjectSourceLinks } from "../project-source-links";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const d = isLocalTestDb ? describe : describe.skip;

const PROJ = "33333333-3333-3333-3333-333333333333";

// Zapytanie identyczne jak page.tsx (relacja sourceLinks, sort po position).
const WITH_SOURCE_LINKS = {
	sourceLinks: {
		columns: { url: true, label: true, isDead: true },
		orderBy: (r: { position: unknown }, { asc }: { asc: (c: never) => unknown }) => [
			asc(r.position as never),
		],
	},
} as const;

let pool: Pool | undefined;
// biome-ignore lint/suspicious/noExplicitAny: lokalny klient drizzle dla testu.
let testDb: any;
// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
let schema: any;

beforeAll(async () => {
	if (!isLocalTestDb) return;
	schema = await import("@/lib/db/schema");
	pool = new Pool({ connectionString: DATABASE_URL });
	testDb = drizzle(pool, { schema });

	await pool.query("DELETE FROM project_source_links WHERE project_id = $1", [PROJ]);
	await pool.query("DELETE FROM projects WHERE id = $1", [PROJ]);

	await pool.query(
		`INSERT INTO projects (id, slug, title, description, level, estimated_hours, source_type, source_url)
		 VALUES ($1,$2,$3,$4,'L2',8,'open_data','https://stary.example/legacy')`,
		[PROJ, "p7-source-links", "Projekt z 3 linkami", "Opis."],
	);
	// 3 linki w ZŁEJ kolejności position (2,0,1); środkowy (position 1) oznaczony martwy.
	await pool.query(
		`INSERT INTO project_source_links (project_id, url, label, position, is_dead) VALUES
		 ($1,'https://example.com/c','Trzeci',2,false),
		 ($1,'https://example.com/a','Główne',0,false),
		 ($1,'https://example.com/b','Kopia',1,true)`,
		[PROJ],
	);
}, 30_000);

afterAll(async () => {
	if (pool) {
		await pool.query("DELETE FROM project_source_links WHERE project_id = $1", [PROJ]);
		await pool.query("DELETE FROM projects WHERE id = $1", [PROJ]);
		await pool.end();
	}
});

d("#7 odporność linków — integracja (seedowany kontener)", () => {
	it("zapytanie page.tsx zwraca sourceLinks posortowane po position", async () => {
		const project = await testDb.query.projects.findFirst({
			where: eq(schema.projects.id, PROJ),
			with: WITH_SOURCE_LINKS,
		});
		expect(project).toBeTruthy();
		expect(project.sourceLinks).toHaveLength(3);
		expect(project.sourceLinks.map((l: { url: string }) => l.url)).toEqual([
			"https://example.com/a",
			"https://example.com/b",
			"https://example.com/c",
		]);
		// Środkowy oznaczony martwy.
		expect(project.sourceLinks.map((l: { isDead: boolean }) => l.isDead)).toEqual([
			false,
			true,
			false,
		]);
	});

	it("render: lista 3 linków w kolejności position, martwy z fallbackiem wizualnym", async () => {
		const project = await testDb.query.projects.findFirst({
			where: eq(schema.projects.id, PROJ),
			with: WITH_SOURCE_LINKS,
		});
		const { container } = render(<ProjectSourceLinks links={project.sourceLinks} />);
		const links = Array.from(container.querySelectorAll("a"));
		expect(links).toHaveLength(3);
		expect(links.map((a) => a.getAttribute("href"))).toEqual([
			"https://example.com/a",
			"https://example.com/b",
			"https://example.com/c",
		]);
		// Dokładnie jeden martwy (środkowy), z degradacją wizualną.
		const dead = container.querySelectorAll("a.proj-source-link-dead");
		expect(dead).toHaveLength(1);
		expect(dead[0].getAttribute("href")).toBe("https://example.com/b");
	});
});
