-- موبايلي - Mobily — تحديث 7: عرض عيد الميلاد (تفعيل/إيقاف، فترة العرض، العملاء المستحقين، خصم تلقائي في «تصفح منتجاتنا»).
-- إضافة بس: أعمدة وإعدادات جديدة. مفيش بيانات موجودة بتتمسح أو تتغير، وآمن لو اتشغل أكتر من مرة.

-- خصم عيد الميلاد على الطلب الأونلاين
alter table mobily.mc_shop_orders add column if not exists birthday_discount numeric not null default 0;
alter table mobily.mc_shop_orders add column if not exists birthday_name text not null default '';
alter table mobily.mc_shop_orders add column if not exists birthday_reward_id text not null default '';

-- إعدادات العرض الجديدة (لو مش موجودة بس)
insert into mobily.mc_settings (key, value, type, "group", label, description, updated_at, updated_by)
select v.key, v.value, 'text', 'birthday', v.label, '', now(), 'system' from (values
  ('bday_name', 'عرض عيد الميلاد', 'اسم العرض'),
  ('bday_start', '', 'تاريخ بداية العرض'),
  ('bday_end', '', 'تاريخ انتهاء العرض'),
  ('bday_target', 'today', 'العملاء المستحقين'),
  ('bday_target_date', '', 'التاريخ المحدد'),
  ('bday_target_from', '', 'من تاريخ'),
  ('bday_target_to', '', 'إلى تاريخ'),
  ('bday_product_ids', '[]', 'المنتجات المشمولة'),
  ('bday_category_ids', '[]', 'الأقسام المشمولة')
) as v(key, value, label)
where not exists (select 1 from mobily.mc_settings s where s.key = v.key);
