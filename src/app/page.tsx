import { ArrowRight, Award, BookOpen, TrendingUp } from "lucide-react";
import Link from "next/link";
import { ScrollAnimations } from "@/components/landing/scroll-animations";
import { Logo } from "@/components/ui/logo";

export default function Home() {
	return (
		<>
			<ScrollAnimations />

			{/* ── Header ── */}
			<header
				id="header"
				className="lp-header fixed top-0 right-0 left-0 z-50 flex h-[72px] items-center justify-between px-5 md:px-10"
			>
				<Link href="/" className="no-underline">
					<Logo size="md" variant="landing" />
				</Link>

				<nav className="flex items-center gap-1">
					<Link
						href="#how"
						className="lp-nav-link rounded-full px-4 py-2 text-sm font-medium no-underline"
					>
						Jak to działa
					</Link>
					<Link
						href="/faculty/login"
						className="lp-nav-link rounded-full px-4 py-2 text-sm font-medium no-underline"
					>
						Panel wykładowcy
					</Link>
					<Link
						href="/login"
						className="lp-nav-btn rounded-full px-5 py-2 text-sm font-semibold no-underline"
					>
						Zaloguj się
					</Link>
				</nav>
			</header>

			{/* ── Hero ── */}
			<section className="lp-dot-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#0B0E14_0%,#1a1040_45%,#0e1628_100%)] px-6 pt-32 pb-20 text-center">
				{/* Blobs */}
				<div className="lp-blob top-[-8%] left-[2%] h-[480px] w-[480px] bg-[radial-gradient(circle,rgba(99,102,241,0.28)_0%,transparent_70%)]" />
				<div
					className="lp-blob top-[15%] right-[3%] h-[380px] w-[380px] bg-[radial-gradient(circle,rgba(34,211,238,0.20)_0%,transparent_70%)]"
					style={{ animationDelay: "-4s" }}
				/>
				<div
					className="lp-blob bottom-[8%] left-[28%] h-[320px] w-[320px] bg-[radial-gradient(circle,rgba(16,185,129,0.14)_0%,transparent_70%)]"
					style={{ animationDelay: "-7s" }}
				/>

				{/* Badge */}
				<div className="relative z-[2] mb-8 inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.32)] bg-[rgba(99,102,241,0.14)] px-[18px] py-2 text-[13px] font-semibold tracking-wide text-[#A5B4FC] backdrop-blur-sm">
					<div className="lp-badge-dot h-1.5 w-1.5 rounded-full bg-[#A5B4FC] shadow-[0_0_8px_#A5B4FC]" />
					Powered by Claude AI&nbsp;&middot;&nbsp;Merito Group
				</div>

				{/* H1 */}
				<h1 className="relative z-[2] mb-6 max-w-[820px] font-heading text-[clamp(38px,5.5vw,72px)] leading-[1.1] font-black tracking-tight text-[#F8FAFC]">
					Twój sylabus spotyka się
					<br />z <span className="lp-grad-text">rynkiem pracy.</span>
				</h1>

				{/* Subtitle */}
				<p className="relative z-[2] mb-12 max-w-[580px] text-[clamp(16px,1.8vw,20px)] leading-[1.75] text-[rgba(148,163,184,0.88)]">
					SkillBridge analizuje Twój program studiów, identyfikuje luki kompetencyjne i generuje
					spersonalizowane mikro-kursy. Twoja droga do wymarzonej pracy zaczyna się tutaj.
				</p>

				{/* Actions */}
				<div className="relative z-[2] flex flex-wrap justify-center gap-4">
					<Link
						href="/onboarding"
						className="lp-btn-cta inline-flex items-center gap-2.5 rounded-full px-[34px] py-4 font-heading text-[17px] font-bold tracking-wide text-white no-underline"
					>
						<Award className="h-[18px] w-[18px]" strokeWidth={2.5} />
						Stwórz swój Paszport
					</Link>
					<Link
						href="/login"
						className="lp-btn-ghost inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-[rgba(248,250,252,0.80)] no-underline"
					>
						Zaloguj się
						<ArrowRight className="h-4 w-4" strokeWidth={2.5} />
					</Link>
				</div>

				{/* Stats */}
				<div className="relative z-[2] mt-[72px] flex flex-wrap items-center justify-center gap-6 sm:gap-10">
					<div className="text-center">
						<span className="lp-grad-text mb-1.5 block font-[family-name:var(--font-geist-mono)] text-[30px] font-bold leading-none">
							14
						</span>
						<div className="text-[13px] font-medium text-[rgba(148,163,184,0.65)]">
							uczelni Merito
						</div>
					</div>
					<div className="lp-stat-sep h-10 w-px bg-[rgba(255,255,255,0.10)]" />
					<div className="text-center">
						<span className="lp-grad-text mb-1.5 block font-[family-name:var(--font-geist-mono)] text-[30px] font-bold leading-none">
							500+
						</span>
						<div className="text-[13px] font-medium text-[rgba(148,163,184,0.65)]">
							ofert pracy / mies.
						</div>
					</div>
					<div className="lp-stat-sep h-10 w-px bg-[rgba(255,255,255,0.10)]" />
					<div className="text-center">
						<span className="lp-grad-text mb-1.5 block font-[family-name:var(--font-geist-mono)] text-[30px] font-bold leading-none">
							95%
						</span>
						<div className="text-[13px] font-medium text-[rgba(148,163,184,0.65)]">
							trafności AI
						</div>
					</div>
				</div>
			</section>

			{/* ── Value Props ── */}
			<section className="bg-[#FAFAFA] px-5 py-[72px] md:px-10 md:py-[100px]">
				<div className="mx-auto max-w-[1160px]">
					<div className="mb-16 text-center">
						<span className="mb-4 inline-block rounded-full border border-[rgba(99,102,241,0.22)] bg-[rgba(99,102,241,0.10)] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6366F1]">
							Dlaczego SkillBridge?
						</span>
						<h2 className="mb-4 font-heading text-[clamp(28px,4vw,48px)] leading-[1.15] font-black tracking-tight text-[#0F172A]">
							Trzy filary Twojego sukcesu
						</h2>
						<p className="mx-auto max-w-[540px] text-lg leading-[1.75] text-[#475569]">
							Kompletny ekosystem do zarządzania swoją karierą — od pierwszego semestru do
							wymarzonej pracy.
						</p>
					</div>

					<div className="value-grid grid grid-cols-1 gap-6 md:grid-cols-3">
						{/* Paszport Kompetencji */}
						<div className="lp-val-card fade-up cursor-default rounded-3xl border border-[rgba(99,102,241,0.08)] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
							<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[rgba(99,102,241,0.22)] bg-[linear-gradient(135deg,rgba(99,102,241,0.16),rgba(99,102,241,0.06))]">
								<Award className="h-[26px] w-[26px] text-[#6366F1]" strokeWidth={2} />
							</div>
							<h3 className="mb-3 font-heading text-[21px] font-extrabold tracking-tight text-[#0F172A]">
								Paszport Kompetencji
							</h3>
							<p className="text-[15px] leading-[1.75] text-[#475569]">
								Twój osobisty, cyfrowy dokument umiejętności. Podziel się nim z pracodawcą jednym
								linkiem — jak LinkedIn, tylko z prawdziwymi, zwalidowanymi kompetencjami.
							</p>
						</div>

						{/* Market Intelligence */}
						<div className="lp-val-card fade-up cursor-default rounded-3xl border border-[rgba(99,102,241,0.08)] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
							<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[rgba(34,211,238,0.22)] bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(34,211,238,0.06))]">
								<TrendingUp className="h-[26px] w-[26px] text-[#22D3EE]" strokeWidth={2} />
							</div>
							<h3 className="mb-3 font-heading text-[21px] font-extrabold tracking-tight text-[#0F172A]">
								Market Intelligence
							</h3>
							<p className="text-[15px] leading-[1.75] text-[#475569]">
								Dane z tysięcy ofert pracy w Polsce, aktualizowane na bieżąco. Wiesz dokładnie,
								czego szuka rynek dla Twojej ścieżki kariery.
							</p>
						</div>

						{/* Mikro-kursy AI */}
						<div className="lp-val-card fade-up cursor-default rounded-3xl border border-[rgba(99,102,241,0.08)] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
							<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[rgba(16,185,129,0.22)] bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(16,185,129,0.06))]">
								<BookOpen className="h-[26px] w-[26px] text-[#10B981]" strokeWidth={2} />
							</div>
							<h3 className="mb-3 font-heading text-[21px] font-extrabold tracking-tight text-[#0F172A]">
								Mikro-kursy AI
							</h3>
							<p className="text-[15px] leading-[1.75] text-[#475569]">
								Automatycznie generowane, 15–30 minutowe kursy zamykające konkretne luki.
								Praktyczne, nie akademickie — bo rynek potrzebuje umiejętności, nie teorii.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ── How It Works ── */}
			<section
				id="how"
				className="bg-[linear-gradient(180deg,#EEF2FF_0%,#E2E8F0_100%)] px-5 py-[72px] md:px-10 md:py-[100px]"
			>
				<div className="mx-auto max-w-[1160px]">
					<div className="mb-16 text-center">
						<span className="mb-4 inline-block rounded-full border border-[rgba(99,102,241,0.22)] bg-[rgba(99,102,241,0.10)] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6366F1]">
							Jak to działa?
						</span>
						<h2 className="mb-4 font-heading text-[clamp(28px,4vw,48px)] leading-[1.15] font-black tracking-tight text-[#0F172A]">
							Trzy kroki do Paszportu
						</h2>
						<p className="mx-auto max-w-[540px] text-lg leading-[1.75] text-[#475569]">
							Od sylabusa do wymarzonej pracy w kilka minut.
						</p>
					</div>

					<div className="steps-grid lp-steps-line grid grid-cols-1 gap-7 md:grid-cols-3">
						{/* Step 1 */}
						<div className="lp-step-card fade-up relative z-[1] rounded-3xl border border-[rgba(99,102,241,0.08)] bg-white p-7 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
							<div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6366F1_0%,#22D3EE_100%)] font-[family-name:var(--font-geist-mono)] text-xl font-bold text-white shadow-[0_0_24px_rgba(99,102,241,0.35)]">
								01
							</div>
							<h3 className="mb-3 font-heading text-[21px] font-extrabold tracking-tight text-[#0F172A]">
								Wgraj sylabus
							</h3>
							<p className="text-[15px] leading-[1.75] text-[#475569]">
								Wklej tekst lub prześlij PDF swojego programu studiów. AI automatycznie wyekstrahuje
								wszystkie kompetencje i umiejętności.
							</p>
						</div>

						{/* Step 2 */}
						<div className="lp-step-card fade-up relative z-[1] rounded-3xl border border-[rgba(99,102,241,0.08)] bg-white p-7 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
							<div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6366F1_0%,#22D3EE_100%)] font-[family-name:var(--font-geist-mono)] text-xl font-bold text-white shadow-[0_0_24px_rgba(99,102,241,0.35)]">
								02
							</div>
							<h3 className="mb-3 font-heading text-[21px] font-extrabold tracking-tight text-[#0F172A]">
								Odkryj luki
							</h3>
							<p className="text-[15px] leading-[1.75] text-[#475569]">
								AI porównuje Twoje kompetencje z wymaganiami rynku dla wybranej ścieżki kariery.
								Dowiedz się dokładnie, czego Ci brakuje.
							</p>
						</div>

						{/* Step 3 */}
						<div className="lp-step-card fade-up relative z-[1] rounded-3xl border border-[rgba(99,102,241,0.08)] bg-white p-7 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
							<div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6366F1_0%,#22D3EE_100%)] font-[family-name:var(--font-geist-mono)] text-xl font-bold text-white shadow-[0_0_24px_rgba(99,102,241,0.35)]">
								03
							</div>
							<h3 className="mb-3 font-heading text-[21px] font-extrabold tracking-tight text-[#0F172A]">
								Zamknij luki
							</h3>
							<p className="text-[15px] leading-[1.75] text-[#475569]">
								Otrzymaj spersonalizowane mikro-kursy i buduj swój Paszport Kompetencji. Każdy kurs
								to praktyczna wiedza, nie teoria.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ── CTA Banner ── */}
			<section className="lp-dot-grid relative overflow-hidden bg-[linear-gradient(135deg,#0B0E14_0%,#1a1040_45%,#0e1628_100%)] px-5 py-[120px] text-center md:px-10">
				<div className="lp-blob top-[-8%] left-[2%] h-[480px] w-[480px] bg-[radial-gradient(circle,rgba(99,102,241,0.28)_0%,transparent_70%)] opacity-40" />
				<div
					className="lp-blob top-[15%] right-[3%] h-[380px] w-[380px] bg-[radial-gradient(circle,rgba(34,211,238,0.20)_0%,transparent_70%)] opacity-40"
					style={{ animationDelay: "-4s" }}
				/>

				<div className="relative z-[2] mx-auto max-w-[1160px]">
					<div className="mb-6 inline-block rounded-full border border-[rgba(99,102,241,0.35)] bg-[rgba(99,102,241,0.20)] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#A5B4FC]">
						Zacznij dziś — bezpłatnie
					</div>
					<h2 className="mb-4 font-heading text-[clamp(30px,4vw,52px)] leading-[1.12] font-black tracking-tight text-[#F8FAFC]">
						Gotowy/a? Stwórz swój
						<br />
						<span className="lp-grad-text">Paszport Kompetencji.</span>
					</h2>
					<p className="mx-auto mb-12 max-w-[480px] text-lg text-[rgba(148,163,184,0.80)]">
						Dołącz do studentów uczelni Merito, którzy już znają swoją wartość na rynku pracy.
					</p>
					<Link
						href="/onboarding"
						className="lp-btn-cta inline-flex items-center gap-2.5 rounded-full px-11 py-[18px] font-heading text-lg font-bold tracking-wide text-white no-underline"
					>
						<ArrowRight className="h-5 w-5" strokeWidth={2.5} />
						Zacznij teraz
					</Link>
				</div>
			</section>

			{/* ── Footer ── */}
			<footer className="border-t border-[rgba(255,255,255,0.06)] bg-[#060810] px-5 py-7 md:px-10">
				<div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-4">
					<Link href="/" className="no-underline">
						<Logo size="sm" variant="landing" className="opacity-90" />
					</Link>
					<div className="flex items-center gap-4">
						<Link
							href="/faculty/login"
							className="text-[13px] text-[rgba(148,163,184,0.40)] no-underline transition-colors hover:text-[rgba(148,163,184,0.70)]"
						>
							Panel wykładowcy
						</Link>
						<span className="text-[13px] text-[rgba(148,163,184,0.20)]">&middot;</span>
						<span className="text-[13px] text-[rgba(148,163,184,0.40)]">
							© 2026 SkillBridge&nbsp;&middot;&nbsp;Projekt EduTech Masters&nbsp;&middot;&nbsp;Grupa
							Merito
						</span>
					</div>
				</div>
			</footer>
		</>
	);
}
