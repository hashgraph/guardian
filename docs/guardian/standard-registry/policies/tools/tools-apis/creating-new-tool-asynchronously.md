# Creating New Tool Asynchronously

**`POST /api/v1/tools/push`**

Creates a new tool asynchronously and returns a task ID for polling the result.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_CREATE`

---

## Request

### Request Body

```json
{
  "name": "My Tool",
  "description": "Tool description",
  "config": {
    "blockType": "tool",
    "children": []
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name of the tool |
| `description` | string | No | Brief description of the tool's purpose |
| `config` | object | Yes | Tool configuration object; `blockType` must be `"tool"` |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Create tool"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid tool config (e.g., missing or incorrect `blockType`) |
| `500 Internal Server Error` | Unexpected server failure |
