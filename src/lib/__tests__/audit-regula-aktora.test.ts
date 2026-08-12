// @vitest-environment node
//
// S-A1-1 — KONTROLA NEGATYWNA NA TYPIE (ADR A-1 (a+), Ryan v0.4 §5).
//
// Czego pilnuje: że reguły A1+A2 NIE DA SIĘ złamać w miejscu wywołania, bo kod
// się nie skompiluje. Reguły pilnuje tu KOMPILATOR, nie asercja — więc dowodem
// równoważnym mutacji jest przypadek, który się NIE KOMPILUJE (CLAUDE.md v1.17:
// „gdy mutacja jest fizycznie niewykonalna, dowodem równoważnym jest kontrola
// negatywna").
//
// JAK TO DZIAŁA. `@ts-expect-error` jest dyrektywą DWUSTRONNĄ: przechodzi tylko
// wtedy, gdy w następnej linii FAKTYCZNIE jest błąd. Jeśli ktoś rozluźni typ
// `AuditEntry`, błędu zabraknie i `tsc --noEmit` padnie komunikatem
// „Unused '@ts-expect-error' directive". Dlatego ten plik jest strażnikiem
// nawet wtedy, gdy vitest go w ogóle nie odpali — bramką jest `pnpm typecheck`.
//
// UWAGA DLA PRZEGLĄDAJĄCEGO: bloki poniżej NIE wołają `recordAudit` — to
// deklaracje typu. Żaden wiersz audytu z tego pliku nie powstaje.

import { describe, expect, it } from "vitest";
import { type AuditEntry, REGULA_AKTORA } from "@/lib/audit";

// ── 1. PRZYPADKI ZABRONIONE — każdy MUSI być błędem kompilacji ──────────────

// student: identyfikator aktora zabroniony (art. 5 ust. 1 lit. c — redundantny
// wobec targetId; dokładnie ten zapis tworzył dług A-1).
// @ts-expect-error A1: `actorId` zabronione dla actorType "student"
const _zlyStudentActorId: AuditEntry = {
	actorType: "student",
	action: "passport.share.enable",
	actorId: "s-1",
};

// student: kontekst żądania zabroniony. TO JEST ELEMENT NOŚNY PRAWNIE (A2) —
// strażnik sprawdzający wyłącznie `actorId` przepuściłby błąd ze sprostowania
// 0.3 Ryana: adres IP jest daną osobową (motyw 30 RODO; TSUE Breyer C-582/14),
// więc sam brak `actorId` niczego by nie zamknął.
// @ts-expect-error A2: `ipAddress` zabronione dla actorType "student"
const _zlyStudentIp: AuditEntry = {
	actorType: "student",
	action: "passport.share.enable",
	ipAddress: "203.0.113.7",
};

// @ts-expect-error A2: `userAgent` zabroniony dla actorType "student"
const _zlyStudentUa: AuditEntry = {
	actorType: "student",
	action: "passport.share.enable",
	userAgent: "Mozilla/5.0",
};

// system: „system" nie ma tożsamości — a dziś te zdarzenia wyzwala żądanie
// studenta i niosły JEGO identyfikator (anomalia taksonomii, ADR D-3).
// @ts-expect-error A1: `actorId` zabronione dla actorType "system"
const _zlySystemActorId: AuditEntry = {
	actorType: "system",
	action: "submission.verified",
	actorId: "s-1",
};

// @ts-expect-error A2: `ipAddress` zabronione dla actorType "system"
const _zlySystemIp: AuditEntry = {
	actorType: "system",
	action: "submission.verified",
	ipAddress: "203.0.113.7",
};

// anonymous: nie ma konta do skasowania, więc adres IP ZOSTAJE (jedyny sygnał
// ataku siłowego), ale identyfikatora aktora i tak nie ma czym wypełnić.
// @ts-expect-error A1: `actorId` zabronione dla actorType "anonymous"
const _zlyAnonymousActorId: AuditEntry = {
	actorType: "anonymous",
	action: "faculty.login.fail",
	actorId: "cokolwiek",
};

// ── 2. PRZYPADKI POPRAWNE — kontrola dwustronna ─────────────────────────────
// Bez tej połowy strażnik dałoby się „naprawić" typem, który odrzuca wszystko.

const _dobryStudent: AuditEntry = {
	actorType: "student",
	action: "passport.share.enable",
	targetType: "passports",
	targetId: "p-1",
	metadata: { consentVersion: "v1" },
};

const _dobrySystem: AuditEntry = {
	actorType: "system",
	action: "submission.verified",
	targetType: "submission",
	targetId: "sub-1",
};

const _dobryAnonymousZIp: AuditEntry = {
	actorType: "anonymous",
	action: "operator.login.fail",
	ipAddress: "203.0.113.7",
	userAgent: "Mozilla/5.0",
};

const _dobryFaculty: AuditEntry = {
	actorType: "faculty",
	action: "faculty.login.success",
	actorId: "sesja-1",
	ipAddress: "203.0.113.7",
	userAgent: "Mozilla/5.0",
};

const _dobryOperator: AuditEntry = {
	actorType: "operator",
	action: "submission.review.approved",
	actorId: "sesja-2",
	targetType: "submission",
	targetId: "sub-1",
};

// Kształt realnego wywołania z kolejki recenzenckiej: `actorType` jest UNIĄ
// wyliczaną w czasie działania. Gdyby unia rozłączna tego nie przyjmowała,
// trasy recenzenta przestałyby się kompilować — sprawdzamy jawnie, bo to
// najbardziej krucha konstrukcja w całym typie.
function wpisRecenzenta(rodzaj: "quality_operator" | "faculty"): AuditEntry {
	return {
		actorType: rodzaj === "quality_operator" ? "operator" : "faculty",
		actorId: "sesja-3",
		action: "submission.viva.answers_read",
		targetType: "submission",
		targetId: "sub-1",
	};
}
const _dobryRecenzentUnia = wpisRecenzenta("faculty");

describe("S-A1-1 · regula aktora audytu — kontrola negatywna na typie", () => {
	it("nosnik reguly ma dokladnie te piec wpisow, w tym ksztalcie", () => {
		// Nie duplikat reguły, tylko zamrożenie JEJ TREŚCI: gdyby ktoś przestawił
		// `student` na `actorId: true`, cały plik wyżej przestałby być błędem,
		// a `tsc` zapaliłby „Unused '@ts-expect-error' directive". Ten test dokłada
		// czytelny komunikat, żeby diagnoza nie zaczynała się od zagadki.
		expect(REGULA_AKTORA).toStrictEqual({
			student: { actorId: false, kontekstZadania: false },
			system: { actorId: false, kontekstZadania: false },
			anonymous: { actorId: false, kontekstZadania: true },
			faculty: { actorId: true, kontekstZadania: true },
			operator: { actorId: true, kontekstZadania: true },
		});
	});

	it("przypadki poprawne sa realnymi obiektami (kontrola dwustronna)", () => {
		// Bez tej asercji linter uznałby deklaracje wyżej za martwe i mógłby je
		// ktoś usunąć razem z połową strażnika.
		expect([
			_zlyStudentActorId,
			_zlyStudentIp,
			_zlyStudentUa,
			_zlySystemActorId,
			_zlySystemIp,
			_zlyAnonymousActorId,
			_dobryStudent,
			_dobrySystem,
			_dobryAnonymousZIp,
			_dobryFaculty,
			_dobryOperator,
			_dobryRecenzentUnia,
		]).toHaveLength(12);
	});
});
