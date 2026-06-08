# Stop Recording

**`POST /api/v1/record/{policyId}/recording/stop`**

Stops the active recording session for a policy and returns the captured recording as a ZIP file.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_RECORD_ALL`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | The ID of the policy whose recording is being stopped |

### Request Body

```json
{}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `options` | object | No | Optional stop configuration options |

---

## Response

### Success Response

**Status:** `202 Accepted`

Returns the completed recording packaged as a binary ZIP file.

```
Content-Disposition: attachment; filename=<timestamp>
Content-Type: application/zip

<binary zip content>
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
