# Returns List of All Roles

**`GET /api/v1/permissions/roles`**

Returns a paginated list of roles for the authenticated Standard Registry.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_READ` or `Permissions.DELEGATION_ROLE_MANAGE`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | No | — | Filter roles by name |
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Items per page |

---

## Response

### Success Response

**Status:** `200 OK`

The total count of matching roles is returned in the `X-Total-Count` response header.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "MRV Submitter",
    "description": "Can submit MRV data and view policies",
    "permissions": ["POLICIES_POLICY_READ", "POLICIES_POLICY_EXECUTE"],
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "default": false
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Role identifier |
| `name` | string | Human-readable role name |
| `description` | string | Role description |
| `permissions` | string[] | List of permission names assigned to this role |
| `owner` | string | DID of the Standard Registry that owns this role |
| `default` | boolean | Whether this is the default role assigned to new users |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
