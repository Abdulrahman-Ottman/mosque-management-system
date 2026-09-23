#!/usr/bin/env bash
# Rebuild a throwaway Postgres and run the schema + RLS test suite against it.
#
# This exists because the most important thing in this migration - that a teacher
# can no longer touch another teacher's students - is a database guarantee, and the
# only honest way to check a database guarantee is to run it.
#
# Requires Docker. Usage:  bash supabase/test/run.sh
set -euo pipefail

CONTAINER=mosque-pg
DB=mosque
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

psql_run() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$1" -v ON_ERROR_STOP=1 -q
}

if ! docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
  echo "starting $CONTAINER ..."
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_PASSWORD=pass -e POSTGRES_DB="$DB" \
    -p 55432:5432 postgres:16-alpine >/dev/null
  for _ in $(seq 1 60); do
    docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
    sleep 1
  done
fi

echo "rebuilding database ..."
docker exec -i "$CONTAINER" psql -U postgres -d postgres -q \
  -c "drop database if exists $DB;" -c "create database $DB;"

for f in test/00_auth_stub.sql 01_schema.sql 02_policies.sql 03_functions.sql 04_seed_surahs.sql; do
  echo "applying $f"
  psql_run "$DB" < "$HERE/$f"
done

echo ""
echo "running tests ..."
psql_run "$DB" < "$HERE/test/01_rls_test.sql" 2>&1 | grep -E "PASS|FAIL|ERROR|ALL RLS"
