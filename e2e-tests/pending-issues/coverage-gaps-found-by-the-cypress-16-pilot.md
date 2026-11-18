# Coverage gaps found by the Cypress 16 pilot runs

**Status:** open, tests to add (proposed on 18 Nov 2026, not started)
**Component:** `e2e-tests` (API and UI specs), `api-gateway`, `guardian-service`, `frontend` unit tests
**Severity:** medium — three product features that broke specs only by chance have no test of their own, and one of them hides a product defect
**Found by:** the pilot runs of the Cypress 16 migration (`e2e-suite-performance.md`, "Cypress 16"), two runs in a row on the same database

## What was found

Three specs failed in the pilot runs, on 15.15 and on 16.3 alike. Each depended on data that other spec folders leave behind, so it passed in CI (one run on a fresh database) and failed on a second run over the same database. They are fixed (commit `8f5951076`):

- `ui-tests/specs/06_policy_schemas/createPolicySchema` imported the schema file into the first policy of the dropdown. When that policy already held a schema of the same name (`Lead User Details` is in the iRec policies), the app opened the "Schemas for replace" dialog, which the spec did not expect. It now imports into a draft policy of its own.
- `ui-tests/specs/05_modules/createModule` counted the imported rows on the first page of the module list (10 rows, newest first). Past ten modules the new row pushes another off the page, so the count could stay the same. The import helpers now check the module the import request created.
- `api-tests/008_artifacts/postArtifact` uploaded to the newest policy in the list, which may be published or belong to another registry (422). It now uploads to a draft policy of its own.

The features behind those failures (replacing schemas on import, list pagination) are not tested anywhere, and looking for the cause of a fourth failure found a product defect in the artifact list cache (`artifact-upload-leaves-the-artifact-list-cached.md`).

Why these defects show up only now and then: with `grepFilterSpecs` the order of the spec folders changes from one run to the next (seen on 15.15 and 16.3: `008_artifacts` was the first folder of the smoke run in one run and the fourth in another), so a spec that depends on what the folder before it left passes or fails by chance.

## Current coverage

| Feature | E2E | Unit |
|---|---|---|
| "Schemas for replace": `POST /schemas/import/schemas/duplicates` and the import with `schemasIds` (replace) | none | `api-gateway/tests/helpers/guardians-schemas*.test.mjs` only check that the gateway forwards the arguments; no test of `SCHEMA_IMPORT_CHECK_FOR_DUBLICATES` in `guardian-service/src/api/schema.service.ts`; `frontend/src/app/views/schemas/schemas.component.ts` has no spec |
| List pagination (page size, `x-total-count`, order, next page) | none: the specs pass `pageIndex`/`pageSize` only to read data (`011_schemas`, `009_policies/policyGridActions`), and `toolsPage` changes the page size only to find a row | `api-gateway/tests/service/module.test.mjs` checks that `pageIndex`/`pageSize` are forwarded; no test of the order and offset the services apply (`orderBy createDate DESC`, `limit`, `offset`) |
| Artifact list cache invalidation after an upload or a delete | none on purpose; `008_artifacts/deleteArtifact` hits it only on a second run within 10 minutes | `api-gateway/tests/cache-invalidation.test.js` covers `getCacheKey`, not the invalidations of the artifact controller |

## Proposed tests

Each at the lowest level that shows the behavior (AGENTS.md), test first.

### A. Artifact list cache (product defect)

1. `api-gateway` unit test: after `POST /artifacts/:parentId` and after `DELETE /artifacts/:artifactId`, the cache tags of both forms of the list are invalidated, `/artifacts/` (API clients) and `/artifacts` (the UI, `GET /api/v1/artifacts?type=…`). It fails today: the upload drops `//artifacts/`, the delete only `/artifacts/`.
2. Fix in `api-gateway/src/api/service/artifact.ts` (the upload builds its tag as `` `/${PREFIXES.ARTIFACTS}` `` while `PREFIXES.ARTIFACTS` already starts with `/`; neither route invalidates `/artifacts`).
3. API spec in `008_artifacts`: on a draft policy of its own, the list contains an artifact right after its upload, and no longer contains it right after its delete, both read with the URL the API specs use and with the one the UI uses.

Until the fix, `008_artifacts/deleteArtifact` fails on a run less than 10 minutes after another read of the list. AGENTS.md asks to skip it with a pointer to `artifact-upload-leaves-the-artifact-list-cached.md`; the alternative proposed is to fix the gateway instead. Not decided yet.

### B. Replacing schemas on import

1. `guardian-service` unit test of `SCHEMA_IMPORT_CHECK_FOR_DUBLICATES`: it returns only the draft, non-system, non-readonly policy schemas of the given policy whose names are in the request; it leaves out published and unpublished schemas, schemas of other policies and schemas with other names; it fails when `schemaNames` is empty.
2. API spec in `011_schemas`, on a draft policy of its own: import a schema file; `POST /schemas/import/schemas/duplicates` with its name and the policy returns it; importing the same file with `schemasIds=<its id>` replaces it (one schema of that name in the policy). Check what an import without `schemasIds` does before writing that assertion (a second schema, a renamed copy or an error).
3. UI spec in `06_policy_schemas`: importing the same schema file twice into a draft policy of its own opens "Schemas for replace"; "Replace checked schemas" leaves one schema of that name. Check in `schemas.component.ts` what "Close" does (import without replacing, or nothing) before asserting it. The dialog also exists for the policy import (`policies.component.ts`) and the Excel import (`importExcelReplace`).
4. Optional: a `frontend` Vitest spec for `schemas.component.ts` that a duplicates answer with matches opens the dialog and passes the selected ids to the import.

### C. List pagination

1. API spec in `007_modules`, with modules created by the spec: `GET /modules?pageIndex=0&pageSize=2` returns 2 rows and an `x-total-count` equal to the total; the rows are the newest first; `pageIndex=1` continues the list without overlap. Assert relative to the spec's own modules, since other folders add modules too.
2. Optional: the same for the other paginated lists the UI uses (policies, schemas, tools, artifacts).
3. Optional: a UI spec for the module list paginator (the next page shows the rows past the first ten; changing the page size).

## How to resume

Decide on A (fix the gateway, or skip `deleteArtifact` until it is fixed), then pick from B and C. Run every touched API folder twice in a row and on its own after `000_accounts_creating` (AGENTS.md, "Check"). Delete this note once the tests exist.
