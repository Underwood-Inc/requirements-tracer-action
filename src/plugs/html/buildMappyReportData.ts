import type { AuditResult, TestCase, TestFramework } from '../../motes/types.js';

export interface MappyTestRef {
  readonly file: string;
  readonly line: number;
  readonly description: string;
  readonly layer: 'unit' | 'e2e';
}

export interface MappyReqRow {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly summary: string;
  readonly status: string;
  readonly priority: string;
  readonly owner: string;
  readonly tags: readonly string[];
  readonly testCount: number;
  readonly e2eTestCount: number;
  readonly unitTestCount: number;
  readonly hasE2e: boolean;
  readonly tests: readonly MappyTestRef[];
}

export interface MappyReportSummary {
  readonly generated_at: string;
  readonly total_active_requirements: number;
  readonly deprecated_count: number;
  readonly tested_count: number;
  readonly untested_count: number;
  readonly unknown_ids_count: number;
  readonly coverage_pct: number;
  readonly tests_scanned: number;
  readonly tests_by_layer: { readonly unit: number; readonly e2e: number };
  readonly requirements_with_e2e: number;
  readonly audit_errors: number;
  readonly audit_warnings: number;
  readonly by_kind: Readonly<Record<string, { total: number; tested: number; untested: number }>>;
  readonly untested_ids: readonly {
    readonly id: string;
    readonly title: string;
    readonly kind: string;
    readonly priority: string;
    readonly owner: string;
  }[];
  readonly unknown_ids: readonly string[];
}

export interface MappyReportData {
  readonly summary: MappyReportSummary;
  readonly requirements: readonly MappyReqRow[];
  readonly allTags: readonly string[];
  readonly unknownIds: readonly string[];
  readonly findings: AuditResult['findings'];
}

function testLayer(framework: TestFramework): 'unit' | 'e2e' {
  return framework === 'playwright' || framework === 'cypress' ? 'e2e' : 'unit';
}

function toTestRef(tc: TestCase): MappyTestRef {
  return {
    file: tc.filePath.replace(/\\/g, '/'),
    line: tc.line,
    description: tc.description,
    layer: testLayer(tc.framework),
  };
}

/** Build embedded DATA payload — parity with apps/mappy/scripts/generate-trace-report.mjs */
export function buildMappyReportData(result: AuditResult): MappyReportData {
  const { registry, coverage, findings, testsScanned, testCases } = result;
  const requirements = registry.requirements;
  const allIds = Object.keys(requirements);
  const testedIdSet = new Set(Object.keys(coverage).filter((id) => (coverage[id]?.length ?? 0) > 0));

  const unknownFromFindings = findings
    .filter((f) => f.rule === 'unknown-trace-id' && f.requirementId)
    .map((f) => f.requirementId!);
  const unknownFromTests = testCases.flatMap((tc) =>
    tc.traceIds.filter((id) => !requirements[id]),
  );
  const unknownIds = [...new Set([...unknownFromFindings, ...unknownFromTests])].sort();

  const activeIds = allIds.filter((id) => requirements[id]?.status !== 'deprecated');
  const deprecatedIds = allIds.filter((id) => requirements[id]?.status === 'deprecated');
  const testedIds = activeIds.filter((id) => testedIdSet.has(id));
  const untestedIds = activeIds.filter((id) => !testedIdSet.has(id));
  const coveragePct =
    activeIds.length > 0 ? Math.round((testedIds.length / activeIds.length) * 100) : 100;

  const testsByLayer = { unit: 0, e2e: 0 };
  for (const tc of testCases) {
    if (tc.traceIds.length === 0) continue;
    testsByLayer[testLayer(tc.framework)]++;
  }

  const requirementsWithE2e = activeIds.filter((id) =>
    (coverage[id] ?? []).some((t) => testLayer(t.framework) === 'e2e'),
  ).length;

  const byKind: Record<string, { total: number; tested: number; untested: number }> = {};
  for (const id of activeIds) {
    const k = requirements[id]?.kind ?? 'UNKNOWN';
    if (!byKind[k]) byKind[k] = { total: 0, tested: 0, untested: 0 };
    byKind[k].total++;
    if (testedIdSet.has(id)) byKind[k].tested++;
    else byKind[k].untested++;
  }

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;

  const summary: MappyReportSummary = {
    generated_at: new Date().toISOString(),
    total_active_requirements: activeIds.length,
    deprecated_count: deprecatedIds.length,
    tested_count: testedIds.length,
    untested_count: untestedIds.length,
    unknown_ids_count: unknownIds.length,
    coverage_pct: coveragePct,
    tests_scanned: testsScanned,
    tests_by_layer: testsByLayer,
    requirements_with_e2e: requirementsWithE2e,
    audit_errors: errors,
    audit_warnings: warnings,
    by_kind: byKind,
    untested_ids: untestedIds.map((id) => ({
      id,
      title: requirements[id]?.title ?? '',
      kind: requirements[id]?.kind ?? '',
      priority: requirements[id]?.priority ?? '',
      owner: requirements[id]?.owner ?? '',
    })),
    unknown_ids: unknownIds,
  };

  const allTags = [
    ...new Set(Object.values(requirements).flatMap((r) => r.tags ?? [])),
  ].sort();

  const reqRows: MappyReqRow[] = [...allIds].sort().map((id) => {
    const r = requirements[id] ?? { id, kind: '', title: '' };
    const tests = (coverage[id] ?? []).map(toTestRef);
    const e2eTestCount = tests.filter((t) => t.layer === 'e2e').length;
    const unitTestCount = tests.filter((t) => t.layer === 'unit').length;
    return {
      id,
      kind: r.kind ?? '',
      title: r.title ?? '',
      summary: r.summary ?? '',
      status: r.status ?? 'active',
      priority: r.priority ?? '',
      owner: r.owner ?? '',
      tags: r.tags ?? [],
      testCount: tests.length,
      e2eTestCount,
      unitTestCount,
      hasE2e: e2eTestCount > 0,
      tests,
    };
  });

  return { summary, requirements: reqRows, allTags, unknownIds, findings };
}
