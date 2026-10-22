#!/usr/bin/env bash
# Runs the Guardian stack natively against the local Hiero network that `npm run solo:up` created,
# the same way .github/workflows/e2e-tests.yml does, and runs the e2e suite against it.
#
#   npm run solo:up                          # once, creates the network and .solo/solo.env
#   scripts/local-guardian.sh up             # infra containers + Guardian services, waits until ready
#   scripts/local-guardian.sh test [SPEC...] # Cypress, every test; SPECs limit it to spec files or globs
#   scripts/local-guardian.sh smoke          # Cypress, only the tests tagged smoke
#   scripts/local-guardian.sh down           # stops the services and removes the infra containers
#
# Infra (MongoDB, NATS, Valkey, Kubo) is recreated on every `up`: the ledger is empty after each
# solo:up, so a database left over from an earlier run would point at accounts that no longer exist.
# Logs and pids are in e2e-tests/.local/. Credentials: the JWT keys come from
# configs/.env.quickstart.guardian.system, the operator and network settings from .solo/solo.env.
set -euo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$E2E_DIR/.." && pwd)"
STATE_DIR="$E2E_DIR/.local"
LOG_DIR="$STATE_DIR/logs"
PID_FILE="$STATE_DIR/pids"
SOLO_ENV="$E2E_DIR/.solo/solo.env"
WORKER_COUNT=5
INFRA_CONTAINERS=(guardian-e2e-cache guardian-e2e-nats guardian-e2e-mongo guardian-e2e-ipfs)

fail() { echo "error: $*" >&2; exit 1; }

load_environment() {
  [[ -f "$SOLO_ENV" ]] || fail "$SOLO_ENV not found: run \`npm run solo:up\` first"
  set -a
  # shellcheck disable=SC1090
  source "$SOLO_ENV"
  set +a
  eval "$(node "$E2E_DIR/scripts/quickstart-env.mjs")"
  export JWT_PRIVATE_KEY JWT_PUBLIC_KEY SERVICE_JWT_PUBLIC_KEY_ALL SERVICE_JWT_SECRET_KEY_ALL
}

export_service_environment() {
  export GUARDIAN_LOG_DIR="$LOG_DIR" WORKER_COUNT
  export NODE_OPTIONS="--openssl-legacy-provider"
  export IPFS_PROVIDER=local IPFS_NODE_ADDRESS=http://127.0.0.1:5001
  export IPFS_PUBLIC_GATEWAY='http://127.0.0.1:8080/ipfs/{cid}'
  export IPFS_TIMEOUT=720 ACCESS_TOKEN_UPDATE_INTERVAL=600000
  export INITIAL_BALANCE=10000 INITIAL_STANDARD_REGISTRY_BALANCE=100000
  export MIN_PASSWORD_LENGTH=4 PASSWORD_COMPLEXITY=easy
  # Large NATS replies are fetched from this host, and a laptop's hostname often does not resolve.
  export DIRECT_MESSAGE_HOST=127.0.0.1
}

start_infra() {
  stop_infra
  docker run -d --name guardian-e2e-cache -p 127.0.0.1:6379:6379 valkey/valkey:8.1-alpine >/dev/null
  docker run -d --name guardian-e2e-nats -p 127.0.0.1:4222:4222 -p 127.0.0.1:8222:8222 nats:2.12-alpine >/dev/null
  docker run -d --name guardian-e2e-mongo -p 127.0.0.1:27017:27017 mongo:7.0.41 >/dev/null
  docker run -d --name guardian-e2e-ipfs --init -e GOLOG_LOG_LEVEL=warn -e IPFS_TELEMETRY=off \
    -p 127.0.0.1:4001:4001 -p 127.0.0.1:5001:5001 -p 127.0.0.1:8080:8080 ipfs/kubo:v0.43.1 >/dev/null

  timeout 180 bash -c 'until (exec 3<>/dev/tcp/127.0.0.1/27017) 2>/dev/null \
    && (exec 3<>/dev/tcp/127.0.0.1/6379) 2>/dev/null \
    && curl -fsS http://127.0.0.1:8222/varz >/dev/null 2>&1 \
    && curl -fsS -X POST http://127.0.0.1:5001/api/v0/id >/dev/null 2>&1 \
    && curl -fsS http://127.0.0.1:8080/ipfs/bafkqaaa >/dev/null 2>&1; do sleep 2; done' \
    || fail "the infra containers did not become ready"
}

stop_infra() {
  docker rm -f "${INFRA_CONTAINERS[@]}" >/dev/null 2>&1 || true
}

start_service() {            # start_service <service> [instance]
  local service=$1 instance=${2:-1}
  (cd "$REPO_ROOT/$service" && exec npm start) > "$LOG_DIR/$service-$instance.log" 2>&1 &
  echo "$! $service#$instance" >> "$PID_FILE"
  echo "started $service#$instance (pid $!)"
}

wait_nats() {
  node "$REPO_ROOT/.github/scripts/wait-for-guardian.mjs" nats "$@"
}

start_services() {
  rm -rf "$LOG_DIR"; mkdir -p "$LOG_DIR"; : > "$PID_FILE"

  start_service logger-service
  start_service notification-service
  wait_nats LOGGER_SERVICE NOTIFICATION_SERVICE

  start_service auth-service
  start_service queue-service
  wait_nats AUTH_SERVICE QUEUE_SERVICE

  start_service policy-service
  start_service topic-listener-service
  for i in $(seq 1 "$WORKER_COUNT"); do start_service worker-service "$i"; done
  wait_nats policy-service LISTENER_SERVICE WORKERS_SERVICE

  start_service guardian-service
  wait_nats GUARDIANS_SERVICE

  start_service api-gateway
  wait_nats API_GATEWAY

  node "$REPO_ROOT/.github/scripts/wait-for-guardian.mjs" ready
}

kill_tree() {
  local pid=$1 child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do kill_tree "$child"; done
  kill "$pid" 2>/dev/null || true
}

stop_services() {
  [[ -f "$PID_FILE" ]] || return 0
  while read -r pid name; do
    echo "stopping $name (pid $pid)"
    kill_tree "$pid"
  done < "$PID_FILE"
  rm -f "$PID_FILE"
}

run_tests() {                # run_tests <tags> [spec...]
  local tags=$1 spec
  shift
  spec=$(IFS=,; echo "$*")
  cd "$E2E_DIR"
  CYPRESS_portApi=3002 CYPRESS_BROWSER="${CYPRESS_BROWSER:-electron}" \
    CYPRESS_minPasswordLength=4 CYPRESS_passwordComplexity=easy \
    CYPRESS_grepTags="$tags" CYPRESS_SPEC="$spec" ./entrypoint.sh
}

case "${1:-}" in
  up)
    load_environment
    export_service_environment
    start_infra
    start_services
    echo "Guardian is up on http://127.0.0.1:3002; logs in $LOG_DIR"
    ;;
  test)
    load_environment
    shift
    run_tests all "$@"
    ;;
  smoke)
    load_environment
    run_tests smoke
    ;;
  down)
    stop_services
    stop_infra
    ;;
  *)
    fail "usage: local-guardian.sh up|test [SPEC...]|smoke|down"
    ;;
esac
