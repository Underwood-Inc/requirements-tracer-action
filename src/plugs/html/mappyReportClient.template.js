(function () {
'use strict';

// ── Embedded data ────────────────────────────────────────────────────────────
const DATA = __DATA_JSON__;
const REQS = DATA.requirements;
const ALL_TAGS = DATA.allTags;

(function logTraceReportEasterEgg() {
  console.log(__INSPECTOR_ART__);
})();

// ── Search engine (mirrors searchQueryParser.ts + registryRequirementFilter.ts) ──

// @ filter predicates
const AT_FILTERS = {
  tested:      r => r.testCount > 0,
  covered:     r => r.testCount > 0,
  untested:    r => r.testCount === 0 && r.status !== 'deprecated',
  uncovered:   r => r.testCount === 0 && r.status !== 'deprecated',
  deprecated:  r => r.status === 'deprecated',
  active:      r => r.status === 'active',
  proposed:    r => r.status === 'proposed',
  fr:          r => r.kind === 'FR',
  nfr:         r => r.kind === 'NFR',
  meta:        r => r.kind === 'META',
  sec:         r => r.kind === 'SEC',
  br:          r => r.kind === 'BR',
  critical:    r => r.priority === 'critical',
  high:        r => r.priority === 'high',
  medium:      r => r.priority === 'medium',
  low:         r => r.priority === 'low',
  e2e:         r => r.hasE2e,
  unit:        r => r.unitTestCount > 0,
  'e2e-only':  r => r.hasE2e && r.unitTestCount === 0,
};

// # disposition hashes (mirrors DISPOSITION_HASH in registryRequirementFilter.ts)
const HASH_DISPOSITION = {
  covered:    r => r.testCount > 0,
  untested:   r => r.testCount === 0 && r.status !== 'deprecated',
  shipped:    r => r.testCount === 0 && r.status === 'active',
  backlog:    r => r.testCount === 0 && (r.status === 'proposed' || r.status === 'backlog'),
  review:     r => r.testCount === 0 && (r.status === 'proposed' || r.status === 'backlog'),
  deprecated: r => r.status === 'deprecated',
};

function parseQuery(raw) {
  const atTokens = [], hashTokens = [], phrases = [];
  let q = raw
    .replace(/@([a-z][a-z0-9_-]*)/gi,  (_, t) => { atTokens.push(t.toLowerCase()); return ' '; })
    .replace(/#([a-zA-Z0-9_-]+)/g,      (_, t) => { hashTokens.push(t.toLowerCase()); return ' '; })
    .replace(/"([^"]*)"/g,              (_, p) => { if (p.trim()) phrases.push(p.toLowerCase()); return ' '; });
  const orGroups = q.split('|').map(seg => seg.trim().split(/\s+/).filter(t => t.length > 0).map(t => t.toLowerCase()));
  return { atTokens, hashTokens, phrases, orGroups };
}

function matchTerm(hay, term) {
  return term.endsWith('*') ? hay.includes(term.slice(0, -1)) : hay.includes(term);
}

function filterReqs(reqs, q) {
  return reqs.filter(r => {
    for (const t of q.atTokens) {
      const fn = AT_FILTERS[t]; if (fn && !fn(r)) return false;
    }
    for (const tag of q.hashTokens) {
      const dispFn = HASH_DISPOSITION[tag];
      if (dispFn) { if (!dispFn(r)) return false; }
      else         { if (!r.tags.map(t => t.toLowerCase()).includes(tag)) return false; }
    }
    const hay = [r.id, r.title, r.summary, r.kind, r.priority, r.status, r.owner, ...r.tags].join(' ').toLowerCase();
    for (const p of q.phrases) { if (!hay.includes(p)) return false; }
    const active = q.orGroups.filter(g => g.length > 0);
    if (active.length > 0 && !active.some(terms => terms.every(t => matchTerm(hay, t)))) return false;
    return true;
  });
}

// ── Highlight ────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function highlight(text, q) {
  if (!text) return '';
  let s = esc(text);
  const terms = new Set([...q.phrases, ...q.orGroups.flat().map(t => t.endsWith('*') ? t.slice(0,-1) : t).filter(t => t.length >= 2)]);
  for (const p of terms) {
    try { s = s.replace(new RegExp(p.replace(/[.*+?^$\{}()|[\]\\]/g,'\\\\$&'),'gi'), '<mark>$&</mark>'); } catch {}
  }
  return s;
}

// ── Sort ─────────────────────────────────────────────────────────────────────
const PRI_ORD = { critical:0, high:1, medium:2, low:3 };
let sortKey = 'id', sortDesc = false;
function sortReqs(reqs) {
  return [...reqs].sort((a, b) => {
    let v;
    if (sortKey === 'kind')       v = a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id);
    else if (sortKey === 'priority') v = ((PRI_ORD[a.priority] ?? 9) - (PRI_ORD[b.priority] ?? 9)) || a.id.localeCompare(b.id);
    else if (sortKey === 'tests') v = a.testCount - b.testCount;
    else                          v = a.id.localeCompare(b.id);
    return sortDesc ? -v : v;
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
const KIND_TIP = {
  FR:   'Functional Requirement — a feature or behaviour the system must exhibit.',
  NFR:  'Non-Functional Requirement — performance, reliability, or quality attribute.',
  SEC:  'Security Requirement — access control, data protection, or threat mitigation.',
  BR:   'Business Rule — a domain constraint or policy shaping feature behaviour.',
  META: 'Meta requirement — tooling, process, or infrastructure; not product behaviour.',
  A11Y: 'Accessibility Requirement — WCAG conformance, screen reader, or motion behaviour.',
};
const PRI_TIP = {
  critical: 'Critical — must be addressed before release; blocks or risks production safety.',
  high:     'High — important; resolve in the current or next sprint.',
  medium:   'Medium — planned; address within the current milestone.',
  low:      'Low — nice-to-have; track but defer if needed.',
};

function kindBadge(kind) {
  if (!kind) return '';
  const tip = KIND_TIP[kind] ?? kind;
  return `<span class="kind-badge kind-${esc(kind.toLowerCase())}" data-tip="${esc(tip)}">${esc(kind)}</span>`;
}
function priBadge(p) {
  if (!p) return '';
  const tip = PRI_TIP[p] ?? p;
  return `<span class="pri pri-${esc(p)}" data-tip="${esc(tip)}">${esc(p)}</span>`;
}
function testsBadge(n) {
  if (n === 0) return '<span class="tests-badge tests-none">—</span>';
  return `<span class="tests-badge ${n >= 10 ? 'tests-many' : 'tests-some'}">${n}</span>`;
}

function renderRow(r, q) {
  const dep = r.status === 'deprecated';
  const unt = r.testCount === 0 && !dep;
  const cls = dep ? 'deprecated' : unt ? 'untested' : '';

  const summary = r.summary ? r.summary.slice(0, 140) + (r.summary.length > 140 ? '…' : '') : '';
  const titleCell = `<div class="title-text">${highlight(r.title, q)}${dep ? '<span class="dep-tag">deprecated</span>' : ''}</div>`
    + (summary ? `<div class="summary-text">${highlight(summary, q)}</div>` : '');

  const hasTests = r.tests.length > 0;
  const expandId = `tx-${r.id.replace(/[^a-zA-Z0-9]/g, '-')}`;

  const countCell = hasTests
    ? `<button class="tests-badge ${r.testCount >= 10 ? 'tests-many' : 'tests-some'} tests-toggle"
         aria-expanded="false" aria-controls="${expandId}" data-expand="${expandId}"
         data-tip="Click to expand ${r.testCount} linked test${r.testCount !== 1 ? 's' : ''}">${r.testCount}</button>`
    : '<span class="tests-badge tests-none" data-tip="No tests reference this requirement ID yet.">—</span>';

  const mainRow = `<tr class="${cls}">
    <td style="font-family:'SF Mono',Consolas,monospace;font-size:.79rem;white-space:nowrap">${highlight(r.id, q)}</td>
    <td>${kindBadge(r.kind)}</td>
    <td>${priBadge(r.priority)}</td>
    <td>${titleCell}</td>
    <td class="n">${countCell}</td>
  </tr>`;

  if (!hasTests) return mainRow;

  const listItems = r.tests.map(t =>
    `<li><span class="test-layer test-layer-${esc(t.layer)}">${esc(t.layer)}</span><span class="test-file">${esc(t.file)}:${t.line}</span><span class="test-desc">${esc(t.description)}</span></li>`
  ).join('');

  return mainRow + `<tr class="tests-expand-row ${cls}" id="${expandId}" hidden>
    <td colspan="5" class="tests-expand-cell"><ul class="test-list">${listItems}</ul></td>
  </tr>`;
}

let currentReqs = REQS;
let currentQ    = parseQuery('');

function render() {
  const sorted = sortReqs(currentReqs);
  document.getElementById('reqs-body').innerHTML = sorted.map(r => renderRow(r, currentQ)).join('');
  document.getElementById('result-count').textContent =
    `Showing ${currentReqs.length} of ${REQS.length} requirements`;
  document.getElementById('no-results').hidden = currentReqs.length > 0;
  document.getElementById('reqs-table').hidden  = currentReqs.length === 0;
}

// ── State ────────────────────────────────────────────────────────────────────
let atFilter   = '';
let kindFilter = '';
let priFilter  = '';

function applyAll() {
  const raw  = document.getElementById('search-input').value;
  const combined = [atFilter, kindFilter && ('@' + kindFilter.toLowerCase()), priFilter && ('@' + priFilter.toLowerCase()), raw].filter(Boolean).join(' ');
  currentQ    = parseQuery(combined);
  currentReqs = filterReqs(REQS, currentQ);
  render();
  updateClearBtn();
  updateHash();
}

// ── Quick filter pills ───────────────────────────────────────────────────────
function initPillGroup(groupId, dataAttr, stateSetFn) {
  document.getElementById(groupId).querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset[dataAttr] ?? '';
      stateSetFn(val);
      document.getElementById(groupId).querySelectorAll('.pill').forEach(b =>
        b.classList.toggle('active', (b.dataset[dataAttr] ?? '') === val));
      applyAll();
    });
  });
}
initPillGroup('coverage-pills', 'at',   v => { atFilter  = v; });
initPillGroup('kind-pills',     'kind', v => { kindFilter = v; });
initPillGroup('priority-pills', 'pri',  v => { priFilter  = v; });

// ── Sort buttons ─────────────────────────────────────────────────────────────
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.sort;
    if (key === sortKey) { sortDesc = !sortDesc; } else { sortKey = key; sortDesc = key === 'tests-desc'; }
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === key));
    render();
  });
});

// ── Column header sort ────────────────────────────────────────────────────────
document.querySelectorAll('th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    const key = col === 'tests' ? 'tests' : col;
    if (key === sortKey) { sortDesc = !sortDesc; } else { sortKey = key; sortDesc = false; }
    document.querySelectorAll('th').forEach(h => { h.classList.remove('sorted-asc','sorted-desc'); });
    th.classList.add(sortDesc ? 'sorted-desc' : 'sorted-asc');
    render();
  });
});

// ── Search input ─────────────────────────────────────────────────────────────
let debounce;
const inp = document.getElementById('search-input');
inp.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(applyAll, 120); updateSuggestions(); });
inp.addEventListener('keydown', handleSuggKey);
inp.addEventListener('focus', updateSuggestions);
inp.addEventListener('blur', () => setTimeout(hideSugg, 160));

document.getElementById('search-clear').addEventListener('click', () => {
  inp.value = ''; hideSugg(); applyAll();
});

function updateClearBtn() {
  document.getElementById('search-clear').classList.toggle('visible', inp.value.length > 0);
}

// ── URL hash persistence ──────────────────────────────────────────────────────
function updateHash() {
  const q = inp.value.trim();
  history.replaceState(null, '', q ? '#' + encodeURIComponent(q) : location.pathname + location.search);
}
if (location.hash) {
  try { inp.value = decodeURIComponent(location.hash.slice(1)); } catch {}
}

// ── Autocomplete ─────────────────────────────────────────────────────────────
const AT_SUGGESTIONS = [
  { token: '@tested',     desc: 'has ≥ 1 test' },
  { token: '@untested',   desc: 'no tests found' },
  { token: '@covered',    desc: 'alias for @tested' },
  { token: '@uncovered',  desc: 'alias for @untested' },
  { token: '@deprecated', desc: 'status = deprecated' },
  { token: '@active',     desc: 'status = active' },
  { token: '@proposed',   desc: 'status = proposed' },
  { token: '@fr',         desc: 'kind = FR (functional)' },
  { token: '@nfr',        desc: 'kind = NFR (non-functional)' },
  { token: '@meta',       desc: 'kind = META' },
  { token: '@sec',        desc: 'kind = SEC (security)' },
  { token: '@br',         desc: 'kind = BR (business)' },
  { token: '@critical',   desc: 'priority = critical' },
  { token: '@high',       desc: 'priority = high' },
  { token: '@medium',     desc: 'priority = medium' },
  { token: '@low',        desc: 'priority = low' },
];
const DISP_SUGGESTIONS = [
  { token: '#covered',    desc: 'disposition: has ≥ 1 test' },
  { token: '#untested',   desc: 'disposition: no tests yet' },
  { token: '#shipped',    desc: 'active + no tests' },
  { token: '#backlog',    desc: 'proposed status' },
  { token: '#review',     desc: 'alias for #backlog' },
  { token: '#deprecated', desc: 'deprecated status' },
];
const TAG_SUGGESTIONS = ALL_TAGS.map(t => ({ token: '#' + t, desc: 'tag filter' }));

const suggEl = document.getElementById('suggestions');
let suggItems = [], suggIdx = -1;

function getCurrentToken() {
  const val = inp.value, pos = inp.selectionStart ?? val.length;
  const before = val.slice(0, pos);
  const m = before.match(/[@#][a-z0-9_-]*$/i);
  return m ? m[0] : null;
}

function updateSuggestions() {
  const tok = getCurrentToken();
  if (!tok) { hideSugg(); return; }
  const lower = tok.toLowerCase();
  let pool;
  if (lower.startsWith('@')) {
    pool = AT_SUGGESTIONS.filter(s => s.token.startsWith(lower));
  } else if (lower.startsWith('#')) {
    pool = [...DISP_SUGGESTIONS, ...TAG_SUGGESTIONS].filter(s => s.token.startsWith(lower));
  } else { hideSugg(); return; }
  if (!pool.length) { hideSugg(); return; }
  suggItems = pool;
  suggIdx = -1;

  // group @ vs #
  const grouped = { at: pool.filter(s => s.token[0] === '@'), hash: pool.filter(s => s.token[0] === '#') };
  let html = '';
  if (grouped.at.length) {
    html += grouped.at.map((s, i) =>
      `<div class="sugg-item" data-idx="${i}" role="option">${renderSuggItem(s)}</div>`).join('');
  }
  if (grouped.hash.length) {
    const offset = grouped.at.length;
    html += '<div class="sugg-group-title"># disposition / tag</div>';
    html += grouped.hash.map((s, i) =>
      `<div class="sugg-item" data-idx="${offset + i}" role="option">${renderSuggItem(s)}</div>`).join('');
  }
  suggEl.innerHTML = html;
  suggEl.querySelectorAll('.sugg-item').forEach((el, i) => {
    el.addEventListener('mousedown', e => { e.preventDefault(); applySugg(pool[i]); });
  });
  suggEl.hidden = false;
}

function renderSuggItem(s) {
  return `<span class="sugg-token">${s.token}</span><span class="sugg-desc">${s.desc}</span>`;
}

function handleSuggKey(e) {
  if (suggEl.hidden) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); moveSugg(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveSugg(-1); }
  else if (e.key === 'Enter' && suggIdx >= 0) { e.preventDefault(); applySugg(suggItems[suggIdx]); }
  else if (e.key === 'Escape') { hideSugg(); }
  else if (e.key === 'Tab' && suggIdx >= 0) { e.preventDefault(); applySugg(suggItems[suggIdx]); }
}

function moveSugg(dir) {
  const items = suggEl.querySelectorAll('.sugg-item');
  if (!items.length) return;
  items[suggIdx]?.classList.remove('active');
  suggIdx = (suggIdx + dir + items.length) % items.length;
  items[suggIdx].classList.add('active');
  items[suggIdx].scrollIntoView({ block: 'nearest' });
}

function applySugg(s) {
  const val = inp.value, pos = inp.selectionStart ?? val.length;
  const before = val.slice(0, pos), after = val.slice(pos);
  const newBefore = before.replace(/[@#][a-z0-9_-]*$/i, s.token);
  inp.value = newBefore + (after.startsWith(' ') ? '' : ' ') + after.trimStart();
  const cursor = newBefore.length + 1;
  inp.setSelectionRange(cursor, cursor);
  hideSugg();
  clearTimeout(debounce);
  applyAll();
  inp.focus();
}

function hideSugg() { suggEl.hidden = true; suggIdx = -1; }

// ── Tooltip Atom — single fixed element, positioned from [data-tip] ──────────
(function () {
  const tt = document.createElement('div');
  tt.id = 'tt';
  tt.setAttribute('role', 'tooltip');
  tt.setAttribute('hidden', '');
  document.body.appendChild(tt);

  let pending = null;

  function show(el) {
    tt.textContent = el.dataset.tip;
    tt.removeAttribute('hidden');
    const r  = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    // Position above when in lower half of viewport, below otherwise.
    const above = r.top > window.innerHeight * 0.55;
    tt.style.left   = Math.max(8, Math.min(cx, window.innerWidth - 8)) + 'px';
    if (above) { tt.style.top = ''; tt.style.bottom = (window.innerHeight - r.top + 8) + 'px'; }
    else        { tt.style.bottom = ''; tt.style.top = (r.bottom + 8) + 'px'; }
    tt.style.opacity = '1';
  }
  function hide() {
    clearTimeout(pending);
    tt.setAttribute('hidden', '');
    tt.style.opacity = '0';
  }

  document.addEventListener('mouseover', function (e) {
    const el = e.target.closest('[data-tip]');
    clearTimeout(pending);
    if (el) pending = setTimeout(() => show(el), 55);
    else     hide();
  });
  document.addEventListener('scroll',  hide, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
})();

// ── Test row toggle (delegated — survives re-renders) ────────────────────────
document.getElementById('reqs-body').addEventListener('click', function (e) {
  const btn = e.target.closest('[data-expand]');
  if (!btn) return;
  const expandRow = document.getElementById(btn.dataset.expand);
  if (!expandRow) return;
  const nowOpen = expandRow.hidden;
  expandRow.hidden = !nowOpen;
  btn.setAttribute('aria-expanded', String(nowOpen));
});

// ── Release checklist export ─────────────────────────────────────────────────
function buildReleaseMarkdown() {
  const rows = REQS
    .filter(r => r.kind === 'FR' && r.hasE2e && r.status !== 'deprecated')
    .sort((a, b) => a.id.localeCompare(b.id));
  const lines = [
    '## Verified in Playwright (traceability)',
    '',
    '| Requirement | Title | E2E tests |',
    '|---|---|---|',
    ...rows.map(r => {
      const e2eCount = r.tests.filter(t => t.layer === 'e2e').length;
      return `| ${r.id} | ${r.title.replace(/\\|/g, '\\\\|')} | ${e2eCount} |`;
    }),
    '',
    `_Generated from dist/trace-report · ${rows.length} FR requirement(s) with e2e coverage_`,
  ];
  return lines.join('\\n');
}

document.getElementById('release-export')?.addEventListener('click', async function () {
  const text = buildReleaseMarkdown();
  const hint = document.getElementById('release-export-hint');
  try {
    await navigator.clipboard.writeText(text);
    this.classList.add('copied');
    this.textContent = 'Copied!';
    if (hint) hint.textContent = `${REQS.filter(r => r.kind === 'FR' && r.hasE2e).length} FR rows copied`;
    setTimeout(() => {
      this.classList.remove('copied');
      this.textContent = 'Copy release checklist (FR + e2e)';
      if (hint) hint.textContent = '';
    }, 2500);
  } catch {
    if (hint) hint.textContent = 'Copy failed — select text from the browser console DATA export instead.';
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
applyAll();

})();
