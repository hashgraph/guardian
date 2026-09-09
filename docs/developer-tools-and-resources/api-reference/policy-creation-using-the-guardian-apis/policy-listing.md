# Policy Listing

**`GET /api/v1/policies`**

Returns all policies accessible to the authenticated user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_READ`, `Permissions.POLICIES_POLICY_EXECUTE`, `Permissions.POLICIES_POLICY_MANAGE`, or `Permissions.POLICIES_POLICY_AUDIT`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | The number of pages to skip before starting to collect the result set |
| `pageSize` | number | No | 20 | The number of items to return |
| `type` | string | No | — | Filter by policy type (e.g. `local`) |

---

## Response

### Success Response

**Status:** `200 OK`

The `X-Total-Count` response header contains the total number of matching policies.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "iREC Policy",
    "version": "1.0.0",
    "description": "iREC renewable energy certificate policy",
    "status": "PUBLISH",
    "topicId": "0.0.4532001",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "userRoles": ["OWNER"]
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
