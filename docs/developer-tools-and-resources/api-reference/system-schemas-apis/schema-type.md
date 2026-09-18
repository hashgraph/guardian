# Returns Schema by Entity Type

**`GET /schemas/system/entity/{schemaEntity}`**

Returns the active system schema for the specified entity type.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaEntity` | string | Yes | Entity type of the schema |

Valid `schemaEntity` values:

| Value | Description |
|-------|-------------|
| `STANDARD_REGISTRY` | Standard Registry entity schema |
| `USER` | User entity schema |
| `POLICY` | Policy entity schema |
| `MINT_TOKEN` | Fungible token mint schema |
| `WIPE_TOKEN` | Token wipe schema |
| `MINT_NFTOKEN` | Non-fungible token mint schema |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Standard Registry Schema",
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
| `404 Not Found` | Schema not found for the given entity type |
| `500 Internal Server Error` | Unexpected server failure |
