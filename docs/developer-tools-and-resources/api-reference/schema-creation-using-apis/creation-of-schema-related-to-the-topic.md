# Creation of Schema related to the topic

**`POST /schemas/{topicId}`**

Creates new schema. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | String | Yes | Topic ID |

### Request Body

A valid schema object.

```json
{
  "name": "Schema name",
  "description": "Description",
  "entity": "string",
  "document": {}
}
```

---

## Response

### Success Response

**Status:** `201 Created`

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Validation error |
| `500 Internal Server Error` | Unexpected server failure |
