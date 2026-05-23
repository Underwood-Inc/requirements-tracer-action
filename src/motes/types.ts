/**
 * Shared types — single facts about the shapes that flow through the tracer.
 */

export type TestFramework = 'jest' | 'vitest' | 'cypress' | 'playwright' | 'unknown';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type RequirementStatus = 'active' | 'proposed' | 'deprecated';

export interface JsdocTags {
  readonly description?: string;
  readonly owner?: string;
  readonly kind?: string;
  readonly priority?: Priority;
  readonly linked?: readonly string[];
  readonly coverage?: string;
  readonly external?: readonly string[];
  readonly unknown?: readonly { name: string; value: string }[];
}

export interface TestCase {
  readonly filePath: string;
  readonly line: number;
  readonly framework: TestFramework;
  readonly description: string;
  readonly traceIds: readonly string[];
  readonly tags: JsdocTags;
}

export interface RequirementRecord {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly summary?: string;
  /** Long-form description, separate from the short `summary`. Optional. */
  readonly description?: string;
  /** Why the requirement exists — the "so that" for stakeholders. Optional. */
  readonly rationale?: string;
  /** Acceptance criteria carried over from the user story. Optional. */
  readonly acceptance_criteria?: readonly string[];
  readonly owner?: string;
  readonly status?: RequirementStatus;
  readonly priority?: Priority;
  readonly related_br?: readonly string[];
  readonly linked_stories?: readonly string[];
  readonly tags?: readonly string[];
  readonly deprecated_in?: string;
  readonly replaced_by?: readonly string[];
}

export interface RequirementsRegistry {
  readonly schema_version: number;
  readonly requirements: Readonly<Record<string, RequirementRecord>>;
}

export interface KindDescriptor {
  readonly label: string;
  readonly description: string;
}

export interface LinkResolver {
  readonly prefix: string;
  readonly template: string;
}

export interface OtherReport {
  readonly entry: string;
  readonly label: string;
}

export interface TraceabilityConfig {
  readonly schema_version: number;
  readonly testGlobs: readonly string[];
  readonly exclude: readonly string[];
  readonly traceIdPattern: string;
  readonly requireTraceId: 'error' | 'warn' | 'off';
  readonly kinds: Readonly<Record<string, KindDescriptor>>;
  readonly jsdocTags: {
    readonly required: readonly string[];
    readonly optional: readonly string[];
  };
  readonly linkResolvers: readonly LinkResolver[];
  readonly otherReports: readonly OtherReport[];
  readonly output: {
    readonly reportDir: string;
    readonly reportEntry: string;
    readonly scanJson: string;
    readonly auditJson: string;
  };
  readonly prComment: {
    readonly newCommentEachRun: boolean;
    readonly commentTitle: string;
  };
  /** Glob patterns (relative to workspace root) for co-located registry shards. */
  readonly registryGlobs?: readonly string[];
}

export type AuditFindingRule =
  | 'missing-trace-id'
  | 'unknown-trace-id'
  | 'orphan-requirement'
  | 'unknown-jsdoc-tag'
  | 'duplicate-jsdoc-tag'
  | 'deprecated-requirement-referenced'
  | 'kind-mismatch';

export type Severity = 'error' | 'warning';

export interface AuditFinding {
  readonly severity: Severity;
  readonly rule: AuditFindingRule;
  readonly message: string;
  readonly filePath?: string;
  readonly line?: number;
  readonly requirementId?: string;
  readonly suggestion: string;
}

export interface AuditResult {
  readonly testsScanned: number;
  readonly requirementsKnown: number;
  readonly requirementsCovered: number;
  readonly findings: readonly AuditFinding[];
  readonly ok: boolean;
  readonly testCases: readonly TestCase[];
  readonly registry: RequirementsRegistry;
  readonly config: TraceabilityConfig;
  readonly coverage: Readonly<Record<string, readonly TestCase[]>>;
}
