-- طريقة عرض السعر لكل منتج: show = السعر يظهر عادي (الافتراضي) / ask = السعر مخفي وزر Ask Price
-- بيتطبق على القالب (المحلات الجديدة) وعلى كل محل موجود
do $$
declare s text;
begin
  for s in select 'mobily_tpl' union select schema_name from mobily_saas.tenants loop
    execute format($f$alter table %I.mc_shop_products add column if not exists price_display text not null default 'show'$f$, s);
    execute format($f$do $x$ begin
      alter table %I.mc_shop_products add constraint mc_shop_products_price_display_chk check (price_display in ('show','ask'));
      exception when duplicate_object then null; end $x$$f$, s);
  end loop;
end $$;
