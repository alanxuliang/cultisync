-- Free-tier guard: at most 100 accounts can complete consent.
create function private.enforce_account_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize consents so two simultaneous requests cannot both take the last place.
  perform pg_advisory_xact_lock(hashtextextended('cultisync-account-cap', 0));
  if (select count(*) from public.profiles) >= 100 then
    raise exception 'CultiSync is at capacity';
  end if;
  return new;
end $$;
revoke all on function private.enforce_account_cap() from public, anon, authenticated;
create trigger enforce_account_cap before insert on public.profiles
  for each row execute function private.enforce_account_cap();
