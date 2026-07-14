// ============================================================================
// 1E.6a — GET /api/curriculum/items/[id]: TREŚĆ pozycji (teoria + podpowiedzi
// + pytania w kształcie dla klienta + zasoby).
//
// Klucz odpowiedzi NIE WYCHODZI: `answer_json`, `option_feedback_json`
// i `explanation_md` nie są czytane na tej ścieżce (jawne `columns` w
// `getItemView`) — wracają dopiero po ocenie w `.../answer`.
//
// Bramki (ADR-014 D3 — serwer, nie UI): flaga off → 404, brak sesji → 401,
// zablokowany moduł ALBO zablokowana pozycja w sekwencji → 403.
// ============================================================================

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getItemView } from "@/lib/curriculum/item-view";
import { isUuid } from "@/lib/curriculum/params";
import { db } from "@/lib/db";
import { students } from "@/lib/db/schema";
import { isFeatureEnabled } from "@/lib/flags";
import { logError } from "@/lib/log";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	if (!isFeatureEnabled("curriculumPath")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { id } = await ctx.params;
	// 0.15/B3: zły format uuid dawał 22P02 z Postgresa → 500 zamiast 400.
	if (!isUuid(id)) return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
	try {
		const student = await db.query.students.findFirst({
			where: eq(students.userId, session.user.id),
			columns: { id: true },
		});
		if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

		const result = await getItemView(student.id, id);
		if (!result.ok) {
			if (result.reason === "not_found") {
				return NextResponse.json({ error: "Item not found" }, { status: 404 });
			}
			const error = result.reason === "module_locked" ? "Module locked" : "Item locked";
			return NextResponse.json({ error }, { status: 403 });
		}
		return NextResponse.json(result.view);
	} catch (error) {
		logError("curriculum.item.failed", error);
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
