-- Supabase project default privileges grant ALL to authenticated on new public tables.
-- Remove them before granting the exact API surface; RLS does not protect TRUNCATE.
revoke all on public.profiles, public.fields, public.field_snapshots, public.feedback from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert(id,terms_version,location_service_consent) on public.profiles to authenticated;
grant select, delete on public.fields, public.feedback to authenticated;
grant insert(name,boundary) on public.fields to authenticated;
grant insert(message) on public.feedback to authenticated;
grant select on public.field_snapshots to authenticated;
