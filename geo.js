/* MOBILY CLUB — «تذكير القرب من المحل»
 * صفحة الكارت: العميل يفعّل التذكير بنفسه (موافقة صريحة) ← لازم يسمح بالموقع + الإشعارات.
 *   لو أي شرط ناقص أو اتلغى: التذكير بيقف بهدوء من غير أي رسالة خطأ.
 *   الموقع بيتقري بس والصفحة مفتوحة قدامه (المتصفح ما بيسمحش لموقع ويب يتابع الموقع في الخلفية).
 *   الإشعار مرة واحدة في الزيارة: لازم يفضل جوه النطاق دقيقة ويكون ماشي ببطء (مش عربية معدية)،
 *   وبعدها مفيش إشعار تاني إلا لما يبعد عن المحل ويعدّي 12 ساعة.
 * لوحة الإدارة: صفحة «تذكير القرب» (مكان المحل، المسافة، نص الإشعار، تشغيل/إيقاف). */
(function () {
  var COOLDOWN_MS = 12 * 3600 * 1000;   // أقل وقت بين إشعارين لنفس الجهاز
  var DWELL_MS = 60 * 1000;             // لازم يفضل جوه النطاق دقيقة
  var MAX_SPEED = 2.5;                  // م/ث (حوالي 9 كم/س) — أسرع من كده = عربية معدية
  var K_ON = 'mc_geo_on', K_LAST = 'mc_geo_last', K_VISIT = 'mc_geo_visit';

  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch (e) { }
    return null;
  }
  function dist(a1, o1, a2, o2) {
    var R = 6371000, r = Math.PI / 180, dA = (a2 - a1) * r, dO = (o2 - o1) * r;
    var h = Math.sin(dA / 2) * Math.sin(dA / 2) + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) * Math.sin(dO / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function supported() { return !!(navigator.geolocation && window.Notification && navigator.serviceWorker); }
  function permState(name) {
    if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve('unknown');
    return navigator.permissions.query({ name: name }).then(function (s) { return s.state; }, function () { return 'unknown'; });
  }

  /* منطق النطاق — مكتوب منفصل علشان يتجرب لوحده */
  function Fence(cfg, now, notify) {
    var enterAt = null, prev = null;
    var exitR = cfg.radius_m + Math.max(50, cfg.radius_m * 0.5); // لازم يبعد شوية عن الحد علشان نعتبر الزيارة خلصت
    return function onFix(lat, lng, acc, speed) {
      var t = now();
      if (!(acc >= 0) || acc > Math.max(100, cfg.radius_m)) return 'weak';        // إشارة GPS ضعيفة ← نتجاهل القراءة
      var d = dist(lat, lng, cfg.lat, cfg.lng);
      var v = speed != null && speed >= 0 ? speed : (prev && t > prev.t ? dist(lat, lng, prev.lat, prev.lng) / ((t - prev.t) / 1000) : 0);
      prev = { lat: lat, lng: lng, t: t };
      if (d > exitR) { enterAt = null; ls(K_VISIT, null); return 'out'; }        // بعد عن المحل ← الزيارة خلصت
      if (d > cfg.radius_m) { enterAt = null; return 'edge'; }
      if (v > MAX_SPEED) { enterAt = null; return 'fast'; }                       // معدّي بالعربية
      if (enterAt === null) enterAt = t;
      if (t - enterAt < DWELL_MS) return 'wait';
      if (ls(K_VISIT) === '1') return 'done';                                     // اتبعتله في نفس الزيارة
      var last = Number(ls(K_LAST)) || 0;
      if (last && t - last < COOLDOWN_MS) return 'cool';
      ls(K_LAST, t); ls(K_VISIT, '1');
      notify();
      return 'sent';
    };
  }
  window.__mcGeoFence = Fence;

  /* ---------------- صفحة الكارت ---------------- */
  function initCard() {
    var app = document.getElementById('waToggle');
    if (!app || typeof api !== 'function') return;
    var CFG = null, watchId = null;
    var panel = document.createElement('div');
    panel.className = 'panel hidden'; panel.id = 'geoPanel';
    panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px">' +
      '<div><h3>📍 ذكّرني لما أكون قريب من المحل</h3><div class="small muted" id="geoDesc"></div></div>' +
      '<label class="switch" style="margin:0"><input type="checkbox" id="geoToggle"><span></span></label></div>' +
      '<div id="geoMsg" class="small" style="margin-top:8px"></div>';
    var waPanel = app.closest('.panel');
    waPanel.parentNode.insertBefore(panel, waPanel.nextSibling);
    var tg = panel.querySelector('#geoToggle'), msg = panel.querySelector('#geoMsg'), desc = panel.querySelector('#geoDesc');
    var DESC_ON = 'شغال: هيوصلك إشعار لما تكون جنب المحل والصفحة دي مفتوحة', DESC_OFF = 'محتاج إذن الموقع والإشعارات';

    function stop() { if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) { } watchId = null; } }
    function off() { stop(); ls(K_ON, null); tg.checked = false; desc.textContent = DESC_OFF; }
    function show() {
      if (!CFG || !CFG.enabled) return;
      navigator.serviceWorker.ready.then(function (reg) {
        return reg.showNotification(CFG.title, { body: CFG.body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'mc-geo', lang: 'ar', dir: 'rtl', data: { url: location.href } });
      }).catch(function () { });
    }
    function start() {
      stop();
      if (!CFG || !CFG.enabled || !supported() || ls(K_ON) !== '1' || Notification.permission !== 'granted') return;
      permState('geolocation').then(function (st) {
        if (st === 'denied') return off();
        if (ls(K_ON) !== '1' || watchId !== null) return;
        var onFix = Fence(CFG, Date.now, show);
        watchId = navigator.geolocation.watchPosition(function (p) {
          onFix(p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.coords.speed);
        }, function (e) { if (e && e.code === 1) off(); }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
      });
    }

    tg.onchange = function () {
      msg.textContent = '';
      if (!tg.checked) { off(); return; }
      if (!supported()) { tg.checked = false; msg.textContent = 'الموبايل ده ما بيدعمش الإشعارات أو الموقع من المتصفح'; return; }
      Notification.requestPermission().then(function (n) {
        if (n !== 'granted') throw new Error('لازم تسمح بالإشعارات علشان التذكير يشتغل');
        return new Promise(function (res, rej) {
          navigator.geolocation.getCurrentPosition(res, function (e) {
            rej(new Error(e && e.code === 1 ? 'لازم تسمح بالموقع علشان التذكير يشتغل' : 'تعذر تحديد موقعك دلوقتي، جرب تاني'));
          }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
        });
      }).then(function () {
        ls(K_ON, '1'); desc.textContent = DESC_ON; msg.textContent = 'تم التفعيل ✓'; start();
      }).catch(function (e) { off(); msg.textContent = e.message; });
    };

    // لو العميل لغى الإذن من الإعدادات وهو برّه الصفحة ← نوقف بهدوء
    document.addEventListener('visibilitychange', function () {
      if (document.hidden || ls(K_ON) !== '1') return;
      if (!supported() || Notification.permission !== 'granted') return off();
      start();
    });

    api('geo', 'get').then(function (c) {
      CFG = c;
      if (!c || !c.enabled || !supported()) { stop(); return; }   // التذكير مقفول من المحل أو الجهاز ما يدعمهوش ← نخفي الخيار
      panel.classList.remove('hidden');
      var on = ls(K_ON) === '1' && Notification.permission === 'granted';
      if (ls(K_ON) === '1' && !on) ls(K_ON, null);
      tg.checked = on; desc.textContent = on ? DESC_ON : DESC_OFF;
      start();
    }).catch(function () { });
  }

  /* ---------------- لوحة الإدارة ---------------- */
  function geoApi(action, payload) {
    return api('geoAdmin', SESSION, action, payload || {}).catch(function (e) {
      if (e.code === 'SESSION_EXPIRED' || e.message === 'SESSION_EXPIRED') { SESSION = ''; store('mc_admin_sess', null); showLogin('انتهت الجلسة، سجّل الدخول مرة أخرى'); throw new Error('انتهت الجلسة'); }
      throw e;
    });
  }
  window.viewGeo = function (v) {
    geoApi('load').then(function (s) {
      v.innerHTML = '<div class="card"><h2>📍 تذكير القرب من المحل</h2>' +
        '<p class="small muted" style="margin-top:0">العميل اللي يفعّل «ذكّرني لما أكون قريب من المحل» من الكارت بتاعه (ويسمح بالموقع والإشعارات) يوصله الإشعار ده لما يكون جنب المحل. ' +
        'الإشعار بيوصل بس لو صفحة الكارت مفتوحة على موبايله، مرة واحدة في الزيارة، ومش للي معدي بالعربية.</p>' +
        '<label style="display:flex;gap:8px;align-items:center;font-weight:700"><input type="checkbox" id="gEn" style="width:auto;margin:0"' + (s.enabled ? ' checked' : '') + '> تشغيل التذكير</label>' +
        '<h3 style="margin:16px 0 6px">مكان المحل</h3>' +
        '<button class="btn ghost" type="button" id="gHere" style="width:100%">📍 استخدم موقعي الحالي (وانت في المحل)</button>' +
        '<div class="row" style="margin-top:8px"><div><label>خط العرض (Latitude)</label><input id="gLat" inputmode="decimal" dir="ltr" value="' + (s.lat == null ? '' : esc(s.lat)) + '"></div>' +
        '<div><label>خط الطول (Longitude)</label><input id="gLng" inputmode="decimal" dir="ltr" value="' + (s.lng == null ? '' : esc(s.lng)) + '"></div></div>' +
        '<div id="gMap" class="small" style="margin-top:6px"></div>' +
        '<label style="margin-top:12px">المسافة من المحل (متر)</label><input id="gRad" type="number" min="50" max="2000" step="10" inputmode="numeric" value="' + esc(s.radius_m) + '">' +
        '<div class="small muted">ننصح بـ 150 متر</div>' +
        '<h3 style="margin:16px 0 6px">نص الإشعار</h3>' +
        '<label>العنوان</label><input id="gTitle" maxlength="60" value="' + esc(s.title) + '">' +
        '<label style="margin-top:8px">الرسالة</label><textarea id="gBody" rows="3" maxlength="200">' + esc(s.body) + '</textarea>' +
        '<div class="toolbar" style="margin-top:12px"><button class="btn" type="button" id="gSave">حفظ</button></div>' +
        (s.updated_by ? '<div class="small muted" style="margin-top:8px">آخر تعديل: ' + esc(s.updated_by) + '</div>' : '') + '</div>';
      var map = function () {
        var a = $('#gLat').value.trim(), o = $('#gLng').value.trim();
        $('#gMap').innerHTML = a && o ? '<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + encodeURIComponent(a + ',' + o) + '">🗺️ شوف المكان على الخريطة</a>' : '';
      };
      map(); $('#gLat').oninput = map; $('#gLng').oninput = map;
      $('#gHere').onclick = function () {
        var b = this;
        if (!navigator.geolocation) return toast('الموبايل ده ما بيدعمش تحديد الموقع', true);
        busy(b, true);
        navigator.geolocation.getCurrentPosition(function (p) {
          $('#gLat').value = p.coords.latitude.toFixed(6); $('#gLng').value = p.coords.longitude.toFixed(6); map();
          toast('تم تحديد الموقع (دقة ' + Math.round(p.coords.accuracy) + ' متر). اضغط حفظ');
          busy(b, false);
        }, function (e) {
          toast(e && e.code === 1 ? 'لازم تسمح بالموقع للمتصفح' : 'تعذر تحديد الموقع، جرب تاني', true); busy(b, false);
        }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      };
      $('#gSave').onclick = function () {
        var b = this; busy(b, true);
        geoApi('save', { enabled: $('#gEn').checked, lat: $('#gLat').value.trim(), lng: $('#gLng').value.trim(), radius_m: $('#gRad').value, title: $('#gTitle').value, body: $('#gBody').value })
          .then(function () { toast('تم الحفظ ✓'); }).catch(function (e) { toast(e.message, true); }).then(function () { busy(b, false); });
      };
    }).catch(function (e) { v.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; });
  };

  if (typeof BOOT !== 'undefined' && BOOT && BOOT.card) initCard();
})();
