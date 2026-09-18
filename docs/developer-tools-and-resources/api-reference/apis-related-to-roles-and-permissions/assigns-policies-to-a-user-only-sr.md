# Assigns Policies to a User (Standard Registry)

**`POST /api/v1/permissions/users/{username}/policies/assign`**

Assigns or unassigns one or more policies to a specific user. This endpoint is restricted to Standard Registry users.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_MANAGE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Target user's login name |

### Request Body

```json
{
  "policyIds": ["63e3e5e8a01b3c001234abcd"],
  "assign": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policyIds` | string[] | Yes | Array of policy IDs to assign or unassign |
| `assign` | boolean | Yes | `true` to assign policies, `false` to unassign |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Carbon Credits Policy",
  "version": "1.0.0",
  "status": "PUBLISH",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | User does not exist or is not under this Standard Registry |
| `500 Internal Server Error` | Unexpected server failure |
