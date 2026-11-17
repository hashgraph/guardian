#!/usr/bin/env bash
#
# Upgrades the MongoDB of a Docker Compose based Guardian installation from 6.0 (or 7.0 / 8.0) to 9.0.
#
# MongoDB can only be upgraded one major version at a time, so the script
#   1. backs up the database (logical dump, document counts and a cold copy of the data volume),
#   2. moves the data into the named volume `mongo_data` used by the new compose files (if it is not there yet),
#   3. runs 7.0 -> 8.0 -> 9.0 over that volume and raises the featureCompatibilityVersion after each step,
#   4. starts the whole stack with the new compose file and compares the document counts with the backup.
#
# Nothing is deleted: the original data volume and the backup stay in place so the upgrade can be rolled back.
#
# Usage: scripts/upgrade-mongodb.sh [-f <compose file>] [-p <compose project>] [-b <backup dir>] [-y]
#   -f  the NEW compose file of this release (default: docker-compose.yml). It must use mongo 9.0 and declare `mongo_data`.
#   -p  compose project name (default: taken from the existing mongo container)
#   -b  where to put the backup (default: ./mongo-backups)
#   -y  do not ask for confirmation
#
# Re-running the script after a failure resumes from the last finished step.

set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
PROJECT=""
BACKUP_ROOT="./mongo-backups"
ASSUME_YES=0

# Intermediate versions the data has to pass through. The final image comes from the compose file.
HOP_IMAGES=("7.0:mongo:7.0.48" "8.0:mongo:8.0.38")
MONGO_ARGS=(--setParameter allowDiskUseByDefault=true)
UPGRADE_CONTAINER="guardian-mongo-upgrade"

log() { printf '[mongo-upgrade] %s\n' "$*"; }
die() { printf '[mongo-upgrade] ERROR: %s\n' "$*" >&2; exit 1; }

while getopts "f:p:b:yh" opt; do
  case "$opt" in
    f) COMPOSE_FILE="$OPTARG" ;;
    p) PROJECT="$OPTARG" ;;
    b) BACKUP_ROOT="$OPTARG" ;;
    y) ASSUME_YES=1 ;;
    *) sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "docker is not installed or not in PATH"
docker compose version >/dev/null 2>&1 || die "'docker compose' (v2) is required"
[ -f "$COMPOSE_FILE" ] || die "compose file '$COMPOSE_FILE' not found (use -f)"

mkdir -p "$BACKUP_ROOT"
BACKUP_ROOT="$(cd "$BACKUP_ROOT" && pwd)"
STATE_FILE="$BACKUP_ROOT/upgrade-state.env"

compose() {
  if [ -n "$PROJECT" ]; then docker compose -p "$PROJECT" -f "$COMPOSE_FILE" "$@"; else docker compose -f "$COMPOSE_FILE" "$@"; fi
}

mongosh_in() { # <container> <js>
  docker exec "$1" mongosh --quiet --eval "$2"
}

wait_ready() { # <container>
  local i
  for i in $(seq 1 120); do
    if docker exec "$1" mongosh --quiet --eval 'quit(db.adminCommand({ping:1}).ok ? 0 : 1)' >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  die "mongod in container $1 did not become ready in 120 seconds (see: docker logs $1)"
}

fcv_of() { mongosh_in "$1" 'print(db.adminCommand({getParameter:1,featureCompatibilityVersion:1}).featureCompatibilityVersion.version)'; }

counts_of() { # prints "db.collection=count" for all non-system databases
  mongosh_in "$1" "
    db.getMongo().getDBNames().filter(n => !['admin','config','local'].includes(n)).sort().forEach(n => {
      const d = db.getSiblingDB(n);
      d.getCollectionInfos({type: 'collection'}, {nameOnly: true}).map(c => c.name).sort().forEach(c => print(n + '.' + c + '=' + d.getCollection(c).estimatedDocumentCount()));
    });"
}

major_of() { echo "${1%%.*}"; }

CREATED_VOLUME=""
cleanup() {
  local code=$?
  docker rm -f "$UPGRADE_CONTAINER" >/dev/null 2>&1 || true
  if [ -n "$CREATED_VOLUME" ]; then
    log "interrupted while copying the data: removing the incomplete volume $CREATED_VOLUME"
    docker volume rm "$CREATED_VOLUME" >/dev/null 2>&1 || true
  fi
  if [ "$code" -ne 0 ]; then
    log "the upgrade did not finish. Backup: $BACKUP_ROOT. Fix the problem and run the same command again to resume."
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------- preflight
TARGET_IMAGE="$(compose config 2>/dev/null | sed -n 's/^ *image: *\(mongo:[^ ]*\) *$/\1/p' | head -n 1)"
[ -n "$TARGET_IMAGE" ] || die "no 'mongo:<tag>' image found in $COMPOSE_FILE"
TARGET_VERSION="${TARGET_IMAGE#mongo:}"
[ "$(major_of "$TARGET_VERSION")" = "9" ] || die "$COMPOSE_FILE uses $TARGET_IMAGE; expected mongo 9.x. Update to the release that ships MongoDB 9 first."
compose config --volumes 2>/dev/null | grep -qx 'mongo_data' || die "$COMPOSE_FILE does not declare the 'mongo_data' volume; use the compose file of the release that ships MongoDB 9"

OLD_CONTAINER="$(compose ps -aq mongo 2>/dev/null | head -n 1 || true)"
[ -n "$OLD_CONTAINER" ] || die "no existing 'mongo' container found for $COMPOSE_FILE. For a new installation no upgrade is needed; to upgrade, run this script from the directory of the installation (or pass -p)"
[ -n "$PROJECT" ] || PROJECT="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$OLD_CONTAINER")"
OLD_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$OLD_CONTAINER")"
SOURCE_VOLUME="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/db"}}{{.Name}}{{end}}{{end}}' "$OLD_CONTAINER")"
[ -n "$SOURCE_VOLUME" ] || die "the mongo container does not use a Docker volume for /data/db (bind mount?). Migrate it by hand, see docs"
TARGET_VOLUME="${PROJECT}_mongo_data"

DONE_HOP=""
WORK_VOLUME=""
if [ -f "$STATE_FILE" ]; then
  # shellcheck disable=SC1090
  . "$STATE_FILE"
  log "resuming: working volume ${WORK_VOLUME:-?}, finished steps up to ${DONE_HOP:-none}"
fi

if [ -z "$WORK_VOLUME" ]; then
  if ! docker inspect -f '{{.State.Running}}' "$OLD_CONTAINER" | grep -q true; then
    log "starting the existing mongo container to inspect it"
    docker start "$OLD_CONTAINER" >/dev/null
  fi
  wait_ready "$OLD_CONTAINER"
  CURRENT_VERSION="$(mongosh_in "$OLD_CONTAINER" 'print(db.version())')"
  CURRENT_FCV="$(fcv_of "$OLD_CONTAINER")"
  log "project: $PROJECT, MongoDB $CURRENT_VERSION, FCV $CURRENT_FCV, data volume $SOURCE_VOLUME"
  if [ "$(major_of "$CURRENT_VERSION")" -ge 9 ]; then
    log "MongoDB is already $CURRENT_VERSION, nothing to do"
    exit 0
  fi
  [ "$(major_of "$CURRENT_VERSION")" -ge 6 ] || die "MongoDB $CURRENT_VERSION is older than 6.0: upgrade to 6.0 first"
  [ "$CURRENT_FCV" = "$(major_of "$CURRENT_VERSION").0" ] || die "featureCompatibilityVersion is $CURRENT_FCV but the server is $CURRENT_VERSION. Finish the previous upgrade (setFeatureCompatibilityVersion) first"
  DONE_HOP="$(major_of "$CURRENT_VERSION").0"

  DATA_KB="$(docker exec "$OLD_CONTAINER" du -sk /data/db | cut -f1)"
  FREE_KB="$(df -Pk "$BACKUP_ROOT" | awk 'NR==2 {print $4}')"
  log "data size ~$((DATA_KB / 1024)) MB, free space in backup location ~$((FREE_KB / 1024)) MB"
  [ "$FREE_KB" -gt $((DATA_KB + DATA_KB / 5)) ] || die "not enough free space in $BACKUP_ROOT for the backup"

  if [ "$ASSUME_YES" -ne 1 ]; then
    printf '\nThis will stop the whole Guardian stack, back up MongoDB to %s, upgrade it to %s and restart the stack.\nThe original data volume is kept. Continue? [y/N] ' "$BACKUP_ROOT" "$TARGET_VERSION"
    read -r answer
    case "$answer" in y|Y|yes|YES) ;; *) die "aborted" ;; esac
  fi

  # ------------------------------------------------------------ backup
  STAMP="$(date +%Y%m%d-%H%M%S)"
  BACKUP_DIR="$BACKUP_ROOT/$STAMP"
  mkdir -p "$BACKUP_DIR"
  log "dumping the database to $BACKUP_DIR/mongo-dump.archive.gz"
  docker exec "$OLD_CONTAINER" mongodump --archive --gzip --quiet > "$BACKUP_DIR/mongo-dump.archive.gz"
  [ -s "$BACKUP_DIR/mongo-dump.archive.gz" ] || die "mongodump produced an empty file"
  counts_of "$OLD_CONTAINER" > "$BACKUP_DIR/counts.txt"
  log "recorded $(wc -l < "$BACKUP_DIR/counts.txt" | tr -d ' ') collections"

  log "stopping the stack"
  compose stop -t 120 >/dev/null
  log "copying the data volume to $BACKUP_DIR/mongo-volume.tar.gz (cold backup)"
  docker run --rm --entrypoint tar -v "$SOURCE_VOLUME:/src:ro" -v "$BACKUP_DIR:/backup" "$OLD_IMAGE" czf /backup/mongo-volume.tar.gz -C /src .

  # ------------------------------------------------------------ volume
  if [ "$SOURCE_VOLUME" = "$TARGET_VOLUME" ]; then
    WORK_VOLUME="$SOURCE_VOLUME"
  else
    if docker volume inspect "$TARGET_VOLUME" >/dev/null 2>&1; then
      EXISTING="$(docker run --rm --entrypoint sh -v "$TARGET_VOLUME:/to:ro" "$OLD_IMAGE" -c 'ls -A /to | wc -l')"
      [ "$EXISTING" = "0" ] || die "volume $TARGET_VOLUME already holds data; refusing to overwrite it"
    else
      docker volume create --label "com.docker.compose.project=$PROJECT" --label "com.docker.compose.volume=mongo_data" "$TARGET_VOLUME" >/dev/null
    fi
    CREATED_VOLUME="$TARGET_VOLUME"
    log "copying the data into $TARGET_VOLUME"
    docker run --rm --entrypoint sh -v "$SOURCE_VOLUME:/from:ro" -v "$TARGET_VOLUME:/to" "$OLD_IMAGE" -c 'cp -a /from/. /to/'
    CREATED_VOLUME=""
    WORK_VOLUME="$TARGET_VOLUME"
  fi
  printf 'WORK_VOLUME=%s\nDONE_HOP=%s\nBACKUP_DIR=%s\n' "$WORK_VOLUME" "$DONE_HOP" "$BACKUP_DIR" > "$STATE_FILE"
else
  log "stopping the stack"
  compose stop -t 120 >/dev/null
fi

# ---------------------------------------------------------------- hops
write_state() { printf 'WORK_VOLUME=%s\nDONE_HOP=%s\nBACKUP_DIR=%s\n' "$WORK_VOLUME" "$DONE_HOP" "${BACKUP_DIR:-}" > "$STATE_FILE"; }

run_hop() { # <fcv> <image>
  local fcv="$1" image="$2"
  log "upgrading to $image (FCV $fcv)"
  docker rm -f "$UPGRADE_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$UPGRADE_CONTAINER" -v "$WORK_VOLUME:/data/db" "$image" "${MONGO_ARGS[@]}" >/dev/null
  wait_ready "$UPGRADE_CONTAINER"
  mongosh_in "$UPGRADE_CONTAINER" "printjson(db.adminCommand({setFeatureCompatibilityVersion: '$fcv', confirm: true}))" >/dev/null
  [ "$(fcv_of "$UPGRADE_CONTAINER")" = "$fcv" ] || die "FCV did not change to $fcv"
  docker stop -t 120 "$UPGRADE_CONTAINER" >/dev/null
  docker rm "$UPGRADE_CONTAINER" >/dev/null
  DONE_HOP="$fcv"
  write_state
}

version_ge() { [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n 1)" = "$2" ]; } # $1 >= $2

for hop in "${HOP_IMAGES[@]}"; do
  fcv="${hop%%:*}"
  image="${hop#*:}"
  if version_ge "$DONE_HOP" "$fcv"; then continue; fi
  run_hop "$fcv" "$image"
done
if ! version_ge "$DONE_HOP" "9.0"; then
  run_hop "9.0" "$TARGET_IMAGE"
fi

# ---------------------------------------------------------------- start and verify
log "starting the stack with $TARGET_IMAGE"
compose up -d --remove-orphans
NEW_CONTAINER="$(compose ps -q mongo | head -n 1)"
wait_ready "$NEW_CONTAINER"
FINAL_VERSION="$(mongosh_in "$NEW_CONTAINER" 'print(db.version())')"
FINAL_FCV="$(fcv_of "$NEW_CONTAINER")"
[ "$(major_of "$FINAL_VERSION")" = "9" ] && [ "$FINAL_FCV" = "9.0" ] || die "unexpected result: MongoDB $FINAL_VERSION, FCV $FINAL_FCV"

# shellcheck disable=SC1090
. "$STATE_FILE"
if [ -n "${BACKUP_DIR:-}" ] && [ -f "$BACKUP_DIR/counts.txt" ]; then
  counts_of "$NEW_CONTAINER" > "$BACKUP_DIR/counts-after.txt"
  if diff -q "$BACKUP_DIR/counts.txt" "$BACKUP_DIR/counts-after.txt" >/dev/null; then
    log "document counts match the backup"
  else
    diff "$BACKUP_DIR/counts.txt" "$BACKUP_DIR/counts-after.txt" || true
    die "document counts differ from the backup (see above)"
  fi
fi

rm -f "$STATE_FILE"
log "done: MongoDB $FINAL_VERSION, FCV $FINAL_FCV, data volume $WORK_VOLUME"
log "backup: ${BACKUP_DIR:-$BACKUP_ROOT}"
if [ "$SOURCE_VOLUME" != "$WORK_VOLUME" ]; then
  log "the old data volume $SOURCE_VOLUME was left untouched; remove it once you have verified the upgrade: docker volume rm $SOURCE_VOLUME"
fi
log "rollback: stop the stack, restore the old compose file, and restore ${BACKUP_DIR:-the backup}/mongo-volume.tar.gz into an empty volume (see docs)"
