import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

// FAZA 2 (Maya): wybór finalnego symbolu marki + tokenizacja gradientu
// Kanoniczna ikona: BrainCircuit (lucide-react) — zgodna z 2/3 dotychczasowych użyć
// (landing + auth) i publicznym wizerunkiem; sidebar miał własny inline <svg> (mortarboard),
// który ujednolicamy do tej samej ikony. Wybór ikony (BrainCircuit vs mortarboard) oraz
// tokenizacja gradientu (oklch @theme zamiast hexa) to decyzja Mili — punkt zaczepienia tu.

/** Gradient marki — JEDNO źródło prawdy (był rozsiany hexem po 4 plikach). */
const LOGO_GRADIENT = "linear-gradient(135deg, #6366F1 0%, #22D3EE 100%)";

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
 * Wspólny znak marki SkillBridge: gradientowy box z ikoną BrainCircuit + wordmark.
 * Jeden komponent dla landingu, sidebara i auth — wariant steruje kontekstem przez prop,
 * nie przez rozjazd dwóch wywołań (zgodnie z kontraktem Z4, błąd #1).
 * Serwerowy (bez "use client") — czysty render, używalny też w komponentach klienckich.
 */
export function Logo({ size = "md", variant = "landing", className }: LogoProps) {
	const s = SIZE[size];
	// sidebar ma nieco większe zaokrąglenie (12px) zgodnie z dawnym .db-sidebar-logo-icon.
	const radius = variant === "sidebar" ? 12 : s.radius;

	return (
		<span className={cn("inline-flex items-center gap-2.5", className)} data-logo-variant={variant}>
			<span
				aria-hidden="true"
				className="flex shrink-0 items-center justify-center text-white"
				style={{
					width: s.box,
					height: s.box,
					borderRadius: radius,
					background: LOGO_GRADIENT,
					// Parytet glow: landing I auth dostają poświatę (auth miał ją w dawnym
					// .auth-logo-icon — bez tego regresja wizualna). Sidebar nigdy jej nie miał.
					boxShadow: variant !== "sidebar" ? "0 0 18px rgba(99,102,241,0.45)" : undefined,
				}}
			>
				<BrainCircuit size={s.icon} strokeWidth={1.8} />
			</span>
			<span
				className="font-heading font-extrabold tracking-tight"
				style={{
					fontSize: s.text,
					background: LOGO_GRADIENT,
					WebkitBackgroundClip: "text",
					backgroundClip: "text",
					WebkitTextFillColor: "transparent",
				}}
			>
				SkillBridge
			</span>
		</span>
	);
}
