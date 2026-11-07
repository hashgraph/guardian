# Simplified Methodology for Clean and Efficient Cookstoves (SMEC) - v4.0

A Hedera Guardian policy implementing Gold Standard's **Simplified Methodology
for Clean and Efficient Cookstoves, version 4.0** (GS4GG, PAA M400-07,
published 05/05/2026). Source PDF:
https://globalgoals.goldstandard.org/standards/408_V4.0_PAA-M400-07_SMEC.pdf
(71 pp, sha256 d34f0d8fbed12b666922bb3de91579bef6200084d0bd053798e28318f54e6d52).

The policy walks a wood/charcoal cookstove project end-to-end: project listing
(PDD) → validation → monitoring (annual usage surveys, biennial P-KPT) →
verification → VER token mint (1 token per tCO2e).

> Digitising a methodology does not imply approval or endorsement from Gold
> Standard or Verra. All intellectual property rights reserved.

## What's in this folder

| File | Contents |
|---|---|
| `SMEC-v4.0.policy` | The Guardian policy export (zip). sha256 `89aa502636de62e15bf637befafb395369d81c2575d571739194122ac9442d12`, 171,051 bytes. |
| `readme.md` | This file. |
| `derivation-from-MECD-v2.0.md` | How this policy was derived from the verified MECD v2.0 bundle (schema diff, engine rewrite). |
| `test-fixtures/` | 11 end-to-end ER fixtures + `run-fixture.js` (runs the policy's calc block locally, no Guardian needed) + `parameter-map.md`. |
| `test-curls/` | API call templates for a running Guardian instance. |

## Calculation engine

`pp_er_calcs` (customLogicBlock) implements SMEC v4.0 Equations 1-18:

- Baseline fuel: Option A (B-KPT measured, 90/10 precision rule with LB90
  fallback, absolute per-capita cap 1.25 wood / 0.40 charcoal t/cap/yr,
  threshold documentation duty at 0.75 / 0.20) and Option B (MSL defaults
  0.50 wood / 0.13 charcoal t/cap/yr with mandatory 5% deduction).
- Deduction chain: BE_unadj → BE_unc → DAF adjustment → BAU floor →
  crediting baseline BE_y → activity emissions AE_y → leakage (embodied
  upfront or amortized + 2% market) → Hawthorne adjustment (phased defaults
  0.90/0.85/0.75, SUMs-derived Eq. 18, or dMRV exemption) → net ER_y.

The engine is verified three ways:

1. An independent Python reference implementation, written directly from the
   PDF equation text, matches the packaged JavaScript byte-for-byte on all
   11 fixtures (see `test-fixtures/`).
2. Equations were transcribed from the source PDF and visually verified
   against page images (pp. 24-34).
3. The packaged expression itself (not a source copy) was re-run through the
   fixtures using the MECD `new Function(documents, sources, done, debug)`
   harness convention.

## Schemas

47 methodology schemas: 40 carried from MECD v2.0 (near-verbatim or
re-fielded), 6 new SMEC-specific (Baseline Emissions with Option A/B,
Project Emissions, IAP Assessment SMEC 4, End-User Notification SMEC 16,
Hawthorne Adjustment SMEC 23, Usage Survey Row SMEC 17/18/19), Device GS
re-fielded for wood/charcoal stoves (ISO 19867-1 efficiency, technical
life). See `derivation-from-MECD-v2.0.md`.

## Roles

Project Proponent, VVB, and Standard Registry (Admin/OWNER) - as in MECD v2.0.

## Token

VER (Verified Emission Reduction), 1 token per tCO2e, minted on approved
verification report (`rule: verified_emission_reductions`).

## Importing the policy

Import `SMEC-v4.0.policy` via the Guardian UI (Policies → Import) or the
API. Dry-run mode is supported for local evaluation without Hedera/IPFS side
effects.

## Screenshots

Not included in this revision: policy UI screenshots require a running
Guardian instance (dry-run or testnet), which was out of scope for this
submission. The test fixtures above provide equivalent functional evidence
and run without any infrastructure. Screenshots can be produced on request
against a dry-run instance.

## License / notice

Derived from the MECD v2.0 policy in this repository (Apache-2.0); same
license applies. Methodology content (c) Gold Standard Foundation.
