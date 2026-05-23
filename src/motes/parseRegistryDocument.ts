import { parse as parseYaml } from 'yaml';
import type { RequirementRecord } from './types.js';

export interface ParsedRegistryDocument {
  readonly schema_version?: number;
  readonly requirements: Record<string, RequirementRecord>;
}

/** Parse a single registry shard or monolith YAML document into requirement records. */
export function parseRegistryDocument(
  raw: string,
  sourcePath: string,
): ParsedRegistryDocument {
  const data = parseYaml(raw) as Record<string, unknown> | null;
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid registry: ${sourcePath} did not parse as a YAML object.`);
  }

  const requirementsRaw = data.requirements;
  if (!requirementsRaw || typeof requirementsRaw !== 'object') {
    throw new Error(`Invalid registry: ${sourcePath} missing "requirements" map.`);
  }

  const schema_version =
    typeof data.schema_version === 'number' ? data.schema_version : undefined;

  const requirements: Record<string, RequirementRecord> = {};
  for (const [id, value] of Object.entries(requirementsRaw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') {
      throw new Error(`Invalid registry: ${sourcePath} — ${id} is not an object.`);
    }
    const v = value as Record<string, unknown>;
    if (typeof v.kind !== 'string' || v.kind.length === 0) {
      throw new Error(`Invalid registry: ${sourcePath} — ${id} missing "kind".`);
    }
    if (typeof v.title !== 'string' || v.title.length === 0) {
      throw new Error(`Invalid registry: ${sourcePath} — ${id} missing "title".`);
    }
    requirements[id] = {
      id,
      kind: v.kind,
      title: v.title,
      summary: typeof v.summary === 'string' ? v.summary : undefined,
      description: typeof v.description === 'string' ? v.description : undefined,
      rationale: typeof v.rationale === 'string' ? v.rationale : undefined,
      acceptance_criteria: Array.isArray(v.acceptance_criteria)
        ? (v.acceptance_criteria as string[])
        : undefined,
      owner: typeof v.owner === 'string' ? v.owner : undefined,
      status: (v.status as RequirementRecord['status']) ?? 'active',
      priority: v.priority as RequirementRecord['priority'],
      related_br: Array.isArray(v.related_br) ? (v.related_br as string[]) : undefined,
      linked_stories: Array.isArray(v.linked_stories) ? (v.linked_stories as string[]) : undefined,
      tags: Array.isArray(v.tags) ? (v.tags as string[]) : undefined,
      deprecated_in: typeof v.deprecated_in === 'string' ? v.deprecated_in : undefined,
      replaced_by: Array.isArray(v.replaced_by) ? (v.replaced_by as string[]) : undefined,
    };
  }

  return { schema_version, requirements };
}
