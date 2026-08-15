// @vitest-environment jsdom
/**
 * STRAŻNIK — dwie strony treści fali 2: martwy odnośnik paszportu (B) i regulamin (C).
 *
 * Czego pilnuje:
 *  1. Obie strony renderują CZĘŚĆ I dokumentu i NIC z aparatu wewnętrznego
 *     (CZĘŚĆ II). Odbiorcą jednej z nich jest PRACODAWCA sprawdzający kandydata —
 *     notatka robocza na tym ekranie kosztuje wiarygodność kandydata, nie naszą wygodę.
 *  2. Flaga naprawdę bramkuje: zgaszona = brak treści dokumentu.
 *  3. Tabele z dokumentów parsują się do prawdziwych tabel (5×2 i 6×2).
 *
 * ── DOWODY MUTACJI (CLAUDE.md v1.17, reguła (2)) ─────────────────────────────
 * Wykonane 2026-08-14, każda cofnięta po pomiarze.
 *
 * MB1. W `src/app/passport/[id]/not-found.tsx` bramka flagi usunięta (cały warunek
 *      `if (!isFeatureEnabled("passportNotFoundNotice"))` skasowany, treść leci zawsze):
 *      PADA 2 z 8 — „ZGASZONA flaga: ekran minimalny, ZERO treści dokumentu" oraz
 *      „ekran minimalny nie niesie ani jednej obietnicy z dokumentu". Cytat:
 *      „expected 2877 to be less than 200" (długość tekstu na ekranie).
 *      To jest ta mutacja, która puszcza treść przed sign-offem Darka.
 *
 * MB2. W `src/lib/tresc/dokumenty-pilotazu.ts` `wytnijCzescI(...)` zastąpione
 *      surowym `readFileSync(...)` w OBU ładowarkach („pokaż cały plik"):
 *      PADA 4 z 8. Cytat: „expected '# Zasada odpowiedzi dla pracodawcy — …'
 *      not to contain 'CZĘŚĆ II'". Bez tej mutacji nie wiedziałbym, czy cięcie
 *      działa na TYCH dokumentach, czy tylko na klauzuli, dla której je pisano.
 *
 * MB3. W ładowarce regulaminu podmieniona ścieżka nośnika na dokument klauzuli
 *      (`docs/legal/klauzula-informacyjna-art13.md`):
 *      PADA 2 z 8. Cytat: „expected '## Informacja o tym, co robimy z Twoi…'
 *      to contain '§1'". Łapie podmianę nośnika, czyli stan „strona renderuje się
 *      bez zarzutu, tylko nie ten dokument".
 *
 * Przebieg po cofnięciu wszystkich trzech: 8/8 zielonych.
 *
 * ── CZEGO NIE PILNUJE ────────────────────────────────────────────────────────
 * Nie sprawdza obecności plików w śladzie funkcji bezserwerowej Vercela
 * (`outputFileTracingIncludes` w `next.config.ts`). To jest realne ryzyko
 * produkcyjne — bez wpisu strona działa lokalnie i pada z błędem „ENOENT" na
 * produkcji — ale sprawdzalne dopiero na wdrożeniu podglądowym, nie w teście
 * jednostkowym. Weryfikacja należy do zapłonu flagi (runbook Ethana).
 */

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { podzielNaBloki } from "@/lib/legal/klauzula-art13";
import {
	wczytajRegulaminPilotazu,
	wczytajZasadeDlaPracodawcy,
} from "@/lib/tresc/dokumenty-pilotazu";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

/** Ślady aparatu wewnętrznego — żaden nie ma prawa trafić na ekran. */
const APARAT = ["CZĘŚĆ II", "aparat wewnętrzn", "Sophia", "Zleceniodawca", "docs/"];

describe("treść dla pracodawcy (martwy odnośnik paszportu)", () => {
	it("wycina CZĘŚĆ I bez śladu aparatu wewnętrznego", () => {
		const tresc = wczytajZasadeDlaPracodawcy();
		for (const slad of APARAT) expect(tresc).not.toContain(slad);
		expect(tresc.length).toBeGreaterThan(500);
	});

	it("tabela dokumentu parsuje się jako prawdziwa tabela 5×2", () => {
		const tabele = podzielNaBloki(wczytajZasadeDlaPracodawcy()).filter(
			(b) => b.rodzaj === "tabela",
		);
		expect(tabele).toHaveLength(1);
		const tabela = tabele[0];
		if (tabela.rodzaj !== "tabela") throw new Error("nie tabela");
		expect(tabela.naglowek).toHaveLength(2);
		expect(tabela.wiersze).toHaveLength(5);
	});
});

describe("treść regulaminu pilotażu", () => {
	it("wycina CZĘŚĆ I bez śladu aparatu wewnętrznego", () => {
		const tresc = wczytajRegulaminPilotazu();
		for (const slad of APARAT) expect(tresc).not.toContain(slad);
	});

	it("niesie paragrafy regulaminu (właściwy nośnik, nie inny dokument)", () => {
		const tresc = wczytajRegulaminPilotazu();
		expect(tresc).toContain("§1");
		expect(tresc).toContain("§15");
	});

	it("tabela dokumentu parsuje się jako prawdziwa tabela 6×2", () => {
		const tabele = podzielNaBloki(wczytajRegulaminPilotazu()).filter((b) => b.rodzaj === "tabela");
		expect(tabele).toHaveLength(1);
		const tabela = tabele[0];
		if (tabela.rodzaj !== "tabela") throw new Error("nie tabela");
		expect(tabela.naglowek).toHaveLength(2);
		expect(tabela.wiersze).toHaveLength(6);
	});
});

describe("flaga naprawdę bramkuje stronę pod martwym odnośnikiem", () => {
	async function renderujStrone() {
		const { default: Strona } = await import("@/app/passport/[id]/not-found");
		render(<Strona />);
	}

	it("ZGASZONA flaga: ekran minimalny, ZERO treści dokumentu", async () => {
		vi.stubEnv("FLAG_PASSPORT_NOT_FOUND_NOTICE", "0");
		await renderujStrone();
		// Nagłówek ekranu minimalnego jest, treść dokumentu nie.
		expect(screen.getByText("Nie znaleźliśmy tej strony")).toBeInTheDocument();
		const naglowekDokumentu = wczytajZasadeDlaPracodawcy().match(/^##\s+(.+)$/m)?.[1];
		expect(naglowekDokumentu).toBeTruthy();
		if (naglowekDokumentu) {
			expect(screen.queryByText(naglowekDokumentu)).toBeNull();
		}
	});

	it("ZAPALONA flaga: treść dokumentu na ekranie", async () => {
		vi.stubEnv("FLAG_PASSPORT_NOT_FOUND_NOTICE", "1");
		await renderujStrone();
		const naglowekDokumentu = wczytajZasadeDlaPracodawcy().match(/^##\s+(.+)$/m)?.[1];
		if (!naglowekDokumentu) throw new Error("dokument bez nagłówka `## …`");
		expect(screen.getByText(naglowekDokumentu)).toBeInTheDocument();
		// Kontrola dwustronna: ekran minimalny znika, nie współistnieje z treścią.
		expect(screen.queryByText("Nie znaleźliśmy tej strony")).toBeNull();
	});

	it("ekran minimalny nie niesie ani jednej obietnicy z dokumentu", async () => {
		vi.stubEnv("FLAG_PASSPORT_NOT_FOUND_NOTICE", "0");
		await renderujStrone();
		const { textContent } = document.body;
		for (const slad of APARAT) expect(textContent ?? "").not.toContain(slad);
		// Ekran ma być krótki — to komunikat, nie treść zastępcza.
		expect((textContent ?? "").length).toBeLessThan(200);
	});
});
