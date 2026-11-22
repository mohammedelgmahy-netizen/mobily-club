-- v8: النقاط والعروض لكل قسم ولكل منتج (مستقلين عن بعض). الافتراضي = نفس السلوك الحالي (كله بيحتسب نقاط ومسموح له بالعروض).
alter table mobily.mc_shop_categories
  add column if not exists earn_points boolean not null default true,
  add column if not exists allow_general_offers boolean not null default true,
  add column if not exists allow_special_offers boolean not null default true;
-- المنتج: null = حسب القسم، true/false = إعداد خاص بالمنتج (ليه الأولوية)
alter table mobily.mc_shop_products
  add column if not exists earn_points boolean,
  add column if not exists allow_general_offers boolean,
  add column if not exists allow_special_offers boolean;
-- المبلغ اللي اتحسبت عليه النقاط في الطلب (null = طلب قديم قبل التحديث، النقاط على قيمة الطلب كلها زي الأول)
alter table mobily.mc_shop_orders add column if not exists points_amount numeric(12,2);
