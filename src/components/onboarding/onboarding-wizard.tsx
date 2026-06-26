"use client";

import { BookOpen, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CareerHelperFlow } from "@/components/career-helper/career-helper-flow";
import { Button } from "@/components/ui/button";
import {
	annotateWithSyllabus,
	type MarketCatalogItem,
	type PossessionLevel,
	type SelectedCompetency,
} from "@/lib/onboarding/market-catalog";
import { CareerPathPicker } from "./career-path-picker";
import { StepMarketCompetencies } from "./step-market-competencies";
import { type ProfileData, StepProfile } from "./step-profile";
import { StepSyllabus } from "./step-syllabus";

/**
 * Wizard onboardingu — REDESIGN na realny rynek pracy (Partia 4).
 *
 * 5 kroków (scalenie wyboru+poziomu znosi osobną samoocenę — D5):
 *   0 Cel kariery — Pomocnik + deterministyczny picker 23 realnych ścieżek (D1, element 1).
 *   1 Profil — uczelnia/kierunek/semestr (bez celu, bez pola „Inne" — D2).
 *   2 Sylabus (opcjonalny) — ADNOTUJE katalog rynku flagą „w programie studiów" (D4),
 *     już NIE generuje listy kompetencji (element 6).
 *   3 Kompetencje + poziom — z KATALOGU RYNKU (element 2), scalony wybór z poziomem 1–4
 *     (element 4); nagłówek pokrycia (element 5); próg „min 5" zniesiony (0 OK — element 3/D5).
 *   4 Wnioski — POST /api/onboarding/complete + redirect na pulpit.
 *
 * Kontrakt front↔back zmieniony jedną gałęzią (lekcja split-frontend-backend):
 *   POST /api/onboarding niesie competencies jako { name, level, marketPercentage, inSyllabus }[]
 *   (poziom = samoocena 2/3/4), min 0. Patrz src/lib/onboarding/market-catalog.ts.
 *
 * UI minimalne/funkcjonalne — Jack restyluje wg makiet Mili (Partia 5).
 */
const STEPS = [
	{ label: "Cel kariery", num: 0 },
	{ label: "Profil", num: 1 },
	{ label: "Sylabus", num: 2 },
	{ label: "Kompetencje", num: 3 },
	{ label: "Wnioski", num: 4 },
];

const LAST_STEP = 4;

/** Stan początkowy do hydratacji wznawianego kreatora (page.tsx → wizard). */
export interface OnboardingInitialData {
	profile: ProfileData;
	syllabusText: string;
	/** Wybór kompetencji z poziomem (nazwa → 2/3/4) — odtwarzany z zapisanych samoocen. */
	selections: Record<string, PossessionLevel>;
}

interface OnboardingWizardProps {
	user: { id: string; name: string; email: string };
	/** Krok, od którego wznawiamy (high-water-mark z onboarding_step). Domyślnie 0. */
	initialStep?: number;
	/** Dane wczytane z bazy (profil/sylabus/wybór). Brak = pusty start. */
	initialData?: OnboardingInitialData;
}

export function OnboardingWizard({
	user: _user,
	initialStep = 0,
	initialData,
}: OnboardingWizardProps) {
	const router = useRouter();
	const [step, setStep] = useState(initialStep);
	const [maxReached, setMaxReached] = useState(initialStep);
	const [submitting, setSubmitting] = useState(false);
	const [analyzing, setAnalyzing] = useState(false);
	const [savingProfile, setSavingProfile] = useState(false);
	const [completing, setCompleting] = useState(false);

	const [profile, setProfile] = useState<ProfileData>(
		initialData?.profile ?? {
			university: "",
			fieldOfStudy: "",
			semester: "",
			careerGoal: "",
		},
	);
	const [syllabusText, setSyllabusText] = useState(initialData?.syllabusText ?? "");
	const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
	// Nazwy z sylabusa (analiza AI) — ŹRÓDŁO ADNOTACJI „w programie studiów" (D4),
	// nie generator listy. Efemeryczne (nie persystowane — brak kolumny, bez migracji).
	const [syllabusCompetencies, setSyllabusCompetencies] = useState<string[]>([]);

	// Katalog rynku dla wybranej ścieżki (element 2) — pobierany na wejściu w krok 3.
	const [rawCatalog, setRawCatalog] = useState<MarketCatalogItem[]>([]);
	const [catalogGoal, setCatalogGoal] = useState<string | null>(null);
	const [catalogLoading, setCatalogLoading] = useState(false);
	const [catalogError, setCatalogError] = useState(false);
	const [isRealGoal, setIsRealGoal] = useState(true);

	// Wybór studenta: nazwa kompetencji → poziom posiadania (2/3/4). Brak klucza = Brak = luka.
	const [selections, setSelections] = useState<Record<string, PossessionLevel>>(
		initialData?.selections ?? {},
	);

	// Katalog z nałożoną adnotacją sylabusa (D4) — pochodna, nie osobny stan.
	const catalog = useMemo(
		() => annotateWithSyllabus(rawCatalog, syllabusCompetencies),
		[rawCatalog, syllabusCompetencies],
	);

	const isStep0Valid = Boolean(profile.careerGoal);
	const isStep1Valid = Boolean(
		profile.university && profile.fieldOfStudy.trim() && profile.semester,
	);

	// ── Pobranie katalogu rynku (krok 3) ────────────────────────────────────
	const loadCatalog = useCallback(async (careerGoal: string) => {
		if (!careerGoal) return;
		setCatalogLoading(true);
		setCatalogError(false);
		// Oznacz cel jako „obsłużony" OPTYMISTYCZNIE — inaczej efekt poniżej wpadłby w
		// pętlę przy trwałym błędzie sieci (catalogGoal≠careerGoal ∧ !loading → ciągły
		// refetch). Ponowna próba idzie wyłącznie jawnie przez onRetry (stan błędu).
		setCatalogGoal(careerGoal);
		try {
			const res = await fetch(
				`/api/onboarding/market-catalog?careerGoal=${encodeURIComponent(careerGoal)}`,
			);
			if (!res.ok) throw new Error("catalog_failed");
			const data = (await res.json()) as {
				isRealCareerGoal: boolean;
				items: MarketCatalogItem[];
			};
			setRawCatalog(data.items);
			setIsRealGoal(data.isRealCareerGoal);
		} catch {
			setCatalogError(true);
		} finally {
			setCatalogLoading(false);
		}
	}, []);

	// Wejście na krok 3 (także przy wznawianiu) → pobierz katalog, jeśli nie ten cel.
	useEffect(() => {
		if (step === 3 && profile.careerGoal && catalogGoal !== profile.careerGoal && !catalogLoading) {
			void loadCatalog(profile.careerGoal);
		}
	}, [step, profile.careerGoal, catalogGoal, catalogLoading, loadCatalog]);

	// ── Autosave profilu (krok 1) ───────────────────────────────────────────
	const saveProfileProgress = async (): Promise<boolean> => {
		try {
			const res = await fetch("/api/onboarding/progress", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					step: 1,
					university: profile.university,
					fieldOfStudy: profile.fieldOfStudy,
					semester: Number(profile.semester),
				}),
			});
			if (!res.ok) throw new Error("save_failed");
			return true;
		} catch {
			toast.error("Nie udało się zapisać profilu. Spróbuj ponownie.");
			return false;
		}
	};

	const bumpStepProgress = (target: number) => {
		if (target <= maxReached || target === 1 || target === 2) return;
		void fetch("/api/onboarding/progress", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ step: target }),
		}).catch(() => {
			/* bump nieblokujący */
		});
	};

	const advanceTo = (target: number) => {
		setStep(target);
		if (target > maxReached) {
			setMaxReached(target);
			bumpStepProgress(target);
		}
	};

	const goToStep = async (target: number) => {
		const isJumpBack = target <= maxReached && target < step;

		if (target === 1 && !isStep0Valid) {
			toast.error("Najpierw wybierz cel kariery z listy realnych ścieżek.");
			return;
		}
		if (target === 2 && !isJumpBack) {
			if (!isStep1Valid) {
				toast.error("Wypełnij wszystkie wymagane pola.");
				return;
			}
			setSavingProfile(true);
			const ok = await saveProfileProgress();
			setSavingProfile(false);
			if (!ok) return;
		}
		advanceTo(target);
	};

	// Krok 0 → 1: cel ustalony (Pomocnik lub picker). Zmiana celu czyści wybór i katalog.
	const handleCareerGoalChosen = (careerLabel: string) => {
		setProfile((prev) => {
			if (prev.careerGoal && prev.careerGoal !== careerLabel) {
				// Inny cel → katalog i wybór z poprzedniej ścieżki nieaktualne.
				setSelections({});
				setCatalogGoal(null);
				setRawCatalog([]);
			}
			return { ...prev, careerGoal: careerLabel };
		});
		advanceTo(1);
	};

	// ── Sylabus (krok 2) — adnotacja, opcjonalna ────────────────────────────
	const runAnalyzeSyllabus = async () => {
		const hasFile = syllabusFile !== null;
		const hasText = syllabusText.trim().length >= 100;
		if (!hasFile && !hasText) {
			toast.error("Wgraj plik PDF albo wklej co najmniej 100 znaków sylabusa.");
			return;
		}
		setAnalyzing(true);
		try {
			await fetch("/api/onboarding/progress", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ step: 2, syllabusText }),
			});

			let res: Response;
			if (hasFile && syllabusFile) {
				const fd = new FormData();
				fd.append("file", syllabusFile);
				fd.append("careerGoal", profile.careerGoal);
				res = await fetch("/api/syllabus/parse", { method: "POST", body: fd });
			} else {
				res = await fetch("/api/syllabus/parse", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ syllabusText, careerGoal: profile.careerGoal }),
				});
			}
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Błąd analizy");
			}
			const data = (await res.json()) as { competencies: string[] };
			// Wynik = ADNOTACJA (nazwy „w programie"), nie lista kompetencji (D4).
			setSyllabusCompetencies(data.competencies);
			toast.success("Sylabus zaznaczy, co masz z toku studiów. Resztę dobierasz z rynku.");
			advanceTo(3);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Nie udało się przeanalizować sylabusa.");
		} finally {
			setAnalyzing(false);
		}
	};

	// Pominięcie sylabusa — pełny katalog rynku bez adnotacji (D4: sylabus opcjonalny).
	const skipSyllabus = () => {
		setSyllabusCompetencies([]);
		advanceTo(3);
	};

	// ── Wybór kompetencji (krok 3) ──────────────────────────────────────────
	const handleSelectionChange = (name: string, level: PossessionLevel | null) => {
		setSelections((prev) => {
			const next = { ...prev };
			if (level === null) {
				delete next[name]; // Brak = odznaczenie = luka
			} else {
				next[name] = level;
			}
			return next;
		});
	};

	// Submit kroku 3 — POST /api/onboarding (delete+insert competencies z poziomem,
	// deterministyczne luki + Skill Map). Próg „min 5" zniesiony — 0 dozwolone (D5).
	const runSubmit = async () => {
		const selected: SelectedCompetency[] = catalog
			.filter((item) => selections[item.competencyName] !== undefined)
			.map((item) => ({
				name: item.competencyName,
				level: selections[item.competencyName],
				marketPercentage: item.demandPercentage,
				inSyllabus: Boolean(item.inSyllabus),
			}));

		setSubmitting(true);
		try {
			const res = await fetch("/api/onboarding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					university: profile.university,
					fieldOfStudy: profile.fieldOfStudy,
					semester: Number(profile.semester),
					careerGoal: profile.careerGoal,
					syllabusText,
					competencies: selected,
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Błąd zapisu");
			}
			const data = (await res.json()) as { aiGenerationFailed?: boolean };
			if (data.aiGenerationFailed) {
				toast.warning(
					"Profil zapisany, ale generacja Skill Map nie powiodła się. Spróbuj ponownie ze strony Skill Map.",
				);
			} else {
				toast.success("Paszport Kompetencji utworzony!");
			}
			advanceTo(4);
			setSubmitting(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Nie udało się zapisać danych.");
			setSubmitting(false);
		}
	};

	// Krok 4 (Wnioski): domknięcie onboardingu — JEDYNE zapalenie onboardingCompleted.
	const handleComplete = async () => {
		setCompleting(true);
		try {
			const res = await fetch("/api/onboarding/complete", { method: "POST" });
			if (res.status === 409) {
				const data = (await res.json()) as { error?: string };
				toast.error(data.error ?? "Onboarding niekompletny — uzupełnij profil.");
				setCompleting(false);
				return;
			}
			if (!res.ok) throw new Error("complete_failed");
			const data = (await res.json()) as { redirect?: string };
			router.push(data.redirect ?? "/dashboard");
		} catch {
			toast.error("Nie udało się domknąć onboardingu. Spróbuj ponownie.");
			setCompleting(false);
		}
	};

	if (submitting) {
		return (
			<div className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-5 py-10 gap-6">
				<div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
					<BookOpen className="h-8 w-8 text-indigo-500 animate-pulse" />
				</div>
				<div className="text-center max-w-md">
					<h2 className="font-heading text-2xl font-extrabold mb-2">Budujemy Twój Paszport…</h2>
					<p className="text-sm text-muted-foreground">
						Porównujemy Twoje kompetencje z wymaganiami rynku i budujemy Skill Map. To zajmie 15-30
						sekund.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-[calc(100vh-72px)] flex-col items-center px-5 py-10">
			{/* Progress bar */}
			<div className="mb-10 w-full max-w-[560px]">
				<div className="relative mb-3 flex items-center justify-between">
					<div className="absolute left-6 right-6 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-muted">
						<div
							className="ob-progress-fill h-full rounded-full transition-all duration-500"
							style={{ width: `${(step / LAST_STEP) * 100}%` }}
						/>
					</div>
					{STEPS.map((s, idx) => {
						const reached = s.num <= maxReached;
						const isCurrent = s.num === step;
						return (
							<button
								type="button"
								key={s.num}
								onClick={() => {
									if (reached) void goToStep(s.num);
								}}
								disabled={!reached}
								aria-current={isCurrent ? "step" : undefined}
								aria-label={
									reached
										? `Krok ${idx + 1}: ${s.label}`
										: `Krok ${idx + 1}: ${s.label} (jeszcze niedostępny)`
								}
								className={`ob-step-dot relative z-10 flex h-12 w-12 items-center justify-center rounded-full font-mono text-base font-bold transition-all duration-400 ${
									reached ? "cursor-pointer" : "cursor-not-allowed"
								} ${
									s.num < step
										? "bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.3)]"
										: isCurrent
											? "ob-step-active text-white shadow-[0_0_24px_rgba(99,102,241,0.3)] scale-110"
											: "border-2 border-muted bg-background text-muted-foreground"
								}`}
							>
								{s.num < step ? <Check className="h-5 w-5" /> : idx + 1}
							</button>
						);
					})}
				</div>
				<div className="flex justify-between">
					{STEPS.map((s) => (
						<span
							key={s.num}
							className={`w-20 text-center text-xs font-medium transition-colors ${
								s.num < step
									? "text-emerald-500"
									: s.num === step
										? "font-semibold text-[#6366F1]"
										: "text-muted-foreground"
							}`}
						>
							{s.label}
						</span>
					))}
				</div>
			</div>

			{/* Card */}
			<div className="ob-wizard-card w-full max-w-[560px] animate-in fade-in slide-in-from-bottom-3 duration-400">
				{/* Step 0 — Cel kariery: Pomocnik + deterministyczny picker 23 ścieżek (D1). */}
				{step === 0 && (
					<>
						<h2 className="font-heading text-2xl font-extrabold">Zacznijmy od celu</h2>
						<p className="mb-6 mt-1.5 text-sm text-muted-foreground">
							Pomocnik pomoże nazwać obszar, który do Ciebie pasuje — albo wybierz wprost z listy
							realnych ścieżek z rynku. Ty decydujesz.
						</p>
						<CareerHelperFlow onCareerGoalChosen={handleCareerGoalChosen} />
						<div className="my-6 flex items-center gap-4">
							<div className="h-px flex-1 bg-border" />
							<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								lub wybierz z listy
							</span>
							<div className="h-px flex-1 bg-border" />
						</div>
						<CareerPathPicker value={profile.careerGoal} onSelect={handleCareerGoalChosen} />
					</>
				)}

				{/* Step 1 — Profil */}
				{step === 1 && (
					<>
						<h2 className="font-heading text-2xl font-extrabold">Opowiedz nam o sobie</h2>
						<p className="mb-8 mt-1.5 text-sm text-muted-foreground">
							Te informacje pomogą nam spersonalizować Twój Paszport Kompetencji i analizę luk.
						</p>
						{profile.careerGoal && (
							<p className="mb-6 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
								Twój cel kariery:{" "}
								<span className="font-medium text-foreground">{profile.careerGoal}</span>. Możesz go
								zmienić, wracając do poprzedniego kroku.
							</p>
						)}
						<StepProfile data={profile} onChange={setProfile} />
						<div className="mt-8 flex items-center justify-between">
							<Button variant="ghost" onClick={() => goToStep(0)} className="gap-2">
								<ChevronLeft className="h-4 w-4" />
								Wstecz
							</Button>
							<Button
								onClick={() => goToStep(2)}
								disabled={!isStep1Valid || savingProfile}
								className="ob-btn-primary gap-2"
							>
								{savingProfile ? (
									<>
										<BookOpen className="h-4 w-4 animate-spin" />
										Zapisywanie…
									</>
								) : (
									<>
										Dalej
										<ChevronRight className="h-4 w-4" />
									</>
								)}
							</Button>
						</div>
					</>
				)}

				{/* Step 2 — Sylabus (opcjonalny): ADNOTUJE katalog rynku, nie generuje listy (D4). */}
				{step === 2 && (
					<>
						<h2 className="font-heading text-2xl font-extrabold">Sylabus (opcjonalny)</h2>
						<p className="mb-8 mt-1.5 text-sm text-muted-foreground">
							Wklej lub wgraj sylabus, a zaznaczymy na liście kompetencji rynku te, które masz z
							toku studiów. Możesz też pominąć ten krok — katalog rynku dostajesz tak czy inaczej.
						</p>
						<StepSyllabus
							syllabusText={syllabusText}
							onSyllabusChange={setSyllabusText}
							file={syllabusFile}
							onFileChange={setSyllabusFile}
							onAnalyze={runAnalyzeSyllabus}
							loading={analyzing}
						/>
						{!analyzing && (
							<div className="mt-6 flex items-center justify-between">
								<Button variant="ghost" onClick={() => goToStep(1)} className="gap-2">
									<ChevronLeft className="h-4 w-4" />
									Wstecz
								</Button>
								<Button variant="ghost" onClick={skipSyllabus} className="gap-2">
									Pomiń sylabus
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						)}
					</>
				)}

				{/* Step 3 — Kompetencje + poziom (scalone, z rynku). Element 2/4/5. */}
				{step === 3 && (
					<>
						<h2 className="font-heading text-2xl font-extrabold">Twoje kompetencje</h2>
						<p className="mb-6 mt-1.5 text-sm text-muted-foreground">
							Zaznacz przy każdej umiejętności poziom, jaki masz. Czego nie zaznaczysz, zostaje
							Twoim planem nauki. Nie musisz zaznaczać nic — możesz zacząć od zera.
						</p>
						<StepMarketCompetencies
							careerGoal={profile.careerGoal}
							catalog={catalog}
							selections={selections}
							onChange={handleSelectionChange}
							loading={catalogLoading}
							error={catalogError}
							onRetry={() => loadCatalog(profile.careerGoal)}
							isRealCareerGoal={isRealGoal}
						/>
						<div className="mt-8 flex items-center justify-between">
							<Button variant="ghost" onClick={() => goToStep(2)} className="gap-2">
								<ChevronLeft className="h-4 w-4" />
								Wstecz
							</Button>
							<Button
								onClick={runSubmit}
								disabled={submitting || catalogLoading}
								className="ob-btn-accent gap-2"
							>
								{submitting ? (
									<>
										<BookOpen className="h-4 w-4 animate-spin" />
										Zapisywanie…
									</>
								) : (
									<>
										<Check className="h-4 w-4" />
										Zatwierdź i przejdź dalej
									</>
								)}
							</Button>
						</div>
					</>
				)}

				{/* Step 4 — Wnioski: domknięcie onboardingu. */}
				{step === 4 && (
					<div className="flex flex-col items-center gap-6 py-4 text-center">
						<div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
							<Check className="h-8 w-8 text-emerald-500" />
						</div>
						<div className="max-w-sm">
							<h2 className="font-heading text-2xl font-extrabold mb-2">Profil gotowy!</h2>
							<p className="text-sm text-muted-foreground">
								Twój Paszport Kompetencji jest gotowy. Mapa pokaże, czego rynek wymaga, a czego
								jeszcze nie masz — to Twój plan nauki.
							</p>
						</div>
						<Button onClick={handleComplete} disabled={completing} className="ob-btn-primary gap-2">
							{completing ? (
								<>
									<BookOpen className="h-4 w-4 animate-spin" />
									Kończę…
								</>
							) : (
								<>
									Przejdź do dashboardu
									<ChevronRight className="h-4 w-4" />
								</>
							)}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
