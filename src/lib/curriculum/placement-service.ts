// ============================================================================
// 1E.7 (SLICE L3 + L4) — warstwa serwisowa placementu: spina CZYSTĄ regułę L2
// (`placement.ts` — 0 DB) z bazą. Cztery kroki i ani jednego więcej:
//   1. wczytaj drabinę ścieżki i ROZWIĄŻ tag uuid → slug konceptu (+ nazwę
//      kompetencji) JEDNYM złączeniem oraz zbiór modułów ZALICZONYCH (§6c),
//   2. policz werdykt regułą L2 (`computePlacement`),
//   3. zapisz ZDARZENIE MIERNIKA do `audit_log` — przy KAŻDYM policzeniu,
//      także zerowym (P-1, DECYZJA 2 „Nośnik drugiej strony asymetrii"),
//   4. zapisz PEŁNY werdykt modułów OTWARTYCH do `curriculum_placements`
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
// ── ZDARZENIE MIERNIKA PRZY KAŻDYM POLICZENIU (P-1, L4) ───────────────────
// Wiersz w `curriculum_placements` powstaje TYLKO wtedy, gdy coś się otworzyło,
// więc sesja, w której placement nie otworzył NIC — najczystszy przypadek
// niedoszacowania, jaki istnieje — nie zostawiała żadnego śladu. Same zdarzenia
// „zero odblokowań" też nie wystarczą: bez zdarzeń „coś się otworzyło" NIE MA
// MIANOWNIKA i nie da się odróżnić „placement nie odpala się nigdy" od „odpala
// się zwykle, ale ta grupa wypadła słabo". Dlatego zdarzenie leci ZAWSZE,
// niezależnie od wyniku (wolumen: jedno na diagnozę).
//
// ── CZEGO TEN MODUŁ NIE ROBI ──────────────────────────────────────────────
//  • nie rozstrzyga exam/test_out (L5), nie renderuje niczego (L6),
//  • nie zapala flagi i nie sprawdza jej — bramka jest w MIEJSCU WYWOŁANIA
//    (trasa), wzorzec 1E.4 R5 (`enroll-hook.ts`).
// ============================================================================

import { and, asc, eq, inArray } from "drizzle-orm";
import type { CompetencyLevel } from "@/lib/assessment/types";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/pg-error";
import {
	curriculumModuleProgress,
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
 * Slugi modułów ZALICZONYCH przez studenta w obrębie tej drabiny (§6c, W-6/W-7).
 *
 * Źródło: `curriculum_module_progress.status = 'completed'` — ta sama kolumna,
 * którą czyta drabina (`ladder.ts`), więc „zaliczony" znaczy w placemencie
 * dokładnie to samo, co na ekranie studenta. Zawężone `inArray` do modułów tej
 * ścieżki: student może mieć postęp na innej ścieżce, a reguła i tak by go
 * zignorowała — nie ma po co go ciągnąć.
 *
 * ⚠ Rozróżnienie exam/test_out NIE jest tu robione (L5). Dla W-6/W-7 liczy się
 * sam fakt zaliczenia, niezależnie od drogi: każda z nich jest instrumentem
 * mocniejszym niż dwa pytania diagnozy.
 */
async function loadCompletedModuleSlugs(
	studentId: string,
	ladder: readonly LadderRow[],
): Promise<string[]> {
	if (ladder.length === 0) return [];
	const slugById = new Map(ladder.map((m) => [m.moduleId, m.slug]));
	const rows = await db
		.select({ moduleId: curriculumModuleProgress.moduleId })
		.from(curriculumModuleProgress)
		.where(
			and(
				eq(curriculumModuleProgress.studentId, studentId),
				eq(curriculumModuleProgress.status, "completed"),
				inArray(curriculumModuleProgress.moduleId, [...slugById.keys()]),
			),
		);
	return rows.map((r) => slugById.get(r.moduleId)).filter((s): s is string => s !== undefined);
}

/**
 * ZDARZENIE MIERNIKA (P-1) — jedno na każde policzenie placementu, także zerowe.
 *
 * Odpowiada na trzy pytania Sophii BEZ łączenia z czymkolwiek innym:
 *  1. jak często placement odpala → `unlockedCount` (w tym 0),
 *  2. gdzie się zatrzymuje → `blockingHoleSlug` + obowiązujący `threshold`,
 *  3. czy student był daleko, czy o włos → `blockingHoleLevel`. Ta jedna liczba
 *     jest nośna: poziom 1 potwierdza regułę, a ŚCIANA poziomów 2 na tym samym
 *     module znaczy, że nasze pytanie o trudności 2 jest za trudne — wtedy
 *     naprawiamy BANK, nie próg. Bez niej oba przypadki wyglądają identycznie.
 *
 * `blockingHoleReason` dokłada rozróżnienie, którego sam poziom nie niesie:
 * `below_threshold` („zmierzyliśmy, wypadł słabo") kontra `uncovered` /
 * `no_measurement` („w ogóle nie badaliśmy") — to dwie różne naprawy (bank
 * kontra domyślny zestaw kompetencji w onboardingu, §6a).
 *
 * `alreadyCompletedCount` odróżnia zero odblokowań u kogoś, kto ma drabinę
 * zdaną, od zera u kogoś, kto nic nie umie. Bez tego pola oba stany są w danych
 * nierozróżnialne, a znaczą coś przeciwnego.
 *
 * MINIMALIZACJA (art. 5 ust. 1 lit. c): wychodzi JEDEN poziom — dla konceptu
 * blokującego — a nie mapa poziomów. Nie jest to nowa kategoria danych: leży
 * już w `result_json` tej samej sesji (ustalenie Sophii/Ryana, v0.4).
 *
 * `recordAudit` jest best-effort (połyka własny błąd), a zdarzenie leci PRZED
 * zapisem odblokowań — celowo: jeśli zapis padnie, miernik ma zachować ślad
 * tego, co reguła policzyła. Odwrotna kolejność gubiłaby pomiar dokładnie
 * w sesjach, które najbardziej wymagają wyjaśnienia.
 */
async function recordPlacementMetricEvent(params: {
	studentId: string;
	assessmentSessionId: string;
	pathKey: string;
	ladderSize: number;
	outcome: PlacementOutcome;
}): Promise<void> {
	const { outcome } = params;
	const hole = outcome.blockingHoleSlug
		? (outcome.modules.find((m) => m.slug === outcome.blockingHoleSlug) ?? null)
		: null;
	await recordAudit({
		actorType: "student",
		actorId: params.studentId,
		// ⚠ NIE MYLIĆ z `placement.consent.*` (1.17 — placement ZAWODOWY, inna
		// klasa danych i inna podstawa prawna). Prefiks `curriculum.` jest tu
		// jedyną rzeczą, która trzyma te dwa światy osobno w jednym `audit_log`.
		action: "curriculum.placement.computed",
		targetType: "assessment_session",
		targetId: params.assessmentSessionId,
		metadata: {
			pathKey: params.pathKey,
			threshold: outcome.threshold,
			ladderSize: params.ladderSize,
			unlockedCount: outcome.unlockedSlugs.length,
			prefixEndPosition: outcome.prefixEndPosition,
			alreadyCompletedCount: outcome.alreadyCompletedSlugs.length,
			blockingHoleSlug: outcome.blockingHoleSlug,
			blockingHoleConceptSlug: hole?.conceptSlug ?? null,
			blockingHoleLevel: hole?.level ?? null,
			blockingHoleReason: hole?.reason ?? null,
		},
	});
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
	// §6c — zbiór zaliczeń MUSI być policzony przed regułą: bez niego moduł zdany
	// egzaminem robi dziurę w prefiksie (W-7), a przy okazji dostaje wiersz
	// „diagnoza otworzyła ci moduł, który sam zdałeś na ≈90%" (W-6).
	const completedModuleSlugs = await loadCompletedModuleSlugs(params.studentId, ladder);
	const outcome = computePlacement({
		modules: ladder,
		diagnosis: params.diagnosis,
		completedModuleSlugs,
		threshold,
	});

	// P-1: zdarzenie miernika PRZY KAŻDYM policzeniu — także gdy nic się nie
	// otworzyło i także dla ścieżki bez drabiny (`ladderSize: 0` odróżnia błąd
	// konfiguracji od słabego wyniku, zamiast zlewać oba w ciszę).
	await recordPlacementMetricEvent({
		studentId: params.studentId,
		assessmentSessionId: params.assessmentSessionId,
		pathKey: params.pathKey,
		ladderSize: ladder.length,
		outcome,
	});

	// Ścieżka bez drabiny (cel kariery spoza pilotażu DS) — nie ma czego liczyć.
	if (ladder.length === 0) return { unlockedSlugs: [], written: 0, outcome };

	const moduleIdBySlug = new Map(ladder.map((m) => [m.slug, m.moduleId]));
	// `m.unlocked` NIGDY nie obejmuje modułu zaliczonego (W-6 jest niezmiennikiem
	// czystej reguły, nie filtrem tutaj) — dodatkowe odsiewanie w tym miejscu
	// byłoby drugą prawdą o tym samym i mogłoby się z regułą rozjechać.
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
