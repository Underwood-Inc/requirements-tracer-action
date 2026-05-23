import { posix } from 'node:path';
import type { FileSystem } from '../../sockets/FileSystem.js';

/** Plug (in-memory): test-only file system backed by a Map. */
export class InMemoryFileSystem implements FileSystem {
  private readonly files = new Map<string, string>();
  private currentCwd = '/repo';

  withCwd(cwd: string): this {
    this.currentCwd = cwd;
    return this;
  }

  withFile(path: string, contents: string): this {
    this.files.set(this.resolve(path), contents);
    return this;
  }

  async readFile(path: string): Promise<string> {
    const abs = this.resolve(path);
    const value = this.files.get(abs);
    if (value === undefined) throw new Error(`ENOENT: no such file: ${abs}`);
    return value;
  }

  async writeFile(path: string, contents: string): Promise<void> {
    this.files.set(this.resolve(path), contents);
  }

  async mkdir(): Promise<void> {
    // In-memory FS treats directories as implicit.
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(this.resolve(path));
  }

  resolve(...segments: string[]): string {
    return posix.resolve(this.currentCwd, ...segments);
  }

  cwd(): string {
    return this.currentCwd;
  }
}
