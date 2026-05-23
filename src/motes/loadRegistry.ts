import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import type { RequirementsRegistry } from './types.js';
import { mergeRegistryShards, type RegistryShard } from './mergeRegistryShards.js';
import { parseRegistryDocument } from './parseRegistryDocument.js';

export interface LoadRequirementsRegistryOptions {
  readonly rootDir: string;
  /** Legacy single-file path relative to rootDir or absolute. */
  readonly registryPath?: string;
  /** Glob patterns (relative to rootDir) for co-located registry shards. */
  readonly registryGlobs?: readonly string[];
  readonly enforceFilenameKind?: boolean;
}

function readShard(filePath: string): RegistryShard {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = parseRegistryDocument(raw, filePath);
  return {
    path: filePath,
    requirements: parsed.requirements,
    schema_version: parsed.schema_version,
  };
}

function resolveGlobPaths(rootDir: string, patterns: readonly string[]): string[] {
  const hits = fg.sync([...patterns], {
    cwd: rootDir,
    absolute: true,
    onlyFiles: true,
    dot: false,
  });
  return [...hits].sort((a, b) => a.localeCompare(b));
}

/**
 * Load a requirements registry from co-located shard globs and/or a legacy monolith file.
 * When both are configured, all shards are merged; duplicate IDs are a hard error.
 */
export function loadRequirementsRegistrySync(
  options: LoadRequirementsRegistryOptions,
): RequirementsRegistry {
  const shards: RegistryShard[] = [];
  const { rootDir, registryPath, registryGlobs, enforceFilenameKind = true } = options;

  if (registryPath) {
    const absolute = path.isAbsolute(registryPath)
      ? registryPath
      : path.join(rootDir, registryPath);
    if (fs.existsSync(absolute)) {
      shards.push(readShard(absolute));
    }
  }

  if (registryGlobs && registryGlobs.length > 0) {
    for (const filePath of resolveGlobPaths(rootDir, registryGlobs)) {
      shards.push(readShard(filePath));
    }
  }

  if (shards.length === 0) {
    const hint = registryGlobs?.length
      ? `registryGlobs matched no files under ${rootDir}`
      : `registry file not found at ${registryPath ?? '(unset)'}`;
    throw new Error(`Invalid registry: ${hint}.`);
  }

  return mergeRegistryShards(shards, { enforceFilenameKind });
}

/** JSON-serializable registry payload (matches in-app viewer shape). */
export function registryToJsonDocument(registry: RequirementsRegistry): Record<string, unknown> {
  return {
    schema_version: registry.schema_version,
    requirements: registry.requirements,
  };
}
