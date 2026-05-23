import type { GitHubClient, PrCommentInput, PrCommentRef } from '../../sockets/GitHubClient.js';
import type { AuditFinding } from '../../motes/types.js';

interface StoredComment {
  readonly input: PrCommentInput;
  readonly id: number;
  readonly nodeId: string;
  /** Body as composed and stored on GitHub (marker + title + raw body). */
  readonly composedBody: string;
}

/** Plug (in-memory): records annotations and PR comments for assertions. */
export class InMemoryGitHubClient implements GitHubClient {
  readonly annotations: AuditFinding[] = [];
  readonly minimizedNodeIds: string[] = [];
  private readonly stored: StoredComment[] = [];
  private nextId = 1;

  /** Raw PrCommentInputs as passed by callers (body is pre-composition). */
  get comments(): PrCommentInput[] {
    return this.stored.map((s) => s.input);
  }

  emitAnnotation(finding: AuditFinding): void {
    this.annotations.push(finding);
  }

  async postPrComment(input: PrCommentInput): Promise<{ commentId: number }> {
    const id = this.nextId++;
    const composedBody = `<!-- traceability-comment -->\n## ${input.title}\n\n${input.body}`;
    this.stored.push({ input, id, nodeId: `node_${id}`, composedBody });
    return { commentId: id };
  }

  async listPrCommentsByMarker(
    _owner: string,
    _repo: string,
    pullNumber: number,
    marker: string,
  ): Promise<PrCommentRef[]> {
    return this.stored
      .filter((s) => s.input.pullNumber === pullNumber && s.composedBody.startsWith(marker))
      .map((s) => ({ id: s.id, nodeId: s.nodeId }));
  }

  async minimizeComment(nodeId: string): Promise<void> {
    this.minimizedNodeIds.push(nodeId);
  }
}
