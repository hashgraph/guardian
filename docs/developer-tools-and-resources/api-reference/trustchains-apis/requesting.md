# Requesting VP Documents

**`GET /trust-chains/`**

Returns a paginated list of all Verifiable Presentation (VP) documents.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.AUDIT_TRUST_CHAIN_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Items per page |
| `policyId` | string | No | — | Filter by policy ID |
| `policyOwner` | string | No | — | Filter by policy owner DID |

---

## Response

### Success Response

**Status:** `200 OK`

The response includes an `X-Total-Count` header with the total number of matching records.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "policyId": "63e3e5e8a01b3c001234abce",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "hash": "a1b2c3d4e5f6...",
    "document": {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": ["VerifiablePresentation"]
    }
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
