// ============================================================================
// 1E.7 (SLICE L2) — reguła placementu: wynik diagnozy → odblokowany prefiks
// drabiny. CZYSTE funkcje, 0 DB, 0 LLM, 0 I/O — wzorzec staircase.ts (1.11)
// i review/scheduler.ts (1E.4). Ten plik NIE dotyka bazy, tras ani czasu:
// wejście w całości podaje wołający (L3), wyjście jest deterministyczne.
//
// ŹRÓDŁO PRAWDY: docs/product/decyzje-1e7-placement-v0.1.md (v0.3, Sophia) —
// DECYZJA 2 (próg ≥3 + tryb wsparcia), DECYZJA 5 (reguła prefiksowa),
// §6 (przypadki brzegowe). Rama: decyzja Darka 2026-07-26 — wariant hybrydowy
// „diagnoza OTWIERA, egzamin ZALICZA". Odblokowanie ≠ zaliczenie: ten moduł
// nie produkuje żadnego dowodu kompetencji, tylko prawo wejścia.
//
// ── REGUŁA W BRZMIENIU WIĄŻĄCYM (DECYZJA 5) ────────────────────────────────
//  1. Moduł KWALIFIKUJE SIĘ ⟺ ma tag (nie NULL) i concepts[tag].level ≥ próg.
//  2. k = pozycja najgłębszego kwalifikującego się modułu; brak → nic.
//  3. Dziura: otagowany moduł na pozycjach 2…k, który się nie kwalifikuje,
//     cofa k przed siebie (powtarzaj aż prefiks jest wolny od dziur).
//  4. Odblokowane = moduły na pozycjach 2…k (moduły z NULL jadą z prefiksem).
//  5. Moduł z NULL NIGDY nie wyznacza k (nie przedłuża prefiksu poza ostatni
//     moduł potwierdzony WŁASNYM pomiarem).
//  6. Korzeń drabiny (pozycja 1, `l0-start`) nigdy nie jest odblokowywany
//     placementem — jest dostępny zawsze, niezależnie od diagnozy.
//
// Implementacja to JEDEN przebieg w przód (`resolvePrefixEnd`), równoważny
// powyższemu sformułowaniu deklaratywnemu: idąc od pozycji 2 w górę, moduł
// otagowany i kwalifikujący się przesuwa k na siebie, pierwszy otagowany
// niekwalifikujący się przerywa marsz (reguła 3), a moduł z NULL ani nie
// przesuwa k, ani nie przerywa (reguły 4–5). Równoważność obu sformułowań
// jest testowana wyczerpująco (`__tests__/placement.test.ts` — 15 625
// kombinacji wyniku diagnozy przeciw referencyjnej implementacji reguł 1–6).
//
// ── DLACZEGO `NULL` NIE JEST ZEREM ─────────────────────────────────────────
// NULL znaczy „NIE ZMIERZYLIŚMY", nie „student nie umie" (DECYZJA 5,
// doprecyzowanie). Bank `ds-python` nie pyta o pętle ani słowniki, więc
// `f2-python-2` i `f3-dane-python` mają NULL. Gdyby NULL blokował prefiks,
// funkcja nie odblokowałaby nikomu niczego poza `f1-python-1`.
//
// ── CZEGO TEN MODUŁ NIE ROBI (granice slice'a) ─────────────────────────────
//  • nie zapisuje niczego (nośnik odblokowania = L3, §7 pkt 2 dokumentu),
//  • nie sumuje odblokowań z wielu sesji (§6b monotoniczność = L3),
//  • nie patrzy na moduły już zaliczone (§6c — placement ich nie dotyka = L3),
//  • nie rozstrzyga egzamin/test_out (L5) ani UI (L6).
// ============================================================================

import type { AssessmentResult, CompetencyLevel } from "@/lib/assessment/types";

/**
 * Próg domyślny (DECYZJA 2 — poziom 3 lub 4 kwalifikuje). ŚWIADOMIE parametr
 * z wartością domyślną, nie stała wbudowana w warunek: Sophia zapisała miernik
 * z progiem alarmowym i jawną deklaracją podniesienia progu do 4, jeśli
 * studenci odblokowani na poziomie 3 oblewają pierwszy egzamin istotnie
 * częściej. Podniesienie progu ma być zmianą konfiguracji, nie reguły.
 */
export const DEFAULT_PLACEMENT_THRESHOLD: CompetencyLevel = 3;

/**
 * Moduł drabiny w kształcie potrzebnym regule. Świadomie odseparowany od
 * wiersza Drizzle (moduł jest czysty, bez importu DB) — L3 mapuje wiersz na
 * ten kształt.
 *
 * UWAGA NA KLUCZ: `curriculum_modules.diagnostic_concept_id` to UUID, a
 * `result_json.concepts` jest kluczowany SLUGIEM konceptu. L3 musi rozwiązać
 * uuid → slug złączeniem z `question_concepts` (jedno złączenie, wykonane raz),
 * a nie zgadywać. Tu przyjmujemy już rozwiązany slug — inaczej reguła
 * milcząco nie trafiałaby w żaden pomiar.
 */
export interface PlacementLadderModule {
	/** Slug modułu (`curriculum_modules.slug`) — tożsamość w drabinie. */
	slug: string;
	/** Pozycja w ścieżce (`curriculum_path_modules.position`), 1-based, unikalna. */
	position: number;
	/**
	 * Tag diagnostyczny: slug konceptu rynkowego albo `null`.
	 * `null` = „nie zmierzyliśmy" (decyzja), NIGDY „student nie umie".
	 */
	diagnosticConceptSlug: string | null;
	/**
	 * Nazwa kompetencji, do której należy koncept (`question_concepts.competency_name`).
	 * Opcjonalna — potrzebna WYŁĄCZNIE do rozróżnienia „kompetencji nie badaliśmy"
	 * (`uncovered`, §6a) od „nie ma pomiaru z innego powodu". `result_json.uncovered`
	 * niesie NAZWY KOMPETENCJI, a `concepts` — SLUGI KONCEPTÓW; bez tego pola nie da
	 * się ich zestawić i reguła zwraca ostrożniejsze `no_measurement`.
	 */
	competencyName?: string | null;
}

/**
 * Wejściowy wynik diagnozy. Przyjmuje całe `assessment_sessions.result_json`
 * (AssessmentResult jest przypisywalny) albo węższy obiekt — reguła czyta
 * wyłącznie `concepts` (źródło prawdy dla placementu, spec §3 [REV]) i
 * `uncovered` (do uzasadnienia, nigdy do kwalifikacji).
 */
export type PlacementDiagnosis = Pick<AssessmentResult, "concepts" | "uncovered">;

/**
 * Powód werdyktu per moduł — maszynowy, do śladu audytowego (L3) i do wyboru
 * mikrocopy (L6, §8 dokumentu Sophii). Świadomie rozłączne kody zamiast zdania
 * po polsku: tekst należy do Sophii, nie do backendu.
 */
export type PlacementReason =
	/** Korzeń drabiny (pozycja 1) — dostępny zawsze, nigdy „odblokowany" (DECYZJA 3). */
	| "root"
	/** Odblokowany na WŁASNYM pomiarze (tag + poziom ≥ próg). */
	| "qualified"
	/** Odblokowany, bo leży wewnątrz prefiksu, ale sam nie był mierzony (tag NULL). */
	| "carried_untagged"
	/** Nieodblokowany: tag jest, pomiar jest, poziom poniżej progu. */
	| "below_threshold"
	/** Nieodblokowany: tag jest, ale kompetencji w ogóle nie badaliśmy (§6a). */
	| "uncovered"
	/** Nieodblokowany: tag jest, ale wyniku dla tego konceptu brak (brak sesji, porzucona sesja, §6d). */
	| "no_measurement"
	/** Nieodblokowany: kwalifikuje się, ale leży ZA dziurą w prefiksie (reguła 3). */
	| "beyond_prefix"
	/** Nieodblokowany: tag NULL i leży poza prefiksem — sam nigdy go nie przedłuży (reguła 5). */
	| "untagged_beyond_prefix";

/** Tryb wsparcia przy wejściu w moduł (DECYZJA 2, mechanizm C7/C8 z ADR-014 D8). */
export type PlacementSupportMode = "full" | "fading";

/** Werdykt reguły dla jednego modułu — uzasadnienie, na którym stoi L3 i L6. */
export interface PlacementModuleVerdict {
	slug: string;
	position: number;
	/** Tag użyty przy ocenie (slug konceptu) albo null. */
	conceptSlug: string | null;
	/** Poziom odczytany z diagnozy dla tego tagu; null = brak pomiaru albo brak tagu. */
	level: CompetencyLevel | null;
	/** Czy moduł kwalifikuje się na WŁASNYM pomiarze (reguła 1). */
	qualifies: boolean;
	/** Czy placement go otwiera (reguła 4). */
	unlocked: boolean;
	reason: PlacementReason;
	/**
	 * Tryb wsparcia dla modułu otwartego na własnym pomiarze: poziom równy
	 * progowi = moduł graniczny → `full`; wyżej → `fading` (DECYZJA 2).
	 * `null` dla modułów bez własnego pomiaru — brak sygnału, decyzję o
	 * domyślnym wsparciu podejmuje warstwa wyżej.
	 */
	supportMode: PlacementSupportMode | null;
}

/** Wynik reguły placementu dla jednej drabiny i jednego wyniku diagnozy. */
export interface PlacementOutcome {
	/** Próg faktycznie użyty (do śladu audytowego — miernik z DECYZJI 2). */
	threshold: CompetencyLevel;
	/** Pozycja końca prefiksu (k z DECYZJI 5); 0 = nic nie odblokowane. */
	prefixEndPosition: number;
	/** Slugi modułów otwartych placementem, w kolejności drabiny (pozycje 2…k). */
	unlockedSlugs: string[];
	/**
	 * Najgłębszy odblokowany moduł — u Sophii (§7) to REKOMENDOWANY punkt wejścia
	 * („drabina nie skacze studenta automatycznie; rekomendowany start to najgłębszy
	 * odblokowany moduł"). Mikrocopy §8: „Diagnoza otworzyła Ci ścieżkę aż do modułu
	 * {tytuł}". null = placement nic nie otworzył.
	 */
	deepestUnlockedSlug: string | null;
	/**
	 * Pierwszy moduł ZA prefiksem (pozycja k+1) — pierwszy, którego placement NIE
	 * otworzył. Osobne pole od `deepestUnlockedSlug`, bo to dwie różne rzeczy i
	 * zlanie ich w jedno „punkt startu" przesuwa studenta o moduł. Wybór, które
	 * pole napędza ekran „Twój punkt startu", należy do L6 — patrz rozbieżność
	 * opisana w nagłówku testów. null = cała drabina otwarta.
	 */
	firstNotUnlockedSlug: string | null;
	/**
	 * Pierwszy otagowany moduł, który NIE zakwalifikował się i przez to zatrzymał
	 * prefiks (dziura, reguła 3). Nośnik mikrocopy §8 („{kompetencja płytsza}
	 * wypadła słabo — a w tej ścieżce to fundament"). null = prefiks nie został
	 * zatrzymany dziurą (albo skończył się na końcu drabiny).
	 */
	blockingHoleSlug: string | null;
	/** Korzeń drabiny (pozycja 1) — dostępny zawsze, nigdy w `unlockedSlugs`. */
	rootSlug: string | null;
	/** Werdykt per moduł w kolejności drabiny — ślad audytowy L3 + treść ekranu L6. */
	modules: PlacementModuleVerdict[];
}

/** Parametry reguły. Diagnoza `null` = brak ukończonej sesji (§6d): zero odblokowań. */
export interface PlacementInput {
	modules: readonly PlacementLadderModule[];
	diagnosis: PlacementDiagnosis | null;
	/** Próg kwalifikacji; domyślnie DEFAULT_PLACEMENT_THRESHOLD (DECYZJA 2). */
	threshold?: CompetencyLevel;
}

/** Czy pojedynczy pomiar kwalifikuje przy danym progu (reguła 1, część poziomowa). */
export function isQualifyingLevel(
	level: CompetencyLevel | null | undefined,
	threshold: CompetencyLevel = DEFAULT_PLACEMENT_THRESHOLD,
): boolean {
	return level != null && level >= threshold;
}

/**
 * Kwalifikacja modułu na WŁASNYM pomiarze (reguła 1). Brak tagu, brak pomiaru,
 * `uncovered` i poziom poniżej progu — wszystko NIE kwalifikuje.
 */
function levelForModule(
	module_: PlacementLadderModule,
	diagnosis: PlacementDiagnosis | null,
): CompetencyLevel | null {
	if (module_.diagnosticConceptSlug === null || diagnosis === null) return null;
	return diagnosis.concepts[module_.diagnosticConceptSlug]?.level ?? null;
}

/**
 * Koniec prefiksu (k) — jeden przebieg w przód od pozycji 2 (reguły 2–5).
 * `modules` MUSI być posortowane rosnąco po pozycji.
 */
function resolvePrefixEnd(
	ordered: readonly PlacementLadderModule[],
	qualifiesBySlug: ReadonlyMap<string, boolean>,
): { prefixEnd: number; holeSlug: string | null } {
	let prefixEnd = 0;
	for (let i = 1; i < ordered.length; i++) {
		const module_ = ordered[i];
		// Moduł bez tagu: jedzie z prefiksem, ale go nie przedłuża (reguły 4–5).
		if (module_.diagnosticConceptSlug === null) continue;
		// Pierwszy otagowany, który się nie kwalifikuje = dziura: prefiks kończy
		// się na ostatnim module potwierdzonym własnym pomiarem (reguła 3).
		if (!qualifiesBySlug.get(module_.slug)) {
			return { prefixEnd, holeSlug: module_.slug };
		}
		prefixEnd = module_.position;
	}
	return { prefixEnd, holeSlug: null };
}

/**
 * computePlacement — jedyne wejście reguły. Deterministyczna, bez efektów
 * ubocznych, nie mutuje wejścia (sortowanie na kopii).
 *
 * Fail-closed na konfiguracji drabiny: powtórzona pozycja to błąd danych, przy
 * którym „prefiks" przestaje być jednoznaczny — rzucamy zamiast zgadywać
 * (student nie może dostać dostępu z niejednoznacznej drabiny).
 */
export function computePlacement(input: PlacementInput): PlacementOutcome {
	const threshold = input.threshold ?? DEFAULT_PLACEMENT_THRESHOLD;
	if (!Number.isInteger(threshold) || threshold < 1 || threshold > 4) {
		throw new Error(
			`[placement] Próg musi być liczbą całkowitą 1–4 (skala poziomów diagnozy); dostałem: ${threshold}`,
		);
	}

	const ordered = [...input.modules].sort((a, b) => a.position - b.position);
	const positions = new Set(ordered.map((m) => m.position));
	if (positions.size !== ordered.length) {
		throw new Error(
			"[placement] Drabina ma powtórzone pozycje modułów — kolejność niejednoznaczna.",
		);
	}
	if (ordered.length === 0) {
		return {
			threshold,
			prefixEndPosition: 0,
			unlockedSlugs: [],
			deepestUnlockedSlug: null,
			firstNotUnlockedSlug: null,
			blockingHoleSlug: null,
			rootSlug: null,
			modules: [],
		};
	}

	const diagnosis = input.diagnosis;
	const uncovered = new Set(diagnosis?.uncovered ?? []);
	const levelBySlug = new Map<string, CompetencyLevel | null>();
	const qualifiesBySlug = new Map<string, boolean>();
	for (const module_ of ordered) {
		const level = levelForModule(module_, diagnosis);
		levelBySlug.set(module_.slug, level);
		// isQualifyingLevel(null) === false, a levelForModule zwraca null dla tagu NULL —
		// osobny warunek na diagnosticConceptSlug byłby martwy (mutacja M7 Leo przeżyła
		// komplet testów). Żywy strażnik reguły 5 stoi w resolvePrefixEnd.
		qualifiesBySlug.set(module_.slug, isQualifyingLevel(level, threshold));
	}

	const { prefixEnd, holeSlug } = resolvePrefixEnd(ordered, qualifiesBySlug);

	const modules: PlacementModuleVerdict[] = ordered.map((module_, index) => {
		const level = levelBySlug.get(module_.slug) ?? null;
		const qualifies = qualifiesBySlug.get(module_.slug) ?? false;
		const isRoot = index === 0;
		// Korzeń NIGDY nie jest odblokowywany placementem (reguła 6) — jest dostępny
		// z mocy bycia korzeniem, nie z mocy diagnozy.
		const unlocked = !isRoot && module_.position <= prefixEnd;

		let reason: PlacementReason;
		if (isRoot) {
			reason = "root";
		} else if (unlocked) {
			reason = qualifies ? "qualified" : "carried_untagged";
		} else if (module_.diagnosticConceptSlug === null) {
			reason = "untagged_beyond_prefix";
		} else if (qualifies) {
			reason = "beyond_prefix";
		} else if (level !== null) {
			reason = "below_threshold";
		} else if (module_.competencyName != null && uncovered.has(module_.competencyName)) {
			reason = "uncovered";
		} else {
			reason = "no_measurement";
		}

		return {
			slug: module_.slug,
			position: module_.position,
			conceptSlug: module_.diagnosticConceptSlug,
			level,
			qualifies,
			unlocked,
			reason,
			// Trzy gałęzie trybu wsparcia (Sophia v0.3, DECYZJA 2 — lista wyczerpująca):
			// (a) własny pomiar ≥ progu → tryb liczony z poziomu (próg → pełne wsparcie,
			//     wyżej → fading); (b) wciągnięty prefiksem, BEZ własnego pomiaru →
			//     pełne wsparcie, bo dowód jest wyłącznie pośredni (wnioskowanie, nie
			//     pomiar); (c) nieodblokowany → null.
			// `null` NIE jest już stanem osiągalnym dla modułu odblokowanego (v0.3).
			// Rozróżnienie „pomiar własny" kontra „wciągnięty" NIE ginie — niesie je
			// `reason` (qualified / carried_untagged). To jest wymóg miernika Sophii:
			// oba przypadki psują się niezależnie i wymagają PRZECIWNYCH napraw
			// (za niski próg → podnieś próg; za luźne przeciąganie → odetnij F2/F3).
			supportMode: !unlocked
				? null
				: qualifies && level !== null
					? supportMode(level, threshold)
					: "full",
		};
	});

	const unlocked = modules.filter((m) => m.unlocked);
	// `position > prefixEnd` już implikuje `!unlocked` — osobny warunek byłby martwy
	// (mutacja M8 Leo przeżyła komplet testów).
	const firstNotUnlocked = modules.find((m) => m.position > prefixEnd) ?? null;

	return {
		threshold,
		prefixEndPosition: prefixEnd,
		unlockedSlugs: unlocked.map((m) => m.slug),
		deepestUnlockedSlug: unlocked.at(-1)?.slug ?? null,
		firstNotUnlockedSlug: firstNotUnlocked?.slug ?? null,
		blockingHoleSlug: holeSlug,
		rootSlug: ordered[0].slug,
		modules,
	};
}

/**
 * Tryb wsparcia (DECYZJA 2): poziom RÓWNY progowi = moduł graniczny (przy progu 3
 * stoi na jednym trafionym pytaniu) → pełne wsparcie; powyżej progu → normalne
 * wygaszanie. Sformułowane względem progu, nie wobec literalnej „trójki", żeby
 * podniesienie progu do 4 nie odwróciło semantyki po cichu.
 */
function supportMode(level: CompetencyLevel, threshold: CompetencyLevel): PlacementSupportMode {
	return level === threshold ? "full" : "fading";
}
