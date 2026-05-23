import type { RequirementsRegistry } from '../motes/types.js';

export interface RegistryLoadRequest {
  readonly rootDir: string;
  /** Legacy monolith path (absolute or relative to rootDir). Optional when registryGlobs is set. */
  readonly registryPath?: string;
  /** Glob patterns relative to rootDir for co-located registry shards. */
  readonly registryGlobs?: readonly string[];
  /** When true, shard filename kind suffix must match each row's kind field. Default: true. */
  readonly enforceFilenameKind?: boolean;
}

/** Socket: loads and validates the requirements registry (monolith or co-located shards). */
export interface RegistryReader {
  load(request: RegistryLoadRequest): Promise<RequirementsRegistry>;
}
