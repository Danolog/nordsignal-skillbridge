import { describe, expect, it } from "vitest";
import {
	computeStreakWeeks,
	isStagnant,
	shouldShowStagnationAlert,
	startOfIsoWeekUtc,
} from "../engine";

/** 1.18 — silnik rytmu: czyste funkcje, zero I/O. */

const NOW = new Date("2026-07-10T12:00:00Z"); // piątek

function daysAgo(n: number): Date {
	return new Date(NOW.getTime() - n * 86_400_000);
}

describe("startOfIsoWeekUtc", () => {
	it("piątek → poniedziałek tego tygodnia (UTC)", () => {
		expect(startOfIsoWeekUtc(NOW).toISOString()).toBe("2026-07-06T00:00:00.000Z");
	});
	it("niedziela należy do MIJAJĄCEGO tygodnia (ISO), nie następnego", () => {
		expect(startOfIsoWeekUtc(new Date("2026-07-12T23:59:59Z")).toISOString()).toBe(
			"2026-07-06T00:00:00.000Z",
		);
	});
	it("poniedziałek 00:00 jest własnym początkiem tygodnia", () => {
		expect(startOfIsoWeekUtc(new Date("2026-07-06T00:00:00Z")).toISOString()).toBe(
			"2026-07-06T00:00:00.000Z",
		);
	});
});

describe("computeStreakWeeks", () => {
	it("zero śladów → 0", () => {
		expect(computeStreakWeeks([], NOW)).toBe(0);
	});
	it("aktywność tylko w bieżącym tygodniu → 1", () => {
		expect(computeStreakWeeks([daysAgo(1)], NOW)).toBe(1);
	});
	it("3 kolejne tygodnie z aktywnością → 3", () => {
		expect(computeStreakWeeks([daysAgo(1), daysAgo(8), daysAgo(15)], NOW)).toBe(3);
	});
	it("świeżo zaczęty tydzień BEZ aktywności nie zeruje streaku (kotwica = poprzedni)", () => {
		// Ślady w zeszłym i przedzeszłym tygodniu, nic w bieżącym.
		expect(computeStreakWeeks([daysAgo(6), daysAgo(13)], NOW)).toBe(2);
	});
	it("dziura tydzień wstecz przerywa serię (starsze tygodnie nie liczą się)", () => {
		// Aktywność bieżący tydzień + 3 tygodnie temu (dziura pośrodku) → 1.
		expect(computeStreakWeeks([daysAgo(1), daysAgo(22)], NOW)).toBe(1);
	});
	it("aktywność wyłącznie 2+ tygodnie temu → 0 (seria wygasła)", () => {
		expect(computeStreakWeeks([daysAgo(15)], NOW)).toBe(0);
	});
	it("wiele śladów w jednym tygodniu liczy się raz", () => {
		expect(computeStreakWeeks([daysAgo(1), daysAgo(2), daysAgo(3)], NOW)).toBe(1);
	});
});

describe("isStagnant", () => {
	it("brak śladów = zastój", () => {
		expect(isStagnant(null, NOW)).toBe(true);
	});
	it("ślad sprzed 6 dni → brak zastoju; sprzed 7 dni → zastój (próg domknięty)", () => {
		expect(isStagnant(daysAgo(6), NOW)).toBe(false);
		expect(isStagnant(daysAgo(7), NOW)).toBe(true);
	});
});

describe("shouldShowStagnationAlert (epizody bez tabeli zdarzeń)", () => {
	const base = { stagnant: true, optOut: false, lastActivityAt: daysAgo(10) };
	it("zastój + nigdy nie pokazany → pokaż", () => {
		expect(shouldShowStagnationAlert({ ...base, notifiedAt: null })).toBe(true);
	});
	it("dismiss w bieżącym epizodzie (notifiedAt PO ostatniej aktywności) → schowaj", () => {
		expect(shouldShowStagnationAlert({ ...base, notifiedAt: daysAgo(9) })).toBe(false);
	});
	it("nowa aktywność po dismissie otwiera nowy epizod → pokaż", () => {
		expect(
			shouldShowStagnationAlert({
				stagnant: true,
				optOut: false,
				notifiedAt: daysAgo(20),
				lastActivityAt: daysAgo(10),
			}),
		).toBe(true);
	});
	it("opt-out wygrywa ze wszystkim", () => {
		expect(shouldShowStagnationAlert({ ...base, optOut: true, notifiedAt: null })).toBe(false);
	});
	it("brak zastoju → nigdy", () => {
		expect(shouldShowStagnationAlert({ ...base, stagnant: false, notifiedAt: null })).toBe(false);
	});
});
