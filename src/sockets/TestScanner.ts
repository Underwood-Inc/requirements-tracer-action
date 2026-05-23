import type { TestCase, TraceabilityConfig } from '../motes/types.js';

/**
 * Socket: walks test files matching the configured globs and emits a TestCase
 * per `test(...)` / `it(...)` call.
 */
export interface TestScanner {
  scan(rootDir: string, config: TraceabilityConfig): Promise<readonly TestCase[]>;
}
