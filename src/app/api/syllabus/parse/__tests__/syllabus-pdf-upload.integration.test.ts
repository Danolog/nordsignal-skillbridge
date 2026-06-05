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
// STRUKTURA (po flipie strumienia C — wszystkie bloki ZIELONE):
//   A. Kontrakt docelowy serwera — multipart → 200, sam PDF (bez tekstu) → 200, JSON tekst → 200.
//      (Przed strumieniem C: charakteryzacja stanu „atrapy" — multipart → 400. Zaktualizowane na
//      zachowanie docelowe zgodnie z ADR-007, w tym samym PR co naprawa — dyscyplina R3.)
//   B. Test realnego kontraktu (anty-mask) — `it.fails` ZDJĘTY (flip). Asercje na argumenty
//      parseSyllabus dowodzą, że tekst REALNIE wyciągnięty z PDF dotarł do parsera (length > 50,
//      goal == CAREER_GOAL) — nie ciche 200 ani mock przepuszczony pustym tekstem
//      (lekcja split-frontend-backend). Test musi być zielony, inaczej upload znów jest atrapą.
//
// Kontrakt pola multipart: "file" + "careerGoal" — POTWIERDZONY w ADR-007 (Ethan, decyzja #1/#2).
// Biblioteka PDF: pdf-parse v2 (klasa PDFParse) — v1 nie czyta PDF-ów jspdf z tego pliku.

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

// ── A. Kontrakt po naprawie strumienia C (#2) — zachowanie DOCELOWE ─────────────
// (Przed strumieniem C: charakteryzacja stanu „atrapy" — multipart → 400, parser nie wołany.
//  Po strumieniu C zaktualizowane na kontrakt docelowy zgodnie z ADR-007: multipart → 200.)
describe("Sylabus PDF — kontrakt docelowy (po naprawie strumienia C)", () => {
	it("multipart/form-data z realnym PDF → 200 (serwer ekstrahuje tekst i woła analizę)", async () => {
		const fd = new FormData();
		fd.append("file", await makeSyllabusPdf(SYLLABUS_TEXT), "sylabus.pdf");
		fd.append("careerGoal", CAREER_GOAL);

		const res = await postRoute(fd);

		// Po naprawie: req.formData() → pdf-parse → parseSyllabus → 200 { competencies }.
		expect(res.status).toBe(200);
		const data = (await res.json()) as { competencies: string[] };
		expect(data.competencies).toEqual(FAKE_COMPETENCIES);
		// Dowód, że plik DOTARŁ do warstwy analizy (anty-mask: nie ciche 200).
		expect(parseSyllabusMock).toHaveBeenCalledTimes(1);
	});

	it("pozorne LUB DOMKNIĘTE: sam PDF (bez pola tekstowego w żądaniu) → 200 (plik wystarcza)", async () => {
		// Odtwarza to, co realnie wysyła wizard po naprawie (b), gdy użytkownik wgrał TYLKO
		// plik (puste pole tekstowe): multipart z polami `file` + `careerGoal`, BEZ syllabusText.
		// Wcześniej (atrapa) ścieżka plikowa szła jako JSON z pustym tekstem → Zod min(100) → 400.
		const fd = new FormData();
		fd.append("file", await makeSyllabusPdf(SYLLABUS_TEXT), "sylabus.pdf");
		fd.append("careerGoal", CAREER_GOAL);

		const res = await postRoute(fd);

		expect(res.status).toBe(200);
		expect(parseSyllabusMock).toHaveBeenCalledTimes(1);
	});

	it("podrobiony MIME: nie-PDF z application/pdf → 415, parser NIE wołany (magic number broni)", async () => {
		// Dowód, że walidacja MIME nie jest sitem: bajty NIE są PDF-em, ale klient deklaruje
		// application/pdf. Magic number %PDF musi to złapać (ADR-007 walidacja #1) — w przeciwnym
		// razie podrobiony plik dotarłby do parsera. Anti-mask dla guardu, który łatwo zrobić martwym.
		const fakePdf = new Blob(["to jest zwykły tekst, nie PDF, mimo deklaracji MIME"], {
			type: "application/pdf",
		});
		const fd = new FormData();
		fd.append("file", fakePdf, "udaje.pdf");
		fd.append("careerGoal", CAREER_GOAL);

		const res = await postRoute(fd);

		expect(res.status).toBe(415);
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

// ── B. Test realnego kontraktu — DOWÓD anty-mask (plik dociera do parsera) ──────
// Po naprawie strumienia C: `it.fails` zdjęty (flip), test musi być ZIELONY. Asercje na
// argumenty parseSyllabus dowodzą, że tekst REALNIE wyciągnięty z PDF dotarł do analizy —
// nie ciche 200 ani mock przepuszczony pustym tekstem (lekcja split-frontend-backend).
describe("Sylabus PDF — test realnego kontraktu (plik dociera do parsera)", () => {
	it("upload PDF (multipart/form-data) → 200 i kompetencje wyciągnięte z treści pliku", async () => {
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
	});
});
