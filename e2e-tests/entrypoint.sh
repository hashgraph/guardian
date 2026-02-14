#!/usr/bin/env bash

# Automatically prepend 'preparing' tag to ensure user accounts are created
# Only add if not already present; default to "all" when CYPRESS_grepTags is unset
if [[ "$CYPRESS_grepTags" == *"preparing"* ]]; then
  TAGS="${CYPRESS_grepTags:-all}"
else
  TAGS="preparing,${CYPRESS_grepTags:-all}"
fi

# Set default values
GREP_FILTER_SPECS="${CYPRESS_grepFilterSpecs:-true}"

# Default to electron (works in default Dockerfile); use CYPRESS_BROWSER=chromium with Dockerfile.chrome
BROWSER="${CYPRESS_BROWSER:-electron}"

# Start building cypress command
CMD="npx cypress run --config-file cypress.config.js --browser $BROWSER"

# Add grep tags and filter (quote values so commas in tags are preserved)
CMD="$CMD --env \"grepTags=$TAGS\" --env grepFilterSpecs=$GREP_FILTER_SPECS"

# Add optional environment variables as separate --env flags
if [ -n "$CYPRESS_portApi" ]; then
  CMD="$CMD --env portApi=$CYPRESS_portApi"
fi

if [ -n "$CYPRESS_operatorId" ]; then
  CMD="$CMD --env operatorId=$CYPRESS_operatorId"
fi

if [ -n "$CYPRESS_operatorKey" ]; then
  CMD="$CMD --env operatorKey=$CYPRESS_operatorKey"
fi

if [ -n "$CYPRESS_MGSAdmin" ]; then
  CMD="$CMD --env MGSAdmin=$CYPRESS_MGSAdmin"
fi

if [ -n "$CYPRESS_MGSIndexerAPIToken" ]; then
  CMD="$CMD --env MGSIndexerAPIToken=$CYPRESS_MGSIndexerAPIToken"
fi

# Execute the command
eval $CMD
