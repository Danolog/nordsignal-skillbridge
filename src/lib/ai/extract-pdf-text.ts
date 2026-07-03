/**
 * Ekstrakcja tekstu z PDF bez zależności od @napi-rs/canvas (Rekomendacja A, ADR-007).
 *
 * KORZEŃ BŁĘDU (prod-only crash, log: „[syllabus-pdf] ReferenceError: DOMMatrix is not
 * defined" + „Cannot load @napi-rs/canvas"):
 *   pdf-parse v2 ładuje pdfjs-dist/legacy/build/pdf.mjs. Na imporcie pdfjs próbuje
 *   require("@napi-rs/canvas"), żeby spolyfillować DOMMatrix / ImageData / Path2D na
 *   globalThis. Na Vercelu (Linux) binding @napi-rs/canvas-linux-x64-gnu nie trafia do
 *   śladu funkcji → require pada → pdfjs TYLKO loguje warn i NIE ustawia globalThis.DOMMatrix.
 *   Potem page.getViewport()/getTextContent() konstruuje `new DOMMatrix(...)` → ReferenceError.
 *   Lokalnie (Windows ma binding) bug się nie odtwarza — dlatego weryfikacja musi być na deployu.
 *
 * FIX: ekstrakcja tekstu z PDF NIE wymaga canvasa ani renderowania — getTextContent czyta
 *   warstwę tekstową. Jedyne, czego pdfjs potrzebuje z „canvasa" na tej ścieżce, to konstruktor
 *   DOMMatrix do złożenia transformacji viewportu. Dostarczamy minimalny, czysto-JS shim
 *   DOMMatrix (mnożenie macierzy 2D affine) i ustawiamy go na globalThis ZANIM zaimportujemy
 *   pdf-parse. Blok polyfillu w pdf.mjs sprawdza `if (!globalThis.DOMMatrix)` — gdy nasz shim
 *   już tam jest, pdfjs go nie nadpisuje i nie potrzebuje canvasa. Warn „Cannot load
 *   @napi-rs/canvas" może nadal się pojawić (require próbuje), ale jest nieszkodliwy:
 *   getText() nie rzuca, bo DOMMatrix istnieje. Renderowanie do obrazu (które naprawdę
 *   wymaga canvasa) na tej ścieżce nie jest wołane.
 *
 * Brak nowej zależności natywnej, brak binarki .node w bundlu funkcji.
 */

/**
 * 0.12 (DoS): twardy limit stron parsowanych z PDF. Route ogranicza rozmiar pliku
 * (MAX_PDF_BYTES=10MB) i długość tekstu (MAX_TEXT), ale sama EKSTRAKCJA przetwarzała
 * WSZYSTKIE strony — spreparowany PDF z tysiącami stron (kompaktny tekstowo) mógł zjeść
 * CPU/pamięć na maxDuration. `getText({ first: N })` parsuje tylko pierwsze N stron
 * (jeśli PDF ma mniej — całość). Sylabus mieści się w tym z zapasem.
 */
export const MAX_PDF_PAGES = 40;

/** Błąd techniczny ekstrakcji (moduł/runtime/zniekształcony PDF) → 500 w route. */
export class PdfExtractionError extends Error {
	constructor(
		message: string,
		readonly cause?: unknown,
	) {
		super(message);
		this.name = "PdfExtractionError";
	}
}

/**
 * Minimalny DOMMatrix (affine 2D + tożsamościowa 3D) wystarczający dla getTextContent/
 * getViewport pdfjs. Implementuje konstruktor z [a,b,c,d,e,f] lub bez argumentu (tożsamość),
 * mnożenie i inwersję — operacje, których pdfjs używa przy składaniu transformacji tekstu.
 * NIE renderuje grafiki (to robi prawdziwy canvas) — tu niepotrzebne.
 */
class MinimalDOMMatrix {
	a = 1;
	b = 0;
	c = 0;
	d = 1;
	e = 0;
	f = 0;
	// Pełne pola 4x4, których część kodu pdfjs czyta wprost (m11..m44).
	m11 = 1;
	m12 = 0;
	m13 = 0;
	m14 = 0;
	m21 = 0;
	m22 = 1;
	m23 = 0;
	m24 = 0;
	m31 = 0;
	m32 = 0;
	m33 = 1;
	m34 = 0;
	m41 = 0;
	m42 = 0;
	m43 = 0;
	m44 = 1;
	is2D = true;

	constructor(init?: number[] | string) {
		if (Array.isArray(init)) {
			if (init.length === 6) {
				const [a, b, c, d, e, f] = init;
				this.setAffine(a, b, c, d, e, f);
			} else if (init.length === 16) {
				// Bierzemy komponenty 2D z macierzy 4x4 (kolumnowo jak DOMMatrix).
				this.setAffine(init[0], init[1], init[4], init[5], init[12], init[13]);
			}
		}
		// init === undefined → tożsamość (już ustawiona w polach).
		// init typu string (CSS transform) nie jest używany przez ścieżkę tekstową — pomijamy.
	}

	private setAffine(a: number, b: number, c: number, d: number, e: number, f: number) {
		this.a = this.m11 = a;
		this.b = this.m12 = b;
		this.c = this.m21 = c;
		this.d = this.m22 = d;
		this.e = this.m41 = e;
		this.f = this.m42 = f;
	}

	/** Mnożenie macierzy 2D (this * other), zwraca nową instancję (jak DOMMatrix.multiply). */
	multiply(other: MinimalDOMMatrix): MinimalDOMMatrix {
		const a = this.a * other.a + this.c * other.b;
		const b = this.b * other.a + this.d * other.b;
		const c = this.a * other.c + this.c * other.d;
		const d = this.b * other.c + this.d * other.d;
		const e = this.a * other.e + this.c * other.f + this.e;
		const f = this.b * other.e + this.d * other.f + this.f;
		return new MinimalDOMMatrix([a, b, c, d, e, f]);
	}

	multiplySelf(other: MinimalDOMMatrix): MinimalDOMMatrix {
		const r = this.multiply(other);
		this.setAffine(r.a, r.b, r.c, r.d, r.e, r.f);
		return this;
	}

	preMultiplySelf(other: MinimalDOMMatrix): MinimalDOMMatrix {
		const r = other.multiply(this);
		this.setAffine(r.a, r.b, r.c, r.d, r.e, r.f);
		return this;
	}

	translate(tx = 0, ty = 0): MinimalDOMMatrix {
		return this.multiply(new MinimalDOMMatrix([1, 0, 0, 1, tx, ty]));
	}

	scale(sx = 1, sy?: number): MinimalDOMMatrix {
		return this.multiply(new MinimalDOMMatrix([sx, 0, 0, sy ?? sx, 0, 0]));
	}

	/** Inwersja affine 2D; przy macierzy osobliwej zwraca tożsamość (defensywnie). */
	inverse(): MinimalDOMMatrix {
		const det = this.a * this.d - this.b * this.c;
		if (!det || !Number.isFinite(det)) return new MinimalDOMMatrix();
		const ia = this.d / det;
		const ib = -this.b / det;
		const ic = -this.c / det;
		const id = this.a / det;
		const ie = (this.c * this.f - this.d * this.e) / det;
		const iff = (this.b * this.e - this.a * this.f) / det;
		return new MinimalDOMMatrix([ia, ib, ic, id, ie, iff]);
	}

	invertSelf(): MinimalDOMMatrix {
		const r = this.inverse();
		this.setAffine(r.a, r.b, r.c, r.d, r.e, r.f);
		return this;
	}
}

/**
 * Idempotentnie instaluje shim DOMMatrix na globalThis, jeśli środowisko go nie ma
 * (Linux serverless bez canvasa). Musi wykonać się PRZED importem pdf-parse/pdfjs.
 */
function ensureDomMatrixShim(): void {
	const g = globalThis as unknown as { DOMMatrix?: unknown };
	if (typeof g.DOMMatrix === "undefined") {
		g.DOMMatrix = MinimalDOMMatrix as unknown;
	}
}

/**
 * Wyciąga tekst z bajtów PDF. Zwraca surowy (nie przycięty) tekst — przycięcie i progi
 * długości są decyzją warstwy route. Rzuca PdfExtractionError TYLKO przy błędzie technicznym
 * (uszkodzony plik, błąd runtime pdfjs) — pusty wynik (PDF bez warstwy tekstowej / skan)
 * to NIE błąd: zwracamy pusty string i route decyduje (422 „wklej ręcznie").
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
	ensureDomMatrixShim();

	let parser: import("pdf-parse").PDFParse | null = null;
	try {
		const { PDFParse } = await import("pdf-parse");
		parser = new PDFParse({
			data: new Uint8Array(buffer),
			// Twardzimy ścieżkę tekstową pod serverless (Vercel /var/task). pdfjs w Node i tak
			// odpala „fake worker" (tam parsuje) — sam plik workera wciągamy do śladu funkcji
			// w next.config.ts (outputFileTracingIncludes). Tu zamykamy pozostałe prod-only
			// pułapki ładowania zasobów na żądanie:
			//  - useWorkerFetch:false — żadnego runtime fetch() CMap/font/WASM (i tak default w Node,
			//    ustawiamy jawnie, by nie polegać na defaultcie i nie ciągnąć zasobów spoza śladu).
			//  - isEvalSupported:false — bez eval() funkcji PDF (spójne z CSP, bez 'unsafe-eval' na serwerze).
			// Do ekstrakcji samej warstwy TEKSTOWEJ żadne z tych nie jest potrzebne.
			useWorkerFetch: false,
			isEvalSupported: false,
		});
		// 0.12: parsuj tylko pierwsze MAX_PDF_PAGES stron (obrona DoS — patrz stała).
		const result = await parser.getText({ first: MAX_PDF_PAGES });
		return result.text.trim();
	} catch (err) {
		throw new PdfExtractionError("Błąd odczytu tekstu z PDF", err);
	} finally {
		await parser?.destroy().catch(() => {});
	}
}
