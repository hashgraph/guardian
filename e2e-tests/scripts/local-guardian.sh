#!/usr/bin/env bash
# Runs the Guardian stack natively against the local Hiero network that `npm run solo:up` created,
# the same way .github/workflows/e2e-tests.yml does, and runs the e2e suite against it.
#
#   npm run solo:up                          # once, creates the network and .solo/solo.env
#   scripts/local-guardian.sh build [PKG...] # installs the Guardian workspace and builds the packages the stack runs
#   scripts/local-guardian.sh infra-up       # infra containers only (needs docker: run it where docker is)
#   scripts/local-guardian.sh services-up    # Guardian services only, waits until ready (can run in a dev container)
#   scripts/local-guardian.sh up             # infra-up + services-up
#   scripts/local-guardian.sh status         # checks the network, the infra and the services, one line each
#   scripts/local-guardian.sh test [SPEC...] # Cypress, every test; SPECs limit it to spec files or globs
#   scripts/local-guardian.sh smoke          # Cypress, only the tests tagged smoke
#   scripts/local-guardian.sh stop-policies  # stops the policy processes the services forked (about 280 MB each)
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
# Logs and pids are in e2e-tests/.local/logs/. `test` and `smoke` run the `status` checks first and stop
# when one fails, rather than leaving Cypress waiting on a stack that does not answer. With
# STOP_POLICIES_AFTER_TESTS=1 they run `stop-policies` once Cypress ends, whatever its result. Credentials: the JWT keys come from
# configs/.env.quickstart.guardian.system, the operator and network settings from .solo/solo.env.
set -euo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$E2E_DIR/.." && pwd)"
STATE_DIR="$E2E_DIR/.local"
LOG_DIR="$STATE_DIR/logs"
# wait-for-guardian.mjs reads the pids from GUARDIAN_LOG_DIR to notice a service that dies at startup.
PID_FILE="$LOG_DIR/pids"
GATEWAY_URL=http://127.0.0.1:3002
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
  export GUARDIAN_LOG_DIR="$LOG_DIR" WORKER_COUNT E2E_ENV_FILE="$E2E_DIR/cypress.env.json"
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
    -p 127.0.0.1:4001:4001 -p 127.0.0.1:5001:5001 -p 127.0.0.1:8080:8080 ipfs/kubo:v0.43.1 daemon --offline >/dev/null

  local deadline=$((SECONDS + 180))
  until check_infra 127.0.0.1 >/dev/null; do
    [[ $SECONDS -lt $deadline ]] || { check_infra 127.0.0.1; fail "the infra containers did not become ready"; }
    sleep 2
  done
}

# Every check prints one OK or FAIL line; check_* functions return non-zero when any of theirs failed.
tcp_open() { (exec 3<>"/dev/tcp/$1/$2") 2>/dev/null; }
http_ok() { curl -fsS -m 5 -o /dev/null "$@" 2>/dev/null; }
report() {                   # report <component> <description> <command...>
  local component=$1 description=$2
  shift 2
  if "$@"; then printf 'OK    %-9s %s\n' "$component" "$description"; return 0; fi
  printf 'FAIL  %-9s %s\n' "$component" "$description"
  return 1
}

check_network() {
  report solo "network settings in .solo/solo.env (npm run solo:up)" test -f "$SOLO_ENV" || return 1
  local consensus mirror failed=0
  # shellcheck disable=SC1090
  consensus=$(source "$SOLO_ENV"; echo "${OVERRIDE_HEDERA_CONSENSUS_NODES//127.0.0.1/$INFRA_HOST}" | sed -E 's/^\{"([^"]+)".*/\1/')
  # shellcheck disable=SC1090
  mirror=$(source "$SOLO_ENV"; echo "${OVERRIDE_HEDERA_MIRROR_NODES//127.0.0.1/$INFRA_HOST}" | sed -E 's/^\["([^"]+)".*/\1/')
  report solo "consensus node on $consensus" tcp_open "${consensus%:*}" "${consensus##*:}" || failed=1
  report solo "mirror node REST API on $mirror" http_ok "$mirror/api/v1/network/nodes" || failed=1
  return $failed
}

check_infra() {              # check_infra <host>
  local host=$1 failed=0
  report infra "MongoDB on $host:27017" tcp_open "$host" 27017 || failed=1
  report infra "Valkey on $host:6379" tcp_open "$host" 6379 || failed=1
  report infra "NATS on $host:4222 (monitoring on 8222)" http_ok "http://$host:8222/varz" || failed=1
  report infra "Kubo API on $host:5001" http_ok -X POST "http://$host:5001/api/v0/id" || failed=1
  report infra "Kubo gateway on $host:8080" http_ok "http://$host:8080/ipfs/bafkqaaa" || failed=1
  return $failed
}

process_alive() { kill -0 "$1" 2>/dev/null; }

nats_client_count() {        # nats_client_count <connz json> <client name>
  grep -oE "\"name\": ?\"$2\"" <<< "$1" | wc -l | tr -d ' '
}

check_services() {
  report services "services started by this script (${PID_FILE#"$E2E_DIR/"})" test -s "$PID_FILE" || return 1
  local failed=0 pid name connz client expected
  while read -r pid name; do
    report services "$name (pid $pid) running; log ${LOG_DIR#"$E2E_DIR/"}/${name/\#/-}.log" process_alive "$pid" || failed=1
  done < "$PID_FILE"
  connz=$(curl -fsS -m 5 "http://$INFRA_HOST:8222/connz?limit=1024" 2>/dev/null) || connz=""
  for client in LOGGER_SERVICE NOTIFICATION_SERVICE AUTH_SERVICE QUEUE_SERVICE policy-service LISTENER_SERVICE \
      WORKERS_SERVICE GUARDIANS_SERVICE API_GATEWAY; do
    expected=1; [[ $client == WORKERS_SERVICE ]] && expected=$WORKER_COUNT
    report services "$client connected to NATS ($expected expected)" \
      test "$(nats_client_count "$connz" "$client")" -eq "$expected" || failed=1
  done
  report services "API gateway on $GATEWAY_URL" http_ok "$GATEWAY_URL/metrics" || failed=1
  return $failed
}

check_stack() {
  local failed=0
  check_network || failed=1
  check_infra "$INFRA_HOST" || failed=1
  check_services || failed=1
  return $failed
}

stop_infra() {
  docker info >/dev/null 2>&1 || fail "docker is not reachable: start it, or run this where docker is"
  local container
  for container in "${INFRA_CONTAINERS[@]}"; do
    if docker container inspect "$container" >/dev/null 2>&1; then
      echo "removing $container"
      docker rm -f "$container" >/dev/null
    else
      echo "$container is not there"
    fi
  done
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
  # Services left running would hold the ports and the new ones would die at startup.
  ! tcp_open 127.0.0.1 3002 \
    || fail "something already listens on $GATEWAY_URL: stop the running Guardian services first" \
      "(npm run guardian:services:down; if they were not started by this script, find them with \`lsof -iTCP:3002 -sTCP:LISTEN\`)"
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

# A policy process stops on its DELETE_POLICY event; killed by a signal it is respawned by policy-service.
stop_policies() {
  node "$E2E_DIR/scripts/stop-policies.mjs" "$LOG_DIR" "$INFRA_HOST:4222"
}

# Exits with the status of Cypress, stopping the policy processes first when asked to.
finish_tests() {             # finish_tests <cypress status>
  if [[ "${STOP_POLICIES_AFTER_TESTS:-}" == 1 ]]; then
    stop_policies
  fi
  exit "$1"
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
  status)
    if check_stack; then echo "Everything is up."; else fail "some checks failed, see above"; fi
    ;;
  test)
    check_stack || fail "the stack is not ready, see the checks above"
    load_environment
    shift
    status=0
    run_tests all "$@" || status=$?
    finish_tests "$status"
    ;;
  smoke)
    check_stack || fail "the stack is not ready, see the checks above"
    load_environment
    status=0
    run_tests smoke || status=$?
    finish_tests "$status"
    ;;
  stop-policies)
    stop_policies
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
    fail "usage: local-guardian.sh build [PKG...]|infra-up|services-up|up|status|test [SPEC...]|smoke|stop-policies|services-down|infra-down|down"
    ;;
esac
