-- موبايلي - Mobily — «تصفح منتجاتنا» تحديث 5: الإشعارات + المخزون + الطلب المسبق (آمن للتكرار)
-- أجهزة العملاء والإدارة اللي فعّلت الإشعارات (Web Push)
create table if not exists mobily.mc_push_subs (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  kind text not null check (kind in ('customer','admin')),
  customer_id text not null default '',
  user_name text not null default '',
  page_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mc_push_subs_kind_idx on mobily.mc_push_subs (kind, customer_id);
alter table mobily.mc_push_subs enable row level security;
revoke all on mobily.mc_push_subs from anon, authenticated;
-- المخزون (فاضي = مش متسجل) + السماح بالطلب المسبق لما المنتج يكون غير متوفر
alter table mobily.mc_shop_products add column if not exists stock integer check (stock is null or stock >= 0);
alter table mobily.mc_shop_products add column if not exists allow_preorder boolean not null default false;
