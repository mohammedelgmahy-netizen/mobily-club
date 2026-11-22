// MOBILY CLUB — «تذكير القرب من المحل»
//   fn 'geo'      → للعميل (من غير تسجيل): get → الإعدادات لو التذكير شغال بس
//   fn 'geoAdmin' → للإدارة (صلاحية الإعدادات): load / save
// ctx: { sql, verifyAdmin }
const ok = (data) => ({ result: { ok: true, data } });
const bad = (error) => ({ result: { ok: false, error } });
const COLS = 'enabled, lat, lng, radius_m, title, body, updated_at, updated_by';

async function row(sql) {
  const [r] = await sql.unsafe(`select ${COLS} from mobily.mc_geo_settings where id = 1`);
  return r || { enabled: false, lat: null, lng: null, radius_m: 150, title: '', body: '' };
}

export async function handleGeo(body, ctx) {
  const { sql } = ctx;
  const fn = body && body.fn;
  const args = Array.isArray(body && body.args) ? body.args : [];
  try {
    if (fn === 'geo') {
      const r = await row(sql);
      if (!r.enabled || r.lat == null || r.lng == null) return ok({ enabled: false });
      return ok({ enabled: true, lat: r.lat, lng: r.lng, radius_m: r.radius_m, title: r.title, body: r.body });
    }
    const [token, action] = [args[0], args[1]];
    const p = args[2] && typeof args[2] === 'object' ? args[2] : {};
    const user = await ctx.verifyAdmin(token);
    if (!user.ok) return { result: user.res };
    if ((user.permissions || []).indexOf('settings') < 0) return bad('ليس لديك صلاحية');
    if (action === 'load') return ok(await row(sql));
    if (action === 'save') {
      const enabled = p.enabled === true;
      const lat = p.lat === '' || p.lat == null ? null : Number(p.lat);
      const lng = p.lng === '' || p.lng == null ? null : Number(p.lng);
      const radius = Math.round(Number(p.radius_m));
      const title = String(p.title || '').trim(), text = String(p.body || '').trim();
      if (lat != null && !(isFinite(lat) && lat >= -90 && lat <= 90)) return bad('خط العرض غير صحيح');
      if (lng != null && !(isFinite(lng) && lng >= -180 && lng <= 180)) return bad('خط الطول غير صحيح');
      if (enabled && (lat == null || lng == null)) return bad('حدد مكان المحل الأول');
      if (!(radius >= 50 && radius <= 2000)) return bad('المسافة لازم تكون من 50 لـ 2000 متر');
      if (!title || title.length > 60) return bad('عنوان الإشعار مطلوب (60 حرف بالكتير)');
      if (!text || text.length > 200) return bad('نص الإشعار مطلوب (200 حرف بالكتير)');
      await sql`update mobily.mc_geo_settings set enabled = ${enabled}, lat = ${lat}, lng = ${lng}, radius_m = ${radius},
        title = ${title}, body = ${text}, updated_at = now(), updated_by = ${String(user.name || '').slice(0, 100)} where id = 1`;
      return ok(await row(sql));
    }
    return bad('طلب غير معروف');
  } catch (e) {
    console.error(e);
    return bad('حدث خطأ في الخادم، حاول مرة أخرى');
  }
}
