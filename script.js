/* ================================================
   DOLAN SAWAH OPS v2 – SCRIPT.JS (FULL UNIFIED)
   ================================================ */

// 1. GLOBAL ERROR HANDLER
window.onerror = function(message, source, lineno, colno, error) {
  const box = document.getElementById('err-box');
  const content = document.getElementById('err-content');
  if (box && content) {
    content.textContent = `ERROR: ${message}\nLINE: ${lineno}:${colno}`;
    box.style.display = 'block';
  }
};

const APP_VERSION = 2;

// 2. STORAGE KEYS
const K = {
  cats: 'categories', mi: 'master_items', mm: 'master_menu',
  pr: 'purchase_requests', rv: 'purchase_realization', sr: 'sales_reports',
  sess: 'session_belanja', stats: 'usage_stats', favs: 'favorites'
};

// 3. DATABASE ENGINE
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
    try { localStorage.setItem(k, JSON.stringify(v)); } 
    catch { console.warn('Storage Full / Error'); }
  }
};

// 4. UTILS & FORMATTERS
let _timers = {};
const utils = {
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  norm: (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' '),
  today: () => new Date().toISOString().slice(0, 10),
  fmtRp: (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID'),
  fmtDate: (d = new Date()) => d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
  esc: (s) => { const el = document.createElement('div'); el.textContent = s || ''; return el.innerHTML; },
  clone: (obj) => { try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; } },
  safeArr: (v) => Array.isArray(v) ? v : [],
  debounce: (id, cb, ms = 300) => { clearTimeout(_timers[id]); _timers[id] = setTimeout(cb, ms); }
};

// 5. UI COMPONENTS
function toast(msg, type = 's') {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderLeft = `3px solid ${type === 'e' ? 'var(--red)' : 'var(--acc)'}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

let _modalCb = null;
window.openModal = function(title, msg, onOk) {
  _modalCb = onOk;
  const mov = document.getElementById('mov');
  if (document.getElementById('m-t')) document.getElementById('m-t').textContent = title;
  if (document.getElementById('m-m')) document.getElementById('m-m').textContent = msg;
  if (mov) mov.classList.add('open');
};

window.closeModal = function() {
  const mov = document.getElementById('mov');
  if (mov) mov.classList.remove('open');
  _modalCb = null;
};

function initDark() {
  const btn = document.getElementById('dkbtn');
  const root = document.body;
  function apply(isLight) {
    if (isLight) { root.setAttribute('data-light', ''); if (btn) btn.textContent = '☀️'; } 
    else { root.removeAttribute('data-light'); if (btn) btn.textContent = '🌙'; }
  }
  const saved = localStorage.getItem('ds_theme');
  apply(saved ? saved === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches);
  if (btn) {
    btn.onclick = () => {
      const light = root.hasAttribute('data-light');
      localStorage.setItem('ds_theme', light ? 'dark' : 'light');
      apply(!light);
    };
  }
}

window.copyText = function(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('Disalin ke clipboard')).catch(() => fallbackCopy(text));
  } else { fallbackCopy(text); }
};

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('Disalin'); } catch { toast('Gagal copy', 'e'); }
  document.body.removeChild(ta);
}

// 6. LOGIC & ENGINE
const UNIT_MAP = {
  kg: { base: 'kg', factor: 1 }, kilo: { base: 'kg', factor: 1 }, g: { base: 'kg', factor: 0.001 }, gram: { base: 'kg', factor: 0.001 },
  l: { base: 'l', factor: 1 }, liter: { base: 'l', factor: 1 }, ml: { base: 'l', factor: 0.001 },
  pcs: { base: 'pcs', factor: 1 }, biji: { base: 'pcs', factor: 1 }, buah: { base: 'pcs', factor: 1 }, pack: { base: 'pack', factor: 1 }
};

const engine = {
  normUnit: (u) => UNIT_MAP[utils.norm(u)] ? UNIT_MAP[utils.norm(u)].base : (utils.norm(u) || 'pcs'),
  toBase: (qty, unit) => {
    const info = UNIT_MAP[utils.norm(unit)];
    if (!info) return { qty, unit: utils.norm(unit) || 'pcs' };
    return { qty: Math.round(qty * info.factor * 100000) / 100000, unit: info.base };
  },
  mergeItems: (arr) => {
    const map = {};
    arr.forEach(it => {
      const conv = engine.toBase(it.qty, it.unit);
      const key = utils.norm(it.matched_name) + '|' + conv.unit;
      if (!map[key]) {
        map[key] = { ...it, id: utils.uid(), qty: conv.qty, unit: conv.unit };
      } else {
        map[key].qty = Math.round((map[key].qty + conv.qty) * 100000) / 100000;
      }
    });
    return Object.values(map).sort((a, b) => a.matched_name.localeCompare(b.matched_name));
  }
};

const matcher = {
  item: (raw) => {
    const items = utils.safeArr(db.get(K.mi)); const q = utils.norm(raw); if (!q) return null;
    return items.find(i => utils.norm(i.name) === q) || items.find(i => (i.aliases || []).some(a => utils.norm(a) === q)) || items.find(i => utils.norm(i.name).includes(q)) || null;
  },
  menu: (raw) => {
    const menus = utils.safeArr(db.get(K.mm)); const q = utils.norm(raw); if (!q) return null;
    return menus.find(m => utils.norm(m.name) === q) || menus.find(m => utils.norm(m.name).includes(q)) || null;
  }
};

const parser = {
  line: (line) => {
    line = (line || '').trim(); if (!line) return null;
    const match = line.match(/^(.+?)\s+([\d.,]+)\s*([a-zA-Z]*)$/);
    if (!match) return { raw: line, name: line, qty: 1, unit: 'pcs', err: true };
    const rawQty = parseFloat(match[2].replace(',', '.'));
    return { raw: line, name: utils.norm(match[1]), qty: isNaN(rawQty) ? 1 : rawQty, unit: engine.normUnit(match[3]) };
  },
  sale: (line) => {
    line = (line || '').trim(); if (!line) return null;
    const match = line.match(/^(.+?)\s+(\d+)\s+([\d.,]+)$/);
    if (!match) return { raw: line, err: true };
    const qty = parseInt(match[2], 10);
    const revenue = parseFloat(match[3].replace(/\./g, '').replace(',', '.'));
    if (isNaN(qty) || isNaN(revenue)) return { raw: line, err: true };
    return { raw: line, name: utils.norm(match[1]), qty, revenue };
  }
};

// 7. STATE & RENDERING
let _activeTab = 'belanja';
let _sess = [];
window._favOpen = true;

window.renderBelanja = function() {
  _sess = utils.safeArr(db.get(K.sess));
  const wrap = document.getElementById('b-list');
  const act = document.getElementById('b-act');
  if (!wrap || !act) return;

  const favGrid = document.getElementById('fav-grid');
  const favs = utils.safeArr(db.get(K.favs));
  if (favGrid) favGrid.innerHTML = window._favOpen ? favs.map(f => `<button class="chip" onclick="addFavItem('${utils.esc(f)}')">${utils.esc(f)}</button>`).join('') : '';

  if (!_sess.length) {
    wrap.innerHTML = `<div class="empty"><div class="empty-i">🛒</div><p>List belanja kosong.</p></div>`;
    act.style.display = 'none'; return;
  }

  const groups = {};
  _sess.forEach(it => { (groups[it.category] = groups[it.category] || []).push(it); });

  let html = `<div class="card">`;
  Object.entries(groups).forEach(([cat, items]) => {
    html += `<div class="ct" style="margin-top:10px">${utils.esc(cat)}</div>`;
    items.forEach(it => {
      html += `<div class="ir"><div style="flex:1">${utils.esc(it.matched_name)} ${it.is_unknown ? '<span class="dot-unk">●</span>':''}</div><span class="qty-label">${it.qty} ${it.unit}</span><button class="btn-del" onclick="delItem('${it.id}')">✕</button></div>`;
    });
  });
  wrap.innerHTML = html + `</div>`;
  act.style.display = 'block';
};

window.renderPenjualan = function() {
  const sales = utils.safeArr(db.get(K.sr)).filter(s => s.date === utils.today());
  const listEl = document.getElementById('p-list');
  const sumEl = document.getElementById('p-sum');
  if (!listEl || !sumEl) return;

  if (!sales.length) {
    listEl.innerHTML = `<div class="empty"><div class="empty-i">💰</div><p>Belum ada rekapan.</p></div>`;
    sumEl.style.display = 'none'; return;
  }

  const map = {}; let tq = 0, tr = 0;
  sales.forEach(s => {
    map[s.matched_menu] = map[s.matched_menu] || { qty:0, rev:0, unk: s.is_unknown };
    map[s.matched_menu].qty += s.qty; map[s.matched_menu].rev += s.revenue;
    tq += s.qty; tr += s.revenue;
  });

  document.getElementById('p-tq').textContent = tq;
  document.getElementById('p-tr').textContent = utils.fmtRp(tr);
  sumEl.style.display = 'block';

  let html = `<div class="card">`;
  Object.entries(map).sort((a,b) => b[1].rev - a[1].rev).forEach(([name, m]) => {
    html += `<div class="sr"><div style="flex:1"><div>${utils.esc(name)} ${m.unk ? '●':''}</div><small>${m.qty} porsi</small></div><div class="rev-label">${utils.fmtRp(m.rev)}</div></div>`;
  });
  listEl.innerHTML = html + `</div>`;
};

window.renderAdmin = function() {
  const cats = utils.safeArr(db.get(K.cats));
  const el = document.getElementById('cat-tags');
  if (el) el.innerHTML = cats.map((c, i) => `<span class="tag">${utils.esc(c)} <button onclick="delCat(${i})">✕</button></span>`).join('');
};

window.delCat = (i) => {
  const cats = utils.safeArr(db.get(K.cats));
  openModal('Hapus Kategori?', cats[i], () => { cats.splice(i, 1); db.set(K.cats, cats); renderAdmin(); });
};

// 8. ACTIONS
window.delItem = (id) => { _sess = _sess.filter(i => i.id !== id); db.set(K.sess, _sess); renderBelanja(); };
window.addFavItem = (name) => {
  const m = matcher.item(name);
  _sess.push({ id: utils.uid(), raw_name: name, matched_name: m ? m.name : name, category: m ? m.category : 'Lainnya', is_unknown: !m, qty: 1, unit: 'pcs', date: utils.today() });
  _sess = engine.mergeItems(_sess); db.set(K.sess, _sess); renderBelanja(); toast(name + ' ditambah');
};

function processBulk() {
  const inp = document.getElementById('bulk-inp');
  if (!inp.value.trim()) return;
  inp.value.split('\n').filter(l => l.trim()).forEach(l => {
    const p = parser.line(l);
    if (!p.err && p) {
      const m = matcher.item(p.name);
      _sess.push({ id: utils.uid(), raw_name: p.raw, matched_name: m ? m.name : p.name, category: m ? m.category : 'Lainnya', is_unknown: !m, qty: p.qty, unit: p.unit, date: utils.today() });
    }
  });
  _sess = engine.mergeItems(_sess); db.set(K.sess, _sess);
  inp.value = ''; document.getElementById('pp-b').innerHTML = '';
  renderBelanja(); toast('List diperbarui');
}

function processSalesBulk() {
  const inp = document.getElementById('p-bulk');
  if (!inp.value.trim()) return;
  const sales = utils.safeArr(db.get(K.sr));
  inp.value.split('\n').filter(l => l.trim()).forEach(l => {
    const p = parser.sale(l);
    if (!p.err && p) {
      const m = matcher.menu(p.name);
      sales.push({ id: utils.uid(), raw_name: p.raw, matched_menu: m ? m.name : p.name, is_unknown: !m, qty: p.qty, revenue: p.revenue, date: utils.today() });
    }
  });
  db.set(K.sr, sales); inp.value = ''; document.getElementById('pp-p').innerHTML = '';
  renderPenjualan(); toast('Penjualan diproses');
}

// 9. INIT
function switchTab(name) {
  _activeTab = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  if (document.getElementById('tab-' + name)) document.getElementById('tab-' + name).classList.add('active');
  if (document.querySelector(`.nb[data-tab="${name}"]`)) document.querySelector(`.nb[data-tab="${name}"]`).classList.add('active');
  
  if (name === 'belanja') renderBelanja();
  if (name === 'penjualan') renderPenjualan();
  if (name === 'admin') renderAdmin();
}

function seed() {
  if (!localStorage.getItem(K.cats)) db.set(K.cats, ['Protein','Sayur','Bumbu','Minyak','Kering','Buah','Lainnya']);
  if (!localStorage.getItem(K.mi)) db.set(K.mi, [{ id: utils.uid(), name: 'ayam dada', category: 'Protein', aliases: ['ayam'] }]);
  if (!localStorage.getItem(K.favs)) db.set(K.favs, ['ayam dada', 'telur', 'cabai merah']);
}

function initApp() {
  seed(); initDark();
  document.querySelectorAll('.nb').forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));
  
  const bInp = document.getElementById('bulk-inp');
  if(bInp) bInp.addEventListener('input', e => utils.debounce('pb', () => {
    const pp = document.getElementById('pp-b');
    if(!e.target.value.trim()) { pp.innerHTML = ''; return; }
    pp.innerHTML = e.target.value.split('\n').filter(l=>l.trim()).map(l => {
      const p = parser.line(l); return p.err ? `<span style="color:var(--red)">❌ ${utils.esc(l)}</span>` : `✔️ ${utils.esc(p.name)} (${p.qty} ${p.unit})`;
    }).join('<br>');
  }));

  const pInp = document.getElementById('p-bulk');
  if(pInp) pInp.addEventListener('input', e => utils.debounce('ps', () => {
    const pp = document.getElementById('pp-p');
    if(!e.target.value.trim()) { pp.innerHTML = ''; return; }
    pp.innerHTML = e.target.value.split('\n').filter(l=>l.trim()).map(l => {
      const p = parser.sale(l); return p.err ? `<span style="color:var(--red)">❌ ${utils.esc(l)}</span>` : `✔️ ${utils.esc(p.name)} (${utils.fmtRp(p.revenue)})`;
    }).join('<br>');
  }));

  if (document.getElementById('btn-process-bulk')) document.getElementById('btn-process-bulk').onclick = processBulk;
  if (document.getElementById('btn-process-sales')) document.getElementById('btn-process-sales').onclick = processSalesBulk;
  if (document.getElementById('btn-clear-belanja')) document.getElementById('btn-clear-belanja').onclick = () => openModal('Kosongkan?', 'Hapus semua list?', () => { db.set(K.sess, []); renderBelanja(); });
  if (document.getElementById('btn-copy-wa')) document.getElementById('btn-copy-wa').onclick = () => {
    if(!_sess.length) return toast('Kosong', 'e');
    let t = `🛒 *BELANJA*\n${utils.fmtDate()}\n\n`;
    const g = {}; _sess.forEach(i => { (g[i.category] = g[i.category] || []).push(i); });
    Object.entries(g).forEach(([c, items]) => { t += `*[${c}]*\n`; items.forEach(i => { t += `• ${i.matched_name} — ${i.qty} ${i.unit}\n`; }); t += '\n'; });
    copyText(t);
  };

  switchTab('belanja');
}

document.addEventListener('DOMContentLoaded', initApp);
