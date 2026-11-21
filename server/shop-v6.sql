-- موبايلي - Mobily — تحديث 6: المخزون والحجز + مسار حالة الطلب وسجله + الإشعارات + فاتورة ونقاط الطلب الأونلاين
-- + نقاط الترحيب + أنواع جديدة لعرض عيد الميلاد.
-- كله إضافة بس (جداول وأعمدة وإعدادات جديدة). مفيش أي بيانات موجودة بتتمسح أو تتغير، وآمن لو اتشغل أكتر من مرة.

-- ============ 1) سجل حالات الطلب (مين غيّر + إمتى + من إيه لإيه) — مينفعش يتعدل أو يتمسح ============
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
create or replace function mobily.mc_append_only() returns trigger language plpgsql as $$
begin raise exception 'السجل ده مينفعش يتعدل أو يتمسح'; end $$;
drop trigger if exists mc_shop_order_log_lock on mobily.mc_shop_order_log;
create trigger mc_shop_order_log_lock before update or delete on mobily.mc_shop_order_log for each row execute function mobily.mc_append_only();

-- ============ 2) قواعد الانتقال بين الحالات جوه قاعدة البيانات نفسها ============
--  استلام من الفرع: قيد المراجعة → تم القبول → جاري التجهيز → جاهز للاستلام → تم إتمام الطلب
--  توصيل:           قيد المراجعة → تم القبول → جاري التجهيز → جاهز → تم الشحن → تم إتمام الطلب
--  الرفض: من «قيد المراجعة» بس. الإلغاء: من أي حالة قبل «تم إتمام الطلب».
--  تم إتمام الطلب / مرفوض / ملغي = نهائية. التصحيح للمالك بس وبسبب ويتسجل.
create or replace function mobily.mc_shop_next_status(st text, delivery text) returns text language sql immutable as $$
  select case st when 'pending' then 'approved' when 'approved' then 'preparing' when 'preparing' then 'ready'
    when 'ready' then case when delivery = 'delivery' then 'shipped' else 'completed' end
    when 'shipped' then 'completed' else null end
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

-- ============ 3) فاتورة المبيعات والنقاط للطلب الأونلاين ============
alter table mobily.mc_shop_orders add column if not exists invoice_status text not null default '';
alter table mobily.mc_shop_orders add column if not exists invoice_no text not null default '';
alter table mobily.mc_shop_orders add column if not exists invoice_txn_id text not null default '';
alter table mobily.mc_shop_orders add column if not exists invoice_points numeric not null default 0;
alter table mobily.mc_shop_orders add column if not exists invoice_balance numeric;
alter table mobily.mc_shop_orders add column if not exists invoice_error text not null default '';
alter table mobily.mc_shop_orders add column if not exists invoice_at timestamptz;
alter table mobily.mc_shop_orders add column if not exists invoice_claim_at timestamptz;
alter table mobily.mc_shop_orders add column if not exists completed_at timestamptz;
do $$ begin
  alter table mobily.mc_shop_orders add constraint mc_shop_orders_invoice_status_chk check (invoice_status in ('', 'pending', 'working', 'done', 'void'));
exception when duplicate_object then null; end $$;
create unique index if not exists mc_shop_orders_invoice_txn_uq on mobily.mc_shop_orders (invoice_txn_id) where invoice_txn_id <> '';
-- ربط الفاتورة بالطلب الأونلاين + تفاصيل المنتجات (في جدول المبيعات الموجود نفسه)
alter table mobily.mc_transactions add column if not exists shop_order_id uuid;
alter table mobily.mc_transactions add column if not exists details jsonb;
create unique index if not exists mc_transactions_shop_order_uq on mobily.mc_transactions (shop_order_id) where shop_order_id is not null and status <> 'void';
-- فئة «طلبات أونلاين» في فئات المبيعات وفئات كسب النقاط (بتتضاف للقايمة، ومفيش فئة بتتشال)
update mobily.mc_settings set value = case when value = '' then 'طلبات أونلاين' else value || ',طلبات أونلاين' end, updated_at = now(), updated_by = 'system'
  where key in ('product_categories', 'earn_categories') and not ('طلبات أونلاين' = any (string_to_array(replace(value, '، ', ','), ',')))
    and not exists (select 1 from unnest(string_to_array(value, ',')) v where upper(trim(v)) = 'ALL');

-- ============ 4) المخزون: رصيد فعلي + محجوز لكل منتج (ولكل لون لو المنتج له ألوان) ============
-- المتاح للبيع = الفعلي − المحجوز. القيد ده بيمنع إن المحجوز يعدّي الفعلي حتى مع طلبات في نفس اللحظة.
create table if not exists mobily.mc_shop_stock (
  product_id uuid not null references mobily.mc_shop_products(id) on delete cascade,
  color text not null default '',
  physical integer not null default 0,
  reserved integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product_id, color),
  constraint mc_shop_stock_chk check (physical >= 0 and reserved >= 0 and reserved <= physical)
);
alter table mobily.mc_shop_stock enable row level security;
revoke all on mobily.mc_shop_stock from anon, authenticated;
-- سجل حركة المخزون (زيادة / نقص / تعديل / حجز / فك حجز / بيع) — مينفعش يتعدل أو يتمسح
create table if not exists mobily.mc_shop_stock_moves (
  id bigserial primary key,
  product_id uuid not null,
  product_name text not null default '',
  color text not null default '',
  kind text not null check (kind in ('add', 'remove', 'set', 'reserve', 'release', 'sell')),
  d_physical integer not null default 0,
  d_reserved integer not null default 0,
  physical_after integer not null,
  reserved_after integer not null,
  order_id uuid,
  order_no bigint,
  actor_name text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists mc_shop_stock_moves_prod_idx on mobily.mc_shop_stock_moves (product_id, id desc);
alter table mobily.mc_shop_stock_moves enable row level security;
revoke all on mobily.mc_shop_stock_moves from anon, authenticated;
drop trigger if exists mc_shop_stock_moves_lock on mobily.mc_shop_stock_moves;
create trigger mc_shop_stock_moves_lock before update or delete on mobily.mc_shop_stock_moves for each row execute function mobily.mc_append_only();
-- حد التنبيه لما المخزون يقل
alter table mobily.mc_shop_products add column if not exists low_stock integer not null default 3;
do $$ begin
  alter table mobily.mc_shop_products add constraint mc_shop_products_low_stock_chk check (low_stock >= 0);
exception when duplicate_object then null; end $$;
-- حالة مخزون الطلب: محجوز ← (اتفك الحجز لو اتلغى/اترفض) أو (اتخصم نهائي لو اتم). كل خطوة بتحصل مرة واحدة بس.
alter table mobily.mc_shop_orders add column if not exists stock_state text not null default '';
do $$ begin
  alter table mobily.mc_shop_orders add constraint mc_shop_orders_stock_state_chk check (stock_state in ('', 'reserved', 'released', 'deducted'));
exception when duplicate_object then null; end $$;

-- ============ 5) الإشعارات داخل التطبيق (للإدارة وللعميل) ============
create table if not exists mobily.mc_notifications (
  id bigserial primary key,
  audience text not null check (audience in ('admin', 'customer')),
  customer_id text not null default '',
  kind text not null default '',
  title text not null,
  body text not null default '',
  link text not null default '',
  ref_key text not null,
  created_at timestamptz not null default now(),
  constraint mc_notifications_ref_uq unique (ref_key)
);
create index if not exists mc_notifications_aud_idx on mobily.mc_notifications (audience, customer_id, id desc);
alter table mobily.mc_notifications enable row level security;
revoke all on mobily.mc_notifications from anon, authenticated;
create table if not exists mobily.mc_notification_reads (
  notif_id bigint not null references mobily.mc_notifications(id),
  reader text not null,
  read_at timestamptz not null default now(),
  primary key (notif_id, reader)
);
alter table mobily.mc_notification_reads enable row level security;
revoke all on mobily.mc_notification_reads from anon, authenticated;

-- ============ 6) أكواد الخصم الخاصة بعميل واحد (كود عيد الميلاد) ============
alter table mobily.mc_shop_promos add column if not exists customer_id text not null default '';

-- ============ 7) نقاط الترحيب وعيد الميلاد: مرة واحدة بس لكل عميل / لكل عيد ميلاد ============
create unique index if not exists mc_pointsledger_welcome_uq on mobily.mc_pointsledger (customer_id) where ref_type = 'welcome';
create unique index if not exists mc_pointsledger_bday_uq on mobily.mc_pointsledger (ref_id) where ref_type = 'birthday';
alter table mobily.mc_birthdayrewards add column if not exists promo_code text not null default '';
alter table mobily.mc_birthdayrewards add column if not exists points_entry text not null default '';
-- نقاط الترحيب بتتحسب للعملاء اللي هيسجلوا من دلوقتي بس (العملاء الحاليين مش بياخدوها بأثر رجعي)
insert into mobily.mc_props (key, value) values ('WELCOME_SINCE', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) on conflict (key) do nothing;
-- الإعدادات الجديدة (لو مش موجودة بس)
insert into mobily.mc_settings (key, value, type, "group", label, description, updated_at, updated_by)
select v.key, v.value, v.type, v.grp, v.label, v.description, now(), 'system' from (values
  ('welcome_enabled', 'true', 'bool', 'program', 'تفعيل نقاط الترحيب للعملاء الجدد', 'كل عميل جديد ياخد نقاط مجانية في محفظته مرة واحدة بس أول ما يسجل'),
  ('welcome_points', '10', 'number', 'program', 'عدد نقاط الترحيب', 'عدد النقاط اللي بياخدها العميل الجديد عند التسجيل'),
  ('bday_code_kind', 'percent', 'choice', 'birthday', 'نوع كود الخصم (لو نوع العرض كود خصم)', 'نسبة % أو مبلغ ثابت. الكود بيشتغل في «تصفح منتجاتنا» للعميل ده بس')
) as v(key, value, type, grp, label, description)
where not exists (select 1 from mobily.mc_settings s where s.key = v.key);
-- توضيح وصف الإعدادات الموجودة لعيد الميلاد (الوصف بس، القيم زي ما هي)
update mobily.mc_settings set description = 'خصم بنسبة أو بمبلغ ثابت (الكاشير بيطبقه في المحل)، هدية، نقاط إضافية في المحفظة، أو كود خصم خاص للمتجر'
  where key = 'bday_reward_type' and description not like '%نقاط إضافية%';
update mobily.mc_settings set label = 'قيمة العرض', description = 'النسبة % أو المبلغ أو عدد النقاط حسب نوع العرض'
  where key = 'bday_value' and label <> 'قيمة العرض';
