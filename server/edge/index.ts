// MOBILY CLUB — Supabase Edge Function "mobily"
// نقطة الدخول الوحيدة للموقع. قاعدة البيانات مغلقة أمام المتصفح، وكل عملية تمر من هنا
// وتخضع لنفس قواعد الأمان والصلاحيات الموجودة في كود النظام.
import postgres from 'npm:postgres@3.4.5';
import * as crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { handle } from 'https://cdn.jsdelivr.net/gh/mohammedelgmahy-netizen/mobily-club@82475db839b0544a68962856ec7a6e25704b0e2f/server/bundle.js';
import { handleShop, periodic, afterCore } from 'https://cdn.jsdelivr.net/gh/mohammedelgmahy-netizen/mobily-club@82475db839b0544a68962856ec7a6e25704b0e2f/server/shop.js';
import { handleRequests } from 'https://cdn.jsdelivr.net/gh/mohammedelgmahy-netizen/mobily-club@3622f5e990a5fe07c9c0752442b857a1e6e9de8f/server/requests.js';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 2, idle_timeout: 60 });
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
};

const db = {
  transaction: (cb: (q: (text: string, params?: unknown[]) => Promise<any[]>) => Promise<unknown>) =>
    sql.begin(async (tx: any) => {
      await tx.unsafe('set local search_path to mobily');
      return cb((text, params) => tx.unsafe(text, (params || []) as any[]));
    }),
};

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

const core = (b: unknown) => handle(b, db, { crypto, Buffer, uploadImage });

// التحقق من جلسة الإدارة بنفس منطق النظام (نفس الصلاحيات وانتهاء الجلسة)
async function verifyAdmin(token: string) {
  const out: any = await handle({ fn: 'adminApi', args: [token, 'me', {}, ''] }, db, { crypto, Buffer, uploadImage });
  const res = out && out.result;
  if (!res || !res.ok) return { ok: false, res: res || { ok: false, error: 'حدث خطأ في الخادم، حاول مرة أخرى' } };
  const u = res.data.user;
  return { ok: true, permissions: u.permissions, name: u.display_name || u.username || '', user_id: u.user_id || '', role: u.role || '' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('MOBILY CLUB API', { headers: CORS });
  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: 'bad request' }, 400); }
  // نبضة كل دقيقة من قاعدة البيانات عشان السيرفر يفضل صاحي واتصاله بقاعدة البيانات مفتوح
  // ومعاها المهام الدورية (تنبيه أعياد الميلاد، عروض عيد الميلاد، نقاط الترحيب) مرة كل 10 دقايق بالكتير
  if ((body as any)?.fn === 'ping') { try { await sql`select 1`; await periodic(sql); } catch (e) { console.error(e); } return json({ ok: true }); }
  try {
    const fn = (body as any)?.fn;
    if (fn === 'shop' || fn === 'shopAdmin') {
      return json(await handleShop(body, {
        sql, verifyAdmin, core,
        upload: (d: string) => storeImage(d, 'mc-products', 'product', 'تعذر رفع الصورة، حاول مرة أخرى'),
      }));
    }
    if (fn === 'requests') return json(await handleRequests(body, { sql, verifyAdmin }));
    const out = await core(body);
    await afterCore(body, out, sql); // عميل جديد ← نقاط الترحيب فوراً
    return json(out);
  } catch (e) {
    console.error(e);
    return json({ error: 'حدث خطأ في الخادم، حاول مرة أخرى' }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
}
