import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseSyllabus } from "@/lib/ai/parse-syllabus";
import { auth } from "@/lib/auth/server";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

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

	// (4) Ekstrakcja tekstu — pdf-parse (v2, klasa PDFParse) w try/catch
	//     (ADR-007 ryzyko: zniekształcony PDF → 422 + log). v2 zamiast v1: stary pdfjs w v1
	//     nie czyta nowoczesnych PDF-ów (m.in. wyjścia jspdf z bram Z2 — „bad XRef entry") i
	//     ma footgun debug-branch przy imporcie ESM. Biblioteka ta sama (pdf-parse), Node runtime.
	let extracted: string;
	let parser: import("pdf-parse").PDFParse | null = null;
	try {
		// Import dynamiczny: pdf-parse to dep tylko-Node; trzyma poza grafem klienta.
		const { PDFParse } = await import("pdf-parse");
		parser = new PDFParse({ data: new Uint8Array(buffer) });
		const result = await parser.getText();
		extracted = result.text.trim();
	} catch (err) {
		logError("syllabus-pdf", err, { userId, mode: "pdf" });
		return NextResponse.json(
			{
				error:
					"Nie udało się odczytać tekstu z pliku PDF — może być skanem obrazu lub być zabezpieczony. Wklej treść sylabusa ręcznie.",
			},
			{ status: 422 },
		);
	} finally {
		// Zwolnij dokument pdfjs (worker/pamięć) niezależnie od wyniku ekstrakcji.
		await parser?.destroy().catch(() => {});
	}

	// (5) PDF bez wyciągalnego tekstu (skan/obraz/pusty) → 422 z jasnym komunikatem,
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
