/**
 * Odporna ekstrakcja obiektu JSON z odpowiedzi modelu (#4 cz. 2, strumień D).
 *
 * KONTEKST (Leo, Tech Lead): warstwy AI w SkillBridge proszą model o "TYLKO JSON",
 * ale modele i tak czasem owijają wynik w prozę, blok ```json, albo zostawiają
 * przecinek na końcu (trailing comma). Wcześniejszy wzorzec (strip fence + greedy
 * /\{[\s\S]*\}/) radził sobie z prozą i blokiem, ale MIAŁ DWA UDOWODNIONE TRYBY
 * AWARII (zweryfikowane empirycznie na realnych kształtach outputu, nie na prod):
 *
 *   1. trailing comma: {"a":"x",}  → JSON.parse rzuca; greedy fallback też (ten sam
 *      tekst). Częsty artefakt modeli.
 *   2. dwa bloki / proza z nawiasami: greedy /\{...\}/ chwyta od PIERWSZEGO `{` do
 *      OSTATNIEGO `}`, sklejając dwa osobne obiekty / nawiasy z prozy w niepoprawny
 *      JSON. Przykład: "{"a":1}\nplus\n{"objective":"x"}" → parse FAIL.
 *
 * To NIE jest naprawa na ślepo pod hipotetyczną awarię: każdy z tych trybów jest
 * deterministyczną własnością parsera, pokrytą testem jednostkowym
 * (extract-json.test.ts) karmiącym dokładnie te "brudne" stringi.
 *
 * Czego ta funkcja świadomie NIE robi: nie próbuje "naprawiać" ucięty output
 * (maxOutputTokens wyczerpany → brak domykającego `}`). Wtedy NIE ma poprawnego
 * obiektu i właściwe zachowanie to czysty rzut (caller mapuje na opisowy błąd,
 * który #4-log łapie i loguje z kontekstem). Salwowanie urwanego JSON dałoby
 * cichy, częściowy brief — gorzej niż jawny błąd.
 */

/**
 * Zdejmuje opakowanie markdown code-fence (```json ... ``` lub ``` ... ```), jeśli
 * całość outputu jest w jednym bloku. Zachowanie zgodne z dotychczasowym wzorcem.
 */
function stripCodeFence(text: string): string {
	return text
		.trim()
		.replace(/^```(?:json)?\n?/, "")
		.replace(/\n?```$/, "")
		.trim();
}

/**
 * Usuwa trailing comma przed `}` / `]` (np. `{"a":1,}` → `{"a":1}`). Operuje tylko
 * na przecinkach, po których (po białych znakach) następuje klamra zamykająca — nie
 * dotyka przecinków-separatorów ani przecinków wewnątrz stringów typowego JSON modelu.
 */
function stripTrailingCommas(json: string): string {
	return json.replace(/,(\s*[}\]])/g, "$1");
}

/**
 * Znajduje pierwszy KOMPLETNY, zbalansowany top-level obiekt `{...}` w tekście,
 * świadomy stringów i escapowania (klamra w "tekst {x}" nie liczy się jako struktura).
 * Zwraca surowy fragment albo null. To zastępuje greedy /\{[\s\S]*\}/, który sklejał
 * wiele bloków — tu bierzemy pierwszy domknięty obiekt i nie wychodzimy poza niego.
 */
function firstBalancedObject(text: string): string | null {
	const start = text.indexOf("{");
	if (start === -1) return null;

	let depth = 0;
	let inString = false;
	let escaped = false;

	for (let i = start; i < text.length; i++) {
		const ch = text[i];

		if (inString) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === '"') inString = false;
			continue;
		}

		if (ch === '"') inString = true;
		else if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) return text.slice(start, i + 1);
		}
	}
	return null; // brak domknięcia (np. output ucięty) → caller rzuca jawnie
}

/**
 * Próbuje sparsować `raw` jako obiekt JSON, tolerując trailing comma. Rzuca, gdy
 * mimo to nie jest to poprawny JSON.
 */
function parseLenient<T>(raw: string): T {
	try {
		return JSON.parse(raw) as T;
	} catch {
		return JSON.parse(stripTrailingCommas(raw)) as T;
	}
}

/**
 * Ekstrahuje i parsuje obiekt JSON z surowego tekstu modelu.
 *
 * Kolejność prób (od najbardziej zaufanej do najbardziej tolerancyjnej):
 *   1. cały tekst po zdjęciu code-fence (model posłuchał "TYLKO JSON"),
 *   2. ten sam tekst z usuniętym trailing comma,
 *   3. pierwszy zbalansowany obiekt {...} wycięty z prozy (też z tolerancją comma).
 *
 * @throws Error(errorMessage) gdy żadna próba nie da poprawnego obiektu JSON.
 */
export function extractJsonObject<T>(
	text: string,
	errorMessage = "AI zwróciło nieprawidłowy JSON",
): T {
	const cleaned = stripCodeFence(text);

	// 1+2: cały output (model najczęściej zwraca czysty JSON).
	try {
		return parseLenient<T>(cleaned);
	} catch {
		// 3: wytnij pierwszy zbalansowany obiekt z prozy / wielu bloków.
		const candidate = firstBalancedObject(cleaned);
		if (candidate) {
			try {
				return parseLenient<T>(candidate);
			} catch {
				// przejście do rzutu poniżej
			}
		}
	}

	throw new Error(errorMessage);
}
