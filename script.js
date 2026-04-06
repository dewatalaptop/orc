/* ================================================
   DOLAN SAWAH OPS v3 – CORE FOUNDATION
   ================================================ */

// ================= GLOBAL ERROR HANDLER =================
window.onerror = function(message, source, lineno, colno, error) {
  console.log('ERROR:', message, 'LINE:', lineno);

  const box = document.getElementById('err-box');
  const content = document.getElementById('err-content');
  const stack = document.getElementById('err-stack');

  if (box && content) {
    content.textContent = `ERROR: ${message}\nLINE: ${lineno}:${colno}`;
    if (stack && error?.stack) stack.textContent = error.stack;
    box.style.display = 'block';
  }
};

// ================= COPY ERROR =================
window.copyError = function(){
  const text = document.getElementById('err-content')?.textContent;
  if (!text) return;
  copyText(text);
};

// ================= STORAGE KEYS =================
const K = {
  cats: 'categories',
  items: 'master_items',
  menu: 'master_menu',
  sess: 'session_belanja',
  sales: 'sales_reports',
  favs: 'favorites'
};

// ================= STORAGE =================
const db = {
  get(key, def = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : def;
    } catch {
      return def;
    }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

// ================= UTILS =================
let _timers = {};

const utils = {
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2,5),

  norm: (s) => (s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '),

  today: () => new Date().toISOString().slice(0,10),

  fmtRp: (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID'),

  esc: (s) => {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  },

  safeArr: (v) => Array.isArray(v) ? v : [],

  debounce: (id, cb, ms=300) => {
    clearTimeout(_timers[id]);
    _timers[id] = setTimeout(cb, ms);
  }
};

// ================= DEFAULT DATA =================
function seed(){
  if(!localStorage.getItem(K.cats)){
    db.set(K.cats, ['Protein','Sayur','Bumbu','Lainnya']);
  }

  if(!localStorage.getItem(K.items)){
    db.set(K.items, [
      { name:'ayam dada', category:'Protein', aliases:['ayam'] },
      { name:'telur', category:'Protein' },
      { name:'cabai merah', category:'Sayur' }
    ]);
  }

  if(!localStorage.getItem(K.favs)){
    db.set(K.favs, ['ayam dada','telur']);
  }
}
/* ================================================
   PART 2 – PARSER + MATCHER + ENGINE
   ================================================ */

// ================= UNIT NORMALIZATION =================
const UNIT_MAP = {
  kg: { base: 'kg', factor: 1 },
  kilo: { base: 'kg', factor: 1 },
  g: { base: 'kg', factor: 0.001 },
  gram: { base: 'kg', factor: 0.001 },

  l: { base: 'l', factor: 1 },
  liter: { base: 'l', factor: 1 },
  ml: { base: 'l', factor: 0.001 },

  pcs: { base: 'pcs', factor: 1 },
  biji: { base: 'pcs', factor: 1 },
  buah: { base: 'pcs', factor: 1 }
};

// ================= ENGINE =================
const engine = {

  normUnit(unit){
    return UNIT_MAP[utils.norm(unit)]?.base || 'pcs';
  },

  toBase(qty, unit){
    const info = UNIT_MAP[utils.norm(unit)];
    if(!info) return { qty, unit: unit || 'pcs' };

    return {
      qty: Math.round(qty * info.factor * 100000) / 100000,
      unit: info.base
    };
  },

  // 🔥 SUPER STABLE MERGE
  mergeItems(arr){
    const map = {};

    arr.forEach(it => {

      // fallback aman
      const name = it.matched_name || it.raw_name || 'unknown';
      const unit = it.unit || 'pcs';
      const qty = Number(it.qty) || 0;

      const conv = engine.toBase(qty, unit);
      const key = utils.norm(name) + '|' + conv.unit;

      if(!map[key]){
        map[key] = {
          id: utils.uid(),
          matched_name: name,
          category: it.category || 'Lainnya',
          qty: conv.qty,
          unit: conv.unit,
          is_unknown: it.is_unknown || false
        };
      } else {
        map[key].qty += conv.qty;
      }
    });

    return Object.values(map).sort((a,b) =>
      (a.matched_name || '').localeCompare(b.matched_name || '')
    );
  }
};

// ================= PARSER =================
const parser = {

  // belanja
  line(text){
    text = (text || '').trim();
    if(!text) return null;

    const m = text.match(/^(.+?)\s+([\d.,]+)\s*([a-zA-Z]*)$/);

    if(!m){
      return {
        raw: text,
        name: text,
        qty: 1,
        unit: 'pcs',
        err: true
      };
    }

    const qty = parseFloat(m[2].replace(',', '.'));

    return {
      raw: text,
      name: utils.norm(m[1]),
      qty: isNaN(qty) ? 1 : qty,
      unit: engine.normUnit(m[3])
    };
  },

  // penjualan
  sale(text){
    text = (text || '').trim();
    if(!text) return null;

    const m = text.match(/^(.+?)\s+(\d+)\s+([\d.,]+)$/);

    if(!m){
      return { raw: text, err: true };
    }

    const qty = parseInt(m[2],10);
    const revenue = parseFloat(m[3].replace(/\./g,'').replace(',','.'));

    if(isNaN(qty) || isNaN(revenue)){
      return { raw: text, err: true };
    }

    return {
      raw: text,
      name: utils.norm(m[1]),
      qty,
      revenue
    };
  }
};

// ================= MATCHER =================
const matcher = {

  item(raw){
    const items = utils.safeArr(db.get(K.items));
    const q = utils.norm(raw);

    if(!q) return null;

    return (
      items.find(i => utils.norm(i.name) === q) ||
      items.find(i => (i.aliases || []).some(a => utils.norm(a) === q)) ||
      items.find(i => utils.norm(i.name).includes(q)) ||
      null
    );
  },

  menu(raw){
    const menus = utils.safeArr(db.get(K.menu));
    const q = utils.norm(raw);

    if(!q) return null;

    return (
      menus.find(m => utils.norm(m.name) === q) ||
      menus.find(m => utils.norm(m.name).includes(q)) ||
      null
    );
  }
};
/* ================================================
   PART 3 – STATE + RENDER BELANJA + ACTIONS
   ================================================ */

// ================= STATE =================
let _sess = [];
let _favOpen = true;

// ================= LOAD STATE =================
function loadSession(){
  _sess = utils.safeArr(db.get(K.sess));
}

// ================= SAVE STATE =================
function saveSession(){
  db.set(K.sess, _sess);
}

// ================= RENDER BELANJA =================
function renderBelanja(){

  loadSession();

  const wrap = document.getElementById('b-list');
  const act = document.getElementById('b-act');
  const favGrid = document.getElementById('fav-grid');

  if(!wrap || !act) return;

  // ================= FAVORITES =================
  const favs = utils.safeArr(db.get(K.favs));

  if(favGrid){
    if(_favOpen){
      favGrid.innerHTML = favs.map(f =>
        `<button class="chip" data-fav="${utils.esc(f)}">${utils.esc(f)}</button>`
      ).join('');
    } else {
      favGrid.innerHTML = '';
    }
  }

  // ================= EMPTY =================
  if(!_sess.length){
    wrap.innerHTML = `
      <div class="empty">
        <div class="empty-i">🛒</div>
        <p>List belanja kosong</p>
      </div>
    `;
    act.style.display = 'none';
    return;
  }

  // ================= GROUP BY CATEGORY =================
  const groups = {};

  _sess.forEach(it => {
    const cat = it.category || 'Lainnya';
    if(!groups[cat]) groups[cat] = [];
    groups[cat].push(it);
  });

  // ================= RENDER LIST =================
  let html = `<div class="card">`;

  Object.entries(groups).forEach(([cat, items]) => {

    html += `<div class="ct">${utils.esc(cat)}</div>`;

    items.forEach(it => {
      html += `
        <div class="ir">
          <div style="flex:1">
            ${utils.esc(it.matched_name || it.raw_name)}
            ${it.is_unknown ? '<span class="dot-unk">●</span>' : ''}
          </div>

          <span class="qty-label">${it.qty} ${it.unit}</span>

          <button class="btn-del" data-del="${it.id}">✕</button>
        </div>
      `;
    });

  });

  html += `</div>`;

  wrap.innerHTML = html;

  act.style.display = 'block';
}

// ================= ACTION: ADD FAVORITE =================
function addFavItem(name){

  const m = matcher.item(name);

  const item = {
    id: utils.uid(),
    raw_name: name,
    matched_name: m ? m.name : name,
    category: m ? m.category : 'Lainnya',
    is_unknown: !m,
    qty: 1,
    unit: 'pcs'
  };

  _sess.push(item);

  _sess = engine.mergeItems(_sess);

  saveSession();
  renderBelanja();

  toast(name + ' ditambahkan');
}

// ================= ACTION: DELETE ITEM =================
function delItem(id){
  _sess = _sess.filter(i => i.id !== id);
  saveSession();
  renderBelanja();
}

// ================= PROCESS BULK =================
function processBulk(){

  const inp = document.getElementById('bulk-inp');
  if(!inp) return;

  const val = inp.value.trim();
  if(!val) return;

  const lines = val.split('\n').filter(l => l.trim());

  lines.forEach(line => {

    const p = parser.line(line);
    if(!p) return;

    const m = matcher.item(p.name);

    _sess.push({
      id: utils.uid(),
      raw_name: p.raw,
      matched_name: m ? m.name : p.name,
      category: m ? m.category : 'Lainnya',
      is_unknown: !m,
      qty: p.qty,
      unit: p.unit
    });

  });

  _sess = engine.mergeItems(_sess);

  saveSession();

  inp.value = '';
  const pp = document.getElementById('pp-b');
if(pp) pp.innerHTML = '';
  renderBelanja();
  toast('List diperbarui');
}
/* ================================================
   PART 4 – EVENT SYSTEM + NAVIGATION + ACTIONS
   ================================================ */

// ================= TOAST =================
function toast(msg, type='s'){
  const wrap = document.getElementById('toasts');
  if(!wrap) return;

  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;

  wrap.appendChild(el);
  setTimeout(()=>el.remove(), 2500);
}
// ================= MODAL ENGINE =================
let _modalCb = null;

window.openModal = function(title, msg, onOk) {
  _modalCb = onOk;

  const mov = document.getElementById('mov');
  const t = document.getElementById('m-t');
  const m = document.getElementById('m-m');

  if(t) t.textContent = title;
  if(m) m.textContent = msg;

  if(mov) mov.classList.add('open');
};

window.closeModal = function() {
  const mov = document.getElementById('mov');
  if(mov) mov.classList.remove('open');

  _modalCb = null;
};
// ================= COPY =================
function copyText(text){
  function copyText(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text)
      .then(()=>toast('Disalin'))
      .catch(()=>fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';

  document.body.appendChild(ta);
  ta.select();

  try{
    document.execCommand('copy');
    toast('Disalin');
  } catch {
    toast('Gagal copy','e');
  }

  document.body.removeChild(ta);
}
    .then(()=>toast('Disalin'))
    .catch(()=>toast('Gagal copy','e'));
}

// ================= CLEAR BELANJA =================
function clearBelanja(){
  openModal('Kosongkan?', 'Hapus semua list?', () => {
    _sess = [];
    saveSession();
    renderBelanja();
    toast('List dikosongkan');
  });
}

// ================= COPY WA =================
function copyWA(){

  if(!_sess.length){
    toast('List kosong','e');
    return;
  }

  let text = `🛒 *BELANJA*\n${new Date().toLocaleDateString('id-ID')}\n\n`;

  const groups = {};

  _sess.forEach(i => {
    const cat = i.category || 'Lainnya';
    if(!groups[cat]) groups[cat] = [];
    groups[cat].push(i);
  });

  Object.entries(groups).forEach(([cat, items]) => {
    text += `*[${cat}]*\n`;

    items.forEach(i => {
      text += `• ${i.matched_name} — ${i.qty} ${i.unit}\n`;
    });

    text += '\n';
  });

  copyText(text);
}

// ================= TOGGLE FAVORIT =================
function toggleFav(){
  _favOpen = !_favOpen;

  const btn = document.getElementById('toggle-fav');
  if(btn){
    btn.textContent = _favOpen ? 'Sembunyikan' : 'Tampilkan';
  }

  renderBelanja();
}

// ================= NAVIGATION =================
let _activeTab = 'belanja';

function switchTab(name){

  _activeTab = name;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));

  document.getElementById('tab-' + name)?.classList.add('active');
  document.querySelector(`.nb[data-tab="${name}"]`)?.classList.add('active');

  switch(name){
    case 'belanja': 
      renderBelanja(); 
      break;

    case 'penjualan': 
      renderPenjualan(); 
      break;

    case 'admin': 
      renderAdmin(); 
      break;

    case 'dashboard': 
      renderDashboard(); 
      break;

    case 'validasi': 
      renderValidasi(); 
      break;
  }
}

 

// ================= EVENT DELEGATION =================
function initEvents(){

  // klik global (delegation)
  document.body.addEventListener('click', (e) => {

    // ===== delete item =====
    if(e.target.matches('[data-del]')){
      const id = e.target.getAttribute('data-del');
      delItem(id);
    }

    // ===== klik favorit =====
    if(e.target.matches('[data-fav]')){
      const name = e.target.getAttribute('data-fav');
      addFavItem(name);
    }

    // ===== nav =====
    const navBtn = e.target.closest('.nb');
if(navBtn){
  switchTab(navBtn.dataset.tab);
}

  });

  // ===== tombol utama =====
  document.getElementById('btn-process-bulk')?.addEventListener('click', processBulk);
  document.getElementById('btn-clear-belanja')?.addEventListener('click', clearBelanja);
  document.getElementById('btn-copy-wa')?.addEventListener('click', copyWA);
  document.getElementById('toggle-fav')?.addEventListener('click', toggleFav);

}

// ================= ADMIN =================
function renderAdmin(){

  const cats = utils.safeArr(db.get(K.cats));
  const el = document.getElementById('cat-tags');

  if(!el) return;

  el.innerHTML = cats.map((c,i)=>
    `<span class="tag">${utils.esc(c)} <button data-delcat="${i}">✕</button></span>`
  ).join('');
}

// ================= INIT ADMIN EVENT =================
function initAdmin(){

  document.body.addEventListener('click', (e) => {

    if(e.target.matches('[data-delcat]')){
      const i = parseInt(e.target.getAttribute('data-delcat'));

      const cats = utils.safeArr(db.get(K.cats));

      openModal('Hapus kategori?', cats[i], () => {
        cats.splice(i,1);
        db.set(K.cats, cats);
        renderAdmin();
        toast('Kategori dihapus');
      });
    }

  });

  document.getElementById('btn-add-cat')?.addEventListener('click', () => {
    const inp = document.getElementById('new-cat');
    if(!inp.value.trim()) return;

    const cats = utils.safeArr(db.get(K.cats));
    cats.push(inp.value.trim());

    db.set(K.cats, cats);
    inp.value = '';

    renderAdmin();
    toast('Kategori ditambah');
  });

}
/* ================================================
   PART 5 – PENJUALAN + DASHBOARD + FINAL INIT
   ================================================ */

// ================= PENJUALAN =================
function renderValidasi(){

  const el = document.getElementById('v-content');
  const bar = document.getElementById('v-bar');

  if(!el) return;

  if(bar) bar.style.display = 'none';

  el.innerHTML = `
    <div class="empty">
      <div class="empty-i">✅</div>
      <p>Sistem Validasi sedang disiapkan</p>
    </div>
  `;
}
function processSalesBulk(){

  const inp = document.getElementById('p-bulk');
  if(!inp) return;

  const val = inp.value.trim();
  if(!val) return;

  const sales = utils.safeArr(db.get(K.sales));

  val.split('\n').filter(l=>l.trim()).forEach(line => {

    const p = parser.sale(line);
    if(!p || p.err) return;

    const m = matcher.menu(p.name);

    sales.push({
      id: utils.uid(),
      matched_menu: m ? m.name : p.name,
      is_unknown: !m,
      qty: p.qty,
      revenue: p.revenue,
      date: utils.today()
    });

  });

  db.set(K.sales, sales);

  inp.value = '';
  const pp = document.getElementById('pp-p');
if(pp) pp.innerHTML = '';

  renderPenjualan();
  toast('Penjualan diproses');
}

// ================= RENDER PENJUALAN =================
function renderPenjualan(){

  const sales = utils.safeArr(db.get(K.sales))
    .filter(s => s.date === utils.today());

  const listEl = document.getElementById('p-list');
  const sumEl = document.getElementById('p-sum');

  if(!listEl || !sumEl) return;

  if(!sales.length){
    listEl.innerHTML = `<div class="empty">Belum ada data</div>`;
    sumEl.style.display = 'none';
    return;
  }

  const map = {};
  let tq = 0, tr = 0;

  sales.forEach(s => {
    const name = s.matched_menu || 'unknown';

    if(!map[name]){
      map[name] = { qty:0, rev:0 };
    }

    map[name].qty += s.qty;
    map[name].rev += s.revenue;

    tq += s.qty;
    tr += s.revenue;
  });

  document.getElementById('p-tq').textContent = tq;
  document.getElementById('p-tr').textContent = utils.fmtRp(tr);

  sumEl.style.display = 'block';

  let html = `<div class="card">`;

  Object.entries(map)
    .sort((a,b)=>b[1].rev - a[1].rev)
    .forEach(([name,m]) => {

      html += `
        <div class="sr">
          <div style="flex:1">
            <div>${utils.esc(name)}</div>
            <small>${m.qty} porsi</small>
          </div>
          <div class="rev-label">${utils.fmtRp(m.rev)}</div>
        </div>
      `;
    });

  html += `</div>`;

  listEl.innerHTML = html;
}

// ================= DASHBOARD =================
function renderDashboard(){

  const el = document.getElementById('dash');
  if(!el) return;

  const sales = utils.safeArr(db.get(K.sales));

  if(!sales.length){
    el.innerHTML = `<div class="empty">Belum ada data</div>`;
    return;
  }

  const today = utils.today();
  const todaySales = sales.filter(s => s.date === today);

  const totalRev = todaySales.reduce((a,b)=>a+b.revenue,0);
  const totalQty = todaySales.reduce((a,b)=>a+b.qty,0);

  el.innerHTML = `
    <div class="card">
      <div class="ct">Hari Ini</div>

      <div class="sg">
        <div>
          <div class="sl">Total Porsi</div>
          <div class="sv">${totalQty}</div>
        </div>

        <div>
          <div class="sl">Revenue</div>
          <div class="sv">${utils.fmtRp(totalRev)}</div>
        </div>
      </div>
    </div>
  `;
}

// ================= DARK MODE =================
function initDark(){

  const btn = document.getElementById('dkbtn');
  const root = document.body;

  function apply(light){
    if(light){
      root.setAttribute('data-light','');
      btn.textContent = '☀️';
    } else {
      root.removeAttribute('data-light');
      btn.textContent = '🌙';
    }
  }

  const saved = localStorage.getItem('ds_theme');
  apply(saved === 'light');

  btn.onclick = () => {
    const isLight = root.hasAttribute('data-light');
    localStorage.setItem('ds_theme', isLight ? 'dark' : 'light');
    apply(!isLight);
  };
}

// ================= MODAL FIX =================
function initModal(){

  const ok = document.getElementById('m-ok');
  const cancel = document.getElementById('m-cancel');

  if(ok){
  ok.onclick = () => {
    if(_modalCb) _modalCb(); // ✅ BENAR
    closeModal();
  };
}

  if(cancel){
    cancel.onclick = closeModal;
  }
}

// ================= FINAL INIT =================
function initApp(){

  seed();

  initDark();
  initModal();

  initEvents();
  initAdmin();

  // bind penjualan
  document.getElementById('btn-process-sales')
    ?.addEventListener('click', processSalesBulk);

  // preview input belanja
  document.getElementById('bulk-inp')
    ?.addEventListener('input', e => {
      utils.debounce('pb', () => {

        const val = e.target.value;
        const pp = document.getElementById('pp-b');

        if(!val.trim()){
          pp.innerHTML = '';
          return;
        }

        pp.innerHTML = val.split('\n')
          .filter(l=>l.trim())
          .map(l => {
            const p = parser.line(l);
            return p.err
              ? `<span style="color:red">❌ ${utils.esc(l)}</span>`
              : `✔️ ${utils.esc(p.name)} (${p.qty} ${p.unit})`;
          }).join('<br>');

      });
    });

  // preview penjualan
  document.getElementById('p-bulk')
    ?.addEventListener('input', e => {
      utils.debounce('ps', () => {

        const val = e.target.value;
        const pp = document.getElementById('pp-p');

        if(!val.trim()){
          pp.innerHTML = '';
          return;
        }

        pp.innerHTML = val.split('\n')
          .filter(l=>l.trim())
          .map(l => {
            const p = parser.sale(l);
            return p.err
              ? `<span style="color:red">❌ ${utils.esc(l)}</span>`
              : `✔️ ${utils.esc(p.name)} (${utils.fmtRp(p.revenue)})`;
          }).join('<br>');

      });
    });

  // first render
  renderBelanja();
}

// ================= START =================
document.addEventListener('DOMContentLoaded', initApp);