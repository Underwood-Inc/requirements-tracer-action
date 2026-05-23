import type { AuditResult } from '../motes/types.js';

export interface RenderedReport {
  readonly indexHtml: string;
  readonly extraFiles: Readonly<Record<string, string>>;
}

/** Socket: builds the self-contained HTML artifact from an AuditResult. */
export interface HtmlRenderer {
  render(result: AuditResult): RenderedReport;
}
