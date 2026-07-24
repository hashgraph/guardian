# Updating Schema

**`PUT /api/v1/schemas`**

Updates an existing schema. The schema to update is identified by the `id` field in the request body. Only users with the Standard Registry role are allowed to make this request. Published or demo-mode schemas cannot be updated.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_UPDATE`

---

## Request

### Request Body

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Updated Carbon Offset Schema",
  "description": "Updated description for carbon offset reporting",
  "entity": "VC",
  "category": "POLICY",
  "document": {
    "$schema": "http://json-schema.org/draft-07/schema",
    "type": "object",
    "properties": {}
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Internal database ID of the schema to update |
| `name` | string | No | Updated human-readable name |
| `description` | string | No | Updated description |
| `entity` | string | No | Schema entity type |
| `category` | string | No | Schema category |
| `document` | object | No | Updated JSON Schema document |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Updated Carbon Offset Schema",
    "description": "Updated description for carbon offset reporting",
    "entity": "VC",
    "status": "DRAFT",
    "version": "",
    "topicId": "0.0.1234567",
    "owner": "example_user"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions or schema is owned by another user |
| `404 Not Found` | Schema with the provided ID does not exist |
| `422 Unprocessable Entity` | Schema is already published or imported in demo mode |
| `500 Internal Server Error` | Unexpected server failure |
