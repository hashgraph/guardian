# Imports New Tool from Zip Asynchronously

**`POST /api/v1/tools/push/import/file`**

Asynchronously imports a new tool and all associated artifacts from the provided zip file, and returns a task ID for polling the result.

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
| `500 Internal Server Error` | Unexpected server failure |
