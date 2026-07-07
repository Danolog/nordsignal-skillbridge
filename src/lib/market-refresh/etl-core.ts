// ============================================================================
// AG.3 — RDZEŃ ETL DLA POTOKU ODŚWIEŻANIA RYNKU (re-eksport, zero nowej logiki).
//
// Endpoint ingest (app/api/market-refresh) potrzebuje czystego pipeline'u
// „wiersze CSV → artefakty" z tools/etl-justjoinit.ts. Silnik ŚWIADOMIE nie jest
// przenoszony ani kopiowany: prowenicja (docs/data/job-market-provenance.md §0)
// przypina liczby do silnika w tools/ — przeniesienie kodu wyglądałoby jak
// zmiana silnika i unieważniło ślad audytowy. Ten moduł jest JEDYNYM punktem,
// przez który kod aplikacji sięga do narzędzia (top-level main() w tools jest
// strzeżony i przy imporcie się nie wykonuje).
// ============================================================================

export {
	type Artifact,
	buildArtifact,
	type CareerGoalEntry,
	type CareerModel,
	parseCsv,
} from "../../../tools/etl-justjoinit";
