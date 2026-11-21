/**
 * موبايلي - Mobily — «تصفح منتجاتنا»: المنتجات، السلة، الطلبات، المخزون، الإشعارات، الفاتورة والنقاط.
 *   fn 'shop'      → للعميل: catalog، quote، saveAddress، checkout، myOrders، cancelOrder، summary، notifications، readNotifications
 *   fn 'shopAdmin' → للإدارة (صلاحية «الإعدادات»): المنتجات والأقسام، الطلبات ومسار الحالة، المخزون، أكواد الخصم،
 *                    الإشعارات والملخص، سجل المكافآت
 * الرد بنفس شكل باقي النظام: { result: { ok, data } } أو { result: { ok: false, error } }
 * الجداول: server/shop*.sql (آخر تحديث shop-v6.sql)
 */

const T = (s) => String(s === undefined || s === null ? '' : s).trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMG_URL = /^https:\/\/[^\s"'<>]+$/;
const ok = (data) => ({ result: { ok: true, data } });
const bad = (error) => ({ result: { ok: false, error } });
const CORE_LOCK = 7781001; // نفس قفل نظام النقاط (أي تعديل على المحفظة بيستنى دوره)
const money2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const J = (v, d) => { if (v === null || v === undefined) return d; if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return d; } } return v; };
const rid = (p) => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 7).toUpperCase();

function num(v, name) {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/,/g, ''));
  if (!isFinite(n) || n < 0 || n > 100000000) throw new Error(name + ' غير صحيح');
  return Math.round(n * 100) / 100;
}
function int(v, name, max) {
  const n = num(v, name);
  if (n !== Math.floor(n)) throw new Error(name + ' لازم يكون رقم صحيح');
  if (max && n > max) throw new Error(name + ' كبير جداً');
  return n;
}

function cleanImages(list, max) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const im of list.slice(0, max || 12)) {
    const u = T(im && im.u), t = T(im && im.t) || u;
    if (!IMG_URL.test(u) || !IMG_URL.test(t)) throw new Error('رابط صورة غير صحيح');
    out.push({ u, t });
  }
  return out;
}

function cleanProduct(p) {
  const name = T(p.name);
  if (!name) throw new Error('اكتب اسم المنتج');
  if (name.length > 150) throw new Error('اسم المنتج طويل جداً');
  const price = num(p.price, 'السعر');
  const old = num(p.old_price, 'السعر قبل الخصم');
  if (old && old <= price) throw new Error('السعر قبل الخصم لازم يكون أكبر من سعر البيع');
  const specs = (Array.isArray(p.specs) ? p.specs : []).slice(0, 60)
    .map((s) => [T(s && s[0]).slice(0, 80), T(s && s[1]).slice(0, 300)]).filter((s) => s[0] || s[1]);
  // الألوان: اسم + كود اللون + صور خاصة باللون ده (اختياري)
  const seen = new Set();
  const colors = (Array.isArray(p.colors) ? p.colors : []).slice(0, 30).map((c) => ({
    n: T(c && c.n).slice(0, 40), c: /^#[0-9a-f]{6}$/i.test(T(c && c.c)) ? T(c.c) : '', im: cleanImages(c && c.im, 8),
  })).filter((c) => c.n);
  for (const c of colors) { if (seen.has(c.n)) throw new Error('اللون «' + c.n + '» متكرر'); seen.add(c.n); }
  const variants = (Array.isArray(p.variants) ? p.variants : []).slice(0, 30).map((v) => T(v).slice(0, 60)).filter(Boolean);
  const code = T(p.code).slice(0, 40);
  return {
    name, code,
    category_id: UUID.test(T(p.category_id)) ? T(p.category_id) : null,
    description: T(p.description).slice(0, 8000),
    price, old_price: old,
    available: p.available !== false,
    hidden: !!p.hidden,
    low_stock: p.low_stock === '' || p.low_stock === undefined || p.low_stock === null ? 3 : int(p.low_stock, 'حد التنبيه', 100000),
    images: cleanImages(p.images),
    specs, colors, variants,
  };
}

const PRODUCT_COLS = 'id, code, category_id, name, description, price, old_price, available, hidden, low_stock, images, specs, colors, variants, created_at, updated_at';
const CATEGORY_COLS = 'id, name, icon, image, sort, hidden';
// المخزون لكل منتج: { لون: {physical, reserved} } (المنتج اللي من غير ألوان مفتاحه '')
const STOCK_JSON = `(select coalesce(json_object_agg(s.color, json_build_object('physical', s.physical, 'reserved', s.reserved)), '{}') from mobily.mc_shop_stock s where s.product_id = p.id) as stock`;

/* ---------------- المخزون ----------------
 * المتاح للبيع = الرصيد الفعلي − المحجوز.
 * السلة مش بتحجز حاجة. تأكيد الطلب بيحجز الكمية فوراً (تحديث ذرّي بشرط إن المتاح يكفي)،
 * الإلغاء/الرفض بيفك الحجز، و«تم إتمام الطلب» بيخصم نهائي. كل خطوة مرة واحدة بس (stock_state على الطلب). */
const colorKeys = (prod) => { const cs = J(prod.colors, []).map((c) => c && c.n).filter(Boolean); return cs.length ? cs : ['']; };
function stockView(prod) {
  const st = J(prod.stock, {}) || {};
  const low = Number(prod.low_stock === undefined || prod.low_stock === null ? 3 : prod.low_stock);
  const rows = colorKeys(prod).map((k) => {
    const r = st[k] || { physical: 0, reserved: 0 };
    const physical = Number(r.physical || 0), reserved = Number(r.reserved || 0), avail = Math.max(0, physical - reserved);
    return { color: k, physical, reserved, available: avail, state: avail <= 0 ? 'out' : avail <= low ? 'low' : 'ok' };
  });
  const tot = rows.reduce((s, r) => ({ physical: s.physical + r.physical, reserved: s.reserved + r.reserved, available: s.available + r.available }), { physical: 0, reserved: 0, available: 0 });
  return { rows, physical: tot.physical, reserved: tot.reserved, available: tot.available, low_stock: low, state: tot.available <= 0 ? 'out' : rows.some((r) => r.state === 'low') || tot.available <= low ? 'low' : 'ok' };
}
const STOCK_AR = { ok: 'متوفر', low: 'مخزون منخفض', out: 'غير متوفر' };

async function stockMove(q, m) {
  await q.unsafe(`insert into mobily.mc_shop_stock_moves (product_id, product_name, color, kind, d_physical, d_reserved, physical_after, reserved_after, order_id, order_no, actor_name, note)
    values ($1, coalesce((select name from mobily.mc_shop_products where id = $1), ''), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
  [m.product_id, m.color, m.kind, m.dp || 0, m.dr || 0, m.physical, m.reserved, m.order_id || null, m.order_no || null, m.actor || '', m.note || '']);
}
// الكميات المطلوبة من كل (منتج، لون) في الطلب
function needOf(items) {
  const m = new Map();
  for (const it of items || []) {
    if (!it || !UUID.test(String(it.product_id || ''))) continue;
    const k = it.product_id + '|' + (it.color || '');
    m.set(k, { product_id: it.product_id, color: it.color || '', name: it.name || '', qty: (m.has(k) ? m.get(k).qty : 0) + Number(it.qty || 0) });
  }
  return [...m.values()].sort((a, b) => (a.product_id + a.color < b.product_id + b.color ? -1 : 1)); // نفس الترتيب دايماً علشان القفل
}
const outMsg = (n, avail) => '«' + n.name + (n.color ? ' - ' + n.color : '') + '»: ' + (avail > 0 ? 'المتاح ' + avail + ' بس' : 'غير متوفر حالياً');
// حجز كمية الطلب (لو أي سطر مش متاح: Error ومفيش أي حجز بيتسجل لأن كله جوه نفس الـ transaction)
async function reserveFor(tx, items, order, actor, note) {
  for (const n of needOf(items)) {
    const r = await tx.unsafe(`update mobily.mc_shop_stock set reserved = reserved + $3, updated_at = now()
      where product_id = $1 and color = $2 and physical - reserved >= $3 returning physical, reserved`, [n.product_id, n.color, n.qty]);
    if (!r.length) {
      const [a] = await tx.unsafe('select greatest(physical - reserved, 0)::int a from mobily.mc_shop_stock where product_id = $1 and color = $2', [n.product_id, n.color]);
      const e = new Error(outMsg(n, a ? a.a : 0)); e.stock = true; throw e;
    }
    await stockMove(tx, { product_id: n.product_id, color: n.color, kind: 'reserve', dr: n.qty, physical: r[0].physical, reserved: r[0].reserved, order_id: order.id, order_no: order.order_no, actor, note });
  }
}
// نقل حالة مخزون الطلب: reserved / released / deducted (الطلبات القديمة اللي ملهاش حجز '' مش بتلمس المخزون)
async function stockTo(tx, o, target, actor) {
  const from = o.stock_state || '';
  if (!from || from === target) return from;
  const items = J(o.items, []);
  const order = { id: o.id, order_no: o.order_no };
  if (target === 'reserved' && from === 'released') { await reserveFor(tx, items, order, actor, 'تصحيح: رجوع الطلب'); return target; }
  for (const n of needOf(items)) {
    let dp = 0, dr = 0, kind = '', cond = '';
    if (from === 'reserved' && target === 'released') { dr = -n.qty; kind = 'release'; }
    else if (from === 'reserved' && target === 'deducted') { dp = -n.qty; dr = -n.qty; kind = 'sell'; }
    else if (from === 'deducted' && target === 'reserved') { dp = n.qty; dr = n.qty; kind = 'reserve'; }
    else if (from === 'deducted' && target === 'released') { dp = n.qty; kind = 'add'; }
    else if (from === 'released' && target === 'deducted') { dp = -n.qty; kind = 'sell'; cond = ' and physical - reserved >= ' + Number(n.qty); }
    await tx.unsafe(`insert into mobily.mc_shop_stock (product_id, color) select $1, $2 where exists (select 1 from mobily.mc_shop_products where id = $1) on conflict do nothing`, [n.product_id, n.color]);
    const r = await tx.unsafe(`update mobily.mc_shop_stock set physical = physical + $3, reserved = greatest(reserved + $4, 0), updated_at = now()
      where product_id = $1 and color = $2${cond} returning physical, reserved`, [n.product_id, n.color, dp, dr]);
    if (!r.length) {
      if (kind === 'sell' && cond) { const e = new Error(outMsg(n, 0)); e.stock = true; throw e; }
      continue; // المنتج اتمسح
    }
    await stockMove(tx, { product_id: n.product_id, color: n.color, kind, dp, dr, physical: r[0].physical, reserved: r[0].reserved, order_id: o.id, order_no: o.order_no, actor,
      note: kind === 'release' ? 'فك حجز (إلغاء/رفض الطلب)' : kind === 'sell' ? 'خصم نهائي (تم إتمام الطلب)' : 'تصحيح حالة الطلب' });
  }
  return target;
}
const stockTarget = (st) => (st === 'completed' ? 'deducted' : st === 'cancelled' || st === 'rejected' ? 'released' : 'reserved');

async function catalog(sql) {
  const [r] = await sql.unsafe(`select json_build_object(
    'categories', (select coalesce(json_agg(c order by c.sort, c.created_at), '[]') from (select ${CATEGORY_COLS}, created_at from mobily.mc_shop_categories where not hidden) c),
    'products', (select coalesce(json_agg(p order by p.created_at desc), '[]') from (
      select ${PRODUCT_COLS}, ${STOCK_JSON} from mobily.mc_shop_products p
      where not p.hidden and (p.category_id is null or p.category_id in (select id from mobily.mc_shop_categories where not hidden))) p)
  ) as data`);
  const d = J(r.data, {});
  // للعميل: المتاح لكل لون بس (من غير الرصيد الفعلي/المحجوز). المنتج اللي متاحه صفر بيظهر «غير متوفر».
  d.products = (d.products || []).map((p) => {
    const sv = stockView(p);
    const o = Object.assign({}, p, { available: !!p.available && sv.available > 0, stock_by_color: {} });
    sv.rows.forEach((x) => { o.stock_by_color[x.color] = p.available ? x.available : 0; });
    delete o.stock; delete o.low_stock;
    return o;
  });
  return d;
}

/* ---------------- السلة وإتمام الشراء والطلبات ----------------
 * الأسعار والخصومات والمخزون بتتحسب هنا في السيرفر، ومفيش أي سعر جاي من التطبيق بيتصدّق. */
export const ORDER_STATUS = ['pending', 'approved', 'preparing', 'ready', 'shipped', 'completed', 'rejected', 'cancelled'];
const ORDER_COLS = `o.id, o.order_no, o.customer_id, o.customer_name, o.customer_phone, o.member_no, o.product_id, o.product_name, o.product_code,
  o.color, o.variant, o.qty, o.unit_price, o.total, o.notes, o.status, o.reject_reason, o.history, o.created_at, o.updated_at,
  o.items, o.subtotal, o.product_discount, o.promo_code, o.promo_discount, o.shipping, o.method, o.delivery, o.address, o.admin_notes, o.branch_id, o.branch_name,
  o.invoice_status, o.invoice_no, o.invoice_points, o.invoice_balance, o.invoice_error, o.invoice_at, o.completed_at, o.stock_state`;
const PROMO_CODE = /^[A-Za-z0-9_-]{3,30}$/;

async function customerByToken(sql, token) {
  const t = T(token);
  if (!/^[a-f0-9]{64}$/.test(t)) throw new Error('افتح الكارت بتاعك الأول علشان تقدر تطلب');
  const r = await sql.unsafe('select customer_id, name, phone, member_no, status, points_balance from mobily.mc_customers where access_token = $1', [t]);
  if (!r.length) throw new Error('افتح الكارت بتاعك الأول علشان تقدر تطلب');
  if (r[0].status !== 'active') throw new Error('عضويتك موقوفة حالياً. تواصل مع المحل.');
  return r[0];
}

async function branches(q) {
  const r = await q.unsafe("select branch_id, name, address, phone from mobily.mc_branches where active is true order by name");
  return r.map((b) => ({ id: b.branch_id, name: b.name, address: b.address || '', phone: b.phone || '' }));
}
async function savedAddress(q, customerId) {
  const r = await q.unsafe('select address from mobily.mc_shop_addresses where customer_id = $1', [customerId]);
  return r.length ? r[0].address : '';
}

async function shopSettings(sql) {
  const r = await sql.unsafe('select delivery_enabled, delivery_fee from mobily.mc_shop_settings where id = 1');
  return r.length ? { delivery_enabled: !!r[0].delivery_enabled, delivery_fee: Number(r[0].delivery_fee) } : { delivery_enabled: false, delivery_fee: 0 };
}
async function settingsMap(q, keys) {
  const r = await q.unsafe('select key, value from mobily.mc_settings where key = any($1::text[])', [keys]);
  const m = {}; r.forEach((x) => { m[x.key] = x.value; });
  return m;
}
const isTrue = (v) => v === true || v === 'true';

// تنضيف المنتجات اللي جاية من السلة: نفس المنتج بنفس اللون والنوع يتجمع في سطر واحد
function cleanItems(list) {
  if (!Array.isArray(list) || !list.length) throw new Error('السلة فاضية');
  const map = new Map();
  for (const it of list.slice(0, 60)) {
    const pid = T(it && it.product_id);
    if (!UUID.test(pid)) continue;
    const color = T(it.color).slice(0, 40), variant = T(it.variant).slice(0, 60);
    const qty = Math.floor(Number(it.qty));
    if (!(qty >= 1)) continue;
    const k = pid + '|' + color + '|' + variant;
    const prev = map.get(k);
    if (prev) prev.qty += qty; else map.set(k, { product_id: pid, color, variant, qty });
  }
  const out = [...map.values()];
  if (!out.length) throw new Error('السلة فاضية');
  if (out.length > 30) throw new Error('أقصى عدد منتجات في الطلب الواحد 30');
  for (const it of out) if (it.qty > 50) throw new Error('أقصى كمية من المنتج الواحد 50');
  return out;
}

const dateStr = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d).slice(0, 10) : null);
const cairoToday = async (q) => (await q.unsafe("select to_char((now() at time zone 'Africa/Cairo')::date, 'YYYY-MM-DD') d"))[0].d;
// حالة كود الخصم: active / inactive / expired / scheduled
function promoState(pr, today) {
  if (!pr.active) return 'inactive';
  if (pr.ends_on && dateStr(pr.ends_on) < today) return 'expired';
  if (pr.starts_on && dateStr(pr.starts_on) > today) return 'scheduled';
  return 'active';
}

/**
 * حساب الطلب: المنتجات بأسعارها الحالية + المخزون المتاح + خصومات المنتجات + كود الخصم + الشحن.
 * q = sql أو transaction. lockPromo = نقفل صف الكود وقت تأكيد الطلب (لو اتوقف في نفس اللحظة الطلب بيترفض).
 */
async function quote(q, customer, p, lockPromo) {
  const items = cleanItems(p.items);
  const ids = [...new Set(items.map((i) => i.product_id))];
  const prods = await q.unsafe(`select p.id, p.name, p.code, p.price, p.old_price, p.available, p.hidden, p.colors, p.variants, p.category_id, p.low_stock, ${STOCK_JSON},
      coalesce(p.images->0->>'t', p.images->0->>'u', '') as image,
      (p.category_id is null or exists (select 1 from mobily.mc_shop_categories k where k.id = p.category_id and not k.hidden)) as cat_ok
    from mobily.mc_shop_products p where p.id = any($1::uuid[])`, [ids]);
  const byId = new Map(prods.map((r) => [r.id, r]));
  const need = {}; items.forEach((it) => { const k = it.product_id + '|' + it.color; need[k] = (need[k] || 0) + it.qty; });
  const lines = items.map((it) => {
    const pr = byId.get(it.product_id);
    const line = { product_id: it.product_id, name: pr ? pr.name : '', code: pr ? pr.code || '' : '', image: pr ? pr.image : '', category_id: pr ? pr.category_id : null,
      color: it.color, variant: it.variant, qty: it.qty, unit_price: 0, old_price: 0, line_subtotal: 0, line_discount: 0, line_total: 0, error: '' };
    if (!pr || pr.hidden || !pr.cat_ok) { line.error = 'المنتج ده مش متاح دلوقتي'; return line; }
    const colors = J(pr.colors, []).map((x) => x && x.n);
    const cim = J(pr.colors, []).find((x) => x && x.n === it.color && x.im && x.im.length);
    if (cim) line.image = cim.im[0].t || cim.im[0].u;
    const variants = J(pr.variants, []);
    if (colors.length && colors.indexOf(it.color) < 0) line.error = it.color ? 'اللون ده مبقاش متاح' : 'اختار اللون';
    else if (!colors.length && it.color) line.error = 'اللون ده مبقاش متاح';
    else if (variants.length && variants.indexOf(it.variant) < 0) line.error = 'اختار النوع';
    else if (!variants.length && it.variant) line.error = 'النوع ده مبقاش متاح';
    if (!line.error) {
      // المخزون المتاح للون المختار بالظبط
      const r = (J(pr.stock, {}) || {})[it.color] || { physical: 0, reserved: 0 };
      const avail = pr.available ? Math.max(0, Number(r.physical) - Number(r.reserved)) : 0;
      line.stock = avail;
      if (avail <= 0) line.error = 'غير متوفر حالياً';
      else if (need[it.product_id + '|' + it.color] > avail) line.error = 'المتاح ' + avail + ' بس';
    }
    const price = Number(pr.price), old = Number(pr.old_price) > price ? Number(pr.old_price) : 0;
    line.unit_price = price; line.old_price = old;
    line.line_total = money2(price * it.qty);
    line.line_subtotal = money2((old || price) * it.qty);
    line.line_discount = money2(line.line_subtotal - line.line_total);
    return line;
  });
  const good = lines.filter((l) => !l.error);
  const subtotal = money2(good.reduce((s, l) => s + l.line_subtotal, 0));
  const product_discount = money2(good.reduce((s, l) => s + l.line_discount, 0));
  const items_total = money2(good.reduce((s, l) => s + l.line_total, 0));

  // كود الخصم
  let promo = null;
  const code = T(p.promo);
  if (code) {
    promo = { code, ok: false, discount: 0, message: '' };
    const today = await cairoToday(q);
    const rows = PROMO_CODE.test(code)
      ? await q.unsafe(`select * from mobily.mc_shop_promos where lower(code) = lower($1)${lockPromo ? ' for update' : ''}`, [code]) : [];
    const pr = rows[0];
    let st = !pr || (pr.customer_id && pr.customer_id !== customer.customer_id) ? 'none' : promoState(pr, today);
    if (st === 'active' && pr.customer_id && !isTrue((await settingsMap(q, ['bday_enabled'])).bday_enabled)) st = 'inactive'; // كود عيد الميلاد: لو العروض اتقفلت
    if (st === 'none' || st === 'scheduled') promo.message = 'كود الخصم غير صحيح';
    else if (st === 'inactive') promo.message = 'كود الخصم ده متوقف حالياً ومينفعش يتستخدم';
    else if (st === 'expired') promo.message = 'كود الخصم انتهت صلاحيته';
    else {
      promo.code = pr.code; promo.id = pr.id;
      const [u] = await q.unsafe(`select count(*)::int n, count(*) filter (where customer_id = $2)::int mine from mobily.mc_shop_orders
        where promo_id = $1 and status not in ('rejected','cancelled')`, [pr.id, customer.customer_id]);
      const pids = J(pr.product_ids, []), cids = J(pr.category_ids, []);
      const scoped = pids.length || cids.length;
      let elig = good.filter((l) => !scoped || pids.indexOf(l.product_id) >= 0 || (l.category_id && cids.indexOf(l.category_id) >= 0));
      if ((pr.max_uses > 0 && u.n >= pr.max_uses) || (pr.per_customer > 0 && u.mine >= pr.per_customer)) promo.message = 'تم الوصول إلى الحد الأقصى لاستخدام هذا الكود';
      else if (!elig.length) promo.message = 'هذا الكود غير متاح على المنتجات الموجودة في سلتك';
      else {
        if (!pr.stackable) elig = elig.filter((l) => !(l.line_discount > 0));
        const base = money2(elig.reduce((s, l) => s + l.line_total, 0));
        if (!elig.length) promo.message = 'لا يمكن استخدام هذا الكود مع خصم آخر';
        else if (Number(pr.min_order) > 0 && base < Number(pr.min_order)) promo.message = 'الكود ده محتاج طلب بقيمة ' + Number(pr.min_order) + ' على الأقل';
        else {
          let d = pr.kind === 'percent' ? base * Number(pr.value) / 100 : Number(pr.value);
          if (pr.kind === 'percent' && Number(pr.max_discount) > 0) d = Math.min(d, Number(pr.max_discount));
          d = money2(Math.min(d, base));
          promo.ok = true; promo.discount = d; promo.message = 'تم تطبيق كود الخصم بنجاح';
          promo.kind = pr.kind; promo.value = Number(pr.value);
        }
      }
    }
  }
  const promo_discount = promo && promo.ok ? promo.discount : 0;
  const set = await shopSettings(q);
  const delivery = p.delivery === 'delivery' ? 'delivery' : 'pickup';
  const shipping = delivery === 'delivery' && set.delivery_enabled ? money2(set.delivery_fee) : 0;
  const total = money2(Math.max(0, items_total - promo_discount) + shipping);
  const brs = await branches(q);
  return {
    branches: brs, saved_address: await savedAddress(q, customer.customer_id),
    lines, subtotal, product_discount, items_total, promo, promo_discount, delivery, shipping, total,
    delivery_enabled: set.delivery_enabled, delivery_fee: set.delivery_fee,
    customer: { name: customer.name, phone: customer.phone, member_no: customer.member_no },
  };
}

async function checkout(sql, c, p) {
  const method = p.method === 'cart' ? 'cart' : 'buy_now';
  const delivery = p.delivery === 'delivery' ? 'delivery' : 'pickup';
  const address = T(p.address).slice(0, 500);
  const notes = T(p.notes).slice(0, 500);
  return sql.begin(async (tx) => {
    const [cnt] = await tx.unsafe("select count(*)::int n from mobily.mc_shop_orders where customer_id = $1 and created_at > now() - interval '1 day'", [c.customer_id]);
    if (cnt.n >= 20) throw new Error('وصلت للحد الأقصى للطلبات النهارده. كلم المحل لو محتاج حاجة.');
    const qt = await quote(tx, c, p, true);
    const badLine = qt.lines.find((l) => l.error);
    if (badLine) throw new Error((badLine.name ? '«' + badLine.name + (badLine.color ? ' - ' + badLine.color : '') + '»: ' : '') + badLine.error);
    if (qt.promo && !qt.promo.ok) throw new Error(qt.promo.message);
    if (delivery === 'delivery' && !qt.delivery_enabled) throw new Error('التوصيل مش متاح حالياً، اختار الاستلام من الفرع');
    if (delivery === 'delivery' && address.length < 5) throw new Error('أضف عنوان التوصيل الأول');
    let branch = null;
    if (delivery === 'pickup') {
      branch = qt.branches.find((b) => b.id === T(p.branch_id)) || (qt.branches.length === 1 ? qt.branches[0] : null);
      if (!branch) throw new Error(qt.branches.length ? 'اختار الفرع اللي هتستلم منه' : 'مفيش فرع متاح للاستلام حالياً. كلم المحل.');
    }
    if (p.expect_total !== undefined && p.expect_total !== null && money2(p.expect_total) !== qt.total) {
      const e = new Error('الأسعار اتغيرت. راجع الإجمالي الجديد وأكد تاني.'); e.quote = qt; throw e;
    }
    const items = qt.lines.map((l) => ({ product_id: l.product_id, name: l.name, code: l.code, color: l.color, variant: l.variant, qty: l.qty,
      unit_price: l.unit_price, old_price: l.old_price, line_subtotal: l.line_subtotal, line_discount: l.line_discount, line_total: l.line_total }));
    const first = items[0];
    const qtySum = items.reduce((s, i) => s + i.qty, 0);
    const title = first.name + (items.length > 1 ? ' + ' + (items.length - 1) + ' منتج تاني' : '');
    const hist = JSON.stringify([{ s: 'pending', at: new Date().toISOString(), by: 'customer' }]);
    const [o] = await tx.unsafe(`insert into mobily.mc_shop_orders (order_no, customer_id, customer_name, customer_phone, member_no, product_id, product_name, product_code,
        color, variant, qty, unit_price, total, notes, status, history, items, subtotal, product_discount, promo_id, promo_code, promo_discount, shipping, method, delivery, address,
        branch_id, branch_name, stock_state)
      values (nextval('mobily.mc_shop_order_no'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14::text::jsonb, $15::text::jsonb,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 'reserved') returning id, order_no`,
      [c.customer_id, c.name, c.phone, c.member_no, first.product_id, title, first.code || '', first.color, first.variant, qtySum, first.unit_price, qt.total, notes, hist,
        JSON.stringify(items), qt.subtotal, qt.product_discount, qt.promo && qt.promo.ok ? qt.promo.id : null, qt.promo && qt.promo.ok ? qt.promo.code : '',
        qt.promo_discount, qt.shipping, method, delivery, delivery === 'delivery' ? address : '', branch ? branch.id : '', branch ? branch.name : '']);
    // حجز الكمية فوراً (لو عميل تاني سبق على آخر قطعة: الطلب ده بيترفض برسالة فيها المتاح)
    await reserveFor(tx, items, o, c.name, 'حجز لطلب جديد');
    const total = money2(qt.total);
    await notify(tx, { audience: 'admin', kind: 'new_order', ref_key: 'order:' + o.id, link: 'order/' + o.id,
      title: '🛒 طلب جديد #' + o.order_no, body: c.name + ' · ' + total + ' ج.م · ' + (delivery === 'delivery' ? 'توصيل' : 'استلام من الفرع' + (branch ? ' (' + branch.name + ')' : '')) });
    return { id: o.id, order_no: Number(o.order_no), total, customer: c.name, delivery };
  });
}

/* ---------------- مسار حالة الطلب (للأمام بس) ----------------
 * نفس القواعد موجودة كمان جوه قاعدة البيانات (trigger) علشان محدش يقدر يتخطاها بطلب مباشر. */
const FINAL = ['completed', 'rejected', 'cancelled'];
const ENDED = ['rejected', 'cancelled'];
export function nextStatus(st, delivery) {
  return { pending: 'approved', approved: 'preparing', preparing: 'ready', ready: delivery === 'delivery' ? 'shipped' : 'completed', shipped: 'completed' }[st] || null;
}
export function flowFor(delivery) {
  return delivery === 'delivery' ? ['pending', 'approved', 'preparing', 'ready', 'shipped', 'completed'] : ['pending', 'approved', 'preparing', 'ready', 'completed'];
}
function flowError(from, to, delivery) {
  if (from === to) return 'الطلب بالفعل في الحالة دي';
  if (FINAL.indexOf(from) >= 0) return 'الطلب ده انتهى («' + ST_AR[from] + '») ومينفعش تتغير حالته';
  if (to === 'cancelled') return '';
  if (to === 'rejected') return from === 'pending' ? '' : 'الرفض بيكون من «قيد المراجعة» بس. بعد القبول استخدم «إلغاء الطلب»';
  const nx = nextStatus(from, delivery);
  if (to === nx) return '';
  const f = flowFor(delivery);
  if (f.indexOf(to) >= 0 && f.indexOf(to) < f.indexOf(from)) return 'مينفعش الطلب يرجع لحالة قبل كده';
  if (f.indexOf(to) < 0) return 'الحالة دي مش في مسار الطلب ده (' + (delivery === 'delivery' ? 'توصيل' : 'استلام من الفرع') + ')';
  return 'لازم تخلّص «' + ST_AR[nx] + '» الأول';
}
async function setActor(tx, a) {
  await tx.unsafe(`select set_config('mobily.actor_id', $1, true), set_config('mobily.actor_name', $2, true), set_config('mobily.actor_role', $3, true),
    set_config('mobily.reason', $4, true), set_config('mobily.correction', $5, true)`, [a.id || '', a.name || '', a.role || '', a.reason || '', a.correction ? '1' : '']);
}
const ST_AR = { pending: 'قيد المراجعة', approved: 'تم قبول الطلب', preparing: 'جاري التجهيز', ready: 'جاهز للاستلام', shipped: 'تم الشحن', completed: 'تم إتمام الطلب', rejected: 'مرفوض', cancelled: 'ملغي' };

/* ---------------- الإشعارات داخل التطبيق ----------------
 * ref_key فريد: نفس الحدث مستحيل يتبعت مرتين. */
async function notify(q, n) {
  await q.unsafe(`insert into mobily.mc_notifications (audience, customer_id, kind, title, body, link, ref_key) values ($1, $2, $3, $4, $5, $6, $7)
    on conflict (ref_key) do nothing`, [n.audience, n.customer_id || '', n.kind || '', T(n.title).slice(0, 200), T(n.body).slice(0, 600), T(n.link).slice(0, 200), T(n.ref_key).slice(0, 200)]);
}
async function notifList(q, audience, customerId, reader, since, limit) {
  const rows = await q.unsafe(`select n.id, n.kind, n.title, n.body, n.link, n.created_at, (r.notif_id is null) unread
    from mobily.mc_notifications n left join mobily.mc_notification_reads r on r.notif_id = n.id and r.reader = $3
    where n.audience = $1 and n.customer_id = $2 and n.created_at >= $4::text::timestamptz order by n.id desc limit ${Number(limit) || 50}`, [audience, customerId, reader, since]);
  const [c] = await q.unsafe(`select count(*)::int n from mobily.mc_notifications n where n.audience = $1 and n.customer_id = $2 and n.created_at >= $4::text::timestamptz
    and not exists (select 1 from mobily.mc_notification_reads r where r.notif_id = n.id and r.reader = $3)`, [audience, customerId, reader, since]);
  return { unread: c.n, list: rows.map((x) => Object.assign({}, x, { id: Number(x.id) })) };
}
async function markRead(q, audience, customerId, reader, since, ids) {
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter((x) => x > 0).slice(0, 500);
  await q.unsafe(`insert into mobily.mc_notification_reads (notif_id, reader)
    select n.id, $3 from mobily.mc_notifications n where n.audience = $1 and n.customer_id = $2 and n.created_at >= $4::text::timestamptz ${ids === 'all' ? '' : 'and n.id = any($5::bigint[])'}
    on conflict do nothing`, ids === 'all' ? [audience, customerId, reader, since] : [audience, customerId, reader, since, list]);
}

/* ---------------- فاتورة المبيعات والنقاط للطلب الأونلاين ----------------
 * أول ما الطلب يبقى «تم إتمام الطلب» (العميل استلم): فاتورة مبيعات حقيقية في نظام المبيعات الموجود (نفس «تسجيل بيع»)
 * بنفس قواعد النقاط المتسجلة في الإعدادات، والنقاط بتتضاف لمحفظة العميل الموجودة بعد ما الفاتورة تتسجل بنجاح.
 * لو الفاتورة فشلت: الطلب بيفضل «في انتظار الفاتورة» + إشعار للإدارة، ومفيش نقاط لحد ما تنجح. مفيش طلب ياخد فاتورتين أو نقاط مرتين. */
const ONLINE_CAT = 'طلبات أونلاين';
async function invoiceOrder(sql, ctx, id, token) {
  if (!ctx.core) return null;
  const [o] = await sql.unsafe(`update mobily.mc_shop_orders set invoice_status = 'working', invoice_claim_at = now()
    where id = $1 and status = 'completed' and (invoice_status = 'pending' or (invoice_status = 'working' and invoice_claim_at < now() - interval '2 minutes'))
    returning id, order_no, customer_id, total, shipping, items, subtotal, product_discount, promo_code, promo_discount, delivery, branch_name, address, completed_at, created_at`, [id]);
  if (!o) return null;
  const invNo = 'ONL-' + o.order_no;
  const details = {
    order_id: o.id, order_no: Number(o.order_no), order_date: o.created_at, completed_at: o.completed_at,
    items: J(o.items, []).map((i) => ({ name: i.name, code: i.code || '', color: i.color || '', variant: i.variant || '', qty: Number(i.qty), unit_price: Number(i.unit_price),
      old_price: Number(i.old_price || 0), line_discount: Number(i.line_discount || 0), line_total: Number(i.line_total || 0) })),
    subtotal: Number(o.subtotal), product_discount: Number(o.product_discount), promo_code: o.promo_code || '', promo_discount: Number(o.promo_discount),
    shipping: Number(o.shipping || 0), total: Number(o.total), delivery: o.delivery, branch_name: o.branch_name || '', address: o.address || '',
  };
  const fail = async (msg) => {
    await sql.unsafe("update mobily.mc_shop_orders set invoice_status = 'pending', invoice_error = $2 where id = $1 and invoice_status = 'working'", [o.id, String(msg).slice(0, 300)]).catch(() => {});
    await notify(sql, { audience: 'admin', kind: 'invoice_failed', ref_key: 'invfail:' + o.id, link: 'order/' + o.id,
      title: '⚠️ فاتورة طلب #' + o.order_no + ' ما اتسجلتش', body: String(msg).slice(0, 200) + ' — افتح الطلب ودوس «إعادة محاولة الفاتورة»' }).catch(() => {});
    return { done: false, error: msg };
  };
  try {
    // لو الفاتورة اتعملت قبل كده (مثلاً الرد اتقطع) نربطها بس، من غير فاتورة تانية
    let [ex] = await sql.unsafe("select txn_id, invoice_no, points_earned from mobily.mc_transactions where status <> 'void' and (shop_order_id = $2 or (customer_id = $1 and upper(invoice_no) = $3)) limit 1", [o.customer_id, o.id, invNo]);
    let txn = ex ? ex.txn_id : '', pts = ex ? Number(ex.points_earned || 0) : 0, no = ex ? ex.invoice_no : invNo, bal = null;
    if (!ex) {
      const amount = money2(Number(o.total) - Number(o.shipping || 0)); // قيمة المنتجات بعد كل الخصومات (النقاط بتتحسب عليها)
      if (!(amount > 0)) return await fail('قيمة الطلب صفر، مينفعش تتعمل فاتورة');
      const out = await ctx.core({ fn: 'adminApi', args: [token, 'checkout', { customer_id: o.customer_id, amount, invoice_no: invNo, category: ONLINE_CAT }, ''] });
      const res = out && out.result;
      if (!res || !res.ok) return await fail((res && res.error) || 'تعذر عمل الفاتورة');
      txn = res.data.txn_id; pts = Number((res.data.quote && res.data.quote.points_earned) || 0); bal = Number(res.data.balance);
    }
    await sql.unsafe('update mobily.mc_transactions set shop_order_id = $2, details = $3::text::jsonb where txn_id = $1', [txn, o.id, JSON.stringify(details)]);
    if (bal === null) { const [cb] = await sql.unsafe('select points_balance from mobily.mc_customers where customer_id = $1', [o.customer_id]); bal = cb ? Number(cb.points_balance) : 0; }
    // التأكد إن الفاتورة اتسجلت فعلاً ومربوطة بالطلب قبل ما نعتبرها تمت
    const [chk] = await sql.unsafe("select txn_id from mobily.mc_transactions where txn_id = $1 and shop_order_id = $2 and status <> 'void'", [txn, o.id]);
    if (!chk) return await fail('الفاتورة ما اتأكدتش في نظام المبيعات');
    const up = await sql.unsafe(`update mobily.mc_shop_orders set invoice_status = 'done', invoice_no = $2, invoice_txn_id = $3, invoice_points = $4, invoice_balance = $5, invoice_error = '', invoice_at = now()
      where id = $1 and invoice_status = 'working' returning id`, [o.id, no, txn, pts, bal]);
    if (up.length) {
      await notify(sql, { audience: 'customer', customer_id: o.customer_id, kind: 'order_done', ref_key: 'done:' + o.id, link: 'shop/orders/' + o.id,
        title: '✅ تم استلام طلبك #' + o.order_no + ' بنجاح',
        body: 'تم تسجيل فاتورة البيع (' + no + ')' + (pts > 0 ? ' وإضافة ' + pts + ' نقطة إلى محفظتك' : '') + '. رصيدك الحالي ' + bal + ' نقطة. شكراً لتسوقك من MOBILY.' });
    }
    return { done: true, invoice_no: no, points: pts, balance: bal };
  } catch (e) {
    console.error(e);
    return await fail('حدث خطأ أثناء تسجيل الفاتورة');
  }
}
async function retryInvoices(sql, ctx, token) {
  const rows = await sql.unsafe(`select id from mobily.mc_shop_orders where status = 'completed' and invoice_error = '' and (invoice_status = 'pending' or (invoice_status = 'working' and invoice_claim_at < now() - interval '2 minutes'))
    order by updated_at limit 3`);
  for (const r of rows) await invoiceOrder(sql, ctx, r.id, token);
}

async function withImages(sql, rows) {
  const ids = new Set();
  rows.forEach((o) => J(o.items, []).forEach((i) => { if (i && UUID.test(String(i.product_id || ''))) ids.add(i.product_id); }));
  const map = new Map();
  if (ids.size) {
    const r = await sql.unsafe("select id, coalesce(images->0->>'t', images->0->>'u', '') im, colors from mobily.mc_shop_products where id = any($1::uuid[])", [[...ids]]);
    r.forEach((x) => {
      map.set(x.id, x.im);
      J(x.colors, []).forEach((c) => { if (c && c.im && c.im.length) map.set(x.id + '|' + c.n, c.im[0].t || c.im[0].u); });
    });
  }
  return rows.map((o) => publicOrder(o, map));
}

function publicOrder(o, imgs) {
  const items = J(o.items, []).map((i) => ({
    product_id: i.product_id, name: i.name, code: i.code || '', color: i.color || '', variant: i.variant || '', qty: Number(i.qty),
    unit_price: Number(i.unit_price), old_price: Number(i.old_price || 0), line_subtotal: Number(i.line_subtotal || 0),
    line_discount: Number(i.line_discount || 0), line_total: Number(i.line_total || 0),
    image: (imgs && (imgs.get(i.product_id + '|' + (i.color || '')) || imgs.get(i.product_id))) || '',
  }));
  return {
    id: o.id, order_no: Number(o.order_no), product_id: o.product_id, product_name: o.product_name, product_code: o.product_code,
    color: o.color, variant: o.variant, qty: o.qty, unit_price: Number(o.unit_price), total: Number(o.total), notes: o.notes,
    items, subtotal: Number(o.subtotal), product_discount: Number(o.product_discount), promo_code: o.promo_code || '', promo_discount: Number(o.promo_discount),
    shipping: Number(o.shipping), method: o.method, delivery: o.delivery, address: o.address || '', branch_name: o.branch_name || '',
    status: o.status, reject_reason: o.reject_reason, image: items[0] ? items[0].image : '', created_at: o.created_at, updated_at: o.updated_at,
    history: J(o.history, []).map((h) => ({ s: h.s, at: h.at })),
    invoice_status: o.invoice_status || '', invoice_no: o.invoice_no || '', invoice_points: Number(o.invoice_points || 0),
    invoice_balance: o.invoice_balance === null || o.invoice_balance === undefined ? null : Number(o.invoice_balance),
  };
}

async function customerShop(sql, ctx, action, p) {
  const c = await customerByToken(sql, p.token);
  if (action === 'myOrders') {
    const rows = await sql.unsafe(`select ${ORDER_COLS} from mobily.mc_shop_orders o where o.customer_id = $1 order by o.created_at desc limit 200`, [c.customer_id]);
    return withImages(sql, rows);
  }
  if (action === 'summary') {
    // لوحة العميل: طلبات الأونلاين + فواتير المحل مع بعض. الطلب الأونلاين اللي اتعملت له فاتورة بيتحسب مرة واحدة بس (كطلب أونلاين).
    const [o] = await sql.unsafe(`select count(*)::int total,
        count(*) filter (where status in ('pending','approved','preparing','ready','shipped'))::int active,
        count(*) filter (where status = 'completed')::int completed,
        count(*) filter (where status in ('cancelled','rejected'))::int cancelled,
        coalesce(sum(total - shipping) filter (where status = 'completed' and invoice_status <> 'done'), 0) value_no_invoice
      from mobily.mc_shop_orders where customer_id = $1`, [c.customer_id]);
    const store = await sql.unsafe(`select t.txn_id, t.invoice_no, t.net_amount, t.created_at from mobily.mc_transactions t
      where t.customer_id = $1 and t.status <> 'void' and t.shop_order_id is null
        and not exists (select 1 from mobily.mc_shop_orders o where o.invoice_txn_id = t.txn_id) order by t.created_at desc`, [c.customer_id]);
    const [v] = await sql.unsafe("select coalesce(sum(net_amount), 0) v from mobily.mc_transactions where customer_id = $1 and status <> 'void'", [c.customer_id]);
    return {
      total: o.total + store.length, active: o.active, completed: o.completed + store.length, cancelled: o.cancelled,
      online: o.total, store: store.length, value: money2(Number(v.v) + Number(o.value_no_invoice)),
      store_invoices: store.slice(0, 50).map((t) => ({ invoice_no: t.invoice_no, amount: Number(t.net_amount), created_at: t.created_at })),
    };
  }
  if (action === 'notifications') return notifList(sql, 'customer', c.customer_id, 'c:' + c.customer_id, '-infinity', 50);
  if (action === 'readNotifications') { await markRead(sql, 'customer', c.customer_id, 'c:' + c.customer_id, '-infinity', p.ids === 'all' ? 'all' : p.ids); return { done: true }; }
  if (action === 'quote') return quote(sql, c, p, false);
  if (action === 'saveAddress') { // عنوان التوصيل المحفوظ في حساب العميل
    const a = T(p.address).slice(0, 500);
    if (a.length < 5) throw new Error('اكتب العنوان بالتفصيل');
    await sql.unsafe(`insert into mobily.mc_shop_addresses (customer_id, address, updated_at) values ($1, $2, now())
      on conflict (customer_id) do update set address = excluded.address, updated_at = now()`, [c.customer_id, a]);
    return { address: a };
  }
  if (action === 'checkout' || action === 'order') {
    const r = await checkout(sql, c, action === 'order' // النسخة القديمة من الصفحة (منتج واحد)
      ? { items: [{ product_id: p.product_id, color: p.color, variant: p.variant, qty: p.qty }], notes: p.notes, method: 'buy_now' } : p);
    return { id: r.id, order_no: r.order_no, total: r.total };
  }
  if (action === 'cancelOrder') {
    if (!UUID.test(T(p.id))) throw new Error('الطلب غير موجود');
    const r = await sql.begin(async (tx) => {
      const [o] = await tx.unsafe("select id, order_no, items, stock_state from mobily.mc_shop_orders where id = $1 and customer_id = $2 and status = 'pending' for update", [T(p.id), c.customer_id]);
      if (!o) return [];
      const ss = await stockTo(tx, o, 'released', c.name);
      await setActor(tx, { id: c.customer_id, name: c.name, role: 'customer', reason: 'العميل لغى الطلب' });
      const u = await tx.unsafe(`update mobily.mc_shop_orders set status = 'cancelled', stock_state = $3, reject_reason = 'العميل لغى الطلب', updated_at = now(),
          history = history || $4::text::jsonb where id = $1 and customer_id = $2 returning id, order_no`,
        [o.id, c.customer_id, ss, JSON.stringify([{ s: 'cancelled', at: new Date().toISOString(), by: 'customer' }])]);
      await notify(tx, { audience: 'admin', kind: 'order_cancelled', ref_key: 'cancel:' + o.id, link: 'order/' + o.id, title: 'طلب #' + o.order_no + ' اتلغى', body: 'العميل ' + c.name + ' لغى الطلب' });
      return u;
    });
    if (!r.length) throw new Error('الطلب ده مينفعش يتلغي، المحل بدأ فيه بالفعل. كلم المحل.');
    return { done: true };
  }
  throw new Error('طلب غير معروف');
}

/* ---------------- أكواد الخصم (الإدارة) ---------------- */
function cleanPromo(p) {
  const code = T(p.code).toUpperCase();
  if (!PROMO_CODE.test(code)) throw new Error('الكود لازم يكون من 3 لـ 30 حرف إنجليزي أو رقم (من غير مسافات)');
  const kind = p.kind === 'fixed' ? 'fixed' : 'percent';
  const value = num(p.value, 'قيمة الخصم');
  if (!(value > 0)) throw new Error('اكتب قيمة الخصم');
  if (kind === 'percent' && value > 100) throw new Error('النسبة لازم تكون من 1 لـ 100');
  const d = (v, n) => { const s = T(v); if (!s) return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(n + ' غير صحيح'); return s; };
  const starts_on = d(p.starts_on, 'تاريخ البداية'), ends_on = d(p.ends_on, 'تاريخ النهاية');
  if (starts_on && ends_on && ends_on < starts_on) throw new Error('تاريخ النهاية لازم يكون بعد تاريخ البداية');
  return {
    code, kind, value,
    min_order: num(p.min_order, 'الحد الأدنى للطلب'),
    max_discount: kind === 'percent' ? num(p.max_discount, 'أقصى خصم') : 0,
    starts_on, ends_on,
    max_uses: Math.min(int(p.max_uses, 'عدد مرات الاستخدام'), 1000000),
    per_customer: Math.min(int(p.per_customer, 'عدد مرات الاستخدام لكل عميل'), 1000000),
    active: p.active !== false,
    product_ids: (Array.isArray(p.product_ids) ? p.product_ids : []).map(T).filter((x) => UUID.test(x)).slice(0, 500),
    category_ids: (Array.isArray(p.category_ids) ? p.category_ids : []).map(T).filter((x) => UUID.test(x)).slice(0, 100),
    stackable: p.stackable !== false,
  };
}

/* ---------------- نقاط الترحيب وعيد الميلاد ----------------
 * بتتضاف لنفس محفظة العميل (سجل النقاط الموجود mc_pointsledger) بنفس قفل نظام النقاط،
 * ومحمية في قاعدة البيانات (unique index) من إنها تتكرر لنفس العميل / نفس عيد الميلاد. */
async function addPoints(tx, customerId, points, ref) {
  const [c] = await tx.unsafe('select customer_id, points_balance from mobily.mc_customers where customer_id = $1 for update', [customerId]);
  if (!c) return null;
  const s = await settingsMap(tx, ['points_expiry_days']);
  const days = Number(s.points_expiry_days) || 0;
  const bal = Number(c.points_balance || 0) + points;
  const entry = rid('P');
  const r = await tx.unsafe(`insert into mobily.mc_pointsledger (entry_id, customer_id, type, points, ref_type, ref_id, invoice_no, reason, expires_at, balance_after, employee_id, employee_name, branch_id, created_at)
    values ($1, $2, 'ADJUST_ADD', $3, $4, $5, '', $6, case when $7::int > 0 then now() + make_interval(days => $7::int) end, $8, 'system', 'النظام', 'MAIN', now())
    on conflict do nothing returning entry_id`, [entry, customerId, points, ref.type, ref.id, ref.reason, days, bal]);
  if (!r.length) return null;
  await tx.unsafe('update mobily.mc_customers set points_balance = $2, updated_at = now() where customer_id = $1', [customerId, bal]);
  return { entry_id: entry, balance: bal };
}

export async function welcomeSweep(sql) {
  const s = await settingsMap(sql, ['welcome_enabled', 'welcome_points']);
  const pts = Math.floor(Number(s.welcome_points) || 0);
  if (!isTrue(s.welcome_enabled) || pts <= 0) {
    // المكافأة مقفولة: اللي بيسجل دلوقتي مش هياخدها حتى لو اتفتحت بعدين
    await sql.unsafe("insert into mobily.mc_props (key, value) values ('WELCOME_SINCE', $1) on conflict (key) do update set value = excluded.value", [new Date().toISOString()]);
    return 0;
  }
  const todo = await sql.unsafe(`select c.customer_id from mobily.mc_customers c
    where c.status = 'active' and c.created_at >= coalesce((select value::timestamptz from mobily.mc_props where key = 'WELCOME_SINCE'), now())
      and not exists (select 1 from mobily.mc_pointsledger l where l.customer_id = c.customer_id and l.ref_type = 'welcome') limit 50`);
  let n = 0;
  for (const t of todo) {
    const done = await sql.begin(async (tx) => {
      await tx.unsafe(`select pg_advisory_xact_lock(${CORE_LOCK})`);
      const r = await addPoints(tx, t.customer_id, pts, { type: 'welcome', id: 'welcome', reason: 'Welcome Bonus – مكافأة التسجيل' });
      if (r) await notify(tx, { audience: 'customer', customer_id: t.customer_id, kind: 'welcome', ref_key: 'welcome:' + t.customer_id, link: '',
        title: '🎁 مكافأة التسجيل', body: 'اتضافلك ' + pts + ' نقطة مجانية في محفظتك. رصيدك ' + r.balance + ' نقطة.' });
      return !!r;
    });
    if (done) n++;
  }
  return n;
}

const pad2 = (n) => (n < 10 ? '0' : '') + n;
function bdayKey(birthdate, year) { // 29 فبراير = 28 فبراير في السنة غير الكبيسة (نفس قاعدة النظام)
  const m = Number(String(birthdate).slice(5, 7)), d0 = Number(String(birthdate).slice(8, 10));
  if (!m || !d0) return '';
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return year + '-' + pad2(m) + '-' + pad2(m === 2 && d0 === 29 && !leap ? 28 : d0);
}
const addDays = (key, n) => new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)) + n)).toISOString().slice(0, 10);

// تنبيه الإدارة قبل عيد الميلاد بيوم + منح عرض عيد الميلاد (نقاط / كود خصم) أول يوم في فترته. آمن للتكرار.
export async function birthdayTasks(sql) {
  const today = await cairoToday(sql), tomorrow = addDays(today, 1);
  const s = await settingsMap(sql, ['bday_enabled', 'bday_reward_type', 'bday_value', 'bday_max_discount', 'bday_valid_days', 'bday_code_kind', 'currency']);
  const enabled = isTrue(s.bday_enabled), type = s.bday_reward_type || 'percent', value = Number(s.bday_value) || 0;
  const days = Math.max(1, Math.min(31, Math.floor(Number(s.bday_valid_days) || 1))), cur = s.currency || 'ج.م';
  const custs = await sql.unsafe("select customer_id, member_no, name, birthdate from mobily.mc_customers where status = 'active' and birthdate ~ '^\\d{4}-\\d{2}-\\d{2}$'");
  const offerText = type === 'points' ? value + ' نقطة هدية في المحفظة' : type === 'code' ? 'كود خصم ' + (s.bday_code_kind === 'fixed' ? value + ' ' + cur : value + '%') + ' للمتجر'
    : type === 'gift' ? 'هدية' : type === 'fixed' ? 'خصم ' + value + ' ' + cur : 'خصم ' + value + '%';
  let reminders = 0, granted = 0;
  for (const c of custs) {
    const y = Number(tomorrow.slice(0, 4));
    if (bdayKey(c.birthdate, y) === tomorrow) {
      await notify(sql, { audience: 'admin', kind: 'birthday', ref_key: 'bday:' + c.customer_id + ':' + tomorrow, link: 'customer/' + c.customer_id,
        title: '🎂 عيد ميلاد العميل ' + c.name + ' غداً', body: 'تاريخ الميلاد ' + c.birthdate + ' – يمكنك تجهيز عرض عيد ميلاده. ' + (enabled ? 'عرض عيد الميلاد مفعّل: ' + offerText : 'عرض عيد الميلاد متوقف حالياً') });
      reminders++;
    }
    if (!enabled || (type !== 'points' && type !== 'code') || !(value > 0)) continue;
    const ty = Number(today.slice(0, 4));
    for (const yy of [ty, ty - 1]) {
      const start = bdayKey(c.birthdate, yy), end = start && addDays(start, days - 1);
      if (!start || today < start || today > end) continue;
      const g = await sql.begin(async (tx) => {
        await tx.unsafe(`select pg_advisory_xact_lock(${CORE_LOCK})`);
        const ex = await tx.unsafe('select 1 from mobily.mc_birthdayrewards where customer_id = $1 and occasion = $2', [c.customer_id, String(yy)]);
        if (ex.length) return false; // عرض عيد الميلاد ده اتمنح قبل كده
        const reward = rid('B');
        let code = '', entry = '', text = offerText, status = 'available';
        if (type === 'points') {
          const r = await addPoints(tx, c.customer_id, Math.floor(value), { type: 'birthday', id: reward, reason: 'Birthday Bonus – هدية عيد الميلاد ' + yy });
          if (!r) return false;
          entry = r.entry_id; status = 'used'; text = Math.floor(value) + ' نقطة هدية في محفظتك';
          await notify(tx, { audience: 'customer', customer_id: c.customer_id, kind: 'birthday', ref_key: 'bdaygift:' + reward, link: '',
            title: '🎂 كل سنة وانت طيب يا ' + c.name, body: 'اتضافلك ' + Math.floor(value) + ' نقطة هدية عيد ميلادك في محفظتك. رصيدك ' + r.balance + ' نقطة.' });
        } else {
          for (let i = 0; i < 5 && !code; i++) {
            const k = 'BDAY' + Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, '7');
            const ins = await tx.unsafe(`insert into mobily.mc_shop_promos (code, kind, value, min_order, max_discount, starts_on, ends_on, max_uses, per_customer, active, product_ids, category_ids, stackable, customer_id)
              select $1, $2, $3, 0, $4, $5::date, $6::date, 1, 1, true, '[]', '[]', true, $7 where not exists (select 1 from mobily.mc_shop_promos where lower(code) = lower($1)) returning code`,
            [k, s.bday_code_kind === 'fixed' ? 'fixed' : 'percent', s.bday_code_kind === 'fixed' ? value : Math.min(value, 100), s.bday_code_kind === 'fixed' ? 0 : Number(s.bday_max_discount) || 0, start, end, c.customer_id]);
            if (ins.length) code = ins[0].code;
          }
          if (!code) return false;
          text = 'كود ' + code + ': ' + offerText;
          await notify(tx, { audience: 'customer', customer_id: c.customer_id, kind: 'birthday', ref_key: 'bdaygift:' + reward, link: 'shop',
            title: '🎂 كل سنة وانت طيب يا ' + c.name, body: 'هدية عيد ميلادك: كود الخصم ' + code + ' (' + offerText + ') صالح لحد ' + end + '. استخدمه في «تصفح منتجاتنا».' });
        }
        await tx.unsafe(`insert into mobily.mc_birthdayrewards (reward_id, customer_id, member_no, occasion, start_date, end_date, reward_type, value, max_discount, gift_text, status,
            txn_id, invoice_no, discount_amount, used_at, used_by, wa_sent_by, created_at, promo_code, points_entry)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '', '', 0, ${status === 'used' ? 'now()' : 'null'}, $12, '', now(), $13, $14)`,
        [reward, c.customer_id, c.member_no, String(yy), start, end, type, value, Number(s.bday_max_discount) || 0, text, status, status === 'used' ? 'النظام' : '', code, entry]);
        return true;
      });
      if (g) granted++;
    }
  }
  return { reminders, granted };
}

// المهام اليومية: بتشتغل من النبضة اللي بتجي كل دقيقة، بس فعلياً مرة كل 10 دقايق
export async function periodic(sql) {
  const r = await sql.unsafe(`insert into mobily.mc_props (key, value) values ('SHOP_TASKS_AT', now()::text)
    on conflict (key) do update set value = excluded.value where mobily.mc_props.value::timestamptz < now() - interval '10 minutes' returning key`);
  if (!r.length) return null;
  const out = { welcome: await welcomeSweep(sql).catch((e) => { console.error(e); return -1; }) };
  out.birthday = await birthdayTasks(sql).catch((e) => { console.error(e); return null; });
  return out;
}

// بعد أي عملية في النظام الأساسي: تسجيل عميل جديد (من صفحة التسجيل أو من الإدارة) ← نقاط الترحيب فوراً
export async function afterCore(body, out, sql) {
  const fn = body && body.fn, args = (body && body.args) || [];
  const res = out && out.result;
  if (!res || !res.ok) return;
  if ((fn === 'publicApi' && args[0] === 'register') || (fn === 'adminApi' && args[1] === 'createCustomer')) {
    try { await welcomeSweep(sql); } catch (e) { console.error(e); }
  }
}

/**
 * ctx: { sql, verifyAdmin: async (token) => {ok, res, permissions, name, user_id, role}, upload, core: async (body) => out }
 */
export async function handleShop(body, ctx) {
  const fn = body && body.fn;
  const args = Array.isArray(body && body.args) ? body.args : [];
  const { sql } = ctx;
  try {
    if (fn === 'shop') {
      if (args[0] === 'catalog') return ok(await catalog(sql));
      if (['order', 'quote', 'saveAddress', 'checkout', 'myOrders', 'cancelOrder', 'summary', 'notifications', 'readNotifications'].indexOf(args[0]) >= 0) return ok(await customerShop(sql, ctx, args[0], args[1] && typeof args[1] === 'object' ? args[1] : {}));
      return bad('طلب غير معروف');
    }
    // ---------- الإدارة ----------
    const [token, action] = [args[0], args[1]];
    const p = args[2] && typeof args[2] === 'object' ? args[2] : {};
    const user = await ctx.verifyAdmin(token);
    if (!user.ok) return { result: user.res };
    if ((user.permissions || []).indexOf('settings') < 0) return bad('ليس لديك صلاحية: إدارة المنتجات');
    const uid = user.user_id || '';
    const since = async () => { const [u] = await sql.unsafe('select created_at from mobily.mc_adminusers where user_id = $1', [uid]); return u && u.created_at ? new Date(u.created_at).toISOString() : '-infinity'; };

    if (action === 'list') {
      const [r] = await sql.unsafe(`select json_build_object(
        'categories', (select coalesce(json_agg(c order by c.sort, c.created_at), '[]') from mobily.mc_shop_categories c),
        'products', (select coalesce(json_agg(p order by p.created_at desc), '[]') from (select ${PRODUCT_COLS}, ${STOCK_JSON} from mobily.mc_shop_products p) p)
      ) as data`);
      const d = J(r.data, {});
      d.products = (d.products || []).map((x) => Object.assign(x, { inv: stockView(x) }));
      return ok(d);
    }

    // ---------- الإشعارات + العداد + الملخص (الصفحة بتسأل كل شوية حتى لو الأدمن في شاشة تانية) ----------
    if (action === 'poll' || action === 'notifications') {
      await retryInvoices(sql, ctx, token).catch((e) => console.error(e));
      await periodic(sql).catch((e) => console.error(e));
      const s0 = await since();
      const nl = await notifList(sql, 'admin', '', uid, s0, action === 'notifications' ? 60 : 8);
      const [c] = await sql.unsafe(`select count(*) filter (where status = 'pending')::int pending, coalesce(max(order_no), 0)::int last from mobily.mc_shop_orders`);
      return ok({ pending: c.pending, last: c.last, unread: nl.unread, list: nl.list, me: { role: user.role || '' } });
    }
    if (action === 'readNotifications') { await markRead(sql, 'admin', '', uid, await since(), p.ids === 'all' ? 'all' : p.ids); return ok({ done: true }); }
    if (action === 'orderSummary') {
      const [r] = await sql.unsafe(`select
          count(*) filter (where (created_at at time zone 'Africa/Cairo')::date = (now() at time zone 'Africa/Cairo')::date)::int new_today,
          count(*) filter (where status = 'pending')::int pending,
          count(*) filter (where status = 'approved')::int approved,
          count(*) filter (where status = 'preparing')::int preparing,
          count(*) filter (where status = 'ready' and delivery <> 'delivery')::int ready_pickup,
          count(*) filter (where delivery = 'delivery' and status in ('ready', 'shipped'))::int awaiting_delivery,
          count(*) filter (where status = 'completed')::int completed,
          count(*) filter (where status = 'completed' and invoice_status in ('pending', 'working'))::int awaiting_invoice
        from mobily.mc_shop_orders`);
      return ok(r);
    }

    if (action === 'orders') {
      const rows = await sql.unsafe(`select ${ORDER_COLS},
          (select coalesce(json_agg(json_build_object('from', l.old_status, 's', l.new_status, 'at', l.created_at, 'by', l.actor_name, 'role', l.actor_role, 'reason', l.reason, 'correction', l.correction) order by l.id), '[]')
            from mobily.mc_shop_order_log l where l.order_id = o.id) log
        from mobily.mc_shop_orders o order by o.created_at desc limit 2000`);
      const list = await withImages(sql, rows);
      return ok({ me: { role: user.role || '' }, orders: list.map((o, i) => Object.assign(o, {
        customer_id: rows[i].customer_id, customer_name: rows[i].customer_name, customer_phone: rows[i].customer_phone, member_no: rows[i].member_no,
        admin_notes: rows[i].admin_notes || '', history: J(rows[i].history, []), log: J(rows[i].log, []),
        next: nextStatus(rows[i].status, rows[i].delivery), flow: flowFor(rows[i].delivery), invoice_error: rows[i].invoice_error || '', stock_state: rows[i].stock_state || '',
      })) });
    }

    if (action === 'setOrderStatus' || action === 'correctOrderStatus') {
      if (!UUID.test(T(p.id))) return bad('الطلب غير موجود');
      const st = T(p.status);
      if (ORDER_STATUS.indexOf(st) < 0) return bad('حالة غير معروفة');
      const corr = action === 'correctOrderStatus';
      const reason = T(p.reason).slice(0, 300);
      if (corr && user.role !== 'owner') return bad('تصحيح حالة الطلب للمالك بس');
      if (corr && reason.length < 3) return bad('اكتب سبب التصحيح');
      if (!corr && st === 'rejected' && !reason) return bad('اكتب سبب الرفض علشان يظهر للعميل');
      const [cur] = await sql.unsafe('select status, delivery, invoice_status, invoice_txn_id, order_no from mobily.mc_shop_orders where id = $1', [T(p.id)]);
      if (!cur) return bad('الطلب غير موجود');
      if (p.from && T(p.from) !== cur.status) return bad('حالة الطلب اتغيرت من جهاز تاني. حدّث الصفحة.');
      if (cur.status === st) return bad('الطلب بالفعل في الحالة دي');
      if (!corr) { const fe = flowError(cur.status, st, cur.delivery); if (fe) return bad(fe); }
      if (corr && cur.status === 'completed' && (cur.invoice_status === 'pending' || cur.invoice_status === 'working')) return bad('الطلب لسه بيتعمله فاتورة. استنى دقيقة وجرب تاني.');
      // تصحيح طلب كان «تم إتمام الطلب» وفاتورته اتعملت: الفاتورة بتتلغي بنفس سياسة الإلغاء الموجودة (والنقاط بتترجع)
      if (corr && cur.status === 'completed' && cur.invoice_status === 'done' && cur.invoice_txn_id) {
        const out = await ctx.core({ fn: 'adminApi', args: [token, 'voidTransaction', { txn_id: cur.invoice_txn_id, reason: 'تصحيح حالة طلب أونلاين #' + cur.order_no + ': ' + reason }, ''] });
        const res = out && out.result;
        if (!res || !res.ok) return bad('مينفعش تصحيح الطلب: ' + ((res && res.error) || 'تعذر إلغاء الفاتورة'));
        await sql.unsafe("update mobily.mc_shop_orders set invoice_status = 'void', invoice_txn_id = '' where id = $1", [T(p.id)]);
      }
      const h = JSON.stringify([{ s: st, at: new Date().toISOString(), by: user.name || '' }]);
      const r = await sql.begin(async (tx) => {
        const [o] = await tx.unsafe('select id, order_no, status, items, stock_state from mobily.mc_shop_orders where id = $1 and status = $2 for update', [T(p.id), cur.status]);
        if (!o) return [];
        const ss = await stockTo(tx, o, stockTarget(st), user.name || '');
        await setActor(tx, { id: uid, name: user.name, role: user.role, reason, correction: corr });
        const u = await tx.unsafe(`update mobily.mc_shop_orders set status = $2, stock_state = $5,
            reject_reason = case when $2 in ('rejected','cancelled') then $3 else reject_reason end,
            completed_at = case when $2 = 'completed' then now() else completed_at end,
            invoice_status = case when $2 = 'completed' and invoice_status in ('', 'void') then 'pending'
              when $2 <> 'completed' and invoice_status in ('pending', 'working') then '' else invoice_status end,
            invoice_error = case when $2 = 'completed' then '' else invoice_error end,
            updated_at = now(), history = history || $4::text::jsonb where id = $1 returning id, order_no, customer_id`, [o.id, st, reason, h, ss]);
        if (u.length && st !== 'completed') {
          await notify(tx, { audience: 'customer', customer_id: u[0].customer_id, kind: 'order_status', ref_key: 'st:' + o.id + ':' + st + (corr ? ':' + Date.now() : ''), link: 'shop/orders/' + o.id,
            title: 'طلبك #' + o.order_no + ': ' + ST_AR[st], body: ENDED.indexOf(st) >= 0 && reason && !corr ? 'السبب: ' + reason : 'حالة طلبك اتغيرت إلى «' + ST_AR[st] + '»' });
        }
        return u;
      });
      if (!r.length) return bad('حالة الطلب اتغيرت من جهاز تاني. حدّث الصفحة.');
      let invoice = null;
      if (st === 'completed') invoice = await invoiceOrder(sql, ctx, r[0].id, token);
      return ok({ done: true, invoice });
    }

    if (action === 'retryInvoice') {
      if (!UUID.test(T(p.id))) return bad('الطلب غير موجود');
      await sql.unsafe("update mobily.mc_shop_orders set invoice_claim_at = null where id = $1 and invoice_status = 'pending'", [T(p.id)]);
      const r = await invoiceOrder(sql, ctx, T(p.id), token);
      if (!r) return bad('الطلب ده مش في انتظار فاتورة');
      if (!r.done) return bad('الفاتورة ما اتسجلتش: ' + r.error);
      return ok(r);
    }

    if (action === 'saveOrderNotes') {
      if (!UUID.test(T(p.id))) return bad('الطلب غير موجود');
      const r = await sql.unsafe('update mobily.mc_shop_orders set admin_notes = $2, updated_at = now() where id = $1 returning id', [T(p.id), T(p.notes).slice(0, 1000)]);
      if (!r.length) return bad('الطلب غير موجود');
      return ok({ done: true });
    }

    // ---------- المخزون ----------
    if (action === 'stockMove') {
      if (!UUID.test(T(p.product_id))) return bad('المنتج غير موجود');
      const kind = ['add', 'remove', 'set'].indexOf(p.kind) >= 0 ? p.kind : '';
      if (!kind) return bad('اختار نوع الحركة');
      const qty = int(p.qty, 'الكمية', 1000000);
      if (kind !== 'set' && !(qty > 0)) return bad('اكتب الكمية');
      const color = T(p.color).slice(0, 40);
      const note = T(p.note).slice(0, 200);
      const out = await sql.begin(async (tx) => {
        const [pr] = await tx.unsafe('select id, name, colors from mobily.mc_shop_products where id = $1 for update', [T(p.product_id)]);
        if (!pr) throw new Error('المنتج غير موجود');
        if (colorKeys(pr).indexOf(color) < 0) throw new Error(color ? 'اللون ده مش موجود في المنتج' : 'اختار اللون');
        await tx.unsafe('insert into mobily.mc_shop_stock (product_id, color) values ($1, $2) on conflict do nothing', [pr.id, color]);
        const [s] = await tx.unsafe('select physical, reserved from mobily.mc_shop_stock where product_id = $1 and color = $2 for update', [pr.id, color]);
        const target = kind === 'add' ? s.physical + qty : kind === 'remove' ? s.physical - qty : qty;
        if (target < 0) throw new Error('الرصيد الحالي ' + s.physical + ' بس، مينفعش تنقص ' + qty);
        if (target < s.reserved) throw new Error('فيه ' + s.reserved + ' محجوزين لطلبات مفتوحة، الرصيد مينفعش يقل عن كده');
        if (target === s.physical) throw new Error('الرصيد بالفعل ' + s.physical);
        const [u] = await tx.unsafe('update mobily.mc_shop_stock set physical = $3, updated_at = now() where product_id = $1 and color = $2 returning physical, reserved', [pr.id, color, target]);
        await stockMove(tx, { product_id: pr.id, color, kind, dp: target - s.physical, physical: u.physical, reserved: u.reserved, actor: user.name || '', note });
        return { physical: u.physical, reserved: u.reserved, available: u.physical - u.reserved };
      });
      return ok(out);
    }
    if (action === 'stockMoves') {
      const pid = T(p.product_id);
      const rows = await sql.unsafe(`select id, product_id, product_name, color, kind, d_physical, d_reserved, physical_after, reserved_after, order_id, order_no, actor_name, note, created_at
        from mobily.mc_shop_stock_moves ${UUID.test(pid) ? 'where product_id = $1' : ''} order by id desc limit 300`, UUID.test(pid) ? [pid] : []);
      return ok(rows.map((x) => Object.assign({}, x, { id: Number(x.id), order_no: x.order_no ? Number(x.order_no) : null })));
    }

    // ---------- سجل المكافآت (الترحيب + عيد الميلاد) ----------
    if (action === 'rewardsLog') {
      const welcome = await sql.unsafe(`select l.customer_id, c.name, c.member_no, l.points, l.created_at from mobily.mc_pointsledger l
        left join mobily.mc_customers c on c.customer_id = l.customer_id where l.ref_type = 'welcome' order by l.created_at desc limit 500`);
      const bday = await sql.unsafe(`select b.customer_id, c.name, b.member_no, b.occasion, b.reward_type, b.value, b.gift_text, b.status, b.promo_code, b.invoice_no, b.created_at, b.used_at,
          (select count(*)::int from mobily.mc_shop_orders o join mobily.mc_shop_promos pr on pr.id = o.promo_id where b.promo_code <> '' and pr.code = b.promo_code and o.status not in ('rejected','cancelled')) code_used
        from mobily.mc_birthdayrewards b left join mobily.mc_customers c on c.customer_id = b.customer_id order by b.created_at desc limit 500`);
      return ok({ welcome: welcome.map((x) => Object.assign({}, x, { points: Number(x.points) })), birthday: bday.map((x) => Object.assign({}, x, { value: Number(x.value) })) });
    }

    // ---------- أكواد الخصم ----------
    if (action === 'promos') {
      const today = await cairoToday(sql);
      const rows = await sql.unsafe(`select pr.id, pr.code, pr.kind, pr.value, pr.min_order, pr.max_discount,
          to_char(pr.starts_on, 'YYYY-MM-DD') starts_on, to_char(pr.ends_on, 'YYYY-MM-DD') ends_on, pr.max_uses, pr.per_customer, pr.active,
          pr.product_ids, pr.category_ids, pr.stackable, pr.created_at, pr.customer_id, c.name customer_name,
          (select count(*)::int from mobily.mc_shop_orders o where o.promo_id = pr.id and o.status not in ('rejected','cancelled')) uses,
          (select count(*)::int from mobily.mc_shop_orders o where o.promo_id = pr.id) orders_all,
          (select coalesce(sum(o.promo_discount), 0) from mobily.mc_shop_orders o where o.promo_id = pr.id and o.status not in ('rejected','cancelled')) total_discount
        from mobily.mc_shop_promos pr left join mobily.mc_customers c on c.customer_id = pr.customer_id and pr.customer_id <> '' order by pr.created_at desc`);
      return ok(rows.map((r) => Object.assign({}, r, { today, state: promoState(r, today), value: Number(r.value), min_order: Number(r.min_order), max_discount: Number(r.max_discount), total_discount: Number(r.total_discount) })));
    }

    if (action === 'savePromo') {
      const v = cleanPromo(p);
      const dup = await sql.unsafe('select 1 from mobily.mc_shop_promos where lower(code) = lower($1) and id::text <> $2', [v.code, T(p.id)]);
      if (dup.length) return bad('فيه كود خصم تاني بنفس الاسم');
      const vals = [v.code, v.kind, v.value, v.min_order, v.max_discount, v.starts_on, v.ends_on, v.max_uses, v.per_customer, v.active,
        JSON.stringify(v.product_ids), JSON.stringify(v.category_ids), v.stackable];
      if (p.id) {
        if (!UUID.test(T(p.id))) return bad('الكود غير موجود');
        const r = await sql.unsafe(`update mobily.mc_shop_promos set code=$1, kind=$2, value=$3, min_order=$4, max_discount=$5, starts_on=$6::date, ends_on=$7::date,
          max_uses=$8, per_customer=$9, active=$10, product_ids=$11::text::jsonb, category_ids=$12::text::jsonb, stackable=$13, updated_at=now() where id=$14 returning id`, [...vals, T(p.id)]);
        if (!r.length) return bad('الكود غير موجود');
        return ok({ id: r[0].id });
      }
      const r = await sql.unsafe(`insert into mobily.mc_shop_promos (code, kind, value, min_order, max_discount, starts_on, ends_on, max_uses, per_customer, active, product_ids, category_ids, stackable)
        values ($1,$2,$3,$4,$5,$6::date,$7::date,$8,$9,$10,$11::text::jsonb,$12::text::jsonb,$13) returning id`, vals);
      return ok({ id: r[0].id });
    }

    if (action === 'setPromo') {
      // تفعيل / إيقاف من غير مسح أي بيانات أو سجل استخدام
      if (!UUID.test(T(p.id))) return bad('الكود غير موجود');
      if (p.active) {
        const today = await cairoToday(sql);
        const [pr] = await sql.unsafe(`select pr.*, (select count(*)::int from mobily.mc_shop_orders o where o.promo_id = pr.id and o.status not in ('rejected','cancelled')) uses
          from mobily.mc_shop_promos pr where pr.id = $1`, [T(p.id)]);
        if (!pr) return bad('الكود غير موجود');
        if (pr.ends_on && dateStr(pr.ends_on) < today) return bad('الكود ده انتهت صلاحيته (' + dateStr(pr.ends_on) + '). عدّل تاريخ النهاية الأول علشان تفعّله.');
        if (pr.max_uses > 0 && pr.uses >= pr.max_uses) return bad('الكود ده اتستخدم الحد الأقصى (' + pr.max_uses + ' مرة). زوّد عدد مرات الاستخدام الأول.');
      }
      const r = await sql.unsafe('update mobily.mc_shop_promos set active=$1, updated_at=now() where id=$2 returning id', [!!p.active, T(p.id)]);
      if (!r.length) return bad('الكود غير موجود');
      return ok({ done: true });
    }

    if (action === 'shopSettings') return ok(await shopSettings(sql));

    if (action === 'saveShopSettings') {
      const fee = num(p.delivery_fee, 'مصاريف التوصيل');
      await sql.unsafe(`insert into mobily.mc_shop_settings (id, delivery_enabled, delivery_fee, updated_at) values (1, $1, $2, now())
        on conflict (id) do update set delivery_enabled = excluded.delivery_enabled, delivery_fee = excluded.delivery_fee, updated_at = now()`, [!!p.delivery_enabled, fee]);
      return ok(await shopSettings(sql));
    }

    if (action === 'saveCategory') {
      const name = T(p.name);
      if (!name) return bad('اكتب اسم القسم');
      if (name.length > 60) return bad('اسم القسم طويل جداً');
      const icon = T(p.icon).slice(0, 16);
      const image = T(p.image);
      if (image && !IMG_URL.test(image)) return bad('رابط صورة غير صحيح');
      const dup = await sql.unsafe('select id from mobily.mc_shop_categories where lower(name) = lower($1) and id::text <> $2', [name, T(p.id)]);
      if (dup.length) return bad('فيه قسم بنفس الاسم');
      if (p.id) {
        if (!UUID.test(T(p.id))) return bad('القسم غير موجود');
        const r = await sql.unsafe('update mobily.mc_shop_categories set name=$1, icon=$2, image=$3, hidden=$4, updated_at=now() where id=$5 returning id', [name, icon, image, !!p.hidden, T(p.id)]);
        if (!r.length) return bad('القسم غير موجود');
        return ok({ id: r[0].id });
      }
      const r = await sql.unsafe(`insert into mobily.mc_shop_categories (name, icon, image, hidden, sort)
        values ($1, $2, $3, $4, (select coalesce(max(sort), 0) + 1 from mobily.mc_shop_categories)) returning id`, [name, icon, image, !!p.hidden]);
      return ok({ id: r[0].id });
    }

    if (action === 'orderCategories') {
      const ids = (Array.isArray(p.ids) ? p.ids : []).map(T).filter((x) => UUID.test(x));
      await sql.begin(async (tx) => {
        for (let i = 0; i < ids.length; i++) await tx.unsafe('update mobily.mc_shop_categories set sort=$1 where id=$2', [i + 1, ids[i]]);
      });
      return ok({ done: true });
    }

    if (action === 'deleteCategory') {
      if (!UUID.test(T(p.id))) return bad('القسم غير موجود');
      const [c] = await sql.unsafe('select count(*)::int n from mobily.mc_shop_products where category_id=$1', [T(p.id)]);
      if (c.n > 0) return bad('القسم فيه ' + c.n + ' منتج. انقلهم لقسم تاني أو اخفي القسم بدل المسح');
      await sql.unsafe('delete from mobily.mc_shop_categories where id=$1', [T(p.id)]);
      return ok({ done: true });
    }

    if (action === 'saveProduct') {
      const v = cleanProduct(p);
      if (v.code) {
        const d = await sql.unsafe('select 1 from mobily.mc_shop_products where lower(code) = lower($1) and id::text <> $2', [v.code, T(p.id)]);
        if (d.length) return bad('فيه منتج تاني بنفس الكود');
      }
      if (v.category_id) {
        const c = await sql.unsafe('select 1 from mobily.mc_shop_categories where id=$1', [v.category_id]);
        if (!c.length) return bad('القسم غير موجود');
      }
      const vals = [v.name, v.category_id, v.description, v.price, v.old_price, v.available, v.hidden,
        JSON.stringify(v.images), JSON.stringify(v.specs), JSON.stringify(v.colors), JSON.stringify(v.variants)];
      if (p.id) {
        if (!UUID.test(T(p.id))) return bad('المنتج غير موجود');
        // لون عليه حجز لطلبات مفتوحة مينفعش يتشال من المنتج
        const keys = v.colors.length ? v.colors.map((c) => c.n) : [''];
        const held = await sql.unsafe('select color, reserved from mobily.mc_shop_stock where product_id = $1 and reserved > 0 and not (color = any($2::text[]))', [T(p.id), keys]);
        if (held.length) return bad('مينفعش تشيل ' + (held[0].color ? 'اللون «' + held[0].color + '»' : 'المنتج من غير لون') + '، عليه ' + held[0].reserved + ' محجوزين لطلبات مفتوحة');
        const r = await sql.unsafe(`update mobily.mc_shop_products set name=$1, category_id=$2, description=$3, price=$4, old_price=$5,
          available=$6, hidden=$7, images=$8::text::jsonb, specs=$9::text::jsonb, colors=$10::text::jsonb, variants=$11::text::jsonb, code=$12, low_stock=$14, updated_at=now()
          where id=$13 returning id`, [...vals, v.code, T(p.id), v.low_stock]);
        if (!r.length) return bad('المنتج غير موجود');
        return ok({ id: r[0].id });
      }
      const r = await sql.unsafe(`insert into mobily.mc_shop_products (name, category_id, description, price, old_price, available, hidden, images, specs, colors, variants, code, low_stock)
        values ($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb,$9::text::jsonb,$10::text::jsonb,$11::text::jsonb,$12,$13) returning id`, [...vals, v.code, v.low_stock]);
      return ok({ id: r[0].id });
    }

    if (action === 'setProduct') {
      // تغيير سريع من القائمة: متوفر / ظاهر
      if (!UUID.test(T(p.id))) return bad('المنتج غير موجود');
      const field = p.field === 'available' ? 'available' : p.field === 'hidden' ? 'hidden' : '';
      if (!field) return bad('طلب غير معروف');
      const r = await sql.unsafe(`update mobily.mc_shop_products set ${field}=$1, updated_at=now() where id=$2 returning id`, [!!p.value, T(p.id)]);
      if (!r.length) return bad('المنتج غير موجود');
      return ok({ done: true });
    }

    if (action === 'deleteProduct') {
      if (!UUID.test(T(p.id))) return bad('المنتج غير موجود');
      const [h] = await sql.unsafe('select coalesce(sum(reserved), 0)::int n from mobily.mc_shop_stock where product_id = $1', [T(p.id)]);
      if (h.n > 0) return bad('المنتج عليه ' + h.n + ' محجوزين لطلبات مفتوحة. خلّص الطلبات الأول أو اخفي المنتج.');
      await sql.unsafe('delete from mobily.mc_shop_products where id=$1', [T(p.id)]);
      return ok({ done: true });
    }

    if (action === 'upload') {
      return ok({ url: await ctx.upload(p.dataUrl) });
    }
    return bad('طلب غير معروف');
  } catch (e) {
    if (e && e.userMessage) return bad(e.userMessage);
    if (e && typeof e.message === 'string' && /[؀-ۿ]/.test(e.message)) return bad(e.message);
    console.error(e);
    return bad('حدث خطأ في الخادم، حاول مرة أخرى');
  }
}

export { STOCK_AR };
