# Returns a List of Formulas

**`GET /api/v1/formulas`**

Returns a paginated list of all formulas visible to the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.FORMULAS_FORMULA_READ`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Number of items to return per page |
| `policyId` | string | No | — | Filter formulas by linked policy ID |

---

## Response

### Success Response

**Status:** `200 OK`

Total item count is returned in the `X-Total-Count` response header.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "uuid": "c4a3b2d1-e5f6-7890-abcd-ef1234567890",
    "name": "Carbon Credit Calculator",
    "description": "Calculates carbon credits based on emission factors",
    "status": "PUBLISHED",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "policyId": "63e3e5e8a01b3c001234abcd"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
