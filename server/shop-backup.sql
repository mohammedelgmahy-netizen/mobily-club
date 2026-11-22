-- سجل النسخ الاحتياطي والاسترجاع (بيانات النسخة نفسها بتتحفظ على جهاز صاحب المحل، مش هنا)
create table if not exists mobily.mc_backups (id bigserial primary key, kind text not null default 'backup' check (kind in ('backup','restore')), created_at timestamptz not null default now(), created_by text not null default '', note text not null default '', size_bytes bigint not null default 0, tables_count integer not null default 0, rows_count integer not null default 0, checksum text not null default '');
alter table mobily.mc_backups enable row level security;
revoke all on mobily.mc_backups from anon, authenticated;
revoke all on sequence mobily.mc_backups_id_seq from anon, authenticated;
