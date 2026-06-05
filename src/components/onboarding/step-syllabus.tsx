"use client";

import { FileText, FileUp, Sparkles, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface StepSyllabusProps {
	syllabusText: string;
	onSyllabusChange: (text: string) => void;
	/**
	 * Lift stanu pliku do wizarda (ADR-007 (a)) — plik musi opuścić komponent, by trafił do fetch.
	 * Opcjonalne: gdy nie podane (np. ProfilEditor — re-analiza tylko tekstowa), komponent zarządza
	 * własnym stanem pliku lokalnie i upload PDF nie jest wspierany (zachowanie sprzed strumienia C).
	 */
	file?: File | null;
	onFileChange?: (f: File | null) => void;
	onAnalyze: () => void;
	loading: boolean;
}

export function StepSyllabus({
	syllabusText,
	onSyllabusChange,
	file: fileProp,
	onFileChange,
	onAnalyze,
	loading,
}: StepSyllabusProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [dragOver, setDragOver] = useState(false);
	// Tryb niekontrolowany (brak onFileChange) — lokalny stan; tryb kontrolowany — prop z wizarda.
	const [localFile, setLocalFile] = useState<File | null>(null);
	const isControlled = onFileChange !== undefined;
	const file = isControlled ? (fileProp ?? null) : localFile;

	const setFile = useCallback(
		(f: File | null) => {
			if (isControlled) {
				onFileChange?.(f);
			} else {
				setLocalFile(f);
			}
		},
		[isControlled, onFileChange],
	);

	const handleFile = useCallback(
		(f: File) => {
			if (f.type !== "application/pdf") {
				return;
			}
			if (f.size > 10 * 1024 * 1024) {
				return;
			}
			setFile(f);
		},
		[setFile],
	);

	const removeFile = () => {
		setFile(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const canAnalyze = syllabusText.trim().length >= 100 || file !== null;

	return (
		<div className="space-y-5">
			<div className="space-y-1.5">
				<Label>Treść sylabusa</Label>
				<Textarea
					value={syllabusText}
					onChange={(e) => onSyllabusChange(e.target.value)}
					placeholder="Wklej tutaj treść sylabusa — listę przedmiotów, opis efektów kształcenia, zakres tematyczny..."
					className="min-h-[160px] resize-y"
				/>
				<p className="text-xs text-muted-foreground">
					Minimum 100 znaków. Im więcej szczegółów, tym lepsza analiza.
				</p>
			</div>

			<div className="flex items-center gap-4">
				<div className="h-px flex-1 bg-border" />
				<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					lub
				</span>
				<div className="h-px flex-1 bg-border" />
			</div>

			{!file ? (
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					onDragOver={(e) => {
						e.preventDefault();
						setDragOver(true);
					}}
					onDragLeave={() => setDragOver(false)}
					onDrop={(e) => {
						e.preventDefault();
						setDragOver(false);
						if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
					}}
					className={`ob-upload-area w-full rounded-xl border-2 border-dashed p-7 text-center transition-all ${
						dragOver
							? "border-[#6366F1] bg-[#6366F1]/5 scale-[1.01]"
							: "border-[#6366F1]/20 bg-[#6366F1]/[0.02] hover:border-[#6366F1] hover:bg-[#6366F1]/5"
					}`}
				>
					<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#6366F1]/10">
						<FileUp className="h-6 w-6 text-[#6366F1]" />
					</div>
					<p className="text-sm text-muted-foreground">
						<span className="font-semibold text-[#6366F1]">Kliknij, aby wybrać plik</span> lub
						przeciągnij i upuść
					</p>
					<p className="mt-1 text-xs text-muted-foreground/70">PDF, maksymalnie 10 MB</p>
				</button>
			) : (
				<div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
					<FileText className="h-5 w-5 text-emerald-600" />
					<span className="flex-1 truncate text-sm font-medium">{file.name}</span>
					<span className="font-mono text-xs text-muted-foreground">
						{(file.size / (1024 * 1024)).toFixed(1)} MB
					</span>
					<button
						type="button"
						onClick={removeFile}
						className="rounded-md p-1 text-destructive hover:bg-destructive/10 transition-colors"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf"
				className="hidden"
				onChange={(e) => {
					if (e.target.files?.length) handleFile(e.target.files[0]);
				}}
			/>

			{loading && (
				<div className="flex flex-col items-center py-10 text-center animate-in fade-in duration-300">
					<div className="ob-spinner mb-6 h-14 w-14 rounded-full border-[3px] border-[#6366F1]/15 border-t-[#6366F1]" />
					<p className="font-heading text-lg font-bold">Analizujemy Twój sylabus</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Nasza AI wyciąga kompetencje z Twojego programu studiów.
						<br />
						To może potrwać do 30 sekund…
					</p>
					<div className="mt-5 flex gap-1.5">
						<span className="ob-dot h-2 w-2 rounded-full bg-[#6366F1]" />
						<span className="ob-dot h-2 w-2 rounded-full bg-[#6366F1] [animation-delay:0.2s]" />
						<span className="ob-dot h-2 w-2 rounded-full bg-[#6366F1] [animation-delay:0.4s]" />
					</div>
				</div>
			)}

			{!loading && (
				<Button onClick={onAnalyze} disabled={!canAnalyze} className="ob-btn-primary w-full gap-2">
					<Sparkles className="h-4 w-4" />
					Analizuj sylabus
				</Button>
			)}
		</div>
	);
}
