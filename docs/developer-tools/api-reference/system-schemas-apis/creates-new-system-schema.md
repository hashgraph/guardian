# Creates New System Schema

**`POST /schemas/system/{username}`**

Creates a new system schema. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SYSTEM_SCHEMA_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Username of the schema owner |

### Request Body

```json
{
  "name": "Example System Schema",
  "description": "A system schema for standard registry data",
  "entity": "STANDARD_REGISTRY",
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
| `name` | string | Yes | Schema name |
| `description` | string | No | Schema description |
| `entity` | string | Yes | Entity type: `STANDARD_REGISTRY`, `USER`, `POLICY`, `MINT_TOKEN`, `WIPE_TOKEN`, `MINT_NFTOKEN` |
| `document` | object | Yes | JSON Schema definition |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Example System Schema",
  "entity": "STANDARD_REGISTRY",
  "status": "DRAFT",
  "system": true,
  "active": false,
  "owner": "example_user"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid schema data |
| `500 Internal Server Error` | Unexpected server failure |
