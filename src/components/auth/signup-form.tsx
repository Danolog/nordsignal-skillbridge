"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { komunikatOdmowy } from "@/lib/auth/komunikat-odmowy";

interface SignupFormProps {
	/** Czy pokazać i egzekwować pole akceptacji regulaminu (flaga `pilotTerms`). */
	regulaminWymagany?: boolean;
	/** Wersja dokumentu POKAZANA uczestnikowi — leci z żądaniem jako dowód „na co". */
	wersjaRegulaminu?: string | null;
	/** Czy klauzula art. 13 jest zapalona — bez tego odnośnik do niej byłby martwy. */
	klauzulaWidoczna?: boolean;
}

export function SignupForm({
	regulaminWymagany = false,
	wersjaRegulaminu = null,
	klauzulaWidoczna = false,
}: SignupFormProps = {}) {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	// DOMYŚLNIE PUSTE — nigdy zaznaczone z góry. Akceptacja domyślna jest słabym
	// dowodem umowy, a przy zgodzie byłaby wprost wadliwa (zamówienie R-6 pkt 1).
	const [regulaminZaakceptowany, setRegulaminZaakceptowany] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		// Pola akceptacji dokładamy WYŁĄCZNIE przy zapalonej fladze — przy zgaszonej
		// żądanie ma być bajt w bajt takie jak dziś. Rozstrzygające sprawdzenie i tak
		// robi serwer (`hooks.before` w src/lib/auth/server.ts); to tutaj jest wygodą
		// dla człowieka, nie bramką.
		const { error: authError } = await authClient.signUp.email({
			email,
			password,
			name,
			...(regulaminWymagany
				? {
						akceptacjaRegulaminu: regulaminZaakceptowany,
						wersjaRegulaminu,
					}
				: {}),
		});

		if (authError) {
			// Rejestracja przepuszczała komunikat serwera od zawsze i to było
			// zachowanie POPRAWNE — to logowanie się z nią rozjechało. Wołamy tu
			// wspólny nośnik, żeby reguła miała jedno miejsce, a nie dwa zgodne
			// przez przypadek. Zachowanie widoczne dla człowieka bez zmian:
			// komunikat o zajętym adresie nadal się pokazuje (świadomie —
			// uzasadnienie i próg w `komunikat-odmowy.ts`).
			setError(komunikatOdmowy(authError, "Nie udało się utworzyć konta"));
			setLoading(false);
			return;
		}

		router.push("/dashboard");
	};

	return (
		<form onSubmit={handleSubmit} className="auth-form">
			<div className="auth-field">
				<label htmlFor="name" className="auth-label">
					Imię i nazwisko
				</label>
				<input
					id="name"
					type="text"
					className="auth-input"
					placeholder="Jan Kowalski"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>
			</div>

			<div className="auth-field">
				<label htmlFor="email" className="auth-label">
					Email
				</label>
				<input
					id="email"
					type="email"
					className="auth-input"
					placeholder="twoj@email.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
			</div>

			<div className="auth-field">
				<label htmlFor="password" className="auth-label">
					Hasło
				</label>
				<input
					id="password"
					type="password"
					className="auth-input"
					placeholder="Minimum 8 znaków"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					minLength={8}
				/>
			</div>

			{regulaminWymagany && (
				<div className="auth-field">
					<label htmlFor="regulamin" className="flex items-start gap-2.5 text-sm leading-relaxed">
						<input
							id="regulamin"
							type="checkbox"
							className="mt-0.5 size-4 shrink-0 accent-emerald-700"
							checked={regulaminZaakceptowany}
							onChange={(e) => setRegulaminZaakceptowany(e.target.checked)}
							// Pierwsza warstwa — wygoda, nie zabezpieczenie. Rozstrzyga serwer.
							required
							aria-required="true"
						/>
						<span>
							Akceptuję{" "}
							<a href="/regulamin" target="_blank" rel="noopener noreferrer" className="auth-link">
								regulamin pilotażu
							</a>
							{klauzulaWidoczna && (
								<>
									{" "}
									i zapoznałem się z{" "}
									<a
										href="/prywatnosc"
										target="_blank"
										rel="noopener noreferrer"
										className="auth-link"
									>
										informacją o przetwarzaniu danych
									</a>
								</>
							)}
							. <span className="text-destructive">*</span>
						</span>
					</label>
				</div>
			)}

			{error && <p className="auth-error">{error}</p>}

			<button type="submit" className="auth-btn-primary" disabled={loading}>
				{loading ? "Tworzenie konta..." : "Utwórz konto"}
			</button>
		</form>
	);
}
