"use client";

// B8/1.5 (ADR-011) — logowanie operatora jakości do kolejki recenzji.
// Lustro formularza faculty; wykładowca NIE loguje się tutaj — wchodzi na
// /review z istniejącą sesją panelu uczelni (checkReviewerAuth honoruje obie).

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewLoginForm() {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const res = await fetch("/api/operator/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password }),
			});

			if (!res.ok) {
				setError("Nieprawidłowe hasło");
				return;
			}

			router.push("/review");
		} catch {
			setError("Błąd połączenia. Spróbuj ponownie.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<>
			<h1 className="auth-title">Kolejka recenzji</h1>
			<p className="auth-subtitle">
				Dostęp dla operatora jakości. Wykładowcy: zaloguj się w Panelu Uczelni — kolejka otworzy się
				z tą samą sesją.
			</p>

			<form onSubmit={handleSubmit} className="auth-form">
				<div className="auth-field">
					<label htmlFor="password" className="auth-label">
						Hasło operatora
					</label>
					<input
						id="password"
						type="password"
						className="auth-input"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Wprowadź hasło"
						required
					/>
				</div>

				{error && <p className="auth-error">{error}</p>}

				<button type="submit" className="auth-btn-primary" disabled={loading}>
					{loading ? (
						<span
							style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
						>
							<Loader2 size={16} className="animate-spin" />
							Logowanie...
						</span>
					) : (
						"Zaloguj się"
					)}
				</button>
			</form>
		</>
	);
}
