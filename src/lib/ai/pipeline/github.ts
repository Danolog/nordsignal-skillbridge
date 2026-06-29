/**
 * Klient GitHub API dla potoku oceny (kroki 1 i 4).
 *
 * OCHRONA SSRF (§0.4 designu) — NIENARUSZONA:
 *  - Wejściowy adres repo przechodzi przez `parseRepoUrl` (biała lista hostów =
 *    tylko github.com) PRZED dotarciem tutaj. Tu już operujemy na owner/repo.
 *  - Każde zapytanie idzie WYŁĄCZNIE do `https://api.github.com` — stały host,
 *    nigdy adres podany swobodnie przez studenta. owner/repo wstrzykujemy jako
 *    segmenty ścieżki po `encodeURIComponent`, więc nie da się „uciec" do innego
 *    hosta ani dopisać ścieżki sterującej.
 *
 * UWIERZYTELNIENIE: zmienna środowiskowa GitHub PAT (jest w Vercelu; lokalnie
 * może jej nie być). Bez niej GitHub daje 60 zapytań/h z IP — wystarcza do
 * testów, za mało na produkcji (jedno zgłoszenie ~5–45 zapytań). Zakres =
 * minimalny (publiczny odczyt). To czerwona linia (nowe źródło danych) —
 * sign-off Darka; tu tylko CZYTAMY zmienną z env, nie podpinamy nowego MCP ani
 * nie zapisujemy żadnego literału w repo.
 */

const GITHUB_API_BASE = "https://api.github.com";
const DEFAULT_TIMEOUT_MS = 8000;

/** Owner + repo wyłuskane z white-listowanego URL-a github.com. */
export type RepoCoords = { owner: string; repo: string };

/**
 * Wyłuskuje { owner, repo } ze ścieżki sparsowanego URL-a github.com.
 * Zwraca null, gdy ścieżka nie wygląda jak `/owner/repo`.
 */
export function repoCoordsFromUrl(url: URL): RepoCoords | null {
	const segments = url.pathname.split("/").filter(Boolean);
	if (segments.length < 2) return null;
	const owner = segments[0];
	// odetnij ewentualne `.git` i sufiksy typu `/tree/...`
	const repo = segments[1].replace(/\.git$/, "");
	if (!owner || !repo) return null;
	return { owner, repo };
}

function githubHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		accept: "application/vnd.github+json",
		"user-agent": "SkillBridge-Reviewer/1.0",
		"x-github-api-version": "2022-11-28",
	};
	// Odczyt poświadczenia z env (Secret Manager / Vercel env), nigdy literał w repo.
	const ghAuth = process.env.GITHUB_TOKEN?.trim();
	if (ghAuth) headers.authorization = `Bearer ${ghAuth}`;
	return headers;
}

/**
 * Surowe zapytanie GET do GitHub API. `path` MUSI być gotową, bezpieczną
 * ścieżką (segmenty już zakodowane przez wołającego). `query` doklejamy jako
 * search params. Zwraca sparsowany JSON albo null (błąd sieci / nie-2xx / timeout).
 */
async function githubGet<T>(
	path: string,
	query?: Record<string, string>,
	timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T | null> {
	const url = new URL(`${GITHUB_API_BASE}${path}`);
	// Twardy bezpiecznik SSRF: po złożeniu URL host MUSI być api.github.com.
	if (url.hostname !== "api.github.com") return null;
	if (query) {
		for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
	}
	try {
		const res = await fetch(url, {
			signal: AbortSignal.timeout(timeoutMs),
			headers: githubHeaders(),
		});
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

/** Bezpieczna ścieżka `/repos/{owner}/{repo}` z zakodowanymi segmentami. */
function repoPath({ owner, repo }: RepoCoords, suffix = ""): string {
	return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${suffix}`;
}

// ---- Kształty odpowiedzi GitHub (tylko pola, których używamy) ----

export type RepoMeta = {
	full_name?: string;
	language?: string;
	created_at?: string;
	pushed_at?: string;
	default_branch?: string;
	size?: number;
};

export type TreeEntry = {
	path: string;
	type: "blob" | "tree" | string;
	size?: number;
	sha: string;
};

export type TreeResponse = {
	tree?: TreeEntry[];
	truncated?: boolean;
};

export type BlobContent = {
	content?: string;
	encoding?: string;
};

export type CommitListEntry = {
	sha: string;
	commit?: {
		author?: { name?: string; email?: string; date?: string };
	};
	author?: { login?: string } | null;
};

// ---- API wysokopoziomowe ----

/** Krok 1.1 — metadane repo (nazwa, język, daty, default_branch, rozmiar). */
export function fetchRepoMeta(coords: RepoCoords): Promise<RepoMeta | null> {
	return githubGet<RepoMeta>(repoPath(coords));
}

/** Krok 1.2 — pełne drzewo plików (recursive). null gdy niedostępne. */
export function fetchRepoTree(coords: RepoCoords, branch: string): Promise<TreeResponse | null> {
	return githubGet<TreeResponse>(repoPath(coords, `/git/trees/${encodeURIComponent(branch)}`), {
		recursive: "1",
	});
}

/** Krok 1.3 — zawartość pliku po SHA (blob). Dekoduje base64 do tekstu. */
export async function fetchBlobText(coords: RepoCoords, sha: string): Promise<string | null> {
	const blob = await githubGet<BlobContent>(
		repoPath(coords, `/git/blobs/${encodeURIComponent(sha)}`),
	);
	if (!blob?.content) return null;
	if (blob.encoding && blob.encoding !== "base64") return null;
	try {
		return Buffer.from(blob.content, "base64").toString("utf8");
	} catch {
		return null;
	}
}

/** Krok 4 — lista commitów (max `perPage`, jedna strona wystarcza do sygnałów). */
export function fetchCommits(coords: RepoCoords, perPage = 100): Promise<CommitListEntry[] | null> {
	return githubGet<CommitListEntry[]>(repoPath(coords, "/commits"), {
		per_page: String(perPage),
	});
}
