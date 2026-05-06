# Published policy JSON — `PUBLISHED_POLICY.json`

This file is the full JSON export of the live published policy on Hedera testnet.

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
