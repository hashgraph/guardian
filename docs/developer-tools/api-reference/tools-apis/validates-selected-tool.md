# Validates Selected Tool

**`POST /api/v1/tools/validate`**

Validates the configuration of the provided tool and returns a validation result.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_UPDATE` or `Permissions.TOOLS_TOOL_REVIEW`

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
| `config` | object | Yes | Tool configuration object to validate |

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

| Field | Type | Description |
|-------|------|-------------|
| `valid` | boolean | Whether the tool configuration is valid |
| `results` | array | List of validation errors (empty when valid) |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
