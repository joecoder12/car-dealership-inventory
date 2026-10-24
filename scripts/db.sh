#!/bin/sh
# Manage a project-local PostgreSQL cluster for development and tests.
#
# Use this when Docker is not available. The cluster lives in .local/postgres,
# listens on 127.0.0.1 only and trusts local connections, so it is suitable for
# a developer machine and nothing else.
#
#   sh scripts/db.sh start | stop | status
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$ROOT_DIR/.local/postgres"
LOG_FILE="$ROOT_DIR/.local/postgres.log"
PORT="${PGPORT:-5432}"
DATABASES="car_dealership car_dealership_test car_dealership_e2e"

# On macOS the postmaster aborts ("became multithreaded during startup") unless
# a valid locale is set in the environment.
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

# Homebrew installs versioned PostgreSQL formulae as keg-only, so add the bin
# directory to PATH when it exists.
for candidate in /opt/homebrew/opt/postgresql@17/bin /usr/local/opt/postgresql@17/bin; do
  if [ -d "$candidate" ]; then PATH="$candidate:$PATH"; fi
done

if ! command -v pg_ctl >/dev/null 2>&1; then
  echo "pg_ctl not found. Install PostgreSQL 17 (e.g. 'brew install postgresql@17') or use 'docker compose up -d'." >&2
  exit 1
fi

init_cluster() {
  if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
    echo "Initialising cluster in $DATA_DIR"
    mkdir -p "$DATA_DIR"
    initdb --username=postgres --auth=trust --encoding=UTF8 --locale=C -D "$DATA_DIR" >/dev/null
  fi
}

create_databases() {
  for db in $DATABASES; do
    if ! psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
      createdb -h 127.0.0.1 -p "$PORT" -U postgres "$db"
      echo "Created database $db"
    fi
  done
}

case "${1:-}" in
  start)
    init_cluster
    if pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1; then
      echo "PostgreSQL already running on port $PORT"
    else
      pg_ctl -D "$DATA_DIR" -l "$LOG_FILE" -o "-p $PORT -c listen_addresses=127.0.0.1" -w start >/dev/null
      echo "PostgreSQL started on 127.0.0.1:$PORT"
    fi
    create_databases
    ;;
  stop)
    pg_ctl -D "$DATA_DIR" -m fast stop
    ;;
  status)
    pg_ctl -D "$DATA_DIR" status
    ;;
  *)
    echo "Usage: sh scripts/db.sh start|stop|status" >&2
    exit 1
    ;;
esac
