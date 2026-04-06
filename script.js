/* ================================================
DOLAN SAWAH OPS v2 – script.js (FULL FIXED)
PART 1 — CORE + UTILS
================================================ */

/* ================================================
1. SCHEMA VERSION
================================================ */

const APP_VERSION = 2;

(function checkVersion() {
  const saved = parseInt(localStorage.getItem('app_version') || '0', 10);
  if (saved < APP_VERSION) {
    localStorage.setItem('app_version', String(APP_VERSION));
  }
})();

/* ================================================
2. CORE – STORAGE
================================================ */

const K = {
  cats: 'categories',
  mi: 'master_items',
  mm: 'master_menu',
  pr: 'purchase_requests',
  rv: 'purchase_realization',
  sr: 'sales_reports',
  ui: 'unknown_items',
  um: 'unknown_menu',
  sess: 'session_belanja',
  stats: 'usage_stats',
  favs: 'favorites',
  tpl: 'templates'
};

const db = {
  get(k, d = []) {
    try {
      const raw = localStorage.getItem(k);
      const parsed = raw ? JSON.parse(raw) : d;

      if (Array.isArray(d) && !Array.isArray(parsed)) return d;

      return parsed ?? d;
    } catch {
      return d;
    }
  },

  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      if (!window.__trimming) {
        window.__trimming = true;
        trimStorage();
        window.__trimming = false;
      }

      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    }
  }
};

function trimStorage() {
  [K.pr, K.sr, K.rv].forEach(key => {
    const arr = db.get(key, []);
    if (arr.length > 1000) {
      db.set(key, arr.slice(-500));
    }
  });
}

/* ================================================
3. UTILS
================================================ */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function norm(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function yest() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function fmtRp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function fmtDate(d = new Date()) {
  return d.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

function esc(s) {
  const el = document.createElement('div');
  el.textContent = s || '';
  return el.innerHTML;
}

/* ================================================
4. SAFE HELPERS
================================================ */

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function clone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}
/* ================================================
PART 2 — UI + THEME + NAV
================================================ */

/* ===============================
TOAST
=============================== */
function toast(msg, type = 's') {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;

  const colors = {
    s: 'var(--acc)',
    e: 'var(--red)',
    w: 'var(--amber)'
  };

  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderLeft = '3px solid ' + (colors[type] || colors.s);
  el.textContent = msg;

  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

/* ===============================
MODAL
=============================== */
let _modalCb = null;

function openModal(title, msg, onOk) {
  _modalCb = onOk;

  const mov = document.getElementById('mov');
  const mt = document.getElementById('m-t');
  const mm = document.getElementById('m-m');

  if (!mov) return;

  if (mt) mt.textContent = title;
  if (mm) mm.textContent = msg;

  mov.classList.add('open');
  mov.focus();
}

function closeModal() {
  const mov = document.getElementById('mov');
  if (mov) mov.classList.remove('open');
  _modalCb = null;
}

/* ===============================
DARK MODE
=============================== */
function initDark() {
  const btn = document.getElementById('dkbtn');
  const root = document.body;

  function apply(light) {
    if (light) {
      root.setAttribute('data-light', '');
      if (btn) btn.textContent = '☀️';
    } else {
      root.removeAttribute('data-light');
      if (btn) btn.textContent = '🌙';
    }
  }

  const saved = localStorage.getItem('ds_theme');

apply(
  saved
    ? saved === 'light'
    : window.matchMedia('(prefers-color-scheme: light)').matches
);

  if (!btn) return;

  btn.onclick = function () {
    const isLight = root.hasAttribute('data-light');
    localStorage.setItem('ds_theme', isLight ? 'dark' : 'light');
    apply(!isLight);
  };
}

/* ===============================
NAVIGATION
=============================== */
let _activeTab = 'belanja';

function switchTab(name) {
  const tab = document.getElementById('tab-' + name);
  if (!tab) return;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));

  tab.classList.add('active');

  const btn = document.querySelector('.nb[data-tab="' + name + '"]');
  if (btn) btn.classList.add('active');

  _activeTab = name;

  const renders = {
    belanja: renderBelanja,
    validasi: renderValidasi,
    penjualan: renderPenjualan,
    dashboard: renderDashboard,
    admin: renderAdmin
  };

  if (renders[name]) renders[name]();
}

function bindGlobalEvents() {
  document.querySelectorAll('.nb').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  document.getElementById('m-ok')?.addEventListener('click', () => {
    if (_modalCb) _modalCb();
    closeModal();
  });

  document.getElementById('m-cancel')?.addEventListener('click', closeModal);

  document.getElementById('mov')?.addEventListener('click', e => {
    if (e.target.id === 'mov') closeModal();
  });

  /* DASHBOARD FILTER */
  document.querySelectorAll('[data-dash]').forEach(btn => {
    btn.onclick = () => {
      _dashF = btn.dataset.dash;

      document.querySelectorAll('[data-dash]')
        .forEach(b => b.classList.remove('active'));

      btn.classList.add('active');

      renderDashboard();
    };
  });
}

/* ===============================
DEBOUNCE
=============================== */
const _debTimers = {};

function debounce(key, fn, ms = 220) {
  key = key + '_' + _activeTab;
  clearTimeout(_debTimers[key]);
  _debTimers[key] = setTimeout(fn, ms);
}
/* ================================================
PART 3 — CLIPBOARD + STATS + MATCHING
================================================ */

/* ===============================
CLIPBOARD
=============================== */
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => toast('Disalin ke clipboard'))
      .catch(() => {
        fallbackCopy(text);
        toast('Clipboard fallback digunakan', 'w');
      });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();

  try {
    document.execCommand('copy');
    toast('Disalin');
  } catch {
    toast('Gagal copy', 'e');
  }

  document.body.removeChild(ta);
}

/* ===============================
STATS
=============================== */
function trackUsage(type, name) {
  const s = db.get(K.stats, {});
  const key = type + ':' + norm(name);
  s[key] = (s[key] || 0) + 1;
  db.set(K.stats, s);
}

function getTop(type, n = 8) {
  const s = db.get(K.stats, {});
  return Object.entries(s)
    .filter(([k]) => k.startsWith(type + ':'))
    .map(([k, v]) => ({ name: k.slice(type.length + 1), count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function updateFavs() {
  db.set(K.favs, getTop('item', 10).map(t => t.name));
}

/* ===============================
MATCHING
=============================== */
function matchItem(raw) {
  const items = safeArr(db.get(K.mi));
  const q = norm(raw);
  if (!q) return null;

  return items.find(i => norm(i.name) === q)
    || items.find(i => (i.aliases || []).some(a => norm(a) === q))
    || items.find(i => {
  const n = norm(i.name);
  return (n.includes(q) || q.includes(n)) && q.length > 2;
})
    || items.find(i => (i.aliases || []).some(a => norm(a).includes(q)))
    || null;
}

function matchMenu(raw) {
  const menus = safeArr(db.get(K.mm));
  const q = norm(raw);
  if (!q) return null;

  return menus.find(m => norm(m.name) === q)
    || menus.find(m => (m.aliases || []).some(a => norm(a) === q))
    || menus.find(m => norm(m.name).includes(q))
    || menus.find(m => (m.aliases || []).some(a => norm(a).includes(q)))
    || null;
}
/* ================================================
PART 4 — UNIT + PARSER (FIXED)
================================================ */

/* ===============================
UNIT NORMALIZATION
=============================== */

const UNIT_MAP = {
  /* weight → kg */
  kg:       { base: 'kg', factor: 1 },
  kilo:     { base: 'kg', factor: 1 },
  kilogram: { base: 'kg', factor: 1 },
  g:        { base: 'kg', factor: 0.001 },
  gr:       { base: 'kg', factor: 0.001 },
  gram:     { base: 'kg', factor: 0.001 },
  ons:      { base: 'kg', factor: 0.1 },

  /* volume → liter */
  l:        { base: 'l', factor: 1 },
  liter:    { base: 'l', factor: 1 },
  ml:       { base: 'l', factor: 0.001 },

  /* unit */
  pcs:      { base: 'pcs', factor: 1 },
  biji:     { base: 'pcs', factor: 1 },
  buah:     { base: 'pcs', factor: 1 }
};

function normUnit(u) {
  const key = norm(u);
  const info = UNIT_MAP[key];
  return info ? info.base : (key || 'pcs');
}

function toBase(qty, unit) {
  const key = norm(unit);
  const info = UNIT_MAP[key];

  if (!info) {
    return { qty: qty, unit: key || 'pcs' };
  }

  return {
    qty: Math.round(qty * info.factor * 100000) / 100000,
    unit: info.base
  };
}

/* ===============================
MERGE ENGINE (FIXED)
- regenerate ID
- normalize unit
- sort result
=============================== */

function mergeItems(arr) {
  const map = {};

  arr.forEach(it => {
    const conv = toBase(it.qty, it.unit);
    const key = norm(it.matched_name) + '|' + conv.unit;

    if (!map[key]) {
      map[key] = {
        ...it,
        id: uid(),               // FIX: regenerate id
        qty: conv.qty,
        unit: conv.unit,
        original_unit: it.unit   // BONUS: keep original
      };
    } else {
      map[key].qty = Math.round(
        (map[key].qty + conv.qty) * 100000
      ) / 100000;
    }
  });

  return Object.values(map)
    .sort((a, b) => a.matched_name.localeCompare(b.matched_name));
}

/* ===============================
PARSER BELANJA
=============================== */

function parseLine(line) {
  line = (line || '').trim();
  if (!line) return null;

  const match = line.match(/^(.+?)\s+([\d.,]+)\s*([a-zA-Z]*)$/);

  if (!match) {
    return {
      raw: line,
      name: line,
      qty: 1,
      unit: 'pcs',
      err: 'format tidak dikenal'
    };
  }

  const rawQty = parseFloat(
    match[2].replace(',', '.')
  );

  return {
    raw: line,
    name: norm(match[1]),
    qty: isNaN(rawQty) ? 1 : rawQty,
    unit: normUnit(match[3])
  };
}

/* ===============================
PARSER PENJUALAN (FIXED BUG)
=============================== */

function parseSaleLine(line) {
  line = (line || '').trim();
  if (!line) return null;

  const match = line.match(/^(.+?)\s+(\d+)\s+([\d.,]+)$/);

  if (!match) {
    return {
      raw: line,
      err: 'format salah – gunakan: nama qty revenue'
    };
  }

  const qty = parseInt(match[2], 10);

  /* 🔥 FIX UTAMA (BUG BESAR SEBELUMNYA) */
  const revenue = parseFloat(
    match[3]
      .replace(/\./g, '')   // hapus separator ribuan
      .replace(',', '.')    // decimal normalize
  );

  if (isNaN(qty) || isNaN(revenue)) {
    return {
      raw: line,
      err: 'qty atau revenue tidak valid'
    };
  }

  return {
    raw: line,
    name: norm(match[1]),
    qty: qty,
    revenue: revenue
  };
}
/* ================================================
PART 5 — UNKNOWN + BELANJA MODULE
================================================ */

/* ===============================
UNKNOWN HANDLER
=============================== */

function addUnkItem(raw) {
  const u = safeArr(db.get(K.ui));
  if (u.find(x => norm(x.raw_name) === norm(raw))) return;

  u.push({
    id: uid(),
    raw_name: raw,
    date: today()
  });

  db.set(K.ui, u);
}

function addUnkMenu(raw) {
  const u = safeArr(db.get(K.um));
  if (u.find(x => norm(x.raw_name) === norm(raw))) return;

  u.push({
    id: uid(),
    raw_name: raw,
    date: today()
  });

  db.set(K.um, u);
}

/* ===============================
BELANJA STATE
=============================== */

let _sess = [];
let _favOpen = true;

/* ===============================
GROUP BY CATEGORY
=============================== */

function groupByCat(items) {
  const g = {};
  items.forEach(it => {
    const c = it.category || 'Lainnya';
    if (!g[c]) g[c] = [];
    g[c].push(it);
  });
  return g;
}

/* ===============================
PREVIEW (DEBOUNCED)
=============================== */

function previewBelanja(text) {
  const prev = document.getElementById('pp-b');
  if (!prev) return;

  const lines = (text || '').split('\n').filter(l => l.trim());

  if (!lines.length) {
    prev.classList.remove('show');
    return;
  }

  let html = '';

  lines.forEach(line => {
    const p = parseLine(line);
    if (!p) return;

    if (p.err) {
      html += `<div class="ppr" style="color:var(--red)">✕ ${esc(line)}</div>`;
      return;
    }

    const m = matchItem(p.name);

    html += m
      ? `<div class="ppr" style="color:var(--acc)">✓ ${esc(m.name)} <span style="color:var(--text3)">(${esc(m.category)})</span> ${p.qty} ${p.unit}</div>`
      : `<div class="ppr" style="color:var(--amber)">? ${esc(p.name)} ${p.qty} ${p.unit}</div>`;
  });

  prev.innerHTML = html;
  prev.classList.add('show');
}

/* ===============================
PROCESS BULK (FIXED)
=============================== */

function processBulk() {
  const ta = document.getElementById('bulk-inp');
  if (!ta) return;

  const lines = ta.value.split('\n').filter(l => l.trim());

  if (!lines.length) {
    toast('Input kosong', 'e');
    return;
  }

  let added = 0;

  lines.forEach(line => {
    const p = parseLine(line);
    if (!p || p.err) return;

    const m = matchItem(p.name);

    _sess.push({
      id: uid(),
      raw_name: p.name,
      matched_name: m ? m.name : p.name,
      category: m ? m.category : 'Lainnya',
      is_unknown: !m,
      qty: p.qty,
      unit: p.unit,
      date: today()
    });

    trackUsage('item', m ? m.name : p.name);
    if (!m) addUnkItem(p.name);

    added++;
  });

  if (!added) {
    toast('Tidak ada item valid', 'w');
    return;
  }

  _sess = mergeItems(_sess);

  db.set(K.sess, _sess);

  ta.value = '';

  const pp = document.getElementById('pp-b');
  if (pp) pp.classList.remove('show');

  updateFavs();
  switchTab('belanja');

  toast(added + ' item ditambahkan');
}

/* ===============================
FAVORITES
=============================== */

function toggleFav() {
  _favOpen = !_favOpen;
  switchTab('belanja');
}

function addFavItem(name) {
  const m = matchItem(name);

  _sess.push({
    id: uid(),
    raw_name: name,
    matched_name: m ? m.name : name,
    category: m ? m.category : 'Lainnya',
    is_unknown: !m,
    qty: 1,
    unit: 'pcs',
    date: today()
  });

  _sess = mergeItems(_sess);
  db.set(K.sess, _sess);

  trackUsage('item', m ? m.name : name);

  renderBelanja();
  toast(name + ' ditambahkan');
}

/* ===============================
DELETE & CLEAR
=============================== */

function delItem(id) {
  _sess = _sess.filter(i => i.id !== id);
  db.set(K.sess, _sess);
  renderBelanja();
}

function clearBelanja() {
  openModal(
    'Kosongkan list?',
    'Semua item belanja akan dihapus.',
    () => {
      _sess = [];
      db.set(K.sess, []);
      renderBelanja();
      toast('List dikosongkan', 'w');
    }
  );
}

/* ===============================
TEMPLATE SYSTEM
=============================== */

function saveTpl() {
  const current = safeArr(db.get(K.sess));

  if (!current.length) {
    toast('Tidak ada data untuk disimpan', 'e');
    return;
  }

  const tpl = safeArr(db.get(K.tpl));

  const ts = new Date().toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  tpl.push({
    id: uid(),
    label: ts,
    items: clone(current)
  });

  if (tpl.length > 7) tpl.shift();

  db.set(K.tpl, tpl);

  toast('Template disimpan');
}

function loadTpl() {
  const tpl = safeArr(db.get(K.tpl));

  if (!tpl.length) {
    toast('Belum ada template', 'w');
    return;
  }

  const last = tpl[tpl.length - 1];

  const text = safeArr(last.items)
    .map(i => `${i.matched_name} ${i.qty} ${i.unit}`)
    .join('\n');

  const ta = document.getElementById('bulk-inp');

  if (ta) {
    ta.value = text;
    previewBelanja(text);
  }

  toast(`Template "${last.label || 'terakhir'}" dimuat`);
}

/* ===============================
COPY WA (IMPROVED)
=============================== */

function copyWA() {
  const current = safeArr(db.get(K.sess));

  if (!current.length) {
    toast('List kosong', 'e');
    return;
  }

  const g = groupByCat(current);

  let text = `🛒 *BELANJA DOLAN SAWAH*\n${fmtDate()}\n\n`;

  Object.entries(g).forEach(([cat, items]) => {
    text += `*[${cat}]*\n`;

    items.forEach(it => {
      text += `• ${it.matched_name} — ${it.qty} ${it.unit}\n`;
    });

    text += '\n';
  });

  const prs = safeArr(db.get(K.pr));

  prs.push({
    id: uid(),
    date: today(),
    items: clone(current)
  });

  if (prs.length > 1000) {
    prs.splice(0, prs.length - 500);
  }

  db.set(K.pr, prs);

  copyText(text);
}

/* ===============================
RENDER BELANJA
=============================== */

function renderBelanja() {
  const dateEl = document.getElementById('b-date');
  if (dateEl) dateEl.textContent = fmtDate();

  _sess = safeArr(db.get(K.sess));

  const wrap = document.getElementById('b-list');
  const act = document.getElementById('b-act');
  const favSec = document.getElementById('fav-sec');
  const favGrid = document.getElementById('fav-grid');
  const togBtn = document.getElementById('toggle-fav');

  if (!wrap || !act) return;

  /* Favorites */
  const favs = safeArr(db.get(K.favs));

  if (favs.length && favSec && favGrid) {
    favSec.style.display = 'block';

    if (togBtn) {
      togBtn.textContent = _favOpen ? 'Sembunyikan' : 'Tampilkan';
    }

    if (_favOpen) {
      favGrid.innerHTML = favs
        .map(f => `<button class="fav-btn" data-fav="${esc(f)}">${esc(f)}</button>`)
        .join('');

      favGrid.querySelectorAll('[data-fav]').forEach(btn => {
        btn.onclick = () => addFavItem(btn.dataset.fav);
      });
    } else {
      favGrid.innerHTML = '';
    }
  } else if (favSec) {
    favSec.style.display = 'none';
  }

  /* Empty */
  if (!_sess.length) {
    wrap.innerHTML = `
      <div class="empty">
        <div class="empty-i">🛒</div>
        <p>Belum ada item. Gunakan input cepat di atas.</p>
      </div>
    `;
    act.style.display = 'none';
    return;
  }

  const g = groupByCat(_sess);

  let html = `<div class="card">`;

  Object.entries(g).forEach(([cat, items]) => {
    html += `
      <div style="padding:6px 8px 4px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text3);font-family:var(--mono)">
        ${esc(cat)}
      </div>
    `;

    items.forEach(it => {
      const unk = it.is_unknown
        ? `<span style="font-size:9px;color:var(--amber);margin-left:4px">●</span>`
        : '';

      html += `
        <div class="ir">
          <div style="flex:1">${esc(it.matched_name)}${unk}</div>
          <span style="font-family:var(--mono);font-size:13px">${it.qty} ${it.unit}</span>
          <button data-del="${it.id}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:2px 6px">✕</button>
        </div>
      `;
    });
  });

  html += `</div>`;

  wrap.innerHTML = html;
  act.style.display = 'block';

  wrap.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => delItem(btn.dataset.del);
  });
}

/* ===============================
BIND BELANJA EVENTS
=============================== */

function bindBelanjaEvents() {
  const inp = document.getElementById('bulk-inp');

  if (inp) {
    inp.addEventListener('input', e => {
      const val = e.target.value;
      debounce('prev-b', () => previewBelanja(val));
    });
  }

  document.getElementById('btn-process-bulk')?.addEventListener('click', processBulk);
  document.getElementById('btn-load-tpl')?.addEventListener('click', loadTpl);
  document.getElementById('btn-save-tpl')?.addEventListener('click', saveTpl);
  document.getElementById('btn-copy-wa')?.addEventListener('click', copyWA);
  document.getElementById('btn-clear-belanja')?.addEventListener('click', clearBelanja);
  document.getElementById('toggle-fav')?.addEventListener('click', toggleFav);
}
/* ================================================
PART 6 — PENJUALAN + DASHBOARD + VALIDASI + ADMIN + INIT
================================================ */

/* ===============================
PENJUALAN
=============================== */

function previewSales(text) {
  const prev = document.getElementById('pp-p');
  if (!prev) return;

  const lines = (text || '').split('\n').filter(l => l.trim());

  if (!lines.length) {
    prev.classList.remove('show');
    return;
  }

  let html = '';

  lines.forEach(line => {
    const p = parseSaleLine(line);
    if (!p) return;

    if (p.err) {
      html += `<div class="ppr" style="color:var(--red)">✕ ${esc(line)} <span style="opacity:.6">(${p.err})</span></div>`;
      return;
    }

    const m = matchMenu(p.name);

    html += m
      ? `<div class="ppr" style="color:var(--acc)">✓ ${esc(m.name)} × ${p.qty} = ${fmtRp(p.revenue)}</div>`
      : `<div class="ppr" style="color:var(--amber)">? ${esc(p.name)} × ${p.qty} = ${fmtRp(p.revenue)}</div>`;
  });

  prev.innerHTML = html;
  prev.classList.add('show');
}

function processSalesBulk() {
  const ta = document.getElementById('p-bulk');
  if (!ta) return;

  const lines = ta.value.split('\n').filter(l => l.trim());

  if (!lines.length) {
    toast('Input kosong', 'e');
    return;
  }

  const arr = safeArr(db.get(K.sr));
  let added = 0;

  lines.forEach(line => {
    const p = parseSaleLine(line);
    if (!p || p.err) return;

    const m = matchMenu(p.name);

    arr.push({
      id: uid(),
      raw_menu: p.name,
      matched_menu: m ? m.name : p.name,
      is_unknown: !m,
      qty: p.qty,
      revenue: p.revenue,
      date: today()
    });

    trackUsage('menu', m ? m.name : p.name);
    if (!m) addUnkMenu(p.name);

    added++;
  });

  if (arr.length > 1000) {
    arr.splice(0, arr.length - 500);
  }

  db.set(K.sr, arr);

  ta.value = '';
  document.getElementById('pp-p')?.classList.remove('show');

  toast(
    added ? `${added} penjualan ditambahkan` : 'Tidak ada data valid',
    added ? 's' : 'w'
  );

  renderPenjualan();
}

function renderPenjualan() {
  const dateEl = document.getElementById('p-date');
  if (dateEl) dateEl.textContent = fmtDate();

  const sales = safeArr(db.get(K.sr)).filter(s => s.date === today());

  const listEl = document.getElementById('p-list');
  const sum = document.getElementById('p-sum');

  if (!listEl || !sum) return;

  if (!sales.length) {
    listEl.innerHTML = `
      <div class="empty">
        <div class="empty-i">💰</div>
        <p>Belum ada penjualan hari ini</p>
      </div>
    `;
    sum.style.display = 'none';
    return;
  }

  const totalQty = sales.reduce((s, r) => s + (r.qty || 0), 0);
  const totalRev = sales.reduce((s, r) => s + (r.revenue || 0), 0);

  document.getElementById('p-tq').textContent = totalQty;
  document.getElementById('p-tr').textContent = fmtRp(totalRev);

  sum.style.display = 'block';

  const map = {};

  sales.forEach(s => {
    const key = s.matched_menu;
    if (!map[key]) {
      map[key] = { name: key, qty: 0, rev: 0, unk: s.is_unknown };
    }
    map[key].qty += s.qty;
    map[key].rev += s.revenue;
  });

  let html = `<div class="card">`;

  Object.values(map)
    .sort((a, b) => b.rev - a.rev)
    .forEach(m => {
      const unk = m.unk
        ? `<span style="font-size:9px;color:var(--amber);margin-left:4px">●</span>`
        : '';

      html += `
        <div class="sr">
          <div style="flex:1">
            <div>${esc(m.name)}${unk}</div>
            <div style="font-size:11px;color:var(--text3)">${m.qty} porsi</div>
          </div>
          <div style="font-family:var(--mono);font-weight:700">${fmtRp(m.rev)}</div>
        </div>
      `;
    });

  html += `</div>`;
  listEl.innerHTML = html;
}

function bindPenjualanEvents() {
  const inp = document.getElementById('p-bulk');

  if (inp) {
    inp.addEventListener('input', e => {
      const val = e.target.value;
      debounce('prev-p', () => previewSales(val));
    });
  }

  document.getElementById('btn-process-sales')
    ?.addEventListener('click', processSalesBulk);
}

/* ===============================
DASHBOARD
=============================== */

let _dashF = 'today';

function getDates() {
  if (_dashF === 'today') return [today()];
  if (_dashF === 'yesterday') return [yest()];

  const arr = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

function renderDashboard() {
  const dash = document.getElementById('dash');
  if (!dash) return;

  const dates = getDates();

  const sales = safeArr(db.get(K.sr))
    .filter(s => dates.includes(s.date));

  const prs = safeArr(db.get(K.pr))
    .filter(p => dates.includes(p.date));

  const totalRev = sales.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalQty = sales.reduce((s, r) => s + (r.qty || 0), 0);

  let totalItems = 0;
prs.forEach(p => {
  totalItems += safeArr(p.items).length;
});

  const menuMap = {};

  sales.forEach(s => {
    const key = s.matched_menu;
    if (!menuMap[key]) menuMap[key] = { name: key, qty: 0, rev: 0 };
    menuMap[key].qty += s.qty;
    menuMap[key].rev += s.revenue;
  });

  const topMenus = Object.values(menuMap)
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 5);

  let html = `
    <div class="card">
      <div class="sg">
        <div>
          <div class="sl">Total Revenue</div>
          <div class="sv a">${fmtRp(totalRev)}</div>
        </div>
        <div>
          <div class="sl">Total Porsi</div>
          <div class="sv g">${totalQty}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="sg">
        <div>
          <div class="sl">Purchase Order</div>
          <div class="sv">${prs.length}</div>
        </div>
        <div>
          <div class="sl">Total Item Belanja</div>
          <div class="sv">${totalItems}</div>
        </div>
      </div>
    </div>
  `;

  if (topMenus.length) {
    html += `<div class="card"><div class="ct">Top Menu</div>`;

    topMenus.forEach((m, i) => {
      html += `
        <div class="sr">
          <div style="color:var(--text3);font-family:var(--mono);font-size:11px;width:18px">${i + 1}</div>
          <div style="flex:1">${esc(m.name)}</div>
          <div style="font-size:11px;color:var(--text3)">${m.qty}×</div>
          <div style="font-family:var(--mono);font-size:12px">${fmtRp(m.rev)}</div>
        </div>
      `;
    });

    html += `</div>`;
  } else {
    html += `
      <div class="empty">
        <div class="empty-i">📊</div>
        <p>Belum ada data penjualan</p>
      </div>
    `;
  }

  dash.innerHTML = html;
}

/* ===============================
VALIDASI
=============================== */

let _vFilter = 'all';

function renderValidasi() {
  const dateEl = document.getElementById('v-date');
  if (dateEl) dateEl.textContent = fmtDate();

  const prs = safeArr(db.get(K.pr));
  const rv = safeArr(db.get(K.rv));

  const latest = prs[prs.length - 1];

  const content = document.getElementById('v-content');
  const vbar = document.getElementById('v-bar');

  if (!content || !vbar) return;

  if (!latest || !safeArr(latest.items).length) {
    content.innerHTML = `
      <div class="empty">
        <div class="empty-i">✅</div>
        <p>Belum ada data belanja</p>
      </div>
    `;
    vbar.style.display = 'none';
    return;
  }

  vbar.style.display = 'block';

  const prRv = rv.find(r => r.pr_id === latest.id) || { items: [] };

  let items = latest.items.map(it => {
    const real = safeArr(prRv.items)
      .find(r => norm(r.matched_name) === norm(it.matched_name));

    const realQty = real && typeof real.realQty === 'number'
  ? real.realQty
  : null;

    const diff = realQty !== null
      ? Math.round((realQty - it.qty) * 10000) / 10000
      : null;

    return {
      ...it,
      realQty,
      diff,
      status: realQty === null
        ? 'pending'
        : (diff === 0 ? 'ok' : 'diff')
    };
  });

  if (_vFilter === 'diff') {
    items = items.filter(i => i.status === 'diff');
  } else if (_vFilter === 'ok') {
    items = items.filter(i => i.status === 'ok');
  }

  document.querySelectorAll('#v-chips .chip')
    .forEach(c => c.classList.toggle('active', c.dataset.filter === _vFilter));

  if (!items.length) {
    content.innerHTML = `<div class="empty"><p>Tidak ada item</p></div>`;
    return;
  }

  let html = '';

  items.forEach(it => {
    const sc = it.status === 'ok'
      ? 'var(--acc)'
      : it.status === 'diff'
      ? 'var(--red)'
      : 'var(--text3)';

    const diffLabel = it.diff !== null
      ? `<span style="color:${it.diff === 0 ? 'var(--acc)' : 'var(--red)'};font-size:11px">
          ${it.diff > 0 ? '+' : ''}${it.diff} ${it.unit}
        </span>`
      : `<span style="color:var(--text3);font-size:11px">belum dicek</span>`;

    html += `
      <div class="card">
        <div style="display:flex;gap:10px">
          <div style="color:${sc}">●</div>
          <div style="flex:1">
            <div>${esc(it.matched_name)}</div>
            <div style="font-size:11px">${it.qty} ${it.unit}</div>
          </div>
          <div style="font-family:var(--mono)">${it.realQty !== null ? it.realQty + ' ' + it.unit : '-'}</div>
          ${diffLabel}
        </div>
      </div>
    `;
  });

  content.innerHTML = html;
}

function allOk() {
  const prs = safeArr(db.get(K.pr));
  const latest = prs[prs.length - 1];
  if (!latest) return;

  const rv = safeArr(db.get(K.rv));

  const entry = {
    id: uid(),
    pr_id: latest.id,
    date: today(),
    items: latest.items.map(it => ({
      matched_name: it.matched_name,
      qty: it.qty,
      unit: it.unit,
      realQty: it.qty,
      diff: 0
    }))
  };

  const idx = rv.findIndex(r => r.pr_id === latest.id);

if (idx >= 0) {
  rv[idx] = entry;
} else {
  rv.push(entry);
}
  db.set(K.rv, rv);

  toast('Semua sesuai');
  renderValidasi();
}

function bindValidasiEvents() {
  document.getElementById('btn-all-ok')?.addEventListener('click', allOk);

  document.getElementById('btn-save-validasi')?.addEventListener('click', () => {
    toast('Validasi disimpan');
  });

  document.querySelectorAll('#v-chips .chip')
    .forEach(chip => {
      chip.onclick = () => {
        _vFilter = chip.dataset.filter;
        renderValidasi();
      };
    });
}

/* ===============================
ADMIN
=============================== */

function renderAdmin() {
  renderCats();
}

function renderCats() {
  const cats = safeArr(db.get(K.cats));
  const el = document.getElementById('cat-tags');

  if (!el) return;

  el.innerHTML = cats.map((c, i) =>
    `<span class="tag">${esc(c)} <button data-del-cat="${i}">✕</button></span>`
  ).join('');

  el.querySelectorAll('[data-del-cat]')
    .forEach(btn => btn.onclick = () => delCat(Number(btn.dataset.delCat));
}

function addCat() {
  const inp = document.getElementById('new-cat');
  if (!inp) return;

  const name = inp.value.trim();

  if (!name) {
    toast('Nama kosong', 'e');
    return;
  }

  const cats = safeArr(db.get(K.cats));

  if (cats.map(norm).includes(norm(name))) {
    toast('Sudah ada', 'w');
    return;
  }

  cats.push(name);
  db.set(K.cats, cats);

  inp.value = '';
  renderCats();
}

  
function delCat(i) {
  const cats = safeArr(db.get(K.cats));

  openModal('Hapus?', cats[i], () => {
    cats.splice(i, 1);
    db.set(K.cats, cats);
    renderCats();
  });
}

/* ===============================
INIT
=============================== */
/* ===============================
SEED DATA (WAJIB ADA)
=============================== */

function seed() {
  if (!localStorage.getItem(K.cats)) {
    db.set(K.cats, [
      'Protein','Sayur','Bumbu','Minyak & Santan',
      'Bahan Kering','Buah','Minuman','Lainnya'
    ]);
  }

  if (!localStorage.getItem(K.mi)) {
    db.set(K.mi, [
      { id:uid(), name:'ayam dada', category:'Protein', aliases:['dada ayam','ayam'] },
      { id:uid(), name:'telur ayam', category:'Protein', aliases:['telur','telor'] },
      { id:uid(), name:'cabai merah', category:'Sayur', aliases:['cabe merah','cabai'] },
      { id:uid(), name:'bawang merah', category:'Bumbu', aliases:['bawang'] },
      { id:uid(), name:'minyak goreng', category:'Minyak & Santan', aliases:['minyak'] },
      { id:uid(), name:'beras', category:'Bahan Kering', aliases:['nasi'] }
    ]);
  }

  if (!localStorage.getItem(K.mm)) {
    db.set(K.mm, [
      { id:uid(), name:'nasi goreng', aliases:['nasgor'] },
      { id:uid(), name:'ayam goreng', aliases:[] },
      { id:uid(), name:'es teh', aliases:['teh es'] }
    ]);
  }

  if (!localStorage.getItem(K.stats)) db.set(K.stats, {});
  if (!localStorage.getItem(K.favs)) db.set(K.favs, []);
}
function initApp() {
  seed();
  initDark();
  bindGlobalEvents();
  bindBelanjaEvents();
  bindPenjualanEvents();
  bindValidasiEvents();

  document.getElementById('btn-add-cat')
    ?.addEventListener('click', addCat);

  document.getElementById('new-cat')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter') addCat();
    });

  renderBelanja();
}

document.addEventListener('DOMContentLoaded', initApp);
