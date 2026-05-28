# Deleting a Schema

**`DELETE /api/v1/schemas/{schemaId}`**

Deletes the schema with the specified ID. Only users with the Standard Registry role are allowed to make this request. Published or demo-mode schemas cannot be deleted.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_DELETE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | The internal database ID of the schema to delete |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `includeChildren` | boolean | No | `false` | When `true`, also deletes all child schemas |

---

## Response

### Success Response

**Status:** `200 OK`

The deletion is processed asynchronously. The response contains a task object.

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Delete schema"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions or schema is owned by another user |
| `404 Not Found` | Schema with the provided ID does not exist |
| `422 Unprocessable Entity` | Schema is already published or imported in demo mode |
| `500 Internal Server Error` | Unexpected server failure |
