-- Daily visit totals. One row per day instead of one row per view, so history is cheap to keep.
-- Still nothing about who: a date and a number.
create table if not exists public.site_views (
  day   date primary key,
  views integer not null default 0
);

-- atomic +1 for today, callable from the edge function
create or replace function public.bump_view()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.site_views (day, views) values (current_date, 1)
  on conflict (day) do update set views = public.site_views.views + 1;
$$;

alter table public.site_views enable row level security;

grant select, insert, update on public.site_views to service_role;
grant execute on function public.bump_view() to service_role;

-- carry over whatever the per-view table already collected
insert into public.site_views (day, views)
select (created_at at time zone 'Asia/Bangkok')::date, count(*)
from public.site_hits
group by 1
on conflict (day) do update set views = public.site_views.views + excluded.views;

drop table if exists public.site_hits;
