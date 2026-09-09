# Returning Schema by Schema ID

**`GET /api/v1/schema/{schemaId}`**

Returns a single schema object identified by its internal database ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | The internal database ID of the schema |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Carbon Offset Schema",
  "description": "Schema for carbon offset reporting",
  "entity": "VC",
  "status": "PUBLISHED",
  "version": "1.0.0",
  "topicId": "0.0.1234567",
  "owner": "example_user",
  "document": {},
  "context": {}
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Schema does not exist or is not accessible |
| `500 Internal Server Error` | Unexpected server failure |
