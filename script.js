/* ===============================
   CORE + STORAGE
=============================== */

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
  get: (k, d = []) => {
    try {
      const v = localStorage.getItem(k);
      const parsed = v ? JSON.parse(v) : d;
      return parsed ?? d;
    } catch {
      return d;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};

/* ===============================
   UTILS
=============================== */

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
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

/* ===============================
   SAFE HELPERS
=============================== */

function safeArr(v){
  return Array.isArray(v) ? v : [];
}

function clone(obj){
  return JSON.parse(JSON.stringify(obj));
}

/* ===============================
   CLIPBOARD SAFE
=============================== */

function copyText(text){
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(()=>toast('Disalin ke WA'))
      .catch(()=>fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    toast('Disalin (fallback)');
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
    .map(([k, v]) => ({ name: k.split(':')[1], count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function updateFavs() {
  db.set(K.favs, getTop('item', 10).map(t => t.name));
}
/* ===============================
   SEED (INIT DATA)
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
      {id:uid(),name:'ayam dada',category:'Protein',aliases:['dada ayam','ayam','chicken']},
      {id:uid(),name:'daging sapi',category:'Protein',aliases:['sapi','beef']},
      {id:uid(),name:'telur ayam',category:'Protein',aliases:['telur','telor','egg']},
      {id:uid(),name:'ikan lele',category:'Protein',aliases:['lele']},

      {id:uid(),name:'cabai merah',category:'Sayur',aliases:['cabe merah','cabai','cabe']},
      {id:uid(),name:'cabai rawit',category:'Sayur',aliases:['rawit','cabe rawit']},
      {id:uid(),name:'tomat',category:'Sayur',aliases:['tomato']},
      {id:uid(),name:'kangkung',category:'Sayur',aliases:[]},

      {id:uid(),name:'bawang merah',category:'Bumbu',aliases:['bawang','shallot']},
      {id:uid(),name:'bawang putih',category:'Bumbu',aliases:['garlic']},
      {id:uid(),name:'jahe',category:'Bumbu',aliases:['ginger']},
      {id:uid(),name:'kunyit',category:'Bumbu',aliases:['turmeric']},

      {id:uid(),name:'minyak goreng',category:'Minyak & Santan',aliases:['minyak','oil']},
      {id:uid(),name:'santan',category:'Minyak & Santan',aliases:['santen']},

      {id:uid(),name:'beras',category:'Bahan Kering',aliases:['nasi','rice']},
      {id:uid(),name:'gula pasir',category:'Bahan Kering',aliases:['gula','sugar']},
      {id:uid(),name:'garam',category:'Bahan Kering',aliases:['salt']}
    ]);
  }

  if (!localStorage.getItem(K.mm)) {
    db.set(K.mm, [
      {id:uid(),name:'nasi goreng',aliases:['nasgor']},
      {id:uid(),name:'ayam bakar',aliases:['ayam panggang']},
      {id:uid(),name:'ayam goreng',aliases:[]},
      {id:uid(),name:'es teh',aliases:['teh es']},
      {id:uid(),name:'soto ayam',aliases:['soto']},
      {id:uid(),name:'nasi putih',aliases:['nasi']}
    ]);
  }

  if (!localStorage.getItem(K.stats)) db.set(K.stats, {});
  if (!localStorage.getItem(K.favs)) db.set(K.favs, []);
}

/* ===============================
   MATCHING ENGINE (IMPROVED)
=============================== */

function matchItem(raw) {
  const items = safeArr(db.get(K.mi));
  const q = norm(raw);
  if (!q) return null;

  return items.find(i => norm(i.name) === q)
    || items.find(i => (i.aliases || []).some(a => norm(a) === q))
    || items.find(i => norm(i.name).includes(q) || q.includes(norm(i.name)))
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

/* ===============================
   UNIT NORMALIZATION
=============================== */

function normUnit(u){
  u = norm(u);

  const map = {
    kg:'kg',
    kilo:'kg',
    kilogram:'kg',
    gr:'g',
    gram:'g',
    pcs:'pcs',
    biji:'pcs',
    buah:'pcs',
    l:'l',
    liter:'l'
  };

  return map[u] || u || 'pcs';
}

/* ===============================
   PARSER (UPGRADE)
=============================== */

function parseLine(line) {
  line = line.trim();
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

  let qty = match[2].replace(',', '.');

  return {
    raw: line,
    name: norm(match[1]),
    qty: parseFloat(qty) || 1,
    unit: normUnit(match[3])
  };
}

function parseSaleLine(line) {
  line = line.trim();
  if (!line) return null;

  const parts = line.split(/\s+/);
  if (parts.length < 3) {
    return { raw: line, err: 'format salah' };
  }

  const revenue = parseFloat(parts.pop());
  const qty = parseInt(parts.pop());
  const name = parts.join(' ');

  if (isNaN(qty) || isNaN(revenue)) {
    return { raw: line, err: 'qty/revenue invalid' };
  }

  return {
    raw: line,
    name: norm(name),
    qty,
    revenue
  };
}

/* ===============================
   UNKNOWN HANDLER (SAFE)
=============================== */

function addUnkItem(raw) {
  const u = safeArr(db.get(K.ui));
  if (u.find(x => norm(x.raw_name) === norm(raw))) return;

  u.push({ id: uid(), raw_name: raw, date: today() });
  db.set(K.ui, u);
}

function addUnkMenu(raw) {
  const u = safeArr(db.get(K.um));
  if (u.find(x => norm(x.raw_name) === norm(raw))) return;

  u.push({ id: uid(), raw_name: raw, date: today() });
  db.set(K.um, u);
}
/* ===============================
   BELANJA MODULE (UPGRADE)
=============================== */

let _sess = [];
let _favOpen = true;

/* ---------- GROUP ---------- */
function groupByCat(items) {
  const g = {};
  items.forEach(it => {
    const c = it.category || 'Lainnya';
    if (!g[c]) g[c] = [];
    g[c].push(it);
  });
  return g;
}

/* ---------- AUTO MERGE (NEW CORE FIX) ---------- */
function mergeItems(arr){
  const map = {};

  arr.forEach(it => {
    const key = norm(it.matched_name) + '|' + it.unit;

    if (!map[key]) {
      map[key] = { ...it };
    } else {
      map[key].qty += it.qty;
    }
  });

  return Object.values(map);
}

/* ---------- PREVIEW ---------- */
function previewBelanja(text) {
  const prev = document.getElementById('pp-b');
  if (!prev) return;

  const lines = text.split('\n').filter(l => l.trim());

  if (!lines.length) {
    prev.classList.remove('show');
    return;
  }

  let html = '';

  lines.forEach(line => {
    const p = parseLine(line);
    if (!p) return;

    if (p.err) {
      html += `<div class="ppr">✕ ${esc(line)}</div>`;
      return;
    }

    const m = matchItem(p.name);

    html += m
      ? `<div class="ppr">✓ ${esc(m.name)} (${esc(m.category)}) ${p.qty}${p.unit}</div>`
      : `<div class="ppr">? ${esc(p.name)} ${p.qty}${p.unit}</div>`;
  });

  prev.innerHTML = html;
  prev.classList.add('show');
}

/* ---------- PROCESS (FIXED + MERGE) ---------- */
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

  /* 🔥 AUTO MERGE APPLY */
  _sess = mergeItems(_sess);

  db.set(K.sess, _sess);

  ta.value = '';
  document.getElementById('pp-b').classList.remove('show');

  updateFavs();
  renderBelanja();

  toast(`${added} item ditambahkan`);
}

/* ---------- FAVORITES ---------- */
function toggleFav() {
  _favOpen = !_favOpen;
  renderBelanja();
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
}

/* ---------- DELETE ---------- */
function delItem(id) {
  _sess = _sess.filter(i => i.id !== id);
  db.set(K.sess, _sess);
  renderBelanja();
}

/* ---------- CLEAR ---------- */
function clearBelanja() {
  openModal('Kosongkan?', 'Semua item akan dihapus', () => {
    _sess = [];
    db.set(K.sess, []);
    renderBelanja();
    toast('Dikosongkan', 'w');
  });
}

/* ---------- TEMPLATE (FIX CLONE BUG) ---------- */
function saveTpl() {
  _sess = db.get(K.sess);

  if (!_sess.length) {
    toast('Tidak ada data', 'e');
    return;
  }

  const tpl = safeArr(db.get(K.tpl));

  tpl.push({ id: uid(), items: clone(_sess) });

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

  document.getElementById('bulk-inp').value = text;

  previewBelanja(text);
}

/* ---------- COPY WA (FIXED) ---------- */
function copyWA() {
  _sess = safeArr(db.get(K.sess));

  if (!_sess.length) {
    toast('Kosong', 'e');
    return;
  }

  const g = groupByCat(_sess);

  let text = `BELANJA\n${fmtDate()}\n\n`;

  Object.entries(g).forEach(([cat, items]) => {
    text += `[${cat}]\n`;
    items.forEach(it => {
      text += `- ${it.matched_name} ${it.qty}${it.unit}\n`;
    });
    text += '\n';
  });

  const prs = safeArr(db.get(K.pr));
  prs.push({ id: uid(), date: today(), items: clone(_sess) });
  db.set(K.pr, prs);

  copyText(text);
}

/* ---------- RENDER ---------- */
function renderBelanja() {
  const dateEl = document.getElementById('b-date');
  if (dateEl) dateEl.textContent = fmtDate();

  _sess = safeArr(db.get(K.sess));

  const wrap = document.getElementById('b-list');
  const act = document.getElementById('b-act');

  if (!wrap || !act) return;

  const favs = safeArr(db.get(K.favs));

  const favSec = document.getElementById('fav-sec');
  const favGrid = document.getElementById('fav-grid');

  if (favs.length) {
    favSec.style.display = 'block';
    favGrid.innerHTML = _favOpen
      ? favs.map(f => `<button class="fav-btn" data-fav="${esc(f)}">${esc(f)}</button>`).join('')
      : '';
  } else {
    favSec.style.display = 'none';
  }

  if (!_sess.length) {
    wrap.innerHTML = `<div class="empty"><div class="empty-i">🛒</div><p>Belum ada data</p></div>`;
    act.style.display = 'none';
    return;
  }

  const g = groupByCat(_sess);

  let html = `<div class="card">`;

  Object.entries(g).forEach(([cat, items]) => {
    html += `<div><strong>${esc(cat)}</strong></div>`;

    items.forEach(it => {
      html += `
      <div class="ir">
        <div style="flex:1">${esc(it.matched_name)}</div>
        <span>${it.qty}${it.unit}</span>
        <button data-del="${it.id}">✕</button>
      </div>`;
    });
  });

  html += `</div>`;

  wrap.innerHTML = html;
  act.style.display = 'block';

  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => delItem(btn.dataset.del));
  });

  document.querySelectorAll('[data-fav]').forEach(btn => {
    btn.addEventListener('click', () => addFavItem(btn.dataset.fav));
  });
}

/* ---------- EVENT BIND ---------- */
function bindBelanjaEvents() {
  document.getElementById('bulk-inp')
    ?.addEventListener('input', e => previewBelanja(e.target.value));

  document.getElementById('btn-process-bulk')
    ?.addEventListener('click', processBulk);

  document.getElementById('btn-load-tpl')
    ?.addEventListener('click', loadTpl);

  document.getElementById('btn-save-tpl')
    ?.addEventListener('click', saveTpl);

  document.getElementById('btn-copy-wa')
    ?.addEventListener('click', copyWA);

  document.getElementById('btn-clear-belanja')
    ?.addEventListener('click', clearBelanja);

  document.getElementById('toggle-fav')
    ?.addEventListener('click', toggleFav);
}
/* ===============================
   PENJUALAN MODULE (FIXED)
=============================== */

/* ---------- PREVIEW ---------- */
function previewSales(text) {
  const prev = document.getElementById('pp-p');
  if (!prev) return;

  const lines = text.split('\n').filter(l => l.trim());

  if (!lines.length) {
    prev.classList.remove('show');
    return;
  }

  let html = '';

  lines.forEach(line => {
    const p = parseSaleLine(line);
    if (!p) return;

    if (p.err) {
      html += `<div class="ppr">✕ ${esc(line)}</div>`;
      return;
    }

    const m = matchMenu(p.name);

    html += m
      ? `<div class="ppr">✓ ${esc(m.name)} × ${p.qty} = ${fmtRp(p.revenue)}</div>`
      : `<div class="ppr">? ${esc(p.name)} × ${p.qty} = ${fmtRp(p.revenue)}</div>`;
  });

  prev.innerHTML = html;
  prev.classList.add('show');
}

/* ---------- PROCESS ---------- */
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

  db.set(K.sr, arr);

  ta.value = '';
  document.getElementById('pp-p')?.classList.remove('show');

  if (added) {
    toast(`${added} penjualan ditambahkan`);
  } else {
    toast('Tidak ada data valid', 'w');
  }

  renderPenjualan();
}

/* ---------- RENDER ---------- */
function renderPenjualan() {
  const dateEl = document.getElementById('p-date');
  if (dateEl) dateEl.textContent = fmtDate();

  const sales = safeArr(db.get(K.sr))
    .filter(s => s.date === today());

  const listEl = document.getElementById('p-list');
  const sum = document.getElementById('p-sum');

  if (!listEl || !sum) return;

  if (!sales.length) {
    listEl.innerHTML = `<div class="empty"><div class="empty-i">💰</div><p>Belum ada penjualan</p></div>`;
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
      map[key] = {
        name: key,
        qty: 0,
        rev: 0
      };
    }

    map[key].qty += s.qty;
    map[key].rev += s.revenue;
  });

  let html = `<div class="card">`;

  Object.values(map)
    .sort((a, b) => b.rev - a.rev)
    .forEach(m => {
      html += `
      <div class="sr">
        <div style="flex:1">
          <div>${esc(m.name)}</div>
          <div style="font-size:11px;color:var(--text3)">
            ${m.qty} porsi
          </div>
        </div>
        <div>${fmtRp(m.rev)}</div>
      </div>`;
    });

  html += `</div>`;

  listEl.innerHTML = html;
}

/* ---------- EVENT BIND ---------- */
function bindPenjualanEvents() {
  document.getElementById('p-bulk')
    ?.addEventListener('input', e => previewSales(e.target.value));

  document.getElementById('btn-process-sales')
    ?.addEventListener('click', processSalesBulk);
}

/* ===============================
   DASHBOARD MODULE (FIXED)
=============================== */

function renderDashboard() {

  const dates = getDates();

  const sales = safeArr(db.get(K.sr))
    .filter(s => dates.includes(s.date));

  const prs = safeArr(db.get(K.pr))
    .filter(p => dates.includes(p.date));

  const totalRev = sales.reduce((s, r) => s + (r.revenue || 0), 0);

  /* 🔥 FIX: no crash flatMap */
  const totalItems = prs
    .flatMap(p => safeArr(p.items))
    .length;

  let html = `
  <div class="card">
    <div>Total Revenue</div>
    <h2>${fmtRp(totalRev)}</h2>
  </div>

  <div class="card">
    <div>Total Item</div>
    <h2>${totalItems}</h2>
  </div>
  `;

  document.getElementById('dash').innerHTML = html;
}

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
/* ===============================
   VALIDASI MODULE (SAFE)
=============================== */

function renderValidasi() {
  const dateEl = document.getElementById('v-date');
  if (dateEl) dateEl.textContent = fmtDate();

  const prs = safeArr(db.get(K.pr));
  const latest = prs[prs.length - 1];

  const content = document.getElementById('v-content');
  const vbar = document.getElementById('v-bar');

  if (!content || !vbar) return;

  if (!latest || !latest.items) {
    content.innerHTML = `<div class="empty"><p>Belum ada data</p></div>`;
    vbar.style.display = 'none';
    return;
  }

  vbar.style.display = 'block';

  let html = '';

  latest.items.forEach(it => {
    html += `
    <div class="card">
      <div>${esc(it.matched_name)}</div>
      <div style="font-size:12px;color:var(--text3)">
        ${it.qty} ${it.unit}
      </div>
    </div>`;
  });

  content.innerHTML = html;
}

/* ===============================
   ADMIN MODULE (SAFE)
=============================== */

function renderAdmin() {
  renderCats();
}

function renderCats() {
  const cats = safeArr(db.get(K.cats));

  const el = document.getElementById('cat-tags');
  if (!el) return;

  if (!cats.length) {
    el.innerHTML = `<div class="empty"><p>Belum ada kategori</p></div>`;
    return;
  }

  el.innerHTML =
    cats.map((c, i) => `
      <span class="tag">
        ${esc(c)}
        <button data-del-cat="${i}">✕</button>
      </span>
    `).join('');

  document.querySelectorAll('[data-del-cat]').forEach(btn => {
    btn.addEventListener('click', () => delCat(btn.dataset.delCat));
  });
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

  if (cats.includes(name)) {
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

  if (!cats[i]) return;

  openModal('Hapus?', cats[i], () => {
    cats.splice(i, 1);
    db.set(K.cats, cats);
    renderCats();
  });
}

/* ===============================
   INIT APP (FINAL SAFE)
=============================== */

function initApp() {

  seed();
  initDark();

  /* BIND GLOBAL */
  bindGlobalEvents();
  bindBelanjaEvents();
  bindPenjualanEvents();

  /* ADMIN */
  document.getElementById('btn-add-cat')
    ?.addEventListener('click', addCat);

  /* INITIAL RENDER */
  renderBelanja();

  /* SET DATE */
  document.getElementById('b-date')?.textContent = fmtDate();
  document.getElementById('v-date')?.textContent = fmtDate();
  document.getElementById('p-date')?.textContent = fmtDate();
}

/* ===============================
   START
=============================== */

document.addEventListener('DOMContentLoaded', initApp);
