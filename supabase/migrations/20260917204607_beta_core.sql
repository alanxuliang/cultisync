create extension if not exists postgis with schema extensions;
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null check (terms_version = 'beta-2026-09-17'),
  accepted_at timestamptz not null default now(),
  location_service_consent boolean not null check (location_service_consent)
);
alter table public.profiles enable row level security;
create policy own_profile_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_profile_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
grant select, insert on public.profiles to authenticated;
revoke all on public.profiles from anon;

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  crop text not null default 'wine_grape' check (crop = 'wine_grape'),
  boundary jsonb not null,
  area_ha double precision not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);
create index fields_owner_idx on public.fields(owner_id);
alter table public.fields enable row level security;
create policy own_fields_read on public.fields for select to authenticated using (owner_id = (select auth.uid()));
create policy own_fields_insert on public.fields for insert to authenticated with check (owner_id = (select auth.uid()));
create policy own_fields_delete on public.fields for delete to authenticated using (owner_id = (select auth.uid()));
grant select, delete on public.fields to authenticated;
grant insert(name,boundary) on public.fields to authenticated;
revoke all on public.fields from anon;

create function private.validate_field() returns trigger language plpgsql security invoker set search_path = '' as $$
declare g extensions.geometry; c extensions.geometry;
begin
  if auth.uid() is null or new.owner_id <> auth.uid() then raise exception 'Authentication required'; end if;
  -- Serialize inserts for this owner so concurrent requests cannot exceed the free limit.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if (select count(*) from public.fields where owner_id = auth.uid()) >= 3 then
    raise exception 'The beta supports up to 3 fields per account';
  end if;
  if pg_column_size(new.boundary) > 32000 or new.boundary->>'type' <> 'Polygon' then
    raise exception 'Provide a GeoJSON Polygon under 32 KB';
  end if;
  g := extensions.st_setsrid(extensions.st_geomfromgeojson(new.boundary::text),4326);
  if extensions.st_ndims(g) <> 2 or extensions.st_isempty(g) or not extensions.st_isvalid(g)
     or extensions.st_npoints(g) > 200 or extensions.st_numinteriorrings(g) > 0 then
    raise exception 'Use a valid, non-self-intersecting polygon with at most 199 corners and no holes';
  end if;
  -- Regional service envelope, not a claim of legal state-boundary validation.
  if not extensions.st_coveredby(g,extensions.st_makeenvelope(-124.5,32.5,-114,42.1,4326)) then
    raise exception 'This beta supports the California region only';
  end if;
  new.area_ha := extensions.st_area(g::extensions.geography)/10000;
  if new.area_ha < 0.1 or new.area_ha > 100 then raise exception 'Field area must be between 0.1 and 100 hectares'; end if;
  c := extensions.st_pointonsurface(g);
  new.longitude := extensions.st_x(c); new.latitude := extensions.st_y(c);
  return new;
end $$;
revoke all on function private.validate_field() from public, anon, authenticated;
create trigger validate_field before insert on public.fields for each row execute function private.validate_field();

create table public.field_snapshots (
  field_id uuid primary key references public.fields(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  payload jsonb not null
);
alter table public.field_snapshots enable row level security;
create policy own_snapshots on public.field_snapshots for select to authenticated
  using (exists(select 1 from public.fields f where f.id = field_id and f.owner_id = (select auth.uid())));
grant select on public.field_snapshots to authenticated;
revoke all on public.field_snapshots from anon;

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 5 and 2000),
  created_at timestamptz not null default now()
);
create index feedback_owner_idx on public.feedback(owner_id);
alter table public.feedback enable row level security;
create policy own_feedback_read on public.feedback for select to authenticated using (owner_id = (select auth.uid()));
create policy own_feedback_insert on public.feedback for insert to authenticated with check (owner_id = (select auth.uid()));
create policy own_feedback_delete on public.feedback for delete to authenticated using (owner_id = (select auth.uid()));
grant select, delete on public.feedback to authenticated;
grant insert(message) on public.feedback to authenticated;
revoke all on public.feedback from anon;

-- A per-field cooldown prevents repeated clicks or parallel requests consuming upstream quota.
create table private.refresh_attempts (
  field_id uuid primary key references public.fields(id) on delete cascade,
  attempted_at timestamptz not null
);
alter table private.refresh_attempts enable row level security;
create function public.claim_field_refresh(target uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare claimed uuid;
begin
  insert into private.refresh_attempts(field_id,attempted_at) values(target,now())
    on conflict(field_id) do update set attempted_at = now()
    where private.refresh_attempts.attempted_at < now() - interval '1 hour'
    returning field_id into claimed;
  return claimed is not null;
end $$;
revoke all on function public.claim_field_refresh(uuid) from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on private.refresh_attempts to service_role;
grant execute on function public.claim_field_refresh(uuid) to service_role;
grant all on public.profiles,public.fields,public.field_snapshots,public.feedback to service_role;
