// ============================================================================
// 1E.6b (ADR-015) — kontrakt checków labów: typy + DETERMINISTYCZNA ewaluacja
// po stronie serwera.
//
// Zasada: pieczątka w notebooku Colab liczy wartości w sesji studenta i wypisuje
// je jako ŁADUNEK tokenu. Serwer NIE UFA fladze „zaliczone" — bierze surowe
// wartości i **sam** sprawdza każdy check wg reguły z `configJson.checks`.
//
// Trzy klasy checków i ich UCZCIWA siła (ADR-015 §4):
//   value     — wartość znana z góry (treść ma zafiksowane dane/ziarna) → MOCNA
//   relation  — serwer nie zna wartości (dane studenta), sprawdza RELACJĘ → ŚREDNIA
//   predicate — tylko prawda/fałsz o stanie sesji                        → SŁABA
//
// Żadna klasa NIE dowodzi, że student napisał kod sam — dowodzi, że w sesji
// istniały wartości spełniające warunek. Dlatego lab BRAMKUJE POSTĘP, a nie
// wystawia kredencjału (ADR-015 §5; receipt nadal wymaga sandboxa + vivy +
// recenzji człowieka).
//
// Liczby zmiennoprzecinkowe: `abs(x - y) < tolerance` (domyślnie 0.01), NIGDY
// `round(x) === round(y)` — kolejność dodawania floatów potrafi fałszywie oblać
// na granicy (nota inżynierska Sophii, F3).
// ============================================================================

/** Wartość wyliczona przez pieczątkę w sesji Colab. */
export type StampValue = number | string | boolean | null | StampValue[];

/** Ładunek pieczątki: nazwa zmiennej sesji → jej wartość. */
export type StampPayload = Record<string, StampValue>;

/** Wyrażenie arytmetyczne nad zmiennymi ładunku (dla `relation`). */
export type Expr =
	| string // nazwa zmiennej z ładunku
	| number // stała
	| { mul: Expr[] }
	| { add: Expr[] }
	| { sub: [Expr, Expr] }
	| { div: [Expr, Expr] };

export type RelationRule =
	| { op: "eq"; left: Expr; right: Expr }
	| { op: "gte"; left: Expr; right: Expr }
	| { op: "lte"; left: Expr; right: Expr };

export type PredicateRule =
	| { op: "neq_const"; var: string; const: StampValue }
	| { op: "len_gte"; var: string; n: number }
	| { op: "len_eq"; var: string; n: number }
	| { op: "all_numbers"; var: string }
	| { op: "count_gte"; var: string; n: number }
	/** Klucz meta pieczątki (np. `_wykonano`) — dowód, że komórka poszła w sesji. */
	| { op: "is_true"; var: string }
	| { op: "nonempty_string"; var: string }
	| { op: "contains_all"; var: string; needles: string[] };

export type LabCheck =
	| {
			id: string;
			kind: "value";
			note: string;
			var: string;
			expect: StampValue;
			tolerance?: number;
			fragile?: boolean;
	  }
	| { id: string; kind: "relation"; note: string; rule: RelationRule; tolerance?: number }
	| { id: string; kind: "predicate"; note: string; rule: PredicateRule; fragile?: boolean };

export const DEFAULT_TOLERANCE = 0.01;

export type CheckResult = { id: string; passed: boolean; reason?: string };

/** Czy `configJson.checks` to realny kontrakt (a nie atrapa z 1E.2). */
export function parseChecks(configJson: unknown): LabCheck[] {
	const raw = (configJson as { checks?: unknown })?.checks;
	if (!Array.isArray(raw)) return [];
	return raw.filter((c): c is LabCheck => {
		if (typeof c !== "object" || c === null) return false;
		const k = (c as LabCheck).kind;
		return k === "value" || k === "relation" || k === "predicate";
	});
}

function isFiniteNumber(v: unknown): v is number {
	return typeof v === "number" && Number.isFinite(v);
}

/** Ewaluacja wyrażenia nad ładunkiem. `null` = nie da się policzyć (brak zmiennej/zły typ). */
function evalExpr(expr: Expr, payload: StampPayload): number | null {
	if (typeof expr === "number") return expr;
	if (typeof expr === "string") {
		const v = payload[expr];
		return isFiniteNumber(v) ? v : null;
	}
	if ("mul" in expr) {
		const parts = expr.mul.map((e) => evalExpr(e, payload));
		if (parts.some((p) => p === null)) return null;
		return (parts as number[]).reduce((a, b) => a * b, 1);
	}
	if ("add" in expr) {
		const parts = expr.add.map((e) => evalExpr(e, payload));
		if (parts.some((p) => p === null)) return null;
		return (parts as number[]).reduce((a, b) => a + b, 0);
	}
	if ("sub" in expr) {
		const [a, b] = expr.sub.map((e) => evalExpr(e, payload));
		return a === null || b === null ? null : a - b;
	}
	if ("div" in expr) {
		const [a, b] = expr.div.map((e) => evalExpr(e, payload));
		if (a === null || b === null || b === 0) return null;
		return a / b;
	}
	return null;
}

/** Porównanie liczb z tolerancją — NIGDY przez zaokrąglenie (nota Sophii). */
function numbersEqual(a: number, b: number, tolerance: number): boolean {
	return Math.abs(a - b) < tolerance;
}

function evalValue(
	check: Extract<LabCheck, { kind: "value" }>,
	payload: StampPayload,
): CheckResult {
	const got = payload[check.var];
	if (got === undefined) {
		return { id: check.id, passed: false, reason: `brak zmiennej '${check.var}' w pieczątce` };
	}
	const tol = check.tolerance ?? DEFAULT_TOLERANCE;
	if (isFiniteNumber(check.expect) && isFiniteNumber(got)) {
		return { id: check.id, passed: numbersEqual(got, check.expect, tol) };
	}
	// Nie-liczby (string/bool/lista): porównanie strukturalne po kanonicznym JSON.
	const passed = JSON.stringify(got) === JSON.stringify(check.expect);
	return { id: check.id, passed };
}

function evalRelation(
	check: Extract<LabCheck, { kind: "relation" }>,
	payload: StampPayload,
): CheckResult {
	const { rule } = check;
	const left = evalExpr(rule.left, payload);
	const right = evalExpr(rule.right, payload);
	if (left === null || right === null) {
		return { id: check.id, passed: false, reason: "brak wartości do przeliczenia relacji" };
	}
	const tol = check.tolerance ?? DEFAULT_TOLERANCE;
	switch (rule.op) {
		case "eq":
			return { id: check.id, passed: numbersEqual(left, right, tol) };
		case "gte":
			return { id: check.id, passed: left >= right - tol };
		case "lte":
			return { id: check.id, passed: left <= right + tol };
	}
}

function evalPredicate(
	check: Extract<LabCheck, { kind: "predicate" }>,
	payload: StampPayload,
): CheckResult {
	const { rule } = check;
	const v = payload[rule.var];
	const fail = (reason: string): CheckResult => ({ id: check.id, passed: false, reason });

	switch (rule.op) {
		case "neq_const":
			if (v === undefined) return fail(`brak zmiennej '${rule.var}'`);
			return { id: check.id, passed: JSON.stringify(v) !== JSON.stringify(rule.const) };
		case "len_gte":
			if (!Array.isArray(v)) return fail(`'${rule.var}' nie jest listą`);
			return { id: check.id, passed: v.length >= rule.n };
		case "len_eq":
			if (!Array.isArray(v)) return fail(`'${rule.var}' nie jest listą`);
			return { id: check.id, passed: v.length === rule.n };
		case "is_true":
			return { id: check.id, passed: v === true };
		case "nonempty_string":
			return { id: check.id, passed: typeof v === "string" && v.trim().length > 0 };
		case "all_numbers":
			if (!Array.isArray(v)) return fail(`'${rule.var}' nie jest listą`);
			return { id: check.id, passed: v.length > 0 && v.every(isFiniteNumber) };
		case "count_gte":
			if (!isFiniteNumber(v)) return fail(`'${rule.var}' nie jest liczbą`);
			return { id: check.id, passed: v >= rule.n };
		case "contains_all": {
			if (typeof v !== "string") return fail(`'${rule.var}' nie jest tekstem`);
			const hay = v.toLowerCase();
			return { id: check.id, passed: rule.needles.every((n) => hay.includes(n.toLowerCase())) };
		}
	}
}

/**
 * Ocena kompletu checków pozycji względem ładunku pieczątki.
 *
 * Zwraca wynik KAŻDEGO checku (nie tylko werdykt) — trasa może pokazać
 * studentowi, który kamień nie przeszedł, bez zdradzania oczekiwanej wartości.
 *
 * `fragile: true` (introspekcja tekstu komórki — F1.7/F2.7) NIE MOŻE być
 * jedynym warunkiem: jeśli wszystkie NIEkruche checki przeszły, kruchy
 * check nie oblewa pozycji (fallback zadeklarowany przez Sophię).
 */
function evalCheck(check: LabCheck, payload: StampPayload): CheckResult {
	switch (check.kind) {
		case "value":
			return evalValue(check, payload);
		case "relation":
			return evalRelation(check, payload);
		case "predicate":
			return evalPredicate(check, payload);
	}
}

export function evaluateChecks(
	checks: LabCheck[],
	payload: StampPayload,
): { passed: boolean; results: CheckResult[] } {
	const results = checks.map((c) => evalCheck(c, payload));

	const isFragile = new Map(checks.map((c) => [c.id, "fragile" in c && c.fragile === true]));
	const solid = results.filter((r) => !isFragile.get(r.id));
	// Bezpiecznik: pozycja bez ani jednego NIEkruchego checku nie może zaliczać
	// się na samej introspekcji tekstu — to byłby check o zerowej wartości.
	const passed = solid.length > 0 && solid.every((r) => r.passed);

	return { passed, results };
}
