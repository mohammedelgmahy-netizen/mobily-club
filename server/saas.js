/**
 * موبايلي - Mobily — طبقة المحلات (SaaS): محل جديد بلينك واحد، والاشتراك.
 *   fn 'saas'      → عام: checkCode (الكود فاضي ولا لأ)، signup (فتح محل جديد)، info (بيانات المحل للصفحة)
 *   fn 'saasAdmin' → لصاحب البرنامج بس (owner بتاع محل mobily): قائمة المحلات، الدفع، الإيقاف، الإعدادات
 * كل محل بياناته في schema لوحده، والفصل ده من قاعدة البيانات نفسها مش من الكود.
 * الرد بنفس شكل باقي النظام: { result: { ok, data } } أو { result: { ok: false, error } }
 */

const T = (s) => String(s === undefined || s === null ? '' : s).trim();
const ok = (data) => ({ result: { ok: true, data } });
const bad = (error) => ({ result: { ok: false, error } });

const CODE_RE = /^[a-z][a-z0-9-]{2,19}$/;
const RESERVED = ['mobily', 'admin', 'api', 'www', 'app', 'shop', 'club', 'test', 'saas', 'tpl', 'public'];

const PLAN_LABEL = { trial: 'فترة تجربة', paid: 'مشترك', free_forever: 'مجاني دائماً', unpaid: 'لسه ما دفعش' };

/** الكود اللي بيتحط في اللينك: حروف إنجليزي صغيرة وأرقام وشرطة */
function cleanCode(v) {
  const c = T(v).toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!CODE_RE.test(c)) throw new Error('كود المحل: من 3 إلى 20 حرف إنجليزي صغير أو رقم أو شرطة، ويبدأ بحرف');
  if (RESERVED.indexOf(c) >= 0) throw new Error('الكود ده محجوز، اختار كود تاني');
  return c;
}

function cleanEmail(v) {
  const e = T(v).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e)) throw new Error('الإيميل مش مظبوط');
  if (e.length > 120) throw new Error('الإيميل طويل');
  return e;
}

/** حالة الاشتراك النهائية للمحل (المصدر الوحيد للحقيقة) */
export function subState(t, today) {
  const d = today || new Date().toISOString().slice(0, 10);
  if (t.status === 'suspended') return { active: false, plan: 'suspended', label: 'موقوف', until: '' };
  if (t.plan === 'free_forever') return { active: true, plan: 'free_forever', label: PLAN_LABEL.free_forever, until: '' };
  const until = t.paid_until ? String(t.paid_until).slice(0, 10) : '';
  if (until && until >= d) return { active: true, plan: 'paid', label: PLAN_LABEL.paid, until };
  const trial = t.trial_ends ? String(t.trial_ends).slice(0, 10) : '';
  if (!until && trial && trial >= d) return { active: true, plan: 'trial', label: PLAN_LABEL.trial, until: trial };
  return { active: false, plan: 'unpaid', label: PLAN_LABEL.unpaid, until: until || trial };
}

/** بيانات المحل من الكود (مع كاش قصير عشان ما نسألش قاعدة البيانات كل طلب) */
export async function findTenant(sql, code) {
  const c = T(code).toLowerCase() || 'mobily';
  const [row] = await sql.unsafe(
    'select tenant_id, code, name, owner_email, schema_name, status, plan, trial_ends::text as trial_ends, paid_until::text as paid_until from mobily_saas.tenants where code = $1',
    [c]
  );
  return row || null;
}

async function props(sql) {
  const rows = await sql.unsafe('select key, value from mobily_saas.props');
  const o = {};
  for (const r of rows) o[r.key] = r.value;
  return o;
}

/** كلمة المرور المؤقتة اللي النظام بيطبعها في سجل التشغيل عند تجهيز المحل لأول مرة */
async function firstPassword(sql, schema) {
  const rows = await sql.unsafe(`select message from ${schema}.mc_log order by id desc limit 20`);
  for (const r of rows) {
    const m = String(r.message || '').match(/كلمة المرور المؤقتة:\s*(\S+)/);
    if (m) return m[1];
  }
  return '';
}

/**
 * ctx: { sql, coreFor: (schema) => async (body) => out, verifyOwner: async (token) => {ok,...}, siteUrl }
 */
export async function handleSaas(body, ctx) {
  const fn = body && body.fn;
  const args = Array.isArray(body && body.args) ? body.args : [];
  const { sql } = ctx;
  try {
    if (fn === 'saas') {
      const action = args[0];
      const p = args[1] && typeof args[1] === 'object' ? args[1] : {};
      if (action === 'checkCode') {
        let c;
        try { c = cleanCode(p.code); } catch (e) { return ok({ free: false, reason: e.message }); }
        const t = await findTenant(sql, c);
        return ok({ free: !t, code: c, reason: t ? 'الكود ده متسجل قبل كده' : '' });
      }
      if (action === 'signup') return ok(await signup(ctx, p));
      if (action === 'info') {
        const t = await findTenant(sql, p.shop);
        if (!t) return bad('المحل مش موجود');
        const st = subState(t);
        return ok({ code: t.code, name: t.name, active: st.active });
      }
      return bad('طلب غير معروف');
    }
    // ---------- صفحة «المحلات» لصاحب البرنامج ----------
    const [token, action] = [args[0], args[1]];
    const p = args[2] && typeof args[2] === 'object' ? args[2] : {};
    const me = await ctx.verifyOwner(token);
    if (!me.ok) return { result: me.res || { ok: false, error: 'الصفحة دي لصاحب البرنامج بس' } };
    if (action === 'list') {
      const rows = await sql.unsafe(`select t.tenant_id, t.code, t.name, t.owner_email, t.owner_phone, t.schema_name, t.status, t.plan,
          t.trial_ends::text as trial_ends, t.paid_until::text as paid_until, t.created_at::text as created_at
        from mobily_saas.tenants t order by t.tenant_id`);
      const out = [];
      for (const r of rows) {
        const st = subState(r);
        let customers = 0;
        try { const [c] = await sql.unsafe(`select count(*)::int as n from ${r.schema_name}.mc_customers`); customers = c ? c.n : 0; } catch (e) { customers = 0; }
        out.push({
          id: r.tenant_id, code: r.code, name: r.name, email: r.owner_email, phone: r.owner_phone,
          status: r.status, plan: st.plan, label: st.label, active: st.active, until: st.until,
          created_at: r.created_at, customers,
        });
      }
      return ok({ shops: out, settings: await props(sql) });
    }
    if (action === 'markPaid') {
      const months = Math.max(1, Math.min(24, Number(p.months || 1)));
      const [row] = await sql.unsafe(
        `update mobily_saas.tenants set plan = 'paid',
           paid_until = greatest(coalesce(paid_until, (now() at time zone 'Africa/Cairo')::date), (now() at time zone 'Africa/Cairo')::date) + ($2 || ' months')::interval,
           status = case when status = 'suspended' then 'active' else status end
         where code = $1 and code <> 'mobily' returning code, paid_until::text as paid_until`,
        [T(p.code), String(months)]
      );
      if (!row) return bad('المحل مش موجود');
      return ok({ code: row.code, paid_until: row.paid_until });
    }
    if (action === 'suspend' || action === 'activate') {
      const [row] = await sql.unsafe(
        'update mobily_saas.tenants set status = $2 where code = $1 and code <> \'mobily\' returning code, status',
        [T(p.code), action === 'suspend' ? 'suspended' : 'active']
      );
      if (!row) return bad('المحل مش موجود');
      return ok({ code: row.code, status: row.status });
    }
    if (action === 'settings') {
      const allow = ['trial_days', 'price_monthly', 'currency', 'pay_instructions'];
      for (const k of allow) {
        if (p[k] === undefined) continue;
        await sql.unsafe('insert into mobily_saas.props (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value', [k, T(p[k]).slice(0, 2000)]);
      }
      return ok(await props(sql));
    }
    return bad('طلب غير معروف');
  } catch (e) {
    return bad(e && e.message ? e.message : 'حصل خطأ، حاول تاني');
  }
}

/** فتح محل جديد: schema جديد + تجهيز النظام جواه + حساب صاحب المحل */
async function signup(ctx, p) {
  const { sql } = ctx;
  const code = cleanCode(p.code);
  const name = T(p.name).slice(0, 80);
  const email = cleanEmail(p.email);
  if (!name) throw new Error('اسم المحل مطلوب');
  const phone = T(p.phone).replace(/[^0-9+]/g, '').slice(0, 20);

  const [t] = await sql.unsafe('select * from mobily_saas.create_tenant($1, $2, $3, $4)', [code, name, email, phone]);
  if (!t) throw new Error('تعذر فتح المحل، حاول تاني');

  // أول طلب على المحل الجديد بيشغّل تجهيز النظام نفسه (الإعدادات والمستويات وحساب صاحب المحل)
  const core = ctx.coreFor(t.schema_name);
  await core({ fn: 'adminApi', args: ['', 'me', {}, ''] });
  const pass = await firstPassword(sql, t.schema_name);

  // اسم المحل في إعدادات المحل الجديد
  try {
    await sql.unsafe(
      `update ${t.schema_name}.mc_settings set value = $1, updated_at = now(), updated_by = 'signup' where key = 'shop_name'`,
      [name]
    );
  } catch (e) { /* الإعداد مش موجود في نسخة قديمة */ }

  const site = T(ctx.siteUrl) || '';
  return {
    code: t.code,
    name: t.name,
    username: 'owner',
    password: pass,
    customerLink: site ? `${site}?s=${t.code}` : `?s=${t.code}`,
    adminLink: site ? `${site}?s=${t.code}#admin` : `?s=${t.code}#admin`,
    trial_ends: t.trial_ends ? String(t.trial_ends).slice(0, 10) : '',
  };
}

/** المهام الدورية لكل المحلات الشغالة (نفس مهام المحل الواحد، بس على كل schema) */
export async function activeTenants(sql, limit) {
  const rows = await sql.unsafe(
    `select code, schema_name, status, plan, trial_ends::text as trial_ends, paid_until::text as paid_until
     from mobily_saas.tenants where status = 'active' order by tenant_id limit $1`,
    [Math.max(1, Math.min(200, Number(limit || 50)))]
  );
  return rows.filter((r) => subState(r).active);
}
