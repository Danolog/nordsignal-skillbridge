// ============================================================================
// 1E.3 · P5 — kontrakt KLIENCKI tras egzaminu modułowego (mastery gate).
//
// To jest lustro odpowiedzi tras `/api/exam/*` w kształcie, którego używa
// warstwa UI (ExamRunner). Buduję PRZECIW temu kontraktowi — backend P4.5
// (423 correctives_required, twarda blokada 3. próby) żyje na osobnej gałęzi,
// integracja po merge obu. Tu tylko TYPY + strażniki, zero fetchy, zero DB.
//
// Źródło prawdy kształtu: src/app/api/exam/{start,[id]/answer,[id]/complete}/
// route.ts + decyzje Sophii (docs/product/decyzje-1e3-p5-egzamin-v0.1.md, D2)
// + spec Mili (rozdz. 4–7). Werdykt i paczka correctives reużywają typów
// silnika (ExamResultJson, CorrectivesPackage) — jedno źródło, bez duplikacji.
// ============================================================================

import type { CorrectivesPackage } from "@/lib/assessment/correctives";
import type { ExamResultJson } from "@/lib/assessment/exam";

/**
 * Pytanie egzaminu w kształcie dla klienta — stem + opcje, ZERO klucza.
 * Lustro `ExamQuestionPayload` (exam.ts): `position` 0-based, `total` = liczba
 * pytań (pasek postępu).
 */
export interface ExamQuestion {
	slotRef: string;
	stem: string;
	options: string[];
	position: number;
	total: number;
}

/**
 * `POST /api/exam/start` — sukces (201 nowa / 200 wznowiona). `resumed:true` →
 * baner R2 „wracasz". `question:null` nie występuje na świeżym starcie
 * (bank ma pozycje) — obsługiwane defensywnie jako błąd startu.
 */
export interface ExamStartOk {
	sessionId: string;
	resumed: boolean;
	attempt: number;
	total: number;
	question: ExamQuestion | null;
}

/**
 * `POST /api/exam/start` — 423 Locked (P4.5, Sophia D2): 2 oblania w cyklu,
 * correctives NIE odbyte (stan S-C). Front renderuje Ekran 5 z tej paczki,
 * BEZ przycisku retry (twardy kontrakt, nie miękka blokada).
 */
export interface CorrectivesRequired {
	state: "correctives_required";
	correctivesPackage: CorrectivesPackage;
}

/** `POST /api/exam/[id]/answer` — przyjęto odpowiedź; `done:true` → domykanie (R5). */
export interface ExamAnswerOk {
	accepted: boolean;
	done: boolean;
	question: ExamQuestion | null;
}

/** `POST /api/exam/[id]/complete` — werdykt (W1/W2/W3). `result.correctivesPackage` gdy S-C. */
export interface ExamCompleteOk {
	completed: boolean;
	result: ExamResultJson;
}

/** Ciało odpowiedzi answer w kształcie do wysłania (single_choice: indeks opcji). */
export interface ExamAnswerBody {
	slotRef: string;
	answer: { selected: number };
}

/** Strażnik 423 — odróżnia „masz correctives do zrobienia" od błędu technicznego. */
export function isCorrectivesRequired(body: unknown): body is CorrectivesRequired {
	if (typeof body !== "object" || body === null) return false;
	const b = body as { state?: unknown; correctivesPackage?: unknown };
	return (
		b.state === "correctives_required" &&
		typeof b.correctivesPackage === "object" &&
		b.correctivesPackage !== null
	);
}
