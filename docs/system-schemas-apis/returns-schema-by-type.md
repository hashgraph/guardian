# Returns Schema by Schema Type

**`GET /schemas/type/{schemaType}`**

Returns the schema matching the specified JSON document schema type string.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaType` | string | Yes | The schema type identifier (e.g. `#StandardRegistry`) |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Standard Registry Schema",
  "type": "#StandardRegistry",
  "entity": "STANDARD_REGISTRY",
  "status": "PUBLISHED",
  "system": true,
  "active": true,
  "document": {
    "$id": "#StandardRegistry",
    "$schema": "http://json-schema.org/draft-07/schema",
    "type": "object",
    "properties": {}
  }
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
