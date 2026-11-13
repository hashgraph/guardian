#!/usr/bin/env bash
# One entry point for every test of the repository that is not a service unit test run by main.yml:
#
#   npm run test:everything                  # every group below, in this order
#   npm run test:everything -- lint scripts  # only the groups named
#
#   lint             npx eslint cypress                                        (e2e-tests)
#   scripts          node --test scripts/*.test.mjs, the report-summary tests (e2e-tests, .github)
#   frontend         the frontend unit specs, Vitest in headless Chromium
#   cypress          the whole Cypress suite through scripts/local-guardian.sh, against the running stack
#
# It expects the README Quickstart to be done (`npm ci`, `npm run guardian:build`, `npm run solo:up`,
# `npm run guardian:up`) and does not touch the stack. Before the first group it checks the stack with
# `npm run guardian:status` when the cypress group runs, and stops there if it is not ready; then it
# prepares, once, what the Quickstart does not: the frontend dependencies and the Playwright browser,
# when the frontend group runs.
#
# A group that fails does not stop the others; the summary at the end lists each one and the exit code
# is non-zero when any failed.
set -uo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$E2E_DIR/.." && pwd)"

prepare_frontend() {
  (cd "$REPO_ROOT/frontend" && npm ci --no-audit --no-fund && npx playwright install chromium)
}

run_lint()            { (cd "$E2E_DIR" && npx eslint cypress); }
run_scripts()         { (cd "$E2E_DIR" && npm run test:scripts) && (cd "$REPO_ROOT" && node --test .github/scripts/report-test-summary.test.mjs); }
run_frontend()        { (cd "$REPO_ROOT/frontend" && npx ng test --watch=false); }
run_cypress()         { (cd "$E2E_DIR" && npm run guardian:test); }

ALL_GROUPS=(lint scripts frontend cypress)

groups=("$@")
[[ ${#groups[@]} -eq 0 ]] && groups=("${ALL_GROUPS[@]}")

for group in "${groups[@]}"; do
  case " ${ALL_GROUPS[*]} " in
    *" $group "*) ;;
    *) echo "Unknown group '$group'. Groups: ${ALL_GROUPS[*]}" >&2; exit 2 ;;
  esac
done

if [[ " ${groups[*]} " == *" cypress "* ]]; then
  echo "::group::check the stack"
  (cd "$E2E_DIR" && npm run guardian:status)
  stack_status=$?
  echo "::endgroup::"
  if [[ $stack_status -ne 0 ]]; then
    echo "error: the stack is not ready, see the checks above: start it with \`npm run guardian:up\`," \
      "or run the other groups only (npm run test:everything -- lint scripts frontend)" >&2
    exit 1
  fi
fi

frontend_preparation_status=0
if [[ " ${groups[*]} " == *" frontend "* ]]; then
  echo "::group::prepare frontend"
  prepare_frontend
  frontend_preparation_status=$?
  echo "::endgroup::"
fi

# A group whose preparation failed is reported with the preparation's exit code and not run.
run_group() {
  case "$1" in
    lint)     run_lint ;;
    scripts)  run_scripts ;;
    frontend) [[ $frontend_preparation_status -eq 0 ]] || return "$frontend_preparation_status"; run_frontend ;;
    cypress)  run_cypress ;;
  esac
}

results=()
failed=0
for group in "${groups[@]}"; do
  echo "::group::$group"
  run_group "$group"
  status=$?
  echo "::endgroup::"
  if [[ $status -eq 0 ]]; then results+=("PASS  $group"); else results+=("FAIL  $group (exit $status)"); failed=1; fi
done

echo
echo "Summary"
printf '  %s\n' "${results[@]}"
exit $failed
