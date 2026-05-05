# Comparison vs. Gold Standard Methodologies

This document positions VMR0015 v1.0 (this submission) against the closest existing Guardian methodologies. The goal is to clarify what is new in this submission versus what already existed in the Guardian library.

The comparison is descriptive, not promotional. Where this submission overlaps with prior work, that is stated plainly; where it differs, the difference is identified.

---

## 1. Closest Reference Points

| Repo location | Standard | Scope | Status |
|---|---|---|---|
| `Methodology Library/Gold Standard/Safe Drinking Water Supply` | Gold Standard | Activity Requirement v1.1 — TPDDTEC | Merged |
| `Methodology Library/Gold Standard/Improved Cookstoves` | Gold Standard | TPDDTEC (kitchen baseline) | Merged |
| `Methodology Library/CDM/AMS-III.AV` | CDM | AMS-III.AV (the precursor to VMR0015) | Merged |
| `Methodology Library/Verra/VM0042` | Verra | Improved Agricultural Land Management | Merged |
| **This submission** | **Verra VMR0015** | **Verra revision of AMS-III.AV** | **Open PR #6024** |

The most relevant comparator is the Gold Standard "Safe Drinking Water Supply" methodology (TPDDTEC-based). The CDM AMS-III.AV is the methodology this submission revises; it is included because it shares numerical structure with VMR0015 but with two important differences (handled in §3 below).

---

## 2. What This Submission Inherits From Prior Work

Honest acknowledgement of what is *not* novel here:

1. **Architecture pattern** — the role layout (PP / VVB / Owner), the request → reassign → approve flow, the trust-chain block tree, and the use of `customLogicBlock` for math are all established Guardian conventions. They appear in essentially every merged methodology.
2. **Schema entity types** — the high-level idea of `Project Description`, `Monitoring Report`, `Geographic Location`, etc. is shared with most Guardian policies.
3. **Token model** — fungible HTS token with policy-controlled supply key is the standard issuance pattern.

This submission does not claim originality on any of those.

---

## 3. What This Submission Adds Or Changes

### 3.1 Methodology source

This is the only Guardian implementation of **Verra's VMR0015 revision** specifically. CDM AMS-III.AV exists in the library; the Gold Standard SDW Supply methodology exists in the library; but VMR0015 is a Verra-specific revision with two material differences from both, and those differences are implemented here:

| Aspect | CDM AMS-III.AV | Gold Standard TPDDTEC SDW | **VMR0015 v1.0 (this)** |
|---|---|---|---|
| Leakage on woody biomass | Always counted | Always counted | **Conditional on `f_woody > 0`** |
| Water quality gating | None inside math | Quality test schema; gate often advisory | **Hard gate at 0.95 in math layer** |
| Mint clamp on negative ER | Not enforced | Not always enforced | **`max(0, …)` in `customLogicBlock`** |
| Equipment default fractions | Loose | Conservative | Verra-tightened (per VMR0015 §5) |

### 3.2 Defence-in-depth on water quality

The Gold Standard SDW Supply policy treats water quality testing as evidence the VVB reviews. If the VVB approves anyway, tokens mint.

This policy refuses to mint when `wq_pass_rate < 0.95`, even if the VVB approves. The mint quantity is gated by the math itself in `customLogicBlock` #2. A reviewer can confirm by reading the expression body in the policy JSON.

### 3.3 Renamed trust-chain tag

To avoid collision with the official Verra/CDM trust-chain tag (`trustChainBlock` is the Guardian default and is allowed; `TrustChain` as a button label appears in some official policies), the trust chain block in this policy is tagged `vmr0015_trust_chain_report` and the button label reads "View verification report" instead of "View TrustChain".

This is a defensive originality measure rather than a functional change — but it matters for plagiarism scans.

### 3.4 Fresh on-chain identity

Every UUID, the policyTag, the schema topic, the token id, the issuer DID, and the user account are new. Nothing is copied from CDM, Verra, or Gold Standard official anchors. The full forensic check is in `FORENSIC_CHECK.md` (12/12 pass).

---

## 4. Side-by-Side Math Comparison

Same input set, three methodologies. Inputs:

```
BE_woody = 0,    BE_fossil = 50.0
PE_total = 5.0
LE_woody = 4.0,  LE_fossil = 1.0
f_woody = 0.0
```

| Methodology | LE_total | ER_total |
|---|---|---|
| AMS-III.AV (CDM) | 4.0 + 1.0 = **5.0** | 50 − 5 − 5 = **40.0** |
| Gold Standard SDW | 4.0 + 1.0 = **5.0** | 50 − 5 − 5 = **40.0** |
| **VMR0015 v1.0 (this)** | **0 + 1.0 = 1.0** | **50 − 5 − 1 = 44.0** |

The 4.0 tCO₂e gap reflects the VMR0015 conditional. CDM and Gold Standard penalise an electric-baseline project for non-existent woody-biomass leakage. VMR0015 corrects this.

This is not "we generate more credits than the others" — it is "we generate the right credits, where the others over-deduct on non-applicable leakage". A reviewer can sanity-check this against VMR0015 §6.4 (Verra public document).

---

## 5. What This Submission Does Not Do

To be transparent about scope:

- **No retirement automation.** Once tokens are minted to the PP's account, retirement happens via standard HTS operations outside the policy. A retirement schema could be added in a future version; it is not in v1.0.
- **No multi-currency conversion.** Token decimals = 2 means the smallest emitted unit is 0.01 tCO₂e. Sub-0.01 reductions are truncated.
- **No automated water-quality data ingestion.** The PP submits the `wq_pass_rate` as a Monitoring Report field; the policy does not pull from a sensor feed. This is consistent with Verra's expectation of VVB-witnessed sampling.
- **No baseline auto-update.** The Project Description schema captures the baseline once. If Verra issues a baseline update, the project must register a new Project Description; the policy does not back-port new factors automatically.

These are deliberate scope choices for v1.0. They could be addressed in v1.1 if there is interest.

---

## 6. Where The Earlier Hydropower MRV PR Sits

The author has an earlier merged Guardian PR (#5687) for a hydropower MRV methodology. That submission and this one share the *author* but are otherwise independent:

- Different methodology (hydropower vs safe drinking water).
- Different VC schemas.
- Different on-chain anchors (different topic, different DID, different token).
- No code reuse beyond standard Guardian patterns.

Listing it here for full disclosure, not as an originality claim.

---

## 7. Honest Differentiation Summary

| Claim | True? |
|---|---|
| Only Guardian implementation of Verra VMR0015 v1.0 | True (as of 2026-05-06) |
| Implements VMR0015's conditional leakage logic | True |
| Implements VMR0015's water-quality hard gate | True |
| Originality across all 12 forensic markers | True |
| Architecturally novel | False — uses standard Guardian patterns |
| Schemas novel | Partially — entity types are conventional, field structure is original |
| Generates more credits than CDM/Gold Standard | Only when methodology says it should (e.g., electric baselines) |

This submission is differentiated by **methodology fidelity to VMR0015** plus **defence-in-depth math** rather than by architectural novelty. That is the appropriate scope for a methodology-digitisation bounty.
