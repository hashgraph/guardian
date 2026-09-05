#!/usr/bin/env bash
set -euo pipefail

WEEKS=${1:-20}      # default: 20 weeks (~5 months) of runs will be kept, so we always include the last release and the previous one.
WORKFLOW=${2:-}     # optional: workflow name or file

# --- OS detection and date calculation --------------------------
OS="$(uname -s)"
case "$OS" in
  Darwin)
    WEEK_AGO=$(date -v-"${WEEKS}"w +%Y-%m-%d)
    ;;
  Linux)
    WEEK_AGO=$(date -d "${WEEKS} weeks ago" +%Y-%m-%d)
    ;;
  *)
    echo "❌ OS not supported: $OS"
    exit 1
    ;;
esac

LIMIT=500

# -- Keep a minimum amount of workflows --------------------
SKIP_IF_LESS_THAN=500
TOTAL_RUNS=$(gh run list --limit "$LIMIT" | wc -l | tr -d ' ')
echo "📋 Found $TOTAL_RUNS total runs (query limit: $LIMIT)."
if [ "$TOTAL_RUNS" -lt "$SKIP_IF_LESS_THAN" ]; then
  echo "⚠️  Less than $SKIP_IF_LESS_THAN runs found, skipping deletion."
  exit 0
fi

SEARCH_MSG="🔍 Searching for runs created before $WEEK_AGO (limit: $LIMIT results per page)"
[ -n "$WORKFLOW" ] && SEARCH_MSG="$SEARCH_MSG for workflow '$WORKFLOW'"
echo "$SEARCH_MSG"

# -- Retrieving runs ---------------------------------------------
RUNS=$(gh run list \
  --created "<=$WEEK_AGO" \
  ${WORKFLOW:+--workflow "$WORKFLOW"} \
  --limit "$LIMIT" \
  --json databaseId,name,createdAt \
  -q '.[] | "\(.databaseId)\t\(.name)\t\(.createdAt)"'
)

if [ -z "$RUNS" ]; then
  echo "✅ No runs older than $WEEKS weeks found."
  exit 0
fi

# -- Counting -----------------------------------------------
TOTAL=$(echo "$RUNS" | wc -l | tr -d ' ')
echo "📋 Found $TOTAL runs to delete."

DELETED=0
FAILED=0

while IFS=$'\t' read -r id name created; do
    echo -n "  → #$id  $name  ($created) ... "
    if gh run delete "$id" 2>/dev/null; then
        ((DELETED++)) || true
    else
        echo "❌ error"
        ((FAILED++)) || true
    fi
done <<< "$RUNS"

echo "🎉 Operation completed (deleted: $DELETED, failed: $FAILED)"
