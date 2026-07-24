// @vitest-environment node
//
// 1E.3 (ADR-014 D3) P4 — buildCorrectivesPackage NA REALNEJ BAZIE (Quinn/QA):
// domyka lukę "green unit ≠ realny SQL", którą Ethan nazwał wprost. Unit
// (correctives.test.ts) karmi assembleCorrectives gotowym kształtem wiersza —
// NIE dowodzi, że zapytanie koncept→atom faktycznie produkuje ten kształt.
// Tu seedujemy realny kręgosłup konceptów i uruchamiamy pełny SQL owner-side.
//
// Load-bearing (R2 KRYTYCZNE): koncept mający WYŁĄCZNIE atom rodzaju `lab`
// (albo bez mapowania) MUSI wrócić w paczce z NAZWĄ i pustą listą atomów.
// To dowodzi, że filtr rodzaju siedzi w warunku LEFT JOIN (ON), nie w WHERE:
//  - poprawnie (ON): wiersz konceptu wraca (atom* = null), conceptName ZAPISANA,
//  - błędnie (WHERE kind IN (...)): wiersz konceptu jest wycięty → conceptName
//    przychodzi jako null. Dlatego asercja na conceptName != null jest tym,
//    co odróżnia poprawną implementację od regresji WHERE (guard = ta sama
//    funkcja w mutacji i asercji).
//
// Wymaga DATABASE_URL na :5433 po `pnpm db:migrate:test`.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isLocalTestDb = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DATABASE_URL);
const dBack = isLocalTestDb ? describe : describe.skip;

const PREFIX = "q4t-"; // slug-owy namespace tego testu (sprzątany LIKE-iem)

dBack("P4 buildCorrectivesPackage — realny SQL koncept→atom (baza)", () => {
	// biome-ignore lint/suspicious/noExplicitAny: moduły ładowane dynamicznie po env.
	let db: any;
	// biome-ignore lint/suspicious/noExplicitAny: schema ładowana dynamicznie.
	let schema: any;
	// biome-ignore lint/suspicious/noExplicitAny: serwis ładowany dynamicznie po env.
	let buildCorrectivesPackage: any;

	async function cleanup() {
		// item_concepts.concept_id nie ma ON DELETE CASCADE — kasuj je jawnie
		// przed konceptami; moduły kaskadują items → resztę item_concepts.
		await db.execute(
			sql`DELETE FROM curriculum_item_concepts WHERE concept_id IN (SELECT id FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`})`,
		);
		await db.execute(sql`DELETE FROM curriculum_modules WHERE slug LIKE ${`${PREFIX}%`}`);
		await db.execute(sql`DELETE FROM question_concepts WHERE slug LIKE ${`${PREFIX}%`}`);
	}

	/**
	 * Koncept fundamentów (trunk='foundations' → competency_name niewymagany).
	 * Zwraca ID (do mapowania FK) ORAZ pełny slug (buildCorrectivesPackage
	 * filtruje po SLUGU — to jest kontrakt failedConcepts z gradeExam).
	 */
	async function concept(slug: string, name: string): Promise<{ id: string; slug: string }> {
		const fullSlug = `${PREFIX}${slug}`;
		const [c] = await db
			.insert(schema.questionConcepts)
			.values({ slug: fullSlug, name, trunk: "foundations" })
			.returning({ id: schema.questionConcepts.id });
		return { id: c.id, slug: fullSlug };
	}

	async function module(slug: string, title: string): Promise<string> {
		const [m] = await db
			.insert(schema.curriculumModules)
			.values({ slug: `${PREFIX}${slug}`, title })
			.returning({ id: schema.curriculumModules.id });
		return m.id;
	}

	/** Pozycja modułu (atom) + zwrot id do mapowania na koncept(y). */
	async function item(
		moduleId: string,
		slug: string,
		position: number,
		kind: string,
		title: string,
	): Promise<string> {
		const [it] = await db
			.insert(schema.curriculumModuleItems)
			.values({ moduleId, slug: `${PREFIX}${slug}`, position, kind, title })
			.returning({ id: schema.curriculumModuleItems.id });
		return it.id;
	}

	async function map(itemId: string, conceptId: string) {
		await db.insert(schema.curriculumItemConcepts).values({ itemId, conceptId });
	}

	// Zaseedowane koncepty: cX.slug do buildCorrectivesPackage, cX.id do map().
	let cTrim = { id: "", slug: "" };
	let cLab = { id: "", slug: "" };
	let cMixed = { id: "", slug: "" };
	let cShareA = { id: "", slug: "" };
	let cShareB = { id: "", slug: "" };
	let cNomap = { id: "", slug: "" };

	beforeAll(async () => {
		({ db } = await import("@/lib/db"));
		schema = await import("@/lib/db/schema");
		({ buildCorrectivesPackage } = await import("../exam-service"));
		await cleanup();

		const modA = await module("mod-a", "Moduł A");
		const modB = await module("mod-b", "Moduł B");

		// c-trim: 5 atomów theory/exercise w DWÓCH modułach → przycięcie do 3,
		// kolejność (moduł, pozycja). mod-a < mod-b, więc atomy mod-a idą przed
		// mod-b NIEZALEŻNIE od pozycji (b-p05 ma niższą pozycję, a i tak jest 4.).
		cTrim = await concept("trim", "Przycinany");
		await map(await item(modA, "a-p10", 10, "theory", "A p10"), cTrim.id);
		await map(await item(modA, "a-p20", 20, "exercise", "A p20"), cTrim.id);
		await map(await item(modA, "a-p30", 30, "theory", "A p30"), cTrim.id);
		await map(await item(modB, "b-p05", 5, "theory", "B p05"), cTrim.id);
		await map(await item(modB, "b-p15", 15, "exercise", "B p15"), cTrim.id);

		// c-lab: WYŁĄCZNIE atom `lab` → R2 KRYTYCZNE. Filtr rodzaju w ON: koncept
		// wraca z nazwą + pustą listą. Filtr w WHERE: koncept znika (conceptName null).
		cLab = await concept("lab", "Tylko lab");
		await map(await item(modA, "a-lab", 40, "lab", "A lab"), cLab.id);

		// c-mixed: theory + lab → tylko theory (lab odfiltrowany), koncept z 1 atomem.
		cMixed = await concept("mixed", "Teoria plus lab");
		await map(await item(modA, "a-mixT", 50, "theory", "A mix theory"), cMixed.id);
		await map(await item(modA, "a-mixL", 60, "lab", "A mix lab"), cMixed.id);

		// c-shareA / c-shareB: JEDEN atom zmapowany na DWA koncepty → atom pojawia
		// się w OBU (dedup jest per-koncept, nie globalny).
		cShareA = await concept("shareA", "Współdzielony A");
		cShareB = await concept("shareB", "Współdzielony B");
		const shared = await item(modA, "a-shared", 70, "theory", "A shared");
		await map(shared, cShareA.id);
		await map(shared, cShareB.id);

		// c-nomap: koncept bez ŻADNEGO mapowania na atom → pusta lista, nazwa jest.
		cNomap = await concept("nomap", "Bez atomów");
	}, 60_000);

	afterAll(async () => {
		if (db) await cleanup();
	});

	it("R2 KRYTYCZNE: koncept z WYŁĄCZNIE atomem lab → wpis z NAZWĄ + pustą listą (filtr w ON, nie WHERE)", async () => {
		const pkg = await buildCorrectivesPackage([cLab.slug], 1, 1);
		expect(pkg.concepts).toHaveLength(1);
		const entry = pkg.concepts[0];
		expect(entry.concept).toBe(cLab.slug);
		expect(entry.atoms).toEqual([]);
		// Sedno guardu: conceptName != null dowodzi, że wiersz konceptu przetrwał
		// (ON-join). Regresja WHERE wycięłaby wiersz → conceptName === null.
		expect(entry.conceptName).toBe("Tylko lab");
	});

	it("R2: koncept bez żadnego mapowania atomu → wpis z nazwą + pusta lista (LEFT JOIN nie gubi)", async () => {
		const pkg = await buildCorrectivesPackage([cNomap.slug], 1, 1);
		expect(pkg.concepts[0].atoms).toEqual([]);
		expect(pkg.concepts[0].conceptName).toBe("Bez atomów");
	});

	it("przycięcie ≤3 deterministyczne: 5 atomów → dokładnie 3 wg (moduł, pozycja), powtarzalne", async () => {
		const first = await buildCorrectivesPackage([cTrim.slug], 3, 1);
		const atoms = first.concepts[0].atoms;
		expect(atoms).toHaveLength(3);
		// mod-a (a-p10,a-p20,a-p30) przed mod-b — mimo że b-p05 ma niższą pozycję.
		expect(atoms.map((a: { slug: string }) => a.slug)).toEqual([
			`${PREFIX}a-p10`,
			`${PREFIX}a-p20`,
			`${PREFIX}a-p30`,
		]);
		// Powtórzenie zapytania → ta sama trójka (determinizm sortu, nie przypadek).
		const second = await buildCorrectivesPackage([cTrim.slug], 3, 1);
		expect(second.concepts[0].atoms.map((a: { slug: string }) => a.slug)).toEqual(
			atoms.map((a: { slug: string }) => a.slug),
		);
	});

	it("filtr rodzaju: koncept theory+lab → tylko atom theory (lab wycięty), koncept zostaje", async () => {
		const pkg = await buildCorrectivesPackage([cMixed.slug], 1, 1);
		const atoms = pkg.concepts[0].atoms;
		expect(atoms).toHaveLength(1);
		expect(atoms[0].slug).toBe(`${PREFIX}a-mixT`);
		expect(atoms[0].kind).toBe("theory");
	});

	it("jeden atom w DWÓCH konceptach → obecny w OBU (dedup jest per-koncept, nie globalny)", async () => {
		const pkg = await buildCorrectivesPackage([cShareA.slug, cShareB.slug], 2, 1);
		expect(pkg.concepts).toHaveLength(2);
		expect(pkg.concepts[0].atoms.map((a: { slug: string }) => a.slug)).toEqual([
			`${PREFIX}a-shared`,
		]);
		expect(pkg.concepts[1].atoms.map((a: { slug: string }) => a.slug)).toEqual([
			`${PREFIX}a-shared`,
		]);
	});

	it("kolejność konceptów = kolejność failedConcepts (nie kolejność z bazy)", async () => {
		const pkg = await buildCorrectivesPackage([cLab.slug, cTrim.slug, cNomap.slug], 3, 1);
		expect(pkg.concepts.map((c: { concept: string }) => c.concept)).toEqual([
			cLab.slug,
			cTrim.slug,
			cNomap.slug,
		]);
	});

	it("BRAK WYCIEKU: paczka niesie tylko slug/title/kind/moduleSlug — zero klucza/odpowiedzi", async () => {
		const pkg = await buildCorrectivesPackage([cTrim.slug, cLab.slug], 4, 1);
		const raw = JSON.stringify(pkg);
		// Correctives czytają curriculum, NIE question_items — klucza nie ma prawa
		// być strukturalnie. Guard dokumentuje to i łapie regresję, gdyby ktoś
		// dociągnął answer_json do zapytania.
		expect(raw).not.toContain("answer_json");
		expect(raw).not.toContain("answerJson");
		expect(raw).not.toContain('"correct"');
		// Kształt atomu = dokładnie 4 pola payloadu P5.
		for (const c of pkg.concepts) {
			for (const a of c.atoms) {
				expect(Object.keys(a).sort()).toEqual(["kind", "moduleSlug", "slug", "title"]);
			}
		}
	});

	it("mikrocopy na realnych danych: N=errorCount−maxErrors, M=liczba failedConcepts, ~15 min", async () => {
		const pkg = await buildCorrectivesPackage([cTrim.slug, cLab.slug, cNomap.slug], 5, 1);
		// errorCount=5, maxErrors=1 → N=4 (dystans do progu), M=3 koncepty → 'pytań' + 'koncepty'.
		expect(pkg.message).toBe(
			"Zabrakło Ci 4 pytań do zaliczenia — 3 koncepty do odświeżenia, ~15 min",
		);
	});

	it("zdany (failedConcepts=[]) → paczka pusta, zero zapytań o atomy", async () => {
		const pkg = await buildCorrectivesPackage([], 0, 1);
		expect(pkg.concepts).toEqual([]);
	});
});
