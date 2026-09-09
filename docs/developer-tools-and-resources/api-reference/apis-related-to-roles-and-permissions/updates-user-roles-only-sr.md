# Updates User Roles (Standard Registry)

**`PUT /api/v1/permissions/users/{username}`**

Assigns one or more roles to a user. This endpoint is restricted to Standard Registry users.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_MANAGE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Target user's login name |

### Request Body

An array of role IDs to assign to the user.

```json
[
  "63e3e5e8a01b3c001234abcd",
  "63e3e5e8a01b3c001234efgh"
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| *(array item)* | string | Yes | Role ID to assign to the user |

---

## Response

### Success Response

**Status:** `200 OK`

```json
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
  ]
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | User does not exist or is not under this Standard Registry |
| `500 Internal Server Error` | Unexpected server failure |
