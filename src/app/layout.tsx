import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

// Landing #6 „Papierowy editorial": Playfair Display (nagłówki) + DM Sans (treść).
// next/font wbudowany — bez pakietu npm. latin-ext = polskie znaki diakrytyczne.
const playfairDisplay = Playfair_Display({
	variable: "--font-playfair",
	subsets: ["latin", "latin-ext"],
	weight: ["700"],
	display: "swap",
});

const dmSans = DM_Sans({
	variable: "--font-dm-sans",
	subsets: ["latin", "latin-ext"],
	weight: ["400", "500", "700"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "SkillBridge — Twój Paszport Kompetencji",
	description:
		"SkillBridge tłumaczy Twój program studiów na zawód, który chcesz wykonywać. Pokaż pracodawcy dowód umiejętności w paszporcie kompetencji.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="pl" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${dmSans.variable} antialiased`}
			>
				<AuthProvider>{children}</AuthProvider>
				<Toaster />
			</body>
		</html>
	);
}
