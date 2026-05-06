# On-chain artifacts — VMR0015 v1.0

All identifiers below are independently verifiable on Hedera testnet via
Hashscan and IPFS. No item depends on author-side metadata.

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
| `69fa42dcbafe0836d93bc4b9` | Mongo ObjectId | Prior (deprecated) policy |
| `69fa5c34bafe0836d93bcde0` | Mongo ObjectId | This published policy |
| `69fa60ccbafe0836d93bcf24` | Mongo ObjectId | Local DB id of the publish-VC document |
| `59fa0904-b890-4fb9-b46e-0a1d8f654883` | UUID | Policy `uuid` (carried inside the policy and in the publish VC) |
| `75fac51f-ba27-44f3-a678-1fa427cbc64c` | UUID | Publish-VC URN |
| `1778016453.758267000` | HCS messageId | Anchors the publish event on topic `0.0.8865880` |
