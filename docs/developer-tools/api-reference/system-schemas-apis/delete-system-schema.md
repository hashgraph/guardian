# Delete System Schema

**`DELETE /schemas/system/{schemaId}`**

Deletes the system schema with the specified schema ID asynchronously. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SYSTEM_SCHEMA_DELETE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | The schema ID (MongoDB ObjectId, e.g. `63e3e5e8a01b3c001234abcd`) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Delete schemas"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions or schema belongs to another user |
| `404 Not Found` | Schema not found |
| `422 Unprocessable Entity` | Schema is active and cannot be deleted |
| `500 Internal Server Error` | Unexpected server failure |
