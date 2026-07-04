import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auditContextFromRequest, recordAudit } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { PASSPORT_SHARE_CONSENT_VERSION } from "@/lib/consent";
import { db } from "@/lib/db";
import { passports, students } from "@/lib/db/schema";
import { withTenantContext } from "@/lib/db/tenant-context";

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
//
// §8 #1 Phase 2 / issue #19g (2026-05-28): odczyt/zapis paszportu przez
// withTenantContext({role: "student"}). Pre-fetch studentMeta owner-side.

async function loadStudentMeta(userId: string) {
	return db.query.students.findFirst({
		where: eq(students.userId, userId),
		columns: { id: true, tenantId: true },
	});
}

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	// A1/RODO: klient deklaruje wersję zgody, którą wyświetlił. Rozjazd = stary
	// klient pokazał nieaktualną treść → odrzucamy, niech przeładuje i zobaczy
	// bieżący ekran zgody, zanim cokolwiek stanie się publiczne.
	// 0.15/B7: body przez Zod (jedyny POST z body w repo, który szedł rzutowaniem `as`).
	const parsed = z
		.object({ consentVersion: z.string().max(50) })
		.safeParse(await req.json().catch(() => ({})));
	const body: { consentVersion?: string } = parsed.success ? parsed.data : {};
	if (body.consentVersion !== PASSPORT_SHARE_CONSENT_VERSION) {
		return NextResponse.json(
			{ error: "consent_version_mismatch", currentVersion: PASSPORT_SHARE_CONSENT_VERSION },
			{ status: 409 },
		);
	}

	const userId = session.user.id;
	const studentMeta = await loadStudentMeta(userId);
	if (!studentMeta) return NextResponse.json({ error: "Passport not found" }, { status: 404 });

	const shareToken = await withTenantContext(
		{ userId, tenantId: studentMeta.tenantId, role: "student" },
		async (tx) => {
			const passport = await tx.query.passports.findFirst({
				where: eq(passports.studentId, studentMeta.id),
			});
			if (!passport) return null;
			const token = passport.shareToken ?? randomBytes(32).toString("base64url");
			await tx
				.update(passports)
				.set({ publicEnabled: true, shareToken: token, updatedAt: new Date() })
				.where(eq(passports.id, passport.id));
			return { token, passportId: passport.id };
		},
	);

	if (!shareToken) {
		return NextResponse.json({ error: "Passport not found" }, { status: 404 });
	}

	// Audit log POZA tx — audit_log = server-only INSERT, RLS deny-all dla
	// klienta, append-only trigger (0008/0010). Inny model dostępu, inna ścieżka.
	const { ipAddress, userAgent } = auditContextFromRequest(req);
	await recordAudit({
		actorType: "student",
		actorId: userId,
		action: "passport.share.enable",
		targetType: "passports",
		targetId: shareToken.passportId,
		ipAddress,
		userAgent,
		metadata: { consentVersion: PASSPORT_SHARE_CONSENT_VERSION },
	});

	return NextResponse.json({ publicEnabled: true, shareToken: shareToken.token });
}

export async function DELETE(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const userId = session.user.id;
	const studentMeta = await loadStudentMeta(userId);
	if (!studentMeta) return NextResponse.json({ error: "Passport not found" }, { status: 404 });

	// §8 #5: wyłączamy publiczny dostęp I ROTUJEMY token (NULL). Wyciekły
	// link przestaje być trwały. Re-enable wygeneruje nowy shareToken w POST.
	// Hash poprzedniego tokenu do audytu — surowy token NIGDY do audit_log.
	const result = await withTenantContext(
		{ userId, tenantId: studentMeta.tenantId, role: "student" },
		async (tx) => {
			const passport = await tx.query.passports.findFirst({
				where: eq(passports.studentId, studentMeta.id),
			});
			if (!passport) return null;
			const previousTokenHash = passport.shareToken
				? createHash("sha256").update(passport.shareToken).digest("hex").slice(0, 16)
				: null;
			await tx
				.update(passports)
				.set({ publicEnabled: false, shareToken: null, updatedAt: new Date() })
				.where(eq(passports.id, passport.id));
			return { passportId: passport.id, previousTokenHash };
		},
	);

	if (!result) return NextResponse.json({ error: "Passport not found" }, { status: 404 });

	const { ipAddress, userAgent } = auditContextFromRequest(req);
	await recordAudit({
		actorType: "student",
		actorId: userId,
		action: "passport.share.disable",
		targetType: "passports",
		targetId: result.passportId,
		ipAddress,
		userAgent,
		metadata: {
			tokenRotated: result.previousTokenHash !== null,
			// Skrót (16 hex znaków sha256) — wystarczy do correlation w incident
			// response („czy ten leaked link to był ten paszport?"), za krótki by
			// odtworzyć token brute-forcem.
			previousTokenHashPrefix: result.previousTokenHash,
		},
	});

	return NextResponse.json({
		publicEnabled: false,
		tokenRotated: result.previousTokenHash !== null,
	});
}
