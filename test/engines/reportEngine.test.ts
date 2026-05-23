import { test, expect } from 'vitest';
import { reportEngine } from '../../src/engines/reportEngine.js';
import { InMemoryFileSystem } from '../../src/plugs/memory/InMemoryFileSystem.js';
import { InlinedHtmlRenderer } from '../../src/plugs/html/InlinedHtmlRenderer.js';
import type { AuditResult, TraceabilityConfig } from '../../src/motes/types.js';

function makeConfig(): TraceabilityConfig {
  return {
    schema_version: 1,
    testGlobs: [],
    exclude: [],
    traceIdPattern: '\\[([A-Z]+-\\d+)\\]',
    requireTraceId: 'error',
    kinds: { FR: { label: 'Functional', description: 'x' } },
    jsdocTags: { required: [], optional: [] },
    linkResolvers: [],
    otherReports: [],
    output: {
      reportDir: 'traceability-report',
      reportEntry: 'index.html',
      scanJson: 'traceability-report/scan.json',
      auditJson: 'traceability-report/audit.json',
    },
    prComment: { newCommentEachRun: true, commentTitle: 'Traceability Audit Report' },
  };
}

  /**
   * @description Proves writes index.html and audit.json into the configured paths.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/reportEngine
   */
  test('[META-001] writes index.html and audit.json into the configured paths', async () => {
  const fs = new InMemoryFileSystem().withCwd('/repo');
  const result: AuditResult = {
    testsScanned: 2,
    requirementsKnown: 1,
    requirementsCovered: 1,
    findings: [],
    ok: true,
    testCases: [],
    registry: {
      schema_version: 1,
      requirements: { 'FR-001': { id: 'FR-001', kind: 'FR', title: 'Loading state', status: 'active' } },
    },
    config: makeConfig(),
    coverage: { 'FR-001': [] },
  };

  await reportEngine({ fs, renderer: new InlinedHtmlRenderer(), result });

  expect(await fs.exists('/repo/traceability-report/index.html')).toBe(true);
  const html = await fs.readFile('/repo/traceability-report/index.html');
  expect(html).toContain('<!doctype html>');
  expect(html).toContain('FR-001');
  expect(html).toContain('Loading state');
  expect(await fs.exists('/repo/traceability-report/audit.json')).toBe(true);
});
