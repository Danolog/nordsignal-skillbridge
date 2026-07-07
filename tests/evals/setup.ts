// Setup projektu vitest "evals": ładuje zmienne środowiskowe z plików .env,
// bo vitest sam ich nie czyta (wzorzec jak drizzle.config.ts). Część LLM
// wymaga ANTHROPIC_API_KEY; bez niego suity LLM jawnie się pomijają.
// dotenv NIE nadpisuje zmiennych już ustawionych — kolejność: env procesu >
// .env.local > .env.
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });
