/* موبايلي - Mobily — لوحة الإدارة: «كتالوج المكافآت» (مكافآت بمستويات نقاط + تسليمها لعميل)
 * بيستخدم أدوات لوحة الإدارة الموجودة: api, call, SESSION, esc, $, $all, toast */
(function () {
  'use strict';
  function rw(action, payload) { return api('rewardsAdmin', SESSION, action, payload || {}); }

  function row(r) {
    return '<tr data-r="' + esc(r.reward_id || '') + '">' +
      '<td><input data-f="icon" value="' + esc(r.icon || '🎁') + '" style="width:52px;text-align:center"></td>' +
      '<td><input data-f="title" value="' + esc(r.title || '') + '" placeholder="مثلاً: سماعة هدية"></td>' +
      '<td><input data-f="points_cost" value="' + esc(r.points_cost) + '" inputmode="numeric" style="width:84px;direction:ltr"></td>' +
      '<td><input data-f="description" value="' + esc(r.description || '') + '" placeholder="تفاصيل اختيارية"></td>' +
      '<td style="text-align:center"><input type="checkbox" data-f="active"' + (r.active === false ? '' : ' checked') + '></td>' +
      '<td><button class="btn ghost sm" type="button" data-save="1">حفظ</button></td></tr>';
  }

  window.viewRewardCat = function (v) {
    rw('list').then(function (r) {
      var rows = r.rewards || [];
      v.innerHTML = '<div class="card"><h2 style="margin-top:0">🏅 كتالوج المكافآت</h2>' +
        '<p class="small muted">اكتب المكافآت اللي العميل ياخدها بنقاطه. العميل بيشوفها في كارته، ومعاها شريط بيوريه فاضله كام نقطة على أقرب مكافأة.</p>' +
        '<div class="tblwrap"><table class="tbl" id="rcTbl">' +
        '<tr><th>أيقونة</th><th>اسم المكافأة</th><th>نقاط</th><th>تفاصيل</th><th>مفعلة</th><th></th></tr>' +
        rows.map(row).join('') + '</table></div>' +
        '<div class="toolbar" style="margin-top:10px"><button class="btn sm" type="button" id="rcAdd">+ مكافأة جديدة</button></div></div>' +
        '<div class="card" style="margin-top:12px"><h2 style="margin-top:0">تسليم مكافأة لعميل</h2>' +
        '<p class="small muted">النقاط بتتخصم من محفظة العميل وبتتسجل في سجل النقاط باسم المكافأة.</p>' +
        '<div class="row"><input id="rcQ" placeholder="اسم العميل أو رقم موبايله"><button class="btn ghost sm" type="button" id="rcFind">بحث</button></div>' +
        '<div id="rcRes" style="margin-top:10px"></div></div>';

      function bind() {
        $all('[data-save]', v).forEach(function (b) {
          b.onclick = function () {
            var tr = b.parentNode.parentNode, g = function (f) { return $('[data-f="' + f + '"]', tr); };
            b.disabled = true;
            rw('save', {
              reward_id: tr.getAttribute('data-r') || '', icon: g('icon').value, title: g('title').value,
              points_cost: g('points_cost').value, description: g('description').value, active: g('active').checked
            }).then(function (x) { tr.setAttribute('data-r', x.reward_id); toast('تم الحفظ ✓'); })
              .catch(function (e) { toast(e.message, true); })
              .then(function () { b.disabled = false; });
          };
        });
      }
      bind();

      $('#rcAdd').onclick = function () {
        var t = document.createElement('table');
        t.innerHTML = row({ reward_id: '', title: '', points_cost: 10, description: '', icon: '🎁', active: true });
        var tr = t.querySelector('tr');
        ($('#rcTbl').tBodies[0] || $('#rcTbl')).appendChild(tr);
        bind();
      };

      function find() {
        var q = $('#rcQ').value.trim();
        if (!q) return;
        $('#rcRes').innerHTML = '<div class="empty"><span class="spinner"></span></div>';
        call('searchCustomers', { q: q, limit: 8 }).then(function (list) {
          if (!list.length) { $('#rcRes').innerHTML = '<div class="empty">مفيش عميل بالاسم ده</div>'; return; }
          var live = rows.filter(function (x) { return x.active !== false; });
          $('#rcRes').innerHTML = list.map(function (c) {
            return '<div class="recip" style="display:block"><b>' + esc(c.name) + '</b> ' +
              '<span class="small muted">' + esc(c.member_no) + ' · رصيده ' + c.points_balance + ' نقطة</span>' +
              '<div style="margin-top:6px">' + (live.length ? live.map(function (x) {
                return '<button class="btn ghost sm" type="button" data-give="' + esc(x.reward_id) + '" data-cust="' + esc(c.customer_id) + '" style="margin:3px">' +
                  esc(x.icon || '🎁') + ' ' + esc(x.title) + ' (' + x.points_cost + ')</button>';
              }).join('') : '<span class="small muted">مفيش مكافآت مفعلة</span>') + '</div></div>';
          }).join('');
          $all('[data-give]', $('#rcRes')).forEach(function (b) {
            b.onclick = function () {
              b.disabled = true;
              rw('claim', { reward_id: b.getAttribute('data-give'), customer_id: b.getAttribute('data-cust') })
                .then(function (x) { toast('تم تسليم ' + x.title + '. رصيده بقى ' + x.balance + ' نقطة ✓'); find(); })
                .catch(function (e) { toast(e.message, true); b.disabled = false; });
            };
          });
        }).catch(function (e) { $('#rcRes').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
      }
      $('#rcFind').onclick = find;
      $('#rcQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') find(); });
    }).catch(function (e) { v.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
  };
})();
