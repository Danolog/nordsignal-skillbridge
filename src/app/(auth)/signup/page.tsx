import Link from "next/link";
import { GoogleButton } from "@/components/auth/google-button";
import { SignupForm } from "@/components/auth/signup-form";
import { isFeatureEnabled } from "@/lib/flags";
import { wersjaRegulaminuPilotazu } from "@/lib/tresc/akceptacja-regulaminu";

// Strona czyta flagę, więc NIE WOLNO jej prerenderować przy budowaniu: zmienne
// środowiskowe na Vercelu przestawia się bez wdrożenia (powód, dla którego bramka
// `requires` żyje w ewaluacji flagi, a nie w skrypcie wdrożeniowym — patrz
// src/lib/flags.ts). Statyczna wersja zamroziłaby stan flagi z chwili budowania:
// klauzula byłaby zapalona, a odnośnik do niej dalej niewidoczny — albo odwrotnie.
export const dynamic = "force-dynamic";

export default function SignupPage() {
	// E4 — DOJŚCIE DO KLAUZULY ZE ŚCIEŻKI REJESTRACJI, w formie celowo najmniej
	// przesądzającej: odnośnik pod formularzem. GDZIE dokładnie klauzula ma stanąć
	// (osobny krok? ekran przed formularzem? potwierdzenie zapoznania?) to decyzja
	// produktowa Sophii (PO), nie wykonawcza — art. 13 to obowiązek informacyjny,
	// nie zgoda, więc pole wyboru „akceptuję" byłoby tu błędem prawnym, nie tylko
	// nadmiarem. Odnośnik znika razem z flagą: dopóki klauzula nie obowiązuje,
	// prowadzenie do niej ze ścieżki rejestracji byłoby obietnicą bez pokrycia.
	const klauzulaWidoczna = isFeatureEnabled("privacyNoticeArt13");

	// FALA 2 (C) — akceptacja regulaminu pilotażu. Wersję czytamy z dokumentu (jeden
	// nośnik) i przekazujemy do formularza, żeby żądanie niosło informację, NA CO
	// dokładnie ta osoba się zgodziła — to jest treść wymogu z §14, nie ozdoba.
	// Odczyt tylko przy zapalonej fladze: przy zgaszonej nic tej wartości nie użyje.
	const regulaminWymagany = isFeatureEnabled("pilotTerms");
	const wersjaRegulaminu = regulaminWymagany ? wersjaRegulaminuPilotazu() : null;

	return (
		<>
			<h1 className="auth-title">Utwórz konto</h1>
			<p className="auth-subtitle">Dołącz do SkillBridge</p>

			{/*
			 * ⚠ LUKA ZNANA, NIEZAMKNIĘTA (nie udaję, że jej nie ma): rejestracja przez
			 * Google idzie ścieżką dostawcy tożsamości, a nie `/sign-up/email` — bramka
			 * akceptacji jej NIE obejmuje. Domknięcie wymaga rozstrzygnięcia, jak odróżnić
			 * PIERWSZE logowanie dostawcą (rejestracja) od kolejnego (logowanie), bo
			 * biblioteka używa do obu tej samej trasy; to kontrakt uwierzytelniania,
			 * nie warstwa interfejsu. Właściciel: Ethan (CTO). Do czasu domknięcia
			 * konto założone przyciskiem niżej powstaje BEZ akceptacji regulaminu.
			 */}
			<GoogleButton />

			<div className="auth-divider">
				<span>lub</span>
			</div>

			<SignupForm
				regulaminWymagany={regulaminWymagany}
				wersjaRegulaminu={wersjaRegulaminu}
				klauzulaWidoczna={klauzulaWidoczna}
			/>

			<p className="auth-footer-text">
				Masz już konto?{" "}
				<Link href="/login" className="auth-link">
					Zaloguj się
				</Link>
			</p>

			{klauzulaWidoczna && (
				<p className="auth-footer-text">
					<Link href="/prywatnosc" className="auth-link">
						Informacja o przetwarzaniu danych
					</Link>
				</p>
			)}
		</>
	);
}
