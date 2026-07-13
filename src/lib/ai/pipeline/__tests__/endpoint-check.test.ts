import { afterEach, describe, expect, it, vi } from "vitest";

import { checkEndpoints, extractEndpointCandidates, isDisallowedHost } from "../endpoint-check";

afterEach(() => vi.unstubAllGlobals());

describe("endpoint-check — guard SSRF (isDisallowedHost)", () => {
	it("odrzuca localhost, sieci wewnętrzne i literały IP", () => {
		for (const h of [
			"localhost",
			"app.localhost",
			"api.internal",
			"nas.local",
			"intranet",
			"127.0.0.1",
			"10.0.0.5",
			"169.254.169.254",
			"[::1]",
		]) {
			expect(isDisallowedHost(h)).toBe(true);
		}
	});

	it("przepuszcza publiczne FQDN", () => {
		for (const h of ["moja-apka.streamlit.app", "huggingface.co", "example.com"]) {
			expect(isDisallowedHost(h)).toBe(false);
		}
	});
});

describe("endpoint-check — kandydaci z README", () => {
	it("wyciąga https, pomija github.com (repo ≠ endpoint) i hosty odrzucone guardem", () => {
		const readme = [
			"Repo: https://github.com/user/repo",
			"Demo: https://moja-apka.streamlit.app/ oraz http://plain.example.com",
			"Lokalne: https://localhost:3000 i https://10.0.0.5/panel",
		].join("\n");
		expect(extractEndpointCandidates(readme)).toEqual(["https://moja-apka.streamlit.app/"]);
	});

	it("deduplikuje, obcina interpunkcję i tnie do limitu 3", () => {
		const readme = [
			"https://a.example.com/x.",
			"https://a.example.com/x",
			"https://b.example.com,",
			"https://c.example.com;",
			"https://d.example.com",
		].join(" ");
		expect(extractEndpointCandidates(readme)).toEqual([
			"https://a.example.com/x",
			"https://b.example.com",
			"https://c.example.com",
		]);
	});
});

describe("endpoint-check — checkEndpoints (mock fetch)", () => {
	it("brak kandydatów → null (rozróżnialne od martwego URL-a)", async () => {
		expect(await checkEndpoints("README bez linków")).toBeNull();
	});

	it("HEAD 200 → ok; 405 → fallback GET; błąd sieci → ok=false, status=null", async () => {
		const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
			const u = String(url);
			if (u.includes("dziala.example.com")) {
				return { ok: true, status: 200, body: null } as unknown as Response;
			}
			if (u.includes("bez-head.example.com")) {
				if (init?.method === "HEAD") {
					return { ok: false, status: 405, body: null } as unknown as Response;
				}
				return { ok: true, status: 200, body: null } as unknown as Response;
			}
			throw new Error("sieć padła");
		});
		vi.stubGlobal("fetch", fetchMock);

		const results = await checkEndpoints(
			"https://dziala.example.com https://bez-head.example.com https://pad.example.com",
		);
		expect(results).toEqual([
			{ url: "https://dziala.example.com", ok: true, status: 200 },
			{ url: "https://bez-head.example.com", ok: true, status: 200 },
			{ url: "https://pad.example.com", ok: false, status: null },
		]);
	});
});
