import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
	afterDeleteAccount,
	beforeDeleteAccount,
	FLAGA_USUWANIA_KONTA,
} from "@/lib/auth/account-deletion";
import { db } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/flags";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	// Adresy podglądów Vercel: ufamy WYŁĄCZNIE wdrożeniom zakotwiczonym na slugu
	// zespołu `dareks-projects-da398fc0` (slug nadaje Vercel — nie da się go podrobić).
	// Prefiks `skill-bridge-` to faktyczna baza adresu projektu na Vercel (zweryfikowane
	// na żywym podglądzie: skill-bridge-<hash>-dareks-projects-da398fc0.vercel.app).
	// Fail-closed: po przemianowaniu zespołu regex przestaje pasować i podglądy tracą
	// zaufanie (świadomie — zamknięte zamiast dziurawego). Prod i localhost dokłada sam
	// Better Auth z origin baseURL/BETTER_AUTH_URL, więc ich tu nie powtarzamy.
	// Better Auth woła tę funkcję też przy starcie z request === undefined — wtedy
	// zwracamy [] (bez tego `request.headers` rzuca TypeError i wywala init auth).
	trustedOrigins: async (request) => {
		if (!request) return [];
		const raw = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
		let origin: string;
		try {
			origin = new URL(raw).origin;
		} catch {
			return [];
		}
		return /^https:\/\/skill-bridge-[a-z0-9-]+-dareks-projects-da398fc0\.vercel\.app$/i.test(origin)
			? [origin]
			: [];
	},
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID ?? "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
		},
	},
	// E1b (RODO art. 17, D-U1) — WŁĄCZAMY gotową ścieżkę biblioteki zamiast pisać
	// własną trasę. Trasa zbiorcza `/api/auth/[...path]` już ją oddaje, więc nie
	// dokładamy ani jednego pliku trasy. Szczegóły i uzasadnienie kształtu:
	// `src/lib/auth/account-deletion.ts`.
	//
	// Potwierdzenie tożsamości robi biblioteka sama (D-U2): hasło, gdy konto je
	// ma, w przeciwnym razie wymóg ŚWIEŻEJ SESJI. To nie jest wygoda — 18 z 33
	// kont produkcyjnych nie ma żadnego hasła (3 logowanie Google + 15 zasianych),
	// więc ścieżka oparta wyłącznie na haśle odebrałaby prawo z art. 17 ponad
	// połowie populacji.
	//
	// `sendDeleteAccountVerification` ŚWIADOMIE NIEUSTAWIONE — tryb pocztowy
	// zapisuje do tabeli `verification` wiersz o wartości równej identyfikatorowi
	// usuwanego konta, a ta tabela nie kaskaduje (E1b §3.5). Pilnuje tego
	// strażnik konfiguracji, nie ten komentarz.
	user: {
		deleteUser: {
			// Odczyt PRZY STARCIE — kierunek awarii zamkniętej. Bramką
			// ROZSTRZYGAJĄCĄ jest `beforeDelete` (odczyt przy każdym żądaniu),
			// bo zmienna środowiskowa przestawia się bez wdrożenia.
			enabled: isFeatureEnabled(FLAGA_USUWANIA_KONTA),
			beforeDelete: beforeDeleteAccount,
			afterDelete: afterDeleteAccount,
		},
	},
	plugins: [nextCookies()],
});
