import { NodeFileSystem } from '../plugs/node/NodeFileSystem.js';
import { YamlRegistryReader } from '../plugs/node/YamlRegistryReader.js';
import { YamlConfigReader } from '../plugs/node/YamlConfigReader.js';
import { TsMorphTestScanner } from '../plugs/node/TsMorphTestScanner.js';
import { OctokitGitHubClient } from '../plugs/octokit/OctokitGitHubClient.js';
import { InlinedHtmlRenderer } from '../plugs/html/InlinedHtmlRenderer.js';
import type { FileSystem } from '../sockets/FileSystem.js';
import type { RegistryReader } from '../sockets/RegistryReader.js';
import type { ConfigReader } from '../sockets/ConfigReader.js';
import type { TestScanner } from '../sockets/TestScanner.js';
import type { GitHubClient } from '../sockets/GitHubClient.js';
import type { HtmlRenderer } from '../sockets/HtmlRenderer.js';

export interface CliWeave {
  readonly fs: FileSystem;
  readonly registryReader: RegistryReader;
  readonly configReader: ConfigReader;
  readonly scanner: TestScanner;
  readonly github: GitHubClient;
  readonly renderer: HtmlRenderer;
}

/** Weave: production composition root for the CLI. */
export function createCliWeave(env: NodeJS.ProcessEnv = process.env): CliWeave {
  const fs = new NodeFileSystem();
  return {
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new TsMorphTestScanner(),
    github: new OctokitGitHubClient(env.GITHUB_TOKEN),
    renderer: new InlinedHtmlRenderer(),
  };
}
