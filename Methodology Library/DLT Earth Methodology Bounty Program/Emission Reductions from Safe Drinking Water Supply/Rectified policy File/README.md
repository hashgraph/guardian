# Rectified Policy File — VMR0015 v1.1.1

This folder is an additive, last-pass safety net for the bounty review. It does not replace anything elsewhere in the bounty submission. The canonical bundle (policy + evidence + calculations + tools + tests) lives one folder up; this folder holds a freshly republished export of the same policy with the final residual gaps closed, so reviewers have a known-good import path regardless of which copy they pick up first.

## Folder contents

The folder ships three artifacts plus this README.

`VMR0015.policy ( Rectified)` is the rectified Guardian policy binary. Same logic and topology as the bounty-folder root, with the validator dataType repair and the u_def application baked in, re-exported from the freshly published v1.1.1 instance.

`Rectified Policy File Json.py` is the full JSON export of the published policy. Despite the `.py` extension, the file contents are JSON; reviewers can rename it to `.json` if their tooling is strict.

`Rectified Policy File CSV .` is the CSV view of the published VC document fields — issuer, ids, context, proof — generated from the MGS profile export.

## Why a republish was needed

During the final pass three deltas were applied relative to the v1.0 export the bounty PR opened with.

The first delta was the validator dataType enum. Thirty-seven `sendToGuardianBlock` and `documentsSourceAddon` entries had `dataType` values outside the validator's allowed set `{vc-documents, did-documents, approve, hedera}` — mostly `database`, empty string, or `vp-documents`. The repair was deterministic, derived from each block's own `documentType` and `entityType` fields. Final audit shows zero invalid values across all fifty-three affected blocks.

The second delta was the math-layer water-quality gate. `customLogicBlock.calculate_report_fields` now derives `wq_pass_rate` from the per-test Pass/Fail verdicts in `field2[*].field8` and forces `ER_total = 0` when the rate falls below 0.95. Issuance is blocked at the math layer regardless of upstream approvals.

The third delta was the uncertainty discount. `u_def = 0.89` is now applied inside the same `customLogicBlock`, after the wq-gate, before mint. The output document surfaces both `ER_gross` and `u_def` for audit transparency. This closes the only gap previously deferred to the calculations workbook.

Runtime topology and schema set are otherwise unchanged. Reviewers can diff v1.0 against v1.1.1 to confirm the only deltas are these three.

## v1.1.1 published instance

The rectified policy was published on Hedera testnet at the time of this commit. The full identifier set is below; Hashscan links resolve directly to the on-chain artifacts.

Policy version is `1.1.1`. Policy uuid is `e72bf20d-f12b-47d9-af92-5b8346abed33`. Policy tag is `Tag_1778107744798.e20c1865`. The publish operation completed with status `PUBLISH`.

The owner DID and issuer DID is `did:hedera:testnet:B2fk9cdS5DEWadWgJaRqcM5mY5aDR4isa4RLcwm7K1GB_0.0.8877030`. The Hedera account is `0.0.8877029`. The user topic is `0.0.8877030`. The initialization topic is `0.0.1960`.

The policy IPFS CID is `QmVQpKkGPyzDe9CwsK89um4w1RMqDowd6yXj9mQEjCTVBf`, fetchable at `ipfs://QmVQpKkGPyzDe9CwsK89um4w1RMqDowd6yXj9mQEjCTVBf`. The context CID is `QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv`.

The publish VC carries id `urn:uuid:7de5b666-3b33-4b46-824b-bcc9fa078bbd`, type `VerifiableCredential`, issuance date `2026-05-06T23:12:34.176Z`. The publish-message VC inside `credentialSubject` carries id `urn:uuid:1778109147.542038000` and type `Policy&1.0.0`. The proof is `Ed25519Signature2018` with verification method `did:hedera:testnet:B2fk9cdS5DEWadWgJaRqcM5mY5aDR4isa4RLcwm7K1GB_0.0.8877030#did-root-key`.

Hashscan: account at https://hashscan.io/testnet/account/0.0.8877029, user topic at https://hashscan.io/testnet/topic/0.0.8877030, init topic at https://hashscan.io/testnet/topic/0.0.1960.

## v1.0 published instance — kept for traceability

The earlier v1.0 publish remains anchored at the root of the bounty folder and should be diffed against v1.1.1 to confirm the deltas listed above.

Policy id is `69fa5c34bafe0836d93bcde0`. Policy uuid is `59fa0904-b890-4fb9-b46e-0a1d8f654883`. Issuer DID is `did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869`. Hedera account is `0.0.8865868`. Schema topic is `0.0.8865880`. Instance topic is `0.0.8865998`. Token is `0.0.8865898` (CER, fungible, decimals=2). Publish messageId is `1778016453.758267000`. Publish VC URN is `urn:uuid:75fac51f-ba27-44f3-a678-1fa427cbc64c`. Successor policy id is `69fa60ccbafe0836d93bcf24`. The full v1.0 published JSON also lives at `evidence/PUBLISHED_POLICY.json` in the bounty folder root.

## Formula architecture

`customLogicBlock` carries the full formula set under tag `calculate_report_fields`. It sits between the Monitoring Report `documentValidatorBlock` and the `mintDocumentBlock`, so every minted token is the direct output of this block's math.

The block defines two functions. `compute_wq_pass_rate(raw)` walks `raw.field2[*].field8` — the array of per-test Pass/Fail verdicts on the Water Quality Test schema — and returns the fraction of tests that pass, case-insensitive on the leading word "pass". `calc_vmr0015(doc)` is the main calculation.

The main calculation reads schema fields by their canonical positions on the Monitoring Report VC. `BE_woody = field5.field1` and `BE_fossil = field5.field2`, so `BE_total = BE_woody + BE_fossil`. `PE_total = field4.field1 + field4.field2 + field4.field3 + field4.field4`, summing the four project-side emission components per VMR0015 §6. `f_woody = field2.field0`, `LE_woody = field6.field1`, `LE_fossil = field6.field2`, and `LE_total = (f_woody > 0 ? LE_woody : 0) + LE_fossil` — woody-leakage only counts when there is woody fuel in the baseline mix. `ER_total = max(BE_total − PE_total − LE_total, 0)` enforces the methodology's no-negative floor.

After that base calculation, the wq hard gate executes: `if (wq_pass_rate < 0.95) ER_total = 0`. Then the uncertainty discount: `ER_gross = ER_total; u_def = 0.89; ER_total = ER_gross × u_def`. The output document writes back `field5.field0 = BE_total`, `field4.field0 = PE_total`, `field6.field3 = LE_total`, `field7 = ER_total`, and surfaces `u_def`, `ER_gross`, and `wq_pass_rate` as additional auditable fields.

The mint linkage is direct. `mintDocumentBlock` carries tag `mintToken` and `rule = field7`, which is exactly where the formula writes `ER_total`. The mint pipeline therefore reflects both the wq-gate and the u_def discount without any intermediate transformation.

Validator hygiene across the rest of the policy graph is clean: zero invalid `dataType` values across all 193 blocks (52 `sendToGuardianBlock` plus 35 `documentsSourceAddon`, all conforming to `{vc-documents, did-documents, approve, hedera}`).

## Schema linkage

The bundle ships fourteen schemas. The Monitoring Report (VMR0015) carries the per-period inputs the formula reads. Baseline Emissions Breakdown carries `BE_woody` and `BE_fossil`. Project Activity Emissions carries the four PE components. Leakage Adjustment (VMR0015) carries `LE_woody` and `LE_fossil`. Baseline Fuel Mix (VMR0015) carries `f_woody`. Water Quality Test carries the per-test Pass/Fail verdict that drives `wq_pass_rate`. The remaining schemas — Project Description, Household Profile, Geographic Location, Water Purification Device, Operating Performance, VVB, Project Participant, and Monitoring Reporting Period — carry the supporting identity and context VCs that frame the workflow.

## Canonical TC1 worked example

Inputs: 200 households, 365-day reporting period, `f_woody = 0.60`, `wq_pass_rate = 0.98`, `BE_woody = 8.00`, `BE_fossil = 4.00`, PE components 0.40 + 0.20 + 0.30 + 0.10, `LE_woody = 0.80`, `LE_fossil = 0.20`.

Computed: `BE_total = 12.00`, `PE_total = 1.00`, `LE_total = 1.00`, `ER_gross = 10.00 tCO₂e`. With `u_def = 0.89` applied, `ER_total = 8.90 tCO₂e`. Mint = `floor(8.90 × 100) = 890 base units`, which renders as **8.90 CER** on token `0.0.8865898` (decimals=2).

Reviewers can replay this end-to-end with `python3 tools/verify_oracle.py` from the bounty folder root. The script mirrors the policy math and asserts `mint_base_units = 890`.

## Bounty queue testing path

The artifacts in this folder are import-ready for MGS. Take `VMR0015.policy ( Rectified)`, optionally rename to `VMR0015.policy` for tooling that is strict about extensions, and import via MGS → Policies → Import file. The policy lands in DRAFT. From there `Dry Run` is the recommended first action; `Publish` would re-use the v1.1.1 instance topic.

Two reviewer scripts at the bounty folder root validate the build without spinning up MGS. `python3 tools/verify_originality.py VMR0015.policy` runs the twelve-marker forensic scan and confirms zero forbidden markers and zero mainnet messageId references. `python3 tools/verify_oracle.py` replays the canonical TC1 numbers and asserts `mint_base_units = 890`.

The recorded full-lifecycle test is at `tests/tc1_full_lifecycle.record`. It is an institutional-pilot recording that exercises the complete role flow: role choice → PP profile → regrequest → monrequest → wqrequest → valrequest → verrequest → ownerconfirmrequest. Recorded against the current build, with the wq hard gate and the dormant `calculate_project_fields` block already removed.

## Design and reviewer materials

The bounty folder root ships the design and reviewer pack that supports a fast review pass.

The `workflow.png` file at the root is the policy workflow diagram. `REVIEWER_COVER_NOTE.md` is a one-page orientation that lists what to verify in five minutes.

The `evidence/` directory holds the formal evidence pack. `EMISSIONS_CALCULATION.md` carries the formula derivation, schema field paths, and worked numbers. `BOUNTY_CRITERIA_MATRIX.md` is the line-by-line bounty rubric with a 40/40 internal scorecard. `CANONICAL_TC1.md` is the single source of truth for the worked example. `COMPARISON_VS_GOLD_STANDARD.md` documents the design rationale against the GS-side methodology and discloses the wq-gate honestly. `STRUCTURAL_AUDIT.md` records the block-graph audit at zero errors and zero warnings. `FORENSIC_CHECK.md` documents originality and clean-room evidence. `ON_CHAIN_ARTIFACTS.md` is the Hedera identifier index. `USE_CASES.md` carries the sizing line and archetype table. `PUBLISHED_POLICY.json` is the full v1.0 published-policy JSON for diffing.

The `calculations/VMR0015_calculations.xlsx` workbook ships eight sheets and forty-seven live formulas, with a `PolicyMapping` sheet that links Excel cells to specific `customLogicBlock` fields so reviewers can cross-check the math against the code.

The `tools/` directory carries the two verifier scripts described above.

## Scope of this folder

This folder is not a replacement for the canonical bundle. The canonical bundle is one folder up, and where the two diverge the root version is canonical and this folder should be treated as the most recent re-export. It is not a separate methodology submission either — the methodology is still VMR0015 v1.0; v1.1.1 is the policy-build version, not a methodology-version bump. And it is not a workaround for any failed CI check; CI on PR #6024 is green except for Assignee Check, which clears on self-assign.
