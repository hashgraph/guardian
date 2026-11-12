#!/usr/bin/env bash
# One entry point for every test of the repository that is not a service unit test run by main.yml:
#
#   npm run test:everything                  # every group below, in this order
#   npm run test:everything -- lint scripts  # only the groups named
#
#   lint             npx eslint cypress                                        (e2e-tests)
#   scripts          node --test scripts/*.test.mjs, the report-summary tests (e2e-tests, .github)
#   frontend         the frontend unit specs, Vitest in headless Chromium
#   cypress          the whole Cypress suite through scripts/local-guardian.sh (needs `npm run solo:up` and `npm run guardian:infra:up` first)
#
# Every group installs and builds what it needs first (`npm ci`, the Playwright browser, `npm run
# guardian:build`). The cypress group stops the Guardian services, rebuilds them and starts them
# again, so the suite runs the current sources; it still needs the network and the infra containers.
#
# A group that fails does not stop the others; the summary at the end lists each one and the exit code
# is non-zero when any failed.
set -uo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$E2E_DIR/.." && pwd)"

install_dependencies() { (cd "$1" && npm ci --no-audit --no-fund); }

# Several groups need the e2e-tests dependencies; installing them once is enough.
e2e_dependencies_installed=false
install_e2e_dependencies() {
  $e2e_dependencies_installed && return 0
  install_dependencies "$E2E_DIR" && e2e_dependencies_installed=true
}

run_e2e_script() { (cd "$E2E_DIR" && npm run "$@"); }

prepare_lint()        { install_e2e_dependencies; }
prepare_scripts()     { install_e2e_dependencies; }
prepare_frontend() {
  # The frontend links @guardian/interfaces through file:../interfaces, so it needs that build.
  run_e2e_script guardian:build -- @guardian/interfaces \
    && install_dependencies "$REPO_ROOT/frontend" \
    && (cd "$REPO_ROOT/frontend" && npx playwright install chromium)
}
# The services run dist/: they are stopped before the build and started after it, so they neither
# keep the old code nor load a half-written dist/. A failed build leaves them stopped.
prepare_cypress() {
  install_e2e_dependencies \
    && run_e2e_script guardian:services:down \
    && run_e2e_script guardian:build \
    && run_e2e_script guardian:services:up
}

run_lint()            { (cd "$E2E_DIR" && npx eslint cypress); }
run_scripts()         { (cd "$E2E_DIR" && npm run test:scripts) && (cd "$REPO_ROOT" && node --test .github/scripts/report-test-summary.test.mjs); }
run_frontend()        { (cd "$REPO_ROOT/frontend" && npx ng test --watch=false); }
run_cypress()         { run_e2e_script guardian:test; }

ALL_GROUPS=(lint scripts frontend cypress)

# Prepares the group and, only when that succeeded, runs it; the exit code is the failing step's.
run_group() {
  case "$1" in
    lint)     prepare_lint     && run_lint ;;
    scripts)  prepare_scripts  && run_scripts ;;
    frontend) prepare_frontend && run_frontend ;;
    cypress)  prepare_cypress  && run_cypress ;;
  esac
}

groups=("$@")
[[ ${#groups[@]} -eq 0 ]] && groups=("${ALL_GROUPS[@]}")

for group in "${groups[@]}"; do
  case " ${ALL_GROUPS[*]} " in
    *" $group "*) ;;
    *) echo "Unknown group '$group'. Groups: ${ALL_GROUPS[*]}" >&2; exit 2 ;;
  esac
done

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
