# Return Tool to Draft (Editing)

**`PUT /api/v1/tools/{id}/draft`**

Returns a published or dry-run tool back to draft (editing) status.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_UPDATE`

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

```json
{
  "valid": true,
  "results": []
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | `id` is missing or invalid |
| `500 Internal Server Error` | Unexpected server failure |
