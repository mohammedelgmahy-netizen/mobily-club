// MOBILY CLUB — «طلبات تعديل» (لوحة الإدارة): كتابة طلب تعديل + عرض الطلبات وحالتها
// ctx: { sql, verifyAdmin: async (token) => { ok, res, permissions, name } }
const ok = (data) => ({ result: { ok: true, data } });
const bad = (error) => ({ result: { ok: false, error } });

export async function handleRequests(body, ctx) {
  const args = Array.isArray(body && body.args) ? body.args : [];
  const [token, action] = [args[0], args[1]];
  const p = args[2] && typeof args[2] === 'object' ? args[2] : {};
  const { sql } = ctx;
  try {
    const user = await ctx.verifyAdmin(token);
    if (!user.ok) return { result: user.res };
    if ((user.permissions || []).indexOf('settings') < 0) return bad('ليس لديك صلاحية');
    if (action === 'list') {
      return ok(await sql`select id, text, author, created_at, status from mobily.mc_change_requests order by id desc limit 500`);
    }
    if (action === 'add') {
      const text = String(p.text || '').trim();
      if (!text) return bad('اكتب الطلب الأول');
      if (text.length > 5000) return bad('الطلب طويل جداً');
      const [row] = await sql`insert into mobily.mc_change_requests (text, author) values (${text}, ${String(user.name || '').slice(0, 100)}) returning id, text, author, created_at, status`;
      return ok(row);
    }
    return bad('طلب غير معروف');
  } catch (e) {
    console.error(e);
    return bad('حدث خطأ في الخادم، حاول مرة أخرى');
  }
}
