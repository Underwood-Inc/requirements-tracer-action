import { test, expect } from 'vitest';
import { auditEngine } from '../../src/engines/auditEngine.js';
import { InMemoryFileSystem } from '../../src/plugs/memory/InMemoryFileSystem.js';
import { StubTestScanner } from '../../src/plugs/memory/StubTestScanner.js';
import { YamlRegistryReader } from '../../src/plugs/node/YamlRegistryReader.js';
import { YamlConfigReader } from '../../src/plugs/node/YamlConfigReader.js';

const REGISTRY = `
schema_version: 1
requirements:
  FR-001:
    kind: FR
    title: "Loading state"
    status: active
  FR-002:
    kind: FR
    title: "Idempotent receipt email"
    status: active
  SEC-099:
    kind: SEC
    title: "Old deprecated rule"
    status: deprecated
    replaced_by: [SEC-100]
  SEC-100:
    kind: SEC
    title: "Successor rule"
    status: active
  FR-PROP:
    kind: FR
    title: "Proposed backlog item"
    status: proposed
`;

const CONFIG = `
schema_version: 1
requireTraceId: error
kinds:
  FR: { label: Functional, description: x }
  SEC: { label: Security,  description: x }
jsdocTags:
  required: []
  optional: [description, owner, kind, priority]
`;

function makeFs() {
  return new InMemoryFileSystem()
    .withFile('requirements-registry.yaml', REGISTRY)
    .withFile('.traceability.yaml', CONFIG);
}

  /**
   * @description Proves flags a test that lacks any trace ID.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-001] flags a test that lacks any trace ID', async () => {
  const fs = makeFs();
  const result = await auditEngine({
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new StubTestScanner([{
      filePath: 'src/foo.test.ts',
      line: 3,
      framework: 'vitest',
      description: 'returns a value',
      traceIds: [],
      tags: {},
    }]),
    registryPath: 'requirements-registry.yaml',
    configPath: '.traceability.yaml',
    rootDir: '/repo',
  });

  expect(result.ok).toBe(false);
  expect(result.findings).toContainEqual(
    expect.objectContaining({ rule: 'missing-trace-id', line: 3, severity: 'error' }),
  );
});

  /**
   * @description Proves flags a test referencing an ID missing from the registry.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-002] flags a test referencing an ID missing from the registry', async () => {
  const fs = makeFs();
  const result = await auditEngine({
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new StubTestScanner([{
      filePath: 'src/foo.test.ts',
      line: 5,
      framework: 'vitest',
      description: '[FR-999] never registered',
      traceIds: ['FR-999'],
      tags: {},
    }]),
    registryPath: 'requirements-registry.yaml',
    configPath: '.traceability.yaml',
    rootDir: '/repo',
  });

  expect(result.findings).toContainEqual(
    expect.objectContaining({ rule: 'unknown-trace-id', requirementId: 'FR-999', severity: 'error' }),
  );
});

  /**
   * @description Proves does not flag tests that reference a known active requirement.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-001] does not flag tests that reference a known active requirement', async () => {
  const fs = makeFs();
  const result = await auditEngine({
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new StubTestScanner([
      {
        filePath: 'src/foo.test.ts',
        line: 1,
        framework: 'vitest',
        description: '[FR-001] shows loading state',
        traceIds: ['FR-001'],
        tags: {},
      },
      {
        filePath: 'src/bar.test.ts',
        line: 1,
        framework: 'vitest',
        description: '[FR-002] idempotent receipt',
        traceIds: ['FR-002'],
        tags: {},
      },
      {
        filePath: 'src/sec.test.ts',
        line: 1,
        framework: 'vitest',
        description: '[SEC-100] new rule',
        traceIds: ['SEC-100'],
        tags: {},
      },
    ]),
    registryPath: 'requirements-registry.yaml',
    configPath: '.traceability.yaml',
    rootDir: '/repo',
  });

  expect(result.ok).toBe(true);
  expect(result.findings.filter((f) => f.severity === 'error')).toHaveLength(0);
});

  /**
   * @description Proves warns when an active requirement has no test coverage.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-001] warns when an active requirement has no test coverage', async () => {
  const fs = makeFs();
  const result = await auditEngine({
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new StubTestScanner([]),
    registryPath: 'requirements-registry.yaml',
    configPath: '.traceability.yaml',
    rootDir: '/repo',
  });

  const orphans = result.findings.filter((f) => f.rule === 'orphan-requirement');
  expect(orphans.length).toBeGreaterThanOrEqual(2);
  const orphanIds = orphans.map((f) => f.requirementId).sort();
  expect(orphanIds).toContain('FR-001');
  expect(orphanIds).toContain('SEC-100');
  expect(orphanIds).not.toContain('SEC-099');
  expect(orphanIds).not.toContain('FR-PROP');
});

  /**
   * @description Proves proposed requirements without tests do not emit orphan warnings.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-001] does not warn for proposed requirements without tests', async () => {
    const fs = makeFs();
    const result = await auditEngine({
      fs,
      registryReader: new YamlRegistryReader(fs),
      configReader: new YamlConfigReader(fs),
      scanner: new StubTestScanner([]),
      registryPath: 'requirements-registry.yaml',
      configPath: '.traceability.yaml',
      rootDir: '/repo',
    });

    const orphans = result.findings.filter((f) => f.rule === 'orphan-requirement');
    expect(orphans.map((f) => f.requirementId)).not.toContain('FR-PROP');
  });

  /**
   * @description Proves warns when a test references a deprecated requirement.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-001] warns when a test references a deprecated requirement', async () => {
  const fs = makeFs();
  const result = await auditEngine({
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new StubTestScanner([{
      filePath: 'src/old.test.ts',
      line: 9,
      framework: 'vitest',
      description: '[SEC-099] deprecated coverage',
      traceIds: ['SEC-099'],
      tags: {},
    }]),
    registryPath: 'requirements-registry.yaml',
    configPath: '.traceability.yaml',
    rootDir: '/repo',
  });

  expect(result.findings).toContainEqual(
    expect.objectContaining({
      rule: 'deprecated-requirement-referenced',
      severity: 'warning',
      requirementId: 'SEC-099',
    }),
  );
  expect(result.ok).toBe(true);
});

  /**
   * @description Proves flags kind-mismatch when JSDoc @kind disagrees with registry kind.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-002] flags kind-mismatch when JSDoc @kind disagrees with registry kind', async () => {
  const fs = makeFs();
  const result = await auditEngine({
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new StubTestScanner([{
      filePath: 'src/bar.test.ts',
      line: 9,
      framework: 'vitest',
      // FR-001 is registered as kind: FR; the JSDoc tag claims SEC → mismatch.
      description: '[FR-001] correctly references functional rule, but jsdoc @kind says SEC',
      traceIds: ['FR-001'],
      tags: { kind: 'SEC' },
    }]),
    registryPath: 'requirements-registry.yaml',
    configPath: '.traceability.yaml',
    rootDir: '/repo',
  });

  expect(result.findings).toContainEqual(
    expect.objectContaining({
      rule: 'kind-mismatch',
      requirementId: 'FR-001',
      severity: 'error',
      message: expect.stringContaining('JSDoc @kind SEC'),
    }),
  );
  expect(result.ok).toBe(false);
});

  /**
   * @description Proves flags kind-mismatch when bracket prefix disagrees with registry kind.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-002] flags kind-mismatch when bracket prefix disagrees with registry kind', async () => {
  // Registry entry where the id-prefix (SEC) and the kind (FR) deliberately disagree.
  // Real authors should never do this; the audit must catch it when they do.
  const fs = new InMemoryFileSystem()
    .withFile('requirements-registry.yaml', `
schema_version: 1
requirements:
  SEC-200:
    kind: FR
    title: "id-prefix vs kind on purpose"
    status: active
`)
    .withFile('.traceability.yaml', CONFIG);

  const result = await auditEngine({
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new StubTestScanner([{
      filePath: 'src/foo.test.ts',
      line: 4,
      framework: 'vitest',
      description: '[SEC-200] test referencing the inconsistent row',
      traceIds: ['SEC-200'],
      tags: {},
    }]),
    registryPath: 'requirements-registry.yaml',
    configPath: '.traceability.yaml',
    rootDir: '/repo',
  });

  expect(result.findings).toContainEqual(
    expect.objectContaining({
      rule: 'kind-mismatch',
      requirementId: 'SEC-200',
      severity: 'error',
      message: expect.stringContaining('kind: FR'),
    }),
  );
  expect(result.ok).toBe(false);
});

  /**
   * @description Proves strict mode promotes orphan-requirement warnings to errors.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-001] strict mode promotes orphan-requirement warnings to errors', async () => {
  const fs = makeFs();
  const result = await auditEngine({
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new StubTestScanner([]),
    registryPath: 'requirements-registry.yaml',
    configPath: '.traceability.yaml',
    rootDir: '/repo',
    strict: true,
  });

  const orphanErrors = result.findings.filter(
    (f) => f.rule === 'orphan-requirement' && f.severity === 'error',
  );
  expect(orphanErrors.length).toBeGreaterThan(0);
  expect(result.ok).toBe(false);
});

  /**
   * @description Proves strict mode promotes deprecated-requirement-referenced to error.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-001] strict mode promotes deprecated-requirement-referenced to error', async () => {
  const fs = makeFs();
  const result = await auditEngine({
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new StubTestScanner([{
      filePath: 'src/old.test.ts',
      line: 9,
      framework: 'vitest',
      description: '[SEC-099] deprecated coverage',
      traceIds: ['SEC-099'],
      tags: {},
    }]),
    registryPath: 'requirements-registry.yaml',
    configPath: '.traceability.yaml',
    rootDir: '/repo',
    strict: true,
  });

  expect(result.findings).toContainEqual(
    expect.objectContaining({
      rule: 'deprecated-requirement-referenced',
      severity: 'error',
      requirementId: 'SEC-099',
    }),
  );
  expect(result.ok).toBe(false);
});

  /**
   * @description Proves warns on unknown JSDoc tags without failing the build.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/auditEngine
   */
  test('[META-001] warns on unknown JSDoc tags without failing the build', async () => {
  const fs = makeFs();
  const result = await auditEngine({
    fs,
    registryReader: new YamlRegistryReader(fs),
    configReader: new YamlConfigReader(fs),
    scanner: new StubTestScanner([{
      filePath: 'src/foo.test.ts',
      line: 2,
      framework: 'vitest',
      description: '[FR-001] something',
      traceIds: ['FR-001'],
      tags: { unknown: [{ name: 'reviewer', value: 'alice' }] },
    }]),
    registryPath: 'requirements-registry.yaml',
    configPath: '.traceability.yaml',
    rootDir: '/repo',
  });

  expect(result.findings).toContainEqual(
    expect.objectContaining({ rule: 'unknown-jsdoc-tag', severity: 'warning' }),
  );
  expect(result.ok).toBe(true);
});
