import Link from "next/link";
import { FacultyLoginForm } from "@/components/faculty/faculty-login-form";
import { Logo } from "@/components/ui/logo";

export default function FacultyLoginPage() {
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
			<div className="auth-card">
				<FacultyLoginForm />
			</div>
		</div>
	);
}
