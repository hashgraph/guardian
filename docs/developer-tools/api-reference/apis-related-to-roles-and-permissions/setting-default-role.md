# Setting Default Role

**`POST /api/v1/permissions/roles/default`**

Sets the specified role as the default role that is automatically assigned to new users who join the organization.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_CREATE`

---

## Request

### Request Body

```json
{
  "id": "63e3e5e8a01b3c001234abcd"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | ID of the role to set as the default |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "MRV Submitter",
  "description": "Can submit MRV data and view policies",
  "permissions": ["POLICIES_POLICY_READ", "POLICIES_POLICY_EXECUTE"],
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "default": true
}
```

Returns the updated role object with `default` set to `true`.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Role does not exist |
| `500 Internal Server Error` | Unexpected server failure |
