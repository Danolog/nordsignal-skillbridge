/**
 * 1E.6a — drabina modułów curriculum (widok listy).
 *
 * ADR-014 D3 („widoczna-ale-zablokowana"): moduł `locked` JEST widoczny —
 * student wie, co go czeka i czego brakuje — ale nie jest klikalny. Bramką
 * jest serwer (403 na trasach), nie brak linku w UI.
 *
 * Moduł `coming_soon` (0 pozycji) nazywamy uczciwie: „treść w drodze".
 *
 * Komponent czysto prezentacyjny (server component — zero interakcji).
 */

import { CheckCircle2, ChevronRight, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { MODULE_STATUS_LABEL, statusBadgeClass } from "@/components/curriculum/labels";
import type { LadderModule } from "@/lib/curriculum/ladder";

export interface LadderModuleWithProgress extends LadderModule {
	/** Pozycje zaliczone (completed + skipped_by_placement). */
	completedItems: number;
}

function StatusIcon({ status }: { status: LadderModule["status"] }) {
	if (status === "completed") {
		return <CheckCircle2 aria-hidden className="size-5 text-emerald-600" />;
	}
	if (status === "locked") return <Lock aria-hidden className="size-5 text-muted-foreground" />;
	if (status === "coming_soon") {
		return <Clock aria-hidden className="size-5 text-muted-foreground" />;
	}
	return <ChevronRight aria-hidden className="size-5 text-sky-600" />;
}

function ModuleRow({ module: m }: { module: LadderModuleWithProgress }) {
	const clickable = m.status !== "locked" && m.status !== "coming_soon";
	const percent = m.itemCount > 0 ? Math.round((m.completedItems / m.itemCount) * 100) : 0;

	const body = (
		<div className="flex items-start gap-4">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-muted-foreground">
				{m.position}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<h2 className="text-base font-semibold text-foreground">{m.title}</h2>
					<span
						className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(m.status)}`}
					>
						{MODULE_STATUS_LABEL[m.status]}
					</span>
				</div>
				{m.description && (
					<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
				)}
				{m.status === "coming_soon" ? (
					<p className="mt-2 text-sm text-muted-foreground">
						Treść tego modułu jeszcze powstaje — nie da się go dziś zaliczyć.
					</p>
				) : (
					<div className="mt-3 flex items-center gap-3">
						<div
							className="h-1.5 w-40 overflow-hidden rounded-full bg-muted"
							role="progressbar"
							aria-valuenow={percent}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label={`Postęp modułu ${m.title}`}
						>
							<div
								className="h-full rounded-full bg-emerald-500"
								style={{ width: `${percent}%` }}
							/>
						</div>
						<span className="text-xs text-muted-foreground">
							{m.completedItems}/{m.itemCount} pozycji
						</span>
					</div>
				)}
				{m.status === "locked" && (
					<p className="mt-2 text-sm text-muted-foreground">
						Zablokowany — zalicz wcześniejszy moduł, żeby go otworzyć.
					</p>
				)}
			</div>
			<StatusIcon status={m.status} />
		</div>
	);

	if (!clickable) {
		return (
			<li
				aria-disabled="true"
				className="rounded-xl border border-border bg-card/60 p-4 opacity-80"
				data-status={m.status}
			>
				{body}
			</li>
		);
	}
	return (
		<li data-status={m.status}>
			<Link
				href={`/curriculum/${m.id}`}
				className="block rounded-xl border border-border bg-card p-4 transition hover:border-emerald-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{body}
			</Link>
		</li>
	);
}

export function LadderView({ modules }: { modules: LadderModuleWithProgress[] }) {
	if (modules.length === 0) {
		return (
			<div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
				Ścieżka nauki nie obejmuje jeszcze Twojego celu kariery. Gdy tylko powstanie, pojawi się tu
				drabina modułów.
			</div>
		);
	}
	return (
		<ol className="flex flex-col gap-3">
			{modules.map((m) => (
				<ModuleRow key={m.id} module={m} />
			))}
		</ol>
	);
}
