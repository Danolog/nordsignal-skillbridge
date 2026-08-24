"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { komunikatOdmowy } from "@/lib/auth/komunikat-odmowy";

/**
 * Tekst pokazywany, gdy serwer NIE przysłał własnego wyjaśnienia — albo gdy
 * przysłał komunikat, którego świadomie nie pokazujemy (`KODY_ZASTEPOWANE`).
 * Zostaje w tej roli, bo dla najczęstszego przypadku jest wierny: biblioteka
 * zwraca identyczną odmowę przy złym haśle i przy nieistniejącym koncie
 * (pomiar w `komunikat-odmowy.ts`), więc to zdanie nic nie zdradza.
 * NIE jest już jednak odpowiedzią na WSZYSTKO — od tego zaczął się incydent.
 */
const ZAPASOWY_LOGOWANIE = "Nieprawidłowy email lub hasło";

export function LoginForm() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const { error: authError } = await authClient.signIn.email({
				email,
				password,
			});

			if (authError) {
				// Odmowę serwera DOSTARCZAMY, nie zastępujemy. Reguła, co wolno
				// pokazać, mieszka w `komunikat-odmowy.ts` — tu jest jej wywołanie.
				setError(komunikatOdmowy(authError, ZAPASOWY_LOGOWANIE));
				setLoading(false);
				return;
			}

			router.push("/dashboard");
		} catch (wyjatek) {
			// To samo wywołanie, nie druga kopia reguły. Zerwane połączenie nie ma
			// pola `status`, więc nośnik odda tekst zapasowy zamiast wewnętrznego
			// „fetch failed"; odmowa serwera, gdyby tu doleciała, zostanie pokazana.
			setError(komunikatOdmowy(wyjatek, "Coś poszło nie tak. Spróbuj ponownie."));
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="auth-form">
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
				<div className="auth-input-wrap">
					<input
						id="password"
						type={showPassword ? "text" : "password"}
						className="auth-input"
						placeholder="Twoje hasło"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
					<button
						type="button"
						className="auth-eye-btn"
						onClick={() => setShowPassword((v) => !v)}
						aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
					>
						{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
					</button>
				</div>
			</div>

			{error && <p className="auth-error">{error}</p>}

			<button type="submit" className="auth-btn-primary" disabled={loading}>
				{loading ? "Logowanie..." : "Zaloguj się"}
			</button>
		</form>
	);
}
