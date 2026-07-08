import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewLoginForm } from "@/components/review/review-login-form";
import { Logo } from "@/components/ui/logo";
import { isFeatureEnabled } from "@/lib/flags";

// B8/1.5 — logowanie operatora (ADR-011). Flaga off → strona nie istnieje.
export default function ReviewLoginPage() {
	if (!isFeatureEnabled("humanReviewQueue")) notFound();

	return (
		<div className="auth-page">
			<div className="auth-dot-grid" />
			<div className="auth-blob auth-blob-1" />
			<div className="auth-blob auth-blob-2" />

			<Link href="/" className="auth-logo">
				<Logo size="md" variant="auth" />
			</Link>

			<div className="auth-card">
				<ReviewLoginForm />
			</div>
		</div>
	);
}
