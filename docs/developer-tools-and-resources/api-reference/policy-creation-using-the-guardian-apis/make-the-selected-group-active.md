# Make the Selected Group Active

**`POST /policies/{policyId}/groups`**

Makes the selected group active for the current user. If no UUID is provided, the user is returned to the default state.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_EXECUTE` or `Permissions.POLICIES_POLICY_MANAGE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | The policy ID (MongoDB ObjectId, e.g. `63e3e5e8a01b3c001234abcd`) |

### Request Body

```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | string | No | UUID of the group to make active. Omit to reset to default state |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "role": "INSTALLER",
  "active": true
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Policy or group not found |
| `500 Internal Server Error` | Unexpected server failure |
