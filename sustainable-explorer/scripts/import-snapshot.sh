#!/usr/bin/env bash
#
# Receive a snapshot produced by `scripts/export-snapshot.sh` and lay it out
# on a fresh host so that the next `docker compose up -d` bootstraps Postgres
# from the dump and serves the bundled policy zips to the workers.
#
# What it does:
#   1. Refuses to run if the docker compose stack is already running with
#      data — the auto-restore only fires when the Postgres data volume is
#      empty, so importing on top of an existing DB would silently do nothing.
#   2. Untars the snapshot:
#         postgres-init/  → ./snapshot/postgres-init/
#         policy-zips/    → ./data/policy-zips/
#
# Usage:
#   scripts/import-snapshot.sh <snapshot.tar.gz>
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <snapshot.tar.gz>"
    exit 1
fi

ARCHIVE="$1"
if [ ! -f "$ARCHIVE" ]; then
    echo "ERROR: archive not found: $ARCHIVE"
    exit 1
fi

# Refuse to overwrite an already-initialised stack. The postgres image only
# runs /docker-entrypoint-initdb.d on a *fresh* data volume, so importing on
# top of an existing volume is a footgun — the SQL is silently ignored and
# the user thinks the import worked.
if docker volume inspect sustainable-explorer_postgres_data >/dev/null 2>&1; then
    echo "ERROR: docker volume 'sustainable-explorer_postgres_data' already exists."
    echo "       Postgres only auto-runs /docker-entrypoint-initdb.d on a *fresh*"
    echo "       data volume, so an import here would do nothing."
    echo
    echo "       To wipe and re-import (DESTRUCTIVE — kills the local DB):"
    echo "           docker compose down"
    echo "           docker volume rm sustainable-explorer_postgres_data"
    echo "           scripts/import-snapshot.sh $ARCHIVE"
    exit 1
fi

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "==> Extracting '$ARCHIVE'..."
tar -xzf "$ARCHIVE" -C "$TMPDIR"

if [ ! -d "$TMPDIR/postgres-init" ] || [ ! -d "$TMPDIR/policy-zips" ]; then
    echo "ERROR: archive does not look like a sustainable-explorer snapshot."
    echo "       Expected 'postgres-init/' and 'policy-zips/' at the archive root."
    ls "$TMPDIR"
    exit 1
fi

mkdir -p snapshot data
echo "==> Installing snapshot/postgres-init/..."
rm -rf snapshot/postgres-init
mv "$TMPDIR/postgres-init" snapshot/postgres-init

echo "==> Installing data/policy-zips/..."
rm -rf data/policy-zips
mv "$TMPDIR/policy-zips" data/policy-zips
ZIP_COUNT="$(find data/policy-zips -name '*.zip' | wc -l | tr -d ' ')"
echo "    restored $ZIP_COUNT zip files"

cat <<EOF

Snapshot imported. Next steps:

  1. make sure .env on this host is configured (copy from .env.example if needed)
  2. start the stack:
         docker compose up -d
     On first boot, Postgres will run snapshot/postgres-init/01-restore.sql.gz
     and recreate the per-network databases. The workers will read existing
     policy zips from data/policy-zips/ and only fetch missing ones.

EOF
