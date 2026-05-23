/** Mappy / Underwood design tokens — parity with apps/mappy/scripts/generate-trace-report.mjs */
export const MAPPY_REPORT_CSS = `
:root {
  --bg-deep:      #110d08;
  --bg-panel:     #1a1610;
  --bg-panel2:    #201a13;
  --border:       #3a342c;
  --border-mid:   color-mix(in srgb,#3a342c 60%,#ceb26f 40%);
  --text:         #e8eef7;
  --muted:        #98a7bd;
  --accent:       #ceb26f;
  --success:      #5ecf8e;
  --warn:         #e8a045;
  --danger:       #f87171;
  --dot-color:    rgba(206,178,111,0.07);
  --dot-size:     18px;
  --radius:       8px;
  --radius-sm:    5px;
  --ease:         cubic-bezier(0.22,1,0.36,1);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scrollbar-color:color-mix(in srgb,#3a342c 78%,#ceb26f 22%) #110d08;scrollbar-width:thin}
body{
  background:var(--bg-deep);color:var(--text);
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,Ubuntu,Cantarell,'Noto Sans',sans-serif;
  font-size:14px;line-height:1.6;
  background-image:radial-gradient(var(--dot-color) 1px,transparent 1px);
  background-size:var(--dot-size) var(--dot-size);
  min-height:100dvh;
}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
mark{background:rgba(206,178,111,0.28);color:inherit;border-radius:2px;padding:0 1px}
header{
  background:color-mix(in srgb,var(--bg-panel) 82%,transparent);
  backdrop-filter:blur(14px);border-bottom:1px solid var(--border);
  padding:1.25rem 2rem;display:flex;align-items:center;gap:1.5rem;
  position:sticky;top:0;z-index:100;
}
.header-brand{display:flex;align-items:center;gap:.75rem;flex:1;min-width:0}
.header-icon{font-size:1.6rem;line-height:1;flex-shrink:0;opacity:.9}
.header-title{font-size:1.35rem;font-weight:700;color:var(--accent);white-space:nowrap}
.header-meta{font-size:.75rem;color:var(--muted);margin-top:.05rem}
.cov-ring-wrap{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:.1rem}
.cov-ring-label{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
main{max-width:1280px;margin:0 auto;padding:1.5rem 2rem 4rem;display:flex;flex-direction:column;gap:1.5rem}
.section{
  background:color-mix(in srgb,var(--bg-panel) 76%,transparent);
  border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem 1.5rem;
}
.section-title{font-size:.9rem;font-weight:600;display:flex;align-items:center;gap:.5rem;margin-bottom:1rem}
.section-title.err{color:var(--danger)}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.75rem}
.stat{background:var(--bg-panel2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.9rem 1rem}
.stat-value{display:block;font-size:1.8rem;font-weight:700;line-height:1}
.stat-label{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:.2rem;display:block}
.ok{color:var(--success)}.warn{color:var(--warn)}.err{color:var(--danger)}
.table-wrap{overflow-x:auto;margin-top:.5rem}
table{width:100%;border-collapse:collapse;font-size:.84rem}
th{text-align:left;padding:.45rem .75rem;font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap;cursor:pointer;user-select:none}
th:hover{color:var(--text)}
td{padding:.45rem .75rem;border-bottom:1px solid color-mix(in srgb,var(--border) 50%,transparent);vertical-align:top}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(206,178,111,.035)}
tr.untested td{background:rgba(248,113,113,.03)}
tr.deprecated{opacity:.38}
.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.kind-badge{display:inline-block;padding:.1em .42em;border-radius:3px;font-size:.7rem;font-weight:700;color:#0a0a0a;letter-spacing:.04em;white-space:nowrap}
.kind-fr{background:#5ecf8e}.kind-nfr{background:#fb923c}.kind-sec{background:#f87171}
.kind-br{background:#818cf8}.kind-meta{background:#94a3b8}.kind-a11y{background:#67e8f9}.kind-unknown{background:#475569;color:#e2e8f0}
.pri{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.pri-critical{color:#f87171}.pri-high{color:#fb923c}.pri-medium{color:#fbbf24}.pri-low{color:#98a7bd}
.tests-badge{display:inline-block;min-width:1.8em;text-align:center;padding:.1em .45em;border-radius:999px;font-size:.75rem;font-weight:700}
.tests-none{background:var(--bg-panel2);color:var(--muted)}
.tests-some{background:rgba(94,207,142,.18);color:#34d399}
.tests-many{background:rgba(94,207,142,.3);color:#34d399}
.tests-toggle{border:none;cursor:pointer;outline:2px solid transparent;outline-offset:2px;transition:opacity 120ms,outline-color 120ms}
.tests-toggle:hover{opacity:.72}
.tests-toggle[aria-expanded="true"]{outline-color:color-mix(in srgb,var(--accent) 45%,transparent)}
.tests-expand-row>td{border-top:none;padding:0}
.tests-expand-cell{padding:.2rem .75rem .7rem 2.25rem !important}
.test-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.28rem;padding-left:.5rem;border-left:2px solid color-mix(in srgb,var(--border) 60%,var(--accent) 40%)}
.test-list li{font-size:.76rem}
.test-file{font-family:'SF Mono',Consolas,monospace;font-size:.72rem;color:var(--muted);margin-right:.4rem}
.test-desc{color:var(--text)}
.test-layer{display:inline-block;font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.05em .35em;border-radius:3px;margin-right:.35rem;vertical-align:middle}
.test-layer-e2e{background:rgba(147,197,253,.15);color:#93c5fd}
.test-layer-unit{background:rgba(152,167,189,.12);color:var(--muted)}
.search-wrap{position:relative}
.search-bar{display:flex;align-items:center;gap:.5rem;background:color-mix(in srgb,var(--bg-panel) 82%,transparent);border:1px solid var(--border);border-radius:var(--radius);padding:.55rem .9rem;backdrop-filter:blur(20px);transition:border-color 160ms var(--ease)}
.search-bar:focus-within{border-color:var(--accent)}
.search-icon{color:var(--muted);flex-shrink:0;font-size:1rem;line-height:1}
#search-input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:.9rem;font-family:inherit;caret-color:var(--accent);min-width:0}
#search-input::placeholder{color:var(--muted)}
.search-clear{background:none;border:none;color:var(--muted);cursor:pointer;padding:.15rem .3rem;border-radius:3px;font-size:.9rem;line-height:1;display:none}
.search-clear.visible{display:block}
.filter-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-top:.6rem}
.filter-group{display:flex;gap:.3rem;flex-wrap:wrap}
.filter-sep{width:1px;height:1.2em;background:var(--border);align-self:center;flex-shrink:0}
.pill{background:var(--bg-panel2);border:1px solid var(--border);color:var(--muted);font-size:.74rem;font-weight:500;padding:.2em .65em;border-radius:999px;cursor:pointer;transition:border-color 120ms,color 120ms,background 120ms;white-space:nowrap}
.pill:hover{border-color:color-mix(in srgb,var(--border) 40%,var(--accent) 60%);color:var(--text)}
.pill.active{border-color:var(--accent);color:var(--accent);background:rgba(206,178,111,.1)}
.controls-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-top:.75rem}
.result-count{font-size:.78rem;color:var(--muted)}
.sort-row{display:flex;gap:.3rem;align-items:center}
.sort-label{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-right:.15rem}
.sort-btn{background:none;border:1px solid var(--border);color:var(--muted);font-size:.72rem;padding:.18em .55em;border-radius:3px;cursor:pointer;transition:border-color 100ms,color 100ms}
.sort-btn:hover{border-color:var(--accent);color:var(--text)}
.sort-btn.active{border-color:var(--accent);color:var(--accent)}
.no-results{text-align:center;padding:3rem 1rem;color:var(--muted)}
.no-results strong{display:block;font-size:1rem;margin-bottom:.3rem;color:var(--text)}
.help-details{margin-top:.4rem}
.help-details>summary{font-size:.75rem;color:var(--muted);cursor:pointer;user-select:none;list-style:none;display:inline-flex;align-items:center;gap:.3em}
.help-details>summary::before{content:'▸';font-size:.7em;transition:transform 120ms}
.help-details[open]>summary::before{transform:rotate(90deg)}
.help-content{margin-top:.6rem;padding:.85rem 1rem;background:var(--bg-panel2);border:1px solid var(--border);border-radius:var(--radius-sm);display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}
.help-section h4{font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:.35rem}
.help-section table{font-size:.78rem}
.help-section td{padding:.12rem .3rem;border:none;vertical-align:top}
.help-section td:first-child{font-family:'SF Mono',Consolas,monospace;color:var(--accent);white-space:nowrap;padding-right:.5rem}
.unknown-section{border-color:rgba(248,113,113,.3)}
.unknown-id{font-family:'SF Mono',Consolas,monospace;color:var(--danger);font-size:.82rem}
.finding-pill{display:inline-block;padding:.1em .45em;border-radius:999px;font-size:.72rem;font-weight:600;text-transform:uppercase}
.finding-pill--error{background:rgba(248,113,113,.18);color:#fca5a5}
.finding-pill--warning{background:rgba(232,160,69,.18);color:#fcd34d}
footer{padding:1rem 2rem;color:var(--muted);border-top:1px solid var(--border);font-size:.85rem;text-align:center}
#tt{position:fixed;z-index:9999;pointer-events:none;background:color-mix(in srgb,var(--bg-panel2) 93%,var(--accent) 7%);border:1px solid var(--border-mid);color:var(--text);font-size:.73rem;line-height:1.5;padding:.4rem .65rem;border-radius:var(--radius-sm);max-width:260px;box-shadow:0 4px 20px rgba(0,0,0,.55);transform:translateX(-50%);white-space:normal;text-align:left}
#tt[hidden]{display:none}
[data-tip]{position:relative}
.title-text{font-weight:500}
.summary-text{font-size:.78rem;color:var(--muted);margin-top:.15rem;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dep-tag{font-size:.65rem;color:var(--muted);border:1px solid var(--border);border-radius:3px;padding:.04em .32em;vertical-align:middle;margin-left:.35em}
@media(max-width:700px){header{padding:1rem;gap:1rem;flex-wrap:wrap}main{padding:1rem 1rem 3rem}.stats-grid{grid-template-columns:repeat(3,1fr)}.test-file{display:none}}
`;
