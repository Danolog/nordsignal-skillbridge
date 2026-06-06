import Link from "next/link";
import { ScrollAnimations } from "@/components/landing/scroll-animations";
import { Logo } from "@/components/ui/logo";

// Landing #6 „Papierowy editorial" (kierunek A). Bohater = STUDENT.
// Copy zatwierdzone przez Mayę (spec docs/product/skillbridge-h-landing-spec-A-v0.1.md §0) — wstawione dokładnie.
// Tokeny editorial (--color-ed-*) z globals.css; zero kolorów na sztywno.
// CTA → rejestracja /signup. Liczby [XX]/[XXX] = placeholdery (do weryfikacji Darek/Sophia).

/** Paski kompetencji w karcie Paszportu — szerokość jako %, kolor wg progu (patrz barColor). */
const PASSPORT_BARS: { label: string; value: number }[] = [
	{ label: "Analiza danych", value: 82 },
	{ label: "Komunikacja", value: 74 },
	{ label: "Finanse", value: 65 },
	{ label: "Zarządzanie projektem", value: 48 },
	{ label: "Programowanie", value: 35 },
];

// Próg koloru paska (delta Mili #6): ≥80% amber · 40–79% warn (od 40%, nie 60%) · <40% danger.
function barColor(value: number): string {
	if (value >= 80) return "var(--color-ed-amber)";
	if (value >= 40) return "var(--color-ed-warn)";
	return "var(--color-ed-danger)";
}

const STEPS = [
	{
		n: "01",
		title: "Wgraj program studiów",
		body: "Wklej tekst albo prześlij PDF sylabusa. AI wyłuskuje kompetencje. Przejrzyj i popraw — to Twoja lista, nie werdykt maszyny.",
	},
	{
		n: "02",
		title: "Zobacz, gdzie są luki",
		body: "AI zestawia Twoje kompetencje z wymaganiami rynku i proponuje, czego brakuje. Co uznasz za lukę wartą zamknięcia — wybierasz sam.",
	},
	{
		n: "03",
		title: "Zamykaj luki w swoim tempie",
		body: "Krótkie kursy (15–30 min) pod konkretną lukę. Twoje refleksje są prywatne — AI ich nie czyta.",
	},
];

const GAINS = [
	{
		emoji: "🎓",
		title: "Paszport Kompetencji",
		body: "Udostępniasz pracodawcy jednym linkiem. Samoocena + propozycja AI, jasno opisane — bez ściemy.",
	},
	{
		emoji: "📊",
		title: "Wiedza o rynku",
		body: "Czego rynek szuka na Twojej ścieżce — z realnych ofert pracy analizowanych co miesiąc.",
	},
	{
		emoji: "📖",
		title: "Kursy wycelowane w lukę",
		body: "15–30 min, praktyka. Pod konkretną lukę, nie ogólny katalog wiedzy.",
	},
];

export default function Home() {
	return (
		<div className="min-h-screen bg-ed-cream font-ed-body text-ed-ink">
			<ScrollAnimations />

			{/* Skip-link „Przejdź do treści" — widoczny dopiero przy fokusie klawiaturą (a11y). */}
			<a
				href="#main-content"
				className="sr-only rounded-full bg-ed-ink px-4 py-2 font-bold text-ed-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
			>
				Przejdź do treści
			</a>

			{/* ── Header / Nav (fixed) ── */}
			<header
				id="header"
				className="fixed top-0 right-0 left-0 z-50 flex h-[72px] items-center justify-between border-b border-ed-border bg-ed-cream px-6 md:px-20"
			>
				<Link href="/" className="no-underline">
					<Logo size="sm" variant="landing" />
				</Link>
				<nav className="flex items-center gap-3">
					<Link
						href="#jak"
						className="hidden text-sm font-medium text-ed-muted no-underline transition-colors hover:text-ed-ink sm:inline"
					>
						Jak to działa
					</Link>
					<Link
						href="/login"
						className="hidden text-sm font-medium text-ed-muted no-underline transition-colors hover:text-ed-ink sm:inline"
					>
						Zaloguj się
					</Link>
					<Link
						href="/signup"
						className="rounded-full border border-ed-ink bg-ed-ink px-5 py-2 text-sm font-bold text-ed-cream no-underline transition-opacity hover:opacity-90"
					>
						Zbuduj Paszport
					</Link>
				</nav>
			</header>

			<main id="main-content">
				{/* ── Hero ── */}
				<section className="mx-auto max-w-[1440px] px-6 pt-[120px] pb-16 md:px-10 md:pt-[140px] lg:px-20">
					<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[680px_560px] lg:gap-16">
						{/* Lewa kolumna */}
						<div>
							<p
								className="ed-hero-up mb-6 text-[11px] font-bold tracking-[1.65px] text-ed-amber-text uppercase"
								style={{ animationDelay: "0.10s" }}
							>
								Platforma kompetencji studentów
							</p>
							<h1
								className="ed-hero-up mb-7 font-ed-display text-[clamp(36px,8vw,72px)] leading-[1.08] font-bold text-ed-ink"
								style={{ animationDelay: "0.25s" }}
							>
								AI podpowiada
								<br />
								Ci, czego brakuje.
								<br />
								Decyzję zostawia
								<br />
								Tobie.
							</h1>
							<p
								className="ed-hero-up mb-9 max-w-[560px] text-[18px] leading-[1.58] text-ed-muted"
								style={{ animationDelay: "0.40s" }}
							>
								SkillBridge czyta Twój program studiów, porównuje go z tym, czego dziś szuka rynek,
								i pokazuje, gdzie masz luki. Nie wystawia ocen za Ciebie — proponuje, a Ty
								wybierasz, co z tym zrobisz.
							</p>
							<div className="ed-hero-up" style={{ animationDelay: "0.40s" }}>
								<Link
									href="/signup"
									className="inline-flex items-center rounded-full bg-ed-amber px-8 py-4 font-ed-body text-[16px] font-bold text-ed-ink no-underline transition-opacity hover:opacity-90"
								>
									Zbuduj swój Paszport Kompetencji
								</Link>
							</div>
						</div>

						{/* Prawa kolumna — karta Paszportu */}
						<div className="rounded-2xl border border-ed-border bg-ed-surface p-7 shadow-[0_2px_24px_rgba(27,25,23,0.06)]">
							<div className="mb-1 flex items-center justify-between">
								<span className="font-ed-display text-[20px] font-bold text-ed-ink">
									Paszport Kompetencji
								</span>
								<span className="rounded-full bg-ed-badge-bg px-3 py-1 text-[12px] font-medium text-ed-muted">
									Finanse
								</span>
							</div>
							<p className="mb-6 text-[14px] leading-[1.6] text-ed-muted">
								Twoja samoocena vs propozycja AI
							</p>

							<div className="flex flex-col gap-4">
								{PASSPORT_BARS.map((bar) => (
									<div key={bar.label}>
										<div className="mb-1.5 flex items-center justify-between">
											<span className="text-[14px] font-medium text-ed-ink">{bar.label}</span>
											<span className="text-[14px] text-ed-muted">{bar.value}%</span>
										</div>
										<div className="h-2 w-full overflow-hidden rounded-full bg-ed-border">
											<div
												className="h-full rounded-full"
												style={{ width: `${bar.value}%`, background: barColor(bar.value) }}
											/>
										</div>
									</div>
								))}
							</div>

							<div className="mt-6 border-t-2 border-ed-amber pt-4">
								<p className="text-[14px] leading-[1.6] text-ed-muted">
									Samoocena + propozycja AI · ostatnie słowo masz Ty
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* ── Pasek dowodu ── */}
				<section className="mx-auto max-w-[1440px] px-6 py-2 md:px-10 lg:px-20">
					<div className="grid grid-cols-1 divide-y divide-ed-border border-y border-ed-border md:grid-cols-3 md:divide-x md:divide-y-0">
						<div className="px-6 py-6 text-center">
							<span className="font-ed-display text-[28px] font-bold text-ed-ink">[XX]</span>
							<p className="mt-1 text-[15px] leading-[1.65] text-ed-muted">uczelni w programie</p>
						</div>
						<div className="px-6 py-6 text-center">
							<span className="font-ed-display text-[28px] font-bold text-ed-ink">[XXX]</span>
							<p className="mt-1 text-[15px] leading-[1.65] text-ed-muted">
								ofert pracy analizowanych miesięcznie
							</p>
						</div>
						<div className="px-6 py-6 text-center">
							<span className="font-ed-display text-[18px] font-bold text-ed-ink">
								Ty decydujesz
							</span>
							<p className="mt-1 text-[15px] leading-[1.65] text-ed-muted">
								AI proponuje, ostatnie słowo masz Ty
							</p>
						</div>
					</div>
				</section>

				{/* ── Jak to działa ── */}
				<section id="jak" className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 lg:px-20">
					<h2 className="mb-2 font-ed-display text-[44px] leading-[1.1] font-bold text-ed-ink">
						Jak to działa
					</h2>
					<div className="mb-12 h-[3px] w-16 bg-ed-amber" />
					<div className="value-grid grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
						{STEPS.map((step) => (
							<div key={step.n} className="fade-up">
								<div className="font-ed-display text-[56px] leading-none font-bold text-ed-border">
									{step.n}
								</div>
								<div className="my-4 h-px w-full bg-ed-border" />
								<h3 className="mb-3 font-ed-display text-[20px] font-bold text-ed-ink">
									{step.title}
								</h3>
								<p className="text-[15px] leading-[1.65] text-ed-muted">{step.body}</p>
							</div>
						))}
					</div>
				</section>

				{/* ── Co zyskujesz ── */}
				<section
					aria-labelledby="gains-heading"
					className="mx-auto max-w-[1440px] px-6 py-12 md:px-10 lg:px-20"
				>
					<h2 id="gains-heading" className="sr-only">
						Co zyskujesz
					</h2>
					<div className="mb-12 h-[3px] w-full bg-ed-amber" />
					<div className="steps-grid grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						{GAINS.map((gain) => (
							<div
								key={gain.title}
								className="fade-up ed-lift relative rounded-2xl border border-ed-border bg-ed-surface p-7 pl-9"
							>
								<div className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl bg-ed-amber" />
								<div className="mb-4 text-[32px] leading-none">{gain.emoji}</div>
								<h3 className="mb-3 font-ed-display text-[18px] font-bold text-ed-ink">
									{gain.title}
								</h3>
								<p className="text-[15px] leading-[1.65] text-ed-muted">{gain.body}</p>
							</div>
						))}
					</div>
				</section>

				{/* ── Dla uczelni ── */}
				<section className="mx-auto max-w-[1440px] px-6 py-16 md:px-10 lg:px-20">
					<h2 className="mb-8 font-ed-display text-[36px] leading-[1.1] font-bold text-ed-ink">
						Dla uczelni: zobaczcie swój program oczami rynku pracy
					</h2>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{/* DZIŚ */}
						<div className="relative rounded-2xl border-2 border-ed-amber bg-ed-cream p-7 pt-10">
							<span className="absolute top-0 left-0 inline-flex items-center gap-2 rounded-tl-2xl rounded-br-xl bg-ed-amber px-4 py-1.5 text-[11px] font-bold tracking-[1.65px] text-ed-cream uppercase">
								<span className="ed-pulse h-1.5 w-1.5 rounded-full bg-ed-cream" />
								Dziś
							</span>
							<p className="text-[16px] leading-[1.6] text-ed-ink">
								Panel tylko do odczytu — mapa pokrycia kompetencji + luki program vs rynek. Zero
								nakładu dla uczelni — dane z programu studiów + ofert pracy.
							</p>
						</div>
						{/* W PEŁNEJ WERSJI */}
						<div className="relative rounded-2xl border border-ed-border bg-ed-surface p-7 pt-10">
							<span className="absolute top-0 left-0 inline-flex items-center rounded-tl-2xl rounded-br-xl bg-ed-border px-4 py-1.5 text-[11px] font-bold tracking-[1.65px] text-ed-ink uppercase">
								W pełnej wersji
							</span>
							<p className="text-[16px] leading-[1.6] text-ed-muted">
								Model trójstronny — wykładowca / instytucja / firma potwierdzają kompetencje.
								Uczelnia jako trzecia strona walidacji.
							</p>
						</div>
					</div>
				</section>

				{/* ── Dla pracodawcy ── */}
				<section className="mx-auto max-w-[1440px] px-6 py-16 md:px-10 lg:px-20">
					<h2 className="mb-8 font-ed-display text-[36px] leading-[1.1] font-bold text-ed-ink">
						Dla pracodawcy: jeden link zamiast stosu CV
					</h2>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{/* DZIŚ */}
						<div className="relative rounded-2xl border-2 border-ed-amber bg-ed-cream p-7 pt-10">
							<span className="absolute top-0 left-0 inline-flex items-center gap-2 rounded-tl-2xl rounded-br-xl bg-ed-amber px-4 py-1.5 text-[11px] font-bold tracking-[1.65px] text-ed-cream uppercase">
								<span className="ed-pulse h-1.5 w-1.5 rounded-full bg-ed-cream" />
								Dziś
							</span>
							<p className="text-[16px] leading-[1.6] text-ed-ink">
								Paszport kandydata jednym linkiem, bez logowania. Widzisz samoocenę + propozycję AI
								— bez pośredników.
							</p>
						</div>
						{/* W PEŁNEJ WERSJI */}
						<div className="relative rounded-2xl border border-ed-border bg-ed-surface p-7 pt-10">
							<span className="absolute top-0 left-0 inline-flex items-center rounded-tl-2xl rounded-br-xl bg-ed-border px-4 py-1.5 text-[11px] font-bold tracking-[1.65px] text-ed-ink uppercase">
								W pełnej wersji
							</span>
							<p className="text-[16px] leading-[1.6] text-ed-muted">
								Firma jako trzecia strona potwierdzania kompetencji. Zamknięta pętla: uczelnia →
								student → rynek.
							</p>
						</div>
					</div>
				</section>

				{/* ── CTA końcowe ── */}
				<section className="bg-ed-ink">
					<div className="mx-auto max-w-[1440px] px-6 py-24 text-center md:px-10 lg:px-20">
						<h2 className="mx-auto mb-9 max-w-[760px] font-ed-display text-[44px] leading-[1.12] font-bold text-ed-cream">
							Zobacz, czego szuka rynek na Twojej ścieżce.
							<br />
							Decyzję, co z tym zrobić, podejmiesz sam.
						</h2>
						<Link
							href="/signup"
							className="inline-flex items-center rounded-full bg-ed-amber px-9 py-4 font-ed-body text-[16px] font-bold text-ed-ink no-underline transition-opacity hover:opacity-90"
						>
							Zbuduj swój Paszport Kompetencji
						</Link>
					</div>
				</section>
			</main>

			{/* ── Footer ── */}
			<footer className="border-t border-ed-border bg-ed-cream">
				<div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-7 md:px-10 lg:px-20">
					<Link href="/" className="no-underline">
						<Logo size="sm" variant="landing" />
					</Link>
					<span className="text-[14px] text-ed-muted">© 2026 SkillBridge</span>
				</div>
			</footer>
		</div>
	);
}
