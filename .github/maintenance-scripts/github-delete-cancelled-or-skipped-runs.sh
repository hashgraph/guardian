#!/usr/bin/env bash
# This script deletes all cancelled runs in the current repository.
set -euo pipefail

echo "Deleting all cancelled runs in the current repository..."
gh run list --status cancelled --limit 500 --json databaseId -q '.[].databaseId' | xargs --no-run-if-empty --max-args=1 gh run delete

echo "Deleting all skipped runs in the current repository..."
gh run list --status skipped --limit 500 --json databaseId -q '.[].databaseId' | xargs --no-run-if-empty --max-args=1 gh run delete

echo "Done!"