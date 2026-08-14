"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { CURRICULUM_INTRO, CURRICULUM_INTRO_WITH_PLACEMENT } from "@/components/curriculum/labels";
import { MarketGapNotifications } from "@/components/dashboard/market-gap-notifications";
import { RhythmCard, type RhythmCardState } from "@/components/rhythm/rhythm-card";
import { Button } from "@/components/ui/button";
import type { MarketNotificationsState } from "@/lib/market-notifications";

interface Competency {
	id: string;
	name: string;
	status: string;
	marketPercentage: number | null;
	selfAssessment: number | null;
}

interface Gap {
	competencyName: string;
	priority: string;
	marketPercentage: number;
}

interface TopGap {
	id: string;
	competencyName: string;
	priority: string;
	marketPercentage: number;
	whyImportant: string | null;
}

interface DashboardHubProps {
	user: { name: string };
	student: {
		university: string;
		fieldOfStudy: string;
		semester: number;
		careerGoal: string;
	};
	competencies: Competency[];
	gaps: Gap[];
	gapCount: number;
	criticalGapCount: number;
	inProgressCount: number;
	marketCoverage: number;
	topGap: TopGap | null;
	/** AG.6: stan powiadomień „nowa luka" (flaga off → komponent nic nie renderuje). */
	marketNotifications: MarketNotificationsState;
	/** 1.18: stan karty rytmu (null = flaga off — karta nie istnieje). */
	rhythmCard: RhythmCardState | null;
	/**
	 * 1E.4 R6: kolejka powtórek „na dziś" (FSRS). `null` = flaga spacedRepetition
	 * OFF → sekcja NIE ISTNIEJE (deploy ≠ release). `capped` (licznik ≥ sufitu 200)
	 * → kafelek pokazuje „200+" zamiast dokładnej liczby.
	 */
	reviewDue: { count: number; capped: boolean } | null;
	/** 1E.6a: flaga curriculumPath — off = kafelek ścieżki nauki nie istnieje. */
	curriculumEnabled: boolean;
	/**
	 * N1 (dług D7, druga kopia): flaga placementDiagnostic — wybiera brzmienie
	 * zdania o kolejności modułów. Prop, nie odczyt flagi w komponencie: hub jest
	 * klientowy, `isFeatureEnabled` czyta zmienne serwera (jak `curriculumEnabled`).
	 */
	placementEnabled: boolean;
}

const GOAL_COVERAGE = 80;

/** Wspólny model karty kanbana (kompetencja albo luka). */
interface KanbanItem {
	key: string;
	name: string;
	demand: number;
	isGap: boolean;
	dots: number;
	level: string;
}

// Słowo poziomu i liczba kropek z samooceny (2→„uczę się"/1, 3→„obsługuję"/2, 4→„biegle"/3);
// legacy bez samooceny → po statusie.
function competencyLevelWord(sa: number | null, status: string): string {
	if (sa === 4) return "obsługuję biegle";
	if (sa === 3) return "obsługuję";
	if (sa === 2) return "uczę się";
	return status === "acquired" ? "opanowane" : "uczę się";
}
function competencyDots(sa: number | null, status: string): number {
	if (sa != null) return Math.min(3, Math.max(1, sa - 1));
	return status === "acquired" ? 3 : 1;
}
// Zatwierdzone mapowanie kolumn (market-catalog.ts): samoocena 4 → Opanowane, 2/3 → W trakcie;
// legacy bez samooceny → po statusie. Luki (missing) idą osobno, z tabeli gaps.
function isMastered(c: Competency): boolean {
	if (c.selfAssessment === 4) return true;
	if (c.selfAssessment === 2 || c.selfAssessment === 3) return false;
	return c.status === "acquired";
}

/** Karta na kanbanie — kompetencja albo luka. */
function KanbanCard({ item }: { item: KanbanItem }) {
	const barWidth = Math.min(100, Math.max(6, item.demand * 5));
	return (
		<div className="db-kcard">
			<div className="db-kcard-top">
				<span className="db-kcard-name">{item.name}</span>
				{!item.isGap && <span className="db-tag-auto">auto</span>}
			</div>
			<div className="db-kcard-meta">
				<span className="db-dots">
					{[0, 1, 2].map((i) => (
						<i key={i} className={i < item.dots ? "on" : ""} />
					))}
				</span>
				<span className="db-lvl-word">{item.level}</span>
			</div>
			<div className="db-demand">
				<span>{item.demand.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%</span>
				<div className={`db-minibar ${item.isGap ? "gap" : "have"}`}>
					<i style={{ width: `${barWidth}%` }} />
				</div>
				{item.isGap && <span className="db-demand-gap">luka</span>}
			</div>
		</div>
	);
}

/** Kolumna kanbana. */
function KanbanColumn({
	title,
	sub,
	dotClass,
	items,
	emptyText,
}: {
	title: string;
	sub: string;
	dotClass: string;
	items: KanbanItem[];
	emptyText: string;
}) {
	return (
		<section className="db-kcol" aria-label={title}>
			<div className="db-ktitle">
				<span className={`db-cdot ${dotClass}`} /> {title} ({items.length})
			</div>
			<div className="db-ksub">{sub}</div>
			{items.length === 0 ? (
				<div className="db-empty-col">{emptyText}</div>
			) : (
				items.map((item) => <KanbanCard key={item.key} item={item} />)
			)}
		</section>
	);
}

export function DashboardHub(props: DashboardHubProps) {
	const {
		user,
		student,
		competencies,
		gaps,
		criticalGapCount,
		inProgressCount,
		marketCoverage,
		topGap,
		marketNotifications,
		rhythmCard,
		reviewDue,
		curriculumEnabled,
		placementEnabled,
	} = props;

	const firstName = user.name.split(" ")[0];

	const compToItem = (c: Competency): KanbanItem => ({
		key: c.id,
		name: c.name,
		demand: c.marketPercentage ?? 0,
		isGap: false,
		dots: competencyDots(c.selfAssessment, c.status),
		level: competencyLevelWord(c.selfAssessment, c.status),
	});
	// „Do zrobienia" = luki rynku (tabela gaps); W trakcie / Opanowane = kompetencje.
	const todo: KanbanItem[] = gaps.map((g) => ({
		key: `gap-${g.competencyName}`,
		name: g.competencyName,
		demand: g.marketPercentage,
		isGap: true,
		dots: 0,
		level: "nie znam",
	}));
	const done: KanbanItem[] = competencies.filter(isMastered).map(compToItem);
	const wip: KanbanItem[] = competencies.filter((c) => !isMastered(c)).map(compToItem);
	const kanbanEmpty = competencies.length === 0 && gaps.length === 0;

	return (
		<div className="db-hub">
			{/* Nagłówek + cel */}
			<header className="db-head">
				<div>
					<div className="db-eyebrow">Pulpit</div>
					<h1 className="db-h1">Cześć, {firstName}.</h1>
					<p className="db-lede">
						Cel: <b>{student.careerGoal}</b> — {student.university}, {student.fieldOfStudy}, sem.{" "}
						{student.semester}.
					</p>
					<Link href="/onboarding?mode=change" className="db-change-goal">
						<RefreshCw size={13} />
						Zmień kierunek
					</Link>
				</div>
				<div className="db-goal-pill">🎯 Cel kariery: {student.careerGoal}</div>
			</header>

			{/* AG.6: zgoda RODO / powiadomienia „nowa luka" (flaga off → null) */}
			<MarketGapNotifications state={marketNotifications} />

			{/* 1.18: rytm nauki — streak + alert zastoju (flaga off → null) */}
			{rhythmCard && <RhythmCard state={rhythmCard} />}

			{/* 1E.4 R6: powtórki „na dziś" (flaga spacedRepetition off → null → sekcja
			    nie istnieje). Jasna db-card + CTA jako Button default (NIE amber,
			    NIE ciemna db-nextstep). N=0 → tylko komunikat, bez CTA. Ścieżka
			    /powtorki (NIE /review — to zajmuje kolejka recenzji człowieka B8;
			    kolizja zgłoszona Mili, patrz raport R6). */}
			{reviewDue && (
				<div className="db-section">
					<div className="db-eyebrow">Codzienny rytm</div>
					<div className="db-section-note">
						Utrwalanie działa najlepiej małymi porcjami — koncepty wracają, zanim je zapomnisz.
					</div>
					<div className="db-card">
						{reviewDue.count === 0 ? (
							<>
								<div className="db-cov-title">Powtórki na dziś</div>
								<p className="db-section-note">Nic do powtórzenia. Wróć jutro.</p>
							</>
						) : (
							<>
								<div className="db-cov-title">
									Powtórki na dziś: {reviewDue.capped ? "200+" : reviewDue.count}
								</div>
								<p className="db-section-note">
									Kilka minut teraz — odświeżysz koncepty, które zaczynają słabnąć w pamięci.
								</p>
								<Button asChild>
									<Link href="/powtorki">Zacznij powtórki</Link>
								</Button>
							</>
						)}
					</div>
				</div>
			)}

			{/* Pokrycie rynku */}
			<div className="db-card db-cov">
				<div className="db-cov-row">
					<div className="db-cov-title">Pokrycie kompetencji rynkowych</div>
					<div className="db-cov-pct">{marketCoverage}%</div>
				</div>
				<div className="db-cov-track">
					<div className="db-cov-fill" style={{ width: `${marketCoverage}%` }} />
					<div className="db-cov-now" style={{ left: `${marketCoverage}%` }} />
				</div>
				<div className="db-cov-legend">
					<span>
						<b>{marketCoverage}%</b> Teraz
					</span>
					<span>
						<b>{GOAL_COVERAGE}%</b> Cel gotowości{" "}
						<span className="db-cov-note">(pokrycia rynku — nie gwarancja pracy)</span>
					</span>
				</div>
			</div>

			{/* 3 kafle liczb */}
			<div className="db-stats2">
				<div className="db-card db-stat2">
					<div className="db-stat2-n">{competencies.length}</div>
					<div className="db-stat2-t">kompetencji na Twojej mapie</div>
				</div>
				<div className="db-card db-stat2">
					<div className="db-stat2-n danger">{criticalGapCount}</div>
					<div className="db-stat2-t">luk krytycznych</div>
				</div>
				<div className="db-card db-stat2">
					<div className="db-stat2-n">{inProgressCount}</div>
					<div className="db-stat2-t">
						{inProgressCount === 1 ? "projekt w toku" : "projektów w toku"}
					</div>
				</div>
			</div>

			{/* Następny krok */}
			{topGap && (
				<div className="db-section">
					<div className="db-eyebrow">Następny krok</div>
					<div className="db-section-note">Sygnał z rynku → jedno konkretne zadanie teraz.</div>
					<div className="db-card db-nextstep">
						<div className="db-nextstep-top">
							<div>
								<h3 className="db-nextstep-h3">{topGap.competencyName} — Twoja największa luka</h3>
								{topGap.whyImportant && <p className="db-nextstep-why">{topGap.whyImportant}</p>}
							</div>
							<div className="db-badge-soft">
								{topGap.priority === "critical" ? "Luka krytyczna" : "Luka ważna"} ·{" "}
								{topGap.marketPercentage}% ofert
							</div>
						</div>
						<div className="db-nextstep-cta">
							<Link href={`/projects?gapId=${topGap.id}`} className="db-anchor-dark">
								Otwórz projekty zamykające tę lukę →
							</Link>
						</div>
						<p className="db-nextstep-foot">
							Każdy ukończony projekt = wpis w Twoim paszporcie kompetencji. Zamykasz lukę i
							dokładasz dowód do CV.
						</p>
					</div>
				</div>
			)}

			{/* 1E.6a: wejście na drabinę curriculum (flaga off → kafelek nie istnieje).
			    N1 (dług D7, druga kopia): zdanie o kolejności modułów NIE jest tu
			    wpisane literałem. Nagłówek „Ucz się po kolei, bez skrótów" i podpis
			    sekcji („kolejny otwiera się po zaliczeniu poprzedniego") mówiły to samo
			    co `CURRICULUM_INTRO` na `/curriculum` — trzy kopie jednej reguły, z czego
			    dwie poza zasięgiem strażnika D7 i nietknięte przy jego spłacie. Kafelek
			    WOŁA teraz nośnik (CLAUDE.md v1.17), więc oba wejścia na drabinę mówią
			    w każdej konfiguracji flagi dokładnie to samo. */}
			{curriculumEnabled && (
				<div className="db-section">
					<div className="db-eyebrow">Ścieżka nauki</div>
					<div className="db-section-note">
						{placementEnabled ? CURRICULUM_INTRO_WITH_PLACEMENT : CURRICULUM_INTRO}
					</div>
					<div className="db-card db-nextstep">
						<div className="db-nextstep-top">
							<div>
								<p className="db-nextstep-why">
									Teoria, ćwiczenia i laby ułożone w drabinę. Zaliczasz pozycję dopiero, gdy
									odpowiesz poprawnie na wszystkie pytania — bez samodeklaracji.
								</p>
							</div>
						</div>
						<div className="db-nextstep-cta">
							<Link href="/curriculum" className="db-anchor-dark">
								Otwórz ścieżkę nauki →
							</Link>
						</div>
					</div>
				</div>
			)}

			{/* Kanban kompetencji */}
			<div className="db-section">
				<div className="db-eyebrow">Twoje kompetencje</div>
				<div className="db-section-note">
					Sortowane wg statusu. Poziom „auto" = wstępna ocena maszyny, którą potwierdza człowiek.
				</div>
				<div className="db-human-banner">
					<span className="db-human-dot">✓</span>
					<span>
						<b>Ostatnie słowo ma człowiek.</b> „auto" to wstępna ocena — AI podpowiada, potwierdza
						wykładowca.
					</span>
				</div>
				{kanbanEmpty ? (
					<div className="db-card db-empty-hub">
						Twoja mapa kompetencji jest jeszcze pusta. Uzupełnij profil, a pojawią się tu Twoje
						kompetencje i luki.
					</div>
				) : (
					<>
						<div className="db-kanban">
							<KanbanColumn
								title="Do zrobienia"
								sub="luki rynku"
								dotClass="todo"
								items={todo}
								emptyText="Brak luk w tej kolumnie."
							/>
							<KanbanColumn
								title="W trakcie"
								sub="już się uczysz"
								dotClass="wip"
								items={wip}
								emptyText="Nic w trakcie — zacznij projekt."
							/>
							<KanbanColumn
								title="Opanowane"
								sub="gotowe do CV"
								dotClass="done"
								items={done}
								emptyText="Jeszcze nic opanowanego."
							/>
						</div>
						<div className="db-legend-inline">
							<span>
								<span className="db-cdot done" /> opanowane
							</span>
							<span>
								<span className="db-cdot wip" /> w trakcie
							</span>
							<span>
								<span className="db-cdot todo" /> do zrobienia / luka
							</span>
						</div>
					</>
				)}
			</div>

			{/* Szybkie wejścia */}
			<div className="db-quicklinks">
				{curriculumEnabled && (
					<Link href="/curriculum" className="db-quicklink">
						Ścieżka nauki <ArrowRight size={15} />
					</Link>
				)}
				<Link href="/gap-analysis" className="db-quicklink">
					Analiza luk <ArrowRight size={15} />
				</Link>
				<Link href="/projects" className="db-quicklink">
					Projekty <ArrowRight size={15} />
				</Link>
				<Link href="/passport" className="db-quicklink">
					Paszport <ArrowRight size={15} />
				</Link>
			</div>
		</div>
	);
}
