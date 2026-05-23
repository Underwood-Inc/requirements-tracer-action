import type { FileSystem } from '../sockets/FileSystem.js';
import type { HtmlRenderer } from '../sockets/HtmlRenderer.js';
import type { AuditResult } from '../motes/types.js';
import { posix } from 'node:path';

export interface ReportEngineInput {
  readonly fs: FileSystem;
  readonly renderer: HtmlRenderer;
  readonly result: AuditResult;
}

/**
 * Engine: writes the HTML artifact to disk.
 * Embeds any otherReports as separate files inside the report directory.
 *
 * @traceId META-001
 */
export async function reportEngine(input: ReportEngineInput): Promise<{ entryPath: string }> {
  const { fs, renderer, result } = input;
  const cwd = fs.cwd();
  const reportDir = fs.resolve(cwd, result.config.output.reportDir);

  await fs.mkdir(reportDir, { recursive: true });

  const rendered = renderer.render(result);

  const entryPath = fs.resolve(reportDir, result.config.output.reportEntry);
  await fs.writeFile(entryPath, rendered.indexHtml);

  for (const [name, contents] of Object.entries(rendered.extraFiles)) {
    const filePath = fs.resolve(reportDir, name);
    const dir = posix.dirname(filePath.replace(/\\/g, '/'));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, contents);
  }

  await fs.writeFile(
    fs.resolve(cwd, result.config.output.auditJson),
    JSON.stringify(
      {
        testsScanned: result.testsScanned,
        requirementsKnown: result.requirementsKnown,
        requirementsCovered: result.requirementsCovered,
        findings: result.findings,
        ok: result.ok,
      },
      null,
      2,
    ),
  );

  return { entryPath };
}
