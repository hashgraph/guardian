# Creation of Schema Related to the Topic

**`POST /api/v1/schemas/{topicId}`**

Creates a new schema under the specified Hedera topic. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topicId` | string | Yes | The Hedera topic ID under which to create the schema (e.g. `0.0.1234567`) |

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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable name of the schema |
| `description` | string | No | Description of the schema |
| `entity` | string | Yes | Schema entity type (e.g. `VC`) |
| `category` | string | No | Schema category — defaults to `POLICY` |
| `document` | object | Yes | Valid JSON Schema document |

---

## Response

### Success Response

**Status:** `201 Created`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Carbon Offset Schema",
    "description": "Schema for carbon offset reporting",
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
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid schema structure or duplicate key |
| `500 Internal Server Error` | Unexpected server failure |
