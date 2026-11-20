-- موبايلي - Mobily — «تصفح منتجاتنا» تحديث 3: سلة التسوق + اشترِ الآن + أكواد الخصم + إتمام الشراء (آمن للتكرار)
-- بيطوّر جدول الطلبات الموجود (mc_shop_orders) بدل ما يعمل جدول طلبات جديد.

-- 1) الطلب بقى ممكن يكون فيه أكتر من منتج + حالة «تم الشحن»
alter table mobily.mc_shop_orders drop constraint if exists mc_shop_orders_status_check;
alter table mobily.mc_shop_orders add constraint mc_shop_orders_status_check
  check (status in ('pending','approved','preparing','ready','shipped','completed','rejected','cancelled'));
alter table mobily.mc_shop_orders drop constraint if exists mc_shop_orders_qty_check;
alter table mobily.mc_shop_orders add constraint mc_shop_orders_qty_check check (qty >= 1);

alter table mobily.mc_shop_orders add column if not exists items jsonb not null default '[]';          -- [{product_id,name,code,color,variant,qty,unit_price,old_price,line_subtotal,line_discount,line_total}]
alter table mobily.mc_shop_orders add column if not exists subtotal numeric(12,2) not null default 0;   -- إجمالي المنتجات قبل خصم المنتجات
alter table mobily.mc_shop_orders add column if not exists product_discount numeric(12,2) not null default 0;
alter table mobily.mc_shop_orders add column if not exists promo_id uuid;
alter table mobily.mc_shop_orders add column if not exists promo_code text not null default '';
alter table mobily.mc_shop_orders add column if not exists promo_discount numeric(12,2) not null default 0;
alter table mobily.mc_shop_orders add column if not exists shipping numeric(12,2) not null default 0;
alter table mobily.mc_shop_orders add column if not exists method text not null default 'buy_now';    -- cart | buy_now
alter table mobily.mc_shop_orders add column if not exists delivery text not null default 'pickup';   -- pickup | delivery
alter table mobily.mc_shop_orders add column if not exists address text not null default '';
alter table mobily.mc_shop_orders add column if not exists admin_notes text not null default '';      -- ملاحظات داخلية (مش بتظهر للعميل)

-- الطلبات القديمة (منتج واحد) تتحول لنفس الشكل الجديد
update mobily.mc_shop_orders set
  items = jsonb_build_array(jsonb_build_object('product_id', product_id, 'name', product_name, 'code', product_code, 'color', color, 'variant', variant,
    'qty', qty, 'unit_price', unit_price, 'old_price', 0, 'line_subtotal', total, 'line_discount', 0, 'line_total', total)),
  subtotal = total
where items = '[]'::jsonb;

-- 2) أكواد الخصم
create table if not exists mobily.mc_shop_promos (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  kind text not null check (kind in ('percent','fixed')),
  value numeric(12,2) not null check (value > 0),
  min_order numeric(12,2) not null default 0,
  max_discount numeric(12,2) not null default 0,          -- 0 = من غير حد
  starts_on date,
  ends_on date,
  max_uses integer not null default 0,                    -- 0 = من غير حد
  per_customer integer not null default 0,                -- 0 = من غير حد
  active boolean not null default true,
  product_ids jsonb not null default '[]',
  category_ids jsonb not null default '[]',               -- الاتنين فاضيين = على إجمالي الطلب
  stackable boolean not null default true,                -- ينفع مع المنتجات اللي عليها خصم
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists mc_shop_promos_code_uq on mobily.mc_shop_promos (lower(code));
create index if not exists mc_shop_orders_promo_idx on mobily.mc_shop_orders (promo_id) where promo_id is not null;

-- 3) إعدادات الاستلام والتوصيل (صف واحد)
create table if not exists mobily.mc_shop_settings (
  id integer primary key default 1 check (id = 1),
  delivery_enabled boolean not null default false,
  delivery_fee numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);
insert into mobily.mc_shop_settings (id) values (1) on conflict (id) do nothing;

alter table mobily.mc_shop_promos enable row level security;
alter table mobily.mc_shop_settings enable row level security;
revoke all on mobily.mc_shop_promos from anon, authenticated;
revoke all on mobily.mc_shop_settings from anon, authenticated;
