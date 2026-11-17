#!/usr/bin/env bash
#
# Round-trip test of scripts/upgrade-mongodb.sh. Needs Docker; takes about ten minutes. Each scenario seeds a
# MongoDB 6.0 instance that keeps its data in an anonymous volume (as the old compose files did) and upgrades it
# with a compose file that uses mongo 9.0 and the named `mongo_data` volume:
#   1. the stack is running and a service keeps writing while the script runs (the backup must be consistent);
#   2. `docker compose down` was run before the script (the old volume is named with -V);
#   3. the new release was started on an empty database first (refused without -V, repaired with -V).
#
# Usage: scripts/tests/upgrade-mongodb.test.sh

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/../upgrade-mongodb.sh"
WORK="$(mktemp -d)"
PROJECT="guardian-mongo-upgrade-test"
OLD_VOLUME=""

OLD="docker compose -p $PROJECT -f $WORK/old.yml"
NEW="docker compose -p $PROJECT -f $WORK/new.yml"

reset() {
  $NEW down -v >/dev/null 2>&1 || true
  $OLD down -v >/dev/null 2>&1 || true
  [ -z "$OLD_VOLUME" ] || docker volume rm "$OLD_VOLUME" >/dev/null 2>&1 || true
  OLD_VOLUME=""
  rm -rf "$WORK/backups"
}
cleanup() { reset; rm -rf "$WORK"; }
trap cleanup EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
check() { [ "$2" = "$3" ] || fail "$1: expected '$3', got '$2'"; echo "ok: $1"; }

# writer service: inserts a document every 200 ms, like a running Guardian service would
WRITER="$(cat <<'YAML'
  writer:
    image: mongo:IMAGE
    depends_on:
      - mongo
    entrypoint:
      - sh
      - -c
      - |
        while true; do mongosh --quiet --host mongo --eval 'db.getSiblingDB("guardian").live.insertOne({t: new Date()})' >/dev/null 2>&1; sleep 0.2; done
YAML
)"

write_compose() { # <with writer: 0|1>
  {
    printf 'services:\n  mongo:\n    image: mongo:6.0.28\n    command: "--setParameter allowDiskUseByDefault=true"\n'
    [ "$1" = "0" ] || printf '%s\n' "${WRITER//IMAGE/6.0.28}"
  } > "$WORK/old.yml"
  {
    printf 'services:\n  mongo:\n    image: mongo:9.0.8\n    command: "--setParameter allowDiskUseByDefault=true"\n    volumes:\n      - mongo_data:/data/db\n'
    [ "$1" = "0" ] || printf '%s\n' "${WRITER//IMAGE/9.0.8}"
    printf 'volumes:\n  mongo_data:\n'
  } > "$WORK/new.yml"
}

mongo_exec() { docker exec "$1" mongosh --quiet --eval "$2"; }

wait_for() { # <container>
  for _ in $(seq 1 60); do
    docker exec "$1" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1 && return 0
    sleep 1
  done
  fail "mongod in $1 did not start"
}

start_old_and_seed() {
  $OLD up -d
  local c
  c="$($OLD ps -q mongo)"
  wait_for "$c"
  OLD_VOLUME="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/db"}}{{.Name}}{{end}}{{end}}' "$c")"
  mongo_exec "$c" '
    const c = db.getSiblingDB("guardian").items;
    c.insertMany(Array.from({length: 1000}, (_, i) => ({n: i, name: "item-" + i})));
    c.createIndex({n: 1}, {unique: true});' >/dev/null
}

assert_upgraded() {
  local c
  c="$($NEW ps -q mongo)"
  wait_for "$c"
  check "server version" "$(mongo_exec "$c" 'print(db.version().split(".")[0])')" "9"
  check "FCV" "$(mongo_exec "$c" 'print(db.adminCommand({getParameter:1,featureCompatibilityVersion:1}).featureCompatibilityVersion.version)')" "9.0"
  check "document count" "$(mongo_exec "$c" 'print(db.getSiblingDB("guardian").items.countDocuments())')" "1000"
  check "unique index kept" "$(mongo_exec "$c" 'print(db.getSiblingDB("guardian").items.getIndexes().filter(i => i.unique).length)')" "1"
  check "data on the named volume" "$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/db"}}{{.Name}}{{end}}{{end}}' "$c")" "${PROJECT}_mongo_data"
  check "dump written" "$(find "$WORK/backups" -name mongo-dump.archive.gz -size +0 | wc -l | tr -d ' ')" "1"
  check "volume snapshot written" "$(find "$WORK/backups" -name mongo-volume.tar.gz -size +0 | wc -l | tr -d ' ')" "1"
  docker volume inspect "$OLD_VOLUME" >/dev/null 2>&1 || fail "the old volume must be kept"
  echo "ok: old volume kept"
}

run_script() { "$SCRIPT" -f "$WORK/new.yml" -p "$PROJECT" -b "$WORK/backups" -y "$@"; }

echo "== scenario 1: stack running, a service keeps writing"
write_compose 1
start_old_and_seed
sleep 2
run_script
assert_upgraded
run_script | grep -q "nothing to do" || fail "second run must be a no-op"
echo "ok: second run is a no-op"
reset

echo "== scenario 2: docker compose down before the upgrade"
write_compose 0
start_old_and_seed
$OLD down
if out="$(run_script 2>&1)"; then fail "must refuse without -V"; fi
echo "$out" | grep -q "no old mongo container found" || fail "unexpected message: $out"
echo "ok: refused without -V"
run_script -V "$OLD_VOLUME"
assert_upgraded
reset

echo "== scenario 3: the new release was started on an empty database"
write_compose 0
start_old_and_seed
$OLD down
$NEW up -d
wait_for "$($NEW ps -q mongo)"
if out="$(run_script 2>&1)"; then fail "must not report success on an empty database"; fi
echo "$out" | grep -q "its database is empty" || fail "unexpected message: $out"
echo "ok: empty MongoDB 9 detected"
run_script -V "$OLD_VOLUME"
assert_upgraded
check "empty volume snapshot written" "$(find "$WORK/backups" -name empty-mongo9-volume.tar.gz -size +0 | wc -l | tr -d ' ')" "1"

echo "PASSED"
