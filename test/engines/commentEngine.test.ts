import { test, expect } from 'vitest';
import { commentEngine } from '../../src/engines/commentEngine.js';
import { InMemoryGitHubClient } from '../../src/plugs/memory/InMemoryGitHubClient.js';
import type { AuditResult, TraceabilityConfig } from '../../src/motes/types.js';

function makeConfig(): TraceabilityConfig {
  return {
    schema_version: 1,
    testGlobs: [],
    exclude: [],
    traceIdPattern: '',
    requireTraceId: 'error',
    kinds: {},
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

function makeResult(overrides: Partial<AuditResult> = {}): AuditResult {
  return {
    testsScanned: 10,
    requirementsKnown: 4,
    requirementsCovered: 3,
    findings: [],
    ok: true,
    testCases: [],
    registry: { schema_version: 1, requirements: {} },
    config: makeConfig(),
    coverage: {},
    ...overrides,
  };
}

  /**
   * @description Proves posts a new PR comment by default.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/commentEngine
   */
  test('[META-001] posts a new PR comment by default', async () => {
  const client = new InMemoryGitHubClient();
  await commentEngine({
    client,
    result: makeResult(),
    repo: { owner: 'org', name: 'repo' },
    pullNumber: 42,
    nowIsoUtc: '2026-05-13T12:00:00.000Z',
  });
  expect(client.comments).toHaveLength(1);
  expect(client.comments[0].newCommentEachRun).toBe(true);
  expect(client.comments[0].pullNumber).toBe(42);
});

  /**
   * @description Proves surfaces error counts and table rows.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/commentEngine
   */
  test('[META-001] surfaces error counts and table rows', async () => {
  const client = new InMemoryGitHubClient();
  await commentEngine({
    client,
    result: makeResult({
      ok: false,
      findings: [{
        severity: 'error',
        rule: 'missing-trace-id',
        message: 'Test "x" has no trace ID.',
        filePath: 'src/foo.test.ts',
        line: 7,
        suggestion: 'Add [FR-XXX] to the description.',
      }],
    }),
    repo: { owner: 'org', name: 'repo' },
    pullNumber: 42,
    nowIsoUtc: '2026-05-13T12:00:00.000Z',
  });
  const body = client.comments[0].body;
  expect(body).toContain('**1** error');
  expect(body).toContain('missing-trace-id');
  expect(body).toContain('src/foo.test.ts');
});

  /**
   * @description Proves includes an artifact link when provided.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/commentEngine
   */
  test('[META-001] includes an artifact link when provided', async () => {
  const client = new InMemoryGitHubClient();
  await commentEngine({
    client,
    result: makeResult(),
    repo: { owner: 'org', name: 'repo' },
    pullNumber: 7,
    runId: '12345',
    artifactUrl: 'https://github.com/org/repo/actions/runs/12345',
    nowIsoUtc: '2026-05-13T12:00:00.000Z',
  });
  expect(client.comments[0].body).toContain('actions/runs/12345');
});

  /**
   * @description Proves older traceability comments are minimized when newCommentEachRun is true.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/commentEngine
   */
  test('[META-003] minimizes older traceability comments when newCommentEachRun is true', async () => {
  const client = new InMemoryGitHubClient();

  // Seed two prior comments on the same PR so they are stored with composed bodies.
  await client.postPrComment({
    owner: 'org', repo: 'repo', pullNumber: 42,
    title: 'Traceability Audit Report',
    body: 'first run',
    newCommentEachRun: true,
  });
  await client.postPrComment({
    owner: 'org', repo: 'repo', pullNumber: 42,
    title: 'Traceability Audit Report',
    body: 'second run',
    newCommentEachRun: true,
  });

  // Third run via commentEngine — should post and then minimize the two prior ones.
  await commentEngine({
    client,
    result: makeResult(),
    repo: { owner: 'org', name: 'repo' },
    pullNumber: 42,
    nowIsoUtc: '2026-05-22T10:00:00.000Z',
  });

  expect(client.comments).toHaveLength(3);
  expect(client.minimizedNodeIds).toHaveLength(2);
  expect(client.minimizedNodeIds).toContain('node_1');
  expect(client.minimizedNodeIds).toContain('node_2');
  // The newly posted comment (node_3) must NOT be minimized.
  expect(client.minimizedNodeIds).not.toContain('node_3');
});

  /**
   * @description Proves older comments on a different PR are not minimized.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage engines/commentEngine
   */
  test('[META-003] does not minimize comments on a different PR', async () => {
  const client = new InMemoryGitHubClient();

  // Seed a prior comment on a DIFFERENT PR.
  await client.postPrComment({
    owner: 'org', repo: 'repo', pullNumber: 99,
    title: 'Traceability Audit Report',
    body: 'other pr run',
    newCommentEachRun: true,
  });

  await commentEngine({
    client,
    result: makeResult(),
    repo: { owner: 'org', name: 'repo' },
    pullNumber: 42,
    nowIsoUtc: '2026-05-22T10:00:00.000Z',
  });

  expect(client.minimizedNodeIds).toHaveLength(0);
});
