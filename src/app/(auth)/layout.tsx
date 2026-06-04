import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="auth-page">
			{/* Background effects */}
			<div className="auth-dot-grid" />
			<div className="auth-blob auth-blob-1" />
			<div className="auth-blob auth-blob-2" />

			{/* Logo */}
			<Link href="/" className="auth-logo">
				<Logo size="md" variant="auth" />
			</Link>

			{/* Card */}
			<div className="auth-card">{children}</div>
		</div>
	);
}
