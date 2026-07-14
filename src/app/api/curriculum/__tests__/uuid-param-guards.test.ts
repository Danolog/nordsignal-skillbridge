// @vitest-environment node
//
// 1E.6a (wzorzec 0.15/B3) — guardy UUID parametrów ścieżki tras curriculum:
// items/[id], items/[id]/answer, items/[id]/complete, modules/[id].
//
// Zły format id leciał prosto do `eq(<kolumna uuid>, id)` → Postgres 22P02 →
// trasa mapowała to na **500 „Internal error"** zamiast 400 (a na stronach:
// wyjątek POZA catch → strona błędu 500). Tania, skryptowalna ścieżka
// „500 na żądanie" dla zalogowanego studenta + zaszumianie logError.
//
// Asercja: 400 wraca PRZED dotknięciem DB — mocki są stubami, `dbTouched`
// musi zostać nietknięte.

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth/server", () => ({
	auth: { api: { getSession: (...a: unknown[]) => mockGetSession(...a) } },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/flags", () => ({ isFeatureEnabled: () => true }));
vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

const dbTouched = vi.fn();
// UWAGA: trap na `then` MUSI zwracać undefined — inaczej `await db.…()` widzi
// thenable (proxy oddaje funkcję dla każdej właściwości), woła then(resolve,…),
// dostaje kolejny proxy i NIGDY się nie rozwiązuje → test wisi do timeoutu.
const touchProxy: unknown = new Proxy(() => touchProxy, {
	get: (_t, prop) => {
		if (prop === "then") return undefined;
		dbTouched();
		return touchProxy;
	},
	apply: () => {
		dbTouched();
		return touchProxy;
	},
});
vi.mock("@/lib/db", () => ({ db: touchProxy }));

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonReq = (body: unknown) =>
	new Request("http://test/x", {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "content-type": "application/json" },
	});

const BAD = ["nie-uuid", "abc", "123", "../../etc/passwd", ""];

describe("1E.6a · guardy UUID parametrów ścieżki curriculum (0.15/B3)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetSession.mockResolvedValue({ user: { id: "u1" } });
	});

	it("GET /api/curriculum/items/[id] — zły uuid → 400 bez dotknięcia DB", async () => {
		const { GET } = await import("../items/[id]/route");
		for (const bad of BAD) {
			const res = await GET(new Request("http://test/x"), params(bad));
			expect(res.status, bad).toBe(400);
		}
		expect(dbTouched).not.toHaveBeenCalled();
	});

	it("GET /api/curriculum/modules/[id] — zły uuid → 400 bez dotknięcia DB", async () => {
		const { GET } = await import("../modules/[id]/route");
		for (const bad of BAD) {
			const res = await GET(new Request("http://test/x"), params(bad));
			expect(res.status, bad).toBe(400);
		}
		expect(dbTouched).not.toHaveBeenCalled();
	});

	it("POST /api/curriculum/items/[id]/answer — zły uuid → 400 bez dotknięcia DB", async () => {
		const { POST } = await import("../items/[id]/answer/route");
		for (const bad of BAD) {
			const res = await POST(
				jsonReq({ questionItemId: "11111111-1111-4111-8111-111111111111", answer: {} }),
				params(bad),
			);
			expect(res.status, bad).toBe(400);
		}
		expect(dbTouched).not.toHaveBeenCalled();
	});

	it("POST /api/curriculum/items/[id]/complete — zły uuid → 400 bez dotknięcia DB", async () => {
		const { POST } = await import("../items/[id]/complete/route");
		for (const bad of BAD) {
			const res = await POST(jsonReq({}), params(bad));
			expect(res.status, bad).toBe(400);
		}
		expect(dbTouched).not.toHaveBeenCalled();
	});

	it("poprawny uuid PRZECHODZI guard (dowód, że guard nie blokuje ruchu legalnego)", async () => {
		const { GET } = await import("../items/[id]/route");
		const res = await GET(
			new Request("http://test/x"),
			params("11111111-1111-4111-8111-111111111111"),
		);
		// dalej leci do DB (stub) — istotne, że NIE jest to 400 z guardu
		expect(res.status).not.toBe(400);
		expect(dbTouched).toHaveBeenCalled();
	});
});
