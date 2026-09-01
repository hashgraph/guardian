# Creates a New Role

**`POST /api/v1/permissions/roles`**

Creates a new custom role within the authenticated Standard Registry's organization.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_CREATE`

---

## Request

### Request Body

```json
{
  "name": "MRV Submitter",
  "description": "Can submit MRV data and view approved policies",
  "permissions": ["POLICIES_POLICY_READ", "POLICIES_POLICY_EXECUTE"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique role name within the organization |
| `description` | string | No | Human-readable description of the role |
| `permissions` | string[] | Yes | Array of permission names to assign to this role |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "MRV Submitter",
  "description": "Can submit MRV data and view approved policies",
  "permissions": ["POLICIES_POLICY_READ", "POLICIES_POLICY_EXECUTE"],
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "default": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Newly created role identifier |
| `name` | string | Role name |
| `description` | string | Role description |
| `permissions` | string[] | Assigned permission names |
| `owner` | string | DID of the Standard Registry that owns this role |
| `default` | boolean | Whether this is the default role for new users |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Validation error — missing required fields |
| `500 Internal Server Error` | Unexpected server failure |
