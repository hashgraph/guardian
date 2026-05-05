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
- `Methodology Library/Verra/VMR0015/VMR0015.policy` (in the PR diff)

Open: <https://ipfs.io/ipfs/QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv>

This returns the JSON-LD `@context` referenced by every VC issued by this policy.

---

## Step 5 — Verify the policy publish VC (2 min)

Pull the credential body from `evidence_final/ON_CHAIN_ARTIFACTS.md` §5 (or from the `.zip` export shipped in the PR).

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

Open `evidence_final/EMISSIONS_CALCULATION.md`. Pick the worked example in §5 (rural Bengal pilot). Confirm:
- `BE_total = 200.0`
- `PE_total = 8.5`
- `LE_total = 4.0` (because `f_woody = 0.40 > 0`)
- `ER_total = 187.5`
- `mint_units = 18,750` (decimals=2)

The same arithmetic is implemented in the policy's `customLogicBlock` chain. The block code is in the policy JSON; search for `customLogicBlock` and inspect the `expression` field.

---

## Step 7 — Confirm originality (1 min)

Open `evidence_final/FORENSIC_CHECK.md` (or `AUDIT.md`).

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
grep -E "0\.0\.3969810|0\.0\.3969809|00ad3636|7c6e3bfe|a76cb53c|8f48da39|approve_PP|approve_VVB|TrustChain|Choose_Roles|project_Pipeline|Monitoring_Reports_sr" \
  Methodology\ Library/Verra/VMR0015/VMR0015.policy
```

Expected output: empty (zero matches).

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

Expected result: every action passes through. The final mint emits 18,750 units (= 187.50 CER) against the supply key controlled by the policy.

---

## Pass/fail summary

If steps 1–8 all pass, the submission meets the bounty's verifiability bar.

Step 9 is optional and demonstrates dynamic correctness, not just static correctness.

---

## Where to find each artifact in the PR

| Artifact | PR path |
|---|---|
| Policy file | `Methodology Library/Verra/VMR0015/VMR0015.policy` |
| README | `Methodology Library/Verra/VMR0015/README.md` |
| LICENSE | `Methodology Library/Verra/VMR0015/LICENSE` |
| Workflow diagram | `Methodology Library/Verra/VMR0015/workflow.png` |
| Audit report | `Methodology Library/Verra/VMR0015/AUDIT.md` |
| On-chain artifacts | `Methodology Library/Verra/VMR0015/evidence/ON_CHAIN_ARTIFACTS.md` |
| Emissions calc | `Methodology Library/Verra/VMR0015/evidence/EMISSIONS_CALCULATION.md` |
| Use cases | `Methodology Library/Verra/VMR0015/evidence/USE_CASES.md` |
| Bounty matrix | `Methodology Library/Verra/VMR0015/evidence/BOUNTY_CRITERIA_MATRIX.md` |
| Reviewer guide | `Methodology Library/Verra/VMR0015/evidence/REVIEWER_GUIDE.md` |
| Comparison | `Methodology Library/Verra/VMR0015/evidence/COMPARISON_VS_GOLD_STANDARD.md` |
| Forensic | `Methodology Library/Verra/VMR0015/evidence/FORENSIC_CHECK.md` |
| Test record | `Methodology Library/Verra/VMR0015/tests/tc1_full_lifecycle.record` |
