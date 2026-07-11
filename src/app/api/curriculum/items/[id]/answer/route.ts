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
// Body: { questionItemId, answer, hintDepth? } — answer w formacie
// StudentAnswer per typ pytania (spec A5 §2.3).
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
import { getModuleItems, isModuleUnlocked } from "@/lib/curriculum/ladder";
import { db } from "@/lib/db";
import {
	curriculumItemAnswers,
	curriculumModuleItems,
	questionItems,
	students,
} from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

const AnswerSchema = z.object({
	questionItemId: z.uuid(),
	answer: z.record(z.string(), z.unknown()),
	hintDepth: z.number().int().min(0).max(3).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("curriculumPath")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = await ctx.params;
	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = AnswerSchema.safeParse(raw);
	if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

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
		if (item.kind !== "theory" && item.kind !== "exercise") {
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
			columns: { id: true, type: true, answerJson: true, explanationMd: true },
		});
		if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

		const isCorrect = gradeAnswer(
			question.type as QuestionType,
			question.answerJson,
			parsed.data.answer,
		);

		// Append-only + ślad próby (kolejność: najpierw fakt, potem stan).
		await db.insert(curriculumItemAnswers).values({
			studentId: student.id,
			tenantId: student.tenantId,
			itemId: item.id,
			questionItemId: question.id,
			isCorrect,
			hintDepth: parsed.data.hintDepth ?? 0,
		});
		await recordAttempt(student.id, student.tenantId, item.id);

		let itemCompleted = false;
		let moduleCompleted = false;
		if (isCorrect && (await allQuestionsCorrect(student.id, item.id, questionIds))) {
			itemCompleted = true;
			({ moduleCompleted } = await completeItem(
				student.id,
				student.tenantId,
				item.id,
				item.moduleId,
			));
		}

		// Feedback natychmiast, także przy błędzie (R13/R5); klucz odpowiedzi
		// NIGDY nie wraca w odpowiedzi API.
		return NextResponse.json({
			correct: isCorrect,
			explanationMd: question.explanationMd,
			itemCompleted,
			moduleCompleted,
		});
	} catch (error) {
		logError("curriculum.answer.failed", error);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
