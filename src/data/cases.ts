export interface Case {
  case_id: string;
  country: string;
  debt_eur: number;
  debt_origin: string;
  debt_age_months: number;
  call_attempts: number;
  call_outcome: string;
  legal_asset_finding: string;
  priority_score?: number;
  enrichment?: EnrichmentData | null;
}

export interface EnrichmentData {
  status: "pending" | "enriching" | "complete" | "failed";
  timestamp?: string;
  profile?: {
    estimated_employment?: string;
    estimated_income_bracket?: string;
    social_presence?: string[];
    possible_assets?: string[];
    contact_alternatives?: string[];
    location_signals?: string[];
    business_connections?: string[];
    risk_indicators?: string[];
    leverage_points?: string[];
  };
  sources?: { url: string; type: string; snippet: string }[];
  negotiation_strategy?: string;
  confidence: number;
  gaps: string[];
  raw_findings?: string;
}

export type CallOutcome =
  | "rings_out" | "voicemail" | "invalid_number" | "not_debtor"
  | "busy" | "relative" | "denies_identity" | "wont_pay"
  | "hung_up" | "payment_plan" | "needs_proof" | "never_owed";

export type AssetFinding =
  | "no_assets_found" | "assets_not_seizable" | "not_initiated"
  | "employment_income" | "bank_account" | "vehicle" | "pension" | "multiple";

const CALL_OUTCOME_SCORES: Record<string, number> = {
  payment_plan: 0.9,
  needs_proof: 0.7,
  wont_pay: 0.6,
  hung_up: 0.5,
  busy: 0.4,
  relative: 0.5,
  denies_identity: 0.6,
  voicemail: 0.3,
  rings_out: 0.2,
  not_debtor: 0.1,
  invalid_number: 0.1,
  never_owed: 0.05,
};

const ASSET_SCORES: Record<string, number> = {
  multiple: 1.0,
  employment_income: 0.8,
  bank_account: 0.7,
  vehicle: 0.6,
  pension: 0.5,
  assets_not_seizable: 0.2,
  no_assets_found: 0.1,
  not_initiated: 0.15,
};

export function calculatePriority(c: Case): number {
  const debtNorm = Math.min(c.debt_eur / 100000, 1);
  const callScore = CALL_OUTCOME_SCORES[c.call_outcome] ?? 0.2;
  const assetScore = ASSET_SCORES[c.legal_asset_finding] ?? 0.1;
  const freshnessScore = Math.max(0, 1 - c.debt_age_months / 48);
  const attemptPenalty = Math.max(0, 1 - c.call_attempts / 10);

  return (
    debtNorm * 0.3 +
    callScore * 0.2 +
    assetScore * 0.25 +
    freshnessScore * 0.15 +
    attemptPenalty * 0.1
  );
}

export const CASES: Case[] = [
  { case_id: "C001", country: "ES", debt_eur: 21077, debt_origin: "personal_loan", debt_age_months: 31, call_attempts: 1, call_outcome: "not_debtor", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C002", country: "PL", debt_eur: 6665, debt_origin: "personal_loan", debt_age_months: 8, call_attempts: 2, call_outcome: "not_debtor", legal_asset_finding: "no_assets_found" },
  { case_id: "C003", country: "ES", debt_eur: 2384, debt_origin: "telecom", debt_age_months: 6, call_attempts: 3, call_outcome: "busy", legal_asset_finding: "no_assets_found" },
  { case_id: "C004", country: "PT", debt_eur: 11543, debt_origin: "consumer_loan", debt_age_months: 13, call_attempts: 6, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C005", country: "ES", debt_eur: 5676, debt_origin: "credit_card", debt_age_months: 6, call_attempts: 2, call_outcome: "invalid_number", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C006", country: "PT", debt_eur: 13448, debt_origin: "credit_card", debt_age_months: 6, call_attempts: 3, call_outcome: "not_debtor", legal_asset_finding: "no_assets_found" },
  { case_id: "C007", country: "FR", debt_eur: 14883, debt_origin: "auto_loan", debt_age_months: 19, call_attempts: 3, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C008", country: "PT", debt_eur: 13089, debt_origin: "credit_card", debt_age_months: 30, call_attempts: 1, call_outcome: "invalid_number", legal_asset_finding: "no_assets_found" },
  { case_id: "C009", country: "PT", debt_eur: 1119, debt_origin: "telecom", debt_age_months: 14, call_attempts: 4, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C010", country: "PT", debt_eur: 1044, debt_origin: "utility", debt_age_months: 5, call_attempts: 3, call_outcome: "voicemail", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C011", country: "PT", debt_eur: 63271, debt_origin: "sme_loan", debt_age_months: 25, call_attempts: 5, call_outcome: "voicemail", legal_asset_finding: "employment_income" },
  { case_id: "C012", country: "PT", debt_eur: 9631, debt_origin: "credit_card", debt_age_months: 21, call_attempts: 4, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C013", country: "PT", debt_eur: 1636, debt_origin: "utility", debt_age_months: 10, call_attempts: 2, call_outcome: "invalid_number", legal_asset_finding: "bank_account" },
  { case_id: "C014", country: "PT", debt_eur: 9268, debt_origin: "auto_loan", debt_age_months: 34, call_attempts: 1, call_outcome: "invalid_number", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C015", country: "PT", debt_eur: 8039, debt_origin: "credit_card", debt_age_months: 33, call_attempts: 4, call_outcome: "voicemail", legal_asset_finding: "no_assets_found" },
  { case_id: "C016", country: "DE", debt_eur: 1400, debt_origin: "telecom", debt_age_months: 18, call_attempts: 2, call_outcome: "not_debtor", legal_asset_finding: "no_assets_found" },
  { case_id: "C017", country: "FR", debt_eur: 246, debt_origin: "telecom", debt_age_months: 16, call_attempts: 4, call_outcome: "not_debtor", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C018", country: "DE", debt_eur: 7378, debt_origin: "consumer_loan", debt_age_months: 21, call_attempts: 2, call_outcome: "busy", legal_asset_finding: "bank_account" },
  { case_id: "C019", country: "DE", debt_eur: 10646, debt_origin: "credit_card", debt_age_months: 26, call_attempts: 5, call_outcome: "voicemail", legal_asset_finding: "no_assets_found" },
  { case_id: "C020", country: "DE", debt_eur: 12351, debt_origin: "credit_card", debt_age_months: 5, call_attempts: 1, call_outcome: "not_debtor", legal_asset_finding: "no_assets_found" },
  { case_id: "C021", country: "ES", debt_eur: 1219, debt_origin: "telecom", debt_age_months: 15, call_attempts: 7, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C022", country: "PT", debt_eur: 1237, debt_origin: "telecom", debt_age_months: 6, call_attempts: 3, call_outcome: "rings_out", legal_asset_finding: "not_initiated" },
  { case_id: "C023", country: "PT", debt_eur: 22548, debt_origin: "personal_loan", debt_age_months: 31, call_attempts: 5, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C024", country: "PL", debt_eur: 11778, debt_origin: "credit_card", debt_age_months: 31, call_attempts: 1, call_outcome: "wont_pay", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C025", country: "DE", debt_eur: 988, debt_origin: "utility", debt_age_months: 16, call_attempts: 4, call_outcome: "voicemail", legal_asset_finding: "employment_income" },
  { case_id: "C026", country: "NL", debt_eur: 290, debt_origin: "utility", debt_age_months: 31, call_attempts: 1, call_outcome: "not_debtor", legal_asset_finding: "not_initiated" },
  { case_id: "C027", country: "FR", debt_eur: 7956, debt_origin: "credit_card", debt_age_months: 27, call_attempts: 4, call_outcome: "denies_identity", legal_asset_finding: "no_assets_found" },
  { case_id: "C028", country: "IT", debt_eur: 436, debt_origin: "telecom", debt_age_months: 25, call_attempts: 7, call_outcome: "rings_out", legal_asset_finding: "pension" },
  { case_id: "C029", country: "PT", debt_eur: 18286, debt_origin: "auto_loan", debt_age_months: 11, call_attempts: 3, call_outcome: "relative", legal_asset_finding: "no_assets_found" },
  { case_id: "C030", country: "PT", debt_eur: 19617, debt_origin: "personal_loan", debt_age_months: 23, call_attempts: 6, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C031", country: "PT", debt_eur: 12188, debt_origin: "credit_card", debt_age_months: 29, call_attempts: 5, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C032", country: "ES", debt_eur: 21166, debt_origin: "personal_loan", debt_age_months: 12, call_attempts: 2, call_outcome: "not_debtor", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C033", country: "ES", debt_eur: 1061, debt_origin: "utility", debt_age_months: 28, call_attempts: 1, call_outcome: "invalid_number", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C034", country: "PL", debt_eur: 12084, debt_origin: "consumer_loan", debt_age_months: 23, call_attempts: 2, call_outcome: "invalid_number", legal_asset_finding: "no_assets_found" },
  { case_id: "C035", country: "ES", debt_eur: 20954, debt_origin: "personal_loan", debt_age_months: 4, call_attempts: 4, call_outcome: "voicemail", legal_asset_finding: "no_assets_found" },
  { case_id: "C036", country: "DK", debt_eur: 1325, debt_origin: "telecom", debt_age_months: 17, call_attempts: 4, call_outcome: "not_debtor", legal_asset_finding: "no_assets_found" },
  { case_id: "C037", country: "PT", debt_eur: 22004, debt_origin: "personal_loan", debt_age_months: 24, call_attempts: 4, call_outcome: "needs_proof", legal_asset_finding: "no_assets_found" },
  { case_id: "C038", country: "PT", debt_eur: 9238, debt_origin: "consumer_loan", debt_age_months: 32, call_attempts: 2, call_outcome: "not_debtor", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C039", country: "IT", debt_eur: 17005, debt_origin: "credit_card", debt_age_months: 14, call_attempts: 1, call_outcome: "denies_identity", legal_asset_finding: "not_initiated" },
  { case_id: "C040", country: "PL", debt_eur: 6649, debt_origin: "consumer_loan", debt_age_months: 36, call_attempts: 7, call_outcome: "rings_out", legal_asset_finding: "multiple" },
  { case_id: "C041", country: "FR", debt_eur: 1522, debt_origin: "telecom", debt_age_months: 9, call_attempts: 4, call_outcome: "rings_out", legal_asset_finding: "bank_account" },
  { case_id: "C042", country: "PT", debt_eur: 13023, debt_origin: "consumer_loan", debt_age_months: 23, call_attempts: 4, call_outcome: "rings_out", legal_asset_finding: "employment_income" },
  { case_id: "C043", country: "ES", debt_eur: 8025, debt_origin: "credit_card", debt_age_months: 13, call_attempts: 1, call_outcome: "not_debtor", legal_asset_finding: "no_assets_found" },
  { case_id: "C044", country: "IT", debt_eur: 9514, debt_origin: "auto_loan", debt_age_months: 19, call_attempts: 4, call_outcome: "not_debtor", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C045", country: "DK", debt_eur: 12015, debt_origin: "consumer_loan", debt_age_months: 8, call_attempts: 6, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C046", country: "ES", debt_eur: 1048, debt_origin: "utility", debt_age_months: 16, call_attempts: 2, call_outcome: "invalid_number", legal_asset_finding: "no_assets_found" },
  { case_id: "C047", country: "PT", debt_eur: 17699, debt_origin: "credit_card", debt_age_months: 29, call_attempts: 1, call_outcome: "invalid_number", legal_asset_finding: "not_initiated" },
  { case_id: "C048", country: "BE", debt_eur: 4417, debt_origin: "consumer_loan", debt_age_months: 4, call_attempts: 1, call_outcome: "invalid_number", legal_asset_finding: "vehicle" },
  { case_id: "C049", country: "PT", debt_eur: 66014, debt_origin: "sme_loan", debt_age_months: 31, call_attempts: 4, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C050", country: "ES", debt_eur: 870, debt_origin: "telecom", debt_age_months: 33, call_attempts: 3, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C051", country: "PT", debt_eur: 9665, debt_origin: "credit_card", debt_age_months: 11, call_attempts: 4, call_outcome: "payment_plan", legal_asset_finding: "no_assets_found" },
  { case_id: "C052", country: "BE", debt_eur: 696, debt_origin: "telecom", debt_age_months: 33, call_attempts: 3, call_outcome: "not_debtor", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C053", country: "ES", debt_eur: 17502, debt_origin: "personal_loan", debt_age_months: 36, call_attempts: 6, call_outcome: "rings_out", legal_asset_finding: "bank_account" },
  { case_id: "C054", country: "NL", debt_eur: 69432, debt_origin: "sme_loan", debt_age_months: 32, call_attempts: 2, call_outcome: "not_debtor", legal_asset_finding: "bank_account" },
  { case_id: "C055", country: "PT", debt_eur: 2094, debt_origin: "telecom", debt_age_months: 32, call_attempts: 5, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C056", country: "ES", debt_eur: 1162, debt_origin: "telecom", debt_age_months: 21, call_attempts: 4, call_outcome: "not_debtor", legal_asset_finding: "vehicle" },
  { case_id: "C057", country: "IT", debt_eur: 23537, debt_origin: "personal_loan", debt_age_months: 19, call_attempts: 2, call_outcome: "invalid_number", legal_asset_finding: "no_assets_found" },
  { case_id: "C058", country: "PL", debt_eur: 15913, debt_origin: "credit_card", debt_age_months: 8, call_attempts: 2, call_outcome: "invalid_number", legal_asset_finding: "bank_account" },
  { case_id: "C059", country: "PT", debt_eur: 9183, debt_origin: "credit_card", debt_age_months: 21, call_attempts: 5, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C060", country: "IT", debt_eur: 854, debt_origin: "utility", debt_age_months: 9, call_attempts: 1, call_outcome: "invalid_number", legal_asset_finding: "no_assets_found" },
  { case_id: "C061", country: "PT", debt_eur: 7942, debt_origin: "personal_loan", debt_age_months: 18, call_attempts: 6, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C062", country: "DE", debt_eur: 30739, debt_origin: "auto_loan", debt_age_months: 13, call_attempts: 4, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C063", country: "PL", debt_eur: 413, debt_origin: "telecom", debt_age_months: 30, call_attempts: 6, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C064", country: "IT", debt_eur: 1505, debt_origin: "telecom", debt_age_months: 33, call_attempts: 2, call_outcome: "invalid_number", legal_asset_finding: "no_assets_found" },
  { case_id: "C065", country: "PT", debt_eur: 3540, debt_origin: "credit_card", debt_age_months: 17, call_attempts: 4, call_outcome: "denies_identity", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C066", country: "PT", debt_eur: 997, debt_origin: "utility", debt_age_months: 5, call_attempts: 7, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C067", country: "ES", debt_eur: 15464, debt_origin: "personal_loan", debt_age_months: 34, call_attempts: 2, call_outcome: "voicemail", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C068", country: "DE", debt_eur: 7763, debt_origin: "consumer_loan", debt_age_months: 23, call_attempts: 4, call_outcome: "not_debtor", legal_asset_finding: "no_assets_found" },
  { case_id: "C069", country: "DK", debt_eur: 16730, debt_origin: "personal_loan", debt_age_months: 18, call_attempts: 3, call_outcome: "busy", legal_asset_finding: "employment_income" },
  { case_id: "C070", country: "IT", debt_eur: 1048, debt_origin: "telecom", debt_age_months: 21, call_attempts: 6, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C071", country: "PT", debt_eur: 2139, debt_origin: "telecom", debt_age_months: 5, call_attempts: 6, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C072", country: "DE", debt_eur: 84057, debt_origin: "mortgage_shortfall", debt_age_months: 29, call_attempts: 2, call_outcome: "never_owed", legal_asset_finding: "no_assets_found" },
  { case_id: "C073", country: "PT", debt_eur: 18315, debt_origin: "personal_loan", debt_age_months: 12, call_attempts: 1, call_outcome: "invalid_number", legal_asset_finding: "no_assets_found" },
  { case_id: "C074", country: "IT", debt_eur: 8455, debt_origin: "consumer_loan", debt_age_months: 5, call_attempts: 2, call_outcome: "busy", legal_asset_finding: "no_assets_found" },
  { case_id: "C075", country: "PT", debt_eur: 1516, debt_origin: "utility", debt_age_months: 31, call_attempts: 2, call_outcome: "not_debtor", legal_asset_finding: "not_initiated" },
  { case_id: "C076", country: "PT", debt_eur: 23128, debt_origin: "auto_loan", debt_age_months: 15, call_attempts: 1, call_outcome: "relative", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C077", country: "IT", debt_eur: 10024, debt_origin: "credit_card", debt_age_months: 28, call_attempts: 5, call_outcome: "rings_out", legal_asset_finding: "pension" },
  { case_id: "C078", country: "PL", debt_eur: 14935, debt_origin: "auto_loan", debt_age_months: 33, call_attempts: 4, call_outcome: "voicemail", legal_asset_finding: "no_assets_found" },
  { case_id: "C079", country: "ES", debt_eur: 84236, debt_origin: "mortgage_shortfall", debt_age_months: 28, call_attempts: 3, call_outcome: "denies_identity", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C080", country: "PT", debt_eur: 1876, debt_origin: "telecom", debt_age_months: 20, call_attempts: 2, call_outcome: "voicemail", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C081", country: "NL", debt_eur: 18411, debt_origin: "personal_loan", debt_age_months: 5, call_attempts: 1, call_outcome: "invalid_number", legal_asset_finding: "not_initiated" },
  { case_id: "C082", country: "FR", debt_eur: 12967, debt_origin: "credit_card", debt_age_months: 18, call_attempts: 3, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C083", country: "PT", debt_eur: 1799, debt_origin: "utility", debt_age_months: 6, call_attempts: 3, call_outcome: "rings_out", legal_asset_finding: "bank_account" },
  { case_id: "C084", country: "PL", debt_eur: 1162, debt_origin: "telecom", debt_age_months: 16, call_attempts: 1, call_outcome: "relative", legal_asset_finding: "pension" },
  { case_id: "C085", country: "PT", debt_eur: 28359, debt_origin: "auto_loan", debt_age_months: 13, call_attempts: 2, call_outcome: "hung_up", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C086", country: "PT", debt_eur: 4068, debt_origin: "consumer_loan", debt_age_months: 34, call_attempts: 3, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C087", country: "NL", debt_eur: 8642, debt_origin: "credit_card", debt_age_months: 33, call_attempts: 2, call_outcome: "invalid_number", legal_asset_finding: "no_assets_found" },
  { case_id: "C088", country: "FR", debt_eur: 13587, debt_origin: "credit_card", debt_age_months: 14, call_attempts: 2, call_outcome: "voicemail", legal_asset_finding: "no_assets_found" },
  { case_id: "C089", country: "PT", debt_eur: 6866, debt_origin: "credit_card", debt_age_months: 23, call_attempts: 3, call_outcome: "rings_out", legal_asset_finding: "no_assets_found" },
  { case_id: "C090", country: "DE", debt_eur: 21962, debt_origin: "personal_loan", debt_age_months: 5, call_attempts: 2, call_outcome: "invalid_number", legal_asset_finding: "no_assets_found" },
  { case_id: "C091", country: "DE", debt_eur: 52735, debt_origin: "sme_loan", debt_age_months: 28, call_attempts: 4, call_outcome: "relative", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C092", country: "PT", debt_eur: 7998, debt_origin: "credit_card", debt_age_months: 8, call_attempts: 7, call_outcome: "rings_out", legal_asset_finding: "employment_income" },
  { case_id: "C093", country: "ES", debt_eur: 23553, debt_origin: "personal_loan", debt_age_months: 19, call_attempts: 3, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C094", country: "PT", debt_eur: 12882, debt_origin: "personal_loan", debt_age_months: 11, call_attempts: 7, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C095", country: "PT", debt_eur: 4345, debt_origin: "personal_loan", debt_age_months: 26, call_attempts: 7, call_outcome: "rings_out", legal_asset_finding: "employment_income" },
  { case_id: "C096", country: "PT", debt_eur: 9018, debt_origin: "consumer_loan", debt_age_months: 27, call_attempts: 3, call_outcome: "rings_out", legal_asset_finding: "not_initiated" },
  { case_id: "C097", country: "PT", debt_eur: 12681, debt_origin: "credit_card", debt_age_months: 4, call_attempts: 4, call_outcome: "never_owed", legal_asset_finding: "no_assets_found" },
  { case_id: "C098", country: "IT", debt_eur: 17562, debt_origin: "credit_card", debt_age_months: 10, call_attempts: 6, call_outcome: "rings_out", legal_asset_finding: "multiple" },
  { case_id: "C099", country: "IT", debt_eur: 1633, debt_origin: "telecom", debt_age_months: 33, call_attempts: 4, call_outcome: "rings_out", legal_asset_finding: "assets_not_seizable" },
  { case_id: "C100", country: "IT", debt_eur: 43540, debt_origin: "sme_loan", debt_age_months: 15, call_attempts: 3, call_outcome: "denies_identity", legal_asset_finding: "no_assets_found" },
].map(c => ({ ...c, priority_score: calculatePriority(c) }));

export const COUNTRY_NAMES: Record<string, string> = {
  PT: "Portugal", ES: "Spain", DE: "Germany", FR: "France",
  IT: "Italy", PL: "Poland", NL: "Netherlands", BE: "Belgium",
  DK: "Denmark",
};

export const COUNTRY_FLAGS: Record<string, string> = {
  PT: "🇵🇹", ES: "🇪🇸", DE: "🇩🇪", FR: "🇫🇷",
  IT: "🇮🇹", PL: "🇵🇱", NL: "🇳🇱", BE: "🇧🇪",
  DK: "🇩🇰",
};

export function formatEur(amount: number): string {
  return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

export function getCallOutcomeColor(outcome: string): string {
  const positive = ["payment_plan", "needs_proof"];
  const neutral = ["busy", "voicemail", "rings_out", "relative"];
  const negative = ["invalid_number", "not_debtor", "denies_identity", "wont_pay", "hung_up", "never_owed"];
  if (positive.includes(outcome)) return "text-green";
  if (neutral.includes(outcome)) return "text-amber";
  return "text-red";
}

export function getAssetColor(finding: string): string {
  const good = ["multiple", "employment_income", "bank_account", "vehicle", "pension"];
  const neutral = ["assets_not_seizable", "not_initiated"];
  if (good.includes(finding)) return "text-green";
  if (neutral.includes(finding)) return "text-amber";
  return "text-red";
}

export function getPriorityLabel(score: number): { label: string; color: string } {
  if (score >= 0.6) return { label: "HIGH", color: "text-green" };
  if (score >= 0.4) return { label: "MEDIUM", color: "text-amber" };
  return { label: "LOW", color: "text-red" };
}
