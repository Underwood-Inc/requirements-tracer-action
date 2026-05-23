import type { JsdocTags, Priority } from '../motes/types.js';

const TAG_LINE = /@(\w+)\s+(.*?)\s*$/;

/**
 * Parses a JSDoc-style block comment body into structured tags.
 * Input is the raw comment text WITHOUT the surrounding `/** ... *​/`.
 *
 * Recognised keys come from the optional list in .traceability.yaml;
 * unknown keys land in `tags.unknown` for the auditor to flag.
 *
 * @traceId META-001
 */
export function parseJsdocTags(commentBody: string, optionalTagNames: readonly string[]): JsdocTags {
  const lines = commentBody.split(/\r?\n/);

  let description: string | undefined;
  let owner: string | undefined;
  let kind: string | undefined;
  let priority: Priority | undefined;
  const linked: string[] = [];
  let coverage: string | undefined;
  const external: string[] = [];
  const unknown: { name: string; value: string }[] = [];

  const known = new Set(optionalTagNames);

  for (const rawLine of lines) {
    const cleaned = rawLine.replace(/^\s*\*\s?/, '').trim();
    if (!cleaned.startsWith('@')) continue;

    const match = TAG_LINE.exec(cleaned);
    if (!match) continue;

    const [, name, value] = match;
    if (!known.has(name)) {
      unknown.push({ name, value: value ?? '' });
      continue;
    }

    switch (name) {
      case 'description':
        description = value;
        break;
      case 'owner':
        owner = value;
        break;
      case 'kind':
        kind = value;
        break;
      case 'priority':
        if (isPriority(value)) priority = value;
        break;
      case 'linked':
        for (const token of splitCsv(value)) linked.push(token);
        break;
      case 'coverage':
        coverage = value;
        break;
      case 'external':
        external.push(value);
        break;
      default:
        unknown.push({ name, value });
    }
  }

  return {
    description,
    owner,
    kind,
    priority,
    linked: linked.length ? linked : undefined,
    coverage,
    external: external.length ? external : undefined,
    unknown: unknown.length ? unknown : undefined,
  };
}

function splitCsv(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isPriority(value: string): value is Priority {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical';
}
