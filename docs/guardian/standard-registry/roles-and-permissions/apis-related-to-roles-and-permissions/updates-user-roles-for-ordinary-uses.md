# Delegates User Roles (Ordinary Users)

**`PUT /api/v1/permissions/users/{username}/delegate`**

Delegates role permissions to a user, allowing them to act with the permissions of a delegated role. This endpoint is used by ordinary users with delegation rights.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.DELEGATION_ROLE_MANAGE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Target user's login name |

### Request Body

An array of role IDs to delegate to the user. Pass an empty array to remove all delegations.

```json
[
  "63e3e5e8a01b3c001234abcd",
  "63e3e5e8a01b3c001234efgh"
]
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| *(array item)* | string | Yes | Role ID to delegate to the user |

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
| `404 Not Found` | User does not exist or is not a peer under the same Standard Registry |
| `500 Internal Server Error` | Unexpected server failure |
