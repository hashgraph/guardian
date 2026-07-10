# Returns All Statistic Definitions

**`GET /api/v1/policy-statistics`**

Returns a paginated list of all statistic definitions visible to the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_STATISTIC_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Items per page |
| `policyInstanceTopicId` | string | No | — | Filter by policy instance topic ID |

---

## Response

### Success Response

**Status:** `200 OK`

The `X-Total-Count` response header contains the total number of matching records.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Carbon Credit Issuance Statistics",
    "description": "Tracks issuance metrics for carbon credit policies",
    "status": "PUBLISHED",
    "policyId": "63e3e5e8a01b3c001234aaaa",
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
| `500 Internal Server Error` | Unexpected server failure |
