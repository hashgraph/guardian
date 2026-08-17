# Updates the Schema

**`PUT /schemas/system/{schemaId}`**

Updates the system schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SYSTEM_SCHEMA_UPDATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | String | Yes | Schema ID |

### Request Body

A valid schema object.

```json
{
  "name": "Updated system schema name",
  "description": "Updated description",
  "document": {}
}
```

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of schema objects.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Updated system schema name",
    "status": "DRAFT",
    "version": "1.0.0"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Schema is active |
| `500 Internal Server Error` | Unexpected server failure |
