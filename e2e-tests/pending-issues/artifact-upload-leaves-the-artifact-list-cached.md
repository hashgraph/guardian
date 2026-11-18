# Uploading an artifact leaves the cached artifact list stale (api-gateway)

**Status:** open, product defect, reproduced on 18 Nov 2026 on a local stack.
**Component:** `api-gateway` (`api/service/artifact.ts`, `POST /artifacts/:parentId`)
**Severity:** medium — for up to 10 minutes after an upload, `GET /artifacts` answers without the new artifacts, to the user who uploaded them and to the UI
**Found by:** running `api-tests/008_artifacts` twice in a row

## What was observed

The second run of `008_artifacts` fails in the `before all` hook of `deleteArtifact.cy.js`: `artifacts of the provisioned policy: expected [] to have a length of 2 but got 0`. The hook uploads two artifacts to a new draft policy (both uploads answer 201) and then lists `GET /artifacts/`; the list does not contain them. The first run passes.

Reproduced outside Cypress, as `StandardRegistry`:

1. `GET /artifacts/` answers 49 artifacts (this fills the gateway cache).
2. `POST /artifacts/<new draft policy id>` answers 201 with the new artifact.
3. `GET /artifacts/` still answers the same 49, without the new artifact.
4. `GET /artifacts/?policyId=<id>` (a URL not cached before) answers the new artifact.

## Cause

`GET /artifacts/` is cached for 600 s (`@UseCache`, `CACHE.DEFAULT_TTL`), tagged with the request path (`/artifacts/`). The upload invalidates `` `/${PREFIXES.ARTIFACTS}` ``, and `PREFIXES.ARTIFACTS` is already `'/artifacts/'`, so the tag it drops is `//artifacts/`, which never exists. Deleting an artifact invalidates `PREFIXES.ARTIFACTS` and is not affected.

## How to reproduce

Run `npx cypress run --spec "cypress/e2e/api-tests/008_artifacts/*.cy.js"` twice within 10 minutes (with the `--expose` values of the README), or run the four steps above with any HTTP client.

## Test impact

`008_artifacts/deleteArtifact.cy.js` fails on any run that comes less than 10 minutes after a run that listed the artifacts as the same user (in a full run, `getArtifacts.cy.js` does). The test is right: it reads the list a user would see after uploading.
