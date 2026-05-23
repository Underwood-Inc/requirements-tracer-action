import fg from 'fast-glob';
import path from 'node:path';
import type { FileSystem } from '../../sockets/FileSystem.js';
import type { RegistryLoadRequest, RegistryReader } from '../../sockets/RegistryReader.js';
import type { RequirementsRegistry } from '../../motes/types.js';
import { mergeRegistryShards, type RegistryShard } from '../../motes/mergeRegistryShards.js';
import { parseRegistryDocument } from '../../motes/parseRegistryDocument.js';

/** Plug: loads co-located registry shards (and optional legacy monolith) from disk. */
export class YamlRegistryReader implements RegistryReader {
  constructor(private readonly fs: FileSystem) {}

  async load(request: RegistryLoadRequest): Promise<RequirementsRegistry> {
    const shards: RegistryShard[] = [];
    const { rootDir, registryPath, registryGlobs, enforceFilenameKind = true } = request;

    if (registryPath) {
      const absolute = path.isAbsolute(registryPath)
        ? registryPath
        : this.fs.resolve(rootDir, registryPath);
      if (await this.fs.exists(absolute)) {
        shards.push(await this.readShard(absolute));
      }
    }

    if (registryGlobs && registryGlobs.length > 0) {
      const paths = await fg([...registryGlobs], {
        cwd: rootDir,
        absolute: true,
        onlyFiles: true,
        dot: false,
      });
      const sorted = paths as string[];
      sorted.sort((a, b) => a.localeCompare(b));
      for (const filePath of sorted) {
        shards.push(await this.readShard(filePath));
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

  private async readShard(filePath: string): Promise<RegistryShard> {
    const raw = await this.fs.readFile(filePath);
    const parsed = parseRegistryDocument(raw, filePath);
    return {
      path: filePath,
      requirements: parsed.requirements,
      schema_version: parsed.schema_version,
    };
  }
}
