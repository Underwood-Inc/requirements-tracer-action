import type { TraceabilityConfig } from '../motes/types.js';

/** Socket: loads `.traceability.yaml` and merges defaults for missing fields. */
export interface ConfigReader {
  load(path: string): Promise<TraceabilityConfig>;
}
