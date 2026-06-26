import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

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
	plugins: [nextCookies()],
});
