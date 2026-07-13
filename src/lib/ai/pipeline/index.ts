/**
 * Orkiestrator potoku oceny zgłoszeń (Faza 1 — ocena oparta na treści).
 *
 * Woła kroki po kolei, zbiera flagi, składa `aiReviewJson` i zwraca wynik
 * route'owi. Zastępuje bezpośrednie wołanie `reviewSubmission` w submit/route.ts
 * (route woła `runReviewPipeline`). Design: §1 / §9 (zakres Fazy 1).
 *
 * DWA pierwszorzędne wyjścia (§0a): (A) `studentFeedback` — Etap 1, mentor dla
 * studenta; (B) `recommendation` + dowody — Etap 2, dla człowieka (Faza 3 UI).
 * Werdykt maszyny obowiązuje sam dla oceny formującej (ADR-008).
 */

import { checkEndpoints } from "@/lib/ai/pipeline/endpoint-check";
import { fetchCommits, repoCoordsFromUrl } from "@/lib/ai/pipeline/github";
import { fetchContent } from "@/lib/ai/pipeline/step1-fetch-content";
import { runHardChecks } from "@/lib/ai/pipeline/step2-hard-checks";
import { runSemanticReview } from "@/lib/ai/pipeline/step3-semantic";
import { runCheatSignals } from "@/lib/ai/pipeline/step4-cheat-signals";
import { route } from "@/lib/ai/pipeline/step5-routing";
import type {
	CriterionEvaluation,
	DeliverableType,
	NormalizedRubricItem,
	PipelineFlag,
	PipelineResult,
	PipelineReviewJson,
	ReviewResult,
	SemanticData,
} from "@/lib/ai/pipeline/types";
import { parseRepoUrl } from "@/lib/ai/sanitize";
import { type HiddenTestSuite, runHiddenTests } from "@/lib/sandbox/run-hidden-tests";
import { generateVivaQuestions } from "@/lib/viva/generate-questions";

type RawRubricItem = { criterion?: unknown; weight?: unknown; description?: unknown };

/**
 * Normalizuje rubricJson (`{ criterion, weight, description }[]`) do postaci dla
 * modelu: `{ id, description, maxPoints=weight }`. `id` = `c{index}` (stabilny,
 * bo nazwy kryteriów bywają długie/zduplikowane). Zwraca też mapę id→criterion
 * do odbudowy `criteriaScores` (wsteczna zgodność).
 */
export function normalizeRubric(rubricJson: unknown): {
	rubric: NormalizedRubricItem[];
	nameById: Map<string, string>;
} {
	const arr = Array.isArray(rubricJson) ? (rubricJson as RawRubricItem[]) : [];
	const rubric: NormalizedRubricItem[] = [];
	const nameById = new Map<string, string>();

	arr.forEach((item, i) => {
		const criterion = typeof item.criterion === "string" ? item.criterion : `Kryterium ${i + 1}`;
		const weight = typeof item.weight === "number" && item.weight > 0 ? item.weight : 0;
		const description = typeof item.description === "string" ? item.description : "";
		const id = `c${i}`;
		// maxPoints = waga; gdy 0 (brak/niepoprawna), dajemy równy udział 1 — żeby
		// kryterium dalej liczyło się w mianowniku, nie znikało.
		rubric.push({ id, description: `${criterion}: ${description}`.trim(), maxPoints: weight || 1 });
		nameById.set(id, criterion);
	});

	return { rubric, nameById };
}

/**
 * Buduje wsteczną `criteriaScores` (kształt L1–L3 + opcjonalne dowody) z ocen
 * cząstkowych modelu i znormalizowanej rubryki. `score` skalujemy do 0–100
 * (procent danego kryterium), bo stary kształt trzyma 0–100 per kryterium.
 */
function buildCriteriaScores(
	evaluations: CriterionEvaluation[],
	rubric: NormalizedRubricItem[],
	nameById: Map<string, string>,
): ReviewResult["criteriaScores"] {
	const byId = new Map(evaluations.map((e) => [e.criterionId, e]));
	const maxById = new Map(rubric.map((r) => [r.id, r.maxPoints]));

	const rows = rubric.map((item) => {
		const evaln = byId.get(item.id);
		const criterion = nameById.get(item.id) ?? item.id;
		if (!evaln) {
			return { criterion, score: 0, comment: "Brak oceny dla tego kryterium." };
		}
		const max = maxById.get(item.id) ?? 1;
		const pct = max > 0 ? Math.round((Math.max(0, Math.min(max, evaln.score)) / max) * 100) : 0;
		return {
			criterion,
			score: evaln.status === "not_assessable" ? 0 : pct,
			comment: evaln.justification || "",
			status: evaln.status,
			evidence: evaln.evidence || undefined,
			evidencePath: evaln.filePath || undefined,
			evidenceFound: evaln.evidenceFound,
			justification: evaln.justification || undefined,
		};
	});

	// criteriaScores wymaga min 1 elementu (schemat). Pusta rubryka → placeholder.
	if (rows.length === 0) {
		return [{ criterion: "Ocena ogólna", score: 0, comment: "Brak rubryki — ocena niepełna." }];
	}
	return rows;
}

function feedbackFromSemantic(semantic: SemanticData, score: number): string {
	const summary = semantic.evaluatorSummary?.trim();
	if (summary) return summary;
	return `Ocena automatyczna: ${score}/100.`;
}

/**
 * Uruchamia pełny potok oceny dla jednego zgłoszenia.
 *
 * @param repoUrl       adres repo (string; walidacja github.com tutaj — SSRF).
 * @param rubricJson    rubryka projektu (`projects.rubricJson`).
 * @param deliverableType typ pracy (`projects.deliverable_type`; default `mixed`).
 * @param sandbox       B6/1.9 (ADR-012): ukryty suite + studentId (budżet) —
 *                      podaje trasa submitu TYLKO przy zapalonej fladze
 *                      sandboxRunner i projekcie z suite'em; brak = zachowanie
 *                      Fazy 1 (runOk null, zero flag piaskownicy).
 */
export async function runReviewPipeline(args: {
	repoUrl: string | null;
	notebookUrl: string | null;
	rubricJson: unknown;
	deliverableType?: DeliverableType;
	sandbox?: { studentId: string; suite: HiddenTestSuite };
	/**
	 * B7/1.16a (ADR-013): krok 6-prep — generacja pytań obrony. Podaje trasa
	 * submitu TYLKO za flagą vivaDefense; brak = zero zmian (żadnego wywołania,
	 * żadnego pola vivaPrep — zachowanie sprzed B7).
	 */
	viva?: { attribution: { studentId: string; tenantId: string } };
}): Promise<PipelineResult> {
	const deliverableType: DeliverableType = args.deliverableType ?? "mixed";
	const { rubric, nameById } = normalizeRubric(args.rubricJson);
	const allFlags: PipelineFlag[] = [];

	const parsedRepo = parseRepoUrl(args.repoUrl);

	// KROK 1 — pobranie treści (tylko gdy repo github.com; SSRF zachowane).
	const content = parsedRepo
		? await fetchContent(parsedRepo.url)
		: {
				ok: false,
				data: {
					artifact: "",
					readme: "",
					files: [],
					omittedFiles: [],
					inputMeta: { truncated: false, omittedFiles: [] },
					defaultBranch: null,
				},
				flags: [
					{
						code: "empty_or_unreadable" as const,
						message: "Brak adresu repozytorium github.com — ocena treści niemożliwa.",
					},
				],
			};
	allFlags.push(...content.flags);

	// KROK 2 — twarde sprawdzenia (deterministyczne, bez uruchamiania).
	const hard = runHardChecks(content.data, deliverableType);
	allFlags.push(...hard.flags);

	// KROK 2b (B6/1.9, ADR-012) — bieg ukrytych testów w piaskownicy.
	// Tylko: suite podany przez trasę + treść realnie pobrana (bez repo nie ma
	// czego uruchamiać — krok 1 już zapalił empty_or_unreadable).
	let sandboxRun: PipelineReviewJson["sandboxRun"];
	if (args.sandbox && content.ok) {
		const run = await runHiddenTests({
			studentId: args.sandbox.studentId,
			studentFiles: content.data.files.map((f) => ({ path: f.path, content: f.content })),
			suite: args.sandbox.suite,
		});
		hard.data.runOk = run.runOk;
		sandboxRun = {
			runOk: run.runOk,
			exitCode: run.exitCode,
			durationMs: run.durationMs,
			outputTail: run.outputTail,
			...(run.reason ? { reason: run.reason } : {}),
		};
		if (run.runOk === false) {
			allFlags.push({
				code: "run_failed",
				message: "Ukryte testy w piaskownicy NIE przeszły (blokuje werdykt 'verified').",
			});
		} else if (run.runOk === null) {
			// Fail-closed: bieg się nie odbył (budżet/infra) — NIE zgadujemy
			// werdyktu, kierujemy do człowieka (krok 5).
			allFlags.push({
				code: "run_unavailable",
				message:
					run.reason === "budget"
						? "Budżet biegów piaskownicy wyczerpany — decyzja człowieka."
						: "Piaskownica niedostępna (awaria infrastruktury) — decyzja człowieka.",
			});
		}
	}

	// KROK 2c (Blok E/E2) — odwiedziny endpointów z README (HEAD/GET, timeout,
	// guard SSRF). Tylko gdy treść realnie pobrana. Wynik idzie do kroku 3 jako
	// dowód dla kryterium „publiczny, klikalny endpoint" (25% wagi jedynego L2).
	if (content.ok && content.data.readme) {
		hard.data.endpointChecks = await checkEndpoints(content.data.readme);
	}

	// Commity pobierane RAZ (Blok E/E1) — wspólne dla kroku 3 (dowód kryterium
	// „sensowna historia commitów", 20% wagi w 4 projektach) i kroku 4 (cheat-risk).
	// 0.7 (confused-deputy): coords TYLKO gdy krok 1 pobrał treść (content.ok). Gdy krok 1
	// odrzucił repo (prywatne/niedostępne/puste), nie sięgamy po commity — inaczej dla
	// prywatnego repo z dostępem tokenu wyciekłyby zagregowane metadane (commitCount/
	// authorCount/timespan) do cheatSignals, mimo że treść słusznie odrzuciliśmy.
	const coords = parsedRepo && content.ok ? repoCoordsFromUrl(parsedRepo.url) : null;
	const commits = coords ? await fetchCommits(coords) : null;

	// KROK 3 (+4 AI) — ocena semantyczna + feedback + sygnały AI (jedno wywołanie).
	const semantic = await runSemanticReview({
		deliverableType,
		artifact: content.data.artifact,
		readme: content.data.readme,
		rubric,
		hardResults: hard.data,
		inputMeta: content.data.inputMeta,
		commits,
	});
	allFlags.push(...semantic.flags);

	// KROK 4 — cheat-risk z faktów (commity z jednego pobrania wyżej) + agregacja.
	const cheat = await runCheatSignals(commits, semantic.data.cheatSignals);
	allFlags.push(...cheat.flags);

	// KROK 5 — suma + routing (deterministycznie w kodzie).
	const routing = route({
		evaluations: semantic.data.evaluations,
		rubric,
		cheatSignals: cheat.data,
		upstreamFlags: allFlags,
		// B6/1.9: runOk=false blokuje 'verified'; null z flagą run_unavailable
		// kieruje do człowieka (fail-closed) — logika w kroku 5.
		runOk: hard.data.runOk,
	});
	allFlags.push(...routing.flags);

	// KROK 6-prep (B7/1.16a, ADR-013) — pytania obrony z TEGO SAMEGO artefaktu,
	// który ocenił krok 3 (zero dryfu). Tylko gdy werdykt maszyny = 'verified'
	// (nie ma czego bronić przed poprawą pracy). Fail-closed w generatorze:
	// null → trasa tworzy sesję inconclusive (needsHumanReview), submit żyje.
	let vivaPrep: PipelineResult["vivaPrep"];
	if (args.viva && routing.status === "verified") {
		vivaPrep = {
			questions: await generateVivaQuestions({
				artifact: content.data.artifact,
				deliverableType,
				attribution: args.viva.attribution,
			}),
		};
	}

	const criteriaScores = buildCriteriaScores(semantic.data.evaluations, rubric, nameById);
	const review: ReviewResult = {
		score: routing.score,
		feedback: feedbackFromSemantic(semantic.data, routing.score),
		cheatRiskScore: cheat.data.aggregatedRisk,
		criteriaScores,
	};

	return {
		score: routing.score,
		status: routing.status,
		needsHumanReview: routing.needsHumanReview,
		aiReviewJson: {
			review,
			studentFeedback: semantic.data.studentFeedback,
			evaluatorSummary: semantic.data.evaluatorSummary,
			integrityFlags: semantic.data.integrityFlags,
			recommendation: routing.recommendation,
			cheatSignals: cheat.data,
			hardChecks: hard.data,
			...(sandboxRun ? { sandboxRun } : {}),
			contentMeta: {
				filesFetched: content.data.files.map((f) => f.path),
				filesSkipped: content.data.omittedFiles,
				truncated: content.data.inputMeta.truncated,
			},
		},
		flags: allFlags,
		...(vivaPrep ? { vivaPrep } : {}),
	};
}
