import { expect } from "@playwright/test";
import { dbWriteTest as test } from "./helpers/guards";

/**
 * @dbwrite 1E.1 — Curriculum: drabina, prereq 403, pętla odpowiedzi (Quinn E2E).
 *
 * Pełna pętla przez REALNE HTTP + realną sesję Better Auth (poziom wyżej niż
 * test integracyjny — realny serwer, realny sign-in, cookies). Wariant
 * APIRequestContext zamiast przeglądarki: feature jest API-only do 1E.6,
 * a chromium Playwrighta nie wspiera ubuntu26.04 (WSL) — logowanie idzie
 * przez realny endpoint Better Auth POST /api/auth/sign-in/email:
 *  1. drabina: 8 modułów ścieżki data-science (careerGoal "Data Scientist" —
 *     mapowanie z fixa PR #163), L0 available, dalsze locked,
 *  2. prereq: GET zablokowanego modułu → 403 (dowód roadmapy przez HTTP),
 *  3. odpowiedź błędna → correct:false + feedback, pozycja nieukończona (R13),
 *  4. odpowiedź poprawna → itemCompleted + moduleCompleted (L0),
 *  5. po L0: F1 przestaje być locked (pusty treściowo → coming_soon), a jego
 *     GET przechodzi (odblokowany).
 *
 * Wymagania środowiska (tests/e2e-pw/README.md + setup Quinna):
 *  - baza testowa :5433 po db:migrate:test + seed:e2e + db:ingest-curriculum,
 *  - konto main z careerGoal 'Data Scientist' i testową pozycją exercise w L0
 *    (setup: tools/seed-e2e-curriculum.sql — dosiew wyłącznie do bazy TESTOWEJ),
 *  - dev server na bazie testowej z FLAG_CURRICULUM_PATH=1.
 */

type LadderModule = { id: string; slug: string; status: string; itemCount: number };

test.describe
	.serial("@dbwrite 1E.1 Curriculum — drabina i pętla odpowiedzi", () => {
		test("pełna pętla: drabina → 403 na locked → zła/dobra odpowiedź → L0 completed → F1 się otwiera", async ({
			request,
		}) => {
			// Realny sign-in Better Auth (cookie sesji ląduje w kontekście request).
			const email = process.env.E2E_TEST_EMAIL;
			const password = process.env.E2E_TEST_PASSWORD;
			expect(email && password, "ustaw E2E_TEST_EMAIL / E2E_TEST_PASSWORD").toBeTruthy();
			const signIn = await request.post("/api/auth/sign-in/email", {
				data: { email, password },
			});
			expect(signIn.status(), await signIn.text()).toBe(200);

			// 1. Drabina po realnym careerGoal.
			const ladderRes = await request.get("/api/curriculum");
			expect(ladderRes.status()).toBe(200);
			const ladder = (await ladderRes.json()) as { pathKey: string; modules: LadderModule[] };
			expect(ladder.pathKey).toBe("data-science");
			// 9 modułów od wydzielenia m-pandas z m-eda (audyt pojemności D10, 2026-07-11).
			expect(ladder.modules).toHaveLength(9);
			const bySlug = new Map(ladder.modules.map((m) => [m.slug, m]));
			const l0 = bySlug.get("l0-start");
			const f1 = bySlug.get("f1-python-1");
			const mEda = bySlug.get("m-eda");
			expect(l0?.status).toBe("available"); // ma testową pozycję z dosiewu
			expect(f1?.status).toBe("locked");
			expect(mEda?.status).toBe("locked");

			// 2. Prereq przez HTTP: zablokowany moduł → 403.
			const lockedRes = await request.get(`/api/curriculum/modules/${f1?.id}`);
			expect(lockedRes.status()).toBe(403);

			// Pozycja testowa L0 + jej pytanie (z dosiewu; config = źródło prawdy).
			const l0Res = await request.get(`/api/curriculum/modules/${l0?.id}`);
			expect(l0Res.status()).toBe(200);
			const l0Body = (await l0Res.json()) as {
				items: { id: string; kind: string; status: string }[];
			};
			const exercise = l0Body.items.find((i) => i.kind === "exercise");
			expect(exercise, "L0 musi mieć testową pozycję exercise (dosiew Quinna)").toBeTruthy();
			expect(exercise?.status).toBe("available");

			const questionRes = await request.get(`/api/curriculum/modules/${l0?.id}`);
			expect(questionRes.status()).toBe(200);
			// questionItemId z dosiewu — deterministyczny slug konceptu e2e.
			const qidRes = await request.post(`/api/curriculum/items/${exercise?.id}/answer`, {
				data: { questionItemId: "00000000-0000-0000-0000-000000000000", answer: { selected: 0 } },
			});
			expect(qidRes.status()).toBe(400); // pytanie spoza pozycji — guard działa

			// Realne pytanie pozycji przekazuje dosiew przez plik wymiany (env).
			const questionItemId = process.env.E2E_CURRICULUM_QUESTION_ID;
			expect(questionItemId, "ustaw E2E_CURRICULUM_QUESTION_ID (setup Quinna)").toBeTruthy();

			// 3. Błędna odpowiedź: feedback, pozycja NIE ukończona.
			const wrongRes = await request.post(`/api/curriculum/items/${exercise?.id}/answer`, {
				data: { questionItemId, answer: { selected: 2 } },
			});
			expect(wrongRes.status()).toBe(200);
			const wrong = await wrongRes.json();
			expect(wrong.correct).toBe(false);
			expect(wrong.itemCompleted).toBe(false);
			expect(wrong.explanationMd).toBeTruthy();

			// 4. Poprawna odpowiedź: pozycja + moduł L0 completed.
			const rightRes = await request.post(`/api/curriculum/items/${exercise?.id}/answer`, {
				data: { questionItemId, answer: { selected: 0 } },
			});
			expect(rightRes.status()).toBe(200);
			const right = await rightRes.json();
			expect(right.correct).toBe(true);
			expect(right.itemCompleted).toBe(true);
			expect(right.moduleCompleted).toBe(true);

			// 5. F1 przestaje być locked — od 1E.2 ma REALNĄ treść (7 atomów +
			//    przegląd), więc otwiera się jako available (nie coming_soon jak
			//    w 1E.1, gdy był pusty) i jego GET przechodzi.
			const ladder2 = (await (await request.get("/api/curriculum")).json()) as {
				modules: LadderModule[];
			};
			const bySlug2 = new Map(ladder2.modules.map((m) => [m.slug, m]));
			expect(bySlug2.get("l0-start")?.status).toBe("completed");
			expect(bySlug2.get("f1-python-1")?.status).toBe("available");
			expect(bySlug2.get("f1-python-1")?.itemCount).toBe(8);
			expect(bySlug2.get("m-eda")?.status).toBe("locked"); // dalszy łańcuch nietknięty

			const f1Res = await request.get(`/api/curriculum/modules/${f1?.id}`);
			expect(f1Res.status()).toBe(200);
			// Treść 1E.2 serwowana sekwencyjnie: pierwszy atom F1 available, reszta locked.
			const f1Body = (await f1Res.json()) as { items: { status: string }[] };
			expect(f1Body.items).toHaveLength(8);
			expect(f1Body.items[0].status).toBe("available");
			expect(f1Body.items.slice(1).every((i) => i.status === "locked")).toBe(true);
		});
	});
