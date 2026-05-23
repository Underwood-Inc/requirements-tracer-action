/**
 * Socket: minimal file-system surface the tracer needs.
 * Plugs implement this against Node `fs` or in-memory stores for tests.
 */
export interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, contents: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  exists(path: string): Promise<boolean>;
  resolve(...segments: string[]): string;
  cwd(): string;
}
