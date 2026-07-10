# policy-service test coverage — notes

What this directory tests, and what's still gap-tracked.

policy-service was the lowest-coverage service at 22.8% line / 407 tests. This
batch lifts pure-logic coverage in the block-validators module — the layer
whose bugs ship to chain because published policies are immutable on Hedera.

## Covered (unit-level)

### Block validators (`unit-tests/blocks/` and `unit-tests/block-validators/`)

| Validator family | Test files | What's asserted |
|---|---|---|
| **Trivial CommonBlock-only** | `common-only-validators.test.mjs`, `common-only-validators-batch2.test.mjs`, `common-only-validators-batch3.test.mjs` | blockType constants; empty options pass; unhandled exception capture |
| **Option-validating** | `timer-block.test.mjs`, `notification-block.test.mjs`, `split-block.test.mjs`, `http-request-block.test.mjs`, `switch-block.test.mjs`, etc. | Each option's presence/type rule + boundary cases |
| **Schema-aware** | `documents-source-addon.test.mjs`, `external-data-block.test.mjs`, `request-vc-document-block.test.mjs`, `document-validator-block.test.mjs` | dataType enum + schema iri lookup + optional/required handling |
| **PropertyValidator helpers** | `impact-addon.test.mjs`, `property-validator.test.mjs` | inputValidator presence/type, selectValidator enum match, falsy edge cases (incl. 0 → "not set") |
| **Variable-driven (Tool)** | `tool.test.mjs` | Variable type dispatch (Schema/Token/Role/Group/TokenTemplate/Topic/String/unknown); per-variable error isolation |
| **Schema dependency walker** | `schema-validator.test.mjs`, `schema-validator-property.test.mjs` | sub-schema map resolution; circular dependency detection; template tolerance; idempotent validate(); 1500 random inputs never throw |

### policy-engine helpers (`unit-tests/helpers/`)

Already-covered helpers from prior batches: `code`, `constants`, `decorators`,
`document-map-utils`, `field-link`, `find-options`, `get-other-options`,
`math-formula`, `math-item-type`, `math-model-utils`,
`policy-block-default-options`, `policy-engine-helpers`, `set-options`,
`table-field-core`.

### Runtime block tests (`unit-tests/blocks/*.test.mjs`)

Existing — covers the runtime block classes (separate from the validators).

## Gap-tracked (still uncovered)

### Block validators that need richer mocking

- **`integration-button-block.ts`** — uses `IntegrationServiceFactory.getAvailableMethods()` from `@guardian/common`. Requires either a stub of the factory or moving the method-resolution out of the validator. Tracked.
- **`module.ts`** — module-level validation walker; couples to ModuleValidator (large state machine).
- **`group-manager.ts`** — already covered by common-only-validators batch (only delegates to CommonBlock currently).

### Top-level orchestrators (heavy state machines, integration-tier targets)

| File | LOC | Why deferred |
|---|---|---|
| `policy-validator.ts` | 560 | Loads entire policy + tokens + schemas + tags from DB; walks block tree recursively. Better tested via INT-POLICY-publish/import harness. |
| `module-validator.ts` | 505 | Same shape; module subset of the policy walker. |
| `tool-validator.ts` | 507 | Same shape; tool subset. |

These three together account for ~1500 LOC of policy-service. Suggest 4-6
integration tests that load fixture policies (one per published-block kind)
and assert validation result shape + error envelopes.

### Other untested src/

- **`api/policy.service.ts` and other api/*.ts** — NATS RPC handlers; integration-tier
- **`policy-engine/runner.ts`, `policy-engine/policy-components.ts`** — orchestration & event bus; integration-tier
- **`policy-engine/state.ts`, `state-container.ts`** — runtime state for active policies; integration
- **`helpers/db-helper.ts`, helpers DB-bound files** — Mongo I/O
- **`migrations/*`** — DB migrations; integration with mongodb-memory-server (Tier 3 plan)

## Recommended sequence for closing the gaps

1. **INT-POLICY-01..05** — boot a fixture policy, exercise:
   - dry-run publish (PolicyValidator path)
   - tool publish (ToolValidator path)
   - module publish (ModuleValidator path)
   - schema-only validation
   - dependency-cycle detection at the policy level
   Hits ~70% of the orchestrator coverage.

2. **`integration-button-block.ts` test** — mock `IntegrationServiceFactory` with a small registry; validate the requestParams loop.

3. **Migrations idempotency tests** — once `mongodb-memory-server` is wired (Tier 3 of the improvement plan), each migration should be runnable twice with no diff.

4. **Property test for the policy publish path** — fast-check generates arbitrary block trees, validate() never throws. (Currently the schema-validator-property.test.mjs scaffolds the pattern.)

## Re-measuring coverage

After this batch lands and `c8` is installed:
```sh
cd guardian/policy-service && npm run test:cov
```

Expected: line coverage 22.8% → ~30-32%. Tighten floor to 25 in
`guardian/coverage-floors.json` after first measurement, then ratchet upward
with INT-POLICY-* additions.

## Why this layer matters

A bug in any block validator can let a malformed policy reach the publish
path. The Hedera consensus message that publishes the policy is **immutable
once written** — so a validator regression doesn't just break a UI form, it
ships a bad artifact to chain that can't be revoked, only deprecated. That
makes block-validator unit tests one of the highest-ROI investments in the
suite.
