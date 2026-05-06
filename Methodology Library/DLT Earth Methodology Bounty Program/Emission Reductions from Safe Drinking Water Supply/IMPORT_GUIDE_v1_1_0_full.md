# VMR0015 v1.1.0 — Full Bounty-Aligned Build

**File:** `VMR0015_v1_1_0.policy` (67,310 bytes, 33 zip entries)
**Status:** DRAFT — fresh policy id, fresh uuid, no on-chain topics yet
**Audit:** 0 errors, 0 warnings, 207 unique block tags, all event refs resolve
**Replaces v1.0.0?** No. Imports as a separate policy. Keep v1.0.0 published as your audit-trail anchor.

---

## What's in this build vs v1.0.0

### 1. Schemas (carried over from Stage 1)
- 14 existing schemas now have semantic field titles (no more `field0`, `field1`)
- 2 new schemas: `VCS Validation Report (VMR0015)`, `VCS Verification Report (VMR0015)`
- Monitoring Report extended with `uncertaintyFactor` (number) and `verificationStatus` (PASS/FAIL)
- 1 new schema: `Token Retirement Request` (for the Project Owner retirement step)

**Total policy schemas: 17.**

### 2. Roles
- `Project Participant`, `VVB` (existing)
- `Project Owner` (new) — owns the retirement step

### 3. Calculation refactor (the big one)
v1.0.0 had two opaque `customLogicBlock`s. v1.1.0 splits the report-side calc into **four independently auditable blocks** chained via `RunEvent`:

| Block tag | What it computes |
|---|---|
| `calc_baseline` | BE_total = BE_woody + BE_fossil; writes to MR.baselineEmissionsBreakdown.field0 |
| `calc_project_emissions` | PE_total = sum of project emission components; writes to MR.projectActivityEmissions.field0 |
| `calc_leakage` | LE_total = (fuel_woody flag ? LE_woody : 0) + LE_fossil; writes to MR.leakageAdjustment.field3 |
| `calc_net_er` | ER_gross = BE−PE−LE; ER_net = ER_gross × uncertaintyFactor; sets verificationStatus |

The project-side calc is renamed `calc_project_baseline` for symmetry.

### 4. Uncertainty discount (VMR0015 §6.4 / AMS-III.AV §B.7.4)
`calc_net_er` reads `uncertaintyFactor` from the Monitoring Report VC (field7). If absent or out of (0,1] range, it falls back to **0.89** (Verra default). Reviewers can audit both the field and the fallback in the calc expression.

### 5. Explicit FAIL branch (replaces silent ER<0 clamp)
v1.0.0 silently clamped `if(ER<0) ER=0`. v1.1.0:
- `calc_net_er` sets `verificationStatus = 'PASS'` when ER_net > 0, `'FAIL'` otherwise
- A `switchBlock` (`verification_status_switch`) routes PASS → mint validator → mint, FAIL → revoke (`reassign_rejected_report`)

### 6. VVB validator gating mint
A `documentValidatorBlock` (`mint_validator`) sits between the verification switch and `mintToken`. It requires a **VVB-signed VCS Verification Report VC** (schema `#306341ea-…`) with `option.status = 'Issued'` before mint can fire. No issued verification report = no token.

### 7. Retirement step
New `po_lifecycle` container under Project Owner, with three blocks:
- `po_request_retirement_form` — request VC against `Token Retirement Request` schema
- `po_send_retirement` — sendToGuardian
- `retire_action` — `tokenActionBlock` with `action: wipe` (Guardian's standard burn pattern)

The token template (`VMR0015_token_template`) already exists from v1.0.0; the retirement reuses it.

### 8. VCS Validation/Verification Report wiring
Four new VVB-permission blocks under the existing VVB lifecycle:
- `vvb_validation_report_form` + `vvb_validation_report_send` (issues VCS Validation Report VC)
- `vvb_verification_report_form` + `vvb_verification_report_send` (issues VCS Verification Report VC — this is what `mint_validator` checks)

### 9. Verra Project Hub transformation placeholder
A `buttonBlock` (`verra_project_hub_transform`) under the SR header, slotted as `selector` UI for "Export VCS PD JSON". Reviewers see the integration point; actual transformation logic deferred (no public Verra Project Hub API yet).

### 10. dataType cosmetics
All 21 sendToGuardianBlocks that were missing `dataType: 'vc-documents'` have it set, eliminating the entire class of import warnings flagged in v1.0.0's structural audit.

---

## Import procedure

1. **Leave the v1.0.0 policy alone.** Do not delete or unpublish. Both stay side-by-side in MGS.
2. Open MGS → Policies → **Import** → **From File**
3. Select `VMR0015_v1_1_0.policy`
4. MGS creates a second policy entry in DRAFT state (fresh policy id `b2164730c0ae460eac326a77`, fresh uuid)

## Verification checklist (do this before publishing)

**Roles tab:**
- [ ] Three roles listed: Project Participant, VVB, Project Owner

**Schemas tab (17 policy schemas total):**
- [ ] All 14 carried-over schemas show readable field titles (no `fieldN`)
- [ ] `VCS Validation Report (VMR0015)` opens cleanly
- [ ] `VCS Verification Report (VMR0015)` opens cleanly
- [ ] `Token Retirement Request` opens cleanly
- [ ] Monitoring Report has `uncertaintyFactor` (number) and `verificationStatus` (PASS/FAIL enum)

**Policy editor (workflow tab) — confirm these block tags exist:**
- [ ] `calc_baseline`, `calc_project_emissions`, `calc_leakage`, `calc_net_er` (4 separate calc blocks)
- [ ] `verification_status_switch` (switchBlock with PASS/FAIL conditions)
- [ ] `mint_validator` (documentValidatorBlock pointing to VCS Verification Report schema)
- [ ] `vvb_validation_report_form`, `vvb_verification_report_form` (under VVB container)
- [ ] `po_lifecycle` container with `po_request_retirement_form` + `retire_action`
- [ ] `verra_project_hub_transform` (under SR header)

**Calc expressions (open `calc_net_er`):**
Should contain `var u = d.field7;` and the `if (typeof u !== 'number' || ... ) u = 0.89;` fallback line.

## Publishing & test recording

After verification:
1. Click **Publish**. MGS will issue fresh schema topic, instance topic, and sync topic on Hedera testnet.
2. Note the new on-chain identifiers — they replace the v1.0.0 ones for this submission.
3. Run a full TC1 flow end-to-end:
   - Project Participant submits Project Description → VVB issues VCS Validation Report → SR approves
   - Project Participant submits Monitoring Report (provide a value for `uncertaintyFactor` like 0.89, 0.94)
   - All 4 calc blocks fire in sequence
   - VVB issues VCS Verification Report
   - `mint_validator` finds the issued report → mint fires
   - Project Owner submits a retirement request → tokens get wiped
4. Use Guardian's "Record" feature to capture the run, save as `tests/tc1_full_lifecycle_v1_1_0.record`
5. Drop the record file into the PR; we'll commit and replace v1.0.0's record reference.

## Honest expectation

This file closes every concrete bounty checklist item from the screenshot:
- VCS Project Description schema ✓
- VCS Monitoring Report schema (with proper field titles) ✓
- VCS Validation Report schema ✓
- VCS Verification Report schema ✓
- Encoded calculations in policy (4 split blocks + uncertainty) ✓
- Excel calculations (already in v1.0.0 PR) ✓
- Transformation block placeholder for Verra Project Hub ✓
- Documentation (already comprehensive) ✓

Realistic bounty score with this submission: **~88-92%**. Not 100% — the Verra Project Hub transformation is a placeholder, not a working transformer, because Verra hasn't published a public ingest API. If reviewers require a fully functional transformer, that's the only remaining gap.

## File location

After download, the file goes to:
`Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/VMR0015_v1_1_0.policy`

(alongside `VMR0015.policy` for v1.0.0).

## New ids
- Policy id: `b2164730c0ae460eac326a77`
- Policy uuid: `d7e44380-1272-4e78-9380-7165f1c3517d`
- Policy tag: `Tag_10350eef51684be5`
- Token Retirement schema: `#6d08953c-828f-4a39-b6d3-a799f42f6993&1.0.0`
