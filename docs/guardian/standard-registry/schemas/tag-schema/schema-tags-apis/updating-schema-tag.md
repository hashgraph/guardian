# Updating Schema Tag

**`PUT /tags/schemas/{schemaId}`**

Updates the tag schema with the provided schema ID. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_UPDATE`

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
  "name": "Updated Tag Schema name",
  "description": "Updated description",
  "document": {}
}
```

---

## Response

### Success Response

**Status:** `200 OK`

Returns an array of tag schema objects.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Updated Tag Schema name",
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
| `500 Internal Server Error` | Unexpected server failure |
