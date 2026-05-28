import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auditContextFromRequest, recordAudit } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { PASSPORT_SHARE_CONSENT_VERSION } from "@/lib/consent";
import { db } from "@/lib/db";
import { passports, students } from "@/lib/db/schema";

// B1/RODO: świadome włączenie/wyłączenie publicznego udostępniania paszportu.
// Tylko właściciel; token niezgadywalny (256-bit base64url).
//
// §8 #5 (rls-matrix.md, 2026-05-28): wyłączenie ROTUJE token — `DELETE`
// zeruje `share_token`, więc wyciekły link przestaje być trwały. POST po
// ponownym włączeniu wygeneruje NOWY token (passport.shareToken IS NULL
// → randomBytes(32)). Decyzja Sophia/Ryan: bezpieczniejszy default niż
// „pause/resume tego samego linku"; spójne z mental-modelem userów
// („wyłączyłem = link nie działa"). Audyt rotacji w `passport.share.disable`
// z metadata.tokenRotated=true + skrótem hash poprzedniego tokenu (sam token
// nigdy nie ląduje w audit_log).

async function ownPassport(userId: string) {
	const student = await db.query.students.findFirst({
		where: eq(students.userId, userId),
	});
	if (!student) return null;
	const passport = await db.query.passports.findFirst({
		where: eq(passports.studentId, student.id),
	});
	return passport ?? null;
}

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	// A1/RODO: klient deklaruje wersję zgody, którą wyświetlił. Rozjazd = stary
	// klient pokazał nieaktualną treść → odrzucamy, niech przeładuje i zobaczy
	// bieżący ekran zgody, zanim cokolwiek stanie się publiczne.
	const body = (await req.json().catch(() => ({}))) as { consentVersion?: string };
	if (body.consentVersion !== PASSPORT_SHARE_CONSENT_VERSION) {
		return NextResponse.json(
			{ error: "consent_version_mismatch", currentVersion: PASSPORT_SHARE_CONSENT_VERSION },
			{ status: 409 },
		);
	}

	const passport = await ownPassport(session.user.id);
	if (!passport) return NextResponse.json({ error: "Passport not found" }, { status: 404 });

	const shareToken = passport.shareToken ?? randomBytes(32).toString("base64url");
	await db
		.update(passports)
		.set({ publicEnabled: true, shareToken, updatedAt: new Date() })
		.where(eq(passports.id, passport.id));

	const { ipAddress, userAgent } = auditContextFromRequest(req);
	await recordAudit({
		actorType: "student",
		actorId: session.user.id,
		action: "passport.share.enable",
		targetType: "passports",
		targetId: passport.id,
		ipAddress,
		userAgent,
		metadata: { consentVersion: PASSPORT_SHARE_CONSENT_VERSION },
	});

	return NextResponse.json({ publicEnabled: true, shareToken });
}

export async function DELETE(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const passport = await ownPassport(session.user.id);
	if (!passport) return NextResponse.json({ error: "Passport not found" }, { status: 404 });

	// §8 #5: wyłączamy publiczny dostęp I ROTUJEMY token (NULL). Wyciekły
	// link przestaje być trwały. Re-enable wygeneruje nowy shareToken w POST.
	// Zachowujemy hash poprzedniego tokenu w audycie dla traceability —
	// surowy token nigdy nie ląduje w audit_log (K-SES vs K-INT).
	const previousTokenHash = passport.shareToken
		? createHash("sha256").update(passport.shareToken).digest("hex").slice(0, 16)
		: null;

	await db
		.update(passports)
		.set({ publicEnabled: false, shareToken: null, updatedAt: new Date() })
		.where(eq(passports.id, passport.id));

	const { ipAddress, userAgent } = auditContextFromRequest(req);
	await recordAudit({
		actorType: "student",
		actorId: session.user.id,
		action: "passport.share.disable",
		targetType: "passports",
		targetId: passport.id,
		ipAddress,
		userAgent,
		metadata: {
			tokenRotated: previousTokenHash !== null,
			// Skrót (16 hex znaków sha256) — wystarczy do correlation w incident
			// response („czy ten leaked link to był ten paszport?"), za krótki by
			// odtworzyć token brute-forcem.
			previousTokenHashPrefix: previousTokenHash,
		},
	});

	return NextResponse.json({ publicEnabled: false, tokenRotated: previousTokenHash !== null });
}
