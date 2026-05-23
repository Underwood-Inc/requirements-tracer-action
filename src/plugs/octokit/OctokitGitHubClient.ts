import { Octokit } from '@octokit/rest';
import type { GitHubClient, PrCommentInput, PrCommentRef } from '../../sockets/GitHubClient.js';
import type { AuditFinding } from '../../motes/types.js';

const GITHUB_API = 'https://api.github.com';

const MINIMIZE_MUTATION = `
  mutation MinimizeComment($id: ID!) {
    minimizeComment(input: { subjectId: $id, classifier: OUTDATED }) {
      minimizedComment { isMinimized }
    }
  }
`;

/**
 * Plug: GitHub API client.
 * - Emits GitHub Actions annotations via stdout (no API call needed).
 * - Posts a NEW PR comment via REST. When newCommentEachRun is true, older
 *   traceability comments on the same PR are minimized (collapsed) via the
 *   GitHub GraphQL API with classifier OUTDATED after the new one is posted.
 */
export class OctokitGitHubClient implements GitHubClient {
  private readonly client: Octokit | undefined;
  private readonly token: string | undefined;

  constructor(token: string | undefined) {
    this.token = token;
    this.client = token ? new Octokit({ auth: token }) : undefined;
  }

  emitAnnotation(finding: AuditFinding): void {
    const cmd = finding.severity === 'error' ? 'error' : 'warning';
    const escape = (s: string) =>
      s.replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/]/g, '%5D').replace(/;/g, '%3B');
    const parts: string[] = [];
    if (finding.filePath) parts.push(`file=${finding.filePath}`);
    if (finding.line) parts.push(`line=${finding.line}`);
    const title = titleForRule(finding.rule, finding.requirementId);
    parts.push(`title=${title}`);
    const head = `::${cmd} ${parts.join(',')}::`;
    const body = `${finding.message} | ${finding.suggestion}`;
    process.stdout.write(`${head}${escape(body)}\n`);
  }

  async postPrComment(input: PrCommentInput): Promise<{ commentId: number }> {
    if (!this.client) {
      throw new Error('Octokit client not configured (GITHUB_TOKEN missing). Skip comment in non-CI.');
    }
    const { owner, repo, pullNumber, title, body, newCommentEachRun } = input;
    const composed = `<!-- traceability-comment -->\n## ${title}\n\n${body}`;

    if (!newCommentEachRun) {
      const existing = await this.client.issues.listComments({
        owner, repo, issue_number: pullNumber, per_page: 100,
      });
      const ours = existing.data.find((c) =>
        c.body?.startsWith('<!-- traceability-comment -->'),
      );
      if (ours) {
        const updated = await this.client.issues.updateComment({
          owner, repo, comment_id: ours.id, body: composed,
        });
        return { commentId: updated.data.id };
      }
    }

    const created = await this.client.issues.createComment({
      owner, repo, issue_number: pullNumber, body: composed,
    });
    return { commentId: created.data.id };
  }

  async listPrCommentsByMarker(
    owner: string,
    repo: string,
    pullNumber: number,
    marker: string,
  ): Promise<PrCommentRef[]> {
    if (!this.client) return [];
    const resp = await this.client.issues.listComments({
      owner, repo, issue_number: pullNumber, per_page: 100,
    });
    return resp.data
      .filter((c) => c.body?.startsWith(marker))
      .map((c) => ({ id: c.id, nodeId: c.node_id }));
  }

  async minimizeComment(nodeId: string): Promise<void> {
    if (!this.token) return;
    const resp = await fetch(`${GITHUB_API}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'requirements-tracer',
      },
      body: JSON.stringify({ query: MINIMIZE_MUTATION, variables: { id: nodeId } }),
    });
    if (!resp.ok) {
      throw new Error(`GraphQL minimizeComment failed: HTTP ${resp.status}`);
    }
    const json = await resp.json() as { errors?: unknown[] };
    if (json.errors?.length) {
      throw new Error(`GraphQL minimizeComment errors: ${JSON.stringify(json.errors)}`);
    }
  }
}

function titleForRule(rule: AuditFinding['rule'], requirementId?: string): string {
  switch (rule) {
    case 'missing-trace-id': return 'Missing trace ID';
    case 'unknown-trace-id': return `Unknown trace ID${requirementId ? ` ${requirementId}` : ''}`;
    case 'orphan-requirement': return `Requirement ${requirementId ?? ''} has no tests`;
    case 'unknown-jsdoc-tag': return 'Unknown JSDoc tag';
    case 'duplicate-jsdoc-tag': return 'Duplicate JSDoc tag';
    case 'deprecated-requirement-referenced': return `Deprecated requirement ${requirementId ?? ''} referenced`;
    default: return rule;
  }
}
