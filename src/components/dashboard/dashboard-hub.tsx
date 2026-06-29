"use client";

import {
	ArrowRight,
	Award,
	CheckCircle,
	FolderKanban,
	Map as MapIcon,
	Rocket,
	Sprout,
	Target,
	TrendingUp,
	TriangleAlert,
	Zap,
} from "lucide-react";
import Link from "next/link";

interface DashboardHubProps {
	user: { name: string };
	student: {
		university: string;
		fieldOfStudy: string;
		semester: number;
		careerGoal: string;
	};
	competencyCount: number;
	gapCount: number;
	courseCount: number;
	marketCoverage: number;
}

const tiles = [
	{
		href: "/skill-map",
		title: "Mapa kompetencji",
		icon: MapIcon,
		colorClass: "db-tile-icon-amber",
		desc: "Wizualna mapa Twoich kompetencji",
		getStat: (p: DashboardHubProps) => `${p.competencyCount} masz • ${p.gapCount} brakuje`,
	},
	{
		href: "/gap-analysis",
		title: "Analiza luk",
		icon: TriangleAlert,
		colorClass: "db-tile-icon-amber",
		desc: "Luki między Tobą a rynkiem pracy",
		getStat: (p: DashboardHubProps) => `${p.gapCount} luk do zamknięcia`,
	},
	{
		href: "/projects",
		title: "Projekty",
		icon: FolderKanban,
		colorClass: "db-tile-icon-amber",
		desc: "Realne projekty dopasowane do Twoich luk",
		getStat: (p: DashboardHubProps) => `${p.courseCount} ukończone`,
	},
	{
		href: "/passport",
		title: "Paszport",
		icon: Award,
		colorClass: "db-tile-icon-amber",
		desc: "Twój cyfrowy paszport kompetencji",
		getStat: () => "Udostępnij",
	},
];

const statItems = [
	{
		key: "comp",
		icon: CheckCircle,
		getValue: (p: DashboardHubProps) => String(p.competencyCount),
		label: "Posiadane",
		iconClass: "db-stat-icon-amber",
	},
	{
		key: "gaps",
		icon: Target,
		getValue: (p: DashboardHubProps) => String(p.gapCount),
		label: "Luk",
		iconClass: "db-stat-icon-amber",
	},
	{
		key: "courses",
		icon: Zap,
		getValue: (p: DashboardHubProps) => String(p.courseCount),
		label: "Kursów",
		iconClass: "db-stat-icon-amber",
	},
];

function getCoverageLevel(coverage: number) {
	if (coverage >= 70) return { label: "Zaawansowany", icon: Rocket };
	if (coverage >= 40) return { label: "W drodze", icon: TrendingUp };
	return { label: "Początkujący", icon: Sprout };
}

function getMotivation(coverage: number, gapCount: number) {
	if (coverage >= 70) return "Jesteś blisko! Jeszcze kilka kroków i Twój paszport będzie gotowy.";
	if (gapCount > 10)
		return "Masz sporo do nadrobienia, ale każdy krok się liczy. Zacznij od krytycznych luk!";
	if (coverage >= 40)
		return "Dobra robota! Jesteś na dobrej drodze. Zamknij kolejne luki, żeby się wyróżnić.";
	return "Twoja przygoda się zaczyna! Sprawdź analizę luk i wygeneruj pierwszy mikro-kurs.";
}

export function DashboardHub(props: DashboardHubProps) {
	const { user, student, gapCount, marketCoverage } = props;

	const initials = user.name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	const level = getCoverageLevel(marketCoverage);
	const LevelIcon = level.icon;
	const motivation = getMotivation(marketCoverage, gapCount);

	return (
		<>
			{/* Welcome card */}
			<div className="db-welcome-card">
				<div className="db-welcome-top">
					<div>
						<h1 className="db-welcome-greeting">Cześć, {user.name.split(" ")[0]}!</h1>
						<div className="db-welcome-subtitle">
							<span>{student.university}</span>
							<span className="db-dot" />
							<span>
								{student.fieldOfStudy}, sem. {student.semester}
							</span>
							<span className="db-dot" />
							<span>Cel: {student.careerGoal}</span>
						</div>
					</div>
					<div className="db-welcome-avatar">{initials}</div>
				</div>

				<div className="db-progress-section">
					<div className="db-progress-header">
						<span className="db-progress-label">Twój Paszport Kompetencji</span>
						<span className="db-progress-value">{marketCoverage}%</span>
					</div>
					<div className="db-progress-bar">
						<div className="db-progress-fill" style={{ width: `${marketCoverage}%` }} />
					</div>
				</div>
			</div>

			{/* Stats row */}
			<div className="db-stats-grid">
				{statItems.map((stat) => {
					const Icon = stat.icon;
					return (
						<div key={stat.key} className="db-stat-card">
							<div className={`db-stat-icon ${stat.iconClass}`}>
								<Icon size={20} />
							</div>
							<div>
								<div className="db-stat-value">{stat.getValue(props)}</div>
								<div className="db-stat-label">{stat.label}</div>
							</div>
						</div>
					);
				})}
				<div className="db-stat-card">
					<div className="db-stat-icon db-stat-icon-amber">
						<LevelIcon size={20} />
					</div>
					<div>
						<div className="db-stat-value-gradient">{level.label}</div>
						<div className="db-stat-label">Twój poziom</div>
					</div>
				</div>
			</div>

			{/* Nav tiles */}
			<h2 className="db-section-label">Twoje narzędzia</h2>

			<div className="db-tiles-grid">
				{tiles.map((tile) => (
					<Link key={tile.href} href={tile.href} className="db-tile">
						<div className={`db-tile-icon ${tile.colorClass}`}>
							<tile.icon size={24} />
						</div>
						<div className="db-tile-content">
							<div className="db-tile-title">{tile.title}</div>
							<div className="db-tile-desc">{tile.desc}</div>
							<div className="db-tile-stat">{tile.getStat(props)}</div>
						</div>
						<div className="db-tile-arrow">
							<ArrowRight size={16} />
						</div>
					</Link>
				))}
			</div>

			{/* Motivation card — poświaty usunięte (Partia 5, C5: „Spokojny ekspert", zero glow) */}
			<div className="db-motivation">
				<div className="db-motivation-content">
					<div className="db-motivation-icon">
						<Rocket size={24} />
					</div>
					<div>
						<div className="db-motivation-title">Twoja droga do {student.careerGoal}</div>
						<div className="db-motivation-text">{motivation}</div>
					</div>
				</div>

				<Link href="/gap-analysis" className="db-motivation-btn">
					Następny krok
					<ArrowRight size={14} />
				</Link>
			</div>
		</>
	);
}
