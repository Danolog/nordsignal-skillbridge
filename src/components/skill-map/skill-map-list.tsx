"use client";

import { KindChip, SharePill } from "./group-context";
import type { SkillNodeData } from "./skill-node";

// ── Widok listowy mapy: akordeon grup (Partia 5, C4) ─────────────────────────
// Realizuje decyzję #5 „cel nauki cały czas widoczny" BEZ kliknięcia (O-1):
// kompetencje pogrupowane w sekcje z nagłówkiem grupy (nazwa + unionShare + proza).
// Grupa z luką („missing") otwarta domyślnie; reszta zwinięta — oddech, nie ściana.
// Język „Spokojny ekspert": płaskie tła, shadow-sm, zero glow/gradientu.

const STATUS_LABELS: Record<SkillNodeData["status"], string> = {
	acquired: "Masz",
	in_progress: "W trakcie",
	missing: "Brakuje",
};

// Kolory semantyczne z palety map-* fundamentu (bez glow). WCAG 1.4.1: status
// niesie też SŁOWO (STATUS_LABELS), nie tylko barwa.
const STATUS_TEXT: Record<SkillNodeData["status"], string> = {
	acquired: "text-emerald-700",
	in_progress: "text-amber-700",
	missing: "text-red-600",
};

const LEFTOVER = "Pozostałe";

interface ListNode {
	data: SkillNodeData;
}

interface GroupBucket {
	name: string;
	description?: string;
	unionShare?: number;
	items: SkillNodeData[];
}

export function SkillMapList({ nodes }: { nodes: ListNode[] }) {
	if (nodes.length === 0) {
		return (
			<div className="mx-auto max-w-[720px] px-6 py-10 text-center text-sm text-slate-500">
				Brak kompetencji do pokazania.
			</div>
		);
	}

	// Grupowanie zachowuje kolejność pierwszego wystąpienia grupy (deterministyczne).
	const order: string[] = [];
	const groups = new Map<string, GroupBucket>();
	for (const node of nodes) {
		const name = node.data.groupName ?? LEFTOVER;
		let bucket = groups.get(name);
		if (!bucket) {
			bucket = {
				name,
				description: node.data.groupDescription,
				unionShare: node.data.groupUnionShare,
				items: [],
			};
			groups.set(name, bucket);
			order.push(name);
		}
		bucket.items.push(node.data);
	}

	return (
		<div className="mx-auto max-w-[720px] space-y-4 px-6 py-6">
			{order.map((name) => {
				const group = groups.get(name);
				if (!group) return null;
				const isLeftover = name === LEFTOVER;
				const hasMissing = group.items.some((it) => it.status === "missing");
				return (
					<details
						key={name}
						open={hasMissing}
						className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
					>
						<summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
							<span className="font-semibold text-slate-900">{name}</span>
							{!isLeftover && <SharePill unionShare={group.unionShare} />}
						</summary>
						{!isLeftover && group.description && (
							<p className="px-4 pb-2 text-sm leading-relaxed text-slate-500">
								{group.description}
							</p>
						)}
						<ul className="space-y-2 px-4 pb-3">
							{group.items.map((it) => (
								<li
									key={it.label}
									className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0"
								>
									<span className="flex items-center gap-2">
										<span className="text-sm text-slate-800">{it.label}</span>
										<KindChip kind={it.kind} />
									</span>
									<span className="flex items-center gap-2 text-xs">
										<span className={`font-medium ${STATUS_TEXT[it.status]}`}>
											{STATUS_LABELS[it.status]}
										</span>
										{it.marketPercentage != null && (
											<span className="font-mono text-slate-400">{it.marketPercentage}% ofert</span>
										)}
									</span>
								</li>
							))}
						</ul>
					</details>
				);
			})}
		</div>
	);
}
