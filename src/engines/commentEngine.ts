import type { GitHubClient } from '../sockets/GitHubClient.js';
import type { AuditResult } from '../motes/types.js';
import { resolveLinkedToken } from '../sparks/resolveLinkedToken.js';

export interface CommentEngineInput {
  readonly client: GitHubClient;
  readonly result: AuditResult;
  readonly repo: { owner: string; name: string };
  readonly pullNumber: number;
  readonly runId?: string;
  readonly artifactUrl?: string;
  readonly nowIsoUtc: string;
}

/**
 * Engine: builds the PR comment body and posts it (new each run by default).
 *
 * @traceId META-001
 */
export async function commentEngine(input: CommentEngineInput): Promise<{ commentId: number }> {
  const { client, result, repo, pullNumber, nowIsoUtc, artifactUrl, runId } = input;
  const { findings, config } = result;

  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');

  const lines: string[] = [];
  lines.push(`_${nowIsoUtc} UTC_`);
  lines.push('');
  lines.push(`- **${result.testsScanned}** tests scanned`);
  lines.push(`- **${result.requirementsCovered}/${result.requirementsKnown}** requirements covered`);
  lines.push(`- **${errors.length}** error${errors.length === 1 ? '' : 's'}, **${warnings.length}** warning${warnings.length === 1 ? '' : 's'}`);
  lines.push('');

  if (errors.length > 0) {
    lines.push('### Errors');
    lines.push('');
    lines.push('| File | Line | Rule | Message | Suggestion |');
    lines.push('|------|------|------|---------|------------|');
    for (const f of errors) {
      lines.push(
        `| \`${f.filePath ?? '-'}\` | ${f.line ?? '-'} | \`${f.rule}\` | ${escapeMd(f.message)} | ${escapeMd(f.suggestion)} |`,
      );
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('### Warnings');
    lines.push('');
    for (const w of warnings) {
      const where = w.filePath ? ` (\`${w.filePath}:${w.line ?? '?'}\`)` : '';
      lines.push(`- \`${w.rule}\`${where} — ${escapeMd(w.message)}`);
    }
    lines.push('');
  }

  if (artifactUrl || runId) {
    lines.push('### Artifacts');
    if (artifactUrl) lines.push(`- 📦 [Download HTML report](${artifactUrl})`);
    else if (runId) lines.push(`- 📦 Workflow run: \`${runId}\` — see the **Artifacts** section for \`traceability-report\`.`);
    lines.push('');
  }

  lines.push('### Docs');
  lines.push('- [Trace ID conventions](docs/traceability/jsdoc-tags.md)');
  lines.push('- [Configuration](docs/traceability/configuration.md)');
  lines.push('- [CI integration](docs/traceability/ci-integration.md)');

  if (config.linkResolvers.length > 0) {
    lines.push('');
    lines.push('<sub>Linked tokens auto-resolve via configured resolvers (e.g. ' +
      config.linkResolvers
        .slice(0, 3)
        .map((r) => `\`${r.prefix}*\` → ${resolveLinkedToken(`${r.prefix}123`, [r])}`)
        .join(', ') +
      ').</sub>');
  }

  const MARKER = '<!-- traceability-comment -->';
  const { newCommentEachRun, commentTitle } = config.prComment;

  const oldRefs = newCommentEachRun
    ? await client.listPrCommentsByMarker(repo.owner, repo.name, pullNumber, MARKER)
    : [];

  const { commentId } = await client.postPrComment({
    owner: repo.owner,
    repo: repo.name,
    pullNumber,
    title: commentTitle,
    body: lines.join('\n'),
    newCommentEachRun,
  });

  await Promise.all(oldRefs.map((ref) => client.minimizeComment(ref.nodeId)));

  return { commentId };
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|');
}
