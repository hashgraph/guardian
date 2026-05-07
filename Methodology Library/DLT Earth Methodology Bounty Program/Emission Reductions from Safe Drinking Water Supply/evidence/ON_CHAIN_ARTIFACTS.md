# On-chain artifacts — VMR0015

All identifiers below are independently verifiable on Hedera testnet via Hashscan and IPFS. No item depends on author-side metadata.

Two published instances exist on testnet. **v1.1.1 is the current, rectified build that this PR is reviewed against.** v1.0 is the original publish, kept for traceability.

---

## v1.1.1 — current rectified instance (review against this)

### Policy

| Item | Value |
| --- | --- |
| Policy version | `1.1.1` |
| Policy uuid | `e72bf20d-f12b-47d9-af92-5b8346abed33` |
| Policy tag | `Tag_1778107744798.e20c1865` |
| Status | `PUBLISH` |
| publish timestamp | `2026-05-06T23:12:34.176Z` |
| Tenant id | `69fbc4105f9e36c24879a706` |
| Account type | ATP |

### Hedera

| Item | Id | Hashscan |
| --- | --- | --- |
| Hedera account | `0.0.8877029` | https://hashscan.io/testnet/account/0.0.8877029 |
| User topic | `0.0.8877030` | https://hashscan.io/testnet/topic/0.0.8877030 |
| Initialization topic | `0.0.1960` | https://hashscan.io/testnet/topic/0.0.1960 |

### Identity

| Item | Value |
| --- | --- |
| Issuer / owner DID | `did:hedera:testnet:B2fk9cdS5DEWadWgJaRqcM5mY5aDR4isa4RLcwm7K1GB_0.0.8877030` |
| Verification method | `did:hedera:testnet:B2fk9cdS5DEWadWgJaRqcM5mY5aDR4isa4RLcwm7K1GB_0.0.8877030#did-root-key` |

### Publish Verifiable Credential

| Field | Value |
| --- | --- |
| VC id | `urn:uuid:7de5b666-3b33-4b46-824b-bcc9fa078bbd` |
| Operation | `PUBLISH` |
| issuanceDate (UTC) | `2026-05-06T23:12:34.176Z` |
| Publish-message VC id | `urn:uuid:1778109147.542038000` |
| Publish-message VC type | `Policy&1.0.0` |
| Proof type | `Ed25519Signature2018` (detached JWS, EdDSA, `crit:["b64"]`) |
| proofPurpose | `assertionMethod` |

### IPFS

| CID | Purpose | Gateway |
| --- | --- | --- |
| `QmVQpKkGPyzDe9CwsK89um4w1RMqDowd6yXj9mQEjCTVBf` | Policy bundle (v1.1.1) | https://ipfs.io/ipfs/QmVQpKkGPyzDe9CwsK89um4w1RMqDowd6yXj9mQEjCTVBf |
| `QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv` | JSON-LD context (shared) | https://ipfs.io/ipfs/QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv |

### What changed vs v1.0

- Math-layer water-quality gate (`wq_pass_rate < 0.95 → ER_total = 0`)
- Uncertainty discount applied in code (`u_def = 0.89; ER_total = ER_gross * u_def`)
- Dormant `calculate_project_fields` block removed (193 blocks, was 194; 1 customLogicBlock, was 2)
- 37 invalid `dataType` values repaired (0 invalid across 53 affected blocks)

Token `0.0.8865898` (CER, decimals=2) carries over from v1.0.

---

## v1.0 — original publish (superseded, kept for traceability)

## Policy

| Item | Value |
| --- | --- |
| Policy id (Guardian internal `_id`) | `69fa5c34bafe0836d93bcde0` |
| Policy uuid | `59fa0904-b890-4fb9-b46e-0a1d8f654883` |
| policyTag | `Tag_1778015271422_9323264d` |
| Version | `1.0.0` |
| Status | `PUBLISH` |
| createDate | `2026-05-05T21:08:04.967Z` |
| publish timestamp | `2026-05-05T21:27:40.407Z` |
| Guardian engine codeVersion | `1.5.1` |

## Hedera Consensus Service topics

| Topic | Id | Hashscan |
| --- | --- | --- |
| Schema topic | `0.0.8865880` | https://hashscan.io/testnet/topic/0.0.8865880 |
| Instance topic | `0.0.8865998` | https://hashscan.io/testnet/topic/0.0.8865998 |
| Synchronization topic | `0.0.8866000` | https://hashscan.io/testnet/topic/0.0.8866000 |
| Issuer DID topic | `0.0.8865869` | https://hashscan.io/testnet/topic/0.0.8865869 |

## Identity

| Item | Value |
| --- | --- |
| Issuer DID | `did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869` |
| Issuer account | `0.0.8865868` (Hashscan: https://hashscan.io/testnet/account/0.0.8865868) |
| DID document | resolves on topic `0.0.8865869` |

## Token

| Item | Value |
| --- | --- |
| Token id | `0.0.8865898` |
| Symbol | `CER` |
| Name | `CER_VMR0015_Bikram` |
| Type | fungible |
| Decimals | 2 |
| `enableAdmin` / `changeSupply` / `enableWipe` | true / true / true |
| `enableFreeze` / `enableKYC` | false / false |
| Supply key | held by policy |
| Hashscan | https://hashscan.io/testnet/token/0.0.8865898 |

> `enableWipe: true` is set so the supply authority can revoke testnet credits
> issued during reviewer dry-runs. Production deployments should rotate this
> off and migrate to a retirement-via-VC pattern.

## Publish Verifiable Credential

| Field | Value |
| --- | --- |
| VC URN | `urn:uuid:75fac51f-ba27-44f3-a678-1fa427cbc64c` |
| Operation | `PUBLISH` |
| Issuer | `did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869` |
| issuanceDate (UTC) | `2026-05-05T21:27:40.407Z` |
| Subject id (HCS messageId) | `urn:uuid:1778016453.758267000` |
| Subject uuid | `59fa0904-b890-4fb9-b46e-0a1d8f654883` |
| Proof type | `Ed25519Signature2018` (detached JWS, EdDSA, `crit:["b64"]`) |
| verificationMethod | `did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869#did-root-key` |
| proofPurpose | `assertionMethod` |

> `credentialSubject.type` uses Guardian's internal `<schema-name>&<version>`
> delimiter (`Policy&1.0.0`); this is normal and recognised by Guardian-aware
> verifiers.

## IPFS

| CID | Purpose | Gateway |
| --- | --- | --- |
| `QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN` | Policy bundle | https://ipfs.io/ipfs/QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN |
| `QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv` | JSON-LD context | https://ipfs.io/ipfs/QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv |

## ID glossary

| Id | Type | Meaning |
| --- | --- | --- |
| `e72bf20d-f12b-47d9-af92-5b8346abed33` | UUID | **v1.1.1** policy `uuid` (current, rectified) |
| `7de5b666-3b33-4b46-824b-bcc9fa078bbd` | UUID | **v1.1.1** publish-VC URN |
| `1778109147.542038000` | HCS messageId | **v1.1.1** publish-message VC id |
| `B2fk9cdS5DEWadWgJaRqcM5mY5aDR4isa4RLcwm7K1GB` | Hedera DID base58 | **v1.1.1** issuer/owner DID base |
| `Tag_1778107744798.e20c1865` | Guardian policy tag | **v1.1.1** internal tag |
| `69fbc4105f9e36c24879a706` | Hex tenant id | **v1.1.1** MGS tenant |
| `69fa42dcbafe0836d93bc4b9` | Mongo ObjectId | Prior (deprecated) policy |
| `69fa5c34bafe0836d93bcde0` | Mongo ObjectId | v1.0 published policy |
| `69fa60ccbafe0836d93bcf24` | Mongo ObjectId | Local DB id of the v1.0 publish-VC document |
| `59fa0904-b890-4fb9-b46e-0a1d8f654883` | UUID | v1.0 policy `uuid` |
| `75fac51f-ba27-44f3-a678-1fa427cbc64c` | UUID | v1.0 publish-VC URN |
| `1778016453.758267000` | HCS messageId | Anchors the v1.0 publish event on topic `0.0.8865880` |
