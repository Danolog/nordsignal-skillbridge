/**
 * 1E.1d (ADR-014 D3) — logika drabiny curriculum: statusy modułów i pozycji.
 *
 * Egzekwowanie prerekwizytów dzieje się TUTAJ (konsumowane przez API — 403
 * na zablokowany moduł dotyczy odczytu i zapisu), nie w UI. Statusy są
 * DERYWOWANE przy odczycie z `curriculum_module_progress` + łańcucha
 * prereq (zero zapisów na ścieżce odczytu); wiersze progress powstają
 * leniwie przy zdarzeniach ukończenia (answer/complete — 1E.1e).
 *
 * Reguła zaliczenia modułu w 1E.1 (hak pod 1E.3): wszystkie pozycje
 * completed → moduł completed (verified_by_method NULL). Po 1E.3 warunkiem
 * stanie się egzamin (parametry w curriculum_modules.exam_config_json).
 *
 * Odczyt owner-side (serwer liczy dla właściciela sesji; RLS chroni role app_*).
 *
 * ── 1E.7 L4: DRABINA HONORUJE PLACEMENT ────────────────────────────────────
 * Moduł z wierszem w `curriculum_placements` jest odblokowany BEZ zaliczania
 * prerekwizytów — to jest cały skutek funkcji „diagnoza OTWIERA". Wiersze
 * pisze wyłącznie hook po domknięciu diagnozy (`placement-service.ts`), a ich
 * zbiór to prefiks 2…k z reguły L2 **minus moduły już zaliczone** (W-6), więc
 * drabina nie liczy tu żadnej reguły od nowa — tylko czyta werdykt zapisany
 * w chwili odblokowania.
 *
 * ⚠ ZBIÓR MODUŁÓW OTWARTYCH NA DRABINIE JEST SZERSZY NIŻ `unlockedSlugs`.
 * Gdy najgłębszym modułem spełniającym warunek jest moduł ZALICZONY (W-7
 * wyznacza na nim k), to moduł k+1 otwiera się zwykłym łańcuchem — jego
 * prerekwizyt jest zaliczony — a nie placementem. To normalna semantyka
 * drabiny sprzed 1E.7. Skutek dla L6: `unlockedSlugs` wolno opisywać wyłącznie
 * jako „co otworzyła DIAGNOZA", NIGDY jako stan drabiny.
 *
 * ⚠ ODBLOKOWANY MODUŁ NIE SPEŁNIA PREREKWIZYTU NASTĘPNEGO. Naiwne brzmienie
 * „prereq spełniony ⟺ zaliczony LUB odblokowany placementem" psuje regułę
 * z DWÓCH stron naraz: (a) na dole — prerekwizytem `f1-python-1` jest korzeń
 * `l0-start`, który z mocy DECYZJI 3 NIGDY nie dostaje wiersza, więc f1 nie
 * otworzyłby się nikomu; (b) na górze — moduł na pozycji k+1 miałby spełniony
 * prereq (bo moduł k jest OTWARTY, choć nie zaliczony) i prefiks wyciekłby
 * o jeden moduł poza to, co policzyła reguła. Ochrona prefiksowa jest głównym
 * mechanizmem bezpieczeństwa DROGI DIAGNOZY (DECYZJA 5) — nie drabiny jako
 * całości: `POST /api/exam/start` (1E.3) NIE sprawdza odblokowania modułu,
 * więc „test out" jest z założenia obejściem prefiksu i tak ma być (§7
 * konstytucji — zaliczenie modułu to ocena formująca). Przesunięcie prefiksu
 * o moduł to mimo to nie kosmetyka: obchodzi się go zdanym egzaminem, nie
 * dwoma pytaniami diagnozy. Stąd: placement otwiera MODUŁ WPROST (`has(id)`),
 * a nie przez „zaliczanie" prerekwizytu.
 *
 * ⚠ TA SAMA REGUŁA MUSI STAĆ W OBU MIEJSCACH: `getLadder` (UI) i
 * `isModuleUnlocked` (API, 403). Rozjazd = moduł otwarty na ekranie i 403
 * przy wejściu. Parytet obu derywacji pilnuje test integracyjny
 * (`ladder-placement.integration.test.ts`), nie umowa.
 *
 * FLAGA: `placementDiagnostic` sprawdzana JAKO OSTATNI, ZWIERAJĄCY warunek —
 * przy OFF nie leci ANI JEDNO dodatkowe zapytanie, a derywacja jest
 * bajt-w-bajt jak przed L4 (wzorzec 1E.4 R5).
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	curriculumItemProgress,
	curriculumModuleItems,
	curriculumModulePrereqs,
	curriculumModuleProgress,
	curriculumModules,
	curriculumPathModules,
	curriculumPlacements,
} from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";

/** Pusty zbiór — jedna instancja dla ścieżki „flaga OFF" (zero alokacji). */
const BEZ_PLACEMENTU: ReadonlySet<string> = new Set<string>();

/**
 * Moduły otwarte studentowi placementem, spośród podanych (1E.7 L4).
 *
 * Zwraca pusty zbiór przy zgaszonej fladze — i robi to PRZED jakimkolwiek
 * zapytaniem, żeby inwariant „flaga OFF = zero zmian i zero dodatkowego ruchu
 * do bazy" był własnością kodu, a nie obietnicą w komentarzu.
 */
async function loadPlacementUnlockedModuleIds(
	studentId: string,
	moduleIds: readonly string[],
): Promise<ReadonlySet<string>> {
	if (moduleIds.length === 0 || !isFeatureEnabled("placementDiagnostic")) return BEZ_PLACEMENTU;
	const rows = await db
		.select({ moduleId: curriculumPlacements.moduleId })
		.from(curriculumPlacements)
		.where(
			and(
				eq(curriculumPlacements.studentId, studentId),
				inArray(curriculumPlacements.moduleId, [...moduleIds]),
			),
		);
	return new Set(rows.map((r) => r.moduleId));
}

export type ModuleStatus = "locked" | "available" | "in_progress" | "completed" | "coming_soon";

export type LadderModule = {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	position: number;
	status: ModuleStatus;
	verifiedByMethod: string | null;
	itemCount: number;
};

export type LadderItem = {
	id: string;
	position: number;
	kind: string;
	title: string;
	status: "locked" | "available" | "in_progress" | "completed" | "skipped_by_placement";
};

/** Drabina ścieżki z derywowanymi statusami modułów dla studenta. */
export async function getLadder(studentId: string, pathKey: string): Promise<LadderModule[]> {
	const pathModules = await db
		.select({
			id: curriculumModules.id,
			slug: curriculumModules.slug,
			title: curriculumModules.title,
			description: curriculumModules.description,
			position: curriculumPathModules.position,
		})
		.from(curriculumPathModules)
		.innerJoin(curriculumModules, eq(curriculumPathModules.moduleId, curriculumModules.id))
		.where(eq(curriculumPathModules.pathKey, pathKey))
		.orderBy(asc(curriculumPathModules.position));
	if (pathModules.length === 0) return [];

	const moduleIds = pathModules.map((m) => m.id);
	const [prereqs, progress, items, placementUnlocked] = await Promise.all([
		db
			.select({
				moduleId: curriculumModulePrereqs.moduleId,
				requiresModuleId: curriculumModulePrereqs.requiresModuleId,
			})
			.from(curriculumModulePrereqs)
			.where(inArray(curriculumModulePrereqs.moduleId, moduleIds)),
		db
			.select({
				moduleId: curriculumModuleProgress.moduleId,
				status: curriculumModuleProgress.status,
				verifiedByMethod: curriculumModuleProgress.verifiedByMethod,
			})
			.from(curriculumModuleProgress)
			.where(
				and(
					eq(curriculumModuleProgress.studentId, studentId),
					inArray(curriculumModuleProgress.moduleId, moduleIds),
				),
			),
		db
			.select({ id: curriculumModuleItems.id, moduleId: curriculumModuleItems.moduleId })
			.from(curriculumModuleItems)
			.where(inArray(curriculumModuleItems.moduleId, moduleIds)),
		// 1E.7 L4 — przy fladze OFF rozwiązuje się natychmiast pustym zbiorem,
		// bez zapytania (patrz `loadPlacementUnlockedModuleIds`).
		loadPlacementUnlockedModuleIds(studentId, moduleIds),
	]);

	const progressByModule = new Map(progress.map((p) => [p.moduleId, p]));
	const completedModules = new Set(
		progress.filter((p) => p.status === "completed").map((p) => p.moduleId),
	);
	const prereqsByModule = new Map<string, string[]>();
	for (const p of prereqs) {
		const list = prereqsByModule.get(p.moduleId) ?? [];
		list.push(p.requiresModuleId);
		prereqsByModule.set(p.moduleId, list);
	}
	const itemCountByModule = new Map<string, number>();
	for (const item of items) {
		itemCountByModule.set(item.moduleId, (itemCountByModule.get(item.moduleId) ?? 0) + 1);
	}

	return pathModules.map((m) => {
		const row = progressByModule.get(m.id);
		const itemCount = itemCountByModule.get(m.id) ?? 0;
		let status: ModuleStatus;
		if (row?.status === "completed") {
			status = "completed";
		} else {
			const required = prereqsByModule.get(m.id) ?? [];
			// 1E.7 L4: prerekwizyty ALBO wprost otwarty placementem. Przy fladze OFF
			// zbiór jest pusty, więc derywacja jest identyczna jak przed L4.
			const unlocked =
				required.every((req) => completedModules.has(req)) || placementUnlocked.has(m.id);
			// Bezpiecznik z przeglądu: moduł bez pozycji NIE jest „available" —
			// jest niekompletowalny (treść w drodze, 1E.2). UI nie zbuduje się
			// na fałszywym „dostępny", a drabina mówi prawdę.
			status = unlocked
				? itemCount === 0
					? "coming_soon"
					: row?.status === "in_progress"
						? "in_progress"
						: "available"
				: "locked";
		}
		return {
			id: m.id,
			slug: m.slug,
			title: m.title,
			description: m.description,
			position: m.position,
			status,
			verifiedByMethod: row?.verifiedByMethod ?? null,
			itemCount,
		};
	});
}

/**
 * 1E.6a — liczba pozycji ZALICZONYCH per moduł (completed + skipped_by_placement,
 * bo skipped liczy się jak zaliczona dla sekwencji — D3/D8). Konsument: pasek
 * postępu na drabinie. Odczyt owner-side, bez zapisów.
 */
export async function getCompletedItemCounts(
	studentId: string,
	moduleIds: string[],
): Promise<Map<string, number>> {
	const counts = new Map<string, number>();
	if (moduleIds.length === 0) return counts;
	const rows = await db
		.select({
			moduleId: curriculumModuleItems.moduleId,
			status: curriculumItemProgress.status,
		})
		.from(curriculumItemProgress)
		.innerJoin(curriculumModuleItems, eq(curriculumItemProgress.itemId, curriculumModuleItems.id))
		.where(
			and(
				eq(curriculumItemProgress.studentId, studentId),
				inArray(curriculumModuleItems.moduleId, moduleIds),
				inArray(curriculumItemProgress.status, ["completed", "skipped_by_placement"]),
			),
		);
	for (const row of rows) {
		counts.set(row.moduleId, (counts.get(row.moduleId) ?? 0) + 1);
	}
	return counts;
}

/**
 * Czy moduł jest odblokowany dla studenta (completed też = odblokowany).
 * Twarde egzekwowanie prereq w API: false ⇒ trasa zwraca 403 na odczyt i zapis.
 *
 * ⚠ BLIŹNIAK `getLadder`: ta funkcja odpowiada na to samo pytanie po stronie
 * API, co derywacja statusu po stronie UI. Zmiana reguły w jednym miejscu bez
 * drugiego daje moduł otwarty na ekranie i 403 przy wejściu — dlatego warunek
 * placementu (1E.7 L4) stoi w OBU i jest pilnowany testem parytetu.
 */
export async function isModuleUnlocked(studentId: string, moduleId: string): Promise<boolean> {
	const [required, own, placementUnlocked] = await Promise.all([
		db
			.select({ requiresModuleId: curriculumModulePrereqs.requiresModuleId })
			.from(curriculumModulePrereqs)
			.where(eq(curriculumModulePrereqs.moduleId, moduleId)),
		db
			.select({ status: curriculumModuleProgress.status })
			.from(curriculumModuleProgress)
			.where(
				and(
					eq(curriculumModuleProgress.studentId, studentId),
					eq(curriculumModuleProgress.moduleId, moduleId),
				),
			),
		// 1E.7 L4 — przy fladze OFF: pusty zbiór bez zapytania.
		loadPlacementUnlockedModuleIds(studentId, [moduleId]),
	]);
	if (own[0]?.status === "completed") return true;
	// 1E.7 L4: moduł otwarty diagnozą wchodzi BEZ zaliczonych prerekwizytów —
	// dokładnie to znaczy „diagnoza OTWIERA". Zaliczeniem to nie jest: student
	// nadal musi przejść moduł albo zdać egzamin, żeby cokolwiek się zaliczyło.
	if (placementUnlocked.has(moduleId)) return true;
	if (required.length === 0) return true;
	const requiredIds = required.map((r) => r.requiresModuleId);
	const done = await db
		.select({ moduleId: curriculumModuleProgress.moduleId })
		.from(curriculumModuleProgress)
		.where(
			and(
				eq(curriculumModuleProgress.studentId, studentId),
				inArray(curriculumModuleProgress.moduleId, requiredIds),
				eq(curriculumModuleProgress.status, "completed"),
			),
		);
	return done.length === requiredIds.length;
}

/**
 * Pozycje modułu z derywowanymi statusami (sekwencja: k+1 dostępna po
 * ukończeniu k; `skipped_by_placement` liczy się jak ukończona dla sekwencji,
 * ale NIE jest dowodem — D3/D8).
 */
export async function getModuleItems(studentId: string, moduleId: string): Promise<LadderItem[]> {
	const items = await db
		.select({
			id: curriculumModuleItems.id,
			position: curriculumModuleItems.position,
			kind: curriculumModuleItems.kind,
			title: curriculumModuleItems.title,
		})
		.from(curriculumModuleItems)
		.where(eq(curriculumModuleItems.moduleId, moduleId))
		.orderBy(asc(curriculumModuleItems.position));
	if (items.length === 0) return [];

	const progress = await db
		.select({ itemId: curriculumItemProgress.itemId, status: curriculumItemProgress.status })
		.from(curriculumItemProgress)
		.where(
			and(
				eq(curriculumItemProgress.studentId, studentId),
				inArray(
					curriculumItemProgress.itemId,
					items.map((i) => i.id),
				),
			),
		);
	const statusByItem = new Map(progress.map((p) => [p.itemId, p.status]));

	let previousDone = true; // pierwsza pozycja modułu jest dostępna z automatu
	return items.map((item) => {
		const stored = statusByItem.get(item.id);
		const done = stored === "completed" || stored === "skipped_by_placement";
		let status: LadderItem["status"];
		if (done) {
			status = stored as LadderItem["status"];
		} else if (previousDone) {
			status = stored === "in_progress" ? "in_progress" : "available";
		} else {
			status = "locked";
		}
		previousDone = done;
		return { ...item, status };
	});
}
