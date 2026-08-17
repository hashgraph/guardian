# Updates the Schema

**`PUT /schemas/system/{schemaId}`**

Updates the system schema with the specified schema ID. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SYSTEM_SCHEMA_UPDATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | The schema ID (MongoDB ObjectId) |

### Request Body

```json
{
  "name": "Updated Schema Name",
  "description": "Updated description",
  "document": {
    "$id": "#Example",
    "$schema": "http://json-schema.org/draft-07/schema",
    "type": "object",
    "properties": {}
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Updated schema name |
| `description` | string | No | Updated schema description |
| `document` | object | No | Updated JSON Schema definition |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Updated Schema Name",
    "entity": "STANDARD_REGISTRY",
    "status": "DRAFT",
    "system": true,
    "active": false,
    "owner": "example_user"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Schema is active and cannot be modified |
| `500 Internal Server Error` | Unexpected server failure |
