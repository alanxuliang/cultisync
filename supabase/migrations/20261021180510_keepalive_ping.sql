-- Keepalive read, three times a week. Returns two capacity booleans and no user data.
create function public.ping() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'database_over_80', pg_catalog.pg_database_size(pg_catalog.current_database()) > 0.8 * 500 * 1024 * 1024,
    'accounts_near_cap', (select count(*) from public.profiles) >= 90
  );
$$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
