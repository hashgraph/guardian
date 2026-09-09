# Returns All Documents for a Statistic Definition

**`GET /api/v1/policy-statistics/{definitionId}/documents`**

Returns a paginated list of all VC documents that match the criteria of the specified statistic definition.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_STATISTIC_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Statistic definition identifier |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Items per page |

---

## Response

### Success Response

**Status:** `200 OK`

The `X-Total-Count` response header contains the total number of matching records.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "type": "VC",
    "schema": "63e3e5e8a01b3c001234bbbb",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "document": {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": ["VerifiableCredential"],
      "issuer": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
      "credentialSubject": {}
    },
    "createDate": "2026-01-15T10:00:00.000Z",
    "updateDate": "2026-01-15T12:00:00.000Z"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
