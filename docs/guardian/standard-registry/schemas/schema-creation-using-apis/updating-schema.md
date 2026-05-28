# Updating Schema

**`PUT /schemas/`**

Updates the schema. The schema ID must be included in the request body. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_UPDATE`

---

## Request

### Request Body

A valid schema object including the ID of the schema to be updated.

```json
{
  "id": "f3b2a9c1e4d5678901234567",
  "name": "Updated Schema name",
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
    "name": "Updated Schema name",
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
| `422 Unprocessable Entity` | Validation error |
| `500 Internal Server Error` | Unexpected server failure |
