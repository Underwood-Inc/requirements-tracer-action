import type { AuditFinding } from '../motes/types.js';

export interface PrCommentInput {
  readonly owner: string;
  readonly repo: string;
  readonly pullNumber: number;
  readonly title: string;
  readonly body: string;
  readonly newCommentEachRun: boolean;
}

export interface PrCommentRef {
  readonly id: number;
  readonly nodeId: string;
}

/** Socket: thin GitHub API used for annotations and PR comments. */
export interface GitHubClient {
  emitAnnotation(finding: AuditFinding): void;
  postPrComment(input: PrCommentInput): Promise<{ commentId: number }>;
  /** Return all PR comment refs whose body starts with `marker`. */
  listPrCommentsByMarker(
    owner: string,
    repo: string,
    pullNumber: number,
    marker: string,
  ): Promise<PrCommentRef[]>;
  /** Minimize (collapse) a comment by its GraphQL node ID with reason OUTDATED. */
  minimizeComment(nodeId: string): Promise<void>;
}
