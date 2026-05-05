# On-Chain Artifacts — VMR0015 v1.0 Safe Drinking Water dMRV

This document lists every public identifier produced by publishing the policy on Hedera testnet via Managed Guardian Service (MGS).

A reviewer can independently verify each artifact on Hashscan and IPFS without any access to the author's MGS account.

---

## 1. Policy

| Field | Value |
|---|---|
| Policy id (Mongo) | `69fa5c34bafe0836d93bcde0` |
| Policy uuid | `59fa0904-b890-4fb9-b46e-0a1d8f654883` |
| Name | VMR0015 v1.0 — Safe Drinking Water dMRV |
| Version | 1.0.0 |
| Status | PUBLISHED |
| Publish timestamp | 2026-05-05T21:27:40.407Z |
| Schema topic | [`0.0.8865880`](https://hashscan.io/testnet/topic/0.0.8865880) |
| IPFS @context | [`QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv`](https://ipfs.io/ipfs/QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv) |
| IPFS policy CID | [`QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN`](https://ipfs.io/ipfs/QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN) |
| Verifiable Credential id | `urn:uuid:75fac51f-ba27-44f3-a678-1fa427cbc64c` |
| VC issuance | 2026-05-05T21:27:40Z |
| VC proof | Ed25519Signature2018 (assertionMethod) |

The published policy is anchored to Hedera Consensus Service via topic `0.0.8865880`. Every schema and the policy itself are submitted as HCS messages on this topic.

---

## 2. Issuer Identity

| Field | Value |
|---|---|
| Hedera account | [`0.0.8865868`](https://hashscan.io/testnet/account/0.0.8865868) |
| User topic | [`0.0.8865869`](https://hashscan.io/testnet/topic/0.0.8865869) |
| Initialization topic | [`0.0.1960`](https://hashscan.io/testnet/topic/0.0.1960) |
| DID | `did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869` |
| Tenant id (MGS) | `69fa5ac8fcae1180f3795819` |
| Account type | ATP (Authorized Tokenization Provider) |

The DID's verification method `did:...0.0.8865869#did-root-key` signs every policy publish event and every VC issued by this owner.

---

## 3. Token

| Field | Value |
|---|---|
| Token id | [`0.0.8865898`](https://hashscan.io/testnet/token/0.0.8865898) |
| Symbol | `CER` |
| Name | `CER VMR0015(Bikram)` |
| Type | Fungible (HTS) |
| Decimals | 2 |
| Initial supply | 0 |
| Admin key | enabled |
| Supply key | enabled (controlled by Guardian policy) |
| Wipe key | enabled |
| Freeze key | disabled |
| KYC key | disabled |

The Guardian policy holds the supply key, so tokens can only be minted by completing the on-policy verification workflow ending at `sr_approve_report_btn`.

---

## 4. Schemas (14 total, all on topic `0.0.8865880`)

| # | Schema | Entity | Status |
|---|---|---|---|
| 1 | Geographic Location | NONE | Published |
| 2 | Household Profile | NONE | Published |
| 3 | Baseline Fuel Mix (VMR0015) | NONE | Published |
| 4 | Water Purification Device | NONE | Published |
| 5 | Operating Performance | NONE | Published |
| 6 | Water Quality Test | NONE | Published |
| 7 | Project Activity Emissions | NONE | Published |
| 8 | Baseline Emissions Breakdown | NONE | Published |
| 9 | Leakage Adjustment (VMR0015) | NONE | Published |
| 10 | Monitoring Reporting Period | NONE | Published |
| 11 | Project Description (VMR0015) | VC | Published |
| 12 | Monitoring Report (VMR0015) | VC | Published |
| 13 | Project Participant | VC | Published |
| 14 | VVB | VC | Published |

VC-typed schemas are issued as Verifiable Credentials by their respective actors:
- Project Participant — by `Project Participant` role
- VVB — by `VVB` role
- Project Description — by Project Participant
- Monitoring Report — by Project Participant; verified by VVB; finalised by Owner

---

## 5. Verifiable Credential (issued at publish)

The export shipped one VC representing the policy publish event.

```json
{
  "id": "urn:uuid:75fac51f-ba27-44f3-a678-1fa427cbc64c",
  "type": ["VerifiableCredential"],
  "issuer": "did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869",
  "issuanceDate": "2026-05-05T21:27:40.407Z",
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "ipfs://QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv"
  ],
  "credentialSubject": [{
    "name": "VMR0015 v1.0 — Safe Drinking Water dMRV",
    "version": "1.0.0",
    "policyTag": "Tag_1778015271422.9323264d",
    "owner": "did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869",
    "cid": "QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN",
    "url": "ipfs://QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN",
    "uuid": "59fa0904-b890-4fb9-b46e-0a1d8f654883",
    "operation": "PUBLISH",
    "id": "urn:uuid:1778016453.758267000",
    "type": "Policy&1.0.0"
  }],
  "proof": {
    "type": "Ed25519Signature2018",
    "created": "2026-05-05T21:27:40Z",
    "verificationMethod": "did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869#did-root-key",
    "proofPurpose": "assertionMethod",
    "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..ixNumpj8aATpLQU0xD8fgwQ1mpcsYfID9LBC59JwlHdr70uvdYQc_HPQeogn8SWRLPq7E9EkfMtHl0HUhUj5AA"
  }
}
```

The `jws` is verifiable using the `did-root-key` of the issuer DID. Resolving the DID against Hedera topic `0.0.8865869` returns the public key used.

---

## 6. Verification Recipe

A reviewer can verify everything above in roughly 10 minutes:

1. Open [`hashscan.io/testnet/topic/0.0.8865880`](https://hashscan.io/testnet/topic/0.0.8865880). You will see 14 schema messages plus the policy publish message, all signed by the issuer DID.
2. Open [`hashscan.io/testnet/account/0.0.8865868`](https://hashscan.io/testnet/account/0.0.8865868). You will see the account that owns the policy and signed the publish.
3. Open [`hashscan.io/testnet/token/0.0.8865898`](https://hashscan.io/testnet/token/0.0.8865898). You will see the CER token, fungible, decimals 2, admin/supply/wipe keys held by the policy.
4. Resolve the IPFS CID [`QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN`](https://ipfs.io/ipfs/QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN). The returned policy JSON should match the imported `.policy` file.
5. Resolve the DID document for `did:hedera:testnet:67Pfz...0.0.8865869`. Use the `did-root-key` from the document to verify the VC `jws`.

If all five verifications pass, the policy publish event is cryptographically anchored on Hedera and the artifacts are reproducible by a third party.
