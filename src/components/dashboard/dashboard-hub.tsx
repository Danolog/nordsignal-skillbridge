"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Competency {
	id: string;
	name: string;
	status: string;
	marketPercentage: number | null;
	selfAssessment: number | null;
}

interface TopGap {
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
	gapCount: number;
	criticalGapCount: number;
	inProgressCount: number;
	marketCoverage: number;
	topGap: TopGap | null;
}

const GOAL_COVERAGE = 80;

function levelWord(status: string, sa: number | null): string {
	if (status === "missing") return "nie znam";
	if (status === "in_progress") return "uczę się";
	if (sa != null && sa >= 3) return "obsługuję biegle";
	return "opanowane";
}

function filledDots(status: string, sa: number | null): number {
	if (status === "missing") return 0;
	if (sa == null) return status === "acquired" ? 3 : 1;
	return Math.min(3, Math.max(1, sa));
}

/** Karta kompetencji na kanbanie. */
function KanbanCard({ c }: { c: Competency }) {
	const dots = filledDots(c.status, c.selfAssessment);
	const isGap = c.status === "missing";
	const demand = c.marketPercentage ?? 0;
	const barWidth = Math.min(100, Math.max(6, demand * 5));
	return (
		<div className="db-kcard">
			<div className="db-kcard-top">
				<span className="db-kcard-name">{c.name}</span>
				<span className="db-tag-auto">auto</span>
			</div>
			<div className="db-kcard-meta">
				<span className="db-dots">
					{[0, 1, 2].map((i) => (
						<i key={i} className={i < dots ? "on" : ""} />
					))}
				</span>
				<span className="db-lvl-word">{levelWord(c.status, c.selfAssessment)}</span>
			</div>
			<div className="db-demand">
				<span>{demand.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%</span>
				<div className={`db-minibar ${isGap ? "gap" : "have"}`}>
					<i style={{ width: `${barWidth}%` }} />
				</div>
				{isGap && <span className="db-demand-gap">luka</span>}
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
	items: Competency[];
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
				items.map((c) => <KanbanCard key={c.id} c={c} />)
			)}
		</section>
	);
}

export function DashboardHub(props: DashboardHubProps) {
	const { user, student, competencies, criticalGapCount, inProgressCount, marketCoverage, topGap } =
		props;

	const firstName = user.name.split(" ")[0];
	const todo = competencies.filter((c) => c.status === "missing");
	const wip = competencies.filter((c) => c.status === "in_progress");
	const done = competencies.filter((c) => c.status === "acquired");

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
							<Link
								href={`/projects?career=${encodeURIComponent(student.careerGoal)}`}
								className="db-anchor-dark"
							>
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
				{competencies.length === 0 ? (
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
