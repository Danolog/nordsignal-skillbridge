// ============================================================================
// 1E.7 (SLICE L2, rozszerzony w L4 o §6c) — reguła placementu: wynik diagnozy
// → odblokowany prefiks drabiny. CZYSTE funkcje, 0 DB, 0 LLM, 0 I/O — wzorzec
// staircase.ts (1.11) i review/scheduler.ts (1E.4). Ten plik NIE dotyka bazy,
// tras ani czasu: wejście w całości podaje wołający (L3), wyjście deterministyczne.
//
// ŹRÓDŁO PRAWDY: docs/product/decyzje-1e7-placement-v0.1.md (v0.4, Sophia) —
// DECYZJA 2 (próg ≥3 + tryb wsparcia), DECYZJA 5 (reguła prefiksowa),
// §6 (przypadki brzegowe), §6c (W-6 + W-7, dodane w v0.4). Rama: decyzja
// Darka 2026-07-26 — wariant hybrydowy
// „diagnoza OTWIERA, egzamin ZALICZA". Odblokowanie ≠ zaliczenie: ten moduł
// nie produkuje żadnego dowodu kompetencji, tylko prawo wejścia.
//
// ── REGUŁA W BRZMIENIU WIĄŻĄCYM (DECYZJA 5 + §6c) ──────────────────────────
//  1. Moduł KWALIFIKUJE SIĘ ⟺ ma tag (nie NULL) i concepts[tag].level ≥ próg,
//     ALBO jest ZALICZONY (W-7, v0.4 §6c — patrz niżej).
//  2. k = pozycja najgłębszego kwalifikującego się modułu; brak → nic.
//  3. Dziura: otagowany moduł na pozycjach 2…k, który się nie kwalifikuje,
//     cofa k przed siebie (powtarzaj aż prefiks jest wolny od dziur).
//  4. Odblokowane = moduły na pozycjach 2…k (moduły z NULL jadą z prefiksem),
//     MINUS moduły już zaliczone (W-6, §6c — placement ich nie dotyka).
//  5. Moduł z NULL NIGDY nie wyznacza k (nie przedłuża prefiksu poza ostatni
//     moduł potwierdzony WŁASNYM pomiarem). Moduł ZALICZONY jest potwierdzony
//     pomiarem MOCNIEJSZYM niż diagnoza (egzamin ≈90%), więc k wyznacza.
//  6. Korzeń drabiny (pozycja 1, `l0-start`) nigdy nie jest odblokowywany
//     placementem — jest dostępny zawsze, niezależnie od diagnozy.
//
// ── W-7: MODUŁ ZALICZONY SPEŁNIA WARUNEK CIĄGŁOŚCI (v0.4 §6c) ──────────────
// Do L3 reguła znała wyłącznie wynik diagnozy. Student, który ZDAŁ `m-eda`
// egzaminem (≈90%), a przy re-onboardingu wypadł słabo na `ds-eda` (2 pytania),
// dostawał DZIURĘ na module, który ma zaliczony — prefiks ucinał się przed
// wszystkim powyżej. Słaby instrument unieważniał mocny, czyli odwrotność
// zasady, na której stoi cała hybryda „diagnoza OTWIERA, egzamin ZALICZA".
// Dlatego zbiór modułów zaliczonych jest WEJŚCIEM reguły — tak jak próg —
// a funkcja zostaje CZYSTA (zero bazy; zbiór podaje L3).
//
// ── W-6: MODUŁ ZALICZONY NIE DOSTAJE ODBLOKOWANIA (v0.4 §6c) ───────────────
// Zaliczony moduł NIE trafia do `unlockedSlugs` i ma własny powód
// (`already_completed`), więc L3 nie ma z czego zapisać wiersza. To jest
// egzekwowane W REGULE, nie filtrem w serwisie: filtr da się pominąć w drugim
// miejscu zapisu, niezmiennik czystej funkcji — nie. Powód produktowy (Sophia):
// wiersz produkuje komunikat „diagnoza otworzyła ci moduł X" skierowany do
// osoby, która sama zdała go na ≈90% — przypisanie produktowi cudzej pracy
// i opisanie mocnego dowodu słownikiem słabego. Powód danych (Ryan): art. 5
// ust. 1 lit. d (prawidłowość) + niezmiennik nośnika „wiersz istnieje ⟺ moduł
// otwarty", na którym stoi uzasadnienie retencji.
//
// Implementacja to JEDEN przebieg w przód (`resolvePrefixEnd`), równoważny
// powyższemu sformułowaniu deklaratywnemu: idąc od pozycji 2 w górę, moduł
// spełniający warunek (pomiar ALBO zaliczenie) przesuwa k na siebie, pierwszy
// otagowany niespełniający przerywa marsz (reguła 3), a moduł z NULL i bez
// zaliczenia ani nie przesuwa k, ani nie przerywa (reguły 4–5). Równoważność
// obu sformułowań jest testowana wyczerpująco przeciw NIEZALEŻNEJ implementacji
// deklaratywnej (`__tests__/placement.test.ts`, trzy przebiegi): S1 — wszystkie
// 15 625 kształtów diagnozy bez zaliczeń; S2 — PEŁNY iloczyn diagnoza ×
// podzbiór zaliczeń na drabinie o kompletnej strukturze; S3 — wszystkie 512
// podzbiorów zaliczeń na realnej drabinie DS. Razem ~162 tys. porównań.
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
//  • nie CZYTA statusów zaliczenia — dostaje je gotowe na wejściu (L3),
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
	/**
	 * Moduł JUŻ ZALICZONY (`exam` / `test_out`) — placement go POMIJA: bez wiersza,
	 * bez komunikatu, bez zmiany statusu (§6c, W-6). Powód ma pierwszeństwo przed
	 * każdym innym poza `root`, także gdy moduł leży za dziurą: to, co student
	 * o nim widzi, pochodzi z jego własnego stanu („zaliczony — egzamin"),
	 * a nie z diagnozy. Moduł zaliczony NIGDY nie jest `unlocked`.
	 */
	| "already_completed"
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
	/**
	 * Czy moduł kwalifikuje się na WŁASNYM pomiarze DIAGNOZY (tag + poziom ≥ próg).
	 * ŚWIADOMIE bez zaliczenia: `qualifies` niesie siłę dowodu Z DIAGNOZY, bo to
	 * ona jest zmienną mierzoną w progu alarmowym Sophii (DECYZJA 2). Ciągłość
	 * prefiksu (W-7) liczy się z `qualifies || completed` — patrz `satisfiesPrefix`.
	 */
	qualifies: boolean;
	/** Czy moduł jest już ZALICZONY (wejście reguły; §6c). Zaliczony ⇒ `unlocked: false`. */
	completed: boolean;
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
	/**
	 * Slugi modułów OTWARTYCH placementem, w kolejności drabiny: pozycje 2…k
	 * MINUS moduły już zaliczone (W-6, §6c). To jest dokładnie zbiór, dla którego
	 * L3 zapisuje wiersze — „wiersz istnieje ⟺ moduł otwarty przez placement".
	 */
	unlockedSlugs: string[];
	/**
	 * Moduły w prefiksie POMINIĘTE, bo student ma je zaliczone (W-6). Nie jest to
	 * ozdoba: bez tej liczby sesja „zero odblokowań" studenta, który ma już całą
	 * drabinę zdaną, wygląda w mierniku IDENTYCZNIE jak sesja, w której placement
	 * nic nie otworzył, bo student nic nie umie. To dwa przeciwne stany.
	 */
	alreadyCompletedSlugs: string[];
	/**
	 * Najgłębszy odblokowany moduł — u Sophii (§7) to REKOMENDOWANY punkt wejścia
	 * („drabina nie skacze studenta automatycznie; rekomendowany start to najgłębszy
	 * odblokowany moduł"). Mikrocopy §8: „Diagnoza otworzyła Ci ścieżkę aż do modułu
	 * {tytuł}". null = placement nic nie otworzył.
	 *
	 * Liczony z `unlockedSlugs`, więc moduł ZALICZONY leżący w prefiksie nie może
	 * nim zostać (W-6). To celowe: zdanie „diagnoza otworzyła Ci ścieżkę aż do
	 * {X}" o module zdanym przez studenta egzaminem jest dokładnie tym
	 * przypisaniem cudzej pracy, którego zabrania §6c.
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
	/**
	 * Slugi modułów ZALICZONYCH przez studenta (`curriculum_module_progress.status
	 * = 'completed'`) — wejście W-7/W-6 (§6c). Wołający odczytuje je z bazy; reguła
	 * zostaje czysta.
	 *
	 * ŚWIADOMIE POLE WYMAGANE, bez wartości domyślnej — w przeciwieństwie do progu.
	 * Próg ma sensowną wartość domyślną (decyzja produktowa), a „zbiór zaliczeń"
	 * nie ma: pominięcie go po cichu przywraca DOKŁADNIE tę awarię, którą W-7
	 * naprawia (słaby instrument unieważnia mocny). Wymagalność sprawia, że każdy
	 * nowy wołający — w tym L5 z `test_out` — musi podjąć tę decyzję świadomie,
	 * a kompilator ją wymusi. Pusta tablica = „student nie ma nic zaliczonego".
	 */
	completedModuleSlugs: readonly string[];
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
 *
 * `satisfiesBySlug` to `qualifies || completed` (W-7): moduł ZALICZONY spełnia
 * warunek ciągłości i przedłuża prefiks tak samo jak moduł potwierdzony
 * diagnozą — bo jest potwierdzony instrumentem MOCNIEJSZYM (egzamin ≈90%
 * kontra dwa pytania). Dotyczy to także modułu z tagiem NULL: reguła 5 wyklucza
 * z wyznaczania k moduły NIEZMIERZONE, a zaliczony zmierzony jest.
 */
function resolvePrefixEnd(
	ordered: readonly PlacementLadderModule[],
	satisfiesBySlug: ReadonlyMap<string, boolean>,
	completedBySlug: ReadonlySet<string>,
): { prefixEnd: number; holeSlug: string | null } {
	let prefixEnd = 0;
	for (let i = 1; i < ordered.length; i++) {
		const module_ = ordered[i];
		const satisfies = satisfiesBySlug.get(module_.slug) ?? false;
		// Moduł bez tagu i bez zaliczenia: jedzie z prefiksem, ale go nie
		// przedłuża (reguły 4–5) i nigdy nie jest dziurą.
		if (module_.diagnosticConceptSlug === null && !completedBySlug.has(module_.slug)) continue;
		// Pierwszy otagowany, który nie spełnia warunku = dziura: prefiks kończy
		// się na ostatnim module potwierdzonym pomiarem (reguła 3). Moduł zaliczony
		// NIGDY nie jest dziurą — o to chodzi w W-7.
		if (!satisfies) {
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
			alreadyCompletedSlugs: [],
			deepestUnlockedSlug: null,
			firstNotUnlockedSlug: null,
			blockingHoleSlug: null,
			rootSlug: null,
			modules: [],
		};
	}

	const diagnosis = input.diagnosis;
	const uncovered = new Set(diagnosis?.uncovered ?? []);
	const completedBySlug = new Set(input.completedModuleSlugs);
	const levelBySlug = new Map<string, CompetencyLevel | null>();
	const qualifiesBySlug = new Map<string, boolean>();
	const satisfiesBySlug = new Map<string, boolean>();
	for (const module_ of ordered) {
		const level = levelForModule(module_, diagnosis);
		levelBySlug.set(module_.slug, level);
		// isQualifyingLevel(null) === false, a levelForModule zwraca null dla tagu NULL —
		// osobny warunek na diagnosticConceptSlug byłby martwy (mutacja M7 Leo przeżyła
		// komplet testów). Żywy strażnik reguły 5 stoi w resolvePrefixEnd.
		const qualifies = isQualifyingLevel(level, threshold);
		qualifiesBySlug.set(module_.slug, qualifies);
		// W-7: ciągłość prefiksu liczy się z DWÓCH źródeł dowodu (diagnoza ALBO
		// zaliczenie). `qualifies` zostaje węższe — niesie wyłącznie siłę dowodu
		// z diagnozy, bo to ona jest zmienną w progu alarmowym Sophii.
		satisfiesBySlug.set(module_.slug, qualifies || completedBySlug.has(module_.slug));
	}

	const { prefixEnd, holeSlug } = resolvePrefixEnd(ordered, satisfiesBySlug, completedBySlug);

	const modules: PlacementModuleVerdict[] = ordered.map((module_, index) => {
		const level = levelBySlug.get(module_.slug) ?? null;
		const qualifies = qualifiesBySlug.get(module_.slug) ?? false;
		const completed = completedBySlug.has(module_.slug);
		const isRoot = index === 0;
		// Korzeń NIGDY nie jest odblokowywany placementem (reguła 6) — jest dostępny
		// z mocy bycia korzeniem, nie z mocy diagnozy.
		// Moduł ZALICZONY nigdy nie jest odblokowywany (W-6, §6c) — nie potrzebuje
		// uprawnienia do wejścia, więc nie ma po co powstawać wiersz ani komunikat.
		const unlocked = !isRoot && !completed && module_.position <= prefixEnd;

		let reason: PlacementReason;
		if (isRoot) {
			reason = "root";
		} else if (completed) {
			// Pierwszeństwo PRZED prefiksem i przed dziurą: dla modułu zaliczonego
			// placement nie ma nic do powiedzenia, niezależnie od tego, gdzie leży
			// (§6c: „Co student widzi na jego temat w komunikacie o placemencie: nic").
			reason = "already_completed";
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
			completed,
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
		// Pominięte przez W-6 liczymy TYLKO wewnątrz prefiksu: zaliczenie leżące
		// poza prefiksem (np. za dziurą) nie jest „pominięciem przez placement",
		// tylko modułem, którego placement i tak by nie otworzył.
		alreadyCompletedSlugs: modules
			.filter((m) => m.completed && m.position > 1 && m.position <= prefixEnd)
			.map((m) => m.slug),
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
