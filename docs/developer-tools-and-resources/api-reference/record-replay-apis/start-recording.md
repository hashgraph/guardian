# Start Recording

**`POST /api/v1/record/{policyId}/recording/start`**

Starts recording all API interactions with the specified policy session.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_RECORD_ALL`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | The ID of the policy to start recording |

### Request Body

```json
{}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `options` | object | No | Optional recording configuration options |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
true
```

Returns `true` when the recording session has been successfully initiated.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
