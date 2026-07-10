/**
 * 1.18 — stan rytmu dla server components („Moja droga" + karta na
 * dashboardzie): deklaracja, streak z realnych śladów, check-iny, alert
 * zastoju (leniwie — liczony przy każdym wejściu, zero cronów).
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { studyCheckins, studyRhythms } from "@/lib/db/schema";
import { getActivityTrace } from "@/lib/rhythm/activity";
import {
	computeStreakWeeks,
	isStagnant,
	shouldShowStagnationAlert,
	startOfIsoWeekUtc,
} from "@/lib/rhythm/engine";

export type RhythmState = {
	declaration: {
		hoursPerWeek: number;
		days: string[];
		activeProjectId: string | null;
		stagnationOptOut: boolean;
	} | null;
	streakWeeks: number;
	lastActivityAt: string | null;
	stagnant: boolean;
	showStagnationAlert: boolean;
	/** Czy bieżący tydzień ma już check-in (formularz przechodzi w edycję). */
	currentWeekCheckin: { hoursActual: number | null; note: string | null } | null;
	recentCheckins: Array<{
		weekStart: string;
		hoursActual: number | null;
		note: string | null;
	}>;
};

export async function getRhythmState(studentId: string, now = new Date()): Promise<RhythmState> {
	const [rhythm, checkins, trace] = await Promise.all([
		db.query.studyRhythms.findFirst({ where: eq(studyRhythms.studentId, studentId) }),
		db.query.studyCheckins.findMany({
			where: eq(studyCheckins.studentId, studentId),
			orderBy: [desc(studyCheckins.weekStart)],
			limit: 6,
		}),
		getActivityTrace(studentId),
	]);

	const streakWeeks = computeStreakWeeks(trace.dates, now);
	const stagnant = isStagnant(trace.lastActivityAt, now);
	const currentWeek = startOfIsoWeekUtc(now).getTime();
	const current = checkins.find((c) => c.weekStart.getTime() === currentWeek) ?? null;

	return {
		declaration: rhythm
			? {
					hoursPerWeek: rhythm.hoursPerWeek,
					days: (rhythm.days as string[]) ?? [],
					activeProjectId: rhythm.activeProjectId,
					stagnationOptOut: rhythm.stagnationOptOut,
				}
			: null,
		streakWeeks,
		lastActivityAt: trace.lastActivityAt?.toISOString() ?? null,
		stagnant,
		// Alert tylko przy ZADEKLAROWANYM rytmie (bez deklaracji nie ma umowy,
		// którą zastój by łamał) — roadmapa: „powiadomienia o zastoju" to część
		// accountability, nie ogólny nag.
		showStagnationAlert:
			rhythm !== undefined &&
			rhythm !== null &&
			shouldShowStagnationAlert({
				stagnant,
				optOut: rhythm.stagnationOptOut,
				notifiedAt: rhythm.stagnationNotifiedAt,
				lastActivityAt: trace.lastActivityAt,
			}),
		currentWeekCheckin: current ? { hoursActual: current.hoursActual, note: current.note } : null,
		recentCheckins: checkins.map((c) => ({
			weekStart: c.weekStart.toISOString(),
			hoursActual: c.hoursActual,
			note: c.note,
		})),
	};
}
