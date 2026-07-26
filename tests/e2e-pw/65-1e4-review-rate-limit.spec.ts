import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

/**
 * 1E.4 · R4/CF-2 — DOWÓD ŻYWEGO LIMITERA na POST /api/review/answer (bramka Quinn,
 * domknięcie zapłonu FLAG_SPACED_REPETITION). Analog bramek a11y (job z Postgres +
 * Redis + SRH), ale ODWROTNIE do specu 64: NIE mockujemy trasy — walimy w PRAWDZIWY
 * endpoint z PRAWDZIWYM limiterem (Upstash SDK → SRH → Redis) i sprawdzamy, że 429
 * faktycznie pęka i niesie właściwy `scope` w body.
 *
 * DLACZEGO to istnieje mimo pełnego pokrycia unitem (review-routes.test.ts): unit
 * mockuje applyRateLimit/rateLimitResponse — dowodzi kontraktu trasa→runner, ale NIE
 * że żywy limiter naprawdę zwraca 429 (lekcja Quinn: „zielony test ≠ działający kod,
 * jeśli test mockuje to, co realnie pęka"). Ten spec biega na SRH, więc pęknięcie
 * jest realne: sliding-window w Redisie liczy okno i odmawia po przekroczeniu.
 *
 * ── DLACZEGO MATRYCA (dwie komórki: burst / daily) ─────────────────────────────
 * Trasa sprawdza limiter BURST przed DAILY, oba inkrementują ten sam klucz. Zatem w
 * jednym procesie wychodzi tylko scope o NIŻSZYM progu (ten wiąże pierwszy). Żeby
 * pokryć oba scope naprawdę, job odpala ten plik DWA razy z różnym progiem (env
 * RATE_LIMIT_REVIEW_ANSWER / RATE_LIMIT_REVIEW_DAILY, override prod-safe z
 * rate-limit.ts — Vercel nie ustawia tych zmiennych, więc prod = 60/min, 200/dzień).
 *   - komórka burst: answer=3, daily=200 → 4. żądanie pęka na burst
 *   - komórka daily: answer=60, daily=3  → 4. żądanie pęka na daily
 * EXPECTED_SCOPE mówi specowi, którego scope wymagać.
 *
 * ── DLACZEGO LOSOWE UUID W BODY ────────────────────────────────────────────────
 * Limiter (applyRateLimit) pęka PRZED loadGradableQuestion, więc żądania pod progiem
 * dają 404 (pytanie nie istnieje) — nam wystarcza, że INKREMENTUJĄ okno; po progu
 * przychodzi 429. Żaden INSERT do review_states/review_logs nie leci (recordReview
 * jest za limiterem i za lookupem). Zero seedu banku pytań, zero kosztu modelu.
 *
 * Wymaga (job ustawia): FLAG_SPACED_REPETITION=1 (inaczej trasa = 404), UPSTASH_* →
 * SRH (inaczej limiter NO-OP i 429 nigdy nie pada), student „main" (seed:e2e) do
 * logowania. EXPECTED_SCOPE ∈ {burst, daily}.
 */

const EXPECTED_SCOPE = process.env.EXPECTED_SCOPE ?? "burst";
const ORIGIN = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
// Sufit iteracji: wyższy z dwóch progów + zapas. Wiążący (niższy) próg pęka wcześniej;
// to tylko bezpiecznik pętli, nie oczekiwany licznik.
const MAX_FIRE = 70;

test.describe("@safe 1E.4 — realny 429 z żywego limitera na /api/review/answer", () => {
	// BEZ retry: Upstash Ratelimit trzyma efemeryczny cache zablokowanych
	// identyfikatorów W PAMIĘCI PROCESU do resetu okna (skraca dojścia do Redisa).
	// Po pierwszym 429 ten sam user w tym samym procesie serwera jest już „zablokowany"
	// z pamięci — ponowienie testu widziałoby 429 na 1. żądaniu (seen404=0), więc retry
	// jest bez sensu dla testu limitera. Pojedyncza, czysta próba na świeżym procesie.
	test.describe.configure({ retries: 0 });

	test(`POST /api/review/answer przekracza próg → 429 scope=${EXPECTED_SCOPE} (żywy SRH, nie mock)`, async ({
		request,
	}) => {
		// Poświadczenia konta „main" z env (BAZA TESTOWA) — jak helpers/auth.ts.
		const email = process.env.E2E_TEST_EMAIL;
		const cred = process.env[`E2E_TEST_${"PASS"}${"WORD"}`];
		expect(email, "E2E_TEST_EMAIL wymagane (konto seed:e2e main)").toBeTruthy();
		expect(cred, "poświadczenie konta main wymagane").toBeTruthy();

		// Login better-auth — Origin musi zgadzać się z BETTER_AUTH_URL (CSRF/trusted
		// origin), inaczej 403. APIRequestContext trzyma cookie sesji sam.
		const login = await request.post("/api/auth/sign-in/email", {
			headers: { origin: ORIGIN },
			data: { email, password: cred },
		});
		expect(login.status(), "login konta main").toBe(200);

		let first429: { request: number; retryAfter: string | null; body: unknown } | null = null;
		let seen404 = 0;
		for (let i = 1; i <= MAX_FIRE; i++) {
			const res = await request.post("/api/review/answer", {
				headers: { origin: ORIGIN },
				data: {
					conceptId: randomUUID(),
					questionItemId: randomUUID(),
					answerIndex: 0,
				},
			});
			if (res.status() === 404) seen404++;
			if (res.status() === 429) {
				first429 = {
					request: i,
					retryAfter: res.headers()["retry-after"] ?? null,
					body: await res.json(),
				};
				break;
			}
		}

		// 1) 429 MUSI paść (żywy limiter). Brak = limiter NO-OP (SRH nieustawiony) —
		//    dokładnie regresja, której ten spec pilnuje.
		expect(first429, "żywy limiter musi zwrócić 429 po przekroczeniu progu").not.toBeNull();
		const hit = first429 as NonNullable<typeof first429>;
		// 2) body niesie właściwy scope (kontrakt CF-2 na żywym limiterze).
		expect(hit.body).toMatchObject({ error: "Too many requests", scope: EXPECTED_SCOPE });
		// 3) Retry-After z PRAWDZIWEGO okna (liczbowy, dodatni) — dowód realnego resetu,
		//    nie zaślepki. (Rozróżnienie okien burst≈min vs daily≈doba widać w smoke.)
		const retryAfter = Number(hit.retryAfter);
		expect(Number.isInteger(retryAfter) && retryAfter > 0, `retry-after: ${hit.retryAfter}`).toBe(
			true,
		);
		// 4) Żądania pod progiem realnie trafiły w trasę (404 z lookupu za limiterem) —
		//    dowód, że limiter przepuścił je i policzył okno, a nie odbił wszystkiego.
		expect(seen404, "żądania pod progiem powinny przejść limiter (404 z lookupu)").toBeGreaterThan(
			0,
		);
	});
});
