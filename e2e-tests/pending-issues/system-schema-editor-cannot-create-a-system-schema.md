# The schema editor cannot create a system schema

**Status:** open — `07_system_schemas/createSystemSchema.cy.js` skips the editor-creation test and the system specs create their schemas through the API instead.
**Component:** `frontend` — `views/schemas-configuration` (`entityOptions`), `POST /schemas/system/:username`
**Severity:** medium — the UI offers "create a system schema" but what it creates is invisible
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/07_system_schemas/createSystemSchema.cy.js`

## Summary

Opening the editor from the System Schemas tab and saving a schema creates a record that never shows up in the system list. The editor's "Entity type" dropdown only offers Default, Verifiable Credential and Encrypted Verifiable Credential (`entityOptions` in `schemas-configuration.component.ts`), while `POST /schemas/system/:username` accepts only `STANDARD_REGISTRY` and `USER` and answers 422 otherwise (`api-gateway/src/api/service/schema.ts`).

Observed on a localnode stack: a schema saved from the System tab came back from `GET /schemas` as `category: SYSTEM`, `entity: NONE` (Default) or `VC`, `system: false`. The system list (`GET /schemas/system/...`) keeps showing only the 18 built-in schemas, so the created schema is not listed anywhere in that tab.

Verified on 11 Nov 2026 with the editor's real save path (`POST /schemas/:topicId` with `category: SYSTEM`; it never calls `POST /schemas/system/:username`): the draft is stored as `category=SYSTEM, system=false`, entity `NONE` or `VC`, and the System list stays at 18.

Such a draft cannot be deleted either: `DELETE /schemas/:id` answers `403 Invalid schema category.` and `DELETE /schemas/system/:id` answers `403 Schema is not system.`. Every draft the editor creates stays in the database.

## Test impact

The creation test is skipped. The remaining system specs create their schemas through the API (`support/CustomHelpers/systemSchemas.js`) and drive the list, document view, activation and deletion from the UI.
