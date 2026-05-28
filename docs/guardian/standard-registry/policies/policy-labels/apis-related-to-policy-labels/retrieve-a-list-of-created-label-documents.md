# Retrieve a List of Created Label Documents

**`GET /api/v1/policy-labels/{definitionId}/documents`**

Returns a paginated list of all label documents created under the specified label definition.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Policy label definition identifier |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Number of items to return per page |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of label document objects. The total count is provided in the `X-Total-Count` response header.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "definitionId": "63e3e5e8a01b3c001234abce",
    "tokenId": "63e3e5e8a01b3c001234abcf",
    "status": "NEW",
    "document": {},
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
  }
]
```

| Header | Description |
|--------|-------------|
| `X-Total-Count` | Total number of label documents matching the query |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `definitionId` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
