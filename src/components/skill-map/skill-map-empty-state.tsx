"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SkillMapEmptyState() {
	const router = useRouter();
	const [regenerating, setRegenerating] = useState(false);

	const handleRegenerate = async () => {
		setRegenerating(true);
		try {
			const res = await fetch("/api/skill-map", { method: "POST" });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Generacja nie powiodła się");
			}
			toast.success("Mapa kompetencji wygenerowana!");
			router.refresh();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Nie udało się wygenerować mapy kompetencji.",
			);
			setRegenerating(false);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center h-[calc(100vh-theme(spacing.0))] gap-6 p-8">
			<div className="w-16 h-16 rounded-full bg-ed-badge-bg flex items-center justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
					className={`w-8 h-8 text-ed-amber-text ${regenerating ? "animate-pulse" : ""}`}
				>
					<title>Mapa kompetencji</title>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
					/>
				</svg>
			</div>
			<div className="text-center max-w-md">
				<h2 className="font-heading font-extrabold text-xl text-ed-ink mb-1">
					{regenerating
						? "Generujemy Twoją mapę kompetencji…"
						: "Mapa kompetencji nie jest jeszcze gotowa"}
				</h2>
				<p className="text-sm text-ed-muted">
					{regenerating
						? "AI analizuje Twoje kompetencje i dane rynkowe. To zajmie 15-30 sekund."
						: "Generacja może chwilę zająć — kliknij poniżej, by uruchomić ją ponownie."}
				</p>
			</div>
			<Button
				onClick={handleRegenerate}
				disabled={regenerating}
				className="bg-ed-ink hover:opacity-90 text-ed-cream"
			>
				{regenerating ? "Generuję…" : "Wygeneruj mapę kompetencji"}
			</Button>
		</div>
	);
}
