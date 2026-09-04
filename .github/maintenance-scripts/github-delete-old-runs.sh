#!/usr/bin/env bash
set -euo pipefail

WEEKS=${1:-2}  # default: 2 weeks

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

# -- Check if there are enough runs to delete --------------------
# We have 3 workflows scheduled per day, so don't run the deletion process if there are less than 3 * 15 = 45 runs in the list
SKIP_IF_LESS_THAN=45
TOTAL_RUNS=$(gh run list --limit "$LIMIT" | wc -l | tr -d ' ')
echo "📋 Found $TOTAL_RUNS total runs (query limit: $LIMIT)."
if [ "$TOTAL_RUNS" -lt "$SKIP_IF_LESS_THAN" ]; then
  echo "⚠️  Less than $SKIP_IF_LESS_THAN runs found, skipping deletion."
  exit 0
fi

echo "🔍 Searching for runs created before $WEEK_AGO (limit: $LIMIT results per page)"

# -- Retrieving runs ---------------------------------------------
RUNS=$(gh run list \
  --created "<=$WEEK_AGO" \
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
