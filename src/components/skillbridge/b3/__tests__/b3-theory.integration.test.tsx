// @vitest-environment jsdom
//
// Test integracyjny B3 „Teoria" — REALNA ścieżka renderu na seedowanym kontenerze.
//
// Wymaga DATABASE_URL wskazującego na lokalny kontener testowy (postgres:16),
// po `pnpm db:migrate:test`. Uruchamiany przez skrypt z $env:DATABASE_URL ustawionym
// na localhost:55432 — patrz raport. Bez tej zmiennej test się POMIJA (skip), nie failuje
// (nie blokuje `pnpm test` developera bez kontenera).
//
// Realna ścieżka B3 = front czyta przez server component page.tsx (bezpośredni odczyt DB,
// NIE API route). Ten test odtwarza ZAPYTANIE page.tsx (findFirst z relacją
// learningResources sort po position) + renderuje TheorySection na realnych danych.
// Dodatkowo: trasa API GET /api/projects/[id] (auth gate Leo) — 401 bez sesji, 200 z sesją.

import { render } from "@testing-library/react";
import { type asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TheorySection } from "../TheorySection";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);

// Guard: bez lokalnej bazy testowej → describe pomijane (skip), nie failuje.
const d = isLocalTestDb ? describe : describe.skip;

const PROJ_WITH_THEORY = "11111111-1111-1111-1111-111111111111";
const PROJ_NO_THEORY = "22222222-2222-2222-2222-222222222222";

// Teoria z wektorem XSS w środku — realna ścieżka musi go zsanityzować przy renderze.
const THEORY_MD = [
	"### Wprowadzenie",
	"",
	"Akapit z **pogrubieniem** i `kodem`.",
	"",
	'<script>alert("xss")</script>',
	"",
	"[Dokumentacja](https://postgresql.org/docs)",
].join("\n");

// orderBy relacji — identyczny jak w page.tsx (asc po position).
const ORDER_BY_POSITION = {
	learningResources: {
		columns: { title: true, url: true, type: true },
		orderBy: (r: { position: unknown }, { asc: a }: { asc: typeof asc }) => [
			a(r.position as never),
		],
	},
} as const;

// Pool + klient współdzielone przez oba describe (seed raz, teardown na końcu).
let pool: Pool | undefined;
// biome-ignore lint/suspicious/noExplicitAny: lokalny klient drizzle dla testu; schema ładowana dynamicznie.
let testDb: any;
// biome-ignore lint/suspicious/noExplicitAny: schema modułu ładowana dynamicznie po ustawieniu env.
let schema: any;

beforeAll(async () => {
	if (!isLocalTestDb) return;
	schema = await import("@/lib/db/schema");
	pool = new Pool({ connectionString: DATABASE_URL });
	testDb = drizzle(pool, { schema });

	await pool.query("DELETE FROM project_learning_resources WHERE project_id = ANY($1)", [
		[PROJ_WITH_THEORY, PROJ_NO_THEORY],
	]);
	await pool.query("DELETE FROM projects WHERE id = ANY($1)", [[PROJ_WITH_THEORY, PROJ_NO_THEORY]]);

	// Projekt Z teorią.
	await pool.query(
		`INSERT INTO projects (id, slug, title, description, level, estimated_hours, source_type, theory_md)
		 VALUES ($1,$2,$3,$4,'L2',8,'open_data',$5)`,
		[PROJ_WITH_THEORY, "b3-with-theory", "Projekt z teorią", "Opis projektu z teorią.", THEORY_MD],
	);
	// 3 źródła wstawione W ZŁEJ KOLEJNOŚCI position (2,0,1) — test sprawdzi sort po position.
	await pool.query(
		`INSERT INTO project_learning_resources (project_id, title, url, type, position) VALUES
		 ($1,'Trzecie źródło','https://example.com/c','course',2),
		 ($1,'Pierwsze źródło','https://example.com/a','docs',0),
		 ($1,'Drugie źródło','https://example.com/b','video',1)`,
		[PROJ_WITH_THEORY],
	);

	// Projekt BEZ teorii (theory_md NULL) i bez źródeł — stan S4/S6.
	await pool.query(
		`INSERT INTO projects (id, slug, title, description, level, estimated_hours, source_type, theory_md)
		 VALUES ($1,$2,$3,$4,'L1',4,'oss',NULL)`,
		[PROJ_NO_THEORY, "b3-no-theory", "Projekt bez teorii", "Opis bez teorii."],
	);
}, 30_000);

afterAll(async () => {
	if (pool) {
		await pool.query("DELETE FROM projects WHERE id = ANY($1)", [
			[PROJ_WITH_THEORY, PROJ_NO_THEORY],
		]);
		await pool.end();
	}
});

d("B3 Teoria — integracja (seedowany kontener)", () => {
	it("zapytanie page.tsx zwraca theoryMd + learningResources posortowane po position", async () => {
		const project = await testDb.query.projects.findFirst({
			where: eq(schema.projects.id, PROJ_WITH_THEORY),
			with: ORDER_BY_POSITION,
		});

		expect(project).toBeTruthy();
		expect(project.theoryMd).toBe(THEORY_MD);
		expect(project.learningResources).toHaveLength(3);
		expect(project.learningResources.map((r: { title: string }) => r.title)).toEqual([
			"Pierwsze źródło",
			"Drugie źródło",
			"Trzecie źródło",
		]);
	});

	it("projekt Z teorią → blok teorii renderowany i ZSANITYZOWANY (script wycięty)", async () => {
		const project = await testDb.query.projects.findFirst({
			where: eq(schema.projects.id, PROJ_WITH_THEORY),
			with: ORDER_BY_POSITION,
		});

		const { container } = render(
			<TheorySection
				theoryMd={project.theoryMd ?? null}
				learningResources={project.learningResources}
			/>,
		);

		expect(container.querySelector('[aria-labelledby="b3-theory-heading"]')).not.toBeNull();
		expect(container.querySelector("h3")).not.toBeNull();
		// Sanityzacja na REALNEJ ścieżce: script wycięty.
		expect(container.querySelector("script")).toBeNull();
		expect(container.innerHTML.toLowerCase()).not.toContain("<script");
		// Link teorii ma wymuszone bezpieczeństwo.
		const theoryLink = container.querySelector('[aria-labelledby="b3-theory-heading"] a');
		expect(theoryLink?.getAttribute("rel")).toBe("noopener noreferrer");
	});

	it("lista źródeł renderowana (title/url/type) w kolejności position", async () => {
		const project = await testDb.query.projects.findFirst({
			where: eq(schema.projects.id, PROJ_WITH_THEORY),
			with: ORDER_BY_POSITION,
		});

		const { container } = render(
			<TheorySection
				theoryMd={project.theoryMd ?? null}
				learningResources={project.learningResources}
			/>,
		);

		const sources = container.querySelector('[aria-labelledby="b3-sources-heading"]');
		expect(sources).not.toBeNull();
		const links = Array.from(sources?.querySelectorAll("a") ?? []);
		expect(links).toHaveLength(3);
		// Kolejność po position (href = niezawodny dyskryminator wiersza).
		expect(links.map((a) => a.getAttribute("href"))).toEqual([
			"https://example.com/a",
			"https://example.com/b",
			"https://example.com/c",
		]);
		// Tytuły obecne w treści wierszy (textContent = pill + tytuł + host).
		expect(links[0].textContent).toContain("Pierwsze źródło");
		expect(links[2].textContent).toContain("Trzecie źródło");
	});

	it("projekt BEZ teorii (null) + bez źródeł → stan S6: cała sekcja pominięta (render null)", async () => {
		const project = await testDb.query.projects.findFirst({
			where: eq(schema.projects.id, PROJ_NO_THEORY),
			with: ORDER_BY_POSITION,
		});

		expect(project.theoryMd).toBeNull();
		expect(project.learningResources).toHaveLength(0);

		const { container } = render(
			<TheorySection
				theoryMd={project.theoryMd ?? null}
				learningResources={project.learningResources}
			/>,
		);

		// S4: blok teorii POMINIĘTY (nie pusty stan). S6: cała sekcja pominięta.
		expect(container.querySelector('[aria-labelledby="b3-theory-heading"]')).toBeNull();
		expect(container.querySelector('[aria-labelledby="b3-sources-heading"]')).toBeNull();
		expect(container.innerHTML).toBe("");
	});

	it("projekt z teorią ale BEZ źródeł → blok teorii jest, sekcja źródeł pominięta (S5)", () => {
		const { container } = render(
			<TheorySection theoryMd={"### Tytuł\n\ntekst"} learningResources={[]} />,
		);
		expect(container.querySelector('[aria-labelledby="b3-theory-heading"]')).not.toBeNull();
		expect(container.querySelector('[aria-labelledby="b3-sources-heading"]')).toBeNull();
	});
});

// --- Auth trasy API (GET /api/projects/[id], guard Leo) ---
// Mockujemy auth.api.getSession (jednostka decyzji auth), realny handler + realne DB
// (app `db` singleton wiąże się z DATABASE_URL kontenera ustawionym przy uruchomieniu).
const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...args: unknown[]) => getSessionMock(...args) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

d("GET /api/projects/[id] — auth gate (Leo)", () => {
	it("bez sesji → 401", async () => {
		getSessionMock.mockResolvedValueOnce(null);
		const { GET } = await import("@/app/api/projects/[id]/route");
		const res = await GET(new Request("http://localhost/api/projects/x"), {
			params: Promise.resolve({ id: PROJ_WITH_THEORY }),
		});
		expect(res.status).toBe(401);
	});

	it("z sesją → 200 i zwraca project + learningResources posortowane po position", async () => {
		getSessionMock.mockResolvedValueOnce({ user: { id: "u1" } });
		const { GET } = await import("@/app/api/projects/[id]/route");
		const res = await GET(new Request("http://localhost/api/projects/x"), {
			params: Promise.resolve({ id: PROJ_WITH_THEORY }),
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.project.id).toBe(PROJ_WITH_THEORY);
		expect(body.learningResources).toHaveLength(3);
		expect(body.learningResources[0].title).toBe("Pierwsze źródło");
	});
});
