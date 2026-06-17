// @vitest-environment node
//
// Test ekstrakcji tekstu z PDF bez @napi-rs/canvas (Rekomendacja A, fix korzenia
// prod-only crasha „DOMMatrix is not defined").
//
// CO DOWODZI:
//   1. extractPdfText instaluje globalThis.DOMMatrix (shim, NIE z canvasa) i zwraca tekst
//      realnego PDF (jspdf) — ta sama ścieżka, która na Vercel/Linux bez canvasa rzucała
//      ReferenceError. Shim sprawia, że canvas jest zbędny.
//   2. Shim DOMMatrix liczy poprawnie (konstruktor affine + multiply) — to operacje, których
//      pdfjs używa przy składaniu transformacji viewportu w getTextContent.
//   3. Pusty/uszkodzony input → PdfExtractionError (route mapuje na 500), NIE cichy pusty string.
//
// UWAGA: lokalnie (Windows/Node) canvas i tak nie rozwiązuje się z roota appki, a Node nie
// ma natywnego DOMMatrix — więc ten test biegnie w TYM SAMYM warunku co Linux serverless
// (brak canvasa). Dowodzi działania shimu w środowisku bez canvasa.

import { describe, expect, it } from "vitest";
import { extractPdfText, PdfExtractionError } from "@/lib/ai/extract-pdf-text";

async function makePdf(text: string): Promise<Buffer> {
	const jsPDF = (await import("jspdf")).default;
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	doc.text(doc.splitTextToSize(text, 180), 10, 10);
	return Buffer.from(doc.output("arraybuffer"));
}

const SYLLABUS =
	"Sylabus: Wprowadzenie do analizy danych. Python, biblioteka pandas, NumPy, podstawy SQL " +
	"i baz danych relacyjnych, statystyka opisowa, wizualizacja danych, wersjonowanie kodu w Git.";

describe("extractPdfText — canvas-free (shim DOMMatrix)", () => {
	it("wyciąga tekst z realnego PDF bez @napi-rs/canvas i instaluje shim DOMMatrix", async () => {
		const buf = await makePdf(SYLLABUS);
		const text = await extractPdfText(buf);

		// Shim zainstalowany na globalThis (nie z canvasa — canvas nieosiągalny z roota appki).
		expect(typeof (globalThis as unknown as { DOMMatrix?: unknown }).DOMMatrix).toBe("function");

		// Tekst realnie wyciągnięty — to ścieżka, która na Linuxie bez canvasa rzucała ReferenceError.
		expect(text.length).toBeGreaterThan(50);
		expect(text).toContain("Python");
		expect(text).toContain("SQL");
	});

	it("shim DOMMatrix: konstruktor affine + multiply liczą poprawnie", () => {
		type Mat = Record<"a" | "b" | "c" | "d" | "e" | "f", number> & {
			multiply(o: Mat): Mat;
		};
		const DM = (globalThis as unknown as { DOMMatrix: new (a?: number[]) => Mat }).DOMMatrix;

		const m = new DM([2, 0, 0, 3, 5, 7]);
		expect([m.a, m.b, m.c, m.d, m.e, m.f]).toEqual([2, 0, 0, 3, 5, 7]);

		// scale(2,3) * translate(10,10): tożsamościowy sanity multiply.
		const scale = new DM([2, 0, 0, 3, 0, 0]);
		const translate = new DM([1, 0, 0, 1, 10, 10]);
		const r = scale.multiply(translate);
		expect([r.a, r.d, r.e, r.f]).toEqual([2, 3, 20, 30]);
	});

	it("uszkodzone bajty → PdfExtractionError (route mapuje na 500, nie maskuje jako skan)", async () => {
		const garbage = Buffer.from("%PDF-1.4\nto nie jest poprawny PDF, tylko śmieci binarne");
		await expect(extractPdfText(garbage)).rejects.toBeInstanceOf(PdfExtractionError);
	});
});
