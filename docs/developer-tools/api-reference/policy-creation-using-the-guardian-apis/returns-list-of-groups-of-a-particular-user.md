# Returns List of Groups of a Particular User

**`GET /policies/{policyId}/groups`**

Returns a list of policy groups that the current user is a member of.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE` or `Permissions.POLICIES_POLICY_MANAGE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | The policy ID (MongoDB ObjectId, e.g. `63e3e5e8a01b3c001234abcd`) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "role": "INSTALLER",
    "groupLabel": "Installers",
    "groupName": "Installer Group",
    "active": true
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Policy not found |
| `500 Internal Server Error` | Unexpected server failure |
