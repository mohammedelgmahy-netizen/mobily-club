/* موبايلي - Mobily — لوحة الإدارة: «المنتجات» و«طلبات المنتجات» و«أكواد الخصم» («تصفح منتجاتنا»)
 * بيستخدم أدوات لوحة الإدارة الموجودة: api, SESSION, esc, $, $all, modal, closeModal, toast, busy, loading, go, money */
(function () {
  'use strict';
  var CSS = [
    '.sp-tabs{display:flex;gap:6px;background:#EEF2FA;padding:4px;border-radius:14px;margin-bottom:12px}',
    '.sp-tabs button{flex:1;border:0;background:transparent;font:inherit;font-weight:800;font-size:14px;padding:9px;border-radius:10px;cursor:pointer;color:#5B6683}',
    '.sp-tabs button.on{background:#fff;color:#0B1222;box-shadow:0 2px 8px rgba(11,18,34,.08)}',
    '.sp-list{display:flex;flex-direction:column;gap:10px}',
    '.sp-item{display:flex;gap:12px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:10px;background:#fff}',
    '.sp-item.off{opacity:.6}',
    '.sp-th{width:64px;height:64px;border-radius:12px;background:#F3F5FA;flex:0 0 auto;display:grid;place-items:center;overflow:hidden;font-size:26px}',
    '.sp-th img{width:100%;height:100%;object-fit:contain}',
    '.sp-info{flex:1;min-width:0}.sp-info>b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14.5px;line-height:1.45;unicode-bidi:plaintext;text-align:right}',
    '.sp-info .m{font-size:12.5px;color:#5B6683;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;margin-top:3px}',
    '.sp-acts{display:flex;flex-direction:column;gap:6px;align-items:stretch;flex:0 0 auto}',
    '.sp-acts .btn{padding:6px 10px;font-size:12.5px}',
    '.sp-tg{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#5B6683;cursor:pointer;margin:0;white-space:nowrap}',
    '.sp-tg input{width:18px;height:18px;margin:0}',
    '.sp-imgs{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}',
    '.sp-img{position:relative;width:92px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#F8FAFC}',
    '.sp-img img{width:92px;height:92px;object-fit:contain;display:block;background:#fff}',
    '.sp-img .main{position:absolute;top:4px;right:4px;background:#0891B2;color:#fff;font-size:10.5px;font-weight:800;border-radius:999px;padding:1px 7px}',
    '.sp-img .ctl{display:flex;justify-content:space-between;border-top:1px solid var(--line)}',
    '.sp-img .ctl button{flex:1;border:0;background:transparent;font-size:15px;padding:4px 0;cursor:pointer}',
    '.sp-add{width:92px;height:118px;border:2px dashed #CBD5E1;border-radius:12px;display:grid;place-items:center;text-align:center;font-size:12.5px;font-weight:700;color:#5B6683;cursor:pointer;background:#fff}',
    '.sp-add input{display:none}',
    '.sp-rows .r{display:flex;gap:8px;margin-bottom:8px;align-items:center}',
    '.sp-rows .r input{min-width:0}',
    '.sp-rows .r .x{flex:0 0 auto;width:38px;height:38px;border-radius:10px;border:1px solid var(--line);background:#fff;color:#DC2626;font-size:18px;cursor:pointer}',
    '.sp-rows .r input[type=color]{flex:0 0 46px;width:46px;height:42px;padding:3px}',
    '.sp-pricebox{background:#F8FAFC;border:1px solid var(--line);border-radius:14px;padding:4px 12px 12px}',
    '.sp-prev{font-size:13px;margin-top:8px;color:#5B6683}.sp-prev b{color:#0891B2;font-size:15px}',
    '.sp-catrow{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:14px;padding:10px;background:#fff}',
    '.sp-catrow.off{opacity:.55}',
    '.sp-catrow .ic{width:44px;height:44px;border-radius:12px;background:#EEF2FA;display:grid;place-items:center;font-size:22px;overflow:hidden;flex:0 0 auto}',
    '.sp-catrow .ic img{width:100%;height:100%;object-fit:cover}',
    '.sp-catrow .nm{flex:1;min-width:0}.sp-catrow .nm b{display:block}',
    '.sp-mv{display:flex;flex-direction:column;gap:2px}.sp-mv button{border:1px solid var(--line);background:#fff;border-radius:8px;width:32px;height:24px;cursor:pointer;font-size:12px}',
    '.sp-mv button:disabled{opacity:.3;cursor:default}',
    'img.ld:not(.ok){background:linear-gradient(90deg,#EEF1F6,#F8FAFC,#EEF1F6);background-size:200% 100%;animation:spsk 1.2s infinite}',
    '@keyframes spsk{to{background-position:-200% 0}}',
    '.imgfail{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;min-height:60px;color:#94A3B8;font-size:22px;background:#F1F5F9;text-align:center}',
    '.imgfail small{font-size:10.5px;font-weight:700}',
    '.sp-item{cursor:pointer}',
    '.sp-edit{background:#0891B2!important;color:#fff!important;border:0!important;font-weight:800}',
    '.sp-code{font-family:Inter,monospace;font-size:11.5px;background:#EEF2FA;color:#334155;border-radius:6px;padding:1px 7px;direction:ltr}',
    '.sp-img .ctl button.rp{font-size:12px;font-weight:700}',
    '.so-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}.so-filters>*{flex:1 1 140px;min-width:0}',
    '.so-st{display:flex;gap:6px;overflow-x:auto;margin-bottom:10px;padding-bottom:2px}',
    '.so-st button{flex:0 0 auto;border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;color:#334155}',
    '.so-st button.on{background:#0B1222;color:#fff;border-color:#0B1222}',
    '.so-item{border:1px solid var(--line);border-radius:14px;padding:12px;background:#fff;cursor:pointer;display:flex;gap:12px;align-items:flex-start}',
    '.so-item .th{width:56px;height:56px;border-radius:10px;background:#F3F5FA;flex:0 0 auto;overflow:hidden;display:grid;place-items:center;font-size:24px}',
    '.so-item .th img{width:100%;height:100%;object-fit:contain}',
    '.so-item .bd{flex:1;min-width:0}.so-item .top{display:flex;justify-content:space-between;gap:8px;align-items:center}',
    '.so-item .top b{font-family:Inter,sans-serif}.so-item .ln{font-size:13px;color:#334155;margin-top:2px}.so-item .ln.mu{color:#5B6683;font-size:12.5px}',
    '.ost{display:inline-block;font-size:11.5px;font-weight:800;padding:2px 10px;border-radius:999px;white-space:nowrap}',
    '.ost.pending{background:#FEF3C7;color:#92400E}.ost.approved{background:#E0F2FE;color:#0369A1}.ost.preparing{background:#EDE9FE;color:#6D28D9}.ost.ready{background:#D1FAE5;color:#047857}',
    '.ost.completed{background:#DCFCE7;color:#166534}.ost.rejected{background:#FEE2E2;color:#B91C1C}.ost.cancelled{background:#F1F5F9;color:#475569}',
    '.so-det .r{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed var(--line);font-size:14px}.so-det .r span:first-child{color:#5B6683;font-weight:700;flex:0 0 auto}',
    '.so-det .r span:last-child{text-align:left;unicode-bidi:plaintext}',
    '.so-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.so-acts .btn{flex:1 1 140px}',
    '.so-sts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}',
    '.so-sts button{border:1.5px solid var(--line);background:#fff;border-radius:12px;padding:10px;font:inherit;font-weight:800;font-size:13px;cursor:pointer}',
    '.so-sts button.on{border-color:#0891B2;background:#E0F2FE}',
    '.so-hist{margin:6px 0 0;padding:0 18px 0 0;font-size:13px;color:#334155}.so-hist small{color:#5B6683}',
    '.ost.shipped{background:#DBEAFE;color:#1D4ED8}',
    '.so-sum{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}.so-sum div{flex:1 1 120px;background:#F8FAFC;border:1px solid var(--line);border-radius:12px;padding:8px 10px}',
    '.so-sum small{display:block;color:#5B6683;font-size:11.5px;font-weight:700}.so-sum b{font-size:15px}',
    '.so-its{border:1px solid var(--line);border-radius:12px;overflow:hidden;margin:8px 0}',
    '.so-its .it{display:flex;gap:10px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--line)}.so-its .it:last-child{border-bottom:0}',
    '.so-its .th{width:44px;height:44px;border-radius:8px;background:#F3F5FA;flex:0 0 auto;overflow:hidden;display:grid;place-items:center}.so-its .th img{width:100%;height:100%;object-fit:contain}',
    '.so-its .m{flex:1;min-width:0;font-size:13px}.so-its .m b{display:block}.so-its .m small{color:#5B6683}.so-its .lt{font-weight:800;white-space:nowrap}',
    '.so-promo{font-family:Inter,monospace;font-size:11.5px;background:#DCFCE7;color:#166534;border-radius:6px;padding:1px 7px;direction:ltr}',
    '.pm-item{border:1px solid var(--line);border-radius:14px;padding:12px;background:#fff;cursor:pointer}',
    '.pm-item .top{display:flex;align-items:center;gap:8px;justify-content:space-between}',
    '.pm-item .cd{font-family:Inter,monospace;font-weight:800;font-size:16px;direction:ltr}',
    '.pm-item .ln{font-size:13px;color:#334155;margin-top:4px}.pm-item .ln.mu{color:#5B6683;font-size:12.5px}',
    '.pm-st{font-size:11.5px;font-weight:800;padding:2px 10px;border-radius:999px}.pm-st.on{background:#DCFCE7;color:#166534}.pm-st.off{background:#F1F5F9;color:#475569}.pm-st.exp{background:#FEE2E2;color:#B91C1C}.pm-st.soon{background:#FEF3C7;color:#92400E}',
    '.pm-pick{max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:6px 10px;background:#fff}',
    '.pm-pick label{display:flex;align-items:center;gap:8px;margin:0;padding:6px 0;font-weight:600;font-size:13.5px;cursor:pointer;border-bottom:1px dashed #EEF2FA}',
    '.pm-pick label:last-child{border-bottom:0}.pm-pick input{width:18px;height:18px;margin:0;flex:0 0 auto}',
    '.pm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 10px}',
    '.pm-stats{display:flex;gap:8px;margin-bottom:6px}.pm-stats div{flex:1;background:#F5F3FF;border-radius:12px;padding:8px 10px}.pm-stats small{display:block;color:#5B6683;font-size:11.5px;font-weight:700}.pm-stats b{font-size:16px}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  var SD = { categories: [], products: [] }, TAB = 'products', F = { q: '', cat: '' };

  function sh(action, payload) {
    return api('shopAdmin', SESSION, action, payload || {}).catch(function (e) {
      if (e.code === 'SESSION_EXPIRED' || e.message === 'SESSION_EXPIRED') { SESSION = ''; store('mc_admin_sess', null); showLogin('انتهت الجلسة، سجّل الدخول مرة أخرى'); throw new Error('انتهت الجلسة'); }
      throw e;
    });
  }
  function arr(v) { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { var x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch (e) { return []; } } return []; }
  function fixSD(r) { (r.products || []).forEach(function (p) { ['images', 'specs', 'colors', 'variants'].forEach(function (k) { p[k] = arr(p[k]); }); }); return r; }
  function img(src, extra) { return '<img class="ld" src="' + esc(src) + '" alt=""' + (extra || '') + ' onload="this.classList.add(\'ok\')" onerror="__spImgErr(this)">'; }
  window.__spImgErr = function (el) { var f = document.createElement('span'); f.className = 'imgfail'; f.innerHTML = '📷<small>الصورة مش متاحة</small>'; el.replaceWith(f); };
  function catName(id) { var c = SD.categories.filter(function (x) { return x.id === id; })[0]; return c ? c.name : 'بدون قسم'; }
  function pct(price, old) { return old > price && old > 0 ? Math.round((1 - price / old) * 100) : 0; }
  function numVal(el) { var v = String(el.value || '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/,/g, '').trim(); return v === '' ? 0 : Number(v); }

  window.viewProducts = function (v) {
    sh('list').then(function (r) { SD = fixSD(r); draw(v); }).catch(function (e) { v.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
  };
  function reload() { return sh('list').then(function (r) { SD = fixSD(r); var v = $('#viewIn'); if (v && CUR === 'products') draw(v); }); }

  function draw(v) {
    v.innerHTML = '<div class="card"><div class="toolbar"><h2 style="margin:0;flex:1">🛍️ المنتجات — تصفح منتجاتنا</h2></div>' +
      '<p class="muted small" style="margin:0 0 10px">أي تعديل هنا بيظهر للعملاء في «تصفح منتجاتنا» على طول.</p>' +
      '<div class="sp-tabs"><button type="button" data-t="products" class="' + (TAB === 'products' ? 'on' : '') + '">المنتجات (' + SD.products.length + ')</button>' +
      '<button type="button" data-t="cats" class="' + (TAB === 'cats' ? 'on' : '') + '">الأقسام (' + SD.categories.length + ')</button></div><div id="spBody"></div></div>';
    $all('.sp-tabs button', v).forEach(function (b) { b.onclick = function () { TAB = b.dataset.t; draw(v); }; });
    if (TAB === 'cats') drawCats($('#spBody')); else drawProducts($('#spBody'));
  }

  /* ---------------- المنتجات ---------------- */
  function drawProducts(el) {
    el.innerHTML = '<div class="row" style="flex-wrap:wrap;margin-bottom:10px"><input id="spQ" placeholder="🔍 بحث باسم المنتج أو الكود" value="' + esc(F.q) + '" style="flex:2;min-width:180px">' +
      '<select id="spCat" style="flex:1;min-width:140px"><option value="">كل الأقسام</option>' + SD.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (F.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<button class="btn sm" id="spNew" type="button" style="flex:0 0 auto">+ منتج جديد</button></div><div id="spList" class="sp-list"></div>';
    $('#spNew').onclick = function () { productForm(null); };
    $('#spQ').oninput = function () { F.q = this.value; list(); };
    $('#spCat').onchange = function () { F.cat = this.value; list(); };
    list();
  }
  function list() {
    var q = F.q.trim().toLowerCase();
    var rows = SD.products.filter(function (p) { return (!F.cat || p.category_id === F.cat) && (!q || p.name.toLowerCase().indexOf(q) >= 0 || String(p.code || '').toLowerCase().indexOf(q) >= 0); });
    var box = $('#spList');
    if (!rows.length) { box.innerHTML = '<div class="empty">' + (SD.products.length ? 'مفيش منتجات بالبحث ده' : 'لسه مفيش منتجات. اضغط «+ منتج جديد» وضيف أول منتج.') + '</div>'; return; }
    box.innerHTML = rows.map(function (p) {
      var t = p.images && p.images[0] ? (p.images[0].t || p.images[0].u) : '', off = pct(Number(p.price), Number(p.old_price));
      return '<div class="sp-item' + (p.hidden ? ' off' : '') + '" data-open="' + esc(p.id) + '"><div class="sp-th">' + (t ? img(t) : '📦') + '</div>' +
        '<div class="sp-info"><b>' + esc(p.name) + '</b><div class="m">' + (p.code ? '<span class="sp-code">' + esc(p.code) + '</span>' : '') + '<span>' + esc(catName(p.category_id)) + '</span><b style="display:inline;color:#0891B2">' + money(p.price) + '</b>' +
        (off ? '<s>' + money(p.old_price) + '</s><span class="badge red">-' + off + '%</span>' : '') + (p.hidden ? '<span class="badge gray">مخفي</span>' : '') + '</div>' +
        '<div class="m" style="margin-top:6px"><label class="sp-tg"><input type="checkbox" data-av="' + esc(p.id) + '"' + (p.available ? ' checked' : '') + '>متوفر</label>' +
        '<label class="sp-tg"><input type="checkbox" data-vis="' + esc(p.id) + '"' + (p.hidden ? '' : ' checked') + '>ظاهر للعملاء</label></div></div>' +
        '<div class="sp-acts"><button class="btn sm sp-edit" type="button" data-ed="' + esc(p.id) + '">✏️ تعديل</button></div></div>';
    }).join('');
    $all('[data-open]', box).forEach(function (row) {
      row.onclick = function (e) { if (e.target.closest('label,input')) return; productForm(SD.products.filter(function (p) { return p.id === row.dataset.open; })[0]); };
    });
    $all('[data-av],[data-vis]', box).forEach(function (cb) {
      cb.onchange = function () {
        var id = cb.dataset.av || cb.dataset.vis, field = cb.dataset.av ? 'available' : 'hidden', value = cb.dataset.av ? cb.checked : !cb.checked;
        cb.disabled = true;
        sh('setProduct', { id: id, field: field, value: value }).then(function () {
          var p = SD.products.filter(function (x) { return x.id === id; })[0]; if (p) p[field] = value;
          toast('تم ✓'); list();
        }).catch(function (e) { cb.checked = !cb.checked; cb.disabled = false; toast(e.message, true); });
      };
    });
  }

  /* تصغير الصورة في الموبايل قبل الرفع: صورة كبيرة واضحة + صورة صغيرة سريعة للقوائم */
  function resize(file, max, q) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
      };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('الملف ده مش صورة')); };
      im.src = url;
    });
  }
  function uploadFile(file) {
    return resize(file, 1400, 0.86).then(function (full) {
      return sh('upload', { dataUrl: full }).then(function (a) {
        return resize(file, 480, 0.82).then(function (small) { return sh('upload', { dataUrl: small }); }).then(function (b) { return { u: a.url, t: b.url }; });
      });
    });
  }

  function productForm(p) {
    var isNew = !p;
    p = p || { name: '', code: '', category_id: F.cat || '', description: '', price: '', old_price: '', available: true, hidden: false, images: [], specs: [], colors: [], variants: [] };
    var IM = (p.images || []).slice(), SP = (p.specs || []).map(function (s) { return [s[0], s[1]]; }), CO = (p.colors || []).map(function (c) { return { n: c.n, c: c.c }; });
    var body = modal(isNew ? 'منتج جديد' : 'تعديل المنتج',
      '<label>اسم المنتج *</label><input id="pfName" value="' + esc(p.name) + '" maxlength="150">' +
      '<label>كود المنتج <span class="muted small">(اختياري، للبحث وللطلبات)</span></label><input id="pfCode" value="' + esc(p.code || '') + '" maxlength="40" style="direction:ltr">' +
      '<label>القسم</label><select id="pfCat"><option value="">بدون قسم</option>' + SD.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === p.category_id ? ' selected' : '') + '>' + esc((c.icon ? c.icon + ' ' : '') + c.name) + (c.hidden ? ' (مخفي)' : '') + '</option>'; }).join('') + '</select>' +
      '<label>صور المنتج <span class="muted small">(أول صورة هي الصورة الرئيسية)</span></label><div class="sp-imgs" id="pfImgs"></div>' +
      '<label>السعر والخصم</label><div class="sp-pricebox"><div class="row"><div><label>سعر البيع *</label><input id="pfPrice" inputmode="decimal" value="' + esc(p.price === '' ? '' : Number(p.price)) + '"></div>' +
      '<div><label>السعر قبل الخصم</label><input id="pfOld" inputmode="decimal" placeholder="سيبه فاضي لو مفيش خصم" value="' + esc(Number(p.old_price) ? Number(p.old_price) : '') + '"></div>' +
      '<div style="flex:0 0 90px"><label>الخصم %</label><input id="pfPct" inputmode="decimal" placeholder="0"></div></div><div class="sp-prev" id="pfPrev"></div></div>' +
      '<label class="check"><input type="checkbox" id="pfAv"' + (p.available ? ' checked' : '') + '><span>متوفر في المحل</span></label>' +
      '<label class="check" style="margin-top:-6px"><input type="checkbox" id="pfVis"' + (p.hidden ? '' : ' checked') + '><span>ظاهر للعملاء في «تصفح منتجاتنا»</span></label>' +
      '<label>الوصف</label><textarea id="pfDesc" rows="5" placeholder="وصف كامل للمنتج">' + esc(p.description) + '</textarea>' +
      '<label>المواصفات</label><div class="sp-rows" id="pfSpecs"></div><button class="btn ghost sm" type="button" id="pfSpecAdd">+ إضافة مواصفة</button>' +
      '<label>الألوان المتاحة</label><div class="sp-rows" id="pfColors"></div><button class="btn ghost sm" type="button" id="pfColAdd">+ إضافة لون</button>' +
      '<label>اختيارات تانية <span class="muted small">(مثلاً المساحة: 128GB، 256GB — افصل بينهم بفاصلة)</span></label><input id="pfVar" value="' + esc((p.variants || []).join('، ')) + '">' +
      '<div id="pfErr"></div><div class="row" style="margin-top:14px"><button class="btn" id="pfSave" type="button">حفظ المنتج</button>' +
      (isNew ? '' : '<button class="btn ghost" id="pfDel" type="button" style="flex:0 0 auto;color:#DC2626">مسح</button>') + '</div>', true);

    function drawImgs() {
      $('#pfImgs').innerHTML = IM.map(function (im, i) {
        return '<div class="sp-img"><div style="width:92px;height:92px">' + img(im.t || im.u, ' style="width:92px;height:92px"') + '</div>' + (i ? '' : '<span class="main">الرئيسية</span>') +
          '<div class="ctl"><button type="button" data-mv="' + i + '" title="قدّم"' + (i ? '' : ' disabled') + '>→</button><button type="button" data-rm="' + i + '" title="مسح" style="color:#DC2626">🗑</button><button type="button" data-mvr="' + i + '" title="أخّر"' + (i < IM.length - 1 ? '' : ' disabled') + '>←</button></div>' +
          '<div class="ctl"><label class="rp" style="flex:1;text-align:center;font-size:12px;font-weight:700;padding:4px 0;cursor:pointer;margin:0">🔄 استبدال<input type="file" accept="image/*" data-rp="' + i + '" style="display:none"></label></div></div>';
      }).join('') + (IM.length < 12 ? '<label class="sp-add" id="pfAdd"><span>📷<br>إضافة صور</span><input type="file" id="pfFile" accept="image/*" multiple></label>' : '');
      $all('[data-mv]', body).forEach(function (b) { b.onclick = function () { var i = +b.dataset.mv; var t = IM[i - 1]; IM[i - 1] = IM[i]; IM[i] = t; drawImgs(); }; });
      $all('[data-mvr]', body).forEach(function (b) { b.onclick = function () { var i = +b.dataset.mvr; var t = IM[i + 1]; IM[i + 1] = IM[i]; IM[i] = t; drawImgs(); }; });
      $all('[data-rm]', body).forEach(function (b) { b.onclick = function () { IM.splice(+b.dataset.rm, 1); drawImgs(); }; });
      $all('[data-rp]', body).forEach(function (inp) {
        inp.onchange = function () {
          var file = inp.files && inp.files[0], i = +inp.dataset.rp; if (!file) return;
          inp.closest('.sp-img').innerHTML = '<div class="sp-add" style="border:0;height:118px"><span><span class="spinner"></span><br>جاري الرفع…</span></div>';
          $('#pfSave').disabled = true;
          uploadFile(file).then(function (im) { IM[i] = im; }).catch(function (e) { toast(e.message, true); }).then(function () { $('#pfSave').disabled = false; drawImgs(); });
        };
      });
      var f = $('#pfFile');
      if (f) f.onchange = function () {
        var files = Array.prototype.slice.call(f.files || [], 0, 12 - IM.length);
        if (!files.length) return;
        var add = $('#pfAdd'); add.innerHTML = '<span><span class="spinner"></span><br>جاري الرفع… <b id="pfUpN">0/' + files.length + '</b></span>';
        $('#pfSave').disabled = true;
        var done = 0;
        files.reduce(function (pr, file) {
          return pr.then(function () { return uploadFile(file).then(function (im) { IM.push(im); done++; var n = $('#pfUpN'); if (n) n.textContent = done + '/' + files.length; }); });
        }, Promise.resolve()).catch(function (e) { toast(e.message, true); }).then(function () { $('#pfSave').disabled = false; drawImgs(); });
      };
    }
    function drawSpecs() {
      $('#pfSpecs').innerHTML = SP.map(function (s, i) { return '<div class="r"><input placeholder="مثلاً: الشاشة" value="' + esc(s[0]) + '" data-sk="' + i + '"><input placeholder="مثلاً: 6.7 بوصة" value="' + esc(s[1]) + '" data-sv="' + i + '"><button type="button" class="x" data-sx="' + i + '">×</button></div>'; }).join('');
      $all('[data-sk]', body).forEach(function (x) { x.oninput = function () { SP[+x.dataset.sk][0] = x.value; }; });
      $all('[data-sv]', body).forEach(function (x) { x.oninput = function () { SP[+x.dataset.sv][1] = x.value; }; });
      $all('[data-sx]', body).forEach(function (x) { x.onclick = function () { SP.splice(+x.dataset.sx, 1); drawSpecs(); }; });
    }
    function drawColors() {
      $('#pfColors').innerHTML = CO.map(function (c, i) { return '<div class="r"><input type="color" value="' + esc(c.c || '#000000') + '" data-cc="' + i + '"><input placeholder="اسم اللون، مثلاً: أسود" value="' + esc(c.n) + '" data-cn="' + i + '"><button type="button" class="x" data-cx="' + i + '">×</button></div>'; }).join('');
      $all('[data-cc]', body).forEach(function (x) { x.oninput = function () { CO[+x.dataset.cc].c = x.value; }; });
      $all('[data-cn]', body).forEach(function (x) { x.oninput = function () { CO[+x.dataset.cn].n = x.value; }; });
      $all('[data-cx]', body).forEach(function (x) { x.onclick = function () { CO.splice(+x.dataset.cx, 1); drawColors(); }; });
    }
    function prev() {
      var pr = numVal($('#pfPrice')), old = numVal($('#pfOld')), k = pct(pr, old);
      $('#pfPrev').innerHTML = pr ? 'العميل هيشوف: <b>' + money(pr) + '</b>' + (k ? ' بدل <s>' + money(old) + '</s> — خصم ' + k + '%' : '') : '';
    }
    $('#pfPrice').oninput = function () { var k = pct(numVal($('#pfPrice')), numVal($('#pfOld'))); $('#pfPct').value = k || ''; prev(); };
    $('#pfOld').oninput = $('#pfPrice').oninput;
    $('#pfPct').oninput = function () {
      // لو كتبت نسبة الخصم: السعر قبل الخصم يفضل زي ما هو وسعر البيع يتحسب
      var k = numVal($('#pfPct')), pr = numVal($('#pfPrice')), old = numVal($('#pfOld')) || pr;
      if (!old || !(k > 0 && k < 100)) { if (!k && old && $('#pfOld').value) { $('#pfPrice').value = old; $('#pfOld').value = ''; } prev(); return; }
      $('#pfOld').value = old; $('#pfPrice').value = Math.round(old * (1 - k / 100) * 100) / 100; prev();
    };
    $('#pfPct').value = pct(Number(p.price), Number(p.old_price)) || '';
    prev(); drawImgs(); drawSpecs(); drawColors();
    $('#pfSpecAdd').onclick = function () { SP.push(['', '']); drawSpecs(); var a = $all('[data-sk]', body); a[a.length - 1].focus(); };
    $('#pfColAdd').onclick = function () { CO.push({ n: '', c: '#000000' }); drawColors(); var a = $all('[data-cn]', body); a[a.length - 1].focus(); };
    $('#pfSave').onclick = function () {
      var btn = this; $('#pfErr').innerHTML = '';
      var payload = {
        id: p.id || '', name: $('#pfName').value, code: $('#pfCode').value, category_id: $('#pfCat').value, description: $('#pfDesc').value,
        price: numVal($('#pfPrice')), old_price: numVal($('#pfOld')), available: $('#pfAv').checked, hidden: !$('#pfVis').checked,
        images: IM, specs: SP.filter(function (s) { return String(s[0]).trim() || String(s[1]).trim(); }), colors: CO.filter(function (c) { return String(c.n).trim(); }),
        variants: $('#pfVar').value.split(/[,،\n]/).map(function (s) { return s.trim(); }).filter(Boolean)
      };
      if (!String(payload.name).trim()) { $('#pfErr').innerHTML = '<div class="err">اكتب اسم المنتج</div>'; return; }
      if (!$('#pfPrice').value.trim() || isNaN(payload.price)) { $('#pfErr').innerHTML = '<div class="err">اكتب سعر البيع</div>'; return; }
      busy(btn, true);
      sh('saveProduct', payload).then(function () { closeModal(); toast('تم حفظ المنتج ✓'); return reload(); })
        .catch(function (e) { $('#pfErr').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }).then(function () { busy(btn, false); });
    };
    if (!isNew) $('#pfDel').onclick = function () {
      var b = this;
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'متأكد؟ اضغط تاني'; setTimeout(function () { if (b.isConnected) { b.dataset.sure = ''; b.textContent = 'مسح'; } }, 4000); return; }
      busy(b, true);
      sh('deleteProduct', { id: p.id }).then(function () { closeModal(); toast('تم مسح المنتج'); return reload(); }).catch(function (e) { toast(e.message, true); busy(b, false); });
    };
  }

  /* ---------------- الأقسام ---------------- */
  function drawCats(el) {
    var counts = {}; SD.products.forEach(function (p) { counts[p.category_id] = (counts[p.category_id] || 0) + 1; });
    var C = SD.categories;
    el.innerHTML = '<div class="toolbar" style="margin-bottom:10px"><span class="muted small" style="flex:1">رتّب الأقسام بالأسهم ↑↓ — نفس الترتيب بيظهر للعملاء</span><button class="btn sm" id="scNew" type="button">+ قسم جديد</button></div>' +
      (C.length ? '<div class="sp-list">' + C.map(function (c, i) {
        return '<div class="sp-catrow' + (c.hidden ? ' off' : '') + '"><div class="sp-mv"><button type="button" data-up="' + i + '"' + (i ? '' : ' disabled') + '>▲</button><button type="button" data-dn="' + i + '"' + (i < C.length - 1 ? '' : ' disabled') + '>▼</button></div>' +
          '<div class="ic">' + (c.image ? '<img src="' + esc(c.image) + '" alt="">' : esc(c.icon || '🛍️')) + '</div>' +
          '<div class="nm"><b>' + esc(c.name) + '</b><span class="muted small">' + (counts[c.id] || 0) + ' منتج' + (c.hidden ? ' · <span class="badge gray">مخفي</span>' : '') + '</span></div>' +
          '<label class="sp-tg"><input type="checkbox" data-ch="' + i + '"' + (c.hidden ? '' : ' checked') + '>ظاهر</label>' +
          '<button class="btn ghost sm" type="button" data-ce="' + i + '">تعديل</button></div>';
      }).join('') + '</div>' : '<div class="empty">مفيش أقسام. اضغط «+ قسم جديد».</div>');
    $('#scNew').onclick = function () { catForm(null); };
    function order(ids) {
      sh('orderCategories', { ids: ids }).then(function () { return reload(); }).catch(function (e) { toast(e.message, true); });
    }
    $all('[data-up]', el).forEach(function (b) { b.onclick = function () { var ids = C.map(function (c) { return c.id; }), i = +b.dataset.up; ids.splice(i - 1, 0, ids.splice(i, 1)[0]); C.splice(i - 1, 0, C.splice(i, 1)[0]); drawCats(el); order(ids); }; });
    $all('[data-dn]', el).forEach(function (b) { b.onclick = function () { var ids = C.map(function (c) { return c.id; }), i = +b.dataset.dn; ids.splice(i + 1, 0, ids.splice(i, 1)[0]); C.splice(i + 1, 0, C.splice(i, 1)[0]); drawCats(el); order(ids); }; });
    $all('[data-ch]', el).forEach(function (cb) {
      cb.onchange = function () {
        var c = C[+cb.dataset.ch]; cb.disabled = true;
        sh('saveCategory', { id: c.id, name: c.name, icon: c.icon, image: c.image, hidden: !cb.checked }).then(function () { toast('تم ✓'); return reload(); })
          .catch(function (e) { toast(e.message, true); cb.checked = !cb.checked; cb.disabled = false; });
      };
    });
    $all('[data-ce]', el).forEach(function (b) { b.onclick = function () { catForm(C[+b.dataset.ce]); }; });
  }
  function catForm(c) {
    var isNew = !c; c = c || { name: '', icon: '', image: '', hidden: false };
    var IMG = c.image || '';
    var body = modal(isNew ? 'قسم جديد' : 'تعديل القسم',
      '<label>اسم القسم *</label><input id="cfName" value="' + esc(c.name) + '" maxlength="60">' +
      '<label>أيقونة (إيموجي)</label><input id="cfIcon" value="' + esc(c.icon) + '" placeholder="مثلاً 📱" maxlength="16" style="font-size:22px">' +
      '<label>أو صورة للقسم <span class="muted small">(لو حطيت صورة بتظهر بدل الأيقونة)</span></label><div class="sp-imgs" id="cfImg"></div>' +
      '<label class="check"><input type="checkbox" id="cfVis"' + (c.hidden ? '' : ' checked') + '><span>ظاهر للعملاء</span></label>' +
      '<div id="cfErr"></div><div class="row" style="margin-top:10px"><button class="btn" id="cfSave" type="button">حفظ القسم</button>' +
      (isNew ? '' : '<button class="btn ghost" id="cfDel" type="button" style="flex:0 0 auto;color:#DC2626">مسح</button>') + '</div>');
    function drawImg() {
      $('#cfImg').innerHTML = IMG ? '<div class="sp-img"><img src="' + esc(IMG) + '" alt=""><div class="ctl"><button type="button" id="cfRm" style="color:#DC2626">🗑 شيل الصورة</button></div></div>'
        : '<label class="sp-add"><span>📷<br>رفع صورة</span><input type="file" id="cfFile" accept="image/*"></label>';
      if (IMG) $('#cfRm').onclick = function () { IMG = ''; drawImg(); };
      else $('#cfFile').onchange = function () {
        var f = this.files && this.files[0]; if (!f) return;
        $('#cfImg').innerHTML = '<div class="sp-add"><span><span class="spinner"></span><br>جاري الرفع…</span></div>'; $('#cfSave').disabled = true;
        resize(f, 400, 0.85).then(function (d) { return sh('upload', { dataUrl: d }); }).then(function (r) { IMG = r.url; })
          .catch(function (e) { toast(e.message, true); }).then(function () { $('#cfSave').disabled = false; drawImg(); });
      };
    }
    drawImg();
    $('#cfSave').onclick = function () {
      var btn = this; busy(btn, true); $('#cfErr').innerHTML = '';
      sh('saveCategory', { id: c.id || '', name: $('#cfName').value, icon: $('#cfIcon').value, image: IMG, hidden: !$('#cfVis').checked })
        .then(function () { closeModal(); toast('تم حفظ القسم ✓'); return reload(); })
        .catch(function (e) { $('#cfErr').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }).then(function () { busy(btn, false); });
    };
    if (!isNew) $('#cfDel').onclick = function () {
      var b = this;
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'متأكد؟ اضغط تاني'; return; }
      busy(b, true);
      sh('deleteCategory', { id: c.id }).then(function () { closeModal(); toast('تم مسح القسم'); return reload(); })
        .catch(function (e) { $('#cfErr').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; busy(b, false); b.dataset.sure = ''; b.textContent = 'مسح'; });
    };
  }

  /* ---------------- طلبات المنتجات ---------------- */
  var ORD = [], OF = { q: '', st: '', from: '', to: '' };
  var ST_AR = { pending: 'قيد المراجعة', approved: 'تم قبول الطلب', preparing: 'جاري التجهيز', ready: 'جاهز للاستلام', shipped: 'تم الشحن', completed: 'تم إتمام الطلب', rejected: 'مرفوض', cancelled: 'ملغي' };
  var ST_ORDER = ['pending', 'approved', 'preparing', 'ready', 'shipped', 'completed', 'rejected', 'cancelled'];
  function stB(s) { return '<span class="ost ' + esc(s) + '">' + esc(ST_AR[s] || s) + '</span>'; }
  function odt(iso) { var x = new Date(iso); return isNaN(x) ? '' : x.toLocaleString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function dayK(iso) { var x = new Date(iso); var z = new Date(x.getTime() - x.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
  function waNum(ph) { var d = String(ph || '').replace(/\D/g, ''); if (/^01\d{9}$/.test(d)) d = '2' + d; return d; }

  window.viewShopOrders = function (v) {
    sh('orders').then(function (r) { ORD = r; drawOrders(v); }).catch(function (e) { v.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
  };
  function reloadOrders(openId) {
    return sh('orders').then(function (r) { ORD = r; var v = $('#viewIn'); if (v && CUR === 'shoporders') drawOrders(v); if (openId) orderDetails(openId); });
  }
  function drawOrders(v) {
    var cnt = {}; ORD.forEach(function (o) { cnt[o.status] = (cnt[o.status] || 0) + 1; });
    v.innerHTML = '<div class="card"><div class="toolbar"><h2 style="margin:0;flex:1">📦 طلبات المنتجات</h2><button class="btn ghost sm" type="button" id="soSet">⚙️ التوصيل</button><button class="btn ghost sm" type="button" id="soRef">⟳ تحديث</button></div>' +
      '<div class="so-st" id="soSt"><button type="button" data-st=""' + (OF.st ? '' : ' class="on"') + '>الكل (' + ORD.length + ')</button>' +
      ST_ORDER.map(function (s) { return '<button type="button" data-st="' + s + '"' + (OF.st === s ? ' class="on"' : '') + '>' + ST_AR[s] + ' (' + (cnt[s] || 0) + ')</button>'; }).join('') + '</div>' +
      '<div class="so-filters"><input id="soQ" placeholder="🔍 رقم الطلب أو اسم العميل أو الموبايل" value="' + esc(OF.q) + '" style="flex-basis:100%">' +
      '<div><label style="margin:0 0 4px">من تاريخ</label><input type="date" id="soFrom" value="' + esc(OF.from) + '"></div><div><label style="margin:0 0 4px">إلى تاريخ</label><input type="date" id="soTo" value="' + esc(OF.to) + '"></div></div>' +
      '<div class="so-sum" id="soSum"></div><div id="soList" class="sp-list"></div></div>';
    $('#soSet').onclick = deliverySettings;
    $('#soRef').onclick = function () { loading($('#soList')); reloadOrders(); };
    $all('#soSt button', v).forEach(function (b) { b.onclick = function () { OF.st = b.dataset.st; drawOrders(v); }; });
    $('#soQ').oninput = function () { OF.q = this.value; listOrders(); };
    $('#soFrom').onchange = function () { OF.from = this.value; listOrders(); };
    $('#soTo').onchange = function () { OF.to = this.value; listOrders(); };
    listOrders();
  }
  function listOrders() {
    var q = OF.q.trim().replace(/^#/, '').toLowerCase();
    var rows = ORD.filter(function (o) {
      if (OF.st && o.status !== OF.st) return false;
      var dk = dayK(o.created_at);
      if (OF.from && dk < OF.from) return false;
      if (OF.to && dk > OF.to) return false;
      return !q || String(o.order_no) === q || String(o.order_no).indexOf(q) === 0 || o.customer_name.toLowerCase().indexOf(q) >= 0 || String(o.customer_phone).indexOf(q) >= 0;
    });
    var box = $('#soList');
    var live = rows.filter(function (o) { return OF.st === 'rejected' || OF.st === 'cancelled' || (o.status !== 'rejected' && o.status !== 'cancelled'); });
    var sumT = live.reduce(function (s, o) { return s + Number(o.total || 0); }, 0), sumD = live.reduce(function (s, o) { return s + Number(o.product_discount || 0) + Number(o.promo_discount || 0); }, 0);
    $('#soSum').innerHTML = '<div><small>عدد الطلبات</small><b>' + rows.length + '</b></div><div><small>إجمالي قيمة الطلبات</small><b>' + money(sumT) + '</b></div><div><small>إجمالي الخصومات</small><b>' + money(sumD) + '</b></div>' +
      (OF.st === 'rejected' || OF.st === 'cancelled' ? '' : '<div style="flex-basis:100%;background:transparent;border:0;padding:0"><small>الإجماليات من غير الطلبات الملغية والمرفوضة</small></div>');
    if (!rows.length) { box.innerHTML = '<div class="empty">' + (ORD.length ? 'مفيش طلبات بالبحث ده' : 'لسه مفيش طلبات من العملاء.') + '</div>'; return; }
    box.innerHTML = rows.map(function (o) {
      return '<div class="so-item" data-oid="' + esc(o.id) + '"><div class="th">' + (o.image ? img(o.image) : '📦') + '</div><div class="bd">' +
        '<div class="top"><b>#' + o.order_no + '</b>' + stB(o.status) + '</div>' +
        '<div class="ln"><b>' + esc(o.product_name) + '</b>' + (o.items.length === 1 && o.product_code ? ' <span class="sp-code">' + esc(o.product_code) + '</span>' : '') + '</div>' +
        '<div class="ln">' + esc(o.customer_name) + ' · <span style="direction:ltr;unicode-bidi:isolate">' + esc(o.customer_phone) + '</span></div>' +
        '<div class="ln mu">' + (o.items.length > 1 ? o.items.length + ' منتجات · ' : '') + 'الكمية ' + o.qty + (o.items.length === 1 && o.color ? ' · ' + esc(o.color) : '') + (o.items.length === 1 && o.variant ? ' · ' + esc(o.variant) : '') +
        ' · الإجمالي <b>' + money(o.total) + '</b>' + (o.promo_code ? ' <span class="so-promo">🏷️ ' + esc(o.promo_code) + '</span>' : '') + (o.delivery === 'delivery' ? ' · 🛵 توصيل' : '') + '</div>' +
        '<div class="ln mu">' + esc(odt(o.created_at)) + (o.notes ? ' · 📝 ' + esc(o.notes.length > 50 ? o.notes.slice(0, 50) + '…' : o.notes) : '') + '</div></div></div>';
    }).join('');
    $all('[data-oid]', box).forEach(function (el) { el.onclick = function () { orderDetails(el.dataset.oid); }; });
  }
  function orderDetails(id) {
    var o = ORD.filter(function (x) { return x.id === id; })[0]; if (!o) return;
    var r = function (k, val) { return '<div class="r"><span>' + k + '</span><span>' + val + '</span></div>'; };
    var shop = (PS && (PS.shop_name || PS.program_name)) || 'موبايلي';
    var msg = 'أهلاً ' + o.customer_name + ' 👋\nبخصوص طلبك رقم #' + o.order_no + ' (' + o.product_name + ') من ' + shop + ':\nحالة الطلب: ' + (ST_AR[o.status] || o.status);
    var disc = Number(o.product_discount || 0) + Number(o.promo_discount || 0);
    var body = modal('طلب #' + o.order_no,
      '<div class="so-det">' + r('الحالة', stB(o.status)) +
      ((o.status === 'rejected' || o.status === 'cancelled') && o.reject_reason ? r(o.status === 'rejected' ? 'سبب الرفض' : 'سبب الإلغاء', esc(o.reject_reason)) : '') +
      r('رقم الطلب', '#' + o.order_no) + r('تاريخ الطلب', esc(odt(o.created_at))) + r('طريقة الشراء', o.method === 'cart' ? 'من السلة' : 'اشترِ الآن') +
      r('اسم العميل', esc(o.customer_name)) + r('رقم الهاتف', '<span style="direction:ltr">' + esc(o.customer_phone) + '</span>') + (o.member_no ? r('رقم العضوية', esc(o.member_no)) : '') +
      r('طريقة الاستلام', o.delivery === 'delivery' ? '🛵 توصيل' : '🏬 استلام من الفرع') + (o.delivery === 'delivery' ? r('العنوان', esc(o.address || '—')) : '') + '</div>' +
      '<h3 style="margin:14px 0 4px">المنتجات</h3><div class="so-its">' + o.items.map(function (l) {
        return '<div class="it"><div class="th">' + (l.image ? img(l.image) : '📦') + '</div><div class="m"><b>' + esc(l.name) + '</b>' +
          '<small>' + (l.code ? '<span class="sp-code">' + esc(l.code) + '</span> ' : '') + esc([l.color, l.variant].filter(Boolean).join(' · ')) + '</small><br><small>' + l.qty + ' × ' + money(l.unit_price) +
          (l.old_price ? ' (بدل ' + money(l.old_price) + ')' : '') + '</small></div><span class="lt">' + money(l.line_total) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="so-det">' + r('إجمالي المنتجات', money(o.subtotal)) + (o.product_discount > 0 ? r('خصم المنتجات', '− ' + money(o.product_discount)) : '') +
      r('كود الخصم', o.promo_code ? '<span class="so-promo">' + esc(o.promo_code) + '</span> − ' + money(o.promo_discount) : '—') +
      (disc > 0 ? r('إجمالي الخصومات', '− ' + money(disc)) : '') + (o.delivery === 'delivery' ? r('مصاريف الشحن', money(o.shipping)) : '') +
      r('الإجمالي النهائي', '<b>' + money(o.total) + '</b>') + r('ملاحظات العميل', o.notes ? esc(o.notes) : '—') + '</div>' +
      '<div class="so-acts"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/' + esc(waNum(o.customer_phone)) + '?text=' + encodeURIComponent(msg) + '" style="background:#25D366;color:#062612">💬 واتساب العميل</a>' +
      '<a class="btn ghost" href="tel:' + esc(o.customer_phone) + '">📞 اتصال</a></div>' +
      '<h3 style="margin:16px 0 4px">ملاحظات داخلية <small style="color:#5B6683;font-weight:600">(مش بتظهر للعميل)</small></h3><textarea id="soNotes" rows="2" maxlength="1000">' + esc(o.admin_notes || '') + '</textarea>' +
      '<div style="height:6px"></div><button type="button" class="btn ghost sm" id="soNotesOk">حفظ الملاحظات</button>' +
      '<h3 style="margin:16px 0 4px">تغيير حالة الطلب</h3><div class="so-sts">' + ST_ORDER.map(function (s) { return '<button type="button" data-s="' + s + '"' + (o.status === s ? ' class="on" disabled' : '') + '>' + ST_AR[s] + '</button>'; }).join('') + '</div>' +
      '<div id="soRej" class="hidden"><label id="soRejL">سبب الرفض (هيظهر للعميل) *</label><input id="soReason" maxlength="300" placeholder="مثلاً: المنتج خلص من المخزن"><div style="height:8px"></div><button type="button" class="btn" id="soRejOk" style="background:#DC2626">تأكيد الرفض</button></div>' +
      '<div id="soErr"></div>' +
      '<h3 style="margin:16px 0 4px">سجل الطلب</h3><ul class="so-hist">' + (o.history || []).map(function (h) { return '<li>' + esc(ST_AR[h.s] || h.s) + ' <small>' + esc(odt(h.at)) + (h.by && h.by !== 'customer' ? ' · ' + esc(h.by) : h.by === 'customer' ? ' · العميل' : '') + '</small></li>'; }).join('') + '</ul>', true);
    $('#soNotesOk').onclick = function () {
      var btn = this; busy(btn, true);
      sh('saveOrderNotes', { id: o.id, notes: $('#soNotes').value }).then(function () { o.admin_notes = $('#soNotes').value; toast('تم حفظ الملاحظات ✓'); })
        .catch(function (e) { toast(e.message, true); }).then(function () { busy(btn, false); });
    };
    var REJ = 'rejected';
    function set(st, reason, btn) {
      busy(btn, true); $('#soErr').innerHTML = '';
      sh('setOrderStatus', { id: o.id, status: st, reason: reason || '' }).then(function () { toast('تم تحديث حالة الطلب ✓'); return reloadOrders(o.id); })
        .catch(function (e) { $('#soErr').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; busy(btn, false); });
    }
    $all('[data-s]', body).forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.s === 'rejected' || b.dataset.s === 'cancelled') {
          REJ = b.dataset.s;
          $('#soRejL').textContent = REJ === 'rejected' ? 'سبب الرفض (هيظهر للعميل) *' : 'سبب الإلغاء (اختياري، هيظهر للعميل)';
          $('#soRejOk').textContent = REJ === 'rejected' ? 'تأكيد الرفض' : 'تأكيد الإلغاء';
          $('#soRej').classList.remove('hidden'); $('#soReason').focus(); return;
        }
        set(b.dataset.s, '', b);
      };
    });
    $('#soRejOk').onclick = function () { set(REJ, $('#soReason').value, this); };
  }

  /* إعدادات الاستلام والتوصيل */
  function deliverySettings() {
    var body = modal('⚙️ الاستلام والتوصيل', '<div id="dsBox"><div class="spinner"></div></div>');
    sh('shopSettings').then(function (st) {
      $('#dsBox').innerHTML = '<p class="small muted" style="margin-top:0">الاستلام من الفرع متاح دايماً. لو فعّلت التوصيل، العميل هيقدر يختاره في إتمام الشراء ويكتب عنوانه.</p>' +
        '<label class="sp-tg" style="font-size:14px;color:#0B1222"><input type="checkbox" id="dsOn"' + (st.delivery_enabled ? ' checked' : '') + '> التوصيل متاح</label>' +
        '<label>مصاريف الشحن (' + esc(PS.currency || 'ج.م') + ')</label><input id="dsFee" inputmode="decimal" value="' + (st.delivery_fee || '') + '" placeholder="0 = مجاناً">' +
        '<div id="dsErr"></div><div style="height:10px"></div><button type="button" class="btn" id="dsSave">حفظ</button>';
      $('#dsSave').onclick = function () {
        var btn = this; busy(btn, true);
        sh('saveShopSettings', { delivery_enabled: $('#dsOn').checked, delivery_fee: numVal($('#dsFee')) }).then(function () { closeModal(); toast('تم الحفظ ✓'); })
          .catch(function (e) { $('#dsErr').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; busy(btn, false); });
      };
    }).catch(function (e) { $('#dsBox').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
  }

  /* ---------------- أكواد الخصم ---------------- */
  var PM = [], PMF = { q: '' };
  function pmState(p) {
    if (!p.active) return ['off', 'موقوف'];
    if (p.ends_on && p.ends_on < p.today) return ['exp', 'منتهي'];
    if (p.starts_on && p.starts_on > p.today) return ['soon', 'يبدأ ' + p.starts_on];
    if (p.max_uses > 0 && p.uses >= p.max_uses) return ['exp', 'خلص عدد الاستخدام'];
    return ['on', 'شغال'];
  }
  function pmDisc(p) { return p.kind === 'percent' ? p.value + '%' + (p.max_discount > 0 ? ' (بحد أقصى ' + money(p.max_discount) + ')' : '') : money(p.value); }
  window.viewShopPromos = function (v) {
    Promise.all([sh('promos'), sh('list')]).then(function (r) { PM = r[0]; SD = fixSD(r[1]); drawPromos(v); })
      .catch(function (e) { v.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
  };
  function reloadPromos() { return sh('promos').then(function (r) { PM = r; var v = $('#viewIn'); if (v && CUR === 'promos') drawPromos(v); }); }
  function drawPromos(v) {
    v.innerHTML = '<div class="card"><div class="toolbar"><h2 style="margin:0;flex:1">🏷️ أكواد الخصم</h2><button class="btn sm" type="button" id="pmNew">+ كود جديد</button></div>' +
      '<p class="small muted" style="margin-top:0">أكواد خصم للشراء أونلاين من «تصفح منتجاتنا». العميل بيكتب الكود في السلة أو في إتمام الشراء.</p>' +
      '<input id="pmQ" placeholder="🔍 ابحث بالكود" value="' + esc(PMF.q) + '" style="margin-bottom:10px"><div id="pmList" class="sp-list"></div></div>';
    $('#pmNew').onclick = function () { promoForm(null); };
    $('#pmQ').oninput = function () { PMF.q = this.value; listPromos(); };
    listPromos();
  }
  function listPromos() {
    var q = PMF.q.trim().toLowerCase(), rows = PM.filter(function (p) { return !q || p.code.toLowerCase().indexOf(q) >= 0; });
    var box = $('#pmList');
    if (!rows.length) { box.innerHTML = '<div class="empty">' + (PM.length ? 'مفيش كود بالاسم ده' : 'لسه مفيش أكواد خصم. دوس «+ كود جديد».') + '</div>'; return; }
    box.innerHTML = rows.map(function (p) {
      var st = pmState(p), scoped = (p.product_ids || []).length || (p.category_ids || []).length;
      return '<div class="pm-item" data-pm="' + esc(p.id) + '"><div class="top"><span class="cd">' + esc(p.code) + '</span><span class="pm-st ' + st[0] + '">' + esc(st[1]) + '</span></div>' +
        '<div class="ln">خصم <b>' + pmDisc(p) + '</b>' + (p.min_order > 0 ? ' · الحد الأدنى للطلب ' + money(p.min_order) : '') + (scoped ? ' · على منتجات/أقسام معينة' : ' · على إجمالي الطلب') + '</div>' +
        '<div class="ln mu">استُخدم ' + p.uses + (p.max_uses > 0 ? ' من ' + p.max_uses : '') + ' مرة · إجمالي الخصومات ' + money(p.total_discount) +
        (p.starts_on || p.ends_on ? ' · ' + (p.starts_on ? 'من ' + p.starts_on + ' ' : '') + (p.ends_on ? 'لحد ' + p.ends_on : '') : '') + '</div>' +
        '<div class="ln" style="margin-top:8px;display:flex;gap:8px;align-items:center"><label class="sp-tg"><input type="checkbox" data-act="' + esc(p.id) + '"' + (p.active ? ' checked' : '') + '> مفعّل</label>' +
        '<span style="flex:1"></span><button type="button" class="btn sm sp-edit">✏️ تعديل</button></div></div>';
    }).join('');
    $all('[data-pm]', box).forEach(function (el) {
      el.onclick = function (e) { if (e.target.closest('label,input')) return; promoForm(PM.filter(function (p) { return p.id === el.dataset.pm; })[0]); };
    });
    $all('[data-act]', box).forEach(function (cb) {
      cb.onchange = function () {
        cb.disabled = true;
        sh('setPromo', { id: cb.dataset.act, active: cb.checked }).then(function () { toast(cb.checked ? 'الكود اتفعّل ✓' : 'الكود اتوقف'); return reloadPromos(); })
          .catch(function (e) { cb.checked = !cb.checked; cb.disabled = false; toast(e.message, true); });
      };
    });
  }
  function promoForm(p) {
    var isNew = !p; p = p || { kind: 'percent', active: true, stackable: true, product_ids: [], category_ids: [] };
    var PIDS = (p.product_ids || []).slice(), CIDS = (p.category_ids || []).slice();
    var scoped = PIDS.length || CIDS.length;
    var nv = function (x) { return x ? esc(x) : ''; };
    var body = modal(isNew ? 'كود خصم جديد' : 'تعديل الكود ' + p.code,
      (isNew ? '' : '<div class="pm-stats"><div><small>عدد مرات الاستخدام</small><b>' + p.uses + '</b></div><div><small>إجمالي الخصومات من الكود</small><b>' + money(p.total_discount) + '</b></div></div>') +
      '<label>الكود *</label><input id="pmCode" value="' + nv(p.code) + '" placeholder="مثلاً: MOBILY10" maxlength="30" style="direction:ltr;text-align:left;text-transform:uppercase">' +
      '<div class="pm-grid"><div><label>نوع الخصم</label><select id="pmKind"><option value="percent"' + (p.kind === 'percent' ? ' selected' : '') + '>نسبة مئوية %</option><option value="fixed"' + (p.kind === 'fixed' ? ' selected' : '') + '>مبلغ ثابت</option></select></div>' +
      '<div><label>قيمة الخصم *</label><input id="pmVal" inputmode="decimal" value="' + nv(p.value) + '" placeholder="10"></div>' +
      '<div><label>الحد الأدنى للطلب</label><input id="pmMin" inputmode="decimal" value="' + nv(p.min_order) + '" placeholder="من غير حد"></div>' +
      '<div id="pmMaxW"><label>أقصى خصم (للنسبة)</label><input id="pmMax" inputmode="decimal" value="' + nv(p.max_discount) + '" placeholder="من غير حد"></div>' +
      '<div><label>تاريخ البداية</label><input type="date" id="pmFrom" value="' + nv(p.starts_on) + '"></div>' +
      '<div><label>تاريخ النهاية</label><input type="date" id="pmTo" value="' + nv(p.ends_on) + '"></div>' +
      '<div><label>عدد مرات الاستخدام (إجمالي)</label><input id="pmUses" inputmode="numeric" value="' + nv(p.max_uses) + '" placeholder="من غير حد"></div>' +
      '<div><label>عدد المرات لكل عميل</label><input id="pmPer" inputmode="numeric" value="' + nv(p.per_customer) + '" placeholder="من غير حد"></div></div>' +
      '<label>الكود يتطبق على</label><select id="pmScope"><option value="all"' + (scoped ? '' : ' selected') + '>إجمالي الطلب (كل المنتجات)</option><option value="some"' + (scoped ? ' selected' : '') + '>منتجات أو أقسام معينة</option></select>' +
      '<div id="pmScopeBox" class="' + (scoped ? '' : 'hidden') + '"><label>الأقسام</label><div class="pm-pick">' + SD.categories.map(function (c) {
        return '<label><input type="checkbox" data-cid="' + esc(c.id) + '"' + (CIDS.indexOf(c.id) >= 0 ? ' checked' : '') + '>' + esc((c.icon ? c.icon + ' ' : '') + c.name) + '</label>';
      }).join('') + '</div><label>المنتجات</label><input id="pmPQ" placeholder="🔍 ابحث باسم المنتج أو الكود" style="margin-bottom:6px"><div class="pm-pick" id="pmProds">' + SD.products.map(function (x) {
        return '<label data-pn="' + esc((x.name + ' ' + (x.code || '')).toLowerCase()) + '"><input type="checkbox" data-pid="' + esc(x.id) + '"' + (PIDS.indexOf(x.id) >= 0 ? ' checked' : '') + '>' + esc(x.name) + (x.code ? ' <span class="sp-code">' + esc(x.code) + '</span>' : '') + '</label>';
      }).join('') + (SD.products.length ? '' : '<div class="small muted">مفيش منتجات لسه</div>') + '</div></div>' +
      '<label class="sp-tg" style="margin-top:14px;font-size:13.5px;color:#0B1222"><input type="checkbox" id="pmStack"' + (p.stackable ? ' checked' : '') + '> ينفع يتجمع مع خصومات المنتجات (المنتجات اللي عليها خصم)</label>' +
      '<label class="sp-tg" style="margin-top:10px;font-size:13.5px;color:#0B1222"><input type="checkbox" id="pmAct"' + (p.active ? ' checked' : '') + '> الكود مفعّل</label>' +
      '<div id="pmErr"></div><div style="height:12px"></div><button type="button" class="btn" id="pmSave">حفظ</button>', true);
    function kind() { $('#pmMaxW').style.visibility = $('#pmKind').value === 'percent' ? '' : 'hidden'; }
    kind(); $('#pmKind').onchange = kind;
    $('#pmScope').onchange = function () { $('#pmScopeBox').classList.toggle('hidden', this.value !== 'some'); };
    $('#pmPQ').oninput = function () { var q = this.value.trim().toLowerCase(); $all('#pmProds [data-pn]', body).forEach(function (l) { l.style.display = !q || l.dataset.pn.indexOf(q) >= 0 ? '' : 'none'; }); };
    $('#pmSave').onclick = function () {
      var btn = this, some = $('#pmScope').value === 'some';
      var cids = some ? $all('[data-cid]', body).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.cid; }) : [];
      var pids = some ? $all('[data-pid]', body).filter(function (x) { return x.checked; }).map(function (x) { return x.dataset.pid; }) : [];
      $('#pmErr').innerHTML = '';
      if (some && !cids.length && !pids.length) { $('#pmErr').innerHTML = '<div class="err">اختار قسم أو منتج واحد على الأقل</div>'; return; }
      busy(btn, true);
      sh('savePromo', { id: p.id || '', code: $('#pmCode').value, kind: $('#pmKind').value, value: numVal($('#pmVal')), min_order: numVal($('#pmMin')), max_discount: numVal($('#pmMax')),
        starts_on: $('#pmFrom').value, ends_on: $('#pmTo').value, max_uses: numVal($('#pmUses')), per_customer: numVal($('#pmPer')),
        product_ids: pids, category_ids: cids, stackable: $('#pmStack').checked, active: $('#pmAct').checked })
        .then(function () { closeModal(); toast('تم حفظ الكود ✓'); return reloadPromos(); })
        .catch(function (e) { $('#pmErr').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }).then(function () { busy(btn, false); });
    };
  }

})();
