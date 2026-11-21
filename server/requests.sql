-- MOBILY CLUB — «طلبات تعديل»: طلبات تعديل يكتبها صاحب المشروع من لوحة الإدارة
-- إضافة فقط: جدول جديد، لا يلمس أي بيانات موجودة
create table if not exists mobily.mc_change_requests (
  id bigserial primary key,
  text text not null,
  author text not null default '',
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'done'))
);
alter table mobily.mc_change_requests enable row level security;
revoke all on mobily.mc_change_requests from anon, authenticated;
