/* ===============================
CORE + STORAGE
=============================== */

const K = {
cats:  ‘categories’,
mi:    ‘master_items’,
mm:    ‘master_menu’,
pr:    ‘purchase_requests’,
rv:    ‘purchase_realization’,
sr:    ‘sales_reports’,
ui:    ‘unknown_items’,
um:    ‘unknown_menu’,
sess:  ‘session_belanja’,
stats: ‘usage_stats’,
favs:  ‘favorites’,
tpl:   ‘templates’
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
return (s || ‘’).toLowerCase().trim().replace(/\s+/g, ’ ’);
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
return ’Rp ’ + Number(n || 0).toLocaleString(‘id-ID’);
}

function fmtDate(d = new Date()) {
return d.toLocaleDateString(‘id-ID’, {
weekday: ‘short’,
day:     ‘numeric’,
month:   ‘short’
});
}

function esc(s) {
const d = document.createElement(‘div’);
d.textContent = s || ‘’;
return d.innerHTML;
}

/* ===============================
SAFE HELPERS
=============================== */

function safeArr(v) {
return Array.isArray(v) ? v : [];
}

function clone(obj) {
return JSON.parse(JSON.stringify(obj));
}

/* ===============================
TOAST  (FIX: was missing)
=============================== */

function toast(msg, type = ‘s’) {
const wrap = document.getElementById(‘toasts’);
if (!wrap) return;

const el = document.createElement(‘div’);
el.className = ‘toast’;

const colors = {
s: ‘var(–acc)’,
e: ‘var(–red)’,
w: ‘var(–amber)’
};

el.style.borderLeft = `3px solid ${colors[type] || colors.s}`;
el.textContent = msg;

wrap.appendChild(el);

setTimeout(() => el.remove(), 2800);
}

/* ===============================
MODAL  (FIX: was missing)
=============================== */

let _modalCb = null;

function openModal(title, msg, onOk) {
_modalCb = onOk;

const mov  = document.getElementById(‘mov’);
const mt   = document.getElementById(‘m-t’);
const mm   = document.getElementById(‘m-m’);

if (!mov || !mt || !mm) return;

mt.textContent = title;
mm.textContent = msg;

mov.classList.add(‘open’);
}

function closeModal() {
const mov = document.getElementById(‘mov’);
if (mov) mov.classList.remove(‘open’);
_modalCb = null;
}

/* ===============================
DARK MODE  (FIX: was missing)
=============================== */

function initDark() {
const btn  = document.getElementById(‘dkbtn’);
const root = document.documentElement;

const saved = localStorage.getItem(‘ds_dark’);

/* Default: dark mode ON (no attribute) */
if (saved === ‘light’) {
root.setAttribute(‘data-light’, ‘’);
if (btn) btn.textContent = ‘☀️’;
} else {
root.removeAttribute(‘data-light’);
if (btn) btn.textContent = ‘🌙’;
}

if (!btn) return;

btn.addEventListener(‘click’, () => {
const isLight = root.hasAttribute(‘data-light’);

```
if (isLight) {
  root.removeAttribute('data-light');
  localStorage.setItem('ds_dark', 'dark');
  btn.textContent = '🌙';
} else {
  root.setAttribute('data-light', '');
  localStorage.setItem('ds_dark', 'light');
  btn.textContent = '☀️';
}
```

});
}

/* ===============================
TAB NAVIGATION  (FIX: was missing)
=============================== */

let _activeTab = ‘belanja’;

function switchTab(name) {
/* hide all */
document.querySelectorAll(’.tab’).forEach(t => t.classList.remove(‘active’));
document.querySelectorAll(’.nb’).forEach(b => b.classList.remove(‘active’));

/* show target */
const tab = document.getElementById(‘tab-’ + name);
const btn = document.querySelector(`.nb[data-tab="${name}"]`);

if (tab) tab.classList.add(‘active’);
if (btn) btn.classList.add(‘active’);

_activeTab = name;

/* trigger renders */
const renders = {
belanja:    renderBelanja,
validasi:   renderValidasi,
penjualan:  renderPenjualan,
dashboard:  renderDashboard,
admin:      renderAdmin
};

if (renders[name]) renders[name]();
}

/* ===============================
GLOBAL EVENT BINDING  (FIX: was missing)
=============================== */

function bindGlobalEvents() {
/* Tab nav */
document.querySelectorAll(’.nb’).forEach(btn => {
btn.addEventListener(‘click’, () => switchTab(btn.dataset.tab));
});

/* Modal buttons */
document.getElementById(‘m-ok’)?.addEventListener(‘click’, () => {
if (typeof _modalCb === ‘function’) _modalCb();
closeModal();
});

document.getElementById(‘m-cancel’)?.addEventListener(‘click’, closeModal);

/* Close modal on backdrop click */
document.getElementById(‘mov’)?.addEventListener(‘click’, e => {
if (e.target.id === ‘mov’) closeModal();
});

/* Dashboard chips */
document.querySelectorAll(’[data-dash]’).forEach(chip => {
chip.addEventListener(‘click’, () => {
document.querySelectorAll(’[data-dash]’).forEach(c => c.classList.remove(‘active’));
chip.classList.add(‘active’);
_dashF = chip.dataset.dash;
renderDashboard();
});
});
}

/* ===============================
CLIPBOARD
=============================== */

function copyText(text) {
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(text)
.then(()  => toast(‘Disalin ke clipboard’))
.catch(() => fallbackCopy(text));
} else {
fallbackCopy(text);
}
}

function fallbackCopy(text) {
const ta = document.createElement(‘textarea’);
ta.value = text;
ta.style.position = ‘fixed’;
ta.style.opacity  = ‘0’;
document.body.appendChild(ta);
ta.focus();
ta.select();
try {
document.execCommand(‘copy’);
toast(‘Disalin (fallback)’);
} catch {
toast(‘Gagal copy’, ‘e’);
}
document.body.removeChild(ta);
}

/* ===============================
STATS
=============================== */

function trackUsage(type, name) {
const s   = db.get(K.stats, {});
const key = type + ‘:’ + norm(name);
s[key]    = (s[key] || 0) + 1;
db.set(K.stats, s);
}

function getTop(type, n = 8) {
const s = db.get(K.stats, {});
return Object.entries(s)
.filter(([k]) => k.startsWith(type + ‘:’))
.map(([k, v]) => ({ name: k.split(’:’).slice(1).join(’:’), count: v }))
.sort((a, b) => b.count - a.count)
.slice(0, n);
}

function updateFavs() {
db.set(K.favs, getTop(‘item’, 10).map(t => t.name));
}

/* ===============================
SEED
=============================== */

function seed() {
if (!localStorage.getItem(K.cats)) {
db.set(K.cats, [
‘Protein’, ‘Sayur’, ‘Bumbu’, ‘Minyak & Santan’,
‘Bahan Kering’, ‘Buah’, ‘Minuman’, ‘Lainnya’
]);
}

if (!localStorage.getItem(K.mi)) {
db.set(K.mi, [
{ id: uid(), name: ‘ayam dada’,    category: ‘Protein’,       aliases: [‘dada ayam’, ‘ayam’, ‘chicken’] },
{ id: uid(), name: ‘daging sapi’,  category: ‘Protein’,       aliases: [‘sapi’, ‘beef’] },
{ id: uid(), name: ‘telur ayam’,   category: ‘Protein’,       aliases: [‘telur’, ‘telor’, ‘egg’] },
{ id: uid(), name: ‘ikan lele’,    category: ‘Protein’,       aliases: [‘lele’] },
{ id: uid(), name: ‘cabai merah’,  category: ‘Sayur’,         aliases: [‘cabe merah’, ‘cabai’, ‘cabe’] },
{ id: uid(), name: ‘cabai rawit’,  category: ‘Sayur’,         aliases: [‘rawit’, ‘cabe rawit’] },
{ id: uid(), name: ‘tomat’,        category: ‘Sayur’,         aliases: [‘tomato’] },
{ id: uid(), name: ‘kangkung’,     category: ‘Sayur’,         aliases: [] },
{ id: uid(), name: ‘bawang merah’, category: ‘Bumbu’,         aliases: [‘bawang’, ‘shallot’] },
{ id: uid(), name: ‘bawang putih’, category: ‘Bumbu’,         aliases: [‘garlic’] },
{ id: uid(), name: ‘jahe’,         category: ‘Bumbu’,         aliases: [‘ginger’] },
{ id: uid(), name: ‘kunyit’,       category: ‘Bumbu’,         aliases: [‘turmeric’] },
{ id: uid(), name: ‘minyak goreng’,category: ‘Minyak & Santan’, aliases: [‘minyak’, ‘oil’] },
{ id: uid(), name: ‘santan’,       category: ‘Minyak & Santan’, aliases: [‘santen’] },
{ id: uid(), name: ‘beras’,        category: ‘Bahan Kering’,  aliases: [‘nasi’, ‘rice’] },
{ id: uid(), name: ‘gula pasir’,   category: ‘Bahan Kering’,  aliases: [‘gula’, ‘sugar’] },
{ id: uid(), name: ‘garam’,        category: ‘Bahan Kering’,  aliases: [‘salt’] }
]);
}

if (!localStorage.getItem(K.mm)) {
db.set(K.mm, [
{ id: uid(), name: ‘nasi goreng’, aliases: [‘nasgor’] },
{ id: uid(), name: ‘ayam bakar’,  aliases: [‘ayam panggang’] },
{ id: uid(), name: ‘ayam goreng’, aliases: [] },
{ id: uid(), name: ‘es teh’,      aliases: [‘teh es’] },
{ id: uid(), name: ‘soto ayam’,   aliases: [‘soto’] },
{ id: uid(), name: ‘nasi putih’,  aliases: [‘nasi’] }
]);
}

if (!localStorage.getItem(K.stats)) db.set(K.stats, {});
if (!localStorage.getItem(K.favs))  db.set(K.favs, []);
}

/* ===============================
MATCHING ENGINE
=============================== */

function matchItem(raw) {
const items = safeArr(db.get(K.mi));
const q     = norm(raw);
if (!q) return null;

return items.find(i => norm(i.name) === q)
|| items.find(i => (i.aliases || []).some(a => norm(a) === q))
|| items.find(i => norm(i.name).includes(q) || q.includes(norm(i.name)))
|| items.find(i => (i.aliases || []).some(a => norm(a).includes(q)))
|| null;
}

function matchMenu(raw) {
const menus = safeArr(db.get(K.mm));
const q     = norm(raw);
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

function normUnit(u) {
u = norm(u);
const map = {
kg: ‘kg’, kilo: ‘kg’, kilogram: ‘kg’,
gr: ‘g’,  gram: ‘g’,
pcs: ‘pcs’, biji: ‘pcs’, buah: ‘pcs’,
l: ‘l’, liter: ‘l’
};
return map[u] || u || ‘pcs’;
}

/* ===============================
PARSER
=============================== */

function parseLine(line) {
line = line.trim();
if (!line) return null;

/* Format: nama qty satuan  — e.g. “ayam dada 5 kg” */
const match = line.match(/^(.+?)\s+([\d.,]+)\s*([a-zA-Z]*)$/);

if (!match) {
return { raw: line, name: line, qty: 1, unit: ‘pcs’, err: ‘format tidak dikenal’ };
}

return {
raw:  line,
name: norm(match[1]),
qty:  parseFloat(match[2].replace(’,’, ‘.’)) || 1,
unit: normUnit(match[3])
};
}

function parseSaleLine(line) {
line = line.trim();
if (!line) return null;

/* FIX: parse from right to avoid name-with-spaces issues
Format: nama qty revenue  — e.g. “nasi goreng 10 250000” */
const match = line.match(/^(.+?)\s+(\d+)\s+([\d.,]+)$/);

if (!match) {
return { raw: line, err: ‘format salah (nama qty revenue)’ };
}

const qty     = parseInt(match[2]);
const revenue = parseFloat(match[3].replace(/./g, ‘’).replace(’,’, ‘.’));

if (isNaN(qty) || isNaN(revenue)) {
return { raw: line, err: ‘qty/revenue invalid’ };
}

return { raw: line, name: norm(match[1]), qty, revenue };
}

/* ===============================
UNKNOWN HANDLER
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
BELANJA MODULE
=============================== */

let _sess    = [];
let _favOpen = true;

function groupByCat(items) {
const g = {};
items.forEach(it => {
const c = it.category || ‘Lainnya’;
if (!g[c]) g[c] = [];
g[c].push(it);
});
return g;
}

/* AUTO MERGE: gabung item yang sama nama+unit */
function mergeItems(arr) {
const map = {};
arr.forEach(it => {
const key = norm(it.matched_name) + ‘|’ + it.unit;
if (!map[key]) {
map[key] = { …it };
} else {
map[key].qty = Math.round((map[key].qty + it.qty) * 1000) / 1000;
}
});
return Object.values(map);
}

/* PREVIEW */
function previewBelanja(text) {
const prev = document.getElementById(‘pp-b’);
if (!prev) return;

const lines = text.split(’\n’).filter(l => l.trim());

if (!lines.length) {
prev.classList.remove(‘show’);
return;
}

let html = ‘’;

lines.forEach(line => {
const p = parseLine(line);
if (!p) return;

```
if (p.err) {
  html += `<div class="ppr" style="color:var(--red)">✕ ${esc(line)}</div>`;
  return;
}

const m = matchItem(p.name);
html += m
  ? `<div class="ppr" style="color:var(--acc)">✓ ${esc(m.name)} <span style="color:var(--text3)">(${esc(m.category)})</span> ${p.qty} ${p.unit}</div>`
  : `<div class="ppr" style="color:var(--amber)">? ${esc(p.name)} ${p.qty} ${p.unit}</div>`;
```

});

prev.innerHTML = html;
prev.classList.add(‘show’);
}

/* PROCESS BULK */
function processBulk() {
const ta = document.getElementById(‘bulk-inp’);
if (!ta) return;

const lines = ta.value.split(’\n’).filter(l => l.trim());

if (!lines.length) {
toast(‘Input kosong’, ‘e’);
return;
}

let added = 0;

lines.forEach(line => {
const p = parseLine(line);
if (!p || p.err) return;

```
const m = matchItem(p.name);

_sess.push({
  id:           uid(),
  raw_name:     p.name,
  matched_name: m ? m.name : p.name,
  category:     m ? m.category : 'Lainnya',
  is_unknown:   !m,
  qty:          p.qty,
  unit:         p.unit,
  date:         today()
});

trackUsage('item', m ? m.name : p.name);
if (!m) addUnkItem(p.name);

added++;
```

});

if (!added) {
toast(‘Tidak ada item valid’, ‘w’);
return;
}

_sess = mergeItems(_sess);
db.set(K.sess, _sess);

ta.value = ‘’;
const ppb = document.getElementById(‘pp-b’);
if (ppb) ppb.classList.remove(‘show’);

updateFavs();
renderBelanja();

toast(`${added} item ditambahkan`);
}

/* FAVORITES */
function toggleFav() {
_favOpen = !_favOpen;
const btn = document.getElementById(‘toggle-fav’);
if (btn) btn.textContent = _favOpen ? ‘Sembunyikan’ : ‘Tampilkan’;
renderBelanja();
}

function addFavItem(name) {
const m = matchItem(name);

_sess.push({
id:           uid(),
raw_name:     name,
matched_name: m ? m.name : name,
category:     m ? m.category : ‘Lainnya’,
is_unknown:   !m,
qty:          1,
unit:         ‘pcs’,
date:         today()
});

_sess = mergeItems(_sess);
db.set(K.sess, _sess);

trackUsage(‘item’, m ? m.name : name);
renderBelanja();
toast(`${name} ditambahkan`);
}

/* DELETE */
function delItem(id) {
_sess = _sess.filter(i => i.id !== id);
db.set(K.sess, _sess);
renderBelanja();
}

/* CLEAR */
function clearBelanja() {
openModal(‘Kosongkan list?’, ‘Semua item belanja akan dihapus.’, () => {
_sess = [];
db.set(K.sess, []);
renderBelanja();
toast(‘List dikosongkan’, ‘w’);
});
}

/* TEMPLATE */
function saveTpl() {
const current = safeArr(db.get(K.sess));

if (!current.length) {
toast(‘Tidak ada data untuk disimpan’, ‘e’);
return;
}

const tpl = safeArr(db.get(K.tpl));
const ts  = new Date().toLocaleString(‘id-ID’, { day: ‘numeric’, month: ‘short’, hour: ‘2-digit’, minute: ‘2-digit’ });

tpl.push({ id: uid(), label: ts, items: clone(current) });

if (tpl.length > 7) tpl.shift();

db.set(K.tpl, tpl);
toast(‘Template disimpan ✓’);
}

function loadTpl() {
const tpl = safeArr(db.get(K.tpl));

if (!tpl.length) {
toast(‘Belum ada template’, ‘w’);
return;
}

const last = tpl[tpl.length - 1];
const text = safeArr(last.items)
.map(i => `${i.matched_name} ${i.qty} ${i.unit}`)
.join(’\n’);

const ta = document.getElementById(‘bulk-inp’);
if (ta) {
ta.value = text;
previewBelanja(text);
}

toast(`Template "${last.label || 'terakhir'}" dimuat`);
}

/* COPY WA */
function copyWA() {
const current = safeArr(db.get(K.sess));

if (!current.length) {
toast(‘List kosong’, ‘e’);
return;
}

const g = groupByCat(current);

let text = `🛒 *BELANJA DOLAN SAWAH*\n${fmtDate()}\n\n`;

Object.entries(g).forEach(([cat, items]) => {
text += `*[${cat}]*\n`;
items.forEach(it => {
text += `• ${it.matched_name} — ${it.qty} ${it.unit}\n`;
});
text += ‘\n’;
});

/* Simpan ke purchase_requests */
const prs = safeArr(db.get(K.pr));
prs.push({ id: uid(), date: today(), items: clone(current) });
db.set(K.pr, prs);

copyText(text);
}

/* RENDER BELANJA */
function renderBelanja() {
const dateEl = document.getElementById(‘b-date’);
if (dateEl) dateEl.textContent = fmtDate();

_sess = safeArr(db.get(K.sess));

const wrap   = document.getElementById(‘b-list’);
const act    = document.getElementById(‘b-act’);
const favSec = document.getElementById(‘fav-sec’);
const favGrid= document.getElementById(‘fav-grid’);
const togBtn = document.getElementById(‘toggle-fav’);

if (!wrap || !act) return;

/* Favorites */
const favs = safeArr(db.get(K.favs));

if (favs.length && favSec && favGrid) {
favSec.style.display = ‘block’;
if (togBtn) togBtn.textContent = _favOpen ? ‘Sembunyikan’ : ‘Tampilkan’;

```
favGrid.innerHTML = _favOpen
  ? favs.map(f => `<button class="fav-btn" data-fav="${esc(f)}">${esc(f)}</button>`).join('')
  : '';

favGrid.querySelectorAll('[data-fav]').forEach(btn => {
  btn.addEventListener('click', () => addFavItem(btn.dataset.fav));
});
```

} else if (favSec) {
favSec.style.display = ‘none’;
}

/* Empty state */
if (!_sess.length) {
wrap.innerHTML = `<div class="empty"><div class="empty-i">🛒</div><p>Belum ada item. Gunakan input cepat di atas.</p></div>`;
act.style.display = ‘none’;
return;
}

/* List */
const g   = groupByCat(_sess);
let   html = `<div class="card">`;

Object.entries(g).forEach(([cat, items]) => {
html += `<div style="padding:6px 8px 4px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text3);font-family:var(--mono)">${esc(cat)}</div>`;

```
items.forEach(it => {
  const unkBadge = it.is_unknown
    ? `<span style="font-size:9px;color:var(--amber);margin-left:4px">●</span>`
    : '';

  html += `
    <div class="ir">
      <div style="flex:1">${esc(it.matched_name)}${unkBadge}</div>
      <span style="font-family:var(--mono);font-size:13px">${it.qty} ${it.unit}</span>
      <button data-del="${it.id}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:2px 6px">✕</button>
    </div>`;
});
```

});

html += `</div>`;

wrap.innerHTML  = html;
act.style.display = ‘block’;

wrap.querySelectorAll(’[data-del]’).forEach(btn => {
btn.addEventListener(‘click’, () => delItem(btn.dataset.del));
});
}

/* BIND BELANJA */
function bindBelanjaEvents() {
document.getElementById(‘bulk-inp’)
?.addEventListener(‘input’, e => previewBelanja(e.target.value));

document.getElementById(‘btn-process-bulk’)
?.addEventListener(‘click’, processBulk);

document.getElementById(‘btn-load-tpl’)
?.addEventListener(‘click’, loadTpl);

document.getElementById(‘btn-save-tpl’)
?.addEventListener(‘click’, saveTpl);

document.getElementById(‘btn-copy-wa’)
?.addEventListener(‘click’, copyWA);

document.getElementById(‘btn-clear-belanja’)
?.addEventListener(‘click’, clearBelanja);

document.getElementById(‘toggle-fav’)
?.addEventListener(‘click’, toggleFav);
}

/* ===============================
PENJUALAN MODULE
=============================== */

function previewSales(text) {
const prev = document.getElementById(‘pp-p’);
if (!prev) return;

const lines = text.split(’\n’).filter(l => l.trim());

if (!lines.length) {
prev.classList.remove(‘show’);
return;
}

let html = ‘’;

lines.forEach(line => {
const p = parseSaleLine(line);
if (!p) return;

```
if (p.err) {
  html += `<div class="ppr" style="color:var(--red)">✕ ${esc(line)} <span style="opacity:.6">(${p.err})</span></div>`;
  return;
}

const m = matchMenu(p.name);
html += m
  ? `<div class="ppr" style="color:var(--acc)">✓ ${esc(m.name)} × ${p.qty} = ${fmtRp(p.revenue)}</div>`
  : `<div class="ppr" style="color:var(--amber)">? ${esc(p.name)} × ${p.qty} = ${fmtRp(p.revenue)}</div>`;
```

});

prev.innerHTML = html;
prev.classList.add(‘show’);
}

function processSalesBulk() {
const ta = document.getElementById(‘p-bulk’);
if (!ta) return;

const lines = ta.value.split(’\n’).filter(l => l.trim());

if (!lines.length) {
toast(‘Input kosong’, ‘e’);
return;
}

const arr   = safeArr(db.get(K.sr));
let   added = 0;

lines.forEach(line => {
const p = parseSaleLine(line);
if (!p || p.err) return;

```
const m = matchMenu(p.name);

arr.push({
  id:           uid(),
  raw_menu:     p.name,
  matched_menu: m ? m.name : p.name,
  is_unknown:   !m,
  qty:          p.qty,
  revenue:      p.revenue,
  date:         today()
});

trackUsage('menu', m ? m.name : p.name);
if (!m) addUnkMenu(p.name);

added++;
```

});

db.set(K.sr, arr);

ta.value = ‘’;
document.getElementById(‘pp-p’)?.classList.remove(‘show’);

toast(added ? `${added} penjualan ditambahkan` : ‘Tidak ada data valid’, added ? ‘s’ : ‘w’);

renderPenjualan();
}

function renderPenjualan() {
const dateEl = document.getElementById(‘p-date’);
if (dateEl) dateEl.textContent = fmtDate();

const sales  = safeArr(db.get(K.sr)).filter(s => s.date === today());
const listEl = document.getElementById(‘p-list’);
const sum    = document.getElementById(‘p-sum’);

if (!listEl || !sum) return;

if (!sales.length) {
listEl.innerHTML = `<div class="empty"><div class="empty-i">💰</div><p>Belum ada penjualan hari ini</p></div>`;
sum.style.display = ‘none’;
return;
}

const totalQty = sales.reduce((s, r) => s + (r.qty     || 0), 0);
const totalRev = sales.reduce((s, r) => s + (r.revenue || 0), 0);

document.getElementById(‘p-tq’).textContent = totalQty;
document.getElementById(‘p-tr’).textContent = fmtRp(totalRev);
sum.style.display = ‘block’;

/* Aggregate by menu */
const map = {};
sales.forEach(s => {
const key = s.matched_menu;
if (!map[key]) map[key] = { name: key, qty: 0, rev: 0, unk: s.is_unknown };
map[key].qty += s.qty;
map[key].rev += s.revenue;
});

let html = `<div class="card">`;

Object.values(map)
.sort((a, b) => b.rev - a.rev)
.forEach(m => {
const unkBadge = m.unk
? `<span style="font-size:9px;color:var(--amber);margin-left:4px">●</span>`
: ‘’;

```
  html += `
    <div class="sr">
      <div style="flex:1">
        <div>${esc(m.name)}${unkBadge}</div>
        <div style="font-size:11px;color:var(--text3)">${m.qty} porsi</div>
      </div>
      <div style="font-family:var(--mono);font-weight:700">${fmtRp(m.rev)}</div>
    </div>`;
});
```

html += `</div>`;
listEl.innerHTML = html;
}

function bindPenjualanEvents() {
document.getElementById(‘p-bulk’)
?.addEventListener(‘input’, e => previewSales(e.target.value));

document.getElementById(‘btn-process-sales’)
?.addEventListener(‘click’, processSalesBulk);
}

/* ===============================
DASHBOARD MODULE
=============================== */

let _dashF = ‘today’;   /* FIX: was missing, caused ReferenceError */

function getDates() {
if (_dashF === ‘today’)     return [today()];
if (_dashF === ‘yesterday’) return [yest()];

const arr = [];
for (let i = 0; i < 7; i++) {
const d = new Date();
d.setDate(d.getDate() - i);
arr.push(d.toISOString().slice(0, 10));
}
return arr;
}

function renderDashboard() {
const dates = getDates();
const dash  = document.getElementById(‘dash’);
if (!dash) return;

const sales = safeArr(db.get(K.sr)).filter(s => dates.includes(s.date));
const prs   = safeArr(db.get(K.pr)).filter(p => dates.includes(p.date));

const totalRev   = sales.reduce((s, r) => s + (r.revenue || 0), 0);
const totalQty   = sales.reduce((s, r) => s + (r.qty     || 0), 0);
const totalItems = prs.flatMap(p => safeArr(p.items)).length;

/* Top menu */
const menuMap = {};
sales.forEach(s => {
const key = s.matched_menu;
if (!menuMap[key]) menuMap[key] = { name: key, qty: 0, rev: 0 };
menuMap[key].qty += s.qty;
menuMap[key].rev += s.revenue;
});
const topMenus = Object.values(menuMap).sort((a, b) => b.rev - a.rev).slice(0, 5);

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

```
<div class="card">
  <div class="ct">Belanja</div>
  <div class="sg">
    <div>
      <div class="sl">Purchase Order</div>
      <div class="sv">${prs.length}</div>
    </div>
    <div>
      <div class="sl">Total Item</div>
      <div class="sv">${totalItems}</div>
    </div>
  </div>
</div>`;
```

if (topMenus.length) {
html += `<div class="card"><div class="ct">Top Menu</div>`;
topMenus.forEach((m, i) => {
html += ` <div class="sr"> <div style="color:var(--text3);font-family:var(--mono);font-size:11px;width:18px">${i + 1}</div> <div style="flex:1">${esc(m.name)}</div> <div style="font-size:11px;color:var(--text3)">${m.qty}×</div> <div style="font-family:var(--mono);font-size:12px">${fmtRp(m.rev)}</div> </div>`;
});
html += `</div>`;
} else {
html += `<div class="empty"><div class="empty-i">📊</div><p>Belum ada data penjualan</p></div>`;
}

dash.innerHTML = html;
}

/* ===============================
VALIDASI MODULE
=============================== */

let _vFilter = ‘all’;

function renderValidasi() {
const dateEl  = document.getElementById(‘v-date’);
if (dateEl) dateEl.textContent = fmtDate();

const prs    = safeArr(db.get(K.pr));
const rv     = safeArr(db.get(K.rv));
const latest = prs[prs.length - 1];

const content = document.getElementById(‘v-content’);
const vbar    = document.getElementById(‘v-bar’);

if (!content || !vbar) return;

if (!latest || !latest.items || !latest.items.length) {
content.innerHTML = `<div class="empty"><div class="empty-i">✅</div><p>Belum ada data belanja</p></div>`;
vbar.style.display = ‘none’;
return;
}

vbar.style.display = ‘block’;

/* Load realization for this PR */
const prRv = rv.find(r => r.pr_id === latest.id) || { items: [] };

let items = latest.items.map(it => {
const real = safeArr(prRv.items).find(r => norm(r.matched_name) === norm(it.matched_name));
const realQty = real ? real.qty : null;
const diff    = realQty !== null ? realQty - it.qty : null;

```
return { ...it, realQty, diff, status: realQty === null ? 'pending' : (diff === 0 ? 'ok' : 'diff') };
```

});

/* Filter */
if (_vFilter === ‘diff’)    items = items.filter(i => i.status === ‘diff’);
else if (_vFilter === ‘ok’) items = items.filter(i => i.status === ‘ok’);

/* Render chips */
document.querySelectorAll(’#v-chips .chip’).forEach(c => {
c.classList.toggle(‘active’, c.dataset.filter === _vFilter);
});

if (!items.length) {
content.innerHTML = `<div class="empty"><p>Tidak ada item di filter ini</p></div>`;
return;
}

let html = ‘’;

items.forEach(it => {
const statusColor = it.status === ‘ok’ ? ‘var(–acc)’ : it.status === ‘diff’ ? ‘var(–red)’ : ‘var(–text3)’;
const statusIcon  = it.status === ‘ok’ ? ‘✓’ : it.status === ‘diff’ ? ‘!’ : ‘–’;
const diffLabel   = it.diff !== null
? `<span style="color:${it.diff === 0 ? 'var(--acc)' : 'var(--red)'};font-size:11px"> ${it.diff > 0 ? '+' : ''}${it.diff} ${it.unit} </span>`
: `<span style="color:var(--text3);font-size:11px">belum dicek</span>`;

```
html += `
  <div class="card" style="margin-bottom:8px">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:22px;height:22px;border-radius:50%;background:${statusColor}22;color:${statusColor};
                  display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">
        ${statusIcon}
      </div>
      <div style="flex:1">
        <div style="font-weight:700">${esc(it.matched_name)}</div>
        <div style="font-size:11px;color:var(--text3)">Order: ${it.qty} ${it.unit}</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--mono);font-size:13px">${it.realQty !== null ? it.realQty + ' ' + it.unit : '–'}</div>
        ${diffLabel}
      </div>
    </div>
  </div>`;
```

});

content.innerHTML = html;
}

function allOk() {
const prs    = safeArr(db.get(K.pr));
const latest = prs[prs.length - 1];
if (!latest) return;

const rv   = safeArr(db.get(K.rv));
const idx  = rv.findIndex(r => r.pr_id === latest.id);
const entry = {
id:     uid(),
pr_id:  latest.id,
date:   today(),
items:  latest.items.map(it => ({ …it, realQty: it.qty, diff: 0 }))
};

if (idx >= 0) rv[idx] = entry;
else rv.push(entry);

db.set(K.rv, rv);
toast(‘Semua item ditandai sesuai ✓’);
renderValidasi();
}

function saveValidasi() {
toast(‘Validasi disimpan ✓’);
renderValidasi();
}

function bindValidasiEvents() {
document.getElementById(‘btn-all-ok’)
?.addEventListener(‘click’, allOk);

document.getElementById(‘btn-save-validasi’)
?.addEventListener(‘click’, saveValidasi);

/* Filter chips */
document.querySelectorAll(’#v-chips .chip’).forEach(chip => {
chip.addEventListener(‘click’, () => {
_vFilter = chip.dataset.filter;
renderValidasi();
});
});
}

/* ===============================
ADMIN MODULE
=============================== */

function renderAdmin() {
renderCats();
}

function renderCats() {
const cats = safeArr(db.get(K.cats));
const el   = document.getElementById(‘cat-tags’);
if (!el) return;

if (!cats.length) {
el.innerHTML = `<div class="empty"><p>Belum ada kategori</p></div>`;
return;
}

el.innerHTML = cats.map((c, i) => `<span class="tag"> ${esc(c)} <button type="button" data-del-cat="${i}" title="Hapus kategori">✕</button> </span>`).join(’’);

el.querySelectorAll(’[data-del-cat]’).forEach(btn => {
btn.addEventListener(‘click’, () => delCat(Number(btn.dataset.delCat)));
});
}

function addCat() {
const inp = document.getElementById(‘new-cat’);
if (!inp) return;

const name = inp.value.trim();
if (!name) { toast(‘Nama kosong’, ‘e’); return; }

const cats = safeArr(db.get(K.cats));
if (cats.map(norm).includes(norm(name))) { toast(‘Sudah ada’, ‘w’); return; }

cats.push(name);
db.set(K.cats, cats);
inp.value = ‘’;
renderCats();
toast(`Kategori "${name}" ditambahkan`);
}

function delCat(i) {
const cats = safeArr(db.get(K.cats));
if (cats[i] === undefined) return;

openModal(‘Hapus Kategori?’, `"${cats[i]}" akan dihapus.`, () => {
cats.splice(i, 1);
db.set(K.cats, cats);
renderCats();
toast(‘Kategori dihapus’, ‘w’);
});
}

/* ===============================
INIT APP
=============================== */

function initApp() {
seed();
initDark();
bindGlobalEvents();
bindBelanjaEvents();
bindPenjualanEvents();
bindValidasiEvents();

/* Admin */
document.getElementById(‘btn-add-cat’)
?.addEventListener(‘click’, addCat);

/* Enter key on admin cat input */
document.getElementById(‘new-cat’)
?.addEventListener(‘keydown’, e => { if (e.key === ‘Enter’) addCat(); });

/* Initial render */
renderBelanja();
}

document.addEventListener(‘DOMContentLoaded’, initApp);