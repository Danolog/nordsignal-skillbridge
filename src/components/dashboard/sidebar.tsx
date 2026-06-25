"use client";

import {
	Award,
	BookOpenCheck,
	FolderKanban,
	LayoutDashboard,
	LogOut,
	Map as MapIcon,
	Menu,
	TriangleAlert,
	UserCircle,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { authClient } from "@/lib/auth/client";

const navItems = [
	{ href: "/dashboard", label: "Pulpit", icon: LayoutDashboard },
	{ href: "/skill-map", label: "Mapa kompetencji", icon: MapIcon },
	{ href: "/gap-analysis", label: "Analiza luk", icon: TriangleAlert },
	{ href: "/projects", label: "Projekty", icon: FolderKanban },
	{ href: "/moja-droga", label: "Moja droga", icon: BookOpenCheck },
	{ href: "/passport", label: "Paszport", icon: Award },
	{ href: "/profil", label: "Profil", icon: UserCircle },
];

interface SidebarProps {
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
}

export function Sidebar({ user }: SidebarProps) {
	const pathname = usePathname();
	const router = useRouter();
	const [mobileOpen, setMobileOpen] = useState(false);

	const initials = user.name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	async function handleLogout() {
		await authClient.signOut();
		router.push("/");
	}

	return (
		<>
			{/* Mobile top bar */}
			<div className="db-mobile-topbar">
				<button
					type="button"
					className="db-hamburger"
					onClick={() => setMobileOpen(true)}
					aria-label="Otwórz menu"
				>
					<Menu size={24} />
				</button>
				<span className="db-mobile-logo">SkillBridge</span>
			</div>

			{/* Mobile overlay */}
			{mobileOpen && (
				<button
					type="button"
					className="db-sidebar-overlay"
					onClick={() => setMobileOpen(false)}
					aria-label="Zamknij menu"
				/>
			)}

			{/* Sidebar */}
			<aside className={`db-sidebar ${mobileOpen ? "open" : ""}`}>
				{/* Logo */}
				<div className="db-sidebar-logo">
					<Logo size="md" variant="sidebar" />
					{/* Mobile close button */}
					<button
						type="button"
						className="db-sidebar-close"
						onClick={() => setMobileOpen(false)}
						aria-label="Zamknij menu"
					>
						<X size={20} />
					</button>
				</div>

				{/* Navigation */}
				<nav className="db-sidebar-nav">
					{navItems.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`db-nav-item ${isActive ? "active" : ""}`}
								onClick={() => setMobileOpen(false)}
							>
								<item.icon size={20} />
								{item.label}
							</Link>
						);
					})}
				</nav>

				{/* Footer: user + logout */}
				<div className="db-sidebar-footer">
					<div className="db-sidebar-user">
						<div className="db-sidebar-avatar">{initials}</div>
						<div className="db-sidebar-user-info">
							<div className="db-sidebar-user-name">{user.name}</div>
							<div className="db-sidebar-user-email">{user.email}</div>
						</div>
					</div>
					<button type="button" className="db-sidebar-logout" onClick={handleLogout}>
						<LogOut size={18} />
						Wyloguj się
					</button>
				</div>
			</aside>
		</>
	);
}
