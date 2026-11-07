#!/usr/bin/env bash
# Database tests against a throwaway PostgreSQL + PostGIS with a minimal Supabase stub.
#   RED:   without the account-cap migration, beta_security.sql must fail on the cap check.
#   GREEN: with every migration, beta_security.sql must pass.
#   LOCK:  at 99 accounts, two simultaneous consents must not both succeed.
# Expects a server on localhost:$PGPORT (default 55433) that trusts the postgres user.
set -euo pipefail
export PGHOST=localhost PGPORT="${PGPORT:-55433}" PGUSER=postgres
DB=cultisync_test
OUT="${TMPDIR:-/tmp}/cultisync-db-tests"; mkdir -p "$OUT"
q() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }

fresh() {
  dropdb --if-exists "$DB"; createdb "$DB"
  q -f supabase/tests/supabase_stub.sql
  for f in $(ls supabase/migrations/*.sql | sort); do
    if [ -n "$1" ] && [[ "$f" == *"$1"* ]]; then continue; fi
    q -f "$f"
  done
}

fresh account_cap
if q -f supabase/tests/beta_security.sql > "$OUT/red.log" 2>&1; then
  echo "RED failed: the test passed without the account-cap migration"; exit 1
fi
grep -q "Account cap failed" "$OUT/red.log" || { echo "RED failed for another reason:"; cat "$OUT/red.log"; exit 1; }
echo "RED: fails without the account cap, as expected"

fresh ""
q -f supabase/tests/beta_security.sql | tee "$OUT/green.log"
grep -q "PASS: .*account cap" "$OUT/green.log"
echo "GREEN: passes with every migration"

q <<'SQL'
insert into auth.users(id) select gen_random_uuid() from generate_series(1, 101);
insert into public.profiles(id, terms_version, location_service_consent)
  select id, 'beta-2026-09-17', true from auth.users limit 99;
SQL
mapfile -t FREE < <(q -At -c "select u.id from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id) limit 2")
consent() {
  psql -X -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '$1', true);
insert into public.profiles(id, terms_version, location_service_consent) values (auth.uid(), 'beta-2026-09-17', true);
select pg_sleep($2);
commit;
SQL
}
consent "${FREE[0]}" 3 > "$OUT/a.log" 2>&1 & A=$!
sleep 1
consent "${FREE[1]}" 0 > "$OUT/b.log" 2>&1 & B=$!
wait "$A" && RA=0 || RA=$?
wait "$B" && RB=0 || RB=$?
COUNT=$(q -At -c "select count(*) from public.profiles")
if [ "$RA" -ne 0 ] || [ "$RB" -eq 0 ] || [ "$COUNT" -ne 100 ] || ! grep -q "CultiSync is at capacity" "$OUT/b.log"; then
  echo "LOCK failed: first=$RA second=$RB profiles=$COUNT"; cat "$OUT/a.log" "$OUT/b.log"; exit 1
fi
echo "LOCK: the second simultaneous consent was refused; 100 accounts"
