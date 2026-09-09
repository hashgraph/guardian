# Returns all child schemas

**`POST /schemas/deletionPreview`**

Returns all child schemas that would be affected by deleting the specified schemas.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Request Body

```json
{
  "schemaIds": [
    "f3b2a9c1e4d5678901234567",
    "a1b2c3d4e5f6789012345678"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaIds` | String[] | Yes | IDs of the schemas to include in the deletion preview |

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of schema deletion preview objects describing which child schemas are deletable and which are blocked.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Child Schema",
    "status": "DRAFT",
    "topicId": "f3b2a9c1e4d5678901234567",
    "deletable": true
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
