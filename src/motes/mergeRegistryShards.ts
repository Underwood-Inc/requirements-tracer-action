import path from 'node:path';
import type { RequirementRecord, RequirementsRegistry } from './types.js';

const KIND_SUFFIX_RE = /\.([a-z0-9]+)\.ya?ml$/i;

/** Infer expected requirement kind from a co-located shard filename (e.g. sidebar.fr.yaml → FR). */
export function expectedKindFromShardPath(filePath: string): string | undefined {
  const base = path.basename(filePath);
  const match = KIND_SUFFIX_RE.exec(base);
  if (!match) return undefined;
  return match[1].toUpperCase();
}

export interface RegistryShard {
  readonly path: string;
  readonly requirements: Readonly<Record<string, RequirementRecord>>;
  readonly schema_version?: number;
}

export interface MergeRegistryShardsOptions {
  /** When true, each shard's filename kind suffix must match row `kind` fields. */
  readonly enforceFilenameKind?: boolean;
}

/** Merge parsed registry shards; duplicate IDs across shards are a hard error. */
export function mergeRegistryShards(
  shards: readonly RegistryShard[],
  options: MergeRegistryShardsOptions = {},
): RequirementsRegistry {
  const merged: Record<string, RequirementRecord> = {};
  const sources = new Map<string, string>();
  let schemaVersion: number | undefined;

  for (const shard of shards) {
    if (shard.schema_version !== undefined) {
      if (schemaVersion === undefined) {
        schemaVersion = shard.schema_version;
      } else if (schemaVersion !== shard.schema_version) {
        throw new Error(
          `Invalid registry: conflicting schema_version in ${shard.path} (${shard.schema_version} vs ${schemaVersion}).`,
        );
      }
    }

    const expectedKind = options.enforceFilenameKind
      ? expectedKindFromShardPath(shard.path)
      : undefined;

    for (const [id, record] of Object.entries(shard.requirements)) {
      const prior = sources.get(id);
      if (prior) {
        throw new Error(
          `Duplicate requirement ${id} in ${shard.path} (already defined in ${prior}).`,
        );
      }
      if (expectedKind && record.kind.toUpperCase() !== expectedKind) {
        throw new Error(
          `Invalid registry: ${shard.path} expects kind ${expectedKind} but ${id} has kind ${record.kind}.`,
        );
      }
      merged[id] = record;
      sources.set(id, shard.path);
    }
  }

  if (schemaVersion !== undefined && schemaVersion !== 1) {
    throw new Error(`Invalid registry: schema_version must be 1, got ${String(schemaVersion)}.`);
  }

  return { schema_version: 1, requirements: merged };
}
