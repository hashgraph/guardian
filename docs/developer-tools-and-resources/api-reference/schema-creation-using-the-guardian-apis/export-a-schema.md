# Export Schema Message IDs

**`GET /api/v1/schemas/{schemaId}/export/message`**

Returns the Hedera message ID of the published schema. The message contains the IPFS CID of the schema file. Only users with the Standard Registry role are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | The internal database ID of the schema to export |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Carbon Offset Schema",
  "description": "Schema for carbon offset reporting",
  "version": "1.0.0",
  "messageId": "1234567890.000000001",
  "owner": "example_user"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Schema cannot be exported (e.g. not yet published) |
| `500 Internal Server Error` | Unexpected server failure |
