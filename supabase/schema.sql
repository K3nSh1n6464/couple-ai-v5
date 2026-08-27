
create extension if not exists pgcrypto;
create table if not exists public.reports(
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 report text not null,
 analysis jsonb,
 stats jsonb
);
alter table public.reports enable row level security;
create policy "reports can be read by anyone with link" on public.reports for select to anon using (true);
-- No anonymous insert/update/delete. The server uses the service role key.
