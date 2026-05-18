#!/usr/bin/env bash
#
# Export a portable snapshot of the running stack:
#
#   - pg_dumpall of every database in the running se-postgres container
#     → snapshot/postgres-init/01-restore.sql.gz
#   - the entire policy-zips cache
#     → snapshot/policy-zips/*.zip
#
# Both are bundled into a single tarball at the project root:
#   sustainable-explorer-snapshot-<YYYYMMDD-HHMMSS>.tar.gz
#
# That tarball is what you ship to another host. See `import-snapshot.sh`
# for the receiving side.
#
# Usage:
#   scripts/export-snapshot.sh [output-path]
#
# Requirements:
#   - docker compose stack is running (postgres container reachable)
#   - tar, gzip on the host
set -euo pipefail

cd "$(dirname "$0")/.."

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-se-postgres}"
DB_USER="${DB_USER:-explorer}"
SNAPSHOT_DIR="snapshot"
POLICY_ZIPS_SRC="data/policy-zips"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_PATH="${1:-sustainable-explorer-snapshot-${TIMESTAMP}.tar.gz}"

# Ensure postgres container is up
if ! docker ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
    echo "ERROR: container '$POSTGRES_CONTAINER' is not running."
    echo "       Start the stack first: docker compose up -d postgres"
    exit 1
fi

mkdir -p "$SNAPSHOT_DIR/postgres-init" "$SNAPSHOT_DIR/policy-zips"

echo "==> Dumping per-network databases from '$POSTGRES_CONTAINER' as user '$DB_USER'..."
# Per-DB pg_dump --create --clean --if-exists, *not* pg_dumpall:
#
# The receiving postgres image runs init scripts AS `$DB_USER` (POSTGRES_USER),
# and that role is provisioned by initdb before the script runs. So role
# management from pg_dumpall would either (a) try to DROP ROLE explorer —
# which fails with "current user cannot be dropped" and aborts the whole
# import under ON_ERROR_STOP=1, or (b) try to CREATE ROLE explorer which
# already exists.
#
# Per-DB dumps with --create emit DROP DATABASE IF EXISTS + CREATE DATABASE +
# \connect + contents for each app database. Roles are never touched.
DB_LIST=$(docker exec "$POSTGRES_CONTAINER" \
    psql -U "$DB_USER" -d postgres -tAc \
    "SELECT datname FROM pg_database
     WHERE datistemplate = false
       AND datname NOT IN ('postgres')
     ORDER BY datname")

if [ -z "$DB_LIST" ]; then
    echo "ERROR: no user databases found in '$POSTGRES_CONTAINER'."
    echo "       Did the workers run long enough to create their per-network DBs?"
    exit 1
fi

{
    # Each pg_dump --create output starts with \connect template1 to issue
    # DROP/CREATE DATABASE from outside the target; concatenating them is safe.
    for db in $DB_LIST; do
        echo "--   $db" >&2
        docker exec "$POSTGRES_CONTAINER" \
            pg_dump \
                --create \
                --clean \
                --if-exists \
                --no-owner \
                --no-privileges \
                -U "$DB_USER" \
                "$db"
    done
} | gzip -9 > "$SNAPSHOT_DIR/postgres-init/01-restore.sql.gz"

DB_SIZE="$(du -h "$SNAPSHOT_DIR/postgres-init/01-restore.sql.gz" | cut -f1)"
echo "    wrote $SNAPSHOT_DIR/postgres-init/01-restore.sql.gz ($DB_SIZE)"

echo "==> Copying policy zips from '$POLICY_ZIPS_SRC'..."
if [ -d "$POLICY_ZIPS_SRC" ] && [ -n "$(ls -A "$POLICY_ZIPS_SRC" 2>/dev/null)" ]; then
    # Mirror the source tree into the snapshot. Using rsync if available
    # (preserves perms and is fast on re-runs), falling back to cp -a.
    if command -v rsync >/dev/null 2>&1; then
        rsync -a --delete "$POLICY_ZIPS_SRC/" "$SNAPSHOT_DIR/policy-zips/"
    else
        rm -rf "$SNAPSHOT_DIR/policy-zips"
        cp -a "$POLICY_ZIPS_SRC" "$SNAPSHOT_DIR/policy-zips"
    fi
    ZIP_COUNT="$(find "$SNAPSHOT_DIR/policy-zips" -name '*.zip' | wc -l | tr -d ' ')"
    ZIP_SIZE="$(du -sh "$SNAPSHOT_DIR/policy-zips" | cut -f1)"
    echo "    staged $ZIP_COUNT zip files ($ZIP_SIZE)"
else
    echo "    WARNING: $POLICY_ZIPS_SRC is empty or missing — snapshot will not carry any policy zips."
fi

echo "==> Packaging into '$OUTPUT_PATH'..."
# Only ship the two snapshot subdirs so the archive stays focused.
tar -czf "$OUTPUT_PATH" \
    -C "$SNAPSHOT_DIR" \
    postgres-init \
    policy-zips

FINAL_SIZE="$(du -h "$OUTPUT_PATH" | cut -f1)"
echo
echo "Done. Snapshot written to:"
echo "    $OUTPUT_PATH  ($FINAL_SIZE)"
echo
echo "Next steps on the destination host:"
echo "  1. clone the repo at the matching commit (or copy docker-compose.yml + .env)"
echo "  2. copy '$OUTPUT_PATH' onto it"
echo "  3. run: scripts/import-snapshot.sh $OUTPUT_PATH"
echo "  4. run: docker compose up -d"
