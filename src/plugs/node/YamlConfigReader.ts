import { parse as parseYaml } from 'yaml';
import type { FileSystem } from '../../sockets/FileSystem.js';
import type { ConfigReader } from '../../sockets/ConfigReader.js';
import type {
  KindDescriptor,
  LinkResolver,
  OtherReport,
  TraceabilityConfig,
} from '../../motes/types.js';
import { DEFAULT_EXCLUDES, DEFAULT_TEST_GLOBS } from '../../motes/defaultGlobs.js';

const DEFAULT_KINDS: Readonly<Record<string, KindDescriptor>> = {
  BR: { label: 'Business', description: 'Why the product matters to the organisation or customer.' },
  FR: { label: 'Functional', description: 'What the system must do (user-visible behaviour).' },
  NFR: { label: 'Non-functional', description: 'How well it behaves: speed, reliability, cost.' },
  SEC: { label: 'Security', description: 'Rules that protect data and reduce risk.' },
};

const DEFAULT_OPTIONAL_TAGS: readonly string[] = [
  'description',
  'owner',
  'kind',
  'priority',
  'linked',
  'coverage',
  'external',
];

/** Plug: loads .traceability.yaml, merging defaults for missing fields. */
export class YamlConfigReader implements ConfigReader {
  constructor(private readonly fs: FileSystem) {}

  async load(path: string): Promise<TraceabilityConfig> {
    let raw = '';
    if (await this.fs.exists(path)) {
      raw = await this.fs.readFile(path);
    }
    const parsed = (raw ? parseYaml(raw) : {}) as Record<string, unknown>;
    const data = parsed && typeof parsed === 'object' ? parsed : {};

    const testGlobs = Array.isArray(data.testGlobs) && data.testGlobs.length > 0
      ? (data.testGlobs as string[])
      : [...DEFAULT_TEST_GLOBS];
    const exclude = Array.isArray(data.exclude) ? (data.exclude as string[]) : [...DEFAULT_EXCLUDES];

    const traceIdPattern = typeof data.traceIdPattern === 'string'
      ? data.traceIdPattern
      : '\\[([A-Z]+-\\d+)(?:,\\s*([A-Z]+-\\d+))*\\]';

    const requireTraceId = (data.requireTraceId === 'warn' || data.requireTraceId === 'off')
      ? data.requireTraceId
      : 'error';

    const kinds = (data.kinds && typeof data.kinds === 'object')
      ? (data.kinds as Record<string, KindDescriptor>)
      : DEFAULT_KINDS;

    const tagsCfg = (data.jsdocTags && typeof data.jsdocTags === 'object')
      ? (data.jsdocTags as Record<string, unknown>)
      : {};
    const jsdocTags = {
      required: Array.isArray(tagsCfg.required) ? (tagsCfg.required as string[]) : [],
      optional: Array.isArray(tagsCfg.optional) ? (tagsCfg.optional as string[]) : [...DEFAULT_OPTIONAL_TAGS],
    };

    const linkResolvers = Array.isArray(data.linkResolvers)
      ? (data.linkResolvers as LinkResolver[])
      : [];
    const otherReports = Array.isArray(data.otherReports)
      ? (data.otherReports as OtherReport[])
      : [];

    const outputCfg = (data.output && typeof data.output === 'object')
      ? (data.output as Record<string, unknown>)
      : {};
    const output = {
      reportDir: typeof outputCfg.reportDir === 'string' ? outputCfg.reportDir : 'traceability-report',
      reportEntry: typeof outputCfg.reportEntry === 'string' ? outputCfg.reportEntry : 'index.html',
      scanJson: typeof outputCfg.scanJson === 'string' ? outputCfg.scanJson : 'traceability-report/scan.json',
      auditJson: typeof outputCfg.auditJson === 'string' ? outputCfg.auditJson : 'traceability-report/audit.json',
    };

    const prCfg = (data.prComment && typeof data.prComment === 'object')
      ? (data.prComment as Record<string, unknown>)
      : {};
    const prComment = {
      newCommentEachRun: prCfg.newCommentEachRun !== false,
      commentTitle: typeof prCfg.commentTitle === 'string' ? prCfg.commentTitle : 'Traceability Audit Report',
    };

    const registryGlobs = Array.isArray(data.registryGlobs)
      ? (data.registryGlobs as string[]).filter((g) => typeof g === 'string' && g.length > 0)
      : undefined;

    const brandingCfg = (data.branding && typeof data.branding === 'object')
      ? (data.branding as Record<string, unknown>)
      : undefined;
    const branding = brandingCfg
      ? {
          projectName: typeof brandingCfg.projectName === 'string' ? brandingCfg.projectName : undefined,
          docsUrl: typeof brandingCfg.docsUrl === 'string' ? brandingCfg.docsUrl : undefined,
          repoUrl: typeof brandingCfg.repoUrl === 'string' ? brandingCfg.repoUrl : undefined,
        }
      : undefined;

    return {
      schema_version: 1,
      testGlobs,
      exclude,
      traceIdPattern,
      requireTraceId,
      kinds,
      jsdocTags,
      linkResolvers,
      otherReports,
      output,
      prComment,
      branding,
      registryGlobs,
    };
  }
}
