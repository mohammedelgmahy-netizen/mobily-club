-- طريقة عرض السعر لكل منتج: show = السعر يظهر عادي (الافتراضي) / ask = السعر مخفي وزر Ask Price
-- بيتطبق على القالب (المحلات الجديدة) وعلى كل محل موجود
do $$
declare s text;
begin
  for s in select 'mobily_tpl' union select schema_name from mobily_saas.tenants loop
    execute format('alter table %I.mc_shop_products add column if not exists price_display text not null default %L', s, 'show');
    if not exists (select 1 from pg_constraint where conname = 'mc_shop_products_price_display_chk' and connamespace = s::regnamespace) then
      execute format('alter table %I.mc_shop_products add constraint mc_shop_products_price_display_chk check (price_display in (%L, %L))', s, 'show', 'ask');
    end if;
  end loop;
end $$;
