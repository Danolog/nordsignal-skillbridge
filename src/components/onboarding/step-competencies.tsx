"use client";

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface CompetencyItem {
	id: string;
	name: string;
}

/** Próg minimalny kompetencji (spec B3 §1 pkt 3+5). Współdzielony z isStep3Valid w wizardzie. */
export const MIN_COMPETENCIES = 5;

interface StepCompetenciesProps {
	competencies: CompetencyItem[];
	onChange: (competencies: CompetencyItem[]) => void;
}

let nextId = 0;
export function createCompetencyItem(name: string): CompetencyItem {
	return { id: `c-${Date.now()}-${nextId++}`, name };
}

export function StepCompetencies({ competencies, onChange }: StepCompetenciesProps) {
	const updateItem = (id: string, value: string) => {
		onChange(competencies.map((c) => (c.id === id ? { ...c, name: value } : c)));
	};

	const removeItem = (id: string) => {
		onChange(competencies.filter((c) => c.id !== id));
	};

	const addItem = () => {
		onChange([...competencies, createCompetencyItem("")]);
	};

	const filledCount = competencies.filter((c) => c.name.trim() !== "").length;
	const belowMinimum = filledCount < MIN_COMPETENCIES;
	const thresholdMessageId = "competencies-threshold-msg";

	return (
		<div className="space-y-4">
			<div
				className="ob-competency-scroll max-h-[340px] overflow-y-auto pr-1"
				aria-describedby={thresholdMessageId}
			>
				<div className="space-y-2">
					{competencies.map((item) => (
						<div
							key={item.id}
							className="flex items-center gap-2.5 animate-in slide-in-from-left-2 duration-200"
						>
							<Input
								value={item.name}
								onChange={(e) => updateItem(item.id, e.target.value)}
								placeholder="Nazwa kompetencji..."
								className="flex-1"
							/>
							<button
								type="button"
								onClick={() => removeItem(item.id)}
								className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/8 text-destructive transition-all hover:bg-destructive/15 hover:scale-105"
								title="Usuń"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					))}
				</div>
			</div>

			{/* Licznik X/5 względem progu minimalnego (spec B3 §1). Czytelny dla
			    czytników ekranu przez aria-live — student słyszy zmianę po edycji. */}
			<div className="flex items-center justify-between gap-2 font-mono text-xs" aria-live="polite">
				<span className="text-muted-foreground">
					<span className={`font-bold ${belowMinimum ? "text-amber-600" : "text-emerald-600"}`}>
						{filledCount}
					</span>
					/{MIN_COMPETENCIES}{" "}
					<span className="sr-only">
						{belowMinimum
							? `wybrano ${filledCount} z wymaganych ${MIN_COMPETENCIES} kompetencji`
							: `wybrano ${filledCount} kompetencji, minimum ${MIN_COMPETENCIES} spełnione`}
					</span>
				</span>
				<span className="text-muted-foreground/70">maks. 40</span>
			</div>

			{/* Komunikat progu powiązany z listą przez aria-describedby. <output> ma
			    domyślne role=status (live region), więc SR ogłasza przejście poniżej/
			    powyżej progu bez ręcznego role. */}
			<output
				id={thresholdMessageId}
				className={`block text-xs ${belowMinimum ? "text-amber-600" : "text-muted-foreground"}`}
			>
				{belowMinimum
					? `Pracodawcy oczekują min. ${MIN_COMPETENCIES} kompetencji.`
					: "Minimum spełnione — każda kolejna kompetencja zwiększa Twoje szanse."}
			</output>

			<button
				type="button"
				onClick={addItem}
				className="flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-[#6366F1]/20 bg-[#6366F1]/[0.03] px-4 py-3 text-sm font-medium text-[#6366F1] transition-all hover:border-[#6366F1] hover:bg-[#6366F1]/[0.06]"
			>
				<Plus className="h-4 w-4" />
				Dodaj kompetencję
			</button>
		</div>
	);
}
