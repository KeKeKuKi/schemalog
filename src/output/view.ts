import { TableDef } from "../parser";
import { Relation, inferRelations } from "../relation";

export function generateSchemaView(
  tables: TableDef[],
  title: string,
  subtitle?: string
): string {
  const relations = inferRelations(tables);

  // Build lookup maps
  const tableMap = new Map(tables.map((t) => [t.name, t]));
  const relsByTable = new Map<string, { from: Relation[]; to: Relation[] }>();
  for (const t of tables) {
    relsByTable.set(t.name, { from: [], to: [] });
  }
  for (const r of relations) {
    relsByTable.get(r.from.table)?.from.push(r);
    relsByTable.get(r.to.table)?.to.push(r);
  }

  const data = JSON.stringify({
    tables,
    relations,
    title,
    subtitle: subtitle || `${tables.length} tables · ${relations.length} relationships`,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeAttr(title)} — Schema View</title>
<style>
  :root {
    --bg: #080b12;
    --surface: #111620;
    --surface2: #1a2030;
    --border: #1e293b;
    --text: #e6edf3;
    --text2: #8b949e;
    --text3: #484f58;
    --accent: #58a6ff;
    --accent2: #79c0ff;
    --accent-bg: rgba(88,166,255,0.1);
    --green: #3fb950;
    --yellow: #d29922;
    --red: #f85149;
    --purple: #a371f7;
    --type-bg: #1c2536;
    --type-text: #8b949e;
    --radius: 8px;
    --radius-sm: 4px;
    --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    --mono: 'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font); background: var(--bg); color: var(--text);
    height: 100vh; display: flex; overflow: hidden; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* ====== SIDEBAR ====== */
  aside {
    width: 300px; min-width: 300px; background: var(--surface);
    border-right: 1px solid var(--border); display: flex; flex-direction: column;
    height: 100vh; z-index: 10;
  }
  .sb-header {
    padding: 20px 20px 12px; border-bottom: 1px solid var(--border);
  }
  .sb-header h2 { font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
  .sb-header .sub { font-size: 11px; color: var(--text3); margin-top: 2px; }
  .search-wrap { padding: 8px 16px 12px; }
  .search-wrap input {
    width: 100%; padding: 8px 12px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    color: var(--text); font-size: 13px; outline: none;
    transition: border-color .2s;
  }
  .search-wrap input:focus { border-color: var(--accent); }
  .search-wrap input::placeholder { color: var(--text3); }

  .table-list { flex: 1; overflow-y: auto; padding: 4px 12px; }
  .table-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border-radius: var(--radius-sm); cursor: pointer; font-size: 13px;
    font-weight: 500; color: var(--text2); transition: all .12s;
    margin-bottom: 1px; position: relative;
  }
  .table-item:hover { background: var(--surface2); color: var(--text); }
  .table-item.active { background: var(--accent-bg); color: var(--accent2); }
  .table-item .icon { font-size: 15px; width: 18px; text-align: center; flex-shrink: 0; opacity: .7; }
  .table-item.active .icon { opacity: 1; }
  .table-item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .table-item .badge {
    font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 600;
    background: var(--surface2); color: var(--text3);
    flex-shrink: 0;
  }
  .table-item.active .badge { background: rgba(88,166,255,0.2); color: var(--accent2); }
  .table-item .rel-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
    flex-shrink: 0; opacity: 0; transition: opacity .2s;
  }
  .table-item.has-rels .rel-dot { opacity: .6; }
  .table-item.active.has-rels .rel-dot { opacity: 1; }
  .sb-footer {
    padding: 10px 20px; border-top: 1px solid var(--border);
    font-size: 11px; color: var(--text3);
    display: flex; justify-content: space-between;
  }

  /* ====== MAIN ====== */
  main { flex: 1; overflow-y: auto; height: 100vh; display: flex; flex-direction: column; }
  .main-inner { padding: 28px 36px; flex: 1; }

  /* Graph */
  .graph-section { padding: 20px 36px 16px; border-bottom: 1px solid var(--border); }
  .graph-section .section-label {
    font-size: 11px; text-transform: uppercase; letter-spacing: .05em;
    color: var(--text3); font-weight: 600; margin-bottom: 10px;
    display: flex; align-items: center; gap: 8px;
  }
  .graph-canvas-wrap {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    overflow: hidden;
  }
  svg#rel-graph { display: block; width: 100%; }
  svg#rel-graph .node-rect { fill: var(--surface2); stroke: var(--border); stroke-width: 1; rx: 4; }
  svg#rel-graph .node-rect.active { stroke: var(--accent); stroke-width: 1.5; }
  svg#rel-graph .node-rect.highlight { fill: var(--accent-bg); }
  svg#rel-graph .node-text { fill: var(--text2); font-size: 11px; font-family: var(--mono); pointer-events: none; }
  svg#rel-graph .node-text.active { fill: var(--accent2); }
  svg#rel-graph .edge { stroke: var(--border); stroke-width: 1; fill: none; }
  svg#rel-graph .edge.highlight { stroke: var(--accent); stroke-width: 1.5; opacity: .7; }
  svg#rel-graph .edge-marker { fill: var(--border); }

  /* Empty state */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; color: var(--text3); text-align: center; padding: 40px;
  }
  .empty-state .icon-lg { font-size: 56px; margin-bottom: 20px; opacity: .5; }
  .empty-state h3 { font-size: 18px; color: var(--text2); margin-bottom: 8px; font-weight: 600; }
  .empty-state p { font-size: 13px; max-width: 320px; }

  /* Table detail header */
  .detail-header { margin-bottom: 20px; }
  .detail-header h1 {
    font-size: 22px; font-weight: 700; letter-spacing: -.01em;
    font-family: var(--mono); display: flex; align-items: center; gap: 10px;
  }
  .detail-header h1 .copy-btn {
    font-size: 13px; padding: 3px 8px; background: var(--surface2); border: 1px solid var(--border);
    color: var(--text2); border-radius: var(--radius-sm); cursor: pointer;
    font-family: var(--font); font-weight: 500; transition: all .15s;
  }
  .detail-header h1 .copy-btn:hover { border-color: var(--accent); color: var(--accent2); }
  .header-meta { font-size: 13px; color: var(--text2); margin-top: 4px; display: flex; gap: 16px; flex-wrap: wrap; }

  /* Stat cards */
  .stat-row { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat {
    padding: 12px 16px; background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); min-width: 80px;
  }
  .stat .num { font-size: 22px; font-weight: 700; letter-spacing: -.02em; }
  .stat .label { font-size: 11px; color: var(--text3); margin-top: 2px; font-weight: 500; }
  .stat.accent .num { color: var(--accent2); }

  /* Section */
  .section-title {
    font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase;
    letter-spacing: .05em; margin: 24px 0 10px;
    display: flex; align-items: center; gap: 8px;
  }
  .section-title::after {
    content: ""; flex: 1; height: 1px; background: var(--border);
  }

  /* Columns table */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th {
    text-align: left; padding: 8px 12px; font-size: 11px; color: var(--text3);
    font-weight: 500; text-transform: uppercase; letter-spacing: .03em;
    border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--bg);
    white-space: nowrap;
  }
  tbody td {
    padding: 9px 12px; border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  tbody tr { transition: background .1s; }
  tbody tr:hover { background: var(--surface); }
  .col-num { color: var(--text3); font-size: 11px; width: 28px; }
  .col-name-cell {
    font-family: var(--mono); font-weight: 600; color: var(--text);
    white-space: nowrap; cursor: pointer; transition: color .15s;
  }
  .col-name-cell:hover { color: var(--accent2); }
  .col-name-cell .pk-badge {
    display: inline-block; padding: 1px 5px; background: rgba(210,153,34,0.15);
    color: var(--yellow); border-radius: 10px; font-size: 9px; font-weight: 700;
    margin-left: 6px; text-transform: uppercase; letter-spacing: .03em;
    font-family: var(--font);
  }
  .col-name-cell .fk-link {
    display: inline-block; padding: 1px 5px; background: rgba(163,113,247,0.15);
    color: var(--purple); border-radius: 10px; font-size: 9px; font-weight: 600;
    margin-left: 4px; cursor: pointer; font-family: var(--font);
    transition: background .15s;
  }
  .col-name-cell .fk-link:hover { background: rgba(163,113,247,0.3); }
  .type-badge {
    display: inline-block; padding: 2px 8px; background: var(--type-bg);
    color: var(--type-text); border-radius: var(--radius-sm); font-size: 12px;
    font-family: var(--mono); white-space: nowrap;
  }
  .nullable-y { color: var(--text3); }
  .nullable-n { color: var(--yellow); font-weight: 600; }
  .default-val { color: var(--text3); font-size: 12px; font-family: var(--mono); }
  .comment-cell { color: var(--text2); font-size: 12px; max-width: 300px; line-height: 1.5; }

  /* Relations section */
  .rel-section { display: flex; gap: 24px; flex-wrap: wrap; }
  .rel-group { flex: 1; min-width: 220px; }
  .rel-group h4 { font-size: 12px; color: var(--text2); font-weight: 600; margin-bottom: 8px; }
  .rel-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius-sm); font-size: 12px; margin: 0 6px 6px 0;
    cursor: pointer; transition: all .15s; font-family: var(--mono);
    color: var(--text2);
  }
  .rel-chip:hover { border-color: var(--accent); color: var(--accent2); }
  .rel-chip .dir { font-size: 10px; color: var(--text3); }
  .conf-high { border-left: 2px solid var(--green); }
  .conf-medium { border-left: 2px solid var(--yellow); }
  .conf-low { border-left: 2px solid var(--text3); }

  /* SQL block */
  .sql-block {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 16px; font-size: 12px; font-family: var(--mono); color: var(--text2);
    line-height: 1.7; overflow-x: auto; position: relative; white-space: pre;
  }
  .sql-block .copy-sql {
    position: absolute; top: 8px; right: 8px; padding: 4px 10px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm);
    color: var(--text2); cursor: pointer; font-size: 11px; font-family: var(--font);
    transition: all .15s; opacity: 0;
  }
  .sql-block:hover .copy-sql { opacity: 1; }
  .sql-block .copy-sql:hover { border-color: var(--accent); color: var(--accent2); }

  /* Toast */
  .toast {
    position: fixed; bottom: 24px; right: 24px; padding: 10px 18px;
    background: var(--surface2); border: 1px solid var(--accent); border-radius: var(--radius-sm);
    color: var(--accent2); font-size: 13px; font-weight: 500;
    opacity: 0; transform: translateY(10px); transition: all .2s;
    pointer-events: none; z-index: 100;
  }
  .toast.show { opacity: 1; transform: translateY(0); }

  @media (max-width: 768px) {
    aside { width: 240px; min-width: 240px; }
    main { padding: 0; }
    .main-inner { padding: 16px; }
    .graph-section { padding: 12px 16px 8px; }
    .stat-row { gap: 8px; }
    .stat { padding: 8px 12px; min-width: 60px; }
    .stat .num { font-size: 18px; }
    .rel-section { flex-direction: column; gap: 12px; }
  }
</style>
</head>
<body>

<aside>
  <div class="sb-header">
    <h2>${escapeHtml(title)}</h2>
    <div class="sub">${escapeHtml(subtitle || "")}</div>
  </div>
  <div class="search-wrap">
    <input placeholder="Filter tables or columns…" id="search" autofocus>
  </div>
  <div class="table-list" id="table-list"></div>
  <div class="sb-footer">
    <span>${tables.length} tables</span>
    <span>${relations.length} relationships</span>
  </div>
</aside>

<main>
  <div class="graph-section" id="graph-section">
    <div class="section-label">🗺 Table Relationships <span style="font-weight:400;color:var(--text3);font-size:10px">(click a node)</span></div>
    <div class="graph-canvas-wrap" id="graph-wrap"></div>
  </div>
  <div class="main-inner" id="main-inner"></div>
</main>

<div class="toast" id="toast"></div>

<script>
const DATA = ${data};

const state = { activeTable: null, graphNodes: [], graphEdges: [] };

// ====== RENDER ======
function render() {
  renderSidebar();
  renderGraph();
  renderDetail();
}

function renderSidebar() {
  const q = (document.getElementById("search").value || "").toLowerCase();
  const filtered = q
    ? DATA.tables.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.columns.some(c => c.name.toLowerCase().includes(q))
      )
    : DATA.tables;

  const rels = new Map();
  DATA.relations.forEach(r => {
    rels.set(r.from.table, (rels.get(r.from.table) || 0) + 1);
    rels.set(r.to.table, (rels.get(r.to.table) || 0) + 1);
  });

  document.getElementById("table-list").innerHTML = filtered.map(t => {
    const rel = rels.get(t.name) || 0;
    const active = state.activeTable && state.activeTable.name === t.name;
    return \`<div class="table-item\${active ? ' active' : ''}\${rel > 0 ? ' has-rels' : ''}"
      onclick="selectTable('\${escAttr(t.name)}')">
      <span class="icon">\${active ? '📌' : '📦'}</span>
      <span class="name">\${escHtml(t.name)}</span>
      <span class="rel-dot" title="\${rel} relationship(s)"></span>
      <span class="badge">\${t.columns.length}</span>
    </div>\`;
  }).join("");
}

// ====== GRAPH ======
function renderGraph() {
  const wrap = document.getElementById("graph-wrap");
  if (DATA.tables.length === 0) { wrap.innerHTML = ""; return; }

  // Simple grid layout
  const cols = Math.min(6, Math.ceil(Math.sqrt(DATA.tables.length * 2)));
  const rows = Math.ceil(DATA.tables.length / cols);
  const cellW = 160;
  const cellH = 48;
  const padX = 40;
  const padY = 30;
  const gapX = 24;
  const gapY = 20;
  const totalW = cols * cellW + (cols - 1) * gapX + padX * 2;
  const totalH = rows * cellH + (rows - 1) * gapY + padY * 2;

  const nodes = DATA.tables.map((t, i) => ({
    table: t.name,
    col: i % cols,
    row: Math.floor(i / cols),
    x: padX + (i % cols) * (cellW + gapX),
    y: padY + Math.floor(i / cols) * (cellH + gapY),
    w: cellW,
    h: cellH,
  }));

  const nodeMap = new Map(nodes.map(n => [n.table, n]));
  const edges = DATA.relations
    .filter(r => nodeMap.has(r.from.table) && nodeMap.has(r.to.table))
    .map(r => ({
      from: nodeMap.get(r.from.table),
      to: nodeMap.get(r.to.table),
      confidence: r.confidence,
      fromCol: r.from.column,
      toCol: r.to.column,
    }));

  state.graphNodes = nodes;
  state.graphEdges = edges;

  const activeName = state.activeTable ? state.activeTable.name : null;

  // Edge paths
  const edgePaths = edges.map(e => {
    const x1 = e.from.x + e.from.w / 2;
    const y1 = e.from.y + e.from.h;
    const x2 = e.to.x + e.to.w / 2;
    const y2 = e.to.y;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const curve = Math.min(Math.abs(y2 - y1) * 0.4, 40);
    const d = \`M\${x1},\${y1} C\${x1},\${y1 + curve} \${x2},\${y2 - curve} \${x2},\${y2}\`;
    const highlight = activeName && (e.from.table === activeName || e.to.table === activeName);
    return \`<path class="edge\${highlight ? ' highlight' : ''}" d="\${d}" marker-end="url(#arrow)" />\`;
  }).join("");

  // Node rects
  const nodeRects = nodes.map(n => {
    const active = n.table === activeName;
    const related = activeName && state.graphEdges.some(
      e => (e.from.table === activeName && e.to.table === n.table) ||
           (e.to.table === activeName && e.from.table === n.table)
    );
    return \`<rect class="node-rect\${active ? ' active' : (related ? ' highlight' : '')}"
      x="\${n.x}" y="\${n.y}" width="\${n.w}" height="\${n.h}" rx="4"
      onclick="selectTable('\${escAttr(n.table)}')" style="cursor:pointer" />
    <text class="node-text\${active ? ' active' : ''}"
      x="\${n.x + n.w / 2}" y="\${n.y + n.h / 2}" text-anchor="middle"
      dominant-baseline="central"
      onclick="selectTable('\${escAttr(n.table)}')" style="cursor:pointer;font-size:11px">\${escHtml(n.table)}</text>\`;
  }).join("");

  const renderRels = edges.length > 0;
  wrap.innerHTML = renderRels
    ? \`<svg id="rel-graph" viewBox="0 0 \${totalW} \${totalH}" style="min-height:\${totalH}px">
      <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" class="edge-marker" />
      </marker></defs>
      \${edgePaths}
      \${nodeRects}
    </svg>\`
    : \`<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">No relationships detected</div>\`;
}

// ====== DETAIL ======
function renderDetail() {
  const main = document.getElementById("main-inner");
  const t = state.activeTable;

  if (!t) {
    main.innerHTML = \`<div class="empty-state">
      <div class="icon-lg">🗄️</div>
      <h3>Explore your schema</h3>
      <p>Click a table in the sidebar or graph to see columns, types, defaults, and relationships</p>
    </div>\`;
    return;
  }

  const pkCols = t.primaryKey || [];
  const hasDesc = t.columns.some(c => c.comment);

  // Build FK lookup
  const fkMap = new Map();
  DATA.relations.forEach(r => {
    if (r.from.table === t.name) fkMap.set(r.from.column, r);
    if (r.to.table === t.name && !fkMap.has(r.to.column)) {
      // reversed — other tables referencing us
    }
  });
  const refsFrom = DATA.relations.filter(r => r.from.table === t.name);
  const refsTo = DATA.relations.filter(r => r.to.table === t.name);

  const ddl = t.sql || \`CREATE TABLE \${t.name} (\n\${t.columns.map(c =>
    \`  \${c.name} \${c.type}\${c.nullable ? '' : ' NOT NULL'}\${c.defaultValue !== null && c.defaultValue !== undefined ? ' DEFAULT ' + c.defaultValue : ''}\`
  ).join(',\\n')}\n);\`;

  main.innerHTML = \`
    <div class="detail-header">
      <h1>
        \${escHtml(t.name)}
        <button class="copy-btn" onclick="copyText('\${escAttr(t.name)}')">Copy name</button>
      </h1>
      <div class="header-meta">
        <span>\${t.columns.length} columns</span>
        \${pkCols.length ? \`<span>PK: \${pkCols.map(c => \`<code>\${escHtml(c)}</code>\`).join(", ")}</span>\` : ""}
        \${t.indexes?.length ? \`<span>\${t.indexes.length} indexes</span>\` : ""}
      </div>
    </div>

    <div class="stat-row">
      <div class="stat">
        <div class="num">\${t.columns.length}</div>
        <div class="label">Columns</div>
      </div>
      \${pkCols.length ? \`<div class="stat">
        <div class="num">\${pkCols.length}</div>
        <div class="label">Primary Keys</div>
      </div>\` : ""}
      \${t.indexes?.length ? \`<div class="stat accent">
        <div class="num">\${t.indexes.length}</div>
        <div class="label">Indexes</div>
      </div>\` : ""}
      <div class="stat">
        <div class="num">\${t.columns.filter(c => !c.nullable).length}</div>
        <div class="label">NOT NULL</div>
      </div>
      <div class="stat">
        <div class="num">\${refsFrom.length + refsTo.length}</div>
        <div class="label">Relations</div>
      </div>
    </div>

    \${refsFrom.length + refsTo.length > 0 ? \`
      <div class="section-title">Relationships</div>
      <div class="rel-section">
        \${refsFrom.length ? \`<div class="rel-group">
          <h4>→ References (FK out)</h4>
          \${refsFrom.map(r => \`<span class="rel-chip conf-\${r.confidence}"
            onclick="selectTable('\${escAttr(r.to.table)}')">
            \${escHtml(r.from.column)} <span class="dir">→</span> \${escHtml(r.to.table)}.\${escHtml(r.to.column)}
          </span>\`).join("")}
        </div>\` : ""}
        \${refsTo.length ? \`<div class="rel-group">
          <h4>← Referenced by</h4>
          \${refsTo.map(r => \`<span class="rel-chip conf-\${r.confidence}"
            onclick="selectTable('\${escAttr(r.from.table)}')">
            \${escHtml(r.from.table)}.\${escHtml(r.from.column)} <span class="dir">→</span> \${escHtml(r.to.column)}
          </span>\`).join("")}
        </div>\` : ""}
      </div>
    \` : ""}

    <div class="section-title">Columns</div>
    <table>
      <thead><tr>
        <th>#</th><th>Column</th><th>Type</th><th>Nullable</th><th>Default</th>
        \${hasDesc ? "<th>Description</th>" : ""}
      </tr></thead>
      <tbody>
        \${t.columns.map((c, i) => {
          const fk = fkMap.get(c.name);
          const isPk = pkCols.includes(c.name);
          return \`<tr>
            <td class="col-num">\${i + 1}</td>
            <td>
              <span class="col-name-cell"
                \${fk ? \`onclick="selectTable('\${escAttr(fk.to.table)}')"\` : ""}
                title="\${fk ? 'FK → ' + fk.to.table + '.' + fk.to.column : (isPk ? 'Primary Key' : '')}">
                \${escHtml(c.name)}
                \${isPk ? '<span class="pk-badge">PK</span>' : ""}
                \${fk ? \`<span class="fk-link" onclick="event.stopPropagation();selectTable('\${escAttr(fk.to.table)}')">→ \${escHtml(fk.to.table)}</span>\` : ""}
              </span>
            </td>
            <td><span class="type-badge">\${escHtml(c.type)}</span></td>
            <td><span class="\${c.nullable ? 'nullable-y' : 'nullable-n'}">\${c.nullable ? 'YES' : 'NO'}</span></td>
            <td class="default-val">\${c.defaultValue !== null && c.defaultValue !== undefined ? escHtml(String(c.defaultValue)) : '—'}</td>
            \${hasDesc ? \`<td class="comment-cell">\${c.comment ? escHtml(c.comment) : '—'}</td>\` : ""}
          </tr>\`;
        }).join("")}
      </tbody>
    </table>

    \${t.indexes?.length ? \`
      <div class="section-title">Indexes</div>
      <div class="rel-section">
        \${t.indexes.map(i => \`<span class="rel-chip" style="cursor:default">\${escHtml(i)}</span>\`).join("")}
      </div>
    \` : ""}

    <div class="section-title">DDL</div>
    <div class="sql-block">
      <button class="copy-sql" onclick="copyText(\`\${escAttr(ddl)}\`)">Copy DDL</button>
      \${escHtml(ddl)}
    </div>
  \`;
}

function selectTable(name) {
  state.activeTable = DATA.tables.find(t => t.name === name) || null;
  document.getElementById("search").value = "";
  render();
  document.getElementById("main-inner").scrollIntoView({ behavior: "smooth" });
}

// ====== COPY ======
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied!");
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast("Copied!");
  }
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 1800);
}

// ====== HELPERS ======
function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\\\\/g, "\\\\\\\\");
}

// ====== INIT ======
document.getElementById("search").addEventListener("input", render);
render();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\\/g, "\\\\");
}
