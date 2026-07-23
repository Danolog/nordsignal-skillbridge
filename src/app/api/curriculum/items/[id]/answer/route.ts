// ============================================================================
// 1E.1e — POST /api/curriculum/items/[id]/answer: odpowiedź na pytanie
// pozycji theory/exercise.
//
// Ocena DETERMINISTYCZNA przy zapisie (gradeAnswer z A5 — 0 LLM); każda
// próba → wiersz APPEND-ONLY w curriculum_item_answers (instrumentacja D11,
// cechy FSRS, ślad streaka). Błędna odpowiedź NIGDY nie jest stanem końcowym
// (R13): feedback natychmiast (explanation_md), nielimitowane próby.
// Pozycja completed = wszystkie pytania pozycji odpowiedziane poprawnie
// (licznik, nie procent — M10). Blokada zapisu do pozycji zablokowanego
// modułu / nieodblokowanej pozycji: 403. Flaga off → 404.
//
// Body: { questionItemId, answer, hintDepth?, confidence? } — answer w formacie
// StudentAnswer per typ pytania (spec A5 §2.3). MIS.1: przy fladze
// confidenceProbe pole confidence (1–3, deklarowane PRZED odpowiedzią) jest
// OBOWIĄZKOWE — opcjonalna sonda dałaby dziurawe dane kalibracji; przy fladze
// off jest ignorowane (zapis NULL), więc stary klient niczego nie zauważa.
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gradeAnswer } from "@/lib/assessment/grade";
import type { QuestionType } from "@/lib/assessment/types";
import { auth } from "@/lib/auth/server";
import {
	allQuestionsCorrect,
	completeItem,
	questionIdsFromConfig,
	recordAttempt,
} from "@/lib/curriculum/completion";
import { getGrantedDepths } from "@/lib/curriculum/hints";
import { getModuleItems, isModuleUnlocked } from "@/lib/curriculum/ladder";
import { isUuid } from "@/lib/curriculum/params";
import { db } from "@/lib/db";
import {
	curriculumItemAnswers,
	curriculumModuleItems,
	questionItems,
	students,
} from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

// ADR-018 D3/krok 5 — `hintDepth` USUNIĘTE ze schematu: głębokość liczy serwer
// z magazynu drabinki (nie klient). Stary klient, który wciąż wysyła `hintDepth`,
// przechodzi bez błędu (Zod odcina nieznane pola — zgodność wstecz w oknie wdrożenia).
const AnswerSchema = z.object({
	questionItemId: z.uuid(),
	answer: z.record(z.string(), z.unknown()),
	confidence: z.number().int().min(1).max(3).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("curriculumPath")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = await ctx.params;
	// 0.15/B3: zły format uuid dawał 22P02 z Postgresa → 500 zamiast 400.
	if (!isUuid(id)) return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = AnswerSchema.safeParse(raw);
	if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

	// MIS.1: pewność zbieramy tylko za flagą i wtedy wymagamy jej twardo —
	// walidacja serwerowa, bo UI da się obejść, a dziurawe dane psują kalibrację.
	const confidenceProbe = isFeatureEnabled("confidenceProbe");
	if (confidenceProbe && parsed.data.confidence === undefined) {
		return NextResponse.json({ error: "Confidence required" }, { status: 400 });
	}

	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true, tenantId: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		const item = await db.query.curriculumModuleItems.findFirst({
			where: eq(curriculumModuleItems.id, id),
			columns: { id: true, moduleId: true, kind: true, configJson: true },
		});
		if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
		// 1E.2: lab też przyjmuje odpowiedzi (pytania retrieval L0/F1 uczą, ale
		// NIE zaliczają — zaliczenie labu wyłącznie przez check w /complete).
		if (item.kind !== "theory" && item.kind !== "exercise" && item.kind !== "lab") {
			return NextResponse.json({ error: "Item does not accept answers" }, { status: 400 });
		}

		// Twarde egzekwowanie sekwencji: moduł ORAZ pozycja muszą być odblokowane.
		if (!(await isModuleUnlocked(student.id, item.moduleId))) {
			return NextResponse.json({ error: "Module locked" }, { status: 403 });
		}
		const items = await getModuleItems(student.id, item.moduleId);
		const itemState = items.find((i) => i.id === item.id);
		if (!itemState || itemState.status === "locked") {
			return NextResponse.json({ error: "Item locked" }, { status: 403 });
		}

		// Pytanie musi należeć do pozycji (konfiguracja = źródło prawdy).
		const questionIds = questionIdsFromConfig(item.configJson);
		if (!questionIds.includes(parsed.data.questionItemId)) {
			return NextResponse.json({ error: "Question not in item" }, { status: 400 });
		}
		const question = await db.query.questionItems.findFirst({
			where: eq(questionItems.id, parsed.data.questionItemId),
			columns: {
				id: true,
				type: true,
				answerJson: true,
				explanationMd: true,
				optionFeedbackJson: true,
			},
		});
		if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

		const isCorrect = gradeAnswer(
			question.type as QuestionType,
			question.answerJson,
			parsed.data.answer,
		);

		// Cały zapis ATOMOWO (fix WAŻNEGO z przeglądu): odpowiedź append-only +
		// ślad próby + ewentualne kompletowanie pozycji/modułu w jednej
		// transakcji — częściowy fail nie zostawi „poprawnej odpowiedzi bez
		// postępu" (a przy okazji mniej round-tripów).
		const { itemCompleted, moduleCompleted } = await db.transaction(async (tx) => {
			// ADR-018 krok 5 — głębokość SERWEROWA z magazynu drabinki, w TEJ SAMEJ
			// transakcji co wstawienie odpowiedzi; `hint_depth_source: 'server'` znaczy
			// wiersz jako zmierzony (D3). Wartość `hintDepth` od klienta jest ignorowana
			// (usunięta ze schematu) — to jest naprawa dokładnie tego długu.
			const grantedDepths = await getGrantedDepths(student.id, item.id, tx);
			await tx.insert(curriculumItemAnswers).values({
				studentId: student.id,
				tenantId: student.tenantId,
				itemId: item.id,
				questionItemId: question.id,
				isCorrect,
				hintDepth: grantedDepths.get(question.id) ?? 0,
				hintDepthSource: "server",
				// Flaga off → NULL nawet gdy klient przysłał wartość (nie mieszamy
				// danych zbieranych bez UI sondy z danymi zbieranymi z sondą).
				confidence: confidenceProbe ? (parsed.data.confidence ?? null) : null,
			});
			await recordAttempt(student.id, student.tenantId, item.id, tx);

			// Lab: pytania nigdy nie kompletują pozycji (zaliczenie = check w
			// /complete — ADR-014 pkt 10/11); komplet poprawnych liczy się tylko
			// dla theory/exercise (M10).
			if (item.kind === "lab") return { itemCompleted: false, moduleCompleted: false };
			if (!isCorrect || !(await allQuestionsCorrect(student.id, item.id, questionIds, tx))) {
				return { itemCompleted: false, moduleCompleted: false };
			}
			const { moduleCompleted: done } = await completeItem(
				student.id,
				student.tenantId,
				item.id,
				item.moduleId,
				tx,
			);
			return { itemCompleted: true, moduleCompleted: done };
		});

		// Feedback natychmiast, także przy błędzie (R13/R5); klucz odpowiedzi
		// NIGDY nie wraca w odpowiedzi API. 1E.2: feedback diagnostyczny WYBRANEJ
		// opcji (option_feedback_json — pełna tablica nigdy nie wychodzi, bo
		// feedback poprawnej opcji zdradzałby klucz).
		let optionFeedbackMd: string | null = null;
		const selected = (parsed.data.answer as { selected?: unknown }).selected;
		if (
			question.type === "single_choice" &&
			Number.isInteger(selected) &&
			Array.isArray(question.optionFeedbackJson)
		) {
			const fb = (question.optionFeedbackJson as { feedbackMd?: unknown }[])[selected as number];
			if (typeof fb?.feedbackMd === "string") optionFeedbackMd = fb.feedbackMd;
		}
		return NextResponse.json({
			correct: isCorrect,
			explanationMd: question.explanationMd,
			optionFeedbackMd,
			itemCompleted,
			moduleCompleted,
		});
	} catch (error) {
		logError("curriculum.answer.failed", error);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
