import type { HtmlRenderer, RenderedReport } from '../../sockets/HtmlRenderer.js';
import type { AuditResult, TestCase } from '../../motes/types.js';
import { htmlEscape } from '../../sparks/htmlEscape.js';
import { resolveLinkedToken } from '../../sparks/resolveLinkedToken.js';

/**
 * Plug: renders a single-file HTML artifact with all CSS/JS inlined.
 * Embeds otherReports as sandboxed iframes inside an "Other reports" tab.
 *
 * @traceId META-001
 */
export class InlinedHtmlRenderer implements HtmlRenderer {
  render(result: AuditResult): RenderedReport {
    const css = STYLE;
    const js = SCRIPT;
    const body = renderBody(result);
    const title = htmlEscape(result.config.prComment.commentTitle);
    const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>${css}</style>
</head>
<body>
  ${body}
  <script>${js}</script>
</body>
</html>`;

    return { indexHtml, extraFiles: {} };
  }
}

function renderBody(result: AuditResult): string {
  const { config, registry, coverage, findings, testsScanned, requirementsCovered, requirementsKnown } = result;
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const kinds = Object.keys(config.kinds);
  const coveragePct = requirementsKnown === 0 ? 0 : Math.round((requirementsCovered / requirementsKnown) * 100);

  const requirementsByKind = new Map<string, string[]>();
  for (const [id, r] of Object.entries(registry.requirements)) {
    const k = r.kind;
    if (!requirementsByKind.has(k)) requirementsByKind.set(k, []);
    requirementsByKind.get(k)!.push(id);
  }

  return `
<header class="hero">
  <div class="hero__title">
    <h1>${htmlEscape(config.prComment.commentTitle)}</h1>
    <p class="hero__subtitle">Generated ${new Date().toISOString()} UTC · ${testsScanned} tests scanned</p>
  </div>
  <div class="hero__stats">
    ${statCard('Tests', String(testsScanned))}
    ${statCard('Requirements known', String(requirementsKnown))}
    ${statCard('Covered', `${requirementsCovered} / ${requirementsKnown}`)}
    ${statCard('Errors', String(errors.length), errors.length > 0 ? 'bad' : 'good')}
    ${statCard('Warnings', String(warnings.length), warnings.length > 0 ? 'warn' : 'good')}
  </div>
  ${renderCoverageRing(coveragePct)}
</header>

<nav class="tabs" role="tablist">
  <button class="tab active" data-tab="summary" role="tab">Summary</button>
  <button class="tab" data-tab="requirements" role="tab">By Requirement</button>
  <button class="tab" data-tab="findings" role="tab">Findings (${findings.length})</button>
  <button class="tab" data-tab="tests" role="tab">All Tests</button>
  ${config.otherReports.length > 0
    ? `<button class="tab" data-tab="other" role="tab">Other Reports (${config.otherReports.length})</button>`
    : ''
  }
</nav>

<section class="panel active" id="panel-summary">
  <h2>Coverage by kind</h2>
  <table class="data">
    <thead>
      <tr><th>Kind</th><th>Label</th><th>Total</th><th>Covered</th><th>Coverage</th></tr>
    </thead>
    <tbody>
      ${kinds.map((k) => {
        const ids = requirementsByKind.get(k) ?? [];
        const covered = ids.filter((id) => (coverage[id]?.length ?? 0) > 0).length;
        const pct = ids.length === 0 ? 0 : Math.round((covered / ids.length) * 100);
        return `<tr>
          <td><code>${htmlEscape(k)}</code></td>
          <td>${htmlEscape(config.kinds[k]?.label ?? k)}</td>
          <td>${ids.length}</td>
          <td>${covered}</td>
          <td>
            <div class="bar"><span style="width:${pct}%"></span></div>
            <span class="bar__num">${pct}%</span>
          </td>
        </tr>`;
      }).join('\n')}
    </tbody>
  </table>
</section>

<section class="panel" id="panel-requirements">
  <h2>Requirements (${Object.keys(registry.requirements).length})</h2>
  <input class="filter" placeholder="Filter by ID, title, owner, or tag…" data-filter-target="req-row" />
  ${kinds.map((kind) => {
    const ids = (requirementsByKind.get(kind) ?? []).sort();
    if (ids.length === 0) return '';
    return `
      <h3 class="kind-heading"><code>${htmlEscape(kind)}</code> · ${htmlEscape(config.kinds[kind]?.label ?? kind)}</h3>
      <div class="reqs">
        ${ids.map((id) => renderRequirement(id, result)).join('\n')}
      </div>
    `;
  }).join('\n')}
</section>

<section class="panel" id="panel-findings">
  <h2>Findings</h2>
  ${findings.length === 0
    ? '<p class="empty">No findings. ✅</p>'
    : `<table class="data sortable">
        <thead><tr>
          <th>Severity</th><th>Rule</th><th>Where</th><th>Message</th><th>Suggestion</th>
        </tr></thead>
        <tbody>
          ${findings.map((f) => `<tr class="finding finding--${f.severity}">
            <td><span class="pill pill--${f.severity}">${f.severity}</span></td>
            <td><code>${htmlEscape(f.rule)}</code></td>
            <td>${f.filePath ? `<code>${htmlEscape(f.filePath)}:${f.line ?? '?'}</code>` : '—'}</td>
            <td>${htmlEscape(f.message)}</td>
            <td>${htmlEscape(f.suggestion)}</td>
          </tr>`).join('\n')}
        </tbody>
      </table>`
  }
</section>

<section class="panel" id="panel-tests">
  <h2>All tests (${testsScanned})</h2>
  <input class="filter" placeholder="Filter by description, file, framework…" data-filter-target="test-row" />
  <table class="data sortable">
    <thead><tr>
      <th>Framework</th><th>Trace IDs</th><th>Description</th><th>File</th><th>Line</th><th>Owner</th><th>Priority</th>
    </tr></thead>
    <tbody>
      ${result.testCases.map((tc) => renderTestRow(tc, result)).join('\n')}
    </tbody>
  </table>
</section>

${config.otherReports.length > 0
  ? `<section class="panel" id="panel-other">
      <h2>Other reports</h2>
      <nav class="subtabs">
        ${config.otherReports.map((r, i) =>
          `<button class="subtab ${i === 0 ? 'active' : ''}" data-subtab="other-${i}">${htmlEscape(r.label)}</button>`,
        ).join('\n')}
      </nav>
      ${config.otherReports.map((r, i) => `
        <div class="subpanel ${i === 0 ? 'active' : ''}" id="subpanel-other-${i}">
          <iframe src="../${htmlEscape(r.entry)}" sandbox="allow-same-origin" title="${htmlEscape(r.label)}"></iframe>
        </div>
      `).join('\n')}
    </section>`
  : ''
}

<footer class="footer">
  <p>Built by <a href="../tools/requirements-tracer/README.md"><code>@__code/requirements-tracer</code></a> ·
  CLAD-shaped · See <a href="../docs/traceability/index.md">docs/traceability/</a>.</p>
</footer>
`;
}

function statCard(label: string, value: string, mood?: 'good' | 'bad' | 'warn'): string {
  return `<div class="stat stat--${mood ?? 'neutral'}">
    <div class="stat__label">${htmlEscape(label)}</div>
    <div class="stat__value">${htmlEscape(value)}</div>
  </div>`;
}

function renderCoverageRing(pct: number): string {
  const r = 36;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return `<div class="ring">
    <svg viewBox="0 0 100 100" width="120" height="120" role="img" aria-label="Coverage ${pct}%">
      <circle cx="50" cy="50" r="${r}" stroke="#1f2937" stroke-width="10" fill="none" />
      <circle cx="50" cy="50" r="${r}" stroke="#22c55e" stroke-width="10" fill="none"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}"
        stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 50 50)" />
      <text x="50" y="55" text-anchor="middle" font-size="20" fill="#e5e7eb" font-weight="700">${pct}%</text>
    </svg>
    <p class="ring__caption">Requirements covered</p>
  </div>`;
}

function renderRequirement(id: string, result: AuditResult): string {
  const req = result.registry.requirements[id];
  if (!req) return '';
  const tests = result.coverage[id] ?? [];
  const covered = tests.length > 0;
  const ownerStr = req.owner ? `<span class="meta">Owner: <code>${htmlEscape(req.owner)}</code></span>` : '';
  const statusStr = req.status && req.status !== 'active'
    ? `<span class="pill pill--${req.status === 'deprecated' ? 'warn' : 'neutral'}">${req.status}</span>`
    : '';
  const priorityStr = req.priority ? `<span class="pill pill--${req.priority}">${req.priority}</span>` : '';
  const tags = (req.tags ?? []).map((t) => `<span class="tag">${htmlEscape(t)}</span>`).join('');
  const linked = (req.linked_stories ?? []).map((tok) => {
    const url = resolveLinkedToken(tok, result.config.linkResolvers);
    return url === tok
      ? `<code>${htmlEscape(tok)}</code>`
      : `<a href="${htmlEscape(url)}"><code>${htmlEscape(tok)}</code></a>`;
  }).join(' ');

  return `<article class="req req--${covered ? 'covered' : 'uncovered'}" data-req-row data-filter="${htmlEscape(`${id} ${req.title} ${req.owner ?? ''} ${(req.tags ?? []).join(' ')}`).toLowerCase()}">
    <header>
      <h4>
        <code class="req-id">${htmlEscape(id)}</code>
        ${htmlEscape(req.title)}
        ${statusStr}
        ${priorityStr}
      </h4>
      <div class="req__meta">${ownerStr} ${linked ? '<span class="meta">Linked: ' + linked + '</span>' : ''}</div>
      ${tags ? `<div class="req__tags">${tags}</div>` : ''}
    </header>
    ${req.summary ? `<p class="req__summary">${htmlEscape(req.summary)}</p>` : ''}
    <div class="req__tests">
      <strong>${tests.length}</strong> test${tests.length === 1 ? '' : 's'}
      ${tests.length === 0
        ? '<span class="pill pill--warn">No coverage</span>'
        : '<ul>' + tests.map((t) => `<li><code>${htmlEscape(t.filePath)}:${t.line}</code> — ${htmlEscape(t.description)}</li>`).join('') + '</ul>'
      }
    </div>
  </article>`;
}

function renderTestRow(tc: TestCase, result: AuditResult): string {
  const owner = tc.tags.owner ?? '—';
  const priority = tc.tags.priority ?? '—';
  const ids = tc.traceIds.length
    ? tc.traceIds.map((id) => `<code class="req-id">${htmlEscape(id)}</code>`).join(' ')
    : '<span class="pill pill--bad">missing</span>';
  const filter = `${tc.description} ${tc.filePath} ${tc.framework} ${tc.traceIds.join(' ')}`.toLowerCase();
  return `<tr data-test-row data-filter="${htmlEscape(filter)}">
    <td><span class="pill pill--${tc.framework}">${tc.framework}</span></td>
    <td>${ids}</td>
    <td>${htmlEscape(tc.description)}${tc.tags.description ? `<div class="desc">${htmlEscape(tc.tags.description)}</div>` : ''}</td>
    <td><code>${htmlEscape(tc.filePath)}</code></td>
    <td>${tc.line}</td>
    <td>${htmlEscape(owner)}</td>
    <td>${htmlEscape(priority)}</td>
  </tr>`;
  // unused import kept silent for linter
  // (result is referenced solely to keep the function signature stable for future enrichment)
  void result;
}

const STYLE = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: #0b1220; color: #e5e7eb; margin: 0; line-height: 1.5;
}
code, .req-id { font-family: ui-monospace, "JetBrainsMono NF", "Cascadia Code", Consolas, monospace; font-size: 0.9em; }
a { color: #60a5fa; }
.hero {
  display: grid; grid-template-columns: 1fr auto auto; gap: 1.5rem; align-items: center;
  padding: 1.5rem 2rem; background: linear-gradient(180deg, #111827 0%, #0b1220 100%);
  border-bottom: 1px solid #1f2937;
}
.hero__title h1 { margin: 0 0 0.25rem; font-size: 1.5rem; }
.hero__subtitle { margin: 0; color: #9ca3af; font-size: 0.9rem; }
.hero__stats { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.stat {
  background: #1f2937; padding: 0.5rem 0.8rem; border-radius: 0.5rem; min-width: 110px;
  border: 1px solid #374151;
}
.stat--good { border-color: #16a34a55; }
.stat--bad  { border-color: #dc262655; }
.stat--warn { border-color: #f59e0b55; }
.stat__label { font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
.stat__value { font-size: 1.25rem; font-weight: 700; }
.ring { display: flex; flex-direction: column; align-items: center; }
.ring__caption { margin: 0.25rem 0 0; font-size: 0.75rem; color: #9ca3af; }
.tabs, .subtabs {
  display: flex; gap: 0.25rem; padding: 0.5rem 2rem 0;
  border-bottom: 1px solid #1f2937; background: #0b1220; position: sticky; top: 0; z-index: 5;
}
.tab, .subtab {
  background: transparent; color: #9ca3af; border: 0; padding: 0.6rem 1rem; cursor: pointer;
  border-radius: 0.4rem 0.4rem 0 0; font-weight: 600; font-size: 0.9rem;
}
.tab:hover, .subtab:hover { color: #e5e7eb; }
.tab.active, .subtab.active { color: #e5e7eb; background: #111827; }
.panel, .subpanel { display: none; padding: 1.5rem 2rem; }
.panel.active, .subpanel.active { display: block; }
.data { width: 100%; border-collapse: collapse; }
.data th, .data td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #1f2937; vertical-align: top; }
.data thead th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; cursor: pointer; user-select: none; }
.data tbody tr:hover { background: #11182780; }
.bar { display: inline-block; width: 100px; height: 6px; background: #1f2937; border-radius: 3px; overflow: hidden; vertical-align: middle; }
.bar span { display: block; height: 100%; background: #22c55e; }
.bar__num { margin-left: 0.5rem; font-size: 0.8rem; color: #9ca3af; }
.kind-heading { margin: 1.5rem 0 0.5rem; }
.reqs { display: grid; gap: 0.75rem; }
.req {
  background: #111827; border: 1px solid #1f2937; border-left: 4px solid #374151;
  border-radius: 0.5rem; padding: 1rem;
}
.req--covered { border-left-color: #22c55e; }
.req--uncovered { border-left-color: #f59e0b; }
.req h4 { margin: 0 0 0.25rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.req__meta { color: #9ca3af; font-size: 0.85rem; margin-bottom: 0.25rem; }
.req__meta .meta + .meta { margin-left: 0.75rem; }
.req__tags { display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.25rem; }
.req__summary { color: #cbd5e1; }
.req__tests { font-size: 0.85rem; }
.req__tests ul { margin: 0.25rem 0 0; padding-left: 1.25rem; color: #cbd5e1; }
.pill {
  display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.75rem;
  background: #1f2937; color: #e5e7eb; text-transform: capitalize;
}
.pill--error, .pill--bad, .pill--critical { background: #dc262633; color: #fca5a5; }
.pill--warning, .pill--warn, .pill--high { background: #f59e0b33; color: #fcd34d; }
.pill--medium { background: #38bdf833; color: #7dd3fc; }
.pill--low, .pill--neutral { background: #1f2937; color: #9ca3af; }
.pill--vitest, .pill--jest, .pill--playwright, .pill--cypress { background: #1e293b; color: #93c5fd; }
.tag { display: inline-block; padding: 0.05rem 0.4rem; background: #1e293b; border-radius: 999px; font-size: 0.7rem; color: #93c5fd; }
.filter {
  width: 100%; padding: 0.5rem 0.75rem; background: #111827; color: #e5e7eb;
  border: 1px solid #1f2937; border-radius: 0.4rem; margin-bottom: 0.75rem;
}
.desc { color: #9ca3af; font-size: 0.85rem; margin-top: 0.25rem; }
.empty { color: #9ca3af; font-style: italic; }
.subpanel iframe { width: 100%; height: 70vh; border: 1px solid #1f2937; border-radius: 0.5rem; background: #fff; }
.footer { padding: 1rem 2rem; color: #6b7280; border-top: 1px solid #1f2937; font-size: 0.85rem; }
`;

const SCRIPT = `
(function(){
  function activateTab(name){
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
  }
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab)));

  document.querySelectorAll('.subtab').forEach(t => t.addEventListener('click', () => {
    const name = t.dataset.subtab;
    document.querySelectorAll('.subtab').forEach(s => s.classList.toggle('active', s.dataset.subtab === name));
    document.querySelectorAll('.subpanel').forEach(s => s.classList.toggle('active', s.id === 'subpanel-' + name));
  }));

  document.querySelectorAll('.filter').forEach(input => {
    const targetAttr = input.dataset.filterTarget;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      document.querySelectorAll('[data-' + targetAttr + ']').forEach(el => {
        const hay = el.getAttribute('data-filter') || '';
        el.style.display = (q === '' || hay.indexOf(q) !== -1) ? '' : 'none';
      });
    });
  });

  document.querySelectorAll('table.sortable thead th').forEach((th, idx) => {
    th.addEventListener('click', () => {
      const table = th.closest('table');
      const tbody = table.tBodies[0];
      const rows = Array.from(tbody.rows);
      const dir = th.dataset.sortDir === 'asc' ? 'desc' : 'asc';
      th.dataset.sortDir = dir;
      rows.sort((a, b) => {
        const A = a.cells[idx]?.innerText.trim() ?? '';
        const B = b.cells[idx]?.innerText.trim() ?? '';
        const cmp = A.localeCompare(B, undefined, { numeric: true });
        return dir === 'asc' ? cmp : -cmp;
      });
      rows.forEach(r => tbody.appendChild(r));
    });
  });
})();
`;
