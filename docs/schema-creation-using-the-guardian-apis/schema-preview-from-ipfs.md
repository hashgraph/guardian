# Schema Preview from IPFS

**`POST /schemas/import/message/preview`**

Previews the schema from IPFS without importing it into the local database.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Request Body

```json
{
  "messageId": "1680000000.000000001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | string | Yes | The Hedera message ID containing the IPFS CID of the schema |

---

## Response

### Success Response

**Status:** `200 OK`

```json
[
  {
    "id": "63e3e5e8a01b3c001234abcd",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Carbon Offset Schema",
    "entity": "VC",
    "version": "1.0.0",
    "document": {
      "$id": "#CarbonOffset",
      "$schema": "http://json-schema.org/draft-07/schema",
      "type": "object",
      "properties": {}
    }
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Message ID is missing |
| `500 Internal Server Error` | Unexpected server failure |
