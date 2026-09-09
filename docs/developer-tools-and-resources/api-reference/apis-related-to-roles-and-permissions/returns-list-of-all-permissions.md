# Returns List of All Permissions

**`GET /api/v1/permissions`**

Returns the full list of available system-level permissions.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.PERMISSIONS_ROLE_READ` or `Permissions.DELEGATION_ROLE_MANAGE`

---

## Request

No path parameters, query parameters, or request body.

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "name": "POLICIES_POLICY_READ",
    "category": "POLICIES",
    "entity": "POLICY",
    "action": "READ",
    "disabled": false
  },
  {
    "name": "TOKENS_TOKEN_CREATE",
    "category": "TOKENS",
    "entity": "TOKEN",
    "action": "CREATE",
    "disabled": false
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Permission identifier (e.g., `POLICIES_POLICY_READ`) |
| `category` | string | Permission category (e.g., `POLICIES`, `TOKENS`) |
| `entity` | string | Target entity (e.g., `POLICY`, `TOKEN`) |
| `action` | string | Allowed action (e.g., `READ`, `CREATE`, `MANAGE`) |
| `disabled` | boolean | Whether the permission is currently disabled |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
