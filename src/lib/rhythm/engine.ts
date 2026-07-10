/**
 * 1.18 (C13) — silnik rytmu: CZYSTE funkcje (tygodnie ISO, streak, zastój).
 * Zero I/O — testowalne deterministycznie; źródło dat śladów dostarcza
 * activity.ts (jedno zapytanie UNION ALL po tabelach aktywności).
 *
 * Konwencja tygodnia: ISO (poniedziałek), liczona w UTC. Świadome
 * uproszczenie: student w Polsce późnym wieczorem w niedzielę (UTC+2) może
 * mieć aktywność policzoną do „następnego" tygodnia UTC — dla streaku
 * tygodniowego to przesunięcie o najwyżej jeden słupek, bez wpływu na
 * ciągłość (aktywność zawsze ląduje w JAKIMŚ tygodniu). Strefa per student
 * to temat na 1E, nie na Betę.
 */

/** Próg zastoju: dni bez żadnego śladu aktywności. */
export const STAGNATION_DAYS = 7;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Poniedziałek 00:00:00 UTC tygodnia ISO zawierającego `date`. */
export function startOfIsoWeekUtc(date: Date): Date {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const dow = d.getUTCDay(); // 0 = niedziela
	const offset = dow === 0 ? 6 : dow - 1;
	d.setUTCDate(d.getUTCDate() - offset);
	return d;
}

/**
 * Streak: liczba KOLEJNYCH tygodni ISO z ≥1 śladem aktywności, licząc od
 * tygodnia bieżącego albo poprzedniego (brak aktywności w świeżo zaczętym
 * tygodniu nie zeruje streaku — student ma tydzień na podtrzymanie; dopiero
 * dziura tydzień wstecz przerywa serię).
 */
export function computeStreakWeeks(activityDates: Date[], now: Date): number {
	if (activityDates.length === 0) return 0;
	const weeks = new Set(activityDates.map((d) => startOfIsoWeekUtc(d).getTime()));
	const currentWeek = startOfIsoWeekUtc(now).getTime();

	// Kotwica: bieżący tydzień, jeśli ma aktywność; inaczej poprzedni.
	let anchor = currentWeek;
	if (!weeks.has(anchor)) anchor = currentWeek - WEEK_MS;
	if (!weeks.has(anchor)) return 0;

	let streak = 0;
	for (let w = anchor; weeks.has(w); w -= WEEK_MS) streak += 1;
	return streak;
}

/** Zastój: ostatni ślad starszy niż STAGNATION_DAYS (brak śladów = zastój). */
export function isStagnant(lastActivityAt: Date | null, now: Date): boolean {
	if (!lastActivityAt) return true;
	return now.getTime() - lastActivityAt.getTime() >= STAGNATION_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Widoczność alertu zastoju (epizody bez tabeli zdarzeń):
 * pokazujemy gdy jest zastój, powiadomienia nie są wyłączone i bieżący
 * epizod nie został jeszcze zamknięty (dismiss). Nowa aktywność PO dismissie
 * otwiera nowy epizod (lastActivityAt > notifiedAt).
 */
export function shouldShowStagnationAlert(args: {
	stagnant: boolean;
	optOut: boolean;
	notifiedAt: Date | null;
	lastActivityAt: Date | null;
}): boolean {
	if (!args.stagnant || args.optOut) return false;
	if (args.notifiedAt === null) return true;
	return args.lastActivityAt !== null && args.lastActivityAt.getTime() > args.notifiedAt.getTime();
}
