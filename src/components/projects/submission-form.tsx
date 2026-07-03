"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ReviewResult } from "@/lib/ai/pipeline/types";

interface SubmissionFormProps {
	projectId: string;
}

export function SubmissionForm({ projectId }: SubmissionFormProps) {
	const [repoUrl, setRepoUrl] = useState("");
	const [notebookUrl, setNotebookUrl] = useState("");
	const [loading, setLoading] = useState(false);
	const [review, setReview] = useState<ReviewResult | null>(null);
	const [status, setStatus] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!repoUrl && !notebookUrl) {
			toast.error("Podaj link do repozytorium lub notebooka.");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch(`/api/projects/${projectId}/submit`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					repoUrl: repoUrl || undefined,
					notebookUrl: notebookUrl || undefined,
				}),
			});

			if (!res.ok) throw new Error("Błąd wysyłania");

			const data = await res.json();
			setReview(data.review);
			setStatus(data.submission.status);
			toast.success("Rozwiązanie ocenione!");
		} catch {
			toast.error("Nie udało się wysłać rozwiązania. Spróbuj ponownie.");
		} finally {
			setLoading(false);
		}
	};

	if (review) {
		return (
			<div className="proj-review">
				<h2 className="proj-detail-section-title">Wynik oceny</h2>

				<div className={`proj-review-score proj-score-${status}`}>
					<span className="proj-review-score-value">{review.score}/100</span>
					<span className="proj-review-status-badge">{status}</span>
				</div>

				<div className="proj-review-feedback">
					<h3>Feedback</h3>
					<p>{review.feedback}</p>
				</div>

				{review.criteriaScores.length > 0 && (
					<div className="proj-review-criteria">
						<h3>Ocena kryteriów</h3>
						<table className="proj-criteria-table">
							<thead>
								<tr>
									<th>Kryterium</th>
									<th>Wynik</th>
									<th>Komentarz</th>
								</tr>
							</thead>
							<tbody>
								{review.criteriaScores.map((c) => (
									<tr key={c.criterion}>
										<td>{c.criterion}</td>
										<td>{c.score}/100</td>
										<td>{c.comment}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="proj-submit-form">
			<h2 className="proj-detail-section-title">Oddaj rozwiązanie</h2>

			<div className="proj-form-field">
				<label htmlFor="repoUrl">Link do repozytorium (GitHub)</label>
				<input
					id="repoUrl"
					type="url"
					value={repoUrl}
					onChange={(e) => setRepoUrl(e.target.value)}
					placeholder="https://github.com/user/repo"
					className="proj-form-input"
				/>
			</div>

			<div className="proj-form-field">
				<label htmlFor="notebookUrl">Link do notebooka (opcjonalnie)</label>
				<input
					id="notebookUrl"
					type="url"
					value={notebookUrl}
					onChange={(e) => setNotebookUrl(e.target.value)}
					placeholder="https://colab.research.google.com/..."
					className="proj-form-input"
				/>
			</div>

			<button type="submit" disabled={loading} className="proj-submit-btn">
				{loading ? (
					<>
						<Loader2 size={16} className="animate-spin" />
						Sprawdzamy Twoje rozwiązanie...
					</>
				) : (
					"Wyślij do oceny"
				)}
			</button>
		</form>
	);
}
