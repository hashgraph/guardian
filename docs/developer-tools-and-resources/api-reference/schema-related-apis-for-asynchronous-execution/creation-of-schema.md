# Creation of Schema (Async)

**`POST /schemas/push/{topicId}`**

Creates a new schema under the specified topic asynchronously. Returns a task ID immediately; poll `GET /tasks/{taskId}` for the result.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | string | Yes | The Hedera topic ID under which to create the schema (e.g. `0.0.4532001`) |

### Request Body

```json
{
  "name": "Carbon Offset Schema",
  "description": "Schema for carbon offset reporting",
  "entity": "VC",
  "category": "POLICY",
  "document": {
    "$schema": "http://json-schema.org/draft-07/schema",
    "type": "object",
    "properties": {}
  }
}
```

The request body is a valid schema configuration object.

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Create schema"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
