#!/usr/bin/env bash
#
# Upgrades the MongoDB of a Docker Compose based Guardian installation from 6.0 (or 7.0 / 8.0) to 9.0.
#
# MongoDB can only be upgraded one major version at a time, so the script
#   1. stops the Guardian stack and backs up the database (logical dump, document counts and a cold copy of the data volume),
#   2. moves the data into the named volume `mongo_data` used by the new compose files (if it is not there yet),
#   3. runs 7.0 -> 8.0 -> 9.0 over that volume and raises the featureCompatibilityVersion after each step,
#   4. starts MongoDB 9, compares the document counts with the backup and then starts the rest of the stack.
#
# Nothing is deleted: the original data volume and the backup stay in place so the upgrade can be rolled back.
#
# Do not run `docker compose up` or `docker compose down` with the new release between pulling it and running this script.
# If you did, the script still works: name the volume that holds the old data with -V (see `docker volume ls`).
#
# Usage: scripts/upgrade-mongodb.sh [-f <compose file>] [-p <compose project>] [-b <backup dir>] [-V <old volume>] [-i <old image>] [-y]
#   -f  the NEW compose file of this release (default: docker-compose.yml). It must use mongo 9.0 and declare `mongo_data`.
#   -p  compose project name (default: taken from the existing mongo container, else from the compose file)
#   -b  where to put the backup (default: ./mongo-backups)
#   -V  Docker volume holding the old MongoDB data. Needed only when there is no old mongo container
#       (after `docker compose down`) or when MongoDB 9 was already started on an empty volume.
#   -i  image of the old MongoDB, used to read the old data when there is no old container (default: mongo:6.0.28)
#   -y  do not ask for confirmation
#
# Re-running the script after a failure resumes from the last finished step.

set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
PROJECT=""
BACKUP_ROOT="./mongo-backups"
OPT_VOLUME=""
OPT_IMAGE=""
ASSUME_YES=0

# Intermediate versions the data has to pass through. The final image comes from the compose file.
HOP_IMAGES=("7.0:mongo:7.0.48" "8.0:mongo:8.0.38")
DEFAULT_OLD_IMAGE="mongo:6.0.28"
MONGO_ARGS=(--setParameter allowDiskUseByDefault=true)
UPGRADE_CONTAINER="guardian-mongo-upgrade"

log() { printf '[mongo-upgrade] %s\n' "$*"; }
die() { printf '[mongo-upgrade] ERROR: %s\n' "$*" >&2; exit 1; }
usage() { sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'; }

while getopts "f:p:b:V:i:yh" opt; do
  case "$opt" in
    f) COMPOSE_FILE="$OPTARG" ;;
    p) PROJECT="$OPTARG" ;;
    b) BACKUP_ROOT="$OPTARG" ;;
    V) OPT_VOLUME="$OPTARG" ;;
    i) OPT_IMAGE="$OPTARG" ;;
    y) ASSUME_YES=1 ;;
    *) usage; exit 1 ;;
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
  docker logs --tail 15 "$1" >&2 || true
  die "mongod in container $1 did not become ready in 120 seconds (see the log above)"
}

fcv_of() { mongosh_in "$1" 'print(db.adminCommand({getParameter:1,featureCompatibilityVersion:1}).featureCompatibilityVersion.version)'; }

counts_of() { # prints "db.collection=count" for all non-system databases
  mongosh_in "$1" "
    db.getMongo().getDBNames().filter(n => !['admin','config','local'].includes(n)).sort().forEach(n => {
      const d = db.getSiblingDB(n);
      d.getCollectionInfos({type: 'collection'}, {nameOnly: true}).map(c => c.name).sort().forEach(c => print(n + '.' + c + '=' + d.getCollection(c).estimatedDocumentCount()));
    });"
}

has_documents() { printf '%s\n' "$1" | awk -F= 'NF == 2 && $2 > 0 { found = 1 } END { exit found ? 0 : 1 }'; }

major_of() { echo "${1%%.*}"; }
version_ge() { [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n 1)" = "$2" ]; } # $1 >= $2
mount_of() { docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/db"}}{{.Name}}{{end}}{{end}}' "$1"; }

start_temp() { # <image> <volume>: a throw-away mongod on the given data volume
  docker rm -f "$UPGRADE_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$UPGRADE_CONTAINER" -v "$2:/data/db" "$1" "${MONGO_ARGS[@]}" >/dev/null
  wait_ready "$UPGRADE_CONTAINER"
}

stop_temp() {
  docker stop -t 120 "$UPGRADE_CONTAINER" >/dev/null
  docker rm "$UPGRADE_CONTAINER" >/dev/null
}

check_source_version() { # <version> <fcv>
  [ "$(major_of "$1")" -lt 9 ] || die "the data is already on MongoDB $1"
  [ "$(major_of "$1")" -ge 6 ] || die "MongoDB $1 is older than 6.0: upgrade to 6.0 first"
  [ "$2" = "$(major_of "$1").0" ] || die "featureCompatibilityVersion is $2 but the server is $1. Finish the previous upgrade (setFeatureCompatibilityVersion) first"
}

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

write_state() {
  printf 'PROJECT=%s\nWORK_VOLUME=%s\nSOURCE_VOLUME=%s\nDONE_HOP=%s\nBACKUP_DIR=%s\n' \
    "$PROJECT" "$WORK_VOLUME" "$SOURCE_VOLUME" "$DONE_HOP" "${BACKUP_DIR:-}" > "$STATE_FILE"
}

# ---------------------------------------------------------------- preflight
TARGET_IMAGE="$(compose config 2>/dev/null | sed -n 's/^ *image: *\(mongo:[^ ]*\) *$/\1/p' | head -n 1)"
[ -n "$TARGET_IMAGE" ] || die "no 'mongo:<tag>' image found in $COMPOSE_FILE"
TARGET_VERSION="${TARGET_IMAGE#mongo:}"
[ "$(major_of "$TARGET_VERSION")" = "9" ] || die "$COMPOSE_FILE uses $TARGET_IMAGE; expected mongo 9.x. Update to the release that ships MongoDB 9 first."
compose config --volumes 2>/dev/null | grep -qx 'mongo_data' || die "$COMPOSE_FILE does not declare the 'mongo_data' volume; use the compose file of the release that ships MongoDB 9"

OLD_CONTAINER="$(compose ps -aq mongo 2>/dev/null | head -n 1 || true)"
if [ -z "$PROJECT" ]; then
  if [ -n "$OLD_CONTAINER" ]; then
    PROJECT="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$OLD_CONTAINER")"
  else
    PROJECT="$(compose config 2>/dev/null | sed -n 's/^name: *//p' | head -n 1)"
  fi
fi
[ -n "$PROJECT" ] || die "cannot determine the compose project name (use -p)"
TARGET_VOLUME="${PROJECT}_mongo_data"

DONE_HOP=""
WORK_VOLUME=""
SOURCE_VOLUME=""
BACKUP_DIR=""
if [ -f "$STATE_FILE" ]; then
  # shellcheck disable=SC1090
  . "$STATE_FILE"
  log "resuming: working volume ${WORK_VOLUME:-?}, finished steps up to ${DONE_HOP:-none}"
fi

if [ -z "$WORK_VOLUME" ]; then
  # ---------------------------------------------------------- find the old data
  OLD_IMAGE="${OPT_IMAGE:-$DEFAULT_OLD_IMAGE}"
  SOURCE_VOLUME="$OPT_VOLUME"
  EMPTY_NEW=0
  OLD_RUNNING=0

  if [ -n "$OLD_CONTAINER" ]; then
    CONTAINER_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$OLD_CONTAINER")"
    CONTAINER_VOLUME="$(mount_of "$OLD_CONTAINER")"
    if ! docker inspect -f '{{.State.Running}}' "$OLD_CONTAINER" | grep -q true; then
      log "starting the existing mongo container to inspect it"
      docker start "$OLD_CONTAINER" >/dev/null
    fi
    wait_ready "$OLD_CONTAINER"
    CONTAINER_VERSION="$(mongosh_in "$OLD_CONTAINER" 'print(db.version())')"
    if [ "$(major_of "$CONTAINER_VERSION")" -ge 9 ]; then
      NEW_COUNTS="$(counts_of "$OLD_CONTAINER")"
      if has_documents "$NEW_COUNTS"; then
        [ -z "$OPT_VOLUME" ] || die "MongoDB $CONTAINER_VERSION already holds data in volume ${CONTAINER_VOLUME:-?}; refusing to overwrite it"
        log "MongoDB is already $CONTAINER_VERSION, nothing to do"
        exit 0
      fi
      [ -n "$OPT_VOLUME" ] || die "MongoDB $CONTAINER_VERSION is running on volume ${CONTAINER_VOLUME:-?} but its database is empty. If your data is still in the old volume, run the script again with -V <old volume> (see: docker volume ls)"
      EMPTY_NEW=1
    else
      OLD_IMAGE="${OPT_IMAGE:-$CONTAINER_IMAGE}"
      [ -n "$SOURCE_VOLUME" ] || SOURCE_VOLUME="$CONTAINER_VOLUME"
      OLD_FCV="$(fcv_of "$OLD_CONTAINER")"
      log "project: $PROJECT, MongoDB $CONTAINER_VERSION, FCV $OLD_FCV"
      check_source_version "$CONTAINER_VERSION" "$OLD_FCV"
      OLD_RUNNING=1
    fi
  fi

  if [ -z "$SOURCE_VOLUME" ]; then
    CANDIDATES="$(docker volume ls --format '{{.Name}}' | grep -i mongo || true)"
    die "no old mongo container found for $COMPOSE_FILE (project $PROJECT). If you ran 'docker compose down', name the volume with the old data using -V.${CANDIDATES:+ Volumes that look like MongoDB data: $(echo "$CANDIDATES" | tr '\n' ' ')}If this is a new installation, no upgrade is needed"
  fi
  docker volume inspect "$SOURCE_VOLUME" >/dev/null 2>&1 || die "volume $SOURCE_VOLUME does not exist"
  [ "$SOURCE_VOLUME" != "$TARGET_VOLUME" ] || [ "$EMPTY_NEW" = "0" ] || die "-V points at the volume MongoDB 9 is already using"
  log "project: $PROJECT, old data volume: $SOURCE_VOLUME"

  DATA_KB="$(docker run --rm --entrypoint du -v "$SOURCE_VOLUME:/src:ro" "$OLD_IMAGE" -sk /src | cut -f1)"
  FREE_KB="$(df -Pk "$BACKUP_ROOT" | awk 'NR==2 {print $4}')"
  log "data size ~$((DATA_KB / 1024)) MB, free space in backup location ~$((FREE_KB / 1024)) MB"
  [ "$FREE_KB" -gt $((DATA_KB + DATA_KB / 5)) ] || die "not enough free space in $BACKUP_ROOT for the backup"

  if [ "$ASSUME_YES" -ne 1 ]; then
    printf '\nThis will stop the whole Guardian stack, back up MongoDB to %s, upgrade it to %s and restart the stack.\nThe original data volume is kept. Continue? [y/N] ' "$BACKUP_ROOT" "$TARGET_VERSION"
    read -r answer
    case "$answer" in y|Y|yes|YES) ;; *) die "aborted" ;; esac
  fi

  # ------------------------------------------------------------ stop, then back up
  # Everything is stopped first, so nothing can write between the backup and the upgrade.
  log "stopping the stack"
  compose stop -t 120 >/dev/null
  STAMP="$(date +%Y%m%d-%H%M%S)"
  BACKUP_DIR="$BACKUP_ROOT/$STAMP"
  mkdir -p "$BACKUP_DIR"

  log "starting the old MongoDB alone to take the backup"
  start_temp "$OLD_IMAGE" "$SOURCE_VOLUME"
  CURRENT_VERSION="$(mongosh_in "$UPGRADE_CONTAINER" 'print(db.version())')"
  check_source_version "$CURRENT_VERSION" "$(fcv_of "$UPGRADE_CONTAINER")"
  DONE_HOP="$(major_of "$CURRENT_VERSION").0"
  log "dumping the database to $BACKUP_DIR/mongo-dump.archive.gz"
  docker exec "$UPGRADE_CONTAINER" mongodump --archive --gzip --quiet > "$BACKUP_DIR/mongo-dump.archive.gz"
  [ -s "$BACKUP_DIR/mongo-dump.archive.gz" ] || die "mongodump produced an empty file"
  counts_of "$UPGRADE_CONTAINER" > "$BACKUP_DIR/counts.txt"
  log "recorded $(wc -l < "$BACKUP_DIR/counts.txt" | tr -d ' ') collections"
  stop_temp

  log "copying the data volume to $BACKUP_DIR/mongo-volume.tar.gz (cold backup)"
  docker run --rm --entrypoint tar -v "$SOURCE_VOLUME:/src:ro" -v "$BACKUP_DIR:/backup" "$OLD_IMAGE" czf /backup/mongo-volume.tar.gz -C /src .

  # ------------------------------------------------------------ volume
  if [ "$SOURCE_VOLUME" = "$TARGET_VOLUME" ]; then
    WORK_VOLUME="$SOURCE_VOLUME"
  else
    if [ "$EMPTY_NEW" = "1" ]; then
      # MongoDB 9 was started on an empty volume: keep a snapshot of it and replace it with the old data.
      log "MongoDB 9 was started on an empty $TARGET_VOLUME: snapshotting and replacing it"
      docker run --rm --entrypoint tar -v "$TARGET_VOLUME:/src:ro" -v "$BACKUP_DIR:/backup" "$OLD_IMAGE" czf /backup/empty-mongo9-volume.tar.gz -C /src .
      docker rm "$OLD_CONTAINER" >/dev/null
      docker volume rm "$TARGET_VOLUME" >/dev/null
    fi
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
  write_state
else
  log "stopping the stack"
  compose stop -t 120 >/dev/null
fi

# ---------------------------------------------------------------- hops
run_hop() { # <fcv> <image>
  local fcv="$1" image="$2"
  log "upgrading to $image (FCV $fcv)"
  start_temp "$image" "$WORK_VOLUME"
  mongosh_in "$UPGRADE_CONTAINER" "printjson(db.adminCommand({setFeatureCompatibilityVersion: '$fcv', confirm: true}))" >/dev/null
  [ "$(fcv_of "$UPGRADE_CONTAINER")" = "$fcv" ] || die "FCV did not change to $fcv"
  stop_temp
  DONE_HOP="$fcv"
  write_state
}

for hop in "${HOP_IMAGES[@]}"; do
  fcv="${hop%%:*}"
  image="${hop#*:}"
  if version_ge "$DONE_HOP" "$fcv"; then continue; fi
  run_hop "$fcv" "$image"
done
if ! version_ge "$DONE_HOP" "9.0"; then
  run_hop "9.0" "$TARGET_IMAGE"
fi

# ---------------------------------------------------------------- verify, then start the rest
# MongoDB comes up alone first, so the counts are compared before any Guardian service can write.
log "starting MongoDB with $TARGET_IMAGE"
compose up -d --no-deps mongo
NEW_CONTAINER="$(compose ps -q mongo | head -n 1)"
wait_ready "$NEW_CONTAINER"
FINAL_VERSION="$(mongosh_in "$NEW_CONTAINER" 'print(db.version())')"
FINAL_FCV="$(fcv_of "$NEW_CONTAINER")"
[ "$(major_of "$FINAL_VERSION")" = "9" ] && [ "$FINAL_FCV" = "9.0" ] || die "unexpected result: MongoDB $FINAL_VERSION, FCV $FINAL_FCV"

if [ -n "$BACKUP_DIR" ] && [ -f "$BACKUP_DIR/counts.txt" ]; then
  counts_of "$NEW_CONTAINER" > "$BACKUP_DIR/counts-after.txt"
  if diff -q "$BACKUP_DIR/counts.txt" "$BACKUP_DIR/counts-after.txt" >/dev/null; then
    log "document counts match the backup"
  else
    diff "$BACKUP_DIR/counts.txt" "$BACKUP_DIR/counts-after.txt" || true
    die "document counts differ from the backup (see above)"
  fi
fi

log "starting the Guardian stack"
compose up -d --remove-orphans

rm -f "$STATE_FILE"
log "done: MongoDB $FINAL_VERSION, FCV $FINAL_FCV, data volume $WORK_VOLUME"
log "backup: ${BACKUP_DIR:-$BACKUP_ROOT}"
if [ -n "$SOURCE_VOLUME" ] && [ "$SOURCE_VOLUME" != "$WORK_VOLUME" ]; then
  log "the old data volume $SOURCE_VOLUME was left untouched; remove it once you have verified the upgrade: docker volume rm $SOURCE_VOLUME"
fi
log "rollback: see 'Upgrading MongoDB from 6 to 9' in the documentation (old volume: ${SOURCE_VOLUME:-n/a}, snapshot: ${BACKUP_DIR:-n/a}/mongo-volume.tar.gz)"
