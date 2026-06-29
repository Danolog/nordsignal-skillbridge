"use client";

/**
 * CareerPathPicker — deterministyczny wybór celu kariery z 23 REALNYCH ścieżek rynku
 * (Partia 4, element 1; decyzja Sophii D1). Pogrupowane w 5 rodzin e-CF, role docelowe
 * z etykietą „rola docelowa — nie punkt startu". Wybór = DOKŁADNA etykieta = klucz
 * katalogu rynku → gwarancja, że kolejny krok znajdzie kompetencje.
 *
 * Po co osobno od Pomocnika (Career Helper): Pomocnik proponuje wolnym tekstem (model);
 * ta lista jest twardą gwarancją realnego celu (HITL, Built-to-Sell). „Inne"/worek
 * „Other" świadomie NIE istnieje (D2). Info nie-IT (D3) — bez ukrywania ograniczenia.
 *
 * UI minimalne/funkcjonalne — Jack restyluje wg makiet Mili (Partia 5).
 */

import { groupCareerPathsByFamily } from "@/lib/db/data/career-paths";

interface CareerPathPickerProps {
	/** Aktualnie wybrany cel (podświetlenie). */
	value: string;
	/** Wybór ścieżki — przekazuje DOKŁADNĄ etykietę (klucz katalogu rynku). */
	onSelect: (careerGoal: string) => void;
}

export function CareerPathPicker({ value, onSelect }: CareerPathPickerProps) {
	const groups = groupCareerPathsByFamily();

	return (
		<div className="space-y-5">
			{/* Info nie-IT (D3) — uczciwie o zakresie, bez nakłaniania. */}
			<p className="rounded-md border border-ed-amber bg-ed-badge-bg px-3 py-2 text-sm text-ed-amber-text">
				SkillBridge opiera się dziś na realnym rynku pracy IT (źródło: JustJoinIT, ~10 tys. ofert).
				Jeśli Twój kierunek jest spoza IT — damy Ci znać, gdy dodamy Twój rynek. Na teraz możesz
				przejrzeć ścieżki IT, ale nie nakłaniamy Cię do nich.
			</p>

			{groups.map((group) => (
				<fieldset key={group.family} className="space-y-2">
					<legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{group.family}
					</legend>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{group.paths.map((path) => {
							const selected = value === path.careerGoal;
							return (
								<button
									key={path.careerGoal}
									type="button"
									aria-pressed={selected}
									onClick={() => onSelect(path.careerGoal)}
									className={[
										"flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors",
										selected
											? "border-ed-amber bg-ed-badge-bg"
											: "border-border bg-card hover:border-ed-amber hover:bg-ed-badge-bg/50",
									].join(" ")}
								>
									<span className="text-sm font-medium text-foreground">{path.careerGoal}</span>
									{path.targetRole && (
										<span className="mt-0.5 text-xs text-ed-amber-text">
											rola docelowa — nie punkt startu
										</span>
									)}
								</button>
							);
						})}
					</div>
				</fieldset>
			))}
		</div>
	);
}
