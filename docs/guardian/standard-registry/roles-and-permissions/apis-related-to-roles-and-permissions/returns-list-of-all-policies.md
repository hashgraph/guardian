# Returns List of All Policies for a User

**`GET /api/v1/permissions/users/{username}/policies`**

Returns a paginated list of policies accessible to the specified user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_MANAGE` or `Permissions.DELEGATION_ROLE_MANAGE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Target user's login name |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Items per page |
| `status` | string | No | — | Filter by policy status (e.g., `DRAFT`, `PUBLISH`, `DISCONTINUED`) |

---

## Response

### Success Response

**Status:** `200 OK`

The total count of matching policies is returned in the `X-Total-Count` response header.

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Carbon Credits Policy",
    "version": "1.0.0",
    "status": "PUBLISH",
    "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Policy identifier |
| `name` | string | Policy name |
| `version` | string | Policy version |
| `status` | string | Current policy status |
| `owner` | string | DID of the Standard Registry that owns the policy |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | User does not exist or is not under this Standard Registry |
| `500 Internal Server Error` | Unexpected server failure |
