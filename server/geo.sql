-- MOBILY CLUB — «تذكير القرب من المحل»: مكان المحل والنطاق ونص الإشعار (صف واحد)
-- إضافة فقط: جدول جديد، لا يلمس أي بيانات موجودة
create table if not exists mobily.mc_geo_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  lat double precision,
  lng double precision,
  radius_m int not null default 150 check (radius_m between 50 and 2000),
  title text not null default 'موبايلي - Mobily 📍',
  body text not null default 'إنت قريب مننا! عدّي علينا وشوف نقاطك وعروضك 🎁',
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
insert into mobily.mc_geo_settings (id) values (1) on conflict (id) do nothing;
alter table mobily.mc_geo_settings enable row level security;
revoke all on mobily.mc_geo_settings from anon, authenticated;
