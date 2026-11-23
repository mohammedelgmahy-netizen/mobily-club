// MOBILY CLUB — Supabase Edge Function "mobily"
// نقطة الدخول الوحيدة للموقع. قاعدة البيانات مغلقة أمام المتصفح، وكل عملية تمر من هنا
// وتخضع لنفس قواعد الأمان والصلاحيات الموجودة في كود النظام.
// كل محل (Tenant) بياناته في schema لوحده: الطلب بيحدد المحل من body.shop، والفصل من قاعدة البيانات نفسها.
import postgres from 'npm:postgres@3.4.5';
import * as crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { handle } from 'https://cdn.jsdelivr.net/gh/mohammedelgmahy-netizen/mobily-club@9ff3a3eb4b27dc4286b9b79c61e812d665207365/server/bundle.js';
import { handleShop, periodic, afterCore } from 'https://cdn.jsdelivr.net/gh/mohammedelgmahy-netizen/mobily-club@33329f972f7aa8a6954a4ec5387ae378b93023bc/server/shop.js';
import { handleRequests } from 'https://cdn.jsdelivr.net/gh/mohammedelgmahy-netizen/mobily-club@3622f5e990a5fe07c9c0752442b857a1e6e9de8f/server/requests.js';
import { handleGeo } from 'https://cdn.jsdelivr.net/gh/mohammedelgmahy-netizen/mobily-club@00cf9b129103d01d6d69583be7a0caa4123952d7/server/geo.js';
import { handleRewards } from 'https://cdn.jsdelivr.net/gh/mohammedelgmahy-netizen/mobily-club@9ff3a3eb4b27dc4286b9b79c61e812d665207365/server/rewards.js';
import { handleSaas, findTenant, subState, activeTenants } from 'https://cdn.jsdelivr.net/gh/mohammedelgmahy-netizen/mobily-club@9ff3a3eb4b27dc4286b9b79c61e812d665207365/server/saas.js';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 2, idle_timeout: 60 });
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') || 'https://mohammedelgmahy-netizen.github.io/mobily-club/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
};

const SCHEMA_OK = /^[a-z][a-z0-9_]{2,40}$/;

// كود النظام مكتوب باسم schema المحل الأصلي، فبنحوّله لـ schema المحل صاحب الطلب قبل التنفيذ.
// بنحوّل أسماء الجداول بس (mobily.mc_… و mobily."…")، ومش بنلمس أسماء إعدادات الجلسة زي 'mobily.actor_id'.
function rewrite(text: string, schema: string) {
  if (schema === 'mobily') return text;
  return String(text)
    .replace(/\bmobily\.(?=mc_|")/g, schema + '.')
    .replace(/table_schema = 'mobily'/g, `table_schema = '${schema}'`);
}

// نسخة من عميل قاعدة البيانات بتشتغل على schema المحل (نفس الواجهة بالظبط)
function scopedSql(base: any, schema: string): any {
  if (schema === 'mobily') return base;
  const wrap = (c: any) => {
    const f: any = (strings: any, ...args: any[]) => {
      if (Array.isArray(strings) && Array.isArray((strings as any).raw)) {
        const s: any = strings.map((x: string) => rewrite(x, schema));
        s.raw = (strings as any).raw.map((x: string) => rewrite(x, schema));
        return c(s, ...args);
      }
      return c(strings, ...args);
    };
    f.unsafe = (text: string, params?: unknown[]) => c.unsafe(rewrite(text, schema), params);
    f.begin = (cb: (tx: any) => unknown) => c.begin((tx: any) => cb(wrap(tx)));
    f.schema = schema;
    return f;
  };
  return wrap(base);
}

const dbFor = (schema: string) => ({
  transaction: (cb: (q: (text: string, params?: unknown[]) => Promise<any[]>) => Promise<unknown>) =>
    sql.begin(async (tx: any) => {
      await tx.unsafe(`set local search_path to ${schema}`);
      return cb((text, params) => tx.unsafe(text, (params || []) as any[]));
    }),
});

async function storeImage(dataUrl: string, bucket: string, prefix: string, failMsg: string): Promise<string> {
  const m = String(dataUrl || '').match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/);
  if (!m) throw new Error('الملف يجب أن يكون صورة');
  const bytes = Buffer.from(m[3], 'base64');
  if (bytes.length > 3 * 1024 * 1024) throw new Error('حجم الصورة أكبر من 3 ميجابايت');
  const name = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${m[2]}`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': m[1], 'Cache-Control': 'max-age=31536000' },
    body: bytes,
  });
  if (!r.ok) throw new Error(failMsg);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${name}`;
}
const uploadImage = (dataUrl: string) => storeImage(dataUrl, 'mc-offers', 'offer', 'تعذر رفع الصورة. ضع رابط صورة يدوياً.');

const coreFor = (schema: string) => (b: unknown) => handle(b, dbFor(schema), { crypto, Buffer, uploadImage });

// التحقق من جلسة الإدارة بنفس منطق النظام (نفس الصلاحيات وانتهاء الجلسة) — داخل محل واحد
function verifyAdminIn(schema: string) {
  return async (token: string) => {
    const out: any = await coreFor(schema)({ fn: 'adminApi', args: [token, 'me', {}, ''] });
    const res = out && out.result;
    if (!res || !res.ok) return { ok: false, res: res || { ok: false, error: 'حدث خطأ في الخادم، حاول مرة أخرى' } };
    const u = res.data.user;
    return { ok: true, permissions: u.permissions, name: u.display_name || u.username || '', user_id: u.user_id || '', role: u.role || '' };
  };
}

// صاحب البرنامج = صاحب محل mobily
async function verifyOwner(token: string) {
  const me: any = await verifyAdminIn('mobily')(token);
  if (!me.ok) return me;
  if (me.role !== 'owner') return { ok: false, res: { ok: false, error: 'الصفحة دي لصاحب البرنامج بس' } };
  return me;
}

const ADMIN_FNS = ['adminApi', 'shopAdmin', 'geoAdmin', 'requests', 'rewardsAdmin'];
// لما يبقى اشتراك المحل منتهي: الإدارة بتقف، وكمان أي عملية بتضيف بيانات أو نقاط.
// القراءة للعميل (الكارت، الرصيد، الطلبات القديمة) بتفضل شغالة، وولا بيان بيتمسح.
const PUBLIC_WRITE = ['register'];
const SHOP_WRITE = ['checkout', 'order', 'saveAddress', 'cancelOrder'];
function blockedWhenInactive(fn: string, action: string) {
  if (ADMIN_FNS.indexOf(fn) >= 0) return 'اشتراك المحل منتهي. كلّم صاحب البرنامج عشان تفعّله، وبياناتك كلها محفوظة زي ما هي.';
  if (fn === 'publicApi' && PUBLIC_WRITE.indexOf(action) >= 0) return 'التسجيل في المحل ده متوقف مؤقتاً. كلّم المحل.';
  if (fn === 'shop' && SHOP_WRITE.indexOf(action) >= 0) return 'المحل ده متوقف مؤقتاً، مش بيستقبل طلبات دلوقتي.';
  return '';
}

// روابط الكروت لازم تحمل كود المحل (?t=...&s=code)، وإلا هتفتح على محل تاني
const TOKEN_LINK = /\?t=([a-f0-9]{64})/g;
function withShop(value: unknown, code: string): unknown {
  if (typeof value === 'string') {
    if (value.indexOf('?t=') < 0) return value;
    return value.replace(TOKEN_LINK, (m: string, t: string) => `?t=${t}&s=${code}`).replace(new RegExp(`&s=${code}&s=${code}`, 'g'), `&s=${code}`);
  }
  if (Array.isArray(value)) return value.map((v) => withShop(v, code));
  if (value && typeof value === 'object') {
    const o: any = {};
    for (const k of Object.keys(value as any)) o[k] = withShop((value as any)[k], code);
    return o;
  }
  return value;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('MOBILY CLUB API', { headers: CORS });
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad request' }, 400); }

  // نبضة كل دقيقة: السيرفر يفضل صاحي، ومعاها المهام الدورية لكل محل شغال
  if (body?.fn === 'ping') {
    try {
      await sql`select 1`;
      for (const t of await activeTenants(sql, 50)) {
        try { await periodic(scopedSql(sql, t.schema_name)); } catch (e) { console.error(t.code, e); }
      }
    } catch (e) { console.error(e); }
    return json({ ok: true });
  }

  try {
    const fn = body?.fn;
    // طبقة المحلات نفسها (فتح محل جديد / صفحة المحلات) مش بتتبع محل معين
    if (fn === 'saas' || fn === 'saasAdmin') {
      return json(await handleSaas(body, { sql, coreFor, verifyOwner, siteUrl: SITE_URL, upload: (d: string) => storeImage(d, 'mc-offers', 'logo', 'تعذر رفع اللوجو') }));
    }

    const tenant = await findTenant(sql, body?.shop);
    if (!tenant || !SCHEMA_OK.test(tenant.schema_name)) return json({ result: { ok: false, error: 'المحل ده مش موجود' } });
    const state = subState(tenant);
    if (!state.active) {
      const stop = blockedWhenInactive(fn, String((body?.args || [])[0] || ''));
      if (stop) return json({ result: { ok: false, error: stop, subscription: state } });
    }
    const schema = tenant.schema_name;
    const tsql = scopedSql(sql, schema);
    const core = coreFor(schema);
    // الرد بيخرج ومعاه كود المحل في روابط الكروت
    const reply = (o: unknown) => json(tenant.code === 'mobily' ? o : withShop(o, tenant.code));

    if (fn === 'shop' || fn === 'shopAdmin') {
      return reply(await handleShop(body, {
        sql: tsql, verifyAdmin: verifyAdminIn(schema), core,
        upload: (d: string) => storeImage(d, 'mc-products', 'product', 'تعذر رفع الصورة، حاول مرة أخرى'),
      }));
    }
    if (fn === 'rewards' || fn === 'rewardsAdmin') return reply(await handleRewards(body, { sql: tsql, verifyAdmin: verifyAdminIn(schema), core }));
    if (fn === 'requests') return reply(await handleRequests(body, { sql: tsql, verifyAdmin: verifyAdminIn(schema) }));
    if (fn === 'geo' || fn === 'geoAdmin') return reply(await handleGeo(body, { sql: tsql, verifyAdmin: verifyAdminIn(schema) }));
    const out = await core(body);
    await afterCore(body, out, tsql); // عميل جديد ← نقاط الترحيب فوراً
    // اللون الأساسي للمحل (إعداد زيادة مش موجود في بيانات الصفحة الأساسية)
    if (fn === 'page' && (out as any)?.result?.boot?.settings) {
      try {
        const [c] = await tsql.unsafe(`select value from mobily.mc_settings where key = 'brand_color'`);
        if (c && c.value) (out as any).result.boot.settings.brand_color = c.value;
      } catch (e) { /* إعداد مش موجود */ }
    }
    return reply(out);
  } catch (e) {
    console.error(e);
    return json({ error: 'حدث خطأ في الخادم، حاول مرة أخرى' }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
}
