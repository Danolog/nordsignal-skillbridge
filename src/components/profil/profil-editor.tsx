"use client";

import { Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { StepMarketCompetencies } from "@/components/onboarding/step-market-competencies";
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
import { CAREER_PATHS } from "@/lib/db/data/career-paths";
import type {
	GroupCatalog,
	MarketCatalogItem,
	PossessionLevel,
	SelectedCompetency,
} from "@/lib/onboarding/market-catalog";

// 0.15/C1: cele kariery Z KATALOGU (career-paths.ts, jedno źródło prawdy — 23 ścieżki),
// nie lokalna hardcodowana lista. Stara lista zdryfowała („Full-stack Developer" vs
// katalogowe „Full-Stack Developer", „Cybersecurity Analyst" vs „Cybersecurity
// Specialist") — wybór zdryfowanej opcji nie przechodził exact-matchowego
// isRealCareerGoal → pusty katalog rynku i zablokowany zapis (canSave=false).
const CAREER_GOALS = CAREER_PATHS.map((p) => p.careerGoal);

interface InitialCompetency {
	name: string;
	selfAssessment: number | null;
}

export interface ProfilEditorInitial {
	university: string;
	fieldOfStudy: string;
	semester: number;
	careerGoal: string;
	syllabusText: string;
	competencies: InitialCompetency[];
}

interface ProfilEditorProps {
	initial: ProfilEditorInitial;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Prefill wyboru poziomów z zapisanych kompetencji (selfAssessment 2/3/4; inne → 3). */
function initialSelections(comps: InitialCompetency[]): Record<string, PossessionLevel> {
	const sel: Record<string, PossessionLevel> = {};
	for (const c of comps) {
		const sa = c.selfAssessment;
		sel[c.name] = sa === 2 || sa === 3 || sa === 4 ? sa : 3;
	}
	return sel;
}

export function ProfilEditor({ initial }: ProfilEditorProps) {
	const router = useRouter();
	const [profile, setProfile] = useState<ProfileData>(() => ({
		university: initial.university,
		fieldOfStudy: initial.fieldOfStudy,
		semester: String(initial.semester),
		careerGoal: initial.careerGoal,
	}));

	const isPredefinedInitialGoal = CAREER_GOALS.includes(initial.careerGoal);
	const [careerGoalSelect, setCareerGoalSelect] = useState<string>(
		isPredefinedInitialGoal ? initial.careerGoal : "custom",
	);
	const [customCareerGoal, setCustomCareerGoal] = useState<string>(
		isPredefinedInitialGoal ? "" : initial.careerGoal,
	);
	const [syllabusText, setSyllabusText] = useState(initial.syllabusText);
	const [syllabusNames, setSyllabusNames] = useState<Set<string>>(new Set());

	// Panel kompetencji rynku (jak krok 3 onboardingu).
	const [rawCatalog, setRawCatalog] = useState<MarketCatalogItem[]>([]);
	const [rawGroups, setRawGroups] = useState<GroupCatalog[]>([]);
	const [selections, setSelections] = useState<Record<string, PossessionLevel>>(() =>
		initialSelections(initial.competencies),
	);
	const [catalogLoading, setCatalogLoading] = useState(false);
	const [catalogError, setCatalogError] = useState(false);
	const [isRealGoal, setIsRealGoal] = useState(true);
	const [profileNote, setProfileNote] = useState<string | null>(null);
	const [catalogGoal, setCatalogGoal] = useState("");

	const [analyzing, setAnalyzing] = useState(false);
	const [saving, setSaving] = useState(false);

	const resolvedCareerGoal =
		careerGoalSelect === "custom" ? customCareerGoal.trim() : careerGoalSelect;

	// Katalog z naniesionym „w programie studiów" wg nazw z sylabusa.
	const catalog = useMemo(
		() =>
			rawCatalog.map((i) => ({
				...i,
				inSyllabus: i.inSyllabus || syllabusNames.has(norm(i.competencyName)),
			})),
		[rawCatalog, syllabusNames],
	);

	const loadCatalog = useCallback(async (careerGoal: string) => {
		if (!careerGoal) return;
		setCatalogLoading(true);
		setCatalogError(false);
		setCatalogGoal(careerGoal);
		try {
			const res = await fetch(
				`/api/onboarding/market-catalog?careerGoal=${encodeURIComponent(careerGoal)}`,
			);
			if (!res.ok) throw new Error("catalog_failed");
			const data = (await res.json()) as {
				isRealCareerGoal: boolean;
				items: MarketCatalogItem[];
				groups?: GroupCatalog[];
				profileNote?: string | null;
			};
			setRawCatalog(data.items);
			setRawGroups(data.groups ?? []);
			setProfileNote(data.profileNote ?? null);
			setIsRealGoal(data.isRealCareerGoal);
		} catch {
			setCatalogError(true);
		} finally {
			setCatalogLoading(false);
		}
	}, []);

	// Pobierz katalog dla aktualnego celu.
	useEffect(() => {
		if (resolvedCareerGoal && catalogGoal !== resolvedCareerGoal && !catalogLoading) {
			void loadCatalog(resolvedCareerGoal);
		}
	}, [resolvedCareerGoal, catalogGoal, catalogLoading, loadCatalog]);

	const handleSelectionChange = useCallback((name: string, level: PossessionLevel | null) => {
		setSelections((prev) => {
			const next = { ...prev };
			if (level === null) delete next[name];
			else next[name] = level;
			return next;
		});
	}, []);

	const isProfileValid =
		profile.university &&
		profile.fieldOfStudy.trim() &&
		profile.semester &&
		careerGoalSelect &&
		(careerGoalSelect !== "custom" || customCareerGoal.trim());

	const canSave =
		Boolean(isProfileValid) && isRealGoal && catalog.length > 0 && !saving && !catalogLoading;

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
			const data = (await res.json()) as { competencies: string[] };
			setSyllabusNames(new Set(data.competencies.map(norm)));
			toast.success("Sylabus przeanalizowany — kompetencje z programu oznaczone na liście.");
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
		if (!isRealGoal || catalog.length === 0) {
			toast.error("Wybierz realną ścieżkę kariery, aby wczytać kompetencje rynku.");
			return;
		}
		const selected: SelectedCompetency[] = catalog
			.filter((item) => selections[item.competencyName] !== undefined)
			.map((item) => ({
				name: item.competencyName,
				level: selections[item.competencyName],
				inSyllabus: Boolean(item.inSyllabus),
			}));

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
					competencies: selected,
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Błąd zapisu");
			}
			toast.success("Zapisano zmiany. Mapa kompetencji i analiza luk są przeliczane w tle.");
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
					Zaktualizuj dane, sylabus lub kompetencje. Po zapisie mapa kompetencji i analiza luk
					zostaną przeliczone. Paszport i ukończone projekty pozostają bez zmian.
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
						Obszar zawodowy, pod który dopasowujemy kompetencje rynku i analizę luk.
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
						Edytuj treść sylabusa i kliknij „Analizuj sylabus”, aby oznaczyć na liście kompetencje z
						Twojego programu studiów.
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
						Pełny przegląd kompetencji wymaganych przez rynek dla Twojego celu. Zaznacz poziom
						posiadania lub dodaj kolejne — bez limitu.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<StepMarketCompetencies
						careerGoal={resolvedCareerGoal}
						catalog={catalog}
						groups={rawGroups}
						selections={selections}
						onChange={handleSelectionChange}
						loading={catalogLoading}
						error={catalogError}
						onRetry={() => loadCatalog(resolvedCareerGoal)}
						isRealCareerGoal={isRealGoal}
						profileNote={profileNote}
					/>
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
