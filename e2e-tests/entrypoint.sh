#!/usr/bin/env bash
set -euo pipefail

ensure_trailing_slash() {
  local url="${1:-}"
  if [[ -z "$url" ]]; then
    printf '%s' ""
    return 0
  fi
  if [[ "$url" == */ ]]; then
    printf '%s' "$url"
  else
    printf '%s' "${url}/"
  fi
}

normalize_tags_to_space_list() {
  local raw="${1:-}"
  raw="$(printf '%s' "$raw" | sed -E 's/,/ /g; s/[[:space:]]+/ /g; s/^ //; s/ $//')"
  printf '%s' "$raw"
}

contains_tag() {
  local haystack="${1:-}"
  local needle="${2:-}"
  for t in $haystack; do
    if [[ "$t" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

wait_for_api() {
  local api_origin="${1:-}"
  local timeout_seconds="${2:-60}"
  local sleep_seconds="${3:-2}"

  api_origin="$(ensure_trailing_slash "$api_origin")"
  if [[ -z "$api_origin" ]]; then
    return 0
  fi

  if ! command -v curl >/dev/null 2>&1; then
    return 0
  fi

  local url="${api_origin}accounts/login/"
  local start
  start="$(date +%s)"

  while true; do
    local code
    code="$(
      curl -sS -o /dev/null -w '%{http_code}' \
        -X POST \
        -H 'content-type: application/json' \
        --data '{"username":"_","password":"_"}' \
        "$url" || echo "000"
    )"

    # 401 is expected for invalid credentials; 400/422 are also acceptable "route exists" signals.
    if [[ "$code" == "401" || "$code" == "400" || "$code" == "422" ]]; then
      return 0
    fi

    local now
    now="$(date +%s)"
    if (( now - start >= timeout_seconds )); then
      echo "Timed out waiting for API at ${url} (last status: ${code})" >&2
      return 1
    fi

    sleep "$sleep_seconds"
  done
}

wait_for_http_ok() {
  local url="${1:-}"
  local timeout_seconds="${2:-60}"
  local sleep_seconds="${3:-2}"

  if [[ -z "$url" ]]; then
    return 0
  fi

  if ! command -v curl >/dev/null 2>&1; then
    return 0
  fi

  local start
  start="$(date +%s)"

  while true; do
    local code
    code="$(
      curl -sS -o /dev/null -w '%{http_code}' \
        -X GET \
        "$url" || echo "000"
    )"

    # Any 2xx/3xx is good enough as "server is up".
    if [[ "$code" =~ ^2[0-9]{2}$ || "$code" =~ ^3[0-9]{2}$ ]]; then
      return 0
    fi

    local now
    now="$(date +%s)"
    if (( now - start >= timeout_seconds )); then
      echo "Timed out waiting for server at ${url} (last status: ${code})" >&2
      return 1
    fi

    sleep "$sleep_seconds"
  done
}

has_flag() {
  local flag="${1:-}"
  shift || true
  for a in "$@"; do
    if [[ "$a" == "$flag" ]]; then
      return 0
    fi
  done
  return 1
}

RAW_TAGS="${CYPRESS_grepTags:-all}"
TAGS="$(normalize_tags_to_space_list "$RAW_TAGS")"
if [[ -z "$TAGS" ]]; then
  TAGS="all"
fi

if ! contains_tag "$TAGS" "all" && ! contains_tag "$TAGS" "preparing" && ! contains_tag "$TAGS" "ui"; then
  TAGS="preparing $TAGS"
fi

export CYPRESS_grepTags="$TAGS"
export CYPRESS_grepFilterSpecs="${CYPRESS_grepFilterSpecs:-true}"

IS_UI_RUN=false
if [[ -n "${CYPRESS_baseUrl:-}" ]]; then
  IS_UI_RUN=true
elif contains_tag "$TAGS" "ui"; then
  IS_UI_RUN=true
fi

mkdir -p \
  /e2e/cypress/reports/html/.jsons \
  /e2e/cypress/test_results/junit \
  /e2e/cypress/downloads

if [[ "$IS_UI_RUN" == "true" ]]; then
  mkdir -p /e2e/cypress/screenshots /e2e/cypress/videos
else
  export CYPRESS_screenshotOnRunFailure=false
fi

if [[ -z "${CYPRESS_operatorId:-}" && -n "${OPERATOR_ID:-}" ]]; then
  export CYPRESS_operatorId="$OPERATOR_ID"
fi
if [[ -z "${CYPRESS_operatorKey:-}" && -n "${OPERATOR_KEY:-}" ]]; then
  export CYPRESS_operatorKey="$OPERATOR_KEY"
fi

if [[ -n "${CYPRESS_apiServer:-}" ]]; then
  wait_for_api "$CYPRESS_apiServer" "${CYPRESS_API_WAIT_TIMEOUT:-60}" "${CYPRESS_API_WAIT_INTERVAL:-2}"
fi

if [[ -n "${CYPRESS_baseUrl:-}" ]]; then
  wait_for_http_ok "$(ensure_trailing_slash "$CYPRESS_baseUrl")" "${CYPRESS_UI_WAIT_TIMEOUT:-90}" "${CYPRESS_UI_WAIT_INTERVAL:-2}"
fi

BROWSER="${CYPRESS_BROWSER:-electron}"
cmd=(npx cypress run --config-file cypress.config.js --browser "$BROWSER")

if [[ -n "${CYPRESS_SPEC:-}" ]] && ! has_flag "--spec" "$@"; then
  cmd+=(--spec "$CYPRESS_SPEC")
fi

if [[ "${1:-}" == "--" ]]; then
  shift
fi

exec "${cmd[@]}" "$@"
