// @vitest-environment jsdom
/**
 * STRAŻNIK — trzy ścieżki z kotwicą patologiczną są NIEWYBIERALNE w pilotażu.
 *
 * Czego pilnuje (decyzja Olivera, przegląd domenowy Sophii, fala 2):
 * Python Developer, PHP Developer i Engineering Manager mają w danych rynku
 * kompetencję obcą ścieżce WYŻEJ niż jej własny rdzeń (Linux 52,9% > Python 46,4%;
 * SQL 41% > PHP 20,6%; Java 41,9% ponad sygnałami przywództwa). Pokazanie takiego
 * profilu uczestnikowi uwiarygodnia złą kotwicę autorytetem platformy.
 *
 * DLACZEGO KONTROLA LICZNOŚCI JEST TU OBOWIĄZKOWA (warunek zlecenia):
 * sam warunek „lista nie zawiera Pythona" przechodzi na liście PUSTEJ — czyli
 * strażnik świeciłby na zielono także wtedy, gdyby filtr wyciął wszystko i produkt
 * nie miał ani jednej ścieżki do wyboru. Każdy test liczności ma więc parę:
 * „czego nie ma" ORAZ „ile zostało". Mutacje obu członów udokumentowane niżej.
 *
 * ── DOWODY MUTACJI (CLAUDE.md v1.17, reguła (2)) ─────────────────────────────
 * Wykonane 2026-08-14 w drzewie roboczym Jacka, każda mutacja cofnięta po pomiarze.
 * Mutacje brane z realnej edycji pliku i realnego przebiegu vitest — nie z opisu.
 *
 * M1. `availableInPilot: false` → `true` przy „Python Developer"
 *     (src/lib/db/data/career-paths.ts):
 *     PADA 8 z 28 testów. Cytat: „expected [ 'AI Engineer', …(20) ] to not include
 *     'Python Developer'" oraz „to have a length of 20 but got 21".
 *
 * M2. Usunięcie linii `availableInPilot: false` z WSZYSTKICH trzech wpisów:
 *     PADA 8 z 28. Cytat: „to have a length of 20 but got 23" i „…19 but got 21".
 *
 * M3. `selectableCareerPaths()` zwraca `[]` (ciało podmienione na `return [];`):
 *     PADA 9 z 28 — najwięcej ze wszystkich mutacji. Cytat: „expected [] to have
 *     a length of 20 but got +0" oraz „expected false to be true" (kontrola
 *     dwustronna: Solution Architect zniknął). To jest ten człon, który BEZ
 *     kontroli liczności przeszedłby na zielono na pustym zbiorze — mutacja
 *     potwierdza, że nie przechodzi.
 *
 * M4. `entryCareerPaths()` liczone od `CAREER_PATHS` zamiast od
 *     `selectableCareerPaths()` (regresja do stanu sprzed zmiany):
 *     PADA 2 z 28. Cytat: „expected [ 'AI Engineer', …(20) ] to not include
 *     'Python Developer'". Python wraca do propozycji Pomocnika mimo ukrycia
 *     w pickerze — dokładnie ta wada, którą daje druga kopia reguły.
 *
 * M5. Drugi nośnik reguły — dopisanie `.filter((p) => p.availableInPilot !== false)`
 *     w `src/components/profil/profil-editor.tsx`:
 *     PADA 1 z 9 (przebieg samego tego pliku). Cytat: „expected [ …(2) ] to deeply
 *     equal [ 'src/lib/db/data/career-paths.ts' ] + Received
 *     'src/components/profil/profil-editor.tsx'". Zachowanie produktu jest przy tej
 *     mutacji POPRAWNE, a strażnik i tak pada — tak ma być, pilnujemy kształtu,
 *     zanim kopie zdążą się rozjechać.
 *
 * Wszystkie pięć mutacji cofnięte; przebieg po cofnięciu: 28/28 zielonych, 751 ms.
 *
 * Kontrola dwustronna: „Solution Architect zostaje widoczny" i „CAREER_PATHS nadal
 * ma 23 pozycje" pilnują drugiej strony — że nikt nie domknął sprawy filtrem
 * zbyt szerokim ani nie wyciął ścieżek z katalogu rynku.
 *
 * ── CZEGO TEN STRAŻNIK NIE PILNUJE (jawnie) ──────────────────────────────────
 * Pola „Inne (wpisz)" w profilu. Wpisanie z ręki „python developer" nadal
 * przechodzi przez `matchCareerGoal` na kanoniczne „Python Developer”. Ukrycie
 * jest NIEPEŁNE i test tego nie udaje — domknięcie leży w kontrakcie funkcji
 * dzielonej z Pomocnikiem i w zapisie po stronie serwera (właściciel: Ethan).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CareerPathPicker } from "@/components/onboarding/career-path-picker";
import {
	CAREER_PATHS,
	entryCareerPaths,
	groupCareerPathsByFamily,
	isEntryCareerGoal,
	selectableCareerPaths,
} from "@/lib/db/data/career-paths";

/** Ukryte na czas pilotażu — zmiana tej listy jest decyzją produktową, nie techniczną. */
const UKRYTE = ["Python Developer", "PHP Developer", "Engineering Manager"] as const;

/** Wybieralnych ma zostać 23 − 3. Liczba wprost, nie `CAREER_PATHS.length - 3`: */
/** wyliczanie oczekiwania z tego samego źródła co wynik daje test, który zawsze przechodzi. */
const WYBIERALNYCH = 20;
/** Wejściowych (Pomocnik): wybieralne minus Solution Architect (jedyna rola docelowa wśród nich). */
const WEJSCIOWYCH = 19;

describe("selectableCareerPaths — jedyny nośnik reguły ukrycia", () => {
	it("nie zawiera żadnej z trzech ukrytych ścieżek", () => {
		const etykiety = selectableCareerPaths().map((p) => p.careerGoal);
		for (const ukryta of UKRYTE) expect(etykiety).not.toContain(ukryta);
	});

	it("zostawia dokładnie 20 ścieżek (kontrola liczności — pusta lista NIE przechodzi)", () => {
		expect(selectableCareerPaths()).toHaveLength(WYBIERALNYCH);
	});

	it("kontrola dwustronna: Solution Architect ZOSTAJE widoczny (rola docelowa ≠ ukryta)", () => {
		const etykiety = selectableCareerPaths().map((p) => p.careerGoal);
		expect(etykiety).toContain("Solution Architect");
	});

	it("kontrola dwustronna: katalog rynku nietknięty — CAREER_PATHS nadal ma 23 pozycje", () => {
		// Ukrywamy WYBÓR, nie dane: etykieta jest kluczem `job_market_data.career_goal`,
		// więc konto z takim celem musi dalej trafiać w katalog kompetencji.
		expect(CAREER_PATHS).toHaveLength(23);
		for (const ukryta of UKRYTE) {
			expect(CAREER_PATHS.map((p) => p.careerGoal)).toContain(ukryta);
		}
	});
});

describe("powierzchnie wyboru — wszystkie odsiewają przez ten sam nośnik", () => {
	it("picker onboardingu nie renderuje ukrytych ścieżek", () => {
		// Render REALNEGO komponentu, nie samej funkcji: pytanie brzmi „czy uczestnik
		// to zobaczy", a nie „czy funkcja filtruje".
		render(<CareerPathPicker value="" onSelect={() => {}} />);
		for (const ukryta of UKRYTE) {
			expect(screen.queryByText(ukryta)).toBeNull();
		}
	});

	it("picker onboardingu renderuje wszystkie 20 wybieralnych (kontrola liczności)", () => {
		render(<CareerPathPicker value="" onSelect={() => {}} />);
		for (const p of selectableCareerPaths()) {
			expect(screen.getByText(p.careerGoal)).toBeInTheDocument();
		}
		expect(selectableCareerPaths()).toHaveLength(WYBIERALNYCH);
	});

	it("grupowanie po rodzinach: suma 20, żadna ukryta, żadna rodzina nie znika", () => {
		const grupy = groupCareerPathsByFamily();
		const wszystkie = grupy.flatMap((g) => g.paths.map((p) => p.careerGoal));
		for (const ukryta of UKRYTE) expect(wszystkie).not.toContain(ukryta);
		expect(wszystkie).toHaveLength(WYBIERALNYCH);
		// Pusty nagłówek rodziny wyglądałby dla uczestnika jak awaria listy.
		expect(grupy.every((g) => g.paths.length > 0)).toBe(true);
	});

	it("Pomocnik nie proponuje ukrytych: entryCareerPaths i isEntryCareerGoal", () => {
		const wejsciowe = entryCareerPaths().map((p) => p.careerGoal);
		for (const ukryta of UKRYTE) {
			expect(wejsciowe).not.toContain(ukryta);
			// Druga bramka — `groundCareerPaths` odsiewa propozycje modelu przez ten predykat.
			expect(isEntryCareerGoal(ukryta)).toBe(false);
		}
		expect(wejsciowe).toHaveLength(WEJSCIOWYCH);
	});
});

describe("jeden nośnik reguły (CLAUDE.md v1.17)", () => {
	it("warunek `availableInPilot !== false` pada w kodzie produkcyjnym dokładnie raz", () => {
		// Kontrola KSZTAŁTU, nie zachowania. Druga kopia warunku daje dziś poprawny
		// produkt, a jutro — przy czwartej ukrytej ścieżce — cichy rozjazd: ktoś trafia
		// w jedno miejsce z dwóch i nic się nie zapala. Ten test pada NA KOPII, zanim
		// zdąży się rozjechać (mutacja M5 w nagłówku).
		const korzen = process.cwd();
		const pliki = [
			"src/lib/db/data/career-paths.ts",
			"src/components/profil/profil-editor.tsx",
			"src/components/onboarding/career-path-picker.tsx",
			"src/app/(dashboard)/projects/page.tsx",
			"src/lib/ai/career-helper.ts",
		];
		// Liczymy wystąpienia w KODZIE, nie w komentarzach. Komentarz objaśniający regułę
		// (i cytujący jej zapis) jest pożądany w każdym z tych plików — kopia WARUNKU nie.
		// Bez tego rozróżnienia test padał na własnej dokumentacji: przy pierwszym
		// przebiegu zwrócił 3 trafienia w career-paths.ts, z czego 2 to były komentarze.
		const bezKomentarzy = (tresc: string) =>
			tresc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
		const wystapienia = pliki.flatMap((p) => {
			const tresc = bezKomentarzy(readFileSync(join(korzen, p), "utf8"));
			const trafienia = tresc.match(/availableInPilot\s*!==\s*false/g) ?? [];
			return trafienia.map(() => p);
		});
		expect(wystapienia).toEqual(["src/lib/db/data/career-paths.ts"]);
	});
});
