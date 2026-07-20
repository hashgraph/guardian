# Creates New System Schema

**`POST /schemas/system/{username}`**

Creates new system schema. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SYSTEM_SCHEMA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | String | Yes | Username |

### Request Body

A valid schema object.

```json
{
  "name": "System schema name",
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
