import { INNER_TRACE_ID_PATTERN } from '../motes/traceIdPattern.js';

/**
 * Extracts every trace ID referenced inside a test description.
 *
 * Accepts a compiled RegExp (the outer pattern) so callers can override the
 * default through configuration. The function tolerates configurations that
 * pass either a global or non-global regex.
 *
 * @traceId META-001
 */
export function parseTraceIds(description: string, outerPattern: RegExp): readonly string[] {
  const pattern = outerPattern.global ? outerPattern : new RegExp(outerPattern.source, 'g');
  const ids: string[] = [];
  for (const match of description.matchAll(pattern)) {
    const inner = new RegExp(INNER_TRACE_ID_PATTERN.source, 'g');
    for (const idMatch of match[0].matchAll(inner)) {
      ids.push(idMatch[0]);
    }
  }
  return Array.from(new Set(ids));
}
