# Retrieve the List of Label Definitions

**`GET /api/v1/policy-labels`**

Returns a paginated list of all policy label definitions owned by the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Number of items to return per page |
| `policyInstanceTopicId` | string | No | — | Filter by policy instance topic ID (e.g. `0.0.4532001`) |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of policy label definition objects. The total count is provided in the `X-Total-Count` response header.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Carbon Credit Label",
    "description": "Certification label for verified carbon credits",
    "policyId": "63e3e5e8a01b3c001234abcd",
    "status": "DRAFT",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
  }
]
```

| Header | Description |
|--------|-------------|
| `X-Total-Count` | Total number of label definitions matching the query |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
