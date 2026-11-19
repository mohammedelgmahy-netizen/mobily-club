/* موبايلي - Mobily — لوحة الإدارة: «المنتجات» (منتجات وأقسام «تصفح منتجاتنا»)
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
    '.sp-mv button:disabled{opacity:.3;cursor:default}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  var SD = { categories: [], products: [] }, TAB = 'products', F = { q: '', cat: '' };

  function sh(action, payload) {
    return api('shopAdmin', SESSION, action, payload || {}).catch(function (e) {
      if (e.code === 'SESSION_EXPIRED' || e.message === 'SESSION_EXPIRED') { SESSION = ''; store('mc_admin_sess', null); showLogin('انتهت الجلسة، سجّل الدخول مرة أخرى'); throw new Error('انتهت الجلسة'); }
      throw e;
    });
  }
  function catName(id) { var c = SD.categories.filter(function (x) { return x.id === id; })[0]; return c ? c.name : 'بدون قسم'; }
  function pct(price, old) { return old > price && old > 0 ? Math.round((1 - price / old) * 100) : 0; }
  function numVal(el) { var v = String(el.value || '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/,/g, '').trim(); return v === '' ? 0 : Number(v); }

  window.viewProducts = function (v) {
    sh('list').then(function (r) { SD = r; draw(v); }).catch(function (e) { v.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
  };
  function reload() { return sh('list').then(function (r) { SD = r; var v = $('#viewIn'); if (v && CUR === 'products') draw(v); }); }

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
    el.innerHTML = '<div class="row" style="flex-wrap:wrap;margin-bottom:10px"><input id="spQ" placeholder="🔍 بحث باسم المنتج" value="' + esc(F.q) + '" style="flex:2;min-width:180px">' +
      '<select id="spCat" style="flex:1;min-width:140px"><option value="">كل الأقسام</option>' + SD.categories.map(function (c) { return '<option value="' + esc(c.id) + '"' + (F.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<button class="btn sm" id="spNew" type="button" style="flex:0 0 auto">+ منتج جديد</button></div><div id="spList" class="sp-list"></div>';
    $('#spNew').onclick = function () { productForm(null); };
    $('#spQ').oninput = function () { F.q = this.value; list(); };
    $('#spCat').onchange = function () { F.cat = this.value; list(); };
    list();
  }
  function list() {
    var q = F.q.trim().toLowerCase();
    var rows = SD.products.filter(function (p) { return (!F.cat || p.category_id === F.cat) && (!q || p.name.toLowerCase().indexOf(q) >= 0); });
    var box = $('#spList');
    if (!rows.length) { box.innerHTML = '<div class="empty">' + (SD.products.length ? 'مفيش منتجات بالبحث ده' : 'لسه مفيش منتجات. اضغط «+ منتج جديد» وضيف أول منتج.') + '</div>'; return; }
    box.innerHTML = rows.map(function (p) {
      var t = p.images && p.images[0] ? (p.images[0].t || p.images[0].u) : '', off = pct(Number(p.price), Number(p.old_price));
      return '<div class="sp-item' + (p.hidden ? ' off' : '') + '"><div class="sp-th">' + (t ? '<img src="' + esc(t) + '" alt="">' : '📦') + '</div>' +
        '<div class="sp-info"><b>' + esc(p.name) + '</b><div class="m"><span>' + esc(catName(p.category_id)) + '</span><b style="display:inline;color:#0891B2">' + money(p.price) + '</b>' +
        (off ? '<s>' + money(p.old_price) + '</s><span class="badge red">-' + off + '%</span>' : '') + (p.hidden ? '<span class="badge gray">مخفي</span>' : '') + '</div>' +
        '<div class="m" style="margin-top:6px"><label class="sp-tg"><input type="checkbox" data-av="' + esc(p.id) + '"' + (p.available ? ' checked' : '') + '>متوفر</label>' +
        '<label class="sp-tg"><input type="checkbox" data-vis="' + esc(p.id) + '"' + (p.hidden ? '' : ' checked') + '>ظاهر للعملاء</label></div></div>' +
        '<div class="sp-acts"><button class="btn ghost sm" type="button" data-ed="' + esc(p.id) + '">تعديل</button></div></div>';
    }).join('');
    $all('[data-ed]', box).forEach(function (b) { b.onclick = function () { productForm(SD.products.filter(function (p) { return p.id === b.dataset.ed; })[0]); }; });
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
    p = p || { name: '', category_id: F.cat || '', description: '', price: '', old_price: '', available: true, hidden: false, images: [], specs: [], colors: [], variants: [] };
    var IM = (p.images || []).slice(), SP = (p.specs || []).map(function (s) { return [s[0], s[1]]; }), CO = (p.colors || []).map(function (c) { return { n: c.n, c: c.c }; });
    var body = modal(isNew ? 'منتج جديد' : 'تعديل المنتج',
      '<label>اسم المنتج *</label><input id="pfName" value="' + esc(p.name) + '" maxlength="150">' +
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
        return '<div class="sp-img"><img src="' + esc(im.t || im.u) + '" alt="">' + (i ? '' : '<span class="main">الرئيسية</span>') +
          '<div class="ctl"><button type="button" data-mv="' + i + '" title="قدّم"' + (i ? '' : ' disabled') + '>→</button><button type="button" data-rm="' + i + '" title="مسح" style="color:#DC2626">🗑</button><button type="button" data-mvr="' + i + '" title="أخّر"' + (i < IM.length - 1 ? '' : ' disabled') + '>←</button></div></div>';
      }).join('') + (IM.length < 12 ? '<label class="sp-add" id="pfAdd"><span>📷<br>إضافة صور</span><input type="file" id="pfFile" accept="image/*" multiple></label>' : '');
      $all('[data-mv]', body).forEach(function (b) { b.onclick = function () { var i = +b.dataset.mv; var t = IM[i - 1]; IM[i - 1] = IM[i]; IM[i] = t; drawImgs(); }; });
      $all('[data-mvr]', body).forEach(function (b) { b.onclick = function () { var i = +b.dataset.mvr; var t = IM[i + 1]; IM[i + 1] = IM[i]; IM[i] = t; drawImgs(); }; });
      $all('[data-rm]', body).forEach(function (b) { b.onclick = function () { IM.splice(+b.dataset.rm, 1); drawImgs(); }; });
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
        id: p.id || '', name: $('#pfName').value, category_id: $('#pfCat').value, description: $('#pfDesc').value,
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
})();
