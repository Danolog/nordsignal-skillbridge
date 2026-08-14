import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { logError } from "@/lib/log";

// ============================================================================
// A3 (ADR A-1, kierunek (a+), Ryan v0.4 §1) — JEDEN NOŚNIK REGUŁY.
//
// Reguła brzmi: „zdarzenie, w którym działającym jest student albo system,
// nie niesie ani identyfikatora aktora, ani kontekstu żądania (adres IP,
// sygnatura przeglądarki)". Ma konsekwencję zewnętrzną — decyduje o tym, co
// trafia do bazy i czy da się wykonać art. 17 RODO — więc wg CLAUDE.md v1.17
// żyje w DOKŁADNIE JEDNYM miejscu: w tabeli `REGULA_AKTORA` poniżej.
//
// Miejsca wywołania reguły NIE POWTARZAJĄ — są przez nią PRZYMUSZONE: typ
// `AuditEntry` jest wyprowadzony z tej tabeli mapowaniem, więc dopisanie
// `actorId` przy `actorType: "student"` nie kompiluje się. Zmiana wiersza
// w tabeli automatycznie zmienia typ we wszystkich 20 miejscach wywołania.
//
// Dlaczego akurat taki podział (ADR §1, tabela „Kształt A3"):
//   student   — podmiot danych; wiązanie z osobą idzie WYŁĄCZNIE przez
//               `targetId` wskazujący na tabelę kasowaną kaskadą (wzorzec A7),
//               więc po usunięciu konta wiersz zostaje sierotą (motyw 26 RODO).
//   system    — „system" nie ma tożsamości; dziś te zdarzenia wyzwala żądanie
//               studenta i niosły JEGO identyfikator — wada taksonomii, nie
//               tylko RODO. Po A1/A3 sprzeczność znika sama.
//   anonymous — nieudane logowania: adres IP jest tu JEDYNYM sygnałem wykrycia
//               ataku siłowego, a nie ma konta do skasowania. Kontekst zostaje,
//               identyfikator i tak nie istnieje.
//   faculty / operator — klasa 2 ADR §3.2: `actorId` to identyfikator SESJI,
//               nie osoby (hasło współdzielone per kampus). Świadomie poza
//               zakresem A-1, z trzema progami powrotu u Ryana.
// ============================================================================

/**
 * JEDYNY NOŚNIK reguły A1+A2. Każda inna warstwa (typ `AuditEntry`, strażnicy
 * S-A1-1…S-A1-4) czyta stąd — nikt tego nie przepisuje.
 *
 * `actorId: false`         → pola `actorId` NIE WOLNO podać.
 * `kontekstZadania: false` → pól `ipAddress` / `userAgent` NIE WOLNO podać.
 */
export const REGULA_AKTORA = {
	student: { actorId: false, kontekstZadania: false },
	system: { actorId: false, kontekstZadania: false },
	anonymous: { actorId: false, kontekstZadania: true },
	faculty: { actorId: true, kontekstZadania: true },
	operator: { actorId: true, kontekstZadania: true },
} as const;

export type AuditActorType = keyof typeof REGULA_AKTORA;

/** Pola wspólne — niezależne od tego, kto jest działającym. */
interface AuditEntryBase {
	action: string;
	targetType?: string | null;
	targetId?: string | null;
	metadata?: Record<string, unknown> | null;
}

/**
 * `?: never` zamiast pominięcia pola — dzięki temu dopisanie `actorId` jest
 * BŁĘDEM KOMPILACJI, a nie po cichu tolerowaną nadmiarową właściwością
 * (nadmiarowe właściwości w unii są sprawdzane przeciw sumie wszystkich
 * wariantów, więc samo pominięcie nic by nie dało).
 */
type PoleAktora<T extends AuditActorType> = (typeof REGULA_AKTORA)[T]["actorId"] extends true
	? { actorId?: string | null }
	: { actorId?: never };

type PolaKontekstuZadania<T extends AuditActorType> =
	(typeof REGULA_AKTORA)[T]["kontekstZadania"] extends true
		? { ipAddress?: string | null; userAgent?: string | null }
		: { ipAddress?: never; userAgent?: never };

/**
 * Typ sumy z rozróżnikiem na `actorType` — wyprowadzony z `REGULA_AKTORA`,
 * nie napisany ręcznie obok niej (to byłby drugi nośnik tej samej reguły).
 */
export type AuditEntry = {
	[T in AuditActorType]: AuditEntryBase & { actorType: T } & PoleAktora<T> &
		PolaKontekstuZadania<T>;
}[AuditActorType];

/**
 * Wykonawca zapisu — uchwyt bazy albo uchwyt TRANSAKCJI. Węższy niż cały typ
 * `db`: potrzebujemy wyłącznie `insert(...).values(...)`, a im węższy typ, tym
 * mniej powodów, by ktoś przekazał tu coś innego.
 */
type WykonawcaZapisu = Pick<typeof db, "insert">;

/**
 * D-U7 (E1b §4, warunek W2 Sophii) — DOWÓD NIE MOŻE ZNIKNĄĆ CISZEJ NIŻ TO,
 * CO POŚWIADCZA.
 *
 * Domyślnie (bez `tx`) zapis jest best-effort: awaria śladu NIE MOŻE blokować
 * pracy studenta i tak zostaje w 19 z 20 miejsc wywołania.
 *
 * Z `tx` zapis idzie W TEJ SAMEJ TRANSAKCJI co poświadczana rzecz, a błąd
 * PROPAGUJE — czyli brak dowodu wywraca kredencjał. Nie jest to wybór stylu:
 * semantyka „best-effort” jest WEWNĄTRZ transakcji Postgresa NIEWYKONALNA —
 * nieudany `INSERT` przerywa transakcję, a połknięcie wyjątku sprawia, że każde
 * kolejne zdanie i tak padnie („current transaction is aborted”). Wybór jest
 * binarny: albo dowód jest warunkiem kredencjału, albo jest poza transakcją.
 *
 * JEDNA FUNKCJA, JEDNO MIEJSCE BUDOWY WIERSZA. Osobne `recordAuditTx`
 * z powieloną budową byłoby drugim nośnikiem reguły „jak wygląda wiersz
 * audytu” (CLAUDE.md v1.17), a rozjazd między nimi jest dokładnie tą klasą
 * wady, którą naprawia dług A-1. Różni się wyłącznie WYKONAWCA i POLITYKA
 * BŁĘDU — nie kształt wiersza.
 */
export async function recordAudit(
	entry: AuditEntry,
	opts?: { tx?: WykonawcaZapisu },
): Promise<void> {
	const wykonawca = opts?.tx ?? db;
	const wartosci = {
		actorType: entry.actorType,
		actorId: entry.actorId ?? null,
		action: entry.action,
		targetType: entry.targetType ?? null,
		targetId: entry.targetId ?? null,
		ipAddress: entry.ipAddress ?? null,
		userAgent: entry.userAgent ?? null,
		metadata: entry.metadata ?? null,
	};

	if (opts?.tx) {
		// Bez `try` — błąd MA wywrócić transakcję wywołującego.
		await wykonawca.insert(auditLog).values(wartosci);
		return;
	}

	try {
		await wykonawca.insert(auditLog).values(wartosci);
	} catch (err) {
		logError("audit.write", err, { action: entry.action });
	}
}

export function auditContextFromRequest(req: Request): {
	ipAddress: string | null;
	userAgent: string | null;
} {
	const ipAddress =
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		req.headers.get("x-real-ip") ??
		null;
	const userAgent = req.headers.get("user-agent") ?? null;
	return { ipAddress, userAgent };
}
