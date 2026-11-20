-- موبايلي - Mobily — «تصفح منتجاتنا» تحديث 4: طريقة الاستلام (توصيل لعنوان العميل / استلام من الفرع) (آمن للتكرار)
-- عنوان التوصيل المحفوظ في حساب العميل (جدول جنب جدول العملاء من غير ما نغيّر جدول العملاء نفسه)
create table if not exists mobily.mc_shop_addresses (
  customer_id text primary key,
  address text not null default '',
  updated_at timestamptz not null default now()
);
alter table mobily.mc_shop_addresses enable row level security;
revoke all on mobily.mc_shop_addresses from anon, authenticated;
-- الفرع اللي هيتم الاستلام منه (من جدول الفروع الموجود mc_branches) بيتحفظ على الطلب
alter table mobily.mc_shop_orders add column if not exists branch_id text not null default '';
alter table mobily.mc_shop_orders add column if not exists branch_name text not null default '';
