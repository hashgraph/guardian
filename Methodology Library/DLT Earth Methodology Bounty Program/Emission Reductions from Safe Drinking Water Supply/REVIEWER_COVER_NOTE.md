# Reviewer cover note — VMR0015 / AMS-III.AV

Short orientation for a reviewer encountering this submission.

## What you are looking at

A Hedera Guardian implementation of **VMR0015 v1.0** — Verra's registry-current
revision of the CDM small-scale methodology **AMS-III.AV** *(Low GHG-emitting
safe drinking water production systems)*. The methodology applies to projects
that displace household water-boiling (typically wood, charcoal, or LPG) with
mechanical treatment systems whose throughput and water quality are monitored.

## Why this is on the Verra side of the bounty

AMS-III.AV originated as a CDM Type-III small-scale methodology and was
adopted by Verra under VCS as VMR0015. The DLT Earth bounty page lists this
slot under the Verra column. The methodology family is mainstream within
Verra — *Verra has 31+ registered projects citing VMR0015 / AMS-III.AV* — but
it is less common than VM0042 (agriculture) or VM0047 (ARR), so a reviewer
focused on those families may not have seen it before. The math is structurally
identical to the CDM original; VMR0015 adds two clarifications, both
implemented here:

1. **Conditional leakage** — `LE_woody` is only counted when the pre-project
   fuel mix contains woody biomass. Prevents over-deduction on
   electric-baseline projects.
2. **Water-quality gate** — issuance is refused when measured pass-rate
   falls below 95%, even with VVB approval.

## What is in this folder

| File | Purpose |
|---|---|
| `VMR0015.policy` | The Guardian policy export, importable directly into MGS |
| `README.md` | Full submission README — on-chain identifiers, criteria coverage, repo layout |
| `LICENSE` | Apache 2.0 |
| `AUDIT.md` | Static audit log (0 errors, 0 warnings after the structural pass) |
| `workflow.png` | Block-graph of the policy state machine |
| `calculations/VMR0015_calculations.xlsx` | Live-formula workbook replicating the policy's `customLogicBlock` math, with worked example (10.0 tCO2 net ER for a 200-household pilot) |
| `evidence/ON_CHAIN_ARTIFACTS.md` | Hedera testnet identifiers (policy id, topics, token, IPFS CIDs) |
| `evidence/EMISSIONS_CALCULATION.md` | Equations BE, PE, LE, ER_net with sources |
| `evidence/USE_CASES.md` | 8 representative project archetypes with inputs |
| `evidence/BOUNTY_CRITERIA_MATRIX.md` | Direct mapping to the 4-point Verra Methodology Bounty checklist |
| `evidence/REVIEWER_GUIDE.md` | Step-by-step instructions to import, run, and verify |
| `evidence/COMPARISON_VS_GOLD_STANDARD.md` | Disambiguation vs. the merged GS-SDW PRs (different bounty slot) |
| `evidence/FORENSIC_CHECK.md` | Hash + content cross-check between repo and on-chain artifact |
| `evidence/STRUCTURAL_AUDIT.md` | Static graph audit + fixes |
| `tests/tc1_full_lifecycle.record` | A recorded MGS test fixture covering the full lifecycle (project → validation → monitoring → verification → mint → retire) |

## What you can verify in 5 minutes

1. The policy is published on Hedera testnet — open
   [topic 0.0.8865880](https://hashscan.io/testnet/topic/0.0.8865880) and you
   will see 6 HCS messages corresponding to the 14 schemas + policy publish.
2. The calculation workbook is live — open the `xlsx`, change any input in the
   `Baseline` or `Project` sheet, and `WorkedExample!ER_net` updates in real
   time. No hardcoded results.
3. The recorded test in `tests/tc1_full_lifecycle.record` can be replayed in
   MGS by importing the policy and running the test fixture.

## Known gaps (honest disclosure)

| Item | Status | Plan |
|---|---|---|
| Calculation workbook | Present | — |
| `customLogicBlock` formulas in policy | Present (2 blocks: project + report) | v1.1.0 will split these into named blocks `calc_baseline / calc_project / calc_leakage / calc_net_er` for clearer audit |
| Uncertainty discount factor | Applied in workbook (`u_def = 0.89` per AMS-III.AV §B.7.4) | v1.1.0 will move this into the policy's `customLogicBlock` directly |
| Negative-ER handling | Workbook surfaces `FAIL` flag; v1.0.0 policy clamps to 0 | v1.1.0 will replace the silent clamp with an explicit `verificationFailed` VC path |
| Transformation blocks for Verra Project Hub | 0 blocks (consistent with merged GS-SDW and VM0047 precedents) | Optional roadmap item |
| Excel calculations | Present (this PR) | — |

These gaps are documented openly because they are real and a reviewer would
find them. The policy is functional and on-chain at v1.0.0; v1.1.0 is the
follow-up if review surfaces specific requests.

## Who to ask if anything is unclear

PR submitter: [@BikramBiswas786](https://github.com/BikramBiswas786) — happy
to walk through the policy live in MGS or answer methodology questions.
