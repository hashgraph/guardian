# Policy Publish Verifiable Credential — Decoded
## VMR0015 v2.0.1 — Safe Drinking Water dMRV (Bikram1111)

This document decodes the Guardian-issued Verifiable Credential (VC) that was generated when the policy was published on Hedera Testnet. It is **cryptographically signed proof** that the policy was published by the DID owner.

---

## VC Identity

| Field | Value |
|---|---|
| **VC ID** | `urn:uuid:5920536e-d9ab-446c-b20e-68e8cd6995ed` |
| **Type** | `VerifiableCredential` |
| **Issuance Date** | `2026-05-23T22:23:39.409Z` |
| **Issuer DID** | `did:hedera:testnet:7iq4MJeYkzj7bs7pfJJy4zyiY2gZwGJk2eP134jgvrNT_0.0.9037705` |

---

## Credential Subject — Policy Details

| Field | Value |
|---|---|
| **Policy Name** | `VMR0015 v2.0.1 — Safe Drinking Water dMRV (Bikram1111)` |
| **Description** | Verra VMR0015 v1.0 — methodology for low greenhouse-gas-emitting safe drinking water production systems. dMRV implementation on Hedera Guardian for the DLT Earth bounty. |
| **Topic Description** | `VMR0015 v1.0` |
| **Version** | `3` (publish version counter) |
| **Policy Tag** | `Tag_1779541177415.818a92c3` |
| **Owner DID** | `did:hedera:testnet:7iq4MJeYkzj7bs7pfJJy4zyiY2gZwGJk2eP134jgvrNT_0.0.9037705` |
| **Policy UUID** | `264abbbb-3472-468f-90c8-94e44c013d4a` |
| **Operation** | `PUBLISH` ✅ |
| **IPFS CID** | `Qmf9V1XjQurCGcyvpdADCMKSFgRX4jVbemSzVxLhwp4e6h` |
| **IPFS URL** | [`ipfs://Qmf9V1XjQurCGcyvpdADCMKSFgRX4jVbemSzVxLhwp4e6h`](https://ipfs.io/ipfs/Qmf9V1XjQurCGcyvpdADCMKSFgRX4jVbemSzVxLhwp4e6h) |
| **Schema Context** | [`ipfs://QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv`](https://ipfs.io/ipfs/QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv) |

---

## Cryptographic Proof

| Field | Value |
|---|---|
| **Signature Type** | `Ed25519Signature2018` |
| **Signed At** | `2026-05-23T22:23:39Z` |
| **Verification Method** | `did:hedera:testnet:7iq4MJeYkzj7bs7pfJJy4zyiY2gZwGJk2eP134jgvrNT_0.0.9037705#did-root-key` |
| **Proof Purpose** | `assertionMethod` |
| **JWS Signature** | `eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..hO623ogKUwjUPE33D6-oNEiPgkUdacFBOKmZFJMiRV65wVNs5OSNlV0cUnZ2EX8XqRNqLzmzqnmxNUGln-rXCg` |

---

## What This Proves

- The policy named **VMR0015 v2.0.1 — Safe Drinking Water dMRV (Bikram1111)** was **officially PUBLISHED** on Hedera Testnet on **2026-05-23 at 22:23:39 UTC**
- The policy file is permanently stored on IPFS at **`Qmf9V1XjQurCGcyvpdADCMKSFgRX4jVbemSzVxLhwp4e6h`**
- The VC is **cryptographically signed** with Ed25519 by the SR owner DID — it cannot be forged or altered
- The `operation: PUBLISH` field confirms this is a live production publish, not a draft or test
- Guardian version 3.5.0 issued this VC automatically upon successful policy publication

---

*Raw CSV source: `policy-publish-vc.csv` in this folder*
