// ============================================================================
// AG.1 — WERYFIKATOR UGRUNTOWANIA LUK (klocek reużywalny).
//
// Drugi przebieg nad nazwami kompetencji wyprodukowanymi przez MODEL: każda
// musi WYNIKAĆ z danych rynkowych (`job_market_data`), zanim trafi do studenta.
// Pierwotny konsument (LLM-owa gałąź legacy generate-gaps + flaga gapVerifier)
// USUNIĘTY w AG.2 (2026-07-07) — moduł zostaje zgodnie z roadmapą jako klocek
// dla przyszłych potoków, gdzie model emituje nazwy kompetencji (np. AG.5 opisy
// nowych luk po swapie rynku). Jakość zmierzona w harnessie AG.0
// (tests/evals/gap-detection/verifier*.eval.test.ts) — baseline commitowany.
// Ścieżka deterministyczna (market-gaps) NIE potrzebuje weryfikacji — tam luka
// z konstrukcji jest pozycją katalogu; halucynować może tylko model.
//
// Dwa etapy (tani przed drogim — wzorzec guardrail→sędzia z career-helper.ts):
//  1. UGRUNTOWANIE DETERMINISTYCZNE (0 LLM): nazwa luki po normalizacji
//     (trim+lower, ta sama co deriveGaps) równa pozycji katalogu → zweryfikowana.
//  2. AGENT-SĘDZIA (fan-out `Promise.all`): pozostałe kandydatki ocenia model
//     warstwy `fast` (zadanie klasy dopasowania nazw — jak rerank match-projects;
//     Opus jak w /summary byłby przepłaceniem przy fan-oucie do 20 luk).
//     Blokująco: tylko jednoznaczne "YES" weryfikuje; niejednoznaczny werdykt =
//     odrzucenie (precyzja przed czułością — luka bez pokrycia nie wychodzi).
//
// Semantyka awarii: BŁĄD wywołania sędziego (timeout, 429, NoObjectGenerated)
// ≠ werdykt. Luka zostaje jako `unverified` (zachowanie jak przy fladze off)
// + logError — infrastrukturalna czkawka nie może losowo obcinać recall.
//
// Koszt: każde wywołanie sędziego w `ai_usage_ledger` (withAiUsage,
// scope "verify-gaps.judge", tier fast) — budżet dziedziczony z 0.0.
// ============================================================================

import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/model";
import { sanitizeForPrompt } from "@/lib/ai/sanitize";
import { aiTimeoutSignal } from "@/lib/ai/timeout";
import { type AiUsageAttribution, withAiUsage } from "@/lib/ai/usage";
import { logError } from "@/lib/log";

/** Pozycja katalogu rynku w formie potrzebnej weryfikatorowi (podzbiór wiersza `job_market_data`). */
export interface MarketCompetencyRef {
	competencyName: string;
	demandPercentage: number;
}

/**
 * Status luki po weryfikacji:
 *  - `verified`   — ma pokrycie w rynku (katalog wprost albo sędzia potwierdził),
 *  - `rejected`   — sędzia orzekł brak pokrycia → NIE zapisujemy (odrzucona),
 *  - `unverified` — nie dało się orzec (błąd sędziego / brak katalogu) → zostaje,
 *    oznaczona w wyniku i w logach (nie karzemy studenta za awarię infrastruktury).
 */
export type GapVerdictStatus = "verified" | "rejected" | "unverified";

/** Jak zapadł werdykt — do raportów/logów; `catalog` = 0 kosztu LLM. */
export type GapVerdictMethod = "catalog" | "judge" | "judge-error" | "no-catalog";

export interface GapVerdict {
	competencyName: string;
	status: GapVerdictStatus;
	method: GapVerdictMethod;
	/** Uzasadnienie sędziego (np. wskazana pozycja katalogu); null poza etapem sędziego. */
	reason: string | null;
}

/**
 * Sędzia pojedynczej luki — wstrzykiwalny (testy jednostkowe i deterministyczna
 * część harnessu AG.0 podają skrypt zamiast LLM). Produkcja: buildLlmGapJudge.
 */
export type GapJudge = (gapName: string) => Promise<{ grounded: boolean; reason: string | null }>;

/** Ta sama normalizacja co deriveGaps (trim + lower) — spójność z liczeniem luk. */
function normalize(name: string): string {
	return name.trim().toLowerCase();
}

const JUDGE_SYSTEM_PROMPT = `Jesteś sędzią ugruntowania (agent-as-judge) w SkillBridge. Dostajesz katalog kompetencji wymaganych przez rynek dla ścieżki kariery oraz nazwę JEDNEJ luki wykrytej przez inny model.

Oceń, czy luka WYNIKA z danych rynkowych — tzn. jest tą samą kompetencją co któraś pozycja katalogu (inny zapis/wariant nazwy, np. "React.js" vs "React", "Amazon Web Services" vs "AWS") albo jej oczywistym doprecyzowaniem.

- verdict "YES" — luka ma pokrycie w katalogu; w reason wskaż dopasowaną pozycję.
- verdict "NO" — luka nie ma pokrycia (kompetencja spoza katalogu, zbyt ogólna, zmyślona). Realna technologia NIEOBECNA w katalogu tej ścieżki to też "NO".
Niepewność = "NO" — luka bez pokrycia w rynku nie może trafić do studenta.`;

// Werdykt tolerancyjny (wzorzec JudgeSchema z career-helper.ts): nie sztywny enum,
// bo model bywa zwraca "yes"/"Yes." — interpretacja w kodzie, domyślnie odmowa.
const GapJudgeSchema = z.object({
	verdict: z.string().optional().default(""),
	reason: z.string().optional().default(""),
});

/**
 * Produkcyjny sędzia LLM (warstwa `fast`). Katalog idzie do promptu surowo (nasze
 * dane z ETL — jak marketList w generate-gaps); nazwa luki pochodzi z WYJŚCIA
 * innego modelu, więc jest traktowana jako niezaufana (sanitize + <user_input>).
 */
export function buildLlmGapJudge(args: {
	marketCompetencies: MarketCompetencyRef[];
	careerGoal: string;
	attribution?: AiUsageAttribution;
	/** Default warstwa fast. Testy/ewaluacje mogą podać własny model. */
	model?: LanguageModel;
}): GapJudge {
	const model = args.model ?? getModel("fast");
	const safeCareer = sanitizeForPrompt(args.careerGoal, 200);
	const catalogList = args.marketCompetencies
		.map((m) => `- ${m.competencyName} (${m.demandPercentage}% ofert)`)
		.join("\n");

	return async (gapName) => {
		const { object } = await withAiUsage(
			{ scope: "verify-gaps.judge", tier: "fast", attribution: args.attribution },
			() =>
				generateObject({
					model,
					abortSignal: aiTimeoutSignal(),
					schema: GapJudgeSchema,
					maxOutputTokens: 300,
					system: JUDGE_SYSTEM_PROMPT,
					prompt: `Katalog rynku dla celu "${safeCareer}":
${catalogList}

<user_input untrusted="true">
Nazwa luki do oceny: ${sanitizeForPrompt(gapName, 200)}
</user_input>`,
				}),
		);
		// Tylko jednoznaczne YES weryfikuje — cokolwiek innego (puste, "NO", "maybe")
		// = brak pokrycia. Bezpieczniej dla precyzji (jak judgeSummary w Pomocniku).
		const grounded = object.verdict.trim().toUpperCase() === "YES";
		return { grounded, reason: object.reason.trim() || null };
	};
}

/**
 * Weryfikuje luki względem katalogu rynku. Zwraca werdykt per luka W KOLEJNOŚCI
 * WEJŚCIA. Czysta względem zapisu — o losie odrzuconych decyduje wołający
 * (generate-gaps filtruje przed INSERT-em).
 */
export async function verifyGapsAgainstMarket(args: {
	gapNames: string[];
	marketCompetencies: MarketCompetencyRef[];
	careerGoal: string;
	attribution?: AiUsageAttribution;
	/** Default: buildLlmGapJudge z argumentów wyżej. */
	judge?: GapJudge;
}): Promise<GapVerdict[]> {
	const { gapNames, marketCompetencies } = args;
	if (gapNames.length === 0) return [];

	// Pusty katalog = nie ma przeciwko czemu weryfikować (generate-gaps każe wtedy
	// modelowi ZMYŚLIĆ rynek). Odrzucanie wszystkiego zostawiłoby studenta z 0 luk —
	// zostają nieoznaczone, decyzja o sensie takiego stanu należy do wołającego.
	if (marketCompetencies.length === 0) {
		return gapNames.map((name) => ({
			competencyName: name,
			status: "unverified" as const,
			method: "no-catalog" as const,
			reason: null,
		}));
	}

	const catalogNames = new Set(marketCompetencies.map((m) => normalize(m.competencyName)));

	// Etap 1 — ugruntowanie deterministyczne (0 LLM). Wynik indeksowany pozycją
	// wejścia, żeby zachować kolejność po scaleniu z fan-outem sędziego.
	const verdicts: GapVerdict[] = new Array(gapNames.length);
	const candidates: { index: number; name: string }[] = [];
	gapNames.forEach((name, index) => {
		if (catalogNames.has(normalize(name))) {
			verdicts[index] = {
				competencyName: name,
				status: "verified",
				method: "catalog",
				reason: null,
			};
		} else {
			candidates.push({ index, name });
		}
	});
	if (candidates.length === 0) return verdicts;

	// Etap 2 — sędzia, równolegle (Promise.all). Błąd pojedynczego wywołania nie
	// wywraca całości ani nie odrzuca luki — patrz semantyka awarii w nagłówku.
	const judge = args.judge ?? buildLlmGapJudge(args);
	await Promise.all(
		candidates.map(async ({ index, name }) => {
			try {
				const { grounded, reason } = await judge(name);
				verdicts[index] = {
					competencyName: name,
					status: grounded ? "verified" : "rejected",
					method: "judge",
					reason,
				};
			} catch (err) {
				logError("verify-gaps.judge", err, { gap: name });
				verdicts[index] = {
					competencyName: name,
					status: "unverified",
					method: "judge-error",
					reason: null,
				};
			}
		}),
	);
	return verdicts;
}
