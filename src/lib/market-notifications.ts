// ============================================================================
// AG.6 — POWIADOMIENIA „NOWA LUKA" (kanał in-app, decyzja Darka 2026-07-08).
//
// Konsumuje zdarzenia `market_new_gap_events` produkowane przez recompute
// (AG.5): nieprzeczytane = notified_at IS NULL. Bramkowanie dwustopniowe:
//   1. flaga `marketGapNotifications` (deploy ≠ release, niezależna od flagi
//      potoku rynku — UI studenta zapala się osobno od strony operacyjnej),
//   2. zgoda RODO studenta (opt-in; students.market_monitoring_consent) —
//      bramkuje WYŁĄCZNIE pokazywanie powiadomień; recompute luk to rdzeń
//      usługi i działa niezależnie od zgody.
//
// Odczyt przez withTenantContext (rola app_student — RLS student_sees_own,
// grant SELECT z migracji 0025). Zapisy (zgoda, notified_at) robią trasy API
// owner-side — zgodnie z komentarzem w 0025 („AG.6 oznaczy notified_at też
// jako owner").
// ============================================================================

import { and, desc, eq, isNull } from "drizzle-orm";
import { marketNewGapEvents } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";
import { isFeatureEnabled } from "@/lib/flags";

export type MarketGapNotification = {
	id: string;
	competencyName: string;
	priority: string;
	marketPercentage: number;
	/** ISO string — serializowalne w propsach server → client component. */
	createdAt: string;
};

export type MarketNotificationsState = {
	/** Flaga marketGapNotifications — false = feature nie istnieje dla UI. */
	enabled: boolean;
	/** Czy student podjął już decyzję o zgodzie (false = pokaż kartę opt-in). */
	decided: boolean;
	/** Aktualna zgoda (ma znaczenie tylko gdy decided). */
	consent: boolean;
	/** Nieprzeczytane zdarzenia — TYLKO gdy enabled && consent, inaczej []. */
	notifications: MarketGapNotification[];
};

const EMPTY_DISABLED: MarketNotificationsState = {
	enabled: false,
	decided: false,
	consent: false,
	notifications: [],
};

type StudentForNotifications = {
	id: string;
	tenantId: string;
	marketMonitoringConsent: boolean;
	marketMonitoringDecidedAt: Date | null;
};

/**
 * Stan powiadomień dla dashboardu studenta. Zapytanie o zdarzenia leci tylko
 * przy flaga ON + zgoda ON (bez zgody nie dotykamy danych monitoringu — RODO).
 */
export async function getMarketNotificationsState(
	student: StudentForNotifications,
	userId: string,
): Promise<MarketNotificationsState> {
	if (!isFeatureEnabled("marketGapNotifications")) return EMPTY_DISABLED;

	const decided = student.marketMonitoringDecidedAt !== null;
	const consent = decided && student.marketMonitoringConsent;
	if (!consent) return { enabled: true, decided, consent: false, notifications: [] };

	const events = await withTenantContext(
		{ userId, tenantId: student.tenantId, role: "student" },
		(tx) =>
			tx
				.select({
					id: marketNewGapEvents.id,
					competencyName: marketNewGapEvents.competencyName,
					priority: marketNewGapEvents.priority,
					marketPercentage: marketNewGapEvents.marketPercentage,
					createdAt: marketNewGapEvents.createdAt,
				})
				.from(marketNewGapEvents)
				.where(
					and(eq(marketNewGapEvents.studentId, student.id), isNull(marketNewGapEvents.notifiedAt)),
				)
				.orderBy(desc(marketNewGapEvents.createdAt)),
	);

	return {
		enabled: true,
		decided: true,
		consent: true,
		notifications: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
	};
}
