import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

// Kanoniczna ikona marki: GraduationCap (czapka studenta) — decyzja Darka, sesja #6 2026-06-05.
// Jednorodna dla wszystkich wariantów (landing/sidebar/auth); zastępuje wcześniejszy BrainCircuit.
// Kolor ikony wg wariantu, cały język editorial: landing = box atramentu, sidebar/auth = box
// bursztynu (jak brand .mark w wireframe). Wordmark zawsze atramentem, bez gradientu/glow.

type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "landing" | "sidebar" | "auth";

/** Rozmiary boxu/ikony/tekstu per skala. */
const SIZE: Record<LogoSize, { box: number; icon: number; text: string; radius: number }> = {
	sm: { box: 28, icon: 15, text: "0.875rem", radius: 7 },
	md: { box: 36, icon: 20, text: "1.125rem", radius: 10 },
	lg: { box: 44, icon: 24, text: "1.25rem", radius: 12 },
};

interface LogoProps {
	size?: LogoSize;
	/** Kontekst renderu — steruje klasami/zaokrągleniem, NIE rozjazdem dwóch różnych ikon. */
	variant?: LogoVariant;
	/** Dodatkowe klasy kontenera (np. shadow specyficzny dla kontekstu). */
	className?: string;
}

/**
 * Wspólny znak marki SkillBridge: box z ikoną GraduationCap (czapka) + wordmark.
 * Jeden komponent dla landingu, sidebara i auth — wariant steruje kontekstem przez prop,
 * nie przez rozjazd dwóch wywołań (zgodnie z kontraktem Z4, błąd #1).
 * Wariant „landing" renderuje na atrament (paleta editorial #6); „sidebar"/„auth" — gradient marki
 * (bez zmian — nie psujemy istniejącego wyglądu poza samą ikoną).
 * Serwerowy (bez "use client") — czysty render, używalny też w komponentach klienckich.
 */
export function Logo({ size = "md", variant = "landing", className }: LogoProps) {
	const s = SIZE[size];
	// sidebar ma nieco większe zaokrąglenie (12px) zgodnie z dawnym .db-sidebar-logo-icon.
	const radius = variant === "sidebar" ? 12 : s.radius;
	const isLanding = variant === "landing";
	// Cała aplikacja w języku editorial: landing = box atramentu, sidebar/auth = box bursztynu
	// (jak brand .mark w wireframe), wordmark zawsze atramentem. Zero gradientu/glow.
	const iconBg = isLanding ? "var(--ed-ink)" : "var(--ed-amber)";
	const iconShadow = undefined;
	const wordmarkStyle = { fontSize: s.text, color: "var(--ed-ink)" };

	return (
		<span className={cn("inline-flex items-center gap-2.5", className)} data-logo-variant={variant}>
			<span
				aria-hidden="true"
				className="flex shrink-0 items-center justify-center text-white"
				style={{
					width: s.box,
					height: s.box,
					borderRadius: radius,
					background: iconBg,
					boxShadow: iconShadow,
				}}
			>
				<GraduationCap size={s.icon} strokeWidth={1.8} />
			</span>
			<span className="font-heading font-extrabold tracking-tight" style={wordmarkStyle}>
				SkillBridge
			</span>
		</span>
	);
}
