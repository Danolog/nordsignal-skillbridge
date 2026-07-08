import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { logError } from "@/lib/log";

export type AuditActorType = "student" | "faculty" | "operator" | "system" | "anonymous";

export interface AuditEntry {
	actorType: AuditActorType;
	actorId?: string | null;
	action: string;
	targetType?: string | null;
	targetId?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	metadata?: Record<string, unknown> | null;
}

/**
 * Insert an audit row. Best-effort: a failure here MUST NOT block the user
 * action — we log it and continue. Always wrap in try/catch internally.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
	try {
		await db.insert(auditLog).values({
			actorType: entry.actorType,
			actorId: entry.actorId ?? null,
			action: entry.action,
			targetType: entry.targetType ?? null,
			targetId: entry.targetId ?? null,
			ipAddress: entry.ipAddress ?? null,
			userAgent: entry.userAgent ?? null,
			metadata: entry.metadata ?? null,
		});
	} catch (err) {
		logError("audit.write", err, { action: entry.action });
	}
}

export function auditContextFromRequest(req: Request): {
	ipAddress: string | null;
	userAgent: string | null;
} {
	const ipAddress =
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		req.headers.get("x-real-ip") ??
		null;
	const userAgent = req.headers.get("user-agent") ?? null;
	return { ipAddress, userAgent };
}
