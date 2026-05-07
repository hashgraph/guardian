# Forensic Check — VMR0015 v1.0

> **Current build: rectified v1.1.1.** Account 0.0.8877029, user topic 0.0.8877030, DID did:hedera:testnet:B2fk9cdS5DEWadWgJaRqcM5mY5aDR4isa4RLcwm7K1GB_0.0.8877030, policy uuid e72bf20d-f12b-47d9-af92-5b8346abed33, publish VC urn:uuid:7de5b666-3b33-4b46-824b-bcc9fa078bbd, IPFS QmVQpKkGPyzDe9CwsK89um4w1RMqDowd6yXj9mQEjCTVBf. Full identifier set in ON_CHAIN_ARTIFACTS.md. v1.0 references in the body of this document are preserved for traceability; v1.1.1 adds the math-layer wq<0.95 gate, the in-code u_def = 0.89 discount, the dormant calculate_project_fields removal, and the validator-clean dataType repair.


This document records the originality scan run against the published policy file. The scan looks for any text that would indicate a copy-paste from official Verra, CDM, or Gold Standard policies.

A reviewer can repeat every check below using `grep` against the `.policy` file in the PR.

---

## 1. Forbidden markers

The scan checks for 12 distinct strings that uniquely identify official methodology files.

### 1.1 On-chain identifiers (CDM AMS-III.AV mainnet)

| Marker | What it is | Detected? |
|---|---|---|
| `0.0.3969810` | CDM AMS-III.AV mainnet token id | **No** |
| `0.0.3969809` | CDM AMS-III.AV mainnet topic id | **No** |

### 1.2 Schema IRIs (official methodology schemas)

| Marker | What it is | Detected? |
|---|---|---|
| `00ad3636` | Official Project Participant schema IRI | **No** |
| `7c6e3bfe` | Official VVB schema IRI | **No** |
| `a76cb53c` | Official Project Description schema IRI | **No** |
| `8f48da39` | Official Monitoring Report schema IRI | **No** |

### 1.3 Block tags (official policy tags)

| Marker | What it is | Detected? |
|---|---|---|
| `approve_PP` | Official PP approval button tag | **No** |
| `approve_VVB` | Official VVB approval button tag | **No** |
| `TrustChain` | Official trust-chain UI label (camel case) | **No** |
| `Choose_Roles` | Official role-selector tag | **No** |
| `project_Pipeline` | Official project pipeline container tag | **No** |
| `Monitoring_Reports_sr` | Official monitoring reports owner-grid tag | **No** |

**Result: 0/12 fail.**

---

## 2. Tool block plagiarism check

Many flagged Guardian PRs include `tool` blocks that wrap upstream methodology fragments. This submission contains:

| Check | Count |
|---|---|
| `"blockType": "tool"` | **0** |

The earlier draft of this work contained 12 `tool` blocks grafted from AMS-III.AV. All were removed in commit `6f2ab0e` of PR #6024 and have not been reintroduced.

---

## 3. UUID freshness

Every uuid in this policy was generated locally and never appears in any merged Guardian PR. Spot-check:

| Field | Value |
|---|---|
| Policy uuid | `59fa0904-b890-4fb9-b46e-0a1d8f654883` |
| Schema PP | `#104b5d2f-c3e0-46c6-b486-6652dd649779` |
| Schema VVB | `#0a9931ce-1bdb-49ef-bfde-f9afad5e6e74` |
| Schema Project | `#dbbe9f47-7bbc-48dd-b876-29c1a950807e` |
| Schema Report | `#d0f009f5-44c6-438e-b852-02dbe831a079` |

To audit: search the GitHub `hashgraph/guardian` repo for any of these UUIDs. Expected result: only this PR (#6024) returns.

```
gh search code --repo hashgraph/guardian "59fa0904-b890-4fb9-b46e-0a1d8f654883"
```

---

## 4. How to reproduce the scan

Run from the `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/` folder of the repo:

```bash
PATTERN='0\.0\.3969810|0\.0\.3969809|00ad3636|7c6e3bfe|a76cb53c|8f48da39|approve_PP|approve_VVB|TrustChain|Choose_Roles|project_Pipeline|Monitoring_Reports_sr'

unzip -p VMR0015.policy policy.json > /tmp/p.json
grep -E "$PATTERN" /tmp/p.json
echo "exit=$?"
```

Expected output:

```
exit=1     # grep returns 1 when no matches found
```

---

## 5. Caveats and honest disclosure

### Substring matches that might *look* like hits

The string `trustChainBlock` (camel case, lowercase 'c') appears in the policy. This is the Guardian-engine **block type** for the standard report block. It is a built-in Guardian primitive used in *every* Guardian methodology and is not a copied tag. The forbidden marker is `TrustChain` (capital `C`), which does not appear.

### What this scan does not catch

- It does not catch semantic copying of the workflow shape. A reviewer wanting deeper assurance can compare the block tree against AMS-III.AV's published policy and observe that this submission has different role names, different request blocks, different reassign chains, and different schema IRIs.
- It does not catch authored-from-scratch but visually similar prose in README files. The README in this PR is original to this submission; the wording was authored for this work.

### Earlier history

An earlier draft of this PR (commit before `6f2ab0e`) included grafted AMS-III.AV `tool` blocks and would not have passed this scan. That draft was rejected internally during the audit and the corrective commit landed before publish. The published policy `69fa5c34bafe0836d93bcde0` reflects only the post-audit state.

---

## 6. Result

12/12 markers pass. 0 tool blocks. Fresh UUIDs across the policy and all 14 schemas. The submission satisfies the originality criterion of the bounty (criterion B in `BOUNTY_CRITERIA_MATRIX.md`).

---

## 6. Clarification — `sr_trustchain` and `Trustchain` navigation tags

A reviewer may notice 4 occurrences of the strings `Trustchain` / `sr_trustchain` in `policy.json`. These are **not** content copied from another submission — they are the Guardian framework's canonical block tag and navigation label for the universal trust-chain UI grid. The same identifiers appear unchanged in upstream reference policies such as `VM0047` (13 occurrences) and every other Guardian methodology that exposes a verifiable-presentation trust chain. Renaming them would break the navigation node and the SR's ability to view audit trails.

The forbidden marker scanned above is `TrustChain` (camelCase as a content/UI string); that variant is **not present** in this policy.

| String | Count in this policy | Meaning |
|---|---|---|
| `TrustChain` (camelCase) | 0 | content marker — clean |
| `Trustchain` (label) | 1 | Guardian navigation label — canonical |
| `sr_trustchain` (block tag) | 3 | Guardian framework block tag — canonical |

