create table public.field_history_months (
  field_id uuid not null references public.fields(id) on delete cascade,
  month text not null check (month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  fetched_at timestamptz not null default now(),
  payload jsonb not null,
  primary key(field_id,month)
);
alter table public.field_history_months enable row level security;
revoke all on public.field_history_months from public, anon, authenticated;
grant select on public.field_history_months to authenticated;
grant all on public.field_history_months to service_role;
create policy own_field_history on public.field_history_months for select to authenticated
  using (exists(select 1 from public.fields f where f.id=field_id and f.owner_id=(select auth.uid())));
