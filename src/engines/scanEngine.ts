import type { ConfigReader } from '../sockets/ConfigReader.js';
import type { TestScanner } from '../sockets/TestScanner.js';
import type { TestCase } from '../motes/types.js';

export interface ScanEngineInput {
  readonly configReader: ConfigReader;
  readonly scanner: TestScanner;
  readonly configPath: string;
  readonly rootDir: string;
}

/**
 * Engine: scans the workspace and emits a flat list of TestCases.
 * @traceId META-001
 */
export async function scanEngine(input: ScanEngineInput): Promise<readonly TestCase[]> {
  const config = await input.configReader.load(input.configPath);
  return input.scanner.scan(input.rootDir, config);
}
