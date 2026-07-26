import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logError } from "@/lib/log";

const hasUpstashConfig = Boolean(
	process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = hasUpstashConfig ? Redis.fromEnv() : null;

/**
 * Rzucany przez assertRateLimitConfigured() i (defense-in-depth) przez
 * applyRateLimit(), gdy produkcja nie ma configu Upstash.
 */
export class RateLimitMisconfiguredError extends Error {
	constructor() {
		super(
			"Rate limiting nieskonfigurowane w produkcji: brak UPSTASH_REDIS_REST_URL " +
				"lub UPSTASH_REDIS_REST_TOKEN. Bez limitera endpointy AI/login byłyby bez " +
				"ograniczeń (DoS, niekontrolowany koszt LLM).",
		);
		this.name = "RateLimitMisconfiguredError";
	}
}

/**
 * Boot-check — wołany z instrumentation.ts przy starcie procesu (nodejs runtime).
 * W produkcji bez configu Upstash zatrzymuje start zamiast cicho wjechać z
 * rate-limitingiem wyłączonym (poprzedni stan: makeLimiter → null,
 * applyRateLimit → cichy success:true dla każdego requestu).
 */
export function assertRateLimitConfigured(): void {
	if (process.env.NODE_ENV === "production" && !hasUpstashConfig) {
		throw new RateLimitMisconfiguredError();
	}
}

function makeLimiter(limiter: ReturnType<typeof Ratelimit.slidingWindow>, prefix: string) {
	if (!redis) return null;
	return new Ratelimit({
		redis,
		limiter,
		analytics: false,
		prefix: `skillbridge:${prefix}`,
	});
}

/**
 * Override progu limitera WYŁĄCZNIE dla testów (bramka QA — realny 429 scope=daily
 * bez 200+ żądań, bo burst 60/min tnie wcześniej). Prod-safe DWUWARSTWOWO:
 *   1. Vercel NIGDY nie ustawia tych zmiennych → wartość produkcyjna (`fallback`)
 *      bez zmiany (bezpieczeństwo z tego, że produkcja env NIE ustawia).
 *   2. Defense-in-depth (warunek Leo, 1E.4): override może TYLKO ZAOSTRZAĆ limiter,
 *      nigdy go poluzować — `Math.min(n, fallback)`. Nawet gdyby wartość wyciekła do
 *      prod env (`RATE_LIMIT_REVIEW_*=<ogromna>`), nie może podnieść progu powyżej
 *      produkcyjnego fallbacku; obniżyć (zaostrzyć) — tak. Postawa limitera prod
 *      jest niezmienna od strony env, nie tylko od konwencji „Vercel nie ustawia".
 * Honorujemy override tylko gdy jest dodatnią liczbą całkowitą; cokolwiek innego →
 * fallback.
 */
function limitOverride(envKey: string, fallback: number): number {
	const raw = process.env[envKey];
	if (!raw) return fallback;
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? Math.min(n, fallback) : fallback;
}

export const rateLimiters = {
	facultyLogin: makeLimiter(Ratelimit.slidingWindow(5, "15 m"), "faculty-login"),
	aiHeavy: makeLimiter(Ratelimit.slidingWindow(5, "1 m"), "ai-heavy"),
	aiLight: makeLimiter(Ratelimit.slidingWindow(30, "1 m"), "ai-light"),
	// B6/1.8 (ADR-012): budżet biegów piaskownicy per student/dzień — koszt
	// Active CPU pod kontrolą (wzorzec budżetu z 0.0); przekroczenie =
	// runOk null + flaga do człowieka (fail-closed), nigdy cichy bieg.
	sandboxRun: makeLimiter(Ratelimit.slidingWindow(5, "1 d"), "sandbox-run"),
	// C11/1.13: dzienne domknięcie budżetu tutora per student (wzorzec sandboxRun,
	// budżet z 0.0). Tura = Sonnet + sędzia Haiku; aiHeavy (5/min) tnie burst,
	// ten limiter tnie wolumen dzienny. Twardy cap długości rozmowy per projekt
	// (MAX_TUTOR_TURNS) siedzi w kodzie trasy — to inne wymiary.
	tutorDaily: makeLimiter(Ratelimit.slidingWindow(40, "1 d"), "tutor-daily"),
	// B7/1.16a (ADR-013): dzienny cap odpowiedzi vivy per student — koszt sędziego
	// pod kontrolą (viva ma stały koszt 4 wywołań, cap tnie farmę restartów).
	vivaDaily: makeLimiter(Ratelimit.slidingWindow(30, "1 d"), "viva-daily"),
	// ADR-018 D5: serwerowa drabinka podpowiedzi. Trasa NIE woła modelu, ale jest
	// zapisem do bazy wyzwalanym kliknięciem w pętli — bez limitera pojedyncza pętla
	// `for` zamienia się we wzmocnienie zapisu na wierszu postępu. Poprawność
	// gwarantuje idempotencja (D2: kliknięcie na suficie nic nie przyrasta), nie limiter.
	hintReveal: makeLimiter(Ratelimit.slidingWindow(60, "1 m"), "hint-reveal"),
	// 1E.4 R4: kolejka powtórek — odczyt lekki (jak aiLight, wzorzec hintReveal). Bez
	// limitera nawet czysty SELECT jest wektorem zalania bazy per user.
	reviewQueue: makeLimiter(Ratelimit.slidingWindow(30, "1 m"), "review-queue"),
	// 1E.4 R4: zapis oceny powtórki. Ocena jest 0-LLM (grade.ts), więc koszt to nie
	// model, ale nielimitowany INSERT review_logs + UPDATE review_states. Dwa wymiary
	// (wzorzec sandboxRun/tutorDaily): reviewAnswer tnie BURST, reviewDaily tnie WOLUMEN
	// dobowy (kolejka „na dziś" ma cap ~20 konceptów; 200/dzień z zapasem na relearning,
	// twardy sufit przeciw farmie zapisów).
	reviewAnswer: makeLimiter(
		Ratelimit.slidingWindow(limitOverride("RATE_LIMIT_REVIEW_ANSWER", 60), "1 m"),
		"review-answer",
	),
	reviewDaily: makeLimiter(
		Ratelimit.slidingWindow(limitOverride("RATE_LIMIT_REVIEW_DAILY", 200), "1 d"),
		"review-daily",
	),
};

export type RateLimitResult = {
	success: boolean;
	reset: number;
	remaining: number;
};

export async function applyRateLimit(
	limiter: Ratelimit | null,
	key: string,
): Promise<RateLimitResult> {
	if (!limiter) {
		if (process.env.NODE_ENV === "production") {
			// Defense-in-depth: assertRateLimitConfigured() (instrumentation.ts) powinien
			// był już zatrzymać boot. Jeśli mimo to trafiliśmy tu (np. env zmieniony bez
			// restartu procesu), fail-closed — nie cichy success:true.
			logError("rate-limit", new RateLimitMisconfiguredError());
			return { success: false, reset: Date.now() + 60_000, remaining: 0 };
		}
		return { success: true, reset: 0, remaining: Number.MAX_SAFE_INTEGER };
	}
	const { success, reset, remaining } = await limiter.limit(key);
	return { success, reset, remaining };
}

export function getClientIp(req: Request): string {
	const forwarded = req.headers.get("x-forwarded-for");
	if (forwarded) {
		const first = forwarded.split(",")[0]?.trim();
		if (first) return first;
	}
	return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Odpowiedź 429 z nagłówkiem Retry-After. `scope` (opcjonalny) to jawny
 * dyskryminator, KTÓRY limiter pękł — trafia do JSON body jako pole `scope`, żeby
 * klient nie musiał zgadywać po progu Retry-After (heurystyka zdjęta w
 * review-runner, 1E.4 CF-2). Wywołania bez `scope` zachowują IDENTYCZNE body jak
 * dotąd (`{ error }` bez dodatkowych pól) — zmiana wstecznie zgodna dla pozostałych tras.
 */
export function rateLimitResponse(reset: number, scope?: string): Response {
	const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
	const body: { error: string; scope?: string } = { error: "Too many requests" };
	if (scope) body.scope = scope;
	return new Response(JSON.stringify(body), {
		status: 429,
		headers: {
			"content-type": "application/json",
			"retry-after": String(retryAfter),
		},
	});
}
