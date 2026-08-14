import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
// Kroje pisma zaciągnięte lokalnie (`src/app/fonts/*.woff2`) — NIE `next/font/google`.
// Powód i zakresy znaków: komentarz na górze `fonts.css`. W skrócie: pobieranie
// kroju z `fonts.gstatic.com` w trakcie kompilacji czyniło cudzy serwer treści
// zależnością WYMAGANEJ bramki i 2026-08-14 zaczerwieniło ją błędem 404.
// Musi stać PRZED `globals.css`: to on konsumuje zmienne `--font-*`.
import "./fonts.css";
import "./globals.css";

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
			{/* Zmienne `--font-*` definiuje `:root` w `fonts.css`, więc na `<body>`
			    nie ma już klas generowanych przez `next/font`. */}
			<body className="antialiased">
				<AuthProvider>{children}</AuthProvider>
				<Toaster />
			</body>
		</html>
	);
}
