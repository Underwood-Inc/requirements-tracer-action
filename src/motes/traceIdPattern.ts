/**
 * Default regex for extracting trace IDs from a test description.
 * Matches a square-bracket group containing one or more `PREFIX-NUMBER`
 * tokens separated by commas (e.g. `[FR-001]`, `[FR-001, BR-001]`).
 *
 * The match is performed via String.matchAll, so callers receive every
 * occurrence in the description.
 *
 * @traceId META-001
 */
export const DEFAULT_TRACE_ID_PATTERN =
  /\[((?:[A-Z][A-Z0-9]*-)+(?:\d+))(?:,\s*((?:[A-Z][A-Z0-9]*-)+(?:\d+)))*\]/g;

/**
 * Inner pattern used to enumerate the individual IDs *inside* a matched
 * bracket group, so we can support `[FR-001, BR-001]`, `[FR-CD-040]`, `[A11Y-CD-001]`,
 * and comma-separated mixes while collecting each ID separately.
 */
export const INNER_TRACE_ID_PATTERN = /(?:[A-Z][A-Z0-9]*-)+(?:\d+)/g;
