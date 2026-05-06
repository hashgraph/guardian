# VMR0015 v1.1.0-schemas — Import Guide (Stage 1)

**Status:** DRAFT — schema-layer upgrades only. Workflow logic identical to v1.0.0.
**File:** `VMR0015_v1_1_0_schemas.policy` (64,443 bytes, 16 policy schemas + system schemas)
**Replaces:** Nothing. Imported alongside the v1.0.0 binary; do not delete the published v1.0.0 policy.

---

## What changed since v1.0.0

This package addresses Verra bounty checklist item #1 (project description / monitoring / validation / verification report schemas) and adds two MR fields needed for Stage 2's calculation refactor.

### 1. Semantic field titles on all 14 existing schemas
Every schema property now carries a human-readable `title` (e.g. `monitoringPeriod`, `operatingPerformanceRecords`, `waterQualityTests`) instead of generic `field0`, `field1`, …. The underlying field keys are unchanged, so any existing form data or VCs remain valid.

### 2. Two new schemas
| Name | IRI |
|---|---|
| `VCS Validation Report (VMR0015)` | `#9c5b36b9-cc3f-486b-893c-ca3da9d59e31&1.0.0` |
| `VCS Verification Report (VMR0015)` | `#306341ea-5663-4460-b936-c56c4221d30c&1.0.0` |

Both follow Verra's VCS template structure (project metadata, audit team, findings, conclusion). They are present in the policy schema set but **not yet wired into a workflow step** — that happens in Stage 2 via a `documentValidatorBlock` gating the mint.

### 3. Monitoring Report extended
Two new properties added to `Monitoring Report (VMR0015)`:
- `uncertaintyFactor` (number, default 0.89) — the discount applied to net ER per VMR0015 §6.4
- `verificationStatus` (enum: `PASS` / `FAIL`) — explicit verification outcome flag (replaces the silent `if(ER<0) ER=0` clamp in Stage 2)

### 4. Policy metadata
- Version bumped to `1.1.0-schemas`
- Status reset to `DRAFT`
- `topicId`, `messageId`, `instanceTopicId`, `synchronizationTopicId` cleared
- New policy `id` and `uuid` generated so MGS treats this as a fresh import

---

## Import procedure

1. Open MGS → Policies.
2. Click **Import** → **From File**.
3. Select `VMR0015_v1_1_0_schemas.policy`.
4. After import, MGS shows a draft policy named `VMR0015 — Emission Reductions from Safe Drinking Water Supply` v1.1.0-schemas.
5. Open it in the policy editor.

## What to verify before continuing to Stage 2

Please confirm each of these manually inside MGS and report back:

**a. Schema list (16 total in Schemas tab)**
- VVB
- Project Participant
- Project Description (VMR0015)
- Geographic Location
- Household Profile
- Water Purification Device
- Baseline Fuel Mix (VMR0015)
- Baseline Emissions Breakdown
- Project Activity Emissions
- Leakage Adjustment (VMR0015)
- Operating Performance
- Water Quality Test
- Monitoring Reporting Period
- Monitoring Report (VMR0015)
- **VCS Validation Report (VMR0015)** ← new
- **VCS Verification Report (VMR0015)** ← new

**b. Semantic titles**
Open any schema (e.g. Monitoring Report). The Schema Configurator should show readable field labels (`monitoringPeriod`, `operatingPerformanceRecords`, …) instead of `field0`, `field1`. No `fieldN` titles should remain anywhere.

**c. Monitoring Report extension**
In the Monitoring Report schema, confirm the last two fields:
- `uncertaintyFactor` (Number)
- `verificationStatus` (Enum: PASS / FAIL)

**d. New VCS schemas open cleanly**
Open `VCS Validation Report (VMR0015)` and `VCS Verification Report (VMR0015)`. Both should display field groups for project info, audit team, findings, and conclusion without errors.

## What NOT to do yet

- **Do not publish to Hedera.** This is a draft for schema review only.
- **Do not delete the v1.0.0 policy** that's already published on testnet (account `0.0.8865868`, policy id `69fa5c34bafe0836d93bcde0`). It stays as the audit-trail anchor.
- **Do not re-record TC1 yet.** The recorded run on `tests/tc1_full_lifecycle.record` is still bound to v1.0.0. Re-recording happens after Stage 2 is published.

## After verification

Reply confirming a-d above (or list anything off). Then Stage 2 builds:

1. Split the two `customLogicBlock`s into four (`calc_baseline`, `calc_project_emissions`, `calc_leakage`, `calc_net_er`) so reviewers can audit each formula independently.
2. Apply `uncertaintyFactor` discount inside `calc_net_er` (default 0.89).
3. Replace the `if(ER<0) ER=0` silent clamp with an explicit `verificationStatus = FAIL` branch and revoke path.
4. Add `documentValidatorBlock` so mint cannot fire without a VVB-signed VCS Verification Report VC.
5. Add `tokenActionBlock(retire)` + retirement VC schema + UI step.
6. Add a transformation block placeholder for the Verra Project Hub mapping.
7. Bump version to `1.1.0`, keep DRAFT, hand back for publish + TC1 re-record.

---

## Why staged

A single-pass v1.1.0 build would touch schemas, calculations, validator gating, retirement, and a transformation block in one commit. If any layer fails the MGS import, the whole package gets rejected. Splitting into Stage 1 (schemas only — low blast radius) and Stage 2 (workflow logic — invasive) lets you confirm the schema layer lands cleanly before workflow logic gets layered on top.

## File locations
- This guide: `IMPORT_GUIDE_v1_1_0.md`
- Stage 1 binary: `VMR0015_v1_1_0_schemas.policy`
- v1.0.0 binary (unchanged): `VMR0015.policy`
- v1.0.0 cover note: `REVIEWER_COVER_NOTE.md`
- v1.0.0 Excel: `calculations/VMR0015_calculations.xlsx`
