#!/usr/bin/env bash
# Runs the Guardian stack natively against the local Hiero network that `npm run solo:up` created,
# the same way .github/workflows/e2e-tests.yml does, and runs the e2e suite against it.
#
#   npm run solo:up                          # once, creates the network and .solo/solo.env
#   scripts/local-guardian.sh build [PKG...] # installs the Guardian workspace and builds the packages the stack runs
#   scripts/local-guardian.sh infra-up       # infra containers only (needs docker: run it where docker is)
#   scripts/local-guardian.sh services-up    # Guardian services only, waits until ready (can run in a dev container)
#   scripts/local-guardian.sh up             # infra-up + services-up
#   scripts/local-guardian.sh test [SPEC...] # Cypress, every test; SPECs limit it to spec files or globs
#   scripts/local-guardian.sh smoke          # Cypress, only the tests tagged smoke
#   scripts/local-guardian.sh services-down  # stops the services
#   scripts/local-guardian.sh infra-down     # removes the infra containers
#   scripts/local-guardian.sh down           # services-down + infra-down
#
# The services reach the infra and the Hedera network at INFRA_HOST: 127.0.0.1 on the machine that runs
# the containers, host.docker.internal inside a dev container (detected through /.dockerenv, override it
# by exporting INFRA_HOST). A dev container has its own network namespace, so the gateway is then
# http://127.0.0.1:3002 there and a service left over on the host cannot hold its ports.
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
if [[ -z "${INFRA_HOST:-}" ]]; then
  if [[ -f /.dockerenv ]]; then INFRA_HOST=host.docker.internal; else INFRA_HOST=127.0.0.1; fi
fi
INFRA_CONTAINERS=(guardian-e2e-cache guardian-e2e-nats guardian-e2e-mongo guardian-e2e-ipfs)
GUARDIAN_PACKAGES=(
  @guardian/interfaces @guardian/common @guardian/hedera
  logger-service notification-service auth-service queue-service topic-listener-service
  policy-service worker-service guardian-service api-gateway
)

fail() { echo "error: $*" >&2; exit 1; }

load_environment() {
  [[ -f "$SOLO_ENV" ]] || fail "$SOLO_ENV not found: run \`npm run solo:up\` first"
  set -a
  # shellcheck disable=SC1090
  source "$SOLO_ENV"
  set +a
  # A failure inside the substitution would not stop eval, so capture the output first.
  local quickstart_exports
  quickstart_exports=$(node "$E2E_DIR/scripts/quickstart-env.mjs") || fail "cannot read the quickstart JWT keys"
  [[ -n "$quickstart_exports" ]] || fail "scripts/quickstart-env.mjs printed no JWT keys"
  eval "$quickstart_exports"
  export JWT_PRIVATE_KEY JWT_PUBLIC_KEY SERVICE_JWT_PUBLIC_KEY_ALL SERVICE_JWT_SECRET_KEY_ALL
}

export_service_environment() {
  export GUARDIAN_LOG_DIR="$LOG_DIR" WORKER_COUNT
  export NODE_OPTIONS="--openssl-legacy-provider"
  export MQ_ADDRESS="$INFRA_HOST" DB_HOST="$INFRA_HOST" DB_LOGGER_HOST="$INFRA_HOST" HOST_CACHE="$INFRA_HOST"
  export NATS_MONITOR="http://$INFRA_HOST:8222"
  export IPFS_PROVIDER=local IPFS_NODE_ADDRESS="http://$INFRA_HOST:5001"
  export IPFS_PUBLIC_GATEWAY="http://$INFRA_HOST:8080/ipfs/{cid}"
  export IPFS_TIMEOUT=720 ACCESS_TOKEN_UPDATE_INTERVAL=600000
  export INITIAL_BALANCE=10000 INITIAL_STANDARD_REGISTRY_BALANCE=100000
  export MIN_PASSWORD_LENGTH=4 PASSWORD_COMPLEXITY=easy
  # Large NATS replies are fetched from this host, and a laptop's hostname often does not resolve.
  export DIRECT_MESSAGE_HOST=127.0.0.1
  # solo.env points at the network through the loopback of the machine that runs it.
  export LOCALNODE_ADDRESS="${LOCALNODE_ADDRESS//127.0.0.1/$INFRA_HOST}"
  export OVERRIDE_HEDERA_CONSENSUS_NODES="${OVERRIDE_HEDERA_CONSENSUS_NODES//127.0.0.1/$INFRA_HOST}"
  export OVERRIDE_HEDERA_MIRROR_NODES="${OVERRIDE_HEDERA_MIRROR_NODES//127.0.0.1/$INFRA_HOST}"
}

# The Yarn release is vendored (yarnPath in .yarnrc.yml), so neither a global yarn nor corepack is needed.
run_yarn() {
  local yarn_path
  yarn_path=$(sed -n 's/^yarnPath: *//p' "$REPO_ROOT/.yarnrc.yml")
  [[ -n "$yarn_path" ]] || fail "no yarnPath in $REPO_ROOT/.yarnrc.yml"
  (cd "$REPO_ROOT" && node "$REPO_ROOT/$yarn_path" "$@")
}

# The same build as .github/workflows/e2e-run.yml; the services run dist/, so restart them afterwards.
build_guardian() {           # build_guardian [package...], every package of the stack by default
  [[ $# -gt 0 ]] || set -- "${GUARDIAN_PACKAGES[@]}"
  local include_flags=() package
  for package in "$@"; do include_flags+=(--include "$package"); done
  run_yarn install --immutable
  NODE_OPTIONS=--openssl-legacy-provider \
    run_yarn workspaces foreach -A --topological-dev --parallel --jobs 4 "${include_flags[@]}" run build
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
  build)
    shift
    build_guardian "$@"
    ;;
  infra-up)
    start_infra
    echo "Infra is up (MongoDB 27017, NATS 4222, Valkey 6379, Kubo 5001/8080)"
    ;;
  services-up)
    load_environment
    export_service_environment
    start_services
    echo "Guardian is up on http://127.0.0.1:3002; logs in $LOG_DIR"
    ;;
  up)
    "$0" infra-up
    "$0" services-up
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
  services-down)
    stop_services
    ;;
  infra-down)
    stop_infra
    ;;
  down)
    stop_services
    stop_infra
    ;;
  *)
    fail "usage: local-guardian.sh build [PKG...]|infra-up|services-up|up|test [SPEC...]|smoke|services-down|infra-down|down"
    ;;
esac
