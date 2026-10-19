/* Sushi Jem — inline editor (test project)
   Loads only when the URL has ?edit. The owner signs in, then clicks any
   text or image on the live site to edit it in place. Edits go into the same
   content JSON the site renders from, and Save PUTs it to /api/content (D1).
   Single click edits plain text and images; double-click edits the labels of
   buttons (tabs, variants) so their normal actions keep working. */
(function(){
'use strict';

if (!/[?&]edit(=|&|$)/.test(location.search)) return;

/* ---------- helpers ---------- */
var $ = function(s, r){ return (r || document).querySelector(s) };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)) };
function li(){ return document.documentElement.lang === 'en' ? 1 : 0 }
function lang(){ return li() ? 'en' : 'ar' }
function C(){ return window.__sjContent }
function setNode(el, v){ if (el.childNodes.length && el.childNodes[0].nodeType === 3) el.childNodes[0].nodeValue = v; else el.insertBefore(document.createTextNode(v), el.firstChild) }

var T = {
  ar: {
    mode:'وضع التحرير', pause:'إيقاف مؤقت', resume:'تحرير', save:'حفظ', discard:'تراجع', exit:'خروج',
    hint:'اضغط على أي نص أو صورة لتعديلها · وللأزرار (مثل أقسام القائمة) اضغط مرتين',
    loginT:'تحرير الموقع', pw:'كلمة المرور', login:'دخول', badPw:'كلمة المرور غير صحيحة',
    locked:'محاولات كثيرة، جرب بعد قليل', saved:'تم الحفظ ✓', saveErr:'تعذّر الحفظ', session:'انتهت الجلسة، سجّل الدخول من جديد',
    noContent:'تعذّر تحميل المحتوى من الخادم', upFail:'تعذّر رفع الصورة', uploading:'جارٍ رفع الصورة…',
    badNum:'أرقام فقط', unsaved:'عندك تغييرات غير محفوظة، متأكد؟', ch:'تغيير'
  },
  en: {
    mode:'Edit mode', pause:'Pause', resume:'Edit', save:'Save', discard:'Discard', exit:'Exit',
    hint:'Click any text or image to edit it · double-click buttons (like menu tabs) to edit their label',
    loginT:'Edit the site', pw:'Password', login:'Sign in', badPw:'Wrong password',
    locked:'Too many attempts — try again shortly', saved:'Saved ✓', saveErr:'Save failed', session:'Session ended — sign in again',
    noContent:'Could not load content from the server', upFail:'Image upload failed', uploading:'Uploading image…',
    badNum:'Numbers only', unsaved:'You have unsaved changes — continue?', ch:'change'
  }
};
function t(k){ return T[lang()][k] }

/* ---------- state ---------- */
var authed = false;
var active = true;      // edit on / paused
var editing = null;     // current text edit {b, orig, origDir}
var dirty = 0;
var hoverEl = null;
var fileInput = null;
var token = null;       // bearer token from login (works where cookies are blocked)
function authHeaders(){ return token ? { Authorization: 'Bearer ' + token } : {} }

/* ---------- UI: toolbar, login card, toast ---------- */
var CSS = ''
  + '#sjBar{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:300;display:flex;align-items:center;gap:8px;'
  + 'background:#2A1B16;color:#fff;border-radius:999px;padding:8px 10px 8px 16px;box-shadow:0 12px 34px rgba(0,0,0,.35);font-family:inherit;max-width:94vw;flex-wrap:wrap;justify-content:center}'
  + '#sjBar .sj-l{font-weight:600;font-size:.92rem;display:inline-flex;align-items:center;gap:7px;white-space:nowrap}'
  + '#sjBar .sj-dot{width:9px;height:9px;border-radius:50%;background:#C4162A;display:inline-block}'
  + '#sjBar.sj-on .sj-dot{background:#3fbf6f}'
  + '#sjBar button{border:0;border-radius:999px;padding:.45em 1em;font-weight:600;font-size:.88rem;cursor:pointer;font-family:inherit}'
  + '#sjBar .sj-b1{background:#C4162A;color:#fff}#sjBar .sj-b1:hover{background:#A91224}'
  + '#sjBar .sj-b2{background:rgba(255,255,255,.14);color:#fff}#sjBar .sj-b2:hover{background:rgba(255,255,255,.25)}'
  + '#sjBar .sj-x{background:none;color:#fff;opacity:.6;padding:.45em .6em}#sjBar .sj-x:hover{opacity:1}'
  + '#sjCount{background:#fff;color:#C4162A;border-radius:999px;min-width:1.5em;padding:0 .4em;display:inline-block;text-align:center;margin-inline-start:5px;font-size:.8rem}'
  + '#sjLogin{position:fixed;inset:0;z-index:310;background:rgba(42,27,22,.45);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px}'
  + '#sjLogin[hidden]{display:none}'
  + '#sjLogin .sj-card{background:#fff;border-radius:24px;padding:30px 28px;width:min(340px,100%);text-align:center;box-shadow:0 30px 90px rgba(0,0,0,.4)}'
  + '#sjLogin h3{font-family:\'Lalezar\',\'IBM Plex Sans Arabic\',sans-serif;font-weight:400;color:#C4162A;font-size:1.7rem;margin:0 0 16px}'
  + '#sjLogin input{width:100%;border:1.5px solid #EBD9D2;border-radius:14px;padding:.75em 1em;font:inherit;text-align:center;margin-bottom:6px;box-sizing:border-box}'
  + '#sjLogin input:focus{outline:none;border-color:#C4162A}'
  + '#sjLogin .sj-err{color:#C4162A;font-size:.85rem;min-height:1.3em;margin-bottom:8px}'
  + '#sjLogin button{width:100%;border:0;border-radius:999px;background:#C4162A;color:#fff;padding:.8em;font-weight:600;font-size:1rem;cursor:pointer;font-family:inherit}'
  + '#sjToast{position:fixed;bottom:86px;left:50%;transform:translateX(-50%);z-index:320;pointer-events:none;opacity:0;transition:opacity .3s;background:#2A1B16;color:#fff;border-radius:999px;padding:.6em 1.3em;font-size:.95rem;max-width:92vw;text-align:center}'
  + '#sjToast.on{opacity:1}'
  + '.sj-el{outline:2px dashed rgba(196,22,42,.85)!important;outline-offset:2px;cursor:text!important}'
  + '.sj-el.sj-img{cursor:pointer!important}'
  + '.sj-editing{outline:2.5px solid #C4162A!important;outline-offset:2px;background:rgba(196,22,42,.06);border-radius:6px;cursor:text!important}'
  + '.sj-bad{animation:sjshake .3s}'
  + '@keyframes sjshake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}'
  + 'html.sj-edit-off #sjBar .sj-dot{background:#c9a25a}';

var style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);

var bar = document.createElement('div'); bar.id = 'sjBar'; bar.innerHTML =
  '<span class="sj-l"><span class="sj-dot"></span><span id="sjMode"></span></span>' +
  '<button class="sj-b1" id="sjSave"></button>' +
  '<button class="sj-b2" id="sjToggle"></button>' +
  '<button class="sj-b2" id="sjDiscard"></button>' +
  '<button class="sj-x" id="sjExit" title="Exit">✕</button>';
document.body.appendChild(bar);

var toastEl = document.createElement('div'); toastEl.id = 'sjToast'; document.body.appendChild(toastEl);
function toast(msg, ms){ toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(function(){ toastEl.classList.remove('on') }, ms || 2200) }

var login = document.createElement('div'); login.id = 'sjLogin'; login.hidden = true; login.innerHTML =
  '<div class="sj-card"><h3 id="sjLoginT"></h3><input type="password" id="sjPw" autocomplete="current-password">' +
  '<div class="sj-err" id="sjLoginErr"></div><button id="sjLoginBtn"></button></div>';
document.body.appendChild(login);

fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/jpeg,image/png,image/webp,image/gif'; fileInput.style.display = 'none'; document.body.appendChild(fileInput);

function uiLang(){
  $('#sjMode').textContent = t('mode');
  $('#sjSave').innerHTML = esc(t('save')) + '<b id="sjCount" hidden>0</b>';
  $('#sjToggle').textContent = active ? t('pause') : t('resume');
  $('#sjDiscard').textContent = t('discard');
  $('#sjLoginT').textContent = t('loginT');
  $('#sjPw').placeholder = t('pw');
  $('#sjLoginBtn').textContent = t('login');
  updateCount();
}
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&','<':'<','>':'>','"':'"'}[c] }) }
function updateCount(){
  var b = $('#sjCount'); if (!b) return;
  b.hidden = dirty === 0; b.textContent = dirty;
}

/* ---------- auth ---------- */
function checkSession(){ return fetch('api/session', {cache:'no-store', headers:authHeaders()}).then(function(r){ return r.ok }) }
function showLogin(err){
  login.hidden = false;
  var e = $('#sjLoginErr'); e.textContent = err || '';
  setTimeout(function(){ $('#sjPw').focus() }, 50);
}
function tryLogin(){
  var pw = $('#sjPw').value; if (!pw) return;
  fetch('api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:pw})})
    .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j, st:r.status} }) })
    .then(function(res){
      if (res.ok){ login.hidden = true; $('#sjPw').value = ''; authed = true; token = res.j.token || token; bar.classList.add('sj-on'); toast(t('hint'), 4200) }
      else if (res.j && res.j.error === 'locked') $('#sjLoginErr').textContent = t('locked');
      else if (res.j && res.j.error && res.j.error !== 'bad password') $('#sjLoginErr').textContent = t('saveErr');
      else $('#sjLoginErr').textContent = t('badPw');
    })
    .catch(function(){ $('#sjLoginErr').textContent = t('saveErr') });
}
$('#sjLoginBtn').addEventListener('click', tryLogin);
$('#sjPw').addEventListener('keydown', function(e){ if (e.key === 'Enter') tryLogin() });

/* ---------- content lookups ---------- */
function findItem(id){
  var c = C(); if (!c || !c.menu) return null;
  for (var ci = 0; ci < c.menu.length; ci++){
    var cat = c.menu[ci];
    for (var gi = 0; gi < cat.groups.length; gi++){
      var items = cat.groups[gi].items || [];
      for (var ii = 0; ii < items.length; ii++){
        if (items[ii].id === id) return { it: items[ii], cat: cat, grp: cat.groups[gi] };
      }
    }
  }
  return null;
}
function activeCat(){
  var c = C(); if (!c || !c.menu) return null;
  var tab = document.querySelector('.tab[aria-selected="true"]');
  var id = tab ? tab.getAttribute('data-tab') : (c.menu[0] || {}).id;
  for (var i = 0; i < c.menu.length; i++) if (c.menu[i].id === id) return c.menu[i];
  return c.menu[0] || null;
}

/* ---------- binding constructors ---------- */
function textB(el, set, otherLang){
  return { el: el, type: 'text',
    dir: function(){ return (otherLang ? (lang() === 'ar') : (lang() === 'en')) ? 'ltr' : 'rtl' },
    set: set };
}
function numB(el, set){
  return { el: el, type: 'number', dir: function(){ return 'ltr' }, set: set };
}
function imgB(el, set){
  return { el: el, type: 'image', set: function(v){ set(v); if (this.el && this.el.tagName === 'IMG') this.el.src = String(v).replace(/^\//, '') } };
}

/* ---------- resolve a click target to a binding ---------- */
function inUI(el){ return !!(el.closest && el.closest('#sjBar,#sjLogin,#sjToast')) }
function inExcluded(el){ return !!(el.closest && el.closest('#drawer,#bar,#veil,#joltPop')) }

function resolve(target){
  if (!target || !target.closest || inUI(target) || inExcluded(target)) return null;
  var c = C(); if (!c) return null;

  /* footer phone number */
  if (target.id === 'footPhone'){
    return textB(target, function(v){ c.config.phone = v; target.textContent = v });
  }

  /* announcement bar text */
  if (target.id === 'annText'){
    c.announcement = c.announcement || {enabled:false, text:['',''], link:''};
    return textB(target, function(v){ c.announcement.text[li()] = v; target.textContent = v });
  }

  /* marquee words */
  var mq = target.closest('#marqTrack');
  if (mq && target.tagName === 'SPAN'){
    var spans = $$('span', mq), len = (c.config.marquee || []).length || spans.length;
    var mi = spans.indexOf(target) % len;
    if (c.config.marquee && c.config.marquee[mi] != null){
      return textB(target, function(v){
        c.config.marquee[mi] = v;
        spans.forEach(function(s, j){ if (j % len === mi) s.textContent = v });
      });
    }
  }

  /* menu tabs (double-click) */
  var tab = target.closest('.tab');
  if (tab){
    var cat = null;
    for (var i = 0; i < c.menu.length; i++) if (c.menu[i].id === tab.getAttribute('data-tab')) cat = c.menu[i];
    if (cat) return textB(tab, function(v){ cat.t[li()] = v; tab.textContent = v });
  }

  /* menu group titles */
  var grpH = target.matches && target.matches('.grp>h3') ? target : null;
  if (grpH){
    var cat2 = activeCat(); if (!cat2) return null;
    var grps = $$('#menuBody > .grp'), gi2 = grps.indexOf(grpH.closest('.grp'));
    if (cat2.groups[gi2]) return textB(grpH, function(v){ cat2.groups[gi2].t[li()] = v; grpH.textContent = v });
  }

  /* menu rows (list-style groups) */
  var row = target.closest('.row');
  if (row && row.closest('#menuBody')){
    var f = findItem(row.getAttribute('data-row')); if (!f) return null;
    var it = f.it;
    if (target.classList.contains('th')) return imgB(target, function(v){ it.img = v });
    if (target.classList.contains('price')){
      return numB(target, function(v){ if (!it.v[0]) it.v[0] = ['','','']; it.v[0][2] = v; setNode(target, v) });
    }
    if (target.classList.contains('dsc')) return textB(target, function(v){ it.d = it.d || ['','']; it.d[li()] = v; target.textContent = v });
    var nm = target.closest('.nm');
    if (nm && target === nm){
      return textB(nm, function(v){ it.n[li()] = v; setNode(nm, v) });
    }
    if (nm && target.tagName === 'SMALL'){
      return textB(target, function(v){ it.n[1 - li()] = v; target.textContent = v }, true);
    }
    return null;
  }

  /* menu cards */
  var card = target.closest('[data-card]');
  if (card && card.closest('#menuBody')){
    var f2 = findItem(card.getAttribute('data-card')); if (!f2) return null;
    var it2 = f2.it;
    var ph = target.closest('.ph');
    if (ph){
      var im = ph.querySelector('img');
      if (im) return imgB(im, function(v){ it2.img = v });
      var sp = ph.querySelector('span');
      if (sp) return textB(sp, function(v){ it2.k = v; sp.textContent = v });
    }
    if (target.classList.contains('num')) return numB(target, function(v){ it2.num = v; target.textContent = v });
    var meta = target.closest('.meta');
    if (meta && target.tagName === 'SPAN' && meta.children[1] === target){
      return numB(target, function(v){ it2.kcal = v; target.textContent = v + (lang() === 'en' ? ' kcal / piece' : ' سعرة للقطعة') });
    }
    var varBtn = target.closest('.var');
    if (varBtn && varBtn.closest('[data-card]') === card){
      var vi = +varBtn.getAttribute('data-i');
      if (it2.v && it2.v[vi]) return textB(varBtn, function(v){ it2.v[vi][li()] = v; varBtn.textContent = v });
    }
    var pr = target.closest('.price');
    if (pr && pr.closest('[data-card]') === card){
      var pressed = card.querySelector('.var[aria-pressed="true"]');
      var si = pressed ? +pressed.getAttribute('data-i') : 0;
      if (it2.v && it2.v[si]) return numB(pr, function(v){ it2.v[si][2] = v; setNode(pr, v) });
    }
    var h4 = target.closest('h4');
    if (h4) return textB(h4, function(v){ it2.n[li()] = v; h4.textContent = v });
    if (target.classList.contains('alt')) return textB(target, function(v){ it2.n[1 - li()] = v; target.textContent = v }, true);
    if (target.classList.contains('ing')) return textB(target, function(v){ it2.d = it2.d || ['','']; it2.d[li()] = v; target.textContent = v });
    return null;
  }

  /* offers */
  var oc = target.closest('#offersGrid .card');
  if (oc){
    var vis = (c.offers || []).map(function(o, idx){ return {o:o, idx:idx} })
      .filter(function(x){ return x.o && x.o.enabled !== false && x.o.t && (x.o.t[0] || x.o.t[1]) });
    var cards = $$('#offersGrid .card');
    var entry = vis[cards.indexOf(oc)]; if (!entry) return null;
    var o = entry.o;
    var oph = target.closest('.ph');
    if (oph){
      var oim = oph.querySelector('img');
      if (oim) return imgB(oim, function(v){ o.img = v });
    }
    var oh4 = target.closest('h4');
    if (oh4) return textB(oh4, function(v){ o.t = o.t || ['','']; o.t[li()] = v; oh4.textContent = v });
    if (target.classList.contains('ing')) return textB(target, function(v){ o.d = o.d || ['','']; o.d[li()] = v; target.textContent = v });
    var badge = target.closest('.badge');
    if (badge) return textB(badge, function(v){ o.badge = o.badge || ['','']; o.badge[li()] = v; badge.textContent = v });
    if (target.classList.contains('price')) return numB(target, function(v){ o.price = v; setNode(target, v) });
    if (target.classList.contains('old')) return numB(target, function(v){ o.oldPrice = v; setNode(target, v) });
    return null;
  }

  /* rail images */
  var rail = target.closest('#rail');
  if (rail && target.tagName === 'IMG'){
    var idx = $$('img', rail).indexOf(target);
    return imgB(target, function(v){
      if (c.config.rail && c.config.rail[idx] != null) c.config.rail[idx] = v;
      else { c.config.rail = c.config.rail || []; c.config.rail.push(v) }
    });
  }

  /* static photos (logo, dishes, sign, wall) */
  var ph2 = target.closest('[data-photo]');
  if (ph2 && ph2.tagName === 'IMG'){
    var key = ph2.getAttribute('data-photo');
    return imgB(ph2, function(v){
      c.photos = c.photos || {}; c.photos[key] = v;
      $$('[data-photo="' + key + '"]').forEach(function(m){ m.src = v });
    });
  }

  /* any data-i18n text */
  var i18 = target.closest('[data-i18n]');
  if (i18){
    var k = i18.getAttribute('data-i18n');
    return textB(i18, function(v){
      c.strings = c.strings || {}; c.strings[lang()] = c.strings[lang()] || {};
      c.strings[lang()][k] = v;
      if (window.SJ){ (lang() === 'en' ? window.SJ.EN : window.SJ.AR)[k] = v }
      i18.textContent = v;
    });
  }

  return null;
}

/* ---------- text editing ---------- */
function beginEdit(b){
  if (b.type === 'image'){ pickImage(b); return }
  var el = b.el;
  editing = { b: b, orig: el.textContent, origDir: el.getAttribute('dir') };
  el.setAttribute('contenteditable', 'plaintext-only');
  el.classList.add('sj-editing');
  el.setAttribute('dir', b.dir());
  el.focus();
  try {
    var r = document.createRange(); r.selectNodeContents(el);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  } catch (e) {}
}

function commitEdit(cancel){
  if (!editing) return true;
  var b = editing.b, el = b.el;
  var v = el.textContent.replace(/\u00a0/g, ' ').trim();

  if (b.type === 'number' && !cancel){
    v = v.replace(/٫/g, '.').replace(/[٠-٩]/g, function(d){ return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)) }).trim();
    if (!/^-?\d+(\.\d+)?$/.test(v)){
      el.classList.remove('sj-bad'); void el.offsetWidth; el.classList.add('sj-bad');
      toast(t('badNum'));
      el.focus();
      return false; // keep editing
    }
    v = Number(v);
  }
  if (!cancel && v === editing.orig && b.type === 'text'){ finishEdit(); return true }
  if (el.getAttribute('dir') === editing.origDir) el.removeAttribute('dir');
  else if (editing.origDir) el.setAttribute('dir', editing.origDir);
  finishEdit();
  if (!cancel){ b.set(v); dirty++; updateCount() }
  return true;
}
function finishEdit(){
  if (!editing) return;
  var el = editing.b.el;
  editing = null; // clear BEFORE removing contenteditable: the removal fires a
  // synchronous focusout that must hit the "no active edit" guard above
  el.removeAttribute('contenteditable');
  el.classList.remove('sj-editing');
}

/* ---------- image editing ---------- */
function pickImage(b){
  fileInput.value = '';
  fileInput.onchange = function(){
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    toast(t('uploading'), 6000);
    compress(f, function(dataUrl){
      if (!authed){ showLogin(); return }
      fetch('api/media', {method:'POST', headers:Object.assign({'Content-Type':'application/json'}, authHeaders()), body:JSON.stringify({data:dataUrl})})
        .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j} }) })
        .then(function(res){
          if (res.ok){ b.set(res.j.url); dirty++; updateCount() }
          else if (res.j && res.j.error === 'auth'){ authed = false; showLogin() }
          else toast(t('upFail'));
        })
        .catch(function(){ toast(t('upFail')) });
    });
  };
  fileInput.click();
}
function compress(file, cb){
  var img = new Image(), ur = URL.createObjectURL(file);
  img.onload = function(){
    var MAX = 1600, sc = Math.min(1, MAX / Math.max(img.width, img.height));
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * sc));
    cv.height = Math.max(1, Math.round(img.height * sc));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    var type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    cb(cv.toDataURL(type, 0.85));
    URL.revokeObjectURL(ur);
  };
  img.onerror = function(){ toast(t('upFail')) };
  img.src = ur;
}

/* ---------- click / hover / keys ---------- */
function isInteractive(el){ return !!(el.closest && el.closest('button, a, input, textarea, select')) }

document.addEventListener('click', function(e){
  if (login.hidden === false) return;
  if (!active) return;
  if (!authed){
    if (resolve(e.target)){ e.preventDefault(); e.stopPropagation(); showLogin() }
    return;
  }
  if (editing){ commitEdit(false); return }
  if (isInteractive(e.target)) return; // single click = normal action; dblclick edits labels
  var b = resolve(e.target);
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  beginEdit(b);
}, true);

document.addEventListener('dblclick', function(e){
  if (login.hidden === false || !active || !authed || editing) return;
  if (!isInteractive(e.target)) return;
  var b = resolve(e.target);
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  beginEdit(b);
}, true);

document.addEventListener('mouseover', function(e){
  if (!active || !authed || editing){ clearHover(); return }
  if (inUI(e.target)){ clearHover(); return }
  var b = resolve(e.target);
  if (hoverEl && (!b || hoverEl !== b.el)) hoverEl.classList.remove('sj-el', 'sj-img');
  hoverEl = b ? b.el : null;
  if (hoverEl){ hoverEl.classList.add('sj-el'); if (b.type === 'image') hoverEl.classList.add('sj-img') }
}, true);
function clearHover(){ if (hoverEl){ hoverEl.classList.remove('sj-el', 'sj-img'); hoverEl = null } }

document.addEventListener('keydown', function(e){
  if (editing){
    e.stopPropagation();
    if (e.key === 'Escape'){ e.preventDefault(); commitEdit(true) }
    else if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); commitEdit(false) }
  } else if (e.key === 'Escape' && login.hidden === false){
    login.hidden = true;
  }
}, true);

document.addEventListener('focusout', function(e){ if (editing && e.target === editing.b.el) commitEdit(false) }, true);

/* ---------- save / discard / toolbar ---------- */
function preSave(){
  try{
    var c = C();
    var p = String(c.config.phone || '').replace(/\D/g, '');
    if (/^0\d{9}$/.test(p)){
      var intl = '+966' + p.slice(1);
      if (!c.config.phoneIntl || /^\+966\d{9}$/.test(String(c.config.phoneIntl).replace(/\s/g, ''))) c.config.phoneIntl = intl;
    }
  }catch(e){}
}
function save(){
  if (editing && !commitEdit(false)) return;
  var btn = $('#sjSave'); btn.disabled = true;
  preSave();
  fetch('api/content', {method:'PUT', headers:Object.assign({'Content-Type':'application/json'}, authHeaders()), body:JSON.stringify(C())})
    .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j} }) })
    .then(function(res){
      if (res.ok){ dirty = 0; updateCount(); toast(t('saved')) }
      else if (res.j && res.j.error === 'auth'){ authed = false; bar.classList.remove('sj-on'); showLogin(t('session')) }
      else toast(res.j && res.j.error ? String(res.j.error) : t('saveErr'));
    })
    .catch(function(){ toast(t('saveErr')) })
    .finally(function(){ btn.disabled = false });
}
$('#sjSave').addEventListener('click', save);
$('#sjToggle').addEventListener('click', function(){
  active = !active; document.documentElement.classList.toggle('sj-edit-off', !active);
  if (!active) clearHover();
  uiLang();
});
$('#sjDiscard').addEventListener('click', function(){
  if (dirty && !window.confirm(t('unsaved'))) return;
  location.reload();
});
$('#sjExit').addEventListener('click', function(){ location.href = location.pathname });
window.addEventListener('beforeunload', function(e){
  if (dirty){ e.preventDefault(); e.returnValue = ''; return e.returnValue }
});

/* ---------- language of the toolbar follows the site language ---------- */
new MutationObserver(uiLang).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });

/* ---------- boot ---------- */
var tries = 0;
(function boot(){
  if (window.SJ && C() !== undefined){
    uiLang();
    checkSession().then(function(ok){
      authed = ok;
      if (ok){ bar.classList.add('sj-on'); toast(t('hint'), 4500) }
      else showLogin();
    });
    return;
  }
  if (++tries > 80){ toast(t('noContent'), 6000); uiLang(); return }
  setTimeout(boot, 100);
})();
})();
