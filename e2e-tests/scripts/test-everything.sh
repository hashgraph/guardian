#!/usr/bin/env bash
# One entry point for every test of the repository that is not a service unit test run by main.yml:
#
#   npm run test:everything                  # every group below, in this order
#   npm run test:everything -- lint scripts  # only the groups named
#
#   lint             npx eslint cypress                                        (e2e-tests)
#   scripts          node --test scripts/*.test.mjs, the report-summary tests (e2e-tests, .github)
#   frontend         the frontend unit specs, Vitest in headless Chromium      (needs `npx playwright install chromium`)
#   cypress          the whole Cypress suite through scripts/local-guardian.sh (needs `npm run guardian:up` first)
#
# A group that fails does not stop the others; the summary at the end lists each one and the exit code
# is non-zero when any failed.
set -uo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$E2E_DIR/.." && pwd)"

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

results=()
failed=0
for group in "${groups[@]}"; do
  echo "::group::$group"
  "run_${group//-/_}"
  status=$?
  echo "::endgroup::"
  if [[ $status -eq 0 ]]; then results+=("PASS  $group"); else results+=("FAIL  $group (exit $status)"); failed=1; fi
done

echo
echo "Summary"
printf '  %s\n' "${results[@]}"
exit $failed
