"use client";

import { Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	type CompetencyItem,
	createCompetencyItem,
	StepCompetencies,
} from "@/components/onboarding/step-competencies";
import { type ProfileData, StepProfile } from "@/components/onboarding/step-profile";
import { StepSyllabus } from "@/components/onboarding/step-syllabus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Lista celów kariery — lokalna dla edytora /profil. StepProfile NIE zbiera już celu
// (przeniesiony do Kroku 0 onboardingu, strumień E / #5), ale edycja profilu przez
// już-onboardowanego studenta musi pozwolić zmienić cel bez przechodzenia Pomocnika.
// Edytor trzyma cel w SWOIM stanie (poza ProfileData), żeby nie reaktywować selektu
// w onboardingu. (Po Becie: zmiana celu też przez Pomocnik — dług produktowy Sophii.)
const CAREER_GOALS = [
	"Data Analyst",
	"Data Scientist",
	"Frontend Developer",
	"Backend Developer",
	"Full-stack Developer",
	"UX/UI Designer",
	"Project Manager",
	"DevOps Engineer",
	"Cybersecurity Analyst",
];

export interface ProfilEditorInitial {
	university: string;
	fieldOfStudy: string;
	semester: number;
	careerGoal: string;
	syllabusText: string;
	competencies: string[];
}

interface ProfilEditorProps {
	initial: ProfilEditorInitial;
}

function buildInitialProfile(initial: ProfilEditorInitial): ProfileData {
	return {
		university: initial.university,
		fieldOfStudy: initial.fieldOfStudy,
		semester: String(initial.semester),
		// careerGoal trzymany w stanie wizarda/edytora; jego UI jest osobne (poniżej),
		// nie w StepProfile. Zsynchronizowany z lokalnym stanem celu w handleSave.
		careerGoal: initial.careerGoal,
	};
}

export function ProfilEditor({ initial }: ProfilEditorProps) {
	const router = useRouter();
	const [profile, setProfile] = useState<ProfileData>(() => buildInitialProfile(initial));
	// Cel kariery — lokalny stan edytora (poza StepProfile). select/custom jak dawniej.
	const isPredefinedInitialGoal = CAREER_GOALS.includes(initial.careerGoal);
	const [careerGoalSelect, setCareerGoalSelect] = useState<string>(
		isPredefinedInitialGoal ? initial.careerGoal : "custom",
	);
	const [customCareerGoal, setCustomCareerGoal] = useState<string>(
		isPredefinedInitialGoal ? "" : initial.careerGoal,
	);
	const [syllabusText, setSyllabusText] = useState(initial.syllabusText);
	const [competencies, setCompetencies] = useState<CompetencyItem[]>(() =>
		initial.competencies.map((name) => createCompetencyItem(name)),
	);
	const [analyzing, setAnalyzing] = useState(false);
	const [saving, setSaving] = useState(false);

	const resolvedCareerGoal =
		careerGoalSelect === "custom" ? customCareerGoal.trim() : careerGoalSelect;

	const filledCompetencies = competencies.filter((c) => c.name.trim() !== "");

	const isProfileValid =
		profile.university &&
		profile.fieldOfStudy.trim() &&
		profile.semester &&
		careerGoalSelect &&
		(careerGoalSelect !== "custom" || customCareerGoal.trim());

	const canSave = Boolean(isProfileValid) && filledCompetencies.length >= 5 && !saving;

	const handleAnalyze = async () => {
		if (syllabusText.trim().length < 100) {
			toast.error("Sylabus musi mieć co najmniej 100 znaków.");
			return;
		}
		if (!resolvedCareerGoal) {
			toast.error("Najpierw uzupełnij cel kariery w karcie „Cel kariery”.");
			return;
		}
		setAnalyzing(true);
		try {
			const res = await fetch("/api/syllabus/parse", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ syllabusText, careerGoal: resolvedCareerGoal }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Błąd analizy");
			}
			const data = await res.json();
			setCompetencies((data.competencies as string[]).map((name) => createCompetencyItem(name)));
			toast.success("Lista kompetencji zaktualizowana przez AI.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Nie udało się przeanalizować sylabusa.");
		} finally {
			setAnalyzing(false);
		}
	};

	const handleSave = async () => {
		if (!isProfileValid) {
			toast.error("Wypełnij wszystkie wymagane pola w sekcji Profil.");
			return;
		}
		if (filledCompetencies.length < 5) {
			toast.error("Dodaj co najmniej 5 kompetencji.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/onboarding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					university: profile.university,
					fieldOfStudy: profile.fieldOfStudy,
					semester: Number(profile.semester),
					careerGoal: resolvedCareerGoal,
					syllabusText,
					competencies: filledCompetencies.map((c) => c.name.trim()),
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Błąd zapisu");
			}
			toast.success("Zapisano zmiany. Skill Map i Gap Analysis są regenerowane w tle.");
			router.push("/dashboard");
			router.refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Nie udało się zapisać danych.");
			setSaving(false);
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 md:py-10">
			<header className="space-y-1.5">
				<h1 className="font-heading text-2xl font-extrabold md:text-3xl">Twój profil</h1>
				<p className="text-sm text-muted-foreground">
					Zaktualizuj swoje dane, sylabus lub listę kompetencji. Po zapisie Skill Map oraz Gap
					Analysis zostaną przeliczone od nowa. Twój Paszport, ukończone projekty i Verified
					Receipts pozostaną bez zmian.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Dane podstawowe</CardTitle>
					<CardDescription>Uczelnia, kierunek i semestr.</CardDescription>
				</CardHeader>
				<CardContent>
					<StepProfile data={profile} onChange={setProfile} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Cel kariery</CardTitle>
					<CardDescription>
						Obszar zawodowy, pod który dopasowujemy analizę luk. Możesz go tu zmienić.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-5">
						<div className="space-y-1.5">
							<Label>
								Cel kariery <span className="text-destructive">*</span>
							</Label>
							<Select
								value={careerGoalSelect}
								onValueChange={(v) => {
									setCareerGoalSelect(v);
									if (v !== "custom") setCustomCareerGoal("");
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Wybierz..." />
								</SelectTrigger>
								<SelectContent>
									{CAREER_GOALS.map((g) => (
										<SelectItem key={g} value={g}>
											{g}
										</SelectItem>
									))}
									<SelectItem value="custom">Inne (wpisz)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						{careerGoalSelect === "custom" && (
							<div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
								<Label>
									Twój cel kariery <span className="text-destructive">*</span>
								</Label>
								<Input
									value={customCareerGoal}
									onChange={(e) => setCustomCareerGoal(e.target.value)}
									placeholder="Wpisz swój cel kariery..."
									autoFocus
								/>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Sylabus</CardTitle>
					<CardDescription>
						Edytuj treść sylabusa i kliknij „Analizuj sylabus”, aby AI ponownie wyciągnęło listę
						kompetencji.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<StepSyllabus
						syllabusText={syllabusText}
						onSyllabusChange={setSyllabusText}
						onAnalyze={handleAnalyze}
						loading={analyzing}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Kompetencje</CardTitle>
					<CardDescription>
						Dodaj, usuń lub popraw nazwy kompetencji. Minimum 5 wpisów.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<StepCompetencies competencies={competencies} onChange={setCompetencies} />
				</CardContent>
			</Card>

			<div className="flex items-center justify-end gap-3 pt-2">
				<Button variant="ghost" onClick={() => router.push("/dashboard")} disabled={saving}>
					Anuluj
				</Button>
				<Button onClick={handleSave} disabled={!canSave} className="ob-btn-accent gap-2">
					{saving ? (
						<>
							<Sparkles className="h-4 w-4 animate-spin" />
							Zapisywanie…
						</>
					) : (
						<>
							<Save className="h-4 w-4" />
							Zapisz zmiany
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
