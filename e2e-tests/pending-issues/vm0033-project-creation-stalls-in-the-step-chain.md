# VM0033: a created project never leaves the `new_project` step chain

**Status:** open
**Component:** `policy-service` — `interfaceStepBlock` / `tool` block execution
**Severity:** medium — the API reports success, the document is issued, and it then reaches no grid
**Found by:** `e2e-tests/cypress/e2e/api-tests/009_policies/VM033.cy.js` — `Create application`

## Summary

Submitting a project to VM0033 answers **200** with a fully issued VC, and the document then appears
in **no** grid. The spec polls `project_grid_pp_2` for five minutes and fails with:

```
Error: No matching row after 100 attempts on
  http://localhost:3000/api/v1/policies/<id>/tag/project_grid_pp_2/blocks
```

Everything before it passes: profile setup, import, publish, token association and KYC, role
registration for both the Project Proponent and the VVB, and VVB approval. Six tests pass, this one
fails, and the thirteen after it are skipped.

## Where it stops

`new_project` is an `interfaceStepBlock` that chains eight children:

| # | tag | blockType | notes |
|---|---|---|---|
| 0 | `add_project_bnt` | `requestVcDocumentBlock` | schema `#4afe8837-cba3-4cf9-a3b5-4c9bd94f1b54` |
| 1 | `save_project_hedera` | `sendToGuardianBlock` | |
| 2 | `save_project` | `sendToGuardianBlock` | `entityType: project_form` |
| 3 | `AR_tool_14_project` | `tool` | |
| 4 | `AR_tool_05_project` | `tool` | |
| 5 | `calculate_project_fields` | `customLogicBlock` | `outputSchema: #4afe8837-…` |
| 6 | `save_project_auto_hedera` | `sendToGuardianBlock` | |
| 7 | `save_project_auto` | `sendToGuardianBlock` | `entityType: project` |

Polling `GET /policies/{id}/tag/new_project/blocks` while the POST is processed shows `index` going
**0 → 1 → 2** and then back to **0**. It never reaches 3. So the two `tool` blocks are where the
chain stops.

That is exactly why nothing shows up. Every `documentsSourceAddon` under `project_grid_pp_2` filters
on schema `#4afe8837-…` *and* `option.status` (`Waiting to be Added`, `Waiting to Validate`, …),
and two of them also on `type: project`:

```
project_grid_pp_2_waiting_to_add_projects   filters [('option.status','equal','Waiting to be Added')]
project_grid_pp_2_waiting_to_validate_...   filters [('option.status','equal','Waiting to Validate')]
project_grid_pp_2_validated_projects        filters [('option.status','equal','Validated'), ('type','equal','approved_project')]
```

`option.status` is produced by step 5 and `type: project` by step 7 — neither runs. The raw
`project_form` document saved at step 2 matches no addon, so the grid stays empty rather than showing
a half-finished row.

`GET /policies/{id}/documents?type=VC` on a freshly published copy confirms it: three VC documents,
all belonging to the registrant/VVB flow, none carrying a `projectTitle`.

## Reproduction

Against a published VM0033 with the Project Proponent registered in the policy:

```bash
# 1. issue the project document — answers 200 with a signed VC
curl -X POST -H "authorization: $PP" -H 'content-type: application/json' \
     -d '{"document": <cypress/fixtures/payload.json .document>, "ref": null}' \
     "$API/policies/$P/tag/add_project_bnt/blocks"

# 2. the step chain advances 0 -> 1 -> 2, resets to 0, and never reaches 3
curl -H "authorization: $PP" "$API/policies/$P/tag/new_project/blocks"      # .index

# 3. no row, in either grid, indefinitely
curl -H "authorization: $PP" "$API/policies/$P/tag/project_grid_pp_2/blocks"   # .data == []
curl -H "authorization: $SR" "$API/policies/$P/tag/project_grid_verra/blocks"  # .data == []
```

## Ruled out

- **Not the policy artefact.** Reproduces identically on the `VM0033_7_23.policy` fixture and on the
  policy published by the Hedera message the spec used to import (`1788455827.615076104`). The two
  are separate instances of the same 220-block workflow — every tag, blockType, permission and event
  matches — differing only in `uuid`, `policyTag`, version and the AR tool versions they bind.
- **Not policy validity.** Publishing answers `isValid: true` with zero invalid blocks. The spec now
  asserts this, so a validation failure would be reported at the publish step instead.
- **Not missing tools.** `AR Tool 05(3.0.2)` and `AR Tool 14(5.0.7)` are both present and
  `PUBLISHED` on the instance. The fixture embeds both in full (`tools/*.json` inside the archive),
  so importing it from file resolves them without any Hedera or IPFS lookup.
- **Not the `Choose_Roles` 503.** A `policyRolesBlock` declares `permissions: ['NO_ROLE']`, and
  `hasPermission` (`policy-service/src/policy-engine/helpers/decorators/basic-block.ts`) grants it
  only when `!user.role && !user.isAdmin`. A user who already holds a role is correctly refused. On
  a policy imported fresh per run the block answers 200 and registration succeeds — and the test
  still fails at the same place.
  Note that `GET /policies/{id}/groups` is not evidence of a user's role here: VM0033 declares
  `policyGroups: []`, so that endpoint returns `[]` unconditionally for this policy.
- **Not timing.** Polled 100 × 3 s by the spec, and by hand for 90 s beyond that. The state is
  stable, not eventually consistent.

## Scope

`VM033.cy.js` is tagged `['policies', 'secondPool', 'VM0033']` — no `all`, no `all-no-mgs`, no
`smoke` — so no CI tag scope selects it. It is reached only by a bare `--spec` run over
`009_policies` (which ignores tags) or by asking for `VM0033`/`policies` explicitly.

## Cost note

The spec imports and publishes a fresh VM0033 on every run, which is what makes it self-contained
and keeps role registration working. That costs roughly **15 HBAR** and ~77 s per run (observed:
Standard Registry `31.36 → 16.38` Hbar for a single run). If that becomes a problem, the alternative
is a `getOrCreate`-style lookup like `getOrCreateIRec4Policy` in `cypress/support/commands.js`, at
the price of reintroducing cross-run state — and of the `NO_ROLE` refusal above, since the users
would already hold their roles on the reused policy.

## Related

`cypress.config.js` still registers an `ipfsAddFixture` task. `VM033.cy.js` was its only consumer,
and it no longer uses it: the task is now dead code.
