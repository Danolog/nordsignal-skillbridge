// ============================================================================
// TYPY MODELU KARIERY (1.0) — zawężony kształt artefaktu career-model.json.
//
// Wyniesione z competency-groups.ts, bo od 1.0 artefakt ma DWA źródła (statyczny
// JSON w repo / wiersz career_model_versions w DB) i jeden wspólny kształt.
// Czytamy tylko pola potrzebne konsumentom (resolveJsonModule daje szeroki typ
// literałowy; pełny artefakt ma więcej pól — frameworks, projects itd.).
// ============================================================================

export interface ModelLeaf {
	name: string;
	kind?: string;
}

export interface ModelArea {
	name: string;
	description?: string;
	unionShare: number | null;
	leaves: ModelLeaf[];
}

export interface ModelPath {
	careerGoal: string;
	/** ETAP H: adnotacja-zastrzeżenie profilu ścieżki (etykieta UI; nieobecna gdy brak). */
	profileNote?: string;
	areas: ModelArea[];
}

export interface CareerModelData {
	paths: ModelPath[];
}
