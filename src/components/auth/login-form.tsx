"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

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
				setError("Nieprawidłowy email lub hasło");
				setLoading(false);
				return;
			}

			router.push("/dashboard");
		} catch {
			setError("Coś poszło nie tak. Spróbuj ponownie.");
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
