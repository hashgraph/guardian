# Sends Data from External Source (Generic)

**`POST /external/`**

Sends a Verifiable Credential (VC) document from an external source. The target policy is resolved from fields within the request body.

---

## Request

### Request Body

```json
{
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "policyTag": "example_policy_tag",
  "document": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "id": "urn:uuid:63e3e5e8-a01b-3c00-1234-abcdef012345",
    "type": ["VerifiableCredential"],
    "issuer": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "issuanceDate": "2024-06-01T00:00:00.000Z",
    "credentialSubject": {}
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `owner` | string | Yes | DID of the document owner |
| `policyTag` | string | Yes | Tag of the target policy (used to resolve the destination) |
| `document` | object | Yes | The Verifiable Credential document |

---

## Response

### Success Response

**Status:** `200 OK`

```json
true
```

### Error Responses

| Status | Description |
|--------|-------------|
| `500 Internal Server Error` | Unexpected server failure |
