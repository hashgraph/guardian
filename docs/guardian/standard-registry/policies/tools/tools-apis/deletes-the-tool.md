# Deletes the Tool

**`DELETE /api/v1/tools/{id}`**

Deletes the tool with the provided tool ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_DELETE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Tool ID (MongoDB ObjectId) |

---

## Response

### Success Response

**Status:** `200 OK`

Returns `true` on successful deletion.

```json
true
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `id` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
