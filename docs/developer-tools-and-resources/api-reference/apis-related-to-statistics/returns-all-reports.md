# Returns All Statistic Assessments

**`GET /api/v1/policy-statistics/{definitionId}/assessment`**

Returns a paginated list of all assessments for the specified statistic definition.

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
    "definitionId": "63e3e5e8a01b3c001234aaaa",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
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
| `422 Unprocessable Entity` | Invalid or missing `definitionId` |
| `500 Internal Server Error` | Unexpected server failure |
