// ============================================================================
// B8/1.3 (ADR-011) — logowanie OPERATORA JAKOŚCI.
//
// Lustrzane do /api/faculty/login (rate-limit, origin check, siła hasła na
// produkcji, audyt, sesja DB z hashem tokenu) z trzema różnicami:
//   1. jeden sekret OPERATOR_PASSWORD (bez dopasowywania kampusu),
//   2. sesja role='quality_operator' z tenant_id NULL (cross-tenant),
//   3. własny cookie operator_session (twardy rozdział ról — sesja operatora
//      nigdy nie działa jako faculty i odwrotnie).
//
// Za flagą humanReviewQueue: flaga off → 404, cała rodzina B8 nie istnieje.
// ============================================================================

import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auditContextFromRequest, recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { facultySessions } from "@/lib/db/schema";
import { hashToken } from "@/lib/faculty-auth";
import { isFeatureEnabled } from "@/lib/flags";
import { applyRateLimit, getClientIp, rateLimiters, rateLimitResponse } from "@/lib/rate-limit";
import { OPERATOR_COOKIE_NAME } from "@/lib/reviewer-auth";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

const LoginSchema = z.object({
	password: z.string().min(1).max(200),
});

const WEAK_DICTIONARY = ["operator2026", "admin", "password", "12345678", "qwerty"];

function constantTimeEqual(a: string, b: string): boolean {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) {
		timingSafeEqual(bufA, bufA);
		return false;
	}
	return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
	if (!isFeatureEnabled("humanReviewQueue")) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const expected = process.env.OPERATOR_PASSWORD ?? "";
	// Brak sekretu = trasa zamknięta (nigdy fail-open); słaby sekret na
	// produkcji = błąd konfiguracji (wzorzec faculty login).
	if (expected.length === 0) {
		return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
	}
	if (
		process.env.NODE_ENV === "production" &&
		(expected.length < 16 || WEAK_DICTIONARY.includes(expected.toLowerCase()))
	) {
		return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
	}

	const expectedOrigin = process.env.BETTER_AUTH_URL;
	const origin = req.headers.get("origin");
	if (expectedOrigin && origin && origin !== expectedOrigin) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const rl = await applyRateLimit(rateLimiters.facultyLogin, getClientIp(req));
	if (!rl.success) return rateLimitResponse(rl.reset);

	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = LoginSchema.safeParse(raw);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid input" }, { status: 400 });
	}

	const auditCtx = auditContextFromRequest(req);
	if (!constantTimeEqual(parsed.data.password, expected)) {
		await recordAudit({
			actorType: "anonymous",
			action: "operator.login.fail",
			...auditCtx,
		});
		return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 401 });
	}

	const token = randomBytes(32).toString("base64url");
	const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
	const [inserted] = await db
		.insert(facultySessions)
		.values({
			tokenHash: hashToken(token),
			tenantId: null,
			role: "quality_operator",
			expiresAt,
			ipAddress: auditCtx.ipAddress,
			userAgent: auditCtx.userAgent,
		})
		.returning({ id: facultySessions.id });

	await recordAudit({
		actorType: "operator",
		actorId: inserted?.id ?? null,
		action: "operator.login.success",
		...auditCtx,
	});

	const response = NextResponse.json({ success: true });
	response.cookies.set(OPERATOR_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: SESSION_TTL_SECONDS,
		path: "/",
	});
	return response;
}
