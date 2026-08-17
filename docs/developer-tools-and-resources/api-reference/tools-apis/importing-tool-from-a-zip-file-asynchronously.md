# Importing Tool from a Zip File Asynchronously (with Metadata)

**`POST /api/v1/tools/push/import/file-metadata`**

Asynchronously imports a new tool from a multipart zip file with optional metadata, and returns a task ID for polling the result.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.TOOL_MIGRATION_CREATE`

---

## Request

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | binary | Yes | ZIP file containing the tool configuration |
| `metadata` | binary | No | JSON metadata file for the tool migration |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Import tool file"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure or missing tool file |
