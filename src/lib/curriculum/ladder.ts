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
} from "@/lib/db/schema";

export type ModuleStatus = "locked" | "available" | "in_progress" | "completed";

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
	const [prereqs, progress, items] = await Promise.all([
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
		let status: ModuleStatus;
		if (row?.status === "completed") {
			status = "completed";
		} else {
			const required = prereqsByModule.get(m.id) ?? [];
			const unlocked = required.every((req) => completedModules.has(req));
			status = unlocked ? (row?.status === "in_progress" ? "in_progress" : "available") : "locked";
		}
		return {
			id: m.id,
			slug: m.slug,
			title: m.title,
			description: m.description,
			position: m.position,
			status,
			verifiedByMethod: row?.verifiedByMethod ?? null,
			itemCount: itemCountByModule.get(m.id) ?? 0,
		};
	});
}

/**
 * Czy moduł jest odblokowany dla studenta (completed też = odblokowany).
 * Twarde egzekwowanie prereq w API: false ⇒ trasa zwraca 403 na odczyt i zapis.
 */
export async function isModuleUnlocked(studentId: string, moduleId: string): Promise<boolean> {
	const [required, own] = await Promise.all([
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
	]);
	if (own[0]?.status === "completed") return true;
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
