import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	czyHostLokalny,
	sprawdzAdresDlaZapisow,
} from "../../../tests/e2e-pw/helpers/base-url-policy";

/**
 * Strażnik bramki E2E: „testy zapisujące nie lecą na produkcję".
 *
 * Adresy produkcyjne poniżej to STAN ZMIERZONY, nie zapamiętany: odczyt
 * `vercel inspect skill-bridge-ai-seven.vercel.app` (2026-08-12, Ryan/CRCO) dał
 * trzy aliasy wdrożenia produkcyjnego. Poprzednia bramka szukała fragmentu
 * „skill-bridge-ai.vercel.app", którego nie zawiera ŻADEN z nich — i dlatego
 * przepuszczała zapis na produkcję przy E2E_ALLOW_DB_WRITES=1.
 *
 * Te adresy trzymamy tu jako PRZYPADKI RZECZYWISTOŚCI (są publiczne — odpowiadają
 * na otwartym internecie), nie jako regułę: reguła zna tylko hosty lokalne.
 */
const ALIASY_PRODUKCJI = [
	"https://skill-bridge-ai-seven.vercel.app",
	"https://skill-bridge-ai-dareks-projects-da398fc0.vercel.app",
	"https://skill-bridge-ai-git-main-dareks-projects-da398fc0.vercel.app",
];

describe("polityka adresu bazowego dla testów zapisujących", () => {
	it("kontrola dodatnia: adresy lokalne przechodzą (CI stoi na 127.0.0.1)", () => {
		expect(() => sprawdzAdresDlaZapisow("http://localhost:3000")).not.toThrow();
		expect(() => sprawdzAdresDlaZapisow("http://127.0.0.1:3000")).not.toThrow();
		expect(czyHostLokalny("http://127.0.0.1:3000")).toBe(true);
	});

	it("KAŻDY zmierzony alias produkcji jest odrzucany", () => {
		for (const adres of ALIASY_PRODUKCJI) {
			expect(() => sprawdzAdresDlaZapisow(adres), adres).toThrow(/ODMOWA/);
			expect(czyHostLokalny(adres), adres).toBe(false);
		}
	});

	it("adres podglądu (preview) też jest odrzucany, dopóki nie zostanie nazwany", () => {
		const preview =
			"https://skill-bridge-ai-git-feat-cos-abc123-dareks-projects-da398fc0.vercel.app";
		expect(() => sprawdzAdresDlaZapisow(preview)).toThrow(/ODMOWA/);
	});

	it("nazwany zdalny host przechodzi — ale tylko dokładnie ten nazwany", () => {
		const preview = "https://podglad-abc.vercel.app";
		expect(() => sprawdzAdresDlaZapisow(preview, "podglad-abc.vercel.app")).not.toThrow();
		// Nazwanie podglądu NIE otwiera produkcji.
		expect(() => sprawdzAdresDlaZapisow(ALIASY_PRODUKCJI[0], "podglad-abc.vercel.app")).toThrow(
			/ODMOWA/,
		);
		// Dopasowanie jest pełne, nie „zawiera się w".
		expect(() => sprawdzAdresDlaZapisow(preview, "vercel.app")).toThrow(/ODMOWA/);
	});

	it("pusta albo biała wartość nazwanego hosta niczego nie otwiera", () => {
		expect(() => sprawdzAdresDlaZapisow(ALIASY_PRODUKCJI[0], "")).toThrow(/ODMOWA/);
		expect(() => sprawdzAdresDlaZapisow(ALIASY_PRODUKCJI[0], "   ")).toThrow(/ODMOWA/);
	});

	it("adres nieparseowalny → ODMOWA (nie rozumiem = nie przepuszczam)", () => {
		expect(() => sprawdzAdresDlaZapisow("nie-adres")).toThrow(/ODMOWA/);
	});
});

describe("okablowanie bramki (reguła bez wywołania to atrapa)", () => {
	// Poprzednia bramka była poprawnie wywołana, ale dopasowywała złą nazwę.
	// Symetryczne ryzyko po naprawie: poprawna reguła, której nikt nie woła.
	// Ta asercja pilnuje samego wpięcia — a nie treści reguły.
	const guards = readFileSync(
		join(resolve(__dirname, "../../.."), "tests/e2e-pw/helpers/guards.ts"),
		"utf8",
	);

	it("dbWriteTest woła politykę adresu bazowego", () => {
		expect(guards).toMatch(/sprawdzAdresDlaZapisow\s*\(/);
	});

	it("guards.ts nie trzyma już własnej listy adresów produkcji (jeden nośnik reguły)", () => {
		expect(guards).not.toMatch(/PROD_HOST_FRAGMENTS/);
		expect(guards).not.toMatch(/vercel\.app/);
	});
});
