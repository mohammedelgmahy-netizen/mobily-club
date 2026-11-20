/* موبايلي - Mobily — «تصفح منتجاتنا» (صفحة العميل)
 * البيانات حقيقية من الخادم (fn: 'shop' → catalog). أي تعديل من الإدارة يظهر أول ما العميل يفتح القسم أو يرجع للصفحة.
 * التنقل: #shop  |  #shop/c/<قسم>  |  #shop/p/<منتج>  (زرار الرجوع في الموبايل شغال) */
(function () {
  'use strict';
  var CSS = [
    '.shop-entry{display:flex;align-items:center;gap:14px;width:100%;margin:14px 0;padding:16px;border-radius:18px;border:1px solid rgba(34,211,238,.35);cursor:pointer;text-align:start;font:inherit;color:#fff;',
    'background:radial-gradient(120% 160% at 0% 0%,rgba(139,92,246,.45),transparent 60%),linear-gradient(135deg,#0E3A4C,#1B1240);box-shadow:0 18px 40px -20px rgba(34,211,238,.6)}',
    '.shop-entry .se-ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:28px;background:rgba(255,255,255,.1);flex:0 0 auto}',
    '.shop-entry b{display:block;font-size:18px;font-weight:800}.shop-entry small{color:#C7D2FE;font-size:12.5px}.shop-entry .se-go{margin-inline-start:auto;font-size:22px;color:var(--brand)}',
    '#shopView{max-width:560px;margin:0 auto;padding:0 0 40px;min-height:100vh}',
    '.sh-top{position:sticky;top:0;z-index:30;padding:12px 14px 10px;background:rgba(6,10,20,.92);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}',
    '.sh-bar{display:flex;align-items:center;gap:10px}',
    '.sh-back{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--text);font-size:20px;display:grid;place-items:center;cursor:pointer;flex:0 0 auto}',
    '.sh-title{font-size:18px;font-weight:800;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sh-search{position:relative;margin-top:10px}.sh-search input{padding-inline-start:40px;border-radius:14px;background:var(--surface)}',
    '.sh-search i{position:absolute;inset-inline-start:13px;top:50%;transform:translateY(-50%);font-style:normal;opacity:.6}',
    '.sh-search .clr{position:absolute;inset-inline-end:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--muted);font-size:20px;cursor:pointer}',
    '.sh-cats{display:flex;gap:10px;overflow-x:auto;padding:14px 14px 4px;scrollbar-width:none;scroll-snap-type:x proximity}.sh-cats::-webkit-scrollbar{display:none}',
    '.sh-cat{flex:0 0 auto;width:84px;scroll-snap-align:start;border:1px solid var(--line);border-radius:16px;padding:10px 6px 8px;background:var(--surface);color:var(--text);font:inherit;cursor:pointer;text-align:center;transition:.15s}',
    '.sh-cat .ci{width:46px;height:46px;margin:0 auto 6px;border-radius:13px;display:grid;place-items:center;font-size:24px;background:linear-gradient(135deg,rgba(34,211,238,.18),rgba(139,92,246,.22));overflow:hidden}',
    '.sh-cat .ci img{width:100%;height:100%;object-fit:cover}',
    '.sh-cat span{display:block;font-size:12px;font-weight:700;line-height:1.3;min-height:31px}',
    '.sh-cat.on{border-color:var(--brand);background:linear-gradient(180deg,rgba(34,211,238,.16),rgba(139,92,246,.12));box-shadow:0 0 0 2px rgba(34,211,238,.25)}',
    '.sh-tools{display:flex;align-items:center;gap:10px;padding:10px 14px}',
    '.sh-tools .cnt{flex:1;color:var(--muted);font-size:13px;font-weight:600}',
    '.sh-tools select{width:auto;padding:8px 12px;border-radius:11px;font-size:13.5px;background:var(--surface)}',
    '.sh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:4px 14px}',
    '@media(min-width:520px){.sh-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}',
    '.pc{position:relative;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:var(--surface);border:1px solid var(--line);cursor:pointer;color:var(--text);text-decoration:none;transition:transform .15s}',
    '.pc:active{transform:scale(.98)}',
    '.pc .im{position:relative;aspect-ratio:1;background:#fff;display:grid;place-items:center;overflow:hidden}',
    '.pc .im img{width:100%;height:100%;object-fit:contain;padding:8px}',
    '.pc .im .noimg,.pd-gal .noimg{font-size:44px;opacity:.35;color:#0B1222}',
    '.pc .off{position:absolute;top:8px;inset-inline-start:8px;background:linear-gradient(135deg,#F43F5E,#E11D48);color:#fff;font-family:Inter,Cairo,sans-serif;font-weight:800;font-size:12px;padding:3px 9px;border-radius:999px;direction:ltr}',
    '.pc .na{position:absolute;inset:auto 0 0 0;background:rgba(15,23,42,.82);color:#FECACA;font-size:12px;font-weight:800;text-align:center;padding:4px}',
    '.pc .bd{padding:10px 11px 12px;display:flex;flex-direction:column;gap:4px;flex:1}',
    '.pc .nm{font-size:13.5px;font-weight:700;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:39px}',
    '.pr{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px;margin-top:auto}',
    '.pr b{font-family:Inter,Cairo,sans-serif;font-size:16px;font-weight:800;color:var(--brand)}',
    '.pr s{color:var(--muted);font-size:12.5px;font-family:Inter,Cairo,sans-serif}',
    '.av{font-size:11.5px;font-weight:700}.av.y{color:var(--ok)}.av.n{color:var(--bad)}',
    '.sh-empty{text-align:center;color:var(--muted);padding:40px 20px;font-size:14px}.sh-empty div{font-size:44px;margin-bottom:6px}',
    '.sk{background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.09),rgba(255,255,255,.04));background-size:200% 100%;animation:shsk 1.2s infinite;border-radius:18px}',
    '@keyframes shsk{to{background-position:-200% 0}}',
    /* صفحة المنتج */
    '.pd-gal{position:relative;background:#fff;aspect-ratio:1;overflow:hidden}',
    '.pd-track{display:flex;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;direction:ltr}.pd-track::-webkit-scrollbar{display:none}',
    '.pd-track img{flex:0 0 100%;width:100%;height:100%;object-fit:contain;scroll-snap-align:center;padding:14px;cursor:zoom-in}',
    '.pd-dots{position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:center;gap:6px;direction:ltr}',
    '.pd-dots i{width:7px;height:7px;border-radius:99px;background:rgba(11,18,34,.25);transition:.2s}.pd-dots i.on{width:20px;background:#0B1222}',
    '.pd-zoomhint{position:absolute;top:10px;inset-inline-end:10px;background:rgba(11,18,34,.7);color:#fff;border-radius:999px;padding:3px 10px;font-size:11.5px;pointer-events:none}',
    '.pd-thumbs{display:flex;gap:8px;overflow-x:auto;padding:10px 14px 0;scrollbar-width:none;direction:ltr}.pd-thumbs::-webkit-scrollbar{display:none}',
    '.pd-thumbs button{flex:0 0 auto;width:58px;height:58px;border-radius:12px;border:2px solid transparent;background:#fff;padding:3px;cursor:pointer}',
    '.pd-thumbs button.on{border-color:var(--brand)}.pd-thumbs img{width:100%;height:100%;object-fit:contain}',
    '.pd-body{padding:14px}',
    '.pd-cat{display:inline-block;font-size:12px;font-weight:700;color:var(--brand);background:rgba(34,211,238,.12);border-radius:999px;padding:2px 10px;cursor:pointer;border:0;font-family:inherit}',
    '.pd-name{font-size:21px;font-weight:800;line-height:1.4;margin:8px 0 6px}',
    '.pd-price{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;margin:6px 0 10px}',
    '.pd-price b{font-family:Inter,Cairo,sans-serif;font-size:26px;font-weight:800;color:var(--brand)}',
    '.pd-price s{color:var(--muted);font-size:16px;font-family:Inter,Cairo,sans-serif}',
    '.pd-price .sv{font-size:12.5px;font-weight:800;color:#FDA4AF;background:rgba(244,63,94,.14);border-radius:999px;padding:3px 10px}',
    '.pd-av{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:13.5px;border-radius:999px;padding:4px 12px}',
    '.pd-av.y{background:rgba(52,211,153,.13);color:var(--ok)}.pd-av.n{background:rgba(248,113,113,.13);color:var(--bad)}',
    '.pd-sec{margin-top:16px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px}',
    '.pd-sec h3{font-size:15px;margin:0 0 10px}',
    '.pd-desc{white-space:pre-line;font-size:14.5px;line-height:1.85;color:#DCE3F5}',
    '.pd-sw{display:flex;flex-wrap:wrap;gap:8px}',
    '.pd-sw span{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:999px;padding:5px 12px 5px 10px;font-size:13px;font-weight:700;background:rgba(255,255,255,.03)}',
    '.pd-sw i{width:18px;height:18px;border-radius:50%;border:1px solid rgba(255,255,255,.35);flex:0 0 auto}',
    '.pd-specs{width:100%;border-collapse:collapse;font-size:13.5px}',
    '.pd-specs td{padding:9px 6px;border-bottom:1px dashed var(--line);vertical-align:top}.pd-specs tr:last-child td{border-bottom:0}',
    '.pd-specs td:first-child{color:var(--muted);font-weight:700;width:40%}',
    '.pd-rel{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.pd-rel::-webkit-scrollbar{display:none}',
    '.pd-rel .pc{flex:0 0 46%;max-width:200px}',
    /* عرض الصورة بالكامل مع التكبير */
    '.zv{position:fixed;inset:0;z-index:100000;background:#000;display:flex;flex-direction:column}',
    '.zv-top{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;color:#fff;font-family:Inter,Cairo,sans-serif;direction:ltr}',
    '.zv-top button{width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:24px;cursor:pointer}',
    '.zv-stage{flex:1;overflow:hidden;position:relative;touch-action:none}',
    '.zv-stage img{position:absolute;left:50%;top:50%;max-width:100%;max-height:100%;transform-origin:center center;user-select:none;-webkit-user-drag:none}',
    '.zv-nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:22px;cursor:pointer;z-index:2}',
    '.zv-hint{color:rgba(255,255,255,.6);text-align:center;font-size:12px;padding:8px}',
    'img.ld:not(.ok){background:linear-gradient(90deg,#EEF1F6,#F8FAFC,#EEF1F6);background-size:200% 100%;animation:shsk 1.2s infinite}',
    '.imgfail{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;height:100%;color:#94A3B8;font-size:34px;background:#F1F5F9}',
    '.imgfail small{font-size:11.5px;font-weight:700;font-family:Cairo,sans-serif}',
    '.pd-track .imgfail{flex:0 0 100%;scroll-snap-align:center}',
    '.pd-buy{position:fixed;left:0;right:0;bottom:0;z-index:40;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(6,10,20,.95);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-top:1px solid var(--line)}',
    '.pd-buy .in{max-width:532px;margin:0 auto;display:flex;align-items:center;gap:12px}',
    '.pd-buy .pp{flex:0 0 auto;font-family:Inter,Cairo,sans-serif;font-weight:800;font-size:18px;color:var(--brand)}',
    '.order-btn{flex:1;border:0;border-radius:14px;padding:14px 16px;font:inherit;font-weight:800;font-size:17px;cursor:pointer;color:#06101F;background:linear-gradient(135deg,#22D3EE,#34D399);box-shadow:0 12px 30px -12px rgba(52,211,153,.8)}',
    '.order-btn:disabled{background:#334155;color:#94A3B8;box-shadow:none;cursor:not-allowed}',
    '.sh-pad{height:90px}',
    '.sh-myo{flex:0 0 auto;border:1px solid rgba(34,211,238,.4);background:rgba(34,211,238,.1);color:var(--brand);border-radius:12px;padding:8px 12px;font:inherit;font-weight:800;font-size:13px;cursor:pointer}',
    '.myo-entry{display:flex;align-items:center;gap:10px;width:100%;margin:-4px 0 14px;padding:12px 16px;border-radius:14px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;font-weight:800;font-size:15px;cursor:pointer;text-align:start}',
    '.myo-entry .se-go{margin-inline-start:auto;color:var(--brand);font-size:20px}',
    '.osh{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}',
    '.osh .bx{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:var(--bg2);border-radius:22px 22px 0 0;border:1px solid var(--line);padding:16px 16px calc(16px + env(safe-area-inset-bottom));animation:oshup .2s ease-out}',
    '@keyframes oshup{from{transform:translateY(40px);opacity:.5}}',
    '.osh .hd{display:flex;gap:12px;align-items:center;margin-bottom:6px}',
    '.osh .hd .t{width:64px;height:64px;border-radius:12px;background:#fff;flex:0 0 auto;overflow:hidden;display:grid;place-items:center;font-size:28px}',
    '.osh .hd .t img{width:100%;height:100%;object-fit:contain}',
    '.osh .hd b{display:block;font-size:15px;line-height:1.4}.osh .x{margin-inline-start:auto;flex:0 0 auto;width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--text);font-size:22px;cursor:pointer}',
    '.osh h4{margin:14px 0 8px;font-size:14px}',
    '.ochips{display:flex;flex-wrap:wrap;gap:8px}',
    '.ochips button{display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--line);background:rgba(255,255,255,.03);color:var(--text);border-radius:999px;padding:7px 14px;font:inherit;font-weight:700;font-size:13.5px;cursor:pointer}',
    '.ochips button.on{border-color:var(--brand);background:rgba(34,211,238,.14);color:#fff}',
    '.ochips i{width:16px;height:16px;border-radius:50%;border:1px solid rgba(255,255,255,.4)}',
    '.oqty{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:14px;overflow:hidden;direction:ltr}',
    '.oqty button{width:46px;height:44px;border:0;background:rgba(255,255,255,.05);color:var(--text);font-size:22px;cursor:pointer}',
    '.oqty span{min-width:54px;text-align:center;font-family:Inter,sans-serif;font-weight:800;font-size:18px}',
    '.ototal{display:flex;justify-content:space-between;align-items:center;margin:16px 0 12px;padding:12px 14px;border-radius:14px;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.25);font-weight:800}',
    '.ototal b{font-family:Inter,Cairo,sans-serif;font-size:22px;color:var(--brand)}',
    '.odone{text-align:center;padding:10px 4px}.odone .ic{font-size:54px}.odone .no{font-family:Inter,sans-serif;font-size:26px;font-weight:800;color:var(--brand);margin:6px 0}',
    '.ol{display:flex;flex-direction:column;gap:10px;padding:14px}',
    '.oc{display:flex;gap:12px;align-items:center;border:1px solid var(--line);border-radius:16px;padding:10px;background:var(--surface);cursor:pointer;color:var(--text);text-decoration:none}',
    '.oc .t{width:62px;height:62px;border-radius:12px;background:#fff;flex:0 0 auto;overflow:hidden;display:grid;place-items:center;font-size:26px}',
    '.oc .t img{width:100%;height:100%;object-fit:contain}',
    '.oc .m{flex:1;min-width:0}.oc .m b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.oc .m small{display:block;color:var(--muted);font-size:12px}',
    '.ost{display:inline-block;font-size:11.5px;font-weight:800;padding:2px 10px;border-radius:999px;white-space:nowrap}',
    '.ost.pending{background:rgba(251,191,36,.15);color:#FBBF24}.ost.approved{background:rgba(34,211,238,.15);color:#22D3EE}.ost.preparing{background:rgba(139,92,246,.18);color:#C4B5FD}',
    '.ost.ready{background:rgba(52,211,153,.15);color:#34D399}.ost.completed{background:rgba(52,211,153,.25);color:#A7F3D0}.ost.rejected{background:rgba(248,113,113,.15);color:#F87171}.ost.cancelled{background:rgba(148,163,184,.15);color:#94A3B8}',
    '.od-row{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px dashed var(--line);font-size:14px}.od-row:last-child{border-bottom:0}.od-row span:first-child{color:var(--muted);font-weight:700;flex:0 0 auto}.od-row span:last-child{text-align:left;unicode-bidi:plaintext}',
    '.otl{list-style:none;margin:0;padding:0}.otl li{position:relative;padding:0 22px 14px 0;font-size:13.5px}.otl li::before{content:"";position:absolute;right:4px;top:6px;width:10px;height:10px;border-radius:50%;background:var(--brand)}',
    '.otl li::after{content:"";position:absolute;right:8px;top:18px;bottom:0;width:2px;background:var(--line)}.otl li:last-child::after{display:none}.otl small{display:block;color:var(--muted);font-size:12px}'
  ].join('\n');

  var CACHE_KEY = 'mc_shop_cache';
  var DATA = null, LOADING = null, ERR = '';
  var ST = { cat: '', q: '', sort: 'new' };
  var app = document.getElementById('app');
  if (!app || !window.__mcPost) return;

  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cur() { try { return (window.D && D.settings && D.settings.currency) || 'ج.م'; } catch (e) { return 'ج.م'; } }
  function money(n) { return Number(n || 0).toLocaleString('ar-EG-u-nu-latn', { maximumFractionDigits: 2 }) + ' ' + esc(cur()); }
  function pct(p) { return p.old_price > p.price && p.old_price > 0 ? Math.round((1 - p.price / p.old_price) * 100) : 0; }
  function norm(s) { return String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ً-ْ]/g, '').replace(/\s+/g, ' ').trim(); }
  function catById(id) { return ((DATA && DATA.categories) || []).filter(function (c) { return c.id === id; })[0]; }
  function prodById(id) { return ((DATA && DATA.products) || []).filter(function (p) { return p.id === id; })[0]; }
  function thumb(p) { return p.images && p.images[0] ? p.images[0].t || p.images[0].u : ''; }
  // لو قايمة اتخزنت كنص (نسخ قديمة) نرجعها قايمة
  function arr(v) { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { var x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch (e) { return []; } } return []; }
  function fixData(d) { if (d && d.products) d.products.forEach(function (p) { ['images', 'specs', 'colors', 'variants'].forEach(function (k) { p[k] = arr(p[k]); }); }); return d; }
  // صورة: شكل تحميل لحد ما توصل، ولو فشلت تظهر صورة بديلة بدل مربع فاضي
  function img(src, alt, extra) { return '<img class="ld" src="' + esc(src) + '" alt="' + esc(alt || '') + '"' + (extra || '') + ' onload="this.classList.add(\'ok\')" onerror="__shopImgErr(this)">'; }
  window.__shopImgErr = function (el) { var f = document.createElement('span'); f.className = 'imgfail'; f.innerHTML = '📷<small>الصورة مش متاحة</small>'; if (el.dataset.i) f.dataset.i = el.dataset.i; el.replaceWith(f); };
  function token() { return window.TOKEN || (window.BOOT && BOOT.token) || ''; }
  var ST_AR = { pending: 'قيد المراجعة', approved: 'تم قبول الطلب', preparing: 'جاري التجهيز', ready: 'جاهز للاستلام', completed: 'تم التسليم', rejected: 'مرفوض', cancelled: 'ملغي' };
  function stBadge(s) { return '<span class="ost ' + esc(s) + '">' + esc(ST_AR[s] || s) + '</span>'; }
  function dt(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function rpc(args) {
    return window.__mcPost(JSON.stringify({ fn: 'shop', args: args })).then(function (j) {
      var r = j && j.result;
      if (!r || !r.ok) { var e = new Error((r && r.error) || (j && j.error) || 'حصل خطأ، حاول تاني'); e.srv = true; throw e; }
      return r.data;
    }).catch(function (e) { if (e && e.srv) throw e; throw new Error('تعذر الاتصال بالخادم، تأكد من الإنترنت'); });
  }
  function catIcon(c) { return c.image ? '<img src="' + esc(c.image) + '" alt="" loading="lazy">' : esc(c.icon || '🛍️'); }

  /* ---------- البيانات ---------- */
  try { var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (cached && cached.products) DATA = fixData(cached); } catch (e) { }
  function load() {
    if (LOADING) return LOADING;
    LOADING = window.__mcPost(JSON.stringify({ fn: 'shop', args: ['catalog'] })).then(function (j) {
      var r = j && j.result;
      if (!r || !r.ok) throw new Error((r && r.error) || (j && j.error) || 'تعذر تحميل المنتجات');
      DATA = fixData(r.data); ERR = '';
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(DATA)); } catch (e) { }
    }).catch(function (e) {
      ERR = e && e.message && /[؀-ۿ]/.test(e.message) ? e.message : 'تعذر الاتصال بالخادم، تأكد من الإنترنت';
    }).then(function () { LOADING = null; if (isShop()) route(); });
    return LOADING;
  }

  /* ---------- زرار الدخول في صفحة الكارت ---------- */
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  var view = document.createElement('div'); view.id = 'shopView'; view.className = 'hidden'; view.dir = 'rtl';
  document.body.insertBefore(view, app.nextSibling);
  function placeEntry() {
    if (document.getElementById('shopEntry')) return;
    var anchor = document.getElementById('stats');
    if (!anchor) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'shopEntry'; b.className = 'shop-entry'; b.dir = 'rtl';
    b.innerHTML = '<span class="se-ic">🛍️</span><span><b>تصفح منتجاتنا</b><small>موبايلات، سماعات، إكسسوارات وأكتر بالأسعار</small></span><span class="se-go">‹</span>';
    b.onclick = function () { nav('#shop'); };
    anchor.parentNode.insertBefore(b, anchor);
    var o = document.createElement('button');
    o.type = 'button'; o.id = 'myOrdersEntry'; o.className = 'myo-entry'; o.dir = 'rtl';
    o.innerHTML = '<span>📦</span><span>طلباتي</span><span class="se-go">‹</span>';
    o.onclick = function () { nav('#shop/orders'); };
    anchor.parentNode.insertBefore(o, anchor);
  }
  placeEntry();

  /* ---------- التنقل ---------- */
  function isShop() { return /^#shop/.test(location.hash); }
  var PUSHES = 0;
  function nav(h) { if (location.hash !== h) { history.pushState({ shopIn: true }, '', location.pathname + location.search + h); PUSHES++; } route(); }
  function back() {
    if (PUSHES > 0) return history.back();
    // فتح مباشر على رابط داخل المتجر: نرجع للمستوى اللي فوقه من غير ما نخرج من الموقع
    var up = /^#shop\/orders\/./.test(location.hash) ? '#shop/orders' : /^#shop\/orders/.test(location.hash) ? '' : /^#shop\/p\//.test(location.hash) ? (catById((prodById(location.hash.slice(8)) || {}).category_id) ? '#shop/c/' + prodById(location.hash.slice(8)).category_id : '#shop') : /^#shop\/c\//.test(location.hash) ? '#shop' : '';
    history.replaceState(up ? { shopIn: true } : null, '', location.pathname + location.search + up); route();
  }
  window.addEventListener('popstate', function () { if (PUSHES > 0) PUSHES--; route(); });
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && isShop()) load(); });

  var lastHash = '', savedScroll = {};
  function route() {
    var h = location.hash;
    if (!isShop()) {
      Array.prototype.forEach.call(document.querySelectorAll('.osh,.zv'), function (x) { x.remove(); });
      view.classList.add('hidden'); app.classList.remove('hidden'); lastHash = '';
      return;
    }
    if (lastHash !== h) Array.prototype.forEach.call(document.querySelectorAll('.osh,.zv'), function (x) { x.remove(); }); // التنقل يقفل شاشة الطلب/الصورة المفتوحة
    if (lastHash && lastHash !== h) savedScroll[lastHash] = window.scrollY;
    app.classList.add('hidden'); view.classList.remove('hidden');
    var m = h.match(/^#shop\/p\/([\w-]+)/), c = h.match(/^#shop\/c\/([\w-]+)/);
    var entering = !lastHash, first = lastHash !== h; lastHash = h;
    var om = h.match(/^#shop\/orders(?:\/([\w-]+))?/);
    if (om) { if (om[1]) renderOrder(om[1]); else renderOrders(); if (first) window.scrollTo(0, 0); return; }
    if (entering && DATA) load(); // كل مرة العميل يفتح المتجر نجيب آخر تعديلات الإدارة
    if (!DATA && !ERR) { renderSkeleton(); if (!LOADING) load(); return; }
    if (!DATA && ERR) return renderError();
    if (m) renderProduct(m[1]);
    else { ST.cat = c ? c[1] : ''; renderList(); }
    if (first) window.scrollTo(0, savedScroll[h] || 0);
  }

  function topBar(title, withSearch) {
    return '<div class="sh-top"><div class="sh-bar"><button type="button" class="sh-back" id="shBack" aria-label="رجوع">→</button><div class="sh-title">' + title + '</div>' +
      (withSearch ? '<button type="button" class="sh-myo" id="shMyo">📦 طلباتي</button>' : '') + '</div>' +
      (withSearch ? '<div class="sh-search"><i>🔍</i><input id="shQ" type="search" placeholder="ابحث باسم المنتج…" value="' + esc(ST.q) + '" autocomplete="off"><button type="button" class="clr' + (ST.q ? '' : ' hidden') + '" id="shClr" aria-label="مسح">×</button></div>' : '') + '</div>';
  }
  function bindBack() { document.getElementById('shBack').onclick = back; var m = document.getElementById('shMyo'); if (m) m.onclick = function () { nav('#shop/orders'); }; }

  function renderSkeleton() {
    var sk = ''; for (var i = 0; i < 6; i++) sk += '<div class="sk" style="aspect-ratio:.72"></div>';
    view.innerHTML = topBar('تصفح منتجاتنا', false) + '<div class="sh-cats">' + [1, 2, 3, 4, 5].map(function () { return '<div class="sk" style="flex:0 0 84px;height:96px"></div>'; }).join('') + '</div><div class="sh-grid" style="margin-top:14px">' + sk + '</div>';
    bindBack();
  }
  function renderError() {
    view.innerHTML = topBar('تصفح منتجاتنا', false) + '<div class="sh-empty"><div>⚠️</div>' + esc(ERR) + '<br><br><button class="btn sm" type="button" id="shRetry">إعادة المحاولة</button></div>';
    bindBack(); document.getElementById('shRetry').onclick = function () { ERR = ''; renderSkeleton(); load(); };
  }

  function card(p) {
    var off = pct(p), t = thumb(p);
    return '<a class="pc" href="#shop/p/' + esc(p.id) + '" data-pid="' + esc(p.id) + '"><div class="im">' +
      (t ? img(t, p.name, ' loading="lazy"') : '<span class="noimg">📦</span>') +
      (off ? '<span class="off">-' + off + '%</span>' : '') + (p.available ? '' : '<span class="na">غير متوفر حالياً</span>') + '</div>' +
      '<div class="bd"><div class="nm">' + esc(p.name) + '</div><div class="pr"><b>' + money(p.price) + '</b>' + (off ? '<s>' + money(p.old_price) + '</s>' : '') + '</div>' +
      '<div class="av ' + (p.available ? 'y">● متوفر' : 'n">● غير متوفر') + '</div></div></a>';
  }
  function bindCards(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-pid]'), function (a) {
      a.onclick = function (e) { e.preventDefault(); nav('#shop/p/' + a.dataset.pid); };
    });
  }

  function filtered() {
    var q = norm(ST.q), list = DATA.products.filter(function (p) {
      if (ST.cat && p.category_id !== ST.cat) return false;
      return !q || norm(p.name).indexOf(q) >= 0;
    });
    if (ST.sort === 'asc') list.sort(function (a, b) { return a.price - b.price; });
    else if (ST.sort === 'desc') list.sort(function (a, b) { return b.price - a.price; });
    else list.sort(function (a, b) { return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0; });
    return list;
  }

  function renderList() {
    if (ST.cat && !catById(ST.cat)) ST.cat = '';
    var cats = DATA.categories, c = catById(ST.cat);
    var counts = {}; DATA.products.forEach(function (p) { counts[p.category_id] = (counts[p.category_id] || 0) + 1; });
    var focused = document.activeElement && document.activeElement.id === 'shQ';
    view.innerHTML = topBar(c ? esc(c.name) : 'تصفح منتجاتنا', true) +
      '<div class="sh-cats" id="shCats"><button type="button" class="sh-cat' + (ST.cat ? '' : ' on') + '" data-cat=""><div class="ci">🏬</div><span>الكل</span></button>' +
      cats.map(function (k) { return '<button type="button" class="sh-cat' + (k.id === ST.cat ? ' on' : '') + '" data-cat="' + esc(k.id) + '"><div class="ci">' + catIcon(k) + '</div><span>' + esc(k.name) + '</span></button>'; }).join('') + '</div>' +
      '<div class="sh-tools"><div class="cnt" id="shCnt"></div><select id="shSort" aria-label="الترتيب">' +
      [['new', 'الأحدث'], ['asc', 'السعر: من الأقل للأعلى'], ['desc', 'السعر: من الأعلى للأقل']].map(function (o) { return '<option value="' + o[0] + '"' + (ST.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></div><div class="sh-grid" id="shGrid"></div>';
    bindBack();
    var catsEl = document.getElementById('shCats');
    Array.prototype.forEach.call(catsEl.querySelectorAll('[data-cat]'), function (b) {
      b.onclick = function () { history.replaceState({ shopIn: true }, '', location.pathname + location.search + (b.dataset.cat ? '#shop/c/' + b.dataset.cat : '#shop')); lastHash = location.hash; ST.cat = b.dataset.cat; renderList(); };
    });
    var on = catsEl.querySelector('.on'); if (on && on.scrollIntoView && ST.cat) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    var qEl = document.getElementById('shQ');
    qEl.oninput = function () { ST.q = qEl.value; document.getElementById('shClr').classList.toggle('hidden', !ST.q); fillGrid(); };
    document.getElementById('shClr').onclick = function () { ST.q = ''; qEl.value = ''; this.classList.add('hidden'); fillGrid(); qEl.focus(); };
    document.getElementById('shSort').onchange = function () { ST.sort = this.value; fillGrid(); };
    if (focused) { qEl.focus(); var n = qEl.value.length; try { qEl.setSelectionRange(n, n); } catch (e) { } }
    fillGrid();
  }
  function fillGrid() {
    var list = filtered(), g = document.getElementById('shGrid');
    document.getElementById('shCnt').textContent = list.length + ' منتج';
    if (!list.length) {
      g.outerHTML = '<div class="sh-grid" id="shGrid"></div><div class="sh-empty" id="shNone"><div>' + (ST.q ? '🔍' : '📦') + '</div>' +
        (ST.q ? 'مفيش منتج بالاسم ده' : DATA.products.length ? 'مفيش منتجات في القسم ده دلوقتي' : 'المنتجات هتنزل هنا قريب') + '</div>';
      return;
    }
    var none = document.getElementById('shNone'); if (none) none.remove();
    g.innerHTML = list.map(card).join(''); bindCards(g);
  }

  function renderProduct(id) {
    var p = prodById(id);
    if (!p) {
      view.innerHTML = topBar('تصفح منتجاتنا', false) + '<div class="sh-empty"><div>📦</div>المنتج ده مش متاح دلوقتي</div>';
      return bindBack();
    }
    var c = catById(p.category_id), off = pct(p), imgs = p.images || [];
    var rel = DATA.products.filter(function (x) { return x.id !== p.id && x.category_id === p.category_id; }).slice(0, 10);
    view.innerHTML = topBar(esc(p.name), false) +
      '<div class="pd-gal">' + (imgs.length ? '<div class="pd-track" id="pdTrack">' + imgs.map(function (im, i) { return img(im.u, p.name, ' data-i="' + i + '"' + (i ? ' loading="lazy"' : '')); }).join('') + '</div>' +
        '<span class="pd-zoomhint">🔍 اضغط للتكبير</span>' + (imgs.length > 1 ? '<div class="pd-dots" id="pdDots">' + imgs.map(function (x, i) { return '<i' + (i ? '' : ' class="on"') + '></i>'; }).join('') + '</div>' : '')
        : '<div style="height:100%;display:grid;place-items:center"><span class="noimg">📦</span></div>') + '</div>' +
      (imgs.length > 1 ? '<div class="pd-thumbs" id="pdThumbs">' + imgs.map(function (im, i) { return '<button type="button" data-i="' + i + '"' + (i ? '' : ' class="on"') + '>' + img(im.t || im.u, '') + '</button>'; }).join('') + '</div>' : '') +
      '<div class="pd-body">' + (c ? '<button type="button" class="pd-cat" id="pdCat">' + (c.image ? '' : esc(c.icon || '') + ' ') + esc(c.name) + '</button>' : '') +
      '<h1 class="pd-name">' + esc(p.name) + '</h1>' +
      '<div class="pd-price"><b>' + money(p.price) + '</b>' + (off ? '<s>' + money(p.old_price) + '</s><span class="sv">خصم ' + off + '% · وفّر ' + money(p.old_price - p.price) + '</span>' : '') + '</div>' +
      '<span class="pd-av ' + (p.available ? 'y">✓ متوفر' : 'n">✕ غير متوفر حالياً') + '</span>' +
      (p.colors && p.colors.length ? '<div class="pd-sec"><h3>الألوان المتاحة</h3><div class="pd-sw">' + p.colors.map(function (k) { return '<span>' + (k.c ? '<i style="background:' + esc(k.c) + '"></i>' : '') + esc(k.n) + '</span>'; }).join('') + '</div></div>' : '') +
      (p.variants && p.variants.length ? '<div class="pd-sec"><h3>الاختيارات المتاحة</h3><div class="pd-sw">' + p.variants.map(function (v) { return '<span>' + esc(v) + '</span>'; }).join('') + '</div></div>' : '') +
      (p.description ? '<div class="pd-sec"><h3>الوصف</h3><div class="pd-desc">' + esc(p.description) + '</div></div>' : '') +
      (p.specs && p.specs.length ? '<div class="pd-sec"><h3>المواصفات</h3><table class="pd-specs">' + p.specs.map(function (s) { return '<tr><td dir="auto">' + esc(s[0]) + '</td><td dir="auto">' + esc(s[1]) + '</td></tr>'; }).join('') + '</table></div>' : '') +
      (rel.length ? '<div class="pd-sec" style="background:transparent;border:0;padding:0"><h3>منتجات مشابهة</h3><div class="pd-rel" id="pdRel">' + rel.map(card).join('') + '</div></div>' : '') +
      '</div><div class="sh-pad"></div>' +
      '<div class="pd-buy"><div class="in"><span class="pp">' + money(p.price) + '</span><button type="button" class="order-btn" id="orderBtn"' + (p.available ? '' : ' disabled') + '>' +
      (p.available ? '🛒 اطلب المنتج الآن' : 'غير متوفر حالياً') + '</button></div></div>';
    bindBack();
    if (p.available) document.getElementById('orderBtn').onclick = function () { orderSheet(p); };
    if (c) document.getElementById('pdCat').onclick = function () { nav('#shop/c/' + c.id); };
    var rl = document.getElementById('pdRel'); if (rl) bindCards(rl);
    var track = document.getElementById('pdTrack');
    if (!track) return;
    var dots = document.getElementById('pdDots'), th = document.getElementById('pdThumbs');
    var idx = function () { return Math.round(track.scrollLeft / track.clientWidth); };
    track.addEventListener('scroll', function () {
      var i = idx();
      if (dots) Array.prototype.forEach.call(dots.children, function (d, k) { d.className = k === i ? 'on' : ''; });
      if (th) Array.prototype.forEach.call(th.children, function (d, k) { d.className = k === i ? 'on' : ''; });
    }, { passive: true });
    if (th) Array.prototype.forEach.call(th.children, function (b) { b.onclick = function () { track.scrollTo({ left: Number(b.dataset.i) * track.clientWidth, behavior: 'smooth' }); }; });
    Array.prototype.forEach.call(track.querySelectorAll('img'), function (im) { im.onclick = function () { zoom(imgs, Number(im.dataset.i)); }; });
  }


  /* ---------- اطلب المنتج الآن ---------- */
  function orderSheet(p) {
    var colors = p.colors || [], vars = p.variants || [];
    var S = { color: colors.length === 1 ? colors[0].n : '', variant: vars.length === 1 ? vars[0] : '', qty: 1 };
    var o = document.createElement('div'); o.className = 'osh'; o.dir = 'rtl';
    document.body.appendChild(o);
    function close() { o.remove(); }
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    function draw() {
      var t = thumb(p);
      o.innerHTML = '<div class="bx"><div class="hd"><div class="t">' + (t ? img(t, '') : '📦') + '</div><div><b>' + esc(p.name) + '</b><span class="small muted">' + money(p.price) + ' للقطعة</span></div><button type="button" class="x" data-x>×</button></div>' +
        (colors.length ? '<h4>اختار اللون</h4><div class="ochips">' + colors.map(function (c, i) { return '<button type="button" data-c="' + i + '"' + (S.color === c.n ? ' class="on"' : '') + '>' + (c.c ? '<i style="background:' + esc(c.c) + '"></i>' : '') + esc(c.n) + '</button>'; }).join('') + '</div>' : '') +
        (vars.length ? '<h4>اختار النوع</h4><div class="ochips">' + vars.map(function (v, i) { return '<button type="button" data-v="' + i + '"' + (S.variant === v ? ' class="on"' : '') + '>' + esc(v) + '</button>'; }).join('') + '</div>' : '') +
        '<h4>الكمية</h4><div class="oqty"><button type="button" data-q="-1" aria-label="أقل">−</button><span id="oQty">' + S.qty + '</span><button type="button" data-q="1" aria-label="أكتر">+</button></div>' +
        '<h4>ملاحظات (اختياري)</h4><textarea id="oNotes" rows="2" maxlength="500" placeholder="مثلاً: هعدي أستلمه بكرة الضهر"></textarea>' +
        '<div class="ototal"><span>الإجمالي</span><b id="oTot">' + money(p.price * S.qty) + '</b></div>' +
        '<div id="oErr"></div><button type="button" class="order-btn" id="oSend" style="width:100%">تأكيد الطلب</button>' +
        '<p class="small muted" style="text-align:center;margin:10px 0 0">الطلب بيتراجع من المحل، وتقدر تتابعه من «طلباتي»</p></div>';
      o.querySelector('[data-x]').onclick = close;
      Array.prototype.forEach.call(o.querySelectorAll('[data-c]'), function (b) { b.onclick = function () { S.color = colors[+b.dataset.c].n; keep(); draw(); }; });
      Array.prototype.forEach.call(o.querySelectorAll('[data-v]'), function (b) { b.onclick = function () { S.variant = vars[+b.dataset.v]; keep(); draw(); }; });
      Array.prototype.forEach.call(o.querySelectorAll('[data-q]'), function (b) {
        b.onclick = function () { S.qty = Math.min(50, Math.max(1, S.qty + Number(b.dataset.q))); o.querySelector('#oQty').textContent = S.qty; o.querySelector('#oTot').innerHTML = money(p.price * S.qty); };
      });
      var nt = o.querySelector('#oNotes'); nt.value = S.notes || ''; nt.oninput = function () { S.notes = nt.value; };
      o.querySelector('#oSend').onclick = send;
    }
    function keep() { var nt = o.querySelector('#oNotes'); if (nt) S.notes = nt.value; }
    function err(m) { o.querySelector('#oErr').innerHTML = '<div class="err">' + esc(m) + '</div>'; }
    function send() {
      if (colors.length && !S.color) return err('اختار اللون الأول');
      if (vars.length && !S.variant) return err('اختار النوع الأول');
      var b = o.querySelector('#oSend'); b.disabled = true; b.textContent = 'جاري إرسال الطلب…';
      rpc(['order', { token: token(), product_id: p.id, color: S.color, variant: S.variant, qty: S.qty, notes: S.notes || '' }]).then(function (r) {
        o.innerHTML = '<div class="bx"><div class="odone"><div class="ic">✅</div><h2 style="margin:6px 0">تم إرسال طلبك</h2><div class="small muted">رقم الطلب</div><div class="no">#' + r.order_no + '</div>' +
          '<div class="small muted" style="margin-bottom:14px">الطلب قيد المراجعة من المحل. هتلاقي حالته في «طلباتي».</div>' +
          '<button type="button" class="order-btn" id="oMy" style="width:100%">📦 طلباتي</button><div style="height:8px"></div><button type="button" class="btn ghost" id="oBack">رجوع للمنتج</button></div></div>';
        o.querySelector('#oMy').onclick = function () { close(); nav('#shop/orders'); };
        o.querySelector('#oBack').onclick = close;
      }).catch(function (e) { err(e.message); b.disabled = false; b.textContent = 'تأكيد الطلب'; if (/غير متوفر|مش متاح/.test(e.message)) load(); });
    }
    draw();
  }

  /* ---------- طلباتي ---------- */
  var ORDERS = null;
  function loadOrders() {
    return rpc(['myOrders', { token: token() }]).then(function (r) { ORDERS = r; return r; });
  }
  function orderCard(x) {
    return '<a class="oc" href="#shop/orders/' + esc(x.id) + '" data-oid="' + esc(x.id) + '"><div class="t">' + (x.image ? img(x.image, '') : '📦') + '</div>' +
      '<div class="m"><b>' + esc(x.product_name) + '</b><small>طلب #' + x.order_no + ' · ' + esc(dt(x.created_at)) + '</small><small>الكمية ' + x.qty + ' · ' + money(x.total) + '</small></div>' + stBadge(x.status) + '</a>';
  }
  function renderOrders() {
    view.innerHTML = topBar('📦 طلباتي', false) + '<div class="ol" id="olist">' + (ORDERS ? '' : '<div class="sk" style="height:84px"></div><div class="sk" style="height:84px"></div>') + '</div>';
    bindBack();
    if (ORDERS) fillOrders();
    loadOrders().then(function () { if (/^#shop\/orders$/.test(location.hash)) fillOrders(); }).catch(function (e) {
      var l = document.getElementById('olist'); if (l && !ORDERS) l.innerHTML = '<div class="sh-empty"><div>⚠️</div>' + esc(e.message) + '</div>';
    });
  }
  function fillOrders() {
    var l = document.getElementById('olist'); if (!l) return;
    if (!ORDERS.length) { l.innerHTML = '<div class="sh-empty"><div>📦</div>لسه ما طلبتش حاجة.<br>ادخل «تصفح منتجاتنا» واختار اللي يعجبك.<br><br><button type="button" class="btn sm" id="oGoShop">تصفح منتجاتنا</button></div>'; document.getElementById('oGoShop').onclick = function () { nav('#shop'); }; return; }
    l.innerHTML = ORDERS.map(orderCard).join('');
    Array.prototype.forEach.call(l.querySelectorAll('[data-oid]'), function (a) { a.onclick = function (e) { e.preventDefault(); nav('#shop/orders/' + a.dataset.oid); }; });
  }
  function renderOrder(id) {
    var x = (ORDERS || []).filter(function (o) { return o.id === id; })[0];
    if (!x) {
      view.innerHTML = topBar('تفاصيل الطلب', false) + '<div class="ol"><div class="sk" style="height:240px"></div></div>'; bindBack();
      return loadOrders().then(function () { if (location.hash === '#shop/orders/' + id) { if ((ORDERS || []).some(function (o) { return o.id === id; })) renderOrder(id); else { view.innerHTML = topBar('تفاصيل الطلب', false) + '<div class="sh-empty"><div>📦</div>الطلب ده مش موجود</div>'; bindBack(); } } })
        .catch(function (e) { view.innerHTML = topBar('تفاصيل الطلب', false) + '<div class="sh-empty"><div>⚠️</div>' + esc(e.message) + '</div>'; bindBack(); });
    }
    var row = function (k, v) { return '<div class="od-row"><span>' + k + '</span><span>' + v + '</span></div>'; };
    view.innerHTML = topBar('طلب #' + x.order_no, false) + '<div class="ol">' +
      '<div class="oc" style="cursor:default"><div class="t">' + (x.image ? img(x.image, '') : '📦') + '</div><div class="m"><b style="white-space:normal">' + esc(x.product_name) + '</b></div></div>' +
      '<div class="pd-sec" style="margin:0"><div class="od-row"><span>الحالة</span><span>' + stBadge(x.status) + '</span></div>' +
      (x.status === 'rejected' && x.reject_reason ? row('سبب الرفض', '<b style="color:#F87171">' + esc(x.reject_reason) + '</b>') : '') +
      row('رقم الطلب', '#' + x.order_no) + row('تاريخ الطلب', esc(dt(x.created_at))) +
      (x.color ? row('اللون', esc(x.color)) : '') + (x.variant ? row('النوع', esc(x.variant)) : '') +
      row('الكمية', x.qty) + row('سعر القطعة وقت الطلب', money(x.unit_price)) + row('الإجمالي', '<b style="color:var(--brand)">' + money(x.total) + '</b>') +
      (x.notes ? row('ملاحظاتك', esc(x.notes)) : '') + '</div>' +
      '<div class="pd-sec" style="margin:0"><h3>متابعة الطلب</h3><ul class="otl">' + (x.history || []).map(function (h) { return '<li>' + esc(ST_AR[h.s] || h.s) + '<small>' + esc(dt(h.at)) + '</small></li>'; }).join('') + '</ul></div>' +
      (x.status === 'pending' ? '<div id="ocErr"></div><button type="button" class="btn ghost" id="oCancel" style="color:#F87171">إلغاء الطلب</button>' : '') +
      '</div>';
    bindBack();
    var cb = document.getElementById('oCancel');
    if (cb) cb.onclick = function () {
      if (cb.dataset.sure !== '1') { cb.dataset.sure = '1'; cb.textContent = 'متأكد؟ اضغط تاني لإلغاء الطلب'; return; }
      cb.disabled = true;
      rpc(['cancelOrder', { token: token(), id: x.id }]).then(function () { return loadOrders(); }).then(function () { renderOrder(x.id); })
        .catch(function (e) { document.getElementById('ocErr').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; cb.disabled = false; loadOrders().then(function () { renderOrder(x.id); }); });
    };
  }

  /* ---------- عرض الصور بالكامل: تكبير بإصبعين أو ضغطتين، وسحب للتنقل ---------- */
  function zoom(imgs, start) {
    var i = start, s = 1, x = 0, y = 0;
    var o = document.createElement('div'); o.className = 'zv';
    o.innerHTML = '<div class="zv-top"><span id="zvN"></span><button type="button" id="zvX" aria-label="إغلاق">×</button></div><div class="zv-stage" id="zvS"><img id="zvI" alt=""></div>' +
      (imgs.length > 1 ? '' : '') + '<div class="zv-hint">ضغطتين أو إصبعين للتكبير</div>';
    document.body.appendChild(o);
    var stage = o.querySelector('#zvS'), img = o.querySelector('#zvI');
    if (imgs.length > 1) {
      stage.insertAdjacentHTML('beforeend', '<button type="button" class="zv-nav" style="left:10px" id="zvP">‹</button><button type="button" class="zv-nav" style="right:10px" id="zvF">›</button>');
      o.querySelector('#zvP').onclick = function () { show(i - 1); };
      o.querySelector('#zvF').onclick = function () { show(i + 1); };
    }
    function apply() { img.style.transform = 'translate(-50%,-50%) translate(' + x + 'px,' + y + 'px) scale(' + s + ')'; }
    function show(k) { i = (k + imgs.length) % imgs.length; s = 1; x = 0; y = 0; img.src = imgs[i].u; o.querySelector('#zvN').textContent = imgs.length > 1 ? (i + 1) + ' / ' + imgs.length : ''; apply(); }
    function close() { document.removeEventListener('keydown', key); o.remove(); }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key);
    o.querySelector('#zvX').onclick = close;
    var pts = {}, d0 = 0, s0 = 1, last = null, lastTap = 0, moved = false, sx = 0;
    function dist() { var a = Object.keys(pts).map(function (k) { return pts[k]; }); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.tagName === 'BUTTON') return;
      stage.setPointerCapture(e.pointerId); pts[e.pointerId] = { x: e.clientX, y: e.clientY }; moved = false; sx = e.clientX;
      if (Object.keys(pts).length === 2) { d0 = dist(); s0 = s; }
      last = { x: e.clientX, y: e.clientY };
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (Object.keys(pts).length === 2) { s = Math.min(5, Math.max(1, s0 * dist() / d0)); if (s === 1) { x = 0; y = 0; } moved = true; apply(); return; }
      if (s > 1) { x += e.clientX - last.x; y += e.clientY - last.y; apply(); }
      if (Math.abs(e.clientX - sx) > 8) moved = true;
      last = { x: e.clientX, y: e.clientY };
    });
    function up(e) {
      if (!pts[e.pointerId]) return;
      var n = Object.keys(pts).length; delete pts[e.pointerId];
      if (n === 1 && s === 1 && imgs.length > 1 && Math.abs(e.clientX - sx) > 50) return show(i + (e.clientX < sx ? 1 : -1));
      if (n === 1 && !moved) {
        var now = Date.now();
        if (now - lastTap < 320) { if (s > 1) { s = 1; x = 0; y = 0; } else { var r = stage.getBoundingClientRect(); s = 2.5; x = -(e.clientX - r.left - r.width / 2) * 1.5; y = -(e.clientY - r.top - r.height / 2) * 1.5; } apply(); lastTap = 0; }
        else lastTap = now;
      }
      if (Object.keys(pts).length === 1) { var k = Object.keys(pts)[0]; last = pts[k]; }
    }
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', function (e) { e.preventDefault(); s = Math.min(5, Math.max(1, s * (e.deltaY < 0 ? 1.15 : 0.87))); if (s === 1) { x = 0; y = 0; } apply(); }, { passive: false });
    show(i);
  }

  load();
  if (isShop()) route();
  // زرار ⟳ في الكارت يحدّث المنتجات كمان
  var rb = document.getElementById('refreshBtn'); if (rb) rb.addEventListener('click', function () { load(); });
  // لو صفحة الكارت اترسمت تاني نتأكد إن زرار المنتجات لسه موجود
  new MutationObserver(placeEntry).observe(app, { childList: true });
})();
