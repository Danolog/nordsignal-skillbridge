/**
 * /regulamin — regulamin pilotażu (fala 2, blokada wyboru 3–5 osób).
 *
 * Bliźniacza do `/prywatnosc` i celowo tak wygląda: dokument Sophii ma ten sam
 * kształt (CZĘŚĆ I dla człowieka, CZĘŚĆ II jako aparat wewnętrzny), więc
 * mechanizm cięcia i renderowania jest ten sam. Zero nowej logiki — patrz
 * `src/lib/tresc/dokumenty-pilotazu.ts`.
 *
 * PUBLICZNA i BEZ SESJI: uczestnik musi móc przeczytać regulamin ZANIM założy
 * konto — pole wyboru przy rejestracji odsyła właśnie tutaj. Trasa jest poza
 * matcherem `src/middleware.ts`, więc bramka uwierzytelnienia jej nie dotyka.
 *
 * ZA FLAGĄ, domyślnie zgaszoną: zgaszona = `notFound()`, czyli trasa nie
 * istnieje („off = feature nie istnieje", nie „pusta strona"). Dokument jest
 * w wersji v0.1 DRAFT i wiąże firmę wobec uczestnika — zapala go sign-off
 * Darka, nie scalenie.
 *
 * RENDER DYNAMICZNY świadomie, mimo statycznej treści: flaga to zmienna
 * środowiskowa, a te przestawia się BEZ wdrożenia (uzasadnienie jak przy
 * `/prywatnosc`).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KlauzulaMarkdown } from "@/components/legal/klauzula-markdown";
import { isFeatureEnabled } from "@/lib/flags";
import { podzielNaBloki } from "@/lib/legal/klauzula-art13";
import { wczytajRegulaminPilotazu } from "@/lib/tresc/dokumenty-pilotazu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Regulamin pilotażu — SkillBridge",
	description:
		"Zasady udziału w pilotażu SkillBridge: co dostajesz, czego oczekujemy, " +
		"jak długo trwa pilotaż i na jakich warunkach możesz z niego zrezygnować.",
};

export default function RegulaminPage() {
	if (!isFeatureEnabled("pilotTerms")) notFound();

	// Wyjątek z ładowarki CELOWO nie jest łapany — patrz `dokumenty-pilotazu.ts`.
	const bloki = podzielNaBloki(wczytajRegulaminPilotazu());

	return (
		<main className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
			<KlauzulaMarkdown bloki={bloki} />
		</main>
	);
}
