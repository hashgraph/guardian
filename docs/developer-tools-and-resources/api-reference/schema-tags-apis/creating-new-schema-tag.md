# Creating new Schema Tag

**`POST /tags/schemas`**

Creates new tag schema. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Request Body

A valid schema object.

```json
{
  "name": "Tag Schema name",
  "description": "Description",
  "entity": "TAG",
  "document": {}
}
```

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "f3b2a9c1e4d5678901234567",
  "uuid": "f3b2a9c1e4d5678901234567",
  "name": "Tag Schema name",
  "entity": "TAG",
  "status": "DRAFT",
  "version": "1.0.0"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
