# Structural Audit & Fixes — VMR0015 Policy

A static structural audit was run against the published policy export. Two
classes of finding were identified and corrected in this commit.

## Audit results — before fixes

| Severity | Count | Notes |
|----------|-------|-------|
| Errors   | 1     | Event with target pointing to a non-existent block |
| Warnings | 31    | `sendToGuardianBlock` entries missing `dataType` field |

## Fix 1 — broken event target

Block `send_revoke_project_pp` (a `sendToGuardianBlock` under role
`Project Participant`) had two outbound `RefreshEvent`s:

- `target: project_grid_pp_2` — valid, refreshes the PP's project grid
- `target: project_grid_vvb` — **invalid**, no block with that tag exists

The `project_grid_vvb` event was removed. VVBs do not have a project grid in
this policy (VVB-visible blocks are `vvb_grid` and `report_grid_vvb`); the
only UI that needs to refresh after a PP revokes their own project is the
PP's own grid, which is already covered by the remaining event.

## Fix 2 — missing `dataType` on `sendToGuardianBlock` entries

31 `sendToGuardianBlock` entries had `dataSource` set but not `dataType`.
Guardian's runtime accepts either, but the policy validator emits warnings
when `dataType` is absent. `dataType` was added mirroring `dataSource`:

- `database` (24 blocks) — DB persistence path
- `hedera`   (7 blocks)  — HCS topic path (tags ending `_hedera`)

## Audit results — after fixes

| Severity | Count |
|----------|-------|
| Errors   | 0     |
| Warnings | 0     |

Verified on 2026-05-06 against the published build `69fa5c34bafe0836d93bcde0`
in MGS codeVersion 1.5.1. Output: 0 errors, 0 warnings.

The fixes are non-functional: no runtime behaviour or token issuance logic
changes. Only validator metadata and dead UI events were touched.
