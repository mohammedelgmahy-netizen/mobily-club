/**
 * موبايلي - Mobily — «تصفح منتجاتنا»: أقسام ومنتجات المحل.
 * الجداول: mobily.mc_shop_categories و mobily.mc_shop_products (server/shop.sql).
 *   fn 'shop'      → للعميل: catalog (الأقسام والمنتجات الظاهرة فقط)، quote (حساب السلة)، saveAddress، checkout، myOrders، cancelOrder
 *   fn 'shopAdmin' → للإدارة (صلاحية «الإعدادات»): list, saveCategory, orderCategories, deleteCategory,
 *                    saveProduct, setProduct, deleteProduct, upload, orders, setOrderStatus, saveOrderNotes,
 *                    promos, savePromo, setPromo, shopSettings, saveShopSettings
 * الرد بنفس شكل باقي النظام: { result: { ok, data } } أو { result: { ok: false, error } }
 */

import { sendPush, generateVapid } from './push.js';

const T = (s) => String(s === undefined || s === null ? '' : s).trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMG_URL = /^https:\/\/[^\s"'<>]+$/;
const ok = (data) => ({ result: { ok: true, data } });
const bad = (error) => ({ result: { ok: false, error } });

function num(v, name) {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/,/g, ''));
  if (!isFinite(n) || n < 0 || n > 100000000) throw new Error(name + ' غير صحيح');
  return Math.round(n * 100) / 100;
}

function cleanImages(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const im of list.slice(0, 12)) {
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
  const colors = (Array.isArray(p.colors) ? p.colors : []).slice(0, 30)
    .map((c) => ({ n: T(c && c.n).slice(0, 40), c: /^#[0-9a-f]{6}$/i.test(T(c && c.c)) ? T(c.c) : '' })).filter((c) => c.n);
  const variants = (Array.isArray(p.variants) ? p.variants : []).slice(0, 30).map((v) => T(v).slice(0, 60)).filter(Boolean);
  const code = T(p.code).slice(0, 40);
  return {
    name, code,
    category_id: UUID.test(T(p.category_id)) ? T(p.category_id) : null,
    description: T(p.description).slice(0, 8000),
    price, old_price: old,
    available: p.available !== false,
    stock: p.stock === '' || p.stock === null || p.stock === undefined ? null : Math.floor(num(p.stock, 'المخزون')),
    allow_preorder: !!p.allow_preorder,
    hidden: !!p.hidden,
    images: cleanImages(p.images),
    specs, colors, variants,
  };
}

const PRODUCT_COLS = 'id, code, category_id, name, description, price, old_price, available, stock, allow_preorder, hidden, images, specs, colors, variants, created_at, updated_at';
// للعميل: المنتج اللي مخزونه خلص بيظهر «غير متوفر»
const CATALOG_COLS = PRODUCT_COLS.replace('available,', '(available and (stock is null or stock > 0)) as available,');
const CATEGORY_COLS = 'id, name, icon, image, sort, hidden';

async function catalog(sql) {
  const [r] = await sql.unsafe(`select json_build_object(
    'categories', (select coalesce(json_agg(c order by c.sort, c.created_at), '[]') from (select ${CATEGORY_COLS}, created_at from mobily.mc_shop_categories where not hidden) c),
    'products', (select coalesce(json_agg(p order by p.created_at desc), '[]') from (
      select ${CATALOG_COLS} from mobily.mc_shop_products p
      where not p.hidden and (p.category_id is null or p.category_id in (select id from mobily.mc_shop_categories where not hidden))) p)
  ) as data`);
  return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
}


/* ---------------- السلة وإتمام الشراء والطلبات ----------------
 * الأسعار والخصومات بتتحسب هنا في السيرفر من المنتجات وأكواد الخصم الحقيقية،
 * ومفيش أي سعر جاي من التطبيق بيتصدّق. */
export const ORDER_STATUS = ['pending', 'approved', 'preparing', 'ready', 'shipped', 'completed', 'rejected', 'cancelled'];
const ORDER_COLS = `o.id, o.order_no, o.customer_id, o.customer_name, o.customer_phone, o.member_no, o.product_id, o.product_name, o.product_code,
  o.color, o.variant, o.qty, o.unit_price, o.total, o.notes, o.status, o.reject_reason, o.history, o.created_at, o.updated_at,
  o.items, o.subtotal, o.product_discount, o.promo_code, o.promo_discount, o.shipping, o.method, o.delivery, o.address, o.admin_notes, o.branch_id, o.branch_name,
  o.invoice_status, o.invoice_no, o.invoice_points, o.invoice_error`;
const money2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const PROMO_CODE = /^[A-Za-z0-9_-]{3,30}$/;

async function customerByToken(sql, token) {
  const t = T(token);
  if (!/^[a-f0-9]{64}$/.test(t)) throw new Error('افتح الكارت بتاعك الأول علشان تقدر تطلب');
  const r = await sql.unsafe('select customer_id, name, phone, member_no, status from mobily.mc_customers where access_token = $1', [t]);
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

function promoStatusMsg(pr, today) {
  if (!pr || !pr.active) return 'كود الخصم غير صحيح';
  if (pr.starts_on && String(pr.starts_on) > today) return 'كود الخصم غير صحيح';
  if (pr.ends_on && String(pr.ends_on) < today) return 'كود الخصم انتهت صلاحيته';
  return '';
}
const dateStr = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d).slice(0, 10) : null);

/**
 * حساب الطلب: المنتجات بأسعارها الحالية + خصومات المنتجات + كود الخصم + الشحن.
 * q = sql أو transaction. lockPromo = نقفل صف الكود وقت تأكيد الطلب علشان عدد مرات الاستخدام يتحسب صح.
 */
async function quote(q, customer, p, lockPromo) {
  const items = cleanItems(p.items);
  const ids = [...new Set(items.map((i) => i.product_id))];
  const prods = await q.unsafe(`select p.id, p.name, p.code, p.price, p.old_price, p.available, p.stock, p.allow_preorder, p.hidden, p.colors, p.variants, p.category_id,
      coalesce(p.images->0->>'t', p.images->0->>'u', '') as image,
      (p.category_id is null or exists (select 1 from mobily.mc_shop_categories k where k.id = p.category_id and not k.hidden)) as cat_ok
    from mobily.mc_shop_products p where p.id = any($1::uuid[])`, [ids]);
  const byId = new Map(prods.map((r) => [r.id, r]));
  const need = {}; items.forEach((it) => { need[it.product_id] = (need[it.product_id] || 0) + it.qty; });
  const lines = items.map((it) => {
    const pr = byId.get(it.product_id);
    const line = { product_id: it.product_id, name: pr ? pr.name : '', code: pr ? pr.code || '' : '', image: pr ? pr.image : '', category_id: pr ? pr.category_id : null,
      color: it.color, variant: it.variant, qty: it.qty, unit_price: 0, old_price: 0, line_subtotal: 0, line_discount: 0, line_total: 0, error: '' };
    if (!pr || pr.hidden || !pr.cat_ok) { line.error = 'المنتج ده مش متاح دلوقتي'; return line; }
    // التوفر والمخزون (لو المخزون متسجل)، والطلب المسبق لو الإدارة سامحة بيه
    const tracked = pr.stock !== null && pr.stock !== undefined;
    const effAvail = pr.available && (!tracked || pr.stock > 0);
    if (!effAvail) { if (pr.allow_preorder) line.preorder = true; else line.error = 'غير متوفر حالياً'; }
    else if (tracked && need[it.product_id] > pr.stock) { if (pr.allow_preorder) line.preorder = true; else line.error = 'المتاح من المنتج ده ' + pr.stock + ' بس'; }
    if (tracked) line.stock = pr.stock;
    const colors = (Array.isArray(pr.colors) ? pr.colors : []).map((x) => x && x.n);
    const variants = Array.isArray(pr.variants) ? pr.variants : [];
    if (!line.error && colors.length && colors.indexOf(it.color) < 0) line.error = 'اختار اللون';
    if (!line.error && !colors.length && it.color) line.error = 'اللون ده مبقاش متاح';
    if (!line.error && variants.length && variants.indexOf(it.variant) < 0) line.error = 'اختار النوع';
    if (!line.error && !variants.length && it.variant) line.error = 'النوع ده مبقاش متاح';
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
    const today = (await q.unsafe("select to_char((now() at time zone 'Africa/Cairo')::date, 'YYYY-MM-DD') d"))[0].d;
    const rows = PROMO_CODE.test(code)
      ? await q.unsafe(`select * from mobily.mc_shop_promos where lower(code) = lower($1)${lockPromo ? ' for update' : ''}`, [code]) : [];
    const pr = rows[0];
    const st = promoStatusMsg(pr && Object.assign({}, pr, { starts_on: dateStr(pr.starts_on), ends_on: dateStr(pr.ends_on) }), today);
    if (st) promo.message = st;
    else {
      promo.code = pr.code; promo.id = pr.id;
      const [u] = await q.unsafe(`select count(*)::int n, count(*) filter (where customer_id = $2)::int mine from mobily.mc_shop_orders
        where promo_id = $1 and status not in ('rejected','cancelled')`, [pr.id, customer.customer_id]);
      const pids = Array.isArray(pr.product_ids) ? pr.product_ids : [], cids = Array.isArray(pr.category_ids) ? pr.category_ids : [];
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
    if (badLine) throw new Error((badLine.name ? '«' + badLine.name + '»: ' : '') + badLine.error);
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
      unit_price: l.unit_price, old_price: l.old_price, line_subtotal: l.line_subtotal, line_discount: l.line_discount, line_total: l.line_total, preorder: !!l.preorder }));
    await takeStock(tx, items);
    const first = items[0];
    const qtySum = items.reduce((s, i) => s + i.qty, 0);
    const title = first.name + (items.length > 1 ? ' + ' + (items.length - 1) + ' منتج تاني' : '');
    const hist = JSON.stringify([{ s: 'pending', at: new Date().toISOString(), by: 'customer' }]);
    const [o] = await tx.unsafe(`insert into mobily.mc_shop_orders (order_no, customer_id, customer_name, customer_phone, member_no, product_id, product_name, product_code,
        color, variant, qty, unit_price, total, notes, status, history, items, subtotal, product_discount, promo_id, promo_code, promo_discount, shipping, method, delivery, address,
        branch_id, branch_name)
      values (nextval('mobily.mc_shop_order_no'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14::text::jsonb, $15::text::jsonb,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26) returning id, order_no`,
      [c.customer_id, c.name, c.phone, c.member_no, first.product_id, title, first.code || '', first.color, first.variant, qtySum, first.unit_price, qt.total, notes, hist,
        JSON.stringify(items), qt.subtotal, qt.product_discount, qt.promo && qt.promo.ok ? qt.promo.id : null, qt.promo && qt.promo.ok ? qt.promo.code : '',
        qt.promo_discount, qt.shipping, method, delivery, delivery === 'delivery' ? address : '', branch ? branch.id : '', branch ? branch.name : '']);
    return { id: o.id, order_no: Number(o.order_no), total: qt.total, customer: c.name, delivery };
  });
}

/* ---------------- المخزون ----------------
 * لو المنتج له مخزون متسجل: الطلب بياخد الكمية من المخزون، ولو اتلغى أو اترفض بترجع.
 * taken = الكمية اللي اتخصمت فعلاً (علشان الطلب المسبق ما يرجّعش كمية ما اتخصمتش). */
async function takeStock(tx, items) {
  for (const it of items) {
    it.taken = 0;
    if (!it.product_id) continue;
    const [r] = await tx.unsafe('select stock from mobily.mc_shop_products where id = $1 for update', [it.product_id]);
    if (!r || r.stock === null) continue;
    const t = Math.min(Number(r.stock), Number(it.qty));
    if (t > 0) await tx.unsafe('update mobily.mc_shop_products set stock = stock - $2, updated_at = now() where id = $1', [it.product_id, t]);
    it.taken = t;
  }
  return items;
}
async function returnStock(tx, items) {
  for (const it of items) {
    if (it.product_id && Number(it.taken) > 0) await tx.unsafe('update mobily.mc_shop_products set stock = stock + $2, updated_at = now() where id = $1 and stock is not null', [it.product_id, Number(it.taken)]);
    it.taken = 0;
  }
  return items;
}
const ENDED = ['rejected', 'cancelled'];
async function moveStatus(tx, id, st, extraWhere, params) {
  const [o] = await tx.unsafe(`select status, items from mobily.mc_shop_orders where id = $1 ${extraWhere} for update`, [id, ...params]);
  if (!o) return null;
  const items = Array.isArray(o.items) ? o.items : [];
  if (ENDED.indexOf(st) >= 0 && ENDED.indexOf(o.status) < 0) await returnStock(tx, items);
  else if (ENDED.indexOf(st) < 0 && ENDED.indexOf(o.status) >= 0) await takeStock(tx, items);
  return { old: o.status, items };
}

/* ---------------- مسار حالة الطلب (للأمام بس) ----------------
 * نفس القواعد موجودة كمان جوه قاعدة البيانات (trigger) علشان محدش يقدر يتخطاها بطلب مباشر. */
const FINAL = ['completed', 'rejected', 'cancelled'];
export function nextStatus(st, delivery) {
  return { pending: 'approved', approved: 'preparing', preparing: delivery === 'delivery' ? 'shipped' : 'ready', ready: 'completed', shipped: 'completed' }[st] || null;
}
export function flowFor(delivery) {
  return ['pending', 'approved', 'preparing', delivery === 'delivery' ? 'shipped' : 'ready', 'completed'];
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

/* ---------------- فاتورة المبيعات والنقاط للطلب الأونلاين ----------------
 * أول ما الطلب يبقى «تم إتمام الطلب»: بنعمل فاتورة مبيعات حقيقية في نظام المبيعات الموجود (نفس «تسجيل بيع»)
 * بنفس قواعد النقاط المتسجلة في الإعدادات، والنقاط بتتضاف لمحفظة العميل الموجودة.
 * لو الفاتورة فشلت لأي سبب: النقاط بتفضل معلقة وبنحاول تاني تلقائي لحد ما تنجح. ومفيش أي طلب ياخد نقاط مرتين. */
const ONLINE_CAT = 'طلبات أونلاين';
async function invoiceOrder(sql, ctx, id, token) {
  if (!ctx.core) return null;
  const [o] = await sql.unsafe(`update mobily.mc_shop_orders set invoice_status = 'working', invoice_claim_at = now()
    where id = $1 and status = 'completed' and (invoice_status = 'pending' or (invoice_status = 'working' and invoice_claim_at < now() - interval '2 minutes'))
    returning id, order_no, customer_id, total, shipping`, [id]);
  if (!o) return null;
  const invNo = 'ONL-' + o.order_no;
  const finish = async (txn, pts, no) => {
    await sql.unsafe(`update mobily.mc_shop_orders set invoice_status = 'done', invoice_no = $2, invoice_txn_id = $3, invoice_points = $4, invoice_error = '', invoice_at = now()
      where id = $1 and invoice_status = 'working'`, [o.id, no, txn, pts]);
    return { done: true, invoice_no: no, points: pts };
  };
  try {
    // لو الفاتورة اتعملت قبل كده (مثلاً الرد اتقطع) نربطها بس، من غير فاتورة تانية
    const [ex] = await sql.unsafe("select txn_id, invoice_no, points_earned from mobily.mc_transactions where customer_id = $1 and upper(invoice_no) = $2 and status <> 'void' limit 1", [o.customer_id, invNo]);
    if (ex) return await finish(ex.txn_id, Number(ex.points_earned || 0), ex.invoice_no);
    const amount = money2(Number(o.total) - Number(o.shipping || 0));
    if (!(amount > 0)) return await finish('', 0, '');
    const out = await ctx.core({ fn: 'adminApi', args: [token, 'checkout', { customer_id: o.customer_id, amount, invoice_no: invNo, category: ONLINE_CAT }, ''] });
    const res = out && out.result;
    if (res && res.ok) {
      const pts = Number((res.data.quote && res.data.quote.points_earned) || 0);
      const r = await finish(res.data.txn_id, pts, invNo);
      if (pts > 0) await notifyCustomer(sql, ctx, o.customer_id, { title: '🎉 كسبت ' + pts + ' نقطة', body: 'من طلبك #' + o.order_no + '. رصيدك دلوقتي ' + res.data.balance + ' نقطة', tag: 'p' + o.order_no }, '');
      return r;
    }
    const msg = (res && res.error) || 'تعذر عمل الفاتورة';
    await sql.unsafe("update mobily.mc_shop_orders set invoice_status = 'pending', invoice_error = $2 where id = $1 and invoice_status = 'working'", [o.id, msg.slice(0, 300)]);
    return { done: false, error: msg };
  } catch (e) {
    console.error(e);
    await sql.unsafe("update mobily.mc_shop_orders set invoice_status = 'pending', invoice_error = $2 where id = $1 and invoice_status = 'working'", [o.id, 'حدث خطأ، هنحاول تاني تلقائي']).catch(() => {});
    return { done: false, error: 'حدث خطأ' };
  }
}
async function retryInvoices(sql, ctx, token) {
  const rows = await sql.unsafe(`select id from mobily.mc_shop_orders where status = 'completed' and (invoice_status = 'pending' or (invoice_status = 'working' and invoice_claim_at < now() - interval '2 minutes'))
    order by updated_at limit 3`);
  for (const r of rows) await invoiceOrder(sql, ctx, r.id, token);
}

/* ---------------- الإشعارات (Web Push) ---------------- */
const ST_AR = { pending: 'قيد المراجعة', approved: 'تم قبول الطلب', preparing: 'جاري التجهيز', ready: 'جاهز للاستلام', shipped: 'تم الشحن', completed: 'تم إتمام الطلب', rejected: 'مرفوض', cancelled: 'ملغي' };
let VAPID = null;
async function vapid(sql) {
  if (VAPID) return VAPID;
  let r = await sql.unsafe("select key, value from mobily.mc_props where key in ('VAPID_PUBLIC', 'VAPID_PRIVATE')");
  if (r.length < 2) {
    const k = await generateVapid();
    await sql.unsafe("insert into mobily.mc_props (key, value) values ('VAPID_PUBLIC', $1), ('VAPID_PRIVATE', $2) on conflict (key) do nothing", [k.publicKey, k.privateKey]);
    r = await sql.unsafe("select key, value from mobily.mc_props where key in ('VAPID_PUBLIC', 'VAPID_PRIVATE')");
  }
  const m = {}; r.forEach((x) => { m[x.key] = x.value; });
  VAPID = { publicKey: m.VAPID_PUBLIC, privateKey: m.VAPID_PRIVATE, subject: 'https://mohammedelgmahy-netizen.github.io/mobily-club/' };
  return VAPID;
}
async function pushTo(sql, ctx, subs, msg, hash) {
  if (!subs.length) return [];
  const v = await vapid(sql);
  return Promise.all(subs.map(async (s) => {
    const st = await sendPush(s, Object.assign({}, msg, { url: (s.page_url || '') + (hash || '') }), v, ctx.pushFetch);
    if (st === 404 || st === 410) await sql.unsafe('delete from mobily.mc_push_subs where endpoint = $1', [s.endpoint]).catch(() => {});
    return st;
  })).catch((e) => { console.error(e); return []; });
}
function notifyCustomer(sql, ctx, customerId, msg, hash) {
  return sql.unsafe("select endpoint, p256dh, auth, page_url from mobily.mc_push_subs where kind = 'customer' and customer_id = $1", [customerId])
    .then((subs) => pushTo(sql, ctx, subs, msg, hash)).catch((e) => { console.error(e); });
}
function notifyAdmins(sql, ctx, msg, hash) {
  return sql.unsafe("select endpoint, p256dh, auth, page_url from mobily.mc_push_subs where kind = 'admin'")
    .then((subs) => pushTo(sql, ctx, subs, msg, hash)).catch((e) => { console.error(e); });
}
async function subscribe(sql, ctx, p, kind, customerId, userName) {
  const sub = p.sub || {}, keys = sub.keys || {};
  const endpoint = T(sub.endpoint), p256dh = T(keys.p256dh), auth = T(keys.auth);
  if (!/^https:\/\/[^\s"'<>]{10,800}$/.test(endpoint) || !/^[A-Za-z0-9_-]{80,100}$/.test(p256dh) || !/^[A-Za-z0-9_-]{16,30}$/.test(auth)) throw new Error('تعذر تفعيل الإشعارات على الجهاز ده');
  const url = T(p.url).split('#')[0];
  if (!/^https:\/\/[^\s"'<>]{5,700}$/.test(url)) throw new Error('تعذر تفعيل الإشعارات على الجهاز ده');
  await sql.unsafe(`insert into mobily.mc_push_subs (endpoint, p256dh, auth, kind, customer_id, user_name, page_url, updated_at) values ($1, $2, $3, $4, $5, $6, $7, now())
    on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, kind = excluded.kind, customer_id = excluded.customer_id,
      user_name = excluded.user_name, page_url = excluded.page_url, updated_at = now()`, [endpoint, p256dh, auth, kind, customerId || '', userName || '', url]);
  if (!p.confirm) return { ok: true };
  // إشعار تجريبي علشان نتأكد إنه وصل فعلاً
  const [st] = await pushTo(sql, ctx, [{ endpoint, p256dh, auth, page_url: url }], { title: 'موبايلي - Mobily', body: 'تم تفعيل الإشعارات ✓' }, kind === 'admin' ? '' : '#shop/orders');
  if (!(st >= 200 && st < 300)) throw new Error('تعذر إرسال إشعار للجهاز ده (' + (st || 'مفيش اتصال') + ')');
  return { ok: true, sent: true };
}

async function withImages(sql, rows) {
  const ids = new Set();
  rows.forEach((o) => (Array.isArray(o.items) ? o.items : []).forEach((i) => { if (i && UUID.test(String(i.product_id || ''))) ids.add(i.product_id); }));
  const map = new Map();
  if (ids.size) {
    const r = await sql.unsafe("select id, coalesce(images->0->>'t', images->0->>'u', '') im from mobily.mc_shop_products where id = any($1::uuid[])", [[...ids]]);
    r.forEach((x) => map.set(x.id, x.im));
  }
  return rows.map((o) => publicOrder(o, map));
}

async function customerShop(sql, ctx, action, p) {
  const c = await customerByToken(sql, p.token);
  if (action === 'myOrders') {
    const rows = await sql.unsafe(`select ${ORDER_COLS} from mobily.mc_shop_orders o where o.customer_id = $1 order by o.created_at desc limit 200`, [c.customer_id]);
    return withImages(sql, rows);
  }
  if (action === 'summary') {
    // لوحة العميل: طلبات الأونلاين + فواتير المحل مع بعض، من غير ما الطلب الأونلاين يتحسب مرتين بعد ما فاتورته تتعمل
    const [o] = await sql.unsafe(`select count(*) filter (where status not in ('cancelled','rejected'))::int online,
        count(*) filter (where status in ('pending','approved','preparing','ready','shipped'))::int active,
        count(*) filter (where status = 'completed')::int completed,
        count(*) filter (where status in ('cancelled','rejected'))::int cancelled,
        coalesce(sum(total - shipping) filter (where status = 'completed' and invoice_status <> 'done'), 0) value_no_invoice,
        coalesce(json_agg(invoice_no) filter (where invoice_no <> ''), '[]') invoices
      from mobily.mc_shop_orders where customer_id = $1`, [c.customer_id]);
    const [t] = await sql.unsafe(`select count(*) filter (where not exists (select 1 from mobily.mc_shop_orders o where o.invoice_txn_id = t.txn_id))::int store,
        coalesce(sum(t.net_amount), 0) value
      from mobily.mc_transactions t where t.customer_id = $1 and t.status <> 'void'`, [c.customer_id]);
    return {
      total: o.online + t.store, active: o.active, completed: o.completed + t.store, cancelled: o.cancelled,
      online: o.online, store: t.store, value: money2(Number(t.value) + Number(o.value_no_invoice)),
      online_invoices: typeof o.invoices === 'string' ? JSON.parse(o.invoices) : o.invoices,
    };
  }
  if (action === 'quote') return quote(sql, c, p, false);
  if (action === 'saveAddress') { // عنوان التوصيل المحفوظ في حساب العميل
    const a = T(p.address).slice(0, 500);
    if (a.length < 5) throw new Error('اكتب العنوان بالتفصيل');
    await sql.unsafe(`insert into mobily.mc_shop_addresses (customer_id, address, updated_at) values ($1, $2, now())
      on conflict (customer_id) do update set address = excluded.address, updated_at = now()`, [c.customer_id, a]);
    return { address: a };
  }
  if (action === 'pushKey') return { key: (await vapid(sql)).publicKey };
  if (action === 'pushSubscribe') return subscribe(sql, ctx, p, 'customer', c.customer_id, '');
  if (action === 'checkout' || action === 'order') {
    const r = await checkout(sql, c, action === 'order' // النسخة القديمة من الصفحة (منتج واحد)
      ? { items: [{ product_id: p.product_id, color: p.color, variant: p.variant, qty: p.qty }], notes: p.notes, method: 'buy_now' } : p);
    await notifyAdmins(sql, ctx, { title: '🛒 طلب جديد #' + r.order_no, body: r.customer + ' · ' + r.total + ' ج.م · ' + (r.delivery === 'delivery' ? 'توصيل' : 'استلام من الفرع'), tag: 'o' + r.order_no });
    return { id: r.id, order_no: r.order_no, total: r.total };
  }
  if (action === 'cancelOrder') {
    if (!UUID.test(T(p.id))) throw new Error('الطلب غير موجود');
    const r = await sql.begin(async (tx) => {
      const mv = await moveStatus(tx, T(p.id), 'cancelled', "and customer_id = $2 and status = 'pending'", [c.customer_id]);
      if (!mv) return [];
      await setActor(tx, { id: c.customer_id, name: c.name, role: 'customer', reason: 'العميل لغى الطلب' });
      return tx.unsafe(`update mobily.mc_shop_orders set status = 'cancelled', updated_at = now(), items = $3::text::jsonb,
          history = history || $4::text::jsonb
        where id = $1 and customer_id = $2 returning id, order_no`,
        [T(p.id), c.customer_id, JSON.stringify(mv.items), JSON.stringify([{ s: 'cancelled', at: new Date().toISOString(), by: 'customer' }])]);
    });
    if (!r.length) throw new Error('الطلب ده مينفعش يتلغي، المحل بدأ فيه بالفعل. كلم المحل.');
    await notifyAdmins(sql, ctx, { title: 'طلب #' + r[0].order_no + ' اتلغى', body: 'العميل ' + c.name + ' لغى الطلب', tag: 'o' + r[0].order_no });
    return { done: true };
  }
  throw new Error('طلب غير معروف');
}

function publicOrder(o, imgs) {
  const items = (Array.isArray(o.items) ? o.items : []).map((i) => ({
    product_id: i.product_id, name: i.name, code: i.code || '', color: i.color || '', variant: i.variant || '', qty: Number(i.qty),
    unit_price: Number(i.unit_price), old_price: Number(i.old_price || 0), line_subtotal: Number(i.line_subtotal || 0),
    line_discount: Number(i.line_discount || 0), line_total: Number(i.line_total || 0), image: (imgs && imgs.get(i.product_id)) || '', preorder: !!i.preorder,
  }));
  return {
    id: o.id, order_no: Number(o.order_no), product_id: o.product_id, product_name: o.product_name, product_code: o.product_code,
    color: o.color, variant: o.variant, qty: o.qty, unit_price: Number(o.unit_price), total: Number(o.total), notes: o.notes,
    items, subtotal: Number(o.subtotal), product_discount: Number(o.product_discount), promo_code: o.promo_code || '', promo_discount: Number(o.promo_discount),
    shipping: Number(o.shipping), method: o.method, delivery: o.delivery, address: o.address || '', branch_name: o.branch_name || '',
    status: o.status, reject_reason: o.reject_reason, image: items[0] ? items[0].image : '', created_at: o.created_at, updated_at: o.updated_at,
    history: (Array.isArray(o.history) ? o.history : []).map((h) => ({ s: h.s, at: h.at })),
    invoice_status: o.invoice_status || '', invoice_no: o.invoice_no || '', invoice_points: Number(o.invoice_points || 0),
  };
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
  const int = (v, n) => { const x = num(v, n); if (x !== Math.floor(x)) throw new Error(n + ' لازم يكون رقم صحيح'); return Math.min(x, 1000000); };
  return {
    code, kind, value,
    min_order: num(p.min_order, 'الحد الأدنى للطلب'),
    max_discount: kind === 'percent' ? num(p.max_discount, 'أقصى خصم') : 0,
    starts_on, ends_on,
    max_uses: int(p.max_uses, 'عدد مرات الاستخدام'),
    per_customer: int(p.per_customer, 'عدد مرات الاستخدام لكل عميل'),
    active: p.active !== false,
    product_ids: (Array.isArray(p.product_ids) ? p.product_ids : []).map(T).filter((x) => UUID.test(x)).slice(0, 500),
    category_ids: (Array.isArray(p.category_ids) ? p.category_ids : []).map(T).filter((x) => UUID.test(x)).slice(0, 100),
    stackable: p.stackable !== false,
  };
}


/**
 * ctx: { sql, verifyAdmin: async (token) => user|throws, upload: async (dataUrl) => url }
 */
export async function handleShop(body, ctx) {
  const fn = body && body.fn;
  const args = Array.isArray(body && body.args) ? body.args : [];
  const { sql } = ctx;
  try {
    if (fn === 'shop') {
      if (args[0] === 'catalog') return ok(await catalog(sql));
      if (['order', 'quote', 'saveAddress', 'checkout', 'myOrders', 'cancelOrder', 'pushKey', 'pushSubscribe', 'summary'].indexOf(args[0]) >= 0) return ok(await customerShop(sql, ctx, args[0], args[1] && typeof args[1] === 'object' ? args[1] : {}));
      return bad('طلب غير معروف');
    }
    // ---------- الإدارة ----------
    const [token, action] = [args[0], args[1]];
    // token بيتستخدم كمان لعمل فاتورة المبيعات باسم الأدمن اللي أتم الطلب (بنفس صلاحياته)
    const p = args[2] && typeof args[2] === 'object' ? args[2] : {};
    const user = await ctx.verifyAdmin(token);
    if (!user.ok) return { result: user.res };
    if ((user.permissions || []).indexOf('settings') < 0) return bad('ليس لديك صلاحية: إدارة المنتجات');

    if (action === 'list') {
      const [r] = await sql.unsafe(`select json_build_object(
        'categories', (select coalesce(json_agg(c order by c.sort, c.created_at), '[]') from mobily.mc_shop_categories c),
        'products', (select coalesce(json_agg(p order by p.created_at desc), '[]') from (select ${PRODUCT_COLS} from mobily.mc_shop_products) p)
      ) as data`);
      return ok(typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
    }


    if (action === 'orders') {
      const rows = await sql.unsafe(`select ${ORDER_COLS}, (s.order_id is null and o.created_at >= coalesce(u.created_at, '-infinity')) unread,
          (select coalesce(json_agg(json_build_object('from', l.old_status, 's', l.new_status, 'at', l.created_at, 'by', l.actor_name, 'role', l.actor_role, 'reason', l.reason, 'correction', l.correction) order by l.id), '[]')
            from mobily.mc_shop_order_log l where l.order_id = o.id) log
        from mobily.mc_shop_orders o left join mobily.mc_shop_order_seen s on s.order_id = o.id and s.user_id = $1
        left join mobily.mc_adminusers u on u.user_id = $1 order by o.created_at desc limit 2000`, [user.user_id || '']);
      const list = await withImages(sql, rows);
      return ok({ me: { role: user.role || '' }, orders: list.map((o, i) => Object.assign(o, {
        customer_id: rows[i].customer_id, customer_name: rows[i].customer_name, customer_phone: rows[i].customer_phone, member_no: rows[i].member_no,
        admin_notes: rows[i].admin_notes || '', history: Array.isArray(rows[i].history) ? rows[i].history : [], unread: !!rows[i].unread,
        log: typeof rows[i].log === 'string' ? JSON.parse(rows[i].log) : rows[i].log || [], next: nextStatus(rows[i].status, rows[i].delivery), flow: flowFor(rows[i].delivery),
        invoice_error: rows[i].invoice_error || '',
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
      // تصحيح طلب كان «تم إتمام الطلب» وفاتورته اتعملت: الفاتورة بتتلغي بنفس سياسة الإلغاء الموجودة (والنقاط بتترجع)
      if (corr && cur.status === 'completed' && cur.invoice_status === 'done' && cur.invoice_txn_id) {
        const out = await ctx.core({ fn: 'adminApi', args: [token, 'voidTransaction', { txn_id: cur.invoice_txn_id, reason: 'تصحيح حالة طلب أونلاين #' + cur.order_no + ': ' + reason }, ''] });
        const res = out && out.result;
        if (!res || !res.ok) return bad('مينفعش تصحيح الطلب: ' + ((res && res.error) || 'تعذر إلغاء الفاتورة'));
        await sql.unsafe("update mobily.mc_shop_orders set invoice_status = 'void' where id = $1", [T(p.id)]);
      }
      const h = JSON.stringify([{ s: st, at: new Date().toISOString(), by: user.name || '' }]);
      const r = await sql.begin(async (tx) => {
        const mv = await moveStatus(tx, T(p.id), st, 'and status = $2', [cur.status]);
        if (!mv) return [];
        await setActor(tx, { id: user.user_id, name: user.name, role: user.role, reason, correction: corr });
        return tx.unsafe(`update mobily.mc_shop_orders set status = $2, items = $5::text::jsonb,
            reject_reason = case when $2 in ('rejected','cancelled') then $3 else reject_reason end,
            invoice_status = case when $2 = 'completed' and invoice_status in ('', 'void') then 'pending'
              when $2 <> 'completed' and invoice_status in ('pending', 'working') then '' else invoice_status end,
            updated_at = now(), history = history || $4::text::jsonb where id = $1 and status = $6 returning id, order_no, customer_id`, [T(p.id), st, reason, h, JSON.stringify(mv.items), cur.status]);
      });
      if (!r.length) return bad('حالة الطلب اتغيرت من جهاز تاني. حدّث الصفحة.');
      // إشعار للعميل بالحالة الجديدة
      await notifyCustomer(sql, ctx, r[0].customer_id, { title: 'طلبك #' + r[0].order_no, body: 'حالة الطلب: ' + ST_AR[st] + (ENDED.indexOf(st) >= 0 && reason && !corr ? ' — ' + reason : ''), tag: 'o' + r[0].order_no },
        '#shop/orders/' + r[0].id);
      let invoice = null;
      if (st === 'completed') invoice = await invoiceOrder(sql, ctx, r[0].id, token);
      return ok({ done: true, invoice });
    }

    if (action === 'pushKey') return ok({ key: (await vapid(sql)).publicKey });
    if (action === 'pushSubscribe') return ok(await subscribe(sql, ctx, p, 'admin', '', user.name || ''));
    if (action === 'pendingCount' || action === 'notifications') {
      // الطلبات الجديدة اللي الأدمن ده لسه ما فتحهاش (كل أدمن ليه عداده لوحده)
      await retryInvoices(sql, ctx, token).catch((e) => console.error(e));
      const [r] = await sql.unsafe(`select count(*) filter (where o.status = 'pending')::int n, coalesce(max(o.order_no), 0)::int last,
          count(*) filter (where s.order_id is null and o.created_at >= coalesce(u.created_at, '-infinity'))::int unread
        from mobily.mc_shop_orders o left join mobily.mc_shop_order_seen s on s.order_id = o.id and s.user_id = $1
        left join mobily.mc_adminusers u on u.user_id = $1`, [user.user_id || '']);
      const out = { pending: r.n, last: r.last, unread: r.unread };
      if (action === 'notifications') {
        out.list = (await sql.unsafe(`select o.id, o.order_no, o.customer_name, o.total, o.delivery, o.status, o.created_at,
            (s.order_id is null and o.created_at >= coalesce(u.created_at, '-infinity')) unread
          from mobily.mc_shop_orders o left join mobily.mc_shop_order_seen s on s.order_id = o.id and s.user_id = $1
          left join mobily.mc_adminusers u on u.user_id = $1 order by o.created_at desc limit 30`, [user.user_id || ''])).map((x) => Object.assign({}, x, { order_no: Number(x.order_no), total: Number(x.total) }));
      }
      return ok(out);
    }
    if (action === 'seenOrder') {
      if (!UUID.test(T(p.id))) return bad('الطلب غير موجود');
      await sql.unsafe('insert into mobily.mc_shop_order_seen (user_id, order_id) select $1, id from mobily.mc_shop_orders where id = $2 on conflict do nothing', [user.user_id || '', T(p.id)]);
      return ok({ done: true });
    }
    if (action === 'retryInvoice') {
      if (!UUID.test(T(p.id))) return bad('الطلب غير موجود');
      await sql.unsafe("update mobily.mc_shop_orders set invoice_claim_at = null where id = $1 and invoice_status = 'pending'", [T(p.id)]);
      return ok(await invoiceOrder(sql, ctx, T(p.id), token) || { done: false });
    }

    if (action === 'saveOrderNotes') {
      if (!UUID.test(T(p.id))) return bad('الطلب غير موجود');
      const r = await sql.unsafe('update mobily.mc_shop_orders set admin_notes = $2, updated_at = now() where id = $1 returning id', [T(p.id), T(p.notes).slice(0, 1000)]);
      if (!r.length) return bad('الطلب غير موجود');
      return ok({ done: true });
    }

    if (action === 'promos') {
      const rows = await sql.unsafe(`select pr.id, pr.code, pr.kind, pr.value, pr.min_order, pr.max_discount,
          to_char(pr.starts_on, 'YYYY-MM-DD') starts_on, to_char(pr.ends_on, 'YYYY-MM-DD') ends_on, pr.max_uses, pr.per_customer, pr.active,
          pr.product_ids, pr.category_ids, pr.stackable, pr.created_at,
          to_char((now() at time zone 'Africa/Cairo')::date, 'YYYY-MM-DD') today,
          (select count(*)::int from mobily.mc_shop_orders o where o.promo_id = pr.id and o.status not in ('rejected','cancelled')) uses,
          (select coalesce(sum(o.promo_discount), 0) from mobily.mc_shop_orders o where o.promo_id = pr.id and o.status not in ('rejected','cancelled')) total_discount
        from mobily.mc_shop_promos pr order by pr.created_at desc`);
      return ok(rows.map((r) => Object.assign({}, r, { value: Number(r.value), min_order: Number(r.min_order), max_discount: Number(r.max_discount), total_discount: Number(r.total_discount) })));
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
      if (!UUID.test(T(p.id))) return bad('الكود غير موجود');
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
        const r = await sql.unsafe(`update mobily.mc_shop_products set name=$1, category_id=$2, description=$3, price=$4, old_price=$5,
          available=$6, hidden=$7, images=$8::text::jsonb, specs=$9::text::jsonb, colors=$10::text::jsonb, variants=$11::text::jsonb, code=$12, stock=$14, allow_preorder=$15, updated_at=now()
          where id=$13 returning id`, [...vals, v.code, T(p.id), v.stock, v.allow_preorder]);
        if (!r.length) return bad('المنتج غير موجود');
        return ok({ id: r[0].id });
      }
      const r = await sql.unsafe(`insert into mobily.mc_shop_products (name, category_id, description, price, old_price, available, hidden, images, specs, colors, variants, code, stock, allow_preorder)
        values ($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb,$9::text::jsonb,$10::text::jsonb,$11::text::jsonb,$12,$13,$14) returning id`, [...vals, v.code, v.stock, v.allow_preorder]);
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
