import Link from "next/link";
import { MobileNav } from "@/components/landing/mobile-nav";
import { ScrollAnimations } from "@/components/landing/scroll-animations";
import { Logo } from "@/components/ui/logo";

// Landing #6 „Papierowy editorial" (kierunek A) — przebudowa copy v1.0 (deck Mayi) + rozbudowane sekcje (spec Mili v0.2).
// Bohater = STUDENT. Copy 1:1 z docs/product/skillbridge-h-landing-copy-v1.0.md; kroki infografiki 1:1 z wersją Darka (prompt #6).
// Tokeny editorial (--color-ed-*) z globals.css; zero kolorów na sztywno (dozwolone tylko cienie literałowe).
// TWARDA REGUŁA: zero wzmianki o narzędziu na całym landingu — podmiotem jest „SkillBridge"/„ty".
//
// Trasy CTA (realne w repo): student → /signup. Uczelnia/pracodawca: trasy kontaktowe (/kontakt, /paszport-demo)
// jeszcze nie istnieją → CTA sekcyjne kierują kotwicą do #cta-koniec, a CTA końcowe uczelnia/pracodawca
// do #dla-uczelni / #dla-pracodawcow (pełny kontekst). TODO: realne trasy kontaktu po sign-offie Darka (spec Mili §11).

// ── Infografika „Droga studenta" — kroki 0–5 (tekst DOKŁADNIE z wersji Darka, prompt #6) ──
const JOURNEY_STEPS: { n: number; title: string; body: string }[] = [
	{
		n: 0,
		title: "Ocena startowa",
		body: "Mówisz nam, gdzie jesteś. Punkt zero, od którego mierzymy postęp.",
	},
	{
		n: 1,
		title: "Cel kariery",
		body: "Wybierasz zawód; tłumaczymy go na konkretne kompetencje. Pomagamy w określeniu celu Twojej kariery.",
	},
	{
		n: 2,
		title: "Luki programowe",
		body: "Pokazujemy, czego program nie pokrywa względem zawodu. Budujemy wspólnie mapę dotarcia do celu.",
	},
	{
		n: 3,
		title: "Projekty na realnych danych",
		body: "Zamykasz luki, robiąc projekty na prawdziwych zbiorach danych. Ucząc się, zdobywasz bezcenne doświadczenie.",
	},
	{
		n: 4,
		title: "Ocena i feedback",
		body: "Zgłaszasz link do projektu, dostajesz ocenę i wskazówki. Dodajesz samoocenę i swoje refleksje. Budujesz swoją wartość i pewność swoich kompetencji.",
	},
	{
		n: 5,
		title: "Paszport kompetencji",
		body: "Sprawdzone projekty układają się w jeden profil z linkiem do Twojego doświadczenia i opinią sprawdzającego.",
	},
];

// Cel na końcu osi — efekt, nie krok (amber pełny, strzałka →).
const JOURNEY_EFFECT = {
	title: "Pierwsza praca",
	body: "Pokazujesz pracodawcy paszport jednym linkiem. Widzi, co potrafisz, zanim Cię zatrudni.",
};

// Wypełnienie kółka węzła rośnie z numerem kroku (0 → 5): narastający amber (tokeny, nie hex).
function nodeFill(n: number): string {
	// 0..5 → 0.18..1.0 krycia akcentu; kompozycja na border, by zachować czytelność.
	const opacity = 0.18 + (n / 5) * 0.82;
	return `color-mix(in oklch, var(--color-ed-amber) ${Math.round(opacity * 100)}%, var(--color-ed-surface))`;
}

// ── Co zyskujesz — student — copy v1.0 §4 ──
const STUDENT_VALUE = [
	{
		emoji: "🧭",
		title: "Wiesz, czego Ci brakuje, zanim dowie się tego rekruter",
		body: "Masz wypisane kompetencje zawodu i te, których studia nie dają.",
	},
	{
		emoji: "📊",
		title: "Uczysz się, robiąc — na prawdziwych danych",
		body: "Projekty na realnych zbiorach (np. wynagrodzenia z GUS); każdy to nauka i element portfolio.",
	},
	{
		emoji: "🎓",
		title: "Masz sprawdzony dowód pracy, nie listę kursów",
		body: "Paszport zbiera Twoje ocenione projekty: link do kodu, opinia sprawdzającego, realne dane. CV mówi, że coś umiesz. Paszport to pokazuje — jednym linkiem, który rekruter może otworzyć i sprawdzić sam.",
	},
];

// ── Korzyści uczelnia (4) — copy v1.0 §5 ──
const FACULTY_BENEFITS = [
	{
		title: "Widzicie luki programowe przed akredytacją",
		body: "1 na 3 pracodawców niezadowolony z absolwentów.",
	},
	{
		title: "Reagujecie na zmianę rynku",
		body: "39% kompetencji zmieni się do 2030 (WEF).",
	},
	{
		title: "Zatrzymujecie studentów",
		body: "19% rezygnuje po I roku (OECD 2025); ~31% nie kończy.",
	},
	{
		title: "Argument w niżu demograficznym",
		body: "„Uczymy pod realny rynek — i mamy dowód.”",
	},
];

// ── Korzyści pracodawca (3) — copy v1.0 §6 ──
const EMPLOYER_BENEFITS = [
	{
		title: "Widzicie pracę, nie obietnicę",
		body: "Kandydat przychodzi z portfolio sprawdzonych projektów na realnych danych, z linkiem do kodu i opinią sprawdzającego.",
	},
	{
		title: "Docieracie do talentu wcześniej",
		body: "59% firm nie obsadza stanowisk (ManpowerGroup 2025). Kandydat z paszportem jest gotowy przed pierwszą rozmową.",
	},
	{
		title: "Bez budowania własnego employer brandingu",
		body: "Paszport robi robotę — student go prowadzi, Wy oceniacie.",
	},
];

// Wspólny badge DZIŚ / W PEŁNEJ WERSJI (reuse — nie duplikuj stylów per sekcja).
function BadgeToday() {
	return (
		<span className="absolute top-4 left-8 inline-flex items-center gap-2 rounded-full bg-ed-amber px-3 py-1 text-[11px] font-bold tracking-[1.65px] text-ed-ink uppercase">
			<span className="ed-pulse h-1.5 w-1.5 rounded-full bg-ed-ink" aria-hidden="true" />
			Dziś
		</span>
	);
}

function BadgeFull() {
	return (
		<span className="absolute top-4 left-8 inline-block rounded-full bg-ed-border px-3 py-1 text-[11px] font-bold tracking-[1.65px] text-ed-ink uppercase">
			W pełnej wersji
		</span>
	);
}

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

			{/* ── Header / Nav (fixed) — spec Mili v0.3 §3 ── */}
			<header
				id="header"
				className="fixed top-0 right-0 left-0 z-50 h-[72px] border-b border-ed-border bg-ed-cream"
			>
				<div className="mx-auto flex h-full max-w-[1680px] items-center justify-between px-6 md:px-10 lg:px-16 xl:px-20 2xl:px-28">
					<Link href="/" aria-label="SkillBridge — strona główna" className="no-underline">
						<Logo size="sm" variant="landing" />
					</Link>

					{/* Nav desktop (5 pozycji) */}
					<nav className="hidden items-center gap-6 md:flex xl:gap-8" aria-label="Nawigacja główna">
						<Link
							href="#dla-uczelni"
							className="text-[15px] font-medium text-ed-ink no-underline transition-colors duration-150 hover:text-ed-amber-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ed-amber"
						>
							Dla uczelni
						</Link>
						<Link
							href="/login"
							className="text-[15px] font-medium text-ed-ink no-underline transition-colors duration-150 hover:text-ed-amber-text focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ed-amber"
						>
							Zaloguj się
						</Link>
						<Link
							href="/faculty/login"
							className="text-[15px] font-normal text-ed-muted no-underline transition-colors duration-150 hover:text-ed-ink focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ed-amber"
						>
							Panel uczelni
						</Link>
						<Link
							href="/signup"
							className="inline-block rounded-full bg-ed-ink px-5 py-2.5 text-[15px] font-bold whitespace-nowrap text-ed-cream no-underline transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ed-amber"
						>
							Sprawdź, czego Ci brakuje
						</Link>
					</nav>

					{/* Pasek mobile: CTA student stale widoczne + hamburger (client) */}
					<MobileNav />
				</div>
			</header>

			<main id="main-content">
				{/* ── Hero (copy v1.0 §1) ── */}
				<section className="mx-auto max-w-[1680px] px-6 pt-[120px] pb-16 md:px-10 md:pt-[140px] lg:px-16 xl:px-20 2xl:px-28">
					<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,600px)] xl:gap-16 2xl:grid-cols-[minmax(0,1fr)_minmax(0,640px)] 2xl:gap-20">
						{/* Lewa kolumna */}
						<div>
							<p
								className="ed-hero-up mb-6 text-[11px] font-bold tracking-[1.65px] text-ed-amber-text uppercase"
								style={{ animationDelay: "0.10s" }}
							>
								Dla studentów, uczelni i pracodawców
							</p>
							<h1
								className="ed-hero-up mb-7 max-w-[22ch] font-ed-display text-[clamp(36px,8vw,72px)] leading-[1.08] font-bold text-ed-ink"
								style={{ animationDelay: "0.25s" }}
							>
								Studia uczą Cię wielu rzeczy. SkillBridge mówi Ci, których szuka rynek.
							</h1>
							<p
								className="ed-hero-up mb-9 max-w-[58ch] text-[18px] leading-[1.58] text-ed-muted"
								style={{ animationDelay: "0.40s" }}
							>
								SkillBridge porównuje Twój program studiów z wymaganiami zawodu, który Cię
								interesuje, pokazuje, czego Ci do niego brakuje, i zamienia te braki w projekty na
								realnych danych. Każdy projekt jest oceniany i ląduje w Twoim paszporcie kompetencji
								— konkretny, sprawdzony dowód, który pokażesz pracodawcy zamiast deklaracji z CV.
								Swoje luki znajdujesz i nadrabiasz sam — zanim wychwyci je rekruter na rozmowie.
							</p>
							<div className="ed-hero-up" style={{ animationDelay: "0.40s" }}>
								<Link
									href="/signup"
									className="inline-flex items-center rounded-full bg-ed-amber px-8 py-4 font-ed-body text-[16px] font-bold text-ed-ink no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-amber"
								>
									Sprawdź, czego Ci brakuje
								</Link>
								<p className="mt-3 max-w-[420px] text-[14px] leading-[1.6] text-ed-muted">
									Pierwsza ocena startowa zajmuje kilka minut. Bez zobowiązań, bez CV.
								</p>
							</div>
						</div>

						{/* Prawa kolumna — karta Paszportu (reuse z kierunku A) */}
						<div className="rounded-2xl border border-ed-border bg-ed-surface p-7 shadow-[0_2px_24px_rgba(27,25,23,0.06)]">
							<div className="mb-1 flex items-center justify-between">
								<span className="font-ed-display text-[20px] font-bold text-ed-ink">
									Paszport kompetencji
								</span>
								<span className="rounded-full bg-ed-badge-bg px-3 py-1 text-[12px] font-medium text-ed-muted">
									Analityk danych
								</span>
							</div>
							<p className="mb-6 text-[14px] leading-[1.6] text-ed-muted">
								Sprawdzone projekty na realnych danych
							</p>

							<div className="flex flex-col gap-4">
								{[
									{ label: "Analiza danych", value: 82 },
									{ label: "SQL i bazy danych", value: 74 },
									{ label: "Wizualizacja", value: 65 },
									{ label: "Statystyka", value: 48 },
									{ label: "Python", value: 35 },
								].map((bar) => (
									<div key={bar.label}>
										<div className="mb-1.5 flex items-center justify-between">
											<span className="text-[14px] font-medium text-ed-ink">{bar.label}</span>
											<span className="text-[14px] text-ed-muted">{bar.value}%</span>
										</div>
										<div className="h-2 w-full overflow-hidden rounded-full bg-ed-border">
											<div
												className="h-full rounded-full"
												style={{
													width: `${bar.value}%`,
													background:
														bar.value >= 80
															? "var(--color-ed-amber)"
															: bar.value >= 40
																? "var(--color-ed-warn)"
																: "var(--color-ed-danger)",
												}}
											/>
										</div>
									</div>
								))}
							</div>

							<div className="mt-6 border-t-2 border-ed-amber pt-4">
								<p className="text-[14px] leading-[1.6] text-ed-muted">
									Jeden link · ocena projektu i opinia sprawdzającego
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* ── INFOGRAFIKA „Droga studenta" (zastępuje pasek dowodu; copy kroków = wersja Darka) ── */}
				<section
					aria-labelledby="journey-heading"
					className="mx-auto max-w-[1680px] px-6 py-16 md:px-10 lg:px-16 xl:px-20 2xl:px-28"
				>
					<p className="mb-3 text-[11px] font-bold tracking-[1.65px] text-ed-amber-text uppercase">
						Ścieżka studenta
					</p>
					<div className="mb-4 flex items-center gap-3">
						<span className="inline-flex items-center gap-2 rounded-full bg-ed-amber px-3 py-1 text-[11px] font-bold tracking-[1.65px] text-ed-ink uppercase">
							<span className="ed-pulse h-1.5 w-1.5 rounded-full bg-ed-ink" aria-hidden="true" />
							Dziś
						</span>
					</div>
					<h2
						id="journey-heading"
						className="mb-3 max-w-[860px] font-ed-display text-[clamp(28px,7vw,44px)] leading-[1.1] font-bold text-ed-ink"
					>
						Od pierwszej oceny do pierwszej pracy — krok po kroku
					</h2>
					<p className="mb-12 max-w-[640px] text-[18px] leading-[1.58] text-ed-muted">
						Sześć kroków. Każdy zbliża Cię do zawodu, nie do zaliczenia.
					</p>

					{/* Oś: PIONOWY timeline na mobile (default), POZIOMA na lg. */}
					<ol className="relative grid grid-cols-1 gap-y-8 lg:grid-cols-7 lg:gap-x-3 lg:gap-y-0">
						{/* Linia osi — pionowa (mobile) / pozioma (lg) */}
						<div
							className="absolute top-0 bottom-0 left-[19px] w-px bg-ed-border lg:top-[19px] lg:right-0 lg:left-0 lg:h-px lg:w-auto"
							aria-hidden="true"
						/>

						{JOURNEY_STEPS.map((step) => (
							<li key={step.n} className="fade-up relative flex gap-4 lg:flex-col lg:gap-0">
								{/* Węzeł — kółko z numerem, narastające wypełnienie amber */}
								<div
									className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ed-amber font-ed-display text-[16px] font-bold text-ed-ink"
									style={{ background: nodeFill(step.n) }}
									aria-hidden="true"
								>
									{step.n}
								</div>
								<div className="lg:mt-4 lg:pr-2">
									<h3 className="mb-1 font-ed-display text-[16px] font-bold text-ed-ink">
										<span className="mr-1 text-ed-amber-text">{step.n}.</span>
										{step.title}
									</h3>
									<p className="text-[14px] leading-[1.6] text-ed-muted">{step.body}</p>
								</div>
							</li>
						))}

						{/* Cel końcowy — „Pierwsza praca" (EFEKT) wyróżniony: amber pełny + strzałka */}
						<li className="fade-up relative flex gap-4 lg:flex-col lg:gap-0">
							<div
								className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ed-amber font-ed-display text-[16px] font-bold text-ed-ink"
								aria-hidden="true"
							>
								→
							</div>
							<div className="lg:mt-4 lg:pr-2">
								<span className="mb-1 inline-block rounded-full bg-ed-amber px-2 py-0.5 text-[10px] font-bold tracking-[1.65px] text-ed-ink uppercase">
									Efekt
								</span>
								<h3 className="mt-1 mb-1 font-ed-display text-[16px] font-bold text-ed-ink">
									{JOURNEY_EFFECT.title}
								</h3>
								<p className="text-[14px] leading-[1.6] text-ed-muted">{JOURNEY_EFFECT.body}</p>
							</div>
						</li>
					</ol>

					{/* ── Filozofia pod osią (spec Mili v0.3 §2; copy v1.0 §2) — zdanie zamykające ścieżkę studenta ── */}
					<div
						className="fade-up mx-auto mt-10 flex max-w-[720px] flex-col items-center border-t-2 border-ed-amber pt-6 text-center"
						style={{ animationDelay: "0.2s" }}
					>
						<p className="max-w-[600px] font-ed-body text-[15px] leading-[1.65] text-ed-muted">
							Na każdym kroku SkillBridge pokazuje i podpowiada — ale ocenę projektu zatwierdza
							wykładowca, nie automat zostawiony sam sobie. Ostatnie słowo ma człowiek.
						</p>
						<div className="mt-4 h-[2px] w-10 bg-ed-amber" />
					</div>
				</section>

				{/* ── Co zyskujesz — student (copy v1.0 §4) ── */}
				<section
					aria-labelledby="gains-heading"
					className="mx-auto max-w-[1680px] px-6 py-12 md:px-10 lg:px-16 xl:px-20 2xl:px-28"
				>
					<div className="mb-8 h-[3px] w-full bg-ed-amber" />
					<h2
						id="gains-heading"
						className="mb-2 font-ed-display text-[clamp(28px,7vw,44px)] leading-[1.1] font-bold text-ed-ink"
					>
						Co z tego masz
					</h2>
					<p className="mb-12 max-w-[640px] text-[18px] leading-[1.58] text-ed-muted">
						Trzy rzeczy, których nie da Ci sam indeks.
					</p>
					<div className="steps-grid grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						{STUDENT_VALUE.map((gain) => (
							<div
								key={gain.title}
								className="fade-up ed-lift relative rounded-2xl border border-ed-border bg-ed-surface p-7 pl-9"
							>
								<div className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl bg-ed-amber" />
								<div className="mb-4 text-[32px] leading-none" aria-hidden="true">
									{gain.emoji}
								</div>
								<h3 className="mb-3 font-ed-display text-[18px] leading-[1.25] font-bold text-ed-ink">
									{gain.title}
								</h3>
								<p className="text-[15px] leading-[1.65] text-ed-muted">{gain.body}</p>
							</div>
						))}
					</div>
					<div className="mt-10">
						<Link
							href="/signup"
							className="inline-flex items-center rounded-full bg-ed-amber px-8 py-4 font-ed-body text-[16px] font-bold text-ed-ink no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-amber"
						>
							Zbuduj swój paszport
						</Link>
					</div>
				</section>

				{/* separator amber 3px przed blokiem instytucjonalnym */}
				<div className="mx-auto max-w-[1680px] px-6 md:px-10 lg:px-16 xl:px-20 2xl:px-28">
					<div className="h-[3px] w-full bg-ed-amber" />
				</div>

				{/* ── Dla uczelni (copy v1.0 §5; spec Mili v0.2 §2) ── */}
				<section
					id="dla-uczelni"
					className="bg-ed-cream px-6 py-16 md:px-10 md:py-20 lg:px-16 xl:px-20 2xl:px-28"
				>
					<div className="mx-auto max-w-[1680px]">
						<p className="mb-6 text-[11px] font-bold tracking-[1.65px] text-ed-amber-text uppercase">
							Dla uczelni
						</p>
						<h2 className="mb-6 max-w-[860px] font-ed-display text-[clamp(28px,7vw,44px)] leading-[1.1] font-bold text-ed-ink">
							Jesteście publicznie rozliczani z tego, czy Wasi absolwenci znajdują pracę.
							SkillBridge daje Wam dowód, że program nadąża za rynkiem.
						</h2>
						<div className="mb-8 h-[3px] w-20 bg-ed-amber" />
						<p className="mb-12 max-w-[720px] text-[18px] leading-[1.58] text-ed-ink">
							ELA (Ekonomiczne Losy Absolwentów — rządowy rejestr zatrudnienia i zarobków po
							dyplomie) i PKA (Polska Komisja Akredytacyjna) sprawiają, że dopasowanie programu do
							rynku to obowiązek rozliczany publicznie. SkillBridge pokazuje to dopasowanie, zanim
							zrobi to zewnętrzny ranking.
						</p>

						{/* Grid korzyści (4) */}
						<div className="value-grid mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
							{FACULTY_BENEFITS.map((b) => (
								<div
									key={b.title}
									className="fade-up rounded-sm border border-ed-border border-l-[6px] border-l-ed-amber bg-ed-surface p-6"
								>
									<p className="mb-2 text-[18px] leading-[1.25] font-bold text-ed-ink">{b.title}</p>
									<p className="text-[15px] leading-[1.65] text-ed-muted">{b.body}</p>
								</div>
							))}
						</div>

						{/* Karty DZIŚ / W PEŁNEJ WERSJI — kafel pełnej wersji rozbudowany (spec Mili v0.3 §4) */}
						<div className="mb-12 grid grid-cols-1 items-start gap-6 md:grid-cols-2">
							{/* DZIŚ — amber obwódka 2px (kotwica uwagi) */}
							<div className="relative rounded-sm border-2 border-ed-amber bg-ed-cream p-8 pt-10">
								<BadgeToday />
								<p className="mb-3 text-[18px] font-bold text-ed-ink">
									Panel-raport tylko do odczytu
								</p>
								<p className="text-[15px] leading-[1.65] text-ed-ink">
									Mapa pokrycia kompetencji + luki vs rynek. Zero nakładu dla uczelni — dane z
									programu studiów i ofert pracy.
								</p>
							</div>

							{/* W PEŁNEJ WERSJI — dwa podbloki: Dla uczelni / Dla wykładowcy */}
							<div className="relative flex flex-col gap-6 rounded-sm border border-ed-border bg-ed-surface p-8 pt-10">
								<BadgeFull />

								<div>
									<p className="mb-3 text-[11px] font-bold tracking-[1.65px] text-ed-muted uppercase">
										Dla uczelni
									</p>
									<ul className="space-y-2">
										{[
											"Pomiar retencji przed i po — twardy dowód w liczbach, że program zatrzymuje studentów.",
											"Gotowe dane do akredytacji: pokrycie programu względem rynku — to, z czego PKA i tak Was rozlicza.",
											"Pełna pętla: program → projekt → losy absolwenta.",
											"Paszport firmowany pieczęcią uczelni („poświadczone przez uczelnię”, nie tylko wynik narzędzia).",
											"Wyróżnik w walce o kandydata.",
										].map((point) => (
											<li
												key={point}
												className="flex items-start gap-2 text-[15px] leading-[1.65] text-ed-muted"
											>
												<span className="mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full bg-ed-muted" />
												{point}
											</li>
										))}
									</ul>
								</div>

								<div className="border-t border-ed-border" />

								<div>
									<p className="mb-3 text-[11px] font-bold tracking-[1.65px] text-ed-muted uppercase">
										Dla wykładowcy
									</p>
									<ul className="space-y-2">
										{[
											"Gotowy szkic oceny zamiast pustej kartki — SkillBridge przygotowuje propozycję, Wy zatwierdzacie jednym kliknięciem albo korygujecie.",
											"Mniej ręcznej pracy przy ocenie projektów.",
											"Narzędzie wspiera Wasz osąd, nie zastępuje — ostatnie słowo ma wykładowca, zawsze.",
										].map((point) => (
											<li
												key={point}
												className="flex items-start gap-2 text-[15px] leading-[1.65] text-ed-muted"
											>
												<span className="mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full bg-ed-muted" />
												{point}
											</li>
										))}
									</ul>
								</div>
							</div>
						</div>

						{/* Blok pilotaż + CTA */}
						<div className="flex flex-col items-start justify-between gap-6 rounded-sm bg-ed-ink p-8 md:flex-row md:items-center">
							<div>
								<p className="mb-1 text-[18px] font-bold text-ed-cream">
									Zaczynamy od pilotażu na jednym kierunku
								</p>
								<p className="text-[15px] leading-[1.65] text-ed-border">
									Pomiar przed i po. Jeden kierunek, żadnych zobowiązań poza pierwszym spotkaniem.
								</p>
							</div>
							{/* Kontakt mailowy (spec Mili v0.3 §5 / copy v1.0 §5) */}
							<a
								href="mailto:kontakt@nordsignal.cc"
								className="inline-block shrink-0 rounded-sm bg-ed-amber px-8 py-4 text-[16px] font-bold whitespace-nowrap text-ed-ink no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-cream"
							>
								Umów rozmowę o pilotażu
							</a>
						</div>
					</div>
				</section>

				{/* ── Dla pracodawcy (copy v1.0 §6; spec Mili v0.2 §3) ── */}
				<section
					id="dla-pracodawcow"
					className="bg-ed-surface px-6 py-16 md:px-10 md:py-20 lg:px-16 xl:px-20 2xl:px-28"
				>
					<div className="mx-auto max-w-[1680px]">
						<p className="mb-6 text-[11px] font-bold tracking-[1.65px] text-ed-amber-text uppercase">
							Dla pracodawców
						</p>
						<h2 className="mb-6 max-w-[860px] font-ed-display text-[clamp(28px,7vw,44px)] leading-[1.1] font-bold text-ed-ink">
							Zła rekrutacja kosztuje Was od 30 do 150% rocznej pensji. SkillBridge pokazuje, co
							kandydat naprawdę potrafi — zanim go zatrudnicie.
						</h2>
						<div className="mb-8 h-[3px] w-20 bg-ed-amber" />
						<p className="mb-12 max-w-[720px] text-[18px] leading-[1.58] text-ed-ink">
							Rekrutacja juniora to ~35 dni i ~5 tys. zł (eRecruiter KPI 2025), a płacicie za
							deklaracje z CV, które weryfikujecie dopiero po zatrudnieniu. Junior jest produktywny
							po 6–12 miesiącach, a pomyłka kosztuje od 30 do 150% rocznej pensji. SkillBridge
							przesuwa ten moment prawdy na początek: pracę kandydata oceniacie z paszportu, zanim
							go zatrudnicie.
						</p>

						{/* Grid korzyści (3) */}
						<div className="value-grid mb-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
							{EMPLOYER_BENEFITS.map((b) => (
								<div
									key={b.title}
									className="fade-up rounded-sm border border-ed-border border-l-[6px] border-l-ed-amber bg-ed-cream p-6"
								>
									<p className="mb-2 text-[18px] leading-[1.25] font-bold text-ed-ink">{b.title}</p>
									<p className="text-[15px] leading-[1.65] text-ed-muted">{b.body}</p>
								</div>
							))}
						</div>

						{/* Karty DZIŚ / W PEŁNEJ WERSJI */}
						<div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
							<div className="relative rounded-sm border-2 border-ed-amber bg-ed-cream p-8 pt-10">
								<BadgeToday />
								<p className="mb-3 text-[18px] font-bold text-ed-ink">
									Paszport kandydata jednym linkiem
								</p>
								<p className="text-[15px] leading-[1.65] text-ed-ink">
									Cel kariery, kompetencje, projekty na realnych danych z linkiem do kodu i oceną.
									Bez logowania.
								</p>
							</div>
							<div className="relative rounded-sm border border-ed-border bg-ed-surface p-8 pt-10">
								<BadgeFull />
								<p className="mb-3 text-[18px] font-bold text-ed-muted">
									Konto pracodawcy + wyszukiwanie kandydatów
								</p>
								<p className="text-[15px] leading-[1.65] text-ed-muted">
									Krótsza i tańsza rekrutacja jako funkcja. Potwierdzanie kompetencji przez
									człowieka. Zamknięta pętla: uczelnia → student → rynek.
								</p>
							</div>
						</div>

						{/* CTA pracodawca → przykładowy paszport (spec Mili v0.3 §5; copy v1.0 §6) */}
						<div className="flex flex-col items-start gap-2">
							<a
								href="/passport/demo"
								aria-describedby="passport-demo-hint"
								className="inline-block rounded-sm border-2 border-ed-amber px-8 py-4 text-[16px] font-bold text-ed-amber-text no-underline transition-colors hover:bg-ed-amber hover:text-ed-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-amber"
							>
								Zobacz, jak wygląda paszport kandydata
							</a>
							<p id="passport-demo-hint" className="text-[13px] leading-[1.65] text-ed-muted">
								To paszport przykładowy — pokazujemy na nim, jak wygląda profil kandydata, nie dane
								prawdziwej osoby.
							</p>
							<p className="mt-2 text-[15px] leading-[1.65] text-ed-ink">
								Chcecie porozmawiać o dostępie do paszportów kandydatów?{" "}
								<a
									href="mailto:kontakt@nordsignal.cc"
									className="font-bold text-ed-amber-text no-underline underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-amber"
								>
									kontakt@nordsignal.cc
								</a>
							</p>
						</div>
					</div>
				</section>

				{/* ── CTA KOŃCOWE trójścieżkowe (copy v1.0 §7; spec Mili v0.2 §4) ── */}
				<section
					id="cta-koniec"
					className="bg-ed-ink px-6 py-24 md:px-10 lg:px-16 xl:px-20 2xl:px-28"
				>
					<div className="mx-auto max-w-[1680px]">
						<h2 className="mx-auto mb-6 max-w-[800px] text-center font-ed-display text-[clamp(28px,7vw,44px)] leading-[1.1] font-bold text-ed-cream">
							Rynek pracy nie czeka, aż skończysz studia. SkillBridge pomaga Ci być gotowym
							wcześniej.
						</h2>
						<p className="mx-auto mb-16 max-w-[640px] text-center text-[18px] leading-[1.58] text-ed-border">
							Sprawdź, czego Twój program nie pokrywa, i zamień to w projekty, które pokażesz
							pracodawcy.
						</p>

						<div className="mx-auto grid max-w-[1040px] grid-cols-1 gap-6 md:grid-cols-3">
							{/* 1. STUDENT — amber primary */}
							<div className="flex flex-col items-center gap-4 text-center">
								<a
									href="/signup"
									className="w-full rounded-sm bg-ed-amber px-8 py-4 text-[16px] font-bold text-ed-ink no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-cream"
								>
									Sprawdź, czego Ci brakuje
								</a>
								<p className="text-[13px] leading-[1.65] text-ed-border">
									Zacznij od oceny startowej. Bez zobowiązań.
								</p>
							</div>

							{/* 2. UCZELNIA — outline; kontakt mailowy */}
							<div className="flex flex-col items-center gap-4 text-center">
								<a
									href="mailto:kontakt@nordsignal.cc"
									className="w-full rounded-sm border-2 border-ed-amber px-8 py-4 text-[16px] font-bold text-ed-amber no-underline transition-colors hover:bg-ed-amber hover:text-ed-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-cream"
								>
									Umów rozmowę o pilotażu
								</a>
								<p className="text-[13px] leading-[1.65] text-ed-border">
									Jeden kierunek, pomiar przed i po.
								</p>
							</div>

							{/* 3. PRACODAWCA — outline; link do przykładowego paszportu */}
							<div className="flex flex-col items-center gap-4 text-center">
								<a
									href="/passport/demo"
									className="w-full rounded-sm border-2 border-ed-amber px-8 py-4 text-[16px] font-bold text-ed-amber no-underline transition-colors hover:bg-ed-amber hover:text-ed-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-cream"
								>
									Zobacz paszport kandydata
								</a>
								<p className="text-[13px] leading-[1.65] text-ed-border">
									Sprawdzona praca na realnych danych, nie deklaracja z CV.
								</p>
							</div>
						</div>
					</div>
				</section>
			</main>

			{/* ── Footer (copy v1.0 §8) ── */}
			<footer className="bg-ed-ink">
				<div className="mx-auto flex max-w-[1680px] flex-col gap-3 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-10 lg:px-16 xl:px-20 2xl:px-28">
					<p className="max-w-[640px] text-[15px] leading-[1.6] text-ed-border">
						SkillBridge — tłumaczymy Twój program studiów na zawód, który chcesz wykonywać.
					</p>
					<span className="text-[14px] text-ed-border">
						© 2026 SkillBridge · produkt nordsignal
					</span>
				</div>
			</footer>
		</div>
	);
}
