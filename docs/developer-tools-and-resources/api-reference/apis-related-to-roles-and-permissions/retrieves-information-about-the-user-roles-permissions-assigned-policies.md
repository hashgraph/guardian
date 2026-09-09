# Retrieves User Information (Roles, Permissions, Assigned Policies)

**`GET /api/v1/permissions/users/{username}`**

Returns permission details, role assignments, and assigned policy information for a specific user.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_MANAGE` or `Permissions.DELEGATION_ROLE_MANAGE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Target user's login name |

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
      "roleName": "MRV Submitter",
      "permissions": ["POLICIES_POLICY_READ", "POLICIES_POLICY_EXECUTE"]
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `username` | string | User's login name |
| `did` | string | User's Hedera DID |
| `parent` | string | Standard Registry DID |
| `role` | string | Currently assigned role name |
| `permissionsGroup` | array | List of role assignments with associated permissions |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | User does not exist or is not under this Standard Registry |
| `500 Internal Server Error` | Unexpected server failure |
