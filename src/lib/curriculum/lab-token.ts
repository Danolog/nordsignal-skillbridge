// ============================================================================
// 1E.6b (ADR-015) — kod atomu i token pieczątki.
//
//   kod_atomu = HMAC(LAB_TOKEN_SECRET, studentId:itemId)[:10]   ← serwer wydaje,
//               student przepisuje do komórki-pieczątki w notebooku
//   token     = base64url(canonical(ładunek)) + "." + HMAC(kod_atomu, canonical(ładunek))[:12]
//               ← notebook wypisuje, student wkleja do SkillBridge
//
// ⚠ CZYM TEN PODPIS **NIE** JEST (ADR-015 §4):
// HMAC NIE JEST TU KONTROLĄ BEZPIECZEŃSTWA. Student zna swój `kod_atomu`
// (dostaje go z SkillBridge), a funkcja podpisu jest widoczna w komórce — może
// więc policzyć podpis ręcznie. Podpis pełni rolę **sumy kontrolnej**:
//   (a) wykrywa literówkę przy przepisywaniu tokenu,
//   (b) uniemożliwia wklejenie tokenu KOLEGI (kod atomu jest per student+pozycja).
// Przed zdeterminowanym oszustem nie broni i nie ma udawać, że broni.
//
// Prawdziwą barierą jest to, co serwer robi z ŁADUNKIEM: nie ufa fladze
// „zaliczone", tylko sam weryfikuje każdy check (`lab-checks.ts`). Lab bramkuje
// POSTĘP, nie wystawia kredencjału — dowodem kompetencji pozostaje Verified
// Project Receipt (sandbox + viva + człowiek).
//
// Rotacja LAB_TOKEN_SECRET unieważnia tokeny W OBIEGU, ale NIE postęp — ten
// jest już zapisany w `curriculum_item_progress`.
// ============================================================================

import { createHmac, timingSafeEqual } from "node:crypto";
import type { StampPayload, StampValue } from "./lab-checks";

const ATOM_CODE_LEN = 10;
const SIGNATURE_LEN = 12;
/** Zapora na absurdalne ładunki (nie jest kontrolą bezpieczeństwa, tylko sanity). */
const MAX_TOKEN_CHARS = 4096;

function secret(): string {
	const s = process.env.LAB_TOKEN_SECRET;
	if (!s || s.length < 16) {
		throw new Error("LAB_TOKEN_SECRET nieustawiony lub za krótki (min. 16 znaków)");
	}
	return s;
}

/**
 * Czy mechanizm tokenu jest skonfigurowany.
 *
 * FAIL-CLOSED, ale bez wywalania strony: brak sekretu ⇒ labów NIE DA SIĘ
 * zaliczyć (trasa `complete` zwraca 501), ale widok pozycji nadal się renderuje
 * — student przeczyta teorię i instrukcję. Bez tego guardu `atomCode()` rzucałby
 * z SERVER COMPONENTU i cała strona laba dawałaby 500.
 */
export function isLabTokenConfigured(): boolean {
	const s = process.env.LAB_TOKEN_SECRET;
	return typeof s === "string" && s.length >= 16;
}

function hmacHex(key: string, message: string): string {
	return createHmac("sha256", key).update(message, "utf8").digest("hex");
}

/**
 * Kanoniczna serializacja ładunku — MUSI dawać identyczny wynik po stronie
 * notebooka (Python) i serwera (TS), inaczej podpis nigdy się nie zgodzi.
 * Reguły: klucze posortowane, bez spacji, liczby całkowite bez `.0`,
 * zmiennoprzecinkowe zaokrąglone do 6 miejsc (Python i JS inaczej drukują
 * długie ułamki — to jest dokładnie ten sam problem, dla którego checki
 * porównują liczby z tolerancją).
 */
export function canonicalPayload(payload: StampPayload): string {
	const norm = (v: StampValue): unknown => {
		if (typeof v === "number") {
			if (!Number.isFinite(v)) return null;
			return Number.isInteger(v) ? v : Number(v.toFixed(6));
		}
		if (Array.isArray(v)) return v.map(norm);
		return v;
	};
	const keys = Object.keys(payload).sort();
	const obj: Record<string, unknown> = {};
	for (const k of keys) obj[k] = norm(payload[k]);
	return JSON.stringify(obj);
}

/** Kod atomu pokazywany studentowi (per student + pozycja). */
export function atomCode(studentId: string, itemId: string): string {
	return hmacHex(secret(), `${studentId}:${itemId}`).slice(0, ATOM_CODE_LEN);
}

/** Token, jaki POWINNA wypisać pieczątka dla danego ładunku (używane w testach). */
export function signToken(code: string, payload: StampPayload): string {
	const canonical = canonicalPayload(payload);
	const b64 = Buffer.from(canonical, "utf8").toString("base64url");
	const sig = hmacHex(code, canonical).slice(0, SIGNATURE_LEN);
	return `${b64}.${sig}`;
}

export type TokenParse =
	| { ok: true; payload: StampPayload }
	| { ok: false; reason: "malformed" | "bad_signature" | "too_long" };

/**
 * Rozłożenie i weryfikacja tokenu wklejonego przez studenta.
 * Zwraca ŁADUNEK — sama poprawność podpisu NICZEGO nie zalicza; checki
 * weryfikuje osobno `evaluateChecks`.
 */
export function parseToken(studentId: string, itemId: string, token: string): TokenParse {
	const trimmed = token.trim();
	if (trimmed.length > MAX_TOKEN_CHARS) return { ok: false, reason: "too_long" };

	const dot = trimmed.lastIndexOf(".");
	if (dot <= 0 || dot === trimmed.length - 1) return { ok: false, reason: "malformed" };

	const b64 = trimmed.slice(0, dot);
	const sig = trimmed.slice(dot + 1);

	let canonical: string;
	let payload: StampPayload;
	try {
		canonical = Buffer.from(b64, "base64url").toString("utf8");
		const parsed = JSON.parse(canonical);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			return { ok: false, reason: "malformed" };
		}
		payload = parsed as StampPayload;
	} catch {
		return { ok: false, reason: "malformed" };
	}

	// Podpis liczymy z ładunku ZNORMALIZOWANEGO PONOWNIE — nie z surowego base64.
	// Inaczej dwa różne zapisy tej samej treści dałyby różne podpisy i student
	// dostawałby „zły token" za sposób drukowania liczb przez Pythona.
	const expected = hmacHex(atomCode(studentId, itemId), canonicalPayload(payload)).slice(
		0,
		SIGNATURE_LEN,
	);
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) {
		return { ok: false, reason: "bad_signature" };
	}
	return { ok: true, payload };
}
