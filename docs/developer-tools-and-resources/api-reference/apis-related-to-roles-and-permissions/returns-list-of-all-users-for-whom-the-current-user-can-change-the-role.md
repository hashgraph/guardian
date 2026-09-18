# Returns List of All Users

**`GET /api/v1/permissions/users`**

Returns a paginated list of users under the authenticated Standard Registry for whom the current user can manage roles.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_MANAGE` or `Permissions.DELEGATION_ROLE_MANAGE`

---

## Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `role` | string | No | — | Filter by role ID |
| `status` | string | No | — | Filter by status (`Active` or `Inactive`) |
| `username` | string | No | — | Filter by username |
| `pageIndex` | number | No | 0 | Zero-based page index |
| `pageSize` | number | No | 20 | Items per page |

---

## Response

### Success Response

**Status:** `200 OK`

The total count of matching users is returned in the `X-Total-Count` response header.

```json
[
  {
    "username": "example_user",
    "did": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "parent": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "role": "MRV Submitter",
    "permissionsGroup": [
      {
        "roleId": "63e3e5e8a01b3c001234abcd",
        "roleName": "MRV Submitter"
      }
    ],
    "assignedEntities": []
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `username` | string | User's login name |
| `did` | string | User's Hedera DID |
| `parent` | string | Standard Registry DID |
| `role` | string | Currently assigned role name |
| `permissionsGroup` | array | List of role assignments |
| `assignedEntities` | array | Policies and other entities assigned to this user |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
