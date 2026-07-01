"use client";

import { Award, ChevronDown, ExternalLink, Github } from "lucide-react";
import { useState } from "react";
import { shortenRepoUrl } from "@/lib/passport-format";

export interface ProjectReceipt {
	projectTitle: string;
	projectLevel: string;
	score: number;
	verifiedAt: string;
	repoUrl?: string | null;
	notebookUrl?: string | null;
	feedback?: string | null;
}

export function ProjectReceipts({ receipts }: { receipts: ProjectReceipt[] }) {
	if (receipts.length === 0) return null;

	return (
		<div className="pp-comp-section">
			<div className="pp-comp-section-header">
				<div className="pp-comp-section-title">
					<span className="section-dot green" />
					Zweryfikowane projekty
				</div>
				<span className="pp-comp-count-badge green">
					{receipts.length} {receipts.length === 1 ? "projekt" : "projektów"}
				</span>
			</div>
			<div className="pp-comp-grid">
				{receipts.map((r) => (
					<ReceiptCard key={`${r.projectTitle}-${r.verifiedAt}`} receipt={r} />
				))}
			</div>
		</div>
	);
}

function ReceiptCard({ receipt }: { receipt: ProjectReceipt }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="pp-receipt-card">
			<div className="pp-receipt-header">
				<Award size={16} />
				<span className="pp-receipt-level">{receipt.projectLevel}</span>
				<span className="pp-receipt-score">{receipt.score}/100</span>
			</div>
			<h4 className="pp-receipt-title">{receipt.projectTitle}</h4>
			<div className="pp-receipt-date">
				{new Date(receipt.verifiedAt).toLocaleDateString("pl-PL")}
			</div>
			<div className="pp-receipt-links">
				{receipt.repoUrl && (
					<a href={receipt.repoUrl} target="_blank" rel="noopener noreferrer">
						<Github size={12} /> {shortenRepoUrl(receipt.repoUrl)}
					</a>
				)}
				{receipt.notebookUrl && (
					<a href={receipt.notebookUrl} target="_blank" rel="noopener noreferrer">
						<ExternalLink size={12} /> Notebook
					</a>
				)}
			</div>
			{receipt.feedback && (
				<button
					type="button"
					className="pp-receipt-feedback-toggle"
					onClick={() => setExpanded(!expanded)}
				>
					<ChevronDown size={12} className={expanded ? "rotate-180" : ""} />
					{expanded ? "Ukryj feedback" : "Pokaż feedback"}
				</button>
			)}
			{expanded && receipt.feedback && <p className="pp-receipt-feedback">{receipt.feedback}</p>}
		</div>
	);
}
