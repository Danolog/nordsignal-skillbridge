import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { passports, students } from "@/lib/db/schema";

// B1/RODO: świadome włączenie/wyłączenie publicznego udostępniania paszportu.
// Tylko właściciel; token niezgadywalny (256-bit base64url), nadawany raz.

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

export async function POST() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const passport = await ownPassport(session.user.id);
	if (!passport) return NextResponse.json({ error: "Passport not found" }, { status: 404 });

	const shareToken = passport.shareToken ?? randomBytes(32).toString("base64url");
	await db
		.update(passports)
		.set({ publicEnabled: true, shareToken, updatedAt: new Date() })
		.where(eq(passports.id, passport.id));

	await recordAudit({
		actorType: "student",
		actorId: session.user.id,
		action: "passport.share.enable",
		targetType: "passports",
		targetId: passport.id,
	});

	return NextResponse.json({ publicEnabled: true, shareToken });
}

export async function DELETE() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const passport = await ownPassport(session.user.id);
	if (!passport) return NextResponse.json({ error: "Passport not found" }, { status: 404 });

	// Wyłączamy publiczny dostęp; token zostaje (re-enable nie zmienia linku).
	await db
		.update(passports)
		.set({ publicEnabled: false, updatedAt: new Date() })
		.where(eq(passports.id, passport.id));

	await recordAudit({
		actorType: "student",
		actorId: session.user.id,
		action: "passport.share.disable",
		targetType: "passports",
		targetId: passport.id,
	});

	return NextResponse.json({ publicEnabled: false });
}
