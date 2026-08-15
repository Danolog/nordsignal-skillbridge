/**
 * MARTWY ODNOŚNIK DO PASZPORTU — strona dla PRACODAWCY (fala 2, blokada B2).
 *
 * ── CO BYŁO PRZED ────────────────────────────────────────────────────────────
 * Trasa `passport/[id]` leży POZA grupą `(dashboard)`, więc
 * `src/app/(dashboard)/not-found.tsx` jej nie obsługiwał, a `src/app/not-found.tsx`
 * nie istnieje. Pracodawca z wygasłym albo błędnie skopiowanym odnośnikiem
 * dostawał wbudowany ekran 404 Next.js — po angielsku, bez jednego zdania
 * wyjaśnienia. To jest moment, w którym ktoś z zewnątrz podejmuje decyzję
 * o kandydacie, a produkt milczy w obcym języku.
 *
 * ── ZERO NOWEJ LOGIKI ────────────────────────────────────────────────────────
 * Treść napisała Sophia (`docs/product/zasada-odpowiedzi-dla-pracodawcy.md`,
 * CZĘŚĆ I). Renderujemy ją tym samym aparatem co `/prywatnosc`: cięcie CZĘŚCI I
 * → podział na bloki → `KlauzulaMarkdown`. Ten plik nie zna treści i nie może
 * pokazać nic spoza tego, co wytnie strażnik dokumentu.
 *
 * ── DLACZEGO TA STRONA NIE JEST „ZA FLAGĄ" W ZWYKŁYM SENSIE ──────────────────
 * `not-found.tsx` wiąże się z segmentem trasy przy budowaniu — nie da się go
 * „nie mieć" przy zgaszonej fladze, a `notFound()` wywołane wewnątrz niego
 * zapętla obsługę. Flaga bramkuje więc TREŚĆ DOKUMENTU, nie istnienie pliku:
 *   • zapalona  → CZĘŚĆ I dokumentu Sophii,
 *   • zgaszona  → ekran minimalny (niżej), bez ani jednej obietnicy z dokumentu.
 * Skutek uboczny scalenia przy zgaszonej fladze jest więc realny i zamierzony:
 * pracodawca przestaje widzieć angielski ekran wbudowany, a zaczyna widzieć
 * polski ekran minimalny. Nic z treści niezatwierdzonej przez Darka nie wychodzi.
 *
 * RENDER DYNAMICZNY świadomie — jak `/prywatnosc`: flaga to zmienna środowiskowa,
 * a te przestawia się BEZ wdrożenia. Strona wygenerowana raz przy budowaniu
 * zamroziłaby stan flagi z chwili budowania.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { KlauzulaMarkdown } from "@/components/legal/klauzula-markdown";
import { isFeatureEnabled } from "@/lib/flags";
import { podzielNaBloki } from "@/lib/legal/klauzula-art13";
import { wczytajZasadeDlaPracodawcy } from "@/lib/tresc/dokumenty-pilotazu";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Nie znaleźliśmy tego paszportu — SkillBridge",
	description:
		"Odnośnik do paszportu kompetencji nie prowadzi do żadnego dokumentu. " +
		"Wyjaśniamy, co to znaczy i co z tym zrobić.",
	// Strona błędu nie ma się pokazywać w wynikach wyszukiwania.
	robots: { index: false, follow: false },
};

export default function PaszportNieZnaleziony() {
	if (!isFeatureEnabled("passportNotFoundNotice")) {
		// EKRAN MINIMALNY — stan przy zgaszonej fladze. Świadomie bez wyjaśnień,
		// zapewnień i odsyłaczy do oferty: cokolwiek ponad to jest treścią, która
		// mówi w imieniu firmy do osoby z zewnątrz, a ta czeka na sign-off Darka.
		return (
			<main className="mx-auto max-w-xl px-5 py-16 md:px-8">
				<h1 className="mb-3 font-serif text-2xl font-bold text-slate-900">
					Nie znaleźliśmy tej strony
				</h1>
				<p className="leading-relaxed text-slate-700">
					Odnośnik nie prowadzi do żadnego dokumentu.
				</p>
				<Link
					href="/"
					className="mt-6 inline-block font-medium text-emerald-800 underline underline-offset-2 hover:no-underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
				>
					Strona główna
				</Link>
			</main>
		);
	}

	// Wyjątek z ładowarki CELOWO nie jest łapany — patrz `dokumenty-pilotazu.ts`.
	const bloki = podzielNaBloki(wczytajZasadeDlaPracodawcy());

	return (
		<main className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
			<KlauzulaMarkdown bloki={bloki} />
		</main>
	);
}
