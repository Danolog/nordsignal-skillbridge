// @vitest-environment node
//
// Z2 (Quinn, Agent QA) — test realnego kontraktu uploadu sylabusa PDF (błąd #2).
//
// GENEZA (docs/product/skillbridge-poprawki-rynek-plan-v0.1.md §2, błąd #2):
//   Onboarding obiecuje „wklej tekst LUB wgraj PDF". To LUB jest POZORNE na trzech
//   warstwach naraz:
//     1. step-syllabus.tsx: przycisk włącza się od samego pliku (canAnalyze = text>=100 || file),
//     2. onboarding-wizard.tsx handleAnalyze: IGNORUJE plik — przy pustym tekście robi
//        toast.error i return; wysyła tylko { syllabusText, careerGoal } jako JSON,
//     3. /api/syllabus/parse: czyta WYŁĄCZNIE JSON (req.json()), zero obsługi multipart,
//        zero czytnika PDF.
//   Plik nigdy nie dociera do serwera → upload PDF jest atrapą.
//
// CO TESTUJEMY (warstwa serwera — sedno ryzyka błędu #2):
//   Realny handler route POST z realnym żądaniem (multipart/form-data vs JSON). Atrapujemy
//   TYLKO to, co poza naszą kontrolą i na poziomie KONTRAKTU, nie logiki (reguła
//   skills/qa/SKILL.md §3): model AI (parseSyllabus → kształt string[]) oraz auth (getSession).
//   Rate-limit NIE atrapowany — bez configu Upstash `rateLimiters.aiHeavy` jest null,
//   więc applyRateLimit przepuszcza naturalnie (src/lib/rate-limit.ts:36).
//   Baza NIE jest częścią tego kontraktu — endpoint parsujący jest bezstanowy.
//
// PDF budujemy realnie przez jspdf (dep produkcyjna) — wyciągalny tekst, niezależny
// od tego, jaki czytnik PDF dorobi strumień C.
//
// STRUKTURA:
//   A. Charakteryzacja (ZIELONE dziś) — pinuje OBECNE, błędne zachowanie serwera.
//      Po naprawie strumienia C te asercje zaczną failować → sygnał „zaktualizuj bramę
//      na zachowanie docelowe".
//   B. Kontrakt docelowy (it.fails — BRAMA strumienia C) — opisuje, jak upload MA działać.
//      `it.fails` = znany defekt: test jest zielony, DOPÓKI kod jest zepsuty; gdy strumień C
//      naprawi upload, `it.fails` SAMO zmieni się w czerwone → wymusza powrót i potwierdzenie
//      naprawy (zdjęcie .fails). Blok A (zielony) niezależnie dowodzi, że moduł route ładuje
//      się i biega — więc czerwień bloku B to luka zachowania, nie błąd importu (de-ryzykuje
//      maskujący charakter it.fails).
//
// NIE merge'ować na `main` z it.fails+charakteryzacją w obecnym kształcie samodzielnie —
// ten plik wjeżdża razem z naprawą strumienia C (Leo/Jack), wtedy aktualizowany na zielono.
// Pole formularza "file"/"careerGoal" to PROPONOWANY kontrakt — do potwierdzenia z Leo (G1).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Atrapy kontraktowe (poza naszą kontrolą) ────────────────────────────────────
const getSessionMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => getSessionMock(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const parseSyllabusMock = vi.fn();
vi.mock("@/lib/ai/parse-syllabus", () => ({
	parseSyllabus: (...a: unknown[]) => parseSyllabusMock(...a),
}));

// Realistyczny sylabus (≥100 znaków) — w PDF i w JSON-owej ścieżce kontrolnej.
const SYLLABUS_TEXT =
	"Sylabus: Wprowadzenie do analizy danych. Python, biblioteka pandas, NumPy, " +
	"podstawy SQL i baz danych relacyjnych, statystyka opisowa, wizualizacja danych " +
	"(matplotlib), wersjonowanie kodu w Git, podstawy uczenia maszynowego oraz " +
	"komunikacja wyników analizy interesariuszom biznesowym.";

const CAREER_GOAL = "Data Analyst";
const FAKE_COMPETENCIES = ["Python", "pandas", "SQL", "Statystyka", "Git", "Wizualizacja danych"];

/** Buduje realny PDF z wyciągalnym tekstem (jspdf, jak w pdf-export.tsx). */
async function makeSyllabusPdf(text: string): Promise<Blob> {
	const jsPDF = (await import("jspdf")).default;
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	doc.text(doc.splitTextToSize(text, 180), 10, 10);
	const bytes = doc.output("arraybuffer");
	return new Blob([bytes], { type: "application/pdf" });
}

async function postRoute(body: BodyInit, headers?: HeadersInit): Promise<Response> {
	const { POST } = await import("@/app/api/syllabus/parse/route");
	return POST(
		new Request("http://localhost/api/syllabus/parse", { method: "POST", body, headers }),
	);
}

beforeEach(() => {
	getSessionMock.mockResolvedValue({ user: { id: "u-test-quinn" } });
	parseSyllabusMock.mockResolvedValue(FAKE_COMPETENCIES);
});

afterEach(() => {
	vi.clearAllMocks();
});

// ── A. Charakteryzacja stanu OBECNEGO (błąd #2) — zielone dziś ──────────────────
describe("Sylabus PDF — stan obecny (błąd #2: upload jest atrapą)", () => {
	it("multipart/form-data z realnym PDF → 400 (serwer czyta tylko JSON, brak czytnika PDF)", async () => {
		const fd = new FormData();
		fd.append("file", await makeSyllabusPdf(SYLLABUS_TEXT), "sylabus.pdf");
		fd.append("careerGoal", CAREER_GOAL);

		const res = await postRoute(fd);

		// Dziś: req.json() na multipart rzuca → handler zwraca 400 "Invalid JSON".
		expect(res.status).toBe(400);
		// Dowód, że plik NIGDY nie dotarł do warstwy analizy.
		expect(parseSyllabusMock).not.toHaveBeenCalled();
	});

	it("pozorne LUB: użytkownik wgrał tylko PDF (pusty syllabusText) → JSON odrzucony, parser nie wołany", async () => {
		// Odtwarza to, co realnie wysyła wizard, gdy tekst jest pusty (a plik niby jest):
		// { syllabusText: "", careerGoal }. Zod min(100) → 400.
		const res = await postRoute(JSON.stringify({ syllabusText: "", careerGoal: CAREER_GOAL }), {
			"content-type": "application/json",
		});

		expect(res.status).toBe(400);
		expect(parseSyllabusMock).not.toHaveBeenCalled();
	});

	it("kontrola pozytywna: realny JSON z tekstem ≥100 znaków → 200 i kompetencje (ścieżka tekstowa działa)", async () => {
		// Sanity: dowodzi, że atrapa AI i handler są poprawnie okablowane — gdyby ten
		// test też był czerwony, problem byłby w teście, nie w bug-u #2.
		const res = await postRoute(
			JSON.stringify({ syllabusText: SYLLABUS_TEXT, careerGoal: CAREER_GOAL }),
			{ "content-type": "application/json" },
		);

		expect(res.status).toBe(200);
		const data = (await res.json()) as { competencies: string[] };
		expect(data.competencies).toEqual(FAKE_COMPETENCIES);
		expect(parseSyllabusMock).toHaveBeenCalledWith(SYLLABUS_TEXT, CAREER_GOAL);
	});
});

// ── B. Kontrakt DOCELOWY — brama strumienia C (it.fails dopóki upload zepsuty) ──
describe("Sylabus PDF — kontrakt docelowy (brama naprawy strumienia C)", () => {
	it.fails(
		"upload PDF (multipart/form-data) → 200 i kompetencje wyciągnięte z treści pliku",
		async () => {
			const fd = new FormData();
			fd.append("file", await makeSyllabusPdf(SYLLABUS_TEXT), "sylabus.pdf");
			fd.append("careerGoal", CAREER_GOAL);

			const res = await postRoute(fd);

			// CEL: serwer przyjmuje plik, wyciąga z niego tekst, woła analizę.
			expect(res.status).toBe(200);
			const data = (await res.json()) as { competencies: string[] };
			expect(data.competencies).toEqual(FAKE_COMPETENCIES);
			// Serwer przekazał do analizy NIEPUSTY tekst wyciągnięty z PDF + cel kariery.
			// (Asercja na kształt, nie na dokładny tekst — niezależna od czytnika PDF.)
			expect(parseSyllabusMock).toHaveBeenCalledTimes(1);
			const [textArg, goalArg] = parseSyllabusMock.mock.calls[0];
			expect(typeof textArg).toBe("string");
			expect((textArg as string).length).toBeGreaterThan(50);
			expect(goalArg).toBe(CAREER_GOAL);
		},
	);
});
