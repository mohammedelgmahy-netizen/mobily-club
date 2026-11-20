/**
 * موبايلي - Mobily — «تصفح منتجاتنا»: أقسام ومنتجات المحل.
 * الجداول: mobily.mc_shop_categories و mobily.mc_shop_products (server/shop.sql).
 *   fn 'shop'      → للعميل: catalog (الأقسام والمنتجات الظاهرة فقط)
 *   fn 'shopAdmin' → للإدارة (صلاحية «الإعدادات»): list, saveCategory, orderCategories, deleteCategory,
 *                    saveProduct, deleteProduct, upload
 * الرد بنفس شكل باقي النظام: { result: { ok, data } } أو { result: { ok: false, error } }
 */

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
    hidden: !!p.hidden,
    images: cleanImages(p.images),
    specs, colors, variants,
  };
}

const PRODUCT_COLS = 'id, code, category_id, name, description, price, old_price, available, hidden, images, specs, colors, variants, created_at, updated_at';
const CATEGORY_COLS = 'id, name, icon, image, sort, hidden';

async function catalog(sql) {
  const [r] = await sql.unsafe(`select json_build_object(
    'categories', (select coalesce(json_agg(c order by c.sort, c.created_at), '[]') from (select ${CATEGORY_COLS}, created_at from mobily.mc_shop_categories where not hidden) c),
    'products', (select coalesce(json_agg(p order by p.created_at desc), '[]') from (
      select ${PRODUCT_COLS} from mobily.mc_shop_products p
      where not p.hidden and (p.category_id is null or p.category_id in (select id from mobily.mc_shop_categories where not hidden))) p)
  ) as data`);
  return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
}


/* ---------------- الطلبات ---------------- */
export const ORDER_STATUS = ['pending', 'approved', 'preparing', 'ready', 'completed', 'rejected', 'cancelled'];
const ORDER_COLS = `o.id, o.order_no, o.customer_id, o.customer_name, o.customer_phone, o.member_no, o.product_id, o.product_name, o.product_code,
  o.color, o.variant, o.qty, o.unit_price, o.total, o.notes, o.status, o.reject_reason, o.history, o.created_at, o.updated_at,
  (select coalesce(p.images->0->>'t', p.images->0->>'u', '') from mobily.mc_shop_products p where p.id = o.product_id) as image`;

async function customerByToken(sql, token) {
  const t = T(token);
  if (!/^[a-f0-9]{64}$/.test(t)) throw new Error('افتح الكارت بتاعك الأول علشان تقدر تطلب');
  const r = await sql.unsafe('select customer_id, name, phone, member_no, status from mobily.mc_customers where access_token = $1', [t]);
  if (!r.length) throw new Error('افتح الكارت بتاعك الأول علشان تقدر تطلب');
  if (r[0].status !== 'active') throw new Error('عضويتك موقوفة حالياً. تواصل مع المحل.');
  return r[0];
}

async function customerShop(sql, action, p) {
  const c = await customerByToken(sql, p.token);
  if (action === 'myOrders') {
    const rows = await sql.unsafe(`select ${ORDER_COLS} from mobily.mc_shop_orders o where o.customer_id = $1 order by o.created_at desc limit 200`, [c.customer_id]);
    return rows.map(publicOrder);
  }
  if (action === 'order') {
    if (!UUID.test(T(p.product_id))) throw new Error('المنتج ده مش متاح دلوقتي');
    const [pr] = await sql.unsafe(`select p.id, p.name, p.code, p.price, p.available, p.hidden, p.colors, p.variants,
        (p.category_id is null or exists (select 1 from mobily.mc_shop_categories k where k.id = p.category_id and not k.hidden)) as cat_ok
      from mobily.mc_shop_products p where p.id = $1`, [T(p.product_id)]);
    if (!pr || pr.hidden || !pr.cat_ok) throw new Error('المنتج ده مش متاح دلوقتي');
    if (!pr.available) throw new Error('المنتج ده غير متوفر حالياً، مينفعش يتطلب');
    const colors = (Array.isArray(pr.colors) ? pr.colors : []).map((x) => x.n);
    const variants = Array.isArray(pr.variants) ? pr.variants : [];
    const color = T(p.color), variant = T(p.variant);
    if (colors.length && colors.indexOf(color) < 0) throw new Error('اختار اللون');
    if (!colors.length && color) throw new Error('اللون غير صحيح');
    if (variants.length && variants.indexOf(variant) < 0) throw new Error('اختار النوع');
    if (!variants.length && variant) throw new Error('النوع غير صحيح');
    const qty = Math.floor(Number(p.qty));
    if (!(qty >= 1 && qty <= 50)) throw new Error('الكمية لازم تكون من 1 لـ 50');
    const notes = T(p.notes).slice(0, 500);
    const [cnt] = await sql.unsafe("select count(*)::int n from mobily.mc_shop_orders where customer_id = $1 and created_at > now() - interval '1 day'", [c.customer_id]);
    if (cnt.n >= 20) throw new Error('وصلت للحد الأقصى للطلبات النهارده. كلم المحل لو محتاج حاجة.');
    const price = Number(pr.price), total = Math.round(price * qty * 100) / 100;
    const hist = JSON.stringify([{ s: 'pending', at: new Date().toISOString(), by: 'customer' }]);
    const [o] = await sql.unsafe(`insert into mobily.mc_shop_orders (order_no, customer_id, customer_name, customer_phone, member_no, product_id, product_name, product_code,
        color, variant, qty, unit_price, total, notes, status, history)
      values (nextval('mobily.mc_shop_order_no'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14::text::jsonb) returning id, order_no`,
      [c.customer_id, c.name, c.phone, c.member_no, pr.id, pr.name, pr.code || '', color, variant, qty, price, total, notes, hist]);
    return { id: o.id, order_no: Number(o.order_no), total };
  }
  if (action === 'cancelOrder') {
    if (!UUID.test(T(p.id))) throw new Error('الطلب غير موجود');
    const r = await sql.unsafe(`update mobily.mc_shop_orders set status = 'cancelled', updated_at = now(),
        history = history || $3::text::jsonb
      where id = $1 and customer_id = $2 and status = 'pending' returning id`,
      [T(p.id), c.customer_id, JSON.stringify([{ s: 'cancelled', at: new Date().toISOString(), by: 'customer' }])]);
    if (!r.length) throw new Error('الطلب ده مينفعش يتلغي، المحل بدأ فيه بالفعل. كلم المحل.');
    return { done: true };
  }
  throw new Error('طلب غير معروف');
}

function publicOrder(o) {
  return {
    id: o.id, order_no: Number(o.order_no), product_id: o.product_id, product_name: o.product_name, product_code: o.product_code,
    color: o.color, variant: o.variant, qty: o.qty, unit_price: Number(o.unit_price), total: Number(o.total), notes: o.notes,
    status: o.status, reject_reason: o.reject_reason, image: o.image || '', created_at: o.created_at, updated_at: o.updated_at,
    history: (Array.isArray(o.history) ? o.history : []).map((h) => ({ s: h.s, at: h.at })),
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
      if (['order', 'myOrders', 'cancelOrder'].indexOf(args[0]) >= 0) return ok(await customerShop(sql, args[0], args[1] && typeof args[1] === 'object' ? args[1] : {}));
      return bad('طلب غير معروف');
    }
    // ---------- الإدارة ----------
    const [token, action] = [args[0], args[1]];
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
      const rows = await sql.unsafe(`select ${ORDER_COLS} from mobily.mc_shop_orders o order by o.created_at desc limit 2000`);
      return ok(rows.map((o) => Object.assign(publicOrder(o), {
        customer_id: o.customer_id, customer_name: o.customer_name, customer_phone: o.customer_phone, member_no: o.member_no,
        history: Array.isArray(o.history) ? o.history : [],
      })));
    }

    if (action === 'setOrderStatus') {
      if (!UUID.test(T(p.id))) return bad('الطلب غير موجود');
      const st = T(p.status);
      if (ORDER_STATUS.indexOf(st) < 0) return bad('حالة غير معروفة');
      const reason = T(p.reason).slice(0, 300);
      if (st === 'rejected' && !reason) return bad('اكتب سبب الرفض علشان يظهر للعميل');
      const h = JSON.stringify([{ s: st, at: new Date().toISOString(), by: user.name || '' }]);
      const r = await sql.unsafe(`update mobily.mc_shop_orders set status = $2, reject_reason = case when $2 = 'rejected' then $3 else reject_reason end,
          updated_at = now(), history = history || $4::text::jsonb where id = $1 and status <> $2 returning id`, [T(p.id), st, reason, h]);
      if (!r.length) {
        const e = await sql.unsafe('select 1 from mobily.mc_shop_orders where id = $1', [T(p.id)]);
        return e.length ? bad('الطلب بالفعل في الحالة دي') : bad('الطلب غير موجود');
      }
      return ok({ done: true });
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
          available=$6, hidden=$7, images=$8::text::jsonb, specs=$9::text::jsonb, colors=$10::text::jsonb, variants=$11::text::jsonb, code=$12, updated_at=now()
          where id=$13 returning id`, [...vals, v.code, T(p.id)]);
        if (!r.length) return bad('المنتج غير موجود');
        return ok({ id: r[0].id });
      }
      const r = await sql.unsafe(`insert into mobily.mc_shop_products (name, category_id, description, price, old_price, available, hidden, images, specs, colors, variants, code)
        values ($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb,$9::text::jsonb,$10::text::jsonb,$11::text::jsonb,$12) returning id`, [...vals, v.code]);
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
