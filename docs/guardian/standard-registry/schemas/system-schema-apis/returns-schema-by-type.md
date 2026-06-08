# Returns Schema by Type

**`GET /schemas/type/{type}`**

Finds the schema using the JSON document type.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** No specific permission required (authentication only)

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | String | Yes | JSON type identifier |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "f3b2a9c1e4d5678901234567",
  "uuid": "f3b2a9c1e4d5678901234567",
  "name": "Schema name",
  "entity": "string",
  "iri": "string",
  "status": "PUBLISHED",
  "version": "1.0.0",
  "document": {},
  "context": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
