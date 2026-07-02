import { getModelId, type ModelTier } from "@/lib/ai/model";
import { db } from "@/lib/db";
import { aiUsageLedger } from "@/lib/db/schema";
import { logError } from "@/lib/log";

/**
 * Zadanie 0.0 — obserwowalność kosztu i błędów AI.
 *
 * Przezroczysty wrapper na wywołania modelu (`generateText`/`generateObject`)
 * + helper dla `streamText` (onFinish/onError). Każde wywołanie LLM zapisuje
 * wiersz do `ai_usage_ledger`: tokeny, koszt USD, sukces/errorName, latencję,
 * atrybucję (scope/tier + opcjonalnie userId/studentId/tenantId).
 *
 * GWARANCJE PRZEZROCZYSTOŚCI (rollback = wrapper znika, zachowanie bez zmian):
 *  1. Wynik wywołania zwracany bez modyfikacji.
 *  2. Błąd wywołania rzucany dalej bez modyfikacji (po zapisie success=false).
 *  3. Awaria zapisu telemetrii NIGDY nie wywraca wywołania AI (try/catch +
 *     logError — konwencja jak recordAudit w src/lib/audit.ts).
 *
 * PII: do ledgera trafia wyłącznie err.name (konwencja logError) — nigdy
 * message ani prompt (błędy Anthropic SDK niosą oryginalny prompt z PII).
 *
 * Agregacja błędów: success=false + error_name + scope w jednej tabeli =
 * zapytanie o error-rate per endpoint bez zewnętrznej usługi (świadomie bez
 * Sentry — nowa usługa zewnętrzna to czerwona linia wymagająca sign-offu).
 */

/** Cennik USD za 1M tokenów (skill claude-api, stan 2026-06). Brak wpisu → koszt NULL. */
const PRICE_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
	"claude-sonnet-4-6": { input: 3, output: 15 },
	"claude-haiku-4-5": { input: 1, output: 5 },
	"claude-haiku-4-5-20251001": { input: 1, output: 5 },
	"claude-opus-4-8": { input: 5, output: 25 },
};

export type AiUsageAttribution = {
	/** Better Auth user id. */
	userId?: string | null;
	/** uuid z tabeli students. */
	studentId?: string | null;
	/** uuid tenanta (kampusu). */
	tenantId?: string | null;
};

export type AiCallMeta = {
	/** Moduł/endpoint, np. "generate-brief", "career-helper.turn". */
	scope: string;
	tier: ModelTier;
	attribution?: AiUsageAttribution;
};

/** Podzbiór LanguageModelUsage (AI SDK v6) — pola bywają undefined. */
export type UsageLike = {
	inputTokens?: number | undefined;
	outputTokens?: number | undefined;
};

export type AiUsageEntry = {
	scope: string;
	tier: ModelTier;
	modelId: string;
	inputTokens: number;
	outputTokens: number;
	costUsd: string | null;
	success: boolean;
	errorName: string | null;
	latencyMs: number;
	userId: string | null;
	studentId: string | null;
	tenantId: string | null;
};

/**
 * Koszt w USD dla danego modelu i tokenów; null gdy model spoza cennika
 * (np. override SKILLBRIDGE_AI_MODEL w CI). String, bo kolumna numeric.
 */
export function computeCostUsd(
	modelId: string,
	inputTokens: number,
	outputTokens: number,
): string | null {
	const price = PRICE_USD_PER_MTOK[modelId];
	if (!price) return null;
	const usd = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
	return usd.toFixed(6);
}

type AiUsageSink = (entry: AiUsageEntry) => Promise<void>;

const dbSink: AiUsageSink = async (entry) => {
	await db.insert(aiUsageLedger).values(entry);
};

let sink: AiUsageSink = dbSink;

/**
 * Podmiana zapisu na spy w testach jednostkowych (null = powrót do DB).
 * Bez podmiany testy unit NIE piszą do ledgera (guard NODE_ENV=test niżej) —
 * placeholder DATABASE_URL w unit nie wskazuje działającej bazy.
 */
export function setAiUsageSinkForTests(next: AiUsageSink | null): void {
	sink = next ?? dbSink;
}

/** Zapis best-effort — awaria telemetrii nie może zablokować akcji użytkownika. */
export async function recordAiUsage(entry: AiUsageEntry): Promise<void> {
	if (process.env.NODE_ENV === "test" && sink === dbSink) return;
	try {
		await sink(entry);
	} catch (err) {
		logError("ai-usage.write", err, { scope: entry.scope });
	}
}

function buildEntry(
	meta: AiCallMeta,
	modelId: string,
	usage: UsageLike | undefined,
	success: boolean,
	errorName: string | null,
	latencyMs: number,
): AiUsageEntry {
	const inputTokens = usage?.inputTokens ?? 0;
	const outputTokens = usage?.outputTokens ?? 0;
	return {
		scope: meta.scope,
		tier: meta.tier,
		modelId,
		inputTokens,
		outputTokens,
		costUsd: computeCostUsd(modelId, inputTokens, outputTokens),
		success,
		errorName,
		latencyMs,
		userId: meta.attribution?.userId ?? null,
		studentId: meta.attribution?.studentId ?? null,
		tenantId: meta.attribution?.tenantId ?? null,
	};
}

/**
 * Owija blokujące wywołanie LLM (generateText/generateObject). Wynik musi
 * nieść `usage` (oba je mają w AI SDK v6). Model raportowany z warstwy
 * (getModelId), bo wywołania budują model przez getModel(tier) — wstrzyknięty
 * mock w testach raportuje model warstwy, co jest akceptowalne dla telemetrii.
 */
export async function withAiUsage<T extends { usage?: UsageLike }>(
	meta: AiCallMeta,
	call: () => Promise<T>,
): Promise<T> {
	const modelId = getModelId(meta.tier);
	const startedAt = Date.now();
	try {
		const result = await call();
		await recordAiUsage(
			buildEntry(meta, modelId, result.usage, true, null, Date.now() - startedAt),
		);
		return result;
	} catch (err) {
		const errorName = err instanceof Error ? err.name : "UnknownError";
		await recordAiUsage(
			buildEntry(meta, modelId, undefined, false, errorName, Date.now() - startedAt),
		);
		throw err;
	}
}

/**
 * Ścieżka streamingowa (streamText nie da się owinąć — zwraca natychmiast).
 * Użycie: `const track = streamUsageTracker(meta)`, potem w opcjach streamText
 * `onFinish: track.onFinish(...)` / `onError: track.onError`. Latencja liczona
 * od utworzenia trackera (≈ start streamu).
 */
export function streamUsageTracker(meta: AiCallMeta) {
	const modelId = getModelId(meta.tier);
	const startedAt = Date.now();
	return {
		/** Owija (opcjonalny) istniejący onFinish; najpierw telemetria, potem callback. */
		onFinish<A extends object>(next?: (args: A) => Promise<void> | void) {
			return async (args: A & { totalUsage?: UsageLike; usage?: UsageLike }) => {
				await recordAiUsage(
					buildEntry(
						meta,
						modelId,
						args.totalUsage ?? args.usage,
						true,
						null,
						Date.now() - startedAt,
					),
				);
				await next?.(args);
			};
		},
		onError: async ({ error }: { error: unknown }) => {
			const errorName = error instanceof Error ? error.name : "UnknownError";
			await recordAiUsage(
				buildEntry(meta, modelId, undefined, false, errorName, Date.now() - startedAt),
			);
		},
	};
}
