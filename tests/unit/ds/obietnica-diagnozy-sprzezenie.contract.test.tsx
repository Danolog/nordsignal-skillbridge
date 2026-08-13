// @vitest-environment jsdom
/**
 * N3 — KONTRAKT: drabina nie obiecuje studentowi diagnozy, której produkt w danej
 * konfiguracji flag nie zawiera.
 *
 * DLACZEGO TEN TEST ISTNIEJE. Rozpoznanie Sophii (PO), WADA 3 —
 * `scratchpad/lejek-diagnozy-sophia.md` §4.3 i bramka N3 w §5/§6.2. Sprzężenie
 * `requires` broniło dotąd JEDNEGO kierunku („placement bez egzaminu wywraca
 * art. 22"), a przepuszczało drugi: `placementDiagnostic=1` przy
 * `diagnosticAssessment=0`. W tej konfiguracji wstęp `/curriculum` mówi
 * „…albo od razu, jeśli diagnoza pokazała, że znasz wcześniejszy materiał",
 * a trasy /api/assessment/* odpowiadają 404 — pomiaru, o którym mowa, w produkcie
 * NIE MA. Zdanie jest nieprawdziwe w chwili wypowiadania, jak sekcja 8 klauzuli
 * art. 13 przy zgaszonym usuwaniu konta (sprzężenie `privacyNoticeArt13`).
 *
 * CZEGO PILNUJE — INWARIANTU, NIE BRZMIENIA. Dla każdej konfiguracji flag:
 *
 *     drabina obiecuje diagnozę  ⟹  diagnoza istnieje w produkcie
 *
 * Oba człony są MIERZONE WYKONANIEM, nie odczytane z kodu:
 *   • lewy — realna strona `/curriculum` (server component) wyrenderowana z realną
 *     ewaluacją flag; „obiecuje" = wybrała wariant `CURRICULUM_INTRO_WITH_PLACEMENT`
 *     z jedynego nośnika (`labels.ts`, kontrakt N1), więc redakcja mikrocopy Sophii
 *     tego strażnika NIE czerwieni;
 *   • prawy — realny handler `POST /api/assessment/start`; „istnieje" = odpowiedź
 *     inna niż 404.
 *
 * Skan tekstu źródła byłby tu słabszym narzędziem: formater łamiący długie zdanie
 * JSX w środku frazy rozbroił już strażnika N1 (#313, warunek przeglądu Leo).
 * Ten test nie patrzy na źródło ani razu — patrzy na to, co dostaje użytkownik.
 *
 * DRUGA WARSTWA (`sprzężenie na poziomie nośnika`) pilnuje tego samego inwariantu
 * przy samej fladze, a nie przy jednej powierzchni — obejmuje więc wszystkich
 * konsumentów `placementDiagnostic`, dzisiejszych (kafelek pulpitu, wybór wstępu,
 * hak zapisu placementu, odczyt drabiny) i przyszłych.
 */

import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRICULUM_INTRO_WITH_PLACEMENT } from "@/components/curriculum/labels";
import { FLAGS, isFeatureEnabled } from "@/lib/flags";

// ── Otoczenie strony: sesja i student obecni, drabina pusta. Przedmiotem testu
//    jest WYBÓR TEKSTU po fladze, nie zawartość drabiny. ────────────────────────
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: async () => ({ user: { id: "u-n3" } }) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("NOT_FOUND");
	},
	redirect: (to: string) => {
		throw new Error(`REDIRECT:${to}`);
	},
}));
vi.mock("@/lib/db", () => ({
	db: {
		query: {
			students: {
				findFirst: async () => ({ id: "student-n3", careerGoal: "Data Scientist" }),
			},
		},
	},
}));
vi.mock("@/lib/curriculum/ladder", () => ({
	getLadder: async () => [],
	getCompletedItemCounts: async () => new Map(),
}));
vi.mock("@/lib/curriculum/exam-gate", () => ({ modulesWithExam: async () => new Set() }));
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

type Konfiguracja = {
	readonly nazwa: string;
	readonly masteryGate: boolean;
	readonly diagnosticAssessment: boolean;
	readonly placementDiagnostic: boolean;
};

/**
 * Wszystkie osiem kombinacji trzech flag. Świadomie WYCZERPUJĄCO, a nie „te,
 * o których pomyślałem": wada N3 była właśnie kombinacją, o której nikt nie
 * pomyślał, choć sprzężenie w rejestrze istniało od tygodni.
 */
const KONFIGURACJE: readonly Konfiguracja[] = [false, true].flatMap((masteryGate) =>
	[false, true].flatMap((diagnosticAssessment) =>
		[false, true].map((placementDiagnostic) => ({
			nazwa:
				`masteryGate=${Number(masteryGate)} ` +
				`diagnosticAssessment=${Number(diagnosticAssessment)} ` +
				`placementDiagnostic=${Number(placementDiagnostic)}`,
			masteryGate,
			diagnosticAssessment,
			placementDiagnostic,
		})),
	),
);

const zapisane: Record<string, string | undefined> = {};

function ustawFlagi(k: Konfiguracja): void {
	// `curriculumPath` zapalona zawsze — bez niej strona jest 404 i nie ma czego
	// mierzyć. To nie jest przedmiot tego kontraktu.
	process.env[FLAGS.curriculumPath.envVar] = "1";
	process.env[FLAGS.masteryGate.envVar] = k.masteryGate ? "1" : "0";
	process.env[FLAGS.diagnosticAssessment.envVar] = k.diagnosticAssessment ? "1" : "0";
	process.env[FLAGS.placementDiagnostic.envVar] = k.placementDiagnostic ? "1" : "0";
}

/** Czy strona `/curriculum` obiecuje studentowi diagnozę — odczyt z RENDERU. */
async function drabinaObiecujeDiagnoze(): Promise<boolean> {
	const { default: CurriculumPage } = await import("@/app/(dashboard)/curriculum/page");
	const el = (await CurriculumPage()) as unknown as ReactElement;
	const { container, unmount } = render(el);
	const tekst = (container.textContent ?? "").replace(/\s+/g, " ");
	unmount();
	return tekst.includes(CURRICULUM_INTRO_WITH_PLACEMENT.replace(/\s+/g, " "));
}

/** Czy diagnoza istnieje w produkcie — odczyt z REALNEJ trasy, nie z flagi. */
async function diagnozaIstnieje(): Promise<boolean> {
	const { POST } = await import("@/app/api/assessment/start/route");
	const res = await POST(
		new Request("http://localhost/api/assessment/start", {
			method: "POST",
			body: JSON.stringify({ competencyNames: ["Python"] }),
		}),
	);
	return res.status !== 404;
}

describe("N3 — obietnica diagnozy nie pada bez diagnozy", () => {
	beforeEach(() => {
		for (const flaga of Object.values(FLAGS)) {
			zapisane[flaga.envVar] = process.env[flaga.envVar];
			delete process.env[flaga.envVar];
		}
		vi.resetModules();
	});

	afterEach(() => {
		for (const flaga of Object.values(FLAGS)) {
			const poprzednia = zapisane[flaga.envVar];
			if (poprzednia === undefined) delete process.env[flaga.envVar];
			else process.env[flaga.envVar] = poprzednia;
		}
	});

	for (const k of KONFIGURACJE) {
		it(`INWARIANT · ${k.nazwa}: obietnica ⟹ diagnoza istnieje`, async () => {
			ustawFlagi(k);
			const obiecuje = await drabinaObiecujeDiagnoze();
			const istnieje = await diagnozaIstnieje();
			expect(
				!obiecuje || istnieje,
				`Konfiguracja „${k.nazwa}": drabina obiecuje pomiar diagnozą, a trasa ` +
					`/api/assessment/start odpowiada 404 — produkt tego pomiaru nie zawiera. ` +
					`Obietnica nieprawdziwa w chwili wypowiadania (N3, Sophia §4.3 WADA 3).`,
			).toBe(true);
		});
	}

	it("KONTROLA NEGATYWNA: przy komplecie flag ON obietnica FAKTYCZNIE pada", async () => {
		// Bez tego asertu wszystkie inwarianty wyżej przechodziłyby także wtedy,
		// gdyby zdanie o diagnozie zniknęło z produktu albo przestało być wybierane
		// — strażnik pilnowałby zera, nie reguły (wzorzec strażnika-atrapy, v1.17).
		ustawFlagi({
			nazwa: "komplet",
			masteryGate: true,
			diagnosticAssessment: true,
			placementDiagnostic: true,
		});
		expect(await drabinaObiecujeDiagnoze()).toBe(true);
		expect(await diagnozaIstnieje()).toBe(true);
	});

	it("SPRZĘŻENIE NA POZIOMIE NOŚNIKA: zgaszona diagnoza GASI placement (wszyscy konsumenci)", async () => {
		// Powierzchni czytających `placementDiagnostic` jest dziś pięć; kontrakt
		// wyżej mierzy jedną. Ten asert pilnuje reguły w jej JEDYNYM nośniku
		// (`requires` w rejestrze flag), więc obejmuje też cztery pozostałe i każdą
		// dodaną później.
		ustawFlagi({
			nazwa: "diagnoza off",
			masteryGate: true,
			diagnosticAssessment: false,
			placementDiagnostic: true,
		});
		expect(isFeatureEnabled("placementDiagnostic")).toBe(false);
	});
});
