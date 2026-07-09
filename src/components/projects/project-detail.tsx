"use client";

import { ArrowLeft, Clock, Database, ExternalLink, Github, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type { LearningResource } from "@/components/skillbridge/b3/SourceLinkRow";
import { TheorySection } from "@/components/skillbridge/b3/TheorySection";
import { ReflectionCallout } from "@/components/skillbridge/b5/ReflectionCallout";
import type { ProjectBrief } from "@/lib/ai/generate-brief";
import type { ProjectSourceLink } from "./project-source-links";
import { ProjectSourceLinks } from "./project-source-links";
import { SubmissionForm } from "./submission-form";
import { TutorPanel } from "./tutor-panel";

interface ProjectCompetency {
	id: string;
	competencyName: string;
	role: string;
}

interface Submission {
	id: string;
	status: string;
	score: number | null;
	repoUrl: string | null;
	aiReviewJson: unknown;
}

interface ProjectDetailProps {
	project: {
		id: string;
		title: string;
		description: string;
		level: string;
		estimatedHours: number;
		sourceType: string;
		sourceUrl: string | null;
		competencies: ProjectCompetency[];
	};
	submission: Submission | null;
	/** B5 — istniejąca refleksja (null = nieistniejąca; dane = edycja/upsert) */
	existingReflection: {
		answerSurprised: string | null;
		answerFrustrated: string | null;
		answerLearned: string | null;
	} | null;
	/** B3 — teoria w markdown; null = stan S4 empty_theory (blok pominięty). "" ≠ null. */
	theoryMd: string | null;
	/** B3 — źródła wiedzy, posortowane po position (backend). [] = stan S5 empty_sources. */
	learningResources: LearningResource[];
	/** #7 — linki źródła danych (2–3), posortowane po position (backend). [] = brak rekordów
	 *  → widok degraduje do project.sourceUrl (kompatybilność wsteczna, projekty bez backfillu). */
	sourceLinks: ProjectSourceLink[];
	/** C11/1.14 — flaga socraticTutor czytana w server component (page.tsx);
	 *  false = panel tutora nie istnieje w drzewie (deploy ≠ release). */
	tutorEnabled: boolean;
}

export function ProjectDetail({
	project,
	submission,
	existingReflection,
	theoryMd,
	learningResources,
	sourceLinks,
	tutorEnabled,
}: ProjectDetailProps) {
	const [brief, setBrief] = useState<ProjectBrief | null>(
		submission?.aiReviewJson
			? (((submission.aiReviewJson as Record<string, unknown>).brief as ProjectBrief | null) ??
					null)
			: null,
	);
	const [loadingBrief, setLoadingBrief] = useState(false);
	const [showSubmitForm, setShowSubmitForm] = useState(false);

	const handleGenerateBrief = async () => {
		setLoadingBrief(true);
		try {
			const res = await fetch(`/api/projects/${project.id}/brief`, { method: "POST" });
			if (!res.ok) throw new Error("Błąd generowania briefu");
			const data = await res.json();
			setBrief(data.brief);
		} catch {
			toast.error("Nie udało się wygenerować briefu. Spróbuj ponownie.");
		} finally {
			setLoadingBrief(false);
		}
	};

	return (
		<div className="proj-detail">
			<div className="proj-detail-header">
				<Link href="/projects" className="proj-source-link proj-detail-back">
					<ArrowLeft size={14} />
					Wróć do projektów
				</Link>
				<div className="proj-detail-badges">
					<span className={`proj-level-badge proj-level-${project.level.toLowerCase()}`}>
						{project.level}
					</span>
					<span className="proj-source-badge">
						{project.sourceType === "oss" ? <Github size={14} /> : <Database size={14} />}
						{project.sourceType === "oss" ? "OSS" : "Open Data"}
					</span>
					<span className="proj-card-meta">
						<Clock size={14} />
						{project.estimatedHours}h
					</span>
				</div>
				<h1 className="proj-detail-title">{project.title}</h1>
				<p className="proj-detail-desc">{project.description}</p>
				{/* #7 — odporność linków: lista 2–3 źródeł (padnie jeden, kończysz z drugiego).
				    Brak rekordów w tabeli → degradacja do pojedynczego project.sourceUrl
				    (kompatybilność wsteczna z projektami sprzed backfillu migracji 0018). */}
				{sourceLinks.length > 0 ? (
					<ProjectSourceLinks links={sourceLinks} />
				) : (
					project.sourceUrl && (
						<a
							href={project.sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="proj-source-link"
						>
							<ExternalLink size={14} />
							Źródło danych
						</a>
					)
				)}
			</div>

			<div className="proj-detail-section">
				<h2 className="proj-detail-section-title">Wymagane kompetencje</h2>
				<div className="proj-comp-list">
					{project.competencies.map((c) => (
						<span key={c.id} className={`proj-comp-tag proj-comp-${c.role}`}>
							{c.competencyName}
							{c.role === "acquired" && " ✓"}
						</span>
					))}
				</div>
			</div>

			{/* B3 — Wiedza teoretyczna + Źródła wiedzy. Pominięcia stanów S4/S5/S6
			    obsługuje TheorySection (spec §2.4). Renderuje się przed wykonaniem/briefem. */}
			<TheorySection theoryMd={theoryMd} learningResources={learningResources} />

			{!brief && (
				<button
					type="button"
					onClick={handleGenerateBrief}
					disabled={loadingBrief}
					className="proj-brief-btn"
				>
					{loadingBrief ? (
						<>
							<Loader2 size={16} className="animate-spin" />
							Generuję spersonalizowany brief...
						</>
					) : (
						"Wygeneruj spersonalizowany brief"
					)}
				</button>
			)}

			{brief && (
				<div className="proj-brief">
					<h2 className="proj-detail-section-title">Spersonalizowany brief</h2>

					<div className="proj-brief-section">
						<h3>Cel</h3>
						<p>{brief.objective}</p>
					</div>

					<div className="proj-brief-section">
						<h3>Dane wejściowe</h3>
						<p>{brief.inputData}</p>
					</div>

					<div className="proj-brief-section">
						<h3>Sugerowane kroki</h3>
						<ol className="proj-brief-steps">
							{brief.suggestedSteps.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ol>
					</div>

					{brief.learningSteps.length > 0 && (
						<div className="proj-brief-section">
							<h3>Kroki nauki (dla brakujących kompetencji)</h3>
							{brief.learningSteps.map((ls) => (
								<div key={ls.title} className="proj-learning-step">
									<h4>{ls.title}</h4>
									<p>{ls.content}</p>
									{ls.exercise && (
										<p className="proj-exercise">
											<strong>Ćwiczenie:</strong> {ls.exercise}
										</p>
									)}
								</div>
							))}
						</div>
					)}

					<div className="proj-brief-section">
						<h3>Definicja sukcesu</h3>
						<p>{brief.successDefinition}</p>
					</div>

					<div className="proj-brief-section">
						<h3>Kryteria akceptacji</h3>
						<ul className="proj-criteria-list">
							{brief.acceptanceCriteria.map((c) => (
								<li key={c.criterion}>
									<strong>{c.criterion}</strong> ({c.weight}%): {c.description}
								</li>
							))}
						</ul>
					</div>

					{!showSubmitForm && (
						<button
							type="button"
							onClick={() => setShowSubmitForm(true)}
							className="proj-submit-btn"
						>
							Oddaj rozwiązanie
						</button>
					)}
				</div>
			)}

			{/* C11/1.14 — tutor sokratyczny: dostępny w trakcie pracy (przed briefem
			    i po zgłoszeniu). Renderowany wyłącznie za flagą z server component. */}
			{tutorEnabled && <TutorPanel projectId={project.id} />}

			{showSubmitForm && <SubmissionForm projectId={project.id} />}

			{submission && submission.status !== "in_progress" && (
				<div className={`proj-submission-status proj-status-${submission.status}`}>
					<h3>Status zgłoszenia: {submission.status}</h3>
					{submission.score !== null && <p>Wynik: {submission.score}/100</p>}
				</div>
			)}

			{/* B5 — Callout refleksji: pojawia się gdy submission.status spełnia warunek
			    (domyślnie 'verified'). Warunek wydzielony w REFLECTION_TRIGGER_STATUSES
			    — Sophia/Leo rozszerzą go bez dotykania tej linii. */}
			{submission && (
				<ReflectionCallout
					submissionId={submission.id}
					projectId={project.id}
					submissionStatus={submission.status}
					existingReflection={existingReflection}
				/>
			)}
		</div>
	);
}
