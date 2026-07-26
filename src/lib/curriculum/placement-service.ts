// ============================================================================
// 1E.7 (SLICE L3) — warstwa serwisowa placementu: spina CZYSTĄ regułę L2
// (`placement.ts` — 0 DB) z bazą. Trzy kroki i ani jednego więcej:
//   1. wczytaj drabinę ścieżki i ROZWIĄŻ tag uuid → slug konceptu (+ nazwę
//      kompetencji) JEDNYM złączeniem,
//   2. policz werdykt regułą L2 (`computePlacement`),
//   3. zapisz PEŁNY werdykt modułów OTWARTYCH do `curriculum_placements`
//      (jeden wielowierszowy INSERT ... ON CONFLICT DO NOTHING).
//
// Wzorzec: review-service.ts (1E.4 R3).
//
// ── OWNER-SIDE (`db`), NIE withTenantContext ──────────────────────────────
// `app_student` ma na `curriculum_placements` grant TYLKO SELECT (migracja
// 0045, rls-matrix v0.32 #28) — każdy INSERT spod roli runtime zostałby
// ODMÓWIONY. Zapis MUSI iść połączeniem właściciela, z JAWNYM `student_id`
// jako granicą najemcy; `studentId`/`tenantId` rozwiązuje wołający z sesji
// (getStudentByUserId), NIGDY z ładunku klienta. Parytet review-service.ts.
//
// ── NIEZMIENNOŚĆ ZAPISU (wymóg produktowy Sophii v0.3 §7 pkt 2 + W-1 Ryana) ─
// Wiersz powstaje RAZ, w chwili odblokowania, i nie jest przepisywany:
// `ON CONFLICT (student_id, module_id) DO NOTHING` + wyzwalacz bazy
// odrzucający UPDATE. Druga diagnoza DOKŁADA moduły (monotoniczność §6b), ale
// NIE WOLNO jej przepisać powodu, dla którego moduł otworzył się za pierwszym
// razem — inaczej miernik progu mierzy skutek własnej aktualizacji.
//
// ── ZAPISUJEMY WYŁĄCZNIE MODUŁY OTWARTE ───────────────────────────────────
// Minimalizacja (art. 5 ust. 1 lit. c, RoPA #5): nie utrwalamy trwale tego, na
// czym student wypadł słabo — to zostaje w `assessment_sessions.result_json`
// (osobna czynność przetwarzania) i nie jest dublowane.
//
// ── CZEGO TEN MODUŁ NIE ROBI ──────────────────────────────────────────────
//  • nie zmienia `isModuleUnlocked`/drabiny (L4 — dopóki L4 nie wejdzie, wiersze
//    powstają, ale nie otwierają jeszcze niczego w UI),
//  • nie rozstrzyga exam/test_out (L5), nie renderuje niczego (L6),
//  • nie zapala flagi i nie sprawdza jej — bramka jest w MIEJSCU WYWOŁANIA
//    (trasa), wzorzec 1E.4 R5 (`enroll-hook.ts`).
// ============================================================================

import { asc, eq } from "drizzle-orm";
import type { CompetencyLevel } from "@/lib/assessment/types";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/pg-error";
import {
	curriculumModules,
	curriculumPathModules,
	curriculumPlacements,
	questionConcepts,
} from "@/lib/db/schema";
import { logError } from "@/lib/log";
import { pathKeyForCareerGoal } from "./path-key";
import {
	computePlacement,
	DEFAULT_PLACEMENT_THRESHOLD,
	type PlacementDiagnosis,
	type PlacementLadderModule,
	type PlacementOutcome,
} from "./placement";

/**
 * Kształt uuid — bariera C1 (patrz `assertResolvedTags`). Świadomie luźny
 * (8-4-4-4-12 hex), bo chodzi o WYKRYCIE uuid tam, gdzie ma być slug, a nie
 * o walidację wersji/wariantu.
 */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Błąd bariery uuid/slug (C1 z przeglądu Leo). ŚWIADOMIE głośny: pomyłka
 * uuid↔slug daje awarię BEZOBJAWOWĄ — `result_json.concepts` jest kluczowany
 * SLUGIEM, więc podanie uuid sprawia, że KAŻDY moduł dostaje `no_measurement`,
 * nieodróżnialne od uczciwego braku pomiaru: nikt nie dostaje nic i nic nie
 * krzyczy. Wolimy wyjątek w best-effort hooku (zalogowany, bez wpływu na
 * odpowiedź trasy) niż ciche „placement nie działa" przez cały pilotaż.
 */
export class PlacementTagResolutionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PlacementTagResolutionError";
	}
}

/** Moduł drabiny + adresy potrzebne do zapisu (reguła L2 ich nie widzi). */
interface LadderRow extends PlacementLadderModule {
	moduleId: string;
	/** uuid tagu z `curriculum_modules.diagnostic_concept_id` — do diagnostyki C1. */
	diagnosticConceptId: string | null;
}

/** Wynik zapisu — ile NOWYCH wierszy powstało (moduły już otwarte pomija ON CONFLICT). */
export interface PlacementWriteResult {
	/** Moduły otwarte przez ten wynik diagnozy (zbiór policzony regułą). */
	unlockedSlugs: string[];
	/** Wiersze faktycznie wstawione — druga diagnoza tego samego modułu daje 0. */
	written: number;
	/**
	 * PEŁNY werdykt reguły L2 dla całej drabiny — także dla modułów, których
	 * NIE zapisujemy (nieodblokowanych). Wołający L3 (hook trasy) go ignoruje;
	 * jest tu z dwóch powodów: (1) L6 potrzebuje powodu `below_threshold` /
	 * `uncovered` / `no_measurement` do mikrocopy, a te NIGDY nie trafiają do
	 * bazy (minimalizacja — nie utrwalamy tego, na czym student wypadł słabo);
	 * (2) bez tego rozróżnienie `uncovered` ↔ `no_measurement` (wymóg C6:
	 * `competencyName` z `question_concepts.competency_name`) nie miałoby
	 * ŻADNEGO maszynowo sprawdzalnego skutku i zdegradowałoby się po cichu.
	 */
	outcome: PlacementOutcome;
}

/**
 * Drabina ścieżki w kształcie reguły L2, z tagiem ROZWIĄZANYM do sluga.
 *
 * JEDNO zapytanie (LEFT JOIN question_concepts) — bez N+1 i bez zgadywania.
 * LEFT, nie INNER: moduł z tagiem NULL (`l0-start`, `f2-python-2`,
 * `f3-dane-python`) MUSI zostać w drabinie, bo jedzie z prefiksem (reguła 4–5
 * L2). INNER JOIN wyciąłby go i po cichu skrócił drabinę.
 *
 * `competencyName` bierzemy z `question_concepts.competency_name` — DOKŁADNIE
 * tej kolumny, która karmi plan diagnozy (`loadDiagnosticBank` →
 * `buildPlan` → `uncovered`). To wymóg C6 przeglądu Leo: powód `uncovered`
 * (§6a) stoi na dopasowaniu NAPISÓW, więc wzięcie nazwy z innego źródła
 * (np. `competencies.name` studenta) zdegradowałoby powód po cichu do
 * `no_measurement` — werdykt wyglądałby poprawnie i byłby fałszywy.
 */
export async function loadPlacementLadder(pathKey: string): Promise<LadderRow[]> {
	const rows = await db
		.select({
			moduleId: curriculumModules.id,
			slug: curriculumModules.slug,
			position: curriculumPathModules.position,
			diagnosticConceptId: curriculumModules.diagnosticConceptId,
			diagnosticConceptSlug: questionConcepts.slug,
			competencyName: questionConcepts.competencyName,
		})
		.from(curriculumPathModules)
		.innerJoin(curriculumModules, eq(curriculumPathModules.moduleId, curriculumModules.id))
		.leftJoin(questionConcepts, eq(curriculumModules.diagnosticConceptId, questionConcepts.id))
		.where(eq(curriculumPathModules.pathKey, pathKey))
		.orderBy(asc(curriculumPathModules.position));

	assertResolvedTags(rows);
	return rows;
}

/**
 * TWARDA BARIERA uuid/slug (C1 przeglądu Leo) — wzorzec
 * `resolveDiagnosticConceptId` z `tools/ingest-curriculum.ts`: pierwszy
 * nierozwiązany tag PRZERYWA błędem, zamiast produkować cichy „brak pomiaru".
 *
 * Dwa niezależne sprawdzenia, bo łapią dwie różne awarie:
 *  (a) tag jest (uuid niepusty), a złączenie nie dało sluga → koncept zniknął
 *      z banku albo klucz obcy przestał trzymać. Reguła dostałaby `null` =
 *      „nie zmierzyliśmy" dla modułu, który JEST otagowany — to kłamstwo
 *      w danych, nie brak danych.
 *  (b) rozwiązany „slug" ma KSZTAŁT UUID → ktoś podłączył kolumnę id zamiast
 *      slug. To jest dokładnie ta pomyłka, którą Leo nazwał bezobjawową:
 *      złączenie się udaje, typy się zgadzają, a `concepts[uuid]` nigdy nie
 *      trafia, więc CAŁA drabina dostaje `no_measurement`. Bez tego warunku
 *      żaden test kontraktowy nie odróżni „placement nie działa" od „student
 *      nie ma pomiarów".
 */
function assertResolvedTags(rows: readonly LadderRow[]): void {
	for (const row of rows) {
		if (row.diagnosticConceptId !== null && row.diagnosticConceptSlug === null) {
			throw new PlacementTagResolutionError(
				`Moduł '${row.slug}': tag diagnostyczny ${row.diagnosticConceptId} nie rozwiązał się ` +
					"do konceptu w banku (question_concepts). Placement przerwany zamiast policzyć " +
					"werdykt na niepełnej mapie tagów — inaczej moduł otagowany dostałby po cichu " +
					"'brak pomiaru'.",
			);
		}
		if (row.diagnosticConceptSlug !== null && UUID_SHAPE.test(row.diagnosticConceptSlug)) {
			throw new PlacementTagResolutionError(
				`Moduł '${row.slug}': tag diagnostyczny rozwiązał się do wartości o kształcie UUID ` +
					`('${row.diagnosticConceptSlug}'), a reguła placementu potrzebuje SLUGA konceptu — ` +
					"`result_json.concepts` jest kluczowany slugiem. Przy uuid cała drabina dostałaby " +
					"'no_measurement' i nikt nie zostałby odblokowany, bez jednego błędu w logach.",
			);
		}
	}
}

/**
 * recordPlacementForDiagnosis — policz werdykt i utrwal odblokowania.
 *
 * Zwraca policzone `unlockedSlugs` (nawet gdy nic nie wstawiono — druga
 * diagnoza) i liczbę NOWYCH wierszy. Zapis jest jednym wielowierszowym
 * INSERT-em; `.returning` liczy realnie wstawione (konflikty się nie liczą),
 * więc powtórny zapłon (retry trasy) daje `written: 0`, nie duplikat.
 *
 * Świadomie BEZ transakcji: to jeden statement, a wołający (hook trasy) jest
 * best-effort i domyka się PO transakcji diagnozy — wciąganie go do niej
 * związałoby domknięcie diagnozy z awarią dodatku (§7 konstytucji: diagnoza >
 * placement).
 *
 * `threshold` jest parametrem z wartością domyślną i LĄDUJE W KAŻDYM WIERSZU
 * jako wartość obowiązująca W CHWILI ZAPISU — nigdy nie jest odczytywany
 * z konfiguracji przy czytaniu wiersza. Podniesienie progu do 4 nie może
 * przepisać historii (DECYZJA 2 Sophii, środek 7 macierzy RLS v0.32).
 */
export async function recordPlacementForDiagnosis(params: {
	studentId: string;
	tenantId: string;
	assessmentSessionId: string;
	pathKey: string;
	diagnosis: PlacementDiagnosis;
	threshold?: CompetencyLevel;
}): Promise<PlacementWriteResult> {
	const threshold = params.threshold ?? DEFAULT_PLACEMENT_THRESHOLD;

	const ladder = await loadPlacementLadder(params.pathKey);
	const outcome = computePlacement({
		modules: ladder,
		diagnosis: params.diagnosis,
		threshold,
	});
	// Ścieżka bez drabiny (cel kariery spoza pilotażu DS) — nie ma czego liczyć.
	if (ladder.length === 0) return { unlockedSlugs: [], written: 0, outcome };

	const moduleIdBySlug = new Map(ladder.map((m) => [m.slug, m.moduleId]));
	const unlocked = outcome.modules.filter((m) => m.unlocked);
	if (unlocked.length === 0) {
		return { unlockedSlugs: [], written: 0, outcome };
	}

	const values = unlocked.map((verdict) => {
		const moduleId = moduleIdBySlug.get(verdict.slug);
		if (!moduleId) {
			// Nieosiągalne: werdykty pochodzą z tej samej drabiny co mapa.
			throw new PlacementTagResolutionError(
				`Werdykt dla modułu '${verdict.slug}' nie ma odpowiednika w drabinie — przerwane.`,
			);
		}
		if (verdict.reason !== "qualified" && verdict.reason !== "carried_untagged") {
			// Reguła L2 nie produkuje innych powodów dla modułu OTWARTEGO; gdyby
			// kiedyś zaczęła, CHECK bazy i tak odrzuci wiersz — łapiemy wcześniej,
			// z nazwą modułu, zamiast czytać błąd constraintu z logów.
			throw new PlacementTagResolutionError(
				`Moduł '${verdict.slug}' jest odblokowany, ale ma powód '${verdict.reason}' — ` +
					"nośnik odblokowania przyjmuje wyłącznie 'qualified' albo 'carried_untagged'.",
			);
		}
		// Tryb wsparcia BEZ wartości domyślnej (nota L3-N2 Leo). Reguła L2 (v0.3)
		// nigdy nie daje null dla modułu OTWARTEGO, więc `?? "full"` był martwy —
		// ale był też JEDYNĄ cichą ścieżką wpisania trybu, którego reguła NIE
		// policzyła. CHECK bazy tego nie złapie: `curriculum_placements_verdict_shape`
		// wiąże `support_mode` z powodem WYŁĄCZNIE na gałęzi 'carried_untagged';
		// dla 'qualified' przyjmuje 'full' i 'fading' obojętnie, bo nie widzi pary
		// (level, threshold). Zamiast domysłu — wyjątek z nazwą modułu, dokładnie
		// jak przy sprzecznym `reason` wyżej.
		if (verdict.supportMode === null) {
			throw new PlacementTagResolutionError(
				`Moduł '${verdict.slug}' jest odblokowany, ale reguła nie policzyła trybu wsparcia ` +
					"(supportMode === null). Nośnik odblokowania NIE zgaduje trybu: wpisanie 'full' " +
					"z domysłu przeszłoby CHECK bazy i utrwaliło wsparcie, którego reguła nie " +
					"orzekła — na wierszu, którego z założenia nie wolno potem poprawić (append-only).",
			);
		}
		return {
			studentId: params.studentId,
			tenantId: params.tenantId,
			moduleId,
			assessmentSessionId: params.assessmentSessionId,
			conceptSlug: verdict.conceptSlug,
			level: verdict.level,
			threshold: outcome.threshold,
			reason: verdict.reason,
			supportMode: verdict.supportMode,
			// Migawka wspólna dla całego zapisu: który moduł uciął prefiks tej sesji.
			blockingHoleSlug: outcome.blockingHoleSlug,
		};
	});

	try {
		const inserted = await db
			.insert(curriculumPlacements)
			.values(values)
			.onConflictDoNothing({
				target: [curriculumPlacements.studentId, curriculumPlacements.moduleId],
			})
			.returning({ id: curriculumPlacements.id });
		return { unlockedSlugs: outcome.unlockedSlugs, written: inserted.length, outcome };
	} catch (err) {
		// Bezpiecznik jak w enrollConcepts: gdyby ON CONFLICT rozminął się
		// z realnym UNIQUE przy wyścigu dwóch domknięć, 23505 (owinięty przez
		// Drizzle w `cause`) jest tu idempotentnym no-opem, nie 500 — moduł już
		// otwarty ma zostać otwarty na PIERWOTNYCH warunkach.
		if (isUniqueViolation(err)) {
			// ZALOGUJ ZADZIAŁANIE BEZPIECZNIKA (nota L3-N4 Leo). Bez tego wpisu
			// połknięcie 23505 jest NIEODRÓŻNIALNE od uczciwego „nic nowego": w obu
			// razach wracamy `written: 0` i PEŁNĄ listę `unlockedSlugs`. Przy zapisie
			// wielowierszowym jedno naruszenie przewraca CAŁĄ partię — wołający
			// dostaje wtedy listę odblokowań, których w bazie NIE MA, i (od L4) czyta
			// ten kontrakt jako stan drabiny. Rozbieżność ma zostawić ślad.
			logError("curriculum.placement.conflict", err, {
				studentId: params.studentId,
				batchRows: values.length,
			});
			return { unlockedSlugs: outcome.unlockedSlugs, written: 0, outcome };
		}
		throw err;
	}
}

/**
 * HOOK po domknięciu diagnozy — JEDYNY punkt wejścia dla trasy
 * `POST /api/assessment/[id]/complete` (wzorzec 1E.4 R5 `enroll-hook.ts`).
 *
 * ⚠ BRAMKA FLAGI JEST W MIEJSCU WYWOŁANIA, nie tutaj. Ten hook zakłada, że
 * wołający sprawdził `isFeatureEnabled("placementDiagnostic")` JAKO OSTATNI,
 * zwierający warunek — przy fladze OFF hook NIGDY nie jest wołany, więc ZERO
 * dodatkowych zapytań i odpowiedź trasy jest bajt-w-bajt jak dziś.
 *
 * ⚠ BEST-EFFORT: wołający opakowuje to w `.catch(logError)`. Placement jest
 * DODATKIEM — jego awaria nie może wywrócić studentowi domknięcia diagnozy
 * (wynik diagnozy > placement). Idempotencja (ON CONFLICT DO NOTHING) czyni
 * ponowny zapłon bezpiecznym.
 *
 * Cel kariery bez wpisu w mapie ścieżek (`pathKeyForCareerGoal`) = curriculum
 * nie obejmuje tej ścieżki → cicho `null`, zero zapytań o drabinę. To NIE jest
 * błąd: pilotaż ADR-014 D10 obejmuje wyłącznie Data Science.
 */
export async function recordPlacementOnDiagnosisComplete(
	student: { id: string; tenantId: string; careerGoal: string | null },
	assessmentSessionId: string,
	diagnosis: PlacementDiagnosis,
): Promise<PlacementWriteResult | null> {
	const pathKey = student.careerGoal ? pathKeyForCareerGoal(student.careerGoal) : null;
	if (!pathKey) return null;

	return recordPlacementForDiagnosis({
		studentId: student.id,
		tenantId: student.tenantId,
		assessmentSessionId,
		pathKey,
		diagnosis,
	});
}
