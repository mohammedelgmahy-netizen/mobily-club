-- موبايلي - Mobily — «تصفح منتجاتنا» تحديث 2: كود المنتج + طلبات المنتجات + إصلاح حفظ الصور (آمن للتكرار)

-- إصلاح: الصور/المواصفات/الألوان/الاختيارات اتحفظت كنص JSON جوه jsonb بدل قايمة
update mobily.mc_shop_products set images = (images #>> '{}')::jsonb where jsonb_typeof(images) = 'string';
update mobily.mc_shop_products set specs = (specs #>> '{}')::jsonb where jsonb_typeof(specs) = 'string';
update mobily.mc_shop_products set colors = (colors #>> '{}')::jsonb where jsonb_typeof(colors) = 'string';
update mobily.mc_shop_products set variants = (variants #>> '{}')::jsonb where jsonb_typeof(variants) = 'string';

-- كود المنتج (اختياري، للبحث وللطلبات)
alter table mobily.mc_shop_products add column if not exists code text not null default '';
create unique index if not exists mc_shop_products_code_uq on mobily.mc_shop_products (lower(code)) where code <> '';

-- طلبات المنتجات: مربوطة بالمنتج الأصلي، والاسم والكود والسعر بيتحفظوا وقت الطلب
create sequence if not exists mobily.mc_shop_order_no start 1001;
create table if not exists mobily.mc_shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint not null unique,
  customer_id text not null,
  customer_name text not null default '',
  customer_phone text not null default '',
  member_no text not null default '',
  product_id uuid references mobily.mc_shop_products(id) on delete set null,
  product_name text not null,
  product_code text not null default '',
  color text not null default '',
  variant text not null default '',
  qty integer not null check (qty between 1 and 50),
  unit_price numeric(12,2) not null,
  total numeric(12,2) not null,
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','preparing','ready','completed','rejected','cancelled')),
  reject_reason text not null default '',
  history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mc_shop_orders_customer_idx on mobily.mc_shop_orders (customer_id, created_at desc);
create index if not exists mc_shop_orders_created_idx on mobily.mc_shop_orders (created_at desc);

alter table mobily.mc_shop_orders enable row level security;
revoke all on mobily.mc_shop_orders from anon, authenticated;
revoke all on sequence mobily.mc_shop_order_no from anon, authenticated;
