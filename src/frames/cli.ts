#!/usr/bin/env node
import { Command } from 'commander';
import { createCliWeave } from '../weaves/createCliWeave.js';
import { scanEngine } from '../engines/scanEngine.js';
import { auditEngine } from '../engines/auditEngine.js';
import { reportEngine } from '../engines/reportEngine.js';
import { commentEngine } from '../engines/commentEngine.js';
import { ExitCode } from '../motes/exitCodes.js';

const program = new Command();
program
  .name('trace')
  .description('Requirements traceability tracer.')
  .version('0.1.0');

const defaultOpts = (cmd: Command) =>
  cmd
    .option('--registry <path>', 'path to requirements-registry.yaml', 'requirements-registry.yaml')
    .option('--config <path>', 'path to .traceability.yaml', '.traceability.yaml')
    .option('--root <path>', 'workspace root', process.cwd());

defaultOpts(program.command('scan'))
  .description('Scan the workspace and emit a flat list of test cases as JSON.')
  .action(async (opts) => {
    const w = createCliWeave();
    try {
      const cases = await scanEngine({
        configReader: w.configReader,
        scanner: w.scanner,
        configPath: w.fs.resolve(opts.root, opts.config),
        rootDir: opts.root,
      });
      process.stdout.write(JSON.stringify({ count: cases.length, cases }, null, 2));
      process.stdout.write('\n');
      process.exit(ExitCode.Ok);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(ExitCode.IoError);
    }
  });

defaultOpts(program.command('audit'))
  .description('Audit test files against the registry. Exit non-zero on errors.')
  .option('--strict', 'promote orphan / deprecated / unknown-tag warnings to errors', false)
  .action(async (opts) => {
    const w = createCliWeave();
    try {
      const result = await auditEngine({
        fs: w.fs,
        registryReader: w.registryReader,
        configReader: w.configReader,
        scanner: w.scanner,
        registryPath: w.fs.resolve(opts.root, opts.registry),
        configPath: w.fs.resolve(opts.root, opts.config),
        rootDir: opts.root,
        strict: opts.strict === true,
      });

      const useGhAnnotations = process.env.TRACE_ANNOTATIONS === 'github';
      for (const f of result.findings) {
        if (useGhAnnotations) w.github.emitAnnotation(f);
      }

      printAuditSummary(result);
      process.exit(result.ok ? ExitCode.Ok : ExitCode.AuditFailed);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(ExitCode.ConfigInvalid);
    }
  });

defaultOpts(program.command('report'))
  .description('Generate the HTML traceability report.')
  .option('--strict', 'promote orphan / deprecated / unknown-tag warnings to errors', false)
  .action(async (opts) => {
    const w = createCliWeave();
    try {
      const result = await auditEngine({
        fs: w.fs,
        registryReader: w.registryReader,
        configReader: w.configReader,
        scanner: w.scanner,
        registryPath: w.fs.resolve(opts.root, opts.registry),
        configPath: w.fs.resolve(opts.root, opts.config),
        rootDir: opts.root,
        strict: opts.strict === true,
      });
      const { entryPath } = await reportEngine({
        fs: w.fs,
        renderer: w.renderer,
        result,
      });
      process.stdout.write(`Report written: ${entryPath}\n`);
      process.exit(ExitCode.Ok);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(ExitCode.IoError);
    }
  });

defaultOpts(program.command('comment'))
  .description('Post a NEW PR comment with the audit summary (requires GitHub context).')
  .option('--new', 'force-create a new comment (default behaviour)', false)
  .option('--strict', 'promote orphan / deprecated / unknown-tag warnings to errors', false)
  .option('--artifact-run <id>', 'GitHub Actions run id (fallback when --artifact-url is unset)')
  .option('--artifact-url <url>', 'Direct artifact download URL from actions/upload-artifact')
  .action(async (opts) => {
    const w = createCliWeave();
    try {
      const event = process.env.GITHUB_EVENT_NAME;
      if (event !== 'pull_request') {
        console.error(`trace comment: skipping — GITHUB_EVENT_NAME is "${event ?? 'unset'}", not "pull_request".`);
        process.exit(ExitCode.Ok);
      }

      const repository = process.env.GITHUB_REPOSITORY;
      if (!repository || !repository.includes('/')) {
        console.error('trace comment: GITHUB_REPOSITORY is missing or malformed.');
        process.exit(ExitCode.GitHubError);
      }
      const [owner, repo] = repository.split('/');

      const pullNumberRaw = process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)\/merge/)?.[1]
        ?? process.env.GITHUB_PR_NUMBER
        ?? process.env.PR_NUMBER;
      const pullNumber = Number(pullNumberRaw);
      if (!Number.isInteger(pullNumber)) {
        console.error('trace comment: could not determine PR number from environment.');
        process.exit(ExitCode.GitHubError);
      }

      const result = await auditEngine({
        fs: w.fs,
        registryReader: w.registryReader,
        configReader: w.configReader,
        scanner: w.scanner,
        registryPath: w.fs.resolve(opts.root, opts.registry),
        configPath: w.fs.resolve(opts.root, opts.config),
        rootDir: opts.root,
        strict: opts.strict === true,
      });

      const artifactUrl =
        process.env.TRACE_ARTIFACT_URL ??
        opts.artifactUrl ??
        (opts.artifactRun
          ? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${owner}/${repo}/actions/runs/${opts.artifactRun}`
          : undefined);

      const out = await commentEngine({
        client: w.github,
        result,
        repo: { owner, name: repo },
        pullNumber,
        runId: opts.artifactRun,
        artifactUrl,
        nowIsoUtc: new Date().toISOString(),
      });
      process.stdout.write(`Posted comment id ${out.commentId}\n`);
      process.exit(ExitCode.Ok);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(ExitCode.GitHubError);
    }
  });

await program.parseAsync(process.argv);

function printAuditSummary(result: Awaited<ReturnType<typeof auditEngine>>): void {
  const errs = result.findings.filter((f) => f.severity === 'error').length;
  const warns = result.findings.filter((f) => f.severity === 'warning').length;
  process.stdout.write(
    `audit: ${result.testsScanned} tests · ${result.requirementsCovered}/${result.requirementsKnown} requirements covered · ${errs} error(s), ${warns} warning(s)\n`,
  );
  for (const f of result.findings) {
    const where = f.filePath ? ` ${f.filePath}:${f.line ?? '?'}` : '';
    process.stdout.write(`  [${f.severity}] ${f.rule}${where} — ${f.message}\n    → ${f.suggestion}\n`);
  }
}
