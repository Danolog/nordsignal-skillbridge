import { and, eq, lte } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { logError } from "@/lib/log";

// 0.15/B2: filtry query walidowane Zod zamiast ślepych castów — `?level=foo` czy
// `?maxHours=abc` dawały gołe 500 z Postgresa (invalid enum / NaN w parametrze).
// Zła wartość → 400 z opisem, nie wyjątek drivera.
const QuerySchema = z.object({
	level: z.enum(projects.level.enumValues).nullish(),
	sourceType: z.enum(projects.sourceType.enumValues).nullish(),
	maxHours: z.coerce.number().int().positive().nullish(),
});

export async function GET(req: NextRequest) {
	// 0.15/B1: katalog wymaga sesji — była to JEDYNA trasa dashboardowa bez auth,
	// a `findMany` zwraca też rubricJson (rubryka oceny AI) i briefTemplate.
	// Spójnie z projects/[id] (rls-matrix §3: K-PUB = wszyscy UWIERZYTELNIENI).
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { searchParams } = req.nextUrl;
	const parsed = QuerySchema.safeParse({
		level: searchParams.get("level"),
		sourceType: searchParams.get("sourceType"),
		maxHours: searchParams.get("maxHours"),
	});
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid query", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}
	const { level, sourceType, maxHours } = parsed.data;

	const conditions = [eq(projects.status, "active")];
	if (level) conditions.push(eq(projects.level, level));
	if (sourceType) conditions.push(eq(projects.sourceType, sourceType));
	if (maxHours) conditions.push(lte(projects.estimatedHours, maxHours));

	try {
		const result = await db.query.projects.findMany({
			where: and(...conditions),
			with: { competencies: true },
			orderBy: (p, { desc }) => [desc(p.createdAt)],
		});
		return NextResponse.json({ projects: result });
	} catch (err) {
		logError("projects.list", err, { userId: session.user.id });
		return NextResponse.json({ error: "Nie udało się pobrać projektów." }, { status: 500 });
	}
}
