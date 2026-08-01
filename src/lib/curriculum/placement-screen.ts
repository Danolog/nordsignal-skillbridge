/**
 * 1E.7 L6 — KONTRAKT DANYCH EKRANU WYNIKU DIAGNOZY (§12.8 dokumentu Sophii).
 *
 * Warstwa serwera dla kroku 4 kreatora („Wnioski", powierzchnia A). Zamienia
 * surowy werdykt reguły placementu na to, co ekran ma wypisać — i robi to
 * SERWEROWO, bo warunek 1 z §12.8 brzmi: „ekran nie liczy reguły placementu ani
 * rekomendacji, dostaje policzone". Druga implementacja reguły w UI rozjechałaby
 * się z pierwszą (precedens `getLadder` ⟂ `isModuleUnlocked`, `ladder.ts:46-49`).
 *
 * ── CO TEN MODUŁ GWARANTUJE ────────────────────────────────────────────────
 *  1. NAZWY CZYTELNE DLA CZŁOWIEKA (§12.8 pkt 2). Werdykt reguły niesie slugi;
 *     ekran interpoluje tytuły. Tytuły biorą się z drabiny (`curriculum_modules.title`),
 *     nazwa kompetencji z `question_concepts.competency_name` — DOKŁADNIE tej
 *     kolumny, która karmi plan diagnozy (wymóg C6 Leo). Mapa slug→tytuł po
 *     stronie klienta jest zakazana: tytuły są danymi z ingestu i zgniją w ciszy.
 *  2. DZIURA JAKO KOMPLET ALBO WCALE (§12.8 pkt 3, fail-closed). Brak tytułu,
 *     brak nazwy kompetencji albo powód spoza trójki `below_threshold` /
 *     `uncovered` / `no_measurement` ⇒ `hole: null` ⇒ blok 2b się nie renderuje.
 *     Nigdy „najbliższy pasujący" tekst — to jest ścieżka, którą „wypadła słabo"
 *     trafiłoby na `no_measurement`, czyli produkt przyłapany na zmyślaniu.
 *  3. REKOMENDACJA LICZONA Z DRABINY (§12.2), nie z `unlockedSlugs`. Trzy powody
 *     w dokumencie, każdy wystarczający; najkrótszy: `unlockedSlugs` z mocy W-6
 *     nigdy nie zawiera modułu zaliczonego, więc student po „test out" dostałby
 *     rekomendację COFAJĄCĄ go.
 *  4. KOLEJNOŚĆ WYMUSZONA TYPEM — od naprawy W2 naprawdę, wcześniej tylko na słowo.
 *     Kontrakt przyjmuje `PlacementWriteResult`, w którym werdykt ma typ
 *     `PersistedPlacementOutcome` (stempel nadawany wyłącznie w module zapisu).
 *     Surowe wyjście `computePlacement` — czyli werdykt policzony PRZED zapisem —
 *     **nie kompiluje się**. Ma to znaczenie, bo rekomendacja policzona przed
 *     zapisem nie widzi odblokowań z TEJ diagnozy i pokazuje moduł o kilka pozycji
 *     za nisko, a wynik nadal wygląda sensownie (awaria bezobjawowa, §12.2).
 *
 *     ⚠ POPRZEDNIA WERSJA TEGO AKAPITU BYŁA NIEPRAWDZIWA i zostawiam ślad, bo to
 *     pouczające: twierdziła to samo, gdy funkcja przyjmowała goły `PlacementOutcome`.
 *     `computePlacement` jest czysty i eksportowany, więc werdykt powstawał bez
 *     jednego zapisu do bazy — Leo obalił zdanie kompilatorem (warunek W2).
 *     Komentarz opisujący gwarancję, której nie ma, jest gorszy od braku komentarza:
 *     zdejmuje czujność dokładnie tam, gdzie jest potrzebna.
 *  5. INWARIANT FLAGI OFF (§12.8 pkt 6): przy zgaszonym `placementDiagnostic`
 *     wychodzimy PRZED jakimkolwiek zapytaniem. Bramka jest tu, mimo że wołający
 *     też ją ma — inwariant ma być własnością kodu, nie obietnicą w komentarzu
 *     (wzorzec `loadPlacementUnlockedModuleIds`, 1E.4 R5).
 *
 * ⚠ DEKLARACJA SCHEMATU NIE JEST ZA FLAGĄ, ALE ZAPYTANIE JEST. Tabela
 * `curriculum_placements` (migracja 0045) NIE ISTNIEJE jeszcze na produkcji.
 * Każda ścieżka tego modułu, która pyta o nią bazę, jest osiągalna wyłącznie
 * przy fladze ON — inaczej zapłon wywróciłby produkcję PRZED ceremonią migracji.
 */

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { curriculumModules, questionConcepts } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { getLadder, type LadderModule } from "./ladder";
import type { PlacementOutcome, PlacementReason } from "./placement";
import type { PlacementWriteResult } from "./placement-service";
import { jestTytulemDoPokazania } from "./placement-title";

/** Moduł w kształcie, w jakim ekran go wypisuje: slug do testów, tytuł do zdania. */
export type PlacementScreenModule = {
	slug: string;
	title: string;
};

/**
 * Powód dziury — WYŁĄCZNIE trójka, którą §12.4 dopuszcza do bloku 2b.
 * Dowód kompletności trójki: dziurą zostaje pierwszy OTAGOWANY moduł, który nie
 * spełnia warunku (`!(qualifies || completed)`), co wyklucza pozostałe sześć
 * wartości `PlacementReason` (§12.4, nota „Dowód, że trójka jest kompletna").
 */
export type PlacementHoleReason = "below_threshold" | "uncovered" | "no_measurement";

/**
 * Trójka powodów dopuszczonych do bloku 2b (§12.4).
 *
 * ⚠ DŁUG „ZNALEZISKO A" — TA SAMA REGUŁA ŻYJE W DRUGIEJ KOPII, W MODELU WIDOKU
 * (`src/components/curriculum/placement-summary-vm.ts`, własna tablica + własny
 * predykat + własny typ o tej samej nazwie). Refaktor (jedno źródło dla obu końców,
 * wzorem `placement-title.ts`) jest ŚWIADOMIE ODŁOŻONY: przenosi eksportowany typ,
 * a to ryzyko nie mieści się przed ceremonią A6.
 * PRÓG URUCHOMIENIA: **pierwsza zmiana `PlacementReason`** (dopisanie, usunięcie
 * albo przemianowanie wartości). Do tego czasu rozjazdu pilnuje test-strażnik
 * `__tests__/powody-dziury-parytet.test.ts`, który porównuje obie listy i mówi
 * wprost, co dopisać po drugiej stronie. Waga: reguła jest FAIL-CLOSED — powód
 * spoza trójki kasuje CAŁY blok 2b, więc rozjazd znika po cichu, bez błędu.
 *
 * Eksportowane WYŁĄCZNIE dla tego strażnika (produkcyjnie używa go `jestPowodemDziury`).
 */
export const POWODY_DZIURY: readonly PlacementReason[] = [
	"below_threshold",
	"uncovered",
	"no_measurement",
];

function jestPowodemDziury(reason: PlacementReason): reason is PlacementHoleReason {
	return POWODY_DZIURY.includes(reason);
}

/** Blok 2b — komplet albo `null`. Trzy pola, bo tekst §8 interpoluje wszystkie trzy. */
export type PlacementScreenHole = {
	moduleTitle: string;
	competencyName: string;
	reason: PlacementHoleReason;
};

/**
 * Dlaczego rekomendacji nie ma (wariant 10 z §12.6). Rozdzielone, bo ekran mówi
 * przy nich DWA RÓŻNE zdania: „Masz zaliczone wszystko, co dziś jest w ścieżce."
 * kontra „Kolejny moduł jest w przygotowaniu."
 */
export type PlacementNoRecommendationReason = "all_completed" | "only_coming_soon";

/** Kontrakt oddawany ekranowi. Brak sekcji = brak tego obiektu (patrz §12.6 wariant 1–4). */
export type PlacementScreenContract = {
	/** Blok 2 — co otworzyła DIAGNOZA. NIGDY nie opisuj tego jako stanu drabiny (§12.7 pkt 1). */
	unlockedByDiagnosis: PlacementScreenModule[];
	/**
	 * ILE modułów otworzyła diagnoza — FAKT z werdyktu, przed odsianiem pod
	 * wyświetlenie. Może być WIĘKSZE niż `unlockedByDiagnosis.length`, gdy moduł
	 * nie ma tytułu do pokazania (defekt katalogu — zostawia wpis w dzienniku).
	 *
	 * Po co osobne pole zamiast `unlockedByDiagnosis.length`: to odpowiedź na
	 * pytanie „czy diagnoza cokolwiek otworzyła", od której zależy wybór wariantu
	 * tekstu (§8, warianty zerowe). Wyprowadzanie odpowiedzi o RZECZYWISTOŚCI
	 * z długości listy przygotowanej do WYŚWIETLENIA było źródłem K1.
	 */
	unlockedCount: number;
	/** Blok 1 — dorobek studenta: moduły zaliczone na tej ścieżce (stan drabiny, nie werdykt). */
	completedModules: PlacementScreenModule[];
	/** Blok 2b — komplet albo `null` (fail-closed). */
	hole: PlacementScreenHole | null;
	/** Blok 3 — policzona serwerowo, algorytmem §12.2 na drabinie PO zapisie. */
	recommendation: PlacementScreenModule | null;
	/** Wypełnione dokładnie wtedy, gdy `recommendation === null` (wariant 10). */
	noRecommendationReason: PlacementNoRecommendationReason | null;
	/**
	 * Czy rekomendacja jest KORZENIEM drabiny (pozycja 1). Rozstrzyga wybór tekstu
	 * bloku 3: §12.3 daje korzeniowi pełne zdanie z §8 („Zacznij od {tytuł} — około
	 * 15 minut. Bez działającego notebooka…"), a każdemu innemu modułowi krótkie
	 * „Zacznij od {tytuł}.".
	 *
	 * ⚠ DOPISANE PRZEZ JACKA (L6, powierzchnia A) — pole wymagane przez kontrakt
	 * propsów Mili (`PlacementRecommendation.isRoot`, §5.1 jej dokumentu), którego
	 * ten kontrakt nie niósł. Ekran NIE MA prawa go policzyć sam: „pozycja 1" jest
	 * własnością drabiny, a nie odpowiedzi — wyprowadzanie go w UI (np. „brak
	 * zaliczonych ⇒ rekomendacja to korzeń") byłoby drugą implementacją reguły
	 * §12.2 po stronie klienta, czyli dokładnie tym, czego zabrania §12.8 pkt 1.
	 * Alternatywa „porównaj slug z `l0-start`" wpiekłaby slug w UI (zakaz §12.7 pkt 4).
	 * Zmiana jest addytywna: żadne istniejące pole ani zachowanie nie ruszone.
	 */
	recommendationIsRoot: boolean;
};

/** Kandydat na rekomendację: moduł, w którym da się DZIŚ coś zrobić (§12.2 v0.8). */
function jestKandydatem(m: LadderModule): boolean {
	return m.status === "available" || m.status === "in_progress";
}

/**
 * ALGORYTM REKOMENDACJI — §12.2, kolejność wiążąca. Funkcja CZYSTA: żadnego I/O,
 * więc warianty renderu 5–10 da się przypiąć testem jednostkowym bez bazy.
 *
 * 1. kandydaci := moduły o statusie 'available' albo 'in_progress'
 * 2. rekomendacja := kandydat o NAJWYŻSZEJ pozycji
 * 3. NADPISANIE (DECYZJA 3): korzeń (pozycja 1) niezaliczony wygrywa ze wszystkim
 * 4. brak kandydatów → brak rekomendacji (wariant 9/10)
 *
 * ⚠ INTERPRETACJA KROKU 3, ZGŁOSZONA SOPHII: nadpisanie stosuje się tylko wtedy,
 * gdy korzeń JEST kandydatem. Korzeń w stanie `coming_soon` (moduł bez pozycji)
 * nie zostaje zarekomendowany, bo §12.2 v0.8 zakazuje rekomendowania `coming_soon`
 * wprost i z powodu, który tu obowiązuje tak samo („wysyła studenta w pustkę
 * i psuje jedyne zdanie, które ekran ma do powiedzenia"). Literalne „niezależnie
 * od kroku 2" dałoby rekomendację modułu bez treści. Zmiana tej interpretacji to
 * jedna linia — czeka na rozstrzygnięcie produktowe.
 */
export function pickRecommendation(ladder: readonly LadderModule[]): {
	module: LadderModule | null;
	noRecommendationReason: PlacementNoRecommendationReason | null;
} {
	const kandydaci = ladder.filter(jestKandydatem);
	if (kandydaci.length === 0) {
		// Rozdzielenie wariantu 10: „wszystko zaliczone" kontra „następny w przygotowaniu".
		const czekaTresc = ladder.some((m) => m.status === "coming_soon");
		return {
			module: null,
			noRecommendationReason: czekaTresc ? "only_coming_soon" : "all_completed",
		};
	}
	const korzen = ladder.find((m) => m.position === 1) ?? null;
	if (korzen && korzen.status !== "completed" && jestKandydatem(korzen)) {
		return { module: korzen, noRecommendationReason: null };
	}
	const najglebszy = kandydaci.reduce((a, b) => (b.position > a.position ? b : a));
	return { module: najglebszy, noRecommendationReason: null };
}

/** Nazwa kompetencji dla tagu — z tej samej kolumny, która karmi plan diagnozy (C6). */
async function loadCompetencyName(conceptSlug: string): Promise<string | null> {
	const [row] = await db
		.select({ competencyName: questionConcepts.competencyName })
		.from(questionConcepts)
		.where(eq(questionConcepts.slug, conceptSlug));
	return row?.competencyName ?? null;
}

/**
 * Tytuły modułów spoza drabiny — ścieżka awaryjna. Normalnie każdy slug werdyktu
 * JEST w drabinie (werdykt liczy się z tej samej ścieżki), więc to zapytanie nie
 * leci. Zostaje jako bezpiecznik: brak tytułu ma dać ciszę, nie slug na ekranie.
 */
async function loadTitlesBySlug(slugs: readonly string[]): Promise<Map<string, string>> {
	if (slugs.length === 0) return new Map();
	const rows = await db
		.select({ slug: curriculumModules.slug, title: curriculumModules.title })
		.from(curriculumModules)
		.where(inArray(curriculumModules.slug, [...slugs]));
	return new Map(rows.map((r) => [r.slug, r.title]));
}

/**
 * Buduje kontrakt ekranu L6 dla JEDNEJ domkniętej diagnozy.
 *
 * @param studentId  właściciel sesji (odczyt owner-side, jak reszta curriculum)
 * @param pathKey    ścieżka TEJ diagnozy — `resolveDiagnosisPathKey` (jedno źródło precedencji)
 * @param outcome    pełny werdykt reguły; dostajesz go WYŁĄCZNIE z wyniku zapisu placementu
 *
 * Zwraca `null`, gdy sekcja ma nie istnieć (§12.6 warianty 1–4): flaga OFF,
 * drabina pusta, rozjazd ścieżek. Nigdy nie zwraca „pustej sekcji" ani błędu do
 * ekranu — placement jest dodatkiem i jego cisza nie ma prawa zająć miejsca.
 */
export async function buildPlacementScreenContract(params: {
	studentId: string;
	/**
	 * WYNIK ZAPISU tej sesji — jedno źródło pary (ścieżka, werdykt) i jednocześnie
	 * stempel kolejności. Świadomie NIE dwa osobne parametry: rozdzielone dawały
	 * wołającemu możliwość zestawienia klucza jednej ścieżki z werdyktem drugiej
	 * (warunek W3 Leo), a `PlacementOutcome` bez stempla pozwalał policzyć kontrakt
	 * przed zapisem (warunek W2).
	 */
	write: PlacementWriteResult;
}): Promise<PlacementScreenContract | null> {
	// Inwariant flagi OFF: wyjście PRZED jakimkolwiek zapytaniem (patrz nagłówek).
	if (!isFeatureEnabled("placementDiagnostic")) return null;

	const { studentId } = params;
	const { pathKey, outcome } = params.write;
	const ladder = await getLadder(studentId, pathKey);
	if (ladder.length === 0) return null; // wariant 3 — nie ma drabiny, o której można mówić

	// ── BRAMKA PARYTETU ŚCIEŻEK ────────────────────────────────────────────────
	// Werdykt policzono na drabinie ścieżki X; tutaj wczytaliśmy ścieżkę Y. Jeśli
	// X ≠ Y, ekran opowiadałby o innej drabinie niż ta, do której placement zapisał
	// wiersze — awaria bezobjawowa (§12.2: „ekran mówiący co innego niż drabina").
	//
	// ⚠ UZASADNIENIE PO SCALENIU MAXA I PO NAPRAWIE W3 — jedno, spójne z
	// `path-key.ts`. Bramka NIE pilnuje już (a) duplikatu precedencji celu:
	// `resolveDiagnosisPathKey` jest jedynym nośnikiem tej reguły, druga kopia
	// zniknęła; ani (b) pomyłki wołającego: `pathKey` i `outcome` przyjeżdżają
	// teraz w JEDNYM obiekcie i nie da się ich rozjechać na wejściu.
	// Zostaje jako obrona przed rozjazdem, którego typ nie widzi: KORZEŃ DRABINY
	// zmieniony w bazie między zapisem a odczytem (przepięcie pozycji 1 do innej
	// ścieżki, ingest kasujący `curriculum_path_modules`, wyścig ceremonii z zapisem).
	// Wtedy `getLadder` zwraca inny korzeń niż ten, na którym liczono werdykt —
	// i to ma być GŁOŚNY brak sekcji, nie cicha rekomendacja z cudzej drabiny.
	//
	// ⚠ ZAKRES DOKŁADNIE TAKI, JAK PORÓWNANIE (korekta K3): bramka zestawia WYŁĄCZNIE
	// korzenie, więc przepięcie modułu ze ŚRODKA drabiny przez nią przechodzi.
	// Skutek takiego przejścia jest łagodny i policzony: moduł spoza wczytanej drabiny
	// nie ma tytułu, więc wypada z komunikatu (a `unlockedCount` zostawia wtedy ślad
	// w dzienniku) — nigdy nie jedzie na ekran wewnętrznym kodem. Nie rozszerzam
	// porównania na całą drabinę, bo to wymagałoby drugiego źródła prawdy o kolejności
	// modułów; opis ma być równy temu, co kod faktycznie sprawdza.
	// Zachowana świadomie mimo naprawy W2/W3 (decyzja moja, zgłoszona Oliverowi).
	if (ladder[0]?.slug !== outcome.rootSlug) {
		logError(
			"curriculum.placement.screen",
			new Error("Rozjazd ścieżek: korzeń drabiny ekranu ≠ rootSlug werdyktu placementu"),
			{
				studentId,
				pathKey,
				ladderRoot: ladder[0]?.slug ?? "(pusta drabina)",
				verdictRoot: outcome.rootSlug ?? "(brak korzenia w werdykcie)",
			},
		);
		return null;
	}

	const titleBySlug = new Map(ladder.map((m) => [m.slug, m.title]));
	const brakujaceTytuly = outcome.unlockedSlugs.filter((s) => !titleBySlug.has(s));
	if (brakujaceTytuly.length > 0) {
		for (const [slug, title] of await loadTitlesBySlug(brakujaceTytuly)) {
			titleBySlug.set(slug, title);
		}
	}

	// Blok 2 — „co otworzyła DIAGNOZA". Moduł bez tytułu wypada z listy, a nie
	// jedzie na ekran slugiem (§12.7 pkt 4: żadnych wewnętrznych kodów).
	// Predykat WSPÓLNY z modelem widoku (`placement-title.ts`, naprawa K1): wcześniej
	// serwer przepuszczał pusty tytuł, a klient go odsiewał — ta sama reguła w dwóch
	// kopiach, rozjeżdżająca się na danych z ingestu.
	const unlockedByDiagnosis: PlacementScreenModule[] = outcome.unlockedSlugs
		.map((slug) => ({ slug, title: titleBySlug.get(slug) }))
		.filter((m): m is PlacementScreenModule => jestTytulemDoPokazania(m.title));

	// FAKT ODDZIELONY OD PREZENTACJI (sedno K1). `unlockedCount` mówi, ILE modułów
	// otworzyła diagnoza — liczone z WERDYKTU, przed jakimkolwiek odsiewaniem pod
	// wyświetlenie. Ekran przełącza teksty na warianty zerowe („dlatego zaczynamy od
	// początku ścieżki") właśnie tym faktem; wyprowadzanie go z długości listy PO
	// filtrze znaczyło, że brak tytułu w katalogu zmienia TREŚĆ komunikatu o wyniku
	// diagnozy. Student z dwoma otwartymi modułami dostawał zdanie, że nie otworzyliśmy
	// nic. Filtr prezentacyjny nie ma prawa zmieniać twierdzenia o rzeczywistości.
	const unlockedCount = outcome.unlockedSlugs.length;
	if (unlockedCount !== unlockedByDiagnosis.length) {
		// Defekt danych, nie stan biznesowy: moduł otwarty, ale bez tytułu do pokazania.
		// Ma zostawić ślad, bo inaczej ubywa go z ekranu po cichu.
		logError(
			"curriculum.placement.screen",
			new Error("Moduł otwarty placementem nie ma tytułu do pokazania"),
			{
				studentId,
				pathKey,
				otwartych: unlockedCount,
				zTytulem: unlockedByDiagnosis.length,
			},
		);
	}

	// Blok 1 — dorobek studenta. Źródłem jest DRABINA (stan), nie werdykt: to jest
	// „co masz zaliczone", a nie „co diagnoza pominęła". `alreadyCompletedSlugs`
	// z werdyktu jest węższe (tylko wewnątrz prefiksu) i służy miernikowi, nie ekranowi.
	const completedModules: PlacementScreenModule[] = ladder
		.filter((m) => m.status === "completed")
		.map((m) => ({ slug: m.slug, title: m.title }));

	// Blok 2b — komplet albo nic.
	const hole = await buildHole(outcome, titleBySlug);

	const { module: rekomendacja, noRecommendationReason } = pickRecommendation(ladder);

	return {
		unlockedByDiagnosis,
		unlockedCount,
		completedModules,
		hole,
		recommendation: rekomendacja ? { slug: rekomendacja.slug, title: rekomendacja.title } : null,
		noRecommendationReason,
		// Pozycja 1 = korzeń (`getLadder` sortuje po `curriculum_path_modules.position`).
		// ⚠ DŁUG „ZNALEZISKO B": pojęcie „korzeń = pozycja 1" żyje w trzech wyrażeniach
		// (tu, w `pickRecommendation` wyżej i w `placement.ts` przy W-6). Dziś wszystkie
		// są ZGODNE, więc rozjazd jest niemożliwy bez zmiany modelu drabiny — i dlatego
		// próg brzmi: **pierwsza zmiana modelu drabiny, w której korzeń przestaje być
		// pozycją 1**. Wtedy przejrzeć wszystkie trzy naraz, nie po kolei.
		recommendationIsRoot: rekomendacja?.position === 1,
	};
}

/** Blok 2b: `{tytuł modułu, nazwa kompetencji, powód}` albo `null` — bez stanów pośrednich. */
async function buildHole(
	outcome: PlacementOutcome,
	titleBySlug: Map<string, string>,
): Promise<PlacementScreenHole | null> {
	const slug = outcome.blockingHoleSlug;
	if (!slug) return null;
	const verdict = outcome.modules.find((m) => m.slug === slug);
	if (!verdict || !jestPowodemDziury(verdict.reason)) return null;
	if (!verdict.conceptSlug) return null;

	const moduleTitle = titleBySlug.get(slug) ?? (await loadTitlesBySlug([slug])).get(slug);
	if (!moduleTitle) return null;

	const competencyName = await loadCompetencyName(verdict.conceptSlug);
	if (!competencyName) return null;

	return { moduleTitle, competencyName, reason: verdict.reason };
}
