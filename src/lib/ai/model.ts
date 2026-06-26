import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Centralny wybór modelu dla całej warstwy AI (`src/lib/ai/*`).
 *
 * PO CO: dotąd każdy plik hardkodował identyfikator modelu (np.
 * `anthropic("claude-sonnet-4-6")`). `@ai-sdk/anthropic` NIE honoruje podmiany
 * modelu zmienną środowiskową, więc nie dało się przełączyć CI (środowiska
 * testów ciągłej integracji) na tańszy model bez zmiany kodu. Ten helper
 * (pomocnik) zbiera wybór modelu w jedno miejsce i pozwala nadpisać go przez
 * zmienną środowiskową — bez dotykania logiki produktowej.
 *
 * GWARANCJA PRODUKCJI: gdy żadna zmienna override (nadpisania) nie jest
 * ustawiona, zwracane są DOKŁADNIE te same modele co przed refaktorem
 * (Sonnet / Haiku / Opus wg warstwy). Produkcja Vercela nie ustawia tych
 * zmiennych, więc jej modele się NIE zmieniają — zero regresji jakości.
 *
 * Warstwy (tier) — semantyka, nie konkretny model:
 *  - `standard` — workhorse (koń pociągowy): generatory tekstu, parsowanie,
 *    rozmowa Pomocnika. Domyślnie Sonnet 4.6.
 *  - `fast`     — tanie/szybkie dopasowanie. Domyślnie Haiku 4.5.
 *  - `premium`  — krytyczna jakość z sędzią (agent-as-judge, HITL §7
 *    CLAUDE.md): podsumowanie kariery + sędzia. Domyślnie Opus 4.8.
 */

export type ModelTier = "standard" | "fast" | "premium";

/**
 * Domyślne modele PRODUKCYJNE per warstwa. Zmiana któregokolwiek = realna
 * zmiana modelu na produkcji (decyzja kosztowo-jakościowa, nie refaktor).
 */
const DEFAULT_MODEL_IDS: Record<ModelTier, string> = {
	standard: "claude-sonnet-4-6",
	fast: "claude-haiku-4-5-20251001",
	premium: "claude-opus-4-8",
};

/**
 * Rozstrzyga identyfikator modelu dla warstwy. Kolejność (pierwsze wygrywa):
 *  1. `SKILLBRIDGE_AI_MODEL` — globalny override WSZYSTKICH warstw (jedna
 *     zmienna = całe `src/lib/ai/*` na jeden model; tak CI jedzie na Haiku).
 *  2. `SKILLBRIDGE_AI_MODEL_<WARSTWA>` — override pojedynczej warstwy (strojenie
 *     kosztu bez zmiany kodu, np. `SKILLBRIDGE_AI_MODEL_PREMIUM`).
 *  3. Domyślny model produkcyjny warstwy.
 *
 * Puste/białe wartości są ignorowane (traktowane jak brak zmiennej), żeby
 * `SKILLBRIDGE_AI_MODEL=""` nie wywróciło wyboru na pusty identyfikator.
 */
function resolveModelId(tier: ModelTier): string {
	const all = process.env.SKILLBRIDGE_AI_MODEL?.trim();
	if (all) return all;

	const perTier = process.env[`SKILLBRIDGE_AI_MODEL_${tier.toUpperCase()}`]?.trim();
	if (perTier) return perTier;

	return DEFAULT_MODEL_IDS[tier];
}

/** Zwraca instancję modelu dla warstwy (do `generateText`/`streamText`/`generateObject`). */
export function getModel(tier: ModelTier): LanguageModel {
	return anthropic(resolveModelId(tier));
}

/** Zwraca sam identyfikator modelu warstwy (diagnostyka, logi). */
export function getModelId(tier: ModelTier): string {
	return resolveModelId(tier);
}
