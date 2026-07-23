/**
 * ADR-018 — serwerowa drabinka podpowiedzi (hint depth mierzony serwerowo).
 *
 * JEDYNY pisarz i JEDYNY czytelnik kolumny `curriculum_item_progress.hints_revealed_json`
 * (warunek W-7 sign-offu Ryana — `docs/security/hint-reveals-retencja-signoff.md`).
 * Żaden moduł spoza `src/lib/curriculum/` nie sięga do tej kolumny bezpośrednio.
 *
 * Kształt wartości (ADR-018 D1): `{ "<question_item_id>": { d: 0..3, at: [<UTC>] } }`.
 *  - `d` — maksymalna PRZYZNANA głębokość dla pytania (niemalejąca, sticky — D2);
 *  - `at` — znaczniki czasu przyznań, UTC pełne sekundy (W-2), NAJWYŻEJ `d` wpisów.
 *
 * Niezmiennik (A2 / W-3):
 *  - przy ZAPISIE obowiązuje RÓWNOŚĆ (każdy wzrost głębokości = dokładnie 1 znacznik);
 *  - jako niezmiennik TRWAŁY obowiązuje `at.length <= d` (krótsza lista = legalny stan
 *    po przycięciu retencyjnym 12 m-cy, nigdy błąd) — sprawdzany przy zapisie I odczycie.
 */

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { curriculumItemAnswers, curriculumItemProgress } from "@/lib/db/schema";

/** Sufit głębokości drabinki (D5): najwyżej 3 poziomy pomocy na pytanie. */
export const MAX_HINT_DEPTH = 3;

/**
 * W-2 — dozwolony format znacznika: UTC, pełne sekundy, bez milisekund i bez
 * lokalnego przesunięcia strefy. `[\s\S]`/klasy znaków celowo bez flagi `s`
 * (dotAll nie przechodzi `tsc --noEmit` — pułapka CI z handoffów).
 */
const HINT_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/** Znacznik z zegara SERWERA (W-1) w formacie W-2 — nigdy z ciała żądania klienta. */
export function serverHintTimestamp(now: Date = new Date()): string {
	return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * W-3 — zamknięty kształt wpisu (`.strict()` = dodatkowy klucz `ua`/`ip`/`sessionId`
 * rzuca, nie jest po cichu odcinany). Niezmiennik `at.length <= d` w `refine`.
 */
const HintEntrySchema = z
	.object({
		d: z.number().int().min(0).max(MAX_HINT_DEPTH),
		at: z.array(z.string().regex(HINT_TIMESTAMP_RE)).max(MAX_HINT_DEPTH),
	})
	.strict()
	.refine((entry) => entry.at.length <= entry.d, {
		message: "hints_revealed_json: at.length musi być <= d (niezmiennik ADR-018 A2)",
	});

/** Mapa `question_item_id → wpis`. Parsowana (nigdy rzutowana) przy zapisie i odczycie. */
export const HintsRevealedSchema = z.record(z.uuid(), HintEntrySchema);
export type HintEntry = z.infer<typeof HintEntrySchema>;
export type HintsRevealed = z.infer<typeof HintsRevealedSchema>;

/** Czytelnik: `db` albo transakcja (tx spełnia strukturalnie). */
type CurriculumReader = Pick<typeof db, "select">;

/**
 * D4 — przyznanie kolejnej podpowiedzi dla pytania. Zwraca przyznaną głębokość
 * i treść podpowiedzi do tej głębokości (treść pochodzi z `config_json.hints`
 * pozycji, nie z kolumny — do klienta NIGDY nie wychodzi surowa mapa ani `at`).
 *
 * Współbieżność (D5): odczyt-zapis w JEDNEJ transakcji z `SELECT … FOR UPDATE`
 * na wierszu postępu — dwa równoległe kliknięcia dają głębokość +1 (nie +2)
 * i dokładnie jeden nowy znacznik `at`. Idempotencja (D2): kliknięcie na
 * osiągniętym suficie nie przyrasta danych.
 */
export async function grantNextHint(
	studentId: string,
	tenantId: string,
	itemId: string,
	questionItemId: string,
	hints: string[],
	now: Date = new Date(),
): Promise<{ depth: number; hints: string[] }> {
	const maxDepth = Math.min(hints.length, MAX_HINT_DEPTH);
	const depth = await db.transaction(async (tx) => {
		// Odsłonięcie bywa PIERWSZĄ interakcją z pozycją — wiersza postępu może
		// jeszcze nie być. Upsert: status nigdy `locked` przy wstawieniu, guard
		// przed cofnięciem `completed`/`skipped`; `attempts` i `last_answer_at`
		// NIETKNIĘTE (odsłonięcie nie jest podejściem).
		await tx
			.insert(curriculumItemProgress)
			.values({ studentId, tenantId, itemId, status: "in_progress" })
			.onConflictDoUpdate({
				target: [curriculumItemProgress.studentId, curriculumItemProgress.itemId],
				set: {
					status: sql`CASE WHEN ${curriculumItemProgress.status} IN ('completed','skipped_by_placement')
						THEN ${curriculumItemProgress.status} ELSE 'in_progress' END`,
					updatedAt: new Date(),
				},
			});

		// Blokada wiersza na czas odczyt-zapis (serializuje równoległe kliknięcia).
		const locked = await tx.execute(sql`
			SELECT hints_revealed_json FROM curriculum_item_progress
			WHERE student_id = ${studentId} AND item_id = ${itemId}
			FOR UPDATE
		`);
		const raw =
			(locked.rows[0] as { hints_revealed_json?: unknown } | undefined)?.hints_revealed_json ?? {};
		const map = HintsRevealedSchema.parse(raw); // W-3: parsujemy przy ODCZYCIE
		const current: HintEntry = map[questionItemId] ?? { d: 0, at: [] };
		const next = Math.min(current.d + 1, maxDepth);

		if (next > current.d) {
			// Przy ZAPISIE obowiązuje RÓWNOŚĆ: dokładnie jeden znacznik na wzrost.
			const nextMap: HintsRevealed = {
				...map,
				[questionItemId]: { d: next, at: [...current.at, serverHintTimestamp(now)] },
			};
			HintsRevealedSchema.parse(nextMap); // W-3: parsujemy przy ZAPISIE
			await tx
				.update(curriculumItemProgress)
				.set({ hintsRevealedJson: nextMap, updatedAt: new Date() })
				.where(
					and(
						eq(curriculumItemProgress.studentId, studentId),
						eq(curriculumItemProgress.itemId, itemId),
					),
				);
		}
		return next;
	});
	return { depth, hints: hints.slice(0, depth) };
}

/**
 * Przyznane głębokości pozycji dla studenta — mapa `question_item_id → d`.
 * Konsument: `getItemView` (buduje `hintsByQuestion`) i trasa `answer` (liczy
 * `hint_depth` serwerowo w swojej transakcji). Klucze bez wpisu = brak przyznań.
 */
export async function getGrantedDepths(
	studentId: string,
	itemId: string,
	dbc: CurriculumReader = db,
): Promise<Map<string, number>> {
	const rows = await dbc
		.select({ hintsRevealedJson: curriculumItemProgress.hintsRevealedJson })
		.from(curriculumItemProgress)
		.where(
			and(
				eq(curriculumItemProgress.studentId, studentId),
				eq(curriculumItemProgress.itemId, itemId),
			),
		);
	const map = HintsRevealedSchema.parse(rows[0]?.hintsRevealedJson ?? {}); // parse, nie rzutowanie
	const out = new Map<string, number>();
	for (const [questionItemId, entry] of Object.entries(map)) out.set(questionItemId, entry.d);
	return out;
}

export type MeasuredHintDepth = {
	itemId: string;
	questionItemId: string;
	hintDepth: number;
	answeredAt: Date;
};

/**
 * D3 — jedyne miejsce odczytu `hint_depth` dla FSRS (1E.4) i analityki:
 * WYŁĄCZNIE wiersze `hint_depth_source = 'server'`. Wiersze `'client'` (sprzed
 * naprawy) mają głębokość NIEZNANĄ i po prostu nie pojawiają się w wyniku — nigdy
 * jako zero. Żaden konsument nie pisze tego filtra sam.
 */
export async function readMeasuredHintDepths(
	studentId: string,
	dbc: CurriculumReader = db,
): Promise<MeasuredHintDepth[]> {
	return dbc
		.select({
			itemId: curriculumItemAnswers.itemId,
			questionItemId: curriculumItemAnswers.questionItemId,
			hintDepth: curriculumItemAnswers.hintDepth,
			answeredAt: curriculumItemAnswers.answeredAt,
		})
		.from(curriculumItemAnswers)
		.where(
			and(
				eq(curriculumItemAnswers.studentId, studentId),
				eq(curriculumItemAnswers.hintDepthSource, "server"),
			),
		);
}
