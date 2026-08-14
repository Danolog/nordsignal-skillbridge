import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KlauzulaMarkdown } from "@/components/legal/klauzula-markdown";
import { isFeatureEnabled } from "@/lib/flags";
import { podzielNaBloki, wczytajKlauzuleDlaStudenta } from "@/lib/legal/klauzula-art13";

/**
 * /prywatnosc — klauzula informacyjna art. 13 RODO (E4).
 *
 * PUBLICZNA i BEZ SESJI: art. 13 wymaga podania informacji „w momencie
 * pozyskiwania danych", czyli zanim ktokolwiek ma konto. Trasa jest poza
 * matcherem `src/middleware.ts`, więc bramka auth jej nie dotyka.
 *
 * ZA FLAGĄ, domyślnie zgaszoną: dokument NIE wchodzi w życie ze scaleniem
 * (sekcja Z-2 — pięć twardych warunków, część poza kodem). Zgaszona flaga =
 * `notFound()`, czyli trasa nie istnieje — spójnie z resztą funkcji Bety
 * („off = feature nie istnieje", nie „pusta strona").
 *
 * RENDER DYNAMICZNY (`force-dynamic`) świadomie, mimo że treść jest statyczna:
 * flaga to zmienna środowiskowa, a te na Vercelu przestawia się BEZ wdrożenia.
 * Strona wygenerowana raz przy budowaniu zamroziłaby stan flagi z chwili
 * budowania — czyli mogłaby serwować klauzulę po tym, jak ktoś ją zgasił.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Informacja o przetwarzaniu danych — SkillBridge",
	description:
		"Jakie dane zbiera SkillBridge, po co, jak długo je trzymamy, komu je przekazujemy " +
		"i jakie masz prawa (art. 13 RODO).",
};

export default function PrywatnoscPage() {
	if (!isFeatureEnabled("privacyNoticeArt13")) notFound();

	// Nośnikiem treści jest dokument w repozytorium — nie kopia w tym pliku.
	// Wyjątek z `wczytajKlauzuleDlaStudenta` (nierozpoznany kształt dokumentu,
	// aparat wewnętrzny w treści) CELOWO nie jest tu łapany: lepiej pokazać błąd
	// niż wydrukować studentowi cokolwiek z CZĘŚCI II.
	const bloki = podzielNaBloki(wczytajKlauzuleDlaStudenta());

	return (
		<main className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
			<KlauzulaMarkdown bloki={bloki} />
		</main>
	);
}
