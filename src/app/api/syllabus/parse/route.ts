import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { extractPdfText, PdfExtractionError } from "@/lib/ai/extract-pdf-text";
import { parseSyllabus } from "@/lib/ai/parse-syllabus";
import { auth } from "@/lib/auth/server";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

// Node.js runtime jawnie (ADR-007 #5): pdf-parse/pdfjs-dist wymaga Buffer (Edge by je wywalił).
// Ekstrakcja tekstu idzie przez @/lib/ai/extract-pdf-text, który NIE zależy od @napi-rs/canvas
// (shim DOMMatrix, Rekomendacja A) — usuwa prod-only crash „DOMMatrix is not defined" u korzenia.
export const runtime = "nodejs";
export const maxDuration = 60;

// Wspólne granice długości tekstu sylabusa — identyczne dla ścieżki JSON i PDF
// (ADR-007, decyzja #6: jeden punkt prawdy dla analizy). 100..50000 znaków.
const MIN_TEXT = 100;
const MAX_TEXT = 50_000;
const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB — spójnie z interfejsem i ADR-007 walidacja #2

const SyllabusSchema = z.object({
	syllabusText: z.string().min(MIN_TEXT).max(MAX_TEXT),
	careerGoal: z.string().min(1).max(200),
});

const CareerGoalSchema = z.string().min(1).max(200);

/**
 * Analiza wspólnego rdzenia (ADR-007 #6): po uzyskaniu tekstu (z JSON albo z PDF)
 * wchodzimy w tę samą funkcję parseSyllabus. Błąd modelu łapany + logowany (lekcja #4:
 * nigdy puste 500 bez śladu), surowy błąd NIE wycieka do klienta.
 */
async function analyze(
	syllabusText: string,
	careerGoal: string,
	userId: string,
	mode: "pdf" | "json",
): Promise<NextResponse> {
	try {
		const competencies = await parseSyllabus(syllabusText, careerGoal);
		return NextResponse.json({ competencies });
	} catch (err) {
		logError("syllabus-parse", err, { userId, mode });
		return NextResponse.json(
			{ error: "Nie udało się przeanalizować sylabusa. Spróbuj ponownie." },
			{ status: 500 },
		);
	}
}

/** Ścieżka JSON (tekst wklejony ręcznie) — zachowanie bez zmian względem stanu sprzed #2. */
async function handleJson(req: Request, userId: string): Promise<NextResponse> {
	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = SyllabusSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}
	const { syllabusText, careerGoal } = parsed.data;
	return analyze(syllabusText, careerGoal, userId, "json");
}

/** Ścieżka multipart (PDF) — walidacja MIME + magic number + rozmiar, ekstrakcja tekstu. */
async function handleMultipart(req: Request, userId: string): Promise<NextResponse> {
	let form: FormData;
	try {
		form = await req.formData();
	} catch {
		return NextResponse.json({ error: "Brak pliku PDF w żądaniu." }, { status: 400 });
	}

	const file = form.get("file");
	if (!(file instanceof Blob) || typeof (file as File).name !== "string") {
		return NextResponse.json({ error: "Brak pliku PDF w żądaniu." }, { status: 400 });
	}

	// Cel kariery — ten sam model danych co w JSON (ADR-007 #2).
	const careerGoalParsed = CareerGoalSchema.safeParse(form.get("careerGoal"));
	if (!careerGoalParsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", issues: careerGoalParsed.error.flatten() },
			{ status: 400 },
		);
	}
	const careerGoal = careerGoalParsed.data;

	// (1) Limit rozmiaru PRZED zbuforowaniem całości (ADR-007 walidacja #2).
	if (file.size > MAX_PDF_BYTES) {
		return NextResponse.json({ error: "Plik jest za duży (limit 10 MB)." }, { status: 413 });
	}

	// (2) MIME deklarowany przez klienta — warunek konieczny, niewystarczający.
	if (file.type !== "application/pdf") {
		return NextResponse.json({ error: "Dozwolony jest wyłącznie plik PDF." }, { status: 415 });
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	// (3) Magic number %PDF — obrona przed podrobionym MIME (ADR-007 walidacja #1).
	//     Sprawdzane na zbuforowanych bajtach, ale rozmiar już ograniczony do 10 MB wyżej.
	const isPdfMagic =
		buffer.length >= 4 &&
		buffer[0] === 0x25 && // %
		buffer[1] === 0x50 && // P
		buffer[2] === 0x44 && // D
		buffer[3] === 0x46; // F
	if (!isPdfMagic) {
		return NextResponse.json({ error: "Dozwolony jest wyłącznie plik PDF." }, { status: 415 });
	}

	// (4) Ekstrakcja tekstu — canvas-free (extract-pdf-text, Rekomendacja A). Rozróżniamy
	//     DWIE klasy zdarzeń, których stary kod NIE rozróżniał (maskował crash jako „skan"):
	//       (a) błąd TECHNICZNY (moduł/runtime/uszkodzony PDF) → PdfExtractionError → log + 500
	//           „błąd serwera", bo to nasza awaria, nie wina pliku użytkownika;
	//       (b) PDF bez warstwy tekstowej (skan/obraz/pusty) → ekstrakcja zwraca pusty/krótki
	//           string (NIE błąd) → 422 „może być skanem, wklej ręcznie".
	let extracted: string;
	try {
		extracted = await extractPdfText(buffer);
	} catch (err) {
		// (a) Błąd techniczny — uczciwe 500, koniec maskowania awarii jako „skan".
		logError("syllabus-pdf", err instanceof PdfExtractionError ? (err.cause ?? err) : err, {
			userId,
			mode: "pdf",
		});
		return NextResponse.json(
			{ error: "Błąd serwera przy odczycie pliku PDF. Spróbuj ponownie za chwilę." },
			{ status: 500 },
		);
	}

	// (5) (b) PDF bez wyciągalnego tekstu (skan/obraz/pusty) → 422 z jasnym komunikatem,
	//     nie ciche 200 z 0 kompetencji (ADR-007 ryzyko: „magia bez efektu").
	if (extracted.length < MIN_TEXT) {
		return NextResponse.json(
			{
				error:
					"Nie udało się odczytać tekstu z pliku PDF — może być skanem obrazu lub być zabezpieczony. Wklej treść sylabusa ręcznie.",
			},
			{ status: 422 },
		);
	}

	// (6) Górny limit po ekstrakcji — chroni przed PDF-bombą przed kosztem modelu (ADR-007 #5).
	const syllabusText = extracted.length > MAX_TEXT ? extracted.slice(0, MAX_TEXT) : extracted;

	return analyze(syllabusText, careerGoal, userId, "pdf");
}

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const rl = await applyRateLimit(rateLimiters.aiHeavy, `user:${session.user.id}`);
	if (!rl.success) return rateLimitResponse(rl.reset);

	// Routing po Content-Type (ADR-007 #3): multipart → PDF, w przeciwnym razie JSON.
	const contentType = req.headers.get("content-type") ?? "";
	if (contentType.includes("multipart/form-data")) {
		return handleMultipart(req, session.user.id);
	}
	return handleJson(req, session.user.id);
}
