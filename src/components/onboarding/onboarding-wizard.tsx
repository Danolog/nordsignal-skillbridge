"use client";

import { BookOpen, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CareerHelperFlow } from "@/components/career-helper/career-helper-flow";
import { Button } from "@/components/ui/button";
import {
	type CompetencyItem,
	createCompetencyItem,
	MIN_COMPETENCIES,
	StepCompetencies,
} from "./step-competencies";
import { type ProfileData, StepProfile } from "./step-profile";
import { StepSelfAssessment } from "./step-self-assessment";
import { StepSyllabus } from "./step-syllabus";

/**
 * Wizard onboardingu: 6 kroków (Krok 0 dodany w strumieniu E / #5).
 * Krok 0: Cel kariery — CareerHelperFlow osadzony (embedded); ustala careerGoal
 *   w pamięci (bez select-path — nowy student nie ma jeszcze rekordu; spec §1.3/§3.1).
 * Krok 1–3: Profil (BEZ celu) / Sylabus / Kompetencje — zbieranie danych i zapis profilu.
 * Krok 4: Samoocena (StepSelfAssessment, B4) — ocena kompetencji po ich zapisie.
 * Krok 5: Wnioski — przekierowanie do dashboardu (brak osobnego ekranu w Becie).
 *
 * Spec: docs/product/skillbridge-e-pomocnik-krok0-spec-v0.1.md (Krok 0),
 *       docs/design/skillbridge-panel-studenta-b3-b4-b5-spec.md §1/§3 (kroki 1–5).
 * Krok 4 wchodzi po handleSubmit (krok 3) — kompetencje muszą być w bazie
 * zanim GET /api/self-assessment je pobierze. Numeracja kroków: 0–5 (6 punktów na pasku);
 * careerGoal trzymany w pamięci od Kroku 0, persystowany dopiero w POST /api/onboarding.
 */
const STEPS = [
	{ label: "Cel kariery", num: 0 },
	{ label: "Profil", num: 1 },
	{ label: "Sylabus", num: 2 },
	{ label: "Kompetencje", num: 3 },
	{ label: "Samoocena", num: 4 },
	{ label: "Wnioski", num: 5 },
];

const LAST_STEP = 5;

interface OnboardingWizardProps {
	user: { id: string; name: string; email: string };
}

export function OnboardingWizard({ user: _user }: OnboardingWizardProps) {
	const router = useRouter();
	const [step, setStep] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const [analyzing, setAnalyzing] = useState(false);

	// careerGoal trzymany w pamięci od Kroku 0 (Pomocnik). Nie ma już opcji „custom"
	// ani customCareerGoal — Pomocnik zwraca gotową etykietę obszaru zawodowego (string).
	const [profile, setProfile] = useState<ProfileData>({
		university: "",
		fieldOfStudy: "",
		semester: "",
		careerGoal: "",
	});
	const [syllabusText, setSyllabusText] = useState("");
	const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
	const [competencies, setCompetencies] = useState<CompetencyItem[]>([]);

	// Validation
	// Krok 0: cel kariery musi być ustawiony (Pomocnik) zanim wejdzie się w Profil.
	const isStep0Valid = Boolean(profile.careerGoal);
	// Krok 1 (Profil): bez celu kariery — uczelnia + kierunek + semestr.
	const isStep1Valid = Boolean(
		profile.university && profile.fieldOfStudy.trim() && profile.semester,
	);

	const filledCompetencyCount = competencies.filter((c) => c.name.trim()).length;
	const isStep3Valid = filledCompetencyCount >= MIN_COMPETENCIES;

	const goToStep = (target: number) => {
		// Wejście do Profilu (1) wymaga ustalonego celu w Kroku 0.
		if (target === 1 && !isStep0Valid) {
			toast.error("Najpierw wybierz cel kariery — Pomocnik Ci w tym pomoże.");
			return;
		}
		// Wejście do Sylabusa (2) wymaga kompletnego Profilu.
		if (target === 2 && !isStep1Valid) {
			toast.error("Wypełnij wszystkie wymagane pola.");
			return;
		}
		setStep(target);
	};

	// Krok 0 → Krok 1: Pomocnik zwrócił etykietę celu. Zapisujemy w pamięci i wchodzimy w Profil.
	const handleCareerGoalChosen = (careerLabel: string) => {
		setProfile((prev) => ({ ...prev, careerGoal: careerLabel }));
		setStep(1);
	};

	// AI analysis — dwie pełnoprawne ścieżki (ADR-007 (b)): plik PDF → multipart,
	// tekst ręczny → JSON. Walidacja klienta: „albo plik, albo tekst ≥ 100 znaków".
	const handleAnalyze = async () => {
		const hasFile = syllabusFile !== null;
		const hasText = syllabusText.trim().length >= 100;
		if (!hasFile && !hasText) {
			toast.error("Wgraj plik PDF albo wklej co najmniej 100 znaków sylabusa.");
			return;
		}
		setAnalyzing(true);
		try {
			let res: Response;
			if (hasFile && syllabusFile) {
				// Multipart: przeglądarka sama ustawi Content-Type (multipart/form-data + boundary)
				// — NIE ustawiamy go ręcznie, inaczej zniszczymy boundary.
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
			const data = await res.json();
			setCompetencies((data.competencies as string[]).map((name) => createCompetencyItem(name)));
			setStep(3);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Nie udało się przeanalizować sylabusa.");
		} finally {
			setAnalyzing(false);
		}
	};

	// Submit
	const handleSubmit = async () => {
		const filledNames = competencies.filter((c) => c.name.trim()).map((c) => c.name.trim());
		if (filledNames.length < MIN_COMPETENCIES) {
			toast.error(`Pracodawcy oczekują min. ${MIN_COMPETENCIES} kompetencji.`);
			return;
		}
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
					competencies: filledNames,
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
				// Mimo błędu generacji Skill Map przechodzimy do samooceny (krok 4)
				// — kompetencje są zapisane, samoocena może działać.
				setStep(4);
			} else {
				toast.success("Paszport Kompetencji utworzony!");
				// Przejście do kroku 4 — Samoocena (B4, spec §1/§3).
				// Kompetencje są już w bazie — GET /api/self-assessment może je pobrać.
				setStep(4);
			}
			setSubmitting(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Nie udało się zapisać danych.");
			setSubmitting(false);
		}
	};

	if (submitting) {
		return (
			<div className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-5 py-10 gap-6">
				<div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
					<BookOpen className="h-8 w-8 text-indigo-500 animate-pulse" />
				</div>
				<div className="text-center max-w-md">
					<h2 className="font-heading text-2xl font-extrabold mb-2">Analizujemy Twój profil…</h2>
					<p className="text-sm text-muted-foreground">
						AI porównuje Twoje kompetencje z wymaganiami rynku i buduje Skill Map. To zajmie 15-30
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
					{/* Line — 6 kroków (0–5), progres = step / LAST_STEP. Krok 0 = 0% wypełnienia. */}
					<div className="absolute left-6 right-6 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-muted">
						<div
							className="ob-progress-fill h-full rounded-full transition-all duration-500"
							style={{ width: `${(step / LAST_STEP) * 100}%` }}
						/>
					</div>
					{/* Dots — numer wyświetlany 1-based (idx+1), żeby pasek nie pokazywał „0". */}
					{STEPS.map((s, idx) => (
						<div
							key={s.num}
							className={`ob-step-dot relative z-10 flex h-12 w-12 items-center justify-center rounded-full font-mono text-base font-bold transition-all duration-400 ${
								s.num < step
									? "bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.3)]"
									: s.num === step
										? "ob-step-active text-white shadow-[0_0_24px_rgba(99,102,241,0.3)] scale-110"
										: "border-2 border-muted bg-background text-muted-foreground"
							}`}
						>
							{s.num < step ? <Check className="h-5 w-5" /> : idx + 1}
						</div>
					))}
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
				{/* Step 0 — Cel kariery (Pomocnik osadzony). Spec §3.1/§4.
				    Tryb embedded: brak select-path; cel płynie w pamięci (handleCareerGoalChosen).
				    Student wybiera obszar — AI nie narzuca (human-in-the-loop, CLAUDE.md §7). */}
				{step === 0 && (
					<>
						<h2 className="font-heading text-2xl font-extrabold">Zacznijmy od celu</h2>
						<p className="mb-8 mt-1.5 text-sm text-muted-foreground">
							Pomocnik zada Ci kilka pytań i pomoże nazwać obszar zawodowy, który do Ciebie pasuje.
							Ty wybierasz — to nie test.
						</p>
						<CareerHelperFlow onCareerGoalChosen={handleCareerGoalChosen} />
					</>
				)}

				{/* Step 1 */}
				{step === 1 && (
					<>
						<h2 className="font-heading text-2xl font-extrabold">Opowiedz nam o sobie</h2>
						<p className="mb-8 mt-1.5 text-sm text-muted-foreground">
							Te informacje pomogą nam spersonalizować Twój Paszport Kompetencji i analizę luk.
						</p>
						{/* Mikrokopia HITL: cel ustalony w Kroku 0 jest widoczny i edytowalny (powrót). */}
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
								disabled={!isStep1Valid}
								className="ob-btn-primary gap-2"
							>
								Dalej
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</>
				)}

				{/* Step 2 */}
				{step === 2 && (
					<>
						<h2 className="font-heading text-2xl font-extrabold">Wgraj swój sylabus</h2>
						<p className="mb-8 mt-1.5 text-sm text-muted-foreground">
							Wklej treść sylabusa lub prześlij plik PDF. Nasza AI przeanalizuje go i wyciągnie
							Twoje kompetencje.
						</p>
						<StepSyllabus
							syllabusText={syllabusText}
							onSyllabusChange={setSyllabusText}
							file={syllabusFile}
							onFileChange={setSyllabusFile}
							onAnalyze={handleAnalyze}
							loading={analyzing}
						/>
						{!analyzing && (
							<div className="mt-6">
								<Button variant="ghost" onClick={() => goToStep(1)} className="gap-2">
									<ChevronLeft className="h-4 w-4" />
									Wstecz
								</Button>
							</div>
						)}
					</>
				)}

				{/* Step 3 */}
				{step === 3 && (
					<>
						<h2 className="font-heading text-2xl font-extrabold">Twoje kompetencje</h2>
						<p className="mb-8 mt-1.5 text-sm text-muted-foreground">
							Przejrzyj wynik analizy AI. Możesz edytować, usuwać i dodawać kompetencje przed
							zapisaniem.
						</p>
						<StepCompetencies competencies={competencies} onChange={setCompetencies} />
						<div className="mt-8 flex items-center justify-between">
							<Button variant="ghost" onClick={() => goToStep(2)} className="gap-2">
								<ChevronLeft className="h-4 w-4" />
								Wstecz
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={!isStep3Valid || submitting}
								className="ob-btn-accent gap-2"
								aria-describedby={!isStep3Valid ? "competencies-threshold-msg" : undefined}
								title={
									!isStep3Valid
										? `Pracodawcy oczekują min. ${MIN_COMPETENCIES} kompetencji.`
										: undefined
								}
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

				{/* Step 4 — Samoocena (B4, spec §3).
				    StepSelfAssessment zarządza własnym ładowaniem i autosave (GET/PATCH).
				    onAdvance: advance 4→5 powiódł się → krok 5 (Wnioski).
				    onSkip: student chce ocenić później → krok 5 (Wnioski). */}
				{step === 4 && (
					<StepSelfAssessment onAdvance={() => setStep(5)} onSkip={() => setStep(5)} />
				)}

				{/* Step 5 — Wnioski (OUT Beta: brak osobnego ekranu).
				    Spec §3.4 S8: przejście do kroku 5 onboardingu (Wnioski).
				    W Becie krok 5 = bezpośredni redirect do dashboardu.
				    TODO: gdy spec §B5 "Moja droga" zostanie wdrożony, krok 5 zamieni się
				    w pełny ekran Wniosków (Sophia/Jack w następnym sprincie). */}
				{step === 5 && (
					<div className="flex flex-col items-center gap-6 py-4 text-center">
						<div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
							<Check className="h-8 w-8 text-emerald-500" />
						</div>
						<div className="max-w-sm">
							<h2 className="font-heading text-2xl font-extrabold mb-2">Profil gotowy!</h2>
							<p className="text-sm text-muted-foreground">
								Twój Paszport Kompetencji jest gotowy. Możesz teraz przeglądać projekty i rozwijać
								swoje kompetencje.
							</p>
						</div>
						<Button onClick={() => router.push("/dashboard")} className="ob-btn-primary gap-2">
							Przejdź do dashboardu
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
