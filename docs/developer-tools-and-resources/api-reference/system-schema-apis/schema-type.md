# Schema Type

**`GET /schemas/system/entity/{schemaEntity}`**

Finds the schema using the schema entity type.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** No specific permission required (authentication only)

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaEntity` | String (enum) | Yes | Schema entity type. One of: `STANDARD_REGISTRY`, `USER`, `POLICY`, `MINT_TOKEN`, `INTEGRATION_DATA_V2`, `WIPE_TOKEN`, `MINT_NFTOKEN` |

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
| `404 Not Found` | Schema not found |
| `500 Internal Server Error` | Unexpected server failure |
