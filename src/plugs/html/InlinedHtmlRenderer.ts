import type { HtmlRenderer, RenderedReport } from '../../sockets/HtmlRenderer.js';
import type { AuditResult } from '../../motes/types.js';
import { renderMappyTraceReport } from './renderMappyTraceReport.js';

/**
 * Plug: renders a single-file Mappy-branded HTML artifact with search, filters, and summary JSON.
 *
 * @traceId META-001
 */
export class InlinedHtmlRenderer implements HtmlRenderer {
  render(result: AuditResult): RenderedReport {
    const { indexHtml, summaryJson } = renderMappyTraceReport(result);
    return {
      indexHtml,
      extraFiles: { 'summary.json': summaryJson },
    };
  }
}
