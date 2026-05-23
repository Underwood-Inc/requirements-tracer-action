import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FileSystem } from '../../sockets/FileSystem.js';

/** Plug: real-disk Node FS implementation. */
export class NodeFileSystem implements FileSystem {
  async readFile(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }
  async writeFile(path: string, contents: string): Promise<void> {
    await writeFile(path, contents, 'utf8');
  }
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await mkdir(path, { recursive: options?.recursive ?? true });
  }
  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }
  resolve(...segments: string[]): string {
    return resolve(...segments);
  }
  cwd(): string {
    return process.cwd();
  }
}
