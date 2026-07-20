# Updates Role Configuration

**`PUT /api/v1/permissions/roles/{id}`**

Updates the configuration (name, description, or permission set) of an existing role.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_UPDATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Role identifier |

### Request Body

```json
{
  "name": "MRV Submitter",
  "description": "Updated description for the MRV Submitter role",
  "permissions": ["POLICIES_POLICY_READ", "POLICIES_POLICY_EXECUTE", "TOKENS_TOKEN_READ"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Updated role name |
| `description` | string | No | Updated role description |
| `permissions` | string[] | No | Updated list of permission names for this role |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "MRV Submitter",
  "description": "Updated description for the MRV Submitter role",
  "permissions": ["POLICIES_POLICY_READ", "POLICIES_POLICY_EXECUTE", "TOKENS_TOKEN_READ"],
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "default": false
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Role does not exist |
| `500 Internal Server Error` | Unexpected server failure |
