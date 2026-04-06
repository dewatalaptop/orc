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
      return v ? JSON.parse(v) : d;
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
   STATS
=============================== */

function trackUsage(type, name) {
  const s = db.get(K.stats, {});
  const key = type + ':' + norm(name);
  s[key] = (s[key] || 0) + 1;
  db.set(K.stats, s);
}

function getFreq(type, name) {
  return db.get(K.stats, {})[type + ':' + norm(name)] || 0;
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
   SEED (INIT DATA AWAL)
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
   MATCHING ENGINE
=============================== */

function matchItem(raw) {
  const items = db.get(K.mi);
  const q = norm(raw);
  if (!q) return null;

  return items.find(i => norm(i.name) === q)
    || items.find(i => (i.aliases || []).some(a => norm(a) === q))
    || items.find(i => norm(i.name).includes(q) || q.includes(norm(i.name)))
    || items.find(i => (i.aliases || []).some(a => norm(a).includes(q)))
    || null;
}

function matchMenu(raw) {
  const menus = db.get(K.mm);
  const q = norm(raw);
  if (!q) return null;

  return menus.find(m => norm(m.name) === q)
    || menus.find(m => (m.aliases || []).some(a => norm(a) === q))
    || menus.find(m => norm(m.name).includes(q))
    || menus.find(m => (m.aliases || []).some(a => norm(a).includes(q)))
    || null;
}

/* ===============================
   PARSER (LEBIH TAHAN ERROR)
=============================== */

function parseLine(line) {
  line = line.trim();
  if (!line) return null;

  // dukung: ayam 5kg / ayam 5 kg
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
    unit: norm(match[3] || 'pcs')
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
   UNKNOWN HANDLER
=============================== */

function addUnkItem(raw) {
  const u = db.get(K.ui);
  if (u.find(x => norm(x.raw_name) === norm(raw))) return;

  u.push({ id: uid(), raw_name: raw, date: today() });
  db.set(K.ui, u);
}

function addUnkMenu(raw) {
  const u = db.get(K.um);
  if (u.find(x => norm(x.raw_name) === norm(raw))) return;

  u.push({ id: uid(), raw_name: raw, date: today() });
  db.set(K.um, u);
}
/* ===============================
   TOAST
=============================== */

function toast(msg, type = 's', dur = 2500) {
  const icons = { s: '✓', e: '✕', w: '⚠' };

  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;

  const wrap = document.getElementById('toasts');
  wrap.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    setTimeout(() => el.remove(), 300);
  }, dur);
}

/* ===============================
   MODAL
=============================== */

function openModal(title, msg, cb) {
  document.getElementById('m-t').textContent = title;
  document.getElementById('m-m').textContent = msg;

  const modal = document.getElementById('mov');
  modal.classList.add('open');

  const okBtn = document.getElementById('m-ok');

  okBtn.onclick = () => {
    closeModal();
    cb && cb();
  };
}

function closeModal() {
  document.getElementById('mov').classList.remove('open');
}

/* ===============================
   DARK MODE
=============================== */

let _dark = true;

function toggleDark() {
  _dark = !_dark;

  if (_dark) {
    document.body.removeAttribute('data-light');
  } else {
    document.body.setAttribute('data-light', 'true');
  }

  document.getElementById('dkbtn').textContent = _dark ? '🌙' : '☀️';

  localStorage.setItem('dark', _dark ? '1' : '0');
}

function initDark() {
  const saved = localStorage.getItem('dark');

  _dark = saved === null ? true : saved === '1';

  if (!_dark) {
    document.body.setAttribute('data-light', 'true');
  }

  document.getElementById('dkbtn').textContent = _dark ? '🌙' : '☀️';
}

/* ===============================
   NAVIGATION
=============================== */

let _tab = 'belanja';
let _dashF = 'today';
let _vf = 'all';

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));

  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelector(`.nb[data-tab="${tab}"]`).classList.add('active');

  _tab = tab;

  const map = {
    belanja: renderBelanja,
    validasi: renderValidasi,
    penjualan: renderPenjualan,
    dashboard: renderDashboard,
    admin: renderAdmin
  };

  if (map[tab]) map[tab]();
}

/* ===============================
   EVENT BINDING GLOBAL
=============================== */

function bindGlobalEvents() {

  // DARK MODE
  document.getElementById('dkbtn').addEventListener('click', toggleDark);

  // NAV
  document.querySelectorAll('.nb').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // MODAL CANCEL
  document.getElementById('m-cancel').addEventListener('click', closeModal);

  // FILTER VALIDASI
  document.querySelectorAll('#v-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      _vf = chip.dataset.filter;

      document.querySelectorAll('#v-chips .chip')
        .forEach(c => c.classList.remove('active'));

      chip.classList.add('active');
      renderValidasi();
    });
  });

  // DASH FILTER
  document.querySelectorAll('[data-dash]').forEach(chip => {
    chip.addEventListener('click', () => {
      _dashF = chip.dataset.dash;

      document.querySelectorAll('[data-dash]')
        .forEach(c => c.classList.remove('active'));

      chip.classList.add('active');
      renderDashboard();
    });
  });

}
/* ===============================
   BELANJA MODULE
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

/* ---------- PREVIEW ---------- */
function previewBelanja(text) {
  const prev = document.getElementById('pp-b');
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

/* ---------- PROCESS ---------- */
function processBulk() {
  const ta = document.getElementById('bulk-inp');
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

/* ---------- TEMPLATE ---------- */
function saveTpl() {
  _sess = db.get(K.sess);

  if (!_sess.length) {
    toast('Tidak ada data', 'e');
    return;
  }

  const tpl = db.get(K.tpl);
  tpl.push({ id: uid(), items: _sess });

  if (tpl.length > 7) tpl.shift();

  db.set(K.tpl, tpl);
  toast('Template disimpan');
}

function loadTpl() {
  const tpl = db.get(K.tpl);

  if (!tpl.length) {
    toast('Belum ada template', 'w');
    return;
  }

  const last = tpl[tpl.length - 1];

  const text = last.items
    .map(i => `${i.matched_name} ${i.qty} ${i.unit}`)
    .join('\n');

  document.getElementById('bulk-inp').value = text;

  previewBelanja(text);
}

/* ---------- COPY WA ---------- */
function copyWA() {
  _sess = db.get(K.sess);

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

  const prs = db.get(K.pr);
  prs.push({ id: uid(), date: today(), items: _sess });
  db.set(K.pr, prs);

  navigator.clipboard.writeText(text);
  toast('Disalin ke WA');
}

/* ---------- RENDER ---------- */
function renderBelanja() {
  document.getElementById('b-date').textContent = fmtDate();

  _sess = db.get(K.sess);

  const wrap = document.getElementById('b-list');
  const act = document.getElementById('b-act');
  const favs = db.get(K.favs);

  // FAVORITES
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

  // EMPTY
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
        <div style="flex:1">
          <div>${esc(it.matched_name)}</div>
        </div>
        <span>${it.qty}${it.unit}</span>
        <button data-del="${it.id}">✕</button>
      </div>`;
    });
  });

  html += `</div>`;

  wrap.innerHTML = html;
  act.style.display = 'block';

  /* EVENT BIND */
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => delItem(btn.dataset.del));
  });

  document.querySelectorAll('[data-fav]').forEach(btn => {
    btn.addEventListener('click', () => addFavItem(btn.dataset.fav));
  });
}

/* ---------- EVENT BIND BELANJA ---------- */
function bindBelanjaEvents() {

  document.getElementById('bulk-inp')
    .addEventListener('input', e => previewBelanja(e.target.value));

  document.getElementById('btn-process-bulk')
    .addEventListener('click', processBulk);

  document.getElementById('btn-load-tpl')
    .addEventListener('click', loadTpl);

  document.getElementById('btn-save-tpl')
    .addEventListener('click', saveTpl);

  document.getElementById('btn-copy-wa')
    .addEventListener('click', copyWA);

  document.getElementById('btn-clear-belanja')
    .addEventListener('click', clearBelanja);

  document.getElementById('toggle-fav')
    .addEventListener('click', toggleFav);
}
/* ===============================
   PENJUALAN MODULE
=============================== */

/* ---------- PREVIEW ---------- */
function previewSales(text) {
  const prev = document.getElementById('pp-p');
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

/* ---------- PROCESS BULK ---------- */
function processSalesBulk() {
  const ta = document.getElementById('p-bulk');
  const lines = ta.value.split('\n').filter(l => l.trim());

  if (!lines.length) {
    toast('Input kosong', 'e');
    return;
  }

  const arr = db.get(K.sr);
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
  document.getElementById('pp-p').classList.remove('show');

  if (added) {
    toast(`${added} penjualan ditambahkan`);
  } else {
    toast('Tidak ada data valid', 'w');
  }

  renderPenjualan();
}

/* ---------- RENDER ---------- */
function renderPenjualan() {
  document.getElementById('p-date').textContent = fmtDate();

  const sales = db.get(K.sr).filter(s => s.date === today());

  const listEl = document.getElementById('p-list');
  const sum = document.getElementById('p-sum');

  if (!sales.length) {
    listEl.innerHTML = `<div class="empty"><div class="empty-i">💰</div><p>Belum ada penjualan</p></div>`;
    sum.style.display = 'none';
    return;
  }

  const totalQty = sales.reduce((s, r) => s + r.qty, 0);
  const totalRev = sales.reduce((s, r) => s + r.revenue, 0);

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
        rev: 0,
        unk: s.is_unknown
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
    .addEventListener('input', e => previewSales(e.target.value));

  document.getElementById('btn-process-sales')
    .addEventListener('click', processSalesBulk);

}
/* ===============================
   VALIDASI MODULE
=============================== */

function renderValidasi() {
  document.getElementById('v-date').textContent = fmtDate();

  const prs = db.get(K.pr);
  const latest = prs[prs.length - 1];

  const content = document.getElementById('v-content');
  const vbar = document.getElementById('v-bar');

  if (!latest) {
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
   DASHBOARD MODULE
=============================== */

function renderDashboard() {

  const dates = getDates();

  const sales = db.get(K.sr).filter(s => dates.includes(s.date));
  const prs = db.get(K.pr).filter(p => dates.includes(p.date));

  const totalRev = sales.reduce((s, r) => s + r.revenue, 0);
  const totalItems = prs.flatMap(p => p.items).length;

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
   ADMIN MODULE
=============================== */

function renderAdmin() {
  renderCats();
}

function renderCats() {
  const cats = db.get(K.cats);

  document.getElementById('cat-tags').innerHTML =
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
  const name = inp.value.trim();

  if (!name) {
    toast('Nama kosong', 'e');
    return;
  }

  const cats = db.get(K.cats);

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
  const cats = db.get(K.cats);

  openModal('Hapus?', cats[i], () => {
    cats.splice(i, 1);
    db.set(K.cats, cats);
    renderCats();
  });
}

/* ===============================
   INIT APP
=============================== */

function initApp() {

  seed();
  initDark();

  // Bind global
  bindGlobalEvents();
  bindBelanjaEvents();
  bindPenjualanEvents();

  // ADMIN
  document.getElementById('btn-add-cat')
    .addEventListener('click', addCat);

  // Initial render
  renderBelanja();

  // Set tanggal
  document.getElementById('b-date').textContent = fmtDate();
  document.getElementById('v-date').textContent = fmtDate();
  document.getElementById('p-date').textContent = fmtDate();
}

/* ===============================
   START
=============================== */

document.addEventListener('DOMContentLoaded', initApp);