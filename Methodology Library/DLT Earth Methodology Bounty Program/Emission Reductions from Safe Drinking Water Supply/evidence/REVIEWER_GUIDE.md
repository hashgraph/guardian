# Reviewer Guide — VMR0015 v1.0

A reviewer can verify this submission end-to-end in approximately 10 minutes without an MGS account. Follow the steps in order.

---

## Step 1 — Confirm the policy is anchored on Hedera (1 min)

Open: <https://hashscan.io/testnet/topic/0.0.8865880>

You should see ~15 messages — one per published schema (14) plus one for the policy publish event. Each message is signed by the issuer DID (see Step 2).

If the topic has the expected number of messages and the publish timestamp is `2026-05-05T21:27:40Z`, this step passes.

---

## Step 2 — Confirm the issuer DID (1 min)

Open: <https://hashscan.io/testnet/account/0.0.8865868>
Open: <https://hashscan.io/testnet/topic/0.0.8865869>

The user topic `0.0.8865869` carries the DID document for `did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869`. The latest message on this topic resolves to the DID document, including the `did-root-key` used to sign the policy publish VC.

---

## Step 3 — Inspect the token (1 min)

Open: <https://hashscan.io/testnet/token/0.0.8865898>

Confirm:
- Symbol: `CER`
- Type: Fungible
- Decimals: `2`
- Initial supply: `0`
- Admin key, supply key, wipe key all present
- Total supply: `0` until a monitoring report is approved (no minting has occurred at submission time — only the structural setup is anchored)

---

## Step 4 — Resolve the IPFS CIDs (2 min)

Open: <https://ipfs.io/ipfs/QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN>

This returns the policy JSON. Compare its top-level fields to:
- `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/VMR0015.policy` (in the PR diff)

Open: <https://ipfs.io/ipfs/QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv>

This returns the JSON-LD `@context` referenced by every VC issued by this policy.

---

## Step 5 — Verify the policy publish VC (2 min)

Pull the credential body from `evidence/ON_CHAIN_ARTIFACTS.md` §5 (or from the `.zip` export shipped in the PR).

Verify:
1. `issuer` matches the DID from Step 2.
2. `proof.verificationMethod` ends with `#did-root-key`.
3. `proof.jws` is a valid Ed25519 signature over the canonicalised credential body (use any JSON-LD VC verifier — e.g. `did-jwt-vc`, `vc-js`).

Sample (Node, with `vc-js`):

```js
import {Ed25519VerificationKey2018} from '@digitalcredentials/ed25519-verification-key-2018';
import * as vc from '@digitalcredentials/vc';
// load did-document from topic 0.0.8865869, extract did-root-key
// then: const verified = await vc.verifyCredential({credential, suite, documentLoader});
```

If `verified.verified === true`, this step passes.

---

## Step 6 — Inspect the math (1 min)

Open `evidence/CANONICAL_TC1.md` (single source of truth) or `evidence/EMISSIONS_CALCULATION.md` §5. Confirm the canonical TC1 worked example:
- `BE_total = 12.00` (BE_woody 8.00 + BE_fossil 4.00)
- `PE_total = 1.00` (electricity 0.40 + transport 0.20 + manufacturing 0.30 + aux 0.10)
- `LE_total = 1.00` (LE_woody 0.80 included because `f_woody = 0.60 > 0`; LE_fossil 0.20)
- `ER_total = max(0, 12.00 - 1.00 - 1.00) = 10.00 tCO₂e`
- `mint_units = floor(8.90 × 100) = 890` base units (= 8.90 CER on token `0.0.8865898`, decimals = 2)

The same arithmetic is implemented in the policy's `customLogicBlock` chain. The block code is in the policy JSON; search for `customLogicBlock` and inspect the `expression` field.

---

## Step 7 — Confirm originality (1 min)

Open `evidence/FORENSIC_CHECK.md` (or `AUDIT.md`).

12 forensic checks are listed. All 12 pass:

| Forbidden marker | Detected? |
|---|---|
| CDM token `0.0.3969810` | No |
| CDM topic `0.0.3969809` | No |
| Official PP IRI `00ad3636-…` | No |
| Official VVB IRI `7c6e3bfe-…` | No |
| Official PD IRI `a76cb53c-…` | No |
| Official MR IRI `8f48da39-…` | No |
| Official tag `approve_PP` | No |
| Official tag `approve_VVB` | No |
| Official tag `TrustChain` | No |
| Official tag `Choose_Roles` | No |
| Official tag `project_Pipeline` | No |
| Official tag `Monitoring_Reports_sr` | No |

To repeat the scan locally:

```bash
python3 tools/verify_originality.py \
  "Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/VMR0015.policy"
```

Expected output: `Originality scan: 0/12 forbidden markers present` followed by `OK — clean`.

---

## Step 8 — Read the trust chain (1 min)

The policy contains a `reportBlock` (renamed `vmr0015_trust_chain_report`) with 8 `reportItemBlock` children. These walk the user from any issued CER mint back through:

1. The mint event
2. The Owner approval VC
3. The VVB verification VC
4. The PP monitoring report VC
5. The Project Description VC
6. The PP profile VC
7. The role assignment
8. The policy publish VC

This is the standard Guardian "trust chain" pattern but with custom tags so it does not collide with official Verra/Gold Standard policies.

---

## Step 9 — (Optional) Run the dry-run record (5 min)

If the reviewer wants to exercise the policy themselves:

1. Import `VMR0015.policy` into their own MGS instance (free testnet account).
2. Publish.
3. Open the policy → Test → upload `tc1_full_lifecycle.record`.
4. Run.

Expected result: every action passes through. The final mint emits 890 base units (= 8.90 CER) against the supply key controlled by the policy. Inputs and expected outputs are codified in `tests/tc1_expected.json`.

---

## Pass/fail summary

If steps 1–8 all pass, the submission meets the bounty's verifiability bar.

Step 9 is optional and demonstrates dynamic correctness, not just static correctness.

---

## Where to find each artifact in the PR

| Artifact | PR path |
|---|---|
| Policy file | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/VMR0015.policy` |
| README | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/README.md` |
| LICENSE | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/LICENSE` |
| Workflow diagram | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/workflow.png` |
| Audit report | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/AUDIT.md` |
| Canonical TC1 | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/evidence/CANONICAL_TC1.md` |
| On-chain artifacts | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/evidence/ON_CHAIN_ARTIFACTS.md` |
| Emissions calc | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/evidence/EMISSIONS_CALCULATION.md` |
| Use cases | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/evidence/USE_CASES.md` |
| Bounty matrix | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/evidence/BOUNTY_CRITERIA_MATRIX.md` |
| Reviewer guide | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/evidence/REVIEWER_GUIDE.md` |
| Comparison | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/evidence/COMPARISON_VS_GOLD_STANDARD.md` |
| Forensic | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/evidence/FORENSIC_CHECK.md` |
| Calculations workbook | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/calculations/VMR0015_calculations.xlsx` |
| Test record | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/tests/tc1_full_lifecycle.record` |
| Test expected | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/tests/tc1_expected.json` |
