/**
 * 1E.6a — pozycje modułu (teoria / ćwiczenie / lab / projekt) ze statusem.
 *
 * Sekwencja: pozycja k+1 otwiera się po zaliczeniu k (ladder.getModuleItems).
 * Pozycja `locked` jest widoczna, ale nieklikalna — bramką jest serwer.
 *
 * Pozycja `kind === "lab"` (nazwa dla studenta: `itemKindLabel`): zaliczana kodem
 * wypisanym przez notatnik i weryfikowanym serwerowo (ADR-015). Podpis NIE twierdzi, że
 * zaliczenie jest niedostępne — od 1E.6b jest dostępne, a nieaktualne zdanie
 * odstraszało studenta od pozycji, którą da się zaliczyć (sygnał Darka
 * 2026-08-10). Jedynym nośnikiem prawdy o dostępności jest widżet zaliczenia
 * w widoku pozycji, który renderuje się tylko przy skonfigurowanym sekrecie
 * i niepustym kontrakcie sprawdzeń — tu tego stanu NIE duplikujemy.
 *
 * Komponent czysto prezentacyjny (server component).
 */

import { CheckCircle2, FlaskConical, Lock } from "lucide-react";
import Link from "next/link";
import {
	ITEM_LOCKED_HINT,
	ITEM_STATUS_LABEL,
	itemKindLabel,
	LAB_ITEM_HINT,
	statusBadgeClass,
} from "@/components/curriculum/labels";
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
					<p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
						<FlaskConical aria-hidden className="size-3.5" />
						{LAB_ITEM_HINT}
					</p>
				)}
				{item.status === "locked" && (
					<p className="mt-1 text-xs text-muted-foreground">{ITEM_LOCKED_HINT}</p>
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
