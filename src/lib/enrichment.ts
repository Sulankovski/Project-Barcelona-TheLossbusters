export function normalizeEnrichmentResult(payload: any): any {
  if (!payload || typeof payload !== "object") return payload;

  // If backend already returned structured object, keep it.
  if (!payload.parse_error) return payload;

  // If parse failed server-side, try repairing/parsing raw text client-side.
  const repaired = tryParseLooseJson(payload.raw_text);
  return repaired ?? payload;
}

function tryParseLooseJson(input: unknown): any | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try direct parse first.
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const withoutFences = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");
  const objectSlice =
    firstBrace >= 0 && lastBrace > firstBrace
      ? withoutFences.slice(firstBrace, lastBrace + 1)
      : withoutFences;

  // Remove trailing commas before closing brackets/braces.
  const cleaned = objectSlice.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
