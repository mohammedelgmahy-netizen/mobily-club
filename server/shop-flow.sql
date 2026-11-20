-- موبايلي - Mobily: مسار حالة الطلب للأمام بس + سجل التغييرات + إشعارات الطلبات الجديدة لكل أدمن + فاتورة ونقاط الطلب الأونلاين
-- كل حاجة هنا بتتضاف من غير ما تمسح أو تغيّر أي بيانات موجودة.

-- 1) سجل دائم لكل تغيير في حالة الطلب (مين غيّر + إمتى + من إيه لإيه)
create table if not exists mobily.mc_shop_order_log (
  id bigserial primary key,
  order_id uuid not null references mobily.mc_shop_orders(id),
  order_no bigint,
  old_status text,
  new_status text not null,
  actor_id text not null default '',
  actor_name text not null default '',
  actor_role text not null default '',
  reason text not null default '',
  correction boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists mc_shop_order_log_order_idx on mobily.mc_shop_order_log (order_id, id);
alter table mobily.mc_shop_order_log enable row level security;
revoke all on mobily.mc_shop_order_log from anon, authenticated;
-- السجل مينفعش يتعدل أو يتمسح
create or replace function mobily.mc_shop_order_log_lock() returns trigger language plpgsql as $$
begin raise exception 'سجل حالات الطلبات مينفعش يتعدل أو يتمسح'; end $$;
drop trigger if exists mc_shop_order_log_lock on mobily.mc_shop_order_log;
create trigger mc_shop_order_log_lock before update or delete on mobily.mc_shop_order_log for each row execute function mobily.mc_shop_order_log_lock();

-- 2) قواعد الانتقال بين الحالات جوه قاعدة البيانات نفسها (حتى لو حد بعت طلب مباشر للسيرفر)
--    استلام من الفرع: قيد المراجعة → تم القبول → جاري التجهيز → جاهز للاستلام → تم إتمام الطلب
--    توصيل:           قيد المراجعة → تم القبول → جاري التجهيز → تم الشحن     → تم إتمام الطلب
--    الرفض: من «قيد المراجعة» بس. الإلغاء: من أي حالة قبل «تم إتمام الطلب».
--    تم إتمام الطلب / مرفوض / ملغي = حالات نهائية. التصحيح للمالك بس وبسبب ويتسجل.
create or replace function mobily.mc_shop_next_status(st text, delivery text) returns text language sql immutable as $$
  select case st when 'pending' then 'approved' when 'approved' then 'preparing'
    when 'preparing' then case when delivery = 'delivery' then 'shipped' else 'ready' end
    when 'ready' then 'completed' when 'shipped' then 'completed' else null end
$$;
create or replace function mobily.mc_shop_order_flow() returns trigger language plpgsql as $$
declare
  corr boolean := coalesce(current_setting('mobily.correction', true), '') = '1';
  a_role text := coalesce(current_setting('mobily.actor_role', true), '');
  rsn text := coalesce(current_setting('mobily.reason', true), '');
  nxt text;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then raise exception 'الطلب الجديد لازم يبدأ «قيد المراجعة»'; end if;
    return new;
  end if;
  if new.status is not distinct from old.status then return new; end if;
  if corr then
    if a_role <> 'owner' then raise exception 'تصحيح حالة الطلب للمالك بس'; end if;
    if length(trim(rsn)) < 3 then raise exception 'اكتب سبب التصحيح'; end if;
  elsif old.status in ('completed', 'rejected', 'cancelled') then
    raise exception 'الطلب ده انتهى ومينفعش تتغير حالته';
  elsif new.status = 'cancelled' then
    null;
  elsif new.status = 'rejected' then
    if old.status <> 'pending' then raise exception 'الرفض بيكون من «قيد المراجعة» بس. بعد القبول استخدم «إلغاء الطلب»'; end if;
  else
    nxt := mobily.mc_shop_next_status(old.status, new.delivery);
    if new.status is distinct from nxt then raise exception 'مينفعش الطلب يرجع لورا أو يتخطى خطوة'; end if;
  end if;
  return new;
end $$;
drop trigger if exists mc_shop_order_flow on mobily.mc_shop_orders;
create trigger mc_shop_order_flow before insert or update of status on mobily.mc_shop_orders for each row execute function mobily.mc_shop_order_flow();
-- التسجيل بعد ما التغيير يتم
create or replace function mobily.mc_shop_order_flow_log() returns trigger language plpgsql as $$
declare
  a_id text := coalesce(current_setting('mobily.actor_id', true), '');
  a_name text := coalesce(current_setting('mobily.actor_name', true), '');
  a_role text := coalesce(current_setting('mobily.actor_role', true), '');
begin
  if tg_op = 'INSERT' then
    insert into mobily.mc_shop_order_log (order_id, order_no, old_status, new_status, actor_id, actor_name, actor_role)
      values (new.id, new.order_no, null, new.status, new.customer_id, new.customer_name, 'customer');
  elsif new.status is distinct from old.status then
    insert into mobily.mc_shop_order_log (order_id, order_no, old_status, new_status, actor_id, actor_name, actor_role, reason, correction)
      values (new.id, new.order_no, old.status, new.status, coalesce(nullif(a_id, ''), 'system'), a_name, coalesce(nullif(a_role, ''), 'system'),
        coalesce(current_setting('mobily.reason', true), ''), coalesce(current_setting('mobily.correction', true), '') = '1');
  end if;
  return null;
end $$;
drop trigger if exists mc_shop_order_flow_log on mobily.mc_shop_orders;
create trigger mc_shop_order_flow_log after insert or update of status on mobily.mc_shop_orders for each row execute function mobily.mc_shop_order_flow_log();

-- 3) الطلبات اللي كل أدمن شافها (علشان أيقونة الطلبات تفضل حمرا لحد ما هو بنفسه يفتح الطلب)
create table if not exists mobily.mc_shop_order_seen (
  user_id text not null,
  order_id uuid not null references mobily.mc_shop_orders(id),
  seen_at timestamptz not null default now(),
  primary key (user_id, order_id)
);
alter table mobily.mc_shop_order_seen enable row level security;
revoke all on mobily.mc_shop_order_seen from anon, authenticated;

-- 4) فاتورة المبيعات والنقاط للطلب الأونلاين
alter table mobily.mc_shop_orders add column if not exists invoice_status text not null default '';
alter table mobily.mc_shop_orders add column if not exists invoice_no text not null default '';
alter table mobily.mc_shop_orders add column if not exists invoice_txn_id text not null default '';
alter table mobily.mc_shop_orders add column if not exists invoice_points numeric not null default 0;
alter table mobily.mc_shop_orders add column if not exists invoice_error text not null default '';
alter table mobily.mc_shop_orders add column if not exists invoice_at timestamptz;
alter table mobily.mc_shop_orders add column if not exists invoice_claim_at timestamptz;
do $$ begin
  alter table mobily.mc_shop_orders add constraint mc_shop_orders_invoice_status_chk check (invoice_status in ('', 'pending', 'working', 'done', 'void'));
exception when duplicate_object then null; end $$;
create unique index if not exists mc_shop_orders_invoice_txn_uq on mobily.mc_shop_orders (invoice_txn_id) where invoice_txn_id <> '';

-- فئة «طلبات أونلاين» في فئات المبيعات وفئات كسب النقاط (تقدر تشيلها من الإعدادات لو مش عاوز نقاط على الأونلاين)
update mobily.mc_settings set value = case when value = '' then 'طلبات أونلاين' else value || ',طلبات أونلاين' end, updated_at = now(), updated_by = 'system'
  where key in ('product_categories', 'earn_categories') and not ('طلبات أونلاين' = any (string_to_array(replace(value, '، ', ','), ',')))
    and not exists (select 1 from unnest(string_to_array(value, ',')) v where upper(trim(v)) = 'ALL');
