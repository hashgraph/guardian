#!/usr/bin/env bash
set -euo pipefail

mkdir -p \
  /e2e/cypress/reports/html/.jsons \
  /e2e/cypress/test_results/junit \
  /e2e/cypress/screenshots \
  /e2e/cypress/videos \
  /e2e/cypress/downloads

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

RAW_TAGS="${CYPRESS_grepTags:-all}"
TAGS="$(normalize_tags_to_space_list "$RAW_TAGS")"
if [[ -z "$TAGS" ]]; then
  TAGS="all"
fi

# Ensure feature-scoped runs include `preparing` (but never force it for `all`).
if ! contains_tag "$TAGS" "all" && ! contains_tag "$TAGS" "preparing"; then
  TAGS="preparing $TAGS"
fi

GREP_FILTER_SPECS="${CYPRESS_grepFilterSpecs:-true}"
BROWSER="${CYPRESS_BROWSER:-electron}"

env_pairs=()
env_pairs+=("grepTags=$TAGS")
env_pairs+=("grepFilterSpecs=$GREP_FILTER_SPECS")

if [[ -n "${CYPRESS_portApi:-}" ]]; then
  env_pairs+=("portApi=$CYPRESS_portApi")
fi

if [[ -n "${CYPRESS_baseUrl:-}" ]]; then
  env_pairs+=("baseUrl=$CYPRESS_baseUrl")
fi

if [[ -n "${CYPRESS_apiServer:-}" ]]; then
  env_pairs+=("apiServer=$CYPRESS_apiServer")
fi

if [[ -n "${CYPRESS_apiIndexer:-}" ]]; then
  env_pairs+=("apiIndexer=$CYPRESS_apiIndexer")
fi

if [[ -n "${CYPRESS_operatorId:-}" ]]; then
  env_pairs+=("operatorId=$CYPRESS_operatorId")
elif [[ -n "${OPERATOR_ID:-}" ]]; then
  env_pairs+=("operatorId=$OPERATOR_ID")
fi

if [[ -n "${CYPRESS_operatorKey:-}" ]]; then
  env_pairs+=("operatorKey=$CYPRESS_operatorKey")
elif [[ -n "${OPERATOR_KEY:-}" ]]; then
  env_pairs+=("operatorKey=$OPERATOR_KEY")
fi

if [[ -n "${CYPRESS_MGSAdmin:-}" ]]; then
  env_pairs+=("MGSAdmin=$CYPRESS_MGSAdmin")
fi

if [[ -n "${CYPRESS_MGSIndexerAPIToken:-}" ]]; then
  env_pairs+=("MGSIndexerAPIToken=$CYPRESS_MGSIndexerAPIToken")
fi

ENV_STRING="$(IFS=,; echo "${env_pairs[*]}")"

cmd=(npx cypress run --config-file cypress.config.js --browser "$BROWSER" --env "$ENV_STRING")

exec "${cmd[@]}" "$@"
