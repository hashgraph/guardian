# Deleting a Schema

**`DELETE /schemas/{schemaId}`**

Deletes the schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_DELETE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | String | Yes | Schema ID |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeChildren` | Boolean | No | Whether to also delete child schemas |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an async task object. Use the `taskId` to poll the task status.

```json
{
  "taskId": "89e1e62a-7976-4e24-8dd3-997da02dc81e",
  "expectation": 2,
  "action": "Delete schemas",
  "userId": "69c2cfc021d39e7b6d15e236"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Schema is published |
| `500 Internal Server Error` | Unexpected server failure |
