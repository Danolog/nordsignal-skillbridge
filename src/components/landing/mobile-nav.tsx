"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Mobilne menu nawigacji landingu (iteracja 2, spec Mili v0.3 §3).
// Hamburger: aria-expanded, Escape zamyka, klik w kotwicę / klik poza menu zamyka. focus-visible wszędzie.
// Client component — tylko interaktywny fragment headera; desktop nav + logo zostają server-rendered w page.tsx.
// CTA student „Sprawdź, czego Ci brakuje" jest stale widoczne w pasku mobile (poza menu).

export function MobileNav() {
	const [open, setOpen] = useState(false);
	const wrapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		const onClick = (e: MouseEvent) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("keydown", onKey);
		document.addEventListener("mousedown", onClick);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("mousedown", onClick);
		};
	}, [open]);

	return (
		<div ref={wrapRef} className="flex items-center gap-2 md:hidden">
			<Link
				href="/signup"
				className="rounded-full bg-ed-ink px-4 py-2 text-[14px] font-bold whitespace-nowrap text-ed-cream no-underline transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-amber"
			>
				Sprawdź, czego Ci brakuje
			</Link>
			<button
				type="button"
				id="nav-mobile-toggle"
				className="rounded-sm p-2 text-ed-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-amber"
				aria-label={open ? "Zamknij menu" : "Otwórz menu"}
				aria-expanded={open}
				aria-controls="nav-mobile-menu"
				onClick={() => setOpen((v) => !v)}
			>
				{open ? <X size={22} /> : <Menu size={22} />}
			</button>

			{/* Menu rozwijane */}
			<div
				id="nav-mobile-menu"
				aria-hidden={!open}
				className={`absolute top-full right-0 left-0 flex-col gap-5 border-b border-ed-border bg-ed-cream px-6 py-6 ${
					open ? "flex" : "hidden"
				}`}
			>
				<Link
					href="#dla-uczelni"
					onClick={() => setOpen(false)}
					className="border-b border-ed-border py-1 pb-4 text-[16px] font-medium text-ed-ink no-underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-amber"
				>
					Dla uczelni
				</Link>
				<Link
					href="/login"
					onClick={() => setOpen(false)}
					className="py-1 text-[16px] font-medium text-ed-ink no-underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-amber"
				>
					Zaloguj się
				</Link>
				<Link
					href="/faculty/login"
					onClick={() => setOpen(false)}
					className="py-1 text-[16px] font-normal text-ed-muted no-underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ed-amber"
				>
					Panel uczelni
				</Link>
			</div>
		</div>
	);
}
