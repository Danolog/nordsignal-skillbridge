/**
 * 1E.7 L6 · POWIERZCHNIA A — sekcja „Po diagnozie" w kroku 4 kreatora (§12.1).
 *
 * Miejsce w drzewie renderu: pod panelem „Wynik testu", nad `profileNote`
 * (§12.10) — placement jest konsekwencją diagnozy i stoi zaraz za nią.
 *
 * ⚠ KOLIZJA NAZW (§12.1, wiążąca). Ten komponent NALEŻY do `components/curriculum/`.
 * `components/placement/` to funkcja 1.17 — placement ZAWODOWY (zgoda RODO, historia
 * zatrudnienia): inna klasa danych i inna podstawa prawna. Backend trzyma ten rozdział
 * prefiksem `curriculum.` w dzienniku audytowym; UI trzyma go katalogiem.
 *
 * ── TRZY REGUŁY, KTÓRE TEN PLIK EGZEKWUJE ─────────────────────────────────────
 * 1. TEKSTY SĄ CYTATAMI, NIE PARAFRAZAMI. Każde zdanie pochodzi 1:1 z §8 dokumentu
 *    Sophii — łącznie z nagłówkiem „Po diagnozie" i `aria-label` sekcji (§12.3:
 *    etykiety strukturalne są mikrocopy na tych samych prawach co narracja).
 *    Jedyna interpolacja poza nazwami: w zdaniu korzenia tytuł modułu bierzemy
 *    z kontraktu zamiast z literału „Start: środowisko pracy" — tytuły są danymi
 *    z ingestu i literał zgniłby w ciszy przy pierwszej erracie (§12.8 pkt 2).
 * 2. „WYPADŁA SŁABO" WYŁĄCZNIE PRZY `below_threshold` (§12.4 reguła 1). Najczęstszym
 *    powodem zatrzymania prefiksu jest dziś `no_measurement` — kompetencja, o którą
 *    nie padło ANI JEDNO pytanie. Zdanie o słabym wyniku w tym miejscu to produkt
 *    przyłapany na zmyślaniu, wobec studenta, który akurat ma powód sprawdzić.
 * 3. CISZA JEST DECYZJĄ. Z dziewięciu powodów `PlacementReason` siedem nie mówi tu
 *    nic (§12.4): `qualified` i `carried_untagged` mają jedyne wyjście w odznace na
 *    drabinie (powierzchnia B), `already_completed` / `root` / `beyond_prefix` /
 *    `untagged_beyond_prefix` milczą z decyzji produktowej. Do bloku 2b dociera
 *    wyłącznie trójka powodów DZIURY — resztę odsiewa serwer, a granicę sieci
 *    domyka adapter (`placement-summary-vm.ts`).
 */

import type {
	PlacementHoleViewModel,
	PlacementRecommendation,
	PlacementSummaryViewModel,
} from "./placement-summary-vm";

export interface PlacementSummaryProps {
	/**
	 * `null`/`undefined` = §12.6 warianty 1–4 (flaga OFF, brak sesji diagnozy, cel
	 * spoza pilotażu, pusta drabina, awaria hooka) — komponent NIE renderuje NIC:
	 * zero DOM, zero odstępu. Nigdy „sekcja pusta" ani „nie udało się" — placement
	 * jest dodatkiem i jego cisza nie ma prawa zająć miejsca na ekranie studenta.
	 *
	 * Przyczyny nie rozróżniamy tutaj świadomie: cztery warunki rozstrzyga serwer
	 * PRZED wysłaniem (§12.8 pkt 1), front ma jedną regułę zamiast czterech
	 * przepisanych z backendu (Mila §3.2).
	 */
	summary: PlacementSummaryViewModel | null | undefined;
}

/** Nazwa własna w zdaniu — pogrubienie jak w §8 (`**…**`), bez zmiany rozmiaru. */
function Nazwa({ children }: { children: string }) {
	return <span className="font-medium">{children}</span>;
}

export function PlacementSummary({ summary }: PlacementSummaryProps) {
	if (!summary) return null;

	const {
		completedModuleTitles,
		unlockedModuleTitles,
		deepestUnlockedTitle,
		hole,
		recommendation,
	} = summary;
	const hasCompleted = completedModuleTitles.length > 0;
	const hasUnlocked = unlockedModuleTitles.length > 0;

	// WARIANT 8 (§12.6): zaliczenia są, odblokowań nie ma. Zdanie z §8 łączy blok 2
	// z rekomendacją w JEDNYM zdaniu, więc osobny akcent 3 powtórzyłby „zacznij od
	// {moduł}" dwa razy w dwóch stylach (Mila §3.4). Warunek obejmuje kształt
	// rekomendacji: przy wariancie 10 (brak modułu do polecenia) tego zdania nie da
	// się dokończyć i wtedy blok 3 wraca w swojej zastępczej formie.
	const wariant8 = hasCompleted && !hasUnlocked && recommendation.kind === "module";

	const zdanieDziury = holeSentence(hole, deepestUnlockedTitle, hasCompleted);
	const kartaNeutralna = hasCompleted || hasUnlocked || zdanieDziury !== null;

	return (
		<>
			{kartaNeutralna && (
				// Kolejność DOM = kolejność zdań (§12.3, §12.10): najpierw JEGO praca,
				// potem NASZA diagnoza. Bez `order-*` i bez odwracania kierunku flexa,
				// więc czytnik ekranu dostaje dokładnie tę kolejność, którą widzi wzrok.
				<section
					className="rounded-lg border border-border bg-card p-4 space-y-2"
					aria-label="Po diagnozie"
				>
					<h3 className="font-heading text-base font-semibold text-foreground">Po diagnozie</h3>

					{/* Blok 1 — dorobek studenta. Ta sama typografia co blok 2: parytet
					    jest dosłowny, bo wyróżnienie naszej diagnozy kosztem jego pracy
					    odwraca sens, o który walczy §6c. */}
					{hasCompleted && (
						<p className="text-sm text-foreground">
							Masz już zaliczone: <Nazwa>{completedModuleTitles.join(", ")}</Nazwa>.
						</p>
					)}

					{/* Blok 2 — wyłącznie „co otworzyła DIAGNOZA", nigdy stan drabiny (§12.7 pkt 1). */}
					{hasUnlocked && hasCompleted && (
						<p className="text-sm text-foreground">
							Diagnoza otworzyła dodatkowo: <Nazwa>{unlockedModuleTitles.join(", ")}</Nazwa>.
						</p>
					)}
					{hasUnlocked && !hasCompleted && deepestUnlockedTitle !== null && (
						<p className="text-sm text-foreground">
							Diagnoza otworzyła Ci ścieżkę aż do modułu <Nazwa>{deepestUnlockedTitle}</Nazwa>. To
							skrót w nawigacji, nie zaliczenie — moduły po drodze nadal czekają. Żeby moduł liczył
							się jako zaliczony, przejdź go albo zdaj jego egzamin (<Nazwa>test out</Nazwa>).
						</p>
					)}
					{wariant8 && recommendation.kind === "module" && (
						<p className="text-sm text-foreground">
							Diagnoza nie otworzyła nic ponad to — zacznij od <Nazwa>{recommendation.title}</Nazwa>
							.
						</p>
					)}

					{/* Blok 2b — informacja, nie ostrzeżenie: stopień niżej w hierarchii,
					    zero ikony i zero koloru ostrzegawczego (§12.10 wprost). */}
					{zdanieDziury}
				</section>
			)}

			{/* Blok 3 — JEDYNY akcent ekranu (§12.10). Akcent niesie kontener, nie krój
			    pisma; token-set reużyty z `profileNote` i karty „zaznaczyłeś wszystko"
			    w tym samym pliku kroku 4 (Mila §3.5 pkt 3). Bez ikony i bez linku:
			    wyjście z kreatora poza `onComplete()` zostawiłoby `onboardingCompleted=false`
			    (§12.3, wymóg wiążący). */}
			{!wariant8 && (
				<div className="rounded-lg border border-ed-amber bg-ed-badge-bg p-4 text-sm text-ed-amber-text">
					<RecommendationSentence recommendation={recommendation} />
				</div>
			)}
		</>
	);
}

/**
 * Blok 3 — rekomendacja, NIE rozkaz (§12.3): „zacznij od", nigdy „musisz zacząć od".
 * Korzeń dostaje pełne zdanie z §8, bo przy nim chodzi o środowisko pracy, a nie
 * o materiał: „test out" zdaje się pytaniami zamkniętymi, więc można mieć zaliczone
 * moduły wyżej i nie mieć działającego notatnika (DECYZJA 3).
 */
function RecommendationSentence({ recommendation }: { recommendation: PlacementRecommendation }) {
	switch (recommendation.kind) {
		case "module":
			return recommendation.isRoot ? (
				<>
					Zacznij od <Nazwa>{recommendation.title}</Nazwa> — około 15 minut. Bez działającego
					notebooka nie ruszysz żadnego ćwiczenia z kodem, nawet jeśli materiał znasz.
				</>
			) : (
				<>
					Zacznij od <Nazwa>{recommendation.title}</Nazwa>.
				</>
			);
		// Wariant 10 — dwa RÓŻNE zdania dla dwóch różnych stanów (§12.6 wiersz 10):
		// „masz wszystko" to sukces, „treść w drodze" to nasza zaległość, nie jego.
		case "all_completed":
			return "Masz zaliczone wszystko, co dziś jest w ścieżce.";
		case "coming_soon":
			return "Kolejny moduł jest w przygotowaniu.";
	}
}

/**
 * Blok 2b — „dlaczego nie dalej". Wyczerpujący `switch` po trójce powodów dziury;
 * `null` znaczy CISZĘ, a cisza jest tu poprawnym wynikiem, nie brakiem.
 *
 * ⚠ REGUŁA INTERPOLACJI (§8 v0.10, wiążąca dla każdego przyszłego tekstu o dziurze):
 * zdanie wolno zbudować WYŁĄCZNIE z (a) własnych pól dziury — nazwy kompetencji
 * i tytułu modułu — oraz (b) tytułu ostatniego odblokowanego, i to tylko gdy
 * odblokowania są niepuste. Żadnego trzeciego modułu, żadnej trzeciej kompetencji.
 * Jeśli kiedykolwiek zdanie zażąda czwartego pola: ZŁE JEST ZDANIE, nie kontrakt —
 * zgłaszamy Sophii, nie dokładamy pola. Kategoria „kompetencja głębsza" jest
 * zamknięta NA STAŁE, bo reguła placementu nie gwarantuje jej istnienia (dziurą
 * zostaje PIERWSZY otagowany moduł niespełniający warunku), a w osiągalnym
 * kształcie niosłaby moduł PŁYTSZY niż dziura — czyli nieprawdę o własnej drabinie.
 *
 * DWA MIEJSCA, W KTÓRYCH ŚWIADOMIE MILCZYMY:
 *  • Brak tytułu ostatniego odblokowanego przy niezerowych odblokowaniach (stan
 *    nieosiągalny przez kontrakt, ale nie przez sieć) — zdanie wymaga tego pola,
 *    więc bez niego nie powstaje. Nigdy pusty napis, myślnik ani slug.
 *  • KAŻDY powód, gdy odblokowań nie ma, ale zaliczenia są (wariant 8). Warianty
 *    zerowe z §8 mówią „zaczynamy od początku ścieżki" — u studenta z zaliczonymi
 *    modułami to nieprawda, a nieprawda w zdaniu tłumaczącym jest gorsza niż jego brak.
 */
function holeSentence(
	hole: PlacementHoleViewModel | null,
	deepestUnlockedTitle: string | null,
	hasCompleted: boolean,
): React.JSX.Element | null {
	if (!hole) return null;
	const { competencyName, moduleTitle } = hole;

	if (hole.zeroUnlocked) {
		if (hasCompleted) return null;
		switch (hole.reason) {
			case "below_threshold":
				return (
					<p className="text-sm text-muted-foreground">
						<Nazwa>{competencyName}</Nazwa> wypadła w teście słabo, a w tej ścieżce to fundament pod
						resztę — dlatego zaczynamy od początku ścieżki. To wynik dwóch krótkich pytań, nie ocena
						Ciebie. Znasz materiał modułu <Nazwa>{moduleTitle}</Nazwa>? Zdaj jego egzamin (
						<Nazwa>test out</Nazwa>) i przeskocz go.
					</p>
				);
			case "uncovered":
				return (
					<p className="text-sm text-muted-foreground">
						Nie badaliśmy <Nazwa>{competencyName}</Nazwa> w diagnozie — nie mamy do niej pytań w
						banku. Dlatego zaczynamy od początku ścieżki. To nie jest ocena, tylko brak pomiaru.
						Znasz materiał modułu <Nazwa>{moduleTitle}</Nazwa>? Zdaj jego egzamin (
						<Nazwa>test out</Nazwa>) i przeskocz go.
					</p>
				);
			case "no_measurement":
				return (
					<p className="text-sm text-muted-foreground">
						Nie sprawdzaliśmy <Nazwa>{competencyName}</Nazwa>, więc zaczynamy od początku ścieżki.
						To nie jest ocena — to brak pomiaru.
					</p>
				);
		}
	}

	switch (hole.reason) {
		case "below_threshold":
			// Tekst PRZEPISANY w §8 v0.10: opiera się wyłącznie na module, który
			// z definicji istnieje — na samej dziurze. Poprzednie brzmienie żądało
			// „kompetencji głębszej", której reguła NIE GWARANTUJE (dziurą zostaje
			// PIERWSZY otagowany moduł niespełniający warunku, niezależnie od tego,
			// czy cokolwiek głębiej się zakwalifikowało). Milczałem tu do v0.9 i to
			// było poprawne wobec tamtego tekstu; zmienił się tekst, nie reguła.
			if (deepestUnlockedTitle === null) return null;
			return (
				<p className="text-sm text-muted-foreground">
					<Nazwa>{competencyName}</Nazwa> wypadła w teście słabo, a moduł{" "}
					<Nazwa>{moduleTitle}</Nazwa> jest w tej ścieżce fundamentem pod to, co dalej — dlatego
					otwieramy do <Nazwa>{deepestUnlockedTitle}</Nazwa>. To wynik dwóch krótkich pytań, nie
					ocena Ciebie. Znasz materiał tego modułu? Zdaj jego egzamin (<Nazwa>test out</Nazwa>) i
					przeskocz go.
				</p>
			);
		case "uncovered":
			return (
				<p className="text-sm text-muted-foreground">
					Nie badaliśmy <Nazwa>{competencyName}</Nazwa> w diagnozie, więc moduł{" "}
					<Nazwa>{moduleTitle}</Nazwa> zostaje na swoim miejscu. Jeśli znasz ten materiał — zdaj
					egzamin modułu (<Nazwa>test out</Nazwa>) i przeskocz go.
				</p>
			);
		case "no_measurement":
			if (deepestUnlockedTitle === null) return null;
			return (
				<p className="text-sm text-muted-foreground">
					Nie sprawdzaliśmy <Nazwa>{competencyName}</Nazwa> — nie było jej wśród zaznaczonych przez
					Ciebie kompetencji. Dlatego ścieżkę otwieramy do <Nazwa>{deepestUnlockedTitle}</Nazwa>, a{" "}
					<Nazwa>{moduleTitle}</Nazwa> zostaje na swoim miejscu. Znasz ten materiał? Zdaj egzamin
					modułu (<Nazwa>test out</Nazwa>) i przeskocz go.
				</p>
			);
	}
}
