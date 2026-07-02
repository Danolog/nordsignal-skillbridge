"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectCard } from "./project-card";

interface ProjectCompetency {
	id: string;
	projectId: string;
	competencyName: string;
	role: string;
}

interface Project {
	id: string;
	slug: string;
	title: string;
	description: string;
	level: string;
	estimatedHours: number;
	sourceType: string;
	sourceUrl: string | null;
	competencies: ProjectCompetency[];
	careerGoals: string[];
}

interface Recommendation {
	projectId: string;
	matchScore: number;
	reasoning: string;
}

interface CareerOption {
	careerGoal: string;
	family: string;
}

interface ProjectCatalogProps {
	projects: Project[];
	gapId?: string;
	gapCompetencyName?: string;
	initialLevel?: string;
	initialSourceType?: string;
	initialCareer?: string;
	careerOptions?: CareerOption[];
}

// Pełna skala poziomów — L4/L5 jeszcze bez projektów, ale pokazujemy je (wygaszone),
// żeby student widział, że ścieżka ma dalszą głębię.
const LEVELS = ["L1", "L2", "L3", "L4", "L5"] as const;

// Polska odmiana rzeczownika „projekt" (1 projekt / 2–4 projekty / 5+ projektów).
function pluralizeProjekty(n: number): string {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (n === 1) return "projekt";
	if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "projekty";
	return "projektów";
}

export function ProjectCatalog({
	projects,
	gapId,
	gapCompetencyName,
	initialLevel,
	initialSourceType,
	initialCareer,
	careerOptions = [],
}: ProjectCatalogProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [level, setLevel] = useState(initialLevel ?? "");
	const [sourceType, setSourceType] = useState(initialSourceType ?? "");
	const [career, setCareer] = useState(initialCareer ?? "");
	const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
	const [loadingRecs, setLoadingRecs] = useState(false);

	useEffect(() => {
		if (!gapId) return;
		setLoadingRecs(true);
		fetch(`/api/projects/recommend?gapId=${gapId}`)
			.then((res) => res.json())
			.then((data) => setRecommendations(data.recommendations ?? []))
			.catch(() => setRecommendations([]))
			.finally(() => setLoadingRecs(false));
	}, [gapId]);

	const updateFilters = useCallback(
		(newLevel: string, newSourceType: string, newCareer: string) => {
			const params = new URLSearchParams(searchParams.toString());
			if (newLevel) params.set("level", newLevel);
			else params.delete("level");
			if (newSourceType) params.set("sourceType", newSourceType);
			else params.delete("sourceType");
			if (newCareer) params.set("career", newCareer);
			else params.delete("career");
			if (gapId) params.set("gapId", gapId);
			router.push(`/projects?${params.toString()}`);
		},
		[router, searchParams, gapId],
	);

	// Rodziny do <optgroup> — zachowana kolejność z CAREER_PATHS.
	const careerFamilies = useMemo(() => {
		const map = new Map<string, string[]>();
		for (const opt of careerOptions) {
			const list = map.get(opt.family) ?? [];
			list.push(opt.careerGoal);
			map.set(opt.family, list);
		}
		return [...map.entries()];
	}, [careerOptions]);

	const filtered = useMemo(() => {
		const gapName = gapCompetencyName?.toLowerCase();
		return projects.filter((p) => {
			if (level && p.level !== level) return false;
			if (sourceType && p.sourceType !== sourceType) return false;
			if (career && !p.careerGoals.includes(career)) return false;
			if (gapName) {
				const closesGap = p.competencies.some(
					(c) => c.role === "required" && c.competencyName.toLowerCase() === gapName,
				);
				if (!closesGap) return false;
			}
			return true;
		});
	}, [projects, level, sourceType, career, gapCompetencyName]);

	// Metadane kierunku — liczone TYLKO po kierunku (niezależnie od pod-filtrów
	// poziomu/źródła), żeby rozbicie L1–L5 i suma czasu opisywały cały kierunek.
	const careerSummary = useMemo(() => {
		if (!career) return null;
		const inCareer = projects.filter((p) => p.careerGoals.includes(career));
		if (inCareer.length === 0) return null;
		const byLevel: Record<string, number> = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 };
		let totalHours = 0;
		for (const p of inCareer) {
			if (p.level in byLevel) byLevel[p.level] += 1;
			totalHours += p.estimatedHours;
		}
		return { total: inCareer.length, byLevel, totalHours };
	}, [projects, career]);

	const recommendedProjects = useMemo(() => {
		const recIds = new Set(recommendations.map((r) => r.projectId));
		return projects.filter((p) => recIds.has(p.id));
	}, [projects, recommendations]);

	return (
		<div className="proj-catalog">
			{gapId && (
				<div className="proj-rec-section">
					<h2 className="proj-rec-title">Rekomendowane dla Twojej luki</h2>
					{loadingRecs ? (
						<div className="proj-rec-loading">
							<Loader2 size={20} className="animate-spin" />
							Szukam najlepszych projektów...
						</div>
					) : recommendedProjects.length > 0 ? (
						<div className="proj-grid">
							{recommendedProjects.map((p) => (
								<ProjectCard
									key={p.id}
									id={p.id}
									title={p.title}
									description={p.description}
									level={p.level}
									estimatedHours={p.estimatedHours}
									sourceType={p.sourceType}
									competencyCount={p.competencies.length}
								/>
							))}
						</div>
					) : (
						<p className="proj-rec-empty">Brak rekomendacji dla tej luki.</p>
					)}
				</div>
			)}

			<div className="proj-filters">
				{careerFamilies.length > 0 && (
					<select
						value={career}
						onChange={(e) => {
							setCareer(e.target.value);
							updateFilters(level, sourceType, e.target.value);
						}}
						className="proj-filter-select"
						aria-label="Filtruj po kierunku kariery"
					>
						<option value="">Wszystkie kierunki</option>
						{careerFamilies.map(([family, goals]) => (
							<optgroup key={family} label={family}>
								{goals.map((goal) => (
									<option key={goal} value={goal}>
										{goal}
									</option>
								))}
							</optgroup>
						))}
					</select>
				)}
				<select
					value={level}
					onChange={(e) => {
						setLevel(e.target.value);
						updateFilters(e.target.value, sourceType, career);
					}}
					className="proj-filter-select"
				>
					<option value="">Wszystkie poziomy</option>
					<option value="L1">L1 — Podstawowy</option>
					<option value="L2">L2 — Średni</option>
					<option value="L3">L3 — Zaawansowany</option>
				</select>
				<select
					value={sourceType}
					onChange={(e) => {
						setSourceType(e.target.value);
						updateFilters(level, e.target.value, career);
					}}
					className="proj-filter-select"
				>
					<option value="">Wszystkie źródła</option>
					<option value="open_data">Open Data</option>
					<option value="oss">Open Source</option>
				</select>
			</div>

			{careerSummary && (
				<section className="proj-summary" aria-label={`Podsumowanie kierunku ${career}`}>
					<div className="proj-summary-head">
						<h2 className="proj-summary-career">{career}</h2>
						<div className="proj-summary-totals">
							<span className="proj-summary-count">
								{careerSummary.total} {pluralizeProjekty(careerSummary.total)}
							</span>
							<span className="proj-summary-sep">·</span>
							<span className="proj-summary-hours">≈ {careerSummary.totalHours} h łącznie</span>
						</div>
					</div>
					<div className="proj-summary-levels">
						{LEVELS.map((lvl) => (
							<span
								key={lvl}
								className={`proj-summary-level${careerSummary.byLevel[lvl] === 0 ? " is-empty" : ""}`}
								title={`Poziom ${lvl}: ${careerSummary.byLevel[lvl]} ${pluralizeProjekty(careerSummary.byLevel[lvl])}`}
							>
								<span className="proj-summary-level-code">{lvl}</span>
								<span className="proj-summary-level-num">{careerSummary.byLevel[lvl]}</span>
							</span>
						))}
					</div>
				</section>
			)}

			{gapCompetencyName && (
				<div className="proj-gap-banner">
					<span>
						Pokazuję projekty zamykające lukę: <b>{gapCompetencyName}</b>
					</span>
					<a href="/projects" className="proj-gap-banner-reset">
						Pokaż wszystkie projekty
					</a>
				</div>
			)}

			<div className="proj-grid">
				{filtered.map((p) => (
					<ProjectCard
						key={p.id}
						id={p.id}
						title={p.title}
						description={p.description}
						level={p.level}
						estimatedHours={p.estimatedHours}
						sourceType={p.sourceType}
						competencyCount={p.competencies.length}
					/>
				))}
			</div>

			{filtered.length === 0 &&
				(gapCompetencyName ? (
					<div className="proj-empty">
						<p>Brak projektów zamykających lukę „{gapCompetencyName}".</p>
						<a href="/projects" className="proj-empty-btn">
							Pokaż wszystkie projekty
						</a>
					</div>
				) : career ? (
					<div className="proj-empty">
						<p>Brak projektów dla kierunku „{career}".</p>
						<button
							type="button"
							className="proj-empty-btn"
							onClick={() => {
								setCareer("");
								updateFilters(level, sourceType, "");
							}}
						>
							Pokaż wszystkie kierunki
						</button>
					</div>
				) : (
					<p className="proj-empty">Brak projektów pasujących do filtrów.</p>
				))}
		</div>
	);
}
