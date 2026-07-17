# Returning Schema by SchemaID

**`GET /schema/{schemaId}`**

Returns schema by schema ID.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | String | Yes | Schema ID |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "f3b2a9c1e4d5678901234567",
  "uuid": "f3b2a9c1e4d5678901234567",
  "name": "Schema name",
  "description": "Description",
  "entity": "string",
  "iri": "string",
  "status": "PUBLISHED",
  "topicId": "f3b2a9c1e4d5678901234567",
  "version": "1.0.0",
  "owner": "did:hedera:testnet:...",
  "messageId": "1700000000.000000001",
  "documentURL": "https://example.com",
  "contextURL": "https://example.com",
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
