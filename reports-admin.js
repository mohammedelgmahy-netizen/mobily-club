/* MOBILY CLUB — لوحة المؤشرات، تقرير المبيعات على مستوى الصنف، Export Data to Excel، Backup & Restore.
 *   الداشبورد والتقرير: صلاحية «لوحة المؤشرات». التصدير والنسخ الاحتياطي: صاحب المحل (Owner) بس.
 *   البيانات من السيرفر (shopAdmin: dashShop, salesItems, exportData, backupInfo, backupCreate, backupRestore). */
(function () {
  var CSS = [
    '.db-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px}',
    '.db-head h1{font-size:20px;margin:0}.db-head .acts{display:flex;gap:6px;flex-wrap:wrap}',
    '.db-sec{margin:18px 0 8px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.db-sec h2{font-size:16px;margin:0}.db-sec small{color:var(--muted);font-size:12px}',
    '.db-k{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    '@media(min-width:700px){.db-k{grid-template-columns:repeat(3,minmax(0,1fr))}}',
    '@media(min-width:1050px){.db-k.five{grid-template-columns:repeat(5,minmax(0,1fr))}.db-k.four{grid-template-columns:repeat(4,minmax(0,1fr))}}',
    '.db-c{position:relative;background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px 14px;box-shadow:var(--shadow);min-width:0;text-align:start;font:inherit;color:inherit}',
    '.db-c[data-go]{cursor:pointer}.db-c[data-go]:hover{border-color:#1BA8A2}',
    '.db-c span{display:block;font-size:12.5px;color:var(--muted);font-weight:700}',
    '.db-c b{display:block;font-family:Inter,sans-serif;font-size:22px;font-weight:800;margin-top:2px;overflow-wrap:anywhere}',
    '@media(max-width:600px){.db-c b{font-size:18px}}',
    '.db-c em{display:block;font-style:normal;font-size:11.5px;color:var(--muted);margin-top:2px}',
    '.db-c.hero{background:linear-gradient(135deg,#1BA8A2,#178F8A);color:#fff;border-color:transparent}.db-c.hero span,.db-c.hero em{color:#E0F7FA}',
    '.db-c.hero2{background:linear-gradient(135deg,#D63F86,#B8306F);color:#fff;border-color:transparent}.db-c.hero2 span,.db-c.hero2 em{color:#FCE7F3}',
    '.db-c.t-new{border-top:4px solid #2563EB}.db-c.t-prog{border-top:4px solid #F59E0B}.db-c.t-done{border-top:4px solid #16A34A}.db-c.t-can{border-top:4px solid #DC2626}',
    '.db-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;margin-top:10px}',
    '@media(min-width:900px){.db-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.db-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '.db-grid .card{min-width:0}.db-grid .card h3{font-size:14.5px;margin:0 0 10px}',
    '.db-cols{display:flex;align-items:flex-end;gap:3px;height:150px;padding-top:8px;border-bottom:1px solid var(--line)}',
    '.db-cols button{flex:1;min-width:0;border:0;padding:0;background:transparent;height:100%;display:flex;align-items:flex-end;cursor:pointer}',
    '.db-cols button i{display:block;width:100%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,#5EE0DB,#1BA8A2);min-height:2px}',
    '.db-cols button:hover i{background:#D63F86}',
    '.db-axis{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px}',
    '.db-list{display:flex;flex-direction:column;gap:6px}',
    '.db-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 8px;align-items:center;border:0;background:transparent;font:inherit;color:inherit;text-align:start;padding:4px 2px;cursor:pointer;border-radius:8px}',
    '.db-row:hover{background:#F8FAFF}.db-row b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.db-row span{font-family:Inter,sans-serif;font-size:12.5px;font-weight:800;white-space:nowrap}',
    '.db-row .bar{grid-column:1/-1;height:7px;background:#EEF2F7;border-radius:6px;overflow:hidden}.db-row .bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#2563EB,#5EE0DB)}',
    '.db-row.slow .bar i{background:linear-gradient(90deg,#F59E0B,#FCD34D)}',
    '.db-mini{font-size:12px;color:var(--muted);margin-top:6px}',
    '.ri-f{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}',
    '@media(min-width:800px){.ri-f{grid-template-columns:repeat(4,minmax(0,1fr))}}',
    '.ri-f label{margin:0 0 3px;font-size:12px}.ri-f input,.ri-f select{width:100%}',
    '.ri-k{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}',
    '@media(min-width:800px){.ri-k{grid-template-columns:repeat(6,minmax(0,1fr))}}',
    '.ri-k div{background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 12px;min-width:0}.ri-k small{display:block;font-size:12px;color:var(--muted);font-weight:700}.ri-k b{font-family:Inter,sans-serif;font-size:17px;white-space:nowrap}',
    '.ri-k div.net{background:#ECFDF5;border-color:#A7F3D0}',
    '.tbl td.code{font-family:Inter,sans-serif;direction:ltr;text-align:start;white-space:nowrap}',
    '.ex-sets{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;margin:10px 0}',
    '@media(min-width:700px){.ex-sets{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '.ex-sets label{display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:9px 10px;margin:0;cursor:pointer;font-weight:700;font-size:13.5px;background:#fff}',
    '.ex-sets label input{width:auto;margin:0}.ex-sets label small{color:var(--muted);font-weight:600;margin-inline-start:auto;font-size:11.5px}',
    '.bk-warn{background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;border-radius:12px;padding:10px 12px;font-size:13.5px;font-weight:700}',
    '.bk-ok{background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;border-radius:12px;padding:10px 12px;font-size:13.5px;font-weight:700}',
    '.bk-info{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}',
    '.bk-info div{background:#F8FAFC;border:1px solid var(--line);border-radius:12px;padding:8px 10px;min-width:0}.bk-info small{display:block;color:var(--muted);font-size:12px;font-weight:700}.bk-info b{font-size:14px;word-break:break-word}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  function sh(action, payload) {
    return api('shopAdmin', SESSION, action, payload || {}).catch(function (e) {
      if (e.code === 'SESSION_EXPIRED' || e.message === 'SESSION_EXPIRED') { SESSION = ''; store('mc_admin_sess', null); showLogin('انتهت الجلسة، سجّل الدخول مرة أخرى'); throw new Error('انتهت الجلسة'); }
      throw e;
    });
  }
  function isOwner() { return !!(ME && ME.role === 'owner'); }
  window.isOwner = isOwner;
  function pageCan(pg) { var x = PAGES.filter(function (q) { return q[0] === pg; })[0]; return !!(x && pageOk(x)); }
  function n2(x) { return Number(x) || 0; }
  function sizeTxt(b) { b = n2(b); return b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : b >= 1024 ? (b / 1024).toFixed(1) + ' KB' : b + ' B'; }

  /* ---------------- Excel (XLSX) ---------------- */
  var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  var xlsxP = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxP) return xlsxP;
    xlsxP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = XLSX_URL; s.async = true;
      s.onload = function () { window.XLSX ? res(window.XLSX) : rej(new Error('تعذر تحميل أداة Excel')); };
      s.onerror = function () { xlsxP = null; rej(new Error('تعذر تحميل أداة Excel، اتأكد من النت')); };
      document.head.appendChild(s);
    });
    return xlsxP;
  }
  /* sheets: [{ name, cols: [header...], types: ['s'|'n'|'d'|'b'...], rows: [[...]] }]
   * الأكواد وأرقام الفواتير بتتكتب نص (عشان الأصفار اللي في الأول ما تضيعش)، والأرقام أرقام، وكل Sheet عليها فلاتر. */
  function xlsxDownload(sheets, file) {
    return loadXlsx().then(function (X) {
      var wb = X.utils.book_new(), used = {};
      sheets.forEach(function (sh0) {
        var aoa = [sh0.cols.slice()];
        sh0.rows.forEach(function (r) { aoa.push(r.map(function (v, i) { var t = (sh0.types || [])[i]; if (v === null || v === undefined) return ''; if (t === 'n') return typeof v === 'number' ? v : (v === '' ? '' : Number(v)); return String(v); })); });
        var ws = X.utils.aoa_to_sheet(aoa);
        (sh0.types || []).forEach(function (t, c) {
          if (t === 'n') return;
          for (var r = 1; r < aoa.length; r++) { var a = X.utils.encode_cell({ r: r, c: c }); if (ws[a]) { ws[a].t = 's'; ws[a].v = String(ws[a].v); ws[a].z = '@'; } }
        });
        var ref = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, aoa.length - 1), c: Math.max(0, sh0.cols.length - 1) } });
        ws['!autofilter'] = { ref: ref };
        ws['!cols'] = sh0.cols.map(function (h, c) {
          var w = String(h).length;
          for (var r = 1; r < Math.min(aoa.length, 300); r++) w = Math.max(w, String(aoa[r][c] === undefined ? '' : aoa[r][c]).length);
          return { wch: Math.min(60, Math.max(8, w + 2)) };
        });
        var nm = String(sh0.name || 'Sheet').replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31), k = nm, i = 2;
        while (used[k]) k = nm.slice(0, 28) + ' ' + (i++);
        used[k] = 1;
        X.utils.book_append_sheet(wb, ws, k);
      });
      X.writeFile(wb, file, { compression: true });
    });
  }
  window.xlsxDownload = xlsxDownload;

  /* ---------------- لوحة المؤشرات ---------------- */
  var ITEM_ST = { completed: 'مكتملة', open: 'لسه مفتوحة', cancelled: 'ملغية', 'void': 'ملغية (فاتورة)' };
  var TYPE_L = { delivery: 'Delivery – توصيل', pickup: 'Pickup – استلام', store: 'كاشير' };

  window.viewDashboard2 = function (v) {
    Promise.all([sh('dashShop'), call('dashboard')]).then(function (res) {
      var s = res[0], c = res[1], S = s.sales, O = s.orders;
      var canRep = pageCan('reports'), canOrd = pageCan('shoporders'), canCust = pageCan('customers'), canLed = pageCan('ledger');
      var G = [];
      var card = function (cls, label, val, sub, target) {
        var i = target ? G.push(target) - 1 : -1;
        return '<div class="db-c ' + (cls || '') + '"' + (i >= 0 ? ' data-go="' + i + '" role="button" tabindex="0"' : '') + '><span>' + label + '</span><b>' + val + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + (i >= 0 ? '<i class="kpi-arrow">‹</i>' : '') + '</div>';
      };
      var rep = function (o) { if (!canRep) return null; o.report = o.report || 'items'; o.back = ['dashboard', 'لوحة المؤشرات']; return ['reports', o]; };
      var ordGo = function (st, label) { if (canOrd) return ['shoporders', { st: st, back: ['dashboard', 'لوحة المؤشرات'], label: label }]; return null; };
      var maxD = Math.max.apply(null, s.days.map(function (x) { return x.sales; }).concat([0]));
      var days = []; var d0 = new Date(s.month_start + 'T12:00:00'), dEnd = new Date(s.today + 'T12:00:00');
      for (var dd = new Date(d0); dd <= dEnd; dd.setDate(dd.getDate() + 1)) { var key = dayKey(dd); var f = s.days.filter(function (x) { return x.day === key; })[0]; days.push({ day: key, sales: f ? f.sales : 0, count: f ? f.count : 0 }); }
      var chart = maxD ? '<div class="db-cols">' + days.map(function (x) {
        var i = canRep ? G.push(rep({ range: '', from: x.day, to: x.day, label: fmtDate(x.day + 'T12:00:00', 'ar') })) - 1 : -1;
        return '<button type="button"' + (i >= 0 ? ' data-go="' + i + '"' : '') + ' title="' + esc(fmtDate(x.day + 'T12:00:00', 'ar') + ': ' + fmtNum(x.sales) + ' · ' + x.count + ' فاتورة') + '"><i style="height:' + Math.max(1, Math.round(x.sales / maxD * 100)) + '%"></i></button>';
      }).join('') + '</div><div class="db-axis"><span>' + esc(fmtDate(s.month_start + 'T12:00:00', 'ar')) + '</span><span>' + esc(fmtDate(s.today + 'T12:00:00', 'ar')) + '</span></div>' : '<div class="empty">مفيش مبيعات الشهر ده لسه</div>';
      var list = function (rows, val, fmt, cls) {
        if (!rows.length) return '<div class="empty">مفيش بيانات الشهر ده لسه</div>';
        var mx = Math.max.apply(null, rows.map(val).concat([1]));
        return '<div class="db-list">' + rows.map(function (x) {
          var i = canRep ? G.push(rep({ range: 'month', item: x.name.split(' – ')[0], label: x.name })) - 1 : -1;
          return '<button type="button" class="db-row ' + (cls || '') + '"' + (i >= 0 ? ' data-go="' + i + '"' : '') + '><b>' + esc(x.name) + '</b><span>' + fmt(val(x)) + '</span><div class="bar"><i style="width:' + Math.max(2, Math.round(val(x) / mx * 100)) + '%"></i></div></button>';
        }).join('') + '</div>';
      };
      var tops = (c.top_active || []).slice(0, 5);
      v.innerHTML = '<div class="db-head"><h1>📊 لوحة المؤشرات</h1>' + (isOwner() ? '<div class="acts"><button class="btn sm" type="button" id="dbEx">📗 Export Data to Excel</button><button class="btn ghost sm" type="button" id="dbBk">🛡️ Backup & Restore</button></div>' : '') + '</div>' +
        '<div class="db-sec"><h2>💰 Sales Overview – المبيعات</h2><small>الشهر ده من ' + esc(fmtDate(s.month_start + 'T12:00:00', 'ar')) + '</small></div>' +
        '<div class="db-k five">' +
          card('hero', 'مبيعات النهارده', money(S.today), fmtNum(S.today_count) + ' فاتورة', rep({ range: 'today', label: 'مبيعات النهارده' })) +
          card('hero2', 'مبيعات الشهر', money(S.month), fmtNum(S.month_count) + ' فاتورة', rep({ range: 'month', label: 'مبيعات الشهر' })) +
          card('', 'عدد الفواتير', fmtNum(S.month_count), 'الشهر ده', canRep ? ['reports', { report: 'sales', range: 'month', back: ['dashboard', 'لوحة المؤشرات'], label: 'فواتير الشهر' }] : null) +
          card('', 'متوسط قيمة الفاتورة', money(S.avg), 'الشهر ده', canRep ? ['reports', { report: 'sales', range: 'month', back: ['dashboard', 'لوحة المؤشرات'], label: 'فواتير الشهر' }] : null) +
          card('', 'صافي المبيعات بعد الخصومات', money(S.month_net), 'خصومات: ' + money(S.month_disc), rep({ range: 'month', label: 'صافي مبيعات الشهر' })) +
        '</div>' +
        '<div class="card" style="margin-top:10px"><h3 style="font-size:14.5px;margin:0">المبيعات باليوم – الشهر ده</h3><div class="db-mini">اضغط على أي يوم يفتحلك أصناف اليوم ده</div>' + chart + '</div>' +
        '<div class="db-sec"><h2>📱 Products Performance – الأصناف</h2><small>الفواتير المكتملة الشهر ده</small></div>' +
        '<div class="db-grid three">' +
          '<div class="card"><h3>الأكثر مبيعاً بالكمية</h3>' + list(s.top_qty, function (x) { return x.qty; }, fmtNum) + '</div>' +
          '<div class="card"><h3>الأكثر تحقيقاً للمبيعات</h3>' + list(s.top_sales, function (x) { return x.sales; }, money) + '</div>' +
          '<div class="card"><h3>الأصناف الأقل حركة</h3>' + list(s.slow, function (x) { return x.qty; }, function (q) { return fmtNum(q) + ' قطعة'; }, 'slow') + '</div>' +
        '</div>' +
        '<div class="db-sec"><h2>📦 Orders Overview – الطلبات</h2><small>طلبات تصفح منتجاتنا</small></div>' +
        '<div class="db-k four">' +
          card('t-new', 'الطلبات الجديدة', fmtNum(O.new_orders), '', ordGo('pending', 'الطلبات الجديدة')) +
          card('t-prog', 'قيد التنفيذ', fmtNum(O.in_progress), '', ordGo('', 'الطلبات')) +
          card('t-done', 'المكتملة', fmtNum(O.completed), 'الشهر ده', ordGo('completed', 'الطلبات المكتملة')) +
          card('t-can', 'الملغاة', fmtNum(O.cancelled), 'الشهر ده', ordGo('cancelled', 'الطلبات الملغاة')) +
        '</div>' +
        '<div class="db-sec"><h2>👥 Customers Overview – العملاء</h2></div>' +
        '<div class="db-k">' +
          card('', 'عدد العملاء', fmtNum(c.customers_total), '', canCust ? ['customers', { filter: 'all', back: ['dashboard', 'لوحة المؤشرات'], label: 'كل العملاء' }] : null) +
          card('', 'العملاء الجدد', fmtNum(c.customers_new), 'آخر ' + c.new_days + ' يوم', canCust ? ['customers', { filter: 'new', back: ['dashboard', 'لوحة المؤشرات'], label: 'العملاء الجدد' }] : null) +
          card('', 'نقاط الولاء الممنوحة', fmtNum(c.points_earned), 'كل الوقت', canLed ? ['ledger', { type: 'EARN', back: ['dashboard', 'لوحة المؤشرات'], label: 'النقاط الممنوحة' }] : null) +
        '</div>' +
        '<div class="db-grid"><div class="card"><h3>أكثر العملاء نشاطاً (آخر 30 يوم)</h3>' + custTable(tops) + '</div></div>';
      DASH_DAYS = { 'new': c.new_days, inactive: c.inactive_days, loaded: true };
      $all('[data-go]', v).forEach(function (el) {
        var t = G[Number(el.dataset.go)]; if (!t) return;
        var open = function () { go(t[0], t[1]); };
        el.onclick = open; el.onkeydown = function (e) { if (e.key === 'Enter') open(); };
      });
      $all('[data-cid]', v).forEach(function (tr) { tr.onclick = function () { openCustomer(tr.dataset.cid); }; });
      if ($('#dbEx')) $('#dbEx').onclick = function () { go('export', { back: ['dashboard', 'لوحة المؤشرات'] }); };
      if ($('#dbBk')) $('#dbBk').onclick = function () { go('backup', { back: ['dashboard', 'لوحة المؤشرات'] }); };
    }).catch(function (e) { v.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
  };

  /* ---------------- تقرير المبيعات على مستوى الصنف ---------------- */
  var RI_COLS = [
    ['invoice_no', 'رقم الفاتورة', 's'], ['created_at', 'تاريخ الفاتورة', 'd'], ['customer_name', 'اسم العميل', 's'], ['item_code', 'كود الصنف', 's'], ['item_name', 'اسم الصنف', 's'],
    ['category', 'القسم', 's'], ['qty', 'الكمية', 'n'], ['unit_price', 'سعر الوحدة', 'n'], ['total', 'إجمالي قيمة الصنف', 'n'], ['discount', 'الخصم', 'n'], ['net', 'الصافي', 'n'],
    ['type', 'نوع الطلب', 's'], ['status', 'حالة الفاتورة', 's']
  ];
  var RI_SORT = [['date', 'التاريخ (الأحدث)'], ['date_asc', 'التاريخ (الأقدم)'], ['qty', 'الكمية (الأكبر)'], ['net', 'قيمة المبيعات (الأكبر)'], ['item', 'الصنف (أ-ي)'], ['invoice', 'رقم الفاتورة']];
  window.viewItemsReport = function (v, r) {
    var f = { range: GO_OPT.range === undefined ? 'month' : GO_OPT.range, from: GO_OPT.from || '', to: GO_OPT.to || '', inv: '', item: GO_OPT.item || '', code: '', cat: '', cust: '', type: '', st: 'completed', sort: 'date' };
    if (f.range) { var x0 = rangeDates(f.range); f.from = x0.from; f.to = x0.to; }
    var rows = [], cats = [];
    var opt = function (list, cur) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); };
    v.innerHTML = '<div class="card"><h2>' + r.ic + ' ' + esc(r.t) + '</h2><p class="small muted" style="margin-top:-4px">' + esc(r.d) + '</p>' +
      '<div class="rep-ranges" id="riR">' + REP_RANGES.map(function (x) { return '<button type="button" class="chip" data-r="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="ri-f">' +
        '<div><label>من (From)</label><input type="date" id="riFrom"></div><div><label>إلى (To)</label><input type="date" id="riTo"></div>' +
        '<div><label>رقم الفاتورة</label><input id="riInv" placeholder="مثلاً ONL-1012"></div><div><label>اسم الصنف</label><input id="riItem"></div>' +
        '<div><label>كود الصنف</label><input id="riCode" dir="ltr"></div><div><label>القسم (Category)</label><select id="riCat"></select></div>' +
        '<div><label>اسم العميل</label><input id="riCust"></div>' +
        '<div><label>نوع الطلب</label><select id="riType">' + opt([['', 'الكل'], ['delivery', 'Delivery – توصيل'], ['pickup', 'Pickup – استلام'], ['store', 'كاشير']], f.type) + '</select></div>' +
        '<div><label>حالة الفاتورة</label><select id="riSt">' + opt([['', 'الكل'], ['completed', 'مكتملة'], ['open', 'لسه مفتوحة'], ['cancelled', 'ملغية']], f.st) + '</select></div>' +
        '<div><label>الترتيب</label><select id="riSort">' + opt(RI_SORT, f.sort) + '</select></div>' +
      '</div></div><div id="riSum"></div><div id="riBox"></div>';
    $('#riItem').value = f.item;
    var markChips = function () { $all('#riR .chip').forEach(function (b) { b.classList.toggle('on', b.dataset.r === f.range); }); $('#riFrom').value = f.from; $('#riTo').value = f.to; };
    var low = function (s) { return String(s || '').toLowerCase(); };
    var filtered = function () {
      var out = rows.filter(function (x) {
        if (f.inv && low(x.invoice_no).indexOf(low(f.inv)) < 0) return false;
        if (f.item && low(x.item_name).indexOf(low(f.item)) < 0) return false;
        if (f.code && low(x.item_code).indexOf(low(f.code)) < 0) return false;
        if (f.cat && x.category !== f.cat) return false;
        if (f.cust && low(x.customer_name).indexOf(low(f.cust)) < 0 && low(x.member_no).indexOf(low(f.cust)) < 0) return false;
        if (f.type && x.type !== f.type) return false;
        if (f.st && (f.st === 'cancelled' ? (x.status !== 'cancelled' && x.status !== 'void') : x.status !== f.st)) return false;
        return true;
      });
      var t = function (x) { return new Date(x.created_at).getTime() || 0; };
      var cmp = {
        date: function (a, b) { return t(b) - t(a); }, date_asc: function (a, b) { return t(a) - t(b); },
        qty: function (a, b) { return b.qty - a.qty; }, net: function (a, b) { return b.net - a.net; },
        item: function (a, b) { return String(a.item_name).localeCompare(String(b.item_name), 'ar'); },
        invoice: function (a, b) { return String(a.invoice_no).localeCompare(String(b.invoice_no), 'en', { numeric: true }); }
      }[f.sort];
      return out.sort(cmp);
    };
    var draw = function () {
      var list = filtered();
      var inv = {}, items = {}, sum = { total: 0, qty: 0, disc: 0, net: 0 };
      list.forEach(function (x) { inv[x.invoice_no] = 1; if (x.type !== 'store') items[x.item_name] = 1; sum.total += x.total; sum.qty += x.qty; sum.disc += x.discount; sum.net += x.net; });
      $('#riSum').innerHTML = '<div class="ri-k"><div><small>إجمالي المبيعات</small><b>' + money(sum.total) + '</b></div><div><small>عدد الفواتير</small><b>' + fmtNum(Object.keys(inv).length) + '</b></div>' +
        '<div><small>إجمالي الكميات المباعة</small><b>' + fmtNum(sum.qty) + '</b></div><div><small>عدد الأصناف المختلفة</small><b>' + fmtNum(Object.keys(items).length) + '</b></div>' +
        '<div><small>إجمالي الخصومات</small><b>' + money(sum.disc) + '</b></div><div class="net"><small>صافي المبيعات</small><b>' + money(sum.net) + '</b></div></div>';
      var box = $('#riBox');
      box.innerHTML = '<div class="card"><div class="toolbar" style="margin-bottom:6px"><span class="small muted" style="flex:1">عدد السطور: ' + fmtNum(list.length) + (list.length !== rows.length ? ' من ' + fmtNum(rows.length) : '') + '</span>' +
        (isOwner() ? '<button class="btn ghost sm" id="riXl" type="button">📗 تنزيل Excel</button>' : '') + '</div>' +
        (list.length ? '<div class="tblwrap"><table class="tbl"><tr>' + RI_COLS.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '</tr>' +
          list.slice(0, 1500).map(function (x) {
            return '<tr' + (x.customer_id ? ' class="click" data-cid="' + esc(x.customer_id) + '"' : '') + '><td class="code">' + esc(x.invoice_no) + '</td><td>' + d(x.created_at, 1) + '</td><td>' + esc(x.customer_name || '—') + '</td><td class="code">' + esc(x.item_code || '—') + '</td>' +
              '<td>' + esc(x.item_name) + '</td><td>' + esc(x.category || '—') + '</td><td>' + fmtNum(x.qty) + '</td><td>' + (x.type === 'store' ? '—' : money(x.unit_price)) + '</td><td>' + money(x.total) + '</td>' +
              '<td>' + (x.discount ? '<span class="neg">' + money(x.discount) + '</span>' : '0') + '</td><td><b>' + money(x.net) + '</b></td><td>' + esc(TYPE_L[x.type] || x.type) + '</td><td>' + esc(ITEM_ST[x.status] || x.status) + '</td></tr>';
          }).join('') +
          '<tr class="tot"><td><b>الإجمالي</b></td><td></td><td></td><td></td><td></td><td></td><td><b>' + fmtNum(sum.qty) + '</b></td><td></td><td><b>' + money(sum.total) + '</b></td><td><b>' + money(sum.disc) + '</b></td><td><b>' + money(sum.net) + '</b></td><td></td><td></td></tr>' +
          '</table></div>' + (list.length > 1500 ? '<div class="small muted" style="margin-top:6px">معروض أول 1500 سطر. نزّل Excel عشان تشوف الكل.</div>' : '') : '<div class="empty">مفيش مبيعات بالفلاتر دي</div>') + '</div>';
      $all('#riBox [data-cid]').forEach(function (tr) { tr.onclick = function () { openCustomer(tr.dataset.cid); }; });
      if ($('#riXl')) $('#riXl').onclick = function () {
        var b = this; busy(b, true);
        xlsxDownload([{ name: 'Sales Details', cols: RI_COLS.map(function (c) { return c[1]; }), types: RI_COLS.map(function (c) { return c[2] === 'n' ? 'n' : 's'; }),
          rows: list.map(function (x) { return RI_COLS.map(function (c) { var val = x[c[0]]; if (c[0] === 'created_at') return val ? fmtDate(val, 'ar', 1) : ''; if (c[0] === 'type') return TYPE_L[val] || val; if (c[0] === 'status') return ITEM_ST[val] || val; return val; }); }) }],
          'mobily-sales-items-' + (f.from || 'all') + (f.to ? '_' + f.to : '') + '.xlsx').then(function () { toast('تم تنزيل الملف ✓'); }).catch(function (e) { toast(e.message, true); }).then(function () { busy(b, false); });
      };
    };
    var load = function () {
      loading($('#riBox')); $('#riSum').innerHTML = '';
      sh('salesItems', { from: f.from, to: f.to }).then(function (res) {
        rows = res || [];
        var cs = {}; rows.forEach(function (x) { if (x.category) cs[x.category] = 1; });
        cats = Object.keys(cs).sort();
        $('#riCat').innerHTML = opt([['', 'الكل']].concat(cats.map(function (c) { return [c, c]; })), f.cat);
        draw();
      }).catch(function (e) { $('#riBox').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
    };
    $all('#riR .chip').forEach(function (b) { b.onclick = function () { f.range = b.dataset.r; var x = rangeDates(f.range); f.from = x.from; f.to = x.to; markChips(); load(); }; });
    var onDate = function () { var a = $('#riFrom').value, b = $('#riTo').value; if (a && b && a > b) return toast('تاريخ البداية بعد تاريخ النهاية', true); f.range = ''; f.from = a; f.to = b; markChips(); load(); };
    $('#riFrom').onchange = onDate; $('#riTo').onchange = onDate;
    var tm;
    [['riInv', 'inv'], ['riItem', 'item'], ['riCode', 'code'], ['riCust', 'cust']].forEach(function (p) { $('#' + p[0]).oninput = function () { f[p[1]] = this.value.trim(); clearTimeout(tm); tm = setTimeout(draw, 200); }; });
    [['riCat', 'cat'], ['riType', 'type'], ['riSt', 'st'], ['riSort', 'sort']].forEach(function (p) { $('#' + p[0]).onchange = function () { f[p[1]] = this.value; draw(); }; });
    markChips(); load();
  };

  /* ---------------- Export Data to Excel (Owner) ---------------- */
  var EX_SETS = [
    ['sales', 'Sales & Invoices', 'الفواتير', 1], ['details', 'Sales Details', 'تفاصيل الأصناف في كل فاتورة', 1], ['products', 'Products', 'المنتجات'], ['categories', 'Product Categories', 'الأقسام'],
    ['customers', 'Customers', 'العملاء'], ['ledger', 'Loyalty Points', 'حركة نقاط الولاء', 1], ['redemptions', 'Loyalty Redemptions', 'استبدال النقاط', 1],
    ['offers', 'Offers', 'العروض'], ['promos', 'Discount Codes', 'أكواد الخصم'], ['birthday', 'Birthday Rewards', 'هدايا أعياد الميلاد', 1], ['orders', 'Orders', 'الطلبات', 1],
    ['branches', 'Branches', 'الفروع'], ['employees', 'Employees', 'الموظفين'], ['tiers', 'Tiers', 'مستويات العملاء']
  ];
  window.viewExport = function (v) {
    if (!isOwner()) { v.innerHTML = '<div class="err">تصدير البيانات لصاحب المحل بس</div>'; return; }
    var f = { range: 'all', from: '', to: '' };
    v.innerHTML = '<div class="card"><h2>📗 Export Data to Excel</h2><p class="small muted" style="margin-top:-4px">اختار تقرير معين أو كل بيانات النظام. كل نوع بيانات بيتحط في Sheet لوحده، بفلاتر جاهزة. التصدير مش بيغيّر أي حاجة في البيانات. ملف Excel مش بديل عن النسخة الاحتياطية الكاملة.</p>' +
      '<div class="toolbar" style="margin:6px 0 0"><button class="btn ghost sm" type="button" id="exAll">✔️ اختار الكل</button><button class="btn ghost sm" type="button" id="exNone">مسح الاختيار</button></div>' +
      '<div class="ex-sets">' + EX_SETS.map(function (x) { return '<label><input type="checkbox" value="' + x[0] + '" checked><span>' + esc(x[1]) + ' – ' + esc(x[2]) + '</span>' + (x[3] ? '<small>بالفترة</small>' : '') + '</label>'; }).join('') + '</div>' +
      '<label>الفترة (للبيانات اللي ليها تاريخ)</label><div class="rep-ranges" id="exR">' + REP_RANGES.map(function (x) { return '<button type="button" class="chip" data-r="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:8px"><div><label>من</label><input type="date" id="exFrom"></div><div><label>إلى</label><input type="date" id="exTo"></div></div>' +
      '<button class="btn" type="button" id="exGo" style="margin-top:12px;width:100%">📗 Export Data to Excel</button><div id="exMsg" class="small muted" style="margin-top:8px"></div></div>';
    var mark = function () { $all('#exR .chip').forEach(function (b) { b.classList.toggle('on', b.dataset.r === f.range); }); $('#exFrom').value = f.from; $('#exTo').value = f.to; };
    $all('#exR .chip').forEach(function (b) { b.onclick = function () { f.range = b.dataset.r; var x = rangeDates(f.range); f.from = x.from; f.to = x.to; mark(); }; });
    var od = function () { f.range = ''; f.from = $('#exFrom').value; f.to = $('#exTo').value; mark(); };
    $('#exFrom').onchange = od; $('#exTo').onchange = od;
    $('#exAll').onclick = function () { $all('.ex-sets input').forEach(function (i) { i.checked = true; }); };
    $('#exNone').onclick = function () { $all('.ex-sets input').forEach(function (i) { i.checked = false; }); };
    $('#exGo').onclick = function () {
      var sets = $all('.ex-sets input').filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
      if (!sets.length) return toast('اختار البيانات اللي عايز تصدّرها', true);
      if (f.from && f.to && f.from > f.to) return toast('تاريخ البداية بعد تاريخ النهاية', true);
      var b = this; busy(b, true); $('#exMsg').textContent = 'بنجهّز الملف…';
      sh('exportData', { sets: sets, from: f.from, to: f.to }).then(function (r) {
        var name = 'mobily-' + (sets.length === EX_SETS.length ? 'all-data' : sets.length === 1 ? sets[0] : 'export') + '-' + (f.from || f.to ? (f.from || 'start') + '_' + (f.to || 'today') : dayKey(new Date())) + '.xlsx';
        return xlsxDownload(r.sheets, name).then(function () {
          $('#exMsg').textContent = 'تم ✓ ' + r.sheets.map(function (s) { return s.name + ' (' + s.rows.length + ')'; }).join(' · ');
          toast('تم تنزيل الملف ✓');
        });
      }).catch(function (e) { $('#exMsg').textContent = ''; toast(e.message, true); }).then(function () { busy(b, false); });
    };
    mark();
  };

  /* ---------------- Backup & Restore (Owner) ---------------- */
  var WIPE = [
    ['orders', 'الطلبات', 'طلبات الأونلاين وسجلها والإشعارات'], ['sales', 'المبيعات والفواتير', 'الفواتير والاستبدالات ومشتريات العملاء'],
    ['points', 'نقاط العملاء', 'حركة النقاط والأرصدة ترجع صفر'], ['customers', 'العملاء', 'العملاء ونقاطهم وأعياد ميلادهم وواتساب'], ['activity', 'سجل العمليات', '']
  ];
  window.viewBackup = function (v) {
    if (!isOwner()) { v.innerHTML = '<div class="err">النسخ الاحتياطي لصاحب المحل بس</div>'; return; }
    v.innerHTML = '<div class="card"><h2>🛡️ Backup & Restore</h2><p class="small muted" style="margin-top:-4px">نسخة كاملة من كل بيانات النظام: العملاء، المنتجات والأقسام، الطلبات، الفواتير، النقاط، العروض وأكواد الخصم، الإعدادات، والموظفين. اعمل نسخة قبل أي تحديث كبير.</p>' +
      '<div class="bk-info" id="bkInfo"><div><small>آخر Backup</small><b>…</b></div><div><small>حجمها</small><b>…</b></div></div>' +
      '<label>ملاحظة (اختياري)</label><input id="bkNote" maxlength="200" placeholder="مثلاً: قبل تحديث النظام">' +
      '<button class="btn" type="button" id="bkGo" style="margin-top:10px;width:100%">💾 Create Full Backup</button>' +
      '<div class="small muted" style="margin-top:6px">الملف بيتنزل على جهازك (JSON) وفيه بصمة (checksum) بتتأكد إن الملف ما اتغيّرش. احتفظ بيه في مكان آمن، لأنه فيه كل بيانات المحل. صور المنتجات والعروض متخزنة على السيرفر والنسخة فيها روابطها.</div></div>' +
      '<div class="card" style="margin-top:12px"><h2>📋 النسخ السابقة</h2><div id="bkHist"></div></div>' +
      '<div class="card" style="margin-top:12px"><h2>♻️ Restore – استرجاع نسخة</h2><p class="small muted" style="margin-top:-4px">اختار ملف Backup سابق. هنعرضلك محتوياته ونفحصه الأول، ومفيش أي استبدال بيحصل غير بعد تأكيدك.</p>' +
      '<input type="file" id="bkFile" accept=".json,application/json"><div id="bkRs" style="margin-top:10px"></div></div>' +
      '<div class="card" style="margin-top:12px"><h2>🗑️ مسح البيانات الموجودة</h2><p class="small muted" style="margin-top:-4px">اختار البيانات اللي عايز تمسحها. المنتجات والأقسام والعروض وأكواد الخصم والمكافآت والإعدادات والموظفين مش بتتمسح.</p>' +
      '<div class="ex-sets" id="wpSets">' + WIPE.map(function (x) { return '<label><input type="checkbox" value="' + x[0] + '"><span>' + esc(x[1]) + '</span><small>' + esc(x[2]) + '</small></label>'; }).join('') + '</div>' +
      '<div class="bk-warn">⚠️ المسح نهائي ومينفعش يرجع غير من نسخة احتياطية. اعمل Backup الأول من فوق.</div>' +
      '<label style="margin-top:10px">للتأكيد اكتب كلمة: مسح</label><input id="wpConf" autocomplete="off">' +
      '<button class="btn danger" type="button" id="wpGo" style="margin-top:8px;width:100%" disabled>🗑️ مسح البيانات المختارة</button><div id="wpMsg" style="margin-top:8px"></div></div>';
    var info = function () {
      sh('backupInfo').then(function (rows) {
        var last = rows.filter(function (x) { return x.kind === 'backup'; })[0];
        $('#bkInfo').innerHTML = '<div><small>آخر Backup</small><b>' + (last ? d(last.created_at, 1) : 'لسه مفيش') + '</b></div><div><small>حجمها</small><b>' + (last ? sizeTxt(last.size_bytes) : '—') + '</b></div>';
        $('#bkHist').innerHTML = rows.length ? '<div class="tblwrap"><table class="tbl"><tr><th>التاريخ</th><th>النوع</th><th>بواسطة</th><th>الحجم</th><th>السجلات</th><th>ملاحظة</th></tr>' + rows.map(function (x) {
          return '<tr><td>' + d(x.created_at, 1) + '</td><td>' + (x.kind === 'restore' ? badge('استرجاع', 'red') : x.kind === 'wipe' ? badge('مسح', 'red') : badge('Backup', 'green')) + '</td><td>' + esc(x.created_by) + '</td><td>' + (x.kind === 'backup' ? sizeTxt(x.size_bytes) : '—') + '</td><td>' + (x.kind === 'wipe' ? '—' : fmtNum(x.rows_count) + ' في ' + fmtNum(x.tables_count) + ' جدول') + '</td><td>' + esc(x.note || '') + '</td></tr>';
        }).join('') + '</table></div>' : '<div class="empty">لسه ما اتعملش أي Backup</div>';
      }).catch(function (e) { $('#bkHist').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
    };
    $('#bkGo').onclick = function () {
      var b = this; busy(b, true);
      sh('backupCreate', { note: $('#bkNote').value.trim() }).then(function (bk) {
        var txt = JSON.stringify(bk);
        var t = new Date(bk.created_at), pad = function (n) { return (n < 10 ? '0' : '') + n; };
        var name = 'mobily-backup-' + dayKey(t) + '-' + pad(t.getHours()) + pad(t.getMinutes()) + '.json';
        var blob = new Blob([txt], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        toast('تم إنشاء النسخة وتنزيلها ✓'); $('#bkNote').value = ''; info();
      }).catch(function (e) { toast(e.message, true); }).then(function () { busy(b, false); });
    };
    $('#bkFile').onchange = function () {
      var file = this.files && this.files[0], box = $('#bkRs');
      if (!file) { box.innerHTML = ''; return; }
      var rd = new FileReader();
      rd.onload = function () {
        var bk;
        try { bk = JSON.parse(rd.result); } catch (e) { box.innerHTML = '<div class="bk-warn">الملف ده مش ملف Backup صالح.</div>'; return; }
        if (!bk || bk.format !== 'mobily-backup' || !bk.tables || !bk.checksum) { box.innerHTML = '<div class="bk-warn">الملف ده مش نسخة احتياطية من MOBILY CLUB.</div>'; return; }
        var names = Object.keys(bk.tables), total = names.reduce(function (s, t) { return s + ((bk.tables[t].rows || []).length); }, 0);
        box.innerHTML = '<div class="bk-info"><div><small>تاريخ النسخة</small><b>' + d(bk.created_at, 1) + '</b></div><div><small>عملها</small><b>' + esc(bk.created_by || '—') + '</b></div>' +
          '<div><small>الحجم</small><b>' + sizeTxt(file.size) + '</b></div><div><small>السجلات</small><b>' + fmtNum(total) + ' في ' + names.length + ' جدول</b></div></div>' +
          (bk.note ? '<div class="small muted">ملاحظة: ' + esc(bk.note) + '</div>' : '') +
          '<details style="margin:8px 0"><summary class="small" style="cursor:pointer">محتويات النسخة</summary><div class="tblwrap"><table class="tbl"><tr><th>الجدول</th><th>عدد السجلات</th></tr>' + names.map(function (t) { return '<tr><td class="code">' + esc(t) + '</td><td>' + fmtNum((bk.tables[t].rows || []).length) + '</td></tr>'; }).join('') + '</table></div></details>' +
          '<button class="btn ghost" type="button" id="bkChk" style="width:100%">🔎 فحص سلامة الملف</button><div id="bkStep" style="margin-top:10px"></div>';
        $('#bkChk').onclick = function () {
          var b = this; busy(b, true); $('#bkStep').innerHTML = '';
          sh('backupRestore', { backup: bk, dry_run: true }).then(function (r) {
            $('#bkStep').innerHTML = '<div class="bk-ok">✓ الملف سليم ومطابق لبصمته، وجرّبنا استرجاعه كامل من غير ما نغيّر حاجة (' + fmtNum(Object.keys(r.tables).length) + ' جدول).' + (r.skipped && r.skipped.length ? ' جداول مش موجودة في النظام وهتتساب: ' + esc(r.skipped.join('، ')) : '') + '</div>' +
              '<div class="bk-warn" style="margin-top:10px">⚠️ الاسترجاع هيمسح كل البيانات الحالية ويحط مكانها بيانات النسخة دي (' + d(bk.created_at, 1) + '). أي حاجة اتعملت بعد التاريخ ده هتضيع. ننصحك تعمل Backup للبيانات الحالية الأول.</div>' +
              '<label style="margin-top:10px">للتأكيد اكتب كلمة: استرجاع</label><input id="bkConf" autocomplete="off">' +
              '<button class="btn danger" type="button" id="bkDo" style="margin-top:8px;width:100%" disabled>♻️ استرجاع النسخة دي</button>';
            $('#bkConf').oninput = function () { $('#bkDo').disabled = this.value.trim() !== 'استرجاع'; };
            $('#bkDo').onclick = function () {
              if (!window.confirm('متأكد؟ كل البيانات الحالية هتتبدل ببيانات النسخة دي.')) return;
              var b2 = this; busy(b2, true);
              sh('backupRestore', { backup: bk, confirm: $('#bkConf').value.trim() }).then(function (r2) {
                $('#bkStep').innerHTML = '<div class="bk-ok">✓ تم استرجاع النسخة (' + fmtNum(Object.keys(r2.tables).length) + ' جدول). حدّث الصفحة.</div>';
                toast('تم الاسترجاع ✓'); info();
              }).catch(function (e) { toast(e.message, true); busy(b2, false); });
            };
          }).catch(function (e) { $('#bkStep').innerHTML = '<div class="bk-warn">' + esc(e.message) + '</div>'; }).then(function () { busy(b, false); });
        };
      };
      rd.onerror = function () { box.innerHTML = '<div class="bk-warn">تعذر قراءة الملف</div>'; };
      rd.readAsText(file);
    };
    var wpSel = function () { return $all('#wpSets input').filter(function (i) { return i.checked; }).map(function (i) { return i.value; }); };
    var wpCheck = function () { $('#wpGo').disabled = !(wpSel().length && $('#wpConf').value.trim() === 'مسح'); };
    $('#wpConf').oninput = wpCheck; $all('#wpSets input').forEach(function (i) { i.onchange = wpCheck; });
    $('#wpGo').onclick = function () {
      var sets = wpSel(), names = WIPE.filter(function (x) { return sets.indexOf(x[0]) >= 0; }).map(function (x) { return x[1]; }).join('، ');
      if (!window.confirm('متأكد؟ هيتمسح نهائياً: ' + names)) return;
      var b = this; busy(b, true);
      sh('wipeData', { sets: sets, confirm: $('#wpConf').value.trim() }).then(function () {
        $('#wpMsg').innerHTML = '<div class="bk-ok">✓ اتمسح: ' + esc(names) + '</div>';
        $('#wpConf').value = ''; $all('#wpSets input').forEach(function (i) { i.checked = false; });
        toast('تم المسح ✓'); info();
      }).catch(function (e) { toast(e.message, true); }).then(function () { busy(b, false); wpCheck(); });
    };
    info();
  };
})();
