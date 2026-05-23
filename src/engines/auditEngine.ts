import type { ConfigReader } from '../sockets/ConfigReader.js';
import type { FileSystem } from '../sockets/FileSystem.js';
import type { RegistryReader } from '../sockets/RegistryReader.js';
import type { TestScanner } from '../sockets/TestScanner.js';
import type {
  AuditFinding,
  AuditResult,
  TestCase,
  TraceabilityConfig,
  RequirementsRegistry,
} from '../motes/types.js';

export interface AuditEngineInput {
  readonly fs: FileSystem;
  readonly registryReader: RegistryReader;
  readonly configReader: ConfigReader;
  readonly scanner: TestScanner;
  readonly registryPath: string;
  readonly configPath: string;
  readonly rootDir: string;
  /**
   * Strict mode promotes selected warnings to errors so they block CI:
   *   - orphan-requirement (active requirement with no test)
   *   - deprecated-requirement-referenced
   *   - unknown-jsdoc-tag
   *
   * The base error-level rules (missing-trace-id, unknown-trace-id, kind-mismatch)
   * always block in any mode.
   *
   * @default false
   */
  readonly strict?: boolean;
}

/**
 * Engine: cross-checks every TestCase against the registry, producing an
 * AuditResult.
 *
 * @traceId META-001
 * @description Aggregates findings from missing trace IDs, unknown trace IDs,
 *   active orphan requirements, unknown JSDoc tags, and deprecated requirement use.
 */
export async function auditEngine(input: AuditEngineInput): Promise<AuditResult> {
  const config = await input.configReader.load(input.configPath);
  const registry = await input.registryReader.load({
    rootDir: input.rootDir,
    registryPath:
      config.registryGlobs && config.registryGlobs.length > 0
        ? undefined
        : input.registryPath,
    registryGlobs: config.registryGlobs,
  });
  const testCases = await input.scanner.scan(input.rootDir, config);
  const strict = input.strict === true;

  const findings: AuditFinding[] = [];
  const coverage: Record<string, TestCase[]> = {};

  for (const id of Object.keys(registry.requirements)) coverage[id] = [];

  for (const tc of testCases) {
    if (tc.traceIds.length === 0 && config.requireTraceId !== 'off') {
      findings.push({
        severity: config.requireTraceId === 'error' ? 'error' : 'warning',
        rule: 'missing-trace-id',
        message: `Test "${truncate(tc.description, 80)}" has no trace ID.`,
        filePath: tc.filePath,
        line: tc.line,
        suggestion: 'Prefix the description with [XX-NNN]. See docs/traceability/jsdoc-tags.md.',
      });
    }

    for (const id of tc.traceIds) {
      const known = registry.requirements[id];
      if (!known) {
        findings.push({
          severity: 'error',
          rule: 'unknown-trace-id',
          message: `Test references ${id} which is not in the requirements registry.`,
          filePath: tc.filePath,
          line: tc.line,
          requirementId: id,
          suggestion: `Add ${id} to a requirements registry shard, or update the test to use a known ID.`,
        });
        continue;
      }
      if (known.status === 'deprecated') {
        findings.push({
          severity: strict ? 'error' : 'warning',
          rule: 'deprecated-requirement-referenced',
          message: `Requirement ${id} is deprecated${known.deprecated_in ? ` (since ${known.deprecated_in})` : ''}.`,
          filePath: tc.filePath,
          line: tc.line,
          requirementId: id,
          suggestion:
            known.replaced_by && known.replaced_by.length > 0
              ? `Consider migrating to ${known.replaced_by.join(', ')}.`
              : 'Plan to retire this test or update the requirement status.',
        });
      }

      // kind-mismatch: bracket prefix must agree with the registry's kind,
      // and any JSDoc @kind on the same test must agree with the registry too.
      const bracketKind = id.split('-')[0];
      if (bracketKind && known.kind && bracketKind !== known.kind) {
        findings.push({
          severity: 'error',
          rule: 'kind-mismatch',
          message: `Test references [${id}] but registry row ${id} has kind: ${known.kind}.`,
          filePath: tc.filePath,
          line: tc.line,
          requirementId: id,
          suggestion: `Use [${known.kind}-…] in the test description, or change registry row ${id}.kind.`,
        });
      }
      if (tc.tags.kind && known.kind && tc.tags.kind !== known.kind) {
        findings.push({
          severity: 'error',
          rule: 'kind-mismatch',
          message: `JSDoc @kind ${tc.tags.kind} on test "${truncate(tc.description, 60)}" disagrees with registry row ${id}.kind (${known.kind}).`,
          filePath: tc.filePath,
          line: tc.line,
          requirementId: id,
          suggestion: `Fix the @kind tag, or change registry row ${id}.kind.`,
        });
      }

      coverage[id] = [...(coverage[id] ?? []), tc];
    }

    if (tc.tags.unknown && tc.tags.unknown.length > 0) {
      for (const u of tc.tags.unknown) {
        findings.push({
          severity: strict ? 'error' : 'warning',
          rule: 'unknown-jsdoc-tag',
          message: `Unknown JSDoc tag @${u.name} on test "${truncate(tc.description, 60)}".`,
          filePath: tc.filePath,
          line: tc.line,
          suggestion: `Add "${u.name}" to .traceability.yaml -> jsdocTags.optional, or remove the tag.`,
        });
      }
    }
  }

  for (const [id, cases] of Object.entries(coverage)) {
    const req = registry.requirements[id];
    if (cases.length === 0 && req?.status === 'active') {
      findings.push({
        severity: strict ? 'error' : 'warning',
        rule: 'orphan-requirement',
        message: `Requirement ${id} ("${req?.title ?? '?'}") is referenced by no test.`,
        requirementId: id,
        suggestion: `Add a test whose description starts with [${id}], or retire the requirement (status: deprecated / proposed).`,
      });
    }
  }

  const ok = !findings.some((f) => f.severity === 'error');

  return {
    testsScanned: testCases.length,
    requirementsKnown: Object.keys(registry.requirements).length,
    requirementsCovered: Object.values(coverage).filter((c) => c.length > 0).length,
    findings,
    ok,
    testCases,
    registry,
    config,
    coverage: freezeCoverage(coverage),
  };
}

function freezeCoverage(c: Record<string, TestCase[]>): Readonly<Record<string, readonly TestCase[]>> {
  const out: Record<string, readonly TestCase[]> = {};
  for (const [k, v] of Object.entries(c)) out[k] = Object.freeze([...v]);
  return out;
}

function truncate(s: string, len: number): string {
  return s.length > len ? `${s.slice(0, len - 1)}…` : s;
}

/* unused imports kept for clarity in the public interface */
export type { TraceabilityConfig, RequirementsRegistry };
