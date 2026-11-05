# The log attribute exclusion test breaks once more than 20 worker names are logged

**Status:** open (test problem, the product behaves as designed)
**Component:** `e2e-tests/cypress/e2e/api-tests/004_logs/getLogsAndAttributes.cy.js`, "Returns logs with name exclude someone"

## What was observed

On 5 Nov 2026 the test failed with `expected 19 to deeply equal 20`. It reads the `WORKER` attributes, excludes the last one and expects one value fewer. The attribute endpoint returns at most 20 values (`$limit: 20` in `getAttributesAggregationFilters`, `common/src/helpers/db-helper.ts`), and every start of the services logs five new `WORKER.<id>` names: `logger_db.log` held 31 distinct `WORKER` attributes, so the list is capped at 20 both with and without the exclusion.

## How to reproduce

Start the services (`npm run guardian:services:up`) four times or more on the same database, then run the spec.

## Fix

Assert what the exclusion guarantees instead of a count: the excluded name is absent from the response.

## Test impact

The test passes on a fresh database and fails permanently once the logs hold more than 20 worker names.
