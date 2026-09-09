# Sends Data from External Source (Specific Block)

**`POST /external/{policyId}/{blockTag}`**

Sends a Verifiable Credential (VC) document from an external source to a specific policy block identified by `policyId` and `blockTag`.

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | The ID of the target policy |
| `blockTag` | string | Yes | The tag name of the target policy block |

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
| `policyTag` | string | No | Tag of the policy (used for routing when `policyId` is not in path) |
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
