# Published policy JSON — `PUBLISHED_POLICY.json`

This file is the full JSON export of the **v1.0** published policy on Hedera testnet, kept for traceability and diffing.

> **Current build is v1.1.1.** The rectified v1.1.1 JSON export lives at `Policy File (JSON)` at the bounty folder root and at `Rectified policy File/Rectified Policy File Json.py`. v1.1.1 IDs: policy uuid `e72bf20d-f12b-47d9-af92-5b8346abed33`, publish VC `urn:uuid:7de5b666-3b33-4b46-824b-bcc9fa078bbd`, account `0.0.8877029`, user topic `0.0.8877030`, IPFS `QmVQpKkGPyzDe9CwsK89um4w1RMqDowd6yXj9mQEjCTVBf`. v1.1.1 adds the math-layer wq<0.95 gate, the `u_def = 0.89` in-code discount, the dormant `calculate_project_fields` block removal, and the validator-clean dataType repair.

## Identifiers

| Field | Value |
|---|---|
| Policy id | `69fa5c34bafe0836d93bcde0` |
| Policy uuid | `59fa0904-b890-4fb9-b46e-0a1d8f654883` |
| Name | `VMR0015 v1.0 — Safe Drinking Water dMRV` |
| Version | `1.0.0` |
| Status | `PUBLISH` |
| Schema topic | `0.0.8865880` |
| Instance topic | `0.0.8865998` |
| Publish messageId | `1778016453.758267000` |
| Policy tag | `Tag_1778015271422.9323264d` |
| Token | `0.0.8865898` (CER, fungible, decimals = 2) |
| Issuer DID | `did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869` |
| Owner account | `0.0.8865868` |

## Why this file is in the PR

A reviewer can compare the policy bundle (`VMR0015.policy`) against the live
on-chain published policy without spinning up MGS. The JSON in this file is the
authoritative source pulled directly from the published policy.

## Cross-references

- Publish VC URN — `urn:uuid:75fac51f-ba27-44f3-a678-1fa427cbc64c` — see
  `evidence/ON_CHAIN_ARTIFACTS.md` for the IPFS pin and proof block.
- Successor / corrective-pass policy id — `69fa60ccbafe0836d93bcf24` — see
  `AUDIT.md` for the lineage.
