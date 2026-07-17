# Building and Returning a Trustchain

**`GET /trust-chains/{hash}`**

Builds and returns a full trustchain, tracing from a Verifiable Presentation (VP) document back to the root Verifiable Credential (VC).

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.AUDIT_TRUST_CHAIN_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hash` | string | Yes | Hash or identifier of the VP document |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "chain": [
    {
      "id": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
      "type": "VC",
      "tag": "create_application",
      "label": "Create Application",
      "schema": "StandardRegistry",
      "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
      "document": {}
    }
  ],
  "userMap": [
    {
      "did": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
      "username": "example_user"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `chain` | array | Ordered list of documents from VP to root VC |
| `chain[].id` | string | Document identifier or DID |
| `chain[].type` | string | Document type: `VC`, `VP`, or `DID` |
| `chain[].tag` | string | Policy block tag that produced this document |
| `chain[].label` | string | Human-readable label |
| `chain[].schema` | string | Schema name |
| `chain[].owner` | string | DID of the document owner |
| `chain[].document` | object | The raw credential document |
| `userMap` | array | Mapping of DIDs to usernames |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
