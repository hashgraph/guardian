# VMR0015 v1.0 — Safe Drinking Water dMRV

This is my Hedera Guardian implementation of **Verra VMR0015 v1.0** (*Revision to AMS-III.AV.: Low Greenhouse Gas Emitting Safe Drinking Water Production Systems*, active since 31 Oct 2025), built for the DLT Earth Methodology Bounty — PR #6164.

## What I built

A policy that onboards the three roles (Project Proponent, VVB, Standard Registry), takes a Monitoring Report, runs the AMS-III.AV. equations on-chain to derive BE/PE/LE/ER, enforces the VMR0015 §6.1 water-quality gate, and routes the report through VVB verification and SR approval before minting. The key point: the credit amount is **computed by the policy**, never typed in.

## The result I want you to check first

I grounded the test in a real Verra project — **VCS 3599** (Safe Drinking Water for Schools, Viet Nam) — and back-calculated the parameters from its verified ER spreadsheet. Then I submitted a Monitoring Report with the **Emission Reductions field left blank** and let the policy fill it:

```
Inputs:  QPW=713,972,729 L · m=0.95 · X_boil=1.0 · nwb=0.10
         EF=81.6 tCO2/TJ · f_i=0.82 · BL=1.0 · PE=0 · LE=8,116 · WQ=95/100

SEC  = 357.48 / 0.10                                       = 3,574.8
BE_y = 713,972,729 × 0.95 × 1 × 3,574.8 × (0.82×81.6×1e-9) = 162,241.14 tCO2e
ER_y = 162,241.14 − 0 − 8,116.00                           = 154,125.14 tCO2e
```

The policy computed **154,125.14** and minted exactly that — which matches the VCS 3599 registry issuance. Because I left the field blank, this is the policy's own calculation, not a number I entered. The signed credentials are in `evidence/`.

## Verify it in one line

```bash
node tests/policy_integrity_test.js          # expect: 9 passed, 0 failed
```

I wrote this test to embed the **verbatim** `calculate_report_fields` expression straight from the policy binary — so you're testing the real on-chain logic, not a re-implementation. It checks the canonical 154,125.14, the water-quality gate (85% → 0, 90% boundary → credits, no sampling → 0), nwb=0 fail-closed, PE+LE>BE → 0, and that any value typed into field3/field6 gets overwritten by the computed result (so no one can mint an arbitrary amount).

## What's in here

| Path | What it is |
|---|---|
| `policy/VMR0015_validated.policy` | The exact policy instance I ran |
| `policy/VMR0015_schemas.xlsx` | All 16 schemas, human-readable |
| `formulas/` | Formula Linked Definitions — `formula.json`, `schemas.json`, importable `VMR0015_formula.zip`, and a README mapping each equation to its Monitoring Report field |
| `tests/policy_integrity_test.js` | The integrity test above (9/9) |
| `docs/VMR0015_v1.0_provision_alignment.md` | How I mapped each VMR0015 v1.0 provision |
| `evidence/` | The signed VCs from the run + `EVIDENCE_INDEX.md` |
| `tools/verify_originality.py` | My originality scan (no CDM token/topic IDs, no mainnet message IDs) |
| `CHANGELOG.md`, `LICENSE` | History; Apache-2.0 |
| `PR_BODY.md` | The PR description |

## The equations (AMS-III.AV. / VMR0015)

```
SEC  = 357.48 / nwb                                                 [Eq.5]
BE_y = QPW_y × m × X_boil × SEC × (BL_fuel × f_i × EF_fuel × 1e-9)  [Eq.1]
ER_y = BE_y − PE_y − LE_y                                           [Eq.7]
Water-quality gate: pass_rate < 0.90 → ER_y = 0  (fail-closed)      [§6.1]
```

How I mapped the parameters to Monitoring Report fields:

| Param | Field | | Param | Field |
|---|---|---|---|---|
| QPW_y | field12 | | f_i (fNRB, TOOL33) | field17 |
| m | field13 | | BL_fuel | field18 |
| X_boil | field14 | | PE_y | field4 |
| nwb | field15 | | LE_y | field5 |
| EF_fuel | field16 | | **BE_y (computed)** | **field3** |
| WQ pass / total | field10 / field11 | | **ER_y (computed, mint rule)** | **field6** |

## About the evidence — straight with you

I ran the full lifecycle (PP submit → VVB verify → SR approve → mint → Verifiable Presentation) in **Guardian dry-run mode** on testnet (2026-06-14). The credentials in `evidence/` are real Ed25519-signed artifacts and they prove the policy logic runs correctly and that the minted amount equals the computed ER.

I want to be upfront about scope: dry-run uses a **virtual token** (its id is a UUID, `0e34f609-…`, not a `0.0.x` HTS token), so these transactions aren't anchored on the public ledger and won't show up on HashScan. A production-mode run would put the same flow on-chain. So this package proves the **methodology computes and mints correctly** — I'm not claiming an on-chain HTS mint here.

`evidence/EVIDENCE_INDEX.md` walks the chain document by document (PUBLISH → MR submit/verify/approve → MintToken 154,125.14 → VP) with signers and timestamps.

## Where I addressed each of your asks

| You asked for | Where it is |
|---|---|
| A real Verra project + the data | VCS 3599; the computed result matches the registry |
| More recent data given the VMR0015 gap | 2025 H1 monitoring period |
| Docs aligned to VMR0015 v1.0 | `docs/VMR0015_v1.0_provision_alignment.md` |
| Policy integrity tests | `tests/policy_integrity_test.js` (9/9) |
| The mint driven by the methodology | `evidence/` — ER blank → computed 154,125.14 → minted |

## To reproduce

1. Import `policy/VMR0015_validated.policy` into Guardian.
2. Submit a Monitoring Report with the canonical inputs above, **ER field blank**.
3. PP submit → VVB verify → SR approve → mint.
4. You should see field3 = 162,241.14, field6 = 154,125.14, mint = 154,125.14.
5. Or just run `node tests/policy_integrity_test.js`.

Thanks for the detailed feedback through the reviews — it pushed the implementation to where the math is fully traceable and the mint is genuinely policy-driven.
