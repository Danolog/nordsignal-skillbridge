// ============================================================================
// 1E.3 (ADR-014 D3) — WSPÓLNA lista kluczy JSON, które NIGDY nie mogą wyciec do
// config_json.examSlots (klucz/treść pytania żyją WYŁĄCZNIE w question_items DENY).
//
// Jedno źródło prawdy dla skanu wycieku: write-side unit (exam-ingest-writeside)
// i integracja ingestu (tools/__tests__/ingest-exam-bank.integration) używały
// tej samej listy w dwóch kopiach — rozjazd groził tym, że jeden test łapie
// wyciek, którego drugi nie widzi. Tu jest kanoniczny zestaw; test write-side
// rozszerza go o swoje dodatkowe klucze (`"answer"`, `"feedbackMd"`).
//
// Klucze są w formie ZE ZNAKAMI CUDZYSŁOWU (`'"correct"'`) — skan trafia w KLUCZ
// JSON, nie w gołe podciągi wartości (slug `correctness` czy `options-basics`
// nie jest fałszywym alarmem — patrz test I1 write-side).
// ============================================================================

/** Kanoniczne klucze zakazane w examSlots (skan wycieku klucza/treści pytania). */
export const FORBIDDEN_EXAM_SLOT_KEYS = [
	'"correct"',
	'"stem"',
	'"options"',
	'"answer_json"',
	'"answerJson"',
] as const;
