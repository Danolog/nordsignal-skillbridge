import Link from "next/link";
import { GoogleButton } from "@/components/auth/google-button";
import { SignupForm } from "@/components/auth/signup-form";
import { isFeatureEnabled } from "@/lib/flags";

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

	return (
		<>
			<h1 className="auth-title">Utwórz konto</h1>
			<p className="auth-subtitle">Dołącz do SkillBridge</p>

			<GoogleButton />

			<div className="auth-divider">
				<span>lub</span>
			</div>

			<SignupForm />

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
