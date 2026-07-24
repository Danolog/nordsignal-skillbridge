import { expect } from "@playwright/test";
import { test } from "./helpers/guards";

/**
 * @safe 1E.3 · P5 — dowód „deploy ≠ release": z flagą FLAG_MASTERY_GATE OFF
 * (domyślnie) ekrany i trasy egzaminu NIE ISTNIEJĄ (404), dokładnie jak reszta
 * curriculum przed zapaleniem. Read-only (zero zapisów) — wariant `test` (@safe).
 *
 * Guard flagi jest PIERWSZą linią server component / route handlera (przed auth),
 * więc 404 pojawia się bez logowania. Backend tras `/api/exam/*` ma własny dowód
 * flag-off w exam-flow.integration.test [5]; tu domykamy warstwę STRON P5 (nowa
 * trasa /exam + trasa-resolver atomów) — brak nowej powierzchni przy OFF.
 *
 * Uwaga CI: uruchamiać w środowisku, gdzie FLAG_MASTERY_GATE nie jest zapalona
 * (stan produkcyjny na 2026-07). Gdy ktoś zapali flagę w e2e — zaktualizować.
 */

const FAKE_UUID = "00000000-0000-4000-8000-000000000000";

test.describe("@safe 1E.3 P5 — flaga masteryGate OFF: egzamin nie istnieje", () => {
	test("POST /api/exam/start → 404 (trasa nie istnieje przy fladze OFF)", async ({ request }) => {
		const res = await request.post("/api/exam/start", { data: { moduleId: FAKE_UUID } });
		expect(res.status()).toBe(404);
	});

	test("GET /curriculum/[moduleId]/exam → 404 (ekran nie istnieje)", async ({ request }) => {
		const res = await request.get(`/curriculum/${FAKE_UUID}/exam`);
		expect(res.status()).toBe(404);
	});

	test("GET /curriculum/atom/[moduleSlug]/[itemSlug] → 404 (trasa-resolver nie istnieje)", async ({
		request,
	}) => {
		const res = await request.get("/curriculum/atom/l1-python/f-string-teoria");
		expect(res.status()).toBe(404);
	});
});
