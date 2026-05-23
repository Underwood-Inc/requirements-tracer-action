import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuditResult } from '../../motes/types.js';
import { htmlEscape } from '../../sparks/htmlEscape.js';
import { buildMappyReportData, type MappyReportData } from './buildMappyReportData.js';
import { MAPPY_REPORT_CSS } from './mappyReportStyles.js';

const DEFAULT_DOCS_URL = 'https://github.com/Underwood-Inc/requirements-tracer-action#readme';
const DEFAULT_REPO_URL = 'https://github.com/Underwood-Inc/requirements-tracer-action';

const KIND_TIPS: Record<string, string> = {
  FR: 'Functional Requirement — a feature or behaviour the system must exhibit.',
  NFR: 'Non-Functional Requirement — performance, reliability, or quality attribute.',
  SEC: 'Security Requirement — access control, data protection, or threat mitigation.',
  BR: 'Business Rule — a domain constraint or policy shaping feature behaviour.',
  META: 'Meta requirement — tooling, process, or infrastructure; not product behaviour.',
  A11Y: 'Accessibility Requirement — WCAG conformance, screen reader, or motion behaviour.',
};

const PRI_TIPS: Record<string, string> = {
  critical: 'Critical — must be addressed before release; blocks or risks production safety.',
  high: 'High — important; resolve in the current or next sprint.',
  medium: 'Medium — planned; address within the current milestone.',
  low: 'Low — nice-to-have; track but defer if needed.',
};

const INSPECTOR_CONSOLE_ART = [
  '',
  '                /\\_/\\',
  '               ( o.o )',
  '                > ^ <',
  '               /|   |\\',
  '              (_|   |_)',
  '',
].join('\n');

let clientScriptTemplate: string | undefined;

function loadClientScriptTemplate(): string {
  if (clientScriptTemplate) return clientScriptTemplate;
  const here = dirname(fileURLToPath(import.meta.url));
  clientScriptTemplate = readFileSync(join(here, 'mappyReportClient.template.js'), 'utf8');
  return clientScriptTemplate;
}

export interface MappyRenderedReport {
  readonly indexHtml: string;
  readonly summaryJson: string;
}

function esc(s: string): string {
  return htmlEscape(s);
}

function resolveBranding(result: AuditResult): { projectName: string; docsUrl: string; repoUrl: string } {
  const b = result.config.branding;
  return {
    projectName:
      (b?.projectName ??
        result.config.prComment.commentTitle.replace(/\s*Audit Report\s*$/i, '').trim()) ||
      'Traceability',
    docsUrl: b?.docsUrl ?? DEFAULT_DOCS_URL,
    repoUrl: b?.repoUrl ?? DEFAULT_REPO_URL,
  };
}

function kindRowsHtml(data: MappyReportData): string {
  return Object.entries(data.summary.by_kind)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, s]) => {
      const p = s.total > 0 ? Math.round((s.tested / s.total) * 100) : 100;
      const tip = KIND_TIPS[kind] ?? kind;
      return `<tr>
    <td><span class="kind-badge kind-${esc(kind.toLowerCase())}" data-tip="${esc(tip)}">${esc(kind)}</span></td>
    <td class="n">${s.total}</td>
    <td class="n ok">${s.tested}</td>
    <td class="n ${s.untested > 0 ? 'warn' : 'ok'}">${s.untested > 0 ? `<strong>${s.untested}</strong>` : '0'}</td>
    <td class="n"><span class="pct" style="color:${p >= 90 ? '#5ecf8e' : p >= 70 ? '#e8a045' : '#f87171'}">${p}%</span></td>
  </tr>`;
    })
    .join('');
}

function findingsSection(data: MappyReportData): string {
  if (data.findings.length === 0) return '';
  const rows = data.findings
    .map(
      (f) => `<tr>
      <td><span class="finding-pill finding-pill--${f.severity}">${esc(f.severity)}</span></td>
      <td><code>${esc(f.rule)}</code></td>
      <td>${f.filePath ? `<code>${esc(f.filePath)}:${f.line ?? '?'}</code>` : '—'}</td>
      <td>${esc(f.message)}</td>
      <td>${esc(f.suggestion)}</td>
    </tr>`,
    )
    .join('\n');
  return `
  <section class="section">
    <div class="section-title err">⚠️ Audit findings (${data.findings.length})</div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Severity</th><th>Rule</th><th>Where</th><th>Message</th><th>Suggestion</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </section>`;
}

function kindPillsHtml(data: MappyReportData): string {
  const kinds = [...new Set(data.requirements.map((r) => r.kind).filter(Boolean))].sort();
  return kinds
    .map(
      (k) =>
        `<button class="pill" data-kind="${esc(k)}" data-tip="${esc(KIND_TIPS[k] ?? k)}">${esc(k)}</button>`,
    )
    .join('');
}

/** Render self-contained Mappy-branded HTML report + summary JSON payload. */
export function renderMappyTraceReport(result: AuditResult): MappyRenderedReport {
  const data = buildMappyReportData(result);
  const branding = resolveBranding(result);
  const { summary, unknownIds } = data;
  const activeCount = summary.total_active_requirements;
  const deprecatedCount = summary.deprecated_count;
  const totalReqCount = activeCount + deprecatedCount;

  const ARC = 238.76;
  const dash = Math.round((summary.coverage_pct / 100) * ARC * 10) / 10;
  const ringColor =
    summary.coverage_pct >= 90 ? '#5ecf8e' : summary.coverage_pct >= 70 ? '#e8a045' : '#f87171';

  const genAt = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const DATA_JSON = JSON.stringify({
    summary,
    requirements: data.requirements,
    allTags: data.allTags,
    unknownIds,
  });

  const clientScript = loadClientScriptTemplate()
    .replace('__DATA_JSON__', DATA_JSON)
    .replace('__INSPECTOR_ART__', JSON.stringify(INSPECTOR_CONSOLE_ART));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Traceability Report — ${esc(branding.projectName)}</title>
<style>${MAPPY_REPORT_CSS}
.suggestions{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:200;background:color-mix(in srgb,var(--bg-panel) 90%,transparent);border:1px solid var(--border-mid);border-radius:var(--radius);backdrop-filter:blur(22px);box-shadow:0 8px 32px rgba(0,0,0,.5);overflow:hidden}
.sugg-item{display:flex;align-items:baseline;gap:.6rem;padding:.45rem .85rem;cursor:pointer;transition:background 80ms}
.sugg-item:hover,.sugg-item.active{background:rgba(206,178,111,.12)}
.sugg-token{font-family:'SF Mono',Consolas,monospace;font-size:.8rem;color:var(--accent);font-weight:600}
.sugg-desc{font-size:.76rem;color:var(--muted)}
.sugg-group-title{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;padding:.5rem .85rem .2rem;border-top:1px solid var(--border)}
th.sorted-asc::after{content:' ↑';color:var(--accent)}
th.sorted-desc::after{content:' ↓';color:var(--accent)}
.release-actions{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:.75rem}
.release-btn{background:rgba(206,178,111,.12);border:1px solid var(--accent);color:var(--accent);font-size:.78rem;font-weight:600;padding:.35em .85em;border-radius:999px;cursor:pointer;transition:background 120ms,color 120ms}
.release-btn:hover{background:rgba(206,178,111,.22)}
.release-btn.copied{border-color:var(--success);color:var(--success)}
.pill[data-kind="FR"]{--kc:#5ecf8e}.pill[data-kind="NFR"]{--kc:#fb923c}.pill[data-kind="SEC"]{--kc:#f87171}.pill[data-kind="BR"]{--kc:#818cf8}.pill[data-kind="META"]{--kc:#94a3b8}.pill[data-kind="A11Y"]{--kc:#67e8f9}
.pill[data-kind]:not([data-kind=""]){border-color:color-mix(in srgb,var(--kc,var(--border)) 30%,var(--border) 70%);color:color-mix(in srgb,var(--kc,var(--muted)) 55%,var(--muted) 45%)}
.pill[data-kind]:not([data-kind=""]).active{border-color:var(--kc,var(--accent));color:var(--kc,var(--accent));background:color-mix(in srgb,var(--kc,var(--accent)) 14%,transparent)}
.pill[data-pri="critical"]{--pc:#f87171}.pill[data-pri="high"]{--pc:#fb923c}.pill[data-pri="medium"]{--pc:#fbbf24}.pill[data-pri="low"]{--pc:#98a7bd}
.pill[data-pri]:not([data-pri=""]){border-color:color-mix(in srgb,var(--pc,var(--border)) 30%,var(--border) 70%);color:color-mix(in srgb,var(--pc,var(--muted)) 55%,var(--muted) 45%)}
.pill[data-pri]:not([data-pri=""]).active{border-color:var(--pc,var(--accent));color:var(--pc,var(--accent));background:color-mix(in srgb,var(--pc,var(--accent)) 14%,transparent)}
.pill[data-at="@tested"]{--ac:#5ecf8e}.pill[data-at="@untested"]{--ac:#f87171}.pill[data-at="@deprecated"]{--ac:#94a3b8}
.pill[data-at]:not([data-at=""]){border-color:color-mix(in srgb,var(--ac,var(--border)) 30%,var(--border) 70%);color:color-mix(in srgb,var(--ac,var(--muted)) 55%,var(--muted) 45%)}
.pill[data-at]:not([data-at=""]).active{border-color:var(--ac,var(--accent));color:var(--ac,var(--accent));background:color-mix(in srgb,var(--ac,var(--accent)) 14%,transparent)}
.pct{font-variant-numeric:tabular-nums}
footer{padding:1rem 2rem;color:var(--muted);border-top:1px solid var(--border);font-size:.85rem;text-align:center}
</style>
</head>
<body>

<header>
  <div class="header-brand">
    <div class="header-icon">⚔</div>
    <div>
      <div class="header-title">Traceability Report</div>
      <div class="header-meta">${esc(branding.projectName)} · ${genAt} UTC</div>
    </div>
  </div>
  <div class="cov-ring-wrap" data-tip="${summary.coverage_pct}% of active requirements have ≥ 1 linked test. Green ≥ 90%, amber ≥ 70%, red below.">
    <svg width="76" height="76" viewBox="0 0 76 76" aria-label="${summary.coverage_pct}% coverage">
      <circle cx="38" cy="38" r="30" fill="none" stroke="#3a342c" stroke-width="6"/>
      <circle cx="38" cy="38" r="30" fill="none" stroke="${ringColor}" stroke-width="6"
        stroke-dasharray="${dash} ${ARC}" stroke-linecap="round"
        transform="rotate(-90 38 38)"/>
      <text x="38" y="43" text-anchor="middle" fill="#e8eef7" font-size="14" font-weight="700">${summary.coverage_pct}%</text>
    </svg>
    <div class="cov-ring-label">coverage</div>
  </div>
</header>

<main>

  <section class="section">
    <div class="section-title">📊 Overview</div>
    <div class="stats-grid">
      <div class="stat"><span class="stat-value">${activeCount}</span><span class="stat-label">Active requirements</span></div>
      <div class="stat"><span class="stat-value ok">${summary.tested_count}</span><span class="stat-label">Tested (≥ 1 test)</span></div>
      <div class="stat"><span class="stat-value ok">${summary.requirements_with_e2e}</span><span class="stat-label">E2E-covered</span></div>
      <div class="stat"><span class="stat-value ${summary.untested_count > 0 ? 'warn' : 'ok'}">${summary.untested_count}</span><span class="stat-label">Untested</span></div>
      <div class="stat"><span class="stat-value ${unknownIds.length > 0 ? 'err' : 'ok'}">${unknownIds.length}</span><span class="stat-label">Unknown IDs in tests</span></div>
      <div class="stat"><span class="stat-value">${summary.tests_scanned}</span><span class="stat-label">Tests scanned</span></div>
      <div class="stat"><span class="stat-value ${summary.audit_errors > 0 ? 'err' : 'ok'}">${summary.audit_errors}</span><span class="stat-label">Audit errors</span></div>
      <div class="stat"><span class="stat-value ${summary.audit_warnings > 0 ? 'warn' : 'ok'}">${summary.audit_warnings}</span><span class="stat-label">Audit warnings</span></div>
      <div class="stat"><span class="stat-value" style="color:var(--muted)">${deprecatedCount}</span><span class="stat-label">Deprecated (excluded)</span></div>
    </div>
  </section>

  <section class="section">
    <div class="section-title">📁 Coverage by kind</div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Kind</th><th class="n">Total</th><th class="n">Tested</th><th class="n">Untested</th><th class="n">Coverage</th>
        </tr></thead>
        <tbody>${kindRowsHtml(data)}</tbody>
      </table>
    </div>
  </section>

  ${findingsSection(data)}

  <section class="section">
    <div class="section-title">📋 Requirements</div>
    <div class="search-wrap">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input id="search-input" type="text" autocomplete="off" spellcheck="false"
          placeholder='Search… e.g. @untested @fr "search phrase" | alternate'
          aria-label="Search requirements">
        <button class="search-clear" id="search-clear" title="Clear" aria-label="Clear search">✕</button>
      </div>
      <div class="suggestions" id="suggestions" hidden role="listbox" aria-label="Search suggestions"></div>
    </div>

    <details class="help-details" id="search-help">
      <summary>Search syntax guide</summary>
      <div class="help-content">
        <div class="help-section">
          <h4>@ filter tokens</h4>
          <table>
            <tr><td>@tested / @covered</td><td>Has ≥ 1 test</td></tr>
            <tr><td>@untested / @uncovered</td><td>No tests yet</td></tr>
            <tr><td>@deprecated / @active / @proposed</td><td>Status</td></tr>
            <tr><td>@fr / @nfr / @meta / @sec / @br</td><td>Kind</td></tr>
            <tr><td>@critical / @high / @medium / @low</td><td>Priority</td></tr>
            <tr><td>@e2e / @unit</td><td>Has e2e or unit link</td></tr>
          </table>
        </div>
        <div class="help-section">
          <h4># disposition + tag tokens</h4>
          <table>
            <tr><td>#covered</td><td>Has ≥ 1 test</td></tr>
            <tr><td>#untested / #shipped</td><td>Active, no tests</td></tr>
            <tr><td>#backlog / #review</td><td>Proposed status</td></tr>
            <tr><td>#deprecated</td><td>Deprecated</td></tr>
          </table>
        </div>
      </div>
    </details>

    <div class="release-actions">
      <button type="button" class="release-btn" id="release-export">Copy release checklist (FR + e2e)</button>
      <span class="result-count" style="margin:0" id="release-export-hint"></span>
    </div>

    <div class="filter-row" id="filter-row">
      <div class="filter-group" id="coverage-pills">
        <button class="pill active" data-at="">All</button>
        <button class="pill" data-at="@tested">Tested</button>
        <button class="pill" data-at="@untested">Untested</button>
        <button class="pill" data-at="@e2e">E2E covered</button>
        <button class="pill" data-at="@e2e-only">E2E only</button>
        <button class="pill" data-at="@deprecated">Deprecated</button>
      </div>
      <div class="filter-sep"></div>
      <div class="filter-group" id="kind-pills">
        <button class="pill active" data-kind="">All kinds</button>
        ${kindPillsHtml(data)}
      </div>
      <div class="filter-sep"></div>
      <div class="filter-group" id="priority-pills">
        <button class="pill active" data-pri="">All priorities</button>
        ${(['critical', 'high', 'medium', 'low'] as const)
          .map(
            (p) =>
              `<button class="pill" data-pri="${p}" data-tip="${esc(PRI_TIPS[p] ?? p)}">${p.charAt(0).toUpperCase() + p.slice(1)}</button>`,
          )
          .join('')}
      </div>
    </div>

    <div class="controls-row">
      <span class="result-count" id="result-count">Showing ${totalReqCount} of ${totalReqCount} requirements</span>
      <div class="sort-row">
        <span class="sort-label">Sort:</span>
        <button class="sort-btn active" data-sort="id">ID</button>
        <button class="sort-btn" data-sort="kind">Kind</button>
        <button class="sort-btn" data-sort="priority">Priority</button>
        <button class="sort-btn" data-sort="tests-desc">Tests ↓</button>
        <button class="sort-btn" data-sort="tests-asc">Tests ↑</button>
      </div>
    </div>

    <div class="table-wrap" style="margin-top:.5rem">
      <table id="reqs-table">
        <thead>
          <tr>
            <th data-col="id">ID</th>
            <th data-col="kind">Kind</th>
            <th data-col="priority">Priority</th>
            <th data-col="title">Title / Summary</th>
            <th class="n" data-col="tests">Tests</th>
          </tr>
        </thead>
        <tbody id="reqs-body"></tbody>
      </table>
      <div class="no-results" id="no-results" hidden>
        <strong>No matching requirements</strong>
        Try adjusting your search or clearing the active filters.
      </div>
    </div>
  </section>

  ${
    unknownIds.length > 0
      ? `
  <section class="section unknown-section">
    <div class="section-title err">⚠️ Unknown IDs in tests (${unknownIds.length})</div>
    <p style="color:var(--muted);font-size:.85rem;margin-bottom:.75rem">These trace IDs appear in test files but have no matching entry in <code style="font-family:monospace;font-size:.85em">requirements-registry.yaml</code>.</p>
    <div style="display:flex;flex-wrap:wrap;gap:.4rem">
      ${unknownIds.map((id) => `<span class="unknown-id">${esc(id)}</span>`).join('')}
    </div>
  </section>`
      : ''
  }

</main>

<footer>
  Built by <a href="${esc(branding.repoUrl)}" rel="noopener">@underwoodinc/requirements-tracer</a>
  · <a href="${esc(branding.docsUrl)}" rel="noopener">Documentation</a>
  · CLAD-shaped traceability
</footer>

<script>
${clientScript}
</script>
</body>
</html>`;

  return {
    indexHtml: html,
    summaryJson: JSON.stringify(summary, null, 2),
  };
}
