/**
 * 1E.6a — pozycje modułu (teoria / ćwiczenie / lab / projekt) ze statusem.
 *
 * Sekwencja: pozycja k+1 otwiera się po zaliczeniu k (ladder.getModuleItems).
 * Pozycja `locked` jest widoczna, ale nieklikalna — bramką jest serwer.
 *
 * Lab: mówimy wprost, że automatycznego zaliczania jeszcze NIE MA (wchodzi
 * w 1E.6b — `/complete` zwraca dziś 501). Bez udawania, że da się zaliczyć.
 *
 * Komponent czysto prezentacyjny (server component).
 */

import { CheckCircle2, FlaskConical, Lock } from "lucide-react";
import Link from "next/link";
import { ITEM_STATUS_LABEL, itemKindLabel, statusBadgeClass } from "@/components/curriculum/labels";
import type { LadderItem } from "@/lib/curriculum/ladder";

function ItemRow({ item, moduleId }: { item: LadderItem; moduleId: string }) {
	const clickable = item.status !== "locked";
	const body = (
		<div className="flex items-start gap-3">
			<div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
				{item.position}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm font-medium text-foreground">{item.title}</span>
					<span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
						{itemKindLabel(item.kind)}
					</span>
					<span
						className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(item.status)}`}
					>
						{ITEM_STATUS_LABEL[item.status]}
					</span>
				</div>
				{item.kind === "lab" && (
					<p className="mt-1 flex items-center gap-1.5 text-xs text-amber-800">
						<FlaskConical aria-hidden className="size-3.5" />
						Automatyczne sprawdzanie labów wchodzi w 1E.6b — tej pozycji nie da się dziś zaliczyć.
					</p>
				)}
				{item.status === "locked" && (
					<p className="mt-1 text-xs text-muted-foreground">
						Zablokowana — zalicz poprzednią pozycję, żeby ją otworzyć.
					</p>
				)}
			</div>
			{item.status === "completed" || item.status === "skipped_by_placement" ? (
				<CheckCircle2 aria-hidden className="size-5 text-emerald-600" />
			) : item.status === "locked" ? (
				<Lock aria-hidden className="size-5 text-muted-foreground" />
			) : null}
		</div>
	);

	if (!clickable) {
		return (
			<li
				aria-disabled="true"
				data-status={item.status}
				className="rounded-lg border border-border bg-card/60 p-3 opacity-80"
			>
				{body}
			</li>
		);
	}
	return (
		<li data-status={item.status}>
			<Link
				href={`/curriculum/${moduleId}/${item.id}`}
				className="block rounded-lg border border-border bg-card p-3 transition hover:border-emerald-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{body}
			</Link>
		</li>
	);
}

export function ModuleItems({ items, moduleId }: { items: LadderItem[]; moduleId: string }) {
	if (items.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
				Treść tego modułu jeszcze powstaje — nie ma tu na razie żadnej pozycji.
			</div>
		);
	}
	return (
		<ol className="flex flex-col gap-2">
			{items.map((item) => (
				<ItemRow key={item.id} item={item} moduleId={moduleId} />
			))}
		</ol>
	);
}
