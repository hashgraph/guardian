#!/usr/bin/env bash
#
# Round-trip test of scripts/upgrade-mongodb.sh: seeds a MongoDB 6.0 instance that keeps its data in an anonymous
# volume (as the old compose files did), runs the upgrade against a compose file with mongo 9.0 and the named
# `mongo_data` volume, and checks the version, FCV, data, backup and idempotency. Needs Docker; takes a few minutes.
#
# Usage: scripts/tests/upgrade-mongodb.test.sh

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/../upgrade-mongodb.sh"
WORK="$(mktemp -d)"
PROJECT="guardian-mongo-upgrade-test"
OLD_VOLUME=""

cleanup() {
  docker compose -p "$PROJECT" -f "$WORK/new.yml" down -v >/dev/null 2>&1 || true
  docker compose -p "$PROJECT" -f "$WORK/old.yml" down -v >/dev/null 2>&1 || true
  [ -z "$OLD_VOLUME" ] || docker volume rm "$OLD_VOLUME" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
check() { [ "$2" = "$3" ] || fail "$1: expected '$3', got '$2'"; echo "ok: $1"; }

cat > "$WORK/old.yml" <<'YAML'
services:
  mongo:
    image: mongo:6.0.28
    command: "--setParameter allowDiskUseByDefault=true"
YAML
cat > "$WORK/new.yml" <<'YAML'
services:
  mongo:
    image: mongo:9.0.8
    command: "--setParameter allowDiskUseByDefault=true"
    volumes:
      - mongo_data:/data/db
volumes:
  mongo_data:
YAML

docker compose -p "$PROJECT" -f "$WORK/old.yml" up -d
OLD_CONTAINER="$(docker compose -p "$PROJECT" -f "$WORK/old.yml" ps -q mongo)"
for _ in $(seq 1 60); do
  docker exec "$OLD_CONTAINER" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1 && break
  sleep 1
done
OLD_VOLUME="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/db"}}{{.Name}}{{end}}{{end}}' "$OLD_CONTAINER")"
docker exec "$OLD_CONTAINER" mongosh --quiet --eval '
  const c = db.getSiblingDB("guardian").items;
  c.insertMany(Array.from({length: 1000}, (_, i) => ({n: i, name: "item-" + i})));
  c.createIndex({n: 1}, {unique: true});'

"$SCRIPT" -f "$WORK/new.yml" -p "$PROJECT" -b "$WORK/backups" -y

NEW_CONTAINER="$(docker compose -p "$PROJECT" -f "$WORK/new.yml" ps -q mongo)"
check "server version" "$(docker exec "$NEW_CONTAINER" mongosh --quiet --eval 'print(db.version().split(".")[0])')" "9"
check "FCV" "$(docker exec "$NEW_CONTAINER" mongosh --quiet --eval 'print(db.adminCommand({getParameter:1,featureCompatibilityVersion:1}).featureCompatibilityVersion.version)')" "9.0"
check "document count" "$(docker exec "$NEW_CONTAINER" mongosh --quiet --eval 'print(db.getSiblingDB("guardian").items.countDocuments())')" "1000"
check "unique index kept" "$(docker exec "$NEW_CONTAINER" mongosh --quiet --eval 'print(db.getSiblingDB("guardian").items.getIndexes().filter(i => i.unique).length)')" "1"
check "data on the named volume" "$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/db"}}{{.Name}}{{end}}{{end}}' "$NEW_CONTAINER")" "${PROJECT}_mongo_data"
check "dump written" "$(find "$WORK/backups" -name mongo-dump.archive.gz -size +0 | wc -l | tr -d ' ')" "1"
check "volume snapshot written" "$(find "$WORK/backups" -name mongo-volume.tar.gz -size +0 | wc -l | tr -d ' ')" "1"
docker volume inspect "$OLD_VOLUME" >/dev/null 2>&1 || fail "the old volume must be kept"
echo "ok: old volume kept"

"$SCRIPT" -f "$WORK/new.yml" -p "$PROJECT" -b "$WORK/backups" -y | grep -q "nothing to do" || fail "second run must be a no-op"
echo "ok: second run is a no-op"
echo "PASSED"
