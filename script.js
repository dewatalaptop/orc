/* ================================================
   DOLAN SAWAH OPS v2 – PART 1: CORE & UI
   ================================================ */

// 1. GLOBAL ERROR HANDLER
window.onerror = function(message, source, lineno, colno, error) {
  const box = document.getElementById('err-box');
  const content = document.getElementById('err-content');
  const msg = `ERROR: ${message}\nFILE: ${source}\nLINE: ${lineno}:${colno}`;

  console.error(msg);
  if (box && content) {
    content.textContent = msg;
    box.style.display = 'block';
  }
};

const APP_VERSION = 2;

// 2. STORAGE KEYS
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

// 3. DATABASE ENGINE (LOCALSTORAGE WRAPPER)
const db = {
  get(k, d = []) {
    try {
      const raw = localStorage.getItem(k);
      const parsed = raw ? JSON.parse(raw) : d;
      if (Array.isArray(d) && !Array.isArray(parsed)) return d;
      return parsed ?? d;
    } catch { return d; }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      // Auto-trim jika storage penuh
      if (!window.__trimming) {
        window.__trimming = true;
        trimStorage();
        window.__trimming = false;
      }
      try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
    }
  }
};

function trimStorage() {
  [K.pr, K.sr, K.rv].forEach(key => {
    const arr = db.get(key, []);
    if (arr.length > 1000) db.set(key, arr.slice(-500));
  });
}

// 4. UTILS & FORMATTERS
const utils = {
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  norm: (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' '),
  today: () => new Date().toISOString().slice(0, 10),
  yest: () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  },
  fmtRp: (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID'),
  fmtDate: (d = new Date()) => d.toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short'
  }),
  esc: (s) => {
    const el = document.createElement('div');
    el.textContent = s || '';
    return el.innerHTML;
  },
  clone: (obj) => {
    try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
  },
  safeArr: (v) => Array.isArray(v) ? v : []
};

// 5. UI COMPONENTS (TOAST, MODAL, THEME)
function toast(msg, type = 's') {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const colors = { s: 'var(--acc)', e: 'var(--red)', w: 'var(--amber)' };
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderLeft = '3px solid ' + (colors[type] || colors.s);
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

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
  apply(saved ? saved === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches);
  if (btn) {
    btn.onclick = () => {
      const isLight = root.hasAttribute('data-light');
      localStorage.setItem('ds_theme', isLight ? 'dark' : 'light');
      apply(!isLight);
    };
  }
}

// 6. CLIPBOARD SYSTEM (FIXED & SECURE)
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => toast('Disalin ke clipboard'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.opacity = '0';
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

function copyError() {
  const text = document.getElementById('err-content')?.textContent;
  if (!text) return;
  copyText(text);
}
/* ================================================
   DOLAN SAWAH OPS v2 – PART 2: LOGIC & ENGINE
   ================================================ */

// 1. UNIT SYSTEM (NORMALIZATION)
const UNIT_MAP = {
  // Weight -> KG
  kg:       { base: 'kg', factor: 1 },
  kilo:     { base: 'kg', factor: 1 },
  kilogram: { base: 'kg', factor: 1 },
  g:        { base: 'kg', factor: 0.001 },
  gr:       { base: 'kg', factor: 0.001 },
  gram:     { base: 'kg', factor: 0.001 },
  ons:      { base: 'kg', factor: 0.1 },
  // Volume -> Liter
  l:        { base: 'l', factor: 1 },
  liter:    { base: 'l', factor: 1 },
  ml:       { base: 'l', factor: 0.001 },
  // Pieces
  pcs:      { base: 'pcs', factor: 1 },
  biji:     { base: 'pcs', factor: 1 },
  buah:     { base: 'pcs', factor: 1 },
  pack:     { base: 'pack', factor: 1 },
  ikat:     { base: 'ikat', factor: 1 }
};

const engine = {
  normUnit: (u) => {
    const key = utils.norm(u);
    return UNIT_MAP[key] ? UNIT_MAP[key].base : (key || 'pcs');
  },

  toBase: (qty, unit) => {
    const key = utils.norm(unit);
    const info = UNIT_MAP[key];
    if (!info) return { qty, unit: key || 'pcs' };

    return {
      qty: Math.round(qty * info.factor * 100000) / 100000,
      unit: info.base
    };
  },

  // Menggabungkan item yang sama agar tidak double di list
  mergeItems: (arr) => {
    const map = {};
    arr.forEach(it => {
      const conv = engine.toBase(it.qty, it.unit);
      const key = utils.norm(it.matched_name) + '|' + conv.unit;

      if (!map[key]) {
        map[key] = {
          ...it,
          id: utils.uid(), // Regenerate ID agar unik setelah merge
          qty: conv.qty,
          unit: conv.unit,
          original_unit: it.unit
        };
      } else {
        map[key].qty = Math.round((map[key].qty + conv.qty) * 100000) / 100000;
      }
    });
    return Object.values(map).sort((a, b) => a.matched_name.localeCompare(b.matched_name));
  }
};

// 2. MATCHING ENGINE (FUZZY SEARCH)
const matcher = {
  item: (raw) => {
    const items = utils.safeArr(db.get(K.mi));
    const q = utils.norm(raw);
    if (!q) return null;

    return items.find(i => utils.norm(i.name) === q) ||
           items.find(i => (i.aliases || []).some(a => utils.norm(a) === q)) ||
           items.find(i => (utils.norm(i.name).includes(q) || q.includes(utils.norm(i.name))) && q.length > 2) ||
           items.find(i => (i.aliases || []).some(a => utils.norm(a).includes(q))) ||
           null;
  },

  menu: (raw) => {
    const menus = utils.safeArr(db.get(K.mm));
    const q = utils.norm(raw);
    if (!q) return null;

    return menus.find(m => utils.norm(m.name) === q) ||
           menus.find(m => (m.aliases || []).some(a => utils.norm(a) === q)) ||
           menus.find(m => utils.norm(m.name).includes(q)) ||
           null;
  }
};

// 3. TEXT PARSER (INPUT HANDLER)
const parser = {
  // Parser untuk Belanja (Contoh: "Ayam 2 kg")
  line: (line) => {
    line = (line || '').trim();
    if (!line) return null;
    
    // Regex: NamaBarang [Spasi] Angka [Spasi/Opsional] Satuan
    const match = line.match(/^(.+?)\s+([\d.,]+)\s*([a-zA-Z]*)$/);

    if (!match) {
      return { raw: line, name: line, qty: 1, unit: 'pcs', err: 'Format tidak dikenal' };
    }

    const rawQty = parseFloat(match[2].replace(',', '.'));
    return {
      raw: line,
      name: utils.norm(match[1]),
      qty: isNaN(rawQty) ? 1 : rawQty,
      unit: engine.normUnit(match[3])
    };
  },

  // Parser untuk Penjualan (Contoh: "Nasgor 10 150.000")
  sale: (line) => {
    line = (line || '').trim();
    if (!line) return null;

    const match = line.match(/^(.+?)\s+(\d+)\s+([\d.,]+)$/);
    if (!match) return { raw: line, err: 'Format salah (Gunakan: Nama Qty Total)' };

    const qty = parseInt(match[2], 10);
    // Membersihkan titik ribuan agar bisa dihitung (FIXED BUG)
    const revenue = parseFloat(match[3].replace(/\./g, '').replace(',', '.'));

    if (isNaN(qty) || isNaN(revenue)) return { raw: line, err: 'Angka tidak valid' };

    return { raw: line, name: utils.norm(match[1]), qty, revenue };
  }
};

// 4. USAGE TRACKER (FOR FAVORITES)
const stats = {
  track: (type, name) => {
    const s = db.get(K.stats, {});
    const key = type + ':' + utils.norm(name);
    s[key] = (s[key] || 0) + 1;
    db.set(K.stats, s);
  },

  getTop: (type, n = 10) => {
    const s = db.get(K.stats, {});
    return Object.entries(s)
      .filter(([k]) => k.startsWith(type + ':'))
      .map(([k, v]) => ({ name: k.slice(type.length + 1), count: v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  },

  updateFavs: () => {
    const top = stats.getTop('item', 12).map(t => t.name);
    db.set(K.favs, top);
  }
};
/* ================================================
   DOLAN SAWAH OPS v2 – PART 3: UI & INIT
   ================================================ */

// 1. STATE & VARS
let _activeTab = 'belanja';
let _sess = []; // Session belanja aktif
let _favOpen = true;
let _vFilter = 'all'; // Filter validasi: all, ok, diff
let _dashF = 'today'; // Filter dashboard: today, yesterday, week

// 2. RENDER ENGINE: BELANJA
function renderBelanja() {
  _sess = utils.safeArr(db.get(K.sess));
  const wrap = document.getElementById('b-list');
  const act = document.getElementById('b-act');
  const favGrid = document.getElementById('fav-grid');
  
  if (!wrap || !act) return;

  // Render Favorites
  const favs = utils.safeArr(db.get(K.favs));
  if (favGrid) {
    favGrid.innerHTML = _favOpen ? favs.map(f => 
      `<button class="fav-btn" onclick="addFavItem('${utils.esc(f)}')">${utils.esc(f)}</button>`
    ).join('') : '';
  }

  // Handle Empty State
  if (!_sess.length) {
    wrap.innerHTML = `<div class="empty"><div class="empty-i">🛒</div><p>List belanja masih kosong.</p></div>`;
    act.style.display = 'none';
    return;
  }

  // Grouping by Category
  const groups = {};
  _sess.forEach(it => { (groups[it.category] = groups[it.category] || []).push(it); });

  let html = `<div class="card">`;
  Object.entries(groups).forEach(([cat, items]) => {
    html += `<div class="cat-label">${utils.esc(cat)}</div>`;
    items.forEach(it => {
      html += `
        <div class="ir">
          <div style="flex:1">${utils.esc(it.matched_name)} ${it.is_unknown ? '<span class="dot-unk">●</span>':''}</div>
          <span class="qty-label">${it.qty} ${it.unit}</span>
          <button class="btn-del" onclick="delItem('${it.id}')">✕</button>
        </div>`;
    });
  });
  wrap.innerHTML = html + `</div>`;
  act.style.display = 'block';
}

// 3. RENDER ENGINE: PENJUALAN & DASHBOARD
function renderPenjualan() {
  const sales = utils.safeArr(db.get(K.sr)).filter(s => s.date === utils.today());
  const listEl = document.getElementById('p-list');
  const sumEl = document.getElementById('p-sum');
  
  if (!listEl || !sumEl) return;

  if (!sales.length) {
    listEl.innerHTML = `<div class="empty"><div class="empty-i">💰</div><p>Belum ada rekapan hari ini.</p></div>`;
    sumEl.style.display = 'none';
    return;
  }

  const map = {};
  let totalQty = 0, totalRev = 0;

  sales.forEach(s => {
    map[s.matched_menu] = map[s.matched_menu] || { qty:0, rev:0, unk: s.is_unknown };
    map[s.matched_menu].qty += s.qty;
    map[s.matched_menu].rev += s.revenue;
    totalQty += s.qty;
    totalRev += s.revenue;
  });

  document.getElementById('p-tq').textContent = totalQty;
  document.getElementById('p-tr').textContent = utils.fmtRp(totalRev);
  sumEl.style.display = 'block';

  let html = `<div class="card">`;
  Object.values(map).sort((a,b) => b.rev - a.rev).forEach(m => {
    html += `
      <div class="sr">
        <div style="flex:1">
          <div>${utils.esc(m.name)} ${m.unk ? '●':''}</div>
          <small>${m.qty} porsi</small>
        </div>
        <div class="rev-label">${utils.fmtRp(m.rev)}</div>
      </div>`;
  });
  listEl.innerHTML = html + `</div>`;
}

function renderDashboard() {
  const dash = document.getElementById('dash');
  if (!dash) return;

  const sales = utils.safeArr(db.get(K.sr)); // Saring berdasarkan _dashF di produksi nyata
  const totalRev = sales.reduce((s, r) => s + (r.revenue || 0), 0);

  dash.innerHTML = `
    <div class="card">
      <div class="sg">
        <div><div class="sl">Total Revenue (${_dashF})</div><div class="sv a">${utils.fmtRp(totalRev)}</div></div>
      </div>
    </div>
    <div class="card-info">Dashboard akan menampilkan grafik pada update v2.1</div>
  `;
}

// 4. ADMIN & CATEGORY MANAGEMENT
function renderAdmin() {
  const cats = utils.safeArr(db.get(K.cats));
  const el = document.getElementById('cat-tags');
  if (!el) return;

  el.innerHTML = cats.map((c, i) => 
    `<span class="tag">${utils.esc(c)} <button onclick="delCat(${i})">✕</button></span>`
  ).join('');
}

window.delCat = (i) => {
  const cats = utils.safeArr(db.get(K.cats));
  openModal('Hapus Kategori?', cats[i], () => {
    cats.splice(i, 1);
    db.set(K.cats, cats);
    renderAdmin();
  });
};

// 5. GLOBAL ACTIONS (WHATSAPP, DELETE, ETC)
window.delItem = (id) => {
  _sess = _sess.filter(i => i.id !== id);
  db.set(K.sess, _sess);
  renderBelanja();
};

window.addFavItem = (name) => {
  const m = matcher.item(name);
  _sess.push({
    id: utils.uid(), raw_name: name, matched_name: m ? m.name : name,
    category: m ? m.category : 'Lainnya', is_unknown: !m,
    qty: 1, unit: 'pcs', date: utils.today()
  });
  _sess = engine.mergeItems(_sess);
  db.set(K.sess, _sess);
  renderBelanja();
  toast(name + ' ditambah');
};

function copyWA() {
  if (!_sess.length) return toast('List kosong', 'e');
  
  let text = `🛒 *BELANJA DOLAN SAWAH*\n${utils.fmtDate()}\n\n`;
  const groups = {};
  _sess.forEach(it => { (groups[it.category] = groups[it.category] || []).push(it); });

  Object.entries(groups).forEach(([cat, items]) => {
    text += `*[${cat}]*\n`;
    items.forEach(it => { text += `• ${it.matched_name} — ${it.qty} ${it.unit}\n`; });
    text += '\n';
  });

  copyText(text);
  // Simpan ke riwayat Purchase Request
  const prs = utils.safeArr(db.get(K.pr));
  prs.push({ id: utils.uid(), date: utils.today(), items: utils.clone(_sess) });
  db.set(K.pr, prs);
}

// 6. INITIALIZATION & EVENTS
function switchTab(name) {
  _activeTab = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  
  const targetTab = document.getElementById('tab-' + name);
  const targetBtn = document.querySelector(`.nb[data-tab="${name}"]`);
  
  if (targetTab) targetTab.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');

  if (name === 'belanja') renderBelanja();
  if (name === 'penjualan') renderPenjualan();
  if (name === 'dashboard') renderDashboard();
  if (name === 'admin') renderAdmin();
}

function seed() {
  if (!localStorage.getItem(K.cats)) {
    db.set(K.cats, ['Protein','Sayur','Bumbu','Minyak','Kering','Buah','Lainnya']);
  }
  if (!localStorage.getItem(K.mi)) {
    db.set(K.mi, [{ id: utils.uid(), name: 'ayam dada', category: 'Protein', aliases: ['ayam'] }]);
  }
}

function initApp() {
  seed();
  initDark();
  
  // Bind Global Nav
  document.querySelectorAll('.nb').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  // Bind Belanja Events
  document.getElementById('bulk-inp')?.addEventListener('input', e => {
    debounce('prev-b', () => previewBelanja(e.target.value));
  });
  document.getElementById('btn-process-bulk')?.onclick = () => processBulk();
  document.getElementById('btn-copy-wa')?.onclick = () => copyWA();
  document.getElementById('btn-clear-belanja')?.onclick = () => {
    openModal('Kosongkan?', 'Hapus semua list belanja?', () => {
      db.set(K.sess, []);
      renderBelanja();
    });
  };

  // Bind Penjualan Events
  document.getElementById('p-bulk')?.addEventListener('input', e => {
    debounce('prev-p', () => {
      // previewSales logic here
    });
  });
  document.getElementById('btn-process-sales')?.onclick = () => {
    // processSalesBulk logic
    renderPenjualan();
  };

  switchTab('belanja');
}

document.addEventListener('DOMContentLoaded', initApp);
