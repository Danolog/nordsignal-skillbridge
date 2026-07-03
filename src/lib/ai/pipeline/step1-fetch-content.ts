/**
 * Krok 1 — pobranie treści (rozszerzenie bezpiecznego pobieracza).
 *
 * Sekwencja (wszystko do api.github.com — SSRF nienaruszone, §2):
 *   1. metadane repo → default_branch,
 *   2. drzewo plików (recursive),
 *   3. zawartość WYBRANYCH plików (po filtrze content-filter), do limitów.
 *
 * Składa ustrukturyzowany dokument-pakiet (README + pliki z numerami linii) i
 * INPUT_META (truncated, omittedFiles). Łagodna degradacja: repo puste/
 * niedostępne → flaga `empty_or_unreadable`, potok idzie dalej z pustym
 * pakietem (krok 5 skieruje do człowieka). Nigdy nie rzuca wyjątkiem
 * wywracającym żądanie.
 */

import {
	fileHeader,
	isCandidateFile,
	isReadme,
	LIMITS,
	orderCandidates,
	truncateFileContent,
} from "@/lib/ai/pipeline/content-filter";
import {
	fetchBlobText,
	fetchRepoMeta,
	fetchRepoTree,
	type RepoCoords,
	repoCoordsFromUrl,
	type TreeEntry,
} from "@/lib/ai/pipeline/github";
import type {
	FetchContentData,
	FetchedFile,
	PipelineFlag,
	StepResult,
} from "@/lib/ai/pipeline/types";

const EMPTY: FetchContentData = {
	artifact: "",
	readme: "",
	files: [],
	omittedFiles: [],
	inputMeta: { truncated: false, omittedFiles: [] },
	defaultBranch: null,
};

function emptyResult(flag: PipelineFlag): StepResult<FetchContentData> {
	return { ok: false, data: EMPTY, flags: [flag] };
}

function countLines(text: string): number {
	if (text === "") return 0;
	return text.split("\n").length;
}

/**
 * Pobiera i skleja treść repo. `repoUrl` MUSI być już zweryfikowanym URL-em
 * github.com (parseRepoUrl po stronie wołającego). Tu dodatkowo wyłuskujemy
 * owner/repo i operujemy wyłącznie na api.github.com.
 */
export async function fetchContent(repoUrl: URL): Promise<StepResult<FetchContentData>> {
	const coords = repoCoordsFromUrl(repoUrl);
	if (!coords) {
		return emptyResult({
			code: "empty_or_unreadable",
			message: "Nie udało się odczytać właściciela/nazwy repozytorium z adresu.",
		});
	}

	const meta = await fetchRepoMeta(coords);
	if (!meta) {
		return emptyResult({
			code: "empty_or_unreadable",
			message: "Repozytorium niedostępne (nie istnieje, prywatne lub błąd GitHub API).",
		});
	}
	// 0.7 (CZERWONA LINIA — część kodowa): odrzuć repo prywatne PRZED pobraniem drzewa/blobów.
	// Confused-deputy: gdyby nasz token GitHub miał dostęp do prywatnego repo (własnego lub
	// organizacji), student mógłby podać jego URL i wyciągnąć prywatną treść do recenzji.
	// Oceniamy wyłącznie repozytoria publiczne — nie pobieramy treści, dopóki tego nie
	// potwierdzimy. (Rotacja tokenu na public-read to osobna, prod-owa część 0.7.)
	if (meta.private === true) {
		return emptyResult({
			code: "empty_or_unreadable",
			message:
				"Repozytorium jest prywatne — oceniamy wyłącznie repozytoria publiczne. Ustaw repo jako publiczne i spróbuj ponownie.",
		});
	}
	const defaultBranch = meta.default_branch?.trim() || "main";

	const tree = await fetchRepoTree(coords, defaultBranch);
	if (!tree?.tree || tree.tree.length === 0) {
		return {
			ok: false,
			data: { ...EMPTY, defaultBranch },
			flags: [{ code: "empty_or_unreadable", message: "Repozytorium puste lub bez listy plików." }],
		};
	}

	const candidates = tree.tree.filter(isCandidateFile);
	if (candidates.length === 0) {
		return {
			ok: false,
			data: { ...EMPTY, defaultBranch },
			flags: [
				{
					code: "empty_or_unreadable",
					message: "Brak plików nadających się do oceny (po odfiltrowaniu binariów/śmieci).",
				},
			],
		};
	}

	const result = await downloadAndPackage(coords, candidates, defaultBranch);

	// Drzewo obcięte przez GitHub (gigantyczne repo) też zaznaczamy.
	if (tree.truncated) {
		result.data.inputMeta.truncated = true;
		result.flags.push({
			code: "content_truncated",
			message: "Drzewo plików repozytorium zostało obcięte przez GitHub (bardzo duże repo).",
		});
	}
	return result;
}

/** Pobiera treść kandydatów w kolejności priorytetu, respektując budżet znaków. */
async function downloadAndPackage(
	coords: RepoCoords,
	candidates: TreeEntry[],
	defaultBranch: string,
): Promise<StepResult<FetchContentData>> {
	const ordered = orderCandidates(candidates);
	const files: FetchedFile[] = [];
	const omittedFiles: string[] = [];
	const flags: PipelineFlag[] = [];

	let budget = LIMITS.maxPackageChars;
	let truncated = false;
	let readme = "";

	for (const entry of ordered) {
		if (files.length >= LIMITS.maxFiles) {
			omittedFiles.push(entry.path);
			truncated = true;
			continue;
		}
		if (budget <= 0) {
			omittedFiles.push(entry.path);
			truncated = true;
			continue;
		}

		const raw = await fetchBlobText(coords, entry.sha);
		if (raw === null) {
			omittedFiles.push(entry.path);
			continue;
		}

		const capped = truncateFileContent(raw);
		const block = `${fileHeader(entry.path, countLines(capped.content))}\n${capped.content}`;

		if (block.length > budget) {
			// Nie zmieści się w całości — pomijamy (README mamy w priorytecie 0, więc
			// budżet starcza na niego; tu chronimy spójność cytatów: bez pół-pliku).
			omittedFiles.push(entry.path);
			truncated = true;
			continue;
		}

		budget -= block.length;
		files.push({
			path: entry.path,
			content: capped.content,
			lineCount: countLines(capped.content),
			truncated: capped.truncated,
		});
		if (isReadme(entry.path)) readme = capped.content;
		if (capped.truncated) truncated = true;
	}

	const artifact = files
		.map((f) => `${fileHeader(f.path, f.lineCount)}\n${f.content}`)
		.join("\n\n");

	if (truncated) {
		flags.push({
			code: "content_truncated",
			message: `Pakiet treści obcięty do budżetu — pominięto ${omittedFiles.length} plik(ów).`,
		});
	}

	return {
		ok: files.length > 0,
		data: {
			artifact,
			readme,
			files,
			omittedFiles,
			inputMeta: { truncated, omittedFiles },
			defaultBranch,
		},
		flags,
	};
}
