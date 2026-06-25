/**
 * Deterministyczny generator grafu mapy kompetencji (skill map).
 *
 * Zastępuje wcześniejsze wywołanie modelu w `src/lib/ai/generate-skill-map.ts`,
 * które SAMO wymyślało 5–10 „brakujących" kompetencji niezależnie od tabeli `gaps`
 * oraz wymyślało krawędzie typu „prerekwizyt" (Python→Pandas). Skutkiem były
 * rozjeżdżające się liczby na trzech widokach (dashboard / mapa / analiza luk).
 *
 * Tu graf jest WYPROWADZANY deterministycznie z jedynego źródła prawdy:
 * kompetencji studenta + luk (gaps). Te same wejścia ⇒ ten sam graf
 * (czyste, bez I/O, bez losowości, bez wywołań LLM).
 *
 * --- SEMANTYKA (decyzja do świadomej akceptacji Ethana, domena 14) ---
 *
 * WĘZŁY:
 *   - 1 węzeł na każdą kompetencję studenta, którą student POSIADA — czyli status
 *     "acquired" lub "in_progress". marketPercentage z kolumny.
 *   - 1 węzeł na każdą lukę (`gaps`) — status zawsze "missing", marketPercentage
 *     z `gaps.marketPercentage`. Dzięki temu liczba węzłów "missing" == liczba luk
 *     widziana przez dashboard (gapCount) i przez analizę luk (suma priorytetów).
 *
 * DECYZJA — kompetencja studenta ze statusem "missing" (FORK, do akceptacji Ethana):
 *   Kolumna `competencies.status` może być "missing" (samoocena poziom 1 = „nie znam",
 *   levelToStatus; albo competencyUpdates z generateGaps). Gdybyśmy renderowali takie
 *   wiersze jako czerwone węzły "missing" NA RÓWNI z lukami, to „Brakuje" na mapie
 *   = (kompetencje missing) + (luki) > gapCount — i złamałoby to twardy niezmiennik
 *   #1: „Brakuje na mapie == gapCount == suma luk". Dlatego JEDYNYM źródłem węzłów
 *   "missing" są LUKI (tabela `gaps`). Kompetencja studenta ze statusem "missing"
 *   to deklaracja „nie znam" — jeśli rynek jej wymaga, i tak pojawia się jako luka
 *   (gap). Pokazanie jej dodatkowo jako osobnego czerwonego węzła = podwójne liczenie
 *   tej samej rzeczy. Skutek: na mapie nie ma czerwonych węzłów „własnych kompetencji";
 *   czerwień == rynkowe luki. To świadomy wybór pod niezmiennik spójności liczb —
 *   alternatywą jest poluzowanie niezmiennika (mapa liczy też missing-kompetencje),
 *   co wymaga decyzji produktowej Sophii + zmiany testu spójności. Zgłoszone Ethanowi.
 *
 * KRAWĘDZIE: deterministyczne grupowanie po STATUSIE. W każdej z trzech grup
 *   (acquired / in_progress / missing) pierwszy węzeł jest „kotwicą" grupy, a
 *   pozostałe węzły tej grupy są z nim połączone (gwiazda). Krawędzie NIE niosą
 *   relacji „prerekwizyt" — patrz niżej.
 *
 * CO ŚWIADOMIE POMINIĘTO vs wersja modelowa (do decyzji Ethana):
 *   Model rysował krawędzie jako relacje merytoryczne między kompetencjami
 *   (np. „Python → Pandas", „SQL → Bazy danych"). Tej relacji NIE da się
 *   odtworzyć deterministycznie: ani `competencies`, ani `gaps` nie mają
 *   kolumny opisującej zależności/prerekwizyty między kompetencjami (jedyne
 *   pola to name/status/marketPercentage). Zgadywanie tych krawędzi po nazwie
 *   = powrót do niedeterministycznej heurystyki, którą ta zmiana usuwa.
 *   Dlatego krawędzie redukujemy do uczciwego, deterministycznego grupowania
 *   po statusie. Jeśli relacje prerekwizytów mają wrócić jako produktowa
 *   funkcja — wymagają OSOBNEGO źródła danych (kolumna/tablica zależności),
 *   nie modelu w ścieżce renderu. To fork projektowy zgłoszony do Ethana.
 *
 * Kontrakt danych (kształt nodes/edges) jest IDENTYCZNY jak dotąd zapisywany do
 * `skillMaps` i konsumowany przez `skill-map-view.tsx` / `skill-node.tsx` /
 * `node-detail-panel.tsx` (label, status, marketPercentage, category) —
 * render działa bez przeróbek.
 */

export type SkillMapStatus = "acquired" | "in_progress" | "missing";

export interface GraphCompetency {
	name: string;
	status: SkillMapStatus;
	marketPercentage?: number | null;
}

export interface GraphGap {
	competencyName: string;
	marketPercentage?: number | null;
}

export interface SkillGraphNode {
	id: string;
	type: "skillNode";
	position: { x: number; y: number };
	data: {
		label: string;
		status: SkillMapStatus;
		category: string;
		marketPercentage?: number;
	};
}

export interface SkillGraphEdge {
	id: string;
	source: string;
	target: string;
}

export interface SkillGraph {
	nodes: SkillGraphNode[];
	edges: SkillGraphEdge[];
}

// Kolejność grup (kolumn) na kanwie — stała, więc layout jest deterministyczny.
const STATUS_ORDER: SkillMapStatus[] = ["acquired", "in_progress", "missing"];

// Etykieta kategorii pokazywana w panelu szczegółów — pochodzi ze statusu
// (jedyny sygnał deterministyczny obecny w danych). Nie wymyślamy „programming"
// /„devops" jak robił model, bo tej informacji nie ma w źródle prawdy.
const STATUS_CATEGORY: Record<SkillMapStatus, string> = {
	acquired: "Masz",
	in_progress: "W trakcie",
	missing: "Brakuje",
};

// Rozstaw siatki (px) — zachowany z dawnego promptu (x co 220, y co 100),
// żeby układ wizualnie pasował do dotychczasowego.
const COLUMN_GAP_X = 220;
const ROW_GAP_Y = 100;

/**
 * Buduje deterministyczny graf z kompetencji studenta i luk.
 *
 * @param competencies kompetencje studenta (z tabeli `competencies`)
 * @param gaps luki (z tabeli `gaps`) — każda staje się węzłem "missing"
 * @returns `{ nodes, edges }` w kształcie zapisywanym do `skillMaps`
 */
export function buildGraph(
	competencies: readonly GraphCompetency[],
	gaps: readonly GraphGap[],
): SkillGraph {
	const nodes: SkillGraphNode[] = [];

	// 1) Węzły kompetencji studenta, które POSIADA (acquired / in_progress).
	//    Pomijamy status "missing" — to deklaracja „nie znam", liczona już jako
	//    luka (patrz DECYZJA w nagłówku). Dzięki temu jedynym źródłem węzłów
	//    "missing" są luki ⇒ niezmiennik #1 trzyma się dokładnie.
	for (const comp of competencies) {
		if (comp.status === "missing") continue;
		nodes.push(makeNode(`comp-${nodes.length}`, comp.name, comp.status, comp.marketPercentage));
	}

	// 2) Węzły luk — zawsze "missing". Liczba tych węzłów == liczba luk (sedno #1:
	//    "Brakuje" na mapie == gapCount na dashboardzie == suma luk w analizie luk).
	for (const gap of gaps) {
		nodes.push(
			makeNode(`gap-${nodes.length}`, gap.competencyName, "missing", gap.marketPercentage),
		);
	}

	// 3) Pozycje + krawędzie: grupujemy po statusie. Każda grupa to jedna kolumna;
	//    pierwszy węzeł grupy jest kotwicą, reszta węzłów łączy się z kotwicą
	//    (deterministyczna gwiazda). Iteracja po STATUS_ORDER + zachowanej
	//    kolejności wstawiania ⇒ te same wejścia dają ten sam wynik.
	const edges: SkillGraphEdge[] = [];
	let column = 0;
	for (const status of STATUS_ORDER) {
		const group = nodes.filter((n) => n.data.status === status);
		if (group.length === 0) continue;

		const x = column * COLUMN_GAP_X;
		group.forEach((node, row) => {
			node.position = { x, y: row * ROW_GAP_Y };
		});

		const anchor = group[0];
		for (let i = 1; i < group.length; i++) {
			edges.push({
				id: `e-${anchor.id}-${group[i].id}`,
				source: anchor.id,
				target: group[i].id,
			});
		}
		column++;
	}

	return { nodes, edges };
}

function makeNode(
	id: string,
	label: string,
	status: SkillMapStatus,
	marketPercentage?: number | null,
): SkillGraphNode {
	const data: SkillGraphNode["data"] = {
		label,
		status,
		category: STATUS_CATEGORY[status],
	};
	// marketPercentage opcjonalne — pomijamy null/undefined, żeby panel szczegółów
	// nie pokazywał „0% ofert" tam, gdzie po prostu brak danych.
	if (marketPercentage != null) {
		data.marketPercentage = marketPercentage;
	}
	return { id, type: "skillNode", position: { x: 0, y: 0 }, data };
}
