# Previews Imported Tool from Zip

**`POST /api/v1/tools/import/file/preview`**

Returns a preview of the tool that would be imported from the provided zip file, without persisting any changes.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOLS_TOOL_CREATE`

---

## Request

### Request Body

Send the raw ZIP file bytes as the request body.

**Content-Type:** `application/octet-stream`

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "tool": {
    "name": "Preview Tool",
    "description": "Tool preview from zip",
    "config": {
      "blockType": "tool",
      "children": []
    }
  },
  "schemas": []
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
