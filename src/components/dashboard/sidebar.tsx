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
import { authClient } from "@/lib/auth/client";

const navItems = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/skill-map", label: "Skill Map", icon: MapIcon },
	{ href: "/gap-analysis", label: "Gap Analysis", icon: TriangleAlert },
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
					<div className="db-sidebar-logo-icon" aria-hidden="true">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth="2"
							role="img"
							aria-label="SkillBridge logo"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
							/>
						</svg>
					</div>
					<span className="db-sidebar-logo-text">SkillBridge</span>
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
