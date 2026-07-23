// ============================================================================
// ADR-018 — POST /api/curriculum/items/[id]/hint: przyznanie kolejnej
// podpowiedzi dla pytania, z głębokością liczoną i utrwaloną SERWEROWO.
//
// Sedno naprawy: klient NIE deklaruje głębokości ani czasu — serwer inkrementuje
// przyznaną głębokość (sticky, niemalejąca — D2) i sam stawia znacznik z zegara
// serwera (W-1/W-2). Ciało `.strict()` przyjmuje DOKŁADNIE jedno pole
// (`questionItemId`); jakiekolwiek pole czasowe od klienta → 400 (W-1).
//
// Bramki (wzorzec kopiowany z trasy `answer`, ADR-014 D3 — serwer, nie UI):
// flaga off → 404, brak sesji → 401, zły uuid → 400, limit → 429,
// zablokowany moduł/pozycja → 403, pytanie spoza pozycji → 400,
// pozycja bez podpowiedzi → 409 (brak zapisu).
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { questionIdsFromConfig } from "@/lib/curriculum/completion";
import { grantNextHint } from "@/lib/curriculum/hints";
import { hintsFromConfig } from "@/lib/curriculum/item-view";
import { getModuleItems, isModuleUnlocked } from "@/lib/curriculum/ladder";
import { isUuid } from "@/lib/curriculum/params";
import { db } from "@/lib/db";
import { curriculumModuleItems, students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";
import { applyRateLimit, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";

// W-1: dokładnie jedno pole, `.strict()` — nieznane pole (w tym znacznik czasu
// od klienta) kończy się 400, nie cichym odcięciem. Trasa jest nowa i nie ma
// klienta zgodnościowego, więc `.strict()` jest bezpieczne (inaczej niż `answer`).
const HintSchema = z.object({ questionItemId: z.uuid() }).strict();

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
	const parsed = HintSchema.safeParse(raw);
	if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true, tenantId: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		// Limiter per student (D5) — zapis w pętli nie może wzmacniać obciążenia bazy.
		const rl = await applyRateLimit(rateLimiters.hintReveal, `user:${session.user.id}`);
		if (!rl.success) return rateLimitResponse(rl.reset);

		const item = await db.query.curriculumModuleItems.findFirst({
			where: eq(curriculumModuleItems.id, id),
			columns: { id: true, moduleId: true, configJson: true },
		});
		if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

		// Sekwencji pilnuje serwer (jak w `answer`): moduł ORAZ pozycja odblokowane.
		if (!(await isModuleUnlocked(student.id, item.moduleId))) {
			return NextResponse.json({ error: "Module locked" }, { status: 403 });
		}
		const siblings = await getModuleItems(student.id, item.moduleId);
		const itemState = siblings.find((i) => i.id === item.id);
		if (!itemState || itemState.status === "locked") {
			return NextResponse.json({ error: "Item locked" }, { status: 403 });
		}

		// Pytanie musi należeć do pozycji (konfiguracja = źródło prawdy).
		const questionIds = questionIdsFromConfig(item.configJson);
		if (!questionIds.includes(parsed.data.questionItemId)) {
			return NextResponse.json({ error: "Question not in item" }, { status: 400 });
		}

		const hints = hintsFromConfig(item.configJson);
		if (hints.length === 0) {
			// Nic do odsłonięcia — brak zapisu (kontrakt Leo §4).
			return NextResponse.json({ error: "No hints for item" }, { status: 409 });
		}

		const granted = await grantNextHint(
			student.id,
			student.tenantId,
			item.id,
			parsed.data.questionItemId,
			hints,
		);
		return NextResponse.json({
			depth: granted.depth,
			hints: granted.hints,
			hasMore: granted.depth < Math.min(hints.length, 3),
		});
	} catch (error) {
		logError("curriculum.hint.failed", error);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
