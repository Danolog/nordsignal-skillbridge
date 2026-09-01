"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { komunikatOdmowy } from "@/lib/auth/komunikat-odmowy";

/** Tekst, gdy serwer nic sensownego nie powie — patrz `komunikat-odmowy.ts`. */
const ZAPASOWY_GOOGLE = "Nie udało się zalogować przez Google";

export function GoogleButton() {
	const [loading, setLoading] = useState(false);

	const handleGoogleSignIn = async () => {
		setLoading(true);

		/** Jedno miejsce na odmowę: ten sam nośnik co formularze, plus odblokowanie przycisku. */
		const pokazOdmowe = (zrodlo: unknown) => {
			toast.error(komunikatOdmowy(zrodlo, ZAPASOWY_GOOGLE));
			setLoading(false);
		};

		try {
			// `signIn.social` NIE RZUCA przy błędzie serwera — ODDAJE go (zmierzone
			// 2026-08-24 prawdziwym klientem: `{"data":null,"error":{"message":
			// "Unable to create verification","status":500}}`). Dlatego wynik trzeba
			// ODCZYTAĆ. Wcześniej cały ten plik polegał na `catch`, który przy
			// błędzie serwera nie wykonywał się NIGDY: człowiek nie dostawał żadnego
			// komunikatu, a `setLoading(false)` — stojące wyłącznie w `catch` —
			// nie biegło, więc przycisk kręcił się bez końca.
			const { error } = await authClient.signIn.social({
				provider: "google",
				callbackURL: "/dashboard",
			});

			// Sukces: przeglądarka nawiguje do dostawcy. Stan ładowania zostaje
			// ŚWIADOMIE — gaszenie go tutaj dałoby mrugnięcie przycisku tuż przed
			// opuszczeniem strony.
			if (!error) return;

			pokazOdmowe(error);
		} catch (wyjatek) {
			// `catch` zostaje, ale przestaje być jedyną drogą: łapie już tylko
			// prawdziwe wyjątki (zerwane połączenie), nie odmowy serwera. Nośnik
			// odda przy nich tekst zapasowy, bo wyjątek nie ma pola `status`.
			pokazOdmowe(wyjatek);
		}
	};

	return (
		<button
			type="button"
			className="auth-btn-google"
			onClick={handleGoogleSignIn}
			disabled={loading}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
					fill="#4285F4"
				/>
				<path
					d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					fill="#34A853"
				/>
				<path
					d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					fill="#FBBC05"
				/>
				<path
					d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					fill="#EA4335"
				/>
			</svg>
			{loading ? "Przekierowanie..." : "Kontynuuj z Google"}
		</button>
	);
}
