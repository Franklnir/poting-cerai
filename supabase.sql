-- ============================================================
-- Potting Survey Neo (20 Items) - Tabel + RLS + Admin + RPC Stats
-- ============================================================

create extension if not exists pgcrypto;

-- Tabel respon
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- profiling singkat
  role text not null check (role in ('Ayah','Ibu','Wali/Lainnya')),
  custody text not null check (custody in ('Tinggal dengan Ayah','Tinggal dengan Ibu','Bergantian (shared)','Keluarga besar/wali','Lainnya')),
  time_since_divorce text not null check (time_since_divorce in ('< 6 bulan','6–12 bulan','1–2 tahun','3–5 tahun','> 5 tahun')),
  child_age_group text not null check (child_age_group in ('0–5','6–12','13–17','18+')),
  respondent_code text null, -- opsional (nama samaran)

  -- 20 jawaban Likert (1..5) disimpan sebagai JSON array
  answers jsonb not null,

  instrument_version int not null default 1,

  constraint answers_is_array check (jsonb_typeof(answers) = 'array'),
  constraint answers_len_20 check (jsonb_array_length(answers) = 20)
);

create index if not exists survey_responses_created_at_idx
on public.survey_responses (created_at);

-- Admin whitelist
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.survey_responses enable row level security;
alter table public.admin_users enable row level security;

-- Default: tidak ada akses baca untuk anon/auth biasa
revoke all on table public.survey_responses from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;

-- Insert-only untuk anon/auth
grant insert on table public.survey_responses to anon, authenticated;

drop policy if exists survey_insert_only on public.survey_responses;
create policy survey_insert_only
on public.survey_responses
for insert
to anon, authenticated
with check (true);

-- Admin: boleh SELECT/UPDATE/DELETE responses jika user ada di admin_users
grant select, update, delete on table public.survey_responses to authenticated;
grant select on table public.admin_users to authenticated;

drop policy if exists admin_users_select_self on public.admin_users;
create policy admin_users_select_self
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists survey_admin_select on public.survey_responses;
create policy survey_admin_select
on public.survey_responses
for select
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists survey_admin_update on public.survey_responses;
create policy survey_admin_update
on public.survey_responses
for update
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists survey_admin_delete on public.survey_responses;
create policy survey_admin_delete
on public.survey_responses
for delete
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- RPC agregat untuk dashboard publik (aman): return JSONB
create or replace function public.get_survey_stats(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total_count bigint;
  role_counts jsonb;
  custody_counts jsonb;
  time_counts jsonb;
  age_counts jsonb;
  likert_counts jsonb := '[]'::jsonb;
  likert_avg jsonb := '[]'::jsonb;
  i int;
  daily jsonb;
begin
  select count(*) into total_count from public.survey_responses;

  select coalesce(jsonb_object_agg(role, c), '{}'::jsonb)
  into role_counts
  from (select role, count(*) c from public.survey_responses group by role) t;

  select coalesce(jsonb_object_agg(custody, c), '{}'::jsonb)
  into custody_counts
  from (select custody, count(*) c from public.survey_responses group by custody) t;

  select coalesce(jsonb_object_agg(time_since_divorce, c), '{}'::jsonb)
  into time_counts
  from (select time_since_divorce, count(*) c from public.survey_responses group by time_since_divorce) t;

  select coalesce(jsonb_object_agg(child_age_group, c), '{}'::jsonb)
  into age_counts
  from (select child_age_group, count(*) c from public.survey_responses group by child_age_group) t;

  for i in 0..19 loop
    likert_counts := likert_counts || jsonb_build_array(
      (
        select jsonb_build_object(
          '1', count(*) filter (where (answers->>i)::int = 1),
          '2', count(*) filter (where (answers->>i)::int = 2),
          '3', count(*) filter (where (answers->>i)::int = 3),
          '4', count(*) filter (where (answers->>i)::int = 4),
          '5', count(*) filter (where (answers->>i)::int = 5)
        )
        from public.survey_responses
      )
    );

    likert_avg := likert_avg || jsonb_build_array(
      (
        select coalesce(avg((answers->>i)::int)::numeric, 0)::float8
        from public.survey_responses
      )
    );
  end loop;

  select coalesce(
    jsonb_agg(jsonb_build_object('date', d::text, 'count', c) order by d),
    '[]'::jsonb
  )
  into daily
  from (
    select (now()::date - g)::date as d,
           coalesce((select count(*) from public.survey_responses r where r.created_at::date = (now()::date - g)::date),0) as c
    from generate_series(0, greatest(0, p_days - 1)) as g
  ) t;

  return jsonb_build_object(
    'total', total_count,
    'role_counts', role_counts,
    'custody_counts', custody_counts,
    'time_counts', time_counts,
    'age_counts', age_counts,
    'likert_counts', likert_counts,
    'likert_avg', likert_avg,
    'daily', daily,
    'generated_at', now()
  );
end;
$$;

grant execute on function public.get_survey_stats(integer) to anon, authenticated;
