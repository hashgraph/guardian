# Importing Schema from Zip (Async)

**`POST /schemas/push/{topicId}/import/file`**

Imports a new schema from a zip file into the local database asynchronously. Returns a task ID immediately; poll `GET /tasks/{taskId}` for the result.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | string | Yes | The Hedera topic ID to import the schema under (e.g. `0.0.4532001`) |

### Request Body

The request body must be the raw binary content of a `.zip` file exported from Guardian.

**Content-Type:** `application/octet-stream`

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Import schema file"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | File is missing or empty |
| `500 Internal Server Error` | Unexpected server failure |
