"use client";

import { BookOpen, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CareerHelperFlow } from "@/components/career-helper/career-helper-flow";
import {
	type PlacementSummaryViewModel,
	toPlacementSummaryViewModel,
} from "@/components/curriculum/placement-summary-vm";
import { Button } from "@/components/ui/button";
import type { AssessmentResult } from "@/lib/assessment/types";
import {
	annotateWithSyllabus,
	type GroupCatalog,
	type MarketCatalogItem,
	type PossessionLevel,
	type SelectedCompetency,
} from "@/lib/onboarding/market-catalog";
import { CareerPathPicker } from "./career-path-picker";
import { type DiagnosisOutcome, type DiagnosisQuestion, StepDiagnosis } from "./step-diagnosis";
import { StepMarketCompetencies } from "./step-market-competencies";
import { type ProfileData, StepProfile } from "./step-profile";
import { StepSyllabus } from "./step-syllabus";
import { StepWnioski } from "./step-wnioski";

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
 *   POST /api/onboarding niesie competencies jako { name, level, inSyllabus }[]
 *   (poziom = samoocena 2/3/4), min 0. `marketPercentage` wyprowadza serwer z katalogu
 *   (ADR-021, D4) — klient go nie wysyła. Patrz src/lib/onboarding/market-catalog.ts.
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
	/**
	 * G („zmień kierunek") — samoocena z POPRZEDNIEGO celu (nazwa → poziom). Przy
	 * wejściu na krok 3 nowego celu zasiewamy wybór dla nazw obecnych w nowym
	 * katalogu (część wspólna umiejętności), żeby student nie oceniał od zera tego,
	 * czego się nie „od-uczył" (np. SQL, Git). Trzymane ODRĘBNIE od `selections`,
	 * bo `handleCareerGoalChosen` czyści `selections` przy zmianie celu.
	 */
	carryoverSelfAssessments?: Record<string, PossessionLevel>;
	/**
	 * A5/1.12: flaga diagnosticAssessment (czytana server-side w page.tsx).
	 * true → krok 3 w trybie binarnym + test adaptacyjny zamiast samooceny;
	 * false → kreator dokładnie jak dotąd (zero zmian).
	 */
	diagnosticEnabled?: boolean;
	/** 1.17: flaga placementTracking (server-side) — karta zgody w Wnioskach. */
	placementEnabled?: boolean;
}

export function OnboardingWizard({
	user: _user,
	initialStep = 0,
	initialData,
	carryoverSelfAssessments,
	diagnosticEnabled = false,
	placementEnabled = false,
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
	// Widok grupowy (Partia 5, C2) — warstwa prezentacji nad płaskim katalogiem; pokrycie
	// liczy się DALEJ z płaskiego `catalog`. Endpoint zwraca `groups[]` obok `items[]`.
	const [rawGroups, setRawGroups] = useState<GroupCatalog[]>([]);
	// ETAP H: adnotacja-zastrzeżenie profilu ścieżki (etykieta nagłówka kroku 3; null = brak).
	const [profileNote, setProfileNote] = useState<string | null>(null);
	const [catalogGoal, setCatalogGoal] = useState<string | null>(null);
	const [catalogLoading, setCatalogLoading] = useState(false);
	const [catalogError, setCatalogError] = useState(false);
	const [isRealGoal, setIsRealGoal] = useState(true);

	// Wybór studenta: nazwa kompetencji → poziom posiadania (2/3/4). Brak klucza = Brak = luka.
	// W trybie diagnozy (1.12) wartość jest MARKEREM zaznaczenia do czasu pomiaru;
	// po teście nadpisują ją poziomy zmierzone (>=2; oblane wypadają = luka).
	const [selections, setSelections] = useState<Record<string, PossessionLevel>>(
		initialData?.selections ?? {},
	);

	// ── A5/1.12: stan diagnozy (za flagą) ────────────────────────────────────
	// Aktywna sesja testu (render pod-widoku w kroku 3). null = lista zaznaczeń.
	const [diagnosis, setDiagnosis] = useState<{
		sessionId: string;
		total: number;
		question: DiagnosisQuestion | null;
		uncovered: string[];
	} | null>(null);
	// Wynik ukończonego testu — źródło poziomów dla POST (sessionId) i panelu Wniosków.
	// 1E.7 L6: obok wyniku wieziemy kontrakt sekcji „Po diagnozie" (§12.8). `null` =
	// sekcja nie istnieje. Żyje w stanie kreatora tak samo jak wynik — i tak samo
	// nie przeżywa odświeżenia strony (§12.7 pkt 6, decyzja świadoma: powodów dziury
	// nie utrwalamy, więc trwałym nośnikiem jest odznaka na drabinie, nie ten ekran).
	const [diagnosisOutcome, setDiagnosisOutcome] = useState<{
		sessionId: string;
		result: AssessmentResult;
		placement: PlacementSummaryViewModel | null;
	} | null>(null);
	// 422 ze startu (bank nie pokrywa ścieżki) → jawny fallback do klasycznej samooceny.
	const [diagnosisFallback, setDiagnosisFallback] = useState(false);
	const [startingDiagnosis, setStartingDiagnosis] = useState(false);
	// N2′ — rozwidlenie „zero zaznaczeń" otwarte. true = zamiast wiersza akcji krok
	// pokazuje DWA jawne wyjścia (dalej bez testu / wróć i zaznacz). Nie jest to
	// ostrzeżenie do przeczytania: dopóki student nie wybierze, krok stoi.
	const [noSelectionFork, setNoSelectionFork] = useState(false);
	// Tryb diagnozy aktywny: flaga ON i bank nie odmówił pokrycia tej ścieżki.
	const diagnosticMode = diagnosticEnabled && !diagnosisFallback;

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
	const loadCatalog = useCallback(
		async (careerGoal: string) => {
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
					groups?: GroupCatalog[];
					profileNote?: string | null;
				};
				setRawCatalog(data.items);
				// Brak `groups` (starsza odpowiedź / cel nierealny) → [] → krok pokaże płaską listę.
				setRawGroups(data.groups ?? []);
				setProfileNote(data.profileNote ?? null);
				setIsRealGoal(data.isRealCareerGoal);
				// G — carryover: zasiej wybór z poprzedniego celu dla nazw obecnych w NOWYM
				// katalogu. Dopasowanie znormalizowane (trim+lower, jak deriveGaps). Tylko gdy
				// wybór pusty — nie nadpisujemy ręcznych zmian usera ani wznawianego onboardingu.
				if (carryoverSelfAssessments && Object.keys(carryoverSelfAssessments).length > 0) {
					const norm = (s: string) => s.trim().toLowerCase();
					const byNorm = new Map(
						Object.entries(carryoverSelfAssessments).map(([n, lvl]) => [norm(n), lvl]),
					);
					const seeded: Record<string, PossessionLevel> = {};
					for (const item of data.items) {
						const lvl = byNorm.get(norm(item.competencyName));
						if (lvl) seeded[item.competencyName] = lvl;
					}
					if (Object.keys(seeded).length > 0) {
						setSelections((prev) => (Object.keys(prev).length === 0 ? seeded : prev));
					}
				}
			} catch {
				setCatalogError(true);
			} finally {
				setCatalogLoading(false);
			}
		},
		[carryoverSelfAssessments],
	);

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
				setRawGroups([]);
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
		// N2′: rozwidlenie mówi „nic nie zaznaczono". Każda zmiana zaznaczeń może to
		// zdanie unieważnić, więc panel znika — zamiast wisieć i kłamać o stanie listy.
		if (noSelectionFork) setNoSelectionFork(false);
		// Zmiana zaznaczeń unieważnia trwający/ukończony test (1.12) — pomiar
		// dotyczył innego zestawu; serwer i tak wznowi/odrzuci po odcisku wejścia.
		if (diagnosis || diagnosisOutcome) {
			setDiagnosis(null);
			setDiagnosisOutcome(null);
		}
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

	// ── A5/1.12: start/wznowienie testu adaptacyjnego (tryb diagnozy) ───────
	const startDiagnosis = async () => {
		const names = Object.keys(selections);
		if (names.length === 0) {
			// ── N2′ — JEDYNY NOŚNIK REGUŁY „zero zaznaczeń nie przechodzi samo" ──
			// Dawniej stało tu `await runSubmit()`: przy zerze zaznaczeń ten sam
			// przycisk, w tym samym miejscu, po cichu przenosił do Wniosków — student
			// mijał JEDYNY pomiar, jaki produkt ma, nie dowiadując się, że go mija
			// (przejazd Darka 2026-08-10: „gdzie miałem zobaczyć ekran diagnozy").
			// Teraz krok się zatrzymuje i pyta. Reguła ma tu DOKŁADNIE JEDEN nośnik
			// (CLAUDE.md v1.17): przycisk kroku 3 nie zna warunku `length === 0` i nie
			// wolno go tam powielić — inaczej powstaje druga, cicha droga wyjścia.
			setNoSelectionFork(true);
			return;
		}
		setStartingDiagnosis(true);
		try {
			const res = await fetch("/api/assessment/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				// careerGoal Z KREATORA — w trybie „zmień kierunek" DB trzyma stary cel
				// aż do POST /api/onboarding; sesja musi nieść ten sam cel co zapis.
				body: JSON.stringify({ competencyNames: names, careerGoal: profile.careerGoal }),
			});
			if (res.status === 422) {
				// Bank nie pokrywa tej ścieżki (partia 1 = DS) → jawny fallback do samooceny.
				setDiagnosisFallback(true);
				toast.info(
					"Dla tej ścieżki nie mamy jeszcze pytań testowych — oceń swoje poziomy samodzielnie.",
				);
				return;
			}
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(data.error || "Nie udało się rozpocząć testu.");
			}
			const data = (await res.json()) as {
				sessionId: string;
				total: number;
				question: DiagnosisQuestion | null;
				uncovered: string[];
			};
			setDiagnosisOutcome(null);
			setDiagnosis({
				sessionId: data.sessionId,
				total: data.total,
				question: data.question,
				uncovered: data.uncovered,
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Nie udało się rozpocząć testu.");
		} finally {
			setStartingDiagnosis(false);
		}
	};

	// Po teście (+ mini-samoocenie uncovered): poziomy zmierzone nadpisują markery
	// zaznaczeń (oblane, poziom 1, WYPADAJĄ z selections → luka we Wnioskach — to
	// samo widzi serwer przez statusy), po czym zapis z sessionId.
	const handleDiagnosisFinished = async (outcome: DiagnosisOutcome) => {
		const measured: Record<string, PossessionLevel> = {};
		for (const [name, level] of Object.entries(outcome.result.competencies)) {
			if (level >= 2) measured[name] = level as PossessionLevel;
		}
		const nextSelections = { ...measured, ...outcome.uncoveredLevels };
		setSelections(nextSelections);
		setDiagnosisOutcome({
			sessionId: diagnosis?.sessionId ?? "",
			result: outcome.result,
			// Kontrakt serwera → model widoku Mili. Jedyne miejsce tej zamiany
			// (patrz `placement-summary-vm.ts`); adapter zwraca `null` dla każdego
			// kształtu, którego nie da się wyrenderować bez zgadywania.
			placement: toPlacementSummaryViewModel(outcome.placement),
		});
		setDiagnosis(null);
		await runSubmit({
			diagnosticSessionId: diagnosis?.sessionId,
			measuredNames: Object.keys(outcome.result.competencies),
			uncoveredLevels: outcome.uncoveredLevels,
		});
	};

	// Submit kroku 3 — POST /api/onboarding (delete+insert competencies z poziomem,
	// deterministyczne luki + Skill Map). Próg „min 5" zniesiony — 0 dozwolone (D5).
	// Wariant diagnozy (1.12): wpisy zmierzone idą BEZ poziomu (serwer bierze
	// poziomy — także 1 — z result_json sesji; klientowi nie ufa), uncovered
	// z samooceną z mini-kroku.
	const runSubmit = async (diagnostic?: {
		diagnosticSessionId?: string;
		measuredNames: string[];
		uncoveredLevels: Record<string, PossessionLevel>;
	}) => {
		const byName = new Map(catalog.map((item) => [item.competencyName, item]));
		let selected: SelectedCompetency[];
		if (diagnostic?.diagnosticSessionId) {
			const measuredEntries = diagnostic.measuredNames.flatMap((name) => {
				const item = byName.get(name);
				return item
					? [
							{
								name,
								inSyllabus: Boolean(item.inSyllabus),
							},
						]
					: [];
			});
			const uncoveredEntries = Object.entries(diagnostic.uncoveredLevels).flatMap(
				([name, level]) => {
					const item = byName.get(name);
					return item
						? [
								{
									name,
									level,
									inSyllabus: Boolean(item.inSyllabus),
								},
							]
						: [];
				},
			);
			selected = [...measuredEntries, ...uncoveredEntries];
		} else {
			selected = catalog
				.filter((item) => selections[item.competencyName] !== undefined)
				.map((item) => ({
					name: item.competencyName,
					level: selections[item.competencyName],
					inSyllabus: Boolean(item.inSyllabus),
				}));
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
					competencies: selected,
					...(diagnostic?.diagnosticSessionId
						? { diagnosticSessionId: diagnostic.diagnosticSessionId }
						: {}),
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Błąd zapisu");
			}
			const data = (await res.json()) as { aiGenerationFailed?: boolean };
			if (data.aiGenerationFailed) {
				toast.warning(
					"Profil zapisany, ale generacja mapy kompetencji nie powiodła się. Spróbuj ponownie ze strony mapy kompetencji.",
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
	// `target` parametryzuje cel nawigacji: główne CTA → /dashboard (z odpowiedzi),
	// miękkie linki Wniosków (analiza luk / projekt) → swój cel, ale ZAWSZE po domknięciu
	// (inaczej `onboardingCompleted` zostałby false i brama wrzuciłaby usera znów w kreator).
	const handleComplete = async (target?: string) => {
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
			router.push(target ?? data.redirect ?? "/dashboard");
		} catch {
			toast.error("Nie udało się domknąć onboardingu. Spróbuj ponownie.");
			setCompleting(false);
		}
	};

	if (submitting) {
		return (
			<div className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-5 py-10 gap-6">
				<div className="w-16 h-16 rounded-full bg-ed-badge-bg flex items-center justify-center">
					<BookOpen className="h-8 w-8 text-ed-amber-text animate-pulse" />
				</div>
				<div className="text-center max-w-md">
					<h2 className="font-heading text-2xl font-extrabold mb-2">Budujemy Twój Paszport…</h2>
					<p className="text-sm text-muted-foreground">
						Porównujemy Twoje kompetencje z wymaganiami rynku i budujemy mapę kompetencji. To zajmie
						15-30 sekund.
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
										? "bg-ed-amber text-ed-ink"
										: isCurrent
											? "ob-step-active text-ed-ink scale-110"
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
									? "text-ed-amber-text"
									: s.num === step
										? "font-semibold text-ed-amber-text"
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

				{/* Step 3 — Kompetencje + poziom (scalone, z rynku). Element 2/4/5.
				    A5/1.12 (tryb diagnozy): zaznaczenia binarne → test adaptacyjny
				    (pod-widok StepDiagnosis) zamiast deklaracji poziomów. */}
				{step === 3 && diagnosticMode && diagnosis ? (
					<>
						<h2 className="font-heading text-2xl font-extrabold">Sprawdź się</h2>
						<p className="mb-6 mt-1.5 text-sm text-muted-foreground">
							Krótki test mierzy poziom zaznaczonych kompetencji — 2 pytania na każdą. Wyniki
							zobaczysz na końcu; w trakcie nie zdradzamy odpowiedzi.
						</p>
						<StepDiagnosis
							key={diagnosis.sessionId}
							sessionId={diagnosis.sessionId}
							total={diagnosis.total}
							initialQuestion={diagnosis.question}
							uncoveredNames={diagnosis.uncovered}
							onFinished={handleDiagnosisFinished}
							onRestart={startDiagnosis}
							onBack={() => setDiagnosis(null)}
						/>
					</>
				) : step === 3 ? (
					<>
						<h2 className="font-heading text-2xl font-extrabold">Twoje kompetencje</h2>
						{/* N2a — ZAPOWIEDŹ TESTU PRZED KLIKNIĘCIEM (Sophia §3, wiersz N2a: „jedno
						    zdanie, że po zatwierdzeniu przyjdzie krótki test zaznaczonych pozycji").
						    Zdanie środkowe realizuje ten zapis; brzmienie MOJE — Sophia podała kształt,
						    nie tekst wiążący (inaczej niż przy N2′, gdzie tekst jest jej 1:1).
						    ŚWIADOMIE BEZ LICZBY PYTAŃ: `total` = 2 × kompetencje POKRYTE BANKIEM
						    (start/route.ts:159), nie zaznaczone — „2 pytania na każdą zaznaczoną"
						    byłoby obietnicą bez pokrycia przy zaznaczeniach spoza banku (te idą do
						    mini-samooceny). ŚWIADOMIE BEZ zdania o zerze zaznaczeń: ten przypadek
						    ma teraz swój nośnik w rozwidleniu N2′ (tekst Sophii 1:1) i powtórzenie
						    go tutaj dałoby dwa nośniki jednej reguły. */}
						<p className="mb-6 mt-1.5 text-sm text-muted-foreground">
							{diagnosticMode
								? "Zaznacz, z czym masz styczność — poziom zmierzy krótki test, nie deklaracja. Po zatwierdzeniu tego kroku przyjdzie krótki test zaznaczonych pozycji. Czego nie zaznaczysz, zostaje Twoim planem nauki."
								: "Zaznacz przy każdej umiejętności poziom, jaki masz. Czego nie zaznaczysz, zostaje Twoim planem nauki. Nie musisz zaznaczać nic — możesz zacząć od zera."}
						</p>
						<StepMarketCompetencies
							careerGoal={profile.careerGoal}
							catalog={catalog}
							groups={rawGroups}
							selections={selections}
							onChange={handleSelectionChange}
							loading={catalogLoading}
							error={catalogError}
							onRetry={() => loadCatalog(profile.careerGoal)}
							isRealCareerGoal={isRealGoal}
							profileNote={profileNote}
							binaryMode={diagnosticMode}
						/>
						{/* N2′ — ROZWIDLENIE PRZY ZERZE ZAZNACZEŃ (tryb diagnozy).
						    Zastępuje wiersz akcji, więc oba wyjścia stoją dokładnie tam, gdzie
						    przed chwilą był przycisk — student nie musi niczego szukać ani
						    przewijać. To jest WYBÓR, nie komunikat: krok nie idzie dalej sam. */}
						{noSelectionFork ? (
							<section
								className="mt-8 rounded-lg border border-ed-amber bg-ed-badge-bg p-4"
								aria-labelledby="ob-brak-zaznaczen-tytul"
							>
								{/* Nagłówek — MÓJ, nie Sophii: jej §3 N2′ nie przewiduje nagłówka sekcji.
								    Dołożyłem go wyłącznie jako nośnik `aria-labelledby` (sekcja bez
								    nazwy nie ma się czym przedstawić czytnikowi ekranu). Do skreślenia
								    albo przepisania na jej słowo — wtedy zostaje sam `aria-label`. */}
								<h3 id="ob-brak-zaznaczen-tytul" className="font-heading text-base font-bold">
									Nie zaznaczono żadnej kompetencji
								</h3>
								{/* TEKST SOPHII, 1:1 — `scratchpad/gdzie-jest-diagnoza-sophia.md` §3, wiersz
								    N2′ („Tekst mój, 1:1"). Nie parafrazować przy refaktorze: to mikrocopy
								    wiążące dosłownie, nie propozycja. Wcześniej stał tu mój własny akapit
								    — zdjęty, bo tekst wiążący już istniał. */}
								<p className="mt-1.5 text-sm text-muted-foreground">
									Nic nie zaznaczyłeś, więc nie mamy czego zmierzyć — zaczniesz od podstaw. Zaznacz
									cokolwiek, żeby test sprawdził Twój poziom.
								</p>
								<div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
									<Button
										variant="ghost"
										autoFocus
										onClick={() => setNoSelectionFork(false)}
										className="gap-2"
									>
										<ChevronLeft className="h-4 w-4" />
										Wróć i zaznacz
									</Button>
									<Button
										onClick={() => {
											setNoSelectionFork(false);
											void runSubmit();
										}}
										disabled={submitting}
										className="ob-btn-accent gap-2"
									>
										<Check className="h-4 w-4" />
										Przejdź dalej bez testu
									</Button>
								</div>
							</section>
						) : (
							<div className="mt-8 flex items-center justify-between">
								<Button variant="ghost" onClick={() => goToStep(2)} className="gap-2">
									<ChevronLeft className="h-4 w-4" />
									Wstecz
								</Button>
								{/* MUST-FIX (Leo): blokuj domknięcie pustym paszportem + nierealnym celem.
							    Pusty katalog / cel spoza 23 ścieżek → krok pokazuje bursztynowy
							    komunikat „wróć i wybierz realną ścieżkę", a submit jest WYŁĄCZONY.
							    Warunek dotyczy KATALOGU (length===0) / realności celu — NIE liczby
							    zaznaczeń: realny cel + niepusty katalog + 0 zaznaczeń zostaje aktywny
							    (próg min-5→0, D5). Nie mylić tych dwóch. */}
								<Button
									onClick={diagnosticMode ? startDiagnosis : () => runSubmit()}
									disabled={
										submitting ||
										startingDiagnosis ||
										catalogLoading ||
										!isRealGoal ||
										catalog.length === 0
									}
									className="ob-btn-accent gap-2"
								>
									{submitting || startingDiagnosis ? (
										<>
											<BookOpen className="h-4 w-4 animate-spin" />
											{startingDiagnosis ? "Przygotowuję test…" : "Zapisywanie…"}
										</>
									) : diagnosticMode && Object.keys(selections).length > 0 ? (
										<>
											<Check className="h-4 w-4" />
											Zatwierdź i sprawdź się testem
										</>
									) : (
										<>
											<Check className="h-4 w-4" />
											Zatwierdź i przejdź dalej
										</>
									)}
								</Button>
							</div>
						)}
					</>
				) : null}

				{/* Step 4 — Wnioski (ETAP D): bogaty ekran domykający z danych policzalnych. */}
				{step === 4 && (
					<StepWnioski
						careerGoal={profile.careerGoal}
						catalog={catalog}
						groups={rawGroups}
						selections={selections}
						profileNote={profileNote}
						syllabusUsed={syllabusCompetencies.length > 0}
						onComplete={handleComplete}
						completing={completing}
						diagnosisResult={diagnosisOutcome?.result ?? null}
						placementEnabled={placementEnabled}
						placementSummary={diagnosisOutcome?.placement ?? null}
					/>
				)}
			</div>
		</div>
	);
}
